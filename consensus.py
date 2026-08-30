#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
consensus.py — difficulte, travail cumule, regles d'horodatage.

Ce qui manquait pour que la chaine tienne debout seule : jusqu'ici la
difficulte etait un nombre fixe passe a la main. Ici elle se calcule, et
elle se verifie.

  Cible      entier de 256 bits ; un bloc est valide si son hache lui est
             inferieur. Encodee sur 4 octets (mantisse 24 bits, exposant 8).
  Travail    2^256 / (cible + 1) — nombre moyen d'essais pour trouver le bloc.
             La bonne chaine est la plus lourde, jamais la plus longue.
  Reajustement  toutes les T = 1008 fenetres, soit une semaine exactement.
             Facteur borne a 4 dans chaque sens.
  Horodatage  median-time-past sur 11 blocs, plus 2 h de tolerance future.

Usage :  python3 consensus.py         auto-tests et simulation

LIMITE A NE PAS CONFONDRE. Le reajustement asservit l'intervalle entre blocs,
pas la depense energetique. Si la puissance de calcul double, la difficulte
double et l'energie consommee double aussi. Aucune preuve de travail ne borne
l'energie : seule la recompense est bornee, par la courbe d'emission. Voir la
note finale.
"""

import hashlib, sys, os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import eonis as E

# --------------------------------------------------------------------------
# Parametres
# --------------------------------------------------------------------------
INTERVALLE_CIBLE = 600           # secondes par bloc
FENETRE = E.T                    # 1008 blocs = une semaine
DUREE_ATTENDUE = FENETRE * INTERVALLE_CIBLE      # 604 800 s
CLAMP = 4                        # facteur maximal par reajustement
CIBLE_MAX = (1 << 236) - 1       # difficulte plancher (prototype : ~20 bits)
MTP_FENETRE = 11                 # blocs pour le median-time-past
TOLERANCE_FUTUR = 2 * 3600       # 2 h


# --------------------------------------------------------------------------
# Cible compacte : mantisse 24 bits + exposant 8 bits
# --------------------------------------------------------------------------
def compacter(cible: int) -> int:
    if cible <= 0:
        raise ValueError("cible nulle")
    b = cible.bit_length()
    taille = (b + 7) // 8
    mant = cible >> (8 * (taille - 3)) if taille > 3 else cible << (8 * (3 - taille))
    if mant & 0x800000:                      # jamais de bit de signe
        mant >>= 8
        taille += 1
    return (taille << 24) | (mant & 0x7FFFFF)


def decompacter(bits: int) -> int:
    taille = bits >> 24
    mant = bits & 0x7FFFFF
    return mant >> (8 * (3 - taille)) if taille <= 3 else mant << (8 * (taille - 3))


def travail(cible: int) -> int:
    """Essais moyens necessaires. Additif d'un bloc a l'autre."""
    return (1 << 256) // (cible + 1)


def difficulte(cible: int) -> float:
    return CIBLE_MAX / cible


def satisfait(hache: bytes, cible: int) -> bool:
    return int.from_bytes(hache, "big") <= cible


# --------------------------------------------------------------------------
# Reajustement
# --------------------------------------------------------------------------
def reajuster(cible: int, duree_reelle: int) -> int:
    """Nouvelle cible apres une fenetre. Bornee a un facteur CLAMP."""
    d = max(DUREE_ATTENDUE // CLAMP, min(DUREE_ATTENDUE * CLAMP, duree_reelle))
    return min(CIBLE_MAX, max(1, cible * d // DUREE_ATTENDUE))


def cible_attendue(hauteur: int, cibles, horodatages) -> int:
    """Cible que DOIT porter le bloc de cette hauteur, deduite de l'historique.
    cibles[h] et horodatages[h] pour h < hauteur."""
    if hauteur == 0:
        return CIBLE_MAX
    precedente = cibles[hauteur - 1]
    if hauteur % FENETRE != 0:
        return precedente
    debut = hauteur - FENETRE
    return reajuster(precedente, horodatages[hauteur - 1] - horodatages[debut])


# --------------------------------------------------------------------------
# Horodatage
# --------------------------------------------------------------------------
def median_time_past(horodatages, hauteur: int) -> int:
    fen = horodatages[max(0, hauteur - MTP_FENETRE):hauteur]
    if not fen:
        return 0
    return sorted(fen)[len(fen) // 2]


def horodatage_valide(ts: int, horodatages, hauteur: int, maintenant: int) -> bool:
    """Strictement posterieur au MTP, pas plus de 2 h dans le futur.
    Le MTP empeche un mineur de reculer le temps pour baisser la difficulte ;
    la tolerance future l'empeche de l'avancer pour la baisser aussi."""
    return (ts > median_time_past(horodatages, hauteur)
            and ts <= maintenant + TOLERANCE_FUTUR)


# --------------------------------------------------------------------------
# Comparaison de branches
# --------------------------------------------------------------------------
def travail_cumule(cibles) -> int:
    return sum(travail(c) for c in cibles)


def branche_gagnante(branches):
    """branches : liste de listes de cibles. Renvoie l'index du plus lourd.
    En cas d'egalite parfaite, la premiere vue l'emporte — c'est la regle qui
    evite les oscillations."""
    meilleur, poids = 0, -1
    for i, b in enumerate(branches):
        w = travail_cumule(b)
        if w > poids:
            meilleur, poids = i, w
    return meilleur, poids


# ==========================================================================
# Auto-tests
# ==========================================================================
def tests():
    ok = 0

    # -- encodage compact ---------------------------------------------------
    for c in [CIBLE_MAX, 1 << 200, 1 << 100, (1 << 180) + 12345, 255, 1]:
        r = decompacter(compacter(c))
        assert r <= c and r > c * 0.9959, (c, r)
    print("cible compacte : aller-retour  : OK  (perte < 0,5 %, 4 octets)"); ok += 1

    # -- travail ------------------------------------------------------------
    assert travail(CIBLE_MAX // 2) > travail(CIBLE_MAX)
    assert abs(travail(CIBLE_MAX // 2) / travail(CIBLE_MAX) - 2) < 1e-6
    print("travail : double quand la cible est halvee : OK"); ok += 1

    # -- bornes du reajustement --------------------------------------------
    c = 1 << 200
    assert reajuster(c, 1) == c // CLAMP
    assert reajuster(c, 10 ** 12) == min(CIBLE_MAX, c * CLAMP)
    assert reajuster(c, DUREE_ATTENDUE) == c
    print(f"reajustement borne a x{CLAMP} dans les deux sens : OK"); ok += 1

    # -- median-time-past ---------------------------------------------------
    ts = [1000, 1005, 1002, 1010, 1008]
    assert median_time_past(ts, 5) == 1005
    assert not horodatage_valide(1004, ts, 5, 10 ** 9)     # sous le MTP
    assert horodatage_valide(1006, ts, 5, 10 ** 9)
    assert not horodatage_valide(10 ** 9 + 3 * 3600, ts, 5, 10 ** 9)  # trop loin
    print("median-time-past et tolerance future : OK"); ok += 1

    # -- branche la plus lourde, pas la plus longue -------------------------
    longue = [CIBLE_MAX] * 10                    # 10 blocs faciles
    courte = [CIBLE_MAX // 50] * 3               # 3 blocs tres durs
    i, _ = branche_gagnante([longue, courte])
    assert i == 1
    print(f"3 blocs lourds battent 10 blocs legers : OK  "
          f"({travail_cumule(courte) / travail_cumule(longue):.1f}x de travail)"); ok += 1

    # -- simulation d'asservissement ---------------------------------------
    print("\nsimulation : la puissance de calcul est multipliee par 10 "
          "a la fenetre 3")
    cible = CIBLE_MAX
    puissance = 1.0                              # essais par seconde, unite arbitraire
    ref = travail(CIBLE_MAX) / INTERVALLE_CIBLE  # puissance donnant 600 s a cible max
    t = 0
    for fen in range(8):
        if fen == 3:
            puissance *= 10
        secondes = travail(cible) / (ref * puissance)   # intervalle moyen obtenu
        duree = int(secondes * FENETRE)
        t += duree
        print(f"  fenetre {fen}  intervalle {secondes:8.1f} s   "
              f"difficulte {difficulte(cible):10.2f}")
        cible = reajuster(cible, duree)
    ecart = abs(secondes - INTERVALLE_CIBLE) / INTERVALLE_CIBLE
    assert ecart < 0.02, ecart
    print(f"  retour a {INTERVALLE_CIBLE} s a {ecart * 100:.2f} % pres apres "
          f"le choc"); ok += 1

    print(f"\n{ok} verifications passees.")
    print("\nRappel : ce module asservit l'intervalle entre blocs, pas l'energie.")
    print("A la fin de la simulation, la difficulte a ete multipliee par 10 —")
    print("donc la depense energetique aussi, pour la meme emission.")


if __name__ == "__main__":
    tests()
