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
  python3 noeud.py --depuis <h> <racine_utxo_hex>
                              rejeu assume-valid : les blocs sous h sont
                              appliqués sans vérifier signatures ni témoins,
                              la racine UTXO au bloc h doit être celle donnée,
                              puis tout est vérifié. Jamais implicite.

Deux sortes de demandes dans mempool.json, toutes deux servies au dernier
bloc de chaque exécution : « robinet » (le trésor verse 1 eidôlon) puis
« envoi » (une transaction signée par l'atelier, en base64, au format ser_tx
ci-dessous). Un envoi est validé sur une copie du carnet dans un bloc
candidat ; s'il est fautif il passe en refus avec son motif, et le bloc est
forgé sans lui. Un envoi qui attend plus de T = 1008 créneaux expire.

Format du fichier (FORMAT 3 : racine UTXO dans le corps et l'en-tête signé),
gros-boutiste :
  entête  MAGIC(8) FORMAT(2)
  bloc    LONGUEUR(4) CORPS
  corps   height(8) prev(32) ts(8) utxo_root(32) validateur(2) indice(4)
          sig(2144) k(1) chemin(32k) n_tx(2) [tx]*
  tx      len_core(4) core n_témoins(2) [flag(1) (graine_pub(32) sig(2144))?]*

RÉSEAU D'ESSAI. Les graines des validateurs dérivent d'une chaîne publique,
inscrite dans federation.json : n'importe qui peut forger un bloc valide.
Aucune valeur monétaire. Ce n'est pas non plus un réseau : un seul processus
écrit, il n'y a ni pairs ni propagation.
"""

import base64, copy, functools, hashlib, json, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import eonis as E
import utxo as U
import federation as F
import wots as W

CHAINE = os.path.join(HERE, "chaine-eidos.dat")
MEMPOOL = os.path.join(HERE, "mempool.json")
CONFIG = os.path.join(HERE, "federation.json")
ETAT = os.path.join(HERE, "etat.json")
MAGIC = b"EIDOS\x00\x00\x01"
FORMAT = 3                     # 1 : Lamport ; 2 : WOTS+ / XMSS ; 3 : + racine UTXO
GRAINE = "eidos-testnet-3"     # tag de dérivation des graines publiques du réseau
MAX_PAR_EXECUTION = 6          # garde-fou : jamais plus de 6 blocs d'un coup
MAX_PAIEMENTS = 3              # demandes servies par bloc
MONTANT_ROBINET = 100_000_000  # 1 eidolon par demande
BUDGET_RATIO = 8               # plafond d'époque : (a·T) / 8
MAX_ENVOIS = 8                 # envois inclus par bloc, après le robinet
EXPIRATION_ENVOI = E.T         # créneaux d'attente avant refus / expiree


# ==========================================================================
# Configuration
# ==========================================================================
def config():
    c = json.load(open(CONFIG, encoding="utf-8"))
    F.CRENEAU = c["creneau_s"]
    F.PAS = c["pas_rotation"]
    racines = [bytes.fromhex(r) for r in c["racines"]]
    graines_pub = [bytes.fromhex(g) for g in c["graines_publiques"]]
    fed = F.Federation(racines, c["t0_unix"], hauteur=c["hauteur_mss"],
                       graines_pub=graines_pub)
    return c, fed


_CLES = {}


def cle(c, v):
    """Reconstruit la clé du validateur v, une fois par exécution : la
    génération coûte 2^k clés WOTS+ (une quinzaine de secondes à k = 10)."""
    if v not in _CLES:
        graine = hashlib.sha256(f"{GRAINE}/validateur/{v}".encode()).digest()
        k = F.CleValidateur(graine, c["hauteur_mss"])
        assert k.racine.hex() == c["racines"][v], f"racine du validateur {v} inattendue"
        _CLES[v] = k
    return _CLES[v]


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
            gp = buf[i:i + W.OCTETS_GRAINE]; i += W.OCTETS_GRAINE
            sg = buf[i:i + W.OCTETS_SIG]; i += W.OCTETS_SIG
            tx.witness.append((gp, sg))
    return tx, i


def ser_bloc(blk):
    idx, ots, chemin = blk["sig"]
    c = (blk["height"].to_bytes(8, "big") + blk["prev"] +
         blk["ts"].to_bytes(8, "big") + blk["utxo_root"] +
         blk["validateur"].to_bytes(2, "big") +
         idx.to_bytes(4, "big") + ots +
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
    blk["utxo_root"] = buf[i:i + 32]; i += 32
    blk["validateur"] = int.from_bytes(buf[i:i + 2], "big"); i += 2
    idx = int.from_bytes(buf[i:i + 4], "big"); i += 4
    ots = buf[i:i + W.OCTETS_SIG]; i += W.OCTETS_SIG
    k = buf[i]; i += 1
    chemin = [buf[i + 32 * j: i + 32 * j + 32] for j in range(k)]; i += 32 * k
    blk["sig"] = (idx, ots, chemin)
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


def charger(fed, bavard=False, depuis=None):
    """depuis = (hauteur, racine) : point de contrôle assume-valid EXPLICITE.
    Les blocs sous `hauteur` sont appliqués sans vérifier signatures de
    validateur ni témoins (leurs clés ne sont pas notées) ; au bloc `hauteur`
    la racine UTXO calculée doit être `racine`, sinon refus ; ensuite tout est
    vérifié. Sans `depuis`, rejeu intégral."""
    if not os.path.exists(CHAINE):
        raise SystemExit("chaine-eidos.dat absent — lancez d'abord --init")
    buf = open(CHAINE, "rb").read()
    if buf[:8] != MAGIC or int.from_bytes(buf[8:10], "big") != FORMAT:
        raise SystemExit("fichier non reconnu")
    ch = F.ChaineFederee(fed)
    i, n, confirme = 10, 0, False
    while i < len(buf):
        try:
            blk, i = deser_bloc(buf, i)
            if depuis is not None and blk["height"] < depuis[0]:
                ch.appliquer_sans_verifier(blk)
            else:
                ch.valider(blk)
            noter_gouttes(ch, blk)
        except (U.Rejet, ValueError, IndexError) as e:
            raise SystemExit(f"chaîne corrompue au bloc {n} : {e}")
        n += 1
        if depuis is not None and blk["height"] == depuis[0]:
            if ch.carnet.racine_utxo != depuis[1]:
                raise SystemExit(
                    f"bloc {depuis[0]} : racine UTXO {ch.carnet.racine_utxo.hex()[:16]}… "
                    f"au lieu de {depuis[1].hex()[:16]}… annoncée — reprise refusée")
            confirme = True
            if bavard:
                print(f"  bloc {blk['height']:<5} racine UTXO confirmée ; "
                      f"{n - 1} bloc(s) appliqués sans vérification, "
                      f"vérification complète à partir d'ici")
        elif bavard and (n <= 3 or n % 50 == 0):
            print(f"  bloc {blk['height']:<5} revalidé  "
                  f"créneau {ch.creneaux[-1]}  validateur {blk['validateur']}")
    if depuis is not None and not confirme:
        raise SystemExit(f"bloc {depuis[0]} absent : la chaîne s'arrête à "
                         f"{ch.carnet.hauteur}, reprise refusée")
    return ch, n


def ajouter(blk):
    with open(CHAINE, "ab") as f:
        f.write(ser_bloc(blk))


# ==========================================================================
# Forge
# ==========================================================================
def graine_tresor(h):
    return hashlib.sha256(f"{GRAINE}/tresor/{h}".encode()).digest()


def graine_rendu(h, k):
    return hashlib.sha256(f"{GRAINE}/rendu/{h}/{k}".encode()).digest()


@functools.lru_cache(maxsize=8192)
def adr(graine):
    return W.adresse_de(graine)


def adresse_du_bloc(hauteur):
    """Trésor du réseau d'essai : une adresse fraîche par bloc, dérivée
    publiquement. Les fonds sont donc dépensables par quiconque — c'est
    assumé, il n'y a rien à voler."""
    return adr(graine_tresor(hauteur))


# ==========================================================================
# Robinet : sert les demandes inscrites dans mempool.json
# Le carnet tranche. La file ne fait pas foi.
# ==========================================================================
def charger_mempool():
    if not os.path.exists(MEMPOOL):
        return {"spec": "eidos-mempool/1", "demandes": []}
    return json.load(open(MEMPOOL, encoding="utf-8"))


def budget_epoque(h):
    """a·T/8 atomes sur l'époque courante. Le robinet redistribue, il ne frappe pas."""
    _, a, _ = E.age_of(max(h, 0))
    return a * E.T * E.ATOMES // BUDGET_RATIO


def epoque_debut(h):
    _, _, start = E.age_of(max(h, 0))
    local = max(h, 0) - start
    return start + (local // E.T) * E.T


def est_goutte(tx):
    if tx.is_coinbase():
        return False
    return any(m == MONTANT_ROBINET for _, m in tx.outputs)


def noter_gouttes(ch, blk):
    if not hasattr(ch, "robinet_gouttes"):
        ch.robinet_gouttes = []
    h = blk["height"]
    for tx in blk["txs"]:
        if not est_goutte(tx):
            continue
        txid = tx.txid()
        for addr, m in tx.outputs:
            if m == MONTANT_ROBINET:
                ch.robinet_gouttes.append((h, txid, addr.hex()))
                break


def robinet_epoque_atomes(ch, h):
    debut = epoque_debut(h)
    gouttes = getattr(ch, "robinet_gouttes", [])
    return sum(MONTANT_ROBINET for gh, *_ in gouttes if gh >= debut)


def verse_deja(ch, adresse_hex):
    """Une sortie non dépensée à cette adresse : dépenser d'abord."""
    for a, _m in ch.carnet.utxo.values():
        if a.hex() == adresse_hex:
            return True
    return False


# 9 empilements du chœur. Même table que atelier/src/lib/eidos/signatures.ts
CODES_ARTEFACT = {
    0: "uranie", 48: "saturne", 20: "jupiter", 63: "mars",
    21: "soleil", 29: "venus", 27: "mercure", 42: "lune", 3: "terre",
}
TAG_ARTEFACT = b"eidos-artefact/1"


def artefact_de_goutte(txid: bytes, adresse: bytes):
    """Œuf Paracelse dans une extraction. Muet pour le carnet."""
    h = E.sha256d(TAG_ARTEFACT + txid + adresse)
    code = h[0] & 63
    ident = CODES_ARTEFACT.get(code)
    if ident is None:
        return None
    return {
        "v": 1,
        "spec": "eidos-artefact/1",
        "id": ident,
        "code": code,
        "txid": txid.hex(),
        "adresse": adresse.hex(),
        "digest": h.hex(),
    }


def artefacts_du_carnet(ch):
    out = []
    for _h, txid, adr in getattr(ch, "robinet_gouttes", []):
        a = artefact_de_goutte(txid, bytes.fromhex(adr))
        if a:
            out.append(a)
    return out


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


def construire_paiements(ch, hauteur_bloc):
    """Une transaction par demande : le trésor verse, et rend la monnaie sur
    une adresse fraîche. Frais nuls.

    Refus si l'adresse a encore une sortie, ou si a·T/8 est atteint.
    La file n'est pas le carnet : on relit l'UTXO à chaque forge.
    """
    f = charger_mempool()
    attente = [d for d in f["demandes"]
               if d.get("etat") == "en_attente"
               and d.get("type", "robinet") == "robinet"]
    if not attente:
        return [], f, False

    budget = budget_epoque(hauteur_bloc)
    depense = robinet_epoque_atomes(ch, hauteur_bloc)
    eligibles = []
    vus = set()
    for d in attente:
        adr = d.get("adresse", "")
        if not adr or adr in vus:
            d["etat"] = "refus"
            d["motif"] = "doublon"
            continue
        vus.add(adr)
        if verse_deja(ch, adr):
            d["etat"] = "refus"
            d["motif"] = "sortie non dépensée"
            print(f"  robinet refus {adr[:16]}… : sortie non dépensée")
            continue
        if depense + MONTANT_ROBINET > budget:
            print(f"  robinet : budget d'époque atteint "
                  f"({depense / E.ATOMES:.0f}/{budget / E.ATOMES:.0f})")
            break
        eligibles.append(d)
        depense += MONTANT_ROBINET
        if len(eligibles) >= MAX_PAIEMENTS:
            break
    if not eligibles:
        return [], f, True

    dispo = sorties_tresor(ch, len(eligibles))
    txs = []
    for k, (d, slot) in enumerate(zip(eligibles, dispo)):
        cle, graine, montant = slot
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
        art = artefact_de_goutte(tx.txid(), dest)
        if art:
            d["artefact"] = art["id"]
            print(f"    artefact : {art['id']}")
    return txs, f, True


# ==========================================================================
# Envois : transactions signées par l'atelier, déposées par issue GitHub
# Le carnet tranche encore : une tx fautive est écartée, jamais le bloc.
# ==========================================================================
def decoder_envoi(donnees):
    """Base64 → Tx, à l'octet près : aucune lecture tolérante. Lève
    ValueError (ou IndexError sur un tampon tronqué)."""
    buf = base64.b64decode(donnees, validate=True)
    tx, i = deser_tx(buf, 0)
    if i != len(buf):
        raise ValueError(f"longueur incohérente : {i} octets lus, {len(buf)} reçus")
    if not tx.inputs or not tx.outputs:
        raise ValueError("transaction sans entrée ou sans sortie")
    if tx.is_coinbase():
        raise ValueError("coinbase hors bloc")
    if len(tx.witness) != len(tx.inputs):
        raise ValueError(f"{len(tx.witness)} témoin(s) pour {len(tx.inputs)} entrée(s)")
    return tx


def frais_de(ch, tx):
    """Frais implicites (entrées − sorties) si toutes les entrées sont
    connues, 0 sinon : le carnet refusera de toute façon l'entrée inconnue."""
    entree = 0
    for cle in tx.inputs:
        if cle not in ch.carnet.utxo:
            return 0
        entree += ch.carnet.utxo[cle][1]
    return max(entree - tx.total_out(), 0)


def essayer_envoi(ch, hauteur_bloc, txs_avant, frais_avant, tx):
    """Valide un bloc candidat sur une COPIE du carnet : coinbase (récompense
    + frais) puis les tx déjà retenues, puis celle-ci. Même code qu'à la
    forge. Lève U.Rejet ; le carnet réel n'est jamais touché."""
    frais = frais_avant + frais_de(ch, tx)
    cand = {"height": hauteur_bloc, "prev": ch.carnet.tete, "ts": 0,
            "nonce": 0, "bits": 0,
            "txs": [U.coinbase(hauteur_bloc, adresse_du_bloc(hauteur_bloc), frais)]
                   + list(txs_avant) + [tx]}
    copy.deepcopy(ch.carnet).valider_bloc(cand)
    return frais


def construire_envois(ch, hauteur_bloc, creneau, file, txs_avant):
    """Inclut les envois valides après les paiements robinet, dans l'ordre de
    la file, au plus MAX_ENVOIS. Une tx fautive passe en refus avec son
    motif et ne fait jamais échouer le bloc. Renvoie (txs, frais, modifie).
    """
    attente = [d for d in file["demandes"]
               if d.get("etat") == "en_attente" and d.get("type") == "envoi"]
    txs, frais, modifie = [], 0, False
    vus = {t.txid() for t in txs_avant}

    def refuser(d, motif):
        nonlocal modifie
        d["etat"], d["motif"], modifie = "refus", motif, True
        print(f"  envoi refus (issue #{d.get('issue', 0)}) : {motif}")

    for d in attente:
        if "creneau" not in d:               # ancienne file : l'horloge part ici
            d["creneau"], modifie = creneau, True
        if creneau - d["creneau"] > EXPIRATION_ENVOI:
            refuser(d, "expiree")
            continue
        if len(txs) >= MAX_ENVOIS:
            break                            # reste en attente
        try:
            tx = decoder_envoi(d.get("donnees", ""))
        except (ValueError, IndexError) as e:
            refuser(d, f"malformée : {e}")
            continue
        txid = tx.txid()
        if txid in vus:
            refuser(d, "doublon")
            continue
        try:
            frais = essayer_envoi(ch, hauteur_bloc, list(txs_avant) + txs, frais, tx)
        except U.Rejet as e:
            refuser(d, str(e))
            continue
        txs.append(tx)
        vus.add(txid)
        d["etat"], d["bloc"], d["txid"], modifie = "incluse", hauteur_bloc, txid.hex(), True
        print(f"  envoi : {tx.total_out() / E.ATOMES:.6f} en {len(tx.inputs)} entrée(s), "
              f"{len(tx.outputs)} sortie(s), frais {frais_de(ch, tx) / E.ATOMES:.6f} "
              f"(issue #{d.get('issue', 0)})")
    return txs, frais, modifie


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
    if depart > dernier + 1:
        print(f"créneaux sautés {dernier + 1}–{depart - 1} "
              f"(garde-fou {MAX_PAR_EXECUTION} par exécution)")
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
        paiements, envois, frais, file, modifie = [], [], 0, None, False
        if s == creneau_courant:                 # seulement au dernier bloc
            paiements, file, modifie = construire_paiements(ch, h)
            envois, frais, m = construire_envois(ch, h, s, file, paiements)
            modifie = modifie or m
        blk = _forger_un(ch, k, v, h, ts, paiements + envois, frais)
        d = ch.valider(blk)
        noter_gouttes(ch, blk)
        ajouter(blk)
        if modifie:
            json.dump(file, open(MEMPOOL, "w"), indent=1, ensure_ascii=False)
        forges += 1
        print(f"#{h:<5} créneau {s:<5} validateur {v}  {d.hex()[:16]}  "
              f"+{E.reward_at(h) / E.ATOMES:.6f}")
    return ch, forges


def _forger_un(ch, k, v, h, ts, paiements=(), frais=0):
    blk = {"height": h, "prev": ch.carnet.tete, "ts": ts, "nonce": 0,
           "bits": 0,
           "txs": [U.coinbase(h, adresse_du_bloc(h), frais)] + list(paiements),
           "validateur": v}
    blk["utxo_root"] = U.racine_apres(ch.carnet, blk)
    blk["sig"] = k.signer(ch.id_bloc(blk))
    return blk


# ==========================================================================
# État publié
# ==========================================================================
def ecrire_etat(ch, blocs):
    c = ch.fed
    carnet = ch.carnet
    soldes = {}
    for adresse, montant in carnet.utxo.values():
        soldes[adresse.hex()] = soldes.get(adresse.hex(), 0) + montant
    nom, a, _ = E.age_of(max(carnet.hauteur, 0))
    etat = {
        "spec": "eidos-etat/1",
        "reseau": "essai",
        "maj_unix": int(time.time()),
        "hauteur": carnet.hauteur,
        "blocs": blocs,
        "tete": carnet.tete.hex(),
        "utxo_root": carnet.racine_utxo.hex(),
        # de quoi juger une preuve sans rejouer : l'en-tête étendu (le témoin
        # recompose id_bloc) et la signature XMSS du proposant
        "tete_signee": tete_signee(ch),
        "tresor_adresse": (adresse_du_bloc(carnet.hauteur).hex()
                           if carnet.hauteur >= 0 else None),
        "dernier_creneau": ch.creneaux[-1] if ch.creneaux else None,
        "creneaux_sautes": ch.creneaux_sautes(),
        "age": nom,
        "a_courant": a,
        "recompense_courante_atomes": E.reward_at(max(carnet.hauteur, 0)),
        "emission_cumulee_atomes": carnet.emission_cumulee(),
        "en_circulation_atomes": sum(m for _, m in carnet.utxo.values()),
        "sorties_non_depensees": len(carnet.utxo),
        "robinet_epoque_atomes": robinet_epoque_atomes(ch, max(carnet.hauteur, 0)),
        "robinet_budget_atomes": budget_epoque(max(carnet.hauteur, 0)),
        "artefacts": artefacts_du_carnet(ch),
        "cles_consommees": sum(len(s) for s in ch.indices.values()),
        "atomes_par_unite": E.ATOMES,
        "emission_totale_atomes": 62_899_200 * E.ATOMES,
        "taille_chaine_octets": os.path.getsize(CHAINE),
        "soldes": soldes,
        # sorties non dépensées, publiées pour que le portefeuille puisse
        # choisir l'entrée qu'il dépense : "txid:rang" -> adresse, montant
        "sorties": {
            f"{txid.hex()}:{rang}": {"adresse": adresse.hex(), "montant": montant}
            for (txid, rang), (adresse, montant) in carnet.utxo.items()
        },
    }
    etat["invariant"] = (etat["en_circulation_atomes"]
                         == etat["emission_cumulee_atomes"])
    json.dump(etat, open(ETAT, "w"), indent=1, sort_keys=False)
    print(f"\netat.json — hauteur {etat['hauteur']}, "
          f"{etat['en_circulation_atomes'] / E.ATOMES:.6f} en circulation, "
          f"invariant {'OK' if etat['invariant'] else 'ROMPU'}")
    if not etat["invariant"]:
        raise SystemExit("invariant rompu — publication refusée")


def tete_signee(ch):
    t = getattr(ch, "tete_signee", None)
    if t is None:
        return None
    idx, ots, chemin = t["sig"]
    return {
        "hauteur": t["hauteur"], "prev": t["prev"].hex(), "merkle": t["merkle"].hex(),
        "ts": t["ts"], "utxo_root": t["utxo_root"].hex(), "id_bloc": t["id_bloc"].hex(),
        "validateur": t["validateur"], "indice": idx,
        "signature": ots.hex(), "chemin": [c.hex() for c in chemin],
    }


def _test_depuis():
    """Point de contrôle assume-valid : reprise à h avec la bonne racine,
    refus d'une racine fausse, refus d'une hauteur absente. Chaîne de test
    dans un dossier temporaire ; CHAINE est restauré ensuite."""
    global CHAINE
    import tempfile
    t0 = 1756540680
    cles = F.cles_de_test(7, hauteur=4)
    fed = F.Federation.depuis_cles(cles, t0, hauteur=4)
    ch = F.ChaineFederee(fed)
    p = U.Portefeuille("depuis")
    ancien = CHAINE
    CHAINE = os.path.join(tempfile.mkdtemp(), "chaine-test.dat")
    try:
        open(CHAINE, "wb").write(MAGIC + FORMAT.to_bytes(2, "big"))
        racines = []
        for h in range(5):
            blk = F.forger(ch, cles, [U.coinbase(h, p.nouvelle_adresse())], t0 + h * F.CRENEAU)
            ch.valider(blk, maintenant=t0 + h * F.CRENEAU)
            ajouter(blk)
            racines.append(ch.carnet.racine_utxo)
        # bloc reserialise = bloc lu, racine comprise
        blk2, _ = deser_bloc(ser_bloc(blk), 0)
        assert blk2["utxo_root"] == blk["utxo_root"] and ser_bloc(blk2) == ser_bloc(blk)
        ok = 0

        ch2, n = charger(fed, depuis=(2, racines[2]))
        assert n == 5 and ch2.carnet.racine_utxo == racines[4] == U.utxo_root(ch2.carnet.utxo)
        assert ch2.carnet.tete == ch.carnet.tete
        assert tete_signee(ch2)["id_bloc"] == ch.carnet.tete.hex()
        print("reprise a h=2, racine connue      : OK  (5 blocs, meme tete)"); ok += 1

        try:
            charger(fed, depuis=(2, racines[3]))
            raise AssertionError("racine fausse acceptee")
        except SystemExit as e:
            assert "reprise refusee" in str(e).replace("é", "e"), e
        print("reprise, racine fausse            : refus"); ok += 1

        try:
            charger(fed, depuis=(9, racines[4]))
            raise AssertionError("hauteur absente acceptee")
        except SystemExit as e:
            assert "absent" in str(e), e
        print("reprise, hauteur absente          : refus"); ok += 1
        print(f"ok : {ok} controles reprise (--depuis)")
    finally:
        CHAINE = ancien


def _test_artefact():
    ad = bytes([0x11]) * 20
    a = artefact_de_goutte(bytes(32), ad)
    assert a and a["id"] == "lune" and a["code"] == 42, a
    assert a["digest"] == E.sha256d(TAG_ARTEFACT + bytes(32) + ad).hex()
    assert a["spec"] == "eidos-artefact/1"
    assert artefact_de_goutte((2).to_bytes(32, "big"), ad) is None
    print("ok : artefact robinet (lune / preuve / muet)")


def _test_envois():
    """Contrôles envoi, en mémoire : fédération de test, aucun fichier lu ni
    écrit. La forge réelle passe par le même construire_envois."""
    t0 = 1756540680
    cles = F.cles_de_test(7, hauteur=4)
    fed = F.Federation.depuis_cles(cles, t0, hauteur=4)
    ch = F.ChaineFederee(fed)
    alice, bob = U.Portefeuille("alice"), U.Portefeuille("bob")
    a = [alice.nouvelle_adresse() for _ in range(3)]
    for h in range(3):
        blk = F.forger(ch, cles, [U.coinbase(h, a[h])], t0 + h * F.CRENEAU)
        ch.valider(blk, maintenant=t0 + h * F.CRENEAU)
    piece = [k for k, v in ch.carnet.utxo.items() if v[0] == a[0]][0]
    piece1 = [k for k, v in ch.carnet.utxo.items() if v[0] == a[1]][0]
    montant = ch.carnet.utxo[piece][1]
    ok = 0

    def envoi(tx, issue, creneau=3):
        return {"type": "envoi", "issue": issue, "etat": "en_attente",
                "creneau": creneau,
                "donnees": base64.b64encode(ser_tx(tx)).decode()}

    def demande(txs_avant, *ds, creneau=3):
        f = {"spec": "eidos-mempool/1", "demandes": list(ds)}
        txs, frais, modifie = construire_envois(ch, ch.carnet.hauteur + 1,
                                                creneau, f, txs_avant)
        return txs, frais, modifie, f["demandes"]

    # 1. envoi valide, avec frais : inclus, puis le bloc réel est forgé
    t1 = U.Tx([piece], [(bob.nouvelle_adresse(), montant - 9_000)])
    alice.signer(t1, 0, a[0])
    # 2. double dépense de la même pièce, malformé, expiré dans la même file
    t2 = U.Tx([piece], [(bob.nouvelle_adresse(), montant)])
    alice.signer(t2, 0, a[0])
    t3 = U.Tx([piece1], [(bob.nouvelle_adresse(), 1)])
    alice.signer(t3, 0, a[1])
    d_valide, d_double = envoi(t1, 1), envoi(t2, 2)
    d_malformee = dict(envoi(t3, 3), donnees=base64.b64encode(
        ser_tx(t3)[:-1000]).decode())
    d_texte = dict(envoi(t3, 4), donnees="pas du base64 !!")
    d_expiree = envoi(t3, 5, creneau=3 - EXPIRATION_ENVOI - 1)
    d_ancienne = {"type": "envoi", "issue": 6, "etat": "en_attente",
                  "donnees": d_valide["donnees"]}     # sans créneau : doublon

    txs, frais, modifie, ds = demande([], d_valide, d_double, d_malformee,
                                      d_texte, d_expiree, d_ancienne)
    assert modifie and len(txs) == 1 and txs[0].txid() == t1.txid()
    assert frais == 9_000
    assert ds[0]["etat"] == "incluse" and ds[0]["txid"] == t1.txid().hex()
    assert ds[0]["bloc"] == ch.carnet.hauteur + 1
    print(f"envoi valide inclus, frais {frais} atomes  : OK"); ok += 1

    assert ds[1]["etat"] == "refus" and "double depense" in ds[1]["motif"], ds[1]
    print(f"refus : double depense dans le bloc     : {ds[1]['motif']}"); ok += 1

    assert ds[2]["etat"] == "refus" and ds[2]["motif"].startswith("malformée"), ds[2]
    assert ds[3]["etat"] == "refus" and ds[3]["motif"].startswith("malformée"), ds[3]
    print(f"refus : malformee, tronquee / texte     : {ds[2]['motif']}"); ok += 1

    assert ds[4]["etat"] == "refus" and ds[4]["motif"] == "expiree", ds[4]
    assert ds[5]["etat"] == "refus" and ds[5]["motif"] == "doublon" and ds[5]["creneau"] == 3
    print(f"refus : expiree apres {EXPIRATION_ENVOI} creneaux         : {ds[4]['motif']}"); ok += 1

    # le bloc réel, avec la coinbase gonflée des frais, est accepté par la chaîne
    h = ch.carnet.hauteur + 1
    blk = F.forger(ch, cles, [U.coinbase(h, alice.nouvelle_adresse(), frais)] + txs,
                   t0 + 3 * F.CRENEAU)
    ch.valider(blk, maintenant=t0 + 3 * F.CRENEAU)
    assert sum(m for _, m in ch.carnet.utxo.values()) == ch.carnet.emission_cumulee()
    # rejouée après coup, la même pièce est « déjà dépensée » : refus, bloc intact
    txs, frais, _, ds = demande([], envoi(t2, 7), creneau=4)
    assert txs == [] and frais == 0 and "deja depensee" in ds[0]["motif"], ds
    # aller-retour de sérialisation : la tx incluse est retrouvée à l'octet près
    tx2, fin = deser_tx(ser_tx(t1), 0)
    assert fin == len(ser_tx(t1)) and ser_tx(tx2) == ser_tx(t1)
    print(f"bloc forge avec l'envoi, conservation    : OK  (hauteur {ch.carnet.hauteur})"); ok += 1
    print(f"ok : {ok} controles envoi")


# ==========================================================================
if __name__ == "__main__":
    a = sys.argv[1:]
    if "--init" in a:
        init()
    elif "--verifier" in a:
        _, fed = config()
        ch, n = charger(fed, bavard=True)
        print(f"\n{n} blocs revalidés, aucun refus. "
              f"hauteur {ch.carnet.hauteur}, tête {ch.carnet.tete.hex()[:16]}, "
              f"racine UTXO {ch.carnet.racine_utxo.hex()[:16]}")
    elif "--depuis" in a:
        j = a.index("--depuis")
        if len(a) < j + 3 or not a[j + 1].isdigit() or len(a[j + 2]) != 64:
            raise SystemExit("--depuis exige une hauteur et la racine UTXO attendue "
                             "(64 hex) : le point de contrôle est explicite, jamais déduit")
        _, fed = config()
        ch, n = charger(fed, bavard=True, depuis=(int(a[j + 1]), bytes.fromhex(a[j + 2])))
        print(f"\n{n} blocs, reprise confirmée au bloc {a[j + 1]}. "
              f"hauteur {ch.carnet.hauteur}, tête {ch.carnet.tete.hex()[:16]}, "
              f"racine UTXO {ch.carnet.racine_utxo.hex()[:16]}")
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
