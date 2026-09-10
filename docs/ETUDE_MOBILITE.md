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
6. **Corrigé par le §9** : la phrase « la pauvreté de décision est un problème de résolution » était juste au second ordre, fausse au premier. Le premier verrou est **l'engagement** — 9,0 % des cases offertes permettent de frapper — puis le **nombre de cibles**, et seulement ensuite la résolution.

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

## 9. Post-scriptum — les dalles dégagées (mesure du 2026-09-10, après `e9acf52`)
`dalleDe` lit désormais **deux bits par case**, mur si les deux sont posés : 25 % de murs au lieu de 50 %, plus grande pièce d'un seul tenant **56,8 cases en moyenne** (min 13, 1,2 % des étages sous trente) contre 19,8 avant. L'étage retenu par le banc passe de 149 (52 libres, région 47) à **198 (73 libres, région 73)**. Toutes les mesures des §4 à §8 portent sur l'ancienne dalle et **ne sont plus valides en valeur absolue** ; les conclusions relatives (théorème du §2, matrice du §5, prix des axes du §6) n'ont pas été rejouées.

**Constantes effectivement mesurées ici**, le moteur bougeant sous la mesure : `COUP_BASE` 16 · `COUP_MIN` 1 · `DIV_ACCORD` 4 · `DIV_DOS` 2 · `DIV_ALLONGE` 2 · `CHARGE_PAR_CASE` 4 · `MULT_TENUE` 2 · `TENUE_BASE` 32. Deux lectures de `unite.ts` sont données séparément : celle de l'étude (`DIV_PAS` 12, `DIV_PORTEE` 16, `pas` 2–7, portée 1–5) et celle du recalibrage en cours (`DIV_PAS` 32, `DIV_PORTEE` 10, `pas` 2–4, portée 1–7).

**Le couple avant/après, même proxy, mêmes graines** (`mob-decision.ts`, régime 0, 400 positions) :

| | cases offertes | signatures | **issues distinctes** | **issues / case** | écart de coup |
|---|---|---|---|---|---|
| dalle 1 bit, `pas` 2–7 | 8,41 | 4,32 | **1,50** | **0,178** | 1,69 |
| **dalle 2 bits, `pas` 2–7** | **14,36** | 4,69 | **1,57** | **0,109** | 2,35 |
| dalle 2 bits, recalibrage `pas` 2–4 / portée 1–7 | 8,90 | 3,75 | 1,52 | 0,171 | 2,80 |

**La densité a baissé, et il faut le dire franchement : +70,8 % de cases offertes pour +4,7 % d'issues distinctes, soit un rapport issues/case qui tombe de 0,178 à 0,109 — −39 %.** La place n'a pas créé de décision, elle a créé des cases indifférentes. Le recalibrage en cours la ramène à 0,171, c'est-à-dire au niveau d'avant : il rend `pas` plus court et la portée plus longue, donc une part bien plus grande des cases atteignables permet de frapper.

**Décomposition** (`mob-diag.ts`, dalle 2 bits ; valeurs distinctes prises par chaque terme sur les cases d'où l'on peut frapper) :

| cas | cases | **% de cases d'où l'on peut frapper** | issues | iss/case | accord | dos | allonge | charge | coup total |
|---|---|---|---|---|---|---|---|---|---|
| 1 adversaire, `pas` 2–7 | 15,36 | **9,0 %** | 1,44 | 0,094 | **1,00** | **1,00** | 1,26 | **2,00** | 2,09 |
| 1 adv., dos délibérément exposé | 15,36 | 9,0 % | 1,44 | 0,094 | 1,00 | **1,31** | 1,26 | 2,00 | 2,40 |
| 2 adversaires | 14,73 | 17,2 % | 1,93 | 0,131 | — | — | — | — | — |
| **3 adversaires** | 14,07 | **24,7 %** | **2,49** | **0,177** | — | — | — | — | — |
| 1 adv., recalibrage 32/10 | 9,90 | **15,3 %** | 1,40 | **0,142** | 1,00 | 1,00 | 1,29 | 2,18 | 2,48 |
| 3 adv., recalibrage 32/10 | 9,34 | **37,2 %** | 2,42 | **0,259** | — | — | — | — | — |

(Les colonnes de termes sont normalisées par la part des positions offrant au moins une frappe — 35 % à un adversaire ; à plusieurs cibles `accord` varie d'une cible à l'autre et la normalisation ne vaut plus.)

**Le diagnostic, en trois lignes.**
1. **Ce n'est pas la place qui manquait.** La salle a presque triplé et la densité de décision a perdu 39 %. Le joueur avait déjà la place ; il n'avait pas de raison de s'en servir.
2. **Ce qui borne d'abord, c'est l'engagement.** À un adversaire, **9,0 %** des cases offertes permettent de frapper, et **65 % des positions n'en offrent aucune** : le tour est une marche, pas un choix. Le recalibrage en cours porte cette part à 15,3 % et la densité à 0,142 (+51 %) — c'est, à une cible, le plus gros gain mesuré.
3. **Ce qui borne ensuite, c'est le nombre de cibles, puis la résolution.** 1 → 3 adversaires : issues 1,44 → 2,49, densité 0,094 → 0,177 (**×1,88**), et 0,259 avec le recalibrage — plus que tout le reste réuni. Et sur les cases d'où l'on peut frapper, **un seul des quatre termes fait varier le coup avec la case** : `charge` (2,00 valeurs). `accord` en prend **1,00** — par construction, il ne dépend que des deux mots et **ne peut jamais** dépendre de la case ; `dos` **1,00**, et seulement **1,31** face à un dos délibérément exposé ; `allonge` **1,26**, binaire.

**Le terme à changer, et le chiffre qui le désigne : `dos`.** Il est le seul terme *voulu positionnel* et *mort en fait* — 1,00 valeur distincte quand le défenseur n'a pas bougé, **1,31 même quand on lui expose le dos exprès**. `estDeDos` exige la colinéarité stricte entre l'attaquant, le défenseur et la case qu'il vient de quitter : sur une dalle 9×9 c'est une condition de mesure nulle, et elle ne se déclenche que si le défenseur a bougé. Le graduer — dos `base/DIV_DOS`, **flanc** `base/(2·DIV_DOS)`, face 0, le flanc étant toute case hors de l'axe de la marche — le ferait passer de 1,31 à 3 valeurs possibles sans toucher un seul axe : **`dos` est purement positionnel, aucun axe ne l'achète**, donc le modifier ne peut pas rouvrir le §9 ter. C'est le seul terme dont on puisse dire ça. À l'inverse, `allonge` (1,26) est le prix de `arc` et `charge` (2,00) celui de `eperon` : y toucher re-tarife un axe.
**Et un avertissement chiffré pour le recalibrage en cours** : `charge` est le seul terme positionnel vivant, et son plafond vaut `CHARGE_PAR_CASE · pas`. Passer `DIV_PAS` de 12 à 32 fait tomber ce plafond de 28 à **16** — il faudra relever `CHARGE_PAR_CASE` de 4 à 7 pour le tenir, ou assumer que le seul terme qui fasse compter la case perd 43 % de son amplitude.

## 10. Post-scriptum — le dos gradué et la charge, sur le moteur à points d'action (mesure du 2026-09-10)

`14fe665` a remplacé les deux drapeaux `aFrappe`/`aDeplace` par **deux points d'action** (`PA_PAR_TOUR = 2`,
`depenser`/`aDesPa`/`terminerTour` dans `unite.ts`). Le §9 chiffrait la densité de décision à **1,50 issue pour
8,41 cases** (0,171 au recalibrage) sur un moteur à un geste par type et par tour : **ce chiffre est périmé**,
l'ensemble des issues d'un tour n'est plus le même. Ce post-scriptum le refait, puis mesure les deux
propositions que le §9 laissait ouvertes : le `dos` gradué et `CHARGE_PAR_CASE` à 7.

**Ce que le compteur ajoute exactement, et rien de plus.** Les drapeaux autorisaient un pas **et** une frappe,
dans l'ordre qu'on voulait : **frapper puis se retirer était déjà permis** (mesuré au journal — 6,1 % des tours
d'unité sous les drapeaux, 7,1 % avec les PA). Ce que le compteur ouvre, ce sont **deux familles** : le double
pas et la double frappe. Toute la mesure porte là-dessus.

**Constantes effectivement mesurées ici**, le moteur bougeant sous la mesure : `COUP_BASE` 16 · `COUP_MIN` 1 ·
`DIV_ACCORD` 4 · `DIV_DOS` 2 · `DIV_ALLONGE` 2 · `CHARGE_PAR_CASE` 4 · `DIV_REPRISE` 8 · `MULT_TENUE` 2 ·
`TENUE_BASE` 32 · `PAS_BASE` 2 · `DIV_PAS` 32 · `PORTEE_BASE` 1 · `DIV_PORTEE` 10 (pas 2–4, portée 1–7) ·
`PA_PAR_TOUR` 2 · `PA_DEPLACER` 1 · `PA_FRAPPER` 1. Étage 198, 73 cases libres, région d'un seul tenant 73.

**Protocole.** Proxy de décision : `pa-decision.ts`, 400 positions, mêmes graines (`eq-<i>`, mêmes indices) et
même terrain que `mob-decision.ts`/`mob-diag.ts`, mais l'unité énumérée est la **séquence de deux PA**
(pas+pas, pas+coup, coup+pas, coup+coup, un geste, rien) et non plus la case. L'issue d'une séquence = ce
qu'elle porte (cible, allonge, riposte — jamais la charge) ‖ ce que la case finale laisse porter ensuite. La
ligne « drapeaux » est **la même énumération bornée à un pas et une frappe**, refaite ici : les chiffres du §9
ne s'y comparent pas terme à terme, mais la mesure est recalée sur eux — sur la ligne à une cible elle rend
9,90 cases, 15,3 % de cases d'où l'on peut frapper, `accord` 1,00, `dos` 1,00, `charge` 2,18, coup 2,46, contre
9,90 / 15,3 % / 1,00 / 1,00 / 2,18 / 2,48 au §9. Duels : `pa-banc.ts`, vrai moteur (`ouvrirBataille`/`jouer`/
`finDePhase`), **460 704 duels par configuration** (2 000 mots × 6 adversaires × 8 distances × 3 politiques,
plus 12 panels de 100 mots par tier contre le pool), nuls exclus. La ligne « drapeaux » du banc s'obtient en
**interdisant à la politique** le second pas et la seconde frappe : le moteur est le même, la politique
s'interdit exactement ce que les drapeaux interdisaient. Journal : `pa-termes.ts`, 57 600 duels, ~190 000
coups par configuration. Tout est déterministe, aucun `Math.random`, aucune horloge.

### M1 — la densité de décision, refaite sur les séquences de deux PA

| | cases offertes | issues distinctes | **issues / case** | écart de coup | écart de tour |
|---|---|---|---|---|---|
| drapeaux · 1 adversaire | 9,90 | 2,07 | **0,209** | 2,80 | 2,80 |
| **PA · 1 adversaire** | **24,29** | **2,61** | **0,108** | **2,80** | **6,25** |
| drapeaux · 2 adversaires | 9,63 | 3,47 | 0,361 | 4,92 | 4,92 |
| PA · 2 adversaires | 23,51 | 4,77 | 0,203 | 4,92 | 10,49 |
| drapeaux · 3 adversaires | 9,34 | 5,34 | **0,572** | 7,58 | 7,58 |
| **PA · 3 adversaires** | **22,48** | **7,29** | **0,324** | 7,58 | 15,99 |

**Le compteur achète +26 % d'issues et +145 % de cases : la densité tombe de 0,209 à 0,108, −48 %.** C'est la
même chute que celle des dalles dégagées au §9 (−39 %), pour la même raison : des cases de plus, pas des
raisons de plus. L'ablation dit laquelle des deux familles paie.

| famille de séquences ouverte | cases | issues | **issues / case** |
|---|---|---|---|
| **1 adversaire** — les deux drapeaux | 9,90 | 2,07 | 0,209 |
| + la double frappe seule | 9,90 | **2,23** | **0,225** |
| + le double pas seul | 24,29 | 2,45 | 0,101 |
| les deux (moteur d'aujourd'hui) | 24,29 | 2,61 | **0,108** |
| **3 adversaires** — les deux drapeaux | 9,34 | 5,34 | 0,572 |
| + la double frappe seule | 9,34 | **5,92** | **0,634** |
| + le double pas seul | 22,48 | 6,71 | 0,299 |
| les deux (moteur d'aujourd'hui) | 22,48 | 7,29 | **0,324** |

**Franchement : la double frappe achète de la décision, le double pas achète des cases indifférentes.** La
double frappe ajoute **+0,16 issue** à une cible et **+0,58** à trois **pour zéro case de plus** — la densité
monte de 0,209 à **0,225** (+7,7 %) et de 0,572 à **0,634** (+10,8 %). Le double pas ajoute +0,38 et +1,37
issue mais **multiplie les cases par 2,45** : la densité tombe à 0,101 et 0,299. La cause est mécanique et
n'est pas réglable par une constante — **une case atteinte avec les deux PA ne peut plus être frappée
depuis ce tour** : toute l'issue d'un double pas se réduit à « ce que j'offrirai au tour suivant ».
Le retrait après frappe, lui, n'est pas nouveau : il était déjà dans les drapeaux, et il vaut +0,22 issue
(2,07 contre 1,85 sans lui).

**L'écart de coup ne bouge pas d'un point** — 2,80 / 4,92 / 7,58 dans les deux moteurs. Le compteur
**n'élargit pas un coup, il en autorise deux** : c'est l'écart de tour qui passe de 2,80 à 6,25 (×2,23).

**Le nombre de cibles reste le plus gros levier connu**, et il grossit : de 1 à 3 adversaires, la densité fait
**×2,74** sous les drapeaux et **×3,00** sur les PA (0,108 → 0,324), quand la meilleure des deux familles
nouvelles vaut ×1,08. Le §9 chiffrait ce passage à ×1,88 sur son proxy par cases ; il est plus fort, pas moins.

**Ce que les politiques en font vraiment**, sur 57 600 duels du vrai moteur : **36,5 %** des tours d'unité
prennent le double pas, **12,1 %** la double frappe, 7,1 % la frappe puis le retrait. Le double pas est donc
le geste le plus joué — et le moins décisif.

**Un résultat non demandé, et le plus important de la page : le compteur a déplacé le prix des axes.**

| | lame | ecu | eperon | arc | \|r\| max | Q4/Q1 | nuls | bande de tier |
|---|---|---|---|---|---|---|---|---|
| drapeaux (avant `14fe665`) | −0,009 | +0,106 | **+0,036** | −0,136 | **0,136** | 1,05× | 0,45 % | 41,71 pt |
| **PA (aujourd'hui)** | +0,111 | +0,161 | **−0,165** | −0,106 | **0,165** | 1,17× | 2,06 % | **37,59 pt** |

`r(eperon)` passe de **+0,036 à −0,165**, `lame+ecu` de +0,087 à **+0,241**. Le mécanisme se lit au journal :
les deux prix positionnels se **diluent**, parce qu'un tour à deux frappes ou à deux pas n'en paie aucun —
part des coups portant une charge **42,6 % → 35,6 %** (charge moyenne 2,34 → 1,88), part des coups portant
une allonge **18,6 % → 15,4 %** (2,60 → 2,16). Les deux cibles du §9 ter tiennent encore (0,165 < 0,30 ;
1,17× < 3×) et la bande de tier se referme de 4,12 pt, mais la dérive est réelle et va dans le mauvais sens.

### M2 — le `dos` gradué : l'hypothèse du §9 est fausse, et de trois façons

**D'abord une correction au §9 : le `dos` binaire n'est pas mort.** Le §9 le chiffrait à « 1,00 valeur
distincte », mais sur un proxy où le défenseur n'avait **jamais bougé** — `precedente` à `null`. En duel réel,
`nouveauTour` ne l'efface pas : dès le deuxième tour, toute unité qui a fait un pas garde un dos. Mesuré au
journal, `estDeDos` tombe sur **20,7 % des coups portés** et vaut **2,98 points en moyenne, 8,7 % du coup**.
Le terme n'est pas mort ; il est seulement invisible au proxy qui l'a jugé.

Proposition mesurée : `orientationDe(attaquant, defenseur, precedente)` → dos `base/DIV_DOS`, **flanc**
`base/(2·DIV_DOS)` (toute case hors de l'axe de la marche), face 0. Une variante plus franche a été mesurée en
même temps — **demi-plan** : le signe du produit scalaire de la marche par la visée, définie même quand la
marche a tourné un coin, ce que l'alignement strict ne sait pas lire.

| lecture du `dos` | valeurs distinctes (1 adv / 3 adv, défenseur qui a bougé) | dos / flanc / face | coups avec dos > 0 | dos moyen | coup porté | tours |
|---|---|---|---|---|---|---|
| **binaire (aujourd'hui)** | 1,31 / 1,35 | 14,2 % / 0 % / 85,8 % | 20,7 % | 2,98 | 34,40 | 1,93 |
| gradué (proposition du §9) | 1,73 / 1,87 | 14,2 % / **72,4 %** / 13,4 % | 57,3 % | 5,55 | 37,08 | 1,83 |
| demi-plan | 1,79 / 2,02 | 32,3 % / 24,4 % / 43,4 % | 54,3 % | 6,97 | 38,52 | 1,78 |

| configuration (dos, charge 4) | lame | ecu | eperon | arc | \|r\| max | Q4/Q1 | nuls |
|---|---|---|---|---|---|---|---|
| **binaire (aujourd'hui)** | +0,111 | +0,161 | −0,165 | −0,106 | **0,165** | 1,17× | 2,06 % |
| gradué | +0,222 | +0,241 | **−0,366** | −0,091 | **0,366 — HORS CIBLE** | 1,35× | 2,02 % |
| demi-plan | +0,268 | +0,250 | **−0,492** | −0,017 | **0,492 — HORS CIBLE** | 1,40× | 1,98 % |
| additif gradué (14 / 7 points) | **−0,027** | **+0,329** | −0,297 | −0,005 | **0,329 — HORS CIBLE** | 1,20× | 2,01 % |
| additif binaire (14 points) | −0,020 | +0,206 | −0,127 | −0,061 | **0,206** | 1,11× | 2,06 % |

**« `dos` est purement positionnel, aucun axe ne l'achète, donc le graduer ne peut pas rouvrir le §9 ter. »
C'est faux. Vérifié, pas supposé — et la cible de 0,30 saute.**

1. **`dos` vaut `base/DIV_DOS`, et `base = COUP_BASE + lame`.** Élargir le dos multiplie le levier de `lame` :
   r(lame) **+0,111 → +0,222**, r(lame+ecu) +0,241 → **+0,409**. Un terme positionnel écrit en fraction de la
   base *est* un prix de `lame`, quoi qu'on dise de sa géométrie.
2. **Le dos ne se prend que sur une unité qui a bougé** (`precedente`). Graduer le dos **taxe le déplacement**,
   et `eperon` achète le déplacement : r(eperon) **−0,165 → −0,366**, et **−0,492** avec le demi-plan. Plus la
   graduation est franche, plus elle punit l'axe qui paie la position — l'inverse exact de ce qu'on cherchait.
3. **Et il n'achète presque pas de décision.** **72,4 %** des couples (case, cible) tombent dans la même classe
   « flanc » : le terme gradué est un `+base/4` quasi constant, pas un choix. L'écart de coup n'augmente que de
   **1,6 %** (3,78 → 3,84 à une cible ; 9,71 → 9,87 à trois) et la densité de décision **ne bouge pas du tout**
   (0,108 et 0,324, à la troisième décimale) — le dos n'entre ni dans l'allonge ni dans la riposte, donc jamais
   dans l'issue d'un tour. Contre un défenseur **qui n'a pas bougé**, les trois lectures valent **1,00 valeur
   distincte** : 100 % « face ». Le §9 le disait mort ; gradué, il reste mort là où il l'était et devient un
   bonus presque permanent là où il vivait.

### M3 — `CHARGE_PAR_CASE`, 4 ou 7

| `CHARGE_PAR_CASE` | lame | ecu | eperon | arc | \|r\| max | Q4/Q1 | charge moyenne | coups chargés | charge max vue | écart de coup |
|---|---|---|---|---|---|---|---|---|---|---|
| **4 (aujourd'hui)** | +0,111 | +0,161 | **−0,165** | −0,106 | **0,165** | 1,17× | 1,88 | 35,6 % | **12** | 2,80 |
| 7 | +0,113 | +0,268 | **−0,158** | **−0,222** | **0,268** | 1,24× | 3,27 | 35,4 % | **21** | 3,72 |

**Ça se tranche, et la réponse est non.** Passer de 4 à 7 **n'achète rien à `eperon`** — r va de −0,165 à
−0,158, soit **+0,007**, sous le bruit — et **re-tarife deux autres axes** : `arc` de −0,106 à **−0,222**
(×2,1) et `ecu` de +0,161 à **+0,268**. Le |r| max monte de 0,165 à **0,268**, à 0,032 de la cible du §9 ter.
La lecture est mécanique : la charge frappe **qui se fait rattraper**, donc l'archer, et elle est encaissée par
**qui tient**, donc `ecu` ; la multiplier ne la donne pas davantage à `eperon`, elle l'amplifie pour tout le
monde — la part des coups chargés ne bouge pas (35,6 % → 35,4 %).

**Et l'avertissement du §9 sur le plafond n'est pas le bon.** Le plafond vaut bien `CHARGE_PAR_CASE · pas` =
4 × 4 = **16**, mais **la plus forte charge vue en 57 600 duels vaut 12** — un élan de 3 sur 4 possibles. Ce
qui borne n'est pas le plafond, c'est **l'élan réalisé** : une politique s'arrête dès qu'elle peut frapper. Et
le double pas ne le relève pas : `deplacer` **remplace** `elan`, il ne le cumule pas (vérifié), et de toute
façon une case atteinte en deux PA ne peut plus être frappée. Passer à 7 porte la charge maximale observée à
21 pour 28 permis — le même écart, décalé.

### Recommandations, chiffrées et non implémentées

1. **Ne pas graduer `dos`, sous aucune des trois lectures graduées mesurées.** Le prix est |r| max **0,165 → 0,366**
   (flanc strict), **0,492** (demi-plan), **0,329** (additif gradué) — la cible du §9 ter est franchie dans les
   trois cas ; le gain est **+1,6 % d'écart de coup et 0,000 de densité de décision**. Le rapport est
   indéfendable.
2. **Ne pas passer `CHARGE_PAR_CASE` à 7.** Gain sur `eperon` : **+0,007**. Coût : `arc` ×2,1 et |r| max
   à **0,268**. Si l'amplitude de la charge doit remonter, ce n'est pas par le multiplicateur.
3. **Si le `dos` doit malgré tout vivre, l'additif règle la moitié du problème — et pas l'autre.** Écrit en
   points (14 pour le dos, 7 pour le flanc, soit la moitié de la base moyenne 29,17) au lieu d'une fraction de
   la base, il **efface entièrement le prix caché de `lame`** : r(lame) **+0,222 → −0,027**, ce qui confirme le
   mécanisme 1. Mais la taxe sur le déplacement survit (`eperon` **−0,297**) et le poids glisse sur `ecu`
   (**+0,329**) : |r| max **0,329**, toujours hors cible. **Aucune des trois lectures graduées mesurées ne
   tient les 0,30** ; seule la binaire d'aujourd'hui les tient, à 0,165. Rendre le dos actuel simplement
   additif, sans le graduer (14 points), donne 0,206 : mieux sur `lame` (−0,020) et sur `eperon` (−0,127),
   moins bien sur `ecu` (+0,206) — un échange, pas un gain, et un changement de format de résolution pour rien.
4. **Le chiffre qui appelle une décision n'est ni le dos ni la charge : c'est `r(eperon) = −0,165`**, retourné
   par le compteur de PA lui-même (**+0,036** avant), avec `lame+ecu` à **+0,241** (+0,087 avant). Les deux
   cibles tiennent encore, mais le §9 ter demande de les vérifier « à chaque changement du moteur » et ce
   changement-là ne l'a pas été. La cause mesurée est la dilution des deux prix positionnels (coups chargés
   42,6 % → 35,6 %, coups avec allonge 18,6 % → 15,4 %).
5. **Ce qui achète de la décision, dans l'ordre et chiffré** : le nombre de cibles (**×3,00** de 1 à 3
   adversaires), puis la double frappe (**+7,7 %** à une cible, **+10,8 %** à trois, pour zéro case de plus).
   Ce qui n'en achète pas : le double pas (**−48 %** de densité, 36,5 % des tours joués). Retirer le double pas
   n'est **pas** recommandé sur cette seule mesure — il est joué, il ne casse aucune cible, et la bande de tier
   s'est refermée de 4,12 pt avec le compteur entier — mais il faut cesser de le compter comme un gain de
   décision : il n'en est pas un.

### LIMITE — ce qui n'est pas mesuré ici

- **Le proxy ne rejoue pas la bataille.** Une frappe qui tue ne retire pas la cible de l'énumération, la
  riposte n'entame pas la tenue, le tour suivant n'existe pas. C'est un plancher honnête, pas le gain réel.
- **Le duel reste un duel.** Deux unités, une dalle, trois politiques, 100 000 feuilles : la formation, le
  choix du moment d'engager et la bataille rangée ne sont toujours pas mesurés (LIMITE du §6, inchangée).
- **Les politiques ne sont pas un joueur.** Elles dépensent leurs deux PA gloutonnement ; un joueur qui garde
  un PA pour la reprise (`reprendre` exige **tous** les PA) joue un jeu que ce banc n'a pas vu.
- **`r(eperon)` n'a pas été réparé, seulement constaté.** Aucune constante n'a été essayée pour le ramener :
  ce serait re-tarifer un axe, c'est-à-dire ouvrir le chantier que le §9 ter encadre, pas un post-scriptum.
- **Le dos additif n'a été mesuré qu'à 14 et 7 points** (la moitié de la base moyenne, 29,17), sur la seule
  géométrie stricte. Aucun balayage.
- **Le moteur a encore bougé pendant la mesure.** Les copies datent du 2026-09-10 à 16 h 11 ; la télégraphie
  a été sortie de `bataille.ts` vers `ia.ts` après. `resoudreCoup`, `riposteDe`, `jouer` et les règles de PA
  sont inchangés, donc les chiffres tiennent — mais ils sont datés, comme ceux du §9.
- **Ces chiffres sont des figures, pas des preuves.** Aucun n'entre dans une feuille, un carnet ou une
  signature, et aucun de ces scripts n'est rejouable par la CI : ils vivent dans un scratchpad, hors dépôt.
