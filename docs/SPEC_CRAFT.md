# La Forge — équipements de tiers, craftables

**Dépôt :** Oykdo/Eidos · **Statut :** conception, aucune ligne de code de jeu écrite · **Branche :** `tactique-moteur`
**Périmètre :** `atelier/` seul. Ni `eonis.py`, ni `genesis.json`, ni le carnet, ni la validation, ni `FORMAT 3`.
**S'appuie sur :** `equipement.ts`, `objets.ts`, `cosmos.ts`, `groupe.ts`, `resonance.ts`, `combat.ts`, `bestiaire.ts`, `capsules.ts`, `elixirs.ts`, `chymie.ts`, `coffre-horaire.ts`, `ancrage.ts`
**Hypothèse reçue :** le tier d'un objet est son **extrémité** — la distance de ses quatre axes au centre (16,16,16,16). Mesurée en parallèle dans `SPEC_LOOT_TIERS.md` ; les bornes du §3.7 sont à réconcilier avec ce document.
**Règle de lecture :** aucune phrase sans chiffre. Mesures : scratchpad, `node --experimental-strip-types`, 20 000 à 40 000 mots tirés de `sha256d("forge-" + i)`, rien d'écrit dans le dépôt.

## 0. En cinq lignes
**Composer ne monte pas l'extrémité : il la tire au sort.** r(ext entrée, ext sortie) = −0,041 ; deux généralistes composés donnent une médiane de 21 avec σ = 12,78. **Conjuguer ne la monte pas non plus, mais il la *vise* : il préserve exactement le plafond d'orbite** (0 déplacement de plus de 1 point sur 3 000) et redistribue les trois autres axes.
Le levier existe donc, et il est double : la **pierre** (composer par un générateur à 12,70°) déplace le **plafond**, la **conjugaison** monte l'extrémité **jusqu'à** ce plafond, jamais au-delà. Deux gestes, déjà tous les deux dans le code.
Une chaîne complète T1 → T9 demande **17 crafts en médiane** (76 % y arrivent en ≤ 40), soit **34 objets consommés** — le puits cherché.
**Un avertissement, mesuré :** à T9, 52 % des objets ont `lame+ecu ≥ 48` (77,1 % de victoires, `ETUDE_EQUILIBRAGE_TACTIQUE.md`) et 48 % ont `lame+ecu ≤ 15` (3,97 %). Comme le joueur **choisit** l'axe, 100 % des T9 forgés viseront `lame` ou `ecu`. La forge ne crée pas le trou du §9 ter ; elle en fait une chaîne de production.

---

## 1. Analyse — la forge existe déjà, elle n'est simplement pas une forge

Huit opérations transforment aujourd'hui un objet en un autre. Toutes respectent « un objet ne mute jamais » : elles consomment et produisent.

| # | Opération | Entrées | Sortie | Consomme | Graine | Fichier:ligne | Branchée |
|---|---|---|---|---|---|---|---|
| 1 | **Pierre qui tourne** | pièce + pierre (affixe T1–S3) | pièce neuve, `tourner(mot, affixe)` | les deux | aucune — l'affixe **est** la rotation | `equipement.ts:98`, `:200` | `store.ts:645`, `Inventaire.tsx` |
| 2 | **Gemme qui s'enchâsse** | pièce à alvéole + gemme | même pièce, un affixe de plus | la gemme | aucune | `equipement.ts:138`, `:208` | `store.ts:645` |
| 3 | **Lecture composée** | pièce + ses gemmes | `motEffectif` = `tourner` par gemme | rien (lecture) | aucune | `equipement.ts:143` | `fiche.ts:168`, `Inventaire.tsx:221` |
| 4 | **Philosophale** | coffre personnel 1–10 + nom d'arme | arme, 2 alvéoles, Satya | **rien** — c'est un don | `sha256d("eidos-divin/<maître>/<nom>")` | `equipement.ts:228` | `store.ts:659` |
| 5 | **Accord par le mercure** | capture + objet porté + élixir de mercure bu | capture neuve, `motDeQ(conjuguerPar(q_porté, q_capture))` | la capture (mot → `bus`) | aucune | `bestiaire.ts:138` | `store.ts:1056` |
| 6 | **Offrande à Terpsichore** | capture constructive avec le porté, chez Vénus majeure | une gemme | la capture | `sha256d("eidos-offrande/1" ‖ mot ‖ maître:n)` | `bestiaire.ts:183` | `store.ts:1067` |
| 7 | **Forge d'Érato** | gemme + élixir de sel | capsule au mot de la gemme | les deux | aucune | `capsules.ts:131` | `store.ts:1030` |
| 8 | **Coffre horaire** | tête signée + pièce + preuve | *t* objets, t = 1 + zéros de tête | rien (robinet) | `sha256d("eidos-coffre/1" ‖ id_bloc ‖ txid ‖ rang)` | `coffre-horaire.ts:166` | `store.ts:785` |

**Le fait qui commande tout le reste : l'opération 5 est déjà une conjugaison.** Le mercure fait, sur une capture, exactement le geste que le §3 va montrer être le seul levier d'extrémité contrôlé du dépôt. Il n'est ni nommé, ni visé, ni payé, et il ne sert qu'aux captures.

### 1.2 Ce qui manque — quatre trous, pas un
- **Pas de coût.** Le craft 1 consomme une pierre, mais `inventaire.ts:111` **donne** une pierre à chaque hauteur, en plus de la pièce. Débit d'entrée ≥ débit de sortie : ce n'est pas un puits, c'est un tapis roulant.
- **Pas d'échec.** Les seuls refus sont typologiques : `"type" | "socket" | "vide"` (`equipement.ts:187`). Rien ne peut rater ; rien n'a donc d'enjeu.
- **Pas de progression.** Les six affixes du premier craft sont ceux du dernier. Aucune notion de palier — `RARETES` lit la **proximité au catalogue**, mesurée entre 85 et 100 avec σ = 2,67, deux paliers sur cinq inatteignables : une dimension vide, pas un tier.
- **Pas de visée.** Le joueur applique la rotation de la pierre qu'il possède. Il ne choisit pas de but ; il subit une géométrie.

---

## 2. Le levier mathématique — mesuré

`ext(mot) = Σ|axe − 16| / 2`, dans 0..48. **Elle ne dépend que du mot** : la permutation d'archétype (`combat.ts:PERM`) ne change pas une somme de valeurs absolues. Référence sur 20 000 mots : min 0, médiane **15**, moyenne 15,75, σ 6,86, max 45.

**Le plafond d'orbite.** `conjuguerPar` préserve la partie réelle : |q₀| conservé à 1 près dans **97,03 %** des cas après arrondi de `motDeQ`. L'extrémité maximale atteignable à orbite constante est donc celle de la répartition `(|q₀|, |v|, 0, 0)` — je l'appelle le **plafond**. Mesuré : **32 pour 65 % des objets** (26 027 / 40 000), p90 = 43, max 48. Marge médiane plafond − ext = **19 points**.

| opération | ce qu'elle fait à l'extrémité | mesure |
|---|---|---|
| `composer(a, b)`, deux mots quelconques | **la tire au sort** | r(ext a, ext c) = **−0,041** ; r(ext a + ext b, ext c) = −0,043 ; au-dessus du max des entrées 36,93 %, sous le min 24,94 % ; deux généralistes (ext ≤ 6) → médiane 21, **σ 12,78** |
| `tourner(mot, affixe)` — pierre, 12,70° | **la déplace finement** | \|Δext\| médiane **2**, max 7 ; 43,06 % des tours montent ; escalade gloutonne : 16,1 → **29,1** en 8 pas, puis plateau |
| `conjuguerPar(g, q)` | **ne touche pas au plafond** | Δplafond : médiane 0, max **1**, σ 0,02 sur 4 000 ; ext libre en dessous |
| `tourner`, objectif *concentration* | **monte le plafond** | 6 tours : plafond médian 32 → **47** ; part des objets à plafond ≥ 39 (T9 possible) : 19,0 % → **81,0 %** ; saturation à 12 tours (45,3) |

**Verdict.** La question centrale a une réponse nette et elle n'est pas celle qu'on espérait : *composer ne monte pas l'extrémité*. Mais l'opération cherchée existe quand même, en deux temps qui ne sont pas interchangeables :

> **La pierre change l'orbite — donc le plafond. La conjugaison monte jusqu'au plafond — donc vise.**

Et l'orbite décide de ce qu'on peut viser : quand `|q₀| > |v|` (**13,19 %** des objets), la pointe ne peut être que l'axe porté par la composante 0, c'est-à-dire `PERM[archétype][0]` — `lame` pour jupiter et mars, `écu` pour saturne, lune et terre, `éperon` pour vénus et mercure, `arc` pour uranie et soleil. **L'archétype dit quel axe l'orbite protège.**

---

## 3. Conception — la Forge

### 3.1 Les deux gestes
Rien de neuf : deux fonctions déjà écrites, nommées et payées.

- **Tourner** (`tourner`, `equipement.ts:98`) — une pierre, 12,70°, six directions. Change l'orbite, donc le plafond. Δplafond nul dans 64,1 % des tours, de −6 à +7 sinon.
- **Viser** (`conjuguerPar`, `groupe.ts:47`) — conserve l'orbite, redistribue les trois autres axes. L'axe protégé lui-même bouge de **4,55 points en moyenne** (médiane 5, max 9) sur 32 conjugaisons : quasi fixe, pas fixe.

### 3.2 La recette de montée de tier
Entrées : une **base** (l'objet à monter), un **réactif** (n'importe quel objet du coffre, hors `capture`, `elixir`, `capsule`), une **pierre**, et un **axe visé** parmi les quatre. Sortie : **un objet neuf**. Les trois entrées disparaissent, la base comprise — un objet ne mute pas, il est consommé.

```
graine = SHA-256d( "eidos-forge/1" ‖ id_bloc(32) ‖ mot_base(4) ‖ mot_réactif(4)
                                   ‖ mot_pierre(4) ‖ axe(1) )
m₁     = tourner(mot_base, affixe_de_la_pierre)          // l'orbite bouge : la pierre décide, pas le joueur
gₖ     = quadrupleDepuis( SHA-256d( graine ‖ k(4) ) )    // k = 0..15, norme exactement 10⁸, entiers
m₂     = celui des motDeQ( conjuguerPar(gₖ, m₁) ) dont |composante_visée| est la plus grande
                                                        // à égalité, le plus petit k
```

Tout est entier : `quadrupleDepuis` est le générateur du catalogue (`cosmos.ts:141`, BigInt, norme `ATOMES`), `conjuguerPar` est du BigInt, `motDeQ` renormalise à `Q_SCALE` par arrondi entier. Aucun flottant, rejouable à l'octet, **0,53 ms par craft** à K = 16.

**Résultat mesuré (2 000 crafts, K = 16) :** tier +1 ou mieux **60,9 %**, égal 23,9 %, recule **15,2 %** (jusqu'à −6). L'axe visé devient la pointe dans **67,8 %** des cas. K est le seul réglage : K = 8 → +1 dans 49,0 %, K = 32 → 70,9 %. *Recommandation : K = 16.*

### 3.3 Viser sans dé — la distinction, parce qu'elle est le cœur
Il n'y a pas de dé, et il n'y a pas non plus de garantie. Les deux tiennent ensemble pour une raison arithmétique, pas rhétorique :

1. **Le déterminisme vient de la graine.** Même bloc, même base, même réactif, même pierre, même axe ⇒ même mot, sur toute machine, pour toujours. Le juge est le même code que la forge.
2. **L'incertitude vient du réseau entier.** Il n'existe **aucune** rotation entière exacte qui amène `v` sur un axe : la sphère de norme 10⁸ est un réseau, pas un continu. La forge cherche donc le meilleur des K candidats d'un réseau fini. Combien elle en trouve dépend du réseau au voisinage de ce mot-là, que le joueur ne calcule pas d'avance — et pas d'un hasard qu'on lui cacherait.
3. **Le plafond, lui, est calculable.** Un joueur qui lit son |q₀| sait avant de forger si T9 lui est accessible. C'est la décision D2 (§5) : l'afficher ou non.

Ce n'est donc pas « 61 % de chance » : c'est « 61 % des situations où la géométrie coopère ». La statistique est une lecture *a posteriori* sur 2 000 mots, pas une règle du jeu. **Aucune probabilité n'entre dans le code.**

### 3.4 Le coût, donc le puits
**Un craft consomme deux objets nets** : le réactif et la pierre (la base est détruite et remplacée). Chaîne complète mesurée, K = 16, axe visé constant : **médiane 17 crafts**, p75 = 26, p90 = 32 ; 304 objets sur 400 atteignent T9 en ≤ 40 crafts. Soit **34 objets consommés pour un T9**, 64 au p90, **jamais** pour 24 % des mots de départ.

Face au robinet : `inventaire.ts` donne 1 pièce + 1 pierre par hauteur et par coffre, le coffre horaire donne Σ t·2⁻ᵗ ≈ **1,99 objet par pièce et par bloc** — environ **2 objets par heure et par pièce**. Un T9 coûte donc **17 heures de robinet à une pièce**, et le nombre de pièces est borné par `SPEC_SYBIL.md` : le robinet en donne une par compte GitHub et par cycle (1008 blocs ≈ 42 jours).

Ce débit est le bon pour trois raisons chiffrées : (a) il est **inférieur au puits de la permadeath** — une bataille de 6 à 10 feuilles, 6 à 8 batailles par arbre, une unité tombée est brûlée : un arbre consomme plus d'unités qu'une pièce n'en forge en 8 heures ; (b) il **échoue** — 24 % des lignées n'atteignent jamais T9, donc les objets consommés sont perdus sans contrepartie, ce qu'aucun puits déterministe à 100 % ne fait ; (c) il **ne se parallélise pas** : deux machines sur la même pièce donnent le même coffre (`SPEC_COFFRE_HORAIRE.md` §5), il faut multiplier les pièces.

### 3.5 Les emplacements — la tenue conjuguée
C'est le point délicat, et la loi de conservation le tranche seule.

> **Un équipement ne donne rien. Il tourne.** La tenue de combat d'une unité est son mot **conjugué**, dans l'ordre canonique des emplacements, par le mot de chaque pièce portée :
> `tenue = motDeQ( conjuguerPar(q_pièce_n, … conjuguerPar(q_pièce_1, q_unité)) )`

Ce que ça garantit, mesuré sur 3 000 unités à 4 pièces :
- **la somme des quatre axes vaut 64 : 0 violation.** Une conjugaison est une rotation ; elle redistribue, elle n'ajoute pas. La loi tient *par construction*, pas par vérification ;
- **le plafond d'orbite de l'unité ne bouge pas : 0 déplacement de plus de 1 point.** Aucun équipement, aucune quantité d'équipement, ne rend une unité plus extrême que son propre mot ne le permet. **L'orbite ne s'achète pas** ;
- **l'ordre des emplacements compte : 100 %** des paires (a,b) donnent une tenue différente de (b,a). Le rangement est une décision de build, pas un détail d'affichage.

Combien d'emplacements comptent ? La géométrie répond sans qu'on pose de règle. Sac de 24 objets, choix glouton vers un axe : 1 pièce atteint **64,8 %** du plafond, 2 pièces **68,5 %**, 3 pièces 69,4 %, 4 pièces **69,45 %**. La 3ᵉ pièce vaut +0,9 point, la 4ᵉ +0,06. **Il n'y a pas de bonus de panoplie à interdire : il n'y en a pas.** Les dix emplacements de `equipement.ts:43` restent la couche de collection ; `SOCKETS_MAX = 2` est déjà, sans que personne l'ait su, la saturation mesurée.

**Ce qu'il faut changer :** `motEffectif` (`equipement.ts:143`) applique aujourd'hui `tourner` — donc `composer`. Mesure : composer déplace le plafond dans **58,1 %** des cas, jusqu'à ±16 points. Autrement dit, dans le code actuel, **une gemme achète l'identité de la pièce**. Passer de `tourner` à `conjuguerPar` ferme ce trou et c'est le seul changement de comportement de tout ce document.

### 3.6 La lecture — ce qui doit s'afficher
Une fiche d'unité (`fiche.ts`), quatre chiffres et un mot :

| donnée | calcul | pourquoi |
|---|---|---|
| **tier** 1–9 + son nom | `tierDe(ext)` | l'identité de lecture |
| **axe pointé** | `combatDe().pointe` | ce qu'elle sait faire |
| **quatre axes**, somme 64 | `combatDe()` | ce qu'elle perd ailleurs |
| **plafond** et **marge** | `(|q₀|, |v|, 0, 0)` ; plafond − ext | *ce qu'elle pourra jamais devenir* — la donnée qui manque partout aujourd'hui |
| **axe protégé** | `PERM[archétype][0]` | l'axe que l'équipement ne rendra pas |

Une fiche d'équipement, trois chiffres : la **torsion** en millièmes (`1000·|q₀|/|q|`, entier, même patron qu'`alignementCentiemes`), l'**axe de rotation** lu comme le plus proche des quatre, et le **delta des quatre axes** sur l'unité sélectionnée, calculé avant de poser. Trois figures, aucune promesse : un équipement n'a pas de « puissance » à afficher, il n'en a pas.

### 3.7 Les neuf noms
Registre existant, aucun lexique neuf : les **neuf substances de la plaque** (`chymie.ts`, les 64 signes), rangées par concentration croissante. Elles ne collisionnent ni avec les neuf muses (déjà prises par les tiers du coffre horaire), ni avec `RARETES` (proximité au catalogue), ni avec `REGIMES`. FR et EN sont déjà écrits dans `chymie.ts` et le signe Unicode aussi. Aucun des mots bannis.

| tier | ext | part mesurée | clé i18n | FR | EN | signe de la plaque (`chymie.ts`) |
|---|---|---|---|---|---|---|
| 1 | 0–15 | 51,56 % | `forge.tier.1` | Cendres | Ashes | `cendres` U+1F757 |
| 2 | 16–20 | 25,29 % | `forge.tier.2` | Amalgame | Amalgam | `amalgame` U+1F75B |
| 3 | 21–24 | 11,77 % | `forge.tier.3` | Poudre | Powder | `poudre` U+1F74B |
| 4 | 25–27 | 5,62 % | `forge.tier.4` | Chaux | Lime | `chaux` U+1F741 |
| 5 | 28–30 | 3,26 % | `forge.tier.5` | Vitriol | Vitriol | `vitriol` U+1F716 |
| 6 | 31–32 | 1,03 % | `forge.tier.6` | Cinnabre | Cinnabar | `cinnabre` U+1F713 |
| 7 | 33–35 | 0,79 % | `forge.tier.7` | Esprit de vin | Spirit of wine | `esprit` U+1F747 |
| 8 | 36–37 | 0,32 % | `forge.tier.8` | Soufre des sages | Sophic sulfur | `soufresages` U+1F70E |
| 9 | ≥ 38 | 0,38 % | `forge.tier.9` | Quinte essence | Quintessence | `quintessence` U+1F700 |

Bornes calées sur la loi 2⁻ᵗ du coffre horaire (§3 de `SPEC_COFFRE_HORAIRE.md`) : cible 50 / 25 / 12,5 / 6,25 / 3,125 / 1,56 / 0,78 / 0,39 / 0,39. Le seul écart notable est T6 (1,03 contre 1,56) : ext = 32 est un **atome** de la distribution, le plafond de 65 % des objets. La pointe canonique **55/3/3/3 vaut ext 39**, donc T9 — la thèse et la mesure se recoupent.

---

## 4. Ce que ça casse, et le découpage

| PR | Contenu | Fichiers | Contrôles `doit échouer` à ajouter |
|---|---|---|---|
| 1 | `tier.ts` — `extremiteDe`, `plafondDe`, `tierDe`, les 8 bornes, vecteurs gelés | `tier.ts`, `tier.test.ts`, `integrite.ts`, `package.json` | borne hors 0..48 ; tier hors 1..9 ; mot dont la somme des axes ≠ 64 |
| 2 | `forge.ts` — `forger(base, réactif, pierre, axe, graine)`, K = 16 | `forge.ts`, `forge.test.ts`, `i18n.ts` | base = réactif ; réactif absent ; pierre absente ; axe hors 0..3 ; graine < 32 o ; base de genre `capture`/`elixir`/`capsule` ; deux crafts de la même graine donnant deux mots |
| 3 | **la tenue conjuguée** — `motEffectif` → `tenueDe`, ordre canonique | `equipement.ts`, `fiche.ts`, `combat.ts`, `Inventaire.tsx`, 3 `.test.ts` | deux pièces au même emplacement ; somme ≠ 64 ; plafond déplacé de plus de 1 |
| 4 | lecture — plafond, marge, axe protégé, torsion ; i18n FR/EN des 9 tiers | `fiche.ts`, `i18n.ts`, `i18n.test.ts` | clé FR sans EN ; valeur vide ; mot banni |
| 5 | le puits — refus si le coffre n'a pas les trois entrées, compteur par tête | `forge.ts`, `store.ts`, `jauge.ts` | craft sans tête suivie ; deuxième craft de la même base |
| 6 | *(dépend de D3)* forge ancrée + lignée | `ancrage.ts`, `forge.ts` | lien sur une pièce dépensée ; deux lignées d'une même origine |

**Ce qui casse vraiment**, et il n'y en a qu'un : la PR 3. `motEffectif` change de sémantique ; `fiche.ts:168`, `fiche.ts:276`, `Inventaire.tsx:221` et leurs tests suivent. Tout le reste est additif. `integrite.ts` gagne une constante (les huit bornes), **aucune loi n'est retirée** et la sixième (résonance) n'est pas touchée. Le nœud, la chaîne, le carnet, `vecteurs.json` : pas un octet. Chaque nouveau `.test.ts` s'ajoute à la main dans `package.json` et dans `CLAUDE.md` §2.

---

## 5. Décisions à trancher

**D1 — Le prix des axes, avant ou après la forge ?** À T9, 52,2 % des objets ont `lame+ecu ≥ 48` (77,1 % de victoires) et 47,8 % ont `≤ 15` (3,97 %) : le tier **polarise** exactement sur le trou mesuré du §9 ter. Et comme le joueur choisit l'axe, un T9 forgé donnera 58 s'il vise `lame` ou `écu`, 6 s'il vise `éperon` ou `arc` — personne ne visera les seconds. *Recommandation : geler la PR 2 tant que R2 de `ETUDE_EQUILIBRAGE_TACTIQUE.md` n'est pas tenu (|r| par axe < 0,30 ; quartiles de `lame+ecu` < 3×). Les PR 1, 3 et 4 ne dépendent pas de D1 et peuvent partir.*

**D2 — Le plafond est-il affiché ?** Un joueur qui voit son plafond ne rate plus jamais un craft impossible : le craft devient un puzzle d'optimisation, ce qui est un bon jeu mais un autre jeu. Trois sorties : (a) l'afficher — honnête, le code est public de toute façon, et cacher un calculable est du théâtre ; (b) ne pas l'afficher ; (c) l'ouvrir à Uranie, comme la lecture des 101 formes s'ouvre à 21 cellules — un savoir qui se gagne. *Recommandation : (a) pour l'unité qu'on tient, (c) pour celle qu'on convoite sur le marché.*

**D3 — Deux forges, ou une ?** Un craft **libre** (graine sans `id_bloc`) est gratuit, instantané, intransférable — la jauge. Un craft **ancré** (graine avec `id_bloc`, une pièce prouvée) hérite du frein Sybil et devient exportable, donc échangeable par la lignée de D6. Le patron existe déjà à l'identique dans `ancrage.ts` et `coffre-horaire.ts`. *Recommandation : les deux, avec la même fonction et deux graines — sinon le marché de D6 n'a rien à vendre que le robinet ne donne.*

---

## LIMITE
- **Le tier n'est pas la force, mais il en est le véhicule.** La mesure du §5/D1 le dit sans détour : la forge n'invente pas le déséquilibre des axes, elle industrialise celui qui existe. Écrire « un tier haut n'est pas plus fort » sans corriger le prix des axes serait un texte qui promet plus que le code — donc, par la règle du dépôt, un texte qui a tort.
- **Les bornes du §3.7 sont provisoires.** Elles sortent de 40 000 mots de `sha256d("forge-" + i)`, pas du tirage réel (`graineTirage(sig, hashBloc)`). `SPEC_LOOT_TIERS.md` est la source ; en cas d'écart, c'est ce document-ci qui se corrige.
- **K = 16 est un réglage, pas une loi.** Il fixe le taux de réussite (49 % à K = 8, 70,9 % à K = 32) et le coût (0,26 à 1,02 ms). Une fois publié il est gelé : le changer change tous les objets déjà forgés.
- **`quadrupleDepuis` n'est pas prouvé uniforme sur SO(3).** Huit facteurs de norme 2 et huit de norme 5 : le nuage de candidats est un réseau, pas une sphère. Les 68 % de visée réussie mesurent ce réseau-là.
- **La conjugaison arrondit.** `motDeQ` renormalise à `Q_SCALE = 724` : |q₀| n'est conservé exactement que dans 97,03 % des cas, et 0,15 % des conjugaisons rendent le mot d'entrée. Un contrôle doit refuser le craft sans effet plutôt que consommer trois objets pour rien.
- **Rien ici n'est une preuve.** La forge vit dans la jauge du coffre. Seuls le sceau, la pièce et la tête signée engagent — et, si D3 passe, la lignée.
