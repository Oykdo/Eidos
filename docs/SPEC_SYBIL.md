# Un joueur, pas une armée — sécurité contre les bots multi-machines

**Dépôt :** Oykdo/Eidos
**Statut :** décisions et implémentation (2026-09-04)
**Règle de lecture :** ce qui suit dit ce qui est **prouvable**, ce qui est **coûteux**, et ce qui est **libre**. Il ne promet nulle part l'inviolable : tout code qui tourne dans un navigateur se contourne, et un verrou de machine ou de navigateur ne gêne qu'un joueur honnête.

## 1. Le principe

Une armée de machines multiplie tout ce qui est gratuit : les coffres, les navigateurs, les runs de la jauge. Elle ne multiplie pas ce qui est **rare sur la chaîne** : les pièces. L'émission est bornée sans halving ; le robinet verse un eidôlon par adresse dans un budget d'époque ; les reliques sont cachées dans le monde physique. Donc :

| Ce qui | Statut | Coût pour un bot |
|---|---|---|
| jouer un run dans la jauge, tirer des objets, capturer | **libre** | nul — et ça ne vaut rien à personne : rien ne se transfère |
| un run qui **compte** (sceau, porte, trophée d'ascension) | **ancré** sur un bloc et une pièce | une pièce par run et par bloc |
| obtenir une pièce | robinet, relique, envoi d'un autre coffre | un compte GitHub par eidôlon et par époque, ou trouver un QR dans le monde |
| une relique | une clé, une récupération | premier arrivé ; rejouer est impossible, la clé a signé |

Le verrou n'est pas dans le client : il est dans ce que le client **ne peut pas fabriquer**.

## 2. L'ascension ancrée (`ancrage.ts`)

Un run qui compte a pour graine `SHA-256d("eidos-ascension/1" ‖ id_bloc ‖ txid ‖ rang)` : la **tête signée** du réseau et une **pièce non dépensée** à cette tête, prouvée contre la racine UTXO. Ni le coffre, ni la machine, ni le navigateur n'entrent dans la graine.

Conséquences, toutes testées :

- même bloc + même pièce ⇒ même run, quel que soit le coffre : rejouer ne rapporte rien ;
- une pièce n'ancre qu'un run par bloc, un bloc dure une heure ;
- une ascension s'exporte (`eidos-ascension/1` : tête, pièce, preuve, choix, objets portés, trace) et se juge **sans rejouer la chaîne** : signature XMSS de la tête, preuve Merkle de la pièce, run recalculé, trace comparée.

Ce que l'ascension **ne prouve pas** : que la pièce est au joueur. Cela se prouve en la **dépensant** : la transaction qui envoie la pièce d'ancrage vers une adresse fraîche du coffre est le sceau final d'une ascension qui compte (une clé ne signe qu'une fois). Un bot qui ancre mille runs sur la même pièce n'en fera compter qu'un, au bloc où il la dépense.

## 3. Le robinet, seul point d'entrée gratuit (`robinet.py`)

Le workflow transmet l'auteur de l'issue (`EIDOS_ISSUE_AUTHOR`). Règle 4 : **un compte GitHub, une demande servie par époque, une seule en attente**. Avec le budget `a·T/8` déjà en place, le coût d'une armée devient : un compte GitHub par eidôlon, et une époque (1 008 blocs, six semaines) avant de le resservir. GitHub limite lui-même la création de comptes.

Ce frein est côté file ; le nœud tranche toujours par adresse et par budget, et ne croit pas la file.

## 3bis. Le courriel, second canal (2026-09-06)

Décision d'auteur : le robinet doit avoir un canal hors GitHub. Sans serveur, le seul canal que le cron peut relever en bibliothèque standard, et qui ne coûte au joueur ni compte nouveau ni application, est une **boîte aux lettres** : `courriel.py` relève INBOX par IMAP à la minute 37 (`courriel.yml`), passe chaque message non lu au même filtre que les issues, et applique la règle 4 à l'**adresse d'expéditeur**. La page d'accueil de l'atelier prépare le courriel (sujet `robinet`, glyphes dans le corps) quand le nœud publie une boîte dans `etat.json.robinet_canaux`.

Ce que cela coûte à une armée : une adresse de courriel par eidôlon et par époque. C'est **moins** qu'un compte GitHub, et c'est assumé : le budget d'époque `a·T/8` et le refus par adresse bornent le total quoi qu'il arrive ; le frein par auteur ne règle que le partage entre demandeurs. L'expéditeur d'un courriel se falsifie plus aisément qu'un compte GitHub ; le nœud ne s'en sert que comme clé de frein, jamais comme preuve. Un message est marqué lu qu'il soit accepté ou non : une boîte inondée n'arrête pas le cron, elle épuise au plus `MAX_MESSAGES` relevés par heure. Les identifiants IMAP sont des secrets du dépôt : qui les tient tient la boîte, pas la chaîne.

Refusé : un relais serveur (Vercel, fonction) qui ouvrirait des issues au nom d'un robot — il verrait les IP, contredirait « pas de serveur », et déplacerait le frein sur une adresse IP, falsifiable et pénible pour un joueur honnête.

## 4. Ce qu'on ne fait pas, et pourquoi

- **Pas d'empreinte de navigateur ni d'identifiant de machine** : falsifiable en une ligne, gênant pour un joueur à deux appareils, contraire à « rien ne se croit ».
- **Pas de serveur de comptes** : il n'y a pas de serveur, et un compte ne coûte rien.
- **Pas de preuve de travail côté client** : une armée de machines est exactement ce qu'elle favorise.
- **Pas de plafond global par adresse IP** : le robinet passe par GitHub, l'atelier par Pages ; aucun des deux ne voit l'IP de façon exploitable.

## 5. Ce qui reste ouvert

1. Le **sceau final** d'une ascension (dépenser la pièce d'ancrage) n'est pas branché dans l'interface : la bibliothèque `envoi.ts` sait déjà signer la dépense, il manque le bouton et la lecture par le nœud (`etat.json` : ascensions comptées par bloc).
2. Faut-il exiger une pièce **d'un montant minimal** pour ancrer (par exemple la mise du quartier visé, comme les sceaux) ? Cela renchérit l'armée sans coûter au joueur qui a trouvé une relique.
3. Le **poste du jour** (trois blocs) borne le minage local ; le même compteur pourrait borner les ascensions ancrées par coffre, en plus du bloc. Utile seulement si un même joueur veut être ralenti ; contre les armées, la pièce suffit.
