#!/usr/bin/env python3
"""
banniere.py — bannières SVG des README, dessinées depuis eonis.py.

Deux fichiers, docs/banniere-fr.svg et docs/banniere-en.svg : la marque
(cercle, croissant, croix — les trois figures des glyphes), le titre, une
ligne par langue, et la courbe d'émission R(h) = a + (a/2)·cos(2π(h − h₀)/T)
des quatre âges, calculée par le cosinus Decimal d'eonis.py (jamais math.cos).
Enveloppe [a/2, 3a/2] exacte ; largeur de chaque âge proportionnelle à ses
époques (832 : 624 : 416 : 208 = 4 : 3 : 2 : 1) ; hauteur proportionnelle à a.
Aucune image importée, aucune police embarquée : des formules et du texte.

Usage :
    python3 docs/banniere.py         # réécrit les deux SVG (fins de ligne LF)

LIMITE assumée : l'axe du temps est compressé — une oscillation dessinée vaut
208 époques, un quart de Kali — sinon 2 080 époques feraient une bande pleine
à cette largeur. La phase de départ (h₀ = 492) est respectée. C'est une
figure, pas une preuve : rien ici n'engage la genèse, eonis.py est importé
tel quel et jamais modifié.
"""
import os
import sys
from decimal import Decimal, localcontext
from xml.sax.saxutils import escape

ICI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(ICI))
import eonis as E  # noqa: E402

LARGEUR, HAUTEUR = 1280, 320
FOND = "#12151A"
OR, ARGENT, CUIVRE, FER = "#C9A227", "#C6CBD1", "#B87333", "#79818E"
ENCRE, SOURD, BLEU, CREUX = "#DDE1E6", "#79818E", "#3A6EA5", "#2A3038"
METAUX = [OR, ARGENT, CUIVRE, FER]                 # Satya, Trétâ, Dvâpara, Kali
NOMS = ["Satya", "Trétâ", "Dvâpara", "Kali"]
EPOQUES_PAR_ONDE = 208
X0, X1 = 168, 1208                                 # zone de la courbe
Y_BASE, Y_HAUT = 284, 184                          # R = 0 en bas, R = 60 en haut
R_MAX = Decimal(60)
SERIF = "Georgia, 'Times New Roman', serif"
MONO = "ui-monospace, 'IBM Plex Mono', Consolas, monospace"

TEXTES = {
    "fr": {
        "aria": "Eidos — émission bornée, consensus fédéré, signatures par hachage",
        "sous": "εἶδος · la forme — émission bornée sans halving · consensus fédéré · signatures par hachage pur",
        "lien": "réseau d'essai, sans valeur · oykdo.github.io/Eidos",
        "formule": "R(h) = a + a/2 · cos(2π(h − h₀)/T) — quatre âges 16 : 9 : 4 : 1 — une onde dessinée = 208 époques",
    },
    "en": {
        "aria": "Eidos — bounded emission, federated consensus, hash-based signatures",
        "sous": "εἶδος · the form — bounded emission without halving · federated consensus · hash-only signatures",
        "lien": "testnet, no value · oykdo.github.io/Eidos",
        "formule": "R(h) = a + a/2 · cos(2π(h − h₀)/T) — four ages 16 : 9 : 4 : 1 — one drawn wave = 208 epochs",
    },
}


def y_de(r: Decimal) -> float:
    return float(Decimal(Y_BASE) - Decimal(Y_BASE - Y_HAUT) * r / R_MAX)


def courbe():
    """Une bande et une polyligne par âge : (indice, x, largeur, y_haut, y_bas, points)."""
    total = sum(ep for _, _, ep in E.AGES)
    largeur = Decimal(X1 - X0)
    x = Decimal(X0)
    bandes = []
    with localcontext() as ctx:
        ctx.prec = 40
        phase0 = Decimal(E.H0) / Decimal(E.T)
        for k, (_, a, ep) in enumerate(E.AGES):
            w = largeur * ep / total
            n = int(w // 2)
            pts = []
            for i in range(n + 1):
                px = x + w * i / n
                u = Decimal(ep) * i / (n * EPOQUES_PAR_ONDE)
                r = Decimal(a) + Decimal(a) * E.B_RATIO * E.dcos(2 * E.PI * (u - phase0))
                pts.append("%.1f,%.1f" % (float(px), y_de(r)))
            bandes.append((k, float(x), float(w), y_de(Decimal(a) * 3 / 2), y_de(Decimal(a) / 2), pts))
            x += w
    return bandes


def svg(langue: str) -> str:
    t = TEXTES[langue]
    out = [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" role="img" aria-label="%s">'
        % (LARGEUR, HAUTEUR, escape(t["aria"])),
        '  <rect width="%d" height="%d" fill="%s"/>' % (LARGEUR, HAUTEUR, FOND),
        '  <rect x="0" y="%d" width="%d" height="2" fill="%s"/>' % (HAUTEUR - 2, LARGEUR, OR),
        "  <!-- Marque : cercle, croissant, croix — les trois étages d'un glyphe -->",
        '  <g fill="none" stroke-linecap="round" transform="translate(72 34)">',
        '    <circle cx="36" cy="22" r="16" stroke="%s" stroke-width="4"/>' % OR,
        '    <path d="M20 62 a16 16 0 0 0 32 0" stroke="%s" stroke-width="4"/>' % ARGENT,
        '    <path d="M36 88 v32 M20 104 h32" stroke="%s" stroke-width="4"/>' % BLEU,
        "  </g>",
        '  <text x="168" y="92" fill="%s" font-family="%s" font-size="52" font-weight="300" letter-spacing="18">EIDOS</text>'
        % (ENCRE, SERIF),
        '  <text x="168" y="126" fill="%s" font-family="%s" font-size="15">%s</text>' % (SOURD, MONO, escape(t["sous"])),
        '  <text x="168" y="150" fill="%s" font-family="%s" font-size="13">%s</text>' % (OR, MONO, escape(t["lien"])),
        "  <!-- Émission des quatre âges : enveloppe [a/2, 3a/2], durées 4 : 3 : 2 : 1, cosinus Decimal d'eonis.py -->",
        '  <text x="%d" y="176" fill="%s" font-family="%s" font-size="11">%s</text>'
        % (X0, SOURD, MONO, escape(t["formule"])),
        '  <line x1="%d" y1="%d" x2="%d" y2="%d" stroke="%s" stroke-width="1"/>' % (X0, Y_BASE, X1, Y_BASE, CREUX),
    ]
    for k, x, w, yh, yb, pts in courbe():
        m = METAUX[k]
        out.append('  <rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="%s" fill-opacity="0.10"/>'
                   % (x, yh, w, yb - yh, m))
        out.append('  <polyline points="%s" fill="none" stroke="%s" stroke-width="1.8" stroke-linejoin="round"/>'
                   % (" ".join(pts), m))
        out.append('  <text x="%.1f" y="302" fill="%s" font-family="%s" font-size="12" text-anchor="middle">%s · a = %d</text>'
                   % (x + w / 2, m, MONO, escape(NOMS[k]), E.AGES[k][1]))
    out.append("</svg>")
    return "\n".join(out) + "\n"


def ecrire() -> list:
    chemins = []
    for langue in ("fr", "en"):
        chemin = os.path.join(ICI, "banniere-%s.svg" % langue)
        with open(chemin, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(svg(langue))
        chemins.append(chemin)
    return chemins


if __name__ == "__main__":
    for c in ecrire():
        s = open(c, encoding="utf-8").read()
        assert s.count("<polyline") == 4, "quatre âges, quatre courbes"
        assert "\r" not in s, "fins de ligne LF"
        print("écrit %s (%d octets)" % (os.path.relpath(c, os.path.dirname(ICI)), len(s.encode("utf-8"))))
    b = courbe()
    ys = [float(p.split(",")[1]) for p in b[0][5]]
    assert min(ys) >= b[0][3] - 0.2 and max(ys) <= b[0][4] + 0.2, "Satya reste dans [a/2, 3a/2]"
    print("2 contrôles OK")
