# Équilibrage tactique — la polarité fabrique-t-elle un objet de marché ?

**Dépôt :** Oykdo/Eidos · **Statut :** mesure, aucune ligne de code de jeu écrite · **Branche :** `tactique-moteur`
**Question posée :** D6 ouvre l'échange des unités (`SPEC_TACTIQUE.md` §9 bis). La conservation fixe la somme des quatre axes à 64 et interdit donc le power creep *sur les axes*. Reste la résolution, qui dépend de la **polarité** entre deux mots (`resonance.ts`). Si une forme, un régime ou une cellule est constructive contre presque tout et destructive contre presque rien, elle devient l'objet que tout le monde veut, et la loi est contournée.
**Périmètre :** `resonance.ts`, `cosmos.ts`, `cosmos-empreintes.ts`, `bestiaire.ts`, `combat.ts`, `objets.ts`, `fiche.ts`. Rien de la chaîne : ni `noeud.py`, ni le carnet, ni la genèse.
**Règle de lecture :** aucune phrase sans chiffre. Ce qui n'a pas pu être mesuré est dit tel quel (§LIMITE).

## 0. En cinq lignes
Le trou craint **n'existe pas** : `polariteDe` est exactement symétrique (0 paire asymétrique sur 3 998 000), donc « constructif contre tout » signifie « tout est constructif contre moi », et le score de polarité d'un objet est **sans corrélation** avec son taux de victoire (r = +0,0003).
Aucun régime ni aucune cellule ne domine : l'écart de score entre cellules vaut 3,66 points sur 99 adversaires (σ = 1,10).
La rareté n'achète pas la force : r = +0,045 entre proximité au catalogue et taux de victoire.
**Mais le vrai trou est ailleurs, et il est gros** : la conservation fixe la *somme*, pas le *prix* de chaque axe. Dans la résolution du §3, `lame + ecu` explique 81 % de la variance du taux de victoire (r = 0,899) ; `arc` n'achète rien.

## 1. Ce qui a été mesuré, et comment
Un script hors dépôt (scratchpad, `node --experimental-strip-types`) importe les modules de l'atelier par chemin relatif et n'écrit rien. Les 101 entrées de `cosmos-empreintes.ts` comptent une **ancre** (rang 0, classe `ancre`) que `bestiaire.ts` exclut : les mesures 1 et 2 portent donc sur les **100 formes rangées**, l'ancre traitée à part. Toutes ont la même norme² (10⁸).
Le chemin de calcul entier (Number) a été contrôlé contre `polariteDe` en BigInt sur 159 600 paires : **0 écart**.

## 2. Mesure 1 — matrice de polarité des 100 formes

| | paires ordonnées | constructif | neutre | destructif |
|---|---|---|---|---|
| catalogue, règle réelle | 9 900 | 1 212 (**12,24 %**) | 5 454 (55,09 %) | 3 234 (**32,67 %**) |
| même calcul, règle « même classe » désactivée | 9 900 | 1 794 (18,12 %) | 8 106 (81,88 %) | **0** |

**Premier fait, décisif : un destructif n'est jamais géométrique.** Il est toujours et seulement une identité de classe. Le taux de destructif d'une forme vaut donc exactement l'effectif de sa classe : 33/99 = 33,33 % pour les 34 armes, 32/99 = 32,32 % pour les 33 défenses et les 33 accessoires. 582 paires de même classe (18,00 % des destructifs) sont géométriquement constructives et forcées destructives par la règle.

**Deuxième fait : la matrice est symétrique.** 0 paire (i, j) où polarité(i, j) ≠ polarité(j, i), sur les 9 900 du catalogue comme sur les 3 998 000 paires d'objets tirés (mesure 3).

Score = constructifs − destructifs, sur 99 adversaires : moyenne **−20,22**, médiane −20, **σ = 3,02**, min −27, max −12. Rapport meilleur/pire : −12 / −27 (les deux sont négatifs ; le rapport « meilleur sur pire » vaut 0,444, et l'étendue utile est de **15 points sur 99**, soit 15 %).

| les 10 plus favorisées | | | | | les 10 plus défavorisées | | | |
|---|---|---|---|---|---|---|---|---|
| rang | cellule | C/N/D | score | | rang | cellule | C/N/D | score |
| 95 | defense×Comete | 20/47/32 | **−12** | | 68 | defense×Pulsar | 5/62/32 | **−27** |
| 36 | accessoire×Nebuleuse | 19/48/32 | −13 | | 40 | arme×Horizon | 7/59/33 | −26 |
| 33 | accessoire×Vide | 18/49/32 | −14 | | 14 | defense×Eclipse | 6/61/32 | −26 |
| 91 | arme×Pulsar | 19/47/33 | −14 | | 48 | accessoire×Nebuleuse | 7/60/32 | −25 |
| 26 | defense×Pulsar | 17/50/32 | −15 | | 25 | arme×Vide | 8/58/33 | −25 |
| 56 | defense×Nebuleuse | 17/50/32 | −15 | | 11 | defense×Quasar | 7/60/32 | −25 |
| 27 | accessoire×Nebuleuse | 16/51/32 | −16 | | 1 | arme×Eclipse | 8/58/33 | −25 |
| 49 | arme×Comete | 17/49/33 | −16 | | 67 | arme×Vide | 9/57/33 | −24 |
| 86 | defense×Eclipse | 16/51/32 | −16 | | 41 | defense×Horizon | 8/59/32 | −24 |
| 89 | defense×Eclipse | 16/51/32 | −16 | | 39 | accessoire×Eclipse | 8/59/32 | −24 |

Les deux colonnes mélangent les trois classes et six régimes sur sept : **il n'y a pas de famille favorisée, il y a des formes plus ou moins centrales dans la sphère.**

**L'ancre (rang 0)** est le seul cas extrême : classe unique, donc jamais de destructif — C = 19, N = 81, D = 0, score **+19**, à comparer au maximum de −12 des formes rangées. Elle est hors `FORMES` et n'est jamais tirée ; si un jour une unité prenait la classe `ancre`, elle serait immédiatement l'objet dominant du marché. **Ne pas ouvrir cette classe aux unités.**

## 3. Mesure 2 — par régime et par cellule

| régime | formes | C % | D % | score moyen |
|---|---|---|---|---|
| Vide | 16 | 11,93 | 32,77 | −20,63 |
| Nebuleuse | 13 | 12,90 | 32,71 | −19,62 |
| Pulsar | 11 | 12,58 | 32,69 | −19,91 |
| Eclipse | 15 | 11,72 | 32,73 | −20,80 |
| Comete | 18 | 13,02 | 32,55 | −19,33 |
| Horizon | 14 | 11,83 | 32,61 | −20,57 |
| Quasar | 13 | 11,66 | 32,63 | −20,77 |

**σ des scores par régime = 0,56 ; étendue 1,47 sur 99 adversaires.** Aucun régime dominant.
Par cellule (21, toutes peuplées) : de **−21,86** (arme×Vide, 7 formes) à **−18,20** (accessoire×Nebuleuse, 5 formes), **σ = 1,10**, étendue **3,66 sur 99**. Aucune cellule dominante. L'écart de taux destructif entre cellules (33,33 % pour les `arme`, 32,32 % pour les autres) n'est pas une géométrie : c'est l'effectif de la classe au catalogue, 34 contre 33.

Matrice 7×7, taux de constructif de (ligne) contre (colonne), en % :

| | Vide | Nebul. | Pulsar | Eclipse | Comete | Horizon | Quasar |
|---|---|---|---|---|---|---|---|
| **Vide** | 10,8 | 13,0 | 10,8 | 10,4 | 15,3 | 10,3 | 12,0 |
| **Nebuleuse** | 13,0 | 11,5 | 15,4 | 14,9 | 12,0 | 11,0 | 13,0 |
| **Pulsar** | 10,8 | 15,4 | 3,6 | 11,5 | 13,6 | 16,9 | 14,0 |
| **Eclipse** | 10,4 | 14,9 | 11,5 | 16,2 | 11,9 | 5,7 | 11,8 |
| **Comete** | 15,3 | 12,0 | 13,6 | 11,9 | 13,7 | 12,3 | 12,0 |
| **Horizon** | 10,3 | 11,0 | 16,9 | 5,7 | 12,3 | 19,8 | 8,8 |
| **Quasar** | 12,0 | 13,0 | 14,0 | 11,8 | 12,0 | 8,8 | 10,3 |

**Elle est symétrique** : 0 couple (r₁, r₂) où taux(r₁→r₂) ≠ taux(r₂→r₁), écart maximal 0,0000 pt. Hors diagonale, elle va de 5,7 % (Eclipse↔Horizon) à 16,9 % (Pulsar↔Horizon) — un rapport de 3× qui est un fait géométrique, pas un avantage, puisqu'il joue dans les deux sens. La diagonale (Pulsar 3,6 %, Horizon 19,8 %) ne porte que sur 110 à 306 paires ordonnées selon le régime : à ne pas sur-interpréter.

## 4. Mesure 3 — l'effet réel sur un combat
2 000 objets, `objetDepuisGraine(sha256d(utf8("eq-" + i)), âge)`, âge = les quatre à tour de rôle.
Résolution appliquée : `coup = max(1, lame + accord − trunc(cuirasse_déf / 4))`, `accord = ±trunc(lame/4)`, `dos = 0`, tenue de départ `8 + ecu`.

**Les axes sont uniformes.** Somme ≠ 64 : 0 objet.

| axe | min | max | médiane | moyenne | σ |
|---|---|---|---|---|---|
| lame | 0 | 56 | 15 | 15,74 | 9,64 |
| ecu | 0 | 57 | 16 | 16,20 | 9,96 |
| eperon | 0 | 56 | 16 | 16,23 | 9,97 |
| arc | 0 | 59 | 15 | 15,82 | 9,80 |

`lame > arc` dans 48,30 % des objets ; l'axe de pointe se répartit 25,25 / 25,90 / 25,65 / 23,20 %. **Aucun biais d'axe au tirage.**

**Polarité entre objets** (classe = archétype, ce que `fiche.ts` et `bestiaire.ts` passent) : constructif 20,64 %, neutre 68,22 %, destructif 11,14 %. Avec la classe du catalogue (3 valeurs) à la place : 14,38 / 52,30 / **33,33 %**.

**Coups pour abattre** (3 998 000 paires ordonnées) :

| polarité | coup moyen | coups moyens | médiane | max |
|---|---|---|---|---|
| constructif | 16,13 | **5,94** | 2 | 65 |
| neutre | 12,46 | **7,24** | 3 | 65 |
| destructif | 9,03 | **8,78** | 3 | 65 |

15,63 % des coups sont ramenés au plancher `max(1, …)` ; 12,39 % des abattages demandent plus de 20 coups — au-dessus du budget de 6 à 10 feuilles par bataille du §4.

**Duels** (1 999 000 paires) : celui qui frappe en premier l'emporte dans **59,68 %** des cas → **avantage du premier coup = 9,68 pt**. 20,43 % des paires sont décidées par le seul ordre (nA = nB) ; dans les 79,57 % restantes, l'issue ne dépend pas de qui commence. L'avantage monte à 11,86 pt en polarité constructive et descend à 6,75 pt en destructive.

**Existe-t-il une unité dominante ? Oui.** Initiative par `eperon` : 7 unités sur 2 000 (0,35 %) gagnent plus de 90 %. En frappant **toujours en second** (l'ordre neutralisé) : **49 unités (2,45 %)**, la meilleure à **97,40 %** — mot `76d7b9db`, jupiter, `lame 23 · ecu 38 · eperon 2 · arc 1`, tenue 46, q = [365, 623, −18, −37], proximité 95, cellule arme×Horizon. Leurs axes moyens : lame 23,7 · ecu 32,0 · eperon 4,2 · arc 4,1 — contre 15,7 / 16,2 / 16,2 / 15,8 pour l'ensemble.

**Le prix des axes** (taux de victoire en frappant toujours en second, l'initiative neutralisée) :

| corrélation au taux de victoire | lame | ecu | eperon | arc | lame+ecu |
|---|---|---|---|---|---|
| r | +0,472 | +0,547 | −0,516 | −0,496 | **+0,899** |

| lame+ecu | objets | taux de victoire |
|---|---|---|
| 0–15 | 129 | **3,97 %** |
| 16–31 | 842 | 22,58 % |
| 32–47 | 845 | 54,27 % |
| 48–64 | 184 (9,20 %) | **77,11 %** |

**Rapport haut/bas : 19×.** Voilà le power creep — pas dans la polarité, dans le taux de change des axes.

**La polarité, elle, ne renverse presque rien** : elle change le vainqueur dans **2,54 %** des duels (4,74 % avec l'ordre neutralisé), et r(score de polarité, taux de victoire) = **+0,0003** (initiative par eperon) / +0,072 (en second).

**Le bonus de dos est mort-né** : `memeOrbite` (égalité entière exacte) est vraie pour **96 paires sur 1 999 000 = 0,0048 %**. Au catalogue, où toutes les normes sont égales, elle monte à 0,63 %. La variante lue `memeOrbiteLue` (même première figure) vaudrait 27,64 %.

## 5. Mesure 4 — la rareté achète-t-elle la force ?
Rareté = proximité en centièmes à la forme la plus proche (`fiche.ts`). Sur les 2 000 objets : min **85**, max 100, médiane 96, moyenne 95,84, **σ = 2,67**. Paliers atteints : pur (≥97) 976 · franc (≥90) 959 · mêlé (≥78) 65 · trouble **0** · opaque **0**.

| corrélation | Pearson | Spearman |
|---|---|---|
| proximité ↔ score de polarité | **+0,178** | +0,191 |
| proximité ↔ taux de victoire (eperon) | **+0,045** | +0,059 |
| proximité ↔ taux de victoire (en second) | +0,032 | — |
| proximité ↔ lame | −0,022 | — |
| score de la forme proche ↔ score de l'objet | +0,124 | — |
| score de la forme proche ↔ taux de victoire | −0,002 | — |
| occupation d'une cellule ↔ score moyen | +0,113 | — |
| occupation d'une cellule ↔ taux de victoire | +0,004 | — |

| palier | n | score moyen | taux de victoire |
|---|---|---|---|
| pur (≥97) | 976 | 203,69 | 50,82 % |
| franc (≥90) | 959 | 180,12 | 49,35 % |
| mêlé (≥78) | 65 | 122,69 | 47,24 % |

**Une forme rare n'est pas une forme forte — le signe est même inversé** : les objets *purs* ont un score de polarité un peu supérieur (+0,178) et gagnent 50,82 % contre 47,24 % aux mêlés, un écart de 3,58 pt sans effet de marché. Et les cellules peu peuplées (28 objets pour accessoire×Pulsar, contre 202 pour accessoire×Eclipse) ne gagnent pas plus (r = +0,004).

## 6. Verdict
1. **La polarité ne fabrique pas d'objet de marché, et c'est structurel.** `polariteDe` est symétrique en ses deux membres : 0 asymétrie sur 3 998 000 paires. Une forme constructive contre tout est une forme contre laquelle tout est constructif ; `accord = ±trunc(lame/4)` s'applique aux deux camps. Résultat mesuré : r(score de polarité, taux de victoire) = +0,0003, et la polarité ne renverse que 2,54 % des duels.
2. **Aucune cellule dominante.** Étendue 3,66 sur 99 adversaires (σ 1,10), matrice 7×7 symétrique à 0,0000 pt près. Le destructif est une identité de classe, jamais une géométrie : l'écart entre cellules est un écart d'effectif au catalogue (34 armes contre 33).
3. **Rare ≠ fort** : r = +0,045. Le marché peut tarifer la rareté sans tarifer la puissance.
4. **Le trou réel est le taux de change des axes.** `lame + ecu` : r = 0,899, 77,11 % de victoires contre 3,97 %, un rapport de 19×. La conservation fixe la somme, pas le prix. Un joueur rationnel n'achètera pas une forme rare : il achètera n'importe quel mot à `lame + ecu ≥ 48` — 9,20 % du tirage. **C'est là qu'un marché ouvert se déséquilibre, et la loi de conservation n'y peut rien.**

## 7. Recommandations, chiffrées, non implémentées
- **R1 — Ne pas toucher `resonance.ts`, et garder le diviseur 4.** Balayage mesuré (ratio des temps d'abattage destructif/constructif, et part des duels renversés) : div 2 → 2,490 / 3,59 % ; div 3 → 1,735 / 2,91 % ; **div 4 → 1,479 / 2,54 %** ; div 6 → 1,260 / 2,01 % ; div 8 → 1,159 / 1,57 % ; aucun accord → 1,028 / 0 %. Le 4 est le seul palier qui se lise (48 % d'écart de TTK) sans se marchander (2,54 % d'issues).
- **R2 — Donner un prix à `arc` et à `eperon` avant d'ouvrir le marché.** Deux cibles chiffrées à tenir dans `bataille.ts` : (a) |r| de chaque axe au taux de victoire **sous 0,30** (aujourd'hui lame+ecu = 0,899) ; (b) rapport entre le quartile haut et le quartile bas de lame+ecu **sous 3×** (aujourd'hui 19×). Leviers déjà prévus au §3 : portée par `arc`, reprise `arc/8`, zone de contrôle par `eperon`. Un plafond sur l'apport défensif (`− trunc(min(ecu, 32)/4)`) est le levier le plus direct, mais il faudra le remesurer : relever le plancher de tenue ne suffit pas (base 0 → 49 unités dominantes, base 32 → 47).
- **R3 — Rendre le bonus de dos atteignable ou le retirer.** À 0,0048 %, la condition `memeOrbite` ne se déclenchera jamais en jeu. Deux sorties : `memeOrbiteLue` (27,64 % des paires) ou la seule prise à revers, sans condition d'orbite.
- **R4 — Assumer l'avantage du premier coup par écrit.** 9,68 pt, et 20,43 % des duels décidés par le seul ordre. Relever le plancher de tenue de 8 à 16 le ramène à 7,79 pt, au prix de 9,14 coups par abattage contre 7,14 — donc de feuilles. À 12,39 % d'abattages au-delà de 20 coups, le budget de 6 à 10 feuilles par bataille du §4 est déjà optimiste.
- **R5 — Ne jamais donner la classe `ancre` à une unité.** Seule classe d'effectif 1 : elle ne peut pas être destructive, score +19 contre −12 au mieux pour les 100 autres.
- **R6 — Trancher dans la PR 2 la classe passée à `polariteDe`.** L'archétype (9 muses) donne 11,14 % de destructifs, la classe du catalogue (3) en donne 33,33 %. Le choix triple le poids de la résonance dans le combat. Aucune des deux n'est déséquilibrée ; les deux ne racontent pas la même chose.

## LIMITE
- **Le duel simplifié n'est pas `bataille.ts`.** Ni grille, ni portée, ni zone de contrôle, ni reprise, ni dos. `arc` y est un axe mort **par construction du modèle**, pas nécessairement par construction du jeu : r = −0,496 mesure le modèle. Les mesures 1, 2 et 4 sont définitives (elles ne dépendent que de `resonance.ts`, `cosmos.ts` et du catalogue) ; **la mesure 3 est un plancher, à refaire sur le moteur réel.**
- **`dos` a été fixé à 0** dans toutes les résolutions ; sa condition a été mesurée à part (R3).
- **La rareté est presque une constante** : 85–100, σ 2,67, et **aucun objet sous 78 sur 2 000**. Deux des cinq paliers de `RARETES` sont inatteignables au tirage. Le marché n'a donc, aujourd'hui, presque aucun signal de rareté à tarifer — ce n'est pas un déséquilibre, c'est une dimension vide.
- **L'échantillon n'est pas la population.** 2 000 objets tirés de `sha256d("eq-" + i)` ; le tirage réel passe par `graineTirage(sig, hashBloc)`. La distribution des mots devrait être la même, ce n'est pas prouvé ici.
- **Rien n'est rejouable par la CI.** Les scripts vivent dans le scratchpad, hors dépôt. S'ils doivent engager, ils deviennent un `.test.ts` à vecteurs gelés, ajouté à la main dans `package.json`.
- **Ces chiffres sont des figures, pas des preuves.** Aucun n'entre dans une feuille, un carnet ou une signature.
