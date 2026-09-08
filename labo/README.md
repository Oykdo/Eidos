# labo/ — Pendule-9 : aura, avatar voxelisé, 8 agrégateurs

Laboratoire hors chaîne. Figures, pas preuves. Bibliothèque standard.

    python3 labo/aura_voxel_lab.py    # K1–K9   avatar 16×32×16, aura graduelle, 8 agrégateurs
    python3 labo/pendule9_run.py      # K11–K17 Tour libre sur le run de l'atelier ; K27–K28 Cube ; K37–K38 muses
    python3 labo/unification.py       # K19–K26 contrat avec atelier/src/lib/eidos/pendule.ts
    python3 labo/aura_veillee.py      # K29–K36 aura d'une veillée : fixture du bot et veillée vraiment jouée
    python3 labo/coffre_horaire.py    # K39–K47 coffre horaire : tirage sur chaine-eidos.dat × etat.json (docs/SPEC_COFFRE_HORAIRE.md)
    node --experimental-strip-types atelier/scripts/exporter-run.ts labo 0 labo   # export réel → labo/run_atelier.json
    node --experimental-strip-types atelier/scripts/exporter-veillee.ts 7         # veillée du bot → labo/veillee_atelier.json
    node --experimental-strip-types atelier/scripts/exporter-veillee.ts --depuis <carnet|veillée exportée>

Spec, handover et décisions : docs/SPEC_AURA_PENDULE9.md. La LIST des zones non branchées :
docs/FEUILLE_DE_ROUTE.md, section « Labo pendule-9 ». CI : .github/workflows/labo.yml
(3 OS × Python 3.9/3.12, hygiène des fixtures, parité réelle atelier → labo).

L'atelier décide du parcours, le labo lit l'aura : rien ici ne touche la chaîne.
