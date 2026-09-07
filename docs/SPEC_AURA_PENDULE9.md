# Pendule-9 roguelike — Avatar voxelisé, Aura graduelle, 8 Agrégateurs
Discipline carmeltazite : [A] axiome de design · [H] hypothèse testée en lab · [C] conjecture non testée.
Manifeste : sha256(aura_voxel_lab.py)[:16] = `84db5bb463437c65`

## 1. Avatar voxelisé [A]
- Grille 16 × 32 × 16 voxels. Parties : tête, **visage**, torse, bras G/D, jambes G/D.
- **Modifiables sans équipement** : visage (5 traits : yeux, nez, bouche, sourcils, oreilles — dérivés d'un `sha256("face:"+seed)`, donc reproductibles), **taille** (×0.8–1.2, axe y), **poids** (×0.8–1.3, rayons xz du torse et des membres). Le visage est un sous-masque de la tête, jamais un objet.
- L'équipement viendra plus tard comme couche de voxels *au-dessus* du corps ; il ne modifie jamais le visage.

## 2. Aura graduelle de base [H]
Champ scalaire radial autour du corps (r = distance à la peau) :

    A(r,t) = A_res + (A₀ − A_res) · exp(−(r − r_b)² / 2σ²) · exp(−Γt)

- Forme gaussienne (image « Gaussian integral ») → intégrale finie, l'aura ne « fuit » pas à l'infini (K6).
- Décroissance temporelle exp(−Γt) empruntée à la décohérence (ρ_AB(t) ~ ρ_AB(0)e^{−Γt}) : une aura *cohérente* s'estompe au contact de l'environnement (monstres, étages).
- **A_res = aura résiduelle de base** : plancher qui ne décroît jamais (K4). C'est ce que le joueur garde toujours, même après Cube de Saturne.
- Le laplacien radial est négatif au pic (K7) : l'aura est un puits qui *concentre* — c'est la justification du gameplay « aura = zone de contrôle ».
- [C] Formes angulaires (orbitales s/p/d/f) = modes d'aura débloqués par les Muses : s = sphérique (base), p = directionnel (charge), d = trèfle (4 lobes / 4 paires-miroir), f = complexe (endgame). Non implémenté, non testé.
- [C] Mode Lorentz : `F = q(E + v×B)` comme loi de déviation des projectiles dans l'aura d'un boss. Non testé.

## 3. Les 8 agrégateurs [H]
Positions du pendule-9 : 8,7,6,5 (aller) / 4,3,2,1 (retour) ; 9 = axe/source.

| Pos | Attribut | Miroir | Somme |
|---|---|---|---|
| 8 vigueur | 1 vide | 9 |
| 7 souffle | 2 ombre | 9 |
| 6 focus | 3 écho | 9 |
| 5 ancrage | 4 éclat | 9 |

- **État de base : les 8 agrégateurs sont au CAP (9) sur `résiduel` et sur `actuel`.** Le jeu commence *plein* ; le roguelike est une histoire de perte contrôlée, pas de montée.
- **Loi du 9** (`transfer`) : ce qui quitte un agrégateur passe à son miroir ; l'excédent au-delà du CAP retombe dans `source_9`. Invariant testé (K8) : `Σ actuel + source_9 = const`. `source_9` est la réserve que le pendule redistribue au changement de donjon.
- [C] Le Cube de Saturne restaure `actuel := résiduel` sur les 8 sans signer le sceau du pendule-9 (cohérent avec la CTC de Gödel : retour au point p sans passer par p′).

## 4. Lab test — kill criteria (tous PASS, `python3 aura_voxel_lab.py`)
K1 déterminisme · K2 monotonie taille/poids · K3 visage ⊂ tête, non vide · K4 plancher résiduel ∀r,t · K5 gradualité radiale · K6 intégrale finie · K7 ∇²A<0 au pic · K8 loi du 9 (invariant + excédent = 5) · K9 base au max.
Deux critères ont d'abord **échoué** (K3 : visage hors de l'ellipsoïde ; K8 : mauvaise formulation de la conservation) et ont été corrigés — trace conservée dans les commentaires.

Prochain kill : l'aura doit-elle rester scalaire ? Test cheap : implémenter le mode p (vecteur) et vérifier que le gameplay « zone de contrôle » survit sans que la lisibilité voxel ne s'effondre.

## 5. HANDOVER — reprise de l'état antérieur
**Où on était (mémoire projet, avant cette conversation) :**
- Roguelike autonome, séparé de KATABASIS. Chaîne de donjons générée par le cycle pendule-9 (livre-jeu), loot dépendant de la position de spawn, difficulté progressive type Azure Dreams, aucun hub (flux continu type Hades).
- Cadre : ville avec bâtiments et rencontre des Muses, devant une tour de 255 étages procéduraux (mystères, glyphes, reliques).
- Artefact « Cube de Saturne » : remonte le temps après perte du loot sans signer la fingerprint sur le sceau du pendule-9.
- Livrable attendu : GDD + spec technique implémentable.

**Ce que cette session ajoute :** §1–4 ci-dessus + `aura_voxel_lab.py` (stdlib, 9/9 PASS).

**Reprise proposée (dans l'ordre) :**
1. Brancher `base_aggregators()` sur le générateur de donjon pendule-9 : la position de spawn choisit quel agrégateur est « touché » à l'entrée.
2. Définir la redistribution de `source_9` au passage 9 → 10 → 1 (fin de cycle).
3. Décider du renderer voxel (Three.js voxel mesh vs. Python/ASCII pour le prototype) — le format `parts -> set(x,y,z)` est déjà exportable en JSON.
4. Reprendre le GDD : Muses ↔ modes orbitaux [C].

## 6. HANDOVER appliqué — `pendule9_run.py` (9/9 PASS, K10–K18)
- Étage n → position `dr(n) = 1 + (n−1) mod 9` ; tour 255 = 28 cycles + 3 (K10). Spawn = agrégateur touché, coût `1 + n//64`, loot sha256(seed, étage, pos), tier = position.
- Position 9 : `source_9` redistribué aux agrégateurs les plus bas (K15), invariant conservé sur 255 étages (K12, K17).
- Cube de Saturne : `actuel := résiduel`, sceau inchangé, usage unique (K14).
- Renderer : export JSON `avatar_seed3.json` (K16) + rendu ASCII front avec halo d'aura.
- Muses ↔ orbitales encodé en table [C] (Calliope s, Uranie p, Thalie d, Melpomène f).

**Constat de lab — hypothèse falsifiée (K18).** L'état 9/9/9/9/9/5/5/5 + source_9 = 12 après 255 étages n'est *pas* un biais de drainage : après 252 étages (28 cycles pleins) les 8 agrégateurs sont au CAP et source_9 = 0. L'asymétrie vient de la queue 255 = 28·9 + 3 (trois positions visitées au coût 4 sans passage par 9). Le balancier `pos = 9 − dr` sur les cycles impairs est conservé pour le vrai retour du pendule (il change l'ordre du loot, pas l'équilibre). Décision de design ouverte : la queue est-elle voulue (le sommet de la tour laisse l'ascension inachevée) ou faut-il un 9 final à l'étage 255 ?

**Rapport au dépôt Eidos :** ce laboratoire est parallèle à `atelier/src/lib/eidos/pendule.ts` (bandes × triplets, `docs/SPEC_PENDULE.md`). Figures, pas preuves. Unification = chantier suivant.

## 7. Unification pendule.ts ↔ labo — `labo/unification.py` (7/7 PASS, K19–K25)
**Principe :** l'atelier décide du parcours (`pendule.run()` : 27 étapes, crans p ∈ 0..8, étage e, spawn s), le labo ne fait que *lire* l'aura par-dessus. Aucune logique de parcours n'est dupliquée en Python.

Contrat d'échange (JSON, 27 étapes) : `{"i","p","e","s":{"x","y"}}` avec `s.y = p`, `run[0].e = 0`. Cran p → position pendule-9 = p+1 (1..8 agrégateur, 9 source). Coût = `1 + bande(e)//3` (même `bandeDe` que le TS, borné 1..3). Le don reste à `genreDon` ; le labo n'ajoute que `tier = position`.

Kill criteria : fixture valide (K19), déterminisme (K20), invariant (K21), source vidée à 9 (K22), équivalence des agrégateurs touchés entre le chemin racine digitale et le chemin crans (K23), refus d'un spawn incohérent (K24), coût borné (K25).

**Constat de lab :** sur la fixture synthétique, le cran 8 (source) n'est jamais atteint en 27 étapes : `source_9` monte à 18 sans redistribution. La transition de `pendule.ts` (`+1 + h%3 + tenue`, inversion sur muse impaire) ne garantit pas non plus un passage par 8. Décision ouverte : redistribuer à chaque changement de bande (tous les 3 étages) plutôt qu'au seul cran 8.

**GitHub Actions — `.github/workflows/labo.yml` :** matrice 3 OS × Python 3.9/3.12 sur K1–K25, hygiène (fixture identique au dépôt, stdlib seulement), et un job `parite-atelier` qui s'active dès qu'`atelier/scripts/exporter-run.ts` existe : export d'un vrai run TS → lecture par `unification.py`. Groupe de concurrence propre, `contents: read`, déclenché seulement sur `labo/**`.

**Chantier suivant :** `atelier/scripts/exporter-run.ts` (10 lignes : `run()` sur une graine de ville publique, `JSON.stringify` sur stdout) — le job de parité devient alors réel.
