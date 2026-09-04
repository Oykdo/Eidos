#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
qr.py — encodeur QR minimal, bibliotheque standard uniquement.

Mode octets, niveau de correction H (30 %), versions 1 a 10 (21 a 57
modules), masque choisi par penalite (ISO/IEC 18004). Sert au gardien des
reliques (relique.py --sceller) : le QR porte la graine, il doit survivre a
la pluie et aux rayures, d'ou le niveau H.

  python3 qr.py "texte"        imprime le QR en blocs unicode
  python3 qr.py --svg "texte"  imprime un SVG
  python3 qr.py --test         controles

LIMITE. Aucun decodeur ici : les controles verifient la structure (motifs,
information de format, syndromes de Reed-Solomon nuls, relecture du zigzag
demasque), pas la lecture par un telephone. Avant d'imprimer une planche,
scanner l'ecran une fois.
"""

import sys

# ---------------------------------------------------------------------------
# Tables (niveau H) : capacite en octets, (ec par bloc, [(nb blocs, octets de donnees)])
# ---------------------------------------------------------------------------
BLOCS_H = {
    1: (17, [(1, 9)]),
    2: (28, [(1, 16)]),
    3: (22, [(2, 13)]),
    4: (16, [(4, 9)]),
    5: (22, [(2, 11), (2, 12)]),
    6: (28, [(4, 15)]),
    7: (26, [(4, 13), (1, 14)]),
    8: (26, [(4, 14), (2, 15)]),
    9: (24, [(4, 12), (4, 13)]),
    10: (28, [(6, 15), (2, 16)]),
}
ALIGNEMENT = {1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34],
              7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50]}


def taille(v): return 17 + 4 * v


def capacite(v):
    donnees = sum(n * k for n, k in BLOCS_H[v][1])
    bits_compte = 16 if v >= 10 else 8
    return (donnees * 8 - 4 - bits_compte) // 8


# ---------------------------------------------------------------------------
# GF(256), polynome 0x11D, et Reed-Solomon
# ---------------------------------------------------------------------------
EXP = [0] * 512
LOG = [0] * 256
_x = 1
for _i in range(255):
    EXP[_i] = _x
    LOG[_x] = _i
    _x <<= 1
    if _x & 0x100:
        _x ^= 0x11D
for _i in range(255, 512):
    EXP[_i] = EXP[_i - 255]


def gf_mul(a, b):
    if a == 0 or b == 0:
        return 0
    return EXP[LOG[a] + LOG[b]]


def generateur(n):
    g = [1]
    for i in range(n):
        g = poly_mul(g, [1, EXP[i]])
    return g


def poly_mul(p, q):
    r = [0] * (len(p) + len(q) - 1)
    for i, a in enumerate(p):
        for j, b in enumerate(q):
            r[i + j] ^= gf_mul(a, b)
    return r


def reed_solomon(donnees, n_ec):
    g = generateur(n_ec)
    reste = list(donnees) + [0] * n_ec
    for i in range(len(donnees)):
        c = reste[i]
        if c:
            for j in range(1, len(g)):
                reste[i + j] ^= gf_mul(g[j], c)
    return reste[len(donnees):]


def syndromes_nuls(mot, n_ec):
    """Vrai si le mot de code (donnees + ec) est divisible par le generateur."""
    for i in range(n_ec):
        x = EXP[i]
        acc = 0
        for c in mot:
            acc = gf_mul(acc, x) ^ c
        if acc:
            return False
    return True


# ---------------------------------------------------------------------------
# Flux de donnees : mode octets, remplissage, blocs entrelaces
# ---------------------------------------------------------------------------
def version_pour(n_octets):
    for v in range(1, 11):
        if capacite(v) >= n_octets:
            return v
    raise ValueError(f"{n_octets} octets : trop long pour une version 10 en niveau H "
                     f"({capacite(10)} au plus)")


def mots_de_code(octets, v):
    ec_par_bloc, groupes = BLOCS_H[v]
    total_donnees = sum(n * k for n, k in groupes)
    bits = []

    def push(val, n):
        for i in range(n - 1, -1, -1):
            bits.append((val >> i) & 1)

    push(0b0100, 4)
    push(len(octets), 16 if v >= 10 else 8)
    for o in octets:
        push(o, 8)
    push(0, min(4, total_donnees * 8 - len(bits)))
    while len(bits) % 8:
        bits.append(0)
    donnees = [int("".join(map(str, bits[i:i + 8])), 2) for i in range(0, len(bits), 8)]
    pad = (0xEC, 0x11)
    k = 0
    while len(donnees) < total_donnees:
        donnees.append(pad[k % 2]); k += 1

    blocs, i = [], 0
    for n, k in groupes:
        for _ in range(n):
            blocs.append(donnees[i:i + k]); i += k
    ecs = [reed_solomon(b, ec_par_bloc) for b in blocs]

    sortie = []
    for j in range(max(len(b) for b in blocs)):
        for b in blocs:
            if j < len(b):
                sortie.append(b[j])
    for j in range(ec_par_bloc):
        for e in ecs:
            sortie.append(e[j])
    return sortie, blocs, ecs


# ---------------------------------------------------------------------------
# Matrice : motifs fonctionnels, placement, masques, format, version
# ---------------------------------------------------------------------------
def matrice_vide(v):
    n = taille(v)
    return [[None] * n for _ in range(n)]      # None = libre pour les donnees


def poser_finder(m, r, c):
    for i in range(-1, 8):
        for j in range(-1, 8):
            rr, cc = r + i, c + j
            if 0 <= rr < len(m) and 0 <= cc < len(m):
                bord = i in (-1, 7) or j in (-1, 7)
                anneau = i in (0, 6) or j in (0, 6)
                coeur = 2 <= i <= 4 and 2 <= j <= 4
                m[rr][cc] = 0 if bord else (1 if (anneau or coeur) else 0)


def poser_alignement(m, r, c):
    for i in range(-2, 3):
        for j in range(-2, 3):
            m[r + i][c + j] = 1 if (abs(i) == 2 or abs(j) == 2 or (i == 0 and j == 0)) else 0


def motifs_fonctionnels(m, v):
    n = len(m)
    poser_finder(m, 0, 0); poser_finder(m, 0, n - 7); poser_finder(m, n - 7, 0)
    for i in range(8, n - 8):
        m[6][i] = m[i][6] = 1 - (i % 2)
    pos = ALIGNEMENT[v]
    for r in pos:
        for c in pos:
            if m[r][c] is None:
                poser_alignement(m, r, c)
    # zones reservees : format (autour des finders) et module sombre
    for i in range(9):
        if m[8][i] is None: m[8][i] = 0
        if m[i][8] is None: m[i][8] = 0
    for i in range(8):
        m[8][n - 1 - i] = 0 if m[8][n - 1 - i] is None else m[8][n - 1 - i]
        m[n - 1 - i][8] = 0 if m[n - 1 - i][8] is None else m[n - 1 - i][8]
    m[n - 8][8] = 1
    if v >= 7:
        for i in range(6):
            for j in range(3):
                m[i][n - 11 + j] = 0
                m[n - 11 + j][i] = 0


def zones_reservees(v):
    """Matrice booleenne des modules fonctionnels (ni donnees ni ec)."""
    m = matrice_vide(v)
    motifs_fonctionnels(m, v)
    return [[x is not None for x in ligne] for ligne in m]


def placer(m, bits):
    n = len(m)
    k = 0
    col = n - 1
    montee = True
    while col > 0:
        if col == 6:
            col -= 1
        lignes = range(n - 1, -1, -1) if montee else range(n)
        for r in lignes:
            for c in (col, col - 1):
                if m[r][c] is None:
                    m[r][c] = bits[k] if k < len(bits) else 0
                    k += 1
        col -= 2
        montee = not montee


MASQUES = [
    lambda r, c: (r + c) % 2 == 0,
    lambda r, c: r % 2 == 0,
    lambda r, c: c % 3 == 0,
    lambda r, c: (r + c) % 3 == 0,
    lambda r, c: (r // 2 + c // 3) % 2 == 0,
    lambda r, c: (r * c) % 2 + (r * c) % 3 == 0,
    lambda r, c: ((r * c) % 2 + (r * c) % 3) % 2 == 0,
    lambda r, c: ((r + c) % 2 + (r * c) % 3) % 2 == 0,
]


def appliquer_masque(m, reserve, k):
    f = MASQUES[k]
    return [[(m[r][c] ^ 1 if (not reserve[r][c] and f(r, c)) else m[r][c])
             for c in range(len(m))] for r in range(len(m))]


def bch(valeur, bits_donnees, poly, degre):
    v = valeur << degre
    for i in range(bits_donnees + degre - 1, degre - 1, -1):
        if v & (1 << i):
            v ^= poly << (i - degre)
    return (valeur << degre) | v


def poser_format(m, k):
    n = len(m)
    info = bch((0b10 << 3) | k, 5, 0b10100110111, 10) ^ 0b101010000010010   # H = 10
    bits = [(info >> (14 - i)) & 1 for i in range(15)]
    pos_a = [(8, 0), (8, 1), (8, 2), (8, 3), (8, 4), (8, 5), (8, 7), (8, 8),
             (7, 8), (5, 8), (4, 8), (3, 8), (2, 8), (1, 8), (0, 8)]
    pos_b = [(n - 1, 8), (n - 2, 8), (n - 3, 8), (n - 4, 8), (n - 5, 8), (n - 6, 8), (n - 7, 8),
             (8, n - 8), (8, n - 7), (8, n - 6), (8, n - 5), (8, n - 4), (8, n - 3), (8, n - 2), (8, n - 1)]
    for (r, c), b in zip(pos_a, bits):
        m[r][c] = b
    for (r, c), b in zip(pos_b, bits):
        m[r][c] = b


def poser_version(m, v):
    if v < 7:
        return
    n = len(m)
    info = bch(v, 6, 0b1111100100101, 12)
    for i in range(18):
        b = (info >> i) & 1
        m[i // 3][n - 11 + i % 3] = b
        m[n - 11 + i % 3][i // 3] = b


def penalite(m):
    n = len(m)
    p = 0
    for lignes in (m, [list(c) for c in zip(*m)]):
        for ligne in lignes:
            run, prev = 0, None
            for x in ligne:
                if x == prev:
                    run += 1
                else:
                    if run >= 5: p += 3 + (run - 5)
                    run, prev = 1, x
            if run >= 5: p += 3 + (run - 5)
    for r in range(n - 1):
        for c in range(n - 1):
            if m[r][c] == m[r][c + 1] == m[r + 1][c] == m[r + 1][c + 1]:
                p += 3
    motif = [1, 0, 1, 1, 1, 0, 1]
    for lignes in (m, [list(c) for c in zip(*m)]):
        for ligne in lignes:
            for i in range(n - 6):
                if ligne[i:i + 7] == motif:
                    avant = all(x == 0 for x in ligne[max(0, i - 4):i]) and i >= 4
                    apres = all(x == 0 for x in ligne[i + 7:i + 11]) and i + 11 <= n
                    if avant or apres:
                        p += 40
    sombres = sum(sum(l) for l in m)
    ratio = sombres * 100 // (n * n)
    p += 10 * min(abs(ratio - 50) // 5, abs(ratio - 50 + 5) // 5)
    return p


def encoder(texte):
    """Renvoie (matrice de 0/1, version, masque)."""
    octets = texte.encode("utf-8") if isinstance(texte, str) else bytes(texte)
    v = version_pour(len(octets))
    mots, _, _ = mots_de_code(octets, v)
    bits = [(o >> (7 - i)) & 1 for o in mots for i in range(8)]
    base = matrice_vide(v)
    motifs_fonctionnels(base, v)
    reserve = zones_reservees(v)
    placer(base, bits)
    meilleur = None
    for k in range(8):
        m = appliquer_masque(base, reserve, k)
        poser_format(m, k)
        poser_version(m, v)
        p = penalite(m)
        if meilleur is None or p < meilleur[0]:
            meilleur = (p, k, m)
    return meilleur[2], v, meilleur[1]


# ---------------------------------------------------------------------------
# Rendus
# ---------------------------------------------------------------------------
def svg(m, module=8, marge=4, fond="#ffffff", encre="#000000"):
    n = len(m)
    t = (n + 2 * marge) * module
    rects = []
    for r in range(n):
        for c in range(n):
            if m[r][c]:
                rects.append(f'<rect x="{(c + marge) * module}" y="{(r + marge) * module}" '
                             f'width="{module}" height="{module}"/>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {t} {t}" width="{t}" height="{t}" '
            f'shape-rendering="crispEdges"><rect width="{t}" height="{t}" fill="{fond}"/>'
            f'<g fill="{encre}">{"".join(rects)}</g></svg>\n')


def texte(m, marge=2):
    """Deux modules par caractere (blocs unicode), fond clair."""
    n = len(m)
    lignes = []
    vide = [[0] * (n + 2 * marge)] * marge
    grille = vide + [[0] * marge + l + [0] * marge for l in m] + vide
    for r in range(0, len(grille), 2):
        haut = grille[r]
        bas = grille[r + 1] if r + 1 < len(grille) else [0] * len(haut)
        lignes.append("".join({(0, 0): " ", (1, 0): "▀", (0, 1): "▄", (1, 1): "█"}[(h, b)]
                              for h, b in zip(haut, bas)))
    return "\n".join(lignes)


# ---------------------------------------------------------------------------
def tests():
    ok = 0
    assert [capacite(v) for v in range(1, 11)] == [7, 14, 24, 34, 44, 58, 64, 84, 98, 119]
    print("capacites niveau H, v1..v10     : OK"); ok += 1

    for txt in ("Eidos", "https://oykdo.github.io/Eidos/reliques#r=1." + "A" * 43, "x" * 119):
        m, v, k = encoder(txt)
        n = len(m)
        assert n == taille(v) and all(len(l) == n for l in m)
        assert all(x in (0, 1) for l in m for x in l)
        # finders : coeur 3x3 sombre, anneau sombre, separateur clair
        for r, c in ((0, 0), (0, n - 7), (n - 7, 0)):
            assert all(m[r + i][c + j] == 1 for i in (2, 3, 4) for j in (2, 3, 4))
            assert all(m[r][c + j] == 1 and m[r + 6][c + j] == 1 for j in range(7))
        assert m[n - 8][8] == 1
        # syndromes de Reed-Solomon nuls sur chaque bloc
        mots, blocs, ecs = mots_de_code(txt.encode(), v)
        assert all(syndromes_nuls(b + e, BLOCS_H[v][0]) for b, e in zip(blocs, ecs))
        # information de format : les deux copies concordent et decodent (H, masque k)
        info = bch((0b10 << 3) | k, 5, 0b10100110111, 10) ^ 0b101010000010010
        bits = [(info >> (14 - i)) & 1 for i in range(15)]
        assert [m[8][i] for i in (0, 1, 2, 3, 4, 5, 7, 8)] + [m[i][8] for i in (7, 5, 4, 3, 2, 1, 0)] == bits
        # relecture du zigzag demasque = mots de code
        reserve = zones_reservees(v)
        demasque = appliquer_masque(m, reserve, k)
        lus = []
        col, montee = n - 1, True
        while col > 0:
            if col == 6: col -= 1
            for r in (range(n - 1, -1, -1) if montee else range(n)):
                for c in (col, col - 1):
                    if not reserve[r][c]:
                        lus.append(demasque[r][c])
            col -= 2; montee = not montee
        relus = [int("".join(map(str, lus[i:i + 8])), 2) for i in range(0, len(mots) * 8, 8)]
        assert relus == mots, (txt[:10], v)
        print(f"{len(txt):>3} octets -> version {v:>2} ({n}x{n}), masque {k}, RS et zigzag : OK"); ok += 1

    try:
        encoder("x" * 120); raise AssertionError("trop long accepte")
    except ValueError:
        print("120 octets en niveau H          : refus (version 10 au plus)"); ok += 1
    s = svg(encoder("Eidos")[0])
    assert s.startswith("<svg") and "<rect" in s
    print(f"\n{ok} verifications passees.")


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a or a == ["--test"]:
        tests()
    elif a[0] == "--svg":
        print(svg(encoder(" ".join(a[1:]))[0]), end="")
    else:
        m, v, k = encoder(" ".join(a))
        print(texte(m))
        print(f"version {v}, {len(m)}x{len(m)}, masque {k}, niveau H")
