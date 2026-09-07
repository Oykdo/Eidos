# labo/ — Pendule-9 : aura, avatar voxelisé, 8 agrégateurs

Laboratoire hors chaîne. Figures, pas preuves. Bibliothèque standard.

    python3 labo/aura_voxel_lab.py    # K1–K9   avatar 16×32×16, aura graduelle, 8 agrégateurs
    python3 labo/pendule9_run.py      # K10–K18 run de 255 étages, sceau ; K27–K28 Cube et ancrage
    python3 labo/unification.py       # K19–K26 contrat avec atelier/src/lib/eidos/pendule.ts
    node --experimental-strip-types atelier/scripts/exporter-run.ts labo 0 labo   # export réel → labo/run_atelier.json

Spec, handover et décisions : docs/SPEC_AURA_PENDULE9.md. La LIST des zones non branchées :
docs/FEUILLE_DE_ROUTE.md, section « Labo pendule-9 ». CI : .github/workflows/labo.yml
(3 OS × Python 3.9/3.12, hygiène des fixtures, parité réelle atelier → labo).

L'atelier décide du parcours, le labo lit l'aura : rien ici ne touche la chaîne.
