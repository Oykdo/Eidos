# Spécification d’audit — Rendu 3D des coffres

**Dépôt :** Oykdo/Eidos  
**Version :** 1.1  
**Statut :** formules hors scène, conservées ici  
**Code :** `atelier/src/lib/eidos/coffres.ts`, `atelier/src/components/coffre/`

## Objet

La page Coffre de l’atelier montre deux volumes :

- coffre **avant** — image (eidôlon), teinte ambre-or, premier plan ;
- coffre **fond** — forme (eidos), palette 8 teintes blanc → bleu, sommet de la cloche, cage sphérique.

Aucune équation n’apparaît à l’écran.

## Position

| Élément | Place |
|---|---|
| Coffre avant | Flanc avant de la cloche, plus grand |
| Coffre fond | Pic de \(z = e^{-(x^2+y^2)}\), plus petit, reculé |
| Sphère \((r,\theta,\phi)\) | Origine sur la serrure du coffre fond |
| Gaussienne | Socle à contours circulaires, fuite vers l’infini |

Constantes figées dans `COFFRE_AVANT` et `COFFRE_FOND`.

## Sphérique

\[
x = r \sin\theta \cos\phi
\qquad
y = r \sin\theta \sin\phi
\qquad
z = r \cos\theta
\]

\(0 \le r\), \(0 \le \theta \le \pi\), \(0 \le \phi < 2\pi\).

## Gaussienne intégrée

\[
\int_{-\infty}^{\infty}\int_{-\infty}^{\infty} e^{-(x^2+y^2)}\,dx\,dy = \pi
\]

Contrôle : `integraleGaussienne()` dans `coffres.ts` (somme polaire). Écart attendu \(< 10^{-4}\).

## Palettes

Coffre fond (indices 0–7) : `#FFFFFF` `#E8F4FF` `#C5E4FF` `#8FCBFF` `#4AA3F0` `#1E6FCB` `#0B4A96` `#062A5A`.

Coffre avant : ambre-or `#FFF4D4` … `#1A1006`.

Ornements pixelisés : dithering par texels, pas d’interpolation douce sur le coffre fond.

## Checklist

- [ ] Aucune formule dans la scène
- [ ] Coffre fond plus petit, plus haut, en retrait
- [ ] Coffre avant teinté ambre
- [ ] Palette fond limitée à 8 indices
- [ ] Intégrale de contrôle proche de \(\pi\)
