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

---

## PS.0. Post-scriptum du 2026-09-10 — la règle ne passe plus, et ce n'est pas la faute des deux PA
**Ce qui a été refait :** les quatre mesures demandées, même banc, politique portée aux deux points d'action (PS.8), **330 144 duels par variante** (plus 165 888 duels de niche et 3 600 batailles de décision). Le moteur est **recopié** dans le scratchpad ; le diff de la copie contre `tactique/bataille.ts` ne contient que les crochets du motif, et à `usage = aucun` ils sont tous inertes — la copie **est** le moteur.
**Le verdict du §9 tombe.** Sur le moteur de septembre, le Guet ne fait plus reculer le malus d'extrémité — **bande de niche 46,07 pt sans motif, 46,33 pt avec** (l'étude mesurait 41,5 → 21,0) —, il **ouvre** la bande de tier de 37,75 à 42,35 pt, et son activation tombe de 31,80 % à **16,06 %**, sous la densité même du motif sur la région jouable (21,92 %).
**Trois changements sous l'étude, pas deux**, et le troisième explique presque tout : les dalles se sont dégagées (`e9acf52`). L'ablation le dit — à **un pas et un coup par tour**, le régime d'avant `14fe665`, sur la dalle et les constantes d'aujourd'hui, la bande de tier vaut déjà **37,53 pt** et |r| **0,226**. Les deux PA n'ajoutent que 0,22 pt de bande et 0,092 de |r|.
**Le contrôle lui-même est hors cible :** |r| max **0,318** (`arc +0,318`, `eperon −0,310`) contre 0,129 dans l'étude, bande de tier 37,75 pt contre 24,39. Le Guet n'a plus de contrôle sain contre lequel se mesurer. Une session parallèle lit le même moteur avec une autre politique et trouve les signes **inversés** (`eperon +0,622`, `arc −0,377`) : les deux ne s'accordent que sur le fait que la cible est rompue — voir **PS.8**, et ce que ce désaccord n'atteint pas. **`docs/SPEC_POUSSIERE.md` n'est pas écrit** : les mesures infirment la règle.

## PS.1. Ce qui a bougé sous l'étude — trois commits, pas deux
| commit | ce qu'il change | effet mesuré sur le banc |
|---|---|---|
| `e9acf52` | `dalleDe` à **deux bits par case** (un quart de murs au lieu de la moitié) | l'étage retenu passe de **149 à 198**, la région jouable de **47 à 73 cases**, la Poussière libre dans la région de **8/47 (17,0 %) à 16/73 (21,9 %)** |
| `c3703a2` | `DIV_PAS` 12 → 32, `DIV_PORTEE` 16 → 10 | pas **2–7 → 2–4**, portée **1–5 → 1–7** |
| `14fe665` | `PA_PAR_TOUR = 2` | double pas et double frappe ouverts |

Contrôle du terrain, refait à un bit et à deux : **1 bit** → étage 149, 52 cases libres, plus grande salle **47**, Poussière libre 12/16 ; **2 bits** → étage 198, 73 libres, salle **73**, Poussière **16/16**. L'étude a donc mesuré sur une salle de 47 cases où la moitié de la Poussière était sous les murs ; elle est aujourd'hui entière et découverte. **Le motif est devenu gratuit** : sur la région, 90,4 % des cases ont une veine à **deux pas de chemin** — le pas le plus court — et 100 % à quatre — le plus long. Le double pas n'ouvre donc rien qu'un seul geste ne mette déjà à portée dans neuf cas sur dix.

## PS.2. M0 — le Guet reste jouable, mais pas pour la raison qu'on redoutait
`PORTEE_BASE = 1`, `DIV_PORTEE = 10` : portée **1 à 7**, et **9** sur une case de rang 2. La crainte était qu'elle couvre la dalle. Elle ne la couvre pas :

| portée | cases de la dalle sous la portée | part |
|---|---|---|
| 2 (médiane du pool) | 9,8 / 80 | 12,3 % |
| 4 (p95 du pool) | 27,4 / 80 | 34,3 % |
| 7 (maximum arithmétique) | 56,0 / 80 | 70,0 % |
| **9 (maximum + Guet rang 2)** | **69,6 / 80** | **87,0 %** |

**Zéro case sur 81** met la dalle entière sous la portée, et **zéro sur 73** met la région entière : la distance maximale entre deux cases de la région vaut **16**, et la plus longue portée imaginable en franchit **9**. Et surtout le palier redouté est **vide** : sur 2 000 objets tirés, l'`arc` le plus fort vaut **59**, donc portée **6** (8 objets, 0,4 %) — **personne n'atteint la portée 7**, la médiane est 2 et le p95 4. Sous le Guet, la portée réelle la plus longue est **8**, jamais 9.

**Décision 3 tranchée : pas de plafond.** Il ne servirait à rien — le budget de 64 en est déjà un, et il mord avant la dalle. Ce que le Guet change n'est pas le plafond mais la médiane : **portée 2 → 4**, soit 12,3 % → 34,3 % de la dalle, un facteur 2,8 sur la surface couverte. C'est là qu'il faut le juger, et c'est ce que fait PS.3.

## PS.3. M1 — l'activation s'effondre à 16 %, et 16 % est un plafond
| | l'étude : contrôle → `c3d2` | **aujourd'hui : contrôle → `c3d2`** |
|---|---|---|
| r(lame) | −0,041 → −0,071 | −0,073 → **−0,176** |
| r(ecu) | +0,040 → +0,051 | +0,067 → **−0,027** |
| r(eperon) | +0,126 → +0,095 | −0,310 → **−0,112** |
| r(arc) | −0,129 → −0,078 | +0,318 → **+0,315** |
| **\|r\| max** | 0,129 → **0,095** | 0,318 → **0,315** |
| quartile `lame+ecu` | 0,99 → 0,98× | 0,98 → 0,84× |
| coups médiane / p95 / max | 2 / 4 / 11 | **2 / 4 / 11** |
| coup le plus faible | 12 | **12** |
| **activation** | **31,80 %** | **16,06 %** |

Le Guet ne bouge plus |r| : **0,318 → 0,315**, trois millièmes. Il déplace le prix sans le réduire — `eperon` remonte de −0,310 à −0,112, `lame` descend de −0,073 à −0,176 — parce qu'une portée offerte à tout le monde dévalue la mêlée exactement autant qu'elle console le rapide.

**L'activation n'est pas un défaut de politique, c'est une borne du terrain.** L'IA reçoit le motif dans son score de case avec un poids ; on l'a fait varier, tout le reste égal :

| poids du motif dans le score de case | 0 | **3 (celui de l'étude)** | 200 |
|---|---|---|---|
| coups tirés d'une case du motif | 4,96 % | **16,06 %** | **16,06 %** |

Poids 3 et poids 200 rendent le **même compte au chiffre près** (166 612 / 1 037 141) : l'IA prend déjà toutes les cases veinées d'où elle peut tirer, il n'y en a pas d'autres. Et à poids 0 — le motif peint, jamais cherché — on tombe à 4,96 %, **très en dessous** de la densité de 21,92 % : les engagements ont lieu au milieu de la dalle, la Poussière est aux coins des coins. La salle a triplé, la Poussière est restée aux bords ; elle est devenue un motif de périphérie.

**La décision, elle, tient encore** — c'est la seule mesure du §8 qui survit :

| | contrôle | `c3d2`/guet | `c3n`/guet | `c3d`/guet (+1) | *témoin* `+2 partout` |
|---|---|---|---|---|---|
| décision — l'abattage | 11,08 % | **15,48 %** | 15,79 % | 12,09 % | 12,35 % |
| décision — la riposte subie | 20,14 % | **24,91 %** | 24,64 % | 20,39 % | 16,64 % |
| écart max−min du coup selon la case | 10,11 | **12,55** | 12,76 | 10,66 | 10,30 |
| cases atteignables de rangs mêlés | 0,00 % | 61,20 % | 67,93 % | 60,41 % | **0,00 %** |
| meilleure case de tir veinée, une nue tirant aussi | 0,00 % | **27,22 %** | 33,34 % | 11,06 % | **0,00 %** |

Deux tours sur sept (27,22 %, contre 39,35 % dans l'étude) le terrain dicte encore la position, et le bonus uniforme continue de ne rien dicter (0,00 %). Mais 4,4 points de décision ne paient pas ce que les autres colonnes coûtent.

## PS.4. M2 — Poussière contre emboîtée : le duel n'a plus d'objet
| mesure | contrôle | **Poussière `c3d2`** | emboîtée `c3n` | Poussière +1 `c3d` | *témoin* `+2 partout` |
|---|---|---|---|---|---|
| \|r\| max | 0,318 | 0,315 | **0,303** | 0,343 | **0,142** |
| quartile haut/bas `lame+ecu` | 0,98× | 0,84× | 0,83× | 0,94× | 0,99× |
| taux T1 → T12 | 55,65 → 17,90 | 56,52 → 14,17 | 56,73 → 13,81 | 56,00 → 15,98 | 56,97 → 13,86 |
| **bande de tier** | **37,75 pt** | 42,35 pt | 42,92 pt | 40,02 pt | 43,11 pt |
| écart des 4 pointes à T12 | 30,12 pt | **21,71 pt** | 21,63 pt | 27,44 pt | 20,74 pt |
| pointe `eperon` à T12 | 2,69 % | **2,69 %** | 2,69 % | 2,69 % | 4,84 % |
| **bande de niche** | **46,07 pt** | 46,33 pt | 47,75 pt | 47,37 pt | 40,77 pt |
| activation | — | 16,06 % | 21,38 % | 11,59 % | 100,00 % |
| bande de rareté | 9,85 | 9,52 | 9,64 | 9,22 | 5,88 |

**Aucune des deux ne gagne, parce que les deux perdent.** `c3n` fait 0,012 de mieux en |r| et 5,3 points de mieux en activation ; `c3d2` fait 0,6 point de mieux sur la bande de tier et 1,4 sur la bande de niche. Les deux **aggravent** la bande de tier de 4,6 et 5,2 points, les deux laissent la bande de niche où elle est. Le `+1` (`c3d`), qui aurait été la sortie prudente de la décision 3, est le pire des trois en |r| (0,343) et n'active que 11,59 %.

**Et le témoin est humiliant.** `+2 partout` — le bonus dont le §5 avait prouvé qu'il n'est pas un terrain (0,00 % de rangs mêlés, par construction) — rend le **meilleur |r| de tout le lot, 0,142, seul dans la cible**, et la meilleure bande de niche (40,77 pt). Ce que le Guet cherchait à faire pour `eperon`, une constante le fait mieux, sans dessin, sans table et sans seize cases à apprendre. Il le paie sur la bande de tier (43,11 pt, la pire) et sur la pointe `arc` à T12 (13,99 % → 2,83 %) : ce n'est pas une solution, c'est la preuve que **le prix des axes est aujourd'hui un problème de portée, pas de terrain.**

## PS.5. M3 — le recul du malus d'extrémité ne se reproduit pas
C'était le seul résultat qui justifiait la règle. Il ne tient pas.

| | T1 niche | T12 niche | **bande de niche** |
|---|---|---|---|
| étude — contrôle | 95,80 % | 54,34 % | 41,5 pt |
| étude — `c3d2`/guet | 83,28 % | 62,33 % | **21,0 pt** |
| **aujourd'hui — contrôle** | 92,42 % | 46,35 % | **46,07 pt** |
| **aujourd'hui — `c3d2`/guet** | 92,80 % | 46,47 % | **46,33 pt** |
| aujourd'hui — `c3n`/guet | 94,13 % | 46,38 % | 47,75 pt |
| aujourd'hui — `c3d`/guet (+1) | 92,36 % | 44,99 % | 47,37 pt |

**Zéro recul, et même 0,26 point de plus.** Le malus d'extrémité s'est aggravé tout seul — 41,5 → 46,1 pt entre l'étude et aujourd'hui, sans aucun motif — et le Guet ne l'entame plus d'un point. La contre-niche du T12, que l'étude voyait passer de 0,90 % à 7,12 %, passe aujourd'hui de 0,32 % à **0,23 %** : elle baisse.

Une seule pièce du §6 survit : **l'écart des quatre pointes à T12 se resserre encore**, 30,12 → 21,71 pt. Mais il se resserre **par le bas** — `lame` 32,81 → 24,40, `arc` 13,99 → 9,15 — et la pointe `eperon` reste clouée à **2,69 %, la même valeur dans les quatre variantes**, au centième. Le Guet ne relève pas le spécialiste d'initiative ; il abaisse les autres.

## PS.6. Pourquoi — l'ablation, et ce qu'elle innocente
Deux plafonds posés à la politique, tout le reste identique. `1 pas + 1 coup` par tour **est** le régime d'avant `14fe665`.

| régime du tour | \|r\| max | bande de tier | bande de niche |
|---|---|---|---|
| l'étude (dalle à un bit, pas 2–7, portée 1–5, un geste de chaque) | 0,129 | 24,39 pt | 41,5 pt |
| **1 pas + 1 coup** — contrôle | **0,226** *(cible tenue)* | 37,53 pt | 40,17 pt |
| **1 pas + 1 coup** — `c3d2`/guet | 0,229 | 42,35 pt | 47,19 pt |
| 1 coup + 2 pas — contrôle | 0,347 | 36,53 pt | — |
| 1 coup + 2 pas — `c3d2`/guet | **0,170** | 41,50 pt | — |
| **2 PA (le moteur)** — contrôle | 0,318 | 37,75 pt | 46,07 pt |
| **2 PA (le moteur)** — `c3d2`/guet | 0,315 | 42,35 pt | 46,33 pt |

Trois lectures, chiffrées :
1. **Les deux PA sont presque innocents de la bande.** À un geste de chaque sorte, la bande de tier vaut déjà 37,53 pt contre 24,39 dans l'étude : **13,1 des 13,4 points d'ouverture** viennent de la dalle et des constantes, pas des PA. Les PA ajoutent 0,22 pt de bande — mais 0,092 de |r| (0,226 → 0,318) et 5,9 pt de bande de niche.
2. **Le Guet était déjà mort avant les PA.** À un geste de chaque sorte, il porte la bande de tier de 37,53 à 42,35 pt et la bande de niche de 40,17 à 47,19 : il **aggrave** les deux, exactement comme sous les deux PA. Ce n'est donc pas la double frappe qui l'a tué, c'est la salle de 73 cases et la portée 1–7.
3. **La double frappe est ce qui casse le prix des axes.** Interdite (`1 coup + 2 pas`), le Guet ramène |r| de 0,347 à **0,170** ; autorisée, il ne bouge plus rien (0,318 → 0,315). Une portée doublée par tour rend à `arc` tout ce que le terrain lui reprend.

## PS.7. Verdict révisé
1. **Ne pas implémenter la Poussière + le Guet.** `docs/SPEC_POUSSIERE.md` n'est pas écrit. Sur le moteur de septembre la règle coûte 4,6 points de bande de tier, ne rend ni |r| (0,318 → 0,315) ni bande de niche (46,07 → 46,33), et s'active sur 16,06 % des coups au lieu de 31,80 %.
2. **Le §9 n'est pas rétracté, il est daté.** Rien de ce qu'il affirmait n'était faux sur son moteur ; ce qui a changé est dessous. La fidélité de la copie, elle, a été contrôlée autrement qu'en 2026-09-07 : le diff de `bataille-m.ts` contre `tactique/bataille.ts` ne contient que les crochets du motif, et à `usage = aucun` `porteeM ≡ portee`, le bonus vaut 0 et l'appui est faux.
3. **La décision 1 (Poussière ou emboîtée) est sans objet** ; la décision 2 (motif fixe ou tourné) reste sans effet — les seize cases sont invariantes par les **huit** isométries du carré, vérifié une à une ; la **décision 3 est tranchée : aucun plafond**, le budget de 64 en tient lieu (`arc` le plus fort tiré sur 2 000 objets : **59**).
4. **Le chantier urgent n'est plus le motif.** Le contrôle est hors cible : |r| **0,318**, bande de tier **37,75 pt**, `eperon` à −0,310 quand la charge et la riposte étaient censées le payer. C'est un recalage de `DIV_PAS`, `DIV_PORTEE` et `PA_PAR_TOUR` qu'il faut mesurer, pas un terrain — et le témoin `+2 partout` (|r| **0,142**) dit dans quelle direction chercher : **de la portée pour tous, pas de la portée pour seize cases.** Les deux bancs de PS.8 se rejoignent d'ailleurs sur le rapport à corriger, même s'ils le lisent par des bouts opposés : c'est **`PA_PAR_TOUR · pas` contre `portée`** — 4 à 8 contre 1 à 7 — que personne ne contrôle.
5. **Ce qui reste vrai de l'étude.** Le §5 tient : sur la dalle dégagée la Poussière garde ses cinq échelles de distance (16/32/24/8/1 sur les 81 cases, 16/29/21/6/1 en pas de chemin sur la région) là où le réseau régulier en a trois et le damier deux. Le §7 tient : le carré de Gahn ne sert toujours à rien. Le §2 tient : Sierpiński base 2 n'est pas un terrain de 9×9. Ce sont des faits de géométrie ; ils ne dépendent d'aucun moteur.

## PS.8. Un désaccord à signaler — le signe de `r(arc)` dépend de la politique, pas du moteur
Une session parallèle a rejoué le même moteur pour `docs/ETUDE_EQUILIBRAGE_TACTIQUE.md` (post-scriptum du même jour) et trouve l'**inverse** sur les deux axes : `eperon +0,622` et `arc −0,377` là où ce banc lit `eperon −0,310` et `arc +0,318`. Les deux bancs descendent du §4 de l'équilibrage ; ce qui les sépare est **l'emploi du second point d'action**. Là-bas la politique s'écrit comme une boucle sur les points et le double pas sert d'abord à **rejoindre** l'archer (2·pas = 4 à 8 cases contre une portée de 7) ; ici elle garde la structure de l'étude — meilleure case, puis frapper — et le second point sert à **frapper deux fois** dès que la cible est à portée. Le premier régime tue `arc`, le second le sacre.

**Aucune des deux valeurs absolues n'est donc une propriété du moteur**, et il faut le dire avant d'en tirer une constante. Ce que ce post-scriptum conclut sur le **motif** ne repose pas dessus : ses quatre réponses sont des **différences** entre contrôle et motif mesurées sous la **même** politique, et l'ablation les rejoue sous trois régimes de tour. L'ouverture de la bande de tier par le Guet vaut **+4,60 pt** (2 PA), **+4,82 pt** (1 pas + 1 coup), **+4,97 pt** (1 coup + 2 pas) : stable au dixième de point près quel que soit le régime. L'activation vaut **16,06 %** sous les deux PA et **16,06 %** sous `1 coup + 2 pas`, au chiffre près. C'est la partie de ce lot qui ne dépend pas du désaccord.

## LIMITE du post-scriptum
- **La politique a été portée aux deux PA, elle n'a pas été prouvée optimale.** Elle garde la structure des trois politiques de l'étude — meilleure case, puis frapper — et emploie le PA restant : double pas quand la frappe est hors d'atteinte, double frappe quand elle ne l'est pas, décrochage pour le harceleur. Un joueur qui planifierait deux tours ferait mieux ; l'ablation `1 coup + 2 pas` montre que la conclusion ne tient pas à ce choix, mais elle ne l'annule pas.
- **Le budget de feuilles n'est pas contraignant** (100 000 feuilles au banc). La double frappe y est gratuite alors qu'en jeu elle vaut deux tours d'arbre : la mesure la **surévalue**, et avec elle la domination de `arc`. C'est la première chose à refaire avec un budget réaliste.
- **Un seul étage, un seul duel 1v1.** Étage 198, région de 73 cases, deux unités. Les seize cases de la Poussière y sont **toutes** libres — c'est le cas le plus favorable au motif, et il ne suffit pas. Sur un étage moyen, moins.
- **La borne d'activation est celle de ce terrain.** 16,06 % est un plafond de politique (poids 3 et poids 200 rendent le même chiffre), pas un plafond de la règle : une Poussière recentrée, ou une dalle plus petite, donnerait autre chose. Personne ne l'a mesuré.
- **Rien de tout cela n'est rejouable par la CI**, pas plus qu'avant : les scripts vivent dans le scratchpad et `atelier/` n'a pas été touché d'une ligne.
- **Ces chiffres restent des figures, pas des preuves.** Aucun n'entre dans une feuille, un carnet ou une signature.
