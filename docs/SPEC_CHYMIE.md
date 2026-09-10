# La chymie — douze élixirs et un catalogue de pierres

**Dépôt :** Oykdo/Eidos · **Statut :** conception + mesure, aucune ligne de code de jeu écrite · **Branche :** `tactique-moteur`
**Périmètre :** `atelier/` seul — `elixirs.ts`, `equipement.ts`, `objets.ts`, `chymie.ts`, `lecture.ts`, `glyphs.ts`, `pendule.ts`, `hotes.ts`, `tactique/`. Ni `eonis.py`, ni `genesis.json`, ni le carnet, ni `FORMAT 3`, ni `vecteurs.json`.
**S'appuie sur :** `SPEC_CRAFT.md` (la recette), `SPEC_LOOT_TIERS.md` (les 12 tiers, la loi 2⁻ᵗ), `SPEC_TACTIQUE.md` §0 et §3, `ETUDE_EQUILIBRAGE_TACTIQUE.md`, `SPEC_PUITS.md`, `ETUDE_MOBILITE.md`, `ETUDE_POLYBE_FRACTALE.md`, `TRANSPOSITION_EIDOLON.md`.
**Règle de lecture :** aucune phrase sans chiffre. Mesures : scratchpad, `node --experimental-strip-types`, préfixe `chy-`, rien d'écrit dans `atelier/`.

## 0. En cinq lignes
**L'information d'un douzième d'espèce est déjà dans le mot et personne ne la lit.** `especeDe` n'appelle que `etageDominant(glypheDe(o))` — vérifié, 0 écart sur 100 000 objets — alors qu'un glyphe porte **trois** étages à **quatre** états. Trois familles de quatre, sans une donnée neuve : la tria prima devient **12 espèces**, de 12,50 % à **3,125 %**, rapport 4,00× exact, aucune cellule vide.
Les douze noms ne sont pas de moi : le code d'un glyphe **est** un caractère chymique (6 bits des deux côtés, `codeDuGroupe` ↔ `caractereDe`, bijection vérifiée sur 64). Chaque espèce est un **paquet de caractères**, et son nom se prend dedans.
Côté forge : **13 axes × 3 angles = 39 pierres**, composantes entières, aller-retour `paqueter`/`depaqueter` exact, 0 violation de la somme 64 sur 416 000 produits. Gain mesuré : les 33 plafonds d'orbite s'atteignent en **2 pierres** au lieu de **jamais** (22,8 sur 33 en six pierres avec l'ancien catalogue).
**Ce n'est pas le catalogue qui casse la loi 2⁻ᵗ, c'est la visée.** La recette de `SPEC_CRAFT` §3.2 mène déjà 25,3 % des objets à T12 en 6 crafts avec les trois pierres actuelles ; mon catalogue y mène 38,8 % en **3**. Le catalogue est un levier de **vitesse** (×5 à k = 3), pas de plafond.
Ce qui rend la rareté, c'est le **prix**, et il se déduit : `prix(t) = 1/P(tier ≥ t) = 2^(t−1)` lumens — l'intégrale en couches. Un T12 coûte 2 048 lumens = **48,8 runs**, contre 85 à 285 runs d'attente : la forge est 1,7 à 5,8× plus rapide que le hasard, et elle **vise**. C'est tout ce qu'elle achète.

---

## 1. La trouvaille, vérifiée

`elixirs.ts:47` : `especeDe(o) = TRIA_PRIMA[etageDominant(glypheDe(o))].id`. `glypheDe` rend `[e₀,e₁,e₂]`, chacun dans 0..3 (`FIGURES = ["·","○","☽","✚"]`) : **64 états lus comme 3**. Contrôles :

| contrôle | résultat |
|---|---|
| `codeDuGroupe(groupeDuCode(c)) === c` sur 0..63 | 64/64 |
| `especeDe(o) === FAM[etageDominant]` sur 100 000 objets | **0 écart** |
| uniformité des 64 codes sur 100 000 tirages | min 1 492, max 1 650 (attendu 1 562,5), écart max **5,60 %** |
| familles actuelles, exact sur 64 | sel **30/64 = 46,88 %**, mercure 20/64 = 31,25 %, soufre 14/64 = 21,88 % |

**Les trois espèces d'aujourd'hui sont déjà déséquilibrées** (46,9 / 31,3 / 21,9) : `etageDominant` départage les égalités vers le bas, donc l'étage 0 gagne 30 fois sur 64. Ce n'est pas un défaut à corriger, c'est la forme du dé.

**Le degré, cinq lectures comparées** (exact sur les 64 codes ; une seule n'a pas de cellule vide) :

| lecture du degré | effectifs /64 | cellules vides | rapport |
|---|---|---|---|
| figure de l'étage dominant | 1 4 9 16 · 0 2 6 12 · 0 1 4 9 | 2 | ∞ |
| figure de l'étage suivant (f+1) mod 3 | 10 9 7 4 · 6 6 5 3 · 6 5 3 0 | 1 | ∞ |
| **somme des deux autres étages, mod 4** | **8 8 8 6 · 5 6 5 4 · 4 4 4 2** | **0** | **4,00** |
| minimum des deux autres | 16 9 4 1 · 12 6 2 0 · 9 4 1 0 | 2 | ∞ |
| somme des trois, mod 4 | 8 7 8 7 · 5 5 5 5 · 3 4 3 4 | 0 | 2,67 |

Retenue : **`degre = (e_{(f+1)%3} + e_{(f+2)%3}) mod 4`**, où `f = etageDominant`. C'est la seule qui lise *exactement les deux figures que le code jette* et qui peuple les douze cellules ; la somme des trois est plus plate (2,67×) mais relit la figure déjà consommée par la famille. Mesuré sur 100 000 objets : 12,47 / 12,49 / 12,56 / 9,32 — 7,88 / 9,36 / 7,76 / 6,16 — 6,32 / 6,25 / 6,34 / 3,11 %, soit ±0,10 point de l'exact. **Le déséquilibre est joli et il est compté sur 64, pas décrété** : quatre espèces à 1/8, une à 1/32.

## 2. Les douze élixirs

**Le nom se prend dans la cellule.** Chaque espèce est un ensemble de codes de glyphe, donc un ensemble de caractères de `chymie.ts` ; le nom retenu est l'un d'eux, choisi pour que la chimie réelle dise la famille. La règle est vérifiable : `caractereDe(code) ∈ espèce`. Les codes 48-49-50-51 tombent en sel·0/1/2/3 dans cet ordre et donnent **Sel alkali, Sel ammoniac, Sel commun** — la table s'écrit presque seule.

| espèce | part | clé i18n | FR | EN | signe | la chimie qui justifie | l'effet | où | PA |
|---|---|---|---|---|---|---|---|---|---|
| sel·0 | 12,50 % | `elixir.sel.0` | Sel alkali | Alkali salt | `selalkali` U+1F736 | l'alcali fixe **neutralise** l'acide | une résonance destructive est lue **neutre** (l'effet actuel du sel) | bataille, accord | 1 |
| sel·1 | 12,50 % | `elixir.sel.1` | Sel ammoniac | Sal ammoniac | `selammoniac` U+1F739 | le seul sel qui **sublime** : il monte sans fondre | portée lue **+1 case** ce tour (donc l'allonge, donc pas de riposte) | bataille, allonge | 1 |
| sel·2 | 12,50 % | `elixir.sel.2` | Sel commun | Common salt | `sel` U+1F714 | le sel **conserve** : il empêche la corruption | le coup qui la mettrait à 0 la laisse à **1 tenue**, une fois | bataille, tenue | **2** |
| sel·3 | 9,375 % | `elixir.sel.3` | Vitriol blanc | White vitriol | `vitriolblanc` U+1F717 | sulfate de zinc, **astringent** : il resserre, il ferme | la **charge** de l'attaquant est lue nulle contre elle ce tour | bataille, charge | 1 |
| mercure·0 | 7,8125 % | `elixir.mercure.0` | Bain-marie | Bain-marie | `bainmarie` U+1F76B | le seul feu où **rien ne s'évapore** : ce qu'on met, on le retrouve | **rend le PA** de la dernière action du tour — gratuit en tempo | bataille, tempo | 1 → 0 |
| mercure·1 | 9,375 % | `elixir.mercure.1` | Argent vif | Quicksilver | `mercure` U+263F | le métal qui **fuit sous le doigt** : on ne le saisit pas | la **parade** est accordée d'office (l'effet actuel du mercure) | bataille, parade | 1 |
| mercure·2 | 7,8125 % | `elixir.mercure.2` | Eau-de-vie | Aqua vitae | `eaudevie` U+1F708 | l'esprit distillé **porte** | le **pas** est lu comme celui de l'unité la plus vive de la dalle | bataille, déplacement | 1 |
| mercure·3 | 6,25 % | `elixir.mercure.3` | Esprit de vin | Spirit of wine | `esprit` U+1F747 | l'esprit **rectifié**, le plus volatil de tous | **+2 PA** ce tour — frapper, frapper, se retirer | bataille, tempo | 1 → +1 |
| soufre·0 | 6,25 % | `elixir.soufre.0` | Quinte essence | Quintessence | `quintessence` U+1F700 | la cinquième essence, l'agent de **transmutation** | une pierre tourne une pièce **sans forgeronne** (l'effet actuel du soufre) | forge | **2** |
| soufre·1 | 6,25 % | `elixir.soufre.1` | Antimoine | Antimony | `antimoine` U+2641 | sulfure d'antimoine, le **loup des métaux** : il dévore tout sauf l'or | la prochaine forge de la run **ne coûte aucun lumen** | forge | 1 |
| soufre·2 | 6,25 % | `elixir.soufre.2` | Arsenic | Arsenic | `arsenic` U+1F73A | orpiment et réalgar, sulfures d'arsenic : le poison qui **ouvre** les métaux | force une fois la porte de la forge spéciale : la paire est lue admissible | forge spéciale | 1 |
| soufre·3 | **3,125 %** | `elixir.soufre.3` | Eau-forte | Aqua fortis | `eauforte` U+1F705 | tirée du nitre et de l'huile de vitriol ; l'**essai** de l'orfèvre, elle dissout tout sauf l'or | les trois destinations du pendule sont lues **avec leur hôte**, plus seulement leur étage | route (`ascension.ts`) | **2** |

**La répartition n'est pas décorative : elle suit les familles.** Sel et mercure agissent en bataille (stabilité, tempo) ; **soufre agit à la forge et sur la route** — c'est sa définition depuis `elixirs.ts:9`. Aucun des douze ne touche la norme, les axes ni le mot : chacun change une **lecture** d'un terme de la résolution du §3, jamais un nombre de `combatDe`.

**L'élixir sur la route est une intégrale curviligne** : l'eau-forte lit ce que valent les trois chemins, pas la salle d'arrivée. C'est la seule des formes d'intégration de la planche qui ait un sens sur une route à choix ; les autres seraient des sommes déguisées.

## 3. Le coût en points d'action, et pourquoi ce dosage

2 PA par unité et par tour ; se déplacer 1, frapper 1 **et une feuille**, boire 1 ou 2, passer termine le tour. **Boire ne signe rien** : aucun geste `boire` n'entre dans `veillee.ts`, le format signé ne bouge pas d'un octet.

- **1 PA (sept élixirs)** : un appoint qui se glisse dans un tour. Chacun rend une seule fois un terme que la résolution fait payer à un axe — portée, charge, accord, parade, pas. Le tour reste utilisable : boire + frapper, ou boire + se retirer.
- **2 PA (trois élixirs)** : le tour entier. `sel·2` sauve une unité du retrait — cela vaut plus qu'un coup, donc cela coûte le coup. `soufre·0` et `soufre·3` sont hors bataille : ils consomment le geste de la salle, ce qui est le même prix.
- **Les deux exceptions de tempo.** `mercure·0` coûte 1 PA et le rend : net nul, mais il consomme la fiole et une place au sac — c'est un tour de 3 gestes payé en objet. `mercure·3` coûte 1 PA et en donne 2 : **c'est l'effet le plus fort du modèle**, et il est à 6,25 % (le plus rare du mercure). À surveiller (D3).

**La règle d'équilibrage, par construction.** Chaque élixir de bataille remplace le prix d'un axe, donc **baisse la valeur marginale de cet axe**. Les quatre |r| mesurés sont `lame` −0,041, `ecu` +0,040, `eperon` +0,126, `arc` −0,129 : `sel·1` remonte `arc`, `sel·3` et `mercure·2` descendent `eperon`, `sel·2` descend `ecu`, `mercure·3` remonte `lame`. **Les douze poussent les quatre |r| vers zéro.** C'est une prédiction de conception, **pas une mesure** — voir LIMITE.

## 4. Le catalogue des pierres

Une pierre est un quaternion entier `(w, v)` : **l'axe** est la direction de `v`, **l'angle** est `2·atan(|v|/w)`, décrit sans flottant par la **torsion** `1000·w/|q|` (patron d'`alignementCentiemes`). `w = isqrt(724² − |v|²)` : l'entier que `depaqueter` reconstruira, donc l'aller-retour est exact par construction. L'existant est `[719,80,0,0]` et ses deux rotations d'axe, torsion 994‰.

**Treize axes** : les trois purs `i, j, k` ; les six arêtes `i±j, i±k, j±k` ; les quatre diagonales `i+j+k, i+j−k, i−j+k, i−j−k`. Pas besoin de `troisCarres` : la direction est exacte par multiple entier, `v = t·u`. **Piège trouvé** : `(−1,1,1)` n'est **pas** un point fixe de `paqueter∘depaqueter` — `canon3` renverse la part vectorielle quand la première composante stockée est négative, et rend la rotation conjuguée. La quatrième diagonale s'écrit donc `(1,−1,−1)`. Après correction : **52 pierres, 52 mots distincts, 0 non-fixe, 0 doublon.**

**Trois angles**, échelle de dureté de Mohs — l'angle d'une pierre est sa dureté :

| angle | `|v|` | pierres pures | arêtes | diagonales | torsion | θ | FR / EN | signe | Mohs |
|---|---|---|---|---|---|---|---|---|---|
| fin | 80 | `[719,80,0,0]` | `[719,57,57,0]` | `[719,46,46,46]` | 994‰ | 12,70° | **Talc / Talc** | `talc` U+2715 | 1 |
| moyen | 160 | `[706,160,0,0]` | `[706,113,113,0]` | `[706,92,92,92]` | 976‰ | 25,54° | **Aimant / Lodestone** | `aimant` U+1F753 | 5,5 |
| gros | 320 | `[649,320,0,0]` | `[649,226,226,0]` | `[649,185,185,185]` | 897‰ | 52,49° | **Marcassite / Marcasite** | `marcasite` U+1F738 | 6,25 |

`|q|²` va de 523 309 à 524 036 contre 724² = 524 176 : déficit **140 à 867**, l'existant est à 815 — **toutes les pierres neuves sont au moins aussi près de la sphère que celles d'aujourd'hui.** Trois angles × 13 axes = **39 pierres**, 78 affixes (préfixe T, suffixe S), contre 3 et 6.

**T et S donnent le même plafond** : `Re(g·q) = Re(q·g) = g₀q₀ − g⃗·q⃗`. Le côté change les axes, jamais l'orbite. C'est la raison géométrique pour laquelle six affixes n'ont jamais valu que trois leviers.

## 5. Contrôlabilité — le vrai gain, chiffré

BFS dédoublonné sur le mot, frontière plafonnée à 3 000 (déterministe, tri croissant), 16 départs, profondeur 6. Le **plafond** est l'extrémité maximale à orbite constante, `E3` de la répartition `(|q₀|, |v|, 0, 0)` allouée à 64 : il ne prend que **33 valeurs**, toutes ≥ 1 024, donc le tier-plafond vit dans T5..T12 — **aucun objet n'a un plafond sous T5.**

| pierres | ancien 3×1 (6 affixes) | 13×2 (52) | 13×3 | **13×3 = neuf** |
|---|---|---|---|---|
| 1 | 3,4 plafonds · 1,69 tiers | 14,1 · 5,00 | — | **20,5 · 6,44** |
| 2 | 7,9 · 2,69 | 30,1 · 7,63 | — | **32,9 · 8,00** |
| 3 | 12,3 · 3,63 | **33,0 · 8,00** | — | **33,0 · 8,00** |
| 6 | **22,8 · 6,63** | 33,0 · 8,00 | — | 33,0 · 8,00 |

**Avec l'ancien catalogue, 10 des 33 plafonds sont hors d'atteinte en six pierres ; avec le neuf, les 33 s'atteignent en deux.** Forge gloutonne, 300 départs : le plafond maximal (3 072, la pointe 64/0/0/0) est atteint par 26 % des objets en 3,58 pierres avec l'ancien, par **87 % en 1,94** avec 13×3. C'est là qu'est la différence entre tourner en rond et **viser**.

Par angle seul, une pierre, glouton sur 13 axes : `|v|`=80 → tier-plafond médian **6** ; 160 → **8** ; 320 → **12** ; 480 → 12. **L'échelle d'angle est réelle jusqu'à 320 et sature après** : c'est la mesure qui écarte le quatrième angle.

## 6. L'effet sur la loi 2⁻ᵗ — et le coupable n'est pas le catalogue

Tiers de `SPEC_LOOT_TIERS` §5 (`E3 = Σ axe² − 1024`, 11 seuils). Tirage naturel mesuré sur 100 000 : 48,43 / 27,51 / 12,14 / 5,87 / 3,00 / 1,55 / 0,737 / 0,376 / 0,195 / 0,110 / 0,046 / **0,039 %**.

**Forge aveugle** (la pierre est celle qu'on a, tirée de la graine), 4 000 objets : après 6 pierres, T12 passe de 0,10 % à **0,17 %** (ancien) ou **0,20 %** (neuf). **Négligeable — tourner au hasard ne fabrique pas de rareté.**

**Forge visée** (recette `SPEC_CRAFT` §3.2, K = 16, la pierre choisie pour le plafond puis la conjugaison choisie pour `E3`), 400 objets :

| catalogue | 1 craft | 3 crafts | 6 crafts |
|---|---|---|---|
| ancien 3×1 | 1,00 % T12 | 7,75 % | **25,25 %** |
| neuf 13×3 | 8,25 % | **40,00 %** | 38,25 % |

**La loi 2⁻ᵗ est déjà détruite par la recette existante** : 25 % de T12 en six crafts contre 0,039 % au tirage, soit **648×**. Mon catalogue multiplie le taux par **5,2 à k = 3** et par **1,5 à k = 6** : il déforme la **vitesse**, pas le point d'arrivée. Écarter le catalogue ne sauverait donc rien ; ce qu'il faut, c'est un prix (§7).

## 7. Le prix — l'intégrale en couches, payée en lumens

**Rien de tout cela ne se paie en eidôla.** `SPEC_PUITS` §2.4 : 8 envois par bloc, **192 transactions/jour pour le réseau entier** ; un paiement par craft ne rentre pas dans les blocs, quel qu'en soit le prix. Le **lumen** est une jauge (`tour`, hors feuille, comme les hôtes et les secrets) : zéro octet de consensus, granularité libre, et **il s'évapore en fin de run**. Contrôle : « lumen » ne collisionne avec **aucun** des 107 signes de `chymie.ts` (0 sur 107).

**Le rendement d'un abattage est le tier de l'abattu, 1 à 12 lumens.** C'est la formule du gâteau en couches, à l'endroit :
`E[tier] = Σ_t P(tier ≥ t) = Σ_{t=1}^{12} 2^−(t−1) = 2 − 2⁻¹¹` — **dyadique exact, aucun flottant**. Mesuré sur le tirage réel : **1,996**. σ = 1,38 par abattage.
*Le candidat concurrent est écarté par le chiffre* : l'illisibilité (100 − proximité au catalogue) a une étendue de **21 points** (min 0, max 21, σ 2,90) contre **2 048×** pour le tier, et elle rend 0 lumen sur les objets les plus fréquents. Jolie, morte.

**Revenu d'une run de 9 batailles**, 64 feuilles, mesuré sur 5 000 runs :

| feuilles / abattage | abattages | lumens / run |
|---|---|---|
| 2 | 27 | 53,9 ± 7,1 (p05 43, p95 66) |
| 3 | 18 | **36,0 ± 5,9** (p05 27, p95 46) |
| 4 | 9 | 18,0 ± 4,1 (p05 12, p95 26) |

Retenu : **≈ 42 lumens par run**, σ ≈ 7 — **une run malchanceuse ne tombe jamais à zéro** (p05 = 27, soit encore un craft T5).

**Le barème, à l'envers de la même intégrale** : `prix(t) = 1/P(tier ≥ t) = 2^(t−1)` lumens. Payer un T*t*, c'est payer **le nombre de tirages qu'on s'épargne**.

| tier | T3 | T4 | **T5** | T6 | T7 | T8 | T9 | T12 |
|---|---|---|---|---|---|---|---|---|
| prix | 4 | 8 | **16** | 32 | 64 | 128 | 256 | **2 048** |
| runs | 0,1 | 0,2 | **0,4** | 0,8 | 1,5 | 3,0 | 6,1 | **48,8** |

**Cible tenue : 42 / 16 = 2,6 → deux crafts T5 par run**, ou un T6, ou l'épargne. Et T12 coûte 48,8 runs contre 85 à 285 runs d'attente (0,039 % sur 9 à 30 objets vus par run) : **la forge est 1,7 à 5,8× plus rapide que le hasard, et ce qu'on paie en plus, c'est de choisir.** Le prix rend à la loi 2⁻ᵗ ce que la visée lui a pris, à un facteur 2 à 6 près.

**On ne paie pas la pierre, on paie la sortie.** Tarifer l'angle reviendrait à tarifer une *possibilité* : un gros angle sur un mauvais mot ne produit rien de rare, et l'intégrale en couches ne sait mesurer qu'une rareté **réalisée**. La pierre est du butin — la générosité porte sur la matière, jamais sur le tier.

**Où sont les forges.** 5 000 runs de 9 salles, ~22 abattages, le joueur achète le craft le plus cher qu'il peut :

| forges (rang de salle) | crafts / run | tier moyen | bourse portée | évaporé au sommet |
|---|---|---|---|---|
| 3 et 6 | 2,00 | 4,57 | 10,0 | **19,7 (47 %)** |
| 4 et 8 | 2,00 | 4,98 | 11,0 | 12,1 (29 %) |
| **5 et 9** | 2,00 | **5,16** | 12,9 | **7,6 (18 %)** |
| 6 et 9 | 2,00 | 5,17 | 13,4 | 6,7 (16 %) |
| 9 seule | 1,00 | 5,99 | 21,4 | 12,9 (31 %) |

**Les forges tôt gaspillent** : en salles 3 et 6, presque la moitié du revenu s'évapore parce que la bourse n'est pas encore faite. Retenu : **salles 5 et 9**, au **rang de la salle visitée**, pas à la bande — le pendule rend la bande émergente, une forge « dans la bande d'Érato » serait une forge chanceuse. Une forge en salle 9 n'est pas perdue : le sac est le butin, et l'améliorer est la dernière décision de la run.

**Et Érato ne peut rien garder.** Mesuré sur les parcours réels : la muse d'une bande se tient à l'étage médian, atteint par **11,1 %** des crans du pendule quand la bande donne trois salles, **3,7 %** quand elle n'en donne qu'une. Érato est donc croisée **une run sur 9 au mieux, une sur 27 au pire** (mesure directe sur 4 000 runs de 27 salles : moyenne 0,132, **médiane 0**, 86,8 % de runs sans elle). Une forge gardée par Érato serait une frustration, pas un événement : **les forges sont des cases de la dalle**, une des 16 de la poussière de Cantor, et Érato reste un **bonus** — quand on la croise, son craft est gratuit (c'est ce que fait déjà `soufre·1`).

## 8. La forge spéciale — elle rend une démarche, le carré de Polybe la garde

Elle ne change pas les axes : elle change la **démarche** (`ETUDE_MOBILITE.md`, les sept du pochoir, 1,15× d'écart, sous le seuil de 2×). Sa porte est le carré 8×8 des 64 signes lu en Sierpiński : le signe d'un objet est une case `(ligne, colonne) = (code >> 3, code & 7)`, et deux objets sont admissibles si `(ligne_A & colonne_B) === 0` — **27 cellules sur 64**, une opération entière.

- Admissibilité mesurée sur des **paires du sac** (9 objets, 4 000 runs) : **42,44 %** des 72 paires ordonnées, contre 42,19 % en uniforme — le sac est uniforme, la mesure le confirme. **30,6 paires admissibles par run** (p05 = 15), **0,00 % de runs sans aucune paire.** Dans la fenêtre demandée (10–50 %), près du haut : la porte trie, elle ne bloque pas.
- Non-trivialité : `démarche = sha256d("eidos-demarche/1" ‖ mot_A ‖ mot_B)[0] mod 7` sort 13,97 à 14,52 % par démarche ; χ²(démarche | ligne) = 69,1 pour 48 degrés, χ²(démarche | tier) = 97,9 pour 66. **Le résidu est celui du modulo** : 256 = 7×36 + 4, donc les résidus 0..3 pèsent 37/256 au lieu de 36/256 (+2,7 %). À corriger par rejet — prendre le premier octet < 252 — sinon deux démarches sur sept sont mesurablement plus fréquentes.

## 9. Ce que j'écarte, et pourquoi

- **Le quatrième angle (`|v|` = 480, 83,06°, torsion 749‰, nom disponible : Cristal / Crystal, `cristal` U+25C7, Mohs 7).** Il fait passer le plafond maximal de 1,94 à 1,66 pierre et la part d'objets qui l'atteignent de 87 à 90 % — **+33 % de catalogue pour +0,28 pierre**. Le tier-plafond médian sature déjà à 12 avec 320.
- **Tarifer la pierre par son angle.** Le barème par couches donnerait 32 / 128 / 2 048 lumens (tier-plafond médian 6 / 8 / 12) contre 42 lumens de revenu par run : les deux gros angles seraient invendables et le petit surpayé.
- **L'illisibilité comme rendement d'abattage** : étendue 21 points contre 2 048×, et 0 lumen sur les objets les plus courants.
- **La lecture du degré par la figure dominante** (la plus littérale) : deux espèces vides, dont mercure·0 et soufre·0.
- **Un treizième élixir « permanent »** : `TRANSPOSITION_EIDOLON.md` §4.1 l'a déjà refusé — un bonus permanent est une puissance.
- **Payer la forge en eidôla** : 192 transactions par jour pour tout le réseau, 0,3 craft/jour à N = 1 000 font 300 transactions. Physiquement impossible (`SPEC_PUITS` §2.4).

## Décisions à trancher

1. **Le degré, somme des deux autres ou somme des trois ?** Retenu : les deux autres (rapport 4,00×, une espèce à 1/32). La somme des trois est plus plate (2,67×) et relit la figure déjà consommée par la famille. *C'est un choix de rareté, pas de justesse.*
2. **`objetElixir` cherche plus longtemps.** Avec 12 espèces au lieu de 3, la graine avance en moyenne 8 fois (espèce commune) à **32 fois** (soufre·3) au lieu de 3. Le plafond de 4 096 tient largement, mais le coût par élixir est multiplié par ~10. *Recommandation : garder ; c'est du hachage, pas de la preuve.*
3. **`mercure·3` (Esprit de vin) donne 2 PA pour 1.** C'est le seul effet du lot qui puisse produire deux coups dans un tour — donc deux feuilles. À 6,25 % il est rare, mais un joueur qui les accumule fait une run à 3 PA. *Recommandation : le publier à +1 PA net et le remesurer dès que le moteur a des PA ; le replier sur « +1 PA » s'il domine.*
4. **La forge spéciale en salle 9 ou en salle 6 ?** La mesure dit 9 (évaporation 18 % contre 47 %), le lore dit 6 (la halle d'Érato). Mais Érato n'est croisée qu'une run sur 9. *Recommandation : la case, pas la muse — salle 9, et Érato en bonus quand elle est là.*
5. **Faut-il un plancher de prix par craft ?** À 1, 2 et 4 lumens, T1 à T3 sont quasi gratuits (42 crafts par run) et le sac de 27 places devient le seul frein. *Recommandation : plancher à 4 lumens, ou refuser un craft dont la sortie n'est pas d'un tier au-dessus de l'entrée.*
6. **Le déséquilibre des familles (46,9 / 31,3 / 21,9) est-il assumé ?** Il vient de la règle d'égalité d'`etageDominant`, gelée par l'usage. *Recommandation : l'assumer et l'écrire — le sel est commun, c'est ce que dit son nom.*

## LIMITE

- **Aucun élixir n'a été mesuré sur le banc, et ce n'est pas un oubli.** `tactique/bataille.ts` **n'a pas de points d'action** : un élixir qui coûte 1 ou 2 PA ne peut pas être joué par le moteur actuel. La règle du §3 (« les douze poussent les quatre |r| vers zéro ») est une **conception**, pas une mesure. Elle doit être rejouée sur `chy-banc.ts` dès que les PA existent, avec la cible R2 : |r| par axe < 0,15, quartile `lame+ecu` < 1,5×.
- **Les 12 espèces sont une lecture, pas une identité.** Le mot, l'archétype et l'âge restent seuls dans `feuilleObjet`. Changer la lecture du degré ne change aucun sceau, aucune racine, aucun vecteur gelé.
- **Le plafond n'est pas le tier.** Toutes les mesures du §5 portent sur l'extrémité *atteignable à orbite constante*. Ce qu'un joueur obtient dépend en plus de la conjugaison, dont `SPEC_CRAFT` LIMITE rappelle qu'elle n'est pas prouvée uniforme et qu'elle arrondit (|q₀| conservé exactement dans 97,03 % des cas).
- **Le revenu en lumens suppose 9 batailles, 2 à 4 feuilles par abattage et un abattage par ennemi.** Aucune de ces trois valeurs n'a été mesurée sur une bataille rangée réelle ; elles viennent de `SPEC_TACTIQUE` §4 et de duels 1v1. Le barème se recalera au premier jeu mesuré ; le seul chiffre à surveiller est **lumens gagnés / lumens dépensés par run**, cible 42/32 = 1,3.
- **Le prix ne rétablit la loi 2⁻ᵗ qu'en espérance.** Un joueur qui épargne 49 runs obtient un T12 **choisi**, ce que le tirage ne donne jamais. La rareté du T12 forgé est économique, celle du T12 tiré est géométrique : elles ne sont pas la même chose et le marché les distinguera.
- **Figures ≠ preuves.** L'espèce, le degré, le tier, le plafond, la démarche, le lumen : des lectures. Seuls le carnet, la chaîne et les signatures engagent — et les lumens d'un run ancré doivent se **recalculer** du rejeu de la bataille, jamais se déclarer. Aucun geste `boire` ni `forger` ne signe : le format de `veillee.ts` ne change pas.
