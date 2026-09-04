# Spécification d'audit — Rendu 3D du coffre

**Dépôt :** Oykdo/Eidos
**Version :** 2.1 (2026-09-04) — un seul coffre, palettes isochromatiques, ornements par palier ; cellules de la coque, matière et lumière du socle
**Statut :** formules hors scène, conservées ici
**Code :** `atelier/src/lib/eidos/coffres.ts`, `atelier/src/components/coffre/` (`cellules.ts` : coque, ferrures, contact, trame), `atelier/src/components/canvas/` (lumières, matières, environnement, halo, trame)

## Objet

La page Coffre montre **un seul volume** : le coffre, au pic de la cloche gaussienne, dans une cage sphérique \((r,\theta,\phi)\) quand le butin l'exige. Aucune équation n'apparaît à l'écran. Tout ce qui suit est une **jauge** : rien ne touche au carnet, aux pièces, au mot des objets.

## Palier du butin

Un score entier, déterministe, sur le contenu du coffre :

| Source | Points |
|---|---|
| chaque objet | 1 |
| chaque gemme enchâssée | 2 |
| affixe de rang 2 / 3 | 1 / 2 |
| pierre philosophale | 4 |
| sceau Kali / Dvâpara / Trétâ / Satya | 1 / 2 / 3 / 4 |

Seuils : score ≥ 1 → **garni**, ≥ 4 → **orné**, ≥ 9 → **précieux** ; sinon **nu**. Constantes `SEUILS_BUTIN`, fonctions `scoreButin`, `palierButin`.

## Palettes isochromatiques

Une **teinte** par palier, huit **clartés** : 94, 84, 72, 60, 48, 36, 24, 12 %. Générées par `hslVersHex`, figées par le test (`teinteDeHex` retrouve la teinte à ±3°).

| Palier | Teinte | Saturation | Nom |
|---|---|---|---|
| nu | 215° | 10 % | acier |
| garni | 150° | 30 % | vert-de-gris |
| orné | 42° | 65 % | ambre-or |
| précieux | 275° | 45 % | améthyste |

Indices sur le coffre : 1 poignée, 2 couvercle, 4 coque, 6 flancs, 7 serrure (toujours la plus sombre) ; les ornements prennent 0 et 1.

## Ornements

Ils s'ajoutent, jamais ne se remplacent : chaque palier contient les ornements du précédent.

| Palier | Ornements | Cellules |
|---|---|---|
| nu | — | — |
| garni | tas sur le couvercle | 10 (y = 4, 5) |
| orné | + ferrures : quatre arêtes verticales | 28 (x = ±4, z = ±3) |
| précieux | + cage sphérique sur la serrure, + couronne | 265 · 8 (\|x\| + \|z\| = 2, y = 4) |

Toutes les cellules sont entières. Pas d'interpolation douce : dithering par texels.

## Cellules de la coque

`cellulesCoque(ornements)` (`components/coffre/cellules.ts`, aucun three) décide l'indice de chaque cellule ; la scène ne fait que poser. Coque 9 × 7 × 7 creuse : **266 cellules** quel que soit le palier, sans doublon.

| Règle | Effet |
|---|---|
| Indice brut | 4 coque ; 2 si \(y \ge 2\) ; 1 poignée (\(|y| = 3\), \(|x| \le 1\), \(|z| = 3\), 12 cellules) ; 7 serrure \((0, 0, \pm 3)\) ; 6 flancs (\(|x| = 4\), \(|y| \le 1\)) |
| Ferrures | \(x = \pm 4\), \(z = \pm 3\) sont les angles de la coque : elles **recolorent** (indice 1) sans doubler la cellule |
| Contact | cellule de coque sous un ornement posé (tas au pas 0,16 → ×0,8 arrondi ; couronne ; 3 × 3 sous la cage) : 2 → 3, 4 → 5, **jamais 6 → 7** |
| Trame | hors contact, un quart des cellules d'indice pair monte d'une clarté (2 → 1, 4 → 3, 6 → 5) ; Bayer 4 × 4 (`texel.seuilBayer`, convention « < 4 ») lu **dans le plan de la face** — dessus et dessous en \((x, z)\), avant et arrière en \((x, y)\), flancs en \((y, z)\), phase décalée d'une rangée sur les faces verticales (trame sur \(y = \pm 1\) ; la rangée de la serrure et la ligne du couvercle restent nettes) |

La trame ne produit jamais 0 (tas) ni 7 (serrure) ; les cellules 1 et 7 ne bougent pas. Sans ornement, 62 cellules sur 252 (24,6 %) sont remontées. Contrôles : `cellules.test.ts` (6).

Limite connue : le tas est posé au pas 0,16 avec `dy = 0,12`, ses neuf cellules \(y = 4\) ont leur centre à 0,76 contre 0,75 pour la rangée haute de la coque (cubes de 0,2) : elles n'émergent de la face supérieure (0,85) que de 0,01 u et le plateau (\(\pm 0{,}26\)) couvre presque les cellules de contact (\(\pm 0{,}3\)). Le contact du tas se lit surtout par la bordure de 0,04 u ; seule la cellule \((0, 5, 0)\) émerge nettement. Reposer le tas (`dy = 0,31`, bas des cellules sur la face) est un chantier à part.

## Matière et lumière

- Un `MeshStandardMaterial` blanc par coffre, `roughness` / `metalness` de `MATIERE_PALIER[palier]` (nu 0,55 / 0,30 ; garni 0,62 / 0,28 ; orné 0,36 / 0,60 ; précieux 0,24 / 0,08), `dithering`. La couleur d'instance multiplie le blanc : l'ordre des huit clartés est préservé. Métal ≤ 0,60.
- Cubes **jointifs** au pas 0,2 (coque) et 1 × 0,085 (cage) : plus d'interstice sous le pixel qui rampe en rotation. Cage en `MATIERE_FERRURE`, teintes `ORNEMENT_TEINTE` inchangées (parti pris polychrome \(r, \theta, \phi\)).
- Lumières du contrat (`LumieresAtelier`) : ambiant 0,2, hémisphère ciel / sol, clé, contre-jour dans `palette[2]` (clarté 72 % du palier). Environnement préfiltré (`EnvironnementAtelier`, PMREM 64 px, teinte `palette[2]`, rebake au changement de palier seulement) sous garde d'extension flottante ; sans elle, `matiereEffective` repasse en matière peinte (roughness ≥ 0,45, metalness ≤ 0,35).
- Halo de fond (`Halo`, teinte `palette[3]`, force 0,06, visée au pic) : fond `#12151a` exact aux bords là où rien n'est dessiné ; la cloche, non fondue à moins de 5,7 u, traverse encore les bords bas et latéraux (voir la checklist). Brouillard `brouillard(5,4 + 0,4 A', 12,5 + 0,6 A')` avec \(A' = 0{,}55 + A\) le pic : coffre intact, bord lointain de la cloche fondu aux deux tiers.
- La cloche (fil de fer) est hors environnement (`envMapIntensity = 0`), sans ombre, fondue dans le brouillard ; émissif `palette[3]`, \(0{,}08 + 0{,}12 A\).
- Ressources libérées au démontage (`disposerInstance`, `geometry.dispose`) : R3F ne dispose pas les `<primitive>`.

Tout ceci est une lecture : un rendu n'atteste rien.

## Position

| Élément | Place |
|---|---|
| Coffre | Pic de \(z = e^{-(x^2+y^2)}\), échelle \(0{,}78 + 0{,}32\,A\) |
| Sphère \((r,\theta,\phi)\) | Origine sur la serrure (`SERRURE_LOCALE`), palier précieux |
| Gaussienne | Socle à contours circulaires, émissif de la teinte du palier |

\(A\) = amplitude du solde : \(0{,}28 + 0{,}72\log_{10}(1 + e)\), \(e\) en eidôla, plafond 1,85.

## Sphérique

\[
x = r \sin\theta \cos\phi \qquad y = r \sin\theta \sin\phi \qquad z = r \cos\theta
\]

\(0 \le r\), \(0 \le \theta \le \pi\), \(0 \le \phi < 2\pi\). \(R = 7\), \(P = (2, 3, 6)\), \(|P|^2 = 49\).

## Gaussienne intégrée

\[
\int_{-\infty}^{\infty}\int_{-\infty}^{\infty} e^{-(x^2+y^2)}\,dx\,dy = \pi
\]

Contrôle : `integraleGaussienne()` (somme polaire). Écart attendu \(< 10^{-3}\).

## Checklist

- [x] Aucune formule dans la scène
- [x] Un seul coffre, au pic
- [x] Palette : une teinte par palier, huit clartés décroissantes, testée
- [x] Ornements cumulatifs, cellules entières, testés (10 · 28 · 8 · 265)
- [x] Serrure à l'indice 7 quel que soit le palier — et la seule (deux cellules, \((0, 0, \pm 3)\)), testé
- [x] Coque : 266 cellules, ferrures sans doublon, trame et contact à ±1 clarté, jamais 0 ni 7 par la trame, jamais 6 → 7 par le contact (`cellules.test.ts`)
- [x] Matière par palier, métal ≤ 0,60, repli peinture sans environnement flottant
- [x] Halo : fond `#12151a` exact aux bords là où rien n'est dessiné (dôme `toneMapped = false`, levé au centre seulement)
- [ ] La cloche (fil de fer, non fondue à moins de 5,7 u : le bord bas du canvas touche le plan à ≈ 3,3 u, les bords latéraux à ≈ 6 u) traverse les bords bas et latéraux : couture à vérifier à l'œil, ou relever le plan / rapprocher le brouillard — hors de ce lot
- [ ] Œil : clartés ordonnées à la pipette sur les faces +z pour les quatre paliers ; flancs du palier orné au-dessus du fond ; trame lue comme trame et non comme saleté à ~120 px (sinon la restreindre à l'indice 4) — à faire dans le navigateur
- [x] Intégrale de contrôle proche de \(\pi\)
- [x] Le palier ne lit que la jauge (objets, sceaux) — jamais le solde
