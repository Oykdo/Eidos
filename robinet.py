#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
robinet.py — file d'attente des demandes du reseau d'essai.

Lit le corps d'une issue GitHub, y cherche une adresse Eidos valide, et
l'inscrit dans mempool.json. Le noeud la servira au bloc suivant.

SECURITE. Le texte de l'issue est ecrit par n'importe qui. Il n'est jamais
interpole dans une commande : il arrive par la variable d'environnement
EIDOS_ISSUE_BODY, et rien n'en est retenu qui n'ait passe trois filtres —
seuls les quatre caracteres de figures sont acceptes, il faut exactement 31
groupes de trois, et la somme de controle doit concorder. Tout le reste du
texte est ignore.

  python3 robinet.py --issue        lit l'environnement, ajoute a la file
  python3 robinet.py --file         affiche la file
"""

import hashlib, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
MEMPOOL = os.path.join(HERE, "mempool.json")

FIGURES = "\u00b7\u25cb\u263d\u271a"          # vide, cercle, croissant, croix
INDEX = {c: i for i, c in enumerate(FIGURES)}
GROUPE = re.compile("^[" + FIGURES + "]{3}$")

MONTANT_ATOMES = 100_000_000                  # 1 eidolon par demande
MAX_FILE = 200                                # garde-fou


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


def ajouter():
    corps = os.environ.get("EIDOS_ISSUE_BODY", "")
    numero = os.environ.get("EIDOS_ISSUE_NUMBER", "0")
    numero = int(numero) if numero.isdigit() else 0

    a20 = extraire(corps)                     # leve ValueError si invalide
    adresse = a20.hex()

    f = charger_file()
    if len(f["demandes"]) >= MAX_FILE:
        raise SystemExit("REFUS : file pleine")
    if any(d["adresse"] == adresse for d in f["demandes"]):
        print(f"deja en file ou deja servie : {adresse}")
        return
    f["demandes"].append({
        "adresse": adresse,
        "issue": numero,
        "montant_atomes": MONTANT_ATOMES,
        "etat": "en_attente",
    })
    ecrire_file(f)
    print(f"ajoutee : {adresse}  (issue #{numero})")


if __name__ == "__main__":
    if "--file" in sys.argv:
        f = charger_file()
        for d in f["demandes"]:
            print(f"{d['etat']:<12} {d['adresse']}  issue #{d['issue']}")
        print(f"{len(f['demandes'])} demande(s)")
    elif "--issue" in sys.argv:
        try:
            ajouter()
        except ValueError as e:
            raise SystemExit(f"REFUS : {e}")
    else:
        print(__doc__.strip().split("  python3")[1])
