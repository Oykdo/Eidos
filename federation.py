#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
federation.py — consensus par federation de validateurs.

Remplace la course au hachage par une rotation de proposants. Sept
validateurs, un creneau de dix minutes chacun, le proposant designe a
l'avance. L'energie depensee par bloc est celle d'une signature : bornee
par construction, et mesuree a la fin des tests.

Trois pieces :

  1. Signatures XMSS (RFC 8391). WOTS+ ne signe qu'une fois ; un validateur
     doit signer des milliers de blocs. On genere 2^k cles WOTS+ (wots.py),
     on compresse chacune par un arbre L, on range les feuilles dans un
     arbre de Merkle tweake, et la cle publique du validateur est la racine
     (32 octets) plus une graine publique (32 octets), immuables. Chaque
     signature revele une feuille et son chemin d'authentification :
     4 + 2 144 + 32·k octets. Entierement fonde sur le hachage, donc
     post-quantique. Il est ETATIQUE : un indice ne sert qu'une fois, et le
     compteur doit survivre aux redemarrages — CompteurMSS, fichier
     indice-<v>.json, monotone, ecrit AVANT de rendre la signature. Rejouer
     la chaine ne suffit pas : sur une fourche, deux branches diraient
     « indice libre » pour le meme indice ; le fichier, lui, ne recule jamais.

  2. Rotation chaldeenne. Le proposant du creneau s est V[(3*s) mod n].
     Le pas de trois est celui qui engendre l'ordre des jours a partir de
     l'ordre des heures : 24 = 3x7 + 3. Comme pgcd(3, 7) = 1, la rotation
     parcourt les sept validateurs sans en sauter aucun. La regle vaut pour
     tout n non divisible par 3 — verifie au chargement.

  3. Finalite aux deux tiers. Un bloc est final des que des blocs signes
     par plus de 2n/3 validateurs distincts reposent sur lui. Avec n = 7,
     il faut 5 validateurs distincts. Le seuil est 2*n//3+1 : il ne depend
     pas du pas de rotation.

  4. Borne de vivacite. Un creneau s > creneau(now)+1 est refuse. Sans
     cette borne, un seul bloc signe date trop loin dans le futur gele la
     chaine : tout creneau reel devient « deja passe ». Sauter un creneau
     (silence du proposant) reste permis — s > dernier suffit. Les trous
     se reconstruisent depuis la liste des creneaux.

Usage :  python3 federation.py          auto-tests
         python3 federation.py --demo   14 blocs, deux tours complets

LIMITE. Une federation echange la resistance a la censure contre la sobriete.
Sept signataires connus peuvent s'entendre, ou etre contraints. C'est un choix
politique autant que technique, a assumer publiquement.
"""

import hashlib, json, os, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import eonis as E
import utxo as U
import wots as W

sha256 = U.sha256
sha256d = U.sha256d

CRENEAU = 600          # secondes
PAS = 3                # rotation chaldeenne
HAUTEUR_MSS = 10       # 2^10 = 1024 signatures par cle de validateur


# ==========================================================================
# 1. Signatures XMSS : WOTS+ + arbre L + arbre de Merkle tweake
# ==========================================================================
def _graine_ots(seed, i):
    return sha256(seed + b"ots" + i.to_bytes(4, "big"))


def _ad_ots(i): return W.adrs(W.TYPE_OTS, a=i)
def _ad_l(i):   return W.adrs(W.TYPE_LTREE, a=i)
def _ad_arbre(hauteur, indice): return W.adrs(W.TYPE_ARBRE, b=hauteur, c=indice)


class CompteurMSS:
    """Etat persistant d'un validateur : le premier indice jamais signe.

    Fichier indice-<v>.json : {"spec", "validateur", "racine", "prochain"}.
    Monotone : on n'ecrit jamais en dessous. `reserver(i)` prend un verrou
    exclusif sur indice-<v>.json.lock (fcntl sur POSIX, msvcrt sur Windows :
    rendu a la mort du processus, jamais orphelin), RELIT le fichier sous le
    verrou (le disque fait foi, pas la memoire : deux objets ou deux processus
    sur le meme fichier voient le meme prochain), refuse i < prochain (compteur
    recule : sauvegarde ancienne, fourche — l'autre branche a deja consomme i,
    ou second ecrivain), puis ecrit prochain = i + 1 de facon atomique (fichier
    temporaire + fsync + os.replace + fsync du repertoire) AVANT que la
    signature soit rendue : si l'ecriture echoue, on ne signe pas ; si le
    processus meurt juste apres, l'indice est perdu, jamais reutilise. Un
    verrou deja tenu par un autre processus refuse la signature.

    LIMITE. Un fichier est un etat local : perdu, le noeud REFUSE de repartir de
    la chaine (max des indices publies + 1) sauf amorcage explicite
    (noeud.py --amorcer-indice) : la chaine peut ignorer des blocs signes puis
    perdus. Le sauvegarder, c'est le seul devoir d'un validateur."""

    SPEC = "eidos-indice/1"

    def __init__(self, chemin: str, validateur: int, racine: bytes):
        self.chemin = chemin
        self.validateur = validateur
        self.racine = racine
        self.prochain = self._charger()

    MAX_PROCHAIN = 1 << 31

    def _charger(self) -> int:
        if not os.path.exists(self.chemin):
            return 0
        try:
            f = json.load(open(self.chemin, encoding="utf-8"))
        except (OSError, ValueError) as e:
            raise ValueError(f"{self.chemin} : illisible ({e})")
        if not isinstance(f, dict):
            raise ValueError(f"{self.chemin} : objet JSON attendu")
        if f.get("spec") != self.SPEC:
            raise ValueError(f"{self.chemin} : spec {f.get('spec')!r} inattendue")
        if f.get("validateur") != self.validateur or f.get("racine") != self.racine.hex():
            raise ValueError(f"{self.chemin} : etat d'une autre cle (validateur "
                             f"{f.get('validateur')}, racine {str(f.get('racine'))[:16]}…)")
        p = f.get("prochain")
        if type(p) is not int or not (0 <= p <= self.MAX_PROCHAIN):
            raise ValueError(f"{self.chemin} : prochain indice invalide {p!r}")
        return p

    def _verrou(self):
        """Descripteur verrouille en exclusif, non bloquant ; U.Rejet si un
        autre processus le tient. Rendu par os.close (et a la mort du processus)."""
        fd = os.open(self.chemin + ".lock", os.O_RDWR | os.O_CREAT, 0o600)
        try:
            if os.name == "nt":
                import msvcrt
                msvcrt.locking(fd, msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError:
            os.close(fd)
            raise U.Rejet(f"{self.chemin} : compteur tenu par un autre processus, "
                          f"signature refusee")
        return fd

    def _liberer(self, fd):
        try:
            if os.name == "nt":
                import msvcrt
                os.lseek(fd, 0, 0)
                msvcrt.locking(fd, msvcrt.LK_UNLCK, 1)
            else:
                import fcntl
                fcntl.flock(fd, fcntl.LOCK_UN)
        finally:
            os.close(fd)

    def reserver(self, i: int):
        fd = self._verrou()
        try:
            self.prochain = max(self.prochain, self._charger())   # le disque fait foi
            if i < self.prochain:
                raise U.Rejet(f"indice MSS {i} en dessous de l'etat persistant "
                              f"({self.prochain}) : compteur recule, signature refusee")
            tmp = self.chemin + ".tmp"
            with open(tmp, "w", encoding="utf-8") as fh:
                json.dump({"spec": self.SPEC, "validateur": self.validateur,
                           "racine": self.racine.hex(), "prochain": i + 1}, fh, indent=1)
                fh.flush()
                os.fsync(fh.fileno())
            os.replace(tmp, self.chemin)
            if os.name != "nt":
                d = os.open(os.path.dirname(os.path.abspath(self.chemin)), os.O_RDONLY)
                try:
                    os.fsync(d)
                finally:
                    os.close(d)
            self.prochain = i + 1
        finally:
            self._liberer(fd)


class CleValidateur:
    """Cle a 2^hauteur usages. Cle publique = (racine, graine publique),
    compteur prive. Feuille i = arbre L de la cle WOTS+ i, adresses de
    hachage indexees par i (RFC 8391)."""

    def __init__(self, seed: bytes, hauteur: int = HAUTEUR_MSS):
        self.seed = seed
        self.hauteur = hauteur
        self.n = 1 << hauteur
        self.graine_pub = W.graine_publique(seed)
        self.feuilles = [self._feuille(i) for i in range(self.n)]
        self.niveaux = [self.feuilles]
        k = 0
        while len(self.niveaux[-1]) > 1:
            bas = self.niveaux[-1]
            self.niveaux.append([
                W.rand_hash(bas[2 * i], bas[2 * i + 1], self.graine_pub, _ad_arbre(k, i))
                for i in range(len(bas) // 2)])
            k += 1
        self.racine = self.niveaux[-1][0]
        self.indice = 0
        self.compteur = None

    def attacher(self, compteur: "CompteurMSS"):
        """Lie l'etat persistant : l'indice courant ne descend jamais sous lui."""
        if compteur.racine != self.racine:
            raise ValueError("compteur d'une autre cle")
        if compteur.prochain > self.n:
            raise ValueError(f"{compteur.chemin} : prochain {compteur.prochain} > 2^{self.hauteur} "
                             f"signatures : fichier corrompu ou d'une autre cle")
        self.compteur = compteur
        self.indice = max(self.indice, compteur.prochain)
        return self

    def _feuille(self, i):
        pk = W.cle_publique(_graine_ots(self.seed, i), self.graine_pub, _ad_ots(i))
        return W.arbre_l(pk, self.graine_pub, _ad_l(i))

    def chemin(self, i):
        c, idx = [], i
        for niv in self.niveaux[:-1]:
            c.append(niv[idx ^ 1])
            idx >>= 1
        return c

    def signer(self, msg32: bytes):
        if self.indice >= self.n:
            raise RuntimeError("cle epuisee — 2^%d signatures atteintes" % self.hauteur)
        i = self.indice
        if self.compteur is not None:
            self.compteur.reserver(i)          # ecrit, ou refuse — avant de signer
        self.indice = i + 1
        sig = W.signer_wots(_graine_ots(self.seed, i), self.graine_pub, _ad_ots(i), msg32)
        return (i, sig, self.chemin(i))


def verifier_mss(racine: bytes, graine_pub: bytes, hauteur: int, msg32: bytes, sig) -> bool:
    """sig = (indice, signature WOTS+, chemin). La feuille est reconstruite
    depuis la signature, puis remontee jusqu'a la racine."""
    i, ots, chemin = sig
    if not (0 <= i < (1 << hauteur)) or len(chemin) != hauteur:
        return False
    pk = W.cle_depuis_signature(ots, graine_pub, _ad_ots(i), msg32)
    if pk is None:
        return False
    n = W.arbre_l(pk, graine_pub, _ad_l(i))
    idx = i
    for k, frere in enumerate(chemin):
        parent = idx >> 1
        if idx % 2 == 0:
            n = W.rand_hash(n, frere, graine_pub, _ad_arbre(k, parent))
        else:
            n = W.rand_hash(frere, n, graine_pub, _ad_arbre(k, parent))
        idx = parent
    return n == racine


# ==========================================================================
# 2. La federation
# ==========================================================================
class Federation:
    """racines et graines_pub : la cle publique XMSS de chaque validateur."""

    def __init__(self, racines, t0: int, hauteur=HAUTEUR_MSS, graines_pub=None):
        if len(racines) % PAS == 0:
            raise ValueError(
                f"n = {len(racines)} est divisible par {PAS} : la rotation "
                f"ne parcourrait pas tous les validateurs")
        if graines_pub is not None and len(graines_pub) != len(racines):
            raise ValueError("une graine publique par racine")
        self.racines = list(racines)
        self.graines_pub = list(graines_pub) if graines_pub is not None else None
        self.n = len(racines)
        self.t0 = t0
        self.hauteur = hauteur

    @classmethod
    def depuis_cles(cls, cles, t0: int, hauteur=HAUTEUR_MSS):
        return cls([c.racine for c in cles], t0, hauteur, [c.graine_pub for c in cles])

    def creneau(self, ts: int) -> int:
        return (ts - self.t0) // CRENEAU

    def proposant(self, creneau: int) -> int:
        return (PAS * creneau) % self.n

    def tour_complet(self):
        """Verifie que la rotation est bien une permutation."""
        return sorted(self.proposant(s) for s in range(self.n)) == list(range(self.n))


class ChaineFederee:
    """Enveloppe le carnet UTXO : verifications de federation d'abord,
    validation des transactions ensuite, par le meme code que la version
    preuve de travail."""

    def __init__(self, fed: Federation):
        self.fed = fed
        self.carnet = U.Carnet()
        self.creneaux = []      # creneau de chaque bloc
        self.proposants = []    # index du proposant de chaque bloc
        self.indices = {}       # validateur -> indices MSS deja consommes

    # ------------------------------------------------------------------
    def id_bloc(self, blk) -> bytes:
        """sha256d(E.header ‖ racine UTXO) : la racine est signee avec le bloc."""
        if "utxo_root" not in blk:
            raise U.Rejet("bloc sans racine UTXO")
        mr = U.merkle_root([t.txid() for t in blk["txs"]])
        return sha256d(U.entete_federe(blk, mr, blk["utxo_root"]))

    def appliquer_sans_verifier(self, blk):
        """Assume-valid : ni signature de validateur, ni temoins, ni creneau.
        La racine UTXO declaree est tout de meme comparee. Reserve a
        noeud.py --depuis, jamais par defaut."""
        if "utxo_root" not in blk:
            raise U.Rejet("bloc sans racine UTXO")
        h = self.carnet.valider_bloc(blk, verifier_temoins=False)
        self.creneaux.append(self.fed.creneau(blk["ts"]))
        self.proposants.append(blk["validateur"])
        self.indices.setdefault(blk["validateur"], set()).add(blk["sig"][0])
        self._noter_tete(blk, h)
        return h

    def _noter_tete(self, blk, h):
        """Ce qu'un temoin doit recevoir pour juger sans rejouer : l'en-tete
        etendu (il recompose id_bloc) et la signature XMSS du proposant."""
        self.tete_signee = {
            "hauteur": blk["height"], "prev": blk["prev"],
            "merkle": U.merkle_root([t.txid() for t in blk["txs"]]),
            "ts": blk["ts"], "utxo_root": blk["utxo_root"], "id_bloc": h,
            "validateur": blk["validateur"], "sig": blk["sig"],
        }

    def valider(self, blk, maintenant=None):
        f = self.fed
        s = f.creneau(blk["ts"])
        if s < 0:
            raise U.Rejet("creneau anterieur a la genese")
        if self.creneaux and s <= self.creneaux[-1]:
            raise U.Rejet(f"creneau {s} deja passe (dernier {self.creneaux[-1]})")
        # Gel temporel : un bloc date trop loin dans le futur rend tout
        # creneau reel « deja passe ». Une marge d'un creneau absorbe le
        # decalage d'horloge. Sauter un creneau (silence) reste permis.
        now = int(time.time()) if maintenant is None else maintenant
        courant = f.creneau(now)
        if s > courant + 1:
            raise U.Rejet(f"creneau {s} dans le futur (courant {courant})")
        attendu = f.proposant(s)
        v = blk.get("validateur")
        if v != attendu:
            raise U.Rejet(f"creneau {s} : proposant {attendu} attendu, {v} recu")
        if blk.get("bits", 0) != 0:
            raise U.Rejet("difficulte non nulle dans un consensus federe")

        sig = blk.get("sig")
        if sig is None:
            raise U.Rejet("bloc non signe")
        if f.graines_pub is None:
            raise U.Rejet("federation sans graines publiques : verification impossible")
        if not verifier_mss(f.racines[v], f.graines_pub[v], f.hauteur,
                            self.id_bloc(blk), sig):
            raise U.Rejet("signature de validateur invalide")
        i = sig[0]
        if i in self.indices.get(v, set()):
            raise U.Rejet(f"indice MSS {i} deja employe par le validateur {v}")

        h = self.carnet.valider_bloc(blk)      # transactions, emission, UTXO, racine
        self.creneaux.append(s)
        self.proposants.append(v)
        self.indices.setdefault(v, set()).add(i)
        self._noter_tete(blk, h)
        return h

    def creneaux_sautes(self):
        """Trous interieurs : creneaux sans bloc entre le premier et le dernier."""
        sautes = []
        for a, b in zip(self.creneaux, self.creneaux[1:]):
            if b > a + 1:
                sautes.extend(range(a + 1, b))
        return sautes

    # ------------------------------------------------------------------
    def seuil(self) -> int:
        return 2 * self.fed.n // 3 + 1        # independant du pas de rotation

    def finalise(self, hauteur: int) -> bool:
        """Vrai si plus de 2n/3 validateurs distincts ont bati par-dessus."""
        return len(set(self.proposants[hauteur + 1:])) >= self.seuil()

    def derniere_finalisee(self):
        for h in range(len(self.proposants) - 1, -1, -1):
            if self.finalise(h):
                return h
        return None


def forger(chaine, cles, txs, ts):
    """Construit et signe un bloc pour le creneau de ts."""
    f = chaine.fed
    v = f.proposant(f.creneau(ts))
    blk = {"height": chaine.carnet.hauteur + 1, "prev": chaine.carnet.tete,
           "ts": ts, "nonce": 0, "bits": 0, "txs": txs, "validateur": v}
    blk["utxo_root"] = U.racine_apres(chaine.carnet, blk)
    blk["sig"] = cles[v].signer(chaine.id_bloc(blk))
    return blk


# ==========================================================================
# 3. Auto-tests
# ==========================================================================
def cles_de_test(n=7, hauteur=6):
    return [CleValidateur(sha256(f"validateur/{i}".encode()), hauteur)
            for i in range(n)]


def tests():
    ok = 0
    t0 = 1756540680

    t = time.time()
    cles = cles_de_test()
    print(f"7 cles de validateur (2^6 usages) : {(time.time() - t) * 1000:.0f} ms"); ok += 1

    # -- MSS ----------------------------------------------------------------
    m = sha256(b"bloc")
    s0 = cles[0].signer(m)
    g0, g1 = cles[0].graine_pub, cles[1].graine_pub
    assert verifier_mss(cles[0].racine, g0, 6, m, s0)
    assert not verifier_mss(cles[1].racine, g1, 6, m, s0)
    assert not verifier_mss(cles[0].racine, g1, 6, m, s0)
    assert not verifier_mss(cles[0].racine, g0, 6, sha256(b"autre"), s0)
    faux = (s0[0], s0[1], [bytes(32)] + s0[2][1:])
    assert not verifier_mss(cles[0].racine, g0, 6, m, faux)
    taille = 4 + len(s0[1]) + 32 * len(s0[2])
    print(f"XMSS signe / verifie / rejette    : OK  ({taille:,} o par signature)"
          .replace(",", " ")); ok += 1

    altere = bytearray(s0[1]); altere[777] ^= 1
    assert not verifier_mss(cles[0].racine, g0, 6, m, (s0[0], bytes(altere), s0[2]))
    assert not verifier_mss(cles[0].racine, g0, 6, m, (s0[0] ^ 1, s0[1], s0[2]))
    print("signature alteree, ou indice change : refus"); ok += 1

    # -- rotation -----------------------------------------------------------
    fed = Federation.depuis_cles(cles, t0, hauteur=6)
    assert fed.tour_complet()
    ordre = [fed.proposant(s) for s in range(7)]
    print(f"rotation chaldeenne, pas de {PAS}    : {ordre}"); ok += 1
    try:
        Federation([b""] * 9, t0); raise AssertionError("n=9 aurait du etre refuse")
    except ValueError:
        print("n divisible par 3 refuse         : OK"); ok += 1

    # -- chaine -------------------------------------------------------------
    ch = ChaineFederee(fed)
    p = U.Portefeuille("tresor")
    for h in range(7):
        blk = forger(ch, cles, [U.coinbase(h, p.nouvelle_adresse())],
                     t0 + h * CRENEAU)
        ch.valider(blk)
    circ = sum(m for _, m in ch.carnet.utxo.values())
    assert circ == ch.carnet.emission_cumulee()
    print(f"7 blocs, un tour complet          : "
          f"{circ / E.ATOMES:.6f} EIDOLON = emission"); ok += 1

    # -- refus attendus -----------------------------------------------------
    def doit_echouer(label, fn):
        nonlocal ok
        try:
            fn()
        except U.Rejet as e:
            print(f"refus : {label:<24}: {e}"); ok += 1; return
        raise AssertionError(f"{label} aurait du etre rejete")

    ts8 = t0 + 7 * CRENEAU

    def mauvais_proposant():
        blk = forger(ch, cles, [U.coinbase(7, p.nouvelle_adresse())], ts8)
        blk["validateur"] = (blk["validateur"] + 1) % 7
        ch.valider(blk)
    doit_echouer("proposant non designe", mauvais_proposant)

    def signature_dautrui():
        blk = forger(ch, cles, [U.coinbase(7, p.nouvelle_adresse())], ts8)
        v = blk["validateur"]
        blk["sig"] = cles[(v + 2) % 7].signer(ch.id_bloc(blk))
        ch.valider(blk)
    doit_echouer("signature d'un autre", signature_dautrui)

    def creneau_recule():
        blk = forger(ch, cles, [U.coinbase(7, p.nouvelle_adresse())],
                     t0 + 2 * CRENEAU)
        ch.valider(blk)
    doit_echouer("creneau deja passe", creneau_recule)

    def indice_reemploye():
        # l'attaque propre aux signatures a etat : le validateur recule son
        # compteur pour resigner avec une cle a usage unique deja consommee
        v = fed.proposant(fed.creneau(ts8))
        cles[v].indice = min(ch.indices[v])
        ch.valider(forger(ch, cles, [U.coinbase(7, p.nouvelle_adresse())], ts8))
    doit_echouer("compteur MSS recule", indice_reemploye)

    def avec_preuve_de_travail():
        blk = forger(ch, cles, [U.coinbase(7, p.nouvelle_adresse())], ts8)
        blk["bits"] = 12
        ch.valider(blk)
    doit_echouer("difficulte non nulle", avec_preuve_de_travail)

    def sans_racine():
        blk = forger(ch, cles, [U.coinbase(7, p.nouvelle_adresse())], ts8)
        del blk["utxo_root"]
        ch.valider(blk)
    doit_echouer("bloc sans racine UTXO", sans_racine)

    def creneau_futur():
        # gel temporel : un bloc signe en l'an 2100 rend tout creneau reel « passe »
        ts = int(time.time()) + 100 * 365 * 24 * 3600
        ch.valider(forger(ch, cles, [U.coinbase(7, p.nouvelle_adresse())], ts))
    doit_echouer("creneau dans le futur", creneau_futur)

    # -- vivacite : silence permis, quorum independant du pas --------------
    cles_v = cles_de_test()
    fed_v = Federation.depuis_cles(cles_v, t0, hauteur=6)
    ch_v = ChaineFederee(fed_v)
    p_v = U.Portefeuille("vivacite")
    ch_v.valider(forger(ch_v, cles_v, [U.coinbase(0, p_v.nouvelle_adresse())], t0))
    ch_v.valider(forger(ch_v, cles_v, [U.coinbase(1, p_v.nouvelle_adresse())],
                        t0 + 2 * CRENEAU))
    assert ch_v.creneaux == [0, 2] and ch_v.creneaux_sautes() == [1]
    print("saut de creneau (silence)         : OK"); ok += 1

    cles_q = cles_de_test()
    fed_q = Federation.depuis_cles(cles_q, t0, hauteur=6)
    ch_q = ChaineFederee(fed_q)
    p_q = U.Portefeuille("quorum")
    for h in range(4):
        ch_q.valider(forger(ch_q, cles_q,
                            [U.coinbase(h, p_q.nouvelle_adresse())],
                            t0 + h * CRENEAU))
    assert ch_q.seuil() == 2 * fed_q.n // 3 + 1 == 5
    assert all(not ch_q.finalise(h) for h in range(4))
    print("quorum 4/7 insuffisant            : OK"); ok += 1

    # -- finalite -----------------------------------------------------------
    print(f"\nseuil de finalite : {ch.seuil()} validateurs distincts sur {fed.n}")
    for h in range(4):
        etat = "final" if ch.finalise(h) else "en attente"
        print(f"  bloc {h} : {len(set(ch.proposants[h + 1:]))} validateurs "
              f"au-dessus -> {etat}")
    assert ch.finalise(0) and not ch.finalise(5)
    print(f"derniere hauteur finalisee : {ch.derniere_finalisee()}"); ok += 1

    # -- etat persistant : le compteur ne recule jamais ---------------------
    import tempfile
    dossier = tempfile.mkdtemp()
    chemin = os.path.join(dossier, "indice-0.json")
    kp = CleValidateur(sha256(b"validateur/persistant"), 4)
    kp.attacher(CompteurMSS(chemin, 0, kp.racine))
    s1 = kp.signer(m)
    assert s1[0] == 0 and json.load(open(chemin))["prochain"] == 1
    kp.signer(m)
    kp.indice = 1                              # sauvegarde ancienne restauree
    try:
        kp.signer(m); raise AssertionError("indice recule accepte")
    except U.Rejet as e:
        assert "recule" in str(e)
    # relecture depuis le fichier : on repart au-dessus, jamais en dessous
    kp2 = CleValidateur(sha256(b"validateur/persistant"), 4)
    kp2.attacher(CompteurMSS(chemin, 0, kp2.racine))
    assert kp2.indice == 2 and kp2.signer(m)[0] == 2
    try:
        CompteurMSS(chemin, 1, kp2.racine); raise AssertionError("fichier d'une autre cle accepte")
    except ValueError:
        pass
    # deux objets sur le meme fichier : le disque fait foi, pas la memoire
    ka = CleValidateur(sha256(b"validateur/persistant"), 4)
    kb = CleValidateur(sha256(b"validateur/persistant"), 4)
    ka.attacher(CompteurMSS(chemin, 0, ka.racine)); kb.attacher(CompteurMSS(chemin, 0, kb.racine))
    ia = ka.signer(m)[0]
    try:                                       # kb croit l'indice libre : le disque dit non
        kb.signer(m); raise AssertionError("second objet a signe l'indice du premier")
    except U.Rejet as e:
        assert "recule" in str(e)
    kb.indice = kb.compteur.prochain           # relu sous verrou par le refus
    ib = kb.signer(m)[0]
    assert ib == ia + 1, f"deux objets, meme indice {ia} / {ib}"
    # verrou tenu par un autre : signature refusee, jamais de double
    fd = kb.compteur._verrou()
    try:
        ka.signer(m); raise AssertionError("signe malgre le verrou")
    except U.Rejet as e:
        assert "autre processus" in str(e)
    finally:
        kb.compteur._liberer(fd)
    ka.compteur.prochain = ka.compteur._charger(); ka.indice = ka.compteur.prochain
    assert ka.signer(m)[0] == ib + 1
    # fichier corrompu : jamais un retour a zero, toujours une erreur
    for contenu in ("", "[]", "null", '{"spec":"eidos-indice/1","validateur":0,"racine":"%s","prochain":true}' % ka.racine.hex(),
                    '{"spec":"eidos-indice/1","validateur":0,"racine":"%s","prochain":99999999999}' % ka.racine.hex()):
        open(chemin, "w", encoding="utf-8").write(contenu)
        try:
            CompteurMSS(chemin, 0, ka.racine); raise AssertionError(f"fichier corrompu accepte : {contenu[:20]!r}")
        except ValueError:
            pass
    open(chemin, "w", encoding="utf-8").write('{"spec":"eidos-indice/1","validateur":0,"racine":"%s","prochain":20}' % ka.racine.hex())
    try:
        CleValidateur(sha256(b"validateur/persistant"), 4).attacher(CompteurMSS(chemin, 0, ka.racine))
        raise AssertionError("prochain > 2^h accepte")
    except ValueError:
        pass
    print("compteur persistant : monotone, recul refuse, deux objets, verrou, fichiers corrompus : OK"); ok += 1

    # -- fourche : meme indice sur deux branches, refuse cote signataire ---------
    cles_f = cles_de_test(7, hauteur=4)
    dossier_f = tempfile.mkdtemp()
    for i, c in enumerate(cles_f):
        c.attacher(CompteurMSS(os.path.join(dossier_f, f"indice-{i}.json"), i, c.racine))
    fed_f = Federation.depuis_cles(cles_f, t0, hauteur=4)
    A = ChaineFederee(fed_f)
    pf = U.Portefeuille("fourche")
    prefixe = []
    for h in range(3):
        blk = forger(A, cles_f, [U.coinbase(h, pf.nouvelle_adresse())], t0 + h * CRENEAU)
        A.valider(blk, maintenant=t0 + h * CRENEAU)
        prefixe.append(blk)
    for h in range(3, 8):                        # chaque validateur a signe au moins une fois
        blk = forger(A, cles_f, [U.coinbase(h, pf.nouvelle_adresse())], t0 + h * CRENEAU)
        A.valider(blk, maintenant=t0 + h * CRENEAU)
        prefixe.append(blk)
    B = ChaineFederee(fed_f)
    for blk in prefixe:
        B.valider(blk, maintenant=t0 + 7 * CRENEAU)
    # creneau 8 : le proposant (qui a deja signe au creneau 1) signe sur A
    v8 = fed_f.proposant(8)
    assert B.indices.get(v8), "le proposant du creneau 8 doit avoir deja signe"
    blkA = forger(A, cles_f, [U.coinbase(8, pf.nouvelle_adresse())], t0 + 8 * CRENEAU)
    A.valider(blkA, maintenant=t0 + 8 * CRENEAU)
    i_signe = blkA["sig"][0]
    assert i_signe >= 1
    # sur B : un noeud NEUF (objets reconstruits depuis la graine et le fichier),
    # dont la chaine dit « indice libre » et qui rembobinerait le compteur
    neuf = CleValidateur(cles_f[v8].seed, 4)
    neuf.attacher(CompteurMSS(os.path.join(dossier_f, f"indice-{v8}.json"), v8, neuf.racine))
    neuf.indice = max(B.indices[v8]) + 1
    assert neuf.indice == i_signe, "la branche B croit l'indice libre"
    cles_B = list(cles_f); cles_B[v8] = neuf
    try:
        forger(B, cles_B, [U.coinbase(8, pf.nouvelle_adresse())], t0 + 8 * CRENEAU)
        raise AssertionError("meme indice signe sur deux branches")
    except U.Rejet as e:
        assert "recule" in str(e)
    # et B accepterait pourtant un bloc a cet indice : c'est bien le signataire qui protege
    assert i_signe not in B.indices.get(v8, set())
    print(f"fourche : indice {i_signe} du validateur {v8} deja signe sur A, refuse sur B par un noeud neuf : OK"); ok += 1

    # -- cout par bloc ------------------------------------------------------
    t = time.time()
    for _ in range(10):
        sg = cles[0].signer(m)
        verifier_mss(cles[0].racine, g0, 6, m, sg)
    dt = (time.time() - t) * 100
    print(f"\ncout d'un bloc : {dt:.2f} ms (signature + verification)")
    print(f"contre ~{2 ** 18:,} haches en preuve de travail a 18 bits"
          .replace(",", " "))

    print(f"\n{ok} verifications passees.")


def demo():
    t0 = 1756540680
    cles = cles_de_test(hauteur=6)
    fed = Federation.depuis_cles(cles, t0, hauteur=6)
    ch = ChaineFederee(fed)
    p = U.Portefeuille("tresor")
    print(f"{fed.n} validateurs, creneau de {CRENEAU} s, rotation de pas {PAS}\n")
    for h in range(14):
        ts = t0 + h * CRENEAU
        blk = forger(ch, cles, [U.coinbase(h, p.nouvelle_adresse())], ts)
        d = ch.valider(blk)
        fin = ch.derniere_finalisee()
        print(f"creneau {h:<3} validateur {blk['validateur']}  {d.hex()[:12]}  "
              f"+{E.reward_at(h) / E.ATOMES:.6f}  "
              f"final jusqu'a {fin if fin is not None else '-'}")
    circ = sum(m for _, m in ch.carnet.utxo.values())
    print(f"\nen circulation {circ / E.ATOMES:.6f} = emission "
          f"{ch.carnet.emission_cumulee() / E.ATOMES:.6f}")
    print(f"indices MSS consommes : "
          f"{ {v: len(s) for v, s in sorted(ch.indices.items())} }")


if __name__ == "__main__":
    demo() if "--demo" in sys.argv else tests()
