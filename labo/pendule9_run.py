#!/usr/bin/env python3
"""Pendule-9 — laboratoire : avatar voxelisé, aura graduelle, 8 agrégateurs, run de 255 étages.
Figures, pas preuves : rien ici n'engage le carnet ni la chaîne. Bibliothèque standard.
Usage : python3 pendule9_run.py   (K10–K18, K27–K28)

HANDOVER appliqué — étapes 1→4.
1. base_aggregators() branché sur le générateur de donjon pendule-9 (spawn = agrégateur touché).
2. Redistribution de source_9 au passage 9 → 10 → 1 (fin de cycle).
3. Renderer : export JSON du voxel + rendu ASCII de contrôle (Three.js reporté).
4. GDD : Muses ↔ modes orbitaux, encodé comme table [C] non testée."""
import hashlib, json, math
from aura_voxel_lab import (avatar_params, voxelize, base_aggregators, transfer, total,
                            AGG, MIRROR, CAP, GRID, aura)

# ---------- 1. Pendule-9 → donjons ----------
def digital_root(n): return 1 + (n - 1) % 9            # 10→1, 18→9, 19→1 ...
def swing(cycle): return "aller" if cycle % 2 == 0 else "retour"   # 9→8..1 puis 9→1..8
BALANCIER = True   # cycles impairs renversés : pos = 9 − dr (8..1 puis 9) (vrai retour du pendule)
def position(floor):                                     # étage 1..255 → position 1..9
    dr = digital_root(floor)
    if BALANCIER and cycle_of(floor) % 2 == 1 and dr != 9: return 9 - dr
    return dr
def cycle_of(floor): return (floor - 1) // 9             # 0..28

def loot(seed, floor, pos):
    """Loot déterministe par (seed, étage, position). Tier = position (8 riche … 1 vide/risque)."""
    h = hashlib.sha256(f"{seed}:{floor}:{pos}".encode()).hexdigest()
    return {"tier": pos, "id": h[:12], "relique": int(h[12:14], 16) < 8, "glyphe": h[14:16]}

def cost(floor): return 1 + floor // 64                  # difficulté progressive (Azure Dreams)

def seal_sign(seal, floor, pos, aggs):
    """Sceau du pendule-9 : chaîne de hash (fingerprint de la run)."""
    payload = json.dumps([seal, floor, pos, {k: aggs[k]["actuel"] for k in AGG}], sort_keys=True)
    return hashlib.sha256(payload.encode()).hexdigest()

# ---------- 2. source_9 ----------
def redistribute_source_9(aggs):
    """À la position 9 : la réserve va aux agrégateurs les plus bas, un point à la fois, jusqu'au CAP."""
    while aggs.get("source_9", 0) > 0:
        low = min(AGG, key=lambda k: (aggs[k]["actuel"], -k))
        if aggs[low]["actuel"] >= CAP: break
        aggs[low]["actuel"] += 1; aggs["source_9"] -= 1
    return aggs

# ---------- Cube de Saturne (docs/SPEC_AURA_PENDULE9.md §8) ----------
PORTEES_CUBE = ("agregateurs",)   # tout le reste — graine, trace, tête, pièce, étapes — est hors de portée

class Rejet(ValueError): pass

def ancrer(state, id_bloc_hex, txid_hex, rang):
    """Figure de l'ancrage réel (ancrage.ts) : graine = sha256d('eidos-ascension/1' ‖ id_bloc ‖ txid ‖ rang),
    trace = empreinte des étapes seules. Les agrégateurs n'entrent JAMAIS dans la trace."""
    d = lambda b: hashlib.sha256(hashlib.sha256(b).digest()).digest()
    graine = d(b"eidos-ascension/1" + bytes.fromhex(id_bloc_hex) + bytes.fromhex(txid_hex) + rang.to_bytes(4, "big"))
    state["ancre"] = {"graine": graine.hex(), "trace": trace_de(state["log"])}
    return state

def trace_de(log):
    return hashlib.sha256(" ".join(f"{e['pos']}:{e['floor']}" for e in log).encode()).hexdigest()

def cube_de_saturne(state, portee="agregateurs"):
    """Une seule utilisation. Restaure actuel := résiduel sur les 8, SANS signer le sceau, SANS toucher
    l'ancrage : graine, trace, tête et pièce restent ce qu'elles sont. Un run libre ou ancré, même règle."""
    if portee not in PORTEES_CUBE:
        raise Rejet(f"le Cube touche {PORTEES_CUBE[0]} au lieu de {portee}")
    if state["cube_used"]: return False
    for k in AGG: state["aggs"][k]["actuel"] = state["aggs"][k]["residuel"]
    state["cube_used"] = True                            # le sceau reste identique : retour à p sans passer par p'
    if "ancre" in state: state["ancre"]["cube"] = True   # lecture exportée, jamais dans la trace
    return True

# ---------- Run ----------
def new_run(seed, height=1.0, weight=1.0):
    p = avatar_params(seed, height, weight)
    return {"seed": seed, "avatar": p, "aggs": base_aggregators(), "floor": 0,
            "seal": "genesis", "log": [], "cube_used": False}

def enter_floor(st):
    st["floor"] += 1; f = st["floor"]; pos = position(f); a = st["aggs"]
    if pos == 9:
        redistribute_source_9(a); L = {"tier": 9, "id": "source", "relique": False, "glyphe": "09"}
    else:
        transfer(a, pos, cost(f)); L = loot(st["seed"], f, pos)
    st["seal"] = seal_sign(st["seal"], f, pos, a)
    st["log"].append({"floor": f, "cycle": cycle_of(f), "swing": swing(cycle_of(f)), "pos": pos,
                      "agg": AGG.get(pos, "source"), "loot": L, "source_9": a.get("source_9", 0)})
    return st["log"][-1]

# ---------- 3. Renderer ----------
def export_voxels(parts, path):
    json.dump({"grid": GRID, "parts": {k: sorted(v) for k, v in parts.items()}}, open(path, "w"))

def ascii_front(parts, aggs):
    """Projection frontale (x,y) + halo d'aura ASCII (valeur A(r,0) quantifiée)."""
    W, H, D = GRID; body = {(x, y) for s in parts.values() for x, y, _ in s}
    face = {(x, y) for x, y, _ in parts["visage"]}
    mean = sum(aggs[k]["actuel"] for k in AGG) / 8
    rows = []
    for y in reversed(range(H)):
        row = ""
        for x in range(-6, W + 6):
            if (x, y) in face: row += "@"
            elif (x, y) in body: row += "#"
            else:
                r = min(math.hypot(x - bx, y - by) for bx, by in body) if body else 99
                a = aura(r, 0, A0=mean)
                row += ".:-=+*"[min(5, int(a))] if a > 1.05 else " "
        rows.append(row)
    return "\n".join(rows)

# AVERTISSEMENT : ce mapping étage→position (racine digitale + balancier) est une esquisse
# parallèle à atelier/src/lib/eidos/pendule.ts (bandes × triplets) ; les deux ne sont pas encore unifiés.

# ---------- 4. GDD [C] Muses ↔ modes orbitaux ----------
MUSES = [  # non testé — table de design
    {"muse": "Calliope", "mode": "s", "ℓ": 0, "effet": "aura sphérique de base"},
    {"muse": "Uranie",   "mode": "p", "ℓ": 1, "effet": "aura directionnelle (charge / projectile)"},
    {"muse": "Thalie",   "mode": "d", "ℓ": 2, "effet": "trèfle 4 lobes = 4 paires-miroir actives"},
    {"muse": "Melpomène","mode": "f", "ℓ": 3, "effet": "forme complexe, endgame (étages 192+)"},
]

# ---------- LAB TEST ----------
def lab_test():
    R = {}
    R["K10_tour_255_28_cycles"] = position(255) == 3 and cycle_of(255) == 28 and position(9) == 9 and position(10) == 8 and position(18) == 9 and position(19) == 1
    s1 = new_run(3); s2 = new_run(3)
    for _ in range(40): enter_floor(s1); enter_floor(s2)
    R["K11_run_deterministe"] = s1["seal"] == s2["seal"] and s1["log"] == s2["log"]
    R["K12_invariant_source_9"] = total(s1["aggs"]) == total(new_run(3)["aggs"])
    R["K13_pas_de_negatif"] = all(0 <= s1["aggs"][k]["actuel"] <= CAP for k in AGG)
    seal_before = s1["seal"]; ok = cube_de_saturne(s1)
    R["K14_cube_restaure_sans_signer"] = ok and s1["seal"] == seal_before and all(
        s1["aggs"][k]["actuel"] == CAP for k in AGG) and not cube_de_saturne(s1)
    R["K15_source_9_vidée_à_9"] = all(e["source_9"] == 0 for e in s1["log"] if e["pos"] == 9)
    parts = voxelize(s1["avatar"]); export_voxels(parts, "avatar_seed3.json")
    back = json.load(open("avatar_seed3.json"))
    R["K16_export_json_roundtrip"] = {k: set(map(tuple, v)) for k, v in back["parts"].items()} == parts
    s3 = new_run(3)
    for _ in range(255): enter_floor(s3)
    R["K17_255_etages_sans_crash"] = s3["floor"] == 255 and total(s3["aggs"]) == total(new_run(3)["aggs"])
    # K18 — hypothèse « biais de drainage » FALSIFIÉE : l'asymétrie finale vient de la queue
    # (255 = 28·9 + 3), pas de l'ordre de visite. Après 252 étages tout est plein et source_9 = 0.
    s4 = new_run(3)
    for _ in range(252): enter_floor(s4)
    plein = all(s4["aggs"][k]["actuel"] == CAP for k in AGG) and s4["aggs"].get("source_9", 0) == 0
    R["K18_queue_explique_asymetrie"] = plein and s3["aggs"]["source_9"] == 3 * cost(255)
    # K27/K28 — le Cube et l'ancrage (§8) : sur un run ancré, le Cube restaure les 8 mais graine et
    # trace ne bougent pas ; viser autre chose que les agrégateurs est refusé.
    s5 = new_run(3)
    for _ in range(27): enter_floor(s5)
    ancrer(s5, "00" * 32, "11" * 32, 0); g, t = s5["ancre"]["graine"], s5["ancre"]["trace"]
    cube_de_saturne(s5)
    R["K27_cube_sans_toucher_ancrage"] = (s5["ancre"]["graine"], s5["ancre"]["trace"]) == (g, t) and \
        trace_de(s5["log"]) == t and s5["ancre"].get("cube") is True and all(s5["aggs"][k]["actuel"] == CAP for k in AGG)
    try: cube_de_saturne(new_run(3), portee="graine"); R["K28_cube_hors_portee_refuse"] = False
    except Rejet: R["K28_cube_hors_portee_refuse"] = True
    return R, s1, parts, s3

if __name__ == "__main__":
    R, s1, parts, s3 = lab_test()
    for k, ok in R.items(): print(("PASS " if ok else "FAIL "), k)
    print("\n--- 12 premiers étages (seed 3) ---")
    for e in s1["log"][:12]:
        print(f"étage {e['floor']:>3} cycle {e['cycle']} {e['swing']:<6} pos {e['pos']} {e['agg']:<8} "
              f"loot t{e['loot']['tier']} {e['loot']['id']} relique={e['loot']['relique']} src9={e['source_9']}")
    print("\nagrégateurs après 255 étages :", {AGG[k]: s3["aggs"][k]["actuel"] for k in AGG}, "source_9 =", s3["aggs"].get("source_9"))
    print("sceau final :", s3["seal"][:16])
    print("\n--- rendu ASCII (seed 3, après Cube) ---")
    print(ascii_front(parts, s1["aggs"]))
    print("\nMuses [C] :", json.dumps(MUSES, ensure_ascii=False))
