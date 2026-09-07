#!/usr/bin/env python3
"""Pendule-9 — avatar voxelisé, aura graduelle de base, 8 agrégateurs, lab test (K1–K9).
Figures, pas preuves : lecture hors carnet. Bibliothèque standard, déterministe par graine.
Usage : python3 aura_voxel_lab.py
LIMITE : aura scalaire radiale seulement ; les modes s/p/d/f sont nommés dans pendule9_run.py
mais n'ont aucun effet de jeu."""
import math, json, hashlib, sys
if hasattr(sys.stdout, "reconfigure"): sys.stdout.reconfigure(encoding="utf-8")  # Windows : console cp1252

# ---------- [A] Avatar voxelisé (LIST 2, spec §13) ----------
# L'avatar N'EST PAS un objet : pas de mot, pas d'âge, pas de teinte — donc pas sa place dans
# voxels.ts, qui déconstruit un mot en occupance. Mais il ne s'invente pas une seconde convention :
# même grille cubique en x/z que VOXEL_N (12), doublée en hauteur (le corps est debout), mêmes
# entiers seulement, même indexation d'empreinte (i = x + N·(y + H·z)) que empreinteVoxels.
VOXEL_N = 12          # doit rester égal à VOXEL_N de atelier/src/lib/eidos/voxels.ts (K8bis)
GRID = (VOXEL_N, 2 * VOXEL_N, VOXEL_N)  # W, H, D — 12 × 24 × 12

# Parties modifiables sans équipement.
FACE_FEATURES = ("yeux", "nez", "bouche", "sourcils", "oreilles")

def avatar_params(seed: int, height: float = 1.0, weight: float = 1.0, face=None):
    height = min(max(height, 0.8), 1.2)
    weight = min(max(weight, 0.8), 1.3)
    rnd = int(hashlib.sha256(f"face:{seed}".encode()).hexdigest(), 16)
    face = face or {f: (rnd >> (4 * i)) & 0xF for i, f in enumerate(FACE_FEATURES)}
    return {"seed": seed, "height": height, "weight": weight, "face": face}

def voxelize(p):
    """Retourne dict partie -> set de voxels (x,y,z)."""
    W, H, D = GRID
    cx, cz = W / 2, D / 2
    hs, ws = p["height"], p["weight"]
    parts = {k: set() for k in ("tete", "visage", "torse", "bras_g", "bras_d", "jambe_g", "jambe_d")}
    def ellipsoid(part, y0, y1, rx, rz):
        for y in range(int(y0 * hs), int(y1 * hs)):
            for x in range(W):
                for z in range(D):
                    if ((x + .5 - cx) / rx) ** 2 + ((z + .5 - cz) / rz) ** 2 <= 1 and y < H:
                        parts[part].add((x, y, z))
    ellipsoid("jambe_g", 0, 9, 1.2 * ws, 1.2 * ws); parts["jambe_g"] = {(x - 2, y, z) for x, y, z in parts["jambe_g"]}
    ellipsoid("jambe_d", 0, 9, 1.2 * ws, 1.2 * ws); parts["jambe_d"] = {(x + 2, y, z) for x, y, z in parts["jambe_d"]}
    ellipsoid("torse", 9, 17, 2.6 * ws, 1.7 * ws)
    ellipsoid("bras_g", 10, 16, 1.0 * ws, 1.0 * ws); parts["bras_g"] = {(x - 4, y, z) for x, y, z in parts["bras_g"]}
    ellipsoid("bras_d", 10, 16, 1.0 * ws, 1.0 * ws); parts["bras_d"] = {(x + 4, y, z) for x, y, z in parts["bras_d"]}
    ellipsoid("tete", 17, 21, 1.9, 1.9)
    # visage : sous-masque de la tête, motif déterminé par les features (aucun équipement requis)
    f = p["face"]; ymid = int(19 * hs)
    for i, (name, v) in enumerate(f.items()):
        dx = (v % 3) - 1; dy = (v // 3) % 2
        vox = (int(cx) + dx + (i - 2), ymid + dy, int(cz) + 1)
        if vox in parts["tete"]: parts["visage"].add(vox)
    return parts

def empreinte_corps(parts):
    """Même indexation qu'empreinteVoxels (voxels.ts) : i = x + N·(y + H·z), bits en petit-boutiste,
    hex par octet. Un corps a une empreinte comme un objet, sans être un objet."""
    W, H, D = GRID
    bits = bytearray((W * H * D + 7) // 8)
    for s_ in parts.values():
        for x, y, z in s_:
            i = x + W * (y + H * z)
            bits[i >> 3] |= 1 << (i & 7)
    return bits.hex()

# ---------- [H] Aura graduelle ----------
# A(r,t) = A_res + (A0 - A_res) * exp(-(r - r_b)^2 / 2σ^2) * exp(-Γ t)
# A_res = aura résiduelle de base (plancher qui ne décroît jamais).
def aura(r, t, r_b=3.0, sigma=2.0, A0=9.0, A_res=1.0, gamma=0.1):
    return A_res + (A0 - A_res) * math.exp(-((r - r_b) ** 2) / (2 * sigma ** 2)) * math.exp(-gamma * t)

def laplacian_radial(r, t, h=1e-3):
    """∇²A en symétrie sphérique (partie radiale du laplacien) — signe négatif = puits/concentration."""
    dA = lambda x: (aura(x + h, t) - aura(x - h, t)) / (2 * h)
    return (dA(r + h) - dA(r - h)) / (2 * h) + (2 / r) * dA(r)

# ---------- [H] 8 agrégateurs pendule-9 ----------
# positions 8..1 ; paires-miroir (8,1),(7,2),(6,3),(5,4) ; 9 = axe/source.
AGG = {8: "vigueur", 7: "souffle", 6: "focus", 5: "ancrage", 4: "eclat", 3: "echo", 2: "ombre", 1: "vide"}
MIRROR = {8: 1, 1: 8, 7: 2, 2: 7, 6: 3, 3: 6, 5: 4, 4: 5}
CAP = 9

def base_aggregators():
    # Tous au max sur les attributs d'aura résiduelle de base.
    return {k: {"attr": v, "residuel": CAP, "actuel": CAP} for k, v in AGG.items()}

def transfer(aggs, src, amount):
    """Loi du 9 : ce qui quitte src passe à son miroir ; l'excédent au-delà du CAP retourne
    à la source (position 9). Invariant : somme(actuel) + source_9 = constante."""
    dst = MIRROR[src]
    amount = min(amount, aggs[src]["actuel"])
    aggs[src]["actuel"] -= amount
    room = CAP - aggs[dst]["actuel"]
    aggs[dst]["actuel"] += min(amount, room)
    aggs.setdefault("source_9", 0)
    aggs["source_9"] += max(0, amount - room)
    return aggs

def total(aggs):
    return sum(v["actuel"] for k, v in aggs.items() if k != "source_9") + aggs.get("source_9", 0)

# ---------- LAB TEST (kill criteria) ----------
def lab_test():
    R = {}
    p = avatar_params(42, 1.1, 1.2); v1 = voxelize(p); v2 = voxelize(avatar_params(42, 1.1, 1.2))
    R["K1_determinisme"] = v1 == v2
    n = lambda h, w: sum(len(s) for s in voxelize(avatar_params(1, h, w)).values())
    R["K2_monotonie_taille_poids"] = n(0.8, 1.0) < n(1.0, 1.0) < n(1.2, 1.0) and n(1.0, 0.8) < n(1.0, 1.3)
    e1, e2 = empreinte_corps(v1), empreinte_corps(voxelize(avatar_params(1, 1.0, 1.0)))
    R["K8ter_empreinte_corps"] = len(e1) == 2 * ((GRID[0] * GRID[1] * GRID[2] + 7) // 8) and e1 != e2 and \
        e1 == empreinte_corps(v2)
    R["K8bis_grille_alignee_sur_voxels_ts"] = GRID[0] == GRID[2] == VOXEL_N and GRID[1] == 2 * VOXEL_N and \
        all(0 <= c < d for s_ in v1.values() for vox in s_ for c, d in zip(vox, GRID))
    R["K3_visage_sans_equipement"] = len(v1["visage"]) > 0 and v1["visage"] <= v1["tete"]
    R["K4_plancher_residuel"] = all(aura(r, t) >= 1.0 - 1e-9 for r in (0.5, 3, 8, 30) for t in (0, 10, 1e6))
    R["K5_gradualite_radiale"] = all(aura(r, 0) > aura(r + 1, 0) for r in range(3, 20))
    # intégrale finie (analogue gaussien : ∫∫ e^{-(x²+y²)} = π) → l'aura au-dessus du plancher est bornée
    I = sum((aura(i * 0.01, 0) - 1.0) * 4 * math.pi * (i * 0.01) ** 2 * 0.01 for i in range(1, 6000))
    R["K6_integrale_finie"] = math.isfinite(I) and I < 1e5
    R["K7_laplacien_neg_au_pic"] = laplacian_radial(3.0, 0) < 0
    a = base_aggregators(); t0 = total(a); a = transfer(a, 8, 3); a = transfer(a, 1, 5)
    R["K8_loi_du_9_miroir"] = total(a) == t0 and a["source_9"] == 5  # 3 (8→1 plein) + 2 (1→8 excédent)
    R["K9_base_max"] = all(x["residuel"] == CAP for x in base_aggregators().values())
    return R, I

if __name__ == "__main__":
    R, I = lab_test()
    for k, ok in R.items(): print(("PASS " if ok else "FAIL "), k)
    print("integrale aura (au-dessus du plancher) =", round(I, 3))
    p = avatar_params(7, 1.05, 1.1); v = voxelize(p)
    print("avatar seed=7 :", {k: len(s) for k, s in v.items()})
    print("aggregateurs de base :", json.dumps(base_aggregators()))
    sys.exit(0 if all(R.values()) else 1)
