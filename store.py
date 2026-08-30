#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
store.py — persistance de la chaine sur disque.

Le fichier chaine.dat est le seul etat conserve. Le carnet UTXO n'est jamais
enregistre : il est reconstruit par rejeu integral a chaque ouverture, chaque
bloc etant revalide. Une seule ligne de code de validation, donc, pour le
minage et pour le chargement — impossible d'accepter au rejeu ce qui aurait
ete refuse en direct.

Format, tout en gros-boutiste :
  entete  MAGIC(6) VERSION(2)
  bloc    LONGUEUR(4) CORPS
  corps   height(8) prev(32) ts(8) nonce(8) bits(1) n_tx(2) [tx]*
  tx      len_core(4) core n_temoins(2) [flag(1) (pk(16384) sig(8192))?]*

Usage :  python3 store.py --init          cree une chaine neuve
         python3 store.py --mine 3        mine 3 blocs (coinbase seule)
         python3 store.py --pay           depense une sortie, puis mine
         python3 store.py --status        etat courant
         python3 store.py --verify        rejeu integral depuis le fichier

AVERTISSEMENT. portefeuille.json contient un nom de graine en clair. Ce n'est
pas un stockage de cles securise ; prototype uniquement.
"""

import hashlib, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import eonis as E
import utxo as U

CHAINE = os.path.join(HERE, "chaine.dat")
PORTEF = os.path.join(HERE, "portefeuille.json")
MAGIC = b"EONIS\x00"
FORMAT = 1


# ==========================================================================
# Serialisation
# ==========================================================================
def ser_tx(tx) -> bytes:
    core = tx.core()
    b = len(core).to_bytes(4, "big") + core
    b += len(tx.witness).to_bytes(2, "big")
    for w in tx.witness:
        if w is None:
            b += b"\x00"
        else:
            pk, sig = w
            b += b"\x01" + pk + sig
    return b


def deser_tx(buf, i):
    n = int.from_bytes(buf[i:i + 4], "big"); i += 4
    core = buf[i:i + n]; i += n
    j = 4
    n_in = int.from_bytes(core[j:j + 2], "big"); j += 2
    inputs = []
    for _ in range(n_in):
        inputs.append((core[j:j + 32], int.from_bytes(core[j + 32:j + 36], "big")))
        j += 36
    n_out = int.from_bytes(core[j:j + 2], "big"); j += 2
    outputs = []
    for _ in range(n_out):
        outputs.append((core[j:j + 20], int.from_bytes(core[j + 20:j + 28], "big")))
        j += 28
    tx = U.Tx(inputs, outputs)
    if tx.core() != core:
        raise ValueError("serialisation non canonique")
    nw = int.from_bytes(buf[i:i + 2], "big"); i += 2
    tx.witness = []
    for _ in range(nw):
        flag = buf[i]; i += 1
        if flag == 0:
            tx.witness.append(None)
        else:
            pk = buf[i:i + 16384]; i += 16384
            sig = buf[i:i + 8192]; i += 8192
            tx.witness.append((pk, sig))
    return tx, i


def ser_bloc(blk) -> bytes:
    c = (blk["height"].to_bytes(8, "big") + blk["prev"] +
         blk["ts"].to_bytes(8, "big") + blk["nonce"].to_bytes(8, "big") +
         bytes([blk["bits"]]) + len(blk["txs"]).to_bytes(2, "big"))
    for tx in blk["txs"]:
        c += ser_tx(tx)
    return len(c).to_bytes(4, "big") + c


def deser_bloc(buf, i):
    n = int.from_bytes(buf[i:i + 4], "big"); i += 4
    fin = i + n
    blk = {"height": int.from_bytes(buf[i:i + 8], "big")}; i += 8
    blk["prev"] = buf[i:i + 32]; i += 32
    blk["ts"] = int.from_bytes(buf[i:i + 8], "big"); i += 8
    blk["nonce"] = int.from_bytes(buf[i:i + 8], "big"); i += 8
    blk["bits"] = buf[i]; i += 1
    ntx = int.from_bytes(buf[i:i + 2], "big"); i += 2
    blk["txs"] = []
    for _ in range(ntx):
        tx, i = deser_tx(buf, i)
        blk["txs"].append(tx)
    if i != fin:
        raise ValueError(f"bloc {blk['height']} : longueur declaree incoherente")
    return blk, i


# ==========================================================================
# Portefeuille persistant
# ==========================================================================
class PortefeuillePersistant(U.Portefeuille):
    def __init__(self, nom="portefeuille"):
        super().__init__(nom)
        if os.path.exists(PORTEF):
            d = json.load(open(PORTEF))
            self.nom = d["nom"]
            n = d["n"]
        else:
            n = 0
        for _ in range(n):          # regenere toutes les adresses emises
            super().nouvelle_adresse()

    def nouvelle_adresse(self):
        a = super().nouvelle_adresse()
        json.dump({"nom": self.nom, "n": self.n}, open(PORTEF, "w"))
        return a


# ==========================================================================
# Chaine sur disque
# ==========================================================================
class Chaine:
    @property
    def octets(self):
        return os.path.getsize(self.chemin) if os.path.exists(self.chemin) else 0

    def __init__(self, chemin=CHAINE):
        self.chemin = chemin
        self.carnet = U.Carnet()
        self.blocs = 0

    def init(self):
        if os.path.exists(self.chemin):
            raise SystemExit("chaine.dat existe deja — utilisez --status ou effacez-le")
        open(self.chemin, "wb").write(MAGIC + FORMAT.to_bytes(2, "big"))

    def charger(self, bavard=False):
        """Rejeu integral : chaque bloc relu est revalide."""
        if not os.path.exists(self.chemin):
            raise SystemExit("chaine.dat absent — lancez d'abord --init")
        buf = open(self.chemin, "rb").read()
        if buf[:6] != MAGIC:
            raise SystemExit("fichier non reconnu")
        if int.from_bytes(buf[6:8], "big") != FORMAT:
            raise SystemExit("version de format inconnue")
        i = 8
        while i < len(buf):
            try:
                blk, i = deser_bloc(buf, i)
                self.carnet.valider_bloc(blk)
            except (U.Rejet, ValueError, IndexError) as e:
                raise SystemExit(
                    f"chaine.dat corrompu au bloc {self.blocs} : {e}\n"
                    f"Les {self.blocs} blocs precedents restent valides.")
            self.blocs += 1
            if bavard:
                print(f"  bloc {blk['height']:<4} revalide  "
                      f"{len(blk['txs'])} tx  tete {self.carnet.tete.hex()[:16]}")
        return self

    def ajouter(self, blk):
        h = self.carnet.valider_bloc(blk)      # valide AVANT d'ecrire
        with open(self.chemin, "ab") as f:
            f.write(ser_bloc(blk))
        self.blocs += 1
        return h


# ==========================================================================
# Commandes
# ==========================================================================
def cmd_init():
    Chaine().init()
    if os.path.exists(PORTEF):
        os.remove(PORTEF)
    print(f"chaine.dat cree. Minez le bloc 0 avec --mine 1")


def cmd_mine(n, bits=14):
    ch = Chaine().charger()
    p = PortefeuillePersistant()
    for _ in range(n):
        blk = U.miner_bloc(ch.carnet, [U.coinbase(ch.carnet.hauteur + 1,
                                                  p.nouvelle_adresse())], bits=bits)
        h = ch.ajouter(blk)
        print(f"#{blk['height']:<4} {h.hex()[:16]}  nonce={blk['nonce']:<7} "
              f"+{E.reward_at(blk['height']) / E.ATOMES:.6f} EIDOLON")
    cmd_status(ch, p)


def cmd_pay(frais=500, bits=14):
    ch = Chaine().charger()
    p = PortefeuillePersistant()
    dispo = [(k, v) for k, v in p.sorties(ch.carnet)
             if U.sha256(U.lamport_public(U.lamport_secret(p.graines[v[0]])))
             not in ch.carnet.cles_usees]
    if not dispo:
        raise SystemExit("aucune sortie depensable — minez d'abord")
    (k, (addr, montant)) = dispo[0]
    if montant <= frais * 2:
        raise SystemExit("sortie trop petite")
    dest = p.nouvelle_adresse()
    rendu = p.nouvelle_adresse()
    moitie = (montant - frais) // 2
    tx = U.Tx([k], [(dest, moitie), (rendu, montant - frais - moitie)])
    p.signer(tx, 0, addr)
    cb = U.coinbase(ch.carnet.hauteur + 1, p.nouvelle_adresse(), fees=frais)
    blk = U.miner_bloc(ch.carnet, [cb, tx], bits=bits)
    h = ch.ajouter(blk)
    print(f"tx {tx.txid().hex()[:16]}  {montant / E.ATOMES:.6f} -> "
          f"{moitie / E.ATOMES:.6f} + {(montant - frais - moitie) / E.ATOMES:.6f}"
          f"  (frais {frais})")
    print(f"#{blk['height']:<4} {h.hex()[:16]}")
    cmd_status(ch, p)


def cmd_status(ch=None, p=None):
    if ch is None:
        ch = Chaine().charger()
    if p is None:
        p = PortefeuillePersistant()
    c = ch.carnet
    nom, a, _ = E.age_of(max(c.hauteur, 0))
    print(f"\nhauteur         {c.hauteur}   ({ch.blocs} blocs, {ch.octets:,} octets)"
          .replace(",", " "))
    print(f"tete            {c.tete.hex()}")
    print(f"age courant     {nom}  a = {a} EIDOLON")
    print(f"sorties         {len(c.utxo)} non depensees")
    print(f"cles usees      {len(c.cles_usees)}")
    print(f"adresses emises {p.n}")
    circ = sum(m for _, m in c.utxo.values())
    print(f"en circulation  {circ / E.ATOMES:.6f} EIDOLON")
    print(f"emission        {c.emission_cumulee() / E.ATOMES:.6f} EIDOLON")
    print("invariant       " + ("OK" if circ == c.emission_cumulee() else "ROMPU"))
    print(f"solde           {p.solde(c) / E.ATOMES:.6f} EIDOLON")


def cmd_verify():
    print("rejeu integral depuis chaine.dat :")
    ch = Chaine().charger(bavard=True)
    d = hashlib.sha256(open(ch.chemin, "rb").read()).hexdigest()
    print(f"\n{ch.blocs} blocs revalides, aucun refus.")
    print(f"empreinte du fichier  {d}")
    print(f"tete de chaine        {ch.carnet.tete.hex()}")
    cmd_status(ch)


if __name__ == "__main__":
    a = sys.argv[1:]
    if "--init" in a:
        cmd_init()
    elif "--mine" in a:
        i = a.index("--mine")
        cmd_mine(int(a[i + 1]) if len(a) > i + 1 else 1)
    elif "--pay" in a:
        cmd_pay()
    elif "--verify" in a:
        cmd_verify()
    elif "--status" in a:
        cmd_status()
    else:
        print(__doc__.strip().split("Usage :")[1].strip())
