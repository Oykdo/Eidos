#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
federation.py — consensus par federation de validateurs.

Remplace la course au hachage par une rotation de proposants. Sept
validateurs, un creneau de dix minutes chacun, le proposant designe a
l'avance. L'energie depensee par bloc est celle d'une signature : bornee
par construction, et mesuree a la fin des tests.

Trois pieces :

  1. Signatures Merkle (MSS). Lamport ne signe qu'une fois ; un validateur
     doit signer des milliers de blocs. On genere 2^k cles Lamport, on en
     range les haches dans un arbre de Merkle, et la cle publique du
     validateur est la racine — 32 octets, immuable. Chaque signature
     revele une feuille et son chemin d'authentification. C'est le schema
     XMSS reduit a l'essentiel, entierement fonde sur le hachage, donc
     post-quantique. Il est ETATIQUE : un indice ne sert qu'une fois, et le
     compteur doit survivre aux redemarrages.

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

import hashlib, os, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import eonis as E
import utxo as U

sha256 = U.sha256
sha256d = U.sha256d

CRENEAU = 600          # secondes
PAS = 3                # rotation chaldeenne
HAUTEUR_MSS = 10       # 2^10 = 1024 signatures par cle de validateur


# ==========================================================================
# 1. Signatures Merkle multi-usages
# ==========================================================================
def _graine_ots(seed, i):
    return sha256(seed + b"ots" + i.to_bytes(4, "big"))


def _feuille(seed, i):
    return sha256(U.lamport_public(U.lamport_secret(_graine_ots(seed, i))))


class CleValidateur:
    """Cle a 2^hauteur usages. Racine de Merkle publique, compteur prive."""

    def __init__(self, seed: bytes, hauteur: int = HAUTEUR_MSS):
        self.seed = seed
        self.hauteur = hauteur
        self.n = 1 << hauteur
        self.feuilles = [_feuille(seed, i) for i in range(self.n)]
        self.niveaux = [self.feuilles]
        while len(self.niveaux[-1]) > 1:
            bas = self.niveaux[-1]
            self.niveaux.append([sha256d(bas[i] + bas[i + 1])
                                 for i in range(0, len(bas), 2)])
        self.racine = self.niveaux[-1][0]
        self.indice = 0

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
        self.indice += 1
        sk = U.lamport_secret(_graine_ots(self.seed, i))
        return (i, U.lamport_public(sk), U.lamport_sign(sk, msg32), self.chemin(i))


def verifier_mss(racine: bytes, hauteur: int, msg32: bytes, sig) -> bool:
    i, pk, ots, chemin = sig
    if not (0 <= i < (1 << hauteur)) or len(chemin) != hauteur:
        return False
    if not U.lamport_verify(pk, msg32, ots):
        return False
    n = sha256(pk)
    idx = i
    for frere in chemin:
        n = sha256d(n + frere) if idx % 2 == 0 else sha256d(frere + n)
        idx >>= 1
    return n == racine


# ==========================================================================
# 2. La federation
# ==========================================================================
class Federation:
    def __init__(self, racines, t0: int, hauteur=HAUTEUR_MSS):
        if len(racines) % PAS == 0:
            raise ValueError(
                f"n = {len(racines)} est divisible par {PAS} : la rotation "
                f"ne parcourrait pas tous les validateurs")
        self.racines = list(racines)
        self.n = len(racines)
        self.t0 = t0
        self.hauteur = hauteur

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
        mr = U.merkle_root([t.txid() for t in blk["txs"]])
        return sha256d(E.header(blk["height"], blk["prev"], mr,
                                blk["ts"], blk["nonce"]))

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
        if not verifier_mss(f.racines[v], f.hauteur, self.id_bloc(blk), sig):
            raise U.Rejet("signature de validateur invalide")
        i = sig[0]
        if i in self.indices.get(v, set()):
            raise U.Rejet(f"indice MSS {i} deja employe par le validateur {v}")

        h = self.carnet.valider_bloc(blk)      # transactions, emission, UTXO
        self.creneaux.append(s)
        self.proposants.append(v)
        self.indices.setdefault(v, set()).add(i)
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
    assert verifier_mss(cles[0].racine, 6, m, s0)
    assert not verifier_mss(cles[1].racine, 6, m, s0)
    assert not verifier_mss(cles[0].racine, 6, sha256(b"autre"), s0)
    faux = (s0[0], s0[1], s0[2], [bytes(32)] + s0[3][1:])
    assert not verifier_mss(cles[0].racine, 6, m, faux)
    taille = 4 + len(s0[1]) + len(s0[2]) + 32 * len(s0[3])
    print(f"MSS signe / verifie / rejette     : OK  ({taille:,} o par signature)"
          .replace(",", " ")); ok += 1

    # -- rotation -----------------------------------------------------------
    fed = Federation([c.racine for c in cles], t0, hauteur=6)
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

    def creneau_futur():
        # gel temporel : un bloc signe en l'an 2100 rend tout creneau reel « passe »
        ts = int(time.time()) + 100 * 365 * 24 * 3600
        ch.valider(forger(ch, cles, [U.coinbase(7, p.nouvelle_adresse())], ts))
    doit_echouer("creneau dans le futur", creneau_futur)

    # -- vivacite : silence permis, quorum independant du pas --------------
    cles_v = cles_de_test()
    fed_v = Federation([c.racine for c in cles_v], t0, hauteur=6)
    ch_v = ChaineFederee(fed_v)
    p_v = U.Portefeuille("vivacite")
    ch_v.valider(forger(ch_v, cles_v, [U.coinbase(0, p_v.nouvelle_adresse())], t0))
    ch_v.valider(forger(ch_v, cles_v, [U.coinbase(1, p_v.nouvelle_adresse())],
                        t0 + 2 * CRENEAU))
    assert ch_v.creneaux == [0, 2] and ch_v.creneaux_sautes() == [1]
    print("saut de creneau (silence)         : OK"); ok += 1

    cles_q = cles_de_test()
    fed_q = Federation([c.racine for c in cles_q], t0, hauteur=6)
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

    # -- cout par bloc ------------------------------------------------------
    t = time.time()
    for _ in range(10):
        sg = cles[0].signer(m)
        verifier_mss(cles[0].racine, 6, m, sg)
    dt = (time.time() - t) * 100
    print(f"\ncout d'un bloc : {dt:.2f} ms (signature + verification)")
    print(f"contre ~{2 ** 18:,} haches en preuve de travail a 18 bits"
          .replace(",", " "))

    print(f"\n{ok} verifications passees.")


def demo():
    t0 = 1756540680
    cles = cles_de_test(hauteur=6)
    fed = Federation([c.racine for c in cles], t0, hauteur=6)
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
