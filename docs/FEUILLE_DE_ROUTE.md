# Feuille de route — l'état vrai, les dettes, la suite

**Dépôt :** Oykdo/Eidos · **Écrite le 2026-09-10**, contre le code de `fa1fa58`, sur `main` · remplace la feuille-journal du 2026-09-08.
**À lire avant d'ouvrir un chantier**, avec `CLAUDE.md` (les invariants) et la spec du chantier visé.
**Ce fichier n'est pas un journal.** L'histoire détaillée des chantiers faits vit dans git et dans les documents cités ; elle tient ici en une ligne chacun (§6). Ce qui occupe la place, c'est ce qui reste ouvert.

---

## 0. Eidos aujourd'hui, en cinq lignes

1. Une **chaîne** qui tourne : émission bornée sans halving (`R(h) = a + (a/2)·cos(2π(h−h₀)/T)`, `T = 1008`, `h₀ = 492`), quatre âges, **2 096 640 blocs**, **62 899 200 EIDL**, **239,18 ans** à un bloc par heure. Consensus fédéré à sept validateurs, signatures par hachage pur, aucune courbe elliptique. Rejeu local : **98 blocs revalidés, aucun refus**, hauteur 97.
2. Un **atelier** qui rejoue la spec à l'octet en TypeScript : **568 tests, 119 suites, 0 échec**, 78 fichiers `.test.ts` tous listés dans `package.json`, parité Python ↔ TS contrôlée par `vecteurs.json` (10 familles) dans les deux sens en CI.
3. Un **jeu** dont la jauge est hors feuille et dont seuls les sceaux et les preuves exportées engagent : la Tour, la Veillée (arbre XMSS de 64 feuilles, une clé signe une fois et c'est la vie), et depuis peu un **moteur tactique au tour par tour** — 95 contrôles, 77 refus, zéro dé.
4. Ce qui manque n'est pas du code, c'est du **branchement et du prix** : le moteur tactique, `tiers.ts` et `lignee.ts` n'ont aucun importateur hors de leurs tests ; `reliques.json` et `veillees/index.json` sont vides ; l'eidôlon n'achète encore rien.
5. Ce qui est faux est **documenté et chiffré** : une adresse a quatre écritures glyphiques valides au lieu d'une, le pas double dépasse la portée la plus longue, et deux documents de référence annoncent des compteurs périmés.

### La règle qui gouverne cette feuille

**Rien n'entre sans une cible chiffrée annoncée d'avance, et sans la mesure qui le tuerait.** Une idée sans seuil n'est pas un chantier, c'est une intention. Un résultat négatif est un livrable : les §1.4 et §5 en sont faits, et ils valent autant que le code écrit.

Trois corollaires, tous déjà des règles du dépôt :

- **Figures ≠ preuves.** Un rang, une aura, un tier, un compte de validateurs sont des lectures. Seuls le carnet, la chaîne et les signatures engagent.
- **Rien ne se croit, tout se rejoue.** Une mesure qui ne vit que dans un scratchpad n'est pas une mesure du dépôt (§2, dette D3).
- **Quand un texte promet plus que le code, c'est le texte qui a tort.** Toute ligne de ce document contredite par une mesure est fausse par construction : on corrige le document, pas la mesure.

---

## 1. L'état vrai

Quatre états, aucun autre. **code** : écrit, testé, rejouable. **spécifié** : un document chiffré, zéro ligne de code. **mesuré-et-écarté** : éprouvé sur le vrai moteur ou la vraie chaîne, refusé par un chiffre. **cassé** : le code et le texte se contredisent, ou une règle annoncée n'est gardée par rien.

### 1.1 La chaîne — code

| Sujet | Le chiffre | Où il se rejoue |
|---|---|---|
| Émission bornée, sans halving | 2 080 époques × 1008 = **2 096 640 blocs**, **62 899 200 EIDL**, 239,18 ans ; cosinus en `Decimal` par série de Taylor, π à 68 décimales, **aucun `math.cos`** | `verify_genesis.py` → 32 contrôles ; `eonis.py` → 6 ; `eonis.py` gelé (SHA `cc94ad1e…` dans `genesis.json`) |
| Conservation `Σ utxo == émission cumulée` | invariant **vrai** en local (h 45, 46 blocs, 47 sorties) et en ligne (h 93, 94 blocs) ; coinbase refusée à l'atome près | `utxo.py` → 16 ; `noeud.py --verifier` → « aucun refus » |
| Rejeu intégral, carnet jamais persisté | **98 blocs revalidés** en local par le même code qu'à la forge | `noeud.py --verifier` |
| Une clé WOTS+ ne signe qu'une fois | l'**adresse** est notée dans `cles_usees`, donc le refus vaut aussi sur le chemin assume-valid de `--depuis` | `utxo.py:239` ; `noeud.py:831` (`_test_depuis`, 4 contrôles) |
| Consensus fédéré XMSS, vivacité, tête signée | 7 validateurs, hauteur MSS 12, créneau 3600 s, **9,35 ms par bloc** signature + vérification | `federation.py` → 18 |
| Rotation de pas 3 | `V[(3·s) mod n]`, refus au chargement si `n % 3 == 0`, rotation prouvée surjective | `federation.py:266`, contrôle `:453` |
| Un indice MSS ne sert qu'une fois | `CompteurMSS` monotone, écrit avant de rendre la signature, départ = max(chaîne, fichier) | `noeud.py` `_test_indice` → 2 |
| Cadence réelle | **86 créneaux, 86 blocs depuis le créneau 62** ; avant lui, 54 créneaux (8→61) définitivement vides, jamais rattrapés ; le cron passe toutes les 3 à 5 h et rattrape par rafales de 6 | `etat.json` en ligne : `creneaux_sautes` = 54 |
| Robinet à deux canaux | 15 + 6 contrôles ; corps d'issue jamais interpolé (`EIDOS_ISSUE_BODY`), frein par auteur (une demande servie par compte et par époque) | `robinet.py --test`, `courriel.py --test` |
| Parité Python ↔ TS à l'octet | 10 familles, écrites par Python, relues par TS, dans les deux sens en CI | `vecteurs.py`, `vecteurs.test.ts`, job `parite` |
| Reliques QR, encodeur QR stdlib | 3 + 5 contrôles ; `reliques.json` ne contient effectivement **aucune graine** | `relique.py --test`, `qr.py --test` |
| Labo pendule-9 | **53 contrôles** = 11 + 11 + 9 + 13 + 9 ; le pont TS → Python compare les exports **octet à octet** | `labo/`, `.github/workflows/labo.yml` |
| Le prix des axes, sur le couple moteur + politique | **440 320 duels** et 1 200 mêlées par configuration, `ia.ts` des deux côtés, deux sièges ; depuis C2 ter (2026-09-14) `\|r\|` max **0,145** (eperon −0,128, arc +0,145), bande de tier 32,4 pt, 0 nul — la veille −0,640 / +0,591 ; un échantillon de 15 616 duels rejoué par la CI en ~30 s | `atelier/scripts/banc-r2.ts` (`npm run banc-r2`), `banc-r2.test.ts` |

### 1.2 L'atelier et le jeu — code

| Sujet | Le chiffre |
|---|---|
| Suite complète | **568 tests, 119 suites, 0 échec** ; `typecheck` vert ; 77 `.test.ts` sous `src` + 1 sous `scripts/` (le banc, C3), **78 listés** dans `package.json` (aucun test orphelin) |
| Six lois gelées | `conservation, groupe, doxa, sceau, epoques, resonance`, dans cet ordre, 7 contrôles ; `integrite.ts` lève au chargement si `NORME !== ATOMES` ; la loi 6 vérifie explicitement qu'il n'existe **pas** de champ `bonus` |
| Somme des quatre axes | **64, toujours** : répartition au plus fort reste sur `COMBAT_BUDGET`, l'archétype **permute** et ne multiplie pas ; **400 000 objets tirés, 0 violation, 0 axe négatif** |
| Zéro dé | `Math.random` : **une seule occurrence** dans tout `atelier/src`, dans le texte d'un docstring qui l'interdit. Les horloges sont des paramètres injectables (`ts = Date.now()`) |
| Ancrage | `sha256d("eidos-ascension/1" ‖ id_bloc ‖ txid ‖ rang)` — une tête signée et une pièce prouvée, **rien du coffre, rien de la machine**, aucune empreinte de navigateur dans le dépôt |
| La Veillée | arbre XMSS de 64 feuilles, même construction qu'une clé de validateur ; le juge refuse un indice répété **ou un trou** ; l'UI distingue run ancré et run libre et n'exporte que l'ancré |
| Moteur tactique | 95 contrôles (bataille 44 / grille 18 / unité 17 / ia 16), **77 refus contrôlés**, toutes divisions en `Math.trunc`, immuabilité stricte, `traceBataille` = SHA-256d de l'échiquier ; `bataille.ts` n'importe **rien** d'`ia.ts` |
| Tiers | 12 paliers d'extrémité `E3 = Σ(axe−16)²`, loi 2⁻ᵗ tenue à ~10 % sur onze tiers (T10 mesuré **1/1090** contre 1/1024 annoncé), plancher de proximité **78** exact ; 16 contrôles |
| Lignée | un objet est tenu par une sortie ; changer de mains, c'est dépenser cette sortie. La duplication échoue **parce que c'est une double dépense**, pas par une règle neuve. 12 contrôles |
| Chymie | **12 espèces** d'élixir lues dans les trois étages d'un glyphe (aucune cellule vide, 12,50 % → 3,125 %), 64 caractères de la plaque, bijection contrôlée |
| Équipement | 547 lignes, 55 exports, 23 contrôles, 136 assertions ; limite déclarée : T et S donnent le même plafond d'orbite, donc **78 affixes ne valent que 39 leviers** |

### 1.3 Spécifié — un document chiffré, zéro ligne de code

| Document | Ce qu'il fixe | Le chiffre qui commande | Décisions ouvertes |
|---|---|---|---|
| `SPEC_PUITS.md` | ce qui absorbe les eidôla | **192 transactions par jour** pour tout le réseau (`MAX_ENVOIS = 8`) et 120 EIDL/jour ; une sortie coûte 28 o contre 2 283 o pour une transaction — **81,5×** ; point fixe **s = 0,1115 EIDL/joueur/jour**, soit 1 076 joueurs | 6 (§7) |
| `SPEC_MOISSON.md` | ce qui sort du trésor | le trésor garde **99,894 1 %** de l'émission ; hors-trésor à h = 45 : **1,00 EIDL**, un seul compte servi depuis la genèse | 3 |
| `SPEC_CRAFT.md` | la forge | T1 → T9 en **17 crafts médians**, 34 objets consommés ; conjuguer **vise** sans dépasser le plafond d'orbite (0 déplacement > 1 point sur 3 000) | 3 (D1 bloquante) |
| `SPEC_LOOT_TIERS.md` | la rareté comme extrémité | **2 149 582 852** mots canoniques, 47 858 profils sur 47 905 ; `r(tier, victoire) = −0,161` — un T12 ne gagne pas plus, il gagne **ailleurs** (σ 16,8 → 34,6) | 5 |
| `SPEC_FORUM.md` | échanger entre joueurs | un échange = **une transaction à deux témoins**, atomique par construction (le format porte déjà `flag = 0`) | 7 (F1–F7) |
| `SPEC_MUSES.md` | la classe qu'Eidos avait déjà | `combat.ts:64` : la muse **permute les quatre axes** — la seule progression que la conservation autorise | à ouvrir |
| `SPEC_AURA_GRADUELLE.md` | l'aura comme lecture de ce qui est dépensé | `A(c) = max(0, R − d∞)`, `R ∈ 0..3`, plateaux entiers, aucune horloge | 10 (D1–D10), contrôles K48–K56 |
| `SPEC_BROUILLARD.md` | la lampe et Earnshaw | les neuf cases centrales restent noires | 5 (B1–B5) |
| `SPEC_TACTIQUE.md` | le jeu autour du moteur | D1, D2, D6 tranchées le 2026-09-10 ; découpage en 7 PR, 3 500 à 5 300 lignes dont ~40 % de tests | D3, D4, D5 |

À côté d'eux, quatre études sans décision en attente : `ETUDE_ECHANGE_OBJETS.md` (option (d) retenue, **codée** en `lignee.ts`), `ETUDE_EQUILIBRAGE_TACTIQUE.md`, `ETUDE_MOBILITE.md`, `ETUDE_POLYBE_FRACTALE.md`.

### 1.4 Mesuré-et-écarté

| Ce qui a été éprouvé | Le chiffre qui l'écarte |
|---|---|
| L'extrémité d'un mot comme **sidegrade** | 330 144 duels : victoire **55,6 % → 19,5 %** du tier le plus bas au plus haut, et **93,9 % → 57,6 % dans la niche**. L'agrandissement des salles (19,8 → 56,8 cases d'un tenant) ne referme la niche que de 41,5 à 36,4 pt. La cause est arithmétique : abattre est un produit, concentrer un budget fixe minore un produit |
| Les **démarches singulières** (cavalier, fou) | théorème : le seul jeu de 4 vecteurs clos par le quart de tour qui engendre Z² est {±(1,0), ±(0,1)} ; à compte constant `r(eperon)` passe de +0,106 à **+0,736**, à rayon constant **30 % des duels ne se concluent plus**, et le gain de décision est **négatif** (1,45 contre 1,50) |
| **Sierpiński** base 2 sur la dalle 9 × 9 | perd son auto-similarité (blocs `766\|623\|634`) et **aggrave** : bande de tier 24,4 → **35,3 pt** |
| Le **carré de Gahn** (substitution par les mots) | bande 29,9 → 28,0 pt, décision +0,3 pt, et sa forme est un **classement déguisé** (rapport 64× entre lignes) |
| La **Poussière de Cantor** et le **Guet** — recommandés en septembre, retirés depuis | ne se reproduisent pas sur le moteur d'aujourd'hui : bandes 42,35 et 42,92 pt contre **37,75 sans motif** ; activation 31,80 % → **16,06 %** ; le témoin « +2 partout » rend le meilleur `\|r\|` du lot (0,142) en ne dictant rien |
| Le **réseau d'induction** dans la brume | 42 % des étages seulement peuvent enclore quoi que ce soit, l'induction s'allume dans **5 %** des batailles, et un cran de plus offre le gardien sur 16,7 % des étages : « payer un module pour une règle de deux lignes » |
| Le **dos gradué** et `CHARGE_PAR_CASE = 7` | écartés par la mesure (commit `abf2226`) |
| La **forge payée** (P5) et la **3ᵉ alvéole** (P6) | P5 : 59 tx/jour à N = 1 000 sur 192 disponibles — pas de place, et elle achète le trou. P6 : la 3ᵉ pièce vaut **+0,9 pt** de plafond, la 4ᵉ +0,06 |
| La **résurrection** comme puits | elle rachète la permadeath, aujourd'hui le seul puits **réel** du jeu |
| **Neuf tiers** au lieu de douze | sommet à 1 sur 259 — moins rare que la queue actuelle |

### 1.5 Cassé

Cinq écarts entre ce que le dépôt annonce et ce que le dépôt fait, dont deux fermés le 2026-09-13. Chacun est une dette au §2 : **D1** le bourrage glyphique (fermée), **D2** le pas double (reformulée), **D4** la racine UTXO conditionnelle, **D6** le sac à deux tailles (fermée), **D9** le prix des axes renversé (fermée le 2026-09-14 par C2 ter). S'y ajoutent trois textes périmés (**D5**) et deux freins absents (**D7**).

---

## 2. Les dettes, par gravité

### D1 — Une adresse a quatre écritures valides, et rien ne le refuse — **FERMÉE le 2026-09-13**

**Le fait.** La proposition 3 promet « bourrage du 27ᵉ glyphe nul **sinon refus** ». Le refus n'existe nulle part. Une adresse fait 160 bits, 27 groupes de 6 en portent **162** : les deux derniers bits sont silencieusement jetés (`eonis.py:161` `bits[: nbytes*8]`, `glyphs.ts:31` `bits.slice(0, n*8)`). Sonde : les quatre figures en 3ᵉ position du 27ᵉ glyphe donnent **quatre écritures acceptées** pour la même adresse `1a56415346085a7a`, **des deux côtés**. `addr_decode` (`utxo.py:73`) ne compte même pas les groupes.
**Ce que ça coûte aujourd'hui.** Rien sur le consensus : l'adresse décodée est la même, la somme de contrôle passe, aucune double dépense. Ce qui est cassé, c'est l'**unicité de lecture** — la seule chose que la proposition 3 promettait.
**Le correctif, sans toucher au fichier gelé.** Refuser dans les décodeurs d'**adresse**, pas dans `eonis.decode_glyphs` : `addr_decode` exige 27 groupes de charge, 4 de contrôle, et les deux bits de queue nuls ; `decoderGlyphes` fait le même refus. `eonis.py` ne bouge pas, donc **ni `genesis.json`, ni les trois empreintes du README, ni le testnet**.
**Coût.** ~20 lignes Python, ~15 TS, **2 contrôles `doit_echouer`** (un par implémentation), un vecteur partagé de plus dans `vecteurs.json`. Vérifier d'abord que les 47 sorties publiées, les planches de reliques et les QR déjà émis encodent tous un 27ᵉ glyphe nul — ils le font, `addr_encode` bourre à zéro ; c'est le point à contrôler avant de fusionner.
**Fermée par C1 (§4) :** le refus est dans les **trois** décodeurs d'adresse, pas deux — le troisième, `decoder` (`robinet.py`), est l'entrée réelle des adresses tapées par les joueurs. Et la dette était plus large que son énoncé : le vecteur `bourrage_refuse` de `vecteurs.json` forçait le 27ᵉ glyphe entier à `✚✚✚`, donc il était refusé par la **somme de contrôle**, pas par le bourrage — un témoin qui ne témoignait pas de sa règle. Il ne change plus que la 3ᵉ figure.

### D2 — « Le pas le plus long reste sous la portée la plus longue » est rompue par tour — **REFORMULÉE le 2026-09-13**

**Le fait.** Un pas plein vaut 4, la plus longue portée 7 : `4 < 7`. Mais `PA_PAR_TOUR = 2`, donc `2 × 4 = 8 > 7`. Le contrôle de `unite.test.ts:105` lit **un** pas et reste vert : il garde la lettre, pas ce qui compte.
**Le prix, mesuré.** Sur 660 288 duels par configuration : `|r|` max **0,622** (eperon +0,622, arc −0,377) contre **0,098** sur un témoin `719ca7a` recopié — l'écart est celui du moteur, pas de la mesure. Bride « 2 frappes / 1 pas » : **0,236, tenue**. Bride « 1 frappe / 2 pas » : **0,588, rompue**. La cible du §9 ter est **0,30**. La seconde moitié de R2 est **tenue** : quartile haut/bas de `lame+ecu` = **0,82×** pour un plafond de 3×.
**Le correctif connu.** `DIV_PAS = 64` (pas 2..3, donc `6 < 7`) rétablit **0,255**.
**Ce que C2 a mesuré (2026-09-13).** Les chiffres ci-dessus viennent de trois politiques écrites pour la mesure. Sur le couple **moteur + politique du dépôt** (`ia.ts`, `scripts/banc-r2.ts`, 440 320 duels par configuration, deux sièges), le prix change de signe : `arc` n'est pas rattrapé, il domine (**+0,591**), et c'est `eperon` qui n'achète rien (**−0,640**). `DIV_PAS = 64` ne change rien : `|r|` max **0,657 contre 0,640**, bande de tier **29,5 contre 29,6 pt**, 0 nul dans les deux cas. Le fait demeure (`8 > 7`, `unite.test.ts` l'affirme) ; sa conséquence annoncée — « un archer rattrapé n'a jamais tiré » — n'a plus de mesure derrière elle. La dette qui reste est **D9**, et `DIV_PAS` reste à 32.
**Coût.** Une constante, et **tout le reste de la mesure** : `eperon` perd un de ses quatre prix, la bande de tier et le taux de nuls sont à remesurer sur le protocole complet. C'est un chantier (§4, C2), pas une retouche — et il est bloquant pour publier l'échelle de tiers, la forge, et les puits P4/P5.

### D9 — Le prix des axes est renversé : `eperon` n'achète rien, `arc` achète tout — **FERMÉE le 2026-09-14 (C2 ter)**

**Fermée par.** La riposte en contre (`riposteDe` à deux conditions), `DIV_ALLONGE` 4 et `COUP_BASE` 24 : `|r|` max **0,145** sur le protocole complet (lame −0,007, ecu −0,008, eperon −0,128, arc +0,145), Q4/Q1 0,99×, bande 32,4 pt, 0 nul (`ETUDE_EQUILIBRAGE_TACTIQUE.md`, PS2.10). Ce qui suit est l'état du 2026-09-13, gardé tel quel.

**Le fait.** Sur le couple moteur + politique du dépôt, R2 (a) est rompue par deux axes sur quatre, dans les deux sens : r(eperon, victoire) = **−0,640**, r(arc) = **+0,591**, contre une cible de 0,30 (`ETUDE_EQUILIBRAGE_TACTIQUE.md`, second post-scriptum). Au tier le plus haut, la pointe `eperon` gagne **3,8 %** de ses duels, la pointe `arc` 43,9 % (panel T12, protocole complet). R2 (b) tient : quartile haut / bas de `lame+ecu` = 1,04×.
**Pourquoi.** `ia.ts` minimise l'`approche` avant l'`exposition` : un mot à portée 1 entre dans la portée d'un archer sans pouvoir frapper le même tour, et l'archer tire deux fois sans bouger, avec l'allonge (`+base/2`) et sans riposte. Les quatre prix d'`eperon` — le pas, le rang de phase, la riposte, la charge — ne pèsent rien dans ce jeu-là : sans allonge, r(arc) tombe à +0,016 mais r(eperon) reste à −0,425 ; la charge doublée, l'initiative rendue au plus grand `eperon`, une politique qui se couvre d'abord, ne le remontent pas au-dessus de −0,42 ; un pas 2..6 le porte à −0,418 et ouvre la bande de tier de 7 pt.
**Ce que ça coûte aujourd'hui.** Rien au consensus, rien à la chaîne. Ce qui est bloqué, c'est ce que A2 gèle tant que R2 n'est pas tenue : ancrer, exporter, publier l'échelle de tiers, la forge, P4 et P5. Et un marché (§9 bis de `SPEC_TACTIQUE.md`) où tout le monde voudrait le même profil — `arc` haut, `eperon` nul.
**Le correctif.** Il n'est pas dans une constante (sept sondes) ni dans la politique (quatre candidats, C2 bis tué) : il commence dans **une condition du moteur**. La riposte n'atteint que ce qui est à portée, donc jamais un archer ; la lever ramène `|r|` max de 0,640 à 0,487 sur le protocole complet (eperon −0,487, arc +0,194), et à 0,330 avec l'allonge à `base/4` — le levier, pas encore la cible — au prix d'une bande de tier qui s'ouvre (29,6 → 36,8 pt). Voir C2 ter, et `ETUDE_EQUILIBRAGE_TACTIQUE.md` PS2.8–PS2.9.
**Coût.** Une décision d'auteur (A16, recommandation : C2 ter), puis une ligne de `bataille.ts` et ses contrôles ; le banc est déjà là.

### D3 — Les mesures qui justifient les constantes ne sont pas dans le dépôt

**Le fait.** `COUP_BASE = 16`, `MULT_TENUE = 2`, `CHARGE_PAR_CASE = 4`, `DIV_PAS = 32` sont justifiés par des chiffres précis dans les docstrings (`r(ecu)` de +0,59 à +0,14, pointe `eperon` de 5,85 % à 12,33 %…). Les bancs qui les produisent vivent dans le scratchpad, avec le moteur **recopié et modifié**. Les trois études le déclarent en toutes lettres — `ETUDE_EQUILIBRAGE_TACTIQUE.md:169`, `ETUDE_MOBILITE.md:160`, `ETUDE_POLYBE_FRACTALE.md:199` : « rien n'est rejouable par la CI ».
**Pourquoi c'est grave.** « Aucune mécanique n'entre sans mesure chiffrée sur le vrai moteur » est la règle de conception ; sans banc dans le dépôt, chaque changement du moteur périme en silence toutes les constantes, et personne ne le voit. C'est déjà arrivé deux fois : la Poussière (§1.4) et R2 (D2).
**Le correctif.** Un banc réduit dans `atelier/scripts/`, à **vecteurs gelés**, qui rejoue le protocole sur un échantillon calibré et compare à des seuils écrits ; le banc complet reste hors CI, et le banc réduit ne prétend pas le remplacer — il détecte la dérive.
**Coût.** Un script + un `.test.ts` à ajouter à la main dans `package.json` et `CLAUDE.md` §2 ; budget CI à tenir sous 60 s (le duel 1v1 coûte **3,06 ms**, un balayage complet 147 s : l'échantillonnage est la seule voie).

### D4 — La racine UTXO n'est contrôlée que si la clé est là

**Le fait.** `Carnet.valider_bloc` compare la racine sous `if "utxo_root" in blk:` (`utxo.py:272`) — pas de branche `else: raise`. Sur le chemin fédéré c'est sans conséquence, `deser_bloc` pose toujours la clé en FORMAT 3 ; mais l'obligation vient de la **sérialisation**, pas d'une exigence du validateur. Un appelant qui construirait un bloc sans la clé traverserait sans être refusé — et n'obtiendrait pas non plus d'`id_bloc` étendu.
**Le correctif.** `else: raise Rejet("bloc sans racine UTXO déclarée")`.
**Coût.** Deux lignes, **un contrôle `doit_echouer`**, aucun format touché.

### D5 — Trois textes de référence annoncent des chiffres périmés

`CLAUDE.md` §4 : « 409 suites Eidos ». `README.fr.md` : « 537 tests Eidos » (deux fois). Mesure du jour : **564 tests, 118 suites**. `federation.json` déclare `"format_chaine": 2` alors que `chaine-eidos.dat` porte `FORMAT 3` — le champ n'est lu par personne, ce qui est exactement pourquoi il a dérivé. Les en-têtes de `SPEC_CHYMIE.md` (« aucune ligne de code ») sont périmés depuis `8566119`.
**Correctif.** Les corriger, et poser la règle : tout compteur écrit dans un texte doit être produit par une commande citée à côté de lui. **Coût :** quelques lignes ; à faire dans la PR qui touche ces fichiers, jamais seule.

### D6 — Le sac dit 27 places d'un côté, 81 de l'autre — **FERMÉE le 2026-09-13**

`veillee-tour.ts:89` : `SAC_PLACES = 3 * ETAPES` = **81**. `coffre-horaire.ts:31` : `SAC_COFFRE = 27`, avec juste au-dessus un commentaire qui affirme que c'est le même nombre. Et la dette était pire que son énoncé : le `reclamer()` qui appliquait `Math.max(0, SAC_COFFRE − sacRempli)` n'était appelé **que par les tests** ; le chemin livré, `reclamerDansCoffre`, faisait `slice(0, 27)` sur au plus 9 objets — « perdus » valait toujours 0, et le flash l'affichait. Le sac de 27 n'a jamais borné un claim dans l'atelier.
**Fermée par A15 :** le coffre se prend entier, `SAC_COFFRE` et le `reclamer()` mort sont retirés, `sac_places` quitte `vecteurs.json` (ce n'était pas un vecteur), et `SPEC_COFFRE_HORAIRE.md` §4–§5 dit ce que le code fait. Le sac de 27 reste le modèle du labo (K44, K47), nommé comme tel.

### D7 — Le frein par auteur ne couvre pas le canal `envoi`

`robinet.py:180` `auteur_autorise` n'est appelé qu'en `:310`, dans `ajouter()`. `ajouter_envoi()` (`:252`) n'a ni auteur, ni époque, ni quota : le seul plafond restant est `MAX_FILE = 200` en attente et `MAX_ENVOIS = 8` par bloc. C'est cohérent avec la docstring — le frein rationne les **eidôla**, pas les **créneaux** — mais la ressource rare d'Eidos est le créneau : **192 transactions par jour**, et une goutte de robinet (1 EIDL) finance 99 999 999 transactions à 1 atome, soit **1 427 ans** de la capacité entière du réseau.
**Correctif.** Ou bien un frein par auteur sur `ajouter_envoi`, ou bien un montant plancher par envoi, ou bien l'aveu écrit que le canal envoi est ouvert et que c'est assumé sur un réseau d'essai. **Coût :** faible en code ; c'est un arbitrage (§3, A8), pas un correctif évident — tout frein sur `envoi` freine aussi les joueurs légitimes.

### D8 — P6, hygiène (report de `CLAUDE.md` §7)

`getcontext().prec = 60` global → `with localcontext()` dans `dcos` et `build_epoch_table` (ne change pas les tables ; à vérifier par `verify_genesis.py`). Documenter l'ambiguïté de duplication de la dernière feuille Merkle (CVE-2012-2459) et pourquoi elle est bénigne ici — la double dépense dans le bloc est refusée ; noter que l'argument **ne vaut pas** pour un Merkle de verdicts ou de figures. Déplacer `consensus.py` et `store.py` dans `historique/` avec leur test. **Coût :** une PR, aucun format, aucune empreinte.

---

## 3. Les arbitrages qui attendent l'auteur

Questions fermées. La recommandation engage le rédacteur de cette feuille, pas l'auteur.

| # | Question | Recommandation | Ce qu'elle coûte |
|---|---|---|---|
| **A1** | `DIV_PAS` passe-t-il de 32 à 64 (pas 2..3) pour rétablir R2 ? | **TRANCHÉ PAR LA MESURE le 2026-09-13 : non.** Accordé par l'auteur, mesuré dans C2 sur le couple moteur + politique du dépôt : `\|r\|` max 0,640 → 0,657, bande de tier 29,6 → 29,5 pt, 0 nul. Le pas est plat en pratique (7,8 % des mots ont `eperon ≥ 32`, aucun n'a 64) | `DIV_PAS` reste à 32 ; la dette devient D9, et la question suivante est A16 |
| **A2** | La bataille est-elle jouable avant que R2 soit tenu ? | **Oui pour la jauge, non pour ce qui compte** : brancher le moteur sur une route libre ; ne rien ancrer, ne rien exporter, ne publier ni échelle de tiers ni forge | Un chantier de plus, et l'aveu écrit que les tiers ne sont pas publiés |
| **A3** | D3 — arbre de la Veillée à 64 feuilles ou 256 ? | **64** | 256 exige le Web Worker (construction ~5 s contre 1,3–1,6 s) pour un gain que 6 à 8 batailles par run ne réclament pas |
| **A4** | D4 — la graine connue d'avance : (a) l'assumer, (b) commit-reveal, (c) une bataille ancrée par jour ? | **(a) + (c)**, documenté en LIMITE | (b) ajoute un abandon de dernier révélateur pour peu de gain ; (a) admet que la journée se simule hors ligne |
| **A5** | D5 — une unité tombée en bataille ancrée quitte-t-elle le roster ? | **TRANCHÉ PAR L'AUTEUR le 2026-09-14 : oui.** En veillée ancrée seulement ; en libre, rien (une lecture). C'est le seul puits réel du jeu | Sans elle, le marché de D6 n'a qu'une entrée ; avec elle, la permadeath devient une décision d'économie, pas de difficulté |
| **A6** | P1 — la mise du sceau se paie-t-elle par acte ou par mise ? | **La mise** (4 EIDL / 64 actes), en disant que le brûlage est la **preuve** et le décompte une **figure** | Un décompte hors chaîne dans `batailles/index.json` ; c'est la seule forme qui tienne dans 192 tx/jour |
| **A7** | Le péage de lignée est-il obligatoire ? | **Oui, et gratuit pour le premier maillon** (l'origine) | Facultatif, il n'absorbe rien ; gratuit au premier maillon, il ne taxe pas le coffre horaire |
| **A8** | Le canal `envoi` gagne-t-il un frein (D7) ? | **Un montant plancher**, pas un frein par auteur | Le plancher exclut le scellé à 1 atome sans exclure un joueur ; un frein par auteur pénaliserait celui qui joue |
| **A9** | La gerbe de la Moisson : 1 EIDL ou 0,25 ? | **1 EIDL, prorata au-delà de 60 glaneurs** | À 0,25 le plafond porte 240 glaneurs (borné à 128 par la transaction) et la Sybil rapporte 4× moins par compte ; à 1 EIDL la rareté se voit et la dilution est publiée |
| **A10** | La Moisson accepte-t-elle le canal courriel ? | **GitHub seul au départ** | L'expéditeur est plus faible qu'un compte GitHub, et la Moisson multiplie cette faiblesse par 84 |
| **A11** | Douze tiers ou neuf ? | **Douze**, sommet à 1 sur 2 006 | Neuf alignerait sur le coffre et les muses, mais mettrait le sommet à 1 sur 259 |
| **A12** | Corrige-t-on le tirage (`paqueter`, 3,48 % de mots hors sphère, 32,0 % hors image) ? | **Oui, dans une PR séparée de l'échelle** | Six vecteurs gelés à regeler, et `vecteurs.json` à refaire ; fait après l'échelle, le regel devient illisible |
| **A13** | Le canal courriel du robinet : on l'active ou on le retire ? | **L'activer** (poser `EIDOS_ROBINET_COURRIEL`) ou retirer la mention publique | `etat.json` publie `"courriel": null` : un canal annoncé qui n'existe pas est un texte qui promet plus que le code |
| **A14** | Scelle-t-on la première relique ? | **Oui, une seule**, et publier la planche | `reliques.json` est vide : toute la machinerie (3 + 5 contrôles) est codée et n'a jamais servi ; une relique met à l'épreuve `--sceller`, `--animer` et le statut publié |
| **A16** | Où va le prix d'`eperon` (D9) : dans la **politique**, dans un **prix nouveau** du moteur, ou nulle part ? | **Tranché par l'auteur pour la politique le 2026-09-13, puis par la mesure le même soir : la politique ne le peut pas** (quatre candidats, aucun ne remonte `eperon`, C2 bis tué) ; **le moteur, en partie** — la riposte qui ne demande plus la portée ramène `\|r\|` max de 0,640 à 0,487 sur le protocole complet (0,330 avec l'allonge à `base/4`), sans toucher ni constante ni politique : le levier est trouvé, il ne suffit pas seul. **Accordé par l'auteur et tenu le 2026-09-14 (C2 ter)** : le contre, l'allonge à `base/4` et le socle à 24 ensemble, `\|r\|` max **0,145** sur le protocole complet | Une ligne de `bataille.ts` et deux constantes, leurs contrôles, deux étalons recalibrés, quatre docs ; la bande de tier s'ouvre de 2,8 pt (29,6 → 32,4), pas 7 |
| **A15** | `SAC_COFFRE` : 81, ou 27 assumé ? | **TRANCHÉ le 2026-09-13 : ni l'un ni l'autre — dire ce que le code fait.** Un claim par pièce et par bloc, pris entier, rien de perdu ; la constante et le `reclamer()` mort sont retirés. Un vrai plafond, s'il vient, sera une règle neuve avec son `doit_echouer` | Rien ne borne la rafale rétroactive hors « une pièce, un bloc » ; la page n'offre que la tête suivie, et c'est une politique d'interface, dite comme telle |

**Posés par les handovers du 2026-09-14** (le détail, la recommandation et ce qui tranche sont dans chaque document) :

| # | Question | Où | Qui tranche |
|---|---|---|---|
| **A17** | en combat, une feuille signe un coup (`SPEC_TACTIQUE` D2, 64 feuilles) ou une mort (`BIBLE_VEILLEE` §4.3, 32) ? | `HANDOVER_VEILLEE_BATAILLE.md` §3 | **le banc 5a**, seuils de la bible §4.5 |
| **A18** | 27 salles ou 9 ? | idem | le banc 5a, puis l'auteur |
| **A19** | d'où le juge tire-t-il le roster d'une bataille rejouée ? | idem §6 | l'auteur, avant PR 6 |
| **A20** | la normalisation d'un nom (elle fixe l'adresse à jamais) | `HANDOVER_PUITS.md` §5 | l'auteur, regelée dans `vecteurs.json` |
| **A21** | la caution de socle | idem | à écarter sans marché |
| **A22** | F1–F2 de `SPEC_FORUM.md` abandonnés au profit de la lignée ? | `HANDOVER_LIGNEE_FORUM.md` §5 | l'auteur |
| **A23–A25** | la borne sur N échanges ; les objets de jauge ; l'identité du forum | idem §6 | l'auteur, après la mesure de L2 |
| **A26** | `localcontext()` maintenant (réinitialisation) ou à la prochaine ? | `HANDOVER_HYGIENE_P6.md` §5 | **TRANCHÉ PAR L'AUTEUR le 2026-09-14 : à la prochaine réinitialisation, jamais seul** |
| **A27** | `format_chaine` : corrigé seul, ou avec un lecteur qui refuse ? | idem | l'auteur |

---

## 4. La suite, par chantiers

Un chantier = une branche = une PR, jamais deux à la fois. Chacun porte **sa cible chiffrée annoncée d'avance** et **la mesure qui le tue**. Un chantier tué est un chantier réussi : il a coûté une mesure, pas une dette.

### C1 — Le bourrage du 27ᵉ glyphe (dette D1)

**Fait le 2026-09-13.** Le refus manquant est dans les **trois** décodeurs d'adresse — `addr_decode` (`utxo.py`), `decoder` (`robinet.py`, l'entrée réelle des adresses tapées, que `courriel.py` emprunte) et `lireCodes` (`glyphs.ts`, partagé par `verifierAdresse` et `decoderGlyphes`) — sans toucher `eonis.py`.
**Cible tenue.** Une adresse de 20 octets a **exactement une** écriture glyphique acceptée, des deux côtés, contre 4 avant ; les trois autres sont refusées (« bourrage du 27e glyphe … au lieu de 00 » côté Python, « Bourrage du 27ᵉ glyphe non nul » à l'atelier). `utxo.py` 15 → 16, `robinet.py` 14 → 15, `glyphs.test.ts` + 1. `vecteurs.json` porte `bourrage_refuse` (bourrage seul : mêmes 160 bits, même somme) et `controle_refuse` (somme seule) — chaque refus par sa règle, relu des deux côtés.
**Ce qui l'aurait tué.** Une adresse déjà publiée qui ne passe pas le refus. Vérifié avant de livrer : `etat.json` et `mempool.json` publient en hexadécimal, `reliques.json` est vide, et l'unique suite de glyphes de `genesis.json` est le condensat du bloc de genèse, pas une adresse. Aucun format, aucune empreinte, pas de réinitialisation.

### C2 — Re-tarifer `eperon` (dette D2) — **TUÉ le 2026-09-13**

**On livrait.** `DIV_PAS` arbitré (A1), le contrôle de `unite.test.ts` réécrit sur `PA_PAR_TOUR · pas` et non sur `pas`, et le banc du chantier.
**Cible.** `|r|` par axe **< 0,30** et quartile haut/bas de `lame+ecu` **< 3×**, sur le protocole complet (660 288 duels par configuration, deux sens, trois politiques). Avant : 0,622 et 0,82×.
**Ce qui l'a tué.** Ni les nuls, ni les feuilles, ni la bande de tier — **la cible elle-même**. Mesuré sur le moteur et **la politique du dépôt** (`ia.ts`, ce que le §6 bis exigeait), 440 320 duels et 1 200 mêlées par configuration, deux sièges : `|r|` max **0,640 à `DIV_PAS = 32`, 0,657 à 64** ; bande de tier 29,6 → 29,5 pt ; nuls 0 → 0 ; feuilles par mêlée 2 en médiane, 9 au pire, dans les deux cas. Et le signe est l'inverse de la prémisse : `eperon` **−0,640**, `arc` **+0,591**. Le pas n'est pas le prix des axes ; le retirer à `eperon` ne rend rien à personne.
**Ce qui reste.** Le banc, dans le dépôt : `atelier/scripts/banc-r2.ts` rejoue le protocole entier hors CI (`npm run banc-r2`, ~16 min) et un échantillon calibré de 15 616 duels en CI (`banc-r2.test.ts`, ~30 s). `DIV_PAS` reste à 32 ; `unite.test.ts` continue d'affirmer `8 > 7` ; les docstrings de `unite.ts` et `types.ts` disent ce qui a été mesuré. À noter pour qui rouvrirait la constante : à `DIV_PAS = 64`, le contrôle du détour de `bataille.test.ts` (« l'élan est le coût du chemin ») pose un mot à `eperon = 64` qui doit parcourir 4 cases en un pas — il tombe, et c'est le pas qu'il faudrait lui rendre, pas le mur qu'il faudrait déplacer (relecture du 2026-09-13). La dette devient **D9**, la question **A16**, le chantier **C2 bis**.
**Coût.** Une mesure : deux configurations complètes, sept sondes, aucune constante changée.

### C2 bis — Le prix d'`eperon`, la politique d'abord (dette D9) — **TUÉ le 2026-09-13**

**On livrait.** La sortie de A16 dans le sens tranché par l'auteur, la politique : `ia.ts` apprend à viser le seuil `pas + portée` plutôt que le contact, à ne pas compter comme exposée une case d'où elle riposte, ou les deux.
**Cible.** `|r|` **< 0,30** sur les **quatre** axes, protocole complet de `banc-r2.ts`, la cible (b) tenue, la bande de tier sous 29,6 pt, 0 nul.
**Ce qui l'a tué.** Le premier étage du banc. Quatre candidats sur l'échantillon rapide : deux ne changent **aucun choix** (mêmes 15 616 duels à l'octet), deux **aggravent** `eperon` (−0,547 → −0,596 et −0,653). S'arrêter au seuil au lieu du contact, c'est encaisser deux flèches avec l'allonge et sans riposte au lieu de deux coups ripostés. La politique du dépôt fait déjà ce qu'une politique peut faire de mieux pour un mot qui n'a que de l'initiative : arriver. Aucun candidat n'a mérité le protocole complet ; `ia.ts` ne bouge pas, sa LIMITE le dit.
**Ce qui reste.** La mesure (`ETUDE_EQUILIBRAGE_TACTIQUE.md`, PS2.8) et la certitude qu'elle achète : le prix d'`eperon` n'est **pas** dans la politique. Il est dans une condition du moteur, sondée aussitôt — voir C2 ter.

### C2 ter — Le prix d'`eperon` dans le moteur : la riposte ne demande plus la portée (dette D9) — **FAIT le 2026-09-14**

**Livré.** `riposteDe` à deux conditions (tenue non nulle après le coup, `eperon` strictement plus haut) : la riposte est un **contre**, rendue d'où que l'on ait frappé, jamais d'allonge sur le coup rendu ; `COUP_BASE` 16 → **24**, `DIV_ALLONGE` 2 → **4** ; `MULT_TENUE`, `DIV_PAS`, `ia.ts` intacts. Deux contrôles neufs dans `bataille.test.ts` (la tour contre l'archer à travers la meurtrière ; le contre hors de portée, et rien à `eperon` égal), le contrôle ad hoc « prix des axes » retiré (il rendait eperon +0,396 sous sa propre convention), `banc-r2.test.ts` réécrit sur le même côté de chaque cible et affirmant la cible tenue, étalons des deux bancs recalibrés (coup 51 215, tenue 1 133, charge 2 547, pas 4 125 ; R2 complet ci-dessous). Atelier 573 → 573 tests.
**Cible tenue.** `|r|` max **0,145** sur le protocole complet (lame −0,007, ecu −0,008, eperon −0,128, arc +0,145), (b) 0,99×, 0 nul, une feuille par mêlée en médiane, 8 au pire ; bande de tier 29,6 → **32,4 pt** (T1 54,1 % → T12 21,7 % ; pointes T12 lame 40,2 %, ecu 21,7 %, eperon 11,0 %, arc 16,5 %). Écrit, comme promis : c'est `arc` qui perd son trône au tier haut (43,9 → 16,5 %), et il ne le rend à personne.
**Ce que la mesure a exclu.** Le socle seul, avec l'ancienne riposte : 0,604 (`arc` roi) ; `MULT_TENUE` 3 ou 4 : `arc` meurt (−0,47, −0,56) ; l'allonge à `base/2` avec le contre et le socle : 0,473 sur le protocole complet malgré 0,162 sur l'échantillon — l'échantillon rapide ne prédit le complet qu'à `base/4`. Détail : `ETUDE_EQUILIBRAGE_TACTIQUE.md`, PS2.10. **Débloque** ce que A2 gelait : l'échelle de tiers, la forge, P4 et P5, l'ancrage de C4.

Ce qui suit est le chantier tel qu'il a été écrit la veille.

**On livre.** Une condition de moins dans `riposteDe` (`bataille.ts`) : la riposte n'exige plus que l'attaquant soit à portée du riposteur. Elle devient un **contre** — le mot le plus vif rend le coup à quiconque le frappe, fût-ce de six cases — et garde tout le reste : hors PA et hors feuille, jamais de riposte à une riposte, `eperon` strictement plus haut, tenue non nulle après le coup. **Et ce qui manque encore** : mesuré seul, ce levier ne tient pas la cible (voir ci-dessous) ; le chantier doit le combiner avec l'allonge (`DIV_ALLONGE`) et, s'il le faut, le socle du coup et de la tenue (`COUP_BASE`, `MULT_TENUE`), une variante à la fois, chacune sur le protocole complet.
**Cible.** `|r|` **< 0,30** sur les quatre axes sur le protocole complet de `banc-r2.ts`, la cible (b) tenue, 0 nul ; et l'aveu écrit de ce que la bande de tier coûte (elle s'ouvre de 7 pt : c'est `arc` qui perd son trône, et la pointe `arc` au tier le plus haut avec lui).
**Mesuré avant d'ouvrir** (échantillon rapide, puis protocole complet, `ia.ts` intact) : riposte sans portée `|r|` max **0,298** sur l'échantillon (eperon −0,298, arc −0,043, lame +0,216, ecu +0,123 ; bande 31,0 pt) ; avec l'allonge à `base/4`, **0,287** (eperon −0,171, arc −0,287, lame +0,265, ecu +0,186 ; bande 32,5 pt). Protocole complet : riposte sans portée : `|r|` max **0,487** (lame +0,133, ecu +0,167, eperon −0,487, arc +0,194), Q4/Q1 1,18×, bande 36,8 pt, 0 nul, 1 feuille(s) par mêlée en médiane, 8 au pire ; avec l’allonge à base/4 : `|r|` max **0,330** (lame +0,221, ecu +0,246, eperon −0,330, arc −0,132), Q4/Q1 1,28×, bande 36,7 pt, 0 nul, 1 feuille(s) par mêlée en médiane, 8 au pire.
**Ce qui le tue.** Aucune combinaison de la riposte, de l'allonge et des socles qui tienne `|r| < 0,30` sans ouvrir la bande de tier au-delà de ce que l'auteur accepte d'écrire (la riposte seule la porte de 29,6 à 36,8 pt) ni rendre le trône à `lame+ecu` (Q4/Q1 1,18× avec la riposte seule, 1,28× avec l'allonge à `base/4`, contre 1,04× aujourd'hui et 3× de plafond) — auquel cas la cible de 0,30 elle-même est à rediscuter, en le disant.
**Coût.** `bataille.ts` (une ligne et sa docstring), les contrôles de riposte de `bataille.test.ts`, `SPEC_TACTIQUE.md` §3, `BIBLE_VEILLEE.md`, les étalons de `banc-r2.ts` et de `banc-tactique.ts` recalibrés ; aucun format, aucun vecteur partagé (la bataille est une jauge, et aucune preuve déposée ne rejoue encore une bataille). Débloque ce que C2 devait débloquer : **l'échelle de tiers, la forge, P4 et P5**.

### C3 — Le banc dans le dépôt (dette D3)

**Fait le 2026-09-11.** `atelier/scripts/banc-tactique.ts` rejoue 128 duels sur le moteur et la politique réels, depuis 32 objets et des positions gelés. Sa calibration complète, hors CI, en rejoue 256 : coup **43 865**, tenue **1 230**, charge **3 467**, pas **4 125** milli-unités ; le témoin est à 2,1 %, 2,8 %, 2,8 % et 0 % de ces lectures.
**Cible tenue.** Les quatre constantes du moteur (`COUP_BASE`, `MULT_TENUE`, `CHARGE_PAR_CASE`, `DIV_PAS`) ont chacune un chiffre **rejoué par la CI en moins de 60 s** ; un écart de plus de 10 % avec la calibration complète rend le test rouge. `npm run banc-tactique` la reproduit hors CI en ~1 s.
**Ce qui l'aurait tué.** Aucun échantillonnage sous 60 s ne reproduit la calibration complète à mieux de 10 % : le banc réduit aurait alors été un faux témoin. Ce n'est pas le cas.

### C4 — Brancher le moteur tactique (PR 4 et 5 de `SPEC_TACTIQUE.md`)

**Handover :** `docs/HANDOVER_VEILLEE_BATAILLE.md` (2026-09-14) — PR 5 est coupée en **5a** (le banc des budgets, qui tranche A17 et A18 par le chiffre) et **5b** (le branchement) ; PR 6 rejoue les batailles dans la preuve de veillée, un seul juge, aucun `batailles/`.

**On livre.** Le rendu de grille sur le socle `components/canvas/` existant, une route, les clés i18n FR/EN, et le branchement Veillée (feuilles = coups, sac, permadeath selon A5).
**Cible.** Un duel se joue de bout en bout depuis une route ; **0 clé i18n vide**, FR et EN aux mêmes clés ; une bataille consomme **6 à 10 feuilles** sur les 64 de l'arbre, mesuré sur le bot et non promis.
**Ce qui le tue.** La bataille dépasse le budget de feuilles (une run ne tient plus 6 à 8 batailles), ou le rendu impose une dépendance nouvelle — le socle actuel tient à 18 dépendances d'exécution, et une scène de plus n'en justifie aucune.
**Coût.** 9 fichiers, 1 100 à 1 700 lignes selon le découpage §10 de la spec, dont ~40 % de tests. **Ne pas ancrer, ne pas exporter tant que R2 n'est pas tenue** (A2) — tenue le 2026-09-14 par C2 ter (0,145) : le gel est levé.

**PR 4 livrée le 2026-09-13** (`tactique-rendu`, PR #42) : `partie.ts` (la main du joueur — qui entre, ouvrir, jouer, passer la main, et une `Lecture` entière : cases atteignables et leur coût, chemin survolé, zone de contrôle, menace annoncée, le coup et la riposte lus d'avance ; 17 contrôles), `components/tactique/` (la dalle sur le socle `canvas/`, stèles à la tenue, grains de PA, fer sur la menace ; la page avec grille de boutons jouable sans WebGL), route `/bataille` **rattachée à la Tour** (`RATTACHEES` : quatre sous-onglets par registre restent la règle), bouton « Se battre » sur l'étage, i18n FR/EN, **0 dépendance nouvelle**, 591 tests. Les Indéchiffrés d'un étage sont ses occupants restants — le critère du §6 (alignement au catalogue sous seuil) reste PR 7. Une partie libre simule les 64 feuilles sans en signer une : **rien n'est ancré, rien n'est exporté**, comme A2 l'exige. Restent PR 5 (Veillée : feuilles = coups signés, sac, permadeath) et PR 6 (dépôt d'une preuve). La cible « 6 à 10 feuilles par bataille » n'est pas mesurée sur le bot : c'est PR 5 qui la mesurera.

**PR 4 bis livrée le 2026-09-14** (`rendu-actes`) — le rendu lisible, trois choses et une petite : (1) **regardé avant de coder** — captures headless de la scène et de la page (le contraste atteignable/sol relevé dans #44, la télégraphie et deux instants d'animation vus ici) ; (2) **les actes animés depuis le journal** — `tactique/animation.ts` (pur : `evenementsDe` rejoue `Partie.avant` + `Partie.derniers` avec `jouer` et en tire pas, coup, contre, chute, passer ; `ligneDeTemps` aux durées plates ; `posesA` rend la pose de chaque stèle à un instant `t` — position fractionnaire le long du parcours entier, tenue entamée à l'impact, pulsation, recul, enfoncement), 10 contrôles sans WebGL ; `ia.ts` gagne `jouerPhaseTracee` (mêmes choix, les actes rendus), `partie.ts` garde `avant` et `derniers` (1 contrôle : ils rejouent l'état à l'octet) ; dans `BatailleCanvas`, une `Horloge` demande une image à la suivante pendant la ligne, puis la scène se rendort — et un `instant` fixe la rend sans tourner, ce qui est ainsi qu'elle a été capturée ; (3) **la télégraphie dessinée** — `tactique/traits.ts` (pur : un trait par case de pas annoncé, un par coup annoncé, relus depuis `Intention.actes` sans rien jouer ; 3 contrôles), portés par la `Lecture` et peints en fer ; (4) **la molette**, distance de caméra bornée `[9, 20]` le long de son axe, regard au centre — pas d'orbite, pas de postes, pas de dépendance. Ce qui reste du §10 : PR 5 (Veillée), PR 6 (dépôt), PR 7 (Indéchiffrés). 605 tests.

### L — La langue de l'atelier : moins verbeuse, lisible par un joueur, et un menu qui montre tout — **trois PR, demandé le 2026-09-14**

**Décision d'auteur.** Eidos est un jeu posé sur des lois, mais le joueur n'a pas à lire la chaîne ; on se tutoie ; une idée par phrase ; le menu de l'index se déroule. Trois PR successives, une branche chacune.
**Mesuré à l'ouverture** (`npm run langue`, 866 clés FR/EN, 39 400 caractères FR) : **133 manquements** à la règle d'écriture — lexique 24, chapeau 15, phrase 41, tutoiement 53 ; le Guide en porte 64 (17 600 caractères, 28 textes de plus de 160), la Tour 19, les reliques 7, la Veillée 6. Le jargon de chaîne est rare (1 « Merkle », 1 « UTXO », 2 « XMSS ») : le mal est la phrase dense qui cite la spec, et le registre qui hésite (« vous » au Guide, « tu » à la Veillée).
**PR A — la règle et le menu, FAITE le 2026-09-14** (`langue-a-regle-et-menu`) : `lib/ecriture.ts` (la règle, pure : lexique banni FR/EN, chapeau ≤ 140, phrase ≤ 25 mots, tutoiement ; 6 contrôles), `i18n.test.ts` tient le **cliquet** — 24 / 15 / 41 / 53, ne remonte jamais —, `scripts/langue.ts` liste les manquements page par page ; `components/Nav.tsx` : un seul menu déroulant `<details>` natif (« Jouer › Tour ▾ », les trois registres et le Guide d'un coup, clavier et Échap, se referme au choix), `navigation.ts` intact ; **aucune dépendance**. 612 tests.
**PR B — Vérifier et Lire, FAITE le 2026-09-14** (`langue-b-verifier-lire`) : 53 textes réécrits FR/EN sur le hub, le coffre (inventaire, envoi, décision, carnet, papier, pierres, chymie, robinet), le journal, le témoin, les signes, la carte et les lectures — tutoiement, une idée par phrase, le vocabulaire de la chaîne remplacé par ce qu'il vérifie (« Vérifier qu'elle n'a pas été dépensée » au lieu de « Juger contre la racine UTXO », « On vérifie que la pièce est bien dans le bloc, et que le bloc est bien signé » au lieu de feuille/chemin/racine/federation.json) ; les six pages capturées en headless. **Cliquet 133 → 101** (lexique 24 → 16, chapeau 15 → 13, phrase 41 → 39, tutoiement 53 → 33) : **toutes les pages de Vérifier et Lire sont à zéro** ; ce qui reste est Jouer et le Guide (guide 64, tour 18, reliques 7, veillée 6, bataille 4, coffre de l'heure 2).
**PR C — Jouer et le Guide, FAITE le 2026-09-14** (`langue-c-jouer-guide`) : 120 textes réécrits FR/EN — la Tour (chapeaux, pendule, dalle avec sa légende sur une ligne à part, portes, observatoire), la bataille, le coffre de l'heure, la veillée, les reliques, et le Guide entier. **Cliquet à 0 / 0 / 0 / 0, et il y reste** (le test l'exige désormais). Le « cœur » du Guide dit cinq lois en mots de joueur — la récompense ne se divise jamais, une clé signe une fois, une adresse se lit, rien ne se croit tout se rejoue, sept gardiens un bloc par heure — sans formule ni sigle ; pas de section « Pour les curieux » : le vocabulaire de la chaîne reste au README et aux docs, où il a sa place. `guide.meca.01p` ne dit plus « aucun point de vie » : la bataille en a (la tenue), et le texte le dit. **Guide 17 642 → 11 714 caractères FR (−34 %)** : la cible de ≤ 8 000 n'est **pas** atteinte — chaque bloc tient en trois ou quatre phrases qui citent chacune une règle vraie, et descendre encore retirerait des règles, pas des mots ; à l'auteur de dire s'il faut des blocs en moins. Les libellés gelés regelés (`relique.preuveAide`, `guide.09p` : « une origine »). Une {variable} d'interpolation n'est plus un mot lu par la règle (`{txid}` passe, `txid` non). 612 tests.
**Ce qui le tue.** Un texte court qui ment : la règle mesure des mots, pas le sens — la relecture humaine reste le juge, et CLAUDE.md §8 la loi.

### C5 — La première relique et la première preuve de veillée

**Handover :** `docs/HANDOVER_PREMIERE_RELIQUE.md` (2026-09-14) — la marche à suivre pas à pas. Le défaut trouvé en l'écrivant — la planche de `relique.py` conseillait un second versement qu'une clé à usage unique rendrait indépensable — est **corrigé** (une seule pièce, `relique.py` 3 → 4 contrôles) ; décision d'auteur : la première relique est scellée à la goutte, publiée « sous-scellée ».

**On livre.** Une relique scellée (A14) et une preuve de veillée déposée par le chemin réel — issue → `veillees.yml` → `depot.ts`.
**Cible.** `reliques.json` porte **1 entrée** et `etat.json.reliques` la publie avec son statut ; `veillees/index.json` porte **1 preuve** jugée par le juge de CI, avec les trois têtes retrouvées dans `chaine-eidos.dat`.
**Ce qui le tue.** Le juge refuse la première preuve pour une raison de format : c'est alors un défaut de `depot.ts`, à corriger avant tout dépôt public — et c'est précisément ce que ce chantier cherche à savoir. Coût nul en cas d'échec, sauf le correctif.
**Coût.** Aucune ligne de code si tout passe. C'est le seul chantier dont le livrable est **une donnée, pas du code**, et il éprouve 8 contrôles qui n'ont jamais tourné en réel.

### C6 — L'économie : les puits, puis la Moisson

**Handover :** `docs/HANDOVER_PUITS.md` (2026-09-14) — six lots E1–E6 ; **E1 (mesurer : trois seaux dans `etat.json`) d'abord**, E4 attend C4 PR 6, E5 attend C7.

**On livre.** P1 (mise du sceau), P2 (péage de lignée), P3 (nom) selon `SPEC_PUITS.md` §3, puis la Moisson.
**Cible.** Point fixe **s = 0,1115 EIDL/joueur/jour**, soit **1 076 joueurs** portés par le budget actuel et 8 609 sur l'émission entière ; et, contrainte dure, **la somme des transactions dédiées reste sous 192 par jour**.
**Ce qui le tue.** Toute mécanique qui exige une transaction par geste : à un brûlage par acte, c'est 365 000 transactions par an contre 70 080 possibles. Si le décompte des 64 actes d'une mise ne peut pas rester une figure qui **restreint** la preuve, P1 tombe et l'économie repart de zéro.
**Coût.** `atelier/` + un juge de CI + deux constantes de politique du nœud (`MAX_ENVOIS`, `BUDGET_RATIO`, cf. A12) ; **ni `eonis.py`, ni `genesis.json`, ni la validation, ni `FORMAT 3`**. Gelé jusqu'à C2 pour P4 et P5.

### C7 — La lignée branchée, puis le forum

**Handover :** `docs/HANDOVER_LIGNEE_FORUM.md` (2026-09-14) — L1–L5 ; une pièce tient plusieurs objets, donc **tout envoi** pose les maillons de ce qu'il garde ; F1–F2 de `SPEC_FORUM.md` sont remplacés par la lignée (A22).

**On livre.** `lignee.ts` relié à l'inventaire et à l'export d'un objet, puis les décisions F1–F7 de `SPEC_FORUM.md`.
**Cible.** Un objet change de mains **en une transaction**, et donner N objets tient dans **un créneau et 28·N octets** (contre 2 177 o par témoin) ; un objet à N échanges reste vérifiable hors ligne.
**Ce qui le tue.** L'export d'un objet à N échanges dépasse ce qu'une issue GitHub peut porter (`MAX_TX_CARACTERES = 80 000`) : il faut alors une borne sur N, écrite avant de livrer, ou le chantier n'est pas mûr.
**Coût.** L'atelier seul ; aucune règle de consensus nouvelle — la duplication échoue parce que c'est une double dépense.

### C8 — P6, hygiène (dette D8)

**Handover :** `docs/HANDOVER_HYGIENE_P6.md` (2026-09-14) — **`localcontext()` dans `eonis.py` vaut réinitialisation du testnet** (le fichier est gelé à l'octet) : à faire à la prochaine, jamais seul (A26) ; H2 et H3 sans format ni empreinte ; `federation.json` dit encore `format_chaine: 2`.

**Cible.** `verify_genesis.py` toujours à 32 contrôles, 0 échec, après le passage à `localcontext()` ; `consensus.py` et `store.py` dans `historique/` avec leurs 6 contrôles ; CVE-2012-2459 documentée là où le Merkle est écrit.
**Ce qui le tue.** Un seul chiffre des tables qui bouge : `eonis.py` est gelé, et une empreinte différente vaut réinitialisation du testnet — on renonce et on garde le `getcontext()` global avec un commentaire.
**Coût.** Une PR, aucun format.

### Ce qu'on n'ouvre pas encore, et pourquoi

`SPEC_MUSES.md` (la muse permute déjà les quatre axes : c'est la seule progression que la conservation autorise, et elle attend C2 pour être lisible), `SPEC_AURA_GRADUELLE.md` (D1–D10 non tranchées, contrôles K48–K56 à écrire), `SPEC_BROUILLARD.md` (B1–B5 non tranchées ; l'induction est écartée, la lampe ne l'est pas), `SPEC_CRAFT.md` PR 2 (gelée par D1 = notre C2). Aucun de ces quatre n'est bloqué par du code : ils sont bloqués par une décision ou par une mesure.

---

## 5. Ce qui a été écarté, et par quel chiffre

Les mécaniques écartées **par la mesure** sont au §1.4. Ci-dessous, douze propositions écartées **par une loi**, chacune avec la loi cassée et le chiffre qui a tranché. Savoir ce qu'on a écarté vaut autant que savoir ce qu'on garde : aucune de ces douze n'est à reprendre en l'état.

| Proposition | La loi cassée | Le chiffre qui tranche |
|---|---|---|
| **Le serment de la feuille zéro** — jurer son parcours avant de l'ouvrir | figures ≠ preuves | le juge ne recalcule que le **budget et l'ordre**, jamais le jeu ; la feuille brûlée se rembourse en **+1 de butin**, coût net **zéro**, et un serment trahi n'est simplement jamais déposé |
| **Le duel signé** — deux arbres entrelacés, aucun arbitre | une clé WOTS+ ne signe qu'une fois | l'arbitre supprimé est l'**index global** qui fait tenir la règle ; un duel de 6 à 10 coups par camp dont chaque tour cite une tête fraîche coûte **6 à 10 heures** |
| **Le nom donné une fois** — brûler pour nommer, à 10 000 atomes | rien ne se croit | les **255 étages** de la Tour se nomment pour **0,0255 EIDL** en **une** transaction ; la table de titres entière pour 2,27 EIDL ; et 226 800 sorties de poussière seraient rehachées à chaque bloc, à jamais |
| **Le legs de l'arbre** — transmettre la fin de sa veillée | une clé WOTS+ ne signe qu'une fois | la « preuve publique de trahison » est fabricable par le receveur, qui tient la **même graine** ; et `depot.ts` refuse le second dépôt **avant** d'appeler le juge |
| **Le point de reprise signé** — un lecteur signe ses verdicts | assume-valid jamais implicite | un `maître` neuf donne un arbre neuf **gratuit** ; et la racine dépend de la hauteur courante et de la langue — deux lecteurs honnêtes se prouvent mutuellement parjures |
| **Le scellé** — horodater une empreinte pour 1 atome | le texte promet plus que le code | 28 octets annoncés, **2 283 mesurés** (81,5×) ; une goutte de robinet finance 99 999 999 scellés, soit **1 427 ans** de la capacité entière du réseau |
| **La maturité** — publier la finalité 2n/3 | figures ≠ preuves | retard de finalité **5 blocs** médians mais **61 heures** maximum sur la chaîne réelle ; et les 7 graines privées sont **dérivables publiquement** (7/7 reproduites), donc le décompte n'engage rien |
| **Le rendez-vous** — deux politiques scellées, arbitrées par le bloc de l'heure | rien ne se croit | le proposant est connu **239 ans à l'avance**, le bloc se broie gratuitement, **3 600 valeurs de `ts`** sont recevables par créneau pour **255 dalles** : le validateur choisit le terrain quatorze fois |
| **La cave** — laisser le temps conjuguer un objet | conservation | `\|g q ḡ\|² = \|q\|² × 10¹⁶`, et **5,3 %** seulement des couples sont divisibles ; en 30 jours **100 % des objets montent**, +4,57 tiers en moyenne, T12 **×152** — gratuitement |
| **L'heure du régime** — `REGIMES[(3·s) mod 7]` comme calendrier | rien ne se croit | `REGIMES.length = 7` est **gelé**, `n` de la fédération est **mutable** ; 46 blocs pour 100 créneaux ; et le catalogue n'est pas équiparti — Comète ouvrirait **1,64×** plus souvent que Pulsar, pour toujours |
| **La Couverture** — un rang qui recouvre l'espace des profils | le texte promet plus que le code | une union est **monotone** : **96,6 %** de couverture avec 27 objets tirés au hasard, et `r(lame+ecu, couverture) = 0,613` — le rang s'achète ; 147 s par balayage, personne ne le rejouerait |
| **Les saisons de pas 3** — la rotation du consensus appliquée au méta | doxa, et la rotation elle-même | `(3·e) mod 21` n'atteint que **7 cellules sur 21** et `(3·e) mod 12` que **4 tiers sur 12** : c'est exactement le cas que `federation.py:266` lève en `ValueError` |

**Ce qui survit de ces douze, et qui est déjà spécifié ailleurs :** l'affrontement **asynchrone** contre une armée figée et une politique scellée (`SPEC_TACTIQUE.md` §7-§8, un seul signataire, un seul arbre, un index global) ; le **balayage de couverture comme instrument de mesure**, à ranger à côté de `veillee-bot.ts` ; et l'ajout au `verifierChaine` de l'atelier du **créneau canonique** (`ts = t0 + s·3600`) et du **proposant attendu** (`(3·s) mod n`) — éprouvé sur les 46 blocs réels, 0 anomalie, et qui demande d'étendre `parserFederation` à `t0_unix`, `creneau_s`, `pas_rotation` et `n`.

---

## 6. L'historique — seize chantiers faits, une ligne chacun

Le détail (décisions, limites, reliquats) est dans git et dans les documents cités.

| # | Chantier | En une ligne |
|---|---|---|
| 1 | **P1 — Boucle atelier ↔ nœud** | `construire_envois` valide chaque envoi dans un bloc candidat sur une copie du carnet, écarte les fautifs, porte leurs frais en coinbase |
| 2 | **P2 — WOTS+ à la place de Lamport** | RFC 8391, w=16, témoin de 24 577 o à 2 176 o ; Lamport gardé en démonstration seulement ; testnet-2 |
| 3 | **P3 — Racine UTXO dans l'en-tête** | `utxo_root` à côté d'`E.header` gelé, `--depuis <h> <racine>` explicite, `FORMAT 3`, testnet-3 |
| 4 | **Reliques QR** | encodeur QR stdlib, `--sceller` / `--animer`, la graine n'existe que dans le QR ; voir `HANDOVER_RELIQUES_QR.md` |
| 5 | **Coffre 3D** | un seul coffre, palettes isochromatiques, ornements par butin |
| 6 | **Rendu de l'atelier** | un socle `components/canvas/` et quatre scènes |
| 7 | **Refonte du hub** | l'accueil cesse d'être une liste de pages |
| 8 | **La Tour** | hôtes, secrets, élixirs, capsules, bestiaire, fouilles, équipement — des lectures déterministes, jamais des tirages |
| 9 | **Accueil, écosystème et robinet à deux canaux** | issues GitHub et boîte IMAP, même filtre, expéditeur publié sous empreinte seule |
| 10 | **La Veillée** | roguelike XMSS : 64 feuilles, un indice par geste, juge, sac, classement, fantômes, bot de mesure ; voir `BIBLE_VEILLEE.md` |
| 11 | **Fond orbital de l'accueil** | la loi d'émission en limaçon, neuf astres-muses, phase du cycle lue dans la tête suivie, aucune trace du pointeur |
| 12 | **Labo pendule-9** | aura, avatar voxelisé, 8 agrégateurs, pont TS → Python comparé octet à octet en CI, 53 contrôles |
| 13 | **Coffre horaire** | un coffre par bloc, une pièce par claim, neuf tiers géométriques ; voir `SPEC_COFFRE_HORAIRE.md` |
| 14 | **Menu de l'écosystème** | deux rangs au lieu de neuf onglets |
| 15 | **P4 — Vecteurs partagés Python ↔ TS** | `vecteurs.json`, 10 familles, job CI `parite` dans les deux sens |
| 16 | **P5 — État MSS persistant** | `CompteurMSS` monotone, écrit avant de rendre la signature, départ = max(chaîne, fichier) |

**Depuis, sur la branche `tactique-moteur`** (non fusionnée) : le moteur tactique (`grille`, `unite`, `bataille`, `ia` — 95 contrôles), `tiers.ts` (12 paliers, 16 contrôles), `lignee.ts` (12 contrôles), les 12 espèces de la chymie, et cinq études chiffrées. Aucun de ces modules n'est branché sur une route (§2, C4).

---

## 6 bis. Ce qui a bougé après la rédaction de cette feuille

Elle a été écrite contre `f65c0fe`. Six lots ont suivi le même jour ; ils sont
intégrés ci-dessus quand c'était possible, et listés ici pour que la datation
reste lisible.

| lot | ce qu'il change pour cette feuille |
|---|---|
| **robinet groupé** (`26b78b3`) | un témoin vaut 77 sorties : 12 joueurs en une transaction coûtent 2 591 o contre 27 396, **+28 o par joueur de plus**. Le débit d'entrée passe de 72 à **1 536 nouveaux joueurs par jour**. Change le §C6 |
| **`SPEC_MUSES.md`** (`6f2652c`) | `combat.ts:64` permute les axes par archétype : le même mot est un colosse sous Uranie, un archer sous Euterpe. Un système de classes **déjà codé et invisible**. Nouveau chantier, non listé au §4 |
| **lot honnête** (`d6edaf8`) | douze promesses excessives corrigées dans `SPEC_TOUR` et `SPEC_TACTIQUE`. **Referme une partie de D5**, en laisse le reste |
| **contrôle du pas** (`769db7c`) | D2 n'est plus muette : `unite.test.ts` affirme désormais la rupture (`8 > 7`) au lieu de la taire. La dette **demeure**, son gardien ne ment plus |
| **hygiène** (`208e766`) | `CLAUDE.md` remis à jour, et la **distinction des deux corpus** écrite au §3 : les six lois d'`integrite.ts` sont des conventions révisables, les invariants du §3 scindent la chaîne. Referme une partie de D5 et de D8 |
| **Pages** (`fa1fa58`) | l'atelier est **enfin publié**. Le filet de garde de la racine masquait son propre diagnostic : il faisait 1 778 octets, exactement ce que le site servait |
| **l'ouverture du coffre de l'heure** (2026-09-13) | A15 tranché, **D6 fermée**. `OuvertureCoffre.tsx` : un `<dialog>` natif, zéro dépendance, qui montre exactement ce que le juge a accepté ; l'inventaire surligne les objets neufs ; la page ne montre le contenu qu'une fois le coffre ouvert (politique d'interface, la graine reste affichée). `coffre-horaire.test.ts` 5 → 6 contrôles, `sac_places` retiré de `vecteurs.json` |
| **C1, le bourrage du 27ᵉ glyphe** (2026-09-13) | **D1 fermée.** Une adresse n'a plus qu'une écriture, refusée sinon par les trois décodeurs (`utxo.py`, `robinet.py`, `glyphs.ts`) ; `vecteurs.json` porte un refus par règle (`bourrage_refuse`, `controle_refuse`). `utxo.py` 15 → 16, `robinet.py` 14 → 15, atelier 568 → 569 ; `eonis.py` intact, aucune empreinte ne bouge |
| **C2, tué par sa mesure** (2026-09-13) | Le banc du chantier est dans le dépôt (`scripts/banc-r2.ts`, `npm run banc-r2`, test CI) et il a tué C2 : sur le couple moteur + politique, `DIV_PAS = 64` rend `\|r\|` max 0,657 contre 0,640, bande de tier 29,5 contre 29,6 pt. Et le signe de D2 était le mauvais : `eperon` −0,640, `arc` +0,591. **D2 reformulée, A1 tranché (non), D9 ouverte, A16 posée, C2 bis écrit.** `DIV_PAS` reste à 32, aucune constante ne bouge ; atelier 569 → 573 tests |
| **C2 bis, tué à son tour** (2026-09-13, soir) | La politique d'abord (A16, tranché par l'auteur) : quatre candidats dans `ia.ts`, deux qui ne changent aucun choix, deux qui aggravent `eperon`. Puis la direction moteur sondée : **la riposte qui ne demande plus la portée** ramène `\|r\|` max de 0,640 à 0,487 sur le protocole complet (0,330 avec l'allonge à `base/4`), ce que ni constante ni politique n'approchaient — le levier, pas encore la cible. **C2 ter écrit**, à l'arbitrage de l'auteur ; `ia.ts` et `bataille.ts` intacts, sa LIMITE dans `ia.ts` |
| **C2 ter, la cible tenue** (2026-09-14) | Accordé par l'auteur comme chantier de mesure d'abord. Le contre fixé, une variante à la fois : le socle est le second levier, et il n'en est un qu'avec le contre (24 avec l'ancienne riposte : 0,604). Retenu sur le protocole complet : riposte en contre, `DIV_ALLONGE` 4, `COUP_BASE` 24 — `\|r\|` max **0,145**, bande 32,4 pt, 0 nul. **D9 fermée, A16 tenue, A2 levée.** `bataille.ts` une condition de moins, deux constantes, étalons recalibrés, `banc-r2.test.ts` sur le même côté de chaque cible ; atelier 573 tests |
| **les handovers** (2026-09-14) | Un document de passation par chantier restant — C4 PR 5–6, C5, C6, C7, C8 — au gabarit de `HANDOVER_RELIQUES_QR.md` : ce qui existe, les formats, la cible chiffrée, ce qui tue, les fichiers et contrôles, les décisions attendues (A17–A27 ci-dessus). Zéro code. Deux faits nouveaux : la planche de relique promettait un versement perdu (C5 — corrigé le même jour, `relique.py` 4 contrôles, A5 et A26 tranchés), et H1 de P6 vaut réinitialisation (C8) |

**Une dette est morte le même jour** et n'apparaît donc plus au §2 : le sac
annonçait 27 places quand `SAC_PLACES` en vaut 81 (`8f23973`). Le reste,
`SAC_COFFRE = 27` dans `coffre-horaire.ts`, est tombé le 2026-09-13 avec A15
(D6 fermée ci-dessus).

**Et une correction de méthode, qui vaut pour la suite.** Les trois études du
2026-09-10 rendent trois `r(eperon)` différents pour le même moteur : −0,165,
+0,622, −0,310. La cause est nommée : *« son second PA sert à rejoindre, le
mien à frapper deux fois »*. **Les cibles du §9 ter ne mesurent pas le moteur,
elles mesurent le couple moteur + politique.** C'est pourquoi **C3 doit
précéder C2** — re-tarifer un axe sur un chiffre qui dépend de qui joue serait
décider au hasard. La feuille classe C2 « bloquant » ; il l'est, mais il est
lui-même bloqué.

## 7. Comment on tient cette feuille

- **Un chantier = une branche + une PR**, fusionnée en rebase quand la CI est verte. Jamais deux à la fois. Le cron `chaine` et le robinet committent aussi sur `main` : `git fetch` puis rebase avant de pousser.
- **Toute nouvelle règle de validation = un contrôle `doit_echouer` qui la viole**, dans la suite du module concerné, et le compte mis à jour dans le README.
- **Tout chiffre écrit ici se remesure** : chaque ligne du §1 cite la commande qui la produit. Un chiffre sans commande est une figure, et une figure ne gouverne pas un chantier.
- **Un chantier ouvert sans cible chiffrée est refusé** ; un chantier tué par sa propre mesure est archivé au §1.4 ou au §5, avec le chiffre — pas effacé.
- **Aucune modification de `eonis.py` ni de `genesis.json` sans le signaler explicitement avant** : leur empreinte est vérifiée par la CI, et la changer vaut réinitialisation du testnet (`CLAUDE.md` §6).
