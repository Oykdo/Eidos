# Loot et tiers — la rareté est une extrémité, pas une puissance

**Dépôt :** Oykdo/Eidos · **Statut :** mesure + conception, aucune ligne de code de jeu écrite · **Branche :** `tactique-moteur`
**Question posée :** l'auteur veut beaucoup plus d'items et beaucoup plus de rareté. Or `integrite.ts` gèle la somme des axes à 64, interdit la mutation d'un objet et le tirage hors `sha256d` : **un tier ne peut pas être plus fort.** Thèse à éprouver : le tier est l'**extrémité**, la distance de la répartition d'axes au centre (16,16,16,16).
**Périmètre :** `objets.ts`, `combat.ts`, `cosmos.ts`, `bestiaire.ts`, `fiche.ts`, `objets-lexique.ts`, `tactique/`. Rien de la chaîne : ni `noeud.py`, ni le carnet, ni `eonis.py`, ni la genèse.
**Base :** `ETUDE_EQUILIBRAGE_TACTIQUE.md` (mesures 1, 2 et 4 reprises telles quelles), `SPEC_TACTIQUE.md` §3 et §9 ter, `SPEC_COFFRE_HORAIRE.md` §3.
**Règle de lecture :** aucune phrase sans chiffre.

## 0. En cinq lignes
**La thèse tient, et le chiffre qui tranche est r(tier, taux de victoire) = −0,161** sur le moteur réel : un T12 ne gagne pas plus qu'un T1, il gagne **ailleurs** — σ du taux de victoire entre challengers 16,8 (T1) → 34,6 (T12), corrélation entre profils de matchup 0,473 → 0,31, et un T12 va de 3,0 % à 92,7 % selon lequel il est.
Il n'y a **pas** peu d'items : **2 149 582 852** mots canoniques (combinatoire exacte, confirmée à 0,8 % par 938 collisions sur 2·10⁶ tirages) et 47 858 profils d'axes sur 47 905 possibles. Ce qui manque, c'est l'écart : 86,8 % des tirages tiennent dans une bande d'extrémité de 46 points sur 96.
La rareté est plate **parce que le catalogue est dense** : rayon de couverture de RP³ par les 100 formes = **77,06 centièmes**. Aucun mot ne peut être à moins de 77 d'une forme ; `errant` (< 60) est donc impossible, pas rare.
La sortie mesurée : **E3 = Σaxe² − 1024**, 12 tiers en 2^−t, T12 à **1 sur 2 006**, sans toucher au tirage.
**Réserve bloquante :** eperon et arc n'ont toujours pas de prix — à tous les tiers, pointe sur lame/ecu 59–72 %, pointe sur eperon/arc 36 % → 3,0 % (rapport 19,6× à T12).

## 1. Ce qui a été mesuré, et comment
Scripts hors dépôt (scratchpad, `node --experimental-strip-types`), imports relatifs, aucune écriture dans `atelier/`. Les duels tournent sur le **moteur réel** (`tactique/bataille.ts`, `unite.ts`, `grille.ts`), pas sur un modèle : dalle de l'étage 38 (45 cases libres, plus grande composante connexe 36, poses à distance 14), `COUP_MIN = 7`, `DIV_ACCORD/DOS/CUIRASSE/ALLONGE = 4/2/4/4`, `pas = 2 + eperon/12`, `portée = 1 + arc/16`, reprise `arc/8`, zone de contrôle, dos positionnel. Deux politiques : l'approche du moteur (copie de `approche`) et la tenue de distance (kiting). Chaque duel est joué **dans les deux sens** : l'initiative de phase est neutralisée.
Tirage de référence : `objetDepuisGraine(sha256d(utf8("loot-" + i)), âge)`, âges à tour de rôle, jusqu'à 2·10⁶ objets. Le chemin flottant utilisé pour les grands balayages a été contrôlé contre `alignementCentiemes`/`formeProche` en BigInt : écarts de ±1 centième par troncature de `isqrt`, jamais plus.

## 2. Mesure 1 — combien d'items existent réellement
**L'espace des mots, exactement.** `packMot` canonise (premier non-512 ramené au-dessus de 512) ; 0 est point fixe de la négation modulo 1024. Le décompte exact donne **537 395 713** triplets canoniques × 4 indices omis = **2 149 582 852** mots, soit 50,05 % de 2³². Contrôle indépendant : 2·10⁶ tirages donnent 938 collisions, d'où une taille estimée de 2,132·10⁹ — **0,8 % d'écart** avec la combinatoire.

| | 10⁵ tirages | 2·10⁶ tirages |
|---|---|---|
| mots distincts | 99 997 | 1 999 062 |
| couples (mot, archétype) distincts | 100 000 | — |
| profils d'axes distincts | 35 123 / 47 905 (73,3 %) | **47 858 / 47 905 (99,90 %)** |

**Le vrai plafond n'est pas le mot, c'est le profil.** Les axes sont une composition de 64 en 4 parts : 47 905 possibles, et 99,90 % sont atteints. Le profil le plus fréquent pèse 0,032 % ; les dix premiers, 0,27 %. Aucun biais d'axe : moyennes 16,03 / 15,98 / 16,06 / 15,94, σ 9,83 à 9,85, min 0, max 63.

**Trois défauts du tirage, chiffrés.** 3,48 % des mots ont `x²+y²+z² > Q_SCALE²` : la composante omise est rabattue à 0 et le quaternion quitte la sphère (norme jusqu'à 875 au lieu de 724). 32,0 % des mots ne sont pas points fixes de `paqueter∘depaqueter` (l'indice omis n'est pas la plus grande composante) : le tirage explore un sous-espace que la forge (`composer`, `motDeQ`) n'atteint jamais. Aucun des deux n'est visible en jeu aujourd'hui.

**Les trois extrémités** (100 000 tirages, `combatDe`) :

| définition | moy | σ | min | méd | max | valeurs distinctes |
|---|---|---|---|---|---|---|
| E1 = max − min | 22,91 | 9,69 | 0 | 22 | 63 | 63 / 65 (1 et 64 manquent) |
| E2 = Σ\|a−16\| | 31,48 | 13,71 | 0 | 30 | 94 | 48 (toutes paires) |
| **E3 = Σ(a−16)² = Σa² − 1024** | 387,2 | 329,2 | 0 | 310 | 3072 | **767** sur 2·10⁶ |

**Conclusion.** Il y a 2,15·10⁹ mots et 47 905 profils : ce n'est pas le nombre qui manque. 98,7 % des tirages ont E2 ≥ 8 et 86,8 % tombent entre 16 et 62 : **beaucoup d'objets qui se ressemblent tous.**

## 3. Mesure 2 — pourquoi la rareté est plate : la cause racine
Trois suspects, un seul coupable.

1. **`quadrupleDepuis` ? Hors de cause :** il ne sert qu'au grind du catalogue, jamais au tirage d'un objet (`objetDepuisGraine` lit 3 × 10 bits de la graine et rien d'autre).
2. **`allouer` ? Hors de cause :** il ne touche pas la direction, seulement la composition d'axes ; la proximité se lit sur le quaternion.
3. **Le catalogue. Coupable.** Les 100 formes rangées ont un plus proche voisin à proximité **médiane 97** (min 88, moyenne 96,43, σ 2,12). Le **rayon de couverture** de RP³ par ces 100 formes, mesuré par 4·10⁵ points uniformes puis descente locale, vaut **77,06 centièmes** (angle 39,59°). Prédiction analytique pour 100 calottes de mesure 1/100 dans RP³ : cos ≈ 95,9 ; médiane mesurée 96. La théorie et la mesure coïncident.

**Le tirage n'y est pour rien** : la direction tirée est indiscernable d'une direction uniforme sur S³.

| proximité | 75–80 | 80–85 | 85–90 | 90–95 | 95–100 |
|---|---|---|---|---|---|
| mots tirés (2·10⁵) | 0,016 % | 0,442 % | 3,867 % | 24,12 % | 71,56 % |
| uniformes sur S³ (4·10⁵) | 0,017 % | 0,445 % | 3,119 % | 23,01 % | 73,41 % |

**Les deux paliers manquants, nommément.** `errant` (seuil 0, donc < 60) est **géométriquement impossible** : le minimum atteignable sur tout RP³ vaut 77. `hybride` (60–77) n'existe qu'au point le plus creux de RP³ : 0 sur 400 000 points uniformes et 0 sur 500 000 mots tirés. Les trois autres se répartissent `pur` 46,28 % · `franc` 49,56 % · `mêlé` 4,16 %. La rareté n'est pas une constante par accident : elle l'est par construction du catalogue.

## 4. Mesure 3 — l'extrémité est-elle un bon axe de tier ?
**Quelle définition sépare le mieux : E3.** E2 ne prend que 48 valeurs (toutes paires) : au-delà du 5ᵉ palier, le pas de 2 vaut déjà un facteur 0,75 en fréquence, et une échelle en 2^−t y dérive de 30 %. E1 en prend 63 mais rate 1 et 64. E3 en prend 767 : c'est la seule qui laisse poser douze seuils à ±7 % de 2^−t. C'est aussi la définition littérale de la thèse — la distance euclidienne au centre — et elle s'écrit sans soustraction : `E3 = Σ axe² − 1024`.
**Distribution continue, aucun trou** : les 49 valeurs paires de E2 de 0 à 96 sont toutes atteintes sur 10⁶ tirages ; la queue décroît régulièrement (P(E2 ≥ 40) = 27,7 % · ≥ 56 : 5,98 % · ≥ 72 : 0,673 % · ≥ 88 : 2,1·10⁻⁴ · = 96 : 1·10⁻⁶).

**Le test d'équilibre.** 50 challengers par tier × 150 adversaires × 2 sens sur le moteur réel :

| tier | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| taux moyen | 44,6 | 49,9 | 47,1 | 41,1 | 38,3 | 37,7 | 38,8 | 36,1 | 30,5 | 31,8 | 36,4 | **32,4** |
| σ entre challengers | 16,8 | 21,6 | 24,5 | 26,6 | 31,0 | 31,0 | 32,5 | 36,6 | 34,8 | 35,8 | 39,1 | **34,6** |
| r moyen entre profils | 0,473 | 0,368 | 0,298 | 0,320 | 0,276 | 0,295 | 0,304 | 0,309 | 0,319 | 0,310 | 0,321 | 0,339 |

**r(tier, taux de victoire) = −0,161**, sous la cible R2 de 0,30 et de signe négatif. La même mesure par bandes de E2 donne σ 8,86 (E2 ≤ 11) → 36,27 (E2 ≥ 78), soit **×4,1**, avec un taux moyen 54,5 % → 30,7 %. Le kiting ne change pas le verdict (r = −0,249, σ 8,50 → 25,22).
**La thèse tient donc littéralement** : la pointe n'achète pas la moyenne, elle achète la variance et la non-transitivité. Un T12 va de 3,0 % à 92,7 % ; un T1 ne sort jamais de 16,7–82,0.

**Les deux raretés sont-elles la même ? Non.** r(E2, proximité) = **−0,170** (Pearson), ρ = −0,168, r(E1, proximité) = −0,158. Deux lectures presque indépendantes : la forme dit *de quoi* l'objet est proche, l'extrémité dit *à quel point* il est pointu.

**La réserve, et elle est grosse.** Le taux moyen baisse de 44,6 à 32,4 avec le tier, et cette baisse n'est pas due au tier :

| pointe sur | T1 | T3 | T6 | T9 | T12 |
|---|---|---|---|---|---|
| lame ou ecu | 60,8 % | 66,2 % | 65,8 % | 63,6 % | **58,8 %** |
| eperon ou arc | 36,4 % | 25,5 % | 9,4 % | 5,2 % | **3,0 %** |

Rapport à T12 : **19,6×** — exactement le 19× que `ETUDE_EQUILIBRAGE_TACTIQUE.md` avait mesuré avant l'allonge. Sur le moteur réel, r(lame+ecu, taux) = **0,934** et le rapport quartile haut / quartile bas vaut **4,06×** (cibles R2 : 0,30 et 3×). **L'échelle de tiers amplifie ce défaut** : plus le tier est haut, plus l'objet se réduit à l'axe qu'il pointe.

## 5. Conception — l'échelle de tiers
**Douze tiers sur E3, loi 2^−t.** Bornes calées sur 2·10⁶ tirages ; noms dans un registre optique libre (aucune collision avec `REGIMES`, les métaux des `AGES`, `PALIERS_OBJET` ou les neuf muses du coffre).

| tier | nom | E3 | fréquence mesurée | cible 2^−t |
|---|---|---|---|---|
| T1 | diffus | 0–300 | 1 sur 2 (50,0 %) | 1/2 |
| T2 | épars | 301–522 | 1 sur 4 (25,0 %) | 1/4 |
| T3 | ramassé | 523–748 | 1 sur 8 (12,5 %) | 1/8 |
| T4 | tendu | 749–972 | 1 sur 16 (6,29 %) | 1/16 |
| T5 | effilé | 973–1202 | 1 sur 32 (3,11 %) | 1/32 |
| T6 | aigu | 1203–1434 | 1 sur 63 (1,58 %) | 1/64 |
| T7 | perçant | 1435–1654 | 1 sur 128 (0,780 %) | 1/128 |
| T8 | acéré | 1655–1854 | 1 sur 251 (0,398 %) | 1/256 |
| T9 | aiguille | 1855–2042 | 1 sur 528 (0,189 %) | 1/512 |
| T10 | épine | 2043–2244 | 1 sur 1 050 (0,095 %) | 1/1 024 |
| T11 | dard | 2245–2358 | 1 sur 1 921 (0,052 %) | 1/2 048 |
| T12 | **singulier** | 2359–3072 | **1 sur 2 006 (0,050 %)** | 1/4 096 |

Repères : (16,16,16,16) → E3 = 0, T1 ; 40/12/8/4 → 800, T4 ; 32/32/0/0 → 1024, T5 ; **55/3/3/3 → 2028, T9** ; 64/0/0/0 → 3072, T12.
**S'aligne-t-on sur les neuf tiers du coffre horaire ? Même loi, pas le même compte.** La loi 2^−t est reprise telle quelle — elle est déjà prouvée (K40) et se lit à l'œil. Le compte, non : neuf tiers placent le sommet à **1 sur 259**, c'est-à-dire **plus commun** que la queue actuelle anonyme (E2 ≥ 78 = 1 sur 397). Neuf tiers, ce serait moins de rareté, pas plus. Et le mécanisme diffère par nécessité : le tier d'un coffre se lit sur un octet de graine, le tier d'un objet **doit se lire sur le mot** — sinon deux lectures du même objet divergeraient et « un objet ne mute pas » tomberait. La table à neuf tiers reste disponible (T9 = E3 ≥ 1855) si l'auteur préfère les neuf muses.

## 6. Conception — le tirage
**Mesure d'abord : le tirage n'a pas besoin d'être corrigé pour que l'échelle tienne.** Avec les bornes ci-dessus et le tirage **actuel, inchangé**, sur 2·10⁶ objets : T1 −3,5 %, T2 +10,2 %, T3 −3,2 %, T4 −2,9 %, T5 −4,1 %, T6 −2,3 %, T7 −3,4 %, T8 −1,7 %, T9 −6,8 %, T10 −6,3 %, T11 +3,3 % par rapport à 2^−t. Tous les tiers sont atteignables et peuplés. **La correction qui manquait n'est pas dans le tirage, elle est dans la lecture** : le mot portait déjà une quantité géométrique, on lisait l'autre — celle qui sature.

Deux corrections restent souhaitables **pour elles-mêmes** (§2), et si elles passent, les bornes se recalent sur le tirage qui sort :

```
objetDepuisGraine(graine, âge) :                    # objets.ts, cette fonction seule
  pour k de 0 à 7 :                                  # (a) refus de l'équateur
      c0 = u16(graine,0) >> 6 ; c1 = u16(graine,2) >> 6 ; c2 = u16(graine,4) >> 6
      x = c0 − 512 ; y = c1 − 512 ; z = c2 − 512
      si Q_SCALE·Q_SCALE − x·x − y·y − z·z > 0 : sortir
      graine = sha256d(graine)                       # 3,48 % des graines, un tour de plus
  w = isqrt(Q_SCALE·Q_SCALE − x·x − y·y − z·z)       # entier, jamais Math.sqrt
  q = les quatre (x, y, z, w) rangés par l'indice omis
  omise = argmax |q_i|                               # (b) au lieu de graine[6] & 3
  mot = paqueter(q)                                  # canonisation inchangée
  archétype = SIGNATURES[graine[7] mod 9]            # inchangé
```

Tout est entier, tout vient de `sha256d`, aucun flottant, aucune table. Effet mesuré de (a) : la queue d'extrémité ne bouge pas (part de l'équateur dans E2 ≥ 40 : 0,6 % ; dans E2 ≥ 48 : 0,1 %), seul le corps se recentre (T2 passe de +10,2 % à −0,1 %). **Fichiers et fonctions qui changent :** `objets.ts::objetDepuisGraine` (rien d'autre : `graineTirage`, `tirerObjet`, `paqueter`, `depaqueter`, `canoniserMot` sont intacts) ; nouveau `tiers.ts` (`extremiteDe(Combat) → Σaxe² − 1024`, `SEUILS_TIER`, `tierDe`) ; `fiche.ts` (champ `tier`, `rareteDe`) ; `objets-lexique.ts` (`NOMS_TIER`, `RARETES`) ; `i18n.ts` ; `package.json` (le nouveau `.test.ts`, à la main).

## 7. Conception — l'échelle de rareté refondue
La rareté reste la proximité au catalogue — c'est la seule lecture qui dise *de quoi* un mot est proche, et elle est presque indépendante du tier (r = −0,170). Elle est recalibrée sur son domaine **réel**, [78, 100], et non sur un domaine imaginaire [0, 100]. Sept paliers, cinq noms conservés, deux ajoutés dans le même registre.

| palier | nom | proximité | fréquence mesurée (5·10⁵) |
|---|---|---|---|
| 1 | pur | 97–100 | 46,28 % |
| 2 | franc | 94–96 | 34,17 % |
| 3 | mêlé | 91–93 | 13,27 % |
| 4 | voilé | 88–90 | 4,58 % |
| 5 | trouble | 86–87 | 1,038 % (1 sur 96) |
| 6 | hybride | 84–85 | 0,410 % (1 sur 244) |
| 7 | errant | 78–83 | 0,257 % (1 sur 389) |

Tous atteignables, décroissance stricte, facteur 1,4 à 4,4 d'un palier au suivant. La borne basse est **77**, le rayon de couverture : le texte d'`errant` doit dire *« aussi loin de toute forme que la géométrie l'autorise »*, pas *« loin de tout archétype »* — la formule actuelle promet un vide qui n'existe pas.

## 8. Ce que ça casse
- **Si le tirage change** (§6) : `objets.test.ts`, deux vecteurs gelés — `GELE` (mot 4030905633, q [260, −337, −223, 541], feuille `2c7b6850…`) et le tirage `sig=7×64 ‖ bloc=1×32` (mot 2714434257) ; `voxels.test.ts`, un vecteur gelé (premier voxel {1,5,3}, empreinte `993e5a8b…`) que `components/canvas/texel.test.ts` rejoue. **Six constantes, trois fichiers.**
- **Ce qui ne casse pas :** `combat.test.ts`, `fiche.test.ts`, `titres.test.ts`, `bestiaire.test.ts`, `resonance.test.ts`, `integrite.test.ts` et les trois `tactique/*.test.ts` n'ont **aucune** constante dépendant du mot tiré (zéro littéral de 8 hex ; `traceBataille` n'est comparée qu'à elle-même). Ils sont tous propriété-based.
- **`vecteurs.json` : intact.** La famille `coffre` s'arrête à la graine et à l'âge de chaque objet — `labo/coffre_horaire.py` n'a pas de mots (`SPEC_COFFRE_HORAIRE.md` §4). La parité Python ↔ TS n'est pas touchée, `vecteurs.py` ne se régénère pas.
- **Si seule la lecture change** (§5 et §7, tirage inchangé) : rien ne casse côté mot. Tombent uniquement les contrôles de `fiche.test.ts` sur les indices de `RARETES` et les phrases, et `i18n.test.ts` (FR et EN doivent garder les mêmes clés, sans « époque »/« epoch »/« aeon »).
- **Hors de portée, et ça ne bouge pas :** `chaine-eidos.dat`, `etat.json`, `eonis.py`, `genesis.json`, le carnet, `FORMAT 3`, le nœud. Aucune réinitialisation de testnet.
- **Coût du regel :** une PR, six constantes, une table de douze seuils, un `tiers.test.ts` (bornes exactes sur les 3 073 valeurs de E3, monotonie, déterminisme, et un `doit_echouer` par refus).

## 9. Décisions à trancher
1. **Douze tiers ou neuf ?** Retenu : douze, sommet à 1 sur 2 006. Neuf alignerait sur le coffre et les muses mais mettrait le sommet à 1 sur 259 — moins rare que la queue actuelle.
2. **Corrige-t-on le tirage ?** L'échelle tient sans. Corriger règle deux défauts réels (3,48 % de mots hors sphère, 32,0 % hors de l'image de `paqueter`) au prix de six vecteurs gelés. Recommandation : oui, mais dans une PR séparée de l'échelle, pour que le regel soit lisible.
3. **Le prix de `eperon` et `arc` — bloquant.** Tant que la pointe sur eperon/arc gagne 3,0 % contre 58,8 % pour lame/ecu à T12, un T12 sur deux est un objet mort. **Ne pas publier l'échelle avant que R2 soit tenu** (|r| par axe < 0,30, quartile lame+ecu < 3× ; aujourd'hui 0,934 et 4,06×).
4. **La rareté reste-t-elle sur la proximité ?** Oui ici, parce qu'elle est presque orthogonale au tier (r = −0,170). Si elle devait fusionner avec le tier, elle deviendrait redondante et le marché n'aurait plus qu'une dimension à tarifer.
5. **La classe `ancre`** reste interdite aux unités (R5 de l'étude : score +19 contre −12 au mieux).

## LIMITE
- **Un duel 1v1 n'est pas une bataille.** Une seule dalle (étage 38), deux unités, deux politiques, pas de formation, pas de télégraphie exploitée, pas de budget de feuilles contraignant (10 000). Les taux par tier sont des **ordres de grandeur** ; le signe de r(tier, taux) et le rapport des σ sont robustes aux deux politiques, la valeur absolue des taux ne l'est pas.
- **Le rayon de couverture est mesuré, pas prouvé.** 4·10⁵ points uniformes puis descente locale à pas décroissant : 77,06 est une borne **supérieure** du minimum atteignable. Un point plus creux existe peut-être ; il ne descendra pas sous 60, l'ordre de grandeur d'un code de 100 points dans RP³.
- **E3 est une lecture, pas une preuve.** Le tier, la rareté, la proximité, l'extrémité sont des figures : rien n'entre dans une feuille, un carnet, une signature. Seuls le mot canon, l'archétype et l'âge engagent (`feuilleObjet`).
- **Aucune de ces mesures n'est rejouable par la CI.** Les scripts vivent dans le scratchpad. Ce qui doit engager devient un `.test.ts` à vecteurs gelés, ajouté à la main dans `package.json` et dans `CLAUDE.md` §2.
- **Le tirage réel passe par `graineTirage(sig, hashBloc)`**, pas par `sha256d("loot-" + i)`. La distribution devrait être la même ; ce n'est pas prouvé ici.
