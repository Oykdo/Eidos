# Spécification d’audit — Rendu 3D des coffres

**Document :** SPEC_AUDIT_COFFRES_SPHERIQUES_GAUSSIEN
**Version :** 1.2
**Statut :** conforme audit visuel (formules hors image, conservées ici)
**Langue de référence :** fr

## 1. Objet

Les équations ne figurent **pas** sur l’image. Elles restent ici.

L’image incarne :

- sphère de coordonnées \((r,\theta,\phi)\) née **sur la serrure** du coffre de fond ;
- ornements voxelisés, texels francs ;
- surface gaussienne \(z = e^{-(x^2+y^2)}\) dont l’intégrale à l’infini vaut \(\pi\) ;
- coffre 2 plus petit, plus haut, au sommet de la cloche ; coffre 1 au premier plan.

## 2. Écarts volontaires

| Point | Spec d’entrée | Atelier |
|---|---|---|
| Fond | parchemin / planche | `#12151a` (fond Eidos) |
| Légendes \(r,\theta,\phi\) | hors image | hors image |
| \(\pi\), \(\int\) | hors image | hors image |

Le parchemin n’est pas Eidos. L’atelier reste sombre. Noté, pas « corrigé ».

## 3. Serrure = origine

`SERRURE_LOCALE = (0, 0.15, 0.6)` dans le repère du coffre 2.
La cage voxelisée (265 cellules, \(P=(2,3,6)\) sur la sphère \(R=7\)) a son \(O\) à cette serrure.

## 4. Deux robinets, deux noms

| Nom | Où | Quoi |
|---|---|---|
| **Poste du jour** | jauge locale, `POSTE_JOUR = 3` | trois blocs civils, hors chaîne |
| **Tirages ‰** | catalogue, `PALIERS_OBJET` | 0 / 2500 / 1500 — rareté des 101, pas du calendrier |

Ne pas les fusionner. Le grind (sig ‖ bloc ‖ roll) est une troisième porte, ouverte, joueurs non plafonnés.

## 5. Catalogue

Source : `objets.py --json`. Vecteur figé : `cosmos-empreintes.ts` (101).
Le TypeScript ne régénère pas les formes. `NORME = ATOMES` (constantes d’eonis).

Impact visé \(q_0 = 9945\) : \(10^8 - 9945^2 \equiv 7 \pmod 8\), pas somme de trois carrés. La spirale saute au premier \(a\) admissible. Ne pas tester 9945 comme reste.

## 6. Palette coffre 2

Huit teintes blanc → marine, indices 0–7. Serrure = 7. Tas du couvercle = 0 (glace).
Coffre 1 : bois sombre + or, tas = 1.

Fin.
