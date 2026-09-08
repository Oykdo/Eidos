# Spec — l'aura graduelle : une lecture entière, sur la dalle et autour du corps

**Dépôt :** Oykdo/Eidos
**Statut :** spec proposée (2026-09-08), décisions D1–D10 à prendre par l'auteur. Rien n'est implémenté hors du labo (`labo/aura_voxel_lab.py` K1–K9, `labo/aura_veillee.py` K29–K36, `labo/pendule9_run.py` K37–K38, tous PASS le 2026-09-08) ; les chiffres cités viennent de ces scripts et d'une mesure jetable sur leurs fixtures, à reprendre en K48–K56.
**S'appuie sur :** `docs/SPEC_AURA_PENDULE9.md` (§2, §3, §9, §12, §13), `docs/SPEC_BROUILLARD.md` (la lampe, Earnshaw), `docs/SPEC_PENDULE.md` (O1–O5), `docs/SPEC_TOUR.md` (§0, §4.5, §8), `docs/BIBLE_VEILLEE.md` (§2, §7), `pendule.ts`, `veillee.ts`, `voxels.ts`, `signatures.ts`, `components/canvas/texel.ts`.
**Règle de lecture :** [FIXE] donné du dépôt · [PROPOSÉ] recommandation falsifiable, avec un seuil · [OUVERT] à l'auteur. Figures ≠ preuves ; rien n'est tiré au sort ; tout ce qui se rejoue est entier ; ce qui compte est ancré, ce qui est libre ne vaut rien.

## 0. En cinq lignes

1. L'aura est une **lecture** de ce qui a déjà été dépensé — les feuilles d'une veillée, les étapes d'une ascension — jamais un budget, jamais une puissance, jamais un champ de la jauge.
2. Sur la dalle 9 × 9 elle a la forme de la **lampe** de la brume : `A(c) = max(0, R − d∞(c, foyer))`, `R ∈ 0..3`, plateaux entiers, foyer = la case d'arrivée du pendule.
3. Son temps est le **geste** (veillée : −1 par feuille, rien ne revient) ou l'**étape** (ascension sans arbre : loi du 9, la source seule recharge) ; aucune horloge.
4. Les modes s/p/d/f du rang de muse sont la **résolution angulaire** de la lecture (1, 2, 4, 8 secteurs) : en montant, le même vecteur se lit plus fin ; rien de neuf n'est révélé.
5. Le rendu réemploie `texel.ts` (Bayer 4 × 4, plateaux), la teinte de bande et le fond `#12151a` ; les flottants restent au rendu ; en mouvement réduit, image fixe.

## 1. Ce que l'aura est

**D1 [PROPOSÉ] — une forme, deux sources, jamais les deux à la fois.** Le type est unique : `Aura = { a: [8 entiers], cap: 8 | 9, source: entier }`, positions 8..1 de `AGG` (vigueur, souffle, focus, ancrage, éclat, écho, ombre, vide), miroirs `MIRROR` de somme 9, cran 8 = la source.
- **Veillée** (`tour.veillee` présent) : `a_k = 8 − min(8, brûlées_k)`, `brûlées_k` = gestes signés aux étapes dont le cran est `k − 1` (`parcoursDe(v).etapes[g.etape].p`), cap 8 ; ce qui brûle au cran 8 va au débordement (spec §9, K29–K34). Mesuré : `veillee_atelier.json` (bot gourmand, sommet, 46/64) → 6 · 8 · 1 · 0 · 0 · 6 · 1 · 4, débordement 8 ; `veillee_jouee.json` (parler, trois franchir, abandon, 4/64) → 8 · 8 · 6 · 8 · 8 · 8 · 8 · 7, débordement 1.
- **Ascension sans arbre** (`tour.ascension` présent, libre ou ancrée, `veillee` nul) : la loi du 9 rejouée sur les étapes `(p, e)` déjà jouées, cap 9, coût `1 + bande(e) // 3`, le coût passe au miroir et l'excédent à la source (`unification.appliquer_aura`, K19–K26). Mesuré sur `run_atelier.json` : minima vigueur 5, éclat 3, tout le reste ≥ 6 ; source atteinte aux étapes 4, 11, 15, 16, 17, 19, 26 ; coût total 39 ; fin 9 partout, source 0.
- **Hors parcours** : rien n'a été dépensé, l'aura est pleine (K9) et ne se dessine pas.

Pourquoi les deux lectures ne se contredisent pas :
- même forme, même source de vérité — le parcours `(p, e)` de `pendule.ts`, rejoué comme `parcoursDe` le fait, plus les gestes quand il y en a ;
- jamais deux lectures pour un même run : **l'arbre fait foi quand il y a un arbre** (une veillée est une ascension avec un arbre) ;
- leurs dynamiques diffèrent parce que ce qu'elles lisent diffère : un compte qui ne remonte jamais (K30) ; une figure de parcours que la source remplit (K15, K22) ;
- deux invariants, un par source : `Σ(8 − a_k) + débordement = feuilles signées` (K29) ; `Σ a_k + source = 72` (K21) ;
- et une preuve que ce n'est pas un compte : sur la fixture du bot, `Σ a_k = 26` alors que `feuillesRestantes = 18` — le compte est `feuillesRestantes`, l'aura en est la **forme**.

**D2 [PROPOSÉ] — le Cube de Saturne n'entre pas dans l'atelier.** Une lecture recalculée n'a pas d'état à restaurer ; le porter créerait la seule chose que §9 interdit, un compteur qu'on dépense une fois. Il reste une figure du labo (K14, K27, K28 inchangés) tant qu'il n'est pas un `CHOIX` du pendule (LIST 9, `TAG_PENDULE` versionné) — ce jour-là, [OUVERT] à l'auteur.

**D10 [OUVERT] — cap 9 (Tour libre, `CAP`) contre cap 8 (veillée, `PAR_AGG`).** Recommandation : garder les deux, `rayon(a, cap)` (§2) les absorbe. Aligner `CAP := 8` au labo ne casserait pas K8 (vérifié le 2026-09-08 : l'excédent y reste 5 et le total est conservé, la loi est relative au cap) ; ce qui changerait, c'est l'invariant `Σ a_k + source = 72` → 64, les chiffres mesurés de §1 et §3, et le nom même de la loi — le 9 du cap est celui de la position 9, la source — pour un gain nul à l'écran.

## 2. La forme du champ

**D3 [PROPOSÉ] — la loi de la lampe, avec un rayon lu dans l'aura.** Distance de Tchebychev `d∞`, comme la brume (`C(c) = max(0, 3 − d∞)`, SPEC_BROUILLARD §3) :

    rayon(a, cap) = (3·a + cap − 1) // cap            ∈ 0..3 ; cap 8 → 0 1 1 2 2 2 3 3 3 ; cap 9 → 0 1 1 1 2 2 2 3 3 3
    A(c) = max(0, rayon(secteur(c)) − d∞(c, foyer))   foyer = case d'arrivée du pendule (`spawnIci`), secteur = §4

Propriétés, toutes entières : `rayon = 0 ⇔ a = 0` (une direction vide s'éteint) ; `rayon = 3 ⇔ 3·a > 2·cap` (plus des deux tiers gardés : la portée de la lampe) ; `A ≤ 3` partout ; au foyer central, `A > 0` sur 1, 9, 25 cases pour R = 1, 2, 3 (dans un coin : 1, 4, 9) ; au foyer, qui n'a pas d'octant, `A(foyer) = rayon(Σ a, 8·cap)` — la valeur du disque (mode s) ; le débordement ou la réserve ne s'y dessinent pas, ils s'écrivent (§5) ; le laplacien du 8-voisinage de la brume, `Σ_voisins A − 8·A`, vaut −8 au foyer dès R ≥ 1 **en mode s** (rayon uniforme) et reste strictement négatif dans tous les modes dès que `Σ a > 0` (chaque voisin vaut `max(0, R_k − 1) < 3·a_k / cap`, la somme reste sous `8·A(foyer)` ; bot en mode f : −9) : l'aura est un puits — ce que K7 disait en flottant se dit ici en entier. La gaussienne du labo n'a plus de place dans ce qui se rejoue (§10).

L'octant d'une case, `dx = x − fx`, `dy = y − fy`, `y` vers le bas comme `dalle[y][x]` ; chaque octant est demi-ouvert, du rayon qui le nomme (inclus) au suivant (exclu), dans le sens horaire depuis le haut :

    0  N  → NE   dx ≥ 0, dy < 0, dx < −dy        4  S  → SO   dx ≤ 0, dy > 0, −dx < dy
    1  NE → E    dx > 0, dy < 0, dx ≥ −dy        5  SO → O    dx < 0, dy > 0, −dx ≥ dy
    2  E  → SE   dx > 0, dy ≥ 0, dy < dx         6  O  → NO   dx < 0, dy ≤ 0, −dy < −dx
    3  SE → S    dx > 0, dy > 0, dy ≥ dx         7  NO → N    dx < 0, dy < 0, −dy ≥ −dx
    position de l'octant k : (8, 7, 6, 5, 1, 2, 3, 4)[k]   —   le foyer lui-même n'a pas d'octant : c'est la place de la source, il porte la valeur du disque

Mesuré : autour de (4, 4) chaque octant tient 10 cases ; pour les 81 foyers, aucune case sans octant, aucune dans deux.

**D4 [PROPOSÉ] — l'unification aura ↔ lampe tient dans un sens, et un seul.** Dans un antre sous brume, l'aura fixe le **rayon** de la lampe du bord, `R = rayon(Σ a_k, 8·cap)`, jamais sa place : la nuit d'Earnshaw fait au moins `(9 − 2R)²` cases — 9, 25, 49, 81 pour R = 3, 2, 1, 0, exactement quand les 32 cases du bord sont allumées, davantage avec la seule lampe de la porte (brume §3) — et n'est jamais éclairée. Un joueur dépensé voit moins, jamais plus (bot gourmand : R = 2, une seule rangée). Ce qui ne tient pas :
- **l'aura n'est pas une lampe portée** — une lampe qui entre éclairerait les neuf cases centrales et casserait la loi (brume §1) ;
- **la coïncidence n'est pas l'aura en mode p** — `S = A·V` exige deux entrées indépendantes (objet porté, capture ou soufre) ; l'aura est une seule entrée, et `A·A` « ne se croise pour rien » (brume §4, règle 1). Les deux lobes du mode p sont une résolution de lecture (§4), pas des barres.

La brume n'est pas codée (B1–B5 ouvertes) : ce rayon est une ligne à ajouter à `clarteLampe` le jour où elle l'est, pas un chantier ici.

Objection du relecteur : c'est le seul endroit de la spec où l'aura *fait* quelque chose — un malus est un effet de jeu, et « l'aura ne compte pas » (spec §9) comme « ne coûte aucun geste » (§6) ne tiennent plus si un joueur dépensé ne voit plus le relief d'un antre. La brume fixe `C(c) = max(0, 3 − d∞)` comme constante publique (brume §3), et B5 a écarté la lampe à une rangée précisément parce que « la déduction deviendrait un tirage » : D4 la rétablit pour le bot gourmand (R = 2) et rend l'antre injouable sous R ≤ 1. Recommandation inverse : R = 3 fixe ; l'aura teinte les cases éclairées (lecture), ne change jamais leur nombre.

## 3. Le temps

**D5 [PROPOSÉ] — pas d'horloge : le geste et l'étape.** `exp(−Γt)` suppose un temps que le jeu n'a pas (« l'horloge est le bloc », SPEC_COFFRE_HORAIRE §1 ; une veillée n'a que des gestes).
- Veillée : un geste signé = −1 sur la position de l'étape courante ; rien ne recharge, une feuille brûlée est irréversible par construction (bible §2.3, K30, K31). Mesuré : sur `veillee_atelier.json` la lecture à huit rayons change à 11 gestes sur 46 (aux 3ᵉ, 11ᵉ, 14ᵉ, 18ᵉ, 19ᵉ, 25ᵉ, 28ᵉ, 33ᵉ, 38ᵉ, 40ᵉ et 42ᵉ gestes, comptés de 1 ; indices `i` du fichier : 2, 10, 13, 17, 18, 24, 27, 32, 37, 39, 41) ; sur `veillee_jouee.json`, jamais en 4 gestes.
- Ascension sans arbre : une étape = −`(1 + bande(e) // 3)` sur la position de son cran, l'excédent au miroir puis à la source ; **la source est la seule recharge**, au cran 8, et elle vide sa réserve sur les positions les plus basses (K15, K22). Mesuré sur `run_atelier.json` : 8 étapes sur 27 montrent un rayon < 3 ; la réserve monte à 12 au plus (étape 25) ; 7 passages par la source.
- Γ survit au rendu seulement (§5) : une seconde de fondu après un geste, aucune en mouvement réduit.

Seuil : si, sur dix exports réels (`exporter-run.ts`, dix maîtres), moins d'une étape sur neuf montre un rayon < 3, la loi du 9 est invisible à l'écran et l'atelier ne garde que la lecture de la veillée (D1 réduit à une source).

## 4. Les modes s / p / d / f

**[FIXE]** `ℓ = (8 − rang) · 4 // 9` : Thalie, Clio, Calliope en s ; Terpsichore, Melpomène en p ; Érato, Euterpe en d ; Polymnie, Uranie en f (spec §12, K37–K38, table `labo/muses.json` ← `signatures.ts`). Ils nomment, ils ne font rien.

**D6 [PROPOSÉ] — le mode est la résolution angulaire de la lecture.** Les huit positions se posent sur la **rose des huit voisins** de la case foyer (le 8-voisinage `n8` de `TourCanvas` et du laplacien de la brume §5 ; `texel.voisinage` est en trois dimensions, n6 / n26), dans l'ordre des octants de §2 : 8, 7, 6, 5, 1, 2, 3, 4 — le miroir est le rayon opposé (`MIRROR`, somme 9), la case du foyer est la place de la source et porte la valeur du disque (§2). Le rayon d'un secteur de `n` positions est `rayon(Σ a, n·cap)`.

| Mode | Secteurs | Octants | Positions | Ce qu'on lit |
|---|---|---|---|---|
| s | 1 disque | 0..7 | 8..1 | la somme : combien il reste |
| p | 2 lobes, est et ouest | 0..3 · 4..7 | aller 8 7 6 5 · retour 1 2 3 4 | les deux moitiés du balancier |
| d | 4 lobes, quadrants | 0 1 · 2 3 · 4 5 · 6 7 | 8 7 · 6 5 · 1 2 · 3 4 | les quarts du balancier |
| f | 8 rayons | chacun le sien | chacune la sienne | la politique, position par position |

- Chaque mode raffine le précédent (s ⊃ p ⊃ d ⊃ f) : le rayon d'un secteur est toujours entre le plus petit et le plus grand des rayons de ses sous-secteurs.
- Mesuré sur `veillee_atelier.json` : s = 2 ; p = 2 et 2 ; d = 3 · 1 · 1 · 2 ; f = N 3, NE 3, E 1, SE 0, S 2, SO 1, O 3, NO 0. En bas de la Tour le gourmand voit un disque ; au sommet il voit ses deux rayons morts.
- C'est l'**usage de lecture** : ce que le joueur voit de plus en montant, c'est **sa propre aura**, au grain de la muse — « on y lit mieux » (SPEC_TOUR §0) —, jamais l'étage : relief, trouvailles, occupants et échos restent ce qu'ils sont. Rien de nouveau n'est montré, donc rien n'est une puissance.
- Seuil : si, sur les deux fixtures et dix veillées du bot, la lecture f ne diffère jamais de la lecture s de plus d'un plateau sur aucun rayon, les modes sont une décoration et restent des noms (fixture du bot : elle diffère de deux).

**D7 [OUVERT] — la lumière révèle-t-elle les trouvailles ?** Les cases à trouvaille sont publiques (`aUneTrouvaille`) mais `TourView` ne les montre qu'une fois creusées (✓). Les montrer sous `A(c) > 0` serait une lecture d'information publique, comme le relief au soufre. Recommandation : **pas dans ce lot** ; si l'auteur le veut, K56 mesure d'abord le gain d'un bot guidé — au-delà de 1,5 × le butin du gourmand, c'est une puissance et l'idée meurt.

Objection du relecteur : « lecture d'information publique » sous-estime l'effet, et K56 doit nommer son cadre. Le gourmand ne creuse que sa case d'arrivée (`exporter-veillee.ts`) : une trouvaille sûre par étage. Dans la **Tour libre** (trois bêches gratuites par étage, `tour.fouilles`), un bot guidé ajoute les cases à trouvaille sous `A > 0` : à R = 3, 24 cases autour de l'arrivée, une case sur deux pleine, une pleine sur huit ≈ 1,5 trouvaille attendue en plus, soit ≈ ×2,5 ; à R = 2, 8 cases ≈ 0,5, soit ≈ ×1,5 — le seuil est franchi par construction, l'idée est morte avant la mesure. En **veillée**, les feuilles bornent le gain (64 − 26 franchir − 27 arrivées = 11 bêches de plus au plus, ≈ ×1,4) : c'est le budget, pas l'aura, qui protège. Et le compte demande `veillee-bot.ts` (Node), pas la stdlib.

## 5. Le rendu

**D8 [PROPOSÉ] — la dalle.** Deux surfaces existent déjà, aucune n'est nouvelle.
- La grille de `TourView` (81 boutons, fond `TEINTE_BIOME` ou `#0e1116`, signes ◆ ○ ✓ ·) reçoit la teinte de bande à trois plateaux sur les cases `A(c) > 0`, tramée : la case est teintée si `seuilBayer(x, étage, y) < 4·A(c)` — un quart, la moitié, les trois quarts des cellules, l'idiome de `clarteCellule`. Les cases pleines portent déjà `TEINTE_BIOME` : les trois plateaux y sont des clartés (facteur K, comme `CLARTE_DALLE`), jamais la teinte seule ; sur un trou, la teinte tramée sur `#0e1116`. Le foyer garde ◆.
- La scène `TourCanvas` fait la même chose par sa couleur d'instance (`teintes` + `setColorAt`), sans matière ni géométrie nouvelle ; `A = 0` fond vers `brouillard()` = `#12151a`.
- Sous le dessin, le texte : huit nombres et le mode, en monospace — aucune information portée par la couleur seule (bible §7).
- Rendu à la demande ; un geste est un rendu. Contrôle visuel sur `/tour`, console ouverte, comme pour toute scène.

**D9 [PROPOSÉ] — le halo du corps.** Même loi en trois dimensions.
- `A(v) = max(0, R − d∞(v, corps))` sur la grille `12 × 24 × 12` du labo (`GRID` d'`aura_voxel_lab.py` : `VOXEL_N` de `voxels.ts` en x et z, le double en y, spec §13) élargie de 3 de chaque côté (18 × 30 × 18), `R = rayon(Σ a, 8·cap)`, cellules tramées par `seuilBayer(x, y, z) < 4·A(v)`, cubes instanciés comme `VoxelCanvas`. Le corps de la graine 7 (taille 1,05, poids 1,1, tel qu'`aura_voxel_lab.py` l'imprime ; 266 à 1,0 / 1,0) fait 342 voxels (tête 60, visage 2, torse 160, bras 24 + 24, jambes 36 + 36) ; sa voxelisation est en flottant (ellipsoïdes ×0,8–1,3) — un rendu, jamais une règle.
- La gaussienne `A(r, t)` du labo devient une interpolation de rendu si l'on en veut une, jamais une règle ; `exp(−Γt)` devient un fondu d'une seconde après un geste, et une image fixe quand `usePrefersReducedMotion` le dit (comme `FondOrbital`).
- Aucune dépendance, aucune texture, aucune boucle CSS. La scène de l'avatar n'existe pas (spec §13) : le halo attend, la spec ne l'attend pas.

## 6. Ce que l'aura ne fait jamais

- N'entre ni dans une graine, ni dans une trace, ni dans un message signé, ni dans une preuve (`ancrage.ts`, K27 ; « ce qui compte est ancré »).
- Ne refuse ni ne coûte aucun geste : `signerGeste` ne connaît que `finie`, `vide`, `arbre`, `choix`, `arg` (spec §9 : « un run qui compte n'a pas plus d'aura qu'un run libre »).
- Ne touche ni norme, ni axe, ni mot (SPEC_TOUR §0 : « un palier ne multiplie pas la norme » ; LIMITE d'`elixirs.ts`).
- N'est pas persistée : aucun champ de `Tour`, recalcul intégral (« rien ne se croit, tout se rejoue »).
- Ne porte aucun flottant dans ce qui se rejoue (CLAUDE.md §4 ; brume §10 « aucune intensité continue »).
- Ne tire rien au sort (SPEC_TOUR §0).
- N'éclaire jamais la nuit d'un antre et n'est jamais une coïncidence (brume §1, §4).
- Ne se restaure pas : pas de Cube dans l'atelier (K31, D2).
- N'entre ni dans le score ni dans le classement (`scoreVeillee`, `classement.ts` ne jugent que la preuve) et ne se présente jamais comme une garantie (figures ≠ preuves).

## 7. Kill criteria de la prochaine session de labo

K47 est déjà pris (`coffre_horaire.py`, la rafale rétroactive) : on part de K48. Un script, `labo/aura_dalle.py`, bibliothèque standard, fixtures existantes.

| # | Une phrase testable | Ce qui tomberait |
|---|---|---|
| K48 | `rayon(a, cap)` rend les deux tables de §2, est monotone, vaut 0 ssi a = 0 et 3 ssi 3·a > 2·cap | la borne 3 = la portée de la lampe |
| K49 | pour les 81 foyers, les 80 autres cases tombent dans un octant et un seul (10 par octant au centre) | l'assignation angulaire (D6) |
| K50 | au foyer (`A = rayon(Σ a, 8·cap)`), `Σ_voisins A − 8·A = −8` pour R ∈ 1..3 en mode s, et `< 0` en p / d / f pour tout vecteur `a ≠ 0` | « l'aura concentre » (K7 en entier) |
| K51 | pour R ∈ 0..3, les 32 lampes du bord allumées ensemble éclairent `81 − (9 − 2R)²` cases (la nuit minimale ; une lampe seule en laisse davantage) et jamais une des neuf centrales | l'unification lampe (D4) |
| K52 | pour tout vecteur `a`, le rayon de chaque secteur est entre le min et le max de ses sous-secteurs, s ⊃ p ⊃ d ⊃ f | la hiérarchie des modes (D6) |
| K53 | `veillee_atelier.json` : la lecture f change à au moins 1 geste sur 9 (mesuré 11/46) ; `run_atelier.json` : au moins 1 étape sur 9 sous rayon 3 (mesuré 8/27) | « l'aura se voit » (D5) |
| K54 | sur la fixture du bot `Σ a ≠ restantes` (26 ≠ 18) et `restantes = 64 − gestes` reste seule vraie (K34) | « second budget » (D1) |
| K55 | `labo/aura_lectures.json` (s/p/d/f des trois fixtures, écrit par le labo) est relu à l'octet par `aura.test.ts` | le port TS |
| K56 | [si D7] un bot qui ne creuse que sous `A > 0` avec trouvaille rapporte ≤ 1,5 × le gourmand, mesuré séparément en Tour libre et en veillée (`veillee-bot.ts`, Node : le seul K de la table hors stdlib) | la révélation comme lecture |

## 8. Le chantier

Une PR à la fois, dans cet ordre ; chacune verte avant la suivante.

| Lot | Fichiers | Contrôles | Taille |
|---|---|---|---|
| A labo | `labo/aura_dalle.py` (rayon, octants, champ, modes, anneau, lectures des trois fixtures), `labo/aura_lectures.json`, `labo/README.md`, `labo.yml` (une étape), README (une ligne) | K48–K54 | ~150 lignes |
| B module pur | `atelier/src/lib/eidos/aura.ts` (`rayon`, `octant`, `champDalle`, `auraVeillee` via `parcoursDe`, `auraAscension` : `transition` rejouée sur `choix`/`mots` de `tour.ascension`, loi du 9 portée à l'octet), `aura.test.ts`, `package.json` (liste des tests), `labo.yml` (K55) | 9 : tables, octants, puits, anneau, hiérarchie, parité, l'arbre prioritaire, hors parcours pleine, jamais croissante en veillée | ~250 lignes |
| C rendu dalle | `TourView.tsx` (teinte tramée + texte), `TourCanvas.tsx` (couleur d'instance), `i18n.ts` (`tour.aura.*`, FR/EN ; « cycle », jamais « époque ») | +1 i18n ; contrôle visuel `/tour`, console ouverte | ~150 lignes |

Hors lot : le halo du corps (attend la scène de l'avatar, LIST 2), le rayon de la lampe (attend `brume.ts`, B1–B5), D7 (K56 d'abord), le Cube comme `CHOIX` (LIST 9), `exporter-run.ts` sur une ascension jouée (LIST 6, reste). Aucun de ces lots ne touche `eonis.py`, `genesis.json`, la jauge, les six lois, ni une graine.

## 9. Table figure → source → usage

| Figure | Source | Usage ici |
|---|---|---|
| la lampe, `C(c) = max(0, 3 − d∞)` | `docs/SPEC_BROUILLARD.md` §3 | la forme du champ (D3) |
| la nuit d'Earnshaw, neuf cases | brume §1, §3 | ce que l'aura n'éclaire jamais (D4) |
| les huit positions, les miroirs de somme 9, la source | `aura_voxel_lab.py` `AGG`, `MIRROR`, spec §3 | les huit rayons, l'opposé, le foyer |
| le 8-voisinage et `Σ_voisins − 8·f` | brume §5, `n8` de `TourCanvas` (`texel.voisinage` est 3D : n6 / n26) | l'octant, le puits (K50) |
| la trame de Bayer 4 × 4, « un quart des cellules » | `texel.seuilBayer`, `clarteCellule`, `TourCanvas` | les plateaux à l'écran (D8) |
| 64 = 8 × 8 feuilles | `veillee.ts` `HAUTEUR_VEILLEE`, spec §9 | la lecture de la veillée (D1) |
| la loi du 9 et sa source | `unification.appliquer_aura`, `redistribute_source_9` | la lecture de l'ascension (D1, D5) |
| `ℓ = (8 − rang)·4 // 9` | `pendule9_run.mode_de_rang`, `labo/muses.json` ← `signatures.ts` | la résolution (D6) |
| s, p, d, f : sphérique, directionnel, trèfle à 4 lobes, complexe | spec §2 [C], §12 | les secteurs (D6) — le découpage 1, 2, 4, 8 est une décision de cette spec, pas une source |
| la grille 12 × 24 × 12 | `aura_voxel_lab.py` `GRID` (`VOXEL_N` de `voxels.ts` en x, z), spec §13 | le halo (D9) |
| la teinte de bande, le fond `#12151a`, `brouillard()` | `tour.ts` `TEINTE_BIOME`, `canvas/atelier.ts` | la couleur, l'extinction (D8) |
| l'image fixe en mouvement réduit | `usePrefersReducedMotion`, `FondOrbital` | D8, D9 |

## 10. Ce qu'on rejette, et pourquoi

- **La gaussienne et `exp(−Γt)` dans le jeu** : des flottants dans ce qui se rejoue, et un temps que le jeu n'a pas. Elles restent au labo (K4–K7) et, au plus, au rendu.
- **Le Cube dans l'atelier** : une lecture n'a rien à restaurer ; un compteur qu'on rend est un second budget (§9).
- **L'aura comme lampe portée** : elle éclairerait la nuit ; Earnshaw est la loi de la brume.
- **La coïncidence comme mode p** : une seule entrée, `A·A` n'isole rien.
- **Un mode qui masque des directions** : lire moins en montant contredit « on y lit mieux » ; les modes raffinent, ils ne cachent pas.
- **`spinor.ts` pour orienter les lobes (LIST 8)** : phases en radians, lecture PSNX, « INTERDIT : en faire une graine » ; la rose des huit voisins suffit et n'a pas de flottant.
- **Le mode Lorentz `F = q(E + v × B)`** (spec §2 [C]) : une force, donc une puissance ; rien ne dévie rien dans la Tour.
- **Un champ `tour.aura` dans la jauge** : ce qui se recalcule ne se stocke pas.
- **L'aura dans le score ou le classement** : seule la preuve se juge.

Écarts relevés en lisant, à corriger dans leurs fichiers, pas ici :
- la spec §1 dit encore « 16 × 32 × 16 » alors que §13 et K8bis fixent 12 × 24 × 12 (`labo/README.md` et la feuille de route aussi) ;
- le manifeste `sha256(aura_voxel_lab.py)[:16]` de la spec vaut aujourd'hui `556146bf1e76f8ee`, pas `84db5bb463437c65` ;
- K47 est attribué par `coffre_horaire.py` alors que `labo/README.md` s'arrête à K46 (`README.md` ne numérote pas les K : il compte 9 contrôles pour ce fichier, K47 compris) ;
- `exporter-run.ts` dit encore « brancher `sauver.ts` », que §11 a écarté.
