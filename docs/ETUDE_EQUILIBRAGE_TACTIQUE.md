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
