#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
vecteurs.py — vecteurs de test partages entre la spec Python et l'atelier TS.

Pour des graines connues : graine publique, racine de l'arbre L, adresse,
empreinte, signature WOTS+ complete ; une transaction (core, txid, sighash,
temoin, ser_tx) ; une feuille XMSS de hauteur 4 avec sa signature de bloc ;
la racine UTXO d'un carnet de 3 sorties ; une tete signee (en-tete etendu +
signature XMSS) avec le carnet qu'elle engage, pour le temoin de l'atelier.
Les deux implementations lisent le meme vecteurs.json : si l'une derive,
la parite casse ici avant de casser la chaine.

  python3 vecteurs.py             recalcule et compare a vecteurs.json
  python3 vecteurs.py --generer   reecrit vecteurs.json

Depuis P3, xmss.ts verifie aussi le chemin et la racine ; temoin.ts juge une
preuve contre la racine UTXO d'une tete signee.
"""

import hashlib, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import utxo as U
import federation as F
import wots as W
import noeud as N

FICHIER = os.path.join(HERE, "vecteurs.json")
MAITRE = "eidos-atelier-reseau-essai-v1"


def sha256(b): return hashlib.sha256(b).digest()


def graine(indice): return sha256(f"{MAITRE}/{indice}".encode())


def calculer():
    g0, g1 = graine(0), graine(1)
    gp0, r0 = W.racine(g0)
    m = sha256(b"message")
    sig = W.signer(g0, m)[1]
    v = {
        "spec": "eidos-vecteurs/1",
        "parametres": {"n": W.N, "w": W.W, "len": W.LEN, "octets_signature": W.OCTETS_SIG,
                       "octets_temoin": W.OCTETS_TEMOIN, "version_tx": U.VERSION},
        "wots": {
            "maitre": MAITRE, "indice": 0,
            "graine": g0.hex(), "graine_publique": gp0.hex(), "racine_l": r0.hex(),
            "adresse": W.adresse(gp0, r0).hex(), "empreinte": W.empreinte(gp0, r0).hex(),
            "message": m.hex(), "signature": sig.hex(),
            "adresse_indice_1": W.adresse_de(g1).hex(),
        },
    }
    tx = U.Tx([(bytes([0x11]) * 32, 0)],
              [(bytes([0x22]) * 20, 1000), (W.adresse_de(g1), 234)])
    tx.sign(0, g0)
    ser = N.ser_tx(tx)
    v["tx"] = {
        "entrees": [{"txid": "11" * 32, "vout": 0}],
        "sorties": [{"adresse": "22" * 20, "atomes": 1000},
                    {"adresse": W.adresse_de(g1).hex(), "atomes": 234}],
        "core": tx.core().hex(), "txid": tx.txid().hex(),
        "sighash_0": tx.sighash(0).hex(),
        "temoin_0": {"graine_publique": tx.witness[0][0].hex(),
                     "signature": tx.witness[0][1].hex()},
        "ser_tx_longueur": len(ser), "ser_tx_sha256": hashlib.sha256(ser).hexdigest(),
    }
    gv = sha256(b"validateur/0")
    k = F.CleValidateur(gv, 4)
    bloc = sha256(b"bloc")
    i, s, chemin = k.signer(bloc)
    v["xmss"] = {
        "graine": gv.hex(), "hauteur": 4,
        "graine_publique": k.graine_pub.hex(), "racine": k.racine.hex(),
        "feuille_0": k.feuilles[0].hex(),
        "message": bloc.hex(),
        "signature": {"indice": i, "wots": s.hex(), "chemin": [c.hex() for c in chemin]},
    }
    assert F.verifier_mss(k.racine, k.graine_pub, 4, bloc, (i, s, chemin))

    # carnet de 3 sorties, ordre canonique (txid, rang)
    u = {(bytes([0xaa]) * 32, 0): (bytes([0x11]) * 20, 5),
         (bytes([0xaa]) * 32, 1): (bytes([0x22]) * 20, 7),
         (bytes([0xbb]) * 32, 0): (bytes([0x33]) * 20, 9)}
    v["carnet"] = {
        "sorties": [{"txid": t.hex(), "rang": r, "adresse": a.hex(), "montant": m}
                    for (t, r), (a, m) in sorted(u.items())],
        "feuilles": [U.feuille_sortie(t, r, a, m).hex() for (t, r), (a, m) in sorted(u.items())],
        "utxo_root": U.utxo_root(u).hex(),
    }

    # tete signee : deux blocs federes, hauteur 4, le carnet qu'elle engage
    cles = F.cles_de_test(7, hauteur=4)
    fed = F.Federation.depuis_cles(cles, 1756540680, hauteur=4)
    ch = F.ChaineFederee(fed)
    p = U.Portefeuille("vecteur-tete")
    for h in range(2):
        blk = F.forger(ch, cles, [U.coinbase(h, p.nouvelle_adresse())], 1756540680 + h * F.CRENEAU)
        ch.valider(blk, maintenant=1756540680 + h * F.CRENEAU)
    t = ch.tete_signee
    idx, ots, chemin = t["sig"]
    v["tete"] = {
        "federation": {"hauteur_mss": 4, "racines": [c.racine.hex() for c in cles],
                       "graines_publiques": [c.graine_pub.hex() for c in cles]},
        "tete_signee": {
            "hauteur": t["hauteur"], "prev": t["prev"].hex(), "merkle": t["merkle"].hex(),
            "ts": t["ts"], "utxo_root": t["utxo_root"].hex(), "id_bloc": t["id_bloc"].hex(),
            "validateur": t["validateur"], "indice": idx,
            "signature": ots.hex(), "chemin": [c.hex() for c in chemin]},
        "sorties": [{"txid": tx.hex(), "rang": r, "adresse": a.hex(), "montant": m}
                    for (tx, r), (a, m) in sorted(ch.carnet.utxo.items())],
    }
    return v


def verifier(v):
    attendu = calculer()
    ecarts = [c for c in ("parametres", "wots", "tx", "xmss", "carnet", "tete")
              if v.get(c) != attendu[c]]
    if ecarts:
        raise SystemExit(f"ECHEC : vecteurs divergents pour {', '.join(ecarts)}")
    x = v["xmss"]["signature"]
    assert F.verifier_mss(bytes.fromhex(v["xmss"]["racine"]),
                          bytes.fromhex(v["xmss"]["graine_publique"]), 4,
                          bytes.fromhex(v["xmss"]["message"]),
                          (x["indice"], bytes.fromhex(x["wots"]),
                           [bytes.fromhex(c) for c in x["chemin"]]))
    t = v["tx"]
    assert W.verifier(bytes.fromhex(v["wots"]["adresse"]), bytes.fromhex(t["sighash_0"]),
                      (bytes.fromhex(t["temoin_0"]["graine_publique"]),
                       bytes.fromhex(t["temoin_0"]["signature"])))
    print(f"ok : {len(attendu) - 1} familles de vecteurs identiques "
          f"(adresse {v['wots']['adresse'][:16]}…, txid {t['txid'][:16]}…)")


if __name__ == "__main__":
    if "--generer" in sys.argv:
        v = calculer()
        json.dump(v, open(FICHIER, "w", encoding="utf-8"), indent=1)
        print(f"vecteurs.json ecrit : adresse {v['wots']['adresse']}")
    else:
        if not os.path.exists(FICHIER):
            raise SystemExit("vecteurs.json absent — python3 vecteurs.py --generer")
        verifier(json.load(open(FICHIER, encoding="utf-8")))
