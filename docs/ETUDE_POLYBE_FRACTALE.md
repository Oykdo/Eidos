# Polybe et fractale — un terrain qui se lit, une substitution qui ne sert à rien

**Dépôt :** Oykdo/Eidos · **Statut :** prototype et mesure, **aucune ligne écrite dans `atelier/`** · **Branche :** `tactique-moteur`
**Question posée :** l'auteur propose un **carré de Polybe** (encodage ligne/colonne) et une **modulation fractale de la puissance de frappe**. Deux candidats : Sierpiński base 2 sur 8×8 (27 cases sur 64), Cantor base 3 sur la dalle 9×9. Éprouver, pas plaire.
**Périmètre :** `tactique/{types,grille,unite,bataille}.ts` **recopiés dans le scratchpad** et modifiés là. Rien de la chaîne, rien du carnet. Rien de la **mobilité** non plus (`pas`, `accessibles`, `chemin` : chantier voisin, `docs/ETUDE_MOBILITE.md`) — la mesure la croise une fois, c'est signalé en LIMITE.
**Base :** `SPEC_TACTIQUE.md` §3, `ETUDE_EQUILIBRAGE_TACTIQUE.md`, `SPEC_LOOT_TIERS.md`, `chymie.ts` (64 signes gelés), `glyphs.ts` (6 bits par glyphe).
**Deux interdits tenus :** aucun flottant — tout est `&`, `%3`, comparaison de chiffres, division entière ; aucun hasard caché — chaque bonus proposé se lit **sur la dalle, avant** de dépenser la feuille.
**Règle de lecture :** aucune phrase sans chiffre.

## 0. En cinq lignes
**Un candidat sur deux passe, et pas celui qu'on croit.** Le Sierpiński base 2 est chez lui dans le carré de Polybe des **64 signes** — pas sur une dalle de 81 cases : posé sur 9×9 il perd son auto-similarité (blocs 3×3 `766|623|634`), colle à un coin, et **aggrave** tout ce qu'on mesure (bande de tier 24,4 → 35,3 pt).
Le Cantor base 3 s'inscrit sans reste : **9 = 3²**. La forme qui tient est la **poussière** — 16 cases sur 81, les coins des blocs de coin — et l'usage qui tient est la **portée**, pas le dégât : `portée = 1 + arc/16 + rang(case)`.
Mesuré sur 330 144 duels du vrai moteur : |r| par axe **0,129 → 0,095**, quartile `lame+ecu` 0,99 → 0,98×, coups médiane 2 / p95 4 inchangés — et la **bande de tier 24,4 → 22,3 pt**, l'écart entre les quatre pointes à T12 **28,7 → 17,0 pt**, la bande de niche **41,5 → 21,0 pt**. Le malus d'extrémité recule pour la première fois.
Le **carré de Gahn** (substitution par les mots) ne change **rien** : bande 29,9 → 28,0 pt, décision +0,3 pt, et sa forme Sierpiński est un **classement** déguisé (lignes de 1 à 64 entrées actives, rapport **64×**). À jeter.
**Ce qui décide n'est ni la densité ni la beauté du motif : c'est le grain.** Cinq dispositions de 16 cases, même bonus : la poussière tient (|r| 0,095), le réseau régulier explose (**0,389**), le damier aussi (**0,492**).

## 1. Le banc, et pourquoi on peut le croire
Le banc de `ETUDE_EQUILIBRAGE_TACTIQUE.md` est **réutilisé tel quel** (330 144 duels, 2 000 mots, 8 distances × 3 politiques, étage 149, 47 cases jouables). Le moteur est **recopié** dans le scratchpad et modifié là ; `atelier/` n'est pas touché.

**Contrôle de fidélité.** Motif absent, la copie rend le fichier de référence **au chiffre près** : `lame −0,041 · ecu +0,040 · eperon +0,126 · arc −0,129`, |r|max 0,129, Q4/Q1 0,99×, médiane 2 / p95 4 / max 11, coup le plus faible 12, bande de tier 24,39 pt, niche T1 95,80 % → T12 54,34 %. Tout écart mesuré plus bas vient donc du motif, pas de la copie.

**Deux ajouts** : la **fréquence d'activation** (part des coups tirés d'une case du motif) et le **gain de décision** (§8). La politique de l'IA a reçu le motif dans son score de case — un terrain que personne ne cherche ne se mesure pas ; à motif absent le terme vaut 0, d'où l'identité ci-dessus.

## 2. D'où viennent (ligne, colonne) — la question qui tranche tout
Trois sources possibles, et elles ne se valent pas.

| source | ce que ça donne | lisible avant la feuille ? | ajoute une décision ? |
|---|---|---|---|
| la **case** de l'attaquant | un terrain dessiné sur la dalle | oui, il est peint | oui : on choisit où l'on se tient |
| le **couple** (case, case) | une table 81×81 = 6 561 entrées | non : illisible à l'œil | oui, mais impraticable |
| les **mots** des deux unités | une affinité statique par paire | oui, si la table est gelée | **non** : rien à choisir en bataille |

La forme forte est donc le **terrain**. Les mots sont traités à part (§7).

**A1 — Sierpiński base 2.** `(l & c) === 0` sélectionne exactement **27 cases sur 64** en 8×8, auto-similaire en 3^k (Lucas/Kummer mod 2). C'est vrai, et c'est **la structure du carré de Polybe des 64 signes chymiques** : 6 bits = 3 bits de ligne + 3 bits de colonne. Sur la **dalle**, 8 ne rentre pas dans 9, et les deux sorties honnêtes échouent, mesurées :

| forme | cases | blocs 3×3 | symétries | \|r\|max | bande de tier |
|---|---|---|---|---|---|
| triangle infini tronqué à 9×9, `(x & y) === 0` | 43/81 (53,1 %) | `766\|623\|634` | diagonale seule | **0,236** | 35,30 pt |
| borné au sous-carré 8×8 (27 cases, le compte juste) | 27/81 (33,3 %) | `763\|620\|300` | diagonale seule | **0,363** | 36,31 pt |

Les deux sont **collés à un coin** : le camp qui se déploie en bas à droite n'a pas le même terrain que l'autre. Contrôle 24,39 pt — les deux **empirent** la bande. A1 n'est pas un terrain de 9×9 ; c'est un carré de Polybe.

**A2 — Cantor base 3.** `x = 3·x₁ + x₀`, idem pour `y` : les chiffres s'inscrivent sans reste. Six formes exactes, aucune table, aucun modulo qui triche :

| motif | règle entière | cases | comp. | blocs 3×3 | sym. | grain moy / max |
|---|---|---|---|---|---|---|
| **poussière** `c3d` | `x₁≠1 ∧ y₁≠1 ∧ x₀≠1 ∧ y₀≠1` | 16/81 (19,8 %) | 16 | `404\|000\|404` | **HVD** | 1,33 / 4 |
| emboîtée `c3n` | 1 si `x₁≠1∧y₁≠1`, +1 si aussi `x₀≠1∧y₀≠1` | 36/81 (44,4 %) | 4 | `909\|000\|909` | **HVD** | 0,89 / 4 |
| Vicsek `v3` | `(x₁=1∨y₁=1) ∧ (x₀=1∨y₀=1)` | 25/81 (30,9 %) | 1 | `050\|555\|050` | **HVD** | 1,23 / 4 |
| somme des chiffres `d3` | `(x₁+x₀+y₁+y₀) ≡ 0 (3)` | 27/81 (33,3 %) | 27 | `333\|333\|333` | diag. | 0,74 / 2 |
| Pascal mod 3 `p3` | `x₁≤y₁ ∧ x₀≤y₀` (Lucas) | 36/81 (44,4 %) | 1 | `600\|660\|666` | diag. | — |
| tapis `t3` | `¬∃i (xᵢ=1 ∧ yᵢ=1)` | 64/81 (79,0 %) | 1 | `888\|808\|888` | HVD | 0,22 / 2 |

`d3` est **périodique, pas fractal** (3 cases par bloc, partout) ; `p3` vide le quart supérieur droit — même défaut d'équité que A1 ; `t3` couvre 79 %, ce n'est plus un motif. *Note* : le **trifide de Delastelle** (1902) code l'alphabet sur **27 = 3³** trigrammes de chiffres base 3 — si les 27 glyphes de charge ont un ancêtre cryptographique, c'est lui.

## 3. Les cinq usages mis à l'épreuve
Tous entiers, tous lisibles avant de signer. `rang` = rang du motif sur la case, 0, 1 ou 2.

**veine** `coup += 4 × rang` (additif, comme la charge) · **guet** `portée = 1 + arc/16 + rang(case)`, qui touche l'**allonge** (`+base/2`) et l'immunité à la riposte · **foyer**, la modulation fractale au sens littéral, `coup += rang × ⌊pointe/8⌋` : la case amplifie l'axe que le mot pointe · **appui** : sur une case du motif, la frappée riposte **sans** la condition `eperon` stricte · **gahn** : substitution par les mots, §7.

## 4. Le balayage — 27 variantes, 91 872 duels chacune
Contrôle : |r|max 0,119 · bande 29,89 pt · T12 26,01 % · décision-abattage 8,51 % · écart du coup 7,40.

| variante | \|r\|max | Q4/Q1 | bande | T12 | écart des 4 pointes T12 | activation | décision-abattage |
|---|---|---|---|---|---|---|---|
| `c3d`/veine ×4 | 0,125 | 0,94 | 27,08 | 26,42 | 31,2 | 25,4 % | 8,16 % |
| `c3n`/veine ×4 | 0,177 | 0,95 | 26,94 | 27,69 | 29,2 | 43,9 % | 8,71 % |
| `d3`/veine ×4 | **0,215** | 0,86 | 28,73 | 24,45 | 27,0 | 48,4 % | 8,35 % |
| `c3d`/foyer | 0,116 | 0,95 | 25,72 | 27,69 | 30,5 | 25,1 % | 7,93 % |
| `c3n`/foyer | **0,182** | 0,95 | 21,38 | 32,12 | 30,4 | 44,3 % | 8,43 % |
| `c3d`/appui | 0,100 | 1,01 | 26,16 | 28,59 | 29,4 | 16,9 % | 8,56 % |
| `c3n`/appui | **0,416** | 1,25 | 22,34 | 31,83 | 30,5 | 38,7 % | 8,51 % |
| `v3`/guet | **0,170** | 0,85 | 33,80 | 21,50 | 7,4 | 65,1 % | 11,10 % |
| `c3d`/guet (+1) | 0,098 | 0,99 | 23,47 | 28,30 | 28,3 | 30,6 % | 10,23 % |
| **`c3d2`/guet (+2)** | **0,134** | 0,94 | **23,44** | 28,44 | **13,3** | **32,0 %** | **16,25 %** |
| **`c3n`/guet** | **0,125** | 1,02 | **20,34** | 30,64 | **12,9** | 55,2 % | **16,53 %** |

Quatre constats, chiffrés :
1. **La veine ne fait rien.** Un bonus de coup additif déplace la bande de 2 à 3 points et la décision de ±0,4 pt. Le coup ne manquait pas de termes : il en a déjà cinq.
2. **Le foyer marche à moitié, et au mauvais prix.** `c3n`/foyer ramène T12 à 32,12 % — le meilleur du balayage — mais sort de la cible (|r| 0,182, `lame −0,182`) et **n'ajoute aucune décision** (8,43 % contre 8,51 %) : le bonus suit l'unité, pas la case, donc il n'y a rien à choisir. C'est une remise sur les hauts tiers, pas une règle de jeu.
3. **L'appui casse `eperon`** : `r(eperon) = −0,416`. Rendre la riposte gratuite sur un terrain annule le seul axe qui l'achetait.
4. **Seul le guet ajoute de la décision** : 8,51 % → 16,3 %. La portée est le seul terme qui change *quelles cases peuvent tirer* ; tous les autres ne changent que *combien* on frappe.

## 5. Le témoin qui tranche : ce n'est pas la densité, c'est le grain
Cinq dispositions de **16 cases**, **même bonus (+2 de portée)**, même banc :

| disposition | grain max | \|r\|max | r(eperon) | r(arc) | bande | décision |
|---|---|---|---|---|---|---|
| **poussière de Cantor** {0,2,6,8}² | 4 | **0,134** | +0,084 | −0,032 | **23,44** | 16,25 % |
| réseau régulier {1,3,5,7}² | 2 | **0,389** | +0,389 | −0,251 | 32,90 | 16,27 % |
| quatre coins (2×2 par coin) | 6 | **0,264** | +0,264 | −0,132 | 28,96 | 8,55 % |
| bloc central 4×4 | 6 | **0,420** | +0,132 | −0,420 | 30,73 | 9,73 % |
| *témoins de densité* : damier 41 cases | 1 | **0,492** | +0,492 | −0,343 | 28,27 | 10,69 % |
| *témoin* : +1 partout (81 cases) | 0 | 0,153 | +0,011 | +0,153 | 34,78 | 13,01 % |
| *témoin* : +2 partout | 0 | **0,458** | +0,458 | −0,363 | 38,80 | 15,95 % |

**La loi observée.** Un bonus **partout** n'est pas un terrain mais une stat, et il annule le prix de `arc` (`+2 partout` : `r(eperon) = +0,458`, bande 38,80). Un bonus **trop loin** n'est atteint que par les rapides (quatre coins : `r(eperon) = +0,264`). Ce qui tient est un motif dont la **distance à la veine la plus proche prend plusieurs valeurs** :

```
distance à la veine la plus proche, sur les 81 cases
poussière   d=0:16  d=1:32  d=2:24  d=3:8  d=4:1     ← cinq échelles
réseau      d=0:16  d=1:40  d=2:25                   ← une seule
damier      d=0:41  d=1:40                           ← aucune
+2 partout  d=0:81                                   ← aucune
```

C'est exactement ce qu'une construction auto-similaire produit et qu'un réseau ne produit pas : un espacement de 2 **dans** un bloc, de 4 **entre** les blocs. **La fractale n'est pas un ornement : elle est la seule façon simple d'obtenir un terrain à deux échelles qui reste symétrique par les huit isométries du carré.**

## 6. La meilleure variante, plein format — la Poussière et le Guet
Règle complète, trois lignes, tout entier, rien d'autre à geler :

```
rang(x, y) = (x div 3 ≠ 1 et y div 3 ≠ 1 et x mod 3 ≠ 1 et y mod 3 ≠ 1) ? 2 : 0
portee(u)  = 1 + u.axes.arc / 16 + rang(u.pos)            // au lieu de 1 + arc/16
```

Seize cases : les quatre coins de chacun des quatre blocs de coin — *« les coins des coins »*. Le joueur l'apprend en une bataille ; elle est la même à tous les étages.

| mesure | cible | contrôle | **Poussière `c3d2`** | emboîtée `c3n` |
|---|---|---|---|---|
| r(lame) | | −0,041 | −0,071 | +0,009 |
| r(ecu) | | +0,040 | +0,051 | +0,100 |
| r(eperon) | | +0,126 | +0,095 | +0,038 |
| r(arc) | | −0,129 | −0,078 | −0,149 |
| **\|r\| max** | **< 0,15** | 0,129 | **0,095** | 0,149 |
| quartile haut/bas `lame+ecu` | < 1,5× | 0,99× | **0,98×** | 1,06× |
| coups médiane / p95 / max | 2–4 / ≤8 | 2 / 4 / 11 | **2 / 4 / 11** | 2 / 4 / 11 |
| coup le plus faible | > 0 | 12 | **12** | 12 |
| taux de victoire T1 → T12 | | 51,7 → 27,7 | **51,8 → 29,5** | 51,4 → 31,1 |
| **bande de tier** | | 24,39 pt | **22,31 pt** | **20,25 pt** |
| écart des 4 pointes à T12 | | 28,7 pt | **17,0 pt** | 20,7 pt |
| pointe `eperon` à T12 | | 12,3 % | **19,0 %** | 19,6 % |
| **niche T1 → T12** | | 95,8 → 54,3 | **83,3 → 62,3** | 80,6 → 61,9 |
| **bande de niche** | | 41,5 pt | **21,0 pt** | 18,7 pt |
| fréquence d'activation | 10–60 % | — | **31,8 %** | 55,0 % |
| décision — l'abattage | | 9,30 % | **15,94 %** | 15,70 % |
| décision — la riposte subie | | 14,29 % | **23,07 %** | 21,74 % |
| écart max−min du coup selon la case | | 7,20 | **12,21** | 12,20 |
| bande de rareté | ≤ 10 pt | 4,08 | 3,97 | 6,11 |
| pire lot (24 lots) | — | 0,671 | 0,727 | 0,730 |

**Le point décisif, et il faut le dire fort : la bande de niche est divisée par deux.** `SPEC_TACTIQUE.md` §3 constatait qu'un mot extrême perd même *dans sa niche* — 95,8 % à T1 contre 54,3 % à T12, ce qui interdisait de lire l'extrémité comme un sidegrade. Avec la Poussière : **83,3 % → 62,3 %**, 21,0 pt au lieu de 41,5. Le T12 gagne 8 points dans sa niche et 6 dans sa contre-niche (0,90 % → 7,12 %) sans qu'aucun axe ne sorte de |r| = 0,095. La cause est lisible : la portée est le seul terme qui **ne se paie pas en budget d'axes** — un mot qui a tout mis ailleurs peut aller la chercher sur le sol. `c3n` fait mieux sur la bande (20,25) mais s'active sur 55,0 % des coups et pousse `arc` à −0,149, à la limite exacte ; la Poussière est plus sobre, et meilleure en |r| que le contrôle lui-même.

## 7. Le carré de Gahn — la substitution par les mots
*« Carré de Gahn » est un terme de l'auteur : il désigne une matrice de substitution posée sur un carré de Polybe.* (Pour mémoire : aucun objet de ce nom n'existe dans la littérature — 0 occurrence dans HathiTrust, OpenAlex, GitHub, Wikipédia FR/EN/SV ; les moteurs corrigent silencieusement en « carré de Gann », le *Square of Nine* boursier, qui est bien un 9×9 mais n'est pas une mathématique.)

Mise en œuvre : le **signe** d'un mot est un glyphe de 6 bits (`sha256d(mot)[0] & 63`), donc une case du carré de Polybe des 64 signes de `chymie.ts`. La table 64×64 est **gelée et publiée**, jamais tirée d'une graine. Deux formes :

| forme | actives | ligne min | ligne max | σ | rapport | paires asymétriques |
|---|---|---|---|---|---|---|
| Sierpiński `(r & c) = 0` | 729/4096 (17,8 %) | **1** | **64** | 10,70 | **64×** | 0 |
| Zeckendorf `Z(r ⊕ c)`, aucun bit adjacent | 1344/4096 (32,8 %) | **21** | **21** | **0,00** | **1,0×** | 0 |

**La forme Sierpiński est un classement, pas une affinité** : le signe 0 reçoit le bonus contre **100 %** des adversaires, le signe 63 contre **0,7 %** — exactement le défaut que `ETUDE_EQUILIBRAGE_TACTIQUE.md` avait prouvé absent de `polariteDe` (étendue 15 points sur 99). À interdire. La forme **Zeckendorf** est équilibrée par construction — `T[r][c] = f(r ⊕ c)` fait de chaque ligne une permutation de la même suite, donc **21 partenaires sur 64 pour tout signe, σ = 0** — et la table entière tient dans **64 bits publiables**, une ligne à côté des 64 signes. Elle ne double pas `resonance.ts` : φ(actif, constructif) = **+0,0006** (Sierpiński : −0,0025), 15,03 % de constructifs contre 15,07 %. **Mais elle ne sert à rien** (gain +6 puis +12) :

| | \|r\|max | bande | T12 | activation | décision-abattage |
|---|---|---|---|---|---|
| contrôle | 0,119 | 29,89 | 26,01 | — | 8,51 % |
| Gahn Zeckendorf +6 | 0,139 | 28,04 | 26,07 | 28,8 % | 8,81 % |
| Gahn Zeckendorf +12 | 0,165 | 27,84 | 25,98 | 25,6 % | 9,05 % |

Une table gelée de plus, une lecture de plus dans la fiche, |r| qui monte, **0,3 point de décision**. Et c'est structurel : le bonus est le même sur les 81 cases, donc il n'y a **rien à choisir**. Une seconde couche d'affinité par paire fait le travail de la première, sans sa justification géométrique.

## 8. Le gain de décision — le proxy, et ce qu'il ne dit pas
On ne sait pas mesurer « le joueur a eu un vrai choix ». On mesure plus étroit : à chaque tour d'une unité du coffre, on énumère **toutes** les cases atteignables d'où elle atteint sa cible, on calcule le coup qui partirait de chacune, et on regarde si le choix change l'**issue** (abattre ou non, subir une riposte ou non). Le socle n'est pas zéro — charge, dos et allonge font déjà varier le coup selon la case : contrôle 9,30 %.

**Le proxy est contaminé, et il faut le dire :** *n'importe quelle* extension de portée augmente le nombre de cases de tir, donc le compte. `+2 partout` monte à 12,63 % sans qu'aucun terrain n'existe. D'où une seconde mesure, non contaminée — la seule condition pour que le terrain soit un choix :

| | cases atteignables de rangs mêlés | meilleure case de tir veinée, une case nue tirant aussi |
|---|---|---|
| contrôle / `+2 partout` | **0,00 %** | **0,00 %** |
| Poussière `c3d2` | 89,79 % | **39,35 %** |
| emboîtée `c3n` | 93,90 % | 38,87 % |
| réseau régulier (témoin) | 92,28 % | 32,86 % |

Deux tours sur cinq, la meilleure case de tir est une case veinée alors qu'une case nue tirait aussi : le terrain **dicte la position**, il ne se contente pas de l'autoriser. Un bonus uniforme, lui, ne dicte jamais rien : 0,00 %, par construction.

## 9. Verdict
1. **Garder : la Poussière de Cantor (16 cases) + le Guet (`portée += rang`).** Deux lignes de code, aucun flottant, aucune table, un dessin que le joueur lit à l'œil. Toutes les cibles tenues, |r| **meilleur** que sans motif (0,095 contre 0,129), et le premier recul mesuré du malus d'extrémité — bande de tier 24,4 → 22,3 pt, bande de niche **41,5 → 21,0 pt**, écart des quatre pointes à T12 28,7 → 17,0 pt.
2. **Jeter A1 comme terrain.** Sierpiński base 2 sur une dalle 9×9 est un modulo qui triche : 43/81 sans auto-similarité, ou 27/81 collé à un coin ; les deux sortent de la cible (|r| 0,236 et 0,363) et **aggravent** la bande. Sa place est ailleurs — le carré de Polybe des 64 signes est déjà, littéralement, un Sierpiński en puissance ; c'est une lecture, pas une mécanique.
3. **Jeter la veine, le foyer et l'appui.** La veine ne bouge rien (±0,4 pt de décision) ; le foyer achète 6 points de T12 contre |r| 0,182 et zéro décision ; l'appui détruit `eperon` (−0,416).
4. **Jeter le carré de Gahn comme règle.** Équilibré en Zeckendorf, indépendant de `resonance.ts` (φ = +0,0006), et **sans effet** : 0,3 point de décision pour une table gelée de plus. Sa forme Sierpiński est pire qu'inutile : un classement à 64× d'écart.
5. **Ce que ça ne referme pas.** À T12, la pointe `eperon` passe de 12,3 % à 19,0 % de victoires quand la pointe `arc` en fait 36,0 % : la réserve bloquante de `SPEC_LOOT_TIERS.md` §9-3 est réduite de moitié, pas levée.

## 10. Décisions à trancher
1. **Poussière (16 cases, +2) ou emboîtée (36 cases, rangs 1 et 2) ?** Recommandation : la Poussière — |r| 0,095 contre 0,149, activation 31,8 % contre 55,0 %. L'emboîtée gagne 2 points de bande et se dessine plus richement (deux échelles visibles) ; elle demande de vérifier que `arc` ne descend pas sous −0,15 après tout changement du moteur.
2. **Le motif est-il le même à tous les étages, ou tourne-t-il ?** Il est ici fixe, donc apprenable une fois pour toutes. Une rotation tirée de l'en-tête signé resterait lisible (elle est peinte avant le premier acte) et les 16 cases sont invariantes par les huit isométries du carré — donc la rotation ne changerait rien. Recommandation : fixe.
3. **Plafonner la portée ?** `arc = 64` sur une case veinée donne portée 7 sur une dalle de 9. Mesuré sans plafond, `r(arc) = −0,078` : rien ne casse. À trancher si la dalle change.
4. **Le nom.** « Poussière », « Veine », « le Guet ». Aucun n'entre en collision avec `REGIMES`, `PALIERS_OBJET`, les âges, les neuf muses ni les douze tiers de `SPEC_LOOT_TIERS.md`.
5. **Le carré de Polybe des 64 signes reste-t-il, comme lecture ?** Il est déjà vrai : 6 bits = ligne + colonne, et `chymie.ts` est gelé. Le publier comme grille 8×8 dans le Guide ne coûte rien et n'engage rien. C'est une figure.

## LIMITE
- **Un duel 1v1 n'est pas une bataille.** Deux unités, une dalle (étage 149, 47 cases), pas de formation, pas de télégraphie exploitée, budget de feuilles non contraignant. Les signes et les rapports sont robustes aux 24 lots ; les valeurs absolues ne le sont pas.
- **Le pire lot empire.** Le maximum de |r| sur les 24 lots passe de 0,671 (`d1/naïf`, `arc`) à 0,727 (`d8/posté`, `eperon`) : à distance d'engagement 8, un mot lent et épais profite plus du guet qu'un rapide. Le global reste à 0,095 parce que les lots se compensent — c'est une compensation, pas une absence de défaut.
- **Le proxy de décision est contaminé** par tout gain de portée (§8) ; c'est la seconde mesure — « rangs mêlés », « la meilleure case est veinée » — qui sépare un terrain d'un bonus, et elle vaut 0,00 % pour tout bonus uniforme.
- **La mesure croise la mobilité une fois** : `pas` décide quelles veines sont atteignables ce tour. Une démarche par unité (`docs/ETUDE_MOBILITE.md`) changerait la fréquence d'activation mesurée à 31,8 %. Rien n'a été touché de `pas`, `accessibles` ni `chemin`.
- **La politique de l'IA cherche le motif.** Sans cela le terrain ne se mesure pas ; avec, l'activation mesurée est celle d'un joueur qui l'exploite systématiquement — une borne haute pour un débutant, une borne basse pour un joueur qui planifie deux tours.
- **Rien n'est rejouable par la CI.** Les scripts vivent dans le scratchpad. Si la règle entre dans le moteur, elle exige son `.test.ts` à vecteurs gelés (les 81 rangs, la portée sur les 81 cases, un `doit_echouer` par refus), ajouté à la main dans `package.json` et dans `CLAUDE.md` §2.
- **Ces chiffres sont des figures, pas des preuves.** Aucun n'entre dans une feuille, un carnet ou une signature.
