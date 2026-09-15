# Bible de conception — La Veillée (tactical RPG au tour par tour sur Eidos)

**Dépôt :** Oykdo/Eidos. **Statut :** bible **v2** (2026-09-10), branche `tactique-moteur`.
La **v1** (2026-09-07) répondait au prompt `docs/PROMPT_ROGUELIKE_XMSS.md` et décrivait un *roguelike de parcimonie* où « le seul adversaire est le compte des feuilles ». Ce n'est plus vrai : depuis `e9acf52`, `c3703a2` et `14fe665`, il y a un moteur de bataille, un adversaire et une résolution. On ne réécrit pas le passé — la v1 reste lisible dans l'historique (`git show 719ca7a:docs/BIBLE_VEILLEE.md`) et le prompt d'origine est inchangé ; cette version la **remplace** et **date** ses écarts (§0.2).
**Règle de lecture :** chaque mécanique porte son état.
[FIXE] loi ou lore existant, on ne le rediscute pas · [CODÉ] vérifiable aujourd'hui dans `atelier/`, fichier et constante cités · [SPÉCIFIÉ] écrit dans une spec, pas une ligne de code · [PROPOSÉ] décidé ici, falsifiable · [OUVERT] à trancher par l'auteur.
Figures ≠ preuves. Ce qui compte est ancré, ce qui est libre ne vaut rien. Aucune mythologie neuve : chaque figure cite sa source (§11). **Quand un texte promet plus que le code, c'est le texte qui a tort** — et c'est le texte qu'on corrige.

---

## 0. Ce qui change de la v1

### 0.1 En cinq lignes

**La Veillée est un tactical RPG au tour par tour** (arbitrage d'auteur, `e8816b8`), et non plus un roguelike de parcimonie : la parcimonie reste, elle n'est plus le jeu, elle en est le prix. L'adversaire s'appelle les **Indéchiffrés** et il est déjà dans le lore — les mots qu'aucune des 101 formes du catalogue n'approche, donc sans cellule, donc sans nom, donc illisibles.
**Le combat existe et il est entier** : dalle 9×9 de l'étage, zéro dé, deux points d'action par unité et par tour, riposte, zone de contrôle, rejeu à l'octet (`traceBataille`). 79 contrôles, `atelier/src/lib/eidos/tactique/`.
**Il y a des points de vie et il faut le dire** : la `tenue` vaut 48 à 176, `encaisser` la soustrait, `reprendre` la remonte. Aucune des six lois de `integrite.ts` ne l'interdit ; la doctrine « aucun point de vie » est de `SPEC_TOUR.md:14`, écrite quand il n'y avait pas de combat. La v2 **assume la tenue** et écrit en quoi elle n'est pas un point de vie classique (§3).
**La run passe de 27 salles à neuf**, une par bande donc une par muse, et le sac à 81 places. Toute l'arithmétique en découle : **morts + butin ≤ 24** (§6).
**Ce qu'une feuille signe change** : plus un coup porté, **une mort** — arbre de hauteur 5, 32 feuilles. Une clé ne signe qu'une fois, et c'est la vie : littéralement (§4).

### 0.2 Table des écarts

| v1 (2026-09-07) | v2 (2026-09-10) | Pourquoi |
|---|---|---|
| « pas de points de vie », et « des points de vie déguisés » dans ce qu'on ne fait pas | la **tenue** assumée et bornée, §3 | `tactique/unite.ts` en a depuis `e9acf52` ; le texte mentait |
| « le seul adversaire est le compte des feuilles » | les **Indéchiffrés**, §7 | `SPEC_TACTIQUE.md` §6 ; une ambiance n'est pas un conflit |
| 27 salles, 26 franchir | **9 salles, 8 franchir** — une par bande, une par muse | décision d'auteur ; `ETAGES_PAR_BANDE : 3 → 1` suffit (§6.1) |
| sac de 27 places | **81 places** (`SAC_PLACES`, codé) | dalles dégagées : les salles rendent trois fois plus |
| une feuille = un geste, dont « franchir » 26 fois | une feuille = **une mort** (+ franchir, + butin), §4 | trois ennemis par salle ne se paient pas au coup |
| arbre h = 6, 64 feuilles | **h = 5, 32 feuilles** [PROPOSÉ] | le budget du §4.3 ; `HAUTEUR_VEILLEE` est une constante, `Veillee.hauteur` voyage déjà dans l'export |
| score = salles × 64 + butin | classement **lexicographique** (salles, retirés, butin) | aucun poids de concepteur, la règle de `tactique/ia.ts` |
| gestes : franchir, parler, ouvrir, prendre | + **abattre** ⇒ format `eidos-veillee/2` | un geste de plus ne se glisse pas dans un tag gelé |
| fin de salle = le pendule propose | fin de salle = **la sortie ou la salle vide**, §5 | sans sortie, éviter un combat n'existe pas |

Tout le reste de la v1 **tient et n'est pas réinventé** : la feuille comme vie, l'arbre XMSS engagé dans chaque message, le jour prouvé par deux têtes signées, la Tour publique et fixe, le sac et l'extraction, la preuve jugée sans rejeu, les fantômes et leurs six tournures, la permadeath comme théorème et non comme règle, libre contre ancrée.

## 1. Vision

**La promesse, en une phrase.** *Une clé ne signe qu'une fois, et c'est la vie* : tu montes neuf salles avec trente-deux feuilles, chaque mort que tu donnes en brûle une, et quand l'arbre est nu tu blesses encore mais tu n'abats plus — tout ce que tu as signé reste vrai, pour toujours, pour quiconque veut le vérifier.

**Ce que c'est.** Un **tactical RPG au tour par tour** posé sur la Tour d'Eidos [FIXE] (255 coupes, neuf muses, quatre quartiers, portes à sceau). Zéro dé, zéro serveur, zéro aléa client : la seule ressource est cryptographique, l'adversaire est ce que la Tour ne sait pas lire, la seule preuve est une signature. Le réseau ignore le jeu ; il fournit deux choses rares, un bloc et une pièce, et le jeu en fait un jour.

**Quatre boucles.**

| Boucle | Durée | Ce qu'on fait | Ce qui en reste |
|---|---|---|---|
| **la bataille** | 8 à 20 tours, 4 à 6 min | la dalle 9×9 de l'étage ; un à trois Indéchiffrés ; deux points d'action par unité et par tour, un pas, un coup ; on lit tout avant d'agir, parce que lire est gratuit et qu'abattre ne l'est pas | une salle vide (donc lisible) ou une sortie franchie ; une feuille par mort dans la preuve |
| **la salle** | dix minutes | la bataille, puis — et seulement si la salle est vide — l'hôte, la bêche, la capsule, le coffret ; puis franchir | des dons, des trouvailles, des captures dans le **sac** ; des lumens du tier des abattus |
| **la veillée** | un jour | neuf salles identiques pour tous, une par bande, ancrées sur le premier bloc du jour et sur une pièce ; trois moments d'arrêt honorables (salles 3, 6, 9) | une preuve `eidos-veillee/2` : jugée sans rejeu, classée, relue comme un fantôme |
| **l'âge** | des semaines | les sceaux d'âge ouvrent les quartiers ; l'âge du bloc d'ancrage date chaque preuve ; le roster se recrute et se perd | un coffre plus large — jamais plus fort —, des preuves d'âges différents, des fantômes en écho |

**Libre ou ancrée** [CODÉ, `veillee.ts`, `Veillee.ancre = null`]. Une veillée peut être **libre** : les mêmes salles du jour, le même arbre, aucune pièce — une lecture, qui ne s'exporte pas et que le juge refuse. C'est ainsi que joue le coffre d'atelier, dont la graine est publique. Ce qui compte est ancré ; ce qui est libre ne vaut rien, et se joue quand même.

**Ce qui n'a pas changé et ne changera pas.** Le nœud, la chaîne, le carnet, `eonis.py`, `genesis.json`, `FORMAT 3`, `vecteurs.json`, les six lois de `integrite.ts`. La bataille est un **dérivé hors chaîne**, comme l'ascension et le coffre horaire. Aucune ligne de Python.

## 2. La bataille — ce que le code fait aujourd'hui [CODÉ]

Tout ce paragraphe se vérifie dans `atelier/src/lib/eidos/tactique/` : `types.ts` (240 l.), `unite.ts` (233 l.), `grille.ts` (316 l.), `bataille.ts` (533 l.), `ia.ts` (344 l.). **79 contrôles** : grille 18, unité 17, bataille 44 ; `ia.ts` n'a pas encore son fichier de contrôles.

### 2.1 La grille

La dalle 9×9 de l'étage (`tour.ts`, `dalleDe`), telle quelle, **cases pleines en obstacles**. Depuis `e9acf52` la dalle lit **deux bits par case** (mur si les deux sont posés) : un quart de murs au lieu de la moitié, et la plus grande pièce d'un seul tenant passe de 19,8 à **56,8 cases sur 81** en moyenne (min 13). Quatre directions, distance de Manhattan, parcours BFS entier exploré en N, E, S, O — l'ordre est la règle, pas un détail : deux appels rendent la même suite de cases. **Zone de contrôle** : une unité tient ses quatre orthogonales ; on y entre, on n'en repart pas.

LIMITE codée et assumée : la portée ignore les murs et la ligne de vue. On frappe à travers une case pleine (`grille.ts`, LIMITE).

### 2.2 Les quatre axes, et leur prix

`combat.ts`, somme toujours 64 [FIXE, loi de conservation]. Chaque axe est payé **une fois** :

| Axe | Ce qu'il achète | Lecture | Amplitude |
|---|---|---|---|
| `lame` | le socle du coup | `COUP_BASE + lame` | 24 à 88 |
| `ecu` | la **tenue**, et rien d'autre | `TENUE_BASE + MULT_TENUE·ecu` | 48 à 176 |
| `eperon` | le pas, le rang de phase, la **riposte**, la **charge** | `PAS_BASE + eperon/DIV_PAS` | 2 à 4 pas |
| `arc` | la portée, la reprise, l'**allonge** | `PORTEE_BASE + arc/DIV_PORTEE` | 1 à 7 cases |

`ecu` n'entre pas dans la résolution du coup : il se payait deux fois, et le lui retirer fait tomber r(ecu, victoire) de +0,59 à +0,14. **Le pas et la portée se règlent ensemble** — le pas le plus long reste sous la portée la plus longue, sinon un archer est rattrapé avant d'avoir tiré (mesuré à pas 4..8 : r(arc) = −0,48) ; `unite.test.ts` le contrôle par pas, et affirme qu'un tour (deux pas, 8 > 7) la rompt. Remesuré le 2026-09-13 avec la politique du dépôt (`scripts/banc-r2.ts`, 440 320 duels) : l'archer n'est pas rattrapé, il domine — r(arc) = **+0,591**, r(eperon) = **−0,640** — et ramener le pas d'un tour sous la portée (`DIV_PAS = 64`) ne change rien. C'est la dette D9 de la feuille de route ; `DIV_PAS` reste à 32.

### 2.3 La résolution — zéro dé

```
base    = COUP_BASE + a.lame                                                    24..88
accord  = ± base/DIV_ACCORD      polarité de deux quaternions (resonance.ts)     ±6..22
dos     = + base/DIV_DOS         a, d et la case quittée par d alignés           12..44
allonge = + base/DIV_ALLONGE     distance > portée de d ; d contre quand même     6..22
charge  = CHARGE_PAR_CASE × élan cases parcourues ce tour, au plus pas(a)         0..16
porte   = max(COUP_MIN, base + accord + dos + allonge + charge)                 18..192
```

Constantes, `types.ts` : `COUP_BASE` 24 · `COUP_MIN` 1 · `DIV_ACCORD` 4 · `DIV_DOS` 2 · `DIV_ALLONGE` 4 · `CHARGE_PAR_CASE` 4 · `DIV_REPRISE` 8 · `PA_PAR_TOUR` 2 (`COUP_BASE` 16 et `DIV_ALLONGE` 2 jusqu'au 2026-09-14, C2 ter). Toutes les divisions sont entières. L'accord n'est pas une table de concepteur : c'est le produit scalaire de deux quaternions. Le dos est **purement positionnel** — aucun axe ne l'achète, ce qui est la seule raison pour laquelle on peut le modifier sans re-tarifer quoi que ce soit (§12, V7).

### 2.4 La riposte, les points d'action, la fin

**Riposte** : frappée, une unité **strictement** plus vive (`d.eperon > a.eperon`) rend le coup à qui l'a frappée, d'où qu'il ait frappé — un **contre**, un éperon et non un tir, jamais d'allonge sur le coup rendu. Elle ne consomme **ni feuille ni point d'action** — personne ne la choisit — et **on ne riposte jamais à une riposte**. Jusqu'au 2026-09-14 elle exigeait aussi la portée du riposteur (l'exacte négation de l'allonge) : c'est ce qui rendait `eperon` gratuit et `arc` roi, et C2 ter l'a levé — l'allonge est un bonus, plus une impunité.

**Deux points d'action par unité et par tour** (`PA_PAR_TOUR`), plats pour toutes. Un pas en coûte un ; un coup en coûte un **et une feuille** ; `passer` les vide et interdit la reprise. L'ordre est libre : avancer puis frapper (avec la charge), **frapper puis se retirer**, avancer deux fois, frapper deux fois. Le prix ne dépend d'aucun axe — `eperon` en a déjà quatre.

**Ordre de phase** : `eperon` décroissant, à égalité id croissant. Imposé aux Indéchiffrés, simple suggestion pour le joueur.

**Fin** : `victoire` (aucun Indéchiffré vivant), `defaite` (aucune unité du coffre), `epuise` (plus une feuille). La v2 change le sens du troisième (§4.4).

**Télégraphie** : avant le tour du joueur, chaque Indéchiffré annonce sa case cible et son type d'attaque. C'est une **figure** : elle n'engage rien, elle se lit gratuitement, elle devient fausse si le joueur déplace la cible. *Lire est gratuit, signer coûte une feuille* devient littéralement la règle de combat.

**Trace** : `traceBataille` empreinte l'échiquier — étage, unités par id (camp, mot, case, case quittée, élan, tenue, PA), tour, phase, feuilles. Ni le journal ni les intentions n'y entrent : le journal se déduit des actes, l'intention est une figure. Deux rejeux d'une même suite d'actes rendent la même trace, à l'octet. **C'est la condition pour qu'un juge en CI arbitre une bataille sans croire personne.**

### 2.5 Ce que la mesure dit, et ce qu'elle ne dit pas

- Les quatre |r| tiennent sous **0,13** ; le rapport quartile haut / quartile bas de `lame+ecu` vaut 1,00× contre 19× à l'origine : **la réserve bloquante de `SPEC_LOOT_TIERS.md` §4 est levée**.
- Une bataille dure **2 coups en médiane, 4 au 95ᵉ centile** ; aucun coup ne porte zéro (le plus faible mesuré vaut 12).
- **LIMITE, mesurée** : l'extrémité d'un mot reste un malus, pas un sidegrade — 55,6 % de victoires au tier le plus bas, 19,5 % au plus haut, et la décroissance tient **dans la niche** (93,9 % → 57,6 %). La cause est arithmétique : abattre demande de tenir *et* de frapper, un produit, et concentrer un budget fixe sur un axe minore un produit. L'agrandissement des salles ne la referme pas (41,5 → 36,4 points).
- **LIMITE** : tout cela est mesuré en **duel 1 contre 1**. La formation, la télégraphie exploitée et le choix du moment d'engager ne le sont pas — et c'est précisément là que `SPEC_TACTIQUE.md` §3 place l'espoir du malus d'extrémité.
- **LIMITE** : le recalibrage `DIV_PAS` 12 → 32 a fait tomber le plafond de la charge de 28 à **16**. La charge est le seul terme qui fasse varier le coup avec la case (2,00 valeurs distinctes contre 1,00 pour l'accord et pour le dos) : elle a perdu 43 % d'amplitude et personne ne les lui a rendus (V7).

### 2.6 Ce qui n'est pas fait

Le rendu à l'écran ; le branchement sur la Veillée (`veillee-tour.ts` connaît encore parler / creuser / prendre / franchir, pas la bataille) ; le dépôt d'une preuve de bataille ; les Indéchiffrés comme mots (le camp existe, `CAMPS[1]`, ses habitants non) ; la sortie d'une salle ; les élixirs en bataille (les douze sont codés dans `elixirs.ts`, aucun n'est jouable — `bataille.ts` ne connaît pas de geste `boire`).

## 3. La tenue — l'arbitrage sur les points de vie [DÉCIDÉ ICI]

### 3.1 Le fait

`tactique/unite.ts` : `tenue = TENUE_BASE + MULT_TENUE·ecu` (48 à 176) ; `encaisser` soustrait ; `vivante` teste `> 0` ; `reprendre` **remonte** de `MULT_TENUE·⌊arc/DIV_REPRISE⌋`, soit 0 à 16, à l'unité qui finit le tour avec **tous** ses points d'action. C'est un système de points de vie. La v1 écrivait « pas de points de vie » et rangeait « des points de vie déguisés » dans ce qu'on ne fait pas : **le texte était faux, il est corrigé ici.**

Les six lois gelées de `integrite.ts` sont **conservation, groupe, doxa, sceau, époques, résonance**. Ce sont des lois sur le *mot* : sa norme vaut `ATOMES`, il vit dans SU(2), il se range en 21 cellules, un âge est une géographie, une paire a une polarité. **Aucune ne parle de points de vie.** « Aucun point de vie, aucune expérience, aucun niveau » est une **doctrine** de `SPEC_TOUR.md:14`, écrite quand il n'y avait pas de combat ; la même page, ligne 15, écrit déjà la sortie : *« L'état de combat est éphémère : on le jette. »*

### 3.2 La décision

**La tenue est assumée. Elle n'est pas retirée, `reprendre` non plus.** Ce qui est retiré, c'est la phrase qui prétendait le contraire.

Quatre différences avec un point de vie classique, chacune vérifiable :

| | Point de vie classique | La tenue |
|---|---|---|
| **stockée ?** | oui, sur le personnage, entre deux combats | **non** : recalculée de `ecu` à `ouvrirBataille`, jetée à la fin. `feuilleObjet` ne la porte pas, le carnet ne la connaît pas |
| **bornée ?** | non : elle monte avec le niveau, l'équipement, la potion | **oui, à jamais** : 160 au plus, et 160 exige `ecu` = 64, donc `lame` = `eperon` = `arc` = 0 — une unité qui ne peut ni frapper, ni courir, ni atteindre. La somme 64 l'interdit par construction |
| **traverse ?** | oui : on entre blessé dans le combat suivant | **non** : deux batailles de la même unité commencent au même nombre. Il n'y a donc **rien à soigner**, et pas d'économie de soin |
| **crue ?** | oui : le serveur la tient | **non** : elle se rejoue de la suite d'actes (`traceBataille`), à l'octet, par n'importe qui |

`reprendre` est le seul terme qui remonte, et il est étroit : il exige de n'avoir **rien** fait du tour — ni pas, ni coup, ni `passer` — donc de renoncer aussi au retrait ; il plafonne à la tenue de départ ; il vaut 0 à 16 quand le socle d'un coup moyen en vaut 32 (`COUP_BASE` plus une `lame` moyenne de 16). Sur une bataille de 2 à 4 coups, il rend au plus l'équivalent d'un demi-coup. **Le retirer coûterait plus qu'il ne rapporte** : `arc` n'achèterait plus que la portée et l'allonge, ce qui re-tarife un axe et rouvre `SPEC_TACTIQUE.md` §9 ter, lequel a coûté deux campagnes de mesure.

**Ce qui reste interdit** [FIXE] : une tenue qui traverse une bataille, un soin, une potion de vie, une résurrection payée (`SPEC_PUITS.md` §6 : elle convertit le seul puits réel du jeu en puits de monnaie), une tenue qui monte avec un niveau, une tenue qui s'achète.

**Falsification (V1).** Mesurer, sur 10 000 batailles du banc, la tenue totale reprise par unité et par bataille. Si elle dépasse un coup médian (32) dans plus de **10 %** des batailles, ou si la part de batailles nulles imputables à une unité qui se régénère dépasse **5 %**, plafonner la reprise à **une fois par bataille**. Tant que ce n'est pas mesuré, on ne touche pas à `DIV_REPRISE`.

**À corriger hors de ce lot** : `SPEC_TOUR.md:14` (« aucun point de vie ») et les textes du Guide qui la reprennent. Le README l'a déjà fait (`e8816b8`).

## 4. Ce qu'une feuille signe [DÉCIDÉ ICI, format `eidos-veillee/2`]

### 4.1 Le problème

Aujourd'hui [CODÉ] une feuille signe un **geste** : franchir, parler, ouvrir, prendre (`veillee.GESTES`) ; et `SPEC_TACTIQUE.md` D2 y ajoute **un coup porté**. Or la mesure la mieux établie du corpus dit qu'il faut **trois** adversaires par bataille (§5.3). Les deux ne tiennent pas ensemble dans le même arbre : voici les comptes.

### 4.2 Option A — la feuille signe un coup porté (ce que `bataille.ts` fait)

Arbre h = 6, 64 feuilles ; 9 salles ⇒ 8 `franchir` obligatoires ⇒ **56 coups** pour toute la run. Coups par abattage mesurés sur le moteur réel : médiane **2**, 95ᵉ centile **4**.

| Ennemis par salle | Abattages sur 9 salles | Coups à la médiane | Reste pour le butin | Coups au 95ᵉ centile |
|---|---|---|---|---|
| 1 | 9 | 18 | 38 | 36 |
| 2 (la moyenne du parcours) | 18 | 36 | 20 | 72 — **arbre nu salle 7** |
| 3 | 27 | 54 | **2** | 108 — **arbre nu salle 5** |

**Verdict : l'option A ne finance jamais à la fois trois ennemis et les gestes de la Tour.** À trois ennemis elle ne laisse pas une feuille pour parler, creuser ou prendre : la Veillée cesse d'être une montée dans la Tour pour devenir neuf batailles à la file. Et elle expose le joueur à la **variance des duels** : au 95ᵉ centile mesuré, l'arbre est nu avant la moitié du parcours, pour des raisons qu'il ne contrôle pas.

### 4.3 Option B — la feuille signe une mort [RECOMMANDÉE]

Arbre **h = 5, 32 feuilles**. Une unité adverse retirée de la dalle coûte **une feuille**, quel que soit le nombre de coups qu'il a fallu. Frapper, se déplacer, boire, lire une intention, annuler : gratuit.

```
8 franchir  +  morts  +  butin  ≤  32          soit          morts + butin ≤ 24
```

| Parcours | Indéchiffrés | Tout nettoyer coûte | Reste au butin |
|---|---|---|---|
| le plus maigre (1 par salle) | 9 | 9 | 15 |
| la moyenne (`1 + graine % 3`, espérance 2) | 18 | 18 | **6** |
| le plus dense (3 par salle) | 27 | **impossible : 24 au plus** | 0 |

**Ce que l'option B achète, et que l'option A n'achète pas :**

1. **Trois ennemis deviennent abordables.** Le levier le mieux mesuré du corpus (×1,88 sur la densité de décision) cesse d'être un luxe.
2. **La variance des duels sort du budget.** Un ennemi coriace coûte du temps et de la tenue, jamais une feuille de plus. Le joueur ne perd plus sa run sur un 95ᵉ centile.
3. **La phrase devient littérale.** *Une clé ne signe qu'une fois, et c'est la vie* : chaque feuille brûlée **est** une vie prise, et son message porte le mot de l'abattu. La permadeath n'est plus une analogie, c'est le contenu du message signé.
4. **Le dilemme se déplace au bon endroit.** Il ne porte plus sur « ai-je bien visé » mais sur « celui-là, dois-je le tuer » — et comme une salle qu'on n'a pas nettoyée ne se lit pas (§5.2), chaque mort épargnée est du butin perdu et chaque butin pris est une mort qu'on ne pourra plus signer. **Trois morts valent trois gestes de butin.** C'est l'arithmétique entière de la run, et elle tient sur une ligne.
5. **La preuve maigrit de moitié** : 32 gestes × (2 144 + 5 × 32) octets = 73 728 ≈ **72 Ko** au lieu de 150 ; l'arbre se construit en ≈ 0,7 s au lieu de 1,3–1,6 (à remesurer).

**Ce qu'elle coûte, dit avant de le coder :**

- **Un format neuf.** `GESTES` gagne `abattre`, donc le tag passe à `eidos-veillee/2` — jamais une lecture tolérante de `/1`, la même discipline que `FORMAT 3` côté chaîne. Le message garde sa forme : `arg` = l'id de l'unité retirée, `mot` = **le mot de l'abattu** (32 bits, le champ existe).
- **Une constante et un juge.** `HAUTEUR_VEILLEE` 6 → 5 ; `construireArbre` accepte déjà 1..20 et `Veillee.hauteur` voyage dans l'export ; `jugerVeillee` lit déjà `1 << v.hauteur`.
- **Une exception, et il faut la nommer : la riposte.** Elle ne coûte ni feuille ni point d'action, et elle **peut abattre**. Sans règle, c'est une mort gratuite, et le joueur peut se faire frapper exprès pour l'obtenir. Règle retenue : **la feuille suit le retrait, pas le choix** — toute unité adverse retirée signe, riposte comprise. À zéro feuille, un coup qui abattrait laisse la cible à **1 de tenue** (le plancher de l'élixir `sel·2`) : l'arbre nu ne tue plus, il blesse.
- **Le lore le supporte, et mieux qu'avant.** Un Indéchiffré frappe sans rien signer — il n'a pas de clé, c'est ce qui le rend illisible ; le joueur signe parce qu'il en a une. Le combat est asymétrique dans la matière même du jeu, et `bataille.ts` le fait déjà (`u.camp === "coffre"` est le seul camp qui dépense une feuille).

### 4.4 Ce que `epuise` devient

Aujourd'hui `feuilles === 0` termine la bataille sur `epuise`. En v2, l'arbre nu **n'arrête plus rien** : il interdit d'abattre. Une bataille sans feuille se joue, se perd ou se quitte par la sortie ; une veillée dont l'arbre est nu peut encore finir au sommet, sans butin et sans mort. `epuise` reste une **fin de veillée**, non de bataille — et le sac se perd, comme en v1. La dernière feuille garde donc son poids : elle est la dernière vie que tu peux prendre.

### 4.5 Falsification (V2)

Bot déterministe sur 1 000 veillées, la politique de `tactique/ia.ts` des deux côtés. Si **plus de 80 %** des runs qui touchent la neuvième salle finissent avec plus de six feuilles inutilisées, l'arbre est trop grand → h = 4 (16 feuilles), ou trois ennemis partout. Si **moins de 30 %** touchent la neuvième salle, il est trop petit → revenir à h = 6 en gardant « une feuille, une mort », ce qui donne 56 feuilles pour 18 morts en moyenne et 38 gestes de butin.

**Mesuré le 2026-09-14** (`atelier/scripts/banc-veillee.ts`, `npm run banc-veillee` : 1 000 runs sur 40 jours par configuration, ≈ 14 min ; échantillon de 24 runs en CI, `banc-veillee.test.ts`). Aucune signature : le budget est une soustraction. Le roster (trois objets tirés par empreinte, classe lue du mot) et les choix de fin de salle ne dépendent que du run, jamais de la configuration : les douze rejouent les mêmes batailles, et l'écart entre deux lignes ne vient que de la règle. Une bataille par salle sauf la dernière (le dernier franchir est le sommet, comme dans `veillee-tour.ts`) ; une défaite laisse la salle tenue et ne prend aucune feuille ; l'arbre nu est une fin sous les deux règles.

| configuration | arrivés ‰ | feuilles restantes à l'arrivée, médiane (Q1–Q3) | arrivés qui gardent > 6 ‰ | coups / bataille | morts / bataille | batailles gagnées / perdues / nulles / épuisées ‰ | runs avec une défaite ‰ (première, méd.) | verdict §4.5 |
|---|---|---|---|---|---|---|---|---|
| coup, 64, 27 salles | **0** (épuisés à la salle 13 en méd.) | — | — | 3,69 | 1,69 | 807 / 123 / 24 / 47 | 808 (0) | trop court |
| coup, 64, 9 salles | **997** | **23** (18–28) | 985 | 4,19 | 1,88 | 797 / 163 / 39 / 0 | 770 (0) | trop long |
| mort, 32, 27 salles | **0** (salle 11) | — | — | 3,80 | 1,76 | 844 / 133 / 23 / 0 | 801 (0) | trop court |
| mort, 32, 9 salles | **1 000** | **9** (7–11) | 842 | 4,19 | 1,88 | 798 / 163 / 39 / 0 | 770 (0) | trop long |
| mort, 64, 27 salles | 57 (salle 23) | 1 (0–3) | 35 | 3,94 | 1,78 | 853 / 116 / 30 / 0 | 908 (0) | trop court |
| mort, 64, 9 salles | 1 000 | 41 (39–43) | 1 000 | 4,19 | 1,88 | 798 / 163 / 39 / 0 | 770 (0) | trop long |
| les six, **permadeath** (A5 telle qu'écrite) | **0 à 4** — roster balayé dans 996 à 1 000 ‰ des runs, à la **salle 1** en médiane | — | — | 3,65–3,90 | 1,65–1,75 | 508–526 / 460–478 / 14 / 0 | 996–1 000 (1) | trop court |

**Ce que la mesure dit.** (1) **Vingt-sept salles avec une bataille par salle ne se financent sous aucune règle** : 26 batailles à 3,7 coups ou 1,7 mort chacune, personne n'arrive (0 ‰, 0 ‰, 57 ‰ à 64 feuilles-morts). Neuf salles se financent sous les trois arbres. (2) À neuf salles, le choix entre « un coup » et « une mort » est un **choix de butin**, pas de survie : « un coup » à 64 laisse **23** feuilles pour l'hôte, la bêche et la capsule (18 à 28 : la variance des duels que craignait §4.2 tient en dix feuilles, 3 ‰ d'épuisés), « une mort » à 32 en laisse **9** (7 à 11), « une mort » à 64 en laisse 41. Le seuil « plus de six inutilisées » de cette section classe les trois « trop long » — il supposait un bot qui ne fait pas de butin ; à neuf salles, six feuilles c'est moins d'un geste de butin par salle. À titre d'échelle, le bot gourmand de `veillee-bot.ts` dépense ≈ 20 feuilles de butin sur 27 salles, soit ≈ 7 sur neuf : « une mort » à 32 est taillé au plus juste pour lui, « un coup » à 64 lui laisse trois fois sa faim. (3) 2,2 coups par mort (4,19 / 1,88), ce que §4.2 annonçait. (4) **La survie est le vrai mur** : 77 % des runs perdent au moins une bataille, la première **à la salle 0** (l'étage 0, trois occupants) ; 16 % des batailles se perdent à neuf salles ; les batailles à trois ennemis se gagnent à 63 % contre 91–93 % à un ou deux (sonde, 6 120 batailles). (5) **La permadeath telle qu'écrite ne survit pas à la mesure** : « toute unité tombée ne revient pas » vide le roster à la salle 1 en médiane dans la totalité des runs, parce qu'une bataille gagnée coûte aussi des unités (0,9 à 1,1 par bataille) — sans recrutement en cours de run, A5 fait des runs de deux salles (V5, et A28 dans la feuille de route).

**Mesuré le 2026-09-15 — les contreparties de la permadeath (A28).** Vingt-sept configurations de plus au même banc : les trois socles à neuf salles (coup 64, mort 32, mort 64), en permadeath, sous neuf contreparties, 1 000 runs chacune, **appariées aux douze du 14** (mêmes jours, mêmes parcours, mêmes trois premiers objets — une réserve les prolonge sans les changer). Aucune ne touche au moteur. Les deux du handover : **(a) « perdue »**, une unité tombée ne quitte le coffre que dans une bataille **perdue** — gagnée ou nulle, elle est K.O. et revient ; **(b) « recrue »**, après une salle gagnée, si l'équipe est incomplète, la capture du premier Indéchiffré de l'étage entre en lice (une feuille, comme tout `prendre`), mesurée **au plus favorable** — capsule gratuite, capture sûre, la recrue se bat dans la run même. Puis **(d) « réserve »**, le jeu tel que codé et que la mesure du 14 avait réduit à trois objets : le coffre en porte 6, 9 ou 12, les trois premiers vivants entrent en lice (`MAX_COFFRE` borne la lice, pas le coffre), une tombée ne revient pas. Et **(a) + (d)** : une défaite coûte la lice entière, la réserve prend la suite. Enfin **(e) « perdue-1 »**, le cran en dessous, demandé par l'auteur le même jour devant les chiffres de (a) (« perdre coûte l'équipe entière, n'est-ce pas trop punir ? ») : une défaite ne coûte que **la première tombée** — la cible du premier coup du journal qui retire une unité du coffre, riposte comprise, le moteur l'écrit dans l'ordre —, les deux autres se relèvent comme après une victoire ; sur trois objets (l'équipe se bat ensuite à deux, puis à une) et sur six (la réserve la recomplète). Les arrivées sont les mêmes sous les trois arbres (à 3 ‰ près) : seules les feuilles restantes changent, elles sont données coup 64 / mort 32 / mort 64.

| contrepartie (9 salles, permadeath) | arrivés ‰ | feuilles restantes, méd. (Q1–Q3) : coup 64 / mort 32 / mort 64 | gardent > 6 ‰ | coups / morts par bataille | batailles gagnées / perdues / nulles ‰ | runs avec une défaite ‰ (1re, méd.) | roster balayé ‰ (salle méd.) | objets perdus / recrues par run | verdict §4.5 |
|---|---|---|---|---|---|---|---|---|---|
| telle qu'écrite, trois objets (le 14) | **4** | 17 / 7 / 39 | 1 000 / 750 / 1 000 | 3,90 / 1,75 | 508–526 / 460–478 / 14 | 996–1 000 (1) | 996–1 000 (1) | — | trop court |
| **(a) perdue**, trois objets | **227–230** | 19 (14–24) / 7 (6–9) / 39 (38–41) | 956 / 648 / 1 000 | 4,42 / 1,98 | 760 / 211 / 28 | 770 (0) | 770 (0) | 2,31 / — | trop court |
| **(b) recrue**, trois objets | **108–120** | 16 (11–21) / 3 (1–5) / 34 (32–37) | 933 / 111 / 1 000 | 4,11 / 1,91 | 672 / 299 / 30 | 880 (0) | 880 (0) | 4,11 / 1,44 | trop court |
| **(d) réserve** de 6 | 90 | 20 (16–25) / 8 (7–10) / 40 (39–42) | 989 / 789 / 1 000 | 3,86 / 1,70 | 661 / 297 / 42 | 926 (0) | 910 (4) | 5,81 / — | trop court |
| (d) réserve de 9 | 431 | 22 (17–26) / 9 (7–11) / 41 (39–43) | 993 / 821 / 1 000 | 4,09 / 1,81 | 743 / 218 / 39 | 820 (0) | 569 (6) | 7,73 / — | trop long |
| (d) réserve de 12 | 818 | 22 (18–26) / 9 (7–10) / 41 (39–42) | 991 / 828 / 1 000 | 4,21 / 1,87 | 786 / 174 / 40 | 775 (0) | 182 (6) | 8,45 / — | trop long |
| **(a) + (d)**, perdue, réserve de 6 | **631–634** | 21 (16–26) / 8 (7–10) / 40 (39–42) | 979 / 782 / 1 000 | 4,29 / 1,90 | 797 / 165 / 38 | 770 (0) | 366 (4) | 3,41 / — | trop long / **tient** / trop long |
| **(a) + (d)**, perdue, réserve de 9 | **904–907** | 22 (17–26) / 9 (7–11) / 41 (39–43) | 985 / 817 / 1 000 | 4,28 / 1,90 | 805 / 157 / 37 | 770 (0) | 93 (5) | 3,69 / — | trop long |
| **(e) perdue-1**, trois objets | 458–461 | 22 (16–26) / 8 (7–10) / 40 (39–42) | 969 / 779 / 1 000 | 3,88 / 1,70 | 673 / 287 / 40 | 770 (0) | 539 (5) | 1,92 / — | trop long / **tient** / trop long |
| **(e) perdue-1**, réserve de 6 | **992–995** | 22 (18–27) / 9 (7–11) / 41 (39–43) | 983 / 830 / 1 000 | 4,24 / 1,89 | 801 / 159 / 40 | 770 (0) | 5 (7) | **1,27** / — | trop long |

**Ce que la mesure dit.** (1) **« Perdue » seule ne suffit pas** : elle ramène la permadeath à « une défaite coûte l'équipe entière », et une run s'arrête à sa première défaite — 77 % des runs en ont une, la première à la salle 0 ; arrivent exactement les runs sans défaite (230 ‰ = 1 000 − 770), et tant qu'aucune bataille n'est perdue, le run est celui du roster qui revient (le test le vérifie run par run). (2) **La recrue fait pire que rien** : 108 à 120 ‰. Une bataille gagnée coûte ≈ 1 unité, la recrue en rend au plus une par salle gagnée (1,44 par run contre 4,11 perdues), elle vaut l'Indéchiffré qu'elle relève, pas un objet tiré, et n'entre qu'après une salle gagnée — la lice reste souvent incomplète : 672 ‰ de batailles gagnées, contre ≈ 800 à équipe pleine —, et chacune coûte une feuille : sous « une mort » à 32, l'arbre nu apparaît (12 ‰ d'épuisés, 3 feuilles à l'arrivée). Mesurée à son plafond (capsule gratuite, capture sûre, recrue dans la run), elle n'atteint pas le tiers du seuil : **le recrutement en cours de run (b) est un chantier que sa borne haute tue**, inutile de le coder. (3) **La réserve seule est un puits sans fond** : la règle telle qu'écrite mange ≈ 1 objet par bataille, gagnée ou non ; il faut **douze** objets au coffre pour que 818 ‰ arrivent, et le run en brûle **8,45** — neuf n'en font arriver que 431 ‰ pour 7,73 brûlés. (4) **« Perdue » sur une réserve est la seule combinaison qui arrive** sans toucher au moteur : à **neuf** objets, **904–907 ‰** arrivent, un run brûle **3,69** objets, 93 ‰ perdent tout (trois défaites) ; à six, 631–634 ‰ et 3,41 objets, 366 ‰ perdent tout (deux défaites). Et le coffre devient la progression : la même règle donne 23 % d'arrivées à trois objets, 63 % à six, 90 % à neuf — plus le coffre est garni, plus la run va loin, et c'est le seul endroit où le puits (`SPEC_PUITS.md` §6) se chiffre : **de 3,4 à 3,7 objets par run**, contre 8,45 sous la règle telle qu'écrite. (5) Le seuil des six feuilles classe encore presque tout « trop long », pour la raison dite plus haut ; deux lignes tiennent les deux seuils (« une mort » à 32, perdue sur une réserve de 6 : 634 ‰ et 782 ‰ ; perdue-1 sur trois objets : 461 ‰ et 779 ‰), ce qui ne dit rien de plus que le 14. (6) **Le cran en dessous — une défaite coûte la première tombée, pas l'équipe** — divise le puits par trois : avec **six** objets au coffre, **992–995 ‰** arrivent, un run brûle **1,27** objet, 5 ‰ perdent tout (il faut six défaites) ; avec trois, 458–461 ‰ seulement — l'équipe se bat ensuite à deux, puis à une, et perd 287 ‰ de ses batailles au lieu de 160 : plus d'un run sur deux perd tout, à la salle 5, pour 1,92 objet. Le nombre d'objets par défaite est donc **le** réglage du puits, et il ne change rien au moteur : trois par défaite sur neuf objets, 907 ‰ et 3,69 par run ; un par défaite sur six objets, 995 ‰ et 1,27. Entre les deux, « deux par défaite » n'est pas mesuré. **Ce que le banc ne mesure pas** : la fuite par la sortie (V3), qui réduirait les défaites elles-mêmes ; une K.O. qui reviendrait blessée (ici la tenue repart de `ecu` à chaque salle, D1) ; et le revenu d'objets du joueur (le coffre horaire), sans lequel « 1,3 ou 3,7 objets par run » ne se lit pas encore comme un prix. En termes de joueur, les deux règles qui tiennent : *perdre coûte l'équipe, le coffre emporte deux équipes de rechange* — neuf runs sur dix au bout, moins de quatre objets par run, un sur onze perd tout ; *perdre coûte la première tombée, le coffre emporte une équipe de rechange* — quatre-vingt-dix-neuf runs sur cent au bout, un objet et quart par run, un sur deux cents perd tout. À l'auteur (A28) : l'appétit du puits.

**Mesuré le 2026-09-15 — le bot qui ramasse (A17).** À la question de l'auteur — *sous « une mort à 32 », le joueur a-t-il plus de chances et de possibilités de finir toutes les salles ?* — six configurations de plus, sur les mêmes runs : le roster qui revient, à neuf salles, sous les trois arbres, et un bot qui **ramasse un ou deux gestes par salle gagnée** (la salle se lit quand elle est vide, §5.2 ; parler, creuser, ouvrir, prendre coûtent une feuille chacun). Sa seule prudence : il garde une feuille par salle qu'il reste à franchir ; il ne réserve **rien pour les batailles à venir** — un joueur prudent en garderait, et sous « une mort » il peut compter les occupants de la salle suivante. On lit donc deux choses : les runs où l'arbre lui a **refusé** un geste (l'arbre est court), et les **arbres vides en bataille** après qu'il a dépensé sa marge (le sac perdu — ce qu'un joueur prudent paierait en gestes refusés plutôt qu'en sac).

| arbre, appétit (9 salles, roster qui revient) | arrivés ‰ | arbres vides ‰ (salle méd.) | feuilles restantes, méd. (Q1–Q3) | gardent > 6 ‰ | gestes pris / voulus par run | runs où l'arbre a refusé un geste ‰ | verdict §4.5 |
|---|---|---|---|---|---|---|---|
| un coup à 64, sans butin (le 14) | 997 | 3 | 23 (18–28) | 985 | — | — | trop long |
| un coup à 64, **1 geste par salle** | **983** | 17 (7) | 17 (12–21) | 914 | 6,36 / 6,37 | 9 | trop long |
| un coup à 64, **2 gestes par salle** | **930** | 70 (7) | 11 (6–16) | 711 | 12,55 / 12,65 | 63 | **tient** |
| une mort à 32, sans butin (le 14) | 1 000 | 0 | 9 (7–11) | 842 | — | — | trop long |
| une mort à 32, **1 geste par salle** | **895** | 105 (7) | 3 (1–5) | 123 | 6,19 / 6,38 | 168 | tient |
| une mort à 32, **2 gestes par salle** | **342** | 658 (7) | 0 (0–2) | 26 | 10,36 / 12,17 | 754 | tient |
| une mort à 64, 1 geste par salle | 1 000 | 0 | 34 (32–37) | 1 000 | 6,38 / 6,38 | 0 | trop long |
| une mort à 64, 2 gestes par salle | 1 000 | 0 | 28 (25–31) | 1 000 | 12,76 / 12,76 | 0 | trop long |

**Ce que la mesure dit.** (1) **Non : « une mort à 32 » ne donne pas plus de chances de finir, et moins de possibilités.** Sans butin, les deux arbres arrivent pareil (1 000 et 997 ‰ : la seule différence est le coriace, jusqu'à huit coups pour une mort). Dès que le bot ramasse, l'arbre de 32 est **court** : à un geste par salle, l'arbre lui refuse un geste dans **168 ‰** des runs et se vide en bataille dans 105 ‰ (le sac perdu), il arrive avec 3 feuilles (1 à 5) ; à deux gestes, il refuse dans 754 ‰ et se vide dans **658 ‰** — deux gestes par salle n'existent pas à 32. « Un coup à 64 » finance un geste par salle sans y penser (9 ‰ de refus, 17 ‰ de vides, 17 feuilles restantes) et deux gestes presque toujours (63 ‰ de refus, 70 ‰ de vides, 11 restantes). (2) **La bonne échelle du butin est un à deux gestes par salle**, et c'est là que les deux arbres se séparent : 32 en finance **un**, pas toujours ; 64 en finance **deux**. « Une mort à 64 » en financerait quatre (28 feuilles restantes après deux par salle) : jamais tendu. (3) Le seuil « plus de six feuilles inutilisées » de cette section devient lisible dès que le bot ramasse : « un coup à 64 » à deux gestes par salle est la seule ligne qui **tient** les deux seuils sans être vide (930 ‰, 711 ‰), là où « une mort à 32 » ne les tient qu'en vidant l'arbre. (4) Ce que le bot ne fait pas : réserver pour les batailles — ses arbres vides sont ceux d'un joueur qui ramasse sans compter ; un joueur qui compte les convertirait en gestes refusés, ce qui ne change pas le verdict, seulement la façon de perdre (le butin plutôt que le sac). Et sous « une mort », le prix de la salle suivante se connaît d'avance (ses occupants) : c'est la vraie force de cette règle, la lisibilité, pas la marge. **À l'auteur (A17)** : « un coup à 64 » si le joueur doit fouiller les salles ; « une mort à 32 » si le butin doit être la ressource rare, en sachant que c'est un geste par salle, pas toujours, et que le moteur change.

## 5. La salle — la sortie, les trois, la lecture

### 5.1 La condition de victoire [PROPOSÉ] — une décision de conception, pas un réglage

Une salle se quitte de **deux** façons, et le juge ne les distingue pas :

1. **la salle est vide** — tous les Indéchiffrés retirés ; ou
2. **la sortie est atteinte** — l'unité qui porte l'objet porté (le pion, C5) se tient sur la case de sortie.

**Sans la seconde, éviter un combat n'existe pas**, et un tactical où l'on doit tout abattre n'a qu'une décision : dans quel ordre. Avec elle, la géométrie devient le jeu — la zone de contrôle, le pas, la portée, la charge deviennent des outils de **passage** autant que de coup. C'est aussi le seul levier de conception qui **paie `eperon`** sans lui donner un cinquième prix mécanique : la mobilité achète la fuite, et la fuite achète des feuilles.

**La sortie** : une case libre de la dalle, dérivée comme tout le reste — `sortieDe(étage)` = la première case libre tirée de `SHA-256d("eidos-sortie/1" ‖ étage)`, publique, fixe, lisible avant d'agir et gratuitement. Le pion entre par `spawnDe` (le pendule le donne déjà) ; la sortie est ailleurs. Rien de neuf : c'est le patron de `fouilles`, de `hotes` et du gardien.

### 5.2 « La salle se lit quand elle est vide » [PROPOSÉ, dérivé du lore]

Les gestes de butin — **parler** (l'hôte), **ouvrir** (la bêche, l'alcôve), **prendre** (la capsule) — ne sont possibles **que si aucun Indéchiffré ne tient l'étage**. Ce n'est pas une règle inventée pour équilibrer : c'est ce que le lore dit déjà. *Un Indéchiffré dans un étage rend tout l'étage illisible* (`SPEC_TACTIQUE.md` §6), et le brouillard en est la trace (`SPEC_BROUILLARD.md`). On ne creuse pas une dalle qu'on ne peut pas lire ; l'hôte ne parle pas devant ce qui n'a pas de nom.

Conséquence directe, et c'est le cœur du jeu : **traverser est gratuit et ne rapporte rien ; nettoyer coûte une à trois feuilles et ouvre la salle**. Neuf salles, vingt-quatre feuilles hors franchir : on ne fait pas tout, on choisit — la parcimonie de la v1, avec un adversaire dedans.

### 5.3 Combien d'ennemis [PROPOSÉ, appuyé sur la seule mesure qui tranche]

**Un à trois par salle, lus comme les occupants** : `n = 1 + graineEtage(e)[0] % 3` (`tour.occupantsDe`, [CODÉ]). Espérance 2, borne 3.

La mesure (`ETUDE_MOBILITE.md` §9, 2026-09-10, sur le vrai moteur et les dalles à deux bits) :

| | 1 adversaire | 3 adversaires |
|---|---|---|
| cases offertes par tour | 15,36 | 14,07 |
| **cases d'où l'on peut frapper** | **9,0 %** | **24,7 %** |
| issues tactiques distinctes | 1,44 | **2,49** |
| **densité de décision (issues / case)** | 0,094 | **0,177 — ×1,88** |
| idem après le recalibrage `DIV_PAS` 32 / `DIV_PORTEE` 10 | 0,142 | **0,259** |

C'est **plus que tout le reste réuni** : la place ne crée pas de décision (la salle a presque triplé et la densité a perdu 39 %), l'engagement et le nombre de cibles la créent. Le premier verrou est qu'à un adversaire, **65 % des positions n'offrent aucune frappe** : le tour est une marche, pas un choix.

**Pourquoi ce nombre-là et pas un nombre neuf** : `occupantsDe` rend déjà 1 à 3 depuis le premier jour de la Tour. Le prendre, c'est ne rien inventer ; et cela fait dépendre le budget de feuilles du **parcours du jour**, public, le même pour tous — un jour dense est un jour dur, et tout le monde le sait avant d'ouvrir.

**Les occupants ne descendent pas sur la dalle de bataille.** Le moteur a deux camps (`CAMPS`), pas trois, et une unité neutre demanderait un camp de plus, un tri de phase de plus, un vecteur gelé de plus. Les occupants restent ce qu'ils sont : la faune de l'étage, capturable à la capsule **une fois la salle vide**. Une capsule lancée sur un Indéchiffré se brise : il n'a pas de cellule, rien ne tient dedans.

### 5.4 Combien d'unités du côté du joueur [OUVERT]

Recommandation : **autant que d'Indéchiffrés, trois au plus**, prises dans le roster du coffre (un objet = une unité, `SPEC_TACTIQUE.md` §5). Symétrique, lisible, aucune constante neuve. **Non mesuré** : tout le corpus est en duel 1 contre 1 ; une bataille rangée 3 contre 3 n'a jamais tourné sur le banc. À mesurer avant de livrer (V4).

## 6. La run — neuf salles, quatre-vingt-une places

### 6.1 Neuf salles [DÉCISION D'AUTEUR, non codée]

Neuf salles, **une par bande, donc une par muse**, de Thalie (l'étage 0, la porte de la ville) à Uranie. C'est une décision d'auteur, et le code ne l'a pas encore : `pendule.ts` porte `ETAGES_PAR_BANDE = 3`, donc `ETAPES = 27`, et `veillee.FRANCHIR_AU_SOMMET = ETAPES − 1 = 26`.

**Ce que ça change, exactement une constante** : `ETAGES_PAR_BANDE : 3 → 1`. Alors `ETAPES = 9`, `etageDe(i, p)` prend `k = i` (la bande est l'étape) et le pendule garde tout son rôle — c'est sa position `p` qui choisit **quel** étage de la bande on visite, et le décalage `⌊p·(taille − ETAGES_PAR_BANDE)/8⌋` balaie alors la bande entière. `FRANCHIR_AU_SOMMET` suit à 8. Le parcours reste celui du pendule-9 [FIXE] et la transition ne bouge pas (graine, étape, position, choix, objet porté, résonance de l'étage quitté, sens de la muse).

**Un piège, et il faut le dire avant de coder** : `veillee-tour.SAC_PLACES = 3 * ETAPES` vaut 81 aujourd'hui **parce que** `ETAPES = 27`. Passer à neuf salles ferait tomber le sac à **27 places** sans que personne ne l'ait décidé. Le sac doit être écrit `DALLE_N * DALLE_N` — 81, la dalle entière, 9², ce que son propre commentaire dit déjà.

### 6.2 Le compte de la run

| | v1 | **v2** |
|---|---|---|
| salles | 27 | **9**, une par bande |
| franchir obligatoires | 26 | **8** |
| feuilles | 64 (h = 6) | **32 (h = 5)** |
| feuilles hors franchir | 38 | **24** |
| batailles | 0 | **jusqu'à 9** |
| Indéchiffrés | — | 9 à 27, **18 en moyenne** |
| places au sac | 27 | **81** |
| durée | — | **45 à 60 min** (neuf batailles de 8 à 20 tours) |
| taille de la preuve | ≈ 150 Ko | **≈ 72 Ko** + ≈ 3 Ko d'actes de bataille |
| moments d'arrêt honorables | salles 9, 18, 27 | **salles 3, 6, 9** (le poste du jour fait trois blocs [FIXE]) |

### 6.3 Le sac, l'extraction, et ce que 81 places rouvrent

Le sac [CODÉ] : ce qu'une veillée rapporte n'entre pas au coffre au geste, il va au sac. Le **sommet**, une **porte** fermée et l'**effacement** volontaire le versent au coffre ; l'**arbre épuisé le perd** — les gestes restent dans la preuve, les objets ne reviennent pas. Un sac plein refuse les gestes de butin, jamais franchir.

**Mais 81 places ne bornent plus rien sur une run de neuf salles** : le butin mesuré d'une telle run est d'environ **9 objets** (`SPEC_CHYMIE.md` §8), soit 11 % du sac. Le sac cesse d'être un plafond de run ; ce qui borne le butin est l'arbre, et lui seul.

**Et il rouvre une question fermée.** `SPEC_COFFRE_HORAIRE.md` §5 avait mesuré la rafale rétroactive (K47) **avec un sac de 27** : tout l'historique offrait 77 objets, dont **27 pris et 50 perdus**, et la fenêtre d'un jour (24 blocs) en offrait 53, dont 27 pris — d'où la conclusion « la fenêtre d'un jour ne change rien, elle n'est pas adoptée ». À **81 places**, une pièce neuve emporte les 77 d'un coup, quand la fenêtre d'un jour n'en donnerait que 53 : **la mesure ne dit plus la même chose, et la décision qui en découlait doit être rejouée** (V8).

## 7. Les Indéchiffrés [SPÉCIFIÉ, non codé] — le lore, sans refonder

### 7.1 Ce qu'ils sont

La Chambre de Genèse a neuf œufs ; le neuvième, L'Inconnu, est Uranie, *« qui lit et ne donne rien »* [FIXE, `LORE_CHAMBRE.md`]. La doxa range toute forme en 21 cellules, par proximité à l'une des 101 formes du catalogue [FIXE, `cosmos-empreintes.ts`].

**Les Indéchiffrés sont ce qui refuse d'être rangé** : des mots dont aucune forme du catalogue n'est assez proche. Pas de cellule, donc pas de nom, donc pas de fiche, donc pas de capture. Ils ne sont pas *maléfiques*, ils sont **illisibles** — et une Tour qui n'existe que pour lire ne supporte pas ce qu'elle ne peut pas lire. Les muses les combattent parce qu'un Indéchiffré dans un étage rend tout l'étage illisible ; le brouillard en est déjà la trace. C'est aussi pourquoi ils ne signent rien : **ils n'ont pas de clé**. Le joueur seul brûle des feuilles.

Rien d'autre du lore ne bouge : quatre âges, neuf muses et leurs services, la Chambre, les reliques, les sceaux, les 21 cellules, les 64 œufs et les 64 glyphes. Ce qui se jette est mince — quelques textes de fiche et de titre, purement cosmétiques.

### 7.2 Le critère, corrigé par la mesure

`SPEC_TACTIQUE.md` §6 écrit : *« `formeProche` rend un alignement sous un seuil »*. Tel quel, **le critère ne peuple pas le jeu**, et c'est mesuré : le rayon de couverture de RP³ par les 100 formes vaut **77,06 centièmes**, la proximité minimale observée sur 5·10⁵ mots est **78**, et le palier le plus lointain (`errant`, 78–83) pèse **0,257 %** — 1 sur 389 (`SPEC_LOOT_TIERS.md` §3 et §7). Les 491 occupants de la Tour en contiendraient **1,3**. Un adversaire à 1,3 exemplaires n'est pas un adversaire.

**Le critère est donc un tamis, pas un tri** [PROPOSÉ] — exactement comme le gardien d'antre, qui se cherche depuis `SHA-256d("eidos-gardien/1" ‖ étage)` jusqu'à tenir l'axe (17 essais en moyenne, 92 au pire) :

```
Indéchiffré k de l'étage e :
    h   = SHA-256d("eidos-indechiffre/1" ‖ étage ‖ k ‖ n)      n = 0, 1, 2, …
    mot = objetDepuisGraine(h).mot
    retenu dès que proximité(mot, catalogue) ≤ SEUIL_ILLISIBLE
```

Avec `SEUIL_ILLISIBLE = 83` (le palier `errant`), l'espérance est de **389 tirages** ; avec 85 (`hybride` compris, 0,667 %), de **150**. Trois Indéchiffrés par étage coûtent en moyenne ≈ 1 200 `sha256d`, quelques millisecondes — et le résultat est public, fixe, rejouable. **La rareté du critère devient un coût de recherche, jamais une pénurie**, et l'Indéchiffré reste littéralement ce que son nom dit.

Un Indéchiffré n'a **ni nom, ni cellule, ni fiche** : il s'affiche par son glyphe et par sa distance au catalogue (« à 81 centièmes de toute forme connue »). Les **gardiens de porte** promis en PR 4 de la v1 et jamais codés trouvent enfin leur place : ce sont les Indéchiffrés des étages 64, 128 et 192. Et il y a une fin : l'étage 254, Uranie, qui lit tout — et l'Indéchiffré qui s'y tient est le seul qu'elle ne lit pas.

### 7.3 Ce que ça donne gratuitement

Un bestiaire adverse **dérivé** et non écrit à la main ; une raison de monter qui ne contredit pas « la Tour ne rend pas plus fort » (on ne monte pas pour devenir puissant, on monte pour rendre les étages lisibles) ; et le lien mécanique du §5.2, qui cesse d'être une règle d'équilibrage pour devenir une conséquence du lore.

## 8. Le butin, la chymie, la forge — état des lieux

| Mécanique | État | Ce qu'il faut en dire |
|---|---|---|
| **12 tiers d'extrémité** (`tiers.ts`, 16 contrôles) | [CODÉ] | `E3 = Σ axe² − 1024`, loi 2⁻ᵗ, T12 à 1 sur 2 006 mesuré. **Un tier n'est pas une puissance** : r(tier, victoire) = −0,161. Un T12 gagne *ailleurs*, pas *plus* |
| **7 paliers de rareté** (`tiers.ts`) | [CODÉ] | proximité au catalogue, domaine réel [78, 100] ; `errant` se dit « aussi loin de toute forme que la géométrie l'autorise », jamais « loin de tout archétype » |
| **12 élixirs** (`elixirs.ts`, 13 contrôles ; `chymie.ts`, 6) | [CODÉ] pour la lecture, **[NON JOUABLE]** | huit agissent en bataille en changeant la **lecture** d'un terme de la résolution — et `bataille.ts` n'a pas de geste `boire`. **Boire ne signe rien** : le format de la preuve ne bouge pas |
| **lumens** | [SPÉCIFIÉ] | le rendement d'un abattage est le tier de l'abattu, espérance `2 − 2⁻¹¹` = **1,996**. Sous l'option B (§4.3) le nombre d'abattages est celui du parcours : **18 en moyenne ⇒ 36,0 ± 5,9 lumens par run** (5ᵉ centile 27), la ligne « 3 feuilles par abattage » de `SPEC_CHYMIE.md` §7. Le lumen est une jauge et **s'évapore en fin de run** |
| **forge, prix `2^(t−1)`** | [SPÉCIFIÉ] | forges en **salles 5 et 9** (mesuré : 18 % d'évaporation contre 47 % en salles 3 et 6). Érato n'est croisée qu'une run sur neuf : la forge est une **case**, pas une muse — quand la muse est là, le craft est gratuit |
| **sac de 81 places** | [CODÉ] | ne borne plus une run de neuf salles (§6.3) |
| **échange d'un objet** | [ÉTUDE] | option (d), la lignée ancrée sur les dépenses (`ETUDE_ECHANGE_OBJETS.md` §7.1). La Veillée n'en dépend pas et ne l'attend pas |
| **coffre horaire** | [CODÉ] | un coffre par bloc, une pièce par claim, neuf tiers géométriques ; un claim vaut hors run et son contenu entre à l'inventaire, pas au sac (`SPEC_COFFRE_HORAIRE.md` §4, A15) |

**La règle qui les tient toutes** [FIXE] : aucune de ces lectures ne touche la norme, les axes ni le mot. Un objet ne mute pas ; un palier ne multiplie rien ; il n'existe pas d'objet « meilleur », il existe des objets autrement faits.

## 9. Preuves, juge, dépôt

### 9.1 Format d'export — `eidos-veillee/2`

```
Veillee {
  v: 2, spec: "eidos-veillee/2", jour,
  tete, veille            en-têtes étendus + signature XMSS (temoin.TeteReseau)
  ancre                   null (veillée libre : une lecture) ou { teteAncre, piece, preuve }
  racine, grainePub, hauteur = 5
  gestes[]                { i, g, etape, etage, arg, mot, msg, sig: { indice, wots, chemin } }
                          g ∈ { franchir, abattre, parler, ouvrir, prendre }
                          abattre : arg = id de l'unité retirée, mot = son mot
  batailles[]             { etage, poses[], actes[] }   de quoi rejouer ; aucun résultat déclaré
  fin                     sommet | epuise | porte | abandon
}
```

Taille : 32 gestes × (2 144 + 5 × 32) octets = 73 728, soit ≈ **72 Ko** ; les actes d'une bataille tiennent en trois octets pièce, ≈ 3 Ko pour neuf batailles. C'est un fichier, pas une issue : le règlement sur la chaîne tient dans une issue, la preuve voyage à côté (Pages, gist, partage direct).

### 9.2 Le juge, sans rejeu de la chaîne et sans serveur

1. les deux têtes vérifiées XMSS contre `federation.json` ; le jour prouvé (`T.prev = id_bloc(V)`, `T.hauteur = V.hauteur + 1`, `jour(V.ts) < jour(T.ts)`) [CODÉ] ;
2. la tête d'ancrage vérifiée, du même jour ; la pièce : feuille recalculée, chemin vérifié, racine = son `utxo_root` [CODÉ] ;
3. chaque geste, dans l'ordre : indice = rang (une feuille par geste, **sans trou**), message recalculé (chaîne intacte), signature WOTS+ vérifiée contre la racine de l'arbre, étape et étage égaux à ceux du pendule recalculé [CODÉ] ;
4. **chaque bataille rejouée acte par acte** [PROPOSÉ] par le même code que le moteur, depuis les poses et la dalle de l'étage (`dalleDe`, publique) — et **dans les deux sens** :
   - une feuille `abattre` que le rejeu ne produit pas ⇒ **refus** (on ne déclare pas une mort) ;
   - un retrait que le rejeu produit et qu'aucune feuille ne signe ⇒ **refus** (on ne cache pas une mort pour économiser une feuille) ;
5. la fin cohérente avec les comptes : `sommet` ⇔ 8 `franchir` ; `epuise` ⇔ 32 gestes.

**Le juge est le même code que le moteur** : c'est là que le déterminisme total du §2 paie. Une preuve fabriquée côté client ne passe pas.

### 9.3 Triche, et ce qui l'arrête

| Tentative | Ce qui l'arrête |
|---|---|
| rejouer un geste, revenir en arrière | deux signatures du même indice = run refusé ; un indice ne porte qu'un message |
| déclarer un étage plus haut | étape et étage sont recalculés par le pendule sur les gestes `franchir` |
| toucher le sommet en cinq gestes | 8 `franchir` sont exigés, chacun signé |
| **déclarer une mort qui n'a pas eu lieu** | le rejeu de la bataille ne la produit pas (§9.2, 4) |
| **cacher une mort pour économiser une feuille** | le rejeu la produit et aucune feuille ne la signe (§9.2, 4) |
| **abattre par une riposte pour ne rien signer** | la feuille suit le **retrait**, pas le choix (§4.3) |
| farmer avec mille coffres | une pièce non dépensée à la tête du jour : une pièce, une veillée par jour |
| jouer le jour sur un autre bloc | deux têtes signées prouvent « premier du jour » ; le second bloc est refusé (vecteur) |
| **simuler la journée hors ligne avant d'ouvrir** | **permis, et assumé** : la Tour est publique, la carte est connue d'avance, c'est le choix du Daily Climb — on compare les décisions, pas la chance. Ce qui ne se simule pas est la pièce |
| prêter son arbre | l'arbre dérive du maître du coffre et de la pièce : le prêter, c'est prêter le coffre |
| ancrer sur la pièce d'autrui et déposer le premier | la place (jour, pièce) est prise : c'est un déni, pas un gain. Parade prévue, non codée : le **sceau final**, la dépense de la pièce, départage |

### 9.4 Dépôt et classement

Dépôt [CODÉ pour la veillée] : une issue titrée « veillée », le fichier joint ; `veillees.yml` et `depot.ts` jugent en CI, refusent une preuve dont une tête n'est pas dans la chaîne publiée, committent le fichier, répondent le verdict dans l'issue. Le corps n'est jamais interpolé (`EIDOS_ISSUE_BODY`). Une preuve de bataille suivra le même patron (`batailles/`, `SPEC_TACTIQUE.md` §8).

**Classement — lexicographique** [PROPOSÉ, remplace `scoreVeillee`] : **(salles atteintes, Indéchiffrés retirés, gestes de butin)**, comparés dans cet ordre, le premier qui départage tranche. Aucun poids, aucune conversion inventée entre une feuille et un objet — c'est la règle que `tactique/ia.ts` s'applique déjà à lui-même, et pour la même raison : *un score pondéré demanderait des nombres que personne n'a mesurés*. `scoreVeillee` (salles × 64 + butin) reste comme lecture de compatibilité, jamais comme classement.

Une preuve par pièce et par jour, la première déposée l'emporte ; aucun serveur ne fait foi ; un lecteur qui doute rejuge.

### 9.5 Les fantômes [CODÉ, inchangé]

Un fantôme est la preuve d'un autre, relue : son parcours s'affiche dans la salle comme une trace, sans nom ni visage, avec une **épithète** tirée des six tournures de la réserve d'origine (`fantomes.tournureDe`) — **écho** (bloc d'un autre âge), **revenue** (sommet), **dernière** (épuisé), **ombre** (porte), **qui s'efface** (abandon), **murmure** (en cours ou bloc orphelin) — posée sur le nom d'ère de la dernière salle atteinte. Multijoueur asynchrone par défaut [FIXE] : les fantômes sont des preuves relues, jamais un état partagé. Le PvP synchrone n'existera pas : un bloc dure une heure, et le prétendre serait du théâtre.

## 10. Ce qu'on ne fait pas

- **Aucun dé, aucun aléa client.** Tout dérive de `sha256d` ; `signerWots` est déterministe, l'arbre aussi, le pendule aussi, la politique aussi.
- **Aucune tenue qui traverse une bataille** : pas de soin, pas de potion de vie, pas de **résurrection payée** — elle convertirait le seul puits réel du jeu en puits de monnaie et ferait de la mort une fonction de la fortune. La **relève** (brûler le socle du mort et tirer un objet neuf, sans choisir l'axe) reste la seule transformation acceptable, et elle attend V5.
- **Aucune expérience, aucun niveau, aucun objet plus fort qu'un autre.** La somme des axes vaut 64, toujours : on recrute, on ne gonfle pas. Fire Emblem, pas Diablo.
- **Aucun serveur de classement, aucun verrou de machine, aucune empreinte de navigateur, aucune preuve de travail client** (`SPEC_SYBIL.md`).
- **Aucune démarche singulière comme levier d'équilibrage** : mesuré négatif (−2,89 point de bande sur 28,80 ; densité de décision 1,45 contre 1,50). Comme saveur, plus tard, en régime B et catalogue de pochoirs seul.
- **Aucun élixir permanent** : un bonus permanent est une puissance (`TRANSPOSITION_EIDOLON.md` §4.1).
- **Aucune IP à côté d'Eidos** : la Veillée est un **mode** d'Eidos, pas un produit.
- **Aucune figure présentée comme une garantie** : l'intention ennemie, la tenue, le tier, la rareté, le lumen, le classement, le sac sont des lectures. Seuls le carnet, la chaîne et les signatures engagent.

## 11. Table figure → source → usage

| Figure | Source | Usage dans la v2 |
|---|---|---|
| l'arbre de feuilles WOTS+ | `federation.CleValidateur`, RFC 8391 | la vie (§4) — h = 5 par arithmétique et non par lore : **il faut le dire** (LIMITE) |
| la dalle 9×9, ses murs, ses occupants | `tour.dalleDe`, `tour.occupantsDe` [FIXE] | le champ de bataille et le nombre d'ennemis (§5.3) |
| les quatre axes de somme 64 | `combat.ts`, loi de conservation [FIXE] | la résolution (§2.2) |
| l'accord | produit scalaire de deux quaternions, `resonance.ts` | le seul terme d'affinité, jamais une table (§2.3) |
| les Indéchiffrés | `LORE_CHAMBRE.md` (L'Inconnu = Uranie), la doxa et les 101 formes, `SPEC_BROUILLARD.md` | l'adversaire (§7) |
| le tamis d'un mot illisible | le gardien d'antre, `SPEC_TOUR.md` §4.3 (17 essais en moyenne) | la population des Indéchiffrés (§7.2) |
| les gestes franchir / parler / ouvrir / prendre | `ascension.ts`, `hotes.ts`, `fouilles.ts`, `capsules.ts` | ce qui signe encore (§4) |
| les noms de salles | `oeufs-data.ts` (64 noms d'ère), `integrite.glypheLecture` | C1, une salle par bande |
| les six tournures des fantômes | `cosmic_history.md`, hiérarchie des œufs légendaires, sans statistiques | C2 (§9.5) |
| le premier bloc du jour, les deux têtes | `temoin.ts`, `federation.py` (`tete_signee`) | C7 (§9.2) |
| la pièce d'ancrage, la preuve Merkle | `ancrage.ts`, `merkle.ts`, `SPEC_SYBIL.md` §2 | ce qui compte |
| les trois moments d'arrêt | le poste du jour (`poste.ts`, trois blocs) | salles 3, 6, 9 (§6.2) |
| les portes à sceau | `sceaux.ts`, reliques QR | `fin = porte` ; leurs gardiens sont des Indéchiffrés (§7.2) |
| l'ordre lexicographique | `tactique/ia.ts` | le classement (§9.4) |

Rien ici n'emprunte aux statistiques, aux rangs, aux multiplicateurs ni à l'incubation de la réserve d'origine (`TRANSPOSITION_EIDOLON.md` §5).

Les sept décisions d'identité de la v1 **tiennent toutes** : C1 salles nommées par l'ère de leur œuf · C2 fantômes nommés par les six tournures · C3 gardiens nommés par le séparateur de leur bande · C4 « la Veillée est un mode d'Eidos » · C5 le pion est le glyphe de l'objet porté · C6 l'arbre s'affiche comme un arbre parce que c'en est un · C7 bloc du jour = premier bloc après minuit UTC. Une seule est déplacée : C3, dont les gardiens sont désormais les Indéchiffrés des portes (§7.2).

## 12. Décisions à trancher, et leur falsification

| # | Décision | Recommandation | Falsification ou mesure exigée |
|---|---|---|---|
| **V1** | **La tenue et `reprendre`** | **assumer la tenue**, garder `reprendre`, corriger `SPEC_TOUR.md:14` et les textes | reprise > un coup médian (32) dans > 10 % des batailles, ou > 5 % de nulles imputables à une régénération ⇒ plafonner à une reprise par bataille |
| **V2** | **Ce qu'une feuille signe** | **une mort**, arbre h = 5, format `eidos-veillee/2` | 1 000 veillées au bot : > 80 % des runs finissent avec > 6 feuilles ⇒ h = 4 ; < 30 % atteignent la salle 9 ⇒ h = 6 en gardant « une feuille, une mort ». **Mesuré le 2026-09-14 (§4.5)** : à 9 salles les deux règles arrivent (997–1 000 ‰) ; « un coup » à 64 laisse 23 feuilles de butin, « une mort » à 32 en laisse 9 ; à 27 salles aucune n'arrive. Le seuil des six feuilles classe tout « trop long » : c'est un choix de butin qui revient à l'auteur (A17). **Mesuré avec un bot qui ramasse le 2026-09-15 (§4.5)** : à un geste par salle, 32 refuse un geste dans 168 ‰ des runs et se vide dans 105 ‰ ; à deux gestes, il se vide dans 658 ‰ ; 64 (un coup) finance deux gestes par salle (930 ‰ arrivent, 11 feuilles restantes). 32 finance un geste par salle, pas toujours ; 64 en finance deux |
| **V3** | **Condition de victoire d'une salle** | **les deux** : salle vide **ou** sortie atteinte ; le butin exige la salle vide | si moins d'une salle sur cinq est traversée sans être nettoyée, la sortie ne crée pas de choix ⇒ renchérir la mort, ou rapprocher la sortie de l'entrée |
| **V4** | **Combien d'unités par camp** | autant que d'Indéchiffrés, **trois au plus** | **non mesuré** : rejouer le banc en 3 contre 3 avant de livrer, cibles inchangées (\|r\| par axe < 0,30, quartile `lame+ecu` < 3×) |
| **V5** | **Permadeath du roster** (D5 de `SPEC_TACTIQUE.md`) | retirée de la run toujours ; **retirée du roster en bataille ancrée** — c'est le puits de l'économie | si le taux d'abandon après une perte dépasse un tiers, passer à la **relève** (`SPEC_PUITS.md` §6), jamais à la résurrection. **Mesuré le 2026-09-14 (§4.5)** : telle qu'écrite, la règle vide le roster à la salle 1 en médiane dans 996–1 000 ‰ des runs — une bataille gagnée coûte aussi des unités. Tranchée « oui » par l'auteur (A5), elle exige une contrepartie avant PR 5b : recrutement en cours de run, ou une mort qui ne compte que dans une bataille perdue (A28). **Mesuré le 2026-09-15 (§4.5)** : le recrutement plafonne à 120 ‰ d'arrivées ; « perdue » seule à 230 ‰ ; la réserve seule brûle 8,45 objets par run pour 818 ‰ ; **« perdue » sur une réserve de neuf arrive à 907 ‰ pour 3,69 objets par run** ; le cran en dessous, **une défaite coûte la première tombée seule, sur six objets : 995 ‰ pour 1,27** — le nombre d'objets par défaite est le réglage du puits, à l'auteur |
| **V6** | **Le seuil d'illisibilité** | `SEUIL_ILLISIBLE = 83` (palier `errant`, 389 tirages en moyenne) | si le tamis dépasse 4 096 tirages sur l'un des 255 étages, remonter à 85 ; mesurer le pire cas sur les 255 avant de coder |
| **V7** | **Le dos gradué, la charge relevée** | graduer le dos (dos `base/2`, **flanc** `base/4`, face 0) ; relever `CHARGE_PAR_CASE` de 4 à 7 pour rendre à la charge le plafond que `DIV_PAS` 32 lui a pris | le dos est **purement positionnel**, aucun axe ne l'achète : le modifier ne peut pas rouvrir §9 ter. La charge, si : remesurer les quatre \|r\| après |
| **V8** | **La rafale rétroactive, rouverte par le sac de 81** | rejouer K47 avec 81 places ; la fenêtre d'un jour redevient candidate | si une pièce neuve emporte plus de 60 objets d'un coup, adopter la fenêtre d'un jour (24 blocs) |
| **V9** | **Le classement** | lexicographique (salles, retirés, butin) | si deux fantômes indistinguables apparaissent plus d'une fois sur dix, ajouter le jour comme quatrième rang — jamais un poids |
| **V10** | **Les élixirs en bataille** | un geste `boire`, 1 ou 2 points d'action, **qui ne signe rien** | `SPEC_CHYMIE.md` LIMITE : « les douze poussent les quatre \|r\| vers zéro » est une **conception**, pas une mesure. À rejouer sur le banc dès que `boire` existe |

## 13. Modules et découpage

```
tactique/types.ts, unite.ts, grille.ts, bataille.ts   CODÉS — 79 contrôles
tactique/ia.ts                                        CODÉ — sans fichier de contrôles
tactique/indechiffres.ts                              le tamis (§7.2), le compte, la pose
tactique/sortie.ts (ou grille.ts)                     sortieDe(étage), la case publique (§5.1)
veillee.ts                                            hauteur 5, geste abattre, tag /2, rejeu de bataille
veillee-tour.ts                                       la bataille comme acte de salle ; SAC_PLACES = DALLE_N²
pendule.ts                                            ETAGES_PAR_BANDE : 3 → 1
depot.ts, veillees.yml                                le rejeu de bataille dans le juge de CI
```

| PR | Contenu | Dépend de |
|---|---|---|
| 1 | `ia.test.ts` et le banc rejoué en 3 contre 3 (V4) | — |
| 2 | les Indéchiffrés : tamis, compte, pose, textes sans nom ni fiche (V6) | 1 |
| 3 | la sortie et la salle vide (V3), le rendu de grille | 2 |
| 4 | la Veillée branchée : `abattre`, hauteur 5, `eidos-veillee/2`, neuf salles, `SAC_PLACES` (V2) | 3 |
| 5 | le dépôt d'une preuve de bataille, le juge qui rejoue, `batailles/` | 4 |
| 6 | les élixirs jouables, geste `boire` (V10) | 4 |
| 7 | le classement lexicographique, les fantômes de bataille (V9) | 5 |

Un chantier = une branche = une PR, jamais deux à la fois. Toute règle de refus a son contrôle qui la viole. Chaque `.test.ts` neuf s'ajoute **à la main** dans `package.json` et dans `CLAUDE.md` §2. Aucune de ces PR ne touche `eonis.py`, `genesis.json`, le format de chaîne, ni les six lois.

**Ce que la v2 rend faux dans les textes, et qu'il faudra corriger dans le lot qui l'implémente** (aucun de ces fichiers n'est touché ici) : `veillee-lexique.ts` (Thalie, « Soixante-quatre feuilles ») ; `i18n.ts`, clés `sous.veillee`, `veillee.lede`, `guide.08f`, `guide.meca.10t` et son corps (« soixante-quatre », « vingt-sept salles », « vingt-six fois ») ; `SPEC_TOUR.md:14` (« aucun point de vie ») ; `SPEC_TACTIQUE.md` §4 (D2) et §6 (le seuil). **Et un texte est déjà faux aujourd'hui, avant toute décision** : `i18n.veillee.lede` promet « un sac de vingt-sept places » quand `SAC_PLACES` en vaut 81.

## LIMITE

- **Rien de la bataille n'a été mesuré en bataille rangée.** Les 330 144 duels, les tiers, les démarches, le prix des axes : tout est en **1 contre 1**, sur une ou deux dalles, avec un budget de feuilles non contraignant. La formation, la télégraphie exploitée, le choix du moment d'engager et le budget serré du §4.3 ne sont pas mesurés — et c'est là que cette bible place l'espoir du malus d'extrémité. **Tant que ce n'est pas mesuré, la forge monte vers des objets plus rares et plus faibles : ne pas la livrer sans le dire au joueur.**
- **Neuf salles, la sortie, les Indéchiffrés et « une feuille, une mort » ne sont pas codés.** Le code d'aujourd'hui fait 27 étapes, quatre gestes, un arbre de 64 feuilles et une feuille par coup porté. Cette bible dit ce qu'il faut construire, pas ce qui existe : la marque d'état de chaque paragraphe est la seule chose qui engage.
- **L'arbre à h = 5 n'a pas d'ancre dans le lore, et on ne lui en invente pas.** 64 était le nombre des œufs et des glyphes ; 32 est le résultat d'une soustraction — 8 franchir, 24 pour vivre. Si l'auteur préfère l'ancre au budget, la sortie est h = 6 avec « une feuille, une mort » (§4.5), qui coûte 38 feuilles de confort et affadit le dilemme.
- **Le budget du §4.3 suppose un abattage par Indéchiffré et aucun mort du côté du joueur.** Une unité du coffre perdue ne rend aucune feuille, et une bataille perdue coûte tout ce qu'elle a coûté. Aucune de ces deux fréquences n'est mesurée.
- **Le nombre d'ennemis dépend du parcours du jour**, donc le budget d'une run va de 9 à 27 morts possibles selon le bloc. C'est voulu — un jour dense est un jour dur, public et le même pour tous — et **jamais mesuré** : un jour à 27 pourrait être injouable.
- **Le juge devient plus lourd.** Une grille, une portée, une zone de contrôle sont plus dures à garder identiques à l'octet qu'un parcours de pendule. Chaque règle nouvelle exige son vecteur gelé, et `traceBataille` change de format à la première évolution (une démarche, un élixir, un drapeau de plus).
- **Multi-comptes.** Le frein reste le compte GitHub et la pièce. Un joueur à trois comptes joue trois fois. Sur un testnet sans valeur, c'est une limite documentée, pas un trou à sur-blinder — et surtout pas avec une empreinte de navigateur.
- **Figures ≠ preuves, jusqu'ici compris.** La tenue, le tier, la rareté, le lumen, le sac, l'intention, le classement, l'illisibilité d'un mot : des lectures. Une bataille est une jauge. Seules la preuve exportée, la pièce dépensée et les signatures engagent — et les lumens d'une run ancrée doivent se **recalculer** du rejeu, jamais se déclarer.
