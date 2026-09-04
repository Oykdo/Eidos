#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
utxo.py — carnet UTXO, transactions et validation de chaine.
Bibliotheque standard uniquement. Complement de eonis.py.

Signatures : WOTS+ (wots.py), schema a usage unique fonde uniquement sur
SHA-256, donc resistant au quantique par construction — la brique de XMSS
et de SPHINCS+. Verifiable publiquement : le validateur reconstruit la cle
publique depuis la signature et la compare a l'adresse, il n'a besoin
d'aucun secret. Temoin de 2 176 octets (graine publique 32 + signature
2 144) ; Lamport en demandait 24 576.

Racine UTXO : chaque bloc federe declare la racine de Merkle du carnet
entier apres lui (feuille = sha256d(txid ‖ rang ‖ adresse ‖ montant), ordre
(txid, rang), meme regle que merkle.ts). L'identifiant du bloc federe est
sha256d(E.header ‖ racine) : E.header reste gele, la racine s'y ajoute.
Un temoin qui connait une tete signee juge une preuve sans rejouer.

Contrainte a assumer : une cle WOTS+ ne signe QU'UNE FOIS. Signer deux
fois avec la meme cle revele des maillons intermediaires et permet de
forger. La regle est donc inscrite dans la validation : une empreinte de
cle ne peut apparaitre qu'une seule fois dans toute la chaine.

Usage :  python3 utxo.py           auto-tests
         python3 utxo.py --demo    construit et valide une chaine de 4 blocs

AVERTISSEMENT. Prototype de specification. Pas de reseau, pas de gestion de
portefeuille, pas de protection des secrets en memoire.
"""

import copy, hashlib, hmac, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import eonis as E
import wots as W

VERSION = 2                # 1 : temoins Lamport ; 2 : temoins WOTS+
COINBASE_TXID = bytes(32)


def sha256(b): return hashlib.sha256(b).digest()
def sha256d(b): return sha256(sha256(b))


# ==========================================================================
# 1. Signatures WOTS+ — voir wots.py
# ==========================================================================
def adresse_de(graine: bytes) -> bytes:
    """20 octets : SHA-256(graine publique ‖ racine de l'arbre L)[:20]."""
    return W.adresse_de(graine)


def signer_temoin(graine: bytes, msg32: bytes):
    """(graine publique, signature WOTS+) — 2 176 octets."""
    return W.signer(graine, msg32)


# ==========================================================================
# 2. Adresses — 20 octets, somme de controle en glyphes a trois figures
# ==========================================================================


def addr_encode(a20: bytes) -> str:
    """27 glyphes de charge utile + 4 glyphes de controle (24 bits)."""
    if len(a20) != 20:
        raise ValueError("adresse de 20 octets attendue")
    cs = sha256d(a20)[:3]
    return E.encode_glyphs(a20) + "  |  " + E.encode_glyphs(cs)


def addr_decode(s: str) -> bytes:
    """Rejette toute adresse dont le controle ne concorde pas."""
    corps, _, ctrl = s.partition("|")
    a20 = E.decode_glyphs(corps.strip(), 20)
    cs = E.decode_glyphs(ctrl.strip(), 3)
    if sha256d(a20)[:3] != cs:
        raise ValueError("somme de controle invalide")
    return a20


# ==========================================================================
# 3. Transactions
# ==========================================================================
class Tx:
    """inputs : liste de (txid, vout). outputs : liste de (adresse20, atomes).
    witness : liste de (graine publique, signature WOTS+), hors txid."""

    def __init__(self, inputs, outputs):
        self.inputs = list(inputs)
        self.outputs = list(outputs)
        self.witness = [None] * len(self.inputs)

    def core(self) -> bytes:
        """Serialisation canonique, temoin exclu : le txid ne bouge pas quand
        on signe (meme principe que segwit)."""
        b = VERSION.to_bytes(4, "big") + len(self.inputs).to_bytes(2, "big")
        for txid, vout in self.inputs:
            b += txid + vout.to_bytes(4, "big")
        b += len(self.outputs).to_bytes(2, "big")
        for addr, amount in self.outputs:
            b += addr + amount.to_bytes(8, "big")
        return b

    def txid(self) -> bytes:
        return sha256d(self.core())

    def sighash(self, index: int) -> bytes:
        return sha256(self.txid() + index.to_bytes(4, "big"))

    def sign(self, index: int, seed: bytes):
        self.witness[index] = W.signer(seed, self.sighash(index))

    def is_coinbase(self) -> bool:
        return len(self.inputs) == 1 and self.inputs[0][0] == COINBASE_TXID

    def total_out(self) -> int:
        return sum(a for _, a in self.outputs)


def coinbase(height: int, addr: bytes, fees: int = 0) -> Tx:
    tx = Tx([(COINBASE_TXID, height)], [(addr, E.reward_at(height) + fees)])
    tx.witness = [None]
    return tx


# ==========================================================================
# 4. Merkle
# ==========================================================================
def merkle_root(txids):
    if not txids:
        return bytes(32)
    lvl = list(txids)
    while len(lvl) > 1:
        if len(lvl) % 2:
            lvl.append(lvl[-1])
        lvl = [sha256d(lvl[i] + lvl[i + 1]) for i in range(0, len(lvl), 2)]
    return lvl[0]


# ==========================================================================
# 4b. Racine UTXO — engagement sur le carnet entier, dans l'en-tete federe
# ==========================================================================
def feuille_sortie(txid, rang, adresse, montant):
    """sha256d(txid ‖ rang(4) ‖ adresse(20) ‖ montant(8)) — meme regle que merkle.ts."""
    return sha256d(txid + rang.to_bytes(4, "big") + adresse + montant.to_bytes(8, "big"))


def utxo_root(utxo):
    """Merkle SHA-256d des feuilles en ordre canonique (txid, rang).
    Carnet vide : 32 octets nuls."""
    return merkle_root([feuille_sortie(t, r, a, m)
                        for (t, r), (a, m) in sorted(utxo.items())])


def entete_federe(blk, merkle, racine):
    """E.header (gele, 88 o) suivi de la racine UTXO apres le bloc : 120 o.
    id_bloc federe = sha256d(entete_federe)."""
    return E.header(blk["height"], blk["prev"], merkle, blk["ts"], blk["nonce"]) + racine


def racine_apres(carnet, blk):
    """Racine UTXO qu'aurait le carnet apres ce bloc, sans le modifier : le
    forgeron l'inscrit dans le bloc avant de signer. Meme code qu'a la
    validation ; leve Rejet si le bloc est fautif."""
    c = copy.deepcopy(carnet)
    b = dict(blk)
    b.pop("utxo_root", None)
    c.valider_bloc(b)
    return c.racine_utxo


# ==========================================================================
# 5. Carnet UTXO et validation
# ==========================================================================
class Rejet(Exception):
    pass


class Carnet:
    def __init__(self):
        self.utxo = {}            # (txid, vout) -> (adresse20, atomes)
        self.cles_usees = set()   # empreintes de cles WOTS+ deja employees
        self.hauteur = -1
        self.tete = bytes(32)
        self.racine_utxo = bytes(32)

    def solde(self, addr: bytes) -> int:
        return sum(a for ad, a in self.utxo.values() if ad == addr)

    def emission_cumulee(self) -> int:
        return sum(E.reward_at(h) for h in range(self.hauteur + 1))

    # ----------------------------------------------------------------------
    def valider_bloc(self, blk, verifier_temoins=True):
        """blk : dict {height, prev, ts, nonce, bits, txs, [utxo_root]}. Leve Rejet.
        Avec utxo_root, la racine declaree doit etre celle du carnet apres le
        bloc, et la tete devient sha256d(entete_federe). verifier_temoins=False
        saute la reconstruction des cles WOTS+ (assume-valid EXPLICITE de
        noeud.py --depuis) : les cles de ces blocs ne sont pas notees."""
        txs = blk["txs"]
        if not txs or not txs[0].is_coinbase():
            raise Rejet("premiere transaction non coinbase")
        if any(t.is_coinbase() for t in txs[1:]):
            raise Rejet("coinbase multiple")
        if blk["height"] != self.hauteur + 1:
            raise Rejet(f"hauteur {blk['height']} apres {self.hauteur}")
        if blk["prev"] != self.tete:
            raise Rejet("chainage rompu")

        # preuve de travail
        mr = merkle_root([t.txid() for t in txs])
        h = sha256d(E.header(blk["height"], blk["prev"], mr, blk["ts"], blk["nonce"]))
        if int.from_bytes(h, "big") >= (1 << (256 - blk["bits"])):
            raise Rejet("preuve de travail insuffisante")

        # transactions ordinaires
        depenses, ajouts, frais = set(), {}, 0
        cles_bloc = set()
        for tx in txs[1:]:
            if not tx.inputs:
                raise Rejet("transaction sans entree")
            if not tx.outputs:
                raise Rejet("transaction sans sortie")
            entree = 0
            for i, (ptxid, vout) in enumerate(tx.inputs):
                cle = (ptxid, vout)
                if cle in depenses:
                    raise Rejet("double depense dans le bloc")
                if cle not in self.utxo:
                    raise Rejet(f"entree inconnue ou deja depensee {ptxid.hex()[:8]}:{vout}")
                addr, montant = self.utxo[cle]
                w = tx.witness[i]
                if w is None:
                    raise Rejet("temoin absent")
                if verifier_temoins:
                    racine = W.racine_depuis_temoin(w, tx.sighash(i))
                    if racine is None:
                        raise Rejet("temoin malforme")
                    if W.adresse(w[0], racine) != addr:
                        raise Rejet("signature invalide : la cle reconstruite "
                                    "ne donne pas l'adresse")
                    emp = W.empreinte(w[0], racine)
                    if emp in self.cles_usees or emp in cles_bloc:
                        raise Rejet("cle WOTS+ reutilisee — usage unique")
                    cles_bloc.add(emp)
                depenses.add(cle)
                entree += montant
            sortie = tx.total_out()
            if any(a <= 0 for _, a in tx.outputs):
                raise Rejet("sortie nulle ou negative")
            if sortie > entree:
                raise Rejet("creation de valeur ex nihilo")
            frais += entree - sortie
            for v, (addr, montant) in enumerate(tx.outputs):
                ajouts[(tx.txid(), v)] = (addr, montant)

        # coinbase : exactement la recompense de la table, plus les frais
        attendu = E.reward_at(blk["height"]) + frais
        if txs[0].total_out() != attendu:
            raise Rejet(f"coinbase {txs[0].total_out()} au lieu de {attendu}")

        # racine UTXO apres le bloc, calculee avant d'appliquer
        nouveau = dict(self.utxo)
        for cle in depenses:
            del nouveau[cle]
        for v, (addr, montant) in enumerate(txs[0].outputs):
            nouveau[(txs[0].txid(), v)] = (addr, montant)
        nouveau.update(ajouts)
        racine = utxo_root(nouveau)
        if "utxo_root" in blk:
            if blk["utxo_root"] != racine:
                raise Rejet(f"racine UTXO {blk['utxo_root'].hex()[:8]} "
                            f"au lieu de {racine.hex()[:8]}")
            h = sha256d(entete_federe(blk, mr, racine))

        # application
        self.utxo = nouveau
        self.cles_usees |= cles_bloc
        self.hauteur = blk["height"]
        self.tete = h
        self.racine_utxo = racine
        return h


def miner_bloc(carnet, txs, bits=12, ts=1756540680):
    h = carnet.hauteur + 1
    mr = merkle_root([t.txid() for t in txs])
    cible = 1 << (256 - bits)
    nonce = 0
    while True:
        d = sha256d(E.header(h, carnet.tete, mr, ts, nonce))
        if int.from_bytes(d, "big") < cible:
            return {"height": h, "prev": carnet.tete, "ts": ts,
                    "nonce": nonce, "bits": bits, "txs": txs}
        nonce += 1


# ==========================================================================
# 6. Auto-tests
# ==========================================================================
class Portefeuille:
    """Une cle WOTS+ ne signant qu'une fois, chaque adresse est a usage
    unique. Le portefeuille en produit une nouvelle a chaque besoin et retient
    la graine correspondante."""

    def __init__(self, nom):
        self.nom, self.n, self.graines = nom, 0, {}

    def nouvelle_adresse(self) -> bytes:
        s = sha256(f"{self.nom}/{self.n}".encode())
        self.n += 1
        a = W.adresse_de(s)
        self.graines[a] = s
        return a

    def signer(self, tx, index, addr):
        tx.sign(index, self.graines[addr])

    def solde(self, carnet) -> int:
        return sum(m for ad, m in carnet.utxo.values() if ad in self.graines)

    def sorties(self, carnet):
        return [(k, v) for k, v in carnet.utxo.items() if v[0] in self.graines]


def tests():
    ok = 0

    # -- WOTS+ --------------------------------------------------------------
    s = sha256(b"alice/0")
    m = sha256(b"message")
    a = adresse_de(s)
    temoin = signer_temoin(s, m)
    assert W.verifier(a, m, temoin)
    assert not W.verifier(a, sha256(b"autre"), temoin)
    faux = bytearray(temoin[1]); faux[0] ^= 1
    assert not W.verifier(a, m, (temoin[0], bytes(faux)))
    print(f"WOTS+ signe/verifie           : OK  (temoin {len(temoin[0]) + len(temoin[1])} o)"); ok += 1

    # -- adresses -----------------------------------------------------------
    enc = addr_encode(a)
    assert addr_decode(enc) == a
    corrompu = enc.replace("\u25cb", "\u271a", 1)
    try:
        addr_decode(corrompu); raise AssertionError("corruption non detectee")
    except ValueError:
        pass
    print(f"adresse : controle a 24 bits  : OK  ({len(enc.split()) - 1} glyphes)"); ok += 1

    # -- racine UTXO --------------------------------------------------------
    u = {(sha256(b"b"), 1): (a, 5), (sha256(b"a"), 0): (a, 7), (sha256(b"b"), 0): (a, 9)}
    feuilles = [feuille_sortie(t, r, ad, m) for (t, r), (ad, m) in sorted(u.items())]
    assert utxo_root(u) == utxo_root(dict(reversed(list(u.items())))) == merkle_root(feuilles)
    assert utxo_root({}) == bytes(32)
    print("racine UTXO canonique         : OK  (ordre (txid, rang), 3 sorties)"); ok += 1

    # -- chaine -------------------------------------------------------------
    c = Carnet()
    alice, bob = Portefeuille("alice"), Portefeuille("bob")

    a0 = alice.nouvelle_adresse()
    c.valider_bloc(miner_bloc(c, [coinbase(0, a0)]))
    r0 = E.reward_at(0)
    assert alice.solde(c) == r0
    print(f"bloc 0 : coinbase creditee    : {r0 / E.ATOMES:.6f} EIDOLON"); ok += 1

    # Alice paie Bob, rend la monnaie sur une adresse fraiche, laisse des frais
    cb0 = [k for k, v in c.utxo.items() if v[0] == a0][0]
    envoi, frais = 5 * E.ATOMES, 1000
    b0 = bob.nouvelle_adresse()
    tx = Tx([cb0], [(b0, envoi), (alice.nouvelle_adresse(), r0 - envoi - frais)])
    alice.signer(tx, 0, a0)
    c.valider_bloc(miner_bloc(c, [coinbase(1, alice.nouvelle_adresse(), fees=frais), tx]))
    assert bob.solde(c) == envoi
    print(f"bloc 1 : transfert + frais    : Bob {bob.solde(c) / E.ATOMES:.2f} EIDOLON, "
          f"frais {frais} atomes"); ok += 1

    total = sum(m for _, m in c.utxo.values())
    assert total == c.emission_cumulee()
    assert c.racine_utxo == utxo_root(c.utxo)
    print(f"conservation de la valeur     : {total / E.ATOMES:.6f} = emission cumulee"); ok += 1

    # -- refus attendus -----------------------------------------------------
    def doit_echouer(label, fn):
        nonlocal ok
        etat = dict(c.utxo), set(c.cles_usees), c.hauteur, c.tete
        try:
            fn()
        except Rejet as e:
            c.utxo, c.cles_usees, c.hauteur, c.tete = etat[0], etat[1], etat[2], etat[3]
            print(f"refus : {label:<24}: {e}"); ok += 1; return
        raise AssertionError(f"{label} aurait du etre rejete")

    h = c.hauteur + 1

    doit_echouer("sortie deja depensee", lambda: (
        lambda t: (alice.signer(t, 0, a0), c.valider_bloc(miner_bloc(
            c, [coinbase(h, alice.nouvelle_adresse()), t])))
    )(Tx([cb0], [(b0, 1)])))

    def coinbase_gonflee():
        cb = Tx([(COINBASE_TXID, h)], [(alice.nouvelle_adresse(), E.reward_at(h) + 1)])
        cb.witness = [None]
        c.valider_bloc(miner_bloc(c, [cb]))
    doit_echouer("coinbase gonflee d'un atome", coinbase_gonflee)

    def valeur_ex_nihilo():
        (k, (ad, montant)) = alice.sorties(c)[0]
        t = Tx([k], [(b0, montant + 1)])
        alice.signer(t, 0, ad)
        c.valider_bloc(miner_bloc(c, [coinbase(h, alice.nouvelle_adresse()), t]))
    doit_echouer("creation de valeur", valeur_ex_nihilo)

    def chainage_rompu():
        blk = miner_bloc(c, [coinbase(h, alice.nouvelle_adresse())])
        blk["prev"] = bytes(32)
        c.valider_bloc(blk)
    doit_echouer("chainage rompu", chainage_rompu)

    def racine_fausse():
        blk = miner_bloc(c, [coinbase(h, alice.nouvelle_adresse())])
        blk["utxo_root"] = bytes(32)
        c.valider_bloc(blk)
    doit_echouer("racine UTXO fausse", racine_fausse)
    # la bonne racine, calculee sans toucher le carnet, est acceptee et
    # change la tete (en-tete etendu)
    blk = miner_bloc(c, [coinbase(h, alice.nouvelle_adresse())])
    blk["utxo_root"] = racine_apres(c, blk)
    etat = dict(c.utxo), set(c.cles_usees), c.hauteur, c.tete
    tete = c.valider_bloc(blk)
    assert tete == sha256d(entete_federe(blk, merkle_root([t.txid() for t in blk["txs"]]),
                                         blk["utxo_root"]))
    c.utxo, c.cles_usees, c.hauteur, c.tete = etat
    print("racine UTXO declaree, en-tete etendu : OK"); ok += 1

    def sans_entree():
        t = Tx([], [(b0, 1)])
        c.valider_bloc(miner_bloc(c, [coinbase(h, alice.nouvelle_adresse()), t]))
    doit_echouer("transaction sans entree", sans_entree)

    # -- la faute propre a l'usage unique : reemploi d'adresse --------------
    (k, (ad, montant)) = alice.sorties(c)[0]
    br = bob.nouvelle_adresse()
    t = Tx([k], [(br, montant // 2), (br, montant - montant // 2)])  # deux fois la meme
    alice.signer(t, 0, ad)
    c.valider_bloc(miner_bloc(c, [coinbase(h, alice.nouvelle_adresse()), t]))
    deux = [kk for kk, vv in c.utxo.items() if vv[0] == br]
    assert len(deux) == 2
    h += 1

    t1 = Tx([deux[0]], [(alice.nouvelle_adresse(), c.utxo[deux[0]][1] - 100)])
    bob.signer(t1, 0, br)
    c.valider_bloc(miner_bloc(c, [coinbase(h, alice.nouvelle_adresse(), fees=100), t1]))
    print(f"1re depense de Bob            : acceptee"); ok += 1
    h += 1

    def reemploi():
        t2 = Tx([deux[1]], [(alice.nouvelle_adresse(), c.utxo[deux[1]][1] - 100)])
        bob.signer(t2, 0, br)   # MEME cle WOTS+ que t1
        c.valider_bloc(miner_bloc(c, [coinbase(h, alice.nouvelle_adresse(), fees=100), t2]))
    doit_echouer("2e depense, meme cle", reemploi)

    total = sum(m for _, m in c.utxo.values())
    assert total == c.emission_cumulee()
    print(f"\n{ok} verifications passees.")
    print(f"hauteur {c.hauteur} | {len(c.utxo)} sorties non depensees | "
          f"{len(c.cles_usees)} cles consommees")
    print(f"total en circulation {total / E.ATOMES:.6f} = emission cumulee")


def demo():
    c = Carnet()
    alice, bob = Portefeuille("alice"), Portefeuille("bob")
    a = alice.nouvelle_adresse()
    print("adresse d'Alice, charge utile puis controle :")
    print(addr_encode(a), "\n")

    prec_addr, prec_out = a, None
    for h in range(4):
        txs = []
        frais = 0
        if prec_out is not None:
            frais = 500
            dest = bob.nouvelle_adresse() if h % 2 else alice.nouvelle_adresse()
            t = Tx([prec_out], [(dest, c.utxo[prec_out][1] - frais)])
            alice.signer(t, 0, prec_addr) if prec_addr in alice.graines \
                else bob.signer(t, 0, prec_addr)
            txs.append(t)
            prec_addr = dest
        cb_addr = alice.nouvelle_adresse()
        txs.insert(0, coinbase(h, cb_addr, fees=frais))
        blk = miner_bloc(c, txs, bits=14)
        d = c.valider_bloc(blk)
        prec_out = (txs[0].txid(), 0)
        prec_addr = cb_addr
        print(f"#{h}  {d.hex()[:16]}  nonce={blk['nonce']:<7} "
              f"recompense={E.reward_at(h) / E.ATOMES:.6f}  utxo={len(c.utxo)}")

    print(f"\nAlice {alice.solde(c) / E.ATOMES:.6f} + Bob {bob.solde(c) / E.ATOMES:.6f}"
          f" = {(alice.solde(c) + bob.solde(c)) / E.ATOMES:.6f} EIDOLON")
    print(f"emission cumulee : {c.emission_cumulee() / E.ATOMES:.6f} EIDOLON")
    print(f"cles WOTS+ consommees : {len(c.cles_usees)}")


if __name__ == "__main__":
    demo() if "--demo" in sys.argv else tests()
