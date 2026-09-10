# Mobilité — une démarche par unité, et ce qu'elle coûte

**Dépôt :** Oykdo/Eidos · **Statut :** prototype et mesure, aucune ligne écrite dans `atelier/` · **Branche :** `tactique-moteur`
**Question posée :** l'auteur veut que chaque unité ait sa **démarche**, comme une pièce d'échecs, et non seulement sa portée. Le moteur ne fait varier aujourd'hui que la *distance* (`pas(u) = 2 + eperon/12`, 2 à 7). Une démarche n'a pas de budget : si elle n'en a pas, elle rouvre le power creep que la somme 64 ferme partout ailleurs.
**Périmètre :** `tactique/{types,grille,unite,bataille}.ts` recopiés dans le scratchpad (`mob-*.ts`) et modifiés là ; le banc de `SPEC_LOOT_TIERS.md` recopié en `mob-banc.ts`. Rien de la chaîne, rien de l'atelier.
**Règle de lecture :** aucune phrase sans chiffre. Toutes les mesures tournent sur le **vrai moteur** (`ouvrirBataille` / `jouer` / `finDePhase`), étage 149, région connexe 47 cases, 8 distances d'engagement × 3 politiques, 218 784 duels par configuration.

## 0. En sept lignes
**Une démarche ne peut pas être un jeu de pas.** Théorème, trois lignes (§2) : le seul jeu de 4 vecteurs clos par le quart de tour qui engendre Z² est {±(1,0), ±(0,1)}. Tout cavalier, tout fou, toute enjambée **enferme l'unité dans un sous-réseau** — 1 case sur 2, sur 4 ou sur 5 de la dalle. Les échecs y survivent avec 64 cases et 16 pièces ; une unité seule sur 47 cases praticables, non.
La seule lecture qui tienne est **la démarche comme masque d'arrivée** : la marche reste orthogonale (mêmes obstacles, même zone de contrôle), seul l'ensemble des cases où l'on a le droit de **s'arrêter** change.
**Le budget existe, et il est exact** — mais il y en a deux, et chacun casse autre chose. À compte constant (régime A), `eperon` explose : r passe de +0,106 à **+0,736**. À rayon constant (régime B), le compte suit la densité du masque et **30 % des duels ne se concluent plus**.
**La matrice démarche contre démarche est plate** avec le bon catalogue : bande **7,2 pt**, rapport meilleure/pire **1,15×**, pire tête-à-tête **1,38×** — très en dessous des 2× du seuil de marché. Aucune démarche ne domine.
**Le malus d'extrémité ne bouge presque pas** : 28,80 pt de bande → 25,91 pt. Le gain apparent de 10 pt de la première lecture était **un artefact des nuls comptés à 0,5**.
**Le gain de décision est négatif** en régime B (1,45 issues distinctes par tour contre 1,50 au moteur d'aujourd'hui).
**Verdict : ne pas livrer les démarches singulières comme levier d'équilibrage.** Comme saveur, oui, et seulement le catalogue de pochoirs en régime B, après avoir réglé les 30 % de nuls.

## 1. Ce qui a été mesuré, et comment
`mob-grille.ts` remplace `accessibles`/`chemin` par : BFS orthogonal inchangé (N, E, S, O, obstacles, occupants, zone de contrôle), puis filtre par le **masque** de la démarche sur l'écart (|dx|, |dy|), puis, en régime A, troncature au budget. Le tri est total et figé — (coût BFS, y, x) — donc `chemin()` reste déterministe et `traceBataille` inchangée. Aucun flottant : `&`, `%`, base 3, popcount.

| régime | règle | ce qui est constant |
|---|---|---|
| **0** | le moteur d'aujourd'hui | référence |
| **A** | les **K = 2·pas² + 2·pas** cases masquées les plus proches | le **compte** ; le rayon s'étire |
| **B** | les cases masquées à coût ≤ `pas` | le **rayon** ; le compte suit la densité |

Dans les deux régimes `pas` reste acheté par `eperon` (contrainte 3), la marche reste orthogonale, et **la zone de contrôle mord exactement comme aujourd'hui** : aucune démarche ne saute par-dessus une ligne, puisqu'aucune ne saute (§2). C'est le principal bénéfice de la lecture « masque ».

## 2. Le théorème qui ferme la lecture « pièce d'échecs »
Soit `S = {±v₁, ±v₂}` un jeu de 4 pas, clos par la rotation d'un quart de tour `R`. `R` n'a pas de vecteur propre réel, donc `Rv₁ ≠ ±v₁`, donc `Rv₁ = ±v₂`. Alors `det(v₁, v₂) = ±det(v₁, Rv₁) = ±|v₁|²`. Le réseau engendré a pour indice `|v₁|²` ; il vaut Z² **si et seulement si** `|v₁|² = 1`, c'est-à-dire `v₁ ∈ {±(1,0), ±(0,1)}`. **Une seule démarche isotrope sans verrou existe : l'orthogonale.**
Les trois sorties, toutes mesurées ou fatales :
- **abandonner l'isotropie** (cisaillements, det ±1) : le budget est exact, mais la démarche dépend de l'orientation de la dalle — le camp du haut ne joue pas le même jeu que celui du bas ;
- **abandonner l'indice 1** : cavalier (indice 5), oblique (2), enjambée (4). Le verrou se paie en jeu : une unité « oblique » ne peut **jamais** s'arrêter sur une case orthogonalement adjacente, donc jamais frapper à portée 1. Mesuré au catalogue 1 : les 4 masques qui contiennent l'adjacence gagnent **56,5 %** en moyenne, les 5 qui ne la contiennent pas **44,8 %** — **11,8 pt pour une seule case du masque** ;
- **abandonner les 4 pas** (le roi, 8 pas) : le compte double, `(2p+1)²−1` contre `2p²+2p`. Plus de budget du tout.

## 3. Le catalogue — carré de Polybe, matrice de substitution gelée
Deux catalogues ont été mesurés. Le premier balaie l'espace des idées, le second est le seul qui tienne.

**Catalogue 1 — les neuf masques d'étude** (`mob-demarches.ts`). Polybe 3×3, la ligne dit la famille, la colonne la variante.

| | colonne 0 | colonne 1 | colonne 2 |
|---|---|---|---|
| **ligne 0** — directions | `plein` (tout) | `croix` (a=0 ou b=0) | `sautoir` (a=b) |
| **ligne 1** — parités | `pair` ((a+b) pair) | `impair` ((a+b) impair) | `toque` (Thue-Morse, pop(a)≡pop(b)) |
| **ligne 2** — fractales | `crible` (Sierpiński, a&b=0) | `noeud` (a&b≠0) | `tiers` (Cantor, aucun chiffre 1 en base 3) |

**Catalogue 2 — le pochoir de Polybe**, et c'est le bon. L'écart (|dx|, |dy|) se lit **modulo 3** : (a mod 3, b mod 3) *est* un couple ligne/colonne dans un carré de Polybe, et le carré se répète sur la dalle comme un pochoir. Une démarche est un sous-ensemble du carré. Trois contraintes, chacune tirée d'une mesure :

1. **symétrique en a↔b** — sinon la dalle a un haut et un bas ;
2. **elle contient la classe {(0,1),(1,0)}** — sinon jamais d'adjacence, et c'est 11,8 pt (§2) ;
3. **exactement 5 cases sur 9** — c'est le budget : même densité pour toutes.

Il y en a **exactement sept**, et elles ne sont pas choisies, elles sont énumérées : la classe {01} pèse 2 cases, il reste 3 cases à prendre parmi 00(1), 02(2), 11(1), 12(2), 22(1).

| nom | classes du pochoir | lecture au joueur |
|---|---|---|
| `axe` | 01+00+11+22 | la diagonale du pochoir et ses voisines |
| `ecart` | 01+00+02 | les multiples de 3 et leurs voisines |
| `gond` | 01+00+12 | le coin et la charnière |
| `moyeu` | 01+11+02 | le centre du pochoir |
| `fuseau` | 01+11+12 | le centre allongé |
| `arete` | 01+22+02 | les deux coins |
| `losange` | 01+22+12 | le coin et sa charnière |

**La clé de rangement est l'archétype** : neuf muses, sept démarches, `polybe(rang/3, rang mod 3)`. Le confondant a été vérifié — sur 200 000 objets, la moyenne de chaque axe par muse va de **15,86 à 16,12 sur 64** (écart 0,26) : lier la démarche à la muse **ne corrèle pas** la démarche au profil d'axes. Les 21 cellules de la doxa n'ont pas été retenues : 21 démarches sont illisibles pour un joueur qui enchaîne 27 salles.

## 4. Mesure 1 — le budget existe-t-il ?
Cases d'arrivée moyennées sur les cases libres de la dalle réelle.

| catalogue · régime | p=2 | p=3 | p=4 | p=5 | p=6 | p=7 | rapport max/min |
|---|---|---|---|---|---|---|---|
| cat. 1 · B (rayon constant) | 1,3–5,3 | 1,3–8,5 | 2,5–11,6 | 2,5–14,6 | 2,8–17,5 | 2,8–20,0 | **4,06× à 7,22×** |
| cat. 1 · A (compte constant) | 5,5–11,0 | 5,5–21,8 | 5,5–36,3 | 5,5–41,7 | — | — | **2,01× à 7,63×** |
| cat. 2 · B | 2,3–5,3 | 3,6–6,5 | 6,5–8,4 | 7,9–10,0 | 9,0–11,7 | 11,0–13,2 | **1,20× à 2,30×** |
| **cat. 2 · A** | 10,9–11,0 | 21,2–21,8 | 22,5–25,5 | 22,5–25,5 | 22,5–25,5 | 22,5–25,5 | **1,00× à 1,13×** |

**Réponse : oui, le budget de démarche existe, et il est exact.** Deux conditions : le catalogue doit être à densité constante (pochoirs, 5/9), et le régime doit être A. Sur un plan infini c'est exact par construction ; sur la dalle 9×9 le reste d'écart (1,13×) est la troncature du bord.
Deux faits qui bordent ce résultat : la dalle réelle plafonne à **41,7 cases atteignables** — au-delà de `pas = 4`, `eperon` n'achète déjà plus rien, régime ou pas ; et en régime B le taux de victoire d'une démarche est **expliqué par son compte de cases** (r = **+0,86** entre compte moyen et taux, catalogue 1), en régime A par son compte réalisé (r = **+0,73**). Le budget n'est donc pas un ornement : c'est la variable qui décide.

## 5. Mesure 2 — la matrice démarche contre démarche
Le mot et l'ordre sont neutralisés : chaque paire de mots est jouée dans les **quatre** configurations (chacun porte chacune des deux démarches, chacun commence une fois). La diagonale mesurée s'écarte de 50 % de **0,00 pt** : le banc est symétrique, et les deux camps tirent de la même distribution — la condition de fond du modèle (B).

| configuration | bande des moyennes | écart max à 50 % | rapport meilleure/pire | > 60 % |
|---|---|---|---|---|
| cat. 1 · A | 25,1 pt (38,4 → 63,5) | **26,0 pt** (`crible` bat `tiers` 76,0 %) | 1,65× · tête-à-tête **3,17×** | **2 — DOMINATION** |
| cat. 1 · B | 13,5 pt (44,4 → 57,8) | 15,2 pt (`plein` bat `tiers` 65,2 %) | 1,30× · tête-à-tête 1,87× | 0 |
| cat. 2 · A | 7,9 pt (45,7 → 53,6) | 8,9 pt | 1,17× | 0 |
| **cat. 2 · B** | **7,2 pt** (47,15 → 54,33) | **8,0 pt** | **1,15× · tête-à-tête 1,38×** | 0 |

**Le catalogue libre déséquilibre, le catalogue contraint non.** Catalogue 1 en régime A : deux démarches au-dessus de 60 %, un tête-à-tête à 3,17× — **intenable avec le marché ouvert de D6**, la démarche devient l'objet que tout le monde veut et rien ne retient son prix. Catalogue 2 : 1,15×, très en dessous du seuil de 2×. **Le modèle (B) « façon échecs » est donc tenable — mais seulement parce que le catalogue 2 est presque équilibré, c'est-à-dire précisément parce qu'il n'est pas « façon échecs ».** Il n'existe pas, dans ce qui a été mesuré, de catalogue franchement inégal *et* tenable : dès que l'inégalité devient lisible (cat. 1), elle passe 1,87× puis 3,17×.

## 6. Mesure 3 — le prix des axes, et ce que le budget coûte
Cibles : |r| par axe sous 0,15, quartile haut/bas de `lame+ecu` sous 1,5×, coups médiane 2–4 et p95 ≤ 8.

| configuration | lame | ecu | eperon | arc | \|r\| max | Q4/Q1 | coups | nuls |
|---|---|---|---|---|---|---|---|---|
| **référence (régime 0)** | −0,056 | +0,074 | +0,106 | −0,124 | **0,124** | 0,98× | 2 / 4 | 0,00 % |
| cat. 1 · A | −0,224 | −0,202 | +0,361 | +0,075 | 0,361 | 0,66× | 2 / 4 | 4,71 % |
| cat. 1 · B | −0,155 | −0,132 | +0,024 | +0,267 | 0,267 | 0,75× | 2 / 4 | 9,81 % |
| cat. 2 · A | −0,212 | −0,216 | **+0,736** | −0,295 | **0,736** | 0,62× | 2 / 4 | 0,20 % |
| **cat. 2 · B** | −0,068 | +0,013 | +0,066 | −0,010 | **0,068** | 0,93× | 2 / 4 | **30,02 %** |

**Le budget de compte se paie exactement sur `eperon`.** En régime A, `pas` n'achète plus un rayon mais un compte ; avec un masque à 5/9, le rayon nécessaire pour trouver K cases s'étire, et `eperon` devient le seul axe qui compte : r = **+0,736**, six fois la cible. C'est la contrainte 3 du cahier des charges, violée frontalement. **Le régime A est mort de ce seul chiffre.**
Le régime B avec le catalogue 2 fait *mieux* que la référence sur les quatre axes (0,068 contre 0,124) — mais 30 % des duels ne se concluent plus en 30 tours. La cause est mécanique : un masque à 5/9 rend le décrochage plus facile que l'approche ; les deux unités se manquent. À 6 à 10 feuilles par bataille (`SPEC_TACTIQUE.md` §4), un tiers de batailles sans issue n'est pas un défaut d'équilibrage, c'est un défaut de jeu.

## 7. Mesure 4 — le malus d'extrémité, et le gain de décision
Taux de victoire par tier, panel dédié de 60 mots par tier contre le pool, **nuls exclus** (les compter à 0,5 comprime toutes les lectures d'un facteur 1 − taux de nuls : c'est ce qui faisait croire à une amélioration de 10 pt).

| configuration | T1 | T6 | T12 | bande |
|---|---|---|---|---|
| **référence (régime 0)** | 54,72 | 37,07 | 27,43 | **28,80 pt** |
| cat. 2 · A | 59,72 | 30,86 | 20,46 | **39,27 pt** (pire) |
| cat. 1 · B | 56,36 | 38,21 | 27,81 | **31,78 pt** (pire) |
| cat. 2 · B | 53,91 | 37,06 | 27,99 | **25,91 pt** (−2,89) |
| **modèle B, démarche par tier** | 53,98 | 43,95 | **44,85** | **21,63 pt** (−7,17) |

**Une démarche singulière ne rattrape pas un mot extrême** — pas par elle-même. La configuration équilibrée gagne 2,89 pt de bande sur 28,80, soit 10 %, et T12 ne bouge pas (27,99 contre 27,43). L'argument décisif espéré n'existe pas.
**Sauf sous le modèle (B) explicite**, où la démarche est **indexée sur le tier du mot** : la bande tombe à 21,63 pt et T12 passe de 27,43 % à **44,85 %**, +17,4 pt. C'est le seul résultat qui referme le trou de `SPEC_TACTIQUE.md` §3. Mais il le referme par le bas : **76 % du pool se retrouve sur la démarche la plus faible** (1,53 case atteignable par tour), 27 % de nuls, et |r| max remonte à 0,278. On n'a pas rendu le rare fort, on a rendu le commun infirme.

**Le gain de décision.** Proxy : pour l'unité qui joue, on compte les **signatures tactiques distinctes** de ses cases d'arrivée — (je peux frapper ? j'ai l'allonge ? je subis la riposte ? quelle charge ?) — et les **issues distinctes** en ignorant la charge. Sans signature distincte, aucun choix de case ne peut changer quoi que ce soit : c'est un plancher honnête, pas le vrai gain.

| | cases | signatures | issues | écart de coup |
|---|---|---|---|---|
| référence (régime 0) | 8,41 | 4,32 | **1,50** | 1,69 |
| cat. 2 · B | 4,45–6,29 | 3,07–4,12 | 1,35–**1,45** | 0,78–1,62 |
| cat. 2 · A | 14,1–15,6 | 8,90–10,12 | 1,94–**2,06** | 3,13–5,05 |

**Le régime B perd de la décision**, toutes démarches confondues. Le régime A en gagne (+37 % d'issues, ×2,5 sur l'écart de coup) — mais uniquement parce qu'il donne 15 cases au lieu de 8,4 : **ce qui achète la décision est la taille de l'ensemble atteignable, pas sa forme.** Et le vrai chiffre à retenir n'est aucun de ceux-là : **1,50 issue distincte par tour** au moteur d'aujourd'hui, pour 8,41 cases offertes. La pauvreté de décision de la bataille n'est pas un problème de mobilité, c'est un problème de résolution — il y a trop peu de termes positionnels pour que la case importe.

## 8. Le coût d'intégration
Chiffré sur la lecture retenue (masque d'arrivée, régime B).

- **`grille.ts`** — `voisines` et `zoneDeControle` **inchangées** (c'est tout l'intérêt de la lecture masque). `accessibles` et `chemin` prennent la démarche via l'unité et filtrent le résultat du BFS ; le tri (coût, y, x) doit être ajouté et gelé. **≈ 35 lignes.**
- **`types.ts`** — un champ `demarche` sur `Unite` ; un module `demarches.ts` (7 pochoirs, la table de substitution gelée, `polybe`). **≈ 90 lignes.**
- **`unite.ts`** — `uniteDepuisObjet` lit la démarche de l'archétype. **3 lignes.** `pas` et `portee` inchangées.
- **`bataille.ts`** — rien de la résolution ne bouge. `traceBataille` doit prendre la démarche (un octet par unité, à côté du camp) sinon deux échiquiers distincts rendent la même trace : **c'est un changement de format de trace**, donc un vecteur gelé à refaire.
- **Contrôles qui tombent :** sur les 18 de `grille.test.ts`, **4** figent un contour exact et tombent tels quels — « accessibles : le contour exact d'une dalle vide », « un obstacle ne se traverse pas », « une unité vivante bloque », « chemin : contourne un mur par la seule ouverture » — ils passent si l'unité de test porte `plein`, qui est un pochoir dégénéré ; les 14 autres tiennent. Dans `bataille.test.ts`, les deux contrôles de la charge (« l'élan est le coût du chemin ») et « déterminisme : vingt rejeux » tiennent ; le vecteur gelé de `unite.test.ts` tient (aucune case n'y entre). **À ajouter :** un `doit_echouer` par refus (case masquée refusée), l'énumération exacte des 7 pochoirs, la densité 5/9, et la stabilité du tri sur 50 appels.

## Verdict
1. **La lecture « pièce d'échecs » est fermée par un théorème, pas par un réglage** (§2). Sur une grille carrée, un jeu de pas isotrope non orthogonal enferme l'unité dans un sous-réseau. La seule démarche implémentable est un **masque d'arrivée** sur une marche orthogonale inchangée — et c'est aussi la seule qui laisse la **zone de contrôle mordre exactement comme aujourd'hui**.
2. **Le budget de démarche existe et il est exact** — compte réalisé à **1,13×** près avec le catalogue de pochoirs en régime A. Mais il se paie sur `eperon` : r = **+0,736**. Les deux budgets sont incompatibles ; il faut choisir lequel des deux on tient, et le seul choix compatible avec le prix des axes est le rayon (régime B), qui n'est pas un budget de démarche.
3. **Aucune démarche ne domine, avec le bon catalogue** : bande 7,2 pt, rapport 1,15×, pire tête-à-tête 1,38×, très sous le seuil de 2× du marché ouvert. Le modèle (B) est donc **tenable**, mais uniquement dans sa version presque égale : dès que l'inégalité devient lisible (catalogue libre), on passe 1,87× puis 3,17× et le marché saute.
4. **Le malus d'extrémité n'est pas réglé par une démarche singulière** : −2,89 pt sur 28,80, T12 inchangé. Le gain de 10 pt de la première lecture était un artefact de 30 % de nuls comptés à 0,5. Seule l'indexation explicite de la démarche sur le tier le referme (−7,17 pt, T12 +17,4 pt) — au prix d'un champ de bataille où l'unité commune atteint 1,53 case par tour.
5. **Et le gain de décision est négatif** (1,45 issue contre 1,50). **La réponse d'ensemble est donc négative** : les démarches singulières coûtent plus qu'elles n'apportent, tant que ce qu'on leur demande est d'équilibrer. Ce qu'elles apportent réellement est de la **saveur** — sept marches nommées, lisibles au pochoir, sans dominante — et ça, elles le font bien.

## Décisions à trancher
1. **Livrer les démarches, oui ou non ?** Recommandation : **oui, mais comme saveur, en régime B, catalogue 2 seul**, et **pas avant** d'avoir ramené les nuls sous 5 % (§6). Pas comme réponse au malus d'extrémité : il faut le dire dans `SPEC_TACTIQUE.md` §3, qui l'espérait.
2. **Le régime A est-il définitivement écarté ?** Recommandation : oui — r(eperon) = +0,736. Il est le seul à donner un vrai budget *et* un vrai gain de décision (2,06 issues) ; s'il devait revenir, il faudrait d'abord retirer à `eperon` la charge ou le rang de phase, ce qui rouvre tout §9 ter.
3. **Les 30 % de nuls.** Trois sorties non mesurées : (a) l'adjacence toujours permise quel que soit le pochoir (le masque ne mord qu'à partir de l'écart 2) ; (b) une victoire aux points quand l'arbre s'épuise, au lieu de `epuise` ; (c) une dalle plus ouverte. (a) est la moins chère et la plus lisible.
4. **Le sillage d'Ampère** (message de l'auteur, `SPEC_BROUILLARD_INDUCTION.md`). Évalué à sec, non mesuré en duel : le trajet moyen d'un tour vaut **1,50 à 2,40 cases** selon la démarche (catalogue 1) et **1,55 à 1,85** (catalogue 2), soit un sillage de 5 à 7 cases contre 4 à la zone de contrôle statique — il **double à peu près** l'emprise d'une unité qui bouge. Mais il **ne départage pas les démarches** : dans la lecture retenue, toute démarche marche orthogonalement, donc tout sillage est continu, et l'écart de longueur de trajet entre la plus courte et la plus longue est de 0,30 case (catalogue 2). La règle est bonne pour elle-même — elle récompense le mouvement — elle n'est pas un argument pour les démarches.
5. **La clé de rangement.** Retenu : l'archétype (9 muses → 7 pochoirs), confondant mesuré nul (écart d'axe 0,26 sur 64). Alternative écartée : les 21 cellules de la doxa, illisibles sur 27 salles.
6. **`traceBataille` change de format** si les démarches entrent. Un octet par unité, un vecteur gelé à refaire. À grouper avec toute autre évolution de trace.

## LIMITE
- **Un duel 1v1 n'est pas une bataille rangée.** Une dalle, deux unités, trois politiques, budget de feuilles non contraignant (100 000). Tout ce qui touche la formation, la télégraphie et le choix du moment d'engager n'est **pas** mesuré — et c'est précisément là que `SPEC_TACTIQUE.md` §3 place l'espoir du malus d'extrémité.
- **Les nuls.** 30 % en configuration retenue. Toutes les lectures « nuls exclus » portent donc sur 70 % des duels, et rien ne dit que les 30 % restants se répartiraient comme eux.
- **Le régime A n'a été mesuré qu'avec `elan` réel.** Une case d'arrivée à coût 9 donne une charge de 36 ; plafonner l'élan à `pas` changerait le prix de `eperon` en régime A, et ça n'a pas été essayé.
- **Sept pochoirs, pas neuf.** L'énumération sous les trois contraintes en donne exactement sept ; la table de Polybe 3×3 en a neuf. Deux cases restent à remplir, ou la table à changer de forme.
- **Le catalogue 1 est un balayage, pas une proposition.** Ses chiffres servent à écarter, jamais à livrer.
- **Aucune de ces mesures n'est rejouable par la CI.** Les scripts vivent dans le scratchpad (`mob-*.ts`) et n'écrivent rien dans `atelier/`. Ce qui doit engager devient un `.test.ts` à vecteurs gelés, ajouté à la main dans `package.json` et dans `CLAUDE.md` §2.
- **Ces chiffres sont des figures, pas des preuves.** Aucun n'entre dans une feuille, un carnet ou une signature.
