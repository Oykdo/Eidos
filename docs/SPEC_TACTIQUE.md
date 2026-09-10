# Spécification — Eidos Tactique : la Veillée devient une bataille

**Dépôt :** Oykdo/Eidos
**Statut :** D1, D2 et D6 tranchées le 2026-09-10 ; moteur en cours sur la branche `tactique-moteur`.
D3, D4, D5 restent ouvertes (§9).
**Périmètre :** `atelier/` et un workflow de dépôt. **Le nœud, la chaîne, le carnet, `eonis.py`, `genesis.json` ne changent pas d'un octet.**
**S'appuie sur :** `combat.ts`, `resonance.ts`, `groupe.ts`, `cosmos.ts`, `tour.ts`, `objets.ts`, `veillee.ts`, `ancrage.ts`, `depot.ts`, `integrite.ts`

---

## 0. Ce qui ne bouge pas — et pourquoi ça ne bloque rien

Les six lois de `integrite.ts:22-29` sont **conservation, groupe, doxa, sceau, époques, résonance**. Ce sont
des lois sur le *mot* : sa norme vaut `ATOMES`, il vit dans SU(2), il se range en 21 cellules, un âge est une
géographie, une paire a une polarité. Aucune ne parle de combat.

« Pas de point de vie, pas d'expérience, pas de niveau » (`SPEC_TOUR.md:14`) n'est pas une septième loi :
c'est une **lecture** des six, écrite quand il n'y avait pas de combat. La même page, ligne 15, écrit déjà la
sortie : *« L'état de combat est éphémère : on le jette. »* Et `equipement.ts:6` garde depuis un an un genre
d'objet nommé `lair`, commenté *« ticket d'antre — combat plus tard »*.

Cette spec ne casse aucune loi. Elle en tire la conséquence qu'on n'avait pas encore tirée :

> **La tenue d'une unité en bataille est une lecture de son mot, dépensée pendant la bataille et jetée à la
> fin. Le mot ne bouge pas. Rien n'est gravé. La conservation tient.**

C'est exactement ce que `combat.ts` calcule déjà — et que personne n'appelle.

## 1. La thèse

Les six lois n'empêchent pas un bon tactical RPG. Elles empêchent un mauvais.

| La loi dit | Le mauvais TRPG fait | Ce que la loi force — et qui est meilleur |
|---|---|---|
| Somme des axes = 64, toujours (`COMBAT_BUDGET`) | Épée +1, épée +2, épée +3 | **Aucune unité n'a plus de budget qu'une autre.** La loi fixe la somme, pas le *prix* de chaque axe : le moteur devait le faire, il le fait maintenant (§3, §9 ter). Mais elle ne rend pas les répartitions équivalentes — voir l'avertissement ci-dessous. |
| Rien n'est tiré au sort (`SPEC_TOUR.md:17`) | 73 % de chance de toucher | **Zéro dé.** La tension passe du dé au placement. C'est aussi la seule façon d'avoir une bataille **rejouable à l'octet** par un juge en CI. |
| Un objet ne mute pas | +50 XP, niveau 12 | **La progression est un roster, pas une courbe.** On recrute, on ne gonfle pas. Fire Emblem, pas Diablo. |
| Figures ≠ preuves | Le serveur arbitre | **L'intention ennemie est une figure** (annoncée, gratuite, n'engage rien) ; **le coup porté est une preuve** (signé, irréversible). |

**Un avertissement, mesuré après coup.** Cette thèse tient sur *quel* axe on pointe, pas sur *combien*. Une
fois le prix des axes corrigé, aucun des quatre n'achète la victoire (|r| < 0,13) — mais un mot **extrême**
reste plus faible qu'un mot équilibré, y compris contre les adversaires qui lui conviennent le mieux (93,9 % au
tier 1, 57,6 % au tier 12). L'agrandissement des salles, dont on espérait qu'il donne au spécialiste la place
d'atteindre sa niche, ne referme cet écart que de 5 points — l'hypothèse a été mesurée et elle est fausse. La cause n'est pas réglable : abattre demande de tenir *et* de frapper, un produit,
et concentrer un budget fixe sur un axe minore un produit. Un haut tier est donc, en duel, un **choix coûteux**
et non un sidegrade. Ce qui doit le rattraper est le jeu lui-même — en bataille rangée le joueur **choisit**
quand engager son spécialiste — et cela **n'est pas encore mesuré**. Tant que ça ne l'est pas, la forge de
`SPEC_CRAFT.md` monte vers des objets plus rares et plus faibles : ne pas la livrer sans le dire au joueur.

Ce dernier point est le cœur. *Into the Breach* a inventé la télégraphie des intentions ennemies pour supprimer
la frustration ; Eidos a déjà, dans sa doctrine, la distinction exacte entre ce qui se lit et ce qui engage. Les
deux se recouvrent parfaitement. **Lire est gratuit, signer coûte une feuille** (`BIBLE_VEILLEE.md:46`) devient
littéralement la règle de combat.

## 2. Le core modifié

Ajouté (nouveau dossier `atelier/src/lib/eidos/tactique/`) :

```
grille.ts     9×9, distance, portée, zone de contrôle, chemin (BFS entier)
unite.ts      une unité = un mot + une tenue éphémère + une case
bataille.ts   phases, ordre, résolution, télégraphie — fonction pure, zéro flottant
ia.ts         intention ennemie déterministe, annoncée avant le tour du joueur
preuve.ts     sérialisation canonique d'une bataille, rejouable
```

Modifié : `combat.ts` (on l'appelle enfin ; les quatre axes prennent un sens mécanique), `veillee-tour.ts`
(les gestes de bataille remplacent `parler`/`creuser`), `integrite.ts` (une constante de plus, aucune loi
retirée), `i18n.ts`, `package.json` (liste des tests, à la main).

**Non modifié, et c'est la garantie :** `utxo.py`, `federation.py`, `noeud.py`, le format `Tx`, `FORMAT 3`,
`vecteurs.json`, `wots.ts`, `xmss.ts`, `merkle.ts`, `carnet.ts`. Aucun `FORMAT 4`, aucune réinitialisation du
testnet, aucune régénération de genèse. La bataille est un **dérivé hors chaîne**, comme l'ascension et le
coffre horaire.

## 3. Le combat

**La grille.** La dalle 9×9 de l'étage (`tour.ts:15,58-72`), telle quelle. Carrée, sans hauteur — la hauteur
demande des flottants ou une table, et double la charge de lecture pour un gain douteux. 81 cases : la fenêtre
juste pour une bataille de 8 à 20 tours. Les cases pleines de la dalle sont des obstacles ; elles étaient déjà
tirées de `graineEtage`, elles servent enfin à quelque chose.

**Les quatre axes** (`combat.ts:19`, somme 64, déjà calculés, jamais utilisés) :

| Axe | Rôle tactique |
|---|---|
| `lame` | dégât porté |
| `ecu` | **tenue** de départ — les points qu'on dépense en encaissant, jetés en fin de bataille |
| `eperon` | pas de déplacement, et rang dans la phase (à égalité : l'ordre du roster) |
| `arc` | portée d'attaque, et reprise (une unité qui n'a pas agi de tout un tour récupère `arc/8` de tenue) |

Un mot extrême n'est pas plus fort : il est plus spécialisé. C'est déjà écrit en tête de `combat.ts:4-5`.

**L'ordre du tour.** Phases : joueur, puis ennemi. Pas d'ATB, pas de jauge continue — une accumulation
d'initiative est un cauchemar de rejeu déterministe et n'ajoute rien qu'un ordre par `eperon` ne donne déjà.
Dans une phase, l'ordre des unités est libre pour le joueur, imposé par `eperon` décroissant pour l'ennemi.

**La résolution — zéro dé.** Attaquant *a*, défenseur *d* :

```
base    = COUP_BASE + a.lame                    // 16..80
accord  = constructif → +base/4 | neutre → 0 | destructif → −base/4
dos     = frappé depuis la direction opposée au dernier déplacement de d → +base/2
allonge = distance(a, d) > portée(d) → +base/2  // d ne peut pas riposter
charge  = 4 × cases parcourues par a ce tour    // au plus 4 × pas(a)
coup    = max(1, base + accord + dos + allonge + charge)
d.tenue -= coup    // tenue = 2 × (COUP_BASE + d.ecu), 32..160
```

**`ecu` n'entre pas dans le coup** : il achète la tenue, une fois. Il la réduisait aussi, et se payait donc
deux fois — mesuré, `r(ecu, victoire)` tombe de +0,59 à +0,14 quand on le lui retire. Le socle du coup et
celui de la tenue sont le même nombre au facteur 2 près, pour qu'un point de `lame` vaille un point de `ecu`.
Le plancher de 1 est un garde-fou, pas un réglage : le coup le plus faible mesuré vaut 12. Le **dos est
purement positionnel** — la tentation était de le lier à `memeOrbite`, mais la mesure la donne vraie 96 fois
sur 1 999 000 paires. La table d'affinités, elle, n'est pas une table de designer : c'est le produit scalaire
de deux quaternions (`resonance.ts`).

**La riposte.** Frappée à une distance d'où elle atteint son attaquant, une unité **plus vive** que lui
(`d.eperon > a.eperon`, strictement) lui rend le coup. Elle ne consomme **aucune feuille** — personne ne la
choisit — ne dépense pas la frappe du tour du riposteur, entre au journal comme un `Coup` marqué `riposte`,
et **on ne riposte jamais à une riposte**. Sa condition est l'exacte négation de l'allonge : frapper de plus
loin que la cible ne porte, c'est `+base/2` **et** aucun coup rendu.

**La charge.** Chaque case parcourue avant de frapper ajoute 4 au coup — le seul terme **additif** de la
résolution, pour qu'il profite d'abord à qui frappe faible. L'élan est le coût du chemin, pas la distance à
vol d'oiseau, et il s'éteint à la fin de la phase : on ne riposte jamais en charge.

**Le pas et la portée se règlent ensemble.** `pas = 2 + eperon/32` (2..4), `portée = 1 + arc/10` (1..7). Ces
quatre nombres ont été recalés le jour où `dalleDe` est passée d'un bit à deux par case : la plus grande salle
d'un seul tenant a triplé (19,8 → 56,8 cases sur 81) et la mobilité s'est mise à valoir bien plus cher sans
qu'une ligne du moteur ait bougé — `r(eperon)` est monté de +0,126 à +0,293, et `r(arc)` est tombé à −0,367.
La règle qui en sort, et que `unite.test.ts` contrôle : **le pas le plus long reste sous la portée la plus
longue**, sinon un archer est rattrapé avant d'avoir tiré et `arc` cesse d'acheter quoi que ce soit (mesuré à
pas 4..8 : `r(arc)` = −0,48).

**Ce que ça vaut, mesuré** (330 144 duels, 2 000 mots, huit distances d'engagement, trois politiques, sur les
dalles à deux bits) : la corrélation de chaque axe au taux de victoire tient sous **0,075** (`lame` −0,065,
`ecu` +0,075, `eperon` −0,044, `arc` +0,032) ; le quartile haut de `lame+ecu` sur le quartile bas vaut 1,00×
contre 19× à l'origine ; le rapport entre pointe `lame`/`ecu` et pointe `eperon`/`arc` va de 0,85 à 1,36×
selon le tier, contre 19,6× avant — **la réserve bloquante de `SPEC_LOOT_TIERS.md` §4 est levée** ; une
bataille dure 2 coups en médiane et 4 au 95ᵉ centile ; aucun coup ne porte zéro.

**LIMITE : l'extrémité d'un mot reste un malus.** Le taux de victoire décroît de 55,6 % au tier le plus bas à
19,5 % au plus haut, et il décroît aussi *dans la niche* — contre le quartile d'adversaires le plus favorable,
93,9 % à 57,6 %. On pouvait espérer que l'agrandissement des salles donne enfin au spécialiste la place
d'atteindre sa niche : **il ne la lui donne pas.** L'écart de niche ne se referme que de 41,5 à 36,4 points, et
la bande sur le pool s'ouvre de 24,4 à 36,1. La cause est arithmétique et non réglable par une constante :
abattre demande de **tenir** *et* de **frapper**, un produit, et concentrer un budget fixe sur un seul axe
minore un produit. Ce que le prix des axes corrige, c'est *lequel* des quatre on pointe ; ce qu'il ne corrige
pas, c'est *combien* on pointe.

**Zone de contrôle.** Une unité exerce un contrôle sur ses cases adjacentes ; y entrer arrête le déplacement.
Sans elle, joueur et IA glissent entre les lignes et la bataille perd sa tension de formation.

**Télégraphie.** Avant le tour du joueur, chaque ennemi affiche sa case cible et son type d'attaque. C'est une
**figure** : elle n'engage rien, elle se lit gratuitement, elle peut se révéler fausse si le joueur déplace la
cible. Le joueur voit tout, décide tout, et chaque mort est de sa faute.

## 4. La feuille comme munition

C'est le point où le jeu cesse d'être un tactical de plus.

Aujourd'hui la Veillée entre avec un arbre XMSS de 64 feuilles ; chaque geste en brûle une ; l'arbre vide, c'est
la fin (`veillee.ts`). En bataille :

- **Se déplacer ne signe pas.** Regarder, mesurer une portée, lire une intention, annuler : gratuit.
- **Frapper signe.** Une feuille par coup porté. Irréversible, dans l'ordre, vérifiable par n'importe qui.
- **Une bataille coûte 6 à 10 feuilles.** Un arbre de 64 porte donc **6 à 8 batailles** — une run de 45 à 60
  minutes, la fenêtre d'*Into the Breach*.

La parcimonie n'est plus une abstraction : **chaque coup que tu portes est un coup que tu ne porteras jamais
plus.** Achever un ennemi presque mort coûte la même feuille qu'ouvrir une brèche. Le dilemme est permanent,
et il est cryptographique, pas scénarisé.

Une unité dont la tenue tombe à zéro est **retirée de la bataille**. Dans une bataille ancrée, elle est retirée
du roster : son mot a servi. La permadeath n'est pas une règle du jeu, c'est la même primitive que la sécurité
du réseau — une clé ne signe qu'une fois, et c'est la vie.

## 5. Les unités et la progression sans niveau

**Une unité = un objet du coffre.** Le modèle existe (`objets.ts:41-45` : mot u32, archétype, âge), les stats
existent, la fiche existe. Rien à inventer.

**Recruter, pas monter.** On ne gagne pas d'expérience. On gagne :
- des **captures** — les occupants d'étage pris par capsule deviennent des unités jouables ; les 21 cellules
  de la doxa (`bestiaire.ts`) sont la grille de roster, 3 classes × 7 régimes ;
- des **pierres** — tourner une pièce donne une *autre* pièce, même norme, autre forme (`equipement.ts`) :
  c'est du recrutement déguisé en forge, jamais une amélioration ;
- des **sceaux** — les reliques ouvrent les portes de quartier (64/128/192) : de la progression de zone, pas
  de puissance.

La courbe de difficulté ne vient donc pas de stats qui montent des deux côtés, mais du **nombre et de la
disposition** des ennemis, et de la géométrie des étages. C'est la courbe d'*Advance Wars*, pas celle d'un JRPG.

## 6. Le lore modifié — les Indéchiffrés

Il manque au jeu un adversaire. Aujourd'hui, de l'aveu de la bible, *« le seul adversaire est le compte des
feuilles »* (`BIBLE_VEILLEE.md:12`) : c'est une ambiance, pas un conflit.

**Proposition, entièrement dérivée du lore existant, sans mythologie neuve** (`TRANSPOSITION_EIDOLON.md` :
transposer, ne pas refonder) :

La Chambre de Genèse a neuf œufs ; le neuvième, L'Inconnu, devient Uranie, *« qui lit et ne donne rien »*
(`LORE_CHAMBRE.md:8-19`). La doxa range toute forme en 21 cellules, par proximité à l'une des 101 formes du
catalogue (`cosmos-empreintes.ts`).

**Les Indéchiffrés sont ce qui refuse d'être rangé.** Ce sont des mots dont aucune forme du catalogue n'est
assez proche : `formeProche` rend un alignement sous un seuil. Ils n'ont pas de cellule, donc pas de nom, donc
pas de fiche. Ils ne sont pas *maléfiques* : ils sont **illisibles**, et une tour qui n'existe que pour lire ne
supporte pas ce qu'elle ne peut pas lire. Les muses les combattent parce qu'un Indéchiffré dans un étage rend
tout l'étage illisible — le brouillard de `SPEC_BROUILLARD.md` en est déjà la trace.

Ce que ça donne mécaniquement, gratuitement :
- un **critère calculable** (alignement au catalogue sous seuil) : le bestiaire adverse n'est pas une liste
  écrite à la main, il se dérive comme tout le reste ;
- une **raison de se battre** qui ne contredit pas « la Tour ne rend pas plus fort » : on ne monte pas pour
  devenir puissant, on monte pour rendre les étages lisibles ;
- les **gardiens/séparateurs** déjà prévus en PR 5 de la Veillée et jamais codés trouvent leur place : ce sont
  les Indéchiffrés des portes ;
- une **fin** : l'étage 254, Uranie, qui lit tout — et l'Indéchiffré qui s'y tient est le seul qu'elle ne lit pas.

Tout le reste du lore tient sans une ligne de réécriture : quatre âges, neuf muses et leurs services, la
Chambre, les reliques, les sceaux, les 21 cellules. Ce qui se jette est mince — les textes de fiche et de
titre (`fiche.ts`, `titres.ts`, `objets-lexique.ts`), purement cosmétiques.

## 7. Le PvP — des fantômes, pas des duels

Un bloc dure une heure. Le PvP synchrone est hors de portée et le prétendre serait du théâtre.

Ce qui marche à cette cadence est documenté : les fantômes (*Super Auto Pets* Arena, *Phantom Abyss*) et la
graine partagée (*Slay the Spire* Daily Climb). Une bataille terminée exporte une **armée figée** : composition,
positions de départ, séquence de coups signés, graine. Un autre joueur l'affronte en asynchrone ; l'arbitre
déterministe (§3) garantit que les deux camps rejouent le même combat au même résultat.

Le fantôme est signé par la clé XMSS de son auteur : son authenticité se vérifie sans rejouer la run entière.
Tri par cohorte de cycle (1008 blocs) — sinon un fantôme trop fort décourage les nouveaux pour toujours.

## 8. Le dépôt de preuves

Le patron existe et se recopie presque mécaniquement depuis `veillees.yml` + `depot.ts` : issue GitHub titrée
`bataille`, corps passé par `EIDOS_ISSUE_BODY` (jamais interpolé), juge TypeScript déterministe en CI, commit
dans `batailles/` avec un `index.json`. Le frein reste la pièce d'ancrage : une bataille ancrée par jour et par
pièce, comme la veillée.

Le juge vérifie : la tête signée, la pièce prouvée contre `utxo_root`, chaque feuille dans l'ordre, et **le
rejeu de la bataille coup par coup** — c'est là que le déterminisme total du §3 paie. Une preuve fabriquée
côté client ne passe pas, parce que le juge est le même code que le moteur.

## 9. Les décisions

**Tranchées par l'auteur le 2026-09-10 :**

- **D1 — La tenue : ACCEPTÉE, éphémère.** La tenue part de `ecu`, se dépense en encaissant, se jette à
  la fin de la bataille. Le mot ne bouge pas. C'est le sens de `SPEC_TOUR.md:15`.
- **D2 — La feuille : UN COUP PORTÉ, UNE FEUILLE.** Se déplacer, mesurer, lire une intention, annuler :
  gratuit. Frapper signe. 6 à 10 feuilles par bataille, 6 à 8 batailles par arbre.
- **D6 — L'échange : OUVERT.** Les unités se transfèrent par la lignée (`ETUDE_ECHANGE_OBJETS.md`, option d).
  L'équilibrage suppose un marché. Voir §9 bis — c'est moins risqué ici qu'ailleurs, et pour une raison
  structurelle.

**Encore ouvertes :**

- **D3 — Hauteur de l'arbre.** Rester à 64 feuilles (h=6, construction 1,3–1,6 s) ou passer à 256 (h=8,
  ~5 s, exige le Web Worker déjà au reste-à-faire). *Recommandation : rester à 64 ; 6 à 8 batailles suffisent
  à une run. À reconfirmer une fois la calibration du moteur mesurée.*
- **D4 — La graine connue d'avance.** Avec une graine tirée d'une tête déjà signée, un joueur peut simuler la
  carte hors ligne avant de dépenser une feuille. Trois sorties : (a) l'assumer, comme le Daily Climb de
  *Slay the Spire* — la graine est la même pour tous, la préparation fait partie du jeu ; (b) commit-reveal —
  s'engager au bloc *h*, jouer la graine du bloc *h+1* ; (c) une seule bataille ancrée par jour. *Recommandation :
  (a) + (c), et le documenter en LIMITE. (b) ajoute un abandon de dernier révélateur pour peu de gain.*
- **D5 — La permadeath.** Une unité tombée en bataille ancrée est-elle retirée du roster définitivement, ou
  seulement de la run ? *Recommandation : retirée du roster. Avec D6 ouvert, cette décision cesse d'être un
  simple réglage de difficulté : elle devient le puits de l'économie (§9 bis). À trancher avant la PR 6.*

## 9 bis. Le marché — pourquoi il est sûr ici

D6 ouvre le transfert des unités. Dans n'importe quel autre jeu, c'est le début de la fin : dès qu'un objet a
un prix, chaque joueur rationnel optimise l'extraction et non le plaisir, et l'économie se vide de l'intérieur.
C'est la cause racine documentée de l'effondrement d'Axie Infinity — émission sans puits, dépendance
structurelle à l'afflux de nouveaux joueurs.

Eidos échappe aux deux moitiés du piège, et pas par chance :

**1. La loi de conservation interdit le power creep.** La somme des axes vaut 64. Toujours, pour toute unité,
sans exception possible — `integrite.ts` le vérifie et la CI le contrôle. Un marché ne peut donc échanger que
des **formes**, jamais de la puissance. Il n'existe pas d'objet « meilleur » à acheter : il existe des objets
autrement faits. Un joueur riche a un roster plus *large*, jamais plus *fort*. C'est la différence exacte entre
Fire Emblem et Diablo, et ici elle est garantie par une loi, pas par la discipline d'un game designer.

**2. La permadeath est le puits qui manquait.** Une unité tombée en bataille ancrée est un mot brûlé
(D5). Le marché a donc une **sortie**, pas seulement une entrée — ce qu'aucun P2E n'avait. Le robinet et les
captures alimentent, la bataille détruit. Le débit des deux est borné par la même chose : une pièce ancre un
run par bloc, un bloc dure une heure.

**3. Il n'y a pas de monnaie de sortie.** Le testnet n'a aucune valeur, par construction et par déclaration.
Ce qui s'échange s'échange contre autre chose du jeu, jamais contre de l'argent.

Ce qui reste à surveiller, et qui devient la vraie question d'équilibrage :

- **La rareté se concentre sur la proximité au catalogue.** `fiche.ts` lit une rareté en centièmes (distance
  à la forme la plus proche des 101). C'est là que la valeur marchande va se loger. À vérifier : qu'une forme
  rare soit *rare*, pas *forte* — la somme 64 le garantit sur les axes, mais un régime rare pourrait donner
  une polarité systématiquement favorable. **À mesurer** : sur les 101 formes, la distribution des polarités.
  Si une cellule de la doxa gagne contre toutes les autres, il faut le savoir avant d'ouvrir le marché.
- **L'accumulation.** Rien n'empêche un joueur d'amasser. Le frein est le débit d'entrée (robinet : une
  demande par compte et par cycle) et la permadeath. À documenter comme limite assumée, pas à sur-blinder.
- **La taille de la preuve de lignée** grandit avec le nombre d'échanges. La borne sur N reste ouverte dans
  `ETUDE_ECHANGE_OBJETS.md` ; il faudra la fixer, ou prévoir un point de reprise signé.

## 9 ter. Le prix des axes — le vrai trou, mesuré

`ETUDE_EQUILIBRAGE_TACTIQUE.md` a mesuré ce que §9 bis supposait acquis. Deux résultats, opposés.

**Ce qui est sain, et pour une raison structurelle.** `polariteDe` est **exactement symétrique** : zéro
asymétrie sur 3 998 000 paires. « Constructif contre tout » veut dire « tout est constructif contre moi », et
l'accord s'applique aux deux camps. Aucun régime (σ 0,56) ni aucune cellule (σ 1,10) ne domine. Et surtout :
**rareté ≠ force**, r = +0,045 — le signe est même légèrement inversé. Le marché de D6 ne se concentrera pas
sur les formes rares.

**Ce qui ne l'était pas.** La conservation fixe la *somme* des axes, elle ne fixe pas le *prix* de chacun.
Dans la résolution d'origine, `lame + ecu` corrélait à **0,899** avec le taux de victoire : les objets à
`lame+ecu ≥ 48` gagnaient **77,1 %** des duels, ceux à ≤ 15 en gagnaient **3,97 %** — un rapport de **19×**.
`eperon` n'achetait que l'initiative, `arc` n'achetait rien. Sur un marché ouvert, tout le monde aurait
voulu le même profil, et le power creep serait revenu par la fenêtre : non pas des objets *plus gros*, mais
un unique profil *toujours meilleur*.

D'où l'**allonge** (§3) : frapper de plus loin que la cible ne peut riposter vaut `+lame/4`. `arc` a
désormais un prix, et ce prix est positionnel — il se gagne en jouant bien, pas en possédant mieux.

Deux cibles à tenir, à vérifier à chaque changement du moteur :
- **|r| par axe sous 0,30** entre la valeur d'un axe et le taux de victoire ;
- **rapport quartile haut / quartile bas de `lame+ecu` sous 3×** (il était à 19×).

Deux corrections mineures tombées de la même mesure :
- la **rareté est presque une constante** — proximité au catalogue entre 78 et 100 sur 2 000 objets, σ 2,67,
  et deux des cinq paliers de `RARETES` sont inatteignables. À reprendre si la rareté doit servir au marché ;
- la forme de **rang 0 (`ancre`)** a un score de +19 contre −12 au mieux pour les autres : elle ne doit
  jamais être donnée à une unité.

## 10. Découpage

Un chantier = une branche = une PR, jamais deux à la fois.

| PR | Contenu | Fichiers | Lignes (code + tests) |
|---|---|---|---|
| 0 | cette spec, décisions tranchées | 1 doc | — |
| 1 | `grille.ts`, `unite.ts` — géométrie, portée, zone de contrôle, chemin | 4 | 500–700 |
| 2 | `bataille.ts` — phases, résolution, télégraphie, vecteurs gelés | 3 | 700–1 000 |
| 3 | `ia.ts` — intention déterministe | 2 | 400–600 |
| 4 | rendu de grille sur le socle `components/canvas/` existant | 5 | 700–1 000 |
| 5 | branchement Veillée : feuilles = coups, sac, permadeath | 4 | 400–700 |
| 6 | `batailles/`, `depot-bataille.ts`, workflow | 5 | 500–800 |
| 7 | lore : les Indéchiffrés, i18n FR/EN, Guide | 4 | 300–500 |

**Total : 27 à 30 fichiers, 3 500 à 5 300 lignes**, dont ~40 % de tests (obligatoires : toute règle de refus a
son contrôle qui la viole). Aucune ligne de Python. Chaque nouveau `.test.ts` s'ajoute à la main dans
`package.json` et dans `CLAUDE.md` §2.

## 11. Limites assumées

- **Le réseau n'en sait rien.** Une bataille est une jauge. Seuls la preuve exportée et les sceaux engagent.
  Figures ≠ preuves : l'intention ennemie, la tenue, le classement sont des lectures.
- **Pas de PvP synchrone.** Jamais, à un bloc par heure. Des fantômes, et c'est tout.
- **Pas d'atomicité d'échange.** D6 est ouvert : la lignée prouve le passage de main, jamais le troc payé.
  Rien ne garantit qu'un vendeur soit payé ; l'accord reste hors chaîne.
- **Multi-comptes.** Le frein est le compte GitHub et la pièce. Un joueur à trois comptes joue trois fois. Sur
  un testnet sans valeur, c'est une limite documentée, pas un trou à sur-blinder — et surtout pas avec une
  empreinte de navigateur ou une preuve de travail client (`SPEC_SYBIL.md:48-51`).
- **La carte est connue d'avance** si D4 se règle en (a). C'est le choix du Daily Climb : on compare les
  décisions, pas la chance.
- **Le juge devient plus lourd.** Une grille, une portée, une zone de contrôle sont plus dures à garder
  identiques à l'octet qu'un parcours de pendule. Chaque règle nouvelle exige son vecteur gelé.
