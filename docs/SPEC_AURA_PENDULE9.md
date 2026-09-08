# Pendule-9 roguelike — Avatar voxelisé, Aura graduelle, 8 Agrégateurs
Discipline carmeltazite : [A] axiome de design · [H] hypothèse testée en lab · [C] conjecture non testée.
Manifeste : sha256(aura_voxel_lab.py)[:16] = `556146bf1e76f8ee` (2026-09-08 ; `84db5bb463437c65` à la première session)

## 1. Avatar voxelisé [A]
- Grille 12 × 24 × 12 voxels depuis §13 (16 × 32 × 16 à la première session). Parties : tête, **visage**, torse, bras G/D, jambes G/D.
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

**Constat de lab — hypothèse falsifiée (K26).** Sur la fixture synthétique le cran 8 (source) n'était jamais atteint et `source_9` montait à 18 ; sur l'export réel de `pendule.ts` (tenue, inversion par muse), la source est atteinte 1 à 7 fois sur 27 étapes, sur dix runs. La redistribution reste au cran 8 ; l'idée « redistribuer par bande » est abandonnée.

**GitHub Actions — `.github/workflows/labo.yml` :** matrice 3 OS × Python 3.9/3.12 sur K1–K25, hygiène (fixture identique au dépôt, stdlib seulement), et un job `parite-atelier` qui s'active dès qu'`atelier/scripts/exporter-run.ts` existe : export d'un vrai run TS → lecture par `unification.py`. Groupe de concurrence propre, `contents: read`, déclenché seulement sur `labo/**`.

**Pont réel :** `atelier/scripts/exporter-run.ts` (`node --experimental-strip-types`, args maitre n ville, choix fixes, portMot 0) ; fixture réelle `labo/run_atelier.json`, comparée à l'octet dans le job `parite-atelier`. La LIST des zones non branchées est dans `docs/FEUILLE_DE_ROUTE.md`.

## 8. Cube de Saturne et ancrage — ce que le Cube peut toucher (K27–K28)
Règle du dépôt : *ce qui compte est ancré, ce qui est libre ne vaut rien* (`ancrage.ts`). Un run ancré a pour graine `sha256d("eidos-ascension/1" ‖ id_bloc ‖ txid ‖ rang)` et pour trace `traceDe(étapes)` — une empreinte des seules étapes `(p, e, s)`. **Les 8 agrégateurs, l'aura et le Cube n'entrent pas dans la trace.** C'est ce qui rend le Cube compatible avec l'invariant sans rien lui coûter.

Décision :
- Le Cube restaure `actuel := résiduel` sur les 8 agrégateurs. C'est sa seule portée (`PORTEES_CUBE`). Une seule utilisation par run.
- Il ne touche **jamais** la graine, la trace, la tête signée, la pièce, ni une étape déjà jouée : « remonter le temps » = revenir à l'aura d'avant la perte, pas rejouer un étage. Viser autre chose lève `Rejet` (K28).
- Sur un run ancré, graine et trace sont identiques avant et après le Cube (K27) ; son usage est exporté comme lecture (`ancre.cube = true`), jamais comme preuve.
- Conséquence assumée : un juge (`jugerAscension`) ne peut pas distinguer un run avec Cube d'un run sans. Un titre « sans Cube » exigerait que l'usage devienne un choix du pendule (4ᵉ `CHOIX`), donc un `TAG_PENDULE` versionné — reporté, LIST 9.

Falsification cheap faite : `ancrer()` en Python reproduit la dérivation de `graineAncree` à l'octet (même tag, même ordre, `rang` sur 4 octets gros-boutiste) ; le lien réel par vecteur partagé (`vecteurs.json`) reste à faire si le labo devait un jour juger.

## 9. Aura et jauge de la Veillée — l'aura est une lecture, pas un second budget (K29–K34)
La Veillée n'a qu'un compte, et il ne remonte jamais : 64 feuilles WOTS+, un geste signé = une feuille (`veillee.ts`). Un système d'aura parallèle — huit compteurs qui se transfèrent et qu'un Cube restaure — contredirait cette règle en une ligne. Décision : **l'aura d'une veillée est une projection des feuilles brûlées sur les 8 positions du pendule.** Rien n'est ajouté à la jauge ; rien ne s'y prouve ; l'aura se recalcule depuis les gestes et le parcours rejoué.

La coïncidence structurelle qui rend la projection naturelle : `HAUTEUR_VEILLEE = 6` ⇒ 64 = 8 × 8. Chaque agrégateur porte huit feuilles. Un geste à l'étape k brûle une feuille de l'agrégateur de la position `p(k)+1` ; à la source (cran 8) la feuille va au débordement, comme au-delà de huit sur un agrégateur.

    aura_k = 8 − min(8, brûlées_k) · débordement = Σ max(0, brûlées_k − 8) + brûlées à la source · Σ = feuilles signées

Kill criteria (`labo/aura_veillee.py`, fixture réelle `labo/veillee_atelier.json` exportée par `atelier/scripts/exporter-veillee.ts`, bot gourmand graine 7, jour du vecteur) : identité comptable (K29), aura jamais croissante geste après geste (K30), Cube sans prise → `Rejet` (K31), un franchir par étape au plus (K32), refus d'un trou d'indice (K33), fixture réelle au sommet (K34).

Lecture de la fixture : sommet atteint, 46 feuilles sur 64, aura finale vigueur 6 · souffle 8 · focus 1 · ancrage 0 · éclat 0 · écho 6 · ombre 1 · vide 4, débordement 8. Le gourmand vide deux agrégateurs et déborde de huit : la projection *voit* une politique, ce qu'un total de feuilles ne montre pas — c'est sa seule valeur ajoutée, et elle suffit.

Conséquences : la loi du 9 (transfert-miroir) et le Cube restent des mécaniques de la **Tour libre** (`pendule9_run.py`), hors veillée. Le labo n'importe jamais les signatures : l'export les retire, le juge reste `jugerVeillee`. Un run qui compte n'a pas plus d'aura qu'un run libre — l'aura ne compte pas.

## 10. Le don : genre au hachage, quantité à la position (LIST 1, K35)
`genreDon(e, s, maître, n)` reste seul juge du **genre** (élixir, pierre, gemme, lair) : c'est ce que phase 0 mesure (`gemmesParLigneMax`), on n'y touche pas. Le labo n'apportait qu'un « tier = position » ; il devient la **quantité** : `quantiteDon(s) = s.y + 1 = p + 1`, de 1 (Uranie) à 9 (Terre, la source). Ni maître, ni run, ni coffre n'y entrent — deux joueurs sur la même case reçoivent le même nombre. `don()` assemble les deux.

Contrôles : `pendule.test.ts` (quantité = y + 1, indépendante de x, du maître et du run, bornée 1..9, genre inchangé) ; `exporter-run.ts` exporte `q`, et K35 vérifie que `q = p + 1 = tier` sur l'export réel. Les mesures de phase 0 sont inchangées par construction (elles ne lisent que le genre).

Ce qui reste ouvert : rien ne *donne* encore ce don dans la Tour — `genreDon` n'est appelé que par phase 0. Brancher `don()` sur l'arrivée d'étage (`veillee-tour.ts` / hôtes) est un chantier de jeu, pas de labo : LIST 10.

## 11. Lire un run vraiment joué (LIST 6, K36)
La LIST disait « brancher `sauver.ts` pour exporter de vrais runs ». `sauver.ts` s'est révélé être autre chose : le sélecteur de fichier du navigateur pour `eidos.carnet`, pas un dépôt de runs. Un run joué vit ailleurs — dans le carnet (`coffre.tour.veillee.v`) ou dans le fichier qu'exporte la page Veillée (`serialiserVeillee`). Le chantier devient donc : **`exporter-veillee.ts --depuis <fichier>`**, qui accepte les deux formes et rend exactement le même JSON que le bot — gestes sans signatures, parcours rejoué.

Deux fixtures, deux formes de run :
- `labo/veillee_atelier.json` — bot gourmand, sommet, 46 feuilles. Régénérable, comparée à l'octet par la CI.
- `labo/veillee_jouee.json` — une veillée vraiment jouée (parler, trois franchir, abandon), 4 feuilles, lue via `--depuis` depuis `labo/veillee_jouee_source.json`. **Non régénérable en CI** : un run joué ne se rejoue pas, c'est le propos. La CI vérifie qu'elle se relit à l'identique et que le labo la lit.

K34 devient générique (restantes = 64 − gestes ; une étape de parcours par franchir, plus l'entrée) au lieu d'exiger le sommet — l'ancienne forme était taillée pour le bot. K36 le dit explicitement : deux formes de run, mêmes règles, l'une au sommet et l'autre abandonnée.

`--depuis` ne vérifie rien : un fichier qui ne se parse pas est refusé, un fichier qui ment passe. `jugerVeillee` reste le seul juge, et aucune signature ne sort de l'atelier.

## 12. Les muses ne s'inventent pas (LIST 4, K37–K38)
La table `MUSES` du labo était **fausse** : elle donnait Calliope à s, Uranie à p, Thalie à d, Melpomène à f, alors que `signatures.ts` fixe neuf muses, une par astre, dans une descente d'Uranie (rang 0, le sommet) à Thalie (rang 8, la ville). Corrigé de la seule manière qui tienne : le labo **ne recopie plus** les muses, il relit `labo/muses.json`, exporté par `atelier/scripts/exporter-signatures.ts` depuis `signatures.ts` et `rangBande` — la CI compare à l'octet, la table ne peut plus diverger.

Le mode d'aura se déduit du rang, il ne s'attribue pas : `ℓ = (8 − rang) · 4 // 9`, soit Thalie/Clio/Calliope en **s**, Terpsichore/Melpomène en **p**, Érato/Euterpe en **d**, Polymnie/Uranie en **f** (3 + 2 + 2 + 2 = 9). Du plus simple en bas au plus complexe au sommet. K37 : la table vient bien de l'atelier, neuf bandes, neuf rangs, Thalie en 0, Uranie en 8. K38 : les modes couvrent s→f et ne redescendent jamais.

Les modes restent sans effet de jeu — ils nomment, ils ne font rien. Ce n'est plus une conjecture inventée, c'est une lecture d'une table réelle.

## 13. L'avatar n'est pas un objet, mais partage la convention (LIST 2)
`voxels.ts` déconstruit un **mot** en occupance : un objet a un mot, un âge, une teinte. L'avatar n'en a aucun — il n'a pas sa place dans `voxels.ts` et n'y entrera pas. En revanche il n'a aucune raison d'inventer une seconde convention de grille : le corps passe de 16 × 32 × 16 à **12 × 24 × 12**, c'est-à-dire `VOXEL_N` en x et z (identique à `voxels.ts`) et le double en hauteur, parce qu'un corps est debout. Entiers seulement, comme là-bas.

`empreinte_corps()` reprend l'indexation d'`empreinteVoxels` : `i = x + N·(y + H·z)`, bits en petit-boutiste, hex par octet. Un corps a donc une empreinte comme un objet, sans être un objet. Contrôles : K8bis (grille = `VOXEL_N`, `2·VOXEL_N`, `VOXEL_N` ; tout voxel dans les bornes), K8ter (empreinte de la bonne taille, déterministe, distincte entre deux graines).

Reste ouvert : le rendu. Un corps voxel à l'écran serait une scène `@react-three/fiber` comme le coffre — chantier de jeu, pas de labo.

## 14. Un seul pendule (LIST 7)
`pendule9_run.py` portait un second pendule : 255 étages parcourus un par un, position par racine digitale, cycles de neuf, balancier sur les cycles impairs. C'était une esquisse d'avant l'unification, et elle **contredisait** `pendule.ts`, où un run fait 27 étapes réparties sur 255 étages en neuf bandes de triplets. Deux mappings, deux vérités : retiré.

Ce qui disparaît : `digital_root`, `position`, `cycle_of`, `swing`, `BALANCIER`, le coût `1 + étage // 64`, et avec eux K10 (« 255 = 28 cycles + 3 ») et K18 (la queue) — deux contrôles qui ne mesuraient que la fiction. K23 change de sens : il n'y a plus deux chemins à faire coïncider, seulement le cran de l'atelier qui décide l'agrégateur.

Ce qui reste, parce que ce n'était pas dans le mapping : la loi du 9, la réserve de la source, le sceau, le Cube et sa portée, la table des muses, l'avatar. Un run se prend maintenant dans `labo/run_atelier.json` (`enter_floor` consomme une étape, `jouer` le run entier) et le coût vient de la bande, borné 1..3, comme dans `unification.py`. K17 le vérifie : 27 étapes, les étages du log sont ceux de l'export, l'étape 0 est l'étage 0.

Effet de bord agréable : le sceau final de `pendule9_run` et celui d'`unification` coïncident désormais — même run, même lecture.
