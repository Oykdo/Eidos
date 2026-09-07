#!/usr/bin/env python3
"""Pendule-9 — la Tour libre : agrégateurs, sceau, Cube de Saturne, muses (spec §8, §12, §14).
Figures, pas preuves : rien ici n'engage le carnet ni la chaîne. Bibliothèque standard.
Usage : python3 pendule9_run.py   (K11–K17, K27–K28, K37–K38)

Un run est une suite d'étapes VENUES DE L'ATELIER (labo/run_atelier.json, exporté par
atelier/scripts/exporter-run.ts). Le mapping « racine digitale + balancier » qui vivait ici —
255 étages parcourus un par un, cycles de 9, balancier sur les cycles impairs — a été RETIRÉ
(LIST 7) : il contredisait pendule.ts, où un run fait 27 étapes réparties sur 255 étages en
neuf bandes de triplets. Ce qui reste est ce qui n'était pas dans ce mapping : la loi du 9,
la réserve de la source, le sceau, le Cube et sa portée, la table des muses.

LIMITE : ces mécaniques sont celles de la Tour LIBRE. Sur une veillée, l'aura est une lecture
des 64 feuilles et ni le Cube ni le transfert n'ont de prise (labo/aura_veillee.py, spec §9)."""
import hashlib, json, math, sys, os
if hasattr(sys.stdout, "reconfigure"): sys.stdout.reconfigure(encoding="utf-8")  # Windows : console cp1252
from aura_voxel_lab import (avatar_params, voxelize, base_aggregators, transfer, total,
                            AGG, MIRROR, CAP, GRID, aura)

# ---------- 1. Un run vient de l'atelier ----------
def etapes_atelier(chemin=None):
    """Les 27 étapes exportées par atelier/scripts/exporter-run.ts (i, p, e, s, q)."""
    chemin = chemin or os.path.join(os.path.dirname(os.path.abspath(__file__)), "run_atelier.json")
    return json.load(open(chemin, encoding="utf-8"))

def bande_de(e): return min(8, e * 9 // 255)             # même formule que bandeDe (pendule.ts)
def cost(e): return 1 + bande_de(e) // 3                 # difficulté par bande, bornée 1..3

def loot(seed, e, pos):
    """Loot déterministe par (graine, étage, position). La quantité est celle de l'atelier
    (quantiteDon = p + 1 = pos, spec §10) ; le genre reste à genreDon, hors labo."""
    h = hashlib.sha256(f"{seed}:{e}:{pos}".encode()).hexdigest()
    return {"tier": pos, "id": h[:12], "relique": int(h[12:14], 16) < 8, "glyphe": h[14:16]}

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
def new_run(seed, height=1.0, weight=1.0, etapes=None):
    p = avatar_params(seed, height, weight)
    return {"seed": seed, "avatar": p, "aggs": base_aggregators(), "etapes": etapes or etapes_atelier(),
            "i": 0, "seal": "genesis", "log": [], "cube_used": False}

def enter_floor(st):
    """Une étape de plus, prise dans le run de l'atelier. Rend None quand le run est fini."""
    if st["i"] >= len(st["etapes"]): return None
    et = st["etapes"][st["i"]]; st["i"] += 1
    pos = et["p"] + 1; e = et["e"]; a = st["aggs"]
    if pos == 9:
        redistribute_source_9(a); L = {"tier": 9, "id": "source", "relique": False, "glyphe": "09"}
    else:
        transfer(a, pos, cost(e)); L = loot(st["seed"], e, pos)
    st["seal"] = seal_sign(st["seal"], e, pos, a)
    st["log"].append({"i": et["i"], "floor": e, "bande": bande_de(e), "pos": pos,
                      "agg": AGG.get(pos, "source"), "loot": L, "source_9": a.get("source_9", 0)})
    return st["log"][-1]

def jouer(st):
    """Le run entier."""
    while enter_floor(st) is not None: pass
    return st

# ---------- 3. Renderer ----------
def export_voxels(parts, path):
    json.dump({"grid": GRID, "parts": {k: sorted(v) for k, v in parts.items()}}, open(path, "w", encoding="utf-8"))

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

# ---------- 4. Muses ↔ modes d'aura (LIST 4, spec §12) ----------
# La table inventée (Calliope=s, Uranie=p, Thalie=d, Melpomène=f) était FAUSSE : ces muses ne
# tiennent pas ces rangs dans signatures.ts. Le labo ne recopie plus les muses, il relit
# labo/muses.json (exporté par atelier/scripts/exporter-signatures.ts, source signatures.ts).
# Le mode se déduit du rang de bande, il ne s'invente pas :
#     ℓ = (8 − rang) · 4 // 9   →  Thalie/Clio/Calliope : s ; Terpsichore/Melpomène : p ;
#                                  Érato/Euterpe : d ; Polymnie/Uranie : f   (3 + 2 + 2 + 2 = 9)
# Descente d'Uranie (rang 0, sommet, forme la plus complexe) à Thalie (rang 8, la ville, sphérique).
MODES = ("s", "p", "d", "f")

def muses():
    return json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "muses.json"), encoding="utf-8"))

def mode_de_rang(rang):
    return MODES[min(len(MODES) - 1, ((8 - rang) * len(MODES)) // 9)]

def mode_de_bande(m):
    return {x["bande"]: mode_de_rang(x["rang"]) for x in m}

# ---------- LAB TEST ----------
def lab_test():
    R = {}
    s1, s2 = jouer(new_run(3)), jouer(new_run(3))
    R["K11_run_deterministe"] = s1["seal"] == s2["seal"] and s1["log"] == s2["log"]
    R["K12_invariant_source_9"] = total(s1["aggs"]) == total(new_run(3)["aggs"])
    R["K13_pas_de_negatif"] = all(0 <= s1["aggs"][k]["actuel"] <= CAP for k in AGG)
    seal_before = s1["seal"]; ok = cube_de_saturne(s1)
    R["K14_cube_restaure_sans_signer"] = ok and s1["seal"] == seal_before and all(
        s1["aggs"][k]["actuel"] == CAP for k in AGG) and not cube_de_saturne(s1)
    R["K15_source_9_vidée_à_9"] = all(e["source_9"] == 0 for e in s1["log"] if e["pos"] == 9)
    chemin = os.path.join(os.path.dirname(os.path.abspath(__file__)), "avatar_seed3.json")
    parts = voxelize(s1["avatar"]); export_voxels(parts, chemin)
    back = json.load(open(chemin))
    R["K16_export_json_roundtrip"] = {k: set(map(tuple, v)) for k, v in back["parts"].items()} == parts
    # K17 — le run suit l'atelier, jamais un compteur d'étages du labo : 27 étapes, coût par bande.
    s3 = jouer(new_run(3))
    R["K17_run_de_latelier"] = len(s3["log"]) == len(s3["etapes"]) == 27 and \
        [x["floor"] for x in s3["log"]] == [et["e"] for et in s3["etapes"]] and \
        all(1 <= cost(x["floor"]) <= 3 for x in s3["log"]) and s3["log"][0]["floor"] == 0
    # K37/K38 — LIST 4 : la table des muses vient de l'atelier, jamais du labo ; le mode se déduit
    # du rang, du plus simple (Thalie, la ville) au plus complexe (Uranie, le sommet).
    m = muses()
    R["K37_muses_de_latelier"] = len(m) == 9 and [x["bande"] for x in m] == list(range(9)) and \
        sorted(x["rang"] for x in m) == list(range(9)) and m[0]["muse"] == "Thalie" and m[8]["muse"] == "Uranie"
    modes = [mode_de_rang(x["rang"]) for x in m]
    R["K38_modes_monotones"] = modes[0] == "s" and modes[8] == "f" and set(modes) == set(MODES) and \
        [MODES.index(x) for x in modes] == sorted(MODES.index(x) for x in modes)
    # K27/K28 — le Cube et l'ancrage (§8) : sur un run ancré, le Cube restaure les 8 mais graine et
    # trace ne bougent pas ; viser autre chose que les agrégateurs est refusé.
    s5 = jouer(new_run(3))
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
    print("\n--- 12 premières étapes du run de l'atelier (graine 3) ---")
    for e in s1["log"][:12]:
        print(f"étape {e['i']:>2} étage {e['floor']:>3} bande {e['bande']} pos {e['pos']} {e['agg']:<8} "
              f"loot t{e['loot']['tier']} {e['loot']['id']} relique={e['loot']['relique']} src9={e['source_9']}")
    print("\nagrégateurs après le run :", {AGG[k]: s3["aggs"][k]["actuel"] for k in AGG}, "source_9 =", s3["aggs"].get("source_9"))
    print("sceau final :", s3["seal"][:16])
    print("\n--- rendu ASCII (seed 3, après Cube) ---")
    print(ascii_front(parts, s1["aggs"]))
    m = muses()
    print("\nMuses ↔ modes :", " ".join(f"{x['muse']}:{mode_de_rang(x['rang'])}" for x in m))
