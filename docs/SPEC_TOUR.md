# Spécification — La Tour : hôtes, secrets, élixirs, sceaux

**Dépôt :** Oykdo/Eidos
**Statut :** spécification, rien n'est codé (2026-09-04)
**Périmètre :** `atelier/` uniquement — jeu local, hors invariant. Le nœud et la chaîne ne changent pas.
**S'appuie sur :** `tour.ts`, `objets.ts`, `equipement.ts`, `combat.ts`, `groupe.ts`, `integrite.ts`, `poste.ts`, `inventaire.ts`, `signatures.ts`, `relique-qr.ts`, `docs/HANDOVER_RELIQUES_QR.md`

---

## 0. Ce qui ne bouge pas

Les six lois de `integrite.ts` sont gelées : conservation, groupe, doxa, sceau, époques, résonance. Tout ce qui suit s'y plie :

- **Aucun point de vie, aucune expérience, aucun niveau.** Un combat est une lecture de deux mots (orbite, parade, résonance), pas une soustraction. « L'état de combat est éphémère : on le jette. »
- **Un objet ne mute pas.** Le mot de 32 bits est une identité. Une pierre *tourne* une pièce en une nouvelle pièce ; une gemme s'*enchâsse* sans toucher au mot.
- **Un palier ne multiplie pas la norme.** Monter dans la Tour ne rend pas plus fort ; on y lit mieux.
- **Rien n'est tiré au sort.** Tout dérive de graines : `SHA-256d(tag ‖ …)`. Deux coffres, même étage : deux lectures, reproductibles.
- **Le réseau n'en sait rien.** Hôtes, élixirs, secrets vivent dans la *jauge* du coffre (`eidos.carnet`, hors feuille), jamais dans le carnet UTXO ni dans la chaîne.
- **Figures ≠ preuves.** Une seule chose de la Tour repose sur la chaîne : les **sceaux**, qui sont des reliques du monde détenues dans le coffre (§5).

## 1. Le lore, tel qu'il est déjà écrit

- La Tour a **255 coupes** de l'espace SU(2), **Terre au sol, Uranie au faîte**, en neuf bandes qui sont les neuf **astres** et leurs **muses** : ⊕ Thalie, ☽ Clio, ☿ Calliope, ♀ Terpsichore, ☉ Melpomène, ♂ Érato, ♃ Euterpe, ♄ Polymnie, ★ Uranie.
- Chaque étage a une **coupe** (un quaternion de norme `ATOMES`), une **dalle** 9 × 9 tirée de sa graine, et un à trois **occupants** de la classe du biome. « Les occupants d'un étage s'interfèrent » : même classe, résonance destructive.
- **La ville est le coffre.** On y crée des blocs (poste du jour : trois), on y tire des objets (101 formes, jamais un stock), on y sertit pierres et gemmes.
- Les objets ont un **archétype** (une muse), un **âge** (Satya, Trétâ, Dvâpara, Kali : une géographie, pas une puissance), quatre axes de combat à somme 64 (fer, cuirasse, flux, souffle).
- L'alchimie est déjà là : les trois étages d'un glyphe sont la **tria prima** — sel, mercure, soufre ; les artefacts du robinet sont des **œufs de Paracelse** ; la pierre **philosophale** est réservée aux dix premiers coffres.
- Le genre **antre** (`lair`, « ticket d'antre, combat plus tard ») existe dans `equipement.ts` et attend.

La spec ne crée aucune mythologie neuve : elle donne des visages, des voix et des usages à ce qui est déjà nommé.

## 2. Vocabulaire fixé

| Mot | Sens dans la Tour |
|---|---|
| **étage** | une des 255 coupes ; `etageDe`, `coupeDe`, `dalleDe`, `occupantsDe` existants |
| **bande** | les ~28 étages d'un astre ; le **biome** |
| **quartier** | les quatre tranches d'âge : Kali 0–63, Dvâpara 64–127, Trétâ 128–191, Satya 192–254 |
| **porte** | le premier étage d'un quartier (64, 128, 192) : fermée sans **sceau** de l'âge |
| **hôte** | un personnage d'étage, dérivé de la graine : une des neuf muses, ou un familier de sa bande |
| **secret** | un étage ou un passage que la lecture révèle : alcôve, écho, antre, observatoire |
| **élixir** | un consommable de la tria prima : sel, mercure, soufre ; effet sur *un* étage, puis jeté |
| **antre** | un étage clos, ouvert par un ticket, gardé par un occupant d'élite |
| **sceau** | une relique du monde (QR) détenue dans le coffre ; son âge ouvre un quartier |

## 3. Les hôtes

### 3.1 Présence

Un hôte est présent à l'étage `e` si `graineEtage(e)[1] % 7 === 0` : environ un étage sur sept, comme un œuf sur sept gouttes. Les étages **0** (Thalie, la porte de la ville) et **254** (Uranie, l'observatoire) ont toujours leur muse. Chaque porte de quartier (64, 128, 192) a toujours un hôte : le **portier**.

### 3.2 Identité

- La muse de la bande est l'hôte « majeur » ; elle n'apparaît qu'une fois par bande, à l'étage médian de la bande (arrondi vers le bas).
- Ailleurs, l'hôte est un **familier** de la muse : nom = `nomDe(genre, emplacement, roll)` réutilisé sur un lexique de rôles (voir 3.3), avec le glyphe de son mot comme visage (`GlypheSvg` des trois étages).
- Graine d'hôte : `SHA-256d("eidos-hote/1" ‖ étage)` → rôle, réplique, demande, don. **Indépendante du coffre** : tout le monde rencontre le même hôte au même étage. Ce qu'il donne, lui, dépend du coffre (3.5).

### 3.3 Les neuf muses et leurs rôles

| Astre | Muse | Rôle | Ce qu'elle demande | Ce qu'elle donne |
|---|---|---|---|---|
| ⊕ Terre | **Thalie** | l'aubergiste, au sol | rien : elle accueille | le **poste du jour** (rappel), un élixir de **sel** au premier passage |
| ☽ Lune | **Clio** | l'archiviste | une preuve d'inclusion d'une de vos pièces (Journal) | un élixir de **sel** ; lit votre historique à voix haute |
| ☿ Mercure | **Calliope** | l'apothicaire | deux objets de même orbite (`memeOrbite`) | un élixir de **mercure** |
| ♀ Vénus | **Terpsichore** | la maîtresse de danse | une paire en résonance **constructive** | une **gemme** |
| ☉ Soleil | **Melpomène** | la tragédienne | un objet de la classe du biome | un élixir de **soufre** |
| ♂ Mars | **Érato** | la forgeronne | une pierre et une pièce sertissable | tourne la pièce (craft existant) sans consommer l'élixir |
| ♃ Jupiter | **Euterpe** | la musicienne | trois objets dont la résonance d'ensemble est tenue | un **ticket d'antre** |
| ♄ Saturne | **Polymnie** | la gardienne des hymnes | un sceau (relique) de l'âge courant | révèle l'**écho** du quartier (§4.2) |
| ★ Uranie | **Uranie** | l'astronome, au faîte | rien | lit la **tête du réseau** (Témoin) : hauteur, validateur, racine UTXO |

Les familiers reprennent le rôle de leur muse en mineur : ils donnent au plus un élixir, jamais de ticket ni de gemme.

### 3.4 Répliques

Trois répliques par hôte, choisies par la graine dans un lexique de **27 phrases par muse** (3 × 9) écrites une fois dans `lib/eidos/hotes-lexique.ts`, FR et EN. Ton : celui du projet, une phrase, un verbe, pas de lore inventé — chaque phrase cite une règle vraie (« même norme à chaque palier », « une clé ne signe qu'une fois », « le rendu sous dix mille atomes devient frais »). L'hôte est un guide qui dit vrai, jamais un oracle.

### 3.5 Dons

Un don est un **objet** tiré comme les autres : `graine = SHA-256d("eidos-don/1" ‖ étage ‖ maître:n)`. Un seul don par (coffre, étage) ; il est noté dans la jauge (`coffre.tour.dons: number[]` = étages honorés). Le don ne dépend pas du bloc : la Tour ne mine pas.

Genres possibles d'un don : `elixir` (nouveau genre, §6), `gemme`, `pierre`, `lair`. Jamais `arme`, `armure`, `philosophale` : les armes se trouvent en ville, la philosophale reste aux dix premiers coffres.

## 4. Les secrets

Quatre sortes, toutes lisibles sans rien tirer au sort.

### 4.1 Alcôves

Un étage a une alcôve si sa dalle 9 × 9 a la case centrale à `true` et est symétrique par rapport à la diagonale (`dalle[y][x] === dalle[x][y]`). Environ un étage sur cinq cents : rare. L'alcôve contient un **coffret** : un don supplémentaire (graine `"eidos-alcove/1"`), de genre `gemme` ou `elixir`. La page affiche la dalle ; c'est au joueur de voir la symétrie. Aucun indice textuel.

### 4.2 Échos

Deux étages sont en écho si leurs coupes sont de **même orbite** (`memeOrbite(coupeDe(a), coupeDe(b))`). Polymnie révèle, pour le quartier courant, la liste des paires en écho. Monter les deux étages d'un écho **dans l'ordre** (le plus bas puis le plus haut, sans redescendre) donne un élixir de mercure. La jauge note `coffre.tour.echos: [a, b][]`.

### 4.3 Antres

Un **ticket d'antre** (genre `lair`, existant) ouvre l'antre de l'étage où il a été donné, ou de tout étage de la même bande. L'antre est un étage clos avec un seul occupant, le **gardien**, dont le mot tient l'axe du biome au seuil élite (`tientAxe`, `COS_ELITE`) ; à la porte de quartier, au seuil suprême (`COS_SUPREME`).

Le duel est une lecture, en trois temps, sans points de vie :
1. **Orbite** : votre objet et le gardien sont-ils de même orbite ? Oui : le gardien s'efface (constructif). Non : temps 2.
2. **Parade** : `ḡ(A)·(A·B)` rend-il B ? Oui : passage. Non : temps 3.
3. **Résonance** d'ensemble de votre coffre contre le gardien : tenue > 0 : passage ; sinon **repoussé** d'un étage. Rien n'est perdu, rien n'est gravé.

Récompense : un don d'antre (`"eidos-antre/1"`), toujours une gemme ou une pierre de rang 3 ; le ticket est consommé (retiré de la jauge, l'objet garde son mot : un ticket usé est un objet `lair` marqué `palierLair` = étage).

### 4.4 L'observatoire

L'étage 254 est l'observatoire d'Uranie. Il ne donne rien : il **lit**. La tête signée du réseau (Témoin), les reliques du monde et leur statut, le nombre d'étages honorés du coffre. C'est la seule fenêtre de la Tour sur la chaîne, et elle reste une lecture.

## 5. Les sceaux et les portes

Un **sceau** est une relique du monde (`docs/HANDOVER_RELIQUES_QR.md`) détenue dans le coffre : une pièce à une adresse dont le coffre a la graine, déclarée dans `reliques.json` avec un âge. Trois usages, tous déjà outillés :

1. **La mise.** La relique porte au moins le prix de son âge (`prixReliqueAtomes` : Kali 2,10 … Satya 33,55). Le nœud publie « scellée » ou « sous-scellée » dans `etat.json` (chantier H3 du hub).
2. **La porte.** Les étages 64, 128, 192 ne s'ouvrent qu'avec un sceau de l'âge du quartier qu'ils ouvrent (Dvâpara, Trétâ, Satya). Le portier le lit dans le coffre : `sortiesDuCoffre` ∩ `reliques.json`. Sans sceau, on peut *voir* l'étage, pas y monter.
3. **Le trophée.** Un sceau s'exporte : preuve d'inclusion de la pièce contre la racine UTXO signée (Témoin) + identifiant de relique. Quiconque le juge sans rejouer.

Dans le **coffre d'atelier** (graine publique), les portes sont ouvertes : démonstration. Dans un coffre personnel, seul un sceau ouvre. L'achat local de reliques d'âge disparaît.

## 6. Les élixirs

Nouveau genre d'objet : `elixir`, trois espèces, une par étage de la tria prima. Un élixir est un objet comme un autre (mot, archétype, âge) dont le genre est `elixir` et dont l'**espèce** est l'étage dominant de son glyphe : sel (figure ○), mercure (☽), soufre (✚). Il se **boit** à un étage : effet pour cet étage seulement, puis l'objet est retiré de la jauge. Le mot n'est pas réécrit : un élixir bu est noté dans `coffre.tour.bus: number[]` (mots), jamais réutilisable.

| Espèce | Effet sur l'étage | Ce qu'il lit |
|---|---|---|
| **Sel** | une résonance destructive est lue **neutre** | stabilité : « ce qui ne se divise pas » |
| **Mercure** | la parade est accordée d'office (temps 2 du duel) | mobilité : la conjugaison `ḡ(A)·(A·B)` |
| **Soufre** | une pierre tourne une pièce sans forgeronne, une fois | transmutation : le craft existant |

Aucun élixir ne touche les axes de combat, la norme, ni le mot. Un élixir ne s'achète pas : il se reçoit d'un hôte, d'une alcôve ou d'un écho.

## 7. Modèle de données (jauge, `eidos.carnet`)

```ts
type Tour = {
  etage: number;              // dernier étage atteint
  dons: number[];             // étages dont l'hôte a été honoré
  echos: [number, number][];  // échos parcourus
  antres: number[];           // antres franchis
  bus: number[];              // mots des élixirs bus
  portes: NomAge[];           // portes ouvertes (lecture des sceaux au moment du passage)
};
```

`coffre.tour` est **hors feuille** : `empreinteCarnet` ne le couvre pas, comme `objets` aujourd'hui. Tout s'y recalcule depuis les graines et l'historique ; perdre `tour` ne perd rien de vérifiable. Les élixirs sont dans `coffre.objets` avec `genre: "elixir"` ; `GENRES` gagne `"elixir"`, `estObjetPorte` l'accepte.

## 8. Rendu

- **TourCanvas** garde la coupe et la dalle. L'hôte est un **glyphe** (trois figures de son mot) posé sur la dalle, sa réplique en monospace sous la scène ; pas de sprite, pas de visage dessiné.
- Les élixirs sont trois fioles dessinées avec les figures : `·○·`, `·☽·`, `·✚·`.
- Un antre assombrit la dalle et centre le gardien ; une porte affiche le sceau attendu en glyphes d'âge.
- L'observatoire reprend la scène des coffres (gaussienne + sphère) avec la tête du réseau en légende.
- Mouvement réduit : tout reste lisible en texte.

## 9. Contrôles à écrire (par module, `assert` nus, comme le reste)

- `hotes.test.ts` (5) : présence déterministe (1 sur 7, 0 et 254 toujours, portes toujours) ; une muse par bande à l'étage médian ; répliques dans le lexique ; don unique par (coffre, étage) ; jamais d'arme ni de philosophale en don.
- `secrets.test.ts` (4) : alcôve = dalle symétrique à centre vrai ; échos = même orbite, ordre exigé ; antre : les trois temps du duel sur des mots figés ; observatoire sans don.
- `elixirs.test.ts` (4) : espèce = étage dominant ; effet borné à un étage ; élixir bu retiré et noté ; mot jamais réécrit.
- `sceaux.test.ts` (3) : porte fermée sans sceau, ouverte avec ; coffre d'atelier toujours ouvert ; trophée = preuve jugée contre `utxo_root`.
- `integrite.test.ts` : les six lois passent inchangées ; `INTEGRITE` ne gagne aucune constante flottante.

## 10. Chantiers, dans l'ordre

| | Chantier | Dépend de | Taille |
|---|---|---|---|
| T1 | `elixir` comme genre, `coffre.tour`, `Tour` dans le store | — | ½ j |
| T2 | hôtes : présence, identité, lexique 27 × 9 FR/EN, dons | T1 | 1 j |
| T3 | secrets : alcôves, échos, observatoire | T1 | ½ j |
| T4 | antres : duel en trois temps, gardien, ticket consommé | T1, T2 | 1 j |
| T5 | portes et sceaux : lecture des reliques du coffre, trophée exportable | H3 (hub), P3 | 1 j |
| T6 | rendu : glyphes d'hôtes, fioles, portes, observatoire | T2–T5 | 1 j |

H2 (carte des reliques) et H3 (sceaux) du hub précèdent T5.

## 11. Décisions qui vous reviennent

1. Les **27 répliques par muse** : je les écris, ou vous les écrivez ? Elles portent la voix du projet.
2. Les portes : un sceau **de l'âge exact**, ou tout sceau d'âge supérieur ouvre aussi ?
3. Le coffre d'atelier : portes ouvertes (démonstration) ou fermées (même règle pour tous) ?
4. Faut-il une **carte de la Tour** (255 cases, honorées / secrètes / fermées) dans la page, ou la Tour reste-t-elle à découvrir étage par étage ?
