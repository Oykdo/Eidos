# veillees/ — les preuves déposées

Une **veillée** (`docs/BIBLE_VEILLEE.md`) finit par une preuve `eidos-veillee/1` :
le JSON exporté par la page Veillée de l'atelier. Ce dossier les recueille.

## Déposer

**Par une issue**, le plus simple : ouvrez une issue dont le titre commence par
`veillée`, et glissez-y le fichier exporté par la page Veillée (GitHub le joint
et écrit son adresse dans le corps) — ou collez l'adresse d'un gist, ou d'un
fichier dans un dépôt. Le juge de l'atelier tourne dans la CI
(`.github/workflows/veillees.yml`, `atelier/scripts/deposer-veillee.ts`,
logique dans `atelier/src/lib/eidos/depot.ts`) : il lit la preuve, vérifie que
ses trois têtes sont dans la chaîne publiée, la juge sans rejouer, et la
committe ici si elle passe ; l'issue reçoit le verdict et se ferme. Le corps de
l'issue n'est jamais interpolé dans une commande ; seuls trois hôtes sont lus
(`github.com/user-attachments/files`, `gist.githubusercontent.com`,
`raw.githubusercontent.com`), en HTTPS, deux mégaoctets au plus.

**Par une pull request**, sinon :

- **Une preuve par fichier**, nommée `<jour>-<txid 8 hex>-<rang>.json` : le
  jour civil UTC du bloc du jour (`jour` de la preuve), les huit premiers
  caractères hexadécimaux du `txid` de la pièce d'ancrage, son rang. Exemple :
  `20331-6d19bd75-0.json`.
- **Une ligne dans `index.json`** (un tableau de noms de fichiers), ajoutée à
  la fin. L'ordre du dépôt est public : c'est lui qui départage deux preuves
  valides sur la même pièce le même jour — la première inscrite est classée,
  l'autre est un doublon.

## Ce que fait le classement

Le classement (`atelier/src/lib/eidos/classement.ts`) se **recalcule dans le
navigateur de chacun** : `index.json` est lu, puis chaque fichier, puis chaque
preuve est jugée par `jugerVeillee` — deux têtes signées, la pièce contre la
racine UTXO, chaque geste contre la racine de l'arbre, le parcours du pendule —
sans rejouer la chaîne. Score = salles × 64 + butin ; à score égal, moins de
feuilles brûlées d'abord. **Aucun serveur ne fait foi** ; un lecteur qui doute
rejuge.

N'est pas classée :

- une preuve **refusée par le juge** (signature, chaîne des gestes, étage
  déclaré, fin mensongère, tête étrangère…) — son motif est affiché ;
- une preuve **libre** (sans pièce d'ancrage) : c'est une lecture ;
- une **pièce mal formée** : un rang qui n'est pas un entier de 0 à 2³² − 1, un
  `txid` qui n'est pas soixante-quatre hexadécimales minuscules — deux
  références ne doivent jamais dire la même feuille UTXO ;
- un fichier dont le **nom ne dit pas la preuve** qu'il contient, ou dont le
  nom sort de la convention ;
- un **doublon** : la même pièce, le même jour, après une première preuve valide.

Une veillée ancrée sur un bloc que la chaîne aurait abandonné (un « murmure »,
bible §4.1) est refusée **au dépôt par issue** (ses têtes sont comparées à la
chaîne publiée) ; le classement du navigateur, lui, accepte toute tête signée.

Un rang, une épithète de fantôme, un compte de feuilles sont des lectures d'une
preuve vraie ; seule la preuve engage. Le juge ne sait pas si la pièce est
encore au joueur : cela se prouve en la dépensant.
