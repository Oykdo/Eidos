# Eidos

Atelier web du registre Eidos : **coffre** (UTXO, Lamport, sélection des sorties) et **arbre** (descendance, 33 secteurs). Réseau d’essai — sans valeur monétaire.

La spécification tient en Python, bibliothèque standard uniquement. Cette interface la rejoue dans le navigateur. Rien ne se croit : la genèse et les signatures se vérifient ici.

L’unité est l’**eidôlon** (10⁸ atomes). La forme est la règle ; l’image est ce qui circule.

---

## Ce qui tient ici

| Face | Rôle |
|---|---|
| Coffre | Carnet UTXO local, glouton borné à 3 entrées, poussière, signatures Lamport à usage unique |
| Arbre | 20 premiers, 10 paliers, 33 secteurs, 425 nœuds, 4881 autorités |
| Pont | Chaque sortie s’ancre sur un nœud par hachage de l’adresse |
| Guide | Tutoriel pour les autres utilisateurs |

**Auth et base distante : off.** Le carnet vit dans ce navigateur (`localStorage`). Pas de comptes, pas de fédération réelle, pas de nœud réseau.

---

## Coffre ↔ arbre

Ce n’est **pas** un Merkle d’émission, **pas** le consensus, **pas** une géodésique.

1. Une sortie a une adresse de 20 octets (empreinte de la clé publique Lamport).
2. Un FNV de cette adresse, modulo 425, désigne un nœud.
3. Même adresse → même nœud, toujours.
4. Dépenser consomme la clé et en crée d’autres : le rendu naît ailleurs, l’ancre bouge.

Dans le carnet, chaque ligne porte `D3 · Matière α`. Toucher le libellé ouvre l’arbre sur ce nœud (sphère d’or). Inversement, toucher un nœud garni affiche le montant du coffre.

Les opérateurs ∇, ∇·, ∇×, ∇² portent sur le **champ d’autorités** de l’arbre (potentiel Φ = 9 − palier), pas sur les eidôla. ∇×v = 0 parce que la descendance est une forêt.

---

## Les deux trous (portefeuille, pas validateur)

Le validateur accepte encore un atome de rendu. C’est le coffre qui refuse.

1. **Plusieurs entrées.** Glouton : les plus petites sorties qui atteignent `m`, au plus trois. Une signature Lamport par entrée.
2. **Poussière.** Si le rendu < 10 000 atomes, pas de sortie de rendu : l’écart devient frais.
3. Si le solde suffit mais trois pièces ne couvrent pas : **« solde suffisant mais fragmenté — regrouper d’abord »**.

---

## Tutoriel

Le **Guide** dans l’app reprend ces pas. En bref :

1. **Genèse** — rejouer le fichier gelé (émission cosine, Merkle, bloc 0). Le message « Portefeuille en place » autorise les échanges signés.
2. **Atelier Mixte** — 0,50 (deux ou trois petites), puis **Poussière** (1,00), puis **4,00** (fragmenté → regrouper).
3. **Clés** — rejouer l’attaque de réemploi. L’atelier a une graine **publique**. « Coffre personnel » tire 256 bits dans le navigateur.
4. **Arbre** — sphères d’or = sorties actuelles. ∇ / puits / axiale. Un disque liste les 33 secteurs.
5. **Carnet** — toucher l’ancre d’une sortie pour la voir sur l’arbre.

---

## Cryptographie (rejeu, pas une courbe)

- **Lamport** pour les transactions. 16 384 octets de clé publique, 8 192 de signature. Une clé ne signe qu’une fois : la seconde révélation permet de forger. Le coffre produit une adresse neuve à chaque usage.
- **Merkle / XMSS réduit** pour les validateurs — spécifié, **pas branché** dans cet atelier.
- Cosinus d’émission en `Decimal`, π à 68 décimales, comme le prototype : `math.cos` de la libm scinderait la chaîne.

L’atelier `eidos-atelier-reseau-essai-v1` est reproductible **parce que** la graine est connue. Ne pas y laisser de valeur.

---

## Ce que ce n’est pas

- Pas `r_s = 2GM/c²`. Le plongement puits est une figure, D0 au fond. La sphère à photons 3/2 r_s ne tombe sur aucun palier.
- Pas le boson de Higgs. La vue axiale est un détecteur d’anneaux, pas une collision.
- Pas `D = b² − 4ac`. L’organigramme du coffre classe quatre issues d’un glouton, pas les racines d’un polynôme.
- Pas une fédération à 7 validateurs. Le prototype Python décrit la rotation `V[(3·s) mod n]` ; cet atelier ne l’exécute pas.

---

## Prototype Python (spécification)

`eonis.py` (émission, glyphes), `genesis.json`, `verify_genesis.py`, `utxo.py` (carnet, Lamport), `store.py` (rejeu), `consensus.py`, `federation.py`.

Émission : `R(h) = a + b·cos(2π(h − h₀)/T)` avec `b = a/2`, `T = 1008`, `h₀ = 492`. Quatre âges (Satya 40, Trétâ 30, Dvâpara 20, Kali 10). Total **62 899 200** eidôla.

---

## Contrôles

La genèse dans l’app rejoue les empreintes gelées. Les tests du dépôt couvrent le glouton, Lamport, la genèse, le champ discret et les ancres. Un atome de rendu reste légal côté validateur ; seul le portefeuille l’évite.
