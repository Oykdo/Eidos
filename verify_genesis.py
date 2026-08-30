#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
verify_genesis.py — verifie genesis.json sans faire confiance a personne.

Ne suppose rien : reconstruit les quatre tables d'emission a partir des seuls
parametres declares, recalcule les empreintes, refait la preuve de travail du
bloc 0, et recompte les totaux.

Usage :  python3 verify_genesis.py

Necessite eonis.py et genesis.json dans le meme dossier.
"""

import hashlib, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

try:
    import eonis as E
except ImportError:
    sys.exit("eonis.py introuvable dans le meme dossier.")


def canon(W):
    """Serialisation canonique declaree dans le fichier de genese."""
    return ("\n".join(str(x) for x in W) + "\n").encode("ascii")


def ok(label, cond, detail=""):
    print(f"{'  OK  ' if cond else ' ECHEC'}  {label}" + (f"   {detail}" if detail else ""))
    return bool(cond)


def main():
    path = os.path.join(HERE, "genesis.json")
    if not os.path.exists(path):
        sys.exit("genesis.json introuvable.")
    raw = open(path, "rb").read()
    g = json.loads(raw.decode("utf-8"))

    print(f"genesis.json  sha256 {hashlib.sha256(raw).hexdigest()}")
    print(f"              {len(raw)} octets, spec {g['spec']}\n")

    passed = failed = 0

    def check(label, cond, detail=""):
        nonlocal passed, failed
        if ok(label, cond, detail):
            passed += 1
        else:
            failed += 1

    # -- 0. le generateur est bien celui qui est declare ---------------------
    src = open(os.path.join(HERE, "eonis.py"), "rb").read()
    check("empreinte du generateur eonis.py",
          hashlib.sha256(src).hexdigest() == g["generation_des_tables"]["generateur_sha256"],
          hashlib.sha256(src).hexdigest()[:16])

    # -- 1. coherence des parametres de temps --------------------------------
    t = g["temps"]
    check("T = heures x blocs/heure",
          g["emission"]["T"] == t["heures_par_epoque"] * t["blocs_par_heure"],
          f"{t['heures_par_epoque']} x {t['blocs_par_heure']} = {g['emission']['T']}")
    check("intervalle de bloc coherent",
          t["intervalle_bloc_s"] * t["blocs_par_heure"] == 3600)

    # -- 2. les tables, reconstruites depuis zero ----------------------------
    T = g["emission"]["T"]
    total_atomes = 0
    total_blocs = 0
    for age in g["ages"]:
        W = E.build_epoch_table(age["a_eidolon"], T=T, h0=g["emission"]["h0"])
        h = hashlib.sha256(canon(W)).hexdigest()
        check(f"table {age['nom']:<8} empreinte",
              h == age["table_sha256"], h[:16])
        check(f"table {age['nom']:<8} total d'epoque exact",
              W[T] == age["a_eidolon"] * T * E.ATOMES)
        rs = [W[i + 1] - W[i] for i in range(T)]
        check(f"table {age['nom']:<8} bornes declarees",
              min(rs) == age["recompense_min_atomes"] and
              max(rs) == age["recompense_max_atomes"],
              f"{min(rs)/E.ATOMES:.4f} .. {max(rs)/E.ATOMES:.4f}")
        check(f"table {age['nom']:<8} positivite stricte", min(rs) > 0)
        check(f"table {age['nom']:<8} emission de l'age",
              W[T] * age["epoques"] == age["emission_age_atomes"])
        total_atomes += age["emission_age_atomes"]
        total_blocs += age["blocs"]

    # -- 3. continuite des ages : aucun trou, aucun recouvrement -------------
    attendu = 0
    contigu = True
    for age in g["ages"]:
        contigu &= (age["hauteur_debut"] == attendu)
        contigu &= (age["hauteur_fin"] == attendu + age["blocs"] - 1)
        attendu += age["blocs"]
    check("ages contigus, sans trou ni recouvrement", contigu)

    # -- 4. totaux -----------------------------------------------------------
    check("emission totale", total_atomes == g["emission"]["total_atomes"],
          f"{total_atomes // E.ATOMES:,} EIDOLON".replace(",", " "))
    check("nombre total de blocs", total_blocs == g["emission"]["blocs_totaux"])
    check("epoques totales", total_blocs // T == t["epoques_totales"])

    # -- 5. bloc de genese ---------------------------------------------------
    b = g["bloc_genese"]
    merkle = hashlib.sha256(b["message"].encode("utf-8")).digest()
    check("racine de Merkle = sha256(message)", merkle.hex() == b["merkle_root"])

    hdr = E.header(0, bytes(32), merkle, b["horodatage_unix"], b["nonce"])
    hsh = E.sha256d(hdr)
    check("hash du bloc 0 reproduit", hsh.hex() == b["hash"], hsh.hex()[:16])
    check("preuve de travail atteinte",
          int.from_bytes(hsh, "big") < (1 << (256 - b["bits"])),
          f"{b['bits']} bits de tete")
    check("recompense du bloc 0",
          E.reward_at(0) == b["recompense_atomes"],
          f"{b['recompense_atomes'] / E.ATOMES:.6f} EIDOLON")
    check("glyphes du bloc 0", E.encode_glyphs(hsh) == b["glyphes"])

    print(f"\n{passed} verifications passees, {failed} echec(s).")
    if failed == 0:
        print("Le fichier de genese est integre et reproductible.")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
