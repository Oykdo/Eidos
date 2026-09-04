# Cap — faire d'Eidos un metroidvania

**Dépôt :** Oykdo/Eidos
**Statut :** cap proposé (2026-09-04), à valider par l'auteur avant tout chantier. Rien n'est implémenté ici.
**Question posée :** « le reste du projet, qu'en penses-tu ? peux-tu me recentrer pour en faire un metroidvania-like ? »

## 1. Avis franc sur l'état du projet

**Ce qui est fort.** Le cœur tient : émission bornée gelée, signatures par hachage, rejeu intégral, fédération, réseau d'essai forgé par la CI, parité Python ↔ TypeScript à l'octet. Tout est testé, tout se rejoue, rien ne se croit. La règle « figures ≠ preuves » et le principe Sybil (« ce qui compte est ancré, ce qui est libre ne vaut rien ») sont une vraie idée de conception : le jeu peut être généreux sans que rien de gratuit ne pèse sur la chaîne. Les reliques QR font entrer le monde physique dans la chaîne par une clé à usage unique : c'est le pont le plus original du projet.

**Ce qui pèse.** L'atelier a grandi par systèmes juxtaposés : objets-quaternions, Tour à 255 étages, neuf hôtes, élixirs, capsules, bestiaire, secrets, pendule et ascension, sceaux, carte, trophée, glyphes, signes, témoin. Chacun a sa spec et ses tests ; **aucun ne dit ce qu'on fait pendant dix minutes**. La page de la Tour est une colonne de nombres et de boutons (la coupe imprimée en entiers 10⁸, « occupant 0 · ○ ») ; la scène 3D est un tableau qu'on regarde, pas un lieu où l'on est. Le joueur lit ; il ne joue pas encore. C'est le signal que vous avez eu en testant : « inoccupé, vide de loot ». La décision de fin de salle et les fouilles (branche `tour-decision`) sont un premier pas dans le bon sens : de l'action dans la salle.

**Le diagnostic en une phrase.** Eidos a une colonne vertébrale cryptographique et pas encore de colonne vertébrale ludique. Le metroidvania est précisément une colonne vertébrale : une carte, des verrous, des clés, des pouvoirs qui rouvrent ce qu'on a déjà vu.

## 2. Ce qu'est un metroidvania, en cinq traits, et ce qu'Eidos en a déjà

| Trait | Définition | Dans Eidos aujourd'hui | Manque |
|---|---|---|---|
| Une carte connectée | un monde unique qu'on parcourt dans tous les sens | la Tour : 255 étages, 4 quartiers, montée et descente libres hors ascension, carte 15 × 17 | la carte n'est pas encore une carte de metroidvania (secrets restants, verrous, boss, pouvoirs) |
| Verrous et clés | des passages fermés que seule une clé ouvre | portes 64 · 128 · 192 par **sceau d'âge** (relique du monde réel), tickets d'antre, capsules | trop peu de verrous *dans* les quartiers |
| Pouvoirs | des capacités permanentes qui changent la traversée et rouvrent les zones connues | les **services** des muses (forge, échos, lecture) sont proches ; élixirs et capsules sont des consommables | aucun pouvoir permanent noté ; rien ne rouvre l'ancien |
| Boss | un gardien qui garde une clé ou un pouvoir | les **gardiens d'antre**, duel en trois temps, seuil suprême aux portes | ils ne gardent pas encore un pouvoir |
| Secrets et retour en arrière | l'exploration paie, revenir paie | alcôves (13), échos (44 paires), trouvailles (nouvelles), observatoire | rien ne signale « il reste quelque chose ici » |

Le matériau est là. Ce qui manque est un **fil** qui relie ces pièces dans l'ordre où le joueur les rencontre, et une **salle** où l'on se tient.

## 3. La colonne vertébrale proposée

### 3.1 Une carte, une place

La Tour est le monde. Chaque étage est une **salle** : la dalle 9 × 9 en est le sol, l'hôte y a sa case, les occupants ont la leur (déjà), les trouvailles ont les leurs (déjà). Le joueur y a un **pion**, posé à la case d'arrivée, qu'il déplace de case en case sur les cases pleines ; il creuse là où il se tient, prend l'occupant voisin, honore l'hôte en face de lui. **La scène 3D devient la salle**, plus un tableau : la caméra suit le pion, le socle du rendu (lumières, halo, matières) est déjà posé pour cela.

### 3.2 Neuf pouvoirs, neuf muses

Chaque muse majeure, à l'étage médian de sa bande (Thalie 0 … Uranie 254), donne **un pouvoir permanent** quand on l'honore — noté dans la jauge, dérivable des dons déjà notés (`tour.dons` ∩ étages des muses : aucun état nouveau). Chaque pouvoir **rouvre** quelque chose dans les salles déjà vues :

| Muse | Étage | Pouvoir (nom de travail) | Ce qu'il rouvre |
|---|---|---|---|
| Thalie | 0 | la capsule | prendre un occupant (déjà : une par poste du jour) |
| Clio | 28 | le flair | voir sur la dalle les cases qui portent une trouvaille (aujourd'hui cachées) |
| Calliope | 56 | le pas | franchir un trou de la dalle (les cases vides deviennent traversables) |
| Terpsichore | 85 | la ronde | l'offrande d'une capture rend une gemme (déjà) et laisse l'occupant revenir |
| Melpomène | 113 | le deuil | franchir un antre sans ticket, une fois par quartier |
| Érato | 141 | la forge | tourner et forger hors de son étage (déjà à son étage) |
| Euterpe | 170 | l'oreille | entendre les échos : la paire se marque sur la carte (aujourd'hui il faut Saturne honoré) |
| Polymnie | 198 | le regard | voir la croix des alcôves sur la carte ; ouvrir celles qu'on a manquées |
| Uranie | 254 | la lecture | l'observatoire (déjà) ; lire l'arbre restant d'une ascension (O12) |

L'ordre est imposé par la géométrie : on a le flair avant le pas, le pas avant le deuil. Revenir au premier quartier avec le regard de Polymnie fait rejouer toutes les salles : **c'est le metroidvania**.

### 3.3 Clés rares, clés du monde

Les quatre **sceaux d'âge** restent les grandes clés : une relique trouvée dans le monde, une pièce dépensée une fois. Le sceau de Kali (2,10 eidôla) ouvre la porte 64 : c'est la première grande clé, celle qui fait passer de « jouer gratuitement » à « avoir mis quelque chose ». Les tickets d'antre restent les petites clés, consommables. Rien de cela ne change.

### 3.4 Les gardiens

Les antres aux portes sont les **boss** : ils gardent l'accès au quartier suivant et, avec le cap, la remise du pouvoir de la muse de porte. Le duel en trois temps (orbite, axe, résonance) est déjà écrit ; il n'a besoin que d'un enjeu : franchi, le gardien laisse la clé ; repoussé, un étage de moins, rien de perdu (déjà).

### 3.5 Ce qui compte : l'ascension comme épreuve

Le pendule et l'ascension ne sont pas le metroidvania ; ils sont **l'épreuve de maîtrise** posée dessus : un parcours de 27 salles, ancré sur un bloc et une pièce, exporté et jugé sans rejeu. Le metroidvania est la progression libre et persistante (jauge) ; l'ascension est ce qu'on fait quand on connaît la Tour et qu'on veut que cela compte. Les décisions O8 à O12 de l'étude de l'arbre de visite ne viennent qu'après.

## 4. Ce qu'on gèle

- **Aucun système nouveau** tant que la salle (3.1) et les pouvoirs (3.2) ne sont pas jouables. Ni bio-capteurs, ni Gödel, ni pendules multiples, ni économie d'objets supplémentaire.
- **Glyphes, Signes, Journal, Témoin, Lectures** restent des pages de vérification et de lecture, hors de la boucle de jeu ; on ne les touche pas.
- **Les nombres** (coupe en entiers, tenue, alignement) sortent de la salle : ils vont dans un volet « lecture » replié, pour qui veut vérifier.
- **Le pendule-9** garde sa transition gelée. Sa carte de destinations (fait) suffit pour l'instant.

## 5. Les quatre chantiers, dans l'ordre

| # | Chantier | Fichiers | Contrôles | Ce que le joueur voit |
|---|---|---|---|---|
| M1 | **Pouvoirs** : `pouvoirs.ts` (neuf pouvoirs dérivés de `tour.dons`), verrous correspondants dans `fouilles.ts` (flair), `secrets.ts` (regard, oreille, deuil), `capsules.ts` (ronde), `hotes.ts` (forge hors étage) | lib + tests | 9 | « Clio vous donne le flair : les cases à creuser se voient » ; revenir en arrière paie |
| M2 | **La salle** : pion sur la dalle, déplacement case à case, actions à la case (creuser, prendre, honorer), scène 3D suivie par la caméra, volet « lecture » replié | `TourView`, `TourCanvas`, store | 4 | on est quelque part |
| M3 | **La carte** : par quartier, secrets trouvés / restants (alcôves, échos, trouvailles), portes et gardiens, pouvoirs acquis, pourcentage | `Carte` de `TourView`, `jauge.ts` | 3 | « quartier de Kali : 7 / 13 alcôves, 3 / 12 échos, 61 % » |
| M4 | **Le Guide « Jouer »** réécrit autour de la boucle : explorer, trouver clés et pouvoirs, ouvrir, vaincre le gardien, quartier suivant ; l'ascension comme épreuve | `Guide.tsx`, i18n | — | un joueur nouveau sait quoi faire |

Chaque chantier est une PR isolée ; M1 ne change aucune règle existante, il n'ajoute que des conditions qui *ouvrent*. Coût : quelques centaines de lignes par chantier, aucune dépendance.

## 6. Ce que je ne ferais pas

- Rendre payant ce qui est libre : les pouvoirs, les trouvailles, les captures restent jauge. Le seul « prix » du jeu reste une pièce par run qui compte, et un sceau par porte.
- Gater rétroactivement ce qui marche : une alcôve qu'on peut déjà ouvrir en regardant la dalle reste ouvrable ; le regard de Polymnie la *signale*, il ne la ferme pas.
- Réécrire les 255 étages : la Tour est fixe, c'est sa force. Le metroidvania se joue dans ce qu'on peut y *faire*, pas dans ce qu'elle contient.
