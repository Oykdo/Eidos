#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
relique.py — le gardien des reliques : sceller, animer.

Une relique est une piece scellee sur une adresse WOTS+ dont la graine est
imprimee dans un code QR cache dans le monde. La recuperer, c'est la depenser
(atelier, page Reliques, ou n'importe quel portefeuille qui lit la graine).
Une cle ne signant qu'une fois, la relique ne se recupere qu'une fois : la
chaine fait foi, le noeud publie le statut (etat.json, section reliques).

  python3 relique.py --sceller --age Kali --indice "sous la 3e arche" [--dossier D]
      tire une graine (secrets), derive l'adresse et l'id, ecrit
      D/relique-<id>.svg (le QR, SEUL porteur de la graine) et
      D/relique-<id>-planche.txt (id, age, adresse en glyphes, consignes),
      ajoute l'entree a reliques.json. La graine n'est ni affichee ni stockee.
  python3 relique.py --animer <txid hex> [--age Kali] [--frames N] [--fps 12]
      animation ASCII/unicode derivee du txid : figures · ○ ☽ ✚ sur l'ellipse
      de l'age, R(θ) = a + b·cos θ. Lecture, pas preuve.
  python3 relique.py --test

Charge utile du QR : https://oykdo.github.io/Eidos/reliques#r=1.<graine base64url>
Le fragment ne quitte jamais le navigateur.

AVERTISSEMENT. Le QR est un secret au porteur : une photo suffit a recuperer
la relique. Scanner l'ecran une fois avant d'imprimer (qr.py n'a pas de
decodeur). Reseau d'essai, aucune valeur.
"""

import base64, datetime, hashlib, json, math, os, secrets, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import eonis as E
import utxo as U
import wots as W
import qr as Q

RELIQUES = os.path.join(HERE, "reliques.json")
BASE_URL = "https://oykdo.github.io/Eidos/reliques"
VERSION_QR = 1
AGES = {"Satya": 40, "Treta": 30, "Dvapara": 20, "Kali": 10}
FIG = "·○☽✚"      # vide, cercle, croissant, croix


def id_relique(adresse: bytes) -> str:
    return hashlib.sha256(b"eidos-relique-qr/1" + adresse).hexdigest()[:16]


def b64url(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).decode().rstrip("=")


def charge_utile(graine: bytes) -> str:
    return f"{BASE_URL}#r={VERSION_QR}.{b64url(graine)}"


# ---------------------------------------------------------------------------
# Sceller
# ---------------------------------------------------------------------------
def planche(ident, age, indice, adresse, date):
    glyphes = U.addr_encode(adresse)
    return (
        f"EIDOS — relique {ident}\n"
        f"age : {age}   scellee le {date}\n"
        f"indice : {indice or '(aucun)'}\n\n"
        f"adresse (hex) : {adresse.hex()}\n"
        f"adresse (glyphes) :\n{glyphes}\n\n"
        "Sceller : ouvrir une issue titree « robinet » sur github.com/Oykdo/Eidos\n"
        "avec les 31 symboles ci-dessus ; le noeud versera 1 eidolon a la relique.\n"
        "Cacher : le QR (fichier .svg) est le SEUL porteur de la graine. Une photo\n"
        "suffit a recuperer la relique — premier arrive, premier servi.\n"
        "Verifier : scanner l'ecran avant d'imprimer.\n"
    )


def sceller(age, indice, dossier=HERE, fichier=RELIQUES, graine=None, maintenant=None):
    if age not in AGES:
        raise SystemExit(f"age inconnu : {age} (Satya, Treta, Dvapara, Kali)")
    graine = graine or secrets.token_bytes(32)
    adresse = W.adresse_de(graine)
    ident = id_relique(adresse)
    date = (maintenant or datetime.date.today()).isoformat()
    m, v, _ = Q.encoder(charge_utile(graine))
    os.makedirs(dossier, exist_ok=True)
    svg = os.path.join(dossier, f"relique-{ident}.svg")
    txt = os.path.join(dossier, f"relique-{ident}-planche.txt")
    open(svg, "w", encoding="utf-8", newline="\n").write(Q.svg(m))
    open(txt, "w", encoding="utf-8", newline="\n").write(planche(ident, age, indice, adresse, date))
    f = json.load(open(fichier, encoding="utf-8")) if os.path.exists(fichier) else \
        {"spec": "eidos-reliques/1", "reliques": []}
    if any(r.get("adresse") == adresse.hex() for r in f["reliques"]):
        raise SystemExit("adresse deja publiee")
    f["reliques"].append({"id": ident, "adresse": adresse.hex(), "age": age,
                          "indice": indice, "scellee_le": date})
    json.dump(f, open(fichier, "w", encoding="utf-8", newline="\n"), indent=1, ensure_ascii=False)
    return {"id": ident, "adresse": adresse.hex(), "svg": svg, "planche": txt,
            "version_qr": v, "modules": len(m)}


# ---------------------------------------------------------------------------
# Animer : figures sur l'ellipse de l'age, rythme et sens tires du txid
# ---------------------------------------------------------------------------
def dimensions(age):
    s = max(0.35, AGES[age] / 40)
    Wd = 21 + round(20 * s)
    Hd = 9 + round(12 * s)
    return (Wd if Wd % 2 else Wd + 1), (Hd if Hd % 2 else Hd + 1)


def cadre(txid: bytes, age: str, phase: float):
    """Une grille de caracteres. Deterministe pour (txid, age, phase)."""
    Wd, Hd = dimensions(age)
    a, b = AGES[age], AGES[age] / 2
    grille = [[" "] * Wd for _ in range(Hd)]
    cx, cy = (Wd - 1) / 2, (Hd - 1) / 2
    sx, sy = (Wd - 3) / (2 * a), (Hd - 3) / (2 * b)
    sens = 1 if txid[0] % 2 == 0 else -1
    satellites = 3 + txid[1] % 3
    for j in range(Hd):
        for i in range(Wd):
            x, y = (i - cx) / sx, (cy - j) / sy
            r = (x * x) / (a * a) + (y * y) / (b * b)
            if abs(r - 1) < 0.16:
                grille[j][i] = FIG[0]
    # l'anneau interieur respire avec R(θ) = a + b·cos θ
    rr = (a + b * math.cos(phase)) / (a + b)
    for k in range(24):
        t = 2 * math.pi * k / 24
        i = round(cx + rr * 0.55 * a * sx * math.cos(t))
        j = round(cy - rr * 0.55 * b * sy * math.sin(t))
        if 0 <= i < Wd and 0 <= j < Hd:
            grille[j][i] = FIG[1 + (txid[2 + k % 8] >> (k % 4)) % 2]
    # les satellites courent sur l'ellipse, chacun a sa vitesse
    for s in range(satellites):
        v = 1 + txid[8 + s] % 3
        t = sens * v * phase + 2 * math.pi * s / satellites
        i = round(cx + a * sx * math.cos(t))
        j = round(cy - b * sy * math.sin(t))
        if 0 <= i < Wd and 0 <= j < Hd:
            grille[j][i] = FIG[3]
    # au centre, le glyphe du txid (6 bits -> une pile de trois figures)
    code = txid[31] & 63
    for e in range(3):
        f = FIG[(code >> (4 - 2 * e)) & 3]
        j = round(cy) - 1 + e
        if 0 <= j < Hd:
            grille[j][round(cx)] = f
    return "\n".join("".join(l) for l in grille)


def animer(txid: bytes, age="Kali", frames=0, fps=12, sortie=sys.stdout):
    Wd, Hd = dimensions(age)
    k = 0
    try:
        while frames == 0 or k < frames:
            phase = 2 * math.pi * k / 48
            sortie.write(cadre(txid, age, phase) + "\n")
            sortie.write(f"{age}  R(θ) = {AGES[age]} + {AGES[age] / 2:.0f}·cos θ   "
                         f"txid {txid.hex()[:16]}…  image {k}\n")
            sortie.flush()
            k += 1
            if frames == 0 or k < frames:
                time.sleep(1 / fps)
                sortie.write(f"\x1b[{Hd + 1}A")
    except KeyboardInterrupt:
        sortie.write("\n")


# ---------------------------------------------------------------------------
def tests():
    import tempfile
    ok = 0
    d = tempfile.mkdtemp()
    fichier = os.path.join(d, "reliques.json")
    graine = hashlib.sha256(b"relique/test").digest()
    r = sceller("Kali", "sous la 3e arche", dossier=d, fichier=fichier, graine=graine,
                maintenant=datetime.date(2026, 9, 4))
    assert r["adresse"] == W.adresse_de(graine).hex() and r["id"] == id_relique(W.adresse_de(graine))
    f = json.load(open(fichier, encoding="utf-8"))
    assert f["reliques"][0]["id"] == r["id"] and f["reliques"][0]["age"] == "Kali"
    assert "graine" not in json.dumps(f) and b64url(graine) not in json.dumps(f)
    txt = open(r["planche"], encoding="utf-8").read()
    assert b64url(graine) not in txt and graine.hex() not in txt and r["adresse"] in txt
    assert U.addr_decode(U.addr_encode(bytes.fromhex(r["adresse"]))) == bytes.fromhex(r["adresse"])
    print(f"scellee : id {r['id']}, planche sans graine, reliques.json : OK"); ok += 1

    svg = open(r["svg"], encoding="utf-8").read()
    assert svg.startswith("<svg") and r["version_qr"] == 9 and r["modules"] == 53
    assert len(charge_utile(graine)) == len(BASE_URL) + 3 + 3 + 43
    try:
        sceller("Kali", "bis", dossier=d, fichier=fichier, graine=graine)
        raise AssertionError("doublon accepte")
    except SystemExit:
        pass
    print(f"QR version 9 (53x53, niveau H), charge utile {len(charge_utile(graine))} car., doublon refuse : OK"); ok += 1

    txid = hashlib.sha256(b"txid").digest()
    c0, c1 = cadre(txid, "Kali", 0.0), cadre(txid, "Kali", 0.5)
    assert c0 == cadre(txid, "Kali", 0.0) and c0 != c1
    Wd, Hd = dimensions("Kali")
    assert all(len(l) == Wd for l in c0.split("\n")) and c0.count("\n") == Hd - 1
    assert all(ch == " " or ch in FIG for ch in c0.replace("\n", ""))
    import io
    buf = io.StringIO()
    animer(txid, "Satya", frames=3, fps=1000, sortie=buf)
    assert buf.getvalue().count("image ") == 3
    print(f"animation : {Wd}x{Hd} (Kali), 3 images Satya, deterministe : OK"); ok += 1
    print(f"ok : {ok} controles relique")


if __name__ == "__main__":
    a = sys.argv[1:]

    def opt(nom, defaut=None):
        return a[a.index(nom) + 1] if nom in a and a.index(nom) + 1 < len(a) else defaut

    if "--test" in a or not a:
        tests()
    elif "--sceller" in a:
        r = sceller(opt("--age", "Kali"), opt("--indice", ""), dossier=opt("--dossier", HERE))
        print(f"relique {r['id']} — adresse {r['adresse']}\n"
              f"QR      : {r['svg']} (version {r['version_qr']}, {r['modules']}x{r['modules']})\n"
              f"planche : {r['planche']}\n"
              f"reliques.json mis a jour. La graine n'est que dans le QR.")
    elif "--animer" in a:
        h = opt("--animer", "")
        txid = bytes.fromhex(h) if len(h) == 64 else hashlib.sha256(h.encode()).digest()
        animer(txid, opt("--age", "Kali"), int(opt("--frames", "0")), float(opt("--fps", "12")))
    else:
        print(__doc__.strip().split("  python3")[1].split("Charge utile")[0])
