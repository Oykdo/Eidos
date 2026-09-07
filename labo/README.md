# labo/ — Pendule-9 : aura, avatar voxelisé, 8 agrégateurs

Laboratoire hors chaîne. Figures, pas preuves. Bibliothèque standard.

    python3 labo/aura_voxel_lab.py    # K1–K9
    python3 labo/pendule9_run.py      # K10–K18 (importe aura_voxel_lab)
    python3 labo/unification.py       # K19–K26, contrat avec atelier pendule.ts
    node --experimental-strip-types atelier/scripts/exporter-run.ts labo 0 labo   # export réel → labo/run_atelier.json

Spec et handover : docs/SPEC_AURA_PENDULE9.md. Parallèle à atelier/src/lib/eidos/pendule.ts ; unification = chantier suivant.
