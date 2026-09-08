#!/usr/bin/env python3
"""Coffre horaire — un coffre par bloc, réclamé avec une pièce (docs/SPEC_COFFRE_HORAIRE.md).
Figures, pas preuves : rien n'est écrit sur la chaîne ; un coffre se juge hors ligne comme une
ascension. Bibliothèque standard. Rejoue le tirage sur les VRAIES têtes du testnet.

    graine  = sha256d("eidos-coffre/1" ‖ id_bloc(32) ‖ txid(32) ‖ rang(4, gros-boutiste))
    tier    = 1 + zéros de tête du premier octet de la graine       ∈ 1..9
              P(tier = t) = 2^−t pour t = 1..8, P(tier = 9) = 2^−8   (somme = 1, exactement)
    objets  = tier objets ; l'objet j part de h_j = sha256d(graine ‖ j(1)) et d'un âge par tier
              (1–3 Kali, 4–5 Dvâpara, 6–7 Trétâ, 8–9 Satya). Le labo s'arrête là : un objet est
              un ObjetPorte (mot, archétype, genre, emplacement), dérivé côté atelier par
              objetDepuisGraine + habille, comme un tirage de bloc. Le labo n'a pas de mots.
    règle   = une pièce, un bloc, un coffre ; le sac a 27 places, le surplus est perdu.

Usage : python3 labo/coffre_horaire.py           (rejoue chaine-eidos.dat × etat.json.sorties)
        python3 labo/coffre_horaire.py --vecteurs  (écrit labo/coffre_vecteurs.json pour le port TS)
MESURE DE LA RAFALE (spec §5) : `rafale()` compte ce qu'une pièce neuve récolte en réclamant
d'un coup tous les blocs passés, et le compare à une fenêtre d'un jour (24 blocs). C'est cette
mesure qui décide d'adopter la fenêtre ou non — voir la conclusion imprimée par ce module.

LIMITE : le juge hors ligne d'un claim (tête XMSS + pièce Merkle contre utxo_root_h) est celui de
l'ascension (ancrage.ts) ; ici on ne rejoue que le tirage. Une pièce peut réclamer les blocs passés
d'un coup : seule la taille du sac borne cette rafale — limite assumée, voir spec §4."""
import hashlib, json, os, sys
if hasattr(sys.stdout, "reconfigure"): sys.stdout.reconfigure(encoding="utf-8")
ICI = os.path.dirname(os.path.abspath(__file__)); RACINE = os.path.dirname(ICI)
sys.path.insert(0, RACINE); sys.path.insert(0, ICI)

TAG = b"eidos-coffre/1"
AGES = ("Kali", "Kali", "Kali", "Dvapara", "Dvapara", "Treta", "Treta", "Satya", "Satya")
SAC_PLACES, TIERS = 27, 9
PROBA = [2 ** -t for t in range(1, 9)] + [2 ** -8]

def sha256d(b): return hashlib.sha256(hashlib.sha256(b).digest()).digest()

def graine_coffre(id_bloc_hex, txid_hex, rang):
    return sha256d(TAG + bytes.fromhex(id_bloc_hex) + bytes.fromhex(txid_hex) + int(rang).to_bytes(4, "big"))

def tier_de(graine):
    b = graine[0]
    return 1 + (8 if b == 0 else 8 - b.bit_length())

def coffre(id_bloc_hex, txid_hex, rang):
    g = graine_coffre(id_bloc_hex, txid_hex, rang); t = tier_de(g)
    # une graine par objet ; l'objet lui-meme est derive cote atelier (voir en-tete)
    objets = [{"graine": sha256d(g + bytes([j])).hex(), "age": AGES[t - 1]} for j in range(t)]
    return {"graine": g.hex(), "tier": t, "objets": objets}

class Rejet(ValueError): pass

def reclamer(sac, deja, id_bloc_hex, txid_hex, rang):
    """Un claim : refuse la seconde fois pour la même (pièce, bloc) ; remplit le sac, perd le surplus."""
    cle = (txid_hex, int(rang), id_bloc_hex)
    if cle in deja: raise Rejet(f"coffre déjà réclamé pour {txid_hex[:8]}:{rang} au bloc {id_bloc_hex[:8]}")
    deja.add(cle)
    c = coffre(id_bloc_hex, txid_hex, rang)
    place = SAC_PLACES - len(sac); perdus = max(0, len(c["objets"]) - place)
    sac.extend(c["objets"][:place])
    return c, perdus

# ---------- les têtes et les pièces réelles ----------
def tetes_reelles():
    import noeud as N, federation as F
    c, fed = N.config(); buf = open(os.path.join(RACINE, "chaine-eidos.dat"), "rb").read()
    ch = F.ChaineFederee(fed); i = 10; out = []
    while i < len(buf):
        blk, i = N.deser_bloc(buf, i)
        out.append({"hauteur": blk["height"], "id_bloc": ch.id_bloc(blk).hex(), "ts": blk["ts"]})
    return out

def pieces_reelles():
    e = json.load(open(os.path.join(RACINE, "etat.json"), encoding="utf-8"))
    return [{"txid": k.split(":")[0], "rang": int(k.split(":")[1]), **v} for k, v in e["sorties"].items()]

FENETRE_JOUR = 24   # blocs : un coffre de hauteur h ne se réclamerait qu'avec une tête ≤ h + 23

def rafale(tetes, txid, rang=0, fenetre=None):
    """Ce qu'une pièce récolte en réclamant les blocs passés d'un coup. `fenetre` = None : tout
    l'historique ; sinon les `fenetre` derniers blocs. Le sac (27) borne toujours la prise."""
    choisies = tetes if fenetre is None else tetes[-fenetre:]
    tires = [coffre(t["id_bloc"], txid, rang)["tier"] for t in choisies]
    offerts = sum(tires)
    return {"blocs": len(choisies), "offerts": offerts, "pris": min(offerts, SAC_PLACES),
            "perdus": max(0, offerts - SAC_PLACES), "meilleur": max(tires) if tires else 0}

# ---------- LAB TEST ----------
def lab_test(tetes, pieces):
    R = {}; n = 0; comptes = [0] * TIERS; deja = set()
    for t in tetes:
        for p in pieces:
            c = coffre(t["id_bloc"], p["txid"], p["rang"]); comptes[c["tier"] - 1] += 1; n += 1
    R["K39_tier_borne"] = all(1 <= tier_de(bytes([b]) + b"\0" * 31) <= 9 for b in range(256)) and \
        [tier_de(bytes([b]) + b"\0" * 31) for b in (255, 128, 127, 64, 1, 0)] == [1, 1, 2, 2, 8, 9]
    R["K40_probas_somment_a_1"] = abs(sum(PROBA) - 1) < 1e-15 and \
        all(abs(sum(1 for b in range(256) if tier_de(bytes([b]) + b"\0" * 31) == t) / 256 - PROBA[t - 1]) < 1e-15 for t in range(1, 10))
    # sur les claims réels : chaque tier observé dans ±4σ de l'attendu (binomiale), tiers 1..3 seulement (les autres trop rares)
    def ok(t): 
        mu = n * PROBA[t - 1]; sig = (mu * (1 - PROBA[t - 1])) ** 0.5
        return abs(comptes[t - 1] - mu) <= 4 * sig + 1
    R["K41_distribution_reelle_plausible"] = n >= 100 and all(ok(t) for t in (1, 2, 3))
    R["K42_deterministe"] = coffre(tetes[0]["id_bloc"], pieces[0]["txid"], pieces[0]["rang"]) == \
        coffre(tetes[0]["id_bloc"], pieces[0]["txid"], pieces[0]["rang"])
    sac = []; deja = set()
    c, _ = reclamer(sac, deja, tetes[0]["id_bloc"], pieces[0]["txid"], pieces[0]["rang"])
    try: reclamer(sac, deja, tetes[0]["id_bloc"], pieces[0]["txid"], pieces[0]["rang"]); R["K43_une_piece_un_bloc"] = False
    except Rejet: R["K43_une_piece_un_bloc"] = True
    sac = []; deja = set(); perdus = 0
    for t in tetes: perdus += reclamer(sac, deja, t["id_bloc"], pieces[0]["txid"], pieces[0]["rang"])[1]
    R["K44_sac_borne_27"] = len(sac) <= SAC_PLACES and perdus == max(0, sum(coffre(t["id_bloc"], pieces[0]["txid"], pieces[0]["rang"])["tier"] for t in tetes) - SAC_PLACES)
    R["K45_objets_egal_tier"] = all(len(coffre(t["id_bloc"], p["txid"], p["rang"])["objets"]) == coffre(t["id_bloc"], p["txid"], p["rang"])["tier"] for t in tetes[:3] for p in pieces[:3])
    # K47 — la rafale rétroactive : mesurée, pas supposée. Le sac plafonne la prise à 27 dans les
    # deux cas dès que l'historique dépasse ~14 blocs ; la fenêtre d'un jour ne change donc RIEN
    # à ce qu'une pièce neuve emporte. Elle n'est pas adoptée (spec §5).
    r_tout = [rafale(tetes, p["txid"], p["rang"]) for p in pieces]
    r_jour = [rafale(tetes, p["txid"], p["rang"], FENETRE_JOUR) for p in pieces]
    R["K47_fenetre_sans_effet_sur_la_prise"] = len(tetes) > FENETRE_JOUR and \
        all(a["pris"] == b["pris"] == SAC_PLACES for a, b in zip(r_tout, r_jour))
    R["K46_tetes_reelles_heure_par_heure"] = len(tetes) >= 2 and all(b["ts"] - a["ts"] >= 3600 and b["hauteur"] == a["hauteur"] + 1 for a, b in zip(tetes, tetes[1:]))
    return R, n, comptes

if __name__ == "__main__":
    tetes, pieces = tetes_reelles(), pieces_reelles()
    if "--vecteurs" in sys.argv:
        vec = [{"id_bloc": t["id_bloc"], "txid": p["txid"], "rang": p["rang"], **coffre(t["id_bloc"], p["txid"], p["rang"])}
               for t in tetes[:3] for p in pieces[:3]]
        json.dump(vec, open(os.path.join(ICI, "coffre_vecteurs.json"), "w", encoding="utf-8", newline="\n"), indent=0)
        print("labo/coffre_vecteurs.json :", len(vec), "vecteurs"); sys.exit(0)
    R, n, comptes = lab_test(tetes, pieces)
    for k, ok in R.items(): print(("PASS " if ok else "FAIL "), k)
    print(f"{len(tetes)} têtes réelles × {len(pieces)} pièces = {n} coffres ; tiers 1..9 :", comptes,
          "| attendus :", [round(n * p, 1) for p in PROBA])
    a = rafale(tetes, pieces[0]["txid"], pieces[0]["rang"])
    b = rafale(tetes, pieces[0]["txid"], pieces[0]["rang"], FENETRE_JOUR)
    print(f"rafale d'une pièce neuve — tout l'historique ({a['blocs']} blocs) : {a['offerts']} objets offerts, "
          f"{a['pris']} pris, {a['perdus']} perdus ; fenêtre d'un jour ({b['blocs']} blocs) : "
          f"{b['offerts']} offerts, {b['pris']} pris. Le sac plafonne les deux : la fenêtre ne change rien.")
    sys.exit(0 if all(R.values()) else 1)
