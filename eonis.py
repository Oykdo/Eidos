#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
eonis.py — prototype exécutable sur iPhone (a-Shell, Pythonista, iSH).
Bibliothèque standard uniquement : aucun paquet à installer.

Contenu
  1. Table d'émission cosinusoïdale, arithmétique décimale déterministe,
     total exact garanti par répartition au plus fort reste.
  2. Codec à trois figures : 6 bits par glyphe, encodage et décodage.
  3. Chaîne jouet : en-têtes, SHA-256d, récompense lue dans la table.
  4. Poids de distribution par palier.

Usage :   python3 eonis.py            (lance les auto-tests)
          python3 eonis.py --table    (imprime la table W)
          python3 eonis.py --demo     (mine 12 blocs)

AVERTISSEMENT. Prototype de spécification. Ce n'est pas un noeud : pas de
réseau, pas de validation par les pairs, pas de gestion de clés. Ne jamais
produire de matériel cryptographique réel avec ce fichier.
"""

import hashlib, sys, time
from decimal import Decimal, getcontext, ROUND_FLOOR

getcontext().prec = 60

# --------------------------------------------------------------------------
# Paramètres
# --------------------------------------------------------------------------
T        = 1008          # blocs par époque : 168 h x 6 blocs de 10 min
H0       = 492           # culmination : 41/84 de l'époque
ATOMES   = 100_000_000   # 1 EIDOLON = 1e8 atomes
AGES = [                 # (nom, a en EIDOLON, nombre d'époques)
    ("Satya",   40, 832),
    ("Treta",   30, 624),
    ("Dvapara", 20, 416),
    ("Kali",    10, 208),
]
B_RATIO  = Decimal("0.5")   # b = a/2  -> rapport max/min = 3

PI = Decimal(
    "3.14159265358979323846264338327950288419716939937510582097494459230782"
)

# --------------------------------------------------------------------------
# 1. Cosinus décimal déterministe (série de Taylor, réduction d'argument)
# --------------------------------------------------------------------------
def dcos(x: Decimal) -> Decimal:
    """cos(x) en Decimal. Reproductible sur toute plateforme, contrairement
    a math.cos qui depend de la libm locale."""
    two_pi = 2 * PI
    x = x - (x / two_pi).to_integral_value(rounding=ROUND_FLOOR) * two_pi
    if x > PI:
        x -= two_pi
    term = Decimal(1)
    total = Decimal(1)
    x2 = x * x
    n = 0
    while True:
        n += 2
        term = -term * x2 / (n * (n - 1))
        if term == 0 or abs(term) < Decimal(10) ** (-(getcontext().prec - 5)):
            break
        total += term
    return total


# --------------------------------------------------------------------------
# 2. Table d'émission cumulée, total exact
# --------------------------------------------------------------------------
def build_epoch_table(a_eidolon: int, T: int = T, h0: int = H0):
    """Retourne W, liste de T+1 entiers (atomes cumules), avec W[T] exact.

    R(h) = a + b*cos(2*pi*(h-h0)/T),  b = a/2.
    La somme des cosinus sur une periode complete est nulle, donc le total
    vaut exactement a*T. Les arrondis sont repartis au plus fort reste :
    aucun atome n'est cree ni perdu."""
    total_atomes = a_eidolon * T * ATOMES
    a = Decimal(a_eidolon) * ATOMES
    b = a * B_RATIO
    two_pi_over_T = 2 * PI / Decimal(T)

    exact, floors = [], []
    for h in range(T):
        r = a + b * dcos(two_pi_over_T * Decimal(h - h0))
        exact.append(r)
        floors.append(int(r.to_integral_value(rounding=ROUND_FLOOR)))

    reste = total_atomes - sum(floors)
    assert 0 <= reste <= T, "residu d'arrondi hors bornes"

    # plus fort reste, depart deterministe : fraction decroissante, puis index
    order = sorted(range(T), key=lambda h: (-(exact[h] - floors[h]), h))
    for h in order[:reste]:
        floors[h] += 1

    W = [0]
    for r in floors:
        W.append(W[-1] + r)
    assert W[T] == total_atomes, "total inexact"
    return W


def reward(W, height: int) -> int:
    h = height % T
    return W[h + 1] - W[h]


def age_of(height: int):
    """(nom de l'age, a, hauteur de depart) pour une hauteur donnee."""
    start = 0
    for name, a, epochs in AGES:
        span = epochs * T
        if height < start + span:
            return name, a, start
        start += span
    return None, 0, start          # emission terminee


TABLES = {a: None for _, a, _ in AGES}


def reward_at(height: int) -> int:
    name, a, start = age_of(height)
    if name is None:
        return 0
    if TABLES[a] is None:
        TABLES[a] = build_epoch_table(a)
    return reward(TABLES[a], height - start)


# --------------------------------------------------------------------------
# 3. Codec à trois figures — 6 bits par glyphe
# --------------------------------------------------------------------------
#   00 vide · 01 cercle · 10 croissant · 11 croix
#   lecture de haut en bas ; ici de gauche à droite, 3 signes par glyphe
FIGURES = {0: "\u00b7", 1: "\u25cb", 2: "\u263d", 3: "\u271a"}
INVERSE = {v: k for k, v in FIGURES.items()}


def encode_glyphs(data: bytes) -> str:
    bits = "".join(format(byte, "08b") for byte in data)
    pad = (-len(bits)) % 6
    bits += "0" * pad
    out = []
    for i in range(0, len(bits), 6):
        code = int(bits[i:i + 6], 2)
        out.append("".join(FIGURES[(code >> (2 * (2 - e))) & 3] for e in range(3)))
    return " ".join(out)


def decode_glyphs(s: str, nbytes: int) -> bytes:
    groups = s.split()
    bits = ""
    for g in groups:
        code = 0
        for ch in g:
            code = (code << 2) | INVERSE[ch]
        bits += format(code, "06b")
    bits = bits[: nbytes * 8]
    return bytes(int(bits[i:i + 8], 2) for i in range(0, len(bits), 8))


# --------------------------------------------------------------------------
# 4. Chaîne jouet
# --------------------------------------------------------------------------
def sha256d(b: bytes) -> bytes:
    return hashlib.sha256(hashlib.sha256(b).digest()).digest()


def header(height, prev, merkle, ts, nonce):
    return (height.to_bytes(8, "big") + prev + merkle
            + ts.to_bytes(8, "big") + nonce.to_bytes(8, "big"))


def mine(height, prev, merkle, bits=20, ts=None):
    """Preuve de travail minuscule : bits zeros de tete. bits=20 tient
    en quelques secondes sur un iPhone."""
    ts = ts or int(time.time())
    target = 1 << (256 - bits)
    nonce = 0
    while True:
        h = sha256d(header(height, prev, merkle, ts, nonce))
        if int.from_bytes(h, "big") < target:
            return {"height": height, "hash": h, "nonce": nonce,
                    "ts": ts, "reward": reward_at(height)}
        nonce += 1


# --------------------------------------------------------------------------
# 5. Poids de distribution
# --------------------------------------------------------------------------
PALIERS = [("Supreme", 1, 33, 2.5), ("Elite", 34, 100, 1.5),
           ("Fondateur", 101, 1000, 0.5), ("Pionnier", 1001, 10000, 0.3)]


def poids_cumule():
    return sum((hi - lo + 1) * m for _, lo, hi, m in PALIERS)


def part_pionniers(total_coffres: int) -> float:
    base = poids_cumule()
    standard = max(0, total_coffres - 10000) * 0.1
    return base / (base + standard)


# --------------------------------------------------------------------------
# Auto-tests
# --------------------------------------------------------------------------
def tests():
    ok = 0

    W = build_epoch_table(40)
    assert W[T] == 40 * T * ATOMES
    print(f"total d'epoque exact          : {W[T] / ATOMES:,.0f} EIDOLON"); ok += 1

    rs = [W[h + 1] - W[h] for h in range(T)]
    lo, hi = min(rs) / ATOMES, max(rs) / ATOMES
    print(f"bornes de recompense          : {lo:.4f} .. {hi:.4f} EIDOLON")
    assert lo > 0 and abs(hi / lo - 3) < 0.01
    print(f"rapport max/min               : {hi / lo:.6f}  (attendu 3)"); ok += 1

    pic = max(range(T), key=lambda h: rs[h])
    print(f"culmination au bloc           : {pic} / {T}  ({pic / T:.3f} ~ 41/84)")
    assert abs(pic - H0) <= 1; ok += 1

    total = sum(a * e for _, a, e in AGES) * T
    print(f"emission totale du protocole  : {total:,} EIDOLON")
    assert total == 62_899_200; ok += 1

    d = hashlib.sha256(b"esoptron").digest()
    g = encode_glyphs(d)
    assert decode_glyphs(g, 32) == d
    print(f"codec 3 figures aller-retour  : OK, {len(g.split())} glyphes / 32 o"); ok += 1

    p = poids_cumule()
    print(f"poids des 10 000 premiers     : {p}")
    assert abs(p - 3333.0) < 1e-9; ok += 1
    print(f"part pionniers a 20 000       : {part_pionniers(20000) * 100:.1f} %")

    print(f"\nempreinte de la table (age I) : "
          f"{hashlib.sha256(bytes(str(W), 'ascii')).hexdigest()[:32]}")
    print(f"\n{ok} verifications passees.")


def demo():
    prev = bytes(32)
    for h in range(12):
        merkle = hashlib.sha256(f"bloc-{h}".encode()).digest()
        b = mine(h, prev, merkle, bits=18)
        prev = b["hash"]
        print(f"#{b['height']:<3} {b['hash'].hex()[:16]}  "
              f"nonce={b['nonce']:<8} recompense={b['reward'] / ATOMES:.4f}")
    print("\nempreinte du dernier bloc en glyphes :")
    print(encode_glyphs(prev))


if __name__ == "__main__":
    if "--table" in sys.argv:
        W = build_epoch_table(40)
        for h in range(0, T, 24):
            print(f"{h:5d}  {(W[h + 1] - W[h]) / ATOMES:12.6f}")
    elif "--demo" in sys.argv:
        demo()
    else:
        tests()
