# Spécification d'audit — Rendu 3D du coffre

**Dépôt :** Oykdo/Eidos
**Version :** 2.0 (2026-09-04) — un seul coffre, palettes isochromatiques, ornements par palier
**Statut :** formules hors scène, conservées ici
**Code :** `atelier/src/lib/eidos/coffres.ts`, `atelier/src/components/coffre/`

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
- [x] Serrure à l'indice 7 quel que soit le palier
- [x] Intégrale de contrôle proche de \(\pi\)
- [x] Le palier ne lit que la jauge (objets, sceaux) — jamais le solde
