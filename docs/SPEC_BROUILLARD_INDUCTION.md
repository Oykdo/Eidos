# Spec — l'induction : ce que le mouvement lève dans la brume

**Dépôt :** Oykdo/Eidos
**Statut :** spec proposée (2026-09-10), décisions I1–I8 (§9) à prendre par l'auteur. Rien n'est implémenté ; les chiffres viennent de quatre scripts jetables du bac à sable (`ind-champ.ts`, `ind-controles.ts` 15/15 verts, `ind-variantes.ts`, `ind-plafond.ts`, `ind-bataille.ts`), tous sur les 255 dalles réelles et sur le vrai moteur de `tactique/bataille.ts`.
**Complète :** `docs/SPEC_BROUILLARD.md` (B1–B5 restent ouvertes ; ce document ne les tranche pas et ne modifie pas ce fichier). **S'appuie sur :** `tour.ts` (`dalleDe`), `tactique/grille.ts` (`chemin`, `accessibles`), `secrets.ts` (`lireDuel`), `components/canvas/texel.ts`, `docs/SPEC_AURA_GRADUELLE.md` (`rayon`), `docs/SPEC_AURA_PENDULE9.md` §3.
**Règle de lecture :** la brume est une jauge, hors feuille. Tout est entier, rien n'est tiré au sort, figures ≠ preuves. Aucune règle d'ici n'entre dans `resoudreCoup`, dans `accessibles`, ni dans `traceBataille`.

## 0. En cinq lignes

1. Earnshaw interdit un maximum **statique** à l'intérieur : c'est vrai, et ça ne dit rien du mouvement. La loi complémentaire est celle de Faraday, `∇ × E = − ∂B/∂t` : **ce qui change induit une circulation sur son bord**.
2. Sur un réseau, cette loi est de la **combinatoire exacte** : la somme orientée sur le bord d'une région égale la variation de flux qu'elle enclôt. Aucun flottant, aucun arrondi, rejouable à l'octet (§2, §3 — contrôle I5, identité vérifiée sur 4 000 marches).
3. Mesuré, la version « il faut **encercler** » est **morte** : sur les dalles réelles, 42 % des étages seulement peuvent enclore quoi que ce soit, le flux médian atteignable vaut 0, et l'induction s'allume dans **5 %** des batailles. La version « le flux est l'**aire balayée** » (barre glissante — la même loi, un champ uniforme) s'allume toujours.
4. Le puzzle du gardien **survit**, à une condition mesurée : la lecture ne prend que le **conducteur**, les cases foulées. Alors 7,90 des 9 centrales restent candidates (brume pleine : 9,00 ; relief connu : 1,00) et le gardien n'est jamais déduit. Avec un cran de plus vers le dehors, il l'est sur **16,7 %** des étages : un antre sur six offert.
5. **Verdict.** La loi est exacte et son intérêt est explicatif — elle dit *pourquoi* l'intérieur ne s'éclaire pas et pourquoi l'aura ne peut pas être une lampe portée. Mais sur une dalle 9 × 9 à moitié pleine, tout ce que sa structure ajoute est dégénéré (§8) : livrer le réseau serait payer un module pour une règle de deux lignes.

## 1. La loi, en deux phrases

1. **Un champ immobile n'éclaire pas l'intérieur.** C'est Earnshaw, et `SPEC_BROUILLARD.md` §1 en tire les neuf cases centrales noires. Rien ici ne l'entame.
2. **Un champ qui change éclaire son bord.** Une variation de flux à travers une surface induit une circulation sur le **contour** de cette surface — jamais dans son intérieur. Se déplacer change le flux ; la visibilité est ce que l'induction dépose sur le contour de ce qu'on a parcouru.

Le vocabulaire : l'**aura** est le champ, le **mouvement** est la variation de flux, la **visibilité** est la circulation induite. Le « magnétisme » de l'auteur est `B` — ce que le mouvement brasse.

## 2. La formalisation exacte

### 2.1 Le réseau

La dalle 9 × 9 est un complexe cellulaire, pas une grille de pixels.

| Objet | Compte | Ce que c'est |
|---|---|---|
| **sites** (coins) | 10 × 10 = 100 | les nœuds du réseau |
| **liens** (arêtes) | `H(i,j)` 9 × 10 = 90, `V(i,j)` 10 × 9 = 90 → **180** | où vit la circulation `E` |
| **plaquettes** (cases) | 9 × 9 = **81** | où vit le flux `B` ; c'est aussi la case du jeu |

Caractéristique d'Euler `100 − 180 + 81 = 1` : un disque, sans anse ni trou (contrôle I1).

**L'orientation.** Le bord de la case `(x, y)` est parcouru dans le sens **index-positif**, le même pour toutes :

    ∂(x,y) = + H(x, y)  + V(x+1, y)  − H(x, y+1)  − V(x, y)

Elle est stable au rejeu pour trois raisons, et c'est la seule justification qui compte : (a) elle ne dépend que des indices — ni de l'écran, ni du sens de `y`, ni d'un flottant ; (b) elle est **uniforme**, donc deux cases voisines parcourent leur arête commune en sens opposés et cette arête s'annule dans toute somme : le bord d'un ensemble ne dépend que de l'**ensemble** (I3, I7) ; (c) l'orientation globale est une convention de signe qui disparaît de la lecture, laquelle ne lit qu'une magnitude (I8).

### 2.2 Le champ, la marche, le flux

    m(c)  ∈ {0, 1}   le magnétisme d'une case — hors dalle : 0
    Ω_t   ⊆ cases    l'ENSEMBLE des cases parcourues depuis le début, au tour t
    ∂Ω    = Σ_{c∈Ω} ∂c, coefficients ±1 : un 1-cycle fermé (I4, ∂∂ = 0)
    Ext(Ω)= les cases hors Ω reliées au dehors du plan par des pas orthogonaux
    Int(Ω)= tout le reste = Ω ∪ ses trous          (l'intérieur du contour)
    Φ(Ω)  = Σ_{c ∈ Int(Ω)} m(c)                    le flux enclos, entier
    ΔΦ_t  = Σ_{c ∈ Int(Ω_t) \ Int(Ω_{t−1})} m(c)   ce que le tour vient de balayer

`Ω` est un **ensemble**, jamais un chemin : la démarche des unités peut changer (`docs/ETUDE_MOBILITE.md`), la loi ne la voit pas. C'est la contrainte 5, et elle est structurelle, pas promise : `∂Ω` est une somme sur un ensemble, `Int` un remplissage, `Φ` une somme — aucune des trois n'a d'entrée ordonnée (I7 : 500 permutations, contour identique).

### 2.3 La circulation induite, et la clarté

Faraday, sous forme de réseau : pour toute case, `rot E (c) = − ΔB(c)`, où

    rot E (x,y) = E[H(x,y)] + E[V(x+1,y)] − E[H(x,y+1)] − E[V(x,y)]

La circulation totale sur le contour vaut donc `∮_{∂Ω} E = − ΔΦ`. C'est un **scalaire par tour**, et il est de jauge invariante (I6) : `E` n'est pas observable, `∮ E` l'est. La clarté ne se lit donc jamais sur une arête — seulement sur ce que le contour touche.

    // un tour, entiers seulement, aucune division non entière
    fonction induire(clarté, Ω_avant, Ω_après, m) :
      pour toute case c : clarté[c] ← max(0, clarté[c] − 1)          // Lenz
      ΔΦ ← Σ_{c ∈ Int(Ω_après) \ Int(Ω_avant)} m(c)
      si ΔΦ = 0 : rendre clarté                                       // rien ne change, rien n'éclaire
      niveau ← rayon(ΔΦ, 8) = min(3, (3·ΔΦ + 7) // 8)                 // SPEC_AURA_GRADUELLE §2
      pour c ∈ conducteur(Ω_après) : clarté[c] ← max(clarté[c], niveau)
      pour c ∈ trous(Ω_après)      : clarté[c] ← 0                    // jamais l'intérieur
      rendre clarté

`conducteur(Ω)` = les cases **de Ω** qui touchent une arête de `∂Ω` : le fil dans lequel le courant passe. Les trois plateaux 1, 2, 3 sont ceux de `SPEC_BROUILLARD.md` §7 et de `texel.ts` ; `rayon` est la fonction entière de l'aura, reprise telle quelle.

Trois propriétés se lisent dans le pseudo-code, et chacune a son contrôle :
- **l'intérieur d'une boucle ne s'éclaire jamais** (I12, 659 tours à trou : zéro fuite). C'est la phrase de Faraday, prise au mot ;
- **sans changement, plus de lumière** : Lenz éteint tout en deux tours depuis le plateau 2 (I13) ;
- **la nuit d'Earnshaw tient** : les 32 lampes du bord allumées ensemble laissent les neuf centrales à zéro (I14), et l'induction n'y change rien puisqu'elle n'éclaire que ce qu'on a foulé.

## 3. La conservation, prouvée

**Théorème (Stokes discret).** Pour toute 1-cochaîne entière `E` et tout ensemble de cases `Ω` :

    Σ_{c ∈ Ω} rot E (c)  =  Σ_{e ∈ ∂Ω} coeff(e) · E[e]  =  ∮_{∂Ω} E

*Preuve.* `Σ_{c∈Ω} rot E(c)` est, par définition, `Σ_{c∈Ω} Σ_{e∈∂c} ±E[e]`. Chaque arête intérieure à `Ω` appartient à deux cases de `Ω`, qui la parcourent en sens opposés parce que l'orientation est uniforme (§2.1) : sa contribution est `+E[e] − E[e] = 0`. Ne survivent que les arêtes d'une seule case de `Ω` — c'est `∂Ω` par définition. ∎

**Corollaire (conservation d'Eidos).** Avec `rot E = − ΔB` :

    ∮_{∂Ω_t} E_t = − ΔΦ_t     et, en télescopant sur toute la partie,     Σ_t ΔΦ_t = Φ(Ω_T)

C'est l'analogue exact de `Σ utxo == emission_cumulee()` : la somme des inductions de tous les tours **est** le flux enclos à la fin, ni plus ni moins, et c'est une identité, pas une vérification. Contrôles : I5 (4 000 marches × une cochaîne entière tirée du hachage, écart nul), I6 (jauge : `E` et `E + grad χ` ont la même circulation), I11 (80 parties × 20 tours, télescopage exact), I9–I10 (une marche sans trou enclôt un flux nul ; le flux est exactement le relief des trous).

**15 contrôles, 15 verts.** `assert` + `print` nus, aucun framework, aucune dépendance.

## 4. Ce que ça donne, mesuré

Deux champs `B` possibles, et c'est **la** décision (I1).

| | **V1 — `m` = le relief** (il faut encercler) | **V2/V3 — `m` = 1 par case** (l'aire balayée) |
|---|---|---|
| Physique | circuit fixe, champ non uniforme | circuit qui s'agrandit, champ uniforme : la barre glissante |
| Flux | le relief qu'on a **entouré** | l'aire qu'on vient de **balayer** |
| S'allume | **5 %** des batailles | 100 % |
| Plafond absolu | 42,0 % des étages peuvent enclore quoi que ce soit ; flux médian **0**, moyenne 1,02 | — |
| Anneau minimal (8 libres autour d'une case) | 12,5 % des étages en portent un ; 8,2 % autour d'un plein | — |
| Cases lues en bataille | **1,1 / 81** | 18,9 (V2) · 8,8 (V3) |

**V1 est morte**, et pas par réglage : la dalle réelle porte 40,4 cases libres, dont la plus grande composante praticable ne fait que **20,0 cases**. On n'y boucle pas.

Sous V2/V3, sur 189 batailles réelles (médiane 5 tours, 5 coups) et sur un explorateur de 10 tours à `pas` 4 :

| Lecture | en bataille, avec la lampe de porte | en exploration, 10 tours | 9 centrales | gain de décision |
|---|---|---|---|---|
| lampe seule (Earnshaw) | 13,5 / 81 — **17 %**, constante | 13,7 / 81 | 0,00 / 9 | aucun |
| **V3** conducteur seul | 17,5 / 81 — **22 %** | 17,4 / 81 — 22 % | 2,80 / 9 | **66 %** des tours, écart médian 1, p95 4 |
| **V2** conducteur + un cran dehors | 23,3 / 81 — **29 %** | 31,8 / 81 — 39 % | 5,42 / 9 | 41 % des tours, écart médian 0, p95 12 |

Le **gain de décision** est le pourcentage de tours où deux destinations atteignables donnent deux lectures différentes ; médiane de 3 lectures distinctes offertes par tour, p95 de 11. V3 en donne davantage que V2 : une lecture serrée rend le trajet décisif, une lecture large noie le choix. C'est le seul chiffre où le mécanisme paie clairement — un brouillard qui n'ajoute pas de décision n'ajoute rien.

## 5. Le puzzle du gardien survit — et voici le chiffre qui tranche

`SPEC_BROUILLARD.md` §5 place le gardien sur la centrale de |laplacien| maximal : connaître le relief du bloc 5 × 5 (les 9 centrales et leur 8-voisinage), c'est le déduire. La mesure adverse : un explorateur qui **ne vise que le centre**, 10 tours, puis le compte des centrales encore candidates sur 2 000 complétions du relief inconnu tirées du hachage.

| Ce que le joueur sait | centrales candidates | gardien déduit | réussite avec 3 coïncidences |
|---|---|---|---|
| brume pleine (référence basse) | **9,00 / 9** | 0 % | 33 % |
| **V3** — conducteur seul | **7,90 / 9** | **0 / 252 étages** | ≈ 38 % |
| **V2** — un cran vers le dehors | 5,54 / 9 | **42 / 252 — 16,7 %** | ≈ 55 % |
| relief entièrement connu (référence haute) | 1,00 / 9 | 100 % | 100 % |

**La réponse est donc : oui, à condition de choisir V3.** Sous V3 la déduction ne progresse pas — 7,90 contre 9,00 — et le gardien n'est déduit sur **aucun** des 252 étages, même au plafond où toute la région libre est foulée (bloc 5 × 5 lu : 7,61 / 25). Sous V2 un antre sur six est offert sans dépenser une coïncidence, et le taux de réussite passe de 33 % à 55 % : c'est le puzzle qui meurt, exactement comme le craignait la question.

**La garantie de V3 n'est pas statistique, elle est structurelle** : la clarté induite ne se pose que sur des cases que le joueur a **occupées**. Elle ne peut donc, par construction, révéler quoi que ce soit qu'il ne pouvait déjà voir en s'y tenant — aujourd'hui, et pour tout contenu à venir. Aucune mesure ne sera à refaire quand un nouveau secret entrera dans la Tour.

Trois protections avaient été proposées ; la mesure les départage. Le **contour** ne protège rien à lui seul (§8). La **boucle fermée** protège tout mais tue le mécanisme (V1, 5 %). **Lenz** ne protège pas la déduction — le joueur note ce qu'il a lu, la clarté s'éteint, le savoir reste — mais il protège la **lisibilité** : l'écran ne se remplit jamais, il suit le joueur. C'est le conducteur seul qui fait le travail.

Et une règle qui vaut pour les trois variantes : **l'induction révèle `B`, jamais un occupant.** Une dynamo renseigne sur l'aimant, pas sur la poussière posée dessus. Le gardien est un occupant.

## 6. Trois mécanismes — lequel supprimer

| Mécanisme | Ce qu'il révèle | Où | Verdict |
|---|---|---|---|
| la lampe du bord (Earnshaw) | relief **et** occupants | deux rangées depuis le bord | **garder** : c'est la loi, et le seul endroit où un occupant se voit sans rien dépenser |
| l'induction (ce document) | le **relief**, sur ce qu'on a foulé | partout où l'on marche | à décider (§9) |
| la coïncidence `S = A·V` | **un occupant**, à l'intérieur | une case, trois fois par antre | **garder** : c'est la seule échappatoire d'Earnshaw, et le seul mécanisme qui désigne un occupant dans la nuit |

**Il ne faut pas remplacer la coïncidence par l'induction.** Les deux ne font pas le même travail : l'induction lit le champ, la coïncidence désigne un occupant — c'est précisément la propriété d'un produit de deux entrées indépendantes, et rien d'autre dans le jeu ne l'a. Empilées, elles ne se recouvrent pas : l'une nourrit la déduction, l'autre l'engage.

**Ce qui devient inutile, en revanche, c'est la règle 3 du §4 de `SPEC_BROUILLARD.md`** — le soufre qui rend la réponse linéaire et montre « dix-sept cases de relief pour deux barres ». L'induction rend le même service (relief, jamais d'occupant), sans élixir, sans seuil à baisser, et pour un déplacement qu'on faisait de toute façon. Une règle qu'on n'utilisera jamais est une règle à supprimer : si I1–I2 sont adoptées, la règle 3 tombe et le soufre reste ce qu'il est ailleurs. C'est une ligne retirée, pas une ajoutée.

## 7. L'aura : elle nomme, elle ne règle rien

Les huit agrégateurs existent (`SPEC_AURA_PENDULE9.md` §3) et deux paires-miroir tombent juste :

| Paire (somme 9) | Ce qu'elle nomme ici |
|---|---|
| **souffle** (7) / **ombre** (2) | le mouvement et ce qui reste noir : **la paire de l'induction** |
| **ancrage** (5) / **éclat** (4) | le statique et le rayonnement : la paire de la lampe, déjà prise par D4 |

Un seul agrégateur porte donc le champ, et c'est **souffle** — le nom était déjà là. Mais **il ne doit rien fixer**, et c'est une recommandation ferme : le relecteur de `SPEC_AURA_GRADUELLE.md` a écarté D4 pour cette raison exacte — un joueur dépensé qui voit moins subit un malus, et « l'aura ne coûte aucun geste » ne tient plus. Le même argument s'applique mot pour mot ici, en pire : sous R ≤ 1 l'antre deviendrait injouable. **Recommandation : `souffle` teinte la clarté induite (la couleur du sillage), `ombre` nomme ce qui reste noir, et le plateau vient de `rayon(ΔΦ, 8)` — c'est-à-dire du déplacement, pas de l'aura.** L'aura reste hors feuille, une lecture, et ne devient jamais une entrée du champ.

## 8. Le verdict — la structure est dégénérée sur une dalle 9 × 9

Il faut le dire sans détour, parce que c'est le principal résultat de cette étude.

| Ce que la physique ajoute | Ce que la dalle réelle en fait |
|---|---|
| « la circulation ne révèle que le contour, jamais l'intérieur » | au **plafond** — toute la région libre foulée — il reste **1,07 case hors contour**, soit 5,4 % de la région ; en bataille réelle (8,9 cases foulées sur 20), zéro. La distinction ne mord jamais |
| « il faut une boucle fermée pour enclore du flux » | 42 % des étages peuvent enclore quelque chose, flux médian 0, et l'induction s'allume dans **5 %** des batailles |
| « l'induit s'oppose au changement » (Lenz) | tient, et c'est la seule des trois qui serve — mais c'est une décroissance de 1 par tour : deux lignes |
| Stokes, les 180 arêtes, l'invariance de jauge | exacts, prouvés, et **jamais évalués en jeu** : la lecture ne lit qu'un contour et un scalaire |

Autrement dit : sur une dalle 9 × 9 à moitié pleine, dont la région praticable fait 20 cases, la marche est toujours **mince**, donc elle est tout entière son propre bord, et la loi de Faraday se réduit à *« les cases foulées s'éclairent, d'un plateau qui suit la distance parcourue, et s'éteignent en deux tours »*.

**Recommandation : livrer cette phrase, pas le réseau.** Trente lignes dans `brume.ts` (un ensemble, un plateau, une décroissance), trois contrôles, aucun module de plaquettes. Garder la dérivation dans ce document comme la **raison** — elle est ce qui justifie que l'intérieur ne s'éclaire jamais, que l'aura ne peut pas être une lampe portée, et que la coïncidence reste irremplaçable. Et garder `Σ_t ΔΦ_t = Φ(Ω_T)` comme le contrôle du module, parce que c'est une identité gratuite.

## 9. Décisions à trancher

| # | Décision | Recommandation |
|---|---|---|
| I1 | Le champ `B` : le relief (encercler) ou 1 par case (l'aire balayée) | **l'aire balayée**. Encercler est physiquement plus joli et mesuré mort : 5 % des batailles |
| I2 | La lecture : le conducteur seul, ou un cran de plus vers le dehors | **le conducteur seul**. C'est la seule des deux qui préserve le puzzle (0 % contre 16,7 %) et elle donne le meilleur gain de décision (66 % contre 41 %) |
| I3 | Le plateau : fixe, ou `rayon(ΔΦ, 8)` | **`rayon(ΔΦ, 8)`** : entier, déjà écrit, et il fait exactement ce que l'auteur demande — un déplacement plus visible quand il est plus ample |
| I4 | Lenz : décroissance de 1 par tour | **oui, fixe.** L'écran suit le joueur au lieu de se remplir ; deux tours d'extinction depuis le plateau 2 |
| I5 | L'aura règle-t-elle le plateau ? | **non.** Elle teinte (`souffle`), elle ne fixe rien — même objection que celle qui a écarté D4 |
| I6 | Où : les antres seulement, ou aussi la bataille | **les antres** (B4 dit déjà « antres seulement d'abord »). En bataille, un **rendu** et rien de plus : le moteur et le juge voient tout, toujours |
| I7 | Coder le réseau, ou la règle en deux lignes | **la règle.** §8 : la structure est dégénérée sur 9 × 9. Le réseau resterait juste et inutile |
| I8 | Retirer la règle 3 du §4 de `SPEC_BROUILLARD.md` (le soufre linéaire) | **oui, si I1–I2 passent.** L'induction la rend redondante ; sinon on empile deux lectures du même relief |

## 10. LIMITE

- **Le relief est public.** `dalleDe(étage)` est une fonction pure de l'étage : un joueur peut calculer la dalle entière hors ligne, et la règle du gardien est publique (B3 recommande de la dire). La brume — celle-ci comme celle de `SPEC_BROUILLARD.md` — est une **convention de présentation**, jamais une asymétrie d'information. Ce qui garde réellement l'antre est le **budget de trois coïncidences**, pas la nuit. Les chiffres du §5 mesurent donc un rythme de jeu, pas une sécurité, et il ne faut jamais les présenter autrement.
- **Le plafond mesuré est généreux.** Le remplissage de l'extérieur se fait en 4-connexité, ce qui compte plus de choses comme « encloses » que la convention de Jordan discrète ne l'autoriserait. V1 est donc encore plus morte que 42 %.
- **Les chiffres de jeu viennent d'un explorateur glouton**, pas d'un joueur. Un humain fera mieux sur le centre et moins bien sur le total ; l'ordre de grandeur tient, le détail non. Les mesures de bataille sortent en revanche du **vrai moteur** (`ouvrirBataille` / `jouer` / `finDePhase` / `chemin`), sans une ligne réécrite.
- **L'équilibrage n'est pas touché, et ce n'est pas une promesse.** L'induction est une fonction de l'ensemble des cases parcourues, évaluée **après** le tour ; elle n'ajoute aucun terme à `resoudreCoup`, aucune contrainte à `accessibles`, aucun octet à `traceBataille`. Le banc n'a donc rien à remesurer : |r| par axe sous 0,13, quartile `lame+ecu` 0,99×, coups médiane 2 / p95 4 restent ce qu'ils sont. La seule interaction possible serait une IA qui jouerait sous brume — elle ne le fera pas (I6).
- **Rien de tout cela n'engage.** La clarté ne se persiste pas, ne se signe pas, n'entre dans aucune graine ni aucune preuve, et se recalcule intégralement depuis l'ensemble des cases parcourues. Figures ≠ preuves : le gardien trouvé n'est pas le gardien battu, et seul `lireDuel` juge.
