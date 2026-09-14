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

---

# Post-scriptum — R2, R4 et R6 rejouées sur le moteur à points d'action

**Statut :** mesure, aucune ligne du dépôt touchée · **Branche :** `tactique-moteur` · **Moteur mesuré :** `atelier/src/lib/eidos/tactique/` à `14fe665` · **Témoin :** copie de `719ca7a` dans le scratchpad (drapeaux `aFrappe` / `aDeplace`)
**Pourquoi ce post-scriptum :** le §7 pose **R2**, deux cibles à tenir dans `bataille.ts`, et le §9 ter de `SPEC_TACTIQUE.md` les dit « à vérifier à chaque changement du moteur ». Le moteur a changé deux fois depuis les chiffres publiés : `c3703a2` (`DIV_PAS` 12 → 32, `DIV_PORTEE` 16 → 10 ; pas 2–4, portée 1–7) puis `14fe665` (**deux points d'action par unité et par tour**, un pas ou un coup par point, `passer` les vide). Personne ne les avait revérifiées.
**Règle de lecture :** inchangée — aucune phrase sans chiffre, et **aucun résultat négatif n'est caché**.

## PS.0 En sept lignes
**La cible (a) est rompue, d'un facteur 6.** Sur le protocole du §4 rejoué à l'identique, `|r|` max passe de **0,098** (moteur à drapeaux, qui reproduit les 0,075 publiés) à **0,622** sur le moteur à PA. **La cible (b) tient**, et largement : quartile haut / quartile bas de `lame+ecu` = **0,82×** contre 3× de plafond.
**Ce que les PA cassent, c'est `arc`.** Son `r` passe de +0,030 à **−0,377**, et il reste à −0,365 même quand on neutralise le terrain. La cause est arithmétique : deux points d'action valent **2·pas = 4 à 8 cases par tour**, quand la plus longue portée vaut 7. La règle que `unite.ts` écrit et que `unite.test.ts` contrôle — *« le pas le plus long reste sous la portée la plus longue »* — est **fausse en jeu depuis `14fe665`**, parce que le contrôle lit `pas` et non `PA_PAR_TOUR · pas`.
**Ce n'est ni la double frappe ni le frapper-puis-se-retirer.** Bridée à un pas par tour, la double frappe seule donne `|r|` max **0,236** (cible tenue) ; bridée à une frappe, le double pas seul donne **0,588**. Et *frapper puis se retirer* était **déjà légal sous les drapeaux** : `jouer` n'y imposait aucun ordre entre le pas et le coup.
**Le malus d'extrémité ne bouge pas** : bande de tier 37,12 → **35,18 pt**, chute de niche du tier le plus bas au plus haut **36,4 → 42,8 pt** (elle s'aggrave). Les PA ne font pas de l'extrémité un sidegrade ; ils déplacent seulement *quelle* pointe survit — `eperon` à T12 passe de 6,62 % à **23,14 %**, `arc` tombe de 28,98 % à **15,60 %**.
**R4 : l'avantage du premier coup n'a pas grossi, une fois la case tenue fixe** — 7,71 pt → **3,47 pt**. Ce qui a grossi, c'est le prix du **terrain** : 1,92 pt avant, **14,52 pt** après. Le budget de feuilles du §4 n'est pas menacé : une mêlée 3 contre 3 en brûle **5** en médiane, 11 au pire.
**R6 est tranchée, et dans le sens du catalogue** : `resoudreCoup` passe `u.classe`, de type `Classe` (3 valeurs, 33,26 % de destructifs). Le choix pèse **4,45 %** des issues.

## PS.1 Le protocole, et les trois politiques
Mêmes graines qu'au §4 : 2 000 mots `objetDepuisGraine(sha256d(utf8("eq-" + i)), âge)`, les quatre âges à tour de rôle ; panels par tier tirés de `sha256d(utf8("tier-" + i))`, 120 mots par tier, douze tiers de `SPEC_LOOT_TIERS.md` sur `E3 = Σaxe² − 1024`. Tout le combat passe par le **vrai moteur** — `ouvrirBataille`, `jouer`, `finDePhase`, `ordreDePhase` — jamais par une résolution réécrite. Aucun `Math.random`, aucune horloge, aucun flottant hors des lectures statistiques.

Terrain : l'étage le plus dégagé (**198**), sa plus grande région d'un tenant, **73 cases sur 81**. Huit distances d'engagement (1 à 8), la paire de cases la plus centrale à cette distance. Trois politiques, jouées par les deux camps dans un lot ; **8 × 3 = 24 lots**, `K = 8` adversaires par sujet et par lot.

Les PA changent ce qu'est une politique : elle ne choisit plus *un* geste mais **deux, dans l'ordre qu'elle veut**. Les trois sont écrites comme une boucle sur les points, et c'est le moteur qui refuse ce qui est illégal — le témoin à drapeaux fait tourner **le même code**.

| politique | ce qu'elle fait de ses deux points | ce que les PA lui ouvrent |
|---|---|---|
| **naïf** | tant qu'il reste un point : frapper si une proie est à portée, sinon avancer jusqu'à pouvoir frapper, pas un pas de plus | la **double frappe** au contact, le **double pas** quand la cible est hors d'atteinte |
| **posté** | se placer au bout de sa portée et, si possible, hors de la portée adverse ; une fois posté, frapper | **deux coups depuis une case où l'adversaire ne riposte pas** |
| **harceleur** | à portée et dans la portée adverse, avec un refuge accessible : frapper, puis se retirer hors de portée ; sinon jouer posté | **rien** — c'était déjà légal sous les drapeaux |

C'est la troisième ligne qui corrige le message de `14fe665`. Sous les drapeaux, `jouer` n'imposait **aucun ordre** entre le pas et le coup : *frapper puis se retirer* était permis. Ce que les drapeaux interdisaient, c'est **approcher, frapper et se retirer** — et deux points d'action l'interdisent tout autant. Les seules nouveautés réelles sont le double pas et la double frappe.

**Une lecture, trois conventions.** Le protocole du §4 donne l'initiative au plus grand `eperon` — et, comme le premier est aussi posé sur la case `a`, il lui donne **la case en même temps**. Sur le moteur à drapeaux la case ne valait rien (1,92 pt, PS.5) ; sur le moteur à PA elle vaut 14,52 pt, et le confondant devient le premier terme de la mesure. Les trois lectures sont donc rendues séparément :

| convention | initiative | case de départ |
|---|---|---|
| **publiée** (§4, à l'identique) | au plus grand `eperon` | au plus grand `eperon` |
| **terrain neutralisé** | au plus grand `eperon` | les deux places jouées |
| **ordre neutralisé** | les deux ordres joués | fixe |

Tailles d'échantillon : **660 288** duels par moteur en lecture publiée (383 808 du pool contre lui-même, 276 480 des panels par tier), **576 000** en terrain neutralisé (N = 1 500), **1 320 576** en ordre neutralisé, **165 888** duels de niche, **43 200** duels d'ordre, **36 000** duels de R6, **1 200** mêlées 3 contre 3.

## PS.2 M1 — R2 sur le moteur à points d'action

**Lecture publiée** (protocole du §4 à l'identique, 660 288 duels par moteur) :

| moteur | lame | ecu | eperon | arc | \|r\| max | (a) < 0,30 | Q4/Q1 | (b) < 3× |
|---|---|---|---|---|---|---|---|---|
| §4 publié (modèle simplifié, sans grille) | −0,065 | +0,075 | −0,044 | +0,032 | 0,075 | tenue | 1,00× | tenue |
| drapeaux `719ca7a` (témoin) | −0,063 | +0,098 | −0,067 | +0,030 | **0,098** | tenue | 1,02× | tenue |
| **PA `14fe665`** | −0,141 | −0,115 | **+0,622** | **−0,377** | **0,622** | **ROMPUE** | **0,82×** | tenue |

Le témoin reproduit les chiffres publiés à **0,03 près sur les quatre axes** : le banc et les politiques sont comparables à ceux qui ont produit les 330 144 duels du §4. L'écart mesuré est donc bien celui du moteur, pas celui de la mesure.

**Terrain neutralisé** (les deux places jouées, l'initiative toujours au plus grand `eperon` ; 576 000 duels, N = 1 500) :

| moteur | lame | ecu | eperon | arc | \|r\| max | (a) | Q4/Q1 |
|---|---|---|---|---|---|---|---|
| drapeaux | −0,038 | +0,135 | −0,060 | −0,040 | **0,135** | tenue | 1,05× |
| PA | +0,048 | +0,106 | +0,209 | **−0,365** | **0,365** | **ROMPUE** | 1,06× |

**Ordre neutralisé** (les deux ordres joués, la case fixe ; 1 320 576 duels) :

| moteur | lame | ecu | eperon | arc | \|r\| max | (a) | Q4/Q1 |
|---|---|---|---|---|---|---|---|
| drapeaux | +0,064 | +0,200 | **−0,449** | +0,191 | **0,449** | **ROMPUE** | 1,18× |
| PA | +0,086 | +0,118 | −0,052 | −0,152 | **0,152** | tenue | 1,08× |

**Verdict M1.** La cible **(a) est rompue** : 0,622 contre 0,30, six fois la marge, et elle l'est aussi (0,365) quand on retire le confondant de terrain. Elle ne tient que dans la lecture où l'initiative elle-même est retirée — et cette lecture-là, c'est le **moteur à drapeaux** qui la rate (0,449). La cible **(b) tient partout**, de 0,80× à 1,18×, très loin des 3× : la conservation de la somme 64 fait son travail, et le §9 ter avait raison sur ce point.

**L'axe qui casse n'est pas celui qu'on croit.** `eperon` monte à +0,622 dans la lecture publiée, mais il retombe à +0,209 dès qu'on lui retire la case et à −0,052 dès qu'on lui retire l'initiative : **son prix est l'initiative, rien d'autre**. `arc`, lui, vaut −0,377 dans la lecture publiée, −0,365 en terrain neutralisé, −0,152 en ordre neutralisé : c'est le seul axe négatif dans les trois lectures, et sur le moteur à drapeaux il tenait entre −0,040 et +0,191. **Les points d'action ont tué `arc`.**

## PS.3 Pourquoi — le double pas, mesuré à part
La politique est bridée, jamais le moteur : au plus tant de frappes et tant de pas par tour. `1 frappe / 1 pas` reproduit exactement le régime des drapeaux ; `2/2` est le moteur tel qu'il est. N = 1 000, K = 6 : **143 904** duels par ligne, **287 808** en ordre neutralisé.

| bride de la politique | \|r\| max, lecture publiée | l'axe qui tranche | \|r\| max, ordre neutralisé |
|---|---|---|---|
| 1 frappe / 1 pas (= les drapeaux) | **0,102** tenue | eperon −0,022 · arc +0,029 | 0,399 rompue (eperon −0,399) |
| 1 frappe / **2 pas** (double pas seul) | **0,588** rompue | eperon **+0,588** · arc **−0,518** | 0,427 rompue (arc −0,427) |
| **2 frappes** / 1 pas (double frappe seule) | **0,236** tenue | lame −0,231 · arc +0,236 | 0,432 rompue (arc +0,432) |
| 2 frappes / 2 pas (le moteur) | **0,624** rompue | eperon **+0,624** · arc −0,353 | 0,133 tenue |

**Le coupable est le double pas, et il est isolé.** Le rendre seul disponible suffit à rompre la cible (0,588) ; la double frappe seule la laisse tenue (0,236). La raison se lit sans mesure : deux points d'action valent **2·pas**, soit **4 à 8 cases** par tour sur une dalle de 9 de côté, quand la plus longue portée vaut **7**. Un archer n'a plus une seule case d'où tirer sans être rejoint dans le tour.

C'est exactement la règle que `unite.ts` s'était donnée après `c3703a2` : *« le pas le plus long reste sous la portée la plus longue »*. Le contrôle qui la garde (`unite.test.ts`) compare `PAS_BASE + 64/DIV_PAS = 4` à `PORTEE_BASE + 64/DIV_PORTEE = 7` et passe — **il lit le pas d'un point d'action, pas le pas d'un tour**. Le pas d'un tour vaut 8. Le contrôle est vert, la règle est violée, et la violation se mesure à 0,41 point de corrélation sur `arc`.

**Deux réglages du pas, mesurés** (N = 1 500, K = 8) :

| variante | pas | pas d'un tour | \|r\| max publiée | \|r\| max terrain neutralisé | nuls (terrain neutralisé) |
|---|---|---|---|---|---|
| moteur d'aujourd'hui | 2–4 | 4–8 | 0,622 ¹ | **0,365** (arc −0,365) | 1,18 % |
| `DIV_PAS = 64` | 2–3 | 4–6 | 0,564 | **0,255** tenue (arc −0,255) | 1,35 % |
| `PAS_BASE = 1`, `DIV_PAS = 64` | 1–2 | 2–4 | 0,372 (arc **+0,372**) | 0,357 (arc +0,357) | **4,51 %** |

¹ mesuré à N = 2 000 ; la valeur est stable en N (0,613 à N = 400, 0,624 à N = 1 000, 0,622 à N = 2 000).

Le premier réglage qui remet le pas d'un tour sous la plus longue portée (4–6 < 7) **rend la cible (a) tenue en terrain neutralisé**. Le suivant la casse dans l'autre sens — `arc` devient l'axe dominant et **4,51 %** des duels ne se concluent plus (6,15 % en lecture publiée).

**Un effet de bord des PA, à ne pas perdre :** les batailles qui ne finissent pas. Zéro nul sur 660 288 duels à drapeaux ; **2,28 %** sur le moteur à PA, dont **6,68 %** de la politique postée, et 9 mêlées 3 contre 3 sur 1 200 (0,75 %). Le double pas permet de fuir indéfiniment. `issueDe` ne connaît que `victoire`, `defaite` et `epuise` : hors banc, c'est le compte de feuilles qui finit par trancher, mais dans une bataille où le joueur ne frappe pas, rien ne le fait.

## PS.4 M2 — le malus d'extrémité, sur le moteur à PA
Panels de 120 mots par tier contre le pool, 276 480 duels ; niche = par sujet, le quartile d'adversaires le plus favorable contre le moins favorable, 165 888 duels.

| moteur | T1 | T6 | T12 | **bande de tier** | niche T1 | niche T12 | **chute de niche** |
|---|---|---|---|---|---|---|---|
| publié (`bataille.ts`, LIMITE) | 55,6 % | — | 19,5 % | 36,1 pt | 93,9 % | 57,6 % | 36,3 pt |
| drapeaux `719ca7a` (témoin) | 57,07 % | 34,04 % | 19,94 % | **37,12 pt** | 93,92 % | 57,55 % | **36,4 pt** |
| **PA `14fe665`** | 55,63 % | 32,37 % | 20,45 % | **35,18 pt** | 96,08 % | 53,29 % | **42,8 pt** |

**Verdict M2 : les points d'action ne changent rien au malus d'extrémité.** La bande se referme de **1,94 point** sur 37 — dans le bruit d'un panel de 120 mots. Le taux dans la niche décroît toujours du tier le plus bas au plus haut (96,08 → 53,29 %), et il décroît même un peu plus vite qu'avant (42,8 pt d'amplitude contre 36,4). L'explication arithmétique du §LIMITE de `bataille.ts` tient : abattre demande de tenir *et* de frapper, c'est un produit, et concentrer un budget fixe minore un produit. **Un geste de plus par tour ne change pas un produit.**

**Ce qui change, c'est quelle pointe survit à l'extrémité** (taux de victoire du panel T12, par axe de pointe) :

| moteur | pointe lame | pointe ecu | pointe eperon | pointe arc |
|---|---|---|---|---|
| drapeaux | 23,82 % | 21,64 % | **6,62 %** | **28,98 %** |
| PA | 24,76 % | 18,76 % | **23,14 %** | **15,60 %** |

La pointe `eperon` au tier le plus haut est multipliée par **3,5** ; la pointe `arc` est divisée par **1,86**. Les deux axes faibles ont échangé leurs places, la somme n'a pas bougé. Et la comparaison demandée — le mot rapide et fragile gagne-t-il enfin quelque chose ? — répond **oui pour `eperon`, mais pas par le harcèlement** : la bride `1 frappe / 1 pas` autorise déjà *frapper puis se retirer* et laisse `eperon` à 6,62 % ; c'est le double pas qui le porte à 23,14 %, en rendant `arc` inatteignable.

Au passage, deux chiffres du dépôt sont périmés : la docstring de `CHARGE_PAR_CASE` (`types.ts`) annonce la pointe `eperon` à **12,33 %** au tier le plus haut et la pointe `arc` à **41 %**. Mesurés ici sur `719ca7a`, c'est-à-dire **après** `c3703a2` : **6,62 %** et **28,98 %**. Le recalage du pas et de la portée avait déjà défait la moitié du gain de la charge, sans que personne le note.

## PS.5 M3 — R4, l'avantage du premier coup, et le prix des feuilles
900 paires × 24 lots, chaque paire jouée dans les deux ordres : **43 200 duels** par moteur. Deux lectures, et l'écart entre elles est le résultat.

| lecture | drapeaux | PA |
|---|---|---|
| **places échangées avec l'ordre** (celle qui donne les 9,68 pt du §7) | 59,63 % → **9,63 pt** | 67,99 % → **17,99 pt** |
| **places tenues fixes, seuls les camps changent** | 57,71 % → **7,71 pt** | 53,47 % → **3,47 pt** |
| écart entre les deux = **le prix de la case** | **1,92 pt** | **14,52 pt** |
| duels décidés par le seul ordre (places fixes) | 36,97 % | 37,46 % |
| mêlée 3 contre 3, places fixes, 1 200 mêlées | 50,83 % → **0,83 pt** | 53,90 % → **3,90 pt** |

**Verdict M3 : non, l'avantage du premier coup n'a pas grossi — il a diminué de moitié** (7,71 → 3,47 pt en duel). La double frappe donne bien deux coups à qui a la main, mais elle donne aussi deux gestes à qui l'a en second, et le second choisit en connaissant le premier : en mêlée 3 contre 3 le gain net du camp qui ouvre reste de **3,90 pt**. La part des duels que le seul ordre décide ne bouge pas (36,97 → 37,46 %).

**Ce qui a grossi d'un facteur 7,6, c'est le prix du terrain.** Sur le moteur à drapeaux, occuper la case `a` plutôt que la case `b` valait 1,92 pt ; il en vaut 14,52 sur le moteur à PA. Le chiffre de 9,63 pt qu'on lisait comme « avantage du premier coup » était donc, déjà, 7,71 pt d'ordre et 1,92 pt de terrain mêlés ; sur le moteur à PA la même lecture donne 17,99 pt dont **80 % de terrain**. C'est aussi ce qui gonfle `r(eperon)` à +0,622 : le banc donne la bonne case au plus grand `eperon`, le jeu ne la lui donne jamais — `ordreDePhase` ne trie qu'à l'intérieur d'un camp.

L'avantage est très inégal selon la distance d'engagement (places fixes, moteur à PA) : **d1 68,43 %**, d2 63,91 %, d3 56,12 %, d4 60,02 %, puis **d5 48,30 %, d6 43,17 %, d7 43,60 %, d8 44,36 %** — au-delà de quatre cases, c'est **le second qui gagne**. Frapper le premier ne paie qu'au contact.

**Le coût en feuilles, mesuré sur des batailles et non sur des duels** (1 200 mêlées 3 contre 3, feuilles illimitées pour lire le coût nu) :

| | drapeaux | PA |
|---|---|---|
| feuilles brûlées par le coffre — médiane / p95 / max | 4 / 7 / **9** | 5 / 8 / **11** |
| part au-dessus de 10 feuilles | 0,00 % | **0,08 %** |
| coups portés, les deux camps — médiane / p95 | 8 / 12 | 9 / 13 |
| tours — médiane / p95 | 5 / 7 | 4 / 6 |
| duel : feuilles du coffre — médiane / p95 / max | 1 / 2 / 6 | 2 / 3 / 7 |
| coups pour abattre — médiane / p95 / max | 2 / 4 / 12 | 2 / 4 / 12 |
| abattages au-delà de 20 coups | **0,00 %** | **0,00 %** |

**Le budget de 6 à 10 feuilles du §4 de `SPEC_TACTIQUE.md` n'est pas menacé : il est généreux.** Une mêlée 3 contre 3 en coûte **5** en médiane, 8 au 95ᵉ centile, **11 au pire sur 1 200**. Les PA en ajoutent **une** (4 → 5 en médiane), pas davantage : la double frappe se paie, et une politique qui frappe deux fois abrège d'autant la bataille — la médiane de tours tombe de 5 à 4.

**Et la réserve du §7 tombe.** R4 écrivait : « à 12,39 % d'abattages au-delà de 20 coups, le budget de 6 à 10 feuilles est déjà optimiste ». Ces 12,39 % venaient du **duel simplifié**, sans grille ni portée. Sur le moteur réel, dans les deux versions, **0,00 %** des abattages passent 20 coups, et le maximum observé est de **12**, sur 383 808 abattages du témoin et 378 917 du moteur à PA. La phrase à corriger n'est pas le budget : c'est la mesure qui la portait.

## PS.6 M4 — R6, la classe passée à `polariteDe`
**Le constat, lu dans le code.** `resoudreCoup` (`bataille.ts`) appelle `paireDe({ q: qDeMot(a.mot), classe: a.classe }, { q: qDeMot(d.mot), classe: d.classe }, …)`. Le champ `Unite.classe` est typé **`Classe`** (`cosmos.ts` : `arme | defense | accessoire`), et `uniteDepuisObjet` l'exige en paramètre. **La PR 2 a donc tranché pour la classe du catalogue** — celle qui donne trois valeurs et le taux de destructif le plus haut. `fiche.ts` continue de passer l'archétype à la même fonction : les deux lectures coexistent dans deux fichiers, chacune cohérente chez elle.

Aucune conséquence en jeu pour l'instant : **rien hors de `tactique/` n'importe le moteur**, et le seul appelant de `uniteDepuisObjet` est `unite.test.ts`. La classe réellement passée sera celle que la PR 5 fournira ; le type l'oblige à être une `Classe`.

**Ce que le choix pèse.** Le même duel est rejoué sous trois lectures du champ `classe` — catalogue (3 valeurs), archétype (9 muses), unique (une classe par unité, donc jamais de destructif par identité de classe et la polarité redevient purement géométrique). 500 paires × 24 lots, **11 849 duels décisifs dans les trois lectures**.

| lecture du champ `classe` | constructif | neutre | destructif |
|---|---|---|---|
| catalogue (ce que passe `resoudreCoup`) | 14,56 % | 52,18 % | **33,26 %** |
| archétype (ce que passe `fiche.ts`) | 21,03 % | 67,80 % | **11,17 %** |
| unique | 23,66 % | 76,34 % | 0 % |

| changement de lecture | duels dont le vainqueur change |
|---|---|
| catalogue → unique (**tout le poids de la polarité**) | **4,45 %** |
| catalogue → archétype (le choix de R6) | **5,24 %** |
| archétype → unique | 1,91 % |

**Verdict M4 : la recommandation est satisfaite, et son enjeu était plus petit qu'annoncé.** R6 disait vrai — le catalogue triple le taux de destructif (33,26 % contre 11,17 %) — mais « tripler le poids de la résonance dans le combat » ne se lit pas dans les issues : retirer **toute** la polarité ne change le vainqueur que de **4,45 %**, et passer du catalogue à l'archétype de **5,24 %**. Le §6 mesurait 2,54 % de duels renversés sur le modèle simplifié ; sur le moteur réel avec PA, c'est 4,45 %. La polarité reste une lecture qui colore, pas une règle qui décide. Aucun des deux choix n'est déséquilibré, et celui qui est fait est le plus lisible : trois classes qui s'interfèrent, comme le dit `resonance.ts`.

Un détail qui n'engage rien mais qui trompe : la polarité destructive **avantage celui qui frappe le premier** (taux du premier : destructif 78,29 %, neutre 74,63 %, constructif 67,69 %). Un accord négatif allonge la bataille, et une bataille longue profite à qui a un coup d'avance.

## PS.7 Recommandations, chiffrées, non implémentées
- **R7 — Le contrôle de `unite.test.ts` doit lire `PA_PAR_TOUR · pas`, pas `pas`.** Il compare aujourd'hui 4 à 7 et passe ; le pas d'un tour vaut 8 depuis `14fe665`, et la règle que le contrôle prétend garder — « le pas le plus long reste sous la portée la plus longue » — est fausse. Coût mesuré de la violation : `r(arc)` de +0,030 à **−0,377**, pointe `arc` au tier le plus haut de 28,98 % à **15,60 %**. C'est le contrôle le moins cher de tout ce post-scriptum : une ligne.
- **R8 — Si la règle doit tenir, `DIV_PAS = 64` la fait tenir, et c'est le seul palier mesuré qui la fasse tenir.** Pas 2–3, pas d'un tour 4–6 sous la portée maximale de 7 : `|r|` max en terrain neutralisé **0,255** (cible tenue) contre 0,365 aujourd'hui, `arc` remonte de −0,365 à −0,255, les nuls ne bougent pas (1,35 % contre 1,18 %). Le palier suivant (`PAS_BASE = 1`) casse dans l'autre sens : `arc` **+0,372**, et **4,51 %** de duels sans conclusion (6,15 % en lecture publiée). À arbitrer contre l'autre sortie, qui ne touche à aucune constante : **interdire le second pas** (au plus un `deplacer` par tour, la double frappe conservée) — mesuré à **0,236**, cible tenue, mais c'est un drapeau de plus, exactement ce que `14fe665` venait de retirer.
- **R9 — Le §9 ter de `SPEC_TACTIQUE.md` doit dire dans quelle convention la cible (a) se mesure.** Les trois lectures donnent trois verdicts opposés sur le même moteur (0,622 / 0,365 / 0,152), et sur le moteur d'avant elles en donnaient trois autres (0,098 / 0,135 / 0,449). Recommandation chiffrée : **retenir le terrain neutralisé** — l'initiative au plus grand `eperon`, parce que `ordreDePhase` la lui donne, et les deux places jouées, parce que le jeu ne lui donne jamais la case. C'est la seule lecture qui ne mesure pas un artefact du banc, et elle coûte le double de duels.
- **R10 — Compter les batailles qui ne finissent pas, avant de brancher la Veillée.** 0,00 % à drapeaux, **2,28 %** des duels et **0,75 %** des mêlées 3 contre 3 avec les PA — un mot rapide qui refuse le contact n'est plus rattrapable. Trois sorties, aucune mesurée ici : un compte de tours dans `issueDe`, un coût croissant du second pas, ou l'acceptation que `epuise` (l'arbre vide) soit la seule fin possible d'une fuite — ce qui transforme une fuite en dépense de feuilles pour l'adversaire, donc en tactique, et non en blocage.
- **R11 — Réécrire les chiffres périmés de `types.ts`.** La docstring de `CHARGE_PAR_CASE` annonce « la pointe `eperon` au tier le plus haut passe de 5,85 % à 12,33 % » et « 12,33 % reste loin des 41 % de la pointe `arc` au même tier ». Mesuré sur `719ca7a` : **6,62 %** et **28,98 %** ; sur `14fe665` : **23,14 %** et **15,60 %**. Et la LIMITE du même bloc dit qu'il manque « de pouvoir frapper **puis** se retirer hors d'atteinte » : cela **était déjà légal** sous les drapeaux, `jouer` n'imposant aucun ordre entre le pas et le coup. Ce qui manquait vraiment — « un pas qui se dépense en deux temps autour de la frappe » — manque toujours : deux points d'action ne fractionnent pas un pas. Trois nombres et une phrase.
- **R12 — Le budget de feuilles peut être écrit tel quel, et il est large.** 5 feuilles en médiane pour une mêlée 3 contre 3, 8 au 95ᵉ centile, 11 au pire sur 1 200 : les « 6 à 10 feuilles par bataille » du §4 couvrent le pire cas mesuré, et les « 6 à 8 batailles par arbre » sont un **plancher** — un arbre de 64 feuilles en porte **8 au 95ᵉ centile et ≈ 12 en médiane**. La réserve de R4 — 12,39 % d'abattages au-delà de 20 coups — vient du duel simplifié et vaut **0,00 %** sur le moteur réel ; elle est à retirer du §7, pas à corriger.

## PS.LIMITE
- **Le banc est un duel, sauf là où c'est dit.** Les tableaux de PS.2, PS.3, PS.4 et de R6 sont des un-contre-un. Une bataille réelle a plusieurs unités par camp, une zone de contrôle qui se referme à plusieurs, et un ordre de phase qui compte : seuls PS.5 (l'ordre, les feuilles) et les nuls ont été mesurés en 3 contre 3. Rien ne garantit que le prix de `arc` en mêlée soit celui du duel.
- **Trois politiques ne sont pas un joueur.** Aucune des trois ne dépense un point pour la **charge** — jamais un pas gratuit avant un coup pour gagner `CHARGE_PAR_CASE` par case parcourue. C'est précisément le prix que `types.ts` donne à `eperon`, et il n'est donc pas mesuré ici. Une quatrième politique « chargeur » relèverait `eperon` dans toutes les lectures, d'un montant inconnu.
- **La télégraphie et `approche` ne sont pas jouées.** Les Indéchiffrés du banc suivent la politique du lot, pas la règle provisoire de `telegraphier`. Le jour où `ia.ts` (PR 3) arrive, tout ce post-scriptum est à rejouer — c'est même le premier usage du banc.
- **Un seul étage, une seule dalle.** L'étage 198, 73 cases libres sur 81 : le plus dégagé des `ETAGES`. Une salle étroite change le prix du pas et celui de la portée dans des sens opposés, et `ETUDE_MOBILITE.md` a mesuré que la géométrie de la dalle vaut plus que le moteur. Les valeurs absolues d'ici ne valent que sur cette dalle ; les **écarts entre les deux moteurs** valent davantage, puisqu'ils partagent la dalle.
- **La case `a` et la case `b` ne sont pas équivalentes, et c'était invisible.** Le protocole du §4 posait le premier joueur toujours sur la même case. Sur le moteur à drapeaux l'erreur valait 1,92 pt et ne se voyait pas ; sur le moteur à PA elle vaut 14,52 pt et fausse le chiffre principal. Tout banc futur doit jouer les deux places, ou dire qu'il ne les joue pas.
- **Les nuls sont comptés pour une demi-victoire**, comme au §4. À 2,28 % de nuls sur le moteur à PA, cette convention tire mécaniquement toutes les lectures vers 50 % et comprime les écarts d'environ 2 % ; à 6,15 % (variante `PAS_BASE = 1`), elle les comprime de 6 %. Les comparaisons entre moteurs sont donc légèrement conservatrices, jamais exagérées.
- **Rien n'est rejouable par la CI.** Les scripts vivent dans le scratchpad, hors dépôt : un banc, une copie de `719ca7a`, deux copies à `DIV_PAS` modifié. Aucun fichier de `atelier/` n'a été touché. S'ils doivent engager, ils deviennent un `.test.ts` à vecteurs gelés, ajouté à la main dans `package.json`.
- **Ces chiffres sont des figures, pas des preuves.** Aucun n'entre dans une feuille, un carnet ou une signature. Un taux de victoire ne garantit rien ; seuls le carnet, la chaîne et les signatures engagent.

---

# Second post-scriptum — C2 : R2 rejouée sur le moteur **et la politique** du dépôt

**Statut :** mesure, **et un banc dans le dépôt** — `atelier/scripts/banc-r2.ts`, `npm run banc-r2`, test CI `banc-r2.test.ts` · **Branche :** `eperon-c2` · **Moteur mesuré :** `main` à `2637c97` (`DIV_PAS = 32`), et la même arborescence à `DIV_PAS = 64` · **Politique :** `ia.ts`, `jouerBataille`, pour les deux camps · **Date :** 2026-09-13
**Pourquoi ce second post-scriptum :** le §6 bis de `docs/FEUILLE_DE_ROUTE.md` a nommé la faille du premier — trois politiques écrites pour l'occasion ont rendu trois `r(eperon)` pour le même moteur (−0,165, +0,622, −0,310), donc **les cibles du §9 ter mesurent le couple moteur + politique**, et C3 a mis la politique dans le dépôt pour qu'on puisse enfin mesurer *ce* couple. C2 devait re-tarifer `eperon` (`DIV_PAS` 32 → 64, arbitrage A1) et se donnait pour cible `|r| < 0,30` sur le protocole complet, avec pour critère d'abandon une bande de tier qui s'ouvre.
**Règle de lecture :** inchangée — aucune phrase sans chiffre, aucun résultat négatif caché.

## PS2.0 En sept lignes
**C2 est tué par sa mesure, et proprement.** `DIV_PAS = 64` ne change rien : `|r|` max **0,640 → 0,657**, bande de tier **29,6 → 29,5 pt**, nuls **0 → 0**, feuilles par mêlée **2 / 9 → 2 / 9** (médiane / max). Les deux cibles de R2 sont, sur ce couple, dans le même état avant et après.
**Et la prémisse de D2 est fausse sur ce couple.** Le double pas ne rattrape pas l'archer : `arc` corrèle à **+0,591** avec la victoire et `eperon` à **−0,640**. Le premier post-scriptum lisait l'inverse (+0,622 / −0,377) parce que ses politiques donnaient l'initiative au plus grand `eperon` ; dans le moteur, l'initiative est **par camp** (`phase: "coffre"` d'abord), `eperon` n'ordonne qu'à l'intérieur d'un camp.
**Le prix de `arc`, c'est l'allonge.** Sans elle (`DIV_ALLONGE → ∞`), `r(arc)` tombe de +0,419 à **+0,016** sur l'échantillon rapide ; à `base/4`, +0,272.
**Le prix de `eperon` n'est nulle part.** Aucune des sept sondes ne le ramène au-dessus de **−0,418** : ni la charge doublée (−0,591), ni l'initiative qu'on lui donne (−0,587), ni une politique qui se couvre avant d'approcher (−0,597), ni un pas plus long (2..6 : −0,418, mais la bande s'ouvre de 26,3 à 33,3 pt). Au tier le plus haut, la pointe `eperon` gagne **3,8 %** de ses duels, la pointe `arc` 43,9 %.
**La cible (b) tient partout** : quartile haut / quartile bas de `lame+ecu` = **1,04×** dans les deux configurations, contre 3× de plafond.
**Ce qui reste vrai de D2 :** `PA_PAR_TOUR · pas = 8 > 7`, et `unite.test.ts` l'affirme. Ce qui est faux : que cela coûte quelque chose à `arc`. La règle « le pas le plus long reste sous la portée la plus longue » n'a plus de mesure derrière elle sur ce couple.
**Le banc est dans le dépôt.** 440 320 duels en ~16 min hors CI ; 15 616 duels et 60 mêlées en ~30 s en CI, calibrés contre les chiffres d'ici.
**Et la suite, le même soir (PS2.8–PS2.9).** La politique ne peut pas (quatre candidats, aucun ne remonte `eperon`) ; le moteur le peut en partie : la riposte qui ne demande plus la portée ramène `|r|` max de **0,640 à 0,487** sur le protocole complet, **0,330** avec l'allonge à `base/4` — le levier, pas encore la cible, et 7 points de bande de tier en plus.

**Et le lendemain (PS2.10, C2 ter).** Le levier, l'allonge et le socle **ensemble** : riposte en contre, `DIV_ALLONGE` 4, `COUP_BASE` 24 — `|r|` max **0,145** sur le protocole complet (lame −0,007, ecu −0,008, eperon −0,128, arc +0,145), Q4/Q1 0,99×, bande 32,4 pt, 0 nul. La cible (a) est tenue pour la première fois sur le couple moteur + politique du jeu ; le socle seul, sans le contre, **aggrave** (0,604).

## PS2.1 Le protocole, et ce qui change par rapport à PS.1
Même pool que le §4 : 2 000 mots `objetDepuisGraine(sha256d("eq-" + i))`, les quatre âges à tour de rôle, classe par rang (`arme`, `defense`, `accessoire`). Mêmes panels par tier : 120 mots par tier, tirés dans l'ordre de `sha256d("tier-" + i)` (T12 vaut un mot sur 2 048 : la suite est longue, pas aléatoire). Même dalle, l'étage 198 et ses 73 cases libres ; huit distances d'engagement sur la rangée libre y = 1, le coffre en (0,1) et l'Indéchiffré en (d,1). Tout passe par `ouvrirBataille` puis `jouerBataille` — aucune grille, aucune résolution, aucune politique recopiée.

Trois différences, chacune motivée :

| | PS.1 | ici | pourquoi |
|---|---|---|---|
| politique | trois, écrites pour le banc | **une**, `ia.ts`, les deux camps | c'est elle que le jeu joue ; le §6 bis de la feuille de route l'exige |
| initiative | au plus grand `eperon` | **par camp**, comme le moteur ; chaque paire jouée **deux fois**, chacun tenant une fois le coffre | `ouvrirBataille` donne toujours la main au coffre ; `ordreDePhase` n'ordonne qu'un camp. Jouer les deux sièges retire de la mesure le premier coup **et** la case (14,52 pt à PS.5), il ne reste que les axes |
| adversaires | K = 8 par lot, 24 lots | K = 8 par distance, 8 distances, tirés par empreinte (`adv-i-d-k`) | même volume par mot (128 duels), un seul lot par distance puisqu'une seule politique |

Tailles : **256 000** duels du pool contre lui-même (comptés pour les deux mots), **184 320** duels des panels contre le pool (comptés pour le sujet), **1 200** mêlées 3 contre 3 (équipes tirées du pool, coffre en x = 1, Indéchiffrés en x = 7, rangées 1 à 3, 64 feuilles). Nul = `jouerBataille` rend la main à `TOURS_MAX = 64` phases sans issue, compté une demi-victoire pour chacun, comme au §4. `epuise` (l'arbre vide) compté de même. Tout est entier jusqu'aux corrélations, rendues en millièmes.

## PS2.2 M1 — R2, dans les deux configurations (440 320 duels chacune)

| `DIV_PAS` | pas | pas d'un tour | lame | ecu | eperon | arc | \|r\| max | (a) < 0,30 | Q4/Q1 | (b) < 3× | nuls |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **32** (le moteur) | 2..4 | 4..8 | +0,003 | +0,057 | **−0,640** | **+0,591** | **0,640** | **ROMPUE** | 1,04× | tenue | 0,00 % |
| **64** (C2, A1) | 2..3 | 4..6 | +0,010 | +0,055 | **−0,657** | **+0,602** | **0,657** | **ROMPUE** | 1,04× | tenue | 0,00 % |

Taux du quartile bas / haut de `lame+ecu` : 46,1 % / 47,9 % à 32, 46,0 % / 48,0 % à 64. Phases par duel 1,352 / 1,354 ; coups par duel 2,30 / 2,29.

**Verdict M1.** La cible (a) est rompue **dans les deux configurations, par les mêmes deux axes, dans le même sens, à 0,017 près**. `DIV_PAS = 64` n'est pas un correctif : il retire à `eperon` un prix qu'il ne convertissait déjà pas — sur 2 000 mots, `eperon ≥ 32` (le seul cas où le pas monte à 3) concerne **7,8 %** du pool (156 mots), et `eperon = 64` (pas 4) n'existe pas — le plus haut `eperon` tiré vaut 56. Le pas est plat en pratique, avant comme après.

**Le signe est l'inverse du premier post-scriptum, et la raison se lit dans le protocole.** PS.2 donnait le siège du premier coup au plus grand `eperon` ; rejoué ici avec **cette** convention et la politique du dépôt (échantillon rapide, un duel par paire), `eperon` reste à **−0,587** et `arc` à +0,235. L'initiative n'était donc pas ce qui portait `eperon` à +0,622 : c'étaient les trois politiques (« posté », « harceleur ») qui tenaient l'archer immobile ou fuyant, là où `ia.ts` le fait **tirer deux fois** depuis sa case.

## PS2.3 M2 — la bande de tier, et la pointe qui survit
Panels de 120 mots par tier contre le pool, 184 320 duels par configuration, deux sièges.

| `DIV_PAS` | T1 | T2 | T3 | T4 | T5 | T6 | T7 | T8 | T9 | T10 | T11 | T12 | **bande T1 − T12** |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 32 | 54,9 | 49,7 | 44,4 | 44,6 | 37,9 | 37,3 | 33,4 | 30,9 | 30,5 | 29,5 | 26,2 | 25,3 | **29,6 pt** |
| 64 | 55,1 | 49,7 | 43,8 | 44,5 | 37,4 | 37,4 | 33,4 | 31,0 | 30,7 | 30,0 | 26,5 | 25,6 | **29,5 pt** |

**Verdict M2.** La bande **ne bouge pas** (0,1 pt sur 29,6, dans le bruit d'un panel de 120). Le critère d'abandon de C2 — « la bande s'ouvre au lieu de se fermer » — ne se déclenche pas au sens strict ; il ne se referme pas non plus, et c'est la cible principale qui n'est pas atteinte. Le malus d'extrémité mesuré à PS.4 (35,2 pt) se retrouve, un peu plus doux avec la politique du dépôt (29,6 pt), et toujours monotone du tier le plus bas au plus haut.

**La pointe qui survit au tier le plus haut** (panel T12, taux de victoire par axe de pointe, `DIV_PAS = 32`, protocole complet) : lame 37,6 % · ecu 20,3 % · eperon **3,8 %** · arc 43,9 %. Sur l'échantillon rapide : 44,2 / 23,4 / **3,1** / 28,9 %. Les chiffres de la docstring de `CHARGE_PAR_CASE` (« 12,33 % » pour `eperon`, « 41 % » pour `arc`, puis 6,62 / 28,98 % à PS.4) sont remplacés par ceux-ci.

## PS2.4 M3 — les nuls et les feuilles
| `DIV_PAS` | nuls, duels du pool | nuls, panels | mêlées 3v3 : nuls | feuilles par mêlée, médiane | moyenne | max | phases, médiane |
|---|---|---|---|---|---|---|---|
| 32 | 0 / 256 000 | 0 / 184 320 | 0 / 1 200 | **2** | 1,77 | **9** | 3 |
| 64 | 0 / 256 000 | 0 / 184 320 | 0 / 1 200 | **2** | 1,76 | **9** | 3 |

**Verdict M3.** Avec `ia.ts` des deux côtés, **aucune bataille ne reste sans issue** — les 2,28 % de nuls de PS.3 venaient de politiques qui fuyaient ; la politique du dépôt approche toujours (rang 4, `approche`). Le budget de feuilles est très large : 2 coups du coffre en médiane pour une mêlée 3 contre 3, 9 au pire sur 1 200, contre les « 6 à 10 feuilles par bataille » du §4. Un tour à deux coups vaut deux feuilles, et pourtant la mêlée en coûte peu : les Indéchiffrés jouent second, à distance 6, et c'est souvent **eux** qui frappent les premiers — le coffre a approché, et l'échange tourne court.

## PS2.5 Pourquoi — cinq duels lisibles
Le mot à pointe `eperon` du pool rapide (`lame 13 · ecu 4 · eperon 45 · arc 2`, pas 3, portée 1, tenue 40) contre le mot à pointe `arc` (`2 · 5 · 3 · 54`, pas 2, portée 6, tenue 42), distance 5 :
- **le rapide tient le coffre** : il avance de 4 cases en deux pas (deux PA, donc aucun coup), s'arrête au contact ; l'archer frappe (22), encaisse la riposte (36 — `eperon` 45 > 3, l'attaquant est à portée 1), frappe encore (22) : le rapide est retiré au tour 1, l'archer garde 6 de tenue ;
- **l'archer tient le coffre** : deux coups de 31 depuis sa case (base 18, accord +4, **allonge +9**), aucune riposte possible — retiré au tour 1, l'archer n'a pas bougé.

Contre le mot à pointe `lame` (`47 · 2 · 12 · 3`, tenue 36), distance 3 : celui qui joue en premier avance de 2 cases et frappe avec la charge (+8) — 37 contre 36 de tenue pour le rapide, 71 pour la lame : **le premier à frapper gagne, dans les deux sens**. À distance 7, l'archer avance de 2 (charge +8), tire avec l'allonge (35), puis achève (31) avant que la lame ne l'ait touché.

Ce que ces duels disent, et que les corrélations résument : la politique minimise l'`approche` (rang 4) avant l'`exposition` (rang 5), donc un mot à portée 1 **entre dans la portée d'un archer sans pouvoir frapper le même tour**, et l'archer, lui, frappe deux fois sans bouger. Les quatre prix de `eperon` — le pas, le rang de phase, la riposte, la charge — ne pèsent rien face à cela : le pas ne sert qu'à arriver plus vite au contact où l'on est frappé le premier ; le rang de phase ne compte pas en duel ; la riposte exige que l'attaquant soit **dans la portée** du riposteur, donc adjacent quand `arc` est bas, et elle rend un coup de base 18 ; la charge (+4 par case) profite autant à la lame qui approche.

## PS2.6 Sondes d'orientation — où le prix des axes n'est pas (échantillon rapide, 200 mots, 15 616 duels, `DIV_PAS = 32`)
Une constante ou une ligne changée à la fois, dans un worktree jetable, jamais dans le dépôt. Le témoin est l'échantillon rapide du banc tel qu'il est.

| sonde | lame | ecu | eperon | arc | \|r\| max | Q4/Q1 | bande | ce qu'elle dit |
|---|---|---|---|---|---|---|---|---|
| **témoin** | +0,113 | +0,019 | **−0,547** | **+0,419** | 0,547 | 1,12× | 26,3 pt | l'échantillon rapide lit le même moteur que le protocole complet (−0,640 / +0,591), un peu moins fort |
| sans allonge (`DIV_ALLONGE → ∞`) | +0,210 | +0,190 | −0,425 | **+0,016** | 0,425 | 1,29× | 24,8 pt | **l'allonge est tout le prix de `arc`** ; `eperon` reste le dernier |
| allonge à `base/4` | +0,159 | +0,092 | −0,524 | +0,272 | 0,524 | 1,20× | 26,7 pt | `arc` passe sous la cible, `eperon` non |
| `CHARGE_PAR_CASE = 8` | +0,040 | +0,236 | −0,591 | +0,294 | 0,591 | 1,26× | 22,4 pt | doubler la charge **n'aide pas** `eperon` : tout le monde approche avant de frapper |
| `exposition` avant `approche` (`ia.ts`) | +0,151 | +0,188 | −0,597 | +0,246 | 0,597 | 1,36× | 27,2 pt | se couvrir d'abord n'aide pas non plus ; les batailles finissent toujours (0 nul) |
| initiative au plus grand `eperon`, un duel par paire | +0,172 | +0,171 | −0,587 | +0,235 | 0,587 | 1,36× | 26,3 pt | **la convention de PS.2 ne sauve pas `eperon`** avec la politique du dépôt |
| pas 2..6 (`DIV_PAS = 16`) | +0,084 | +0,015 | −0,418 | +0,321 | 0,418 | 1,07× | **33,3 pt** | le mieux pour `eperon`, et la bande s'ouvre de 7 pt |
| pas 1..5 (`PAS_BASE = 1`, `DIV_PAS = 16`) | +0,010 | −0,095 | −0,449 | **+0,544** | 0,544 | 0,96× | 33,3 pt | `arc` redevient l'axe dominant |

**Lecture.** Aucune constante prise seule ne ramène `eperon` au-dessus de −0,42, et la seule qui s'en approche ouvre la bande de tier. Le prix des axes n'est **ni dans le pas, ni dans la charge, ni dans l'initiative** : ce sont les trois choses que `eperon` achète, et les trois sont sans valeur pour une politique qui approche toujours et frappe dès qu'elle peut. Ce qu'une sonde ne mesure pas, et qu'il faudrait mesurer avant de toucher au moteur : un prix **nouveau** pour `eperon`, ou une politique qui sache dépenser ce qu'il achète — les deux sont des chantiers avec leur mesure, et le second est le moins cher.

## PS2.7 Verdict, et ce qu'il fait à la feuille de route
- **C2 est tué.** Sa cible (`|r| < 0,30` sur le protocole complet) n'est pas atteinte à `DIV_PAS = 64`, et elle ne l'est pas davantage à 32 : **0,657 contre 0,640**. `DIV_PAS` reste à **32**. A1 est tranché par la mesure, dans le sens contraire de sa recommandation.
- **D2 est reformulée.** Le fait demeure (`8 > 7`, et le contrôle l'affirme), mais son prix mesuré change de signe : sur le couple du dépôt, `arc` n'est pas rattrapé, il domine (+0,591) ; c'est `eperon` qui n'achète rien (−0,640). La règle « le pas le plus long reste sous la portée la plus longue » n'a plus de mesure derrière elle ; elle reste écrite comme une convention, pas comme un résultat.
- **Une dette nouvelle, D9 : le prix des axes est renversé.** Deux axes sur quatre sont hors cible, dans les deux sens, et **la cible (a) est plus loin qu'aucune étude ne l'avait vue** (0,640 contre 0,622, 0,365, 0,152 selon les lectures de PS.2).
- **C4 reste gelé sur le même mot** — « ne pas ancrer, ne pas exporter tant que R2 n'est pas tenue » (A2) — et il ne dépend plus de C2, mais du chantier qui trouvera le prix de `eperon`.
- **Le banc est livré**, et c'est le seul livrable de code : `banc-r2.ts` rejoue le protocole entier hors CI et un échantillon calibré en CI. La prochaine mesure de R2 coûte une commande, pas une étude.

## PS2.8 C2 bis, la politique d'abord — quatre candidats, aucun ne remonte `eperon`
A16 a été tranché dans le sens de la politique (2026-09-13, soir) : c'est le seul des trois chemins qui ne touche ni au moteur ni aux vecteurs gelés. Quatre candidats, écrits sans nombre magique, chacun une règle de plus dans l'ordre lexicographique de `meilleurQue`, mesurés sur l'échantillon rapide dans un worktree jetable (200 mots, 15 616 duels, 60 mêlées) :

| candidat | ce qu'il change | lame | ecu | eperon | arc | \|r\| max | bande | mêlée, feuilles méd./max |
|---|---|---|---|---|---|---|---|---|
| **témoin** (`ia.ts` tel qu'il est) | — | +0,113 | +0,019 | **−0,547** | +0,419 | 0,547 | 26,3 pt | 2 / 9 |
| **seuil** | sans coup possible ce tour, viser une case d'où `pas + portée` atteint la proie au tour prochain, la moins exposée, puis la plus proche | +0,107 | +0,129 | **−0,596** | +0,353 | 0,596 | 27,3 pt | 4 / 8 |
| seuil, puis approche, puis exposition | idem, l'exposition après l'approche | +0,113 | +0,019 | −0,547 | +0,419 | 0,547 | 26,3 pt | 2 / 9 |
| **exposition à riposte près** | une case d'où l'on riposte (attaquant à portée, `eperon` plus haut) n'est pas une case exposée | +0,113 | +0,019 | −0,547 | +0,419 | 0,547 | 26,3 pt | 2 / 9 |
| seuil + riposte | les deux | +0,143 | +0,147 | **−0,653** | +0,354 | 0,653 | 26,6 pt | 3 / 10 |

**Verdict.** Deux candidats ne changent **aucun choix** (mêmes 15 616 duels à l'octet : minimiser l'approche implique déjà d'être au seuil quand c'est possible, et l'exposition ne départage presque jamais) ; les deux autres **aggravent** `eperon`. La raison se lit dans les duels de PS2.5 : s'arrêter au seuil au lieu du contact, c'est encaisser deux flèches **avec l'allonge et sans riposte** (31 + 31) au lieu de deux coups au contact **ripostés** (22 + 22, moins 36 rendus). La politique du dépôt fait déjà la meilleure chose qu'une politique puisse faire à un mot qui n'a que de l'initiative : arriver. Aucun candidat ne mérite le protocole complet. **C2 bis (direction politique) est tué**, au premier étage du banc.

Ce que la politique **ne peut pas** faire, et qu'aucune ne pourra : rendre payant un axe dont le moteur ne paie rien. Le pas arrive plus vite là où l'on est frappé le premier ; la charge profite à tous ; la riposte exige que l'attaquant soit **dans la portée du riposteur** — un archer à six cases n'est jamais riposté par un mot à portée 1. C'est cette condition-là que la direction moteur interroge.

## PS2.9 La direction moteur, sondée pour A16 — la riposte qui ne demande plus la portée
Même échantillon rapide, une règle changée à la fois dans un worktree jetable, `ia.ts` intact :

| sonde | ce qu'elle change | lame | ecu | eperon | arc | \|r\| max | Q4/Q1 | bande | T12 pointe eperon / arc |
|---|---|---|---|---|---|---|---|---|---|
| **témoin** | — | +0,113 | +0,019 | −0,547 | +0,419 | 0,547 | 1,12× | 26,3 pt | 3,1 % / 28,9 % |
| **riposte sans portée** | `riposteDe` ne teste plus `distance ≤ portée(d)` : un mot plus vif rend le coup à **tout** attaquant, où qu'il frappe de | +0,216 | +0,123 | **−0,298** | −0,043 | **0,298** | 1,25× | 31,0 pt | 3,8 % / 7,8 % |
| riposte à `pas` cases | la riposte porte à `max(portée, pas)` : l'éperon rejoint son attaquant | +0,144 | +0,005 | −0,459 | +0,316 | 0,459 | 1,13× | 25,0 pt | 3,8 % / 28,9 % |
| **riposte sans portée + allonge à `base/4`** | les deux prix se rééquilibrent | +0,265 | +0,186 | **−0,171** | −0,287 | **0,287** | 1,34× | 32,5 pt | 6,3 % / 3,1 % |
| riposte à `pas` + allonge à `base/4` | | +0,193 | +0,066 | −0,396 | +0,139 | 0,396 | 1,20× | 25,0 pt | 6,3 % / 25,0 % |
| riposte sans portée, sans allonge | | +0,283 | +0,226 | +0,008 | **−0,526** | 0,526 | 1,39× | 30,0 pt | 10,0 % / 2,3 % |

**Lecture.** Une seule condition du moteur porte tout le prix manquant d'`eperon` : la riposte n'atteint que ce qui est **à portée**, donc jamais un archer. La lever ramène `|r|` max de 0,547 à **0,298** sur l'échantillon rapide — sous la cible, ce que ni une constante ni une politique n'avaient approché — en donnant à `eperon` le prix qui manquait (−0,547 → −0,298) et en retirant à `arc` celui qu'il avait en trop (+0,419 → −0,043). Le coût : la bande de tier s'ouvre de 26,3 à 31,0 pt (la pointe `arc` au tier le plus haut tombe de 28,9 % à 7,8 %). Adoucir l'allonge en plus (`base/4`) équilibre encore `eperon` et `arc` (−0,171 / −0,287) mais ouvre la bande à 32,5 pt et fait remonter `lame` et `ecu` (+0,265 / +0,186) : à chasser `arc`, on rend le trône à `lame+ecu`, dont le rapport de quartiles monte à 1,34× — loin des 3×, mais dans la mauvaise direction. Sans allonge du tout, `arc` devient l'axe mort (−0,526).

**Protocole complet, les deux meilleures** (440 320 duels et 1 200 mêlées chacune, `DIV_PAS = 32`, `ia.ts` intact) :

| variante | lame | ecu | eperon | arc | \|r\| max | (a) | Q4/Q1 | bande | nuls | feuilles / mêlée |
|---|---|---|---|---|---|---|---|---|---|---|
| le moteur (PS2.2) | +0,003 | +0,057 | −0,640 | +0,591 | 0,640 | rompue | 1,04× | 29,6 pt | 0 | 2 / 9 |
| **riposte sans portée** | +0,133 | +0,167 | −0,487 | +0,194 | 0,487 | rompue | 1,18× | 36,8 pt | 0 | 1 / 8 |
| **riposte sans portée + allonge `base/4`** | +0,221 | +0,246 | −0,330 | −0,132 | 0,330 | rompue | 1,28× | 36,7 pt | 0 | 1 / 8 |

**Verdict.** Sur le protocole complet, la riposte sans portée rend `|r|` max **0,487** (au-dessus de la cible de 0,30 ; eperon −0,487, arc +0,194, lame +0,133, ecu +0,167), la cible (b) tenue (1,18×), 0 nul, une bande de tier de **36,8 pt** contre 29,6 (T1 55,4 % → T12 18,6 % ; au tier le plus haut, pointe eperon 4,2 %, arc 12,9 %, lame 37,7 %, ecu 21,7 %). Avec l'allonge à `base/4` : `|r|` max **0,330** (rompue ; eperon −0,330, arc −0,132, lame +0,221, ecu +0,246), Q4/Q1 1,28×, bande 36,7 pt. 

**Ce que le protocole complet ajoute à l'échantillon.** Les quatre distances que l'échantillon rapide ne joue pas (2, 4, 6, 8) et les 1 800 mots qu'il ne tire pas rendent à `arc` une partie de son prix (−0,043 → +0,194) et laissent `eperon` plus bas (−0,298 → −0,487) : la riposte sans portée est **le levier** — aucune constante ni aucune politique n'avait bougé `|r|` max de plus de 0,13, celle-ci le fait de 0,15, et de 0,31 avec l'allonge à `base/4` — mais elle **ne suffit pas seule**, et elle coûte 7 points de bande de tier. Le reste est à chercher dans ce qui reste : l'allonge, le socle du coup et de la tenue (`COUP_BASE`, `MULT_TENUE`), ensemble et sur le protocole complet.

**Ce qu'une riposte sans portée veut dire, et ce qu'elle coûte.** La riposte cesse d'être un coup rendu à qui est à portée pour devenir un **contre** : le mot le plus vif rend le coup à quiconque le frappe, fût-ce de six cases — un éperon, pas un tir. Elle reste hors de tout PA et de toute feuille, elle n'appelle jamais de riposte, elle exige toujours `eperon` strictement plus haut et une tenue non nulle après le coup : deux conditions au lieu de trois. Rien ne change au carnet, à la chaîne ni aux formats — la bataille est une jauge — mais **`bataille.ts` change**, donc les contrôles de riposte de `bataille.test.ts`, la docstring de `riposteDe`, le §3 de `SPEC_TACTIQUE.md` et `BIBLE_VEILLEE.md`. Aucune preuve déposée ne rejoue encore une bataille (`depot.ts` ne connaît pas `bataille.ts`, et `veillees/index.json` est vide) : la règle peut changer sans rien invalider. C'est un chantier, avec sa première mesure faite et sa cible encore devant lui : **C2 ter**, à l'arbitrage de l'auteur.

## PS2.10 C2 ter — le contre, l'allonge et le socle ensemble : la cible tenue
Le 2026-09-14, le levier de PS2.9 fixé (la riposte ne demande plus la portée, `ia.ts` intact), une variante à la fois sur l'échantillon rapide dans un worktree jetable, puis le protocole complet sur les quatre meilleures. Deux constantes entrent en jeu que PS2.9 n'avait pas touchées : `COUP_BASE` (le socle du coup **et** de la tenue, `TENUE_BASE = MULT_TENUE·COUP_BASE`) et `MULT_TENUE`.

**Échantillon rapide** (200 mots, 15 616 duels, 60 mêlées), riposte en contre partout sauf les témoins :

| sonde | lame | ecu | eperon | arc | \|r\| max | Q4/Q1 | bande | T12 lame/ecu/eperon/arc | mêlée méd./max |
|---|---|---|---|---|---|---|---|---|---|
| témoin (riposte à portée, socle 16, `base/2`) | +0,113 | +0,019 | −0,547 | +0,419 | 0,547 | 1,12× | 26,3 pt | 44,2 / 23,4 / 3,1 / 28,9 % | 2 / 9 |
| contre, `base/2` | +0,216 | +0,123 | −0,298 | −0,043 | 0,298 | 1,25× | 31,0 pt | 44,2 / 23,8 / 3,8 / 7,8 % | 2 / 10 |
| contre, `base/4` | +0,265 | +0,186 | −0,171 | −0,287 | 0,287 | 1,34× | 32,5 pt | 45,5 / 25,0 / 6,3 / 3,1 % | 2 / 10 |
| **contre, `base/4`, socle 24** | +0,126 | −0,058 | +0,053 | −0,109 | **0,126** | 1,01× | 28,7 pt | 46,9 / 21,5 / 13,8 / 11,7 % | 2 / 7 |
| contre, `base/4`, socle 32 | +0,003 | −0,189 | +0,172 | +0,032 | 0,189 | 0,88× | 24,8 pt | 47,8 / 19,9 / 21,3 / 18,8 % | 2 / 7 |
| contre, `base/4`, socle 20 | +0,201 | +0,061 | −0,061 | −0,197 | 0,201 | 1,14× | 28,7 pt | 47,3 / 23,4 / 10,0 / 8,6 % | 2 / 7 |
| contre, `base/4`, socle 28 | +0,055 | −0,129 | +0,104 | −0,016 | 0,129 | 0,93× | 26,7 pt | 46,9 / 21,9 / 19,4 / 13,3 % | 2 / 8 |
| contre, `base/3`, socle 24 | +0,112 | −0,068 | −0,038 | +0,006 | 0,112 | 1,00× | 29,8 pt | 45,1 / 21,5 / 11,9 / 12,5 % | 2 / 9 |
| contre, `base/2`, socle 20 | +0,157 | +0,006 | −0,226 | +0,069 | 0,226 | 1,09× | 28,0 pt | 45,1 / 23,4 / 7,5 / 15,6 % | 2 / 8 |
| contre, `base/2`, socle 24 | +0,087 | −0,084 | −0,153 | +0,162 | 0,162 | 0,98× | 27,4 pt | 43,3 / 21,5 / 10,6 / 21,1 % | 2 / 8 |
| contre, `base/2`, socle 28 | +0,034 | −0,166 | −0,117 | +0,267 | 0,267 | 0,90× | 26,2 pt | 42,4 / 21,9 / 11,9 / 25,8 % | 2 / 8 |
| contre, `base/4`, `MULT_TENUE` 3 | +0,180 | +0,086 | +0,205 | −0,470 | 0,470 | 1,18× | 36,3 pt | 46,4 / 20,3 / 3,1 / 0,8 % | 4 / 12 |
| contre, `base/4`, `MULT_TENUE` 4 | +0,168 | +0,120 | +0,268 | −0,560 | 0,560 | 1,22× | 38,8 pt | 35,3 / 19,5 / 4,4 / 0,0 % | 6 / 16 |
| contre, `base/2`, `MULT_TENUE` 3 | +0,160 | +0,035 | +0,028 | −0,219 | 0,219 | 1,12× | 37,0 pt | 41,5 / 19,1 / 1,9 / 2,3 % | 4 / 9 |
| **témoin** : riposte à portée, `base/2`, socle 24 | +0,008 | −0,177 | −0,418 | +0,604 | 0,604 | 0,91× | 22,6 pt | 43,3 / 20,7 / 7,5 / 50,0 % | 2 / 9 |
| témoin : riposte à portée, `base/4`, socle 24 | +0,022 | −0,173 | −0,369 | +0,538 | 0,538 | 0,92× | 22,5 pt | 46,9 / 21,1 / 8,8 / 43,8 % | 2 / 9 |
| témoin : riposte à portée, `base/4`, socle 32 | −0,065 | −0,274 | −0,280 | +0,643 | 0,643 | 0,81× | 19,7 pt | 47,3 / 18,8 / 15,0 / 50,8 % | 2 / 8 |

**Lecture des sondes.** Le socle est le second levier, et il n'en est un **qu'avec le contre** : à 24 avec l'ancienne riposte, `arc` monte à +0,604 et prend la moitié des pointes du tier haut — relever le socle dilue `lame` et `ecu` (leur levier passe de 5 à 3,67), et sans le contre ce qu'ils perdent va tout entier à l'archer. `MULT_TENUE` est à laisser : des batailles plus longues (4 à 6 feuilles par mêlée) où `arc` meurt (−0,47, −0,56).

**Protocole complet, les quatre meilleures** (440 320 duels et 1 200 mêlées chacune, `DIV_PAS = 32`, `ia.ts` intact, ~36 min chacune à quatre en parallèle) :

| variante | lame | ecu | eperon | arc | \|r\| max | (a) | Q4/Q1 | bande | T12 lame/ecu/eperon/arc | nuls | feuilles / mêlée |
|---|---|---|---|---|---|---|---|---|---|---|---|
| le moteur de la veille (PS2.2) | +0,003 | +0,057 | −0,640 | +0,591 | 0,640 | rompue | 1,04× | 29,6 pt | 37,6 / 20,3 / 3,8 / 43,9 % | 0 | 2 / 9 |
| **contre, `base/4`, socle 24** | −0,007 | −0,008 | **−0,128** | **+0,145** | **0,145** | **tenue** | 0,99× | 32,4 pt | 40,2 / 21,7 / 11,0 / 16,5 % | 0 | 1 / 8 |
| contre, `base/3`, socle 24 | −0,029 | −0,024 | −0,219 | +0,275 | 0,275 | tenue | 0,98× | 32,4 pt | 39,2 / 21,4 / 10,1 / 18,8 % | 0 | 1 / 8 |
| contre, `base/4`, socle 28 | −0,097 | −0,125 | −0,024 | +0,247 | 0,247 | tenue | 0,91× | 30,3 pt | 40,6 / 21,5 / 14,6 / 20,3 % | 0 | 1 / 8 |
| contre, `base/2`, socle 24 | −0,064 | −0,061 | −0,342 | +0,473 | 0,473 | rompue | 0,94× | 31,7 pt | 37,7 / 20,7 / 8,6 / 25,3 % | 0 | 1 / 8 |

**Verdict.** La riposte en contre, l'allonge à `base/4` et le socle à 24 tiennent la cible (a) sur le protocole complet — **0,145**, les quatre axes sous 0,15 — avec (b) tenue (0,99×), 0 nul, une feuille par mêlée en médiane et 8 au pire. La bande de tier s'ouvre de 29,6 à **32,4 pt**, pas 36,8 : T1 54,1 % → T12 21,7 %, et au tier le plus haut les quatre pointes se répartissent 40 / 22 / 11 / 17 % là où `arc` en prenait 44 % la veille. Aucun axe n'achète plus la victoire, ce que le §9 ter demande. Retenu : `COUP_BASE = 24`, `DIV_ALLONGE = 4`, `riposteDe` à deux conditions ; `MULT_TENUE` et `DIV_PAS` ne bougent pas, `ia.ts` non plus.

**Ce que l'échelle a appris.** L'échantillon rapide suit le protocole complet à `base/4` (0,126 → 0,145 ; la veille 0,287 → 0,330) et ne le suit **pas** à `base/2` (0,162 → 0,473 ; la veille 0,298 → 0,487) : les quatre distances paires et les 1 800 mots qu'il ne joue pas rendent à `arc` son prix quand l'allonge est chère. Conséquence dans le dépôt : le contrôle de `banc-r2.test.ts` qui exigeait de l'échantillon **le signe** de chaque axe du protocole complet est faux par construction quand les prix sont proches de zéro (eperon −0,128 complet, +0,053 rapide ; arc +0,145 / −0,109) ; il exige désormais le même côté de chaque **cible**, et un contrôle neuf affirme la cible tenue sur les deux échelles. Le contrôle « prix des axes » de `bataille.test.ts` — trois politiques ad hoc, le plus vif ouvre toujours — rendait avec le contre eperon +0,396 et arc −0,364 : il mesurait sa propre convention, il est retiré (son contrôle de tier, un mot étroit n'est pas plus fort qu'un mot rond, reste).

**Ce que la règle change au jeu.** La riposte est un **contre** : frappée, une unité plus vive rend le coup à qui l'a frappée, de six cases s'il le faut — un éperon, pas un tir, et jamais d'allonge sur le coup rendu (l'attaquant était à sa propre portée). L'allonge reste un bonus (`+base/4`, 6 à 22) pour qui frappe hors de la portée de sa cible, mais elle n'achète plus l'impunité. Le socle 24 porte le coup de 24 à 88 et la tenue de 48 à 176 : les coups nus s'échangent 3,67 contre 1 au lieu de 5, les mêlées durent une phase de moins en médiane. Rien ne change au carnet, à la chaîne ni aux formats — la bataille est une jauge, et aucune preuve déposée n'en rejoue une.

## PS2.LIMITE
- **Une politique n'est pas un joueur, mais c'est celle du jeu.** `ia.ts` tient les Indéchiffrés à l'écran ; le coffre est tenu par une main humaine que ce banc ne modélise pas. Un joueur qui tient son archer hors de portée et son rapide en retrait peut rendre d'autres chiffres — le banc mesure ce que le jeu fait jouer, pas ce qu'un joueur pourrait faire.
- **Les deux sièges effacent l'initiative, à dessein.** Dans le jeu, le coffre joue toujours en premier : un joueur a *toujours* l'initiative contre les Indéchiffrés, quel que soit son `eperon`. La lecture « un siège chacun » est celle qui mesure les axes ; la lecture « le coffre d'abord » mesurerait le joueur.
- **Un seul étage, une seule rangée, une seule distance de mêlée.** L'étage 198, la rangée y = 1, les mêlées à distance 6. Comme à PS.LIMITE : les valeurs absolues valent sur cette dalle, les **écarts** entre configurations valent davantage.
- **Les sondes sont des sondes.** 200 mots, 15 616 duels, une modification à la fois : elles orientent, elles ne tranchent pas. Une décision se prendra sur le protocole complet, par `npm run banc-r2` sur la modification proposée.
- **Ces chiffres sont des figures, pas des preuves.** Aucun n'entre dans une feuille, un carnet ou une signature.
