# Spec — le brouillard des antres

**Dépôt :** Oykdo/Eidos
**Statut :** spec proposée (2026-09-04), décisions B1–B5 (§8) à prendre par l'auteur avant tout chantier. Rien n'est implémenté.
**Source :** une loi physique et son échappatoire, telles que l'auteur les a mises au point dans un travail séparé et privé (PHASMA). Seuls les deux principes **publics et classiques** qu'il invoque sont repris ici : le théorème d'Earnshaw (1842) et la réponse multiplicative à deux entrées. Rien d'autre de ce travail n'est cité ni décrit dans ce dépôt.
**Règle de lecture :** le brouillard est une jauge, hors feuille. Il se lit, il ne se prouve pas ; tout est entier ; rien n'est tiré au sort. Figures ≠ preuves.

## 1. La loi, en deux phrases

1. **Aucune lumière posée au bord n'éclaire l'intérieur.** Dans une région sans source, l'intensité d'un champ est *sous-harmonique* : son maximum est **au bord**, et toute réponse monotone de cette intensité l'est aussi. On peut pousser la lampe, élargir le halo : jamais un pic à l'intérieur (Earnshaw).
2. **La seule échappatoire est la coïncidence.** Une réponse **produit de deux entrées indépendantes**, `S = f₁ · f₂`, n'est pas sous-harmonique : deux faisceaux qui se croisent font un point à l'intérieur, et hors du croisement l'un des deux facteurs s'annule, donc **rien ne fuit le long des barres**. Une réponse « somme » ou « max » fuit le long de chaque faisceau ; le produit isole un point.

Transposé à la Tour : **l'antre est dans la brume ; la brume ne se dissipe pas depuis la porte ; elle se perce là où deux lumières de nature différente se croisent.**

## 2. Ce qu'Eidos a déjà

| Pièce | Fichier | Usage dans le brouillard |
|---|---|---|
| la dalle 9 × 9 d'un étage, pleins et trous | `tour.ts` (`dalleDe`) | le relief que la brume cache |
| l'antre, son gardien, le duel en trois temps | `secrets.ts` (`lireDuel`, `franchirAntre`) | le gardien a désormais une **case**, à trouver avant le duel |
| l'objet porté, la capture libérée, les élixirs (sel, mercure, soufre) | `capsules.ts`, `elixirs.ts` | les **entrées** des faisceaux |
| les cases de la dalle : arrivée du pendule, occupants, bêches | `fouilles.ts` (`caseOccupant`, `spawnIci`) | la même grille, les mêmes cases |
| la clarté par cellule du rendu (trame et occlusion) | `components/canvas/texel.ts` | la brume se dessine avec le même vocabulaire de clarté |
| les étages focaux de l'arbre de visite | `docs/ETUDE_ARBRE_VISITE.md` §3 | les antres sont les caustiques de l'arbre : les lieux où l'on passe de toute façon |

## 3. La brume et le bord

Une **lampe** est une source posée sur une case du **bord** de la dalle (l'anneau des 32 cases). Sa clarté, entière, décroît avec la distance de Tchebychev `d∞` : `C(c) = max(0, 3 − d∞(c, lampe))`. La clarté d'une case est le **max** sur les lampes posées. Conséquence, exacte et testable :

- une lampe éclaire au plus deux cases vers l'intérieur ;
- les cases à distance ≥ 3 de tout le bord, c'est-à-dire les **neuf cases centrales** (x, y ∈ {3, 4, 5}), ont une clarté nulle **quelle que soit** la disposition des lampes : c'est l'intérieur d'Earnshaw ;
- ajouter des lampes élargit le halo, ne crée jamais de pic intérieur (le max de fonctions décroissantes depuis le bord reste maximal au bord).

Le joueur qui entre dans un antre tient sa lampe à la porte : il voit les deux premières rangées, et une nuit au milieu. **Le gardien est dans la nuit** : sa case est l'une des neuf centrales (§5).

## 4. Les faisceaux et la coïncidence

Un **faisceau** part d'une case du bord et traverse la dalle en ligne droite : une **ligne** `y` depuis le bord gauche ou droit, une **colonne** `x` depuis le haut ou le bas. Un faisceau a une **couleur** : la nature de l'entrée qui le porte.

| Couleur | Entrée | Où il naît |
|---|---|---|
| ambre | l'**objet porté** (`tour.porte`) | la case d'arrivée du pendule, s'il y en a une ; sinon la case choisie |
| vert | la **capture libérée** (`tour.liberee`), ou à défaut un **élixir de soufre** bu à cet étage | la case choisie |

Règles, toutes entières, aucune tirée au sort :

1. **Un faisceau seul ne révèle rien.** La réponse de la brume est multiplicative : `S(c) = A(c) · V(c)` où `A` vaut 1 sur les cases de la barre ambre, `V` sur celles de la barre verte, 0 ailleurs. `S` vaut 1 sur **une seule case**, le croisement, 0 partout ailleurs : le **voxel**. Deux barres de même couleur ne se croisent pour rien (`A · A` n'est pas une coïncidence : une seule entrée).
2. **Rien ne fuit le long des barres.** Hors du croisement l'un des facteurs est nul : la brume y reste entière. C'est la propriété qui distingue la coïncidence de toute « somme » de lampes.
3. **La fuite existe si l'on baisse le seuil.** Un **élixir de soufre** bu à cet étage rend la réponse linéaire le long des barres (« somme ») : les cases traversées montrent leur **relief** (plein ou trou), jamais le gardien, jamais un occupant. C'est la diaphonie de la loi, devenue une lecture : dix-sept cases de relief pour deux barres.
4. **Trois coïncidences par antre et par coffre** (`tour.brumes : [étage, x, y][]`, jauge, relecture plafonnée à trois par étage, comme `tour.fouilles`). Une case percée le reste pour ce coffre : la brume dissipée ne revient pas. Une coïncidence à côté du gardien ne coûte rien d'autre que la coïncidence.

## 5. La case du gardien, et comment on la déduit

Le gardien se tient sur l'une des neuf cases centrales : celle où le **laplacien discret** du relief est le plus grand en valeur absolue, `∇²f(c) = Σ_voisins f − 8·f` sur le 8-voisinage (les cases hors dalle comptent comme trous) ; à égalité, la première dans l'ordre (y, x). Règle **publique, fixe, entière** : c'est la caustique de la dalle, le point où le relief se concentre le plus (`docs/ETUDE_ARBRE_VISITE.md` §6, lecture O10).

Le jeu de l'antre devient une **déduction** : deux barres avec le soufre donnent le relief le long de deux lignes ; la carte du quartier, les fouilles faites et la mémoire des visites précédentes complètent ; on choisit le croisement. Trois coïncidences suffisent à qui lit ; à qui ne lit pas, une chance sur trois par coïncidence sur neuf cases — sans lecture, on ne trouve pas.

Le gardien **trouvé** (sa case percée), le duel en trois temps s'ouvre tel qu'il est écrit (`lireDuel`) ; avant, « Franchir l'antre » reste fermé et l'antre dit : « le gardien est dans la brume ». Repoussé, le gardien ne change pas de case : la brume percée est acquise, on revient.

## 6. L'antre et l'Arbre

Les antres sont les **étages focaux** de l'arbre de visite : les cases (étape, cran) où les histoires se refocalisent (§3.3 de l'étude). La brume y prend son sens :

- l'**arrivée du pendule** fixe la case de naissance du faisceau ambre : le parcours choisi (le pendule, la décision de fin de salle) décide **d'où** l'on éclaire. Deux parcours différents entrent dans le même antre par deux barres différentes : la même nuit, deux manières de la percer ;
- une case percée reste percée pour le coffre : revenir à un antre par une autre branche de l'arbre, avec une capture ou un soufre qu'on n'avait pas, rouvre le jeu. C'est le retour en arrière qui paie, la règle du cap metroidvania (`docs/CAP_METROIDVANIA.md` §3) ;
- hors ascension, la case de naissance est libre : l'exploration libre lit ; l'ascension ancrée subit son arrivée.

## 7. Rendu

Le socle du rendu fournit déjà la clarté par cellule (`texel.ts`, facteur sRGB multiplicatif) et le brouillard de scène (`brouillard()` vers #12151a). La brume d'un antre est **un facteur de clarté par case** : `1` pour une case percée ou dans le halo de la lampe (`C(c) > 0`), `0,35` pour une case de barre lue au soufre (le relief se voit, la couleur non), `0` pour la nuit — la case prend la couleur du fond, exactement. Aucun GLSL nouveau, aucune texture : une couleur d'instance. La scène de la Tour rend à la demande ; une coïncidence est un rendu.

## 8. Décisions qui reviennent à l'auteur

| # | Décision | Recommandation |
|---|---|---|
| B1 | La seconde couleur : capture libérée seulement, ou soufre à défaut | **soufre à défaut** : un antre reste jouable sans capsule, la capture reste la voie noble |
| B2 | Le nombre de coïncidences par antre : 3, comme les bêches | **3** : avec la déduction, c'est large ; sans, c'est court |
| B3 | La règle du gardien (laplacien maximal) dite dans le Guide, ou laissée à découvrir | **dite** : une règle publique se lit, ce qui est caché doit l'être par la brume, pas par le texte |
| B4 | La brume aux antres seulement, ou à toutes les salles à partir du deuxième quartier | **antres seulement** d'abord ; l'étendre est une ligne de plus si le jeu le demande |
| B5 | La lampe à la porte : deux rangées, ou une seule | **deux** : la nuit centrale fait 9 cases ; à une rangée elle en ferait 25 et la déduction deviendrait un tirage |

## 9. Esquisse technique

`atelier/src/lib/eidos/brume.ts` (jauge, entiers, sans dépendance) :

- `NUIT = { x: 3..5, y: 3..5 }` ; `clarteLampe(c, lampes)` = max(0, 3 − d∞) ; `estNuit(c)` ⇔ clarté nulle pour toute lampe du bord (testé par énumération des 32 lampes) ;
- `barre(entree)` : les 9 cases d'une ligne ou d'une colonne ; `coincidence(ambre, vert)` : la case unique du croisement, `null` si même axe ou même couleur ;
- `laplacien(dalle, c)`, `caseGardien(etage)` : la case centrale de |laplacien| maximal, ordre (y, x) ;
- `percerDansCoffre(c, etage, xA, yV)` : refus `couleur` (deux entrées identiques ou seconde absente), `epuise` (trois), `deja` ; sinon note `[étage, x, y]` dans `tour.brumes` et dit si le gardien est là ;
- `reliefLu(coffre, etage)` : les cases de relief visibles (halo + barres au soufre + percées) ;
- `secrets.lireDuel` : ajoute `trouve: boolean` ; `franchirAntre` refuse `brume` tant que la case du gardien n'est pas percée.

Contrôles (`brume.test.ts`, assert nus) : la nuit fait 9 cases pour toute disposition de lampes ; une barre seule ne perce rien ; deux couleurs percent une case et une seule ; même couleur : rien ; soufre : relief le long des barres, jamais le gardien ; la case du gardien est centrale pour les 255 étages ; trois coïncidences, relecture plafonnée ; le duel ne s'ouvre qu'une fois le gardien trouvé. Vue : la dalle de `TourView` porte déjà les cases cliquables ; l'antre y ajoute le choix de deux bords. Jauge `tour.brumes` relue par `normaliserTour` (triplets bornés, comme `fouilles`).

## 10. Ce qu'on ne fait pas

- Aucun aléa : la case du gardien, la clarté, la coïncidence sont des fonctions du relief public et des choix du joueur.
- Aucune intensité continue : trois niveaux de clarté, entiers ; pas de champ flottant.
- Rien de ce qui compte : percer la brume ne donne ni pièce ni objet ; l'antre franchi donne ce qu'il donne déjà (`"eidos-antre/1"`).
- Rien du travail privé de l'auteur au-delà des deux principes du §1.
