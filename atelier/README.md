# Eidos

Atelier web du registre Eidos : coffre, journal, témoin, arbre. Réseau d’essai — sans valeur monétaire.

La spécification tient en Python, bibliothèque standard uniquement. Cette interface la rejoue dans le navigateur. Rien ne se croit : la genèse et les signatures se vérifient ici.

L’unité est l’**eidôlon** (10⁸ atomes). La forme est la règle ; l’image est ce qui circule.

---

## Pages

| Page | Rôle |
|---|---|
| **Coffre** | Solde, créer, envoyer. Un tap à la naissance. |
| **Journal** | Genèse, clés, chaîne, **miner** (`R(h)`), preuve Merkle. |
| **Témoin** | Seconde mémoire. Une tête, pas les clés. Juge une preuve. |
| **Arbre** | 20 premiers, 10 paliers, 33 secteurs. Carte, pas Merkle. |
| **Reliques** | Lumen d’époque : ellipse `a × a/2`. |
| **Glyphes** | 4 figures, 64 empilements. 31 groupes. |
| **Signes** | Signatures planétaires : lecture des 64. Pas un 5ᵉ glyphe. |
| **Guide** | Mode d’emploi. |

Auth et base distante : **off**. Le carnet vit dans ce navigateur (`localStorage`). Pas de comptes, pas de fédération réelle, pas de nœud réseau.

---

## Témoin — autre mémoire

Le coffre et le témoin ne partagent plus le même écran. Pour qu’un **autre appareil** juge une pièce :

1. Journal → **Exporter la tête** (JSON) ou **Ouvrir dans le témoin** (lien).
2. L’autre onglet / téléphone ouvre `/temoin`, adopte `{ hauteur, hash, merkle, prev }`.
3. Coller la preuve. Incluse seulement si `preuve.racine === tête.merkle`.

Il croit la tête reçue tant qu’il ne rejoue pas le journal. Suivre n’est pas automatique : un envoi sans suivi rend la preuve **étrangère**. Recharger Mixte alors que le témoin est plus haut : **fourche**.

Ce n’est pas un nœud P2P.

---

## Coffre ↔ arbre

Deux arbres, pas un.

1. **Merkle du carnet.** Chaque sortie est une feuille `SHA-256d(txid ‖ rang ‖ adresse ‖ montant)`. Paires SHA-256d, dernière feuille recopiée si impair — même règle que `utxo.py`. Un chemin de frères **prouve** qu’une pièce est dans le coffre.
2. **Chaîne locale.** Bloc 0 = genèse gelée (Merkle du *message*, 18 bits de PoW). Les suivants : merkle du carnet, bits 0 — un proposant, ce navigateur. Altérer `prev` rompt le chainage.
3. **Arbre des premiers** (D0–D9). Une punaise FNV pose la même adresse sur un nœud. Ce n’est pas une preuve. L’émission du réseau (`etat.json`) souffle les proéminences : `ρ = R(h)/a`, chroma d’âge, secteur chaud = ancre du trésor. Pas un `(h·41 mod 425)`.

Les coller en un seul objet serait un mensonge : l’un engage le carnet, l’autre cartographie des régimes.

Les opérateurs ∇, ∇·, ∇×, ∇² portent sur le **champ d’autorités** (Φ = 9 − palier), pas sur les eidôla. ∇×v = 0 parce que la descendance est une forêt.

---

## Les deux trous (portefeuille, pas validateur)

Le validateur accepte encore un atome de rendu. C’est le coffre qui refuse.

1. **Plusieurs entrées.** Glouton : les plus petites sorties qui atteignent `m`, au plus trois. Une signature Lamport par entrée.
2. **Poussière.** Si le rendu < 10 000 atomes, pas de sortie de rendu : l’écart devient frais.
3. Si le solde suffit mais trois pièces ne couvrent pas : **« solde suffisant mais fragmenté — regrouper d’abord »**.

---

## Tutoriel

Le **Guide** dans l’app reprend ces pas.

1. **Coffre** — **Créer mon coffre**. 1 eidôlon versé une fois. Envoyer.
2. **Journal** — lancer la genèse. **Miner** : nonce (14 bits), `R(h)` sur une adresse neuve (~20 eidôlon au bloc suivant, Satya). Ce navigateur seulement.
3. **Témoin** — adopter la tête, juger. Envoyer sans suivre : racine étrangère.
4. **Clés** — rejouer l’attaque de réemploi. Graine d’atelier **publique**.
5. **Arbre** — bandeau ∇ / puits / axiale ; **régimes** pour D0–D9.
6. **Reliques** — lumen d’époque : ellipse `a × a/2`. Pas un glyphe.
7. **Glyphes** — 4 figures × 3 étages = 64 empilements. 31 groupes. **Interdit** d’en tirer une graine.
8. **Signes** — neuf lectures des mêmes 64. Paracelse n’ajoute pas de figure. 9 ≠ 33.

---

## Cryptographie (rejeu, pas une courbe)

- **Lamport** pour les transactions. 16 384 octets de clé publique, 8 192 de signature. Une clé ne signe qu’une fois : la seconde révélation permet de forger. Le coffre produit une adresse neuve à chaque usage.
- **Merkle / XMSS réduit** pour les validateurs — spécifié, **pas branché**.
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

```bash
cd atelier
npm install
npm test
npm run dev
```

**Pages.** [oykdo.github.io/Eidos](https://oykdo.github.io/Eidos/) — export statique (`npm run build:pages`). Base `/Eidos/`. Le preview Grok reste un build Vercel.

---

## Contrôles

La genèse dans l’app rejoue les empreintes gelées. Les tests du dépôt couvrent le glouton, Lamport, la genèse, le Merkle, la chaîne, le témoin, le champ discret et les ancres. Un atome de rendu reste légal côté validateur ; seul le portefeuille l’évite.

---

## Licence

[Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0). Copyright 2026 Jeremy Zgonec.

