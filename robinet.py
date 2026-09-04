#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
robinet.py — file d'attente des demandes du reseau d'essai.

Lit le corps d'une issue GitHub, y cherche une adresse Eidos valide, et
l'inscrit dans mempool.json. Le noeud la servira au bloc suivant.

Une issue « envoi » porte une transaction signee (ser_tx en base64, entre
-----EIDOS----- et -----FIN-----) : elle est inscrite telle quelle avec le
creneau courant ; le noeud la valide, l'inclut ou la refuse avec un motif,
et la laisse expirer apres T creneaux (noeud.EXPIRATION_ENVOI).

Le carnet tranche, pas la file :
  1. une sortie non depensee a cette adresse → refus (depenser d'abord)
  2. budget d'epoque a·T/8 deja servi + file → refus
  3. deja en_attente pour cette adresse → ignore

SECURITE. Le texte de l'issue est ecrit par n'importe qui. Il n'est jamais
interpole dans une commande : il arrive par la variable d'environnement
EIDOS_ISSUE_BODY, et rien n'en est retenu qui n'ait passe trois filtres —
seuls les quatre caracteres de figures sont acceptes, il faut exactement 31
groupes de trois, et la somme de controle doit concorder. Tout le reste du
texte est ignore.

  python3 robinet.py --issue        lit l'environnement, ajoute a la file
  python3 robinet.py --envoi        idem pour une transaction signee
  python3 robinet.py --file         affiche la file
  python3 robinet.py --test         controles
"""

import base64, hashlib, json, os, re, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
MEMPOOL = os.path.join(HERE, "mempool.json")
ETAT = os.path.join(HERE, "etat.json")
FEDERATION = os.path.join(HERE, "federation.json")

FIGURES = "\u00b7\u25cb\u263d\u271a"          # vide, cercle, croissant, croix
INDEX = {c: i for i, c in enumerate(FIGURES)}
GROUPE = re.compile("^[" + FIGURES + "]{3}$")

MONTANT_ATOMES = 100_000_000                  # 1 eidolon par demande
MAX_FILE = 200                                # garde-fou
T_EPOQUE = 1008
BUDGET_RATIO = 8


def sha(b): return hashlib.sha256(b).digest()


def decoder(symboles: str):
    """Renvoie l'adresse de 20 octets, ou leve ValueError.
    N'accepte que les figures : tout autre caractere fait echouer."""
    groupes = [g for g in symboles.split() if g != "|"]
    if len(groupes) != 31:
        raise ValueError(f"{len(groupes)} symboles au lieu de 31")
    codes = []
    for g in groupes:
        if not GROUPE.match(g):
            raise ValueError("symbole invalide")
        c = 0
        for ch in g:
            c = (c << 2) | INDEX[ch]
        codes.append(c)

    def octets(cs, n):
        b = "".join(format(c, "06b") for c in cs)[: n * 8]
        return bytes(int(b[i:i + 8], 2) for i in range(0, n * 8, 8))

    # les 27 premiers glyphes portent l'adresse (162 bits, dont 2 de bourrage),
    # les 4 derniers la somme de controle (24 bits, exactement)
    a20, ctrl = octets(codes[:27], 20), octets(codes[27:], 3)
    if sha(sha(a20))[:3] != ctrl:
        raise ValueError("somme de controle invalide")
    return a20


def extraire(texte: str):
    """Cherche la premiere suite de 31 groupes de figures dans le texte.
    Le reste est ignore, quelle qu'en soit la teneur."""
    jetons = [j for j in texte.replace("|", " ").split() if GROUPE.match(j)]
    if len(jetons) < 31:
        raise ValueError(f"aucune adresse complete trouvee "
                         f"({len(jetons)} symboles reconnus sur 31)")
    return decoder(" ".join(jetons[:31]))


def charger_file():
    if not os.path.exists(MEMPOOL):
        return {"spec": "eidos-mempool/1", "demandes": []}
    return json.load(open(MEMPOOL, encoding="utf-8"))


def ecrire_file(f):
    json.dump(f, open(MEMPOOL, "w"), indent=1, ensure_ascii=False)


def charger_etat():
    if not os.path.exists(ETAT):
        return None
    return json.load(open(ETAT, encoding="utf-8"))


def creneau_courant(maintenant=None, config=None):
    """Creneau de la federation a l'instant donne, ou None sans
    federation.json : le noeud fera alors partir l'horloge a sa premiere
    lecture. Meme formule que federation.Federation.creneau."""
    if config is None:
        if not os.path.exists(FEDERATION):
            return None
        config = json.load(open(FEDERATION, encoding="utf-8"))
    now = int(time.time()) if maintenant is None else maintenant
    return (now - config["t0_unix"]) // config["creneau_s"]


def budget_depuis_a(a):
    return a * T_EPOQUE * MONTANT_ATOMES // BUDGET_RATIO


def adresse_a_une_sortie(etat, adresse):
    if not etat:
        return False
    for s in (etat.get("sorties") or {}).values():
        if s.get("adresse") == adresse:
            return True
    soldes = etat.get("soldes") or {}
    return soldes.get(adresse, 0) > 0


def pending_robinet(file):
    return sum(1 for d in file["demandes"]
               if d.get("type", "robinet") == "robinet"
               and d.get("etat") == "en_attente")


def budget_ok(etat, file, extra=1):
    """Le carnet (etat) plus la file. Sans etat : on laisse le noeud trancher."""
    if not etat:
        return True
    a = etat.get("a_courant", 40)
    budget = etat.get("robinet_budget_atomes") or budget_depuis_a(a)
    deja = etat.get("robinet_epoque_atomes", 0)
    return deja + (pending_robinet(file) + extra) * MONTANT_ATOMES <= budget


def refus(motif):
    print(f"REFUS : {motif}")
    raise SystemExit(2)


DEBUT = "-----EIDOS-----"
FIN = "-----FIN-----"
B64 = re.compile(r"^[A-Za-z0-9+/=]{200,}$")          # hors marqueurs : longues lignes
B64_DELIMITE = re.compile(r"^[A-Za-z0-9+/=]{4,}$")    # entre marqueurs : toute ligne
MAX_TX_CARACTERES = 80000


def extraire_transaction(texte: str) -> str:
    """La transaction est delimitee par deux marqueurs, et occupe des lignes
    entieres. On n'assemble jamais des morceaux disperses : chaque ligne doit
    etre entierement du base64, sinon elle est ignoree. Le contenu n'est pas
    interprete ici — c'est le noeud qui le validera, et une transaction
    fautive est ecartee sans faire echouer le bloc."""
    lignes = texte.splitlines()
    motif = B64
    if DEBUT in texte and FIN in texte:
        d = next(i for i, l in enumerate(lignes) if DEBUT in l)
        f = next(i for i, l in enumerate(lignes) if FIN in l and i > d)
        lignes = lignes[d + 1:f]
        motif = B64_DELIMITE
    morceaux = [l.strip() for l in lignes if motif.match(l.strip())]
    if not morceaux:
        raise ValueError("aucune transaction trouvee dans ce message")
    jeton = "".join(morceaux)
    if len(jeton) > MAX_TX_CARACTERES:
        raise ValueError("transaction trop volumineuse")
    try:
        brut = base64.b64decode(jeton, validate=True)
    except Exception as e:
        raise ValueError(f"base64 invalide : {e}")
    if len(brut) < 200:
        raise ValueError("transaction trop courte")
    return jeton


def ajouter_envoi():
    corps = os.environ.get("EIDOS_ISSUE_BODY", "")
    numero = os.environ.get("EIDOS_ISSUE_NUMBER", "0")
    numero = int(numero) if numero.isdigit() else 0
    donnees = extraire_transaction(corps)

    f = charger_file()
    if len(f["demandes"]) >= MAX_FILE:
        refus("file pleine")
    if any(d.get("donnees") == donnees for d in f["demandes"]):
        print("transaction deja en file")
        return
    d = {
        "type": "envoi",
        "issue": numero,
        "octets": len(base64.b64decode(donnees)),
        "donnees": donnees,
        "etat": "en_attente",
    }
    creneau = creneau_courant()
    if creneau is not None:
        d["creneau"] = creneau
    f["demandes"].append(d)
    ecrire_file(f)
    print(f"transaction inscrite : {len(base64.b64decode(donnees))} octets "
          f"(issue #{numero})")


def ajouter():
    corps = os.environ.get("EIDOS_ISSUE_BODY", "")
    numero = os.environ.get("EIDOS_ISSUE_NUMBER", "0")
    numero = int(numero) if numero.isdigit() else 0

    a20 = extraire(corps)                     # leve ValueError si invalide
    adresse = a20.hex()

    f = charger_file()
    etat = charger_etat()
    if len(f["demandes"]) >= MAX_FILE:
        refus("file pleine")
    if any(d.get("adresse") == adresse and d.get("etat") == "en_attente"
           for d in f["demandes"]):
        print(f"deja en file : {adresse}")
        return
    if adresse_a_une_sortie(etat, adresse):
        refus("sortie non depensee — depensez d'abord")
    if not budget_ok(etat, f, extra=1):
        refus("budget d'epoque atteint")
    f["demandes"].append({
        "type": "robinet",
        "adresse": adresse,
        "issue": numero,
        "montant_atomes": MONTANT_ATOMES,
        "etat": "en_attente",
    })
    ecrire_file(f)
    print(f"ajoutee : {adresse}  (issue #{numero})")


def _tests():
    assert budget_depuis_a(40) == 40 * 1008 * MONTANT_ATOMES // 8
    assert budget_depuis_a(40) == 504_000_000_000
    etat = {
        "a_courant": 40,
        "robinet_budget_atomes": 504_000_000_000,
        "robinet_epoque_atomes": 0,
        "sorties": {
            "tx:0": {"adresse": "aa" * 20, "montant": 100000000},
        },
        "soldes": {"aa" * 20: 100000000},
    }
    file = {"demandes": []}
    assert adresse_a_une_sortie(etat, "aa" * 20)
    assert not adresse_a_une_sortie(etat, "bb" * 20)
    assert not adresse_a_une_sortie(None, "aa" * 20)
    assert budget_ok(etat, file, extra=1)
    etat["robinet_epoque_atomes"] = 504_000_000_000
    assert not budget_ok(etat, file, extra=1)
    etat["robinet_epoque_atomes"] = 503_900_000_000
    file = {"demandes": [
        {"type": "robinet", "etat": "en_attente"},
        {"type": "robinet", "etat": "servie"},
    ]}
    # 5039 eidolon servis + 1 en file + 1 extra = 5041 > 5040
    assert not budget_ok(etat, file, extra=1)
    file = {"demandes": []}
    etat["robinet_epoque_atomes"] = 503_900_000_000
    assert budget_ok(etat, file, extra=1)
    # creneau d'inscription d'un envoi : meme formule que la federation
    cfg = {"t0_unix": 1756540680, "creneau_s": 3600}
    assert creneau_courant(1756540680 + 5 * 3600 + 10, cfg) == 5
    assert creneau_courant(1756540680 - 1, cfg) == -1
    # une transaction encapsulee est retrouvee entiere, les lignes etrangeres ignorees
    brut = bytes(range(256)) * 2
    b64 = base64.b64encode(brut).decode()
    corps = ("bonjour\n" + DEBUT + "\n" +
             "\n".join(b64[i:i + 76] for i in range(0, len(b64), 76)) +
             "\npas du base64 ici\n" + FIN + "\nmerci\n")
    assert base64.b64decode(extraire_transaction(corps)) == brut
    try:
        extraire_transaction("rien ici"); raise AssertionError("aurait du echouer")
    except ValueError:
        pass
    print("ok : 10 controles robinet")


if __name__ == "__main__":
    if "--test" in sys.argv:
        _tests()
    elif "--file" in sys.argv:
        f = charger_file()
        for d in f["demandes"]:
            adr = d.get("adresse", d.get("type", "?"))
            print(f"{d['etat']:<12} {adr}  issue #{d['issue']}")
        print(f"{len(f['demandes'])} demande(s)")
    elif "--envoi" in sys.argv:
        try:
            ajouter_envoi()
        except ValueError as e:
            raise SystemExit(f"REFUS : {e}")
    elif "--issue" in sys.argv:
        try:
            ajouter()
        except ValueError as e:
            raise SystemExit(f"REFUS : {e}")
    else:
        print(__doc__.strip().split("  python3")[1])
