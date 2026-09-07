#!/usr/bin/env python3
"""Aura d'une veillée — une LECTURE de la jauge, jamais un second budget (docs/SPEC_AURA_PENDULE9.md §9).
Figures, pas preuves. Bibliothèque standard.

La Veillée a un seul compte qui ne remonte jamais : 64 feuilles WOTS+ (hauteur 6), un geste = une
feuille. 64 = 8 × 8 : l'aura projette ce budget sur les 8 positions du pendule — chaque agrégateur
« porte » 8 feuilles. Un geste signé à l'étape k brûle une feuille de l'agrégateur de la position
p(k)+1 (parcours rejoué par pendule.ts) ; à la position 9 (source), la feuille va au débordement.

    aura_k      = 8 − min(8, brûlées_k)         jamais croissante, jamais restaurée
    débordement = Σ max(0, brûlées_k − 8) + brûlées à la source
    Σ brûlées   = feuilles signées ≤ 64          identité comptable (K29)

Le transfert-miroir (loi du 9) et le Cube de Saturne sont des mécaniques de la Tour libre ; sur une
veillée ils n'ont pas de prise (K31) : les feuilles ne reviennent pas.

Usage : python3 labo/aura_veillee.py [veillee.json]     (sans argument : fixture réelle labo/veillee_atelier.json)
Fixture : export de atelier/scripts/exporter-veillee.ts (bot « gourmand », graine 7, jour du vecteur)."""
import json, os, sys
if hasattr(sys.stdout, "reconfigure"): sys.stdout.reconfigure(encoding="utf-8")  # Windows : console cp1252
sys.path.insert(0, os.path.dirname(__file__))
from aura_voxel_lab import AGG
from pendule9_run import Rejet

FEUILLES, PAR_AGG, ETAPES, GESTES = 64, 8, 27, ("franchir", "parler", "ouvrir", "prendre")

def valider_veillee(v):
    if v["hauteur"] != 6: raise ValueError(f"hauteur {v['hauteur']} au lieu de 6")
    if len(v["gestes"]) > FEUILLES: raise ValueError(f"{len(v['gestes'])} gestes au lieu de ≤ {FEUILLES}")
    if len(v["parcours"]) > ETAPES or v["parcours"][0]["e"] != 0: raise ValueError("parcours hors forme")
    for k, g in enumerate(v["gestes"]):
        if g["i"] != k: raise ValueError(f"indice {g['i']} au lieu de {k} : une feuille, un geste, sans trou")
        if g["g"] not in GESTES: raise ValueError(f"geste {g['g']} inconnu")
        if not 0 <= g["etape"] < len(v["parcours"]): raise ValueError(f"étape {g['etape']} hors parcours")
    return v

def lecture(v, jusqu_a=None):
    """L'aura après les `jusqu_a` premiers gestes (tous par défaut)."""
    valider_veillee(v)
    brulees = {k: 0 for k in AGG}; source = 0
    for g in v["gestes"][: jusqu_a if jusqu_a is not None else len(v["gestes"])]:
        pos = v["parcours"][g["etape"]]["p"] + 1
        if pos == 9: source += 1
        else: brulees[pos] += 1
    aura = {k: PAR_AGG - min(PAR_AGG, brulees[k]) for k in AGG}
    debordement = sum(max(0, brulees[k] - PAR_AGG) for k in AGG) + source
    return {"aura": aura, "brulees": brulees, "source": source, "debordement": debordement,
            "feuilles": sum(brulees.values()) + source, "restantes": FEUILLES - len(v["gestes"]), "fin": v["fin"]}

def cube_de_saturne_sur_veillee(v):
    raise Rejet("le Cube touche la Tour libre au lieu d'une veillée : les feuilles ne reviennent pas")

def lab_test(v):
    R = {}
    L = lecture(v)
    R["K29_identite_comptable"] = L["feuilles"] == len(v["gestes"]) <= FEUILLES and \
        sum(PAR_AGG - L["aura"][k] for k in AGG) + L["debordement"] == L["feuilles"]
    suites = [lecture(v, n)["aura"] for n in range(len(v["gestes"]) + 1)]
    R["K30_jamais_croissante"] = all(all(b[k] <= a[k] for k in AGG) for a, b in zip(suites, suites[1:]))
    try: cube_de_saturne_sur_veillee(v); R["K31_cube_sans_prise"] = False
    except Rejet: R["K31_cube_sans_prise"] = True
    R["K32_franchir_un_par_etape"] = all(sum(1 for g in v["gestes"] if g["g"] == "franchir" and g["etape"] == e) <= 1 for e in range(ETAPES))
    bad = json.loads(json.dumps(v)); bad["gestes"][3]["i"] = 7
    try: valider_veillee(bad); R["K33_refus_trou_dindice"] = False
    except ValueError: R["K33_refus_trou_dindice"] = True
    R["K34_fixture_reelle_au_sommet"] = v["fin"] == "sommet" and len(v["parcours"]) == ETAPES and L["restantes"] == FEUILLES - len(v["gestes"])
    return R, L

if __name__ == "__main__":
    chemin = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "veillee_atelier.json")
    v = json.load(open(chemin, encoding="utf-8"))
    R, L = lab_test(v)
    for k, ok in R.items(): print(("PASS " if ok else "FAIL "), k)
    print("aura :", {AGG[k]: L["aura"][k] for k in AGG}, "| débordement", L["debordement"], "| feuilles", L["feuilles"], "/ 64 | fin", L["fin"])
    sys.exit(0 if all(R.values()) else 1)
