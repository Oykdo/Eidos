# Un objet peut changer de mains — étude avant décision

**Dépôt :** Oykdo/Eidos · **Statut :** étude, aucune ligne de code · **Décidé :** un objet doit pouvoir changer de mains (2026-09-08). **Non décidé :** tout le reste, à commencer par l'option.
**Règle de lecture :** ce texte dit ce qui est prouvable, ce qui est coûteux, ce qui reste libre. Il ne promet nulle part l'inviolable. Il ne touche ni `eonis.py`, ni `genesis.json`, ni la validation.

## 0. En cinq lignes
Aujourd'hui un objet est une **figure** : dérivé d'une graine, recalculable, sans existence hors du carnet. Deux joueurs peuvent porter le même objet sans que rien ne soit faux. Dès qu'un objet s'échange, il lui faut l'unicité et un tenant prouvable — et la seule chose du dépôt qui sait faire ça est l'**UTXO**. Un objet échangeable cesse d'être une figure : il devient une pièce, ou il est porté par une.
L'option recommandée est la **3 (droit ancré)** : rien de neuf dans le consensus, le frein de Sybil hérité tel quel, une seule règle à trancher.

## 1. Ce qui existe déjà et qu'on ne refera pas
- `utxo.py` / `merkle.ts` : sorties, adresses, racine UTXO, preuves. Une chose se tient parce qu'elle est une sortie non dépensée.
- `ancrage.ts` : `graineAncree = SHA-256d("eidos-ascension/1" ‖ id_bloc ‖ txid ‖ rang)`. Un run qui compte est **porté** par une pièce sans entrer dans la chaîne. Ce que l'ascension ne prouve pas — que la pièce est au joueur — se prouve en la **dépensant**.
- `coffre-horaire.ts` : même patron pour un coffre ; `jugerClaim` vérifie preuve Merkle puis signature XMSS.
- `voxels.empreinteVoxels(objet)` : une empreinte stable d'un objet, déjà écrite.
- `SPEC_SYBIL.md` : un bot ne multiplie pas les **pièces**. Tout ce qui s'accroche à une pièce hérite de ce frein.

## 2. Les trois options
### 2.1 Option 1 — montrer, pas échanger (écartée par la décision)
L'objet reste une figure ; ce qui circule est la **preuve** d'un coffre réclamé. Coût nul, Sybil inchangé. Écartée : la décision est qu'un objet change de mains.

### 2.2 Option 2 — l'objet est une sortie
Une transaction porte l'empreinte de l'objet ; le tenir, c'est tenir la sortie. Le plus propre conceptuellement. **Ce qu'il en coûte :** une règle de **consensus nouvelle** dans `utxo.py` et dans la validation du nœud, donc un changement de format de transaction, des vecteurs regelés, et un risque sur une chaîne déjà forgée. Aucun chantier n'a touché la validation jusqu'ici. À réserver au jour où un objet doit valoir de l'argent.

### 2.3 Option 3 — le droit est ancré (recommandée)
L'objet n'entre pas dans l'UTXO. Une **pièce porte** l'objet, comme elle porte un run :

    lien = SHA-256d( "eidos-objet/1" ‖ id_bloc(32) ‖ txid(32) ‖ rang(4) ‖ empreinteVoxels(objet)(32) )

Tenir l'objet = tenir la pièce à cette tête. **Échanger = envoyer la pièce** : la transaction existe déjà, le nœud ne change pas, `envoi.ts` non plus. Se juge hors ligne exactement comme une ascension : tête XMSS, pièce Merkle, lien recalculé.

## 3. Le trou de l'option 3, et les trois façons de le boucher
Rien n'empêche d'ancrer **deux objets différents sur la même pièce** à deux blocs différents. Il faut dire lequel compte. Trois règles possibles, à trancher :

- **(a) Le dernier gagne.** L'objet valide est celui du bloc le plus haut. Simple, mais un vendeur peut ré-ancrer après la vente : l'acheteur reçoit une pièce dont l'objet a changé. **Inacceptable.**
- **(b) Le premier gagne.** Une pièce ne porte qu'un objet, à jamais : le premier lien ancré. Une pièce est un « socle » à usage unique ; pour porter un autre objet, il faut une autre pièce. Coûteux en pièces — donc parfaitement aligné sur Sybil — et immédiatement vérifiable : le juge refuse tout lien plus haut que le premier connu. **Recommandée.**
- **(c) Le lien meurt avec la dépense.** L'objet suit la pièce jusqu'à sa dépense, puis il faut ré-ancrer sur la sortie fraîche. Plus proche du transfert réel, mais le receveur doit ré-ancrer pour prouver, et il y a une fenêtre où personne ne tient rien.

La (b) et la (c) diffèrent sur une seule question : **un objet doit-il survivre à plusieurs échanges, ou une pièce est-elle son socle définitif ?**

## 4. Ce que ça coûte à une armée
Un objet échangeable = une pièce immobilisée (b) ou dépensée (c). Un bot qui veut cent objets doit tenir cent pièces, donc cent comptes ou adresses par époque. Le frein n'est pas nouveau : c'est celui de `SPEC_SYBIL.md`, hérité sans une ligne de plus. Un marché fabriqué par une armée coûte exactement ce que coûtent les pièces.
Ce que ça **ne** protège **pas** : rien n'empêche deux joueurs d'échanger hors du jeu, ni un joueur de montrer un objet qu'il n'ancre pas. C'est voulu : montrer reste libre, tenir se prouve.

## 5. Kill criteria proposés (à écrire quand l'option sera arrêtée)
1. Déterminisme : même bloc, même pièce, même objet ⇒ même lien.
2. Unicité (b) : un second lien sur la même pièce est refusé, quel que soit le bloc.
3. Le juge refuse un lien dont la preuve ne porte pas sur la racine de la tête, ou dont la feuille n'est pas celle de la pièce (repris de `jugerClaim`).
4. Transfert : après envoi de la pièce, le receveur juge le même objet ; l'émetteur ne le tient plus dès la dépense.
5. Aucun effet sur la chaîne : `noeud.py --verifier` inchangé, `verify_genesis.py` inchangé, vecteurs des dix familles inchangés.
6. Rejeu : ancrer mille liens ne donne pas mille objets tenus (mesure sur les têtes réelles, comme K47).

## 6. Ce que cette étude ne décide pas
L'option (2 ou 3), la règle du trou (b ou c), le format d'export d'un objet tenu, et l'interface. Aucune ligne de code ne sera écrite avant cet arbitrage.
