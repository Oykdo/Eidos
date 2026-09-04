# Étude — l'arbre de visite d'une carte procédurale

**Dépôt :** Oykdo/Eidos
**Statut :** étude (2026-09-04). Rien n'est implémenté ; les décisions O8–O12 (§9) reviennent à l'auteur.
**Sources :** deux textes reçus (« deux structures mathématiques » puis « TCL, Gödel, neuf pendules, shaders, arbre épineux ») et cinq figures (`atelier/docs/expé/imgphy`, hors dépôt) : les quatre opérateurs vectoriels, l'intégrale gaussienne, les coordonnées sphériques et leur laplacien, l'univers de Gödel, le théorème central limite.
**Règle de lecture :** ce document sépare ce qu'Eidos **fait déjà**, ce qui **tient** et peut se coder en petit, et ce qu'on **rejette** avec la raison. Aucune figure n'y devient une preuve ; aucun flottant n'entre dans un invariant ; rien ne touche `eonis.py`, la genèse, le carnet ni les signatures.

## 0. En cinq lignes

1. Les six « outils » du premier texte (invariant / jauge, quaternions de Shoemake, compression à trois composantes, norme conservée, craft non commutatif, treillis 3 × 7, sceau glyptique, époques comme géographie, résonance par la métrique) **sont déjà le cœur d'Eidos** : `objets.ts`, `cosmos.ts`, `groupe.ts`, `resonance.ts`, `lecture.ts`, `tour.ts`. Le texte décrit le dépôt.
2. L'**arbre de visite** existe déjà sans avoir été nommé : c'est le graphe des états du pendule `(étape, cran)`, 243 nœuds au plus, dont une graine donnée n'en atteint que 190 à 200 ; ses **épines** sont les étages où toutes les histoires convergent. Il se mesure aujourd'hui, sans rien changer (§3).
3. Le **TCL** n'a pas à générer d'aléa : il décrit ce que le pendule fait déjà (une somme de 26 pas concentre le cran final). Ce qu'il apporte, c'est une **loi de lecture** : la moyenne par étape d'un run converge en σ/√n, donc un run court est un pari et un run long une mesure. « Le joueur choisit n » = il choisit quand exporter (O8).
4. **Gödel** ne fournit pas une métrique mais deux figures : la **boucle fermée** (revenir au même étage public avec un autre état : les échos le font presque) et la **caustique** (les étages focaux de l'arbre). On garde les figures, pas les cônes (O9).
5. Les **opérateurs** et la **sphère** donnent quatre lectures entières de la dalle 9 × 9 (gradient, divergence, rotationnel, laplacien discrets) et une bascule visible de la scène selon le cran du pendule (O10, O11). Maxwell ne sert à rien ; neuf pendules indépendants contrediraient la spec ; un VRF n'est pas nécessaire tant qu'on ancre sur un bloc déjà signé.

## 1. Les deux textes et les cinq figures

### 1.1 Premier texte — « deux structures mathématiques »

| Outil proposé | Ce qu'il demande | Où il est dans Eidos | Preuve |
|---|---|---|---|
| Symétrie de phase → invariant / jauge | stocker seulement le représentant canonique, régénérer le cosmétique | feuillet vs **jauge hors feuille** (`carnet.ts`, `jauge.ts`, `types.ts`) ; `canoniser` (q et −q même mot) | `integrite.test.ts`, `objets.test.ts` |
| Shoemake : trois uniformes → un point de S³ | échantillonnage sans biais depuis la graine | `quadrupleDepuis` (« Shoemake entier », norme 10⁸, BigInt) | `cosmos.test.ts` |
| Compression « smallest-three », 32 bits | omettre la plus grande composante, quantifier les trois autres | mot u32 : 2 bits d'indice omis + 3 × 10 bits (`paqueter`, `depaqueter`) | `objets.test.ts` |
| Distance angulaire = rareté continue | pas de table de paliers | `distanceMot`, `alignement`, `alignementCentiemes` | `lecture.test.ts` |
| Conservation de la norme, pas de power creep | améliorer = redistribuer sur la sphère | norme fixée ; « le rang multiplie le nombre de tirages, jamais la norme » | docstring `objets.ts`, `integrite.ts` |
| Craft = produit de rotations, non commutatif, inversible | recettes à chemin dépendant, démontage par le conjugué | `produit`, `conjugue`, `composer`, `produitChemin`, `cheminsEquivalents` | `groupe.test.ts` |
| Treillis 3 × 7 de Doxa | archétypes purs et hybrides donnés par la figure | `CLASSES` (3) × `REGIMES` (7) = `CELLULES_DOXA` (21), 101 formes (`cosmos.ts`) | `cosmos.test.ts` |
| Sceau glyptique | l'invariant rend un sigil lisible, zéro octet stocké | `sceauObjet`, `glypheDe`, `glypheLecture` | `objets.test.ts` |
| Époques comme géographie | l'âge ouvre un secteur, ne multiplie rien | quatre âges, quatre quartiers de la Tour, portes 64 · 128 · 192 (`sceaux.ts`) | `sceaux.test.ts` |
| Résonance émergente | synergies par la métrique, pas par une table | `resonance.ts` : « rien n'est une table de sets » | `resonance.test.ts` |
| Budget ≈ 9 octets par objet, RNG ouvert | graine = H(bloc ‖ coffre ‖ nonce) | mot u32 + âge + rang ; `graineTirage(sig, hashBloc)` ; ancrage `sha256d("eidos-ascension/1" ‖ id_bloc ‖ txid ‖ rang)` | `ancrage.test.ts` |

Le « ce que je surveillerais » du texte est également couvert : l'**invariant de classe** qui regroupe les chemins équivalents est l'orbite (`memeOrbite`, `dansOrbite`), et le treillis reste une grammaire de lecture (`lecture.ts`), jamais une contrainte sur les mécaniques.

Conclusion : ce texte n'ouvre pas de chantier. Il vaut comme **documentation externe** du modèle d'objets, et pourrait être cité dans `docs/` tel quel.

### 1.2 Second texte — TCL, Gödel, neuf pendules, shaders, arbre épineux

Quatre propositions, une thèse : *le TCL dit quand l'arbre pousse, Gödel dit où, les pendules et les shaders relient les deux*. Elles sont étudiées aux §4–7. Deux écarts avec la spec actuelle à noter d'emblée :

- la spec a **un** pendule à neuf crans (`docs/SPEC_PENDULE.md`, O1–O5, `pendule.ts`), pas neuf pendules. Les « 9 pendules » du texte se lisent comme les neuf crans ou les neuf bandes ; on ne crée pas neuf oscillateurs ;
- le pendule choisit le **parcours et la case de spawn**, jamais le contenu d'un étage (O2 de la spec). « L'arbre pousse » ne peut donc signifier que : *le sous-arbre visité dérive de la graine* ; la Tour, elle, ne pousse pas.

### 1.3 Les cinq figures

| Figure | Ce qu'elle montre | Ce à quoi elle parle dans Eidos |
|---|---|---|
| Quatre opérateurs (∇f, ∇·v, ∇×v, ∇²f) | pente, source, tourbillon, courbure nette d'un champ | la dalle 9 × 9 est un champ scalaire booléen : quatre lectures discrètes possibles (§6) |
| Intégrale gaussienne, ∬ e^{−(x²+y²)} = π | une cloche en deux dimensions, aire finie | la cloche du coffre (`CoffreScene`, z = e^{−(0,55x)²−(0,55y)²}) ; la concentration du TCL (§4) |
| Coordonnées sphériques et laplacien | (r, θ, φ), parts radiale / polaire / azimutale | la cage d'ornements (r, θ, φ, `SPEC_AUDIT_COFFRES`), la relique raymarchée, S³ des quaternions |
| Univers de Gödel | rotation, cônes qui basculent, courbes fermées, caustiques | boucles (échos), étages focaux (§5) ; la métrique elle-même : rien |
| Théorème central limite | la moyenne d'un échantillon devient normale, σ/√n | la moyenne par étape d'un run (§4) |

## 2. Ce qu'Eidos fait déjà — la carte et le parcours

Trois objets, trois statuts :

| Objet | Nature | Fixe ou dérivé | Fichier |
|---|---|---|---|
| La Tour | 255 coupes dans SU(2) ; par étage : biome, coupe, dalle 9 × 9, occupants, hôte | **fixe et public** (graine = SHA-256d(tag ‖ étage)) | `tour.ts`, `hotes.ts`, `secrets.ts` |
| Le parcours | 27 étapes = 9 bandes × 3 étages ; cran p ∈ 0..8 ; transition sur (graine, étape, cran, étage, choix, mot) | **dérivé de la graine et des actes** | `pendule.ts`, `ascension.ts` |
| La graine | libre : coffre ‖ tête locale (une lecture) ; ancrée : bloc signé ‖ pièce prouvée (ce qui compte) | libre : sans valeur ; ancrée : une pièce par run | `ascension.ts`, `ancrage.ts`, `docs/SPEC_SYBIL.md` |

La « carte procédurale » du texte est donc, dans Eidos, **le sous-ensemble de la Tour qu'une graine rend atteignable**, et l'« arbre » est le graphe des états du pendule. C'est ce qu'on mesure au §3.

## 3. L'arbre de visite, mesuré

### 3.1 Définition

Un **état** est un couple (i, p) : étape i ∈ 0..26, cran p ∈ 0..8 ; l'étage visité est `etageDe(i, p)`. Depuis un état, chaque **choix** lu en fin de salle (`monter`, `lire`, `offrir`) et le **mot** porté (`porte`) donnent, par `transition`, l'état suivant. Pour une graine et un mot fixés, l'ensemble des états atteignables et des arêtes est un graphe orienté sans cycle : **l'arbre de visite**. Il a au plus 27 × 9 = 243 nœuds et 3 arêtes sortantes par nœud ; le nombre d'**histoires** (suites de 26 choix) est 3²⁶ ≈ 2,5 × 10¹².

### 3.2 Mesure sur le coffre d'atelier (graine libre, transition gelée par `pendule.test.ts`)

| Mot porté | États atteignables | Arêtes distinctes | Étages visités par au moins une histoire | Étages jamais atteints |
|---|---|---|---|---|
| 0 | 190 / 243 | 392 | 190 / 255 | 65 |
| 1 | 200 / 243 | 409 | 200 / 255 | 55 |

Distribution du cran **final** (étape 26), en pourcentage des 3²⁶ histoires :

| p | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|---|
| mot 0 | 3,5 | 1,1 | 5,7 | 7,0 | 0,0 | 18,5 | 25,0 | 28,9 | 10,2 |
| mot 1 | 9,4 | 4,4 | 1,5 | 1,5 | 0,0 | 8,7 | 16,3 | 22,5 | 35,8 |

Cran moyen par étape : 3,98 (mot 0), 3,77 (mot 1). Étages **focaux** (traversés par toutes les histoires) : l'étage 0 (la porte de la ville, par construction) et, pour le mot 0, l'étage 20.

### 3.3 Ce que ces chiffres disent

- **La carte d'un run est un sous-arbre de la Tour**, pas la Tour : un quart des étages (55 à 65) n'est pas atteignable pour cette graine, et un autre quart ne l'est que par une poignée d'histoires. Voilà la « map procédurale » : la Tour reste publique et fixe, ce qui varie est *l'atteignable*. C'est exactement O2 de la spec du pendule, vérifié en chiffres.
- **Le cran final n'est pas uniforme** : deux crans concentrent la moitié des histoires, un cran est vide. Ce n'est pas un défaut de hachage ; c'est la somme de 26 pas (`+1 + h₀ mod 3 + tenue`, miroir sur les bandes impaires) qui concentre — le TCL avant toute proposition. Un joueur qui lit l'arbre sait donc que « finir en haut de la bande d'Uranie » est le cas courant et que finir en p = 4 est impossible : **la rareté d'une fin de run est déjà une distribution, pas une table**.
- **Les épines existent** : ce sont les états où beaucoup d'histoires convergent (fort degré entrant). Pour le mot 0, l'étage 20 est traversé par toutes ; d'autres le sont par une histoire sur trois. Ces étages sont la « caustique » de Gödel (§5) : là où les rayons se refocalisent. Ils dépendent de la graine et du mot porté, donc **du run** : on peut les lire, jamais les figer dans la Tour.
- **Le mot porté déforme l'arbre** (190 → 200 états, distribution finale retournée) : l'objet porté est bien un « pendule » qu'on pousse, au sens du texte, sans être un aléa.

Coût de la mesure : 243 états × 3 choix, entiers, quelques millisecondes ; une lecture (« figures ≠ preuves ») calculable dans le navigateur à chaque étape pour afficher *l'arbre restant* — ce qui est atteignable depuis l'état courant.

## 4. Le TCL comme loi du tronc

### 4.1 Ce que le texte propose, ce qu'on retient

Le texte veut *générer* un aléa gaussien par le TCL et régler la variance par « le nombre de pendules activés ». Deux corrections :

- Eidos ne génère pas d'aléa, il **hache** (`sha256d`, entiers). On n'a pas besoin de gaussienne pour tirer ; on en a une gratuitement en **sommant** : la somme de k octets de hachage est, à k ≥ 12, une cloche à l'échelle près (Irwin–Hall), en arithmétique entière exacte. Aucun flottant, aucune loi à échantillonner.
- La variance ne se règle pas avec des pendules multiples (il n'y en a qu'un) mais avec **n, le nombre d'étapes jouées** : c'est le σ/√n de la figure.

### 4.2 La loi de lecture : moyenne par étape

Définir, pour un run, une **mesure entière par étape** — le plus simple est le cran p lui-même, ou mieux la « hauteur » `etageDe(i, p) − debutBande(bande)` (la position dans la bande, 0 à ~28), qui dit *à quel point le pendule a poussé haut dans chaque bande* — et la **moyenne sur les n étapes jouées**. Par le TCL :

- un run de n = 9 étapes (un quartier, jusqu'à la première porte) a une moyenne très dispersée : un pari ;
- un run de n = 27 étapes concentre sa moyenne autour de la valeur attendue ; s'en écarter est **rare par la loi**, pas par un seuil décidé.

C'est la rareté continue du premier texte, appliquée aux runs : un trophée d'ascension « extrême » est celui dont la moyenne s'écarte de μ de plus de 2 σ/√n — et **σ/√n est plus petit à n = 27**, donc l'extrême y est plus méritant. Le juge (`jugerAscension`) peut recalculer μ et σ depuis la transition gelée : rien à croire.

### 4.3 « Le joueur choisit n » — décision O8

Aujourd'hui seule l'ascension arrivée au **sommet** s'exporte (`exporterAscension` refuse `fin ≠ "sommet"`). Le TCL suggère d'accepter l'export à toute étape n ≥ 9 (un quartier complet), avec n dans l'export et dans le jugement. Conséquences, dans l'ordre de la spec Sybil :

- **rien ne devient plus fort** : la moyenne par étape ne donne ni objet ni puissance ; elle qualifie un trophée (lecture) ;
- **une pièce par run** tient : exporter tôt consomme la même pièce ancrée qu'exporter tard ; on ne peut pas « rejouer » n = 9 dix fois avec la même pièce ;
- **la porte reste une porte** : un run arrêté par une porte fermée (`fin = "porte"`) est aujourd'hui non exportable ; avec O8 il le deviendrait à n = 9, 18 ou 27 — c'est-à-dire exactement la longueur permise par les sceaux du coffre. Les sceaux d'âge deviennent alors ce qu'ils promettent : **l'accès à un n plus grand, donc à une variance plus petite, donc à des trophées plus fiables**.

## 5. Gödel : boucles et caustiques, sans métrique

### 5.1 Ce qu'on garde de la figure

L'univers de Gödel montre trois choses : des cônes de lumière qui **basculent** avec le rayon, des courbes **fermées** de genre temps (revenir à son point de départ), et des **caustiques** (les géodésiques nulles issues d'un point se refocalisent). Traduites en figures d'Eidos :

| Figure de Gödel | Dans la Tour aujourd'hui | Ce qui manque |
|---|---|---|
| Cônes qui basculent avec r | les bandes impaires **inversent** le cran (`rangBande(k) % 2 === 1 ⇒ p ← 8 − p`) : le sens de la muse retourne l'espace une bande sur deux | rien : c'est déjà la torsion |
| Courbe fermée : revenir au même point avec un autre passé | les **échos** (44 paires d'étages de même orbite exacte) récompensent « monter le bas puis le haut sans redescendre » | dans une ascension, le pendule ne redescend jamais : la boucle ne se ferme pas |
| Caustique : où les rayons se refocalisent | les étages focaux de l'arbre de visite (§3) | ils ne sont ni lus ni montrés |

### 5.2 La boucle — décision O9

Proposition minimale, sans toucher à la transition gelée : **quand une ascension traverse le bas d'un écho puis, plus tard, son haut, le pendule peut renvoyer le joueur à l'étage bas, une fois, avec son état conservé** (élixirs bus, captures, alcôves ouvertes). C'est la courbe fermée du texte : le même étage public, un autre passé. Règles proposées :

- la boucle est un **choix** lu comme les autres (« relire ») : elle entre dans `choix[]` de l'export, l'export s'allonge, le juge la revalide ; rien n'est rejoué en cachette ;
- elle consomme le mercure de l'écho (l'élixir déjà prévu par `secrets.ts`), donc **une fois par paire** ;
- elle ne recule pas le compteur d'étapes : n avance toujours (le TCL du §4 reste vrai), seule la position dans la Tour revient en arrière ;
- elle ne rouvre pas une alcôve ni ne redonne un don d'hôte : le coffre se souvient (`tour.alcoves`, `tour.dons`), la Tour est fixe.

Ce qui est rejeté : la métrique `ds² = a²[dt² − dr² + ½e^{2r}dφ² − 2e^r dt dφ]`, r > log(1 + √2), tout calcul de cône. Une boucle est une règle de parcours, pas une géométrie.

### 5.3 La caustique — lecture

Les étages focaux se calculent depuis l'état courant : parmi les états atteignables, ceux que **toutes** les histoires restantes traversent. Les montrer (Uranie « lit » à l'observatoire ; la carte de la Tour dans `TourView` les marque) donne au joueur ce que le texte appelle « les épines » — les zones où l'on passera de toute façon — sans rien décider à sa place. Coût : la même énumération qu'au §3, restreinte au futur.

## 6. Les opérateurs et la sphère : quatre lectures de la dalle — décision O10

La dalle d'un étage est une grille 9 × 9 de booléens (`dalleDe`), publique et fixe. C'est un champ scalaire f : {0..8}² → {0, 1}. Les quatre opérateurs de la figure ont une version **discrète, entière** :

| Opérateur | Formule discrète (8-voisinage, entiers) | Lecture proposée |
|---|---|---|
| gradient ∇f | (f(x+1,y) − f(x−1,y), f(x,y+1) − f(x,y−1)) | la **pente** sous la case de spawn : vers où la dalle « monte » — le sens que l'hôte indique |
| divergence ∇·v | Σ des gradients sortants d'une case | les **sources** : cases d'où la dalle s'ouvre (n8 faible) |
| rotationnel ∇×v | circulation autour d'une case (différence croisée) | les **tourbillons** : où la dalle tourne, lecture d'Uranie |
| laplacien ∇²f | Σ_voisins f − 8 f | la **tension** : la croix de l'alcôve a un laplacien remarquable (centre à −4 + 4 = 0, bras à −7 + …) : l'alcôve se *lit* sans indice, ce que `secrets.ts` promet |

Ces quatre nombres par étage sont des **figures** au sens du dépôt : ils ne donnent rien, ils disent. Ils peuvent nourrir les répliques des hôtes (« la dalle penche vers le nord ») et l'observatoire. Ils coûtent 81 cases × 8 voisins. Aucun flottant.

La gaussienne et la sphère n'appellent rien de neuf : la cloche du coffre est déjà e^{−r²} (une figure), la relique et la cage vivent déjà en (r, θ, φ), et l'espace des objets est déjà S³ par Shoemake entier. On note seulement, pour le rendu, que ∬ e^{−r²} = π est la raison pour laquelle la cloche du coffre a une **aire finie** quel que soit le solde : son pic monte, son pied ne s'étale pas — la scène le respecte déjà.

## 7. Le pendule et les shaders : la matière qui bascule — décision O11

Le texte veut que « les pendules déforment la matière en temps réel ». Dans Eidos le cran p est un **état public du run**, pas un aléa ; le faire voir est légitime et peu coûteux, maintenant que le socle du rendu (lumières partagées, halo, brouillard, matières) est en place :

- **bascule de la dalle** : incliner le groupe de la dalle de (p − 4) · θ autour de l'axe de la muse (θ ≈ 3°), avec transition douce entre deux fins de salle ; une prop `cran` sur `TourCanvas`, aucun GLSL ;
- **teinte de la bande** : la contre-lumière porte déjà la teinte du biome ; la bande impaire (miroir) peut inverser la clé et la contre — le « cône qui bascule » se voit sans métrique ;
- **dilatation visuelle** : la relique a déjà sa phase (`danse.ts`, période 11,3 s) ; on ne synchronise pas les scènes sur le pendule (le pendule ne bouge qu'en fin de salle).

Rejeté : la visualisation de la « courbure » par vertex shader déformant la géométrie (multi-pass, coût mobile, et rien à montrer : la Tour n'est pas courbe, elle est tordue une bande sur deux, ce que la bascule dit déjà).

## 8. Ce qu'on rejette, et pourquoi

| Idée | Raison |
|---|---|
| Dériver quoi que ce soit des équations de Maxwell | le premier texte le dit lui-même : « elles ne servent à rien ici » ; aucune structure de jauge continue dans un jeu à entiers |
| Neuf pendules indépendants | la spec en a un (O1–O5), branché et testé ; neuf oscillateurs = neuf aléas, la lisibilité du parcours disparaît |
| Métrique de Gödel, cônes, courbes de genre temps | une géométrie lorentzienne n'a pas de contrepartie dans un espace d'étages entiers ; on garde boucle et caustique comme règles |
| Le TCL pour *générer* un aléa gaussien | Eidos hache ; une gaussienne entière s'obtient en sommant si besoin, sans loi à échantillonner |
| Un VRF ou un commit-reveal contre le producteur de bloc | l'ancrage prend un bloc **déjà signé** et une pièce **déjà prouvée** ; le producteur ne connaît ni le coffre ni le choix de la pièce. La seule liberté du joueur est de choisir *quelle* pièce ancrer — une pièce par run, c'est le prix voulu (`SPEC_SYBIL`). À revoir seulement si la fédération devenait ouverte |
| Faire pousser la Tour (« l'arbre grandit ») | O2 : le contenu d'un étage est public et fixe ; ce qui pousse est le sous-arbre atteignable, et il est déjà là |
| Verrou de navigateur ou de machine pour « orienter » le hasard | déjà refusé (`SPEC_SYBIL` §1) |

## 9. Décisions qui reviennent à l'auteur

| # | Décision | Recommandation |
|---|---|---|
| O8 | Export d'une ascension **avant le sommet**, à n ∈ {9, 18, 27} (quartiers), avec n et la moyenne par étape dans l'export et le jugement | **oui** : donne aux sceaux d'âge un sens statistique (n plus grand = variance plus petite), sans nouveau pouvoir |
| O9 | **Boucle d'écho** dans une ascension : revenir une fois à l'étage bas d'un écho traversé, état conservé, choix « relire » noté dans l'export | **oui, après O8** : c'est la seule courbe fermée qui respecte la Tour fixe |
| O10 | Quatre **lectures de la dalle** (gradient, divergence, rotationnel, laplacien) exposées à Uranie et aux hôtes | **oui, petit** : un module pur, entiers, 4 tests |
| O11 | **Bascule de la dalle** selon le cran, teinte inversée sur les bandes miroir | **oui, après le chantier des shaders** : une prop, zéro GLSL |
| O12 | Afficher **l'arbre restant** et ses étages focaux pendant une ascension (carte de la Tour) | **oui, lecture seulement** : jamais un indice sur le contenu d'un étage non visité |

À ne pas décider ici : O6 et O7 de `SPEC_PENDULE.md` restent ouverts et indépendants.

## 10. Esquisse technique (si O8–O12 sont acceptées)

Tout dans `atelier/src/lib/eidos/`, jauge hors feuille, aucune loi d'`integrite.ts` touchée, aucun flottant.

- `arbre-visite.ts` : `arbreDe(graine, mot, depuis?: {i, p})` → `{ etats: Set<i·9+p>, aretes, histoires: bigint[][] }` par programmation dynamique (243 états, BigInt pour les 3²⁶ histoires) ; `focaux(arbre)` → étages traversés par toutes les histoires restantes ; `distributionFinale(arbre)` → 9 entiers. Tests : le coffre d'atelier donne 190 états et 392 arêtes pour le mot 0 (vecteur gelé, à régénérer sciemment avec `pendule.test.ts`) ; l'étage 0 est toujours focal ; la somme des histoires vaut 3²⁶.
- `ascension.ts` / `ancrage.ts` (O8) : `exporterAscension` accepte `fin ∈ {"sommet", "porte"}` si `etape ∈ {9, 18, 27}` ; l'export porte `n` ; `jugerAscension` revalide n étapes et recalcule μ et σ/√n depuis la transition. Un test par longueur, un test « n = 8 refusé ».
- `secrets.ts` / `ascension.ts` (O9) : choix `"relire"` ajouté à `CHOIX` **⇒ la table de vérité du pendule change** (`transition` hache l'indice du choix) : régénération volontaire de `pendule.test.ts`, une fois, documentée. Noter la boucle hors de `choix[]` n'est pas une alternative : le juge doit rejouer la suite exacte des choix, boucle comprise. Décision O9 emporte la régénération.
- `dalle-lectures.ts` (O10) : `gradient`, `divergence`, `rotationnel`, `laplacien` sur `boolean[][]`, entiers, 8-voisinage borné ; 4 tests dont « la croix de l'alcôve a le laplacien attendu ».
- `TourCanvas.tsx` (O11) : prop `cran`, bascule (p − 4) · 3° sur le groupe de la dalle ; `TourView` la passe depuis `tour.ascension.p`.
- `TourView` / carte (O12) : les étages atteignables en clair, les focaux marqués ✚, les autres en creux ; rien sur leur contenu.

Ordre : O10 (pur, isolé) → O12 (lecture, s'appuie sur `arbre-visite.ts`) → O8 → O11 → O9 (le seul qui régénère une table gelée).

## Annexe — la mesure du §3, reproductible

```ts
// node --experimental-strip-types, depuis atelier/, fichier posé dans src/lib/eidos/
import { CHOIX, ETAPES, CRANS, etageDe, penduleInitial, transition } from "./pendule.ts";
import { graineLibre } from "./ascension.ts";
import { coffreAtelier } from "./wallet.ts";
const graine = graineLibre(coffreAtelier("vide"));
for (const mot of [0, 1]) {
  const chemins = Array.from({ length: ETAPES }, () => Array(CRANS).fill(0));
  const aretes = new Set<string>();
  chemins[0]![penduleInitial(graine)] = 1;
  for (let i = 0; i + 1 < ETAPES; i++) for (let p = 0; p < CRANS; p++) {
    const n = chemins[i]![p]!; if (!n) continue;
    for (const c of CHOIX) { const { p: pp } = transition(graine, i, p, etageDe(i, p), c, mot); chemins[i + 1]![pp]! += n; aretes.add(`${i}:${p}>${pp}`); }
  }
  console.log(mot, chemins.flat().filter(Boolean).length, aretes.size, chemins[ETAPES - 1]);
}
```

Résultat le 2026-09-04 (transition gelée par `pendule.test.ts`) : 190 états et 392 arêtes pour le mot 0, 200 et 409 pour le mot 1 ; 3²⁶ histoires dans les deux cas.
