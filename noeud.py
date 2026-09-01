#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
noeud.py — nœud fédéré d'Eidos, conçu pour tourner dans GitHub Actions.

Le fichier chaine-eidos.dat est le seul état conservé ; le carnet UTXO est
reconstruit par rejeu intégral à chaque exécution, chaque bloc étant revalidé
par le même code qu'à la forge.

  python3 noeud.py --init     crée une chaîne vide
  python3 noeud.py --forger   forge les blocs des créneaux échus
  python3 noeud.py --etat     réécrit etat.json sans rien forger
  python3 noeud.py --verifier rejeu seul, sans écriture

Format du fichier, en gros-boutiste :
  entête  MAGIC(8) FORMAT(2)
  bloc    LONGUEUR(4) CORPS
  corps   height(8) prev(32) ts(8) validateur(2) indice(4)
          pk(16384) ots(8192) k(1) chemin(32k) n_tx(2) [tx]*
  tx      len_core(4) core n_témoins(2) [flag(1) (pk(16384) sig(8192))?]*

RÉSEAU D'ESSAI. Les graines des validateurs dérivent d'une chaîne publique,
inscrite dans federation.json : n'importe qui peut forger un bloc valide.
Aucune valeur monétaire. Ce n'est pas non plus un réseau : un seul processus
écrit, il n'y a ni pairs ni propagation.
"""

import base64, hashlib, json, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import eonis as E
import utxo as U
import federation as F

CHAINE = os.path.join(HERE, "chaine-eidos.dat")
MEMPOOL = os.path.join(HERE, "mempool.json")
CONFIG = os.path.join(HERE, "federation.json")
ETAT = os.path.join(HERE, "etat.json")
MAGIC = b"EIDOS\x00\x00\x01"
FORMAT = 1
MAX_PAR_EXECUTION = 6          # garde-fou : jamais plus de 6 blocs d'un coup
MAX_PAIEMENTS = 3              # demandes servies par bloc
MONTANT_ROBINET = 100_000_000  # 1 eidolon par demande


# ==========================================================================
# Configuration
# ==========================================================================
def config():
    c = json.load(open(CONFIG, encoding="utf-8"))
    F.CRENEAU = c["creneau_s"]
    F.PAS = c["pas_rotation"]
    racines = [bytes.fromhex(r) for r in c["racines"]]
    fed = F.Federation(racines, c["t0_unix"], hauteur=c["hauteur_mss"])
    return c, fed


def cle(c, v):
    """Reconstruit la clé du validateur v. Une seule, pas les sept :
    la génération coûte 2^k clés Lamport."""
    graine = hashlib.sha256(
        f"eidos-testnet-1/validateur/{v}".encode()).digest()
    return F.CleValidateur(graine, c["hauteur_mss"])


# ==========================================================================
# Sérialisation
# ==========================================================================
def ser_tx(tx):
    core = tx.core()
    b = len(core).to_bytes(4, "big") + core + len(tx.witness).to_bytes(2, "big")
    for w in tx.witness:
        b += b"\x00" if w is None else b"\x01" + w[0] + w[1]
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
        raise ValueError("transaction non canonique")
    nw = int.from_bytes(buf[i:i + 2], "big"); i += 2
    tx.witness = []
    for _ in range(nw):
        f = buf[i]; i += 1
        if f == 0:
            tx.witness.append(None)
        else:
            pk = buf[i:i + 16384]; i += 16384
            sg = buf[i:i + 8192]; i += 8192
            tx.witness.append((pk, sg))
    return tx, i


def ser_bloc(blk):
    idx, pk, ots, chemin = blk["sig"]
    c = (blk["height"].to_bytes(8, "big") + blk["prev"] +
         blk["ts"].to_bytes(8, "big") + blk["validateur"].to_bytes(2, "big") +
         idx.to_bytes(4, "big") + pk + ots +
         bytes([len(chemin)]) + b"".join(chemin) +
         len(blk["txs"]).to_bytes(2, "big"))
    for tx in blk["txs"]:
        c += ser_tx(tx)
    return len(c).to_bytes(4, "big") + c


def deser_bloc(buf, i):
    n = int.from_bytes(buf[i:i + 4], "big"); i += 4
    fin = i + n
    blk = {"height": int.from_bytes(buf[i:i + 8], "big"), "nonce": 0, "bits": 0}
    i += 8
    blk["prev"] = buf[i:i + 32]; i += 32
    blk["ts"] = int.from_bytes(buf[i:i + 8], "big"); i += 8
    blk["validateur"] = int.from_bytes(buf[i:i + 2], "big"); i += 2
    idx = int.from_bytes(buf[i:i + 4], "big"); i += 4
    pk = buf[i:i + 16384]; i += 16384
    ots = buf[i:i + 8192]; i += 8192
    k = buf[i]; i += 1
    chemin = [buf[i + 32 * j: i + 32 * j + 32] for j in range(k)]; i += 32 * k
    blk["sig"] = (idx, pk, ots, chemin)
    ntx = int.from_bytes(buf[i:i + 2], "big"); i += 2
    blk["txs"] = []
    for _ in range(ntx):
        tx, i = deser_tx(buf, i)
        blk["txs"].append(tx)
    if i != fin:
        raise ValueError(f"bloc {blk['height']} : longueur incohérente")
    return blk, i


# ==========================================================================
# Chaîne
# ==========================================================================
def init():
    if os.path.exists(CHAINE):
        raise SystemExit("chaine-eidos.dat existe déjà")
    open(CHAINE, "wb").write(MAGIC + FORMAT.to_bytes(2, "big"))
    print("chaine-eidos.dat créé")


def charger(fed, bavard=False):
    if not os.path.exists(CHAINE):
        raise SystemExit("chaine-eidos.dat absent — lancez d'abord --init")
    buf = open(CHAINE, "rb").read()
    if buf[:8] != MAGIC or int.from_bytes(buf[8:10], "big") != FORMAT:
        raise SystemExit("fichier non reconnu")
    ch = F.ChaineFederee(fed)
    i, n = 10, 0
    while i < len(buf):
        try:
            blk, i = deser_bloc(buf, i)
            ch.valider(blk)
        except (U.Rejet, ValueError, IndexError) as e:
            raise SystemExit(f"chaîne corrompue au bloc {n} : {e}")
        n += 1
        if bavard and (n <= 3 or n % 50 == 0):
            print(f"  bloc {blk['height']:<5} revalidé  "
                  f"créneau {ch.creneaux[-1]}  validateur {blk['validateur']}")
    return ch, n


def ajouter(blk):
    with open(CHAINE, "ab") as f:
        f.write(ser_bloc(blk))


# ==========================================================================
# Forge
# ==========================================================================
def graine_tresor(h):
    return hashlib.sha256(f"eidos-testnet-1/tresor/{h}".encode()).digest()


def graine_rendu(h, k):
    return hashlib.sha256(f"eidos-testnet-1/rendu/{h}/{k}".encode()).digest()


def adr(graine):
    return U.address_of(U.lamport_public(U.lamport_secret(graine)))


def adresse_du_bloc(hauteur):
    """Trésor du réseau d'essai : une adresse fraîche par bloc, dérivée
    publiquement. Les fonds sont donc dépensables par quiconque — c'est
    assumé, il n'y a rien à voler."""
    return adr(graine_tresor(hauteur))


# ==========================================================================
# Robinet : sert les demandes inscrites dans mempool.json
# ==========================================================================
def charger_mempool():
    if not os.path.exists(MEMPOOL):
        return {"spec": "eidos-mempool/1", "demandes": []}
    return json.load(open(MEMPOOL, encoding="utf-8"))


def sorties_tresor(ch, combien):
    """Sorties non dépensées appartenant au trésor, des plus récentes aux plus
    anciennes. Le balayage descendant tombe presque toujours sur la coinbase du
    bloc précédent, donc en une itération."""
    par_adresse = {}
    for cle, (a, m) in ch.carnet.utxo.items():
        par_adresse.setdefault(a.hex(), []).append((cle, m))
    trouve = []
    for h in range(ch.carnet.hauteur, -1, -1):
        graines = [graine_tresor(h)] + [graine_rendu(h, k) for k in range(MAX_PAIEMENTS)]
        for g in graines:
            for cle, m in par_adresse.get(adr(g).hex(), []):
                if m > 2 * MONTANT_ROBINET:
                    trouve.append((cle, g, m))
                    if len(trouve) >= combien:
                        return trouve
    return trouve


def tx_recevable(ch, tx):
    """Rejoue les regles de validation AVANT d'inclure une transaction, pour
    qu'une transaction fautive ne fasse pas echouer tout le bloc."""
    if tx.is_coinbase():
        return "coinbase interdite ici"
    entree = 0
    vus = set()
    for i, (ptxid, rang) in enumerate(tx.inputs):
        cle = (ptxid, rang)
        if cle in vus:
            return "double depense interne"
        vus.add(cle)
        if cle not in ch.carnet.utxo:
            return "entree inconnue ou deja depensee"
        adresse, montant = ch.carnet.utxo[cle]
        w = tx.witness[i] if i < len(tx.witness) else None
        if w is None:
            return "temoin absent"
        pk, sig = w
        if U.address_of(pk) != adresse:
            return "la cle ne correspond pas a l'adresse"
        if U.sha256(pk) in ch.carnet.cles_usees:
            return "cle Lamport deja employee"
        if not U.lamport_verify(pk, tx.sighash(i), sig):
            return "signature invalide"
        entree += montant
    if any(m <= 0 for _, m in tx.outputs):
        return "sortie nulle ou negative"
    if tx.total_out() > entree:
        return "creation de valeur"
    return None


def transactions_en_file(ch, f):
    """Transactions deposees par les utilisateurs, validees une a une."""
    txs = []
    for d in f["demandes"]:
        if d.get("type") != "envoi" or d["etat"] != "en_attente":
            continue
        try:
            brut = base64.b64decode(d["donnees"])
            tx, reste = deser_tx(brut, 0)
            if reste != len(brut):
                raise ValueError("octets en trop")
        except Exception as e:
            d["etat"] = "refusee"
            d["motif"] = f"illisible : {e}"
            continue
        motif = tx_recevable(ch, tx)
        if motif:
            d["etat"] = "refusee"
            d["motif"] = motif
        else:
            txs.append((d, tx))
            if len(txs) >= MAX_PAIEMENTS:
                break
    return txs


def construire_paiements(ch, hauteur_bloc):
    """Une transaction par demande : le trésor verse, et rend la monnaie sur
    une adresse fraîche. Frais nuls."""
    f = charger_mempool()
    modifie = False
    txs = []

    # 1. les transactions envoyees par les utilisateurs
    for d, tx in transactions_en_file(ch, f):
        txs.append(tx)
        d["etat"] = "incluse"
        d["bloc"] = hauteur_bloc
        d["txid"] = tx.txid().hex()
        modifie = True
        print(f"  envoi   : {tx.total_out() / E.ATOMES:.6f} "
              f"(issue #{d['issue']})")
    if any(d.get("etat") == "refusee" and "vu" not in d for d in f["demandes"]):
        modifie = True
        for d in f["demandes"]:
            if d.get("etat") == "refusee":
                d["vu"] = True

    # 2. les demandes au robinet
    attente = [d for d in f["demandes"]
               if d.get("type", "robinet") == "robinet" and d["etat"] == "en_attente"]
    attente = attente[:MAX_PAIEMENTS]
    if not attente:
        return txs, f, modifie
    dispo = sorties_tresor(ch, len(attente))
    for k, (d, (cle, graine, montant)) in enumerate(zip(attente, dispo)):
        dest = bytes.fromhex(d["adresse"])
        tx = U.Tx([cle], [(dest, MONTANT_ROBINET),
                          (adr(graine_rendu(hauteur_bloc, k)),
                           montant - MONTANT_ROBINET)])
        tx.sign(0, graine)
        txs.append(tx)
        d["etat"] = "servie"
        d["bloc"] = hauteur_bloc
        d["txid"] = tx.txid().hex()
        print(f"  robinet : {MONTANT_ROBINET / E.ATOMES:.2f} vers "
              f"{d['adresse'][:16]}… (issue #{d['issue']})")
    return txs, f, True


def forger(maintenant=None):
    c, fed = config()
    ch, n = charger(fed)
    maintenant = maintenant or int(time.time())
    creneau_courant = fed.creneau(maintenant)
    dernier = ch.creneaux[-1] if ch.creneaux else -1
    if creneau_courant <= dernier:
        print(f"rien à forger : créneau {creneau_courant} déjà pourvu")
        return ch, 0

    depart = max(dernier + 1, creneau_courant - MAX_PAR_EXECUTION + 1)
    forges = 0
    for s in range(depart, creneau_courant + 1):
        v = fed.proposant(s)
        k = cle(c, v)
        employes = ch.indices.get(v, set())
        k.indice = (max(employes) + 1) if employes else 0
        if k.indice >= k.n:
            print(f"validateur {v} : clé épuisée ({k.n} signatures)")
            break
        h = ch.carnet.hauteur + 1
        ts = fed.t0 + s * F.CRENEAU
        paiements, file, servi = ([], None, False)
        if s == creneau_courant:                 # seulement au dernier bloc
            paiements, file, servi = construire_paiements(ch, h)
        blk = _forger_un(ch, k, v, h, ts, paiements)
        d = ch.valider(blk)
        ajouter(blk)
        if servi:
            json.dump(file, open(MEMPOOL, "w"), indent=1, ensure_ascii=False)
        forges += 1
        print(f"#{h:<5} créneau {s:<5} validateur {v}  {d.hex()[:16]}  "
              f"+{E.reward_at(h) / E.ATOMES:.6f}")
    return ch, forges


def _forger_un(ch, k, v, h, ts, paiements=()):
    blk = {"height": h, "prev": ch.carnet.tete, "ts": ts, "nonce": 0,
           "bits": 0,
           "txs": [U.coinbase(h, adresse_du_bloc(h))] + list(paiements),
           "validateur": v}
    blk["sig"] = k.signer(ch.id_bloc(blk))
    return blk


# ==========================================================================
# État publié
# ==========================================================================
def ecrire_etat(ch, blocs):
    c = ch.fed
    carnet = ch.carnet
    soldes, sorties = {}, {}
    for (txid, rang), (adresse, montant) in carnet.utxo.items():
        soldes[adresse.hex()] = soldes.get(adresse.hex(), 0) + montant
        sorties[f"{txid.hex()}:{rang}"] = {"adresse": adresse.hex(),
                                           "montant": montant}
    nom, a, _ = E.age_of(max(carnet.hauteur, 0))
    etat = {
        "spec": "eidos-etat/1",
        "reseau": "essai",
        "maj_unix": int(time.time()),
        "hauteur": carnet.hauteur,
        "blocs": blocs,
        "tete": carnet.tete.hex(),
        "dernier_creneau": ch.creneaux[-1] if ch.creneaux else None,
        "age": nom,
        "a_courant": a,
        "recompense_courante_atomes": E.reward_at(max(carnet.hauteur, 0)),
        "emission_cumulee_atomes": carnet.emission_cumulee(),
        "en_circulation_atomes": sum(m for _, m in carnet.utxo.values()),
        "sorties_non_depensees": len(carnet.utxo),
        "cles_consommees": sum(len(s) for s in ch.indices.values()),
        "atomes_par_unite": E.ATOMES,
        "emission_totale_atomes": 62_899_200 * E.ATOMES,
        "taille_chaine_octets": os.path.getsize(CHAINE),
        "soldes": soldes,
        "sorties": sorties,
    }
    etat["invariant"] = (etat["en_circulation_atomes"]
                         == etat["emission_cumulee_atomes"])
    json.dump(etat, open(ETAT, "w"), indent=1, sort_keys=False)
    print(f"\netat.json — hauteur {etat['hauteur']}, "
          f"{etat['en_circulation_atomes'] / E.ATOMES:.6f} en circulation, "
          f"invariant {'OK' if etat['invariant'] else 'ROMPU'}")
    if not etat["invariant"]:
        raise SystemExit("invariant rompu — publication refusée")


# ==========================================================================
if __name__ == "__main__":
    a = sys.argv[1:]
    if "--init" in a:
        init()
    elif "--verifier" in a:
        _, fed = config()
        ch, n = charger(fed, bavard=True)
        print(f"\n{n} blocs revalidés, aucun refus. "
              f"hauteur {ch.carnet.hauteur}, tête {ch.carnet.tete.hex()[:16]}")
    elif "--etat" in a:
        _, fed = config()
        ch, n = charger(fed)
        ecrire_etat(ch, n)
    elif "--forger" in a:
        ch, f = forger()
        ecrire_etat(ch, len(ch.creneaux))
        print(f"{f} bloc(s) forgé(s)")
    else:
        print(__doc__.strip().split("  python3")[1].split("Format")[0])
