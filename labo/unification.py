#!/usr/bin/env python3
"""Unification pendule.ts ↔ labo : l'atelier décide du parcours, le labo lit l'aura.
Figures, pas preuves. Bibliothèque standard.

Contrat (docs/SPEC_AURA_PENDULE9.md §7) — un run exporté par atelier `pendule.run()` :
    [{"i": 0..26, "p": 0..8, "e": 0..254, "s": {"x": 0..8, "y": p}}, ...]   (27 étapes)
Cran p (Terre = 8 … Uranie = 0)  →  position pendule-9 = p + 1 (1..8 = agrégateur, 9 = source).
Coût d'une étape = 1 + bande(e) // 3, bande(e) = min(8, e·9 // 255) — même formule que bandeDe().
Le genre du don reste à pendule.ts (genreDon) ; le labo n'ajoute que le tier = position.

Usage : python3 labo/unification.py [run.json]     (sans argument : fixture synthétique)
Deux fixtures : labo/run_fixture.json est SYNTHÉTIQUE (même forme, pas tour.ts) ;
labo/run_atelier.json est un export RÉEL de atelier/scripts/exporter-run.ts (labo 0 labo),
que le job parité de .github/workflows/labo.yml régénère et compare à l'octet."""
import hashlib, json, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from aura_voxel_lab import base_aggregators, transfer, total, AGG, CAP
from pendule9_run import redistribute_source_9, seal_sign, cube_de_saturne, position, digital_root, cost as cost_dr

ETAPES, CRANS, ETAGES = 27, 9, 255

def bande_de(e): return min(8, e * 9 // ETAGES)
def cout(e): return 1 + bande_de(e) // 3

def valider_run(run):
    if len(run) != ETAPES: raise ValueError(f"{len(run)} étapes au lieu de {ETAPES}")
    for k, et in enumerate(run):
        if et["i"] != k: raise ValueError(f"i={et['i']} au lieu de {k}")
        if not 0 <= et["p"] < CRANS: raise ValueError(f"p={et['p']} hors 0..8")
        if not 0 <= et["e"] < ETAGES: raise ValueError(f"e={et['e']} hors 0..254")
        if et["s"]["y"] != et["p"]: raise ValueError(f"s.y={et['s']['y']} au lieu de p={et['p']}")
    if run[0]["e"] != 0: raise ValueError("l'étape 0 doit être l'étage 0 (Thalie)")
    return run

def appliquer_aura(run, seed):
    st = {"seed": seed, "aggs": base_aggregators(), "seal": "genesis", "log": [], "cube_used": False}
    for et in valider_run(run):
        pos, e, a = et["p"] + 1, et["e"], st["aggs"]
        if pos == 9: redistribute_source_9(a)
        else: transfer(a, pos, cout(e))
        st["seal"] = seal_sign(st["seal"], e, pos, a)
        st["log"].append({"i": et["i"], "e": e, "pos": pos, "agg": AGG.get(pos, "source"),
                          "tier": pos, "cout": 0 if pos == 9 else cout(e), "source_9": a.get("source_9", 0)})
    return st

def fixture_synthetique(seed="fixture"):
    """Même forme que pendule.run() ; transition p' = (p+1+h%3) mod 9, étages croissants par bande."""
    run, p = [], int(hashlib.sha256(f"{seed}:0".encode()).hexdigest(), 16) % CRANS
    for i in range(ETAPES):
        h = int(hashlib.sha256(f"{seed}:{i}:{p}".encode()).hexdigest(), 16)
        if i: p = (p + 1 + h % 3) % CRANS
        k = i // 3; debut = -(-k * ETAGES // 9); fin = (-(-(k + 1) * ETAGES // 9) - 1) if k < 8 else ETAGES - 1
        e = 0 if i == 0 else min(fin, debut + (p * (fin - debut + 1 - 3)) // 8 + i % 3)
        run.append({"i": i, "p": p, "e": e, "s": {"x": h % CRANS, "y": p}})
    return run

def lab_test():
    R = {}
    run = fixture_synthetique()
    R["K19_fixture_valide"] = valider_run(run) is run and run[0]["e"] == 0
    st1, st2 = appliquer_aura(run, 3), appliquer_aura(run, 3)
    R["K20_deterministe"] = st1["seal"] == st2["seal"]
    R["K21_invariant"] = total(st1["aggs"]) == total(base_aggregators())
    R["K22_source_vide_a_9"] = all(x["source_9"] == 0 for x in st1["log"] if x["pos"] == 9)
    # équivalence de sémantique : une suite de positions issue de la racine digitale, injectée comme crans,
    # touche les mêmes agrégateurs que pendule9_run.position()
    seq = [position(f) for f in range(1, 28)]
    run_dr = [{"i": i, "p": pos - 1, "e": min(254, i * 9), "s": {"x": 0, "y": pos - 1}} for i, pos in enumerate(seq)]
    run_dr[0]["e"] = 0
    st_dr = appliquer_aura(run_dr, 3)
    R["K23_equivalence_agregateurs"] = [x["agg"] for x in st_dr["log"]] == [AGG.get(p, "source") for p in seq]
    bad = json.loads(json.dumps(run)); bad[5]["s"]["y"] = (bad[5]["p"] + 1) % 9
    try: valider_run(bad); R["K24_refus_spawn_incoherent"] = False
    except ValueError: R["K24_refus_spawn_incoherent"] = True
    # K26 — export réel de l'atelier (scripts/exporter-run.ts, maitre=labo n=0 ville=labo) : lisible,
    # et le cran 8 (source) est atteint — l'hypothèse « jamais de source en 27 étapes » ne tenait
    # que sur la fixture synthétique ; sur dix runs réels, 1 à 7 passages par la source.
    ra = json.load(open(os.path.join(os.path.dirname(__file__), "run_atelier.json")))
    sta = appliquer_aura(ra, 3)
    R["K26_export_atelier_lisible_et_source_atteinte"] = any(x["pos"] == 9 for x in sta["log"]) and total(sta["aggs"]) == total(base_aggregators())
    R["K25_cout_borne"] = all(1 <= cout(e) <= 3 for e in range(ETAGES)) and cout(0) == 1 and cout(254) == 3
    return R, run, st1

if __name__ == "__main__":
    if len(sys.argv) > 1:
        st = appliquer_aura(json.load(open(sys.argv[1])), 3)
        print(json.dumps({"seal": st["seal"][:16], "aggs": {AGG[k]: st["aggs"][k]["actuel"] for k in AGG}, "source_9": st["aggs"].get("source_9", 0)}))
        sys.exit(0)
    R, run, st = lab_test()
    for k, ok in R.items(): print(("PASS " if ok else "FAIL "), k)
    json.dump(run, open(os.path.join(os.path.dirname(__file__), "run_fixture.json"), "w"), indent=0)
    print("étapes :", " ".join(f"{x['e']}:{x['agg'][:3]}" for x in st["log"]))
    print("fin :", {AGG[k]: st["aggs"][k]["actuel"] for k in AGG}, "source_9 =", st["aggs"].get("source_9", 0), "sceau", st["seal"][:16])
    sys.exit(0 if all(R.values()) else 1)
