# Eidos — atelier

[Français](#français) · [English](#english)

**FR.** Atelier web du registre Eidos : coffre, journal, témoin, reliques. Un fichier : `eidos.carnet`. Réseau d’essai — sans valeur monétaire.

**EN.** Web atelier for the Eidos ledger: vault, log, witness, relics. One file: `eidos.carnet`. Testnet — no monetary value.

La spécification tient en Python, bibliothèque standard uniquement. Cette interface la rejoue dans le navigateur. Rien ne se croit : la genèse et les signatures se vérifient ici.

Live : [oykdo.github.io/Eidos](https://oykdo.github.io/Eidos/). Prototype : [`../README.md`](../README.md).

---

## Français

L’unité est l’**eidôlon** (10⁸ atomes). La forme est la règle ; l’image est ce qui circule.

### Pages

| Page | Rôle |
|---|---|
| **Coffre** | Solde, créer, envoyer, sauver `eidos.carnet`. |
| **Journal** | Genèse, clés, chaîne, **miner** (`R(h)`), preuve Merkle. |
| **Témoin** | Seconde mémoire. Une tête, pas les clés. Juge une preuve. |
| **Arbre** | 20 premiers, 10 paliers, 33 secteurs. Carte, pas Merkle. |
| **Reliques** | Lumen d’époque. Kali 2,10 · Satya 33,55. Sauvegarde `eidos.carnet`. |
| **Glyphes** | 4 figures, 64 empilements. 31 groupes. Bourrage refusé. |
| **Signes** | Lectures des mêmes 64. Pas un 5ᵉ glyphe. |
| **Guide** | Mode d’emploi. |

Auth et base distante : **off**. Le carnet vit dans ce navigateur (`localStorage`). Pas de comptes, pas de fédération réelle, pas de nœud réseau.

### Fichier unique — `eidos.carnet`

Lamport signe une **dépense**, une seule fois — pas le fichier. Une sauvegarde signée brûlerait une clé. La trace est SHA-256d, liée à l’adresse courante. Aucune courbe : ce n’est pas le vault holographique d’Eidolon. Un ancien `.psnx` JSON d’Eidos s’ouvre encore.

### Témoin — autre mémoire

Le coffre et le témoin ne partagent plus le même écran. Pour qu’un **autre appareil** juge une pièce :

1. Journal → **Exporter la tête** (JSON) ou **Ouvrir dans le témoin** (lien).
2. L’autre onglet / téléphone ouvre `/temoin`, adopte `{ hauteur, hash, merkle, prev }`.
3. Coller la preuve. Incluse seulement si `preuve.racine === tête.merkle`.

Il croit la tête reçue tant qu’il ne rejoue pas le journal. Suivre n’est pas automatique : un envoi sans suivi rend la preuve **étrangère**. Recharger Mixte alors que le témoin est plus haut : **fourche**.

Ce n’est pas un nœud P2P.

### Coffre ↔ arbre

Deux arbres, pas un.

1. **Merkle du carnet.** Chaque sortie est une feuille `SHA-256d(txid ‖ rang ‖ adresse ‖ montant)`. Paires SHA-256d, dernière feuille recopiée si impair — même règle que `utxo.py`. Un chemin de frères **prouve** qu’une pièce est dans le coffre.
2. **Chaîne locale.** Bloc 0 = genèse gelée (Merkle du *message*, 18 bits de PoW). Les suivants : merkle du carnet, bits 0 — un proposant, ce navigateur. Altérer `prev` rompt le chainage.
3. **Arbre des premiers** (D0–D9). Une punaise FNV pose la même adresse sur un nœud. Ce n’est pas une preuve.

Les coller en un seul objet serait un mensonge : l’un engage le carnet, l’autre cartographie des régimes.

### Les deux trous (portefeuille, pas validateur)

1. **Plusieurs entrées.** Glouton : les plus petites sorties qui atteignent `m`, au plus trois. Une signature Lamport par entrée.
2. **Poussière.** Si le rendu < 10 000 atomes, pas de sortie de rendu : l’écart devient frais.
3. Si le solde suffit mais trois pièces ne couvrent pas : **« solde suffisant mais fragmenté — regrouper d’abord »**.

### Tutoriel

1. **Coffre** — **Créer mon coffre**. 1 eidôlon versé une fois. Envoyer. **Sauver eidos.carnet**.
2. **Journal** — lancer la genèse. **Miner** : nonce, `R(h)` sur une adresse neuve.
3. **Témoin** — adopter la tête, juger.
4. **Clés** — rejouer l’attaque de réemploi. Graine d’atelier **publique**.
5. **Arbre** — bandeau ∇ / puits / axiale.
6. **Reliques** — ellipse `a × a/2`. Kali 2,10 · Satya 33,55. Creuser, acheter, sauver `eidos.carnet`.
7. **Glyphes** — 4 figures × 3 étages = 64. **Interdit** d’en tirer une graine.
8. **Signes** — neuf lectures des mêmes 64.

### Cryptographie

- **Lamport** pour les transactions. 16 384 octets de clé publique, 8 192 de signature. Une clé ne signe qu’une fois.
- **Merkle / XMSS réduit** pour les validateurs — spécifié, **pas branché** dans cet atelier.
- Cosinus d’émission en `Decimal`, π à 68 décimales.

L’atelier `eidos-atelier-reseau-essai-v1` est reproductible **parce que** la graine est connue. Ne pas y laisser de valeur.

### Ce que ce n’est pas

- Pas une fédération à 7 validateurs. Le prototype Python décrit `V[(3·s) mod n]` ; cet atelier ne l’exécute pas.
- Pas `r_s = 2GM/c²`, pas le Higgs, pas `D = b² − 4ac`. Ce sont des figures, pas des preuves.

---

## English

The unit is the **eidôlon** (10⁸ atoms). The form is the rule; the image is what circulates. This UI replays the Python spec in the browser. Nothing is trusted: genesis and signatures are checked here.

### Pages

| Page | Role |
|---|---|
| **Vault** | Balance, send, save `eidos.carnet`. |
| **Log** | Genesis, chain, Merkle proof, mine `R(h)`. |
| **Witness** | Second memory. A head, not the keys. |
| **Tree** | Map of regimes, not a proof. |
| **Relics** | Epoch lumen. Kali 2.10 · Satya 33.55. |
| **Glyphs** | 64 stacks. Padding refused. |
| **Signs** | Readings of the same 64. |
| **Guide** | How to use it. |

Auth is **off**. The ledger lives in `localStorage`. No accounts, no live federation, no network node.

### Unique file — `eidos.carnet`

Lamport signs a **spend**, once — not the file. A signed backup would burn a one-time key. The trace is SHA-256d, bound to the current address. No curve: this is not Eidolon’s holographic vault. A legacy Eidos JSON `.psnx` still opens.

### Wallet rules (not the validator)

Greedy coin-select, at most three inputs (one Lamport signature each). Dust under 10 000 atoms becomes a fee. If the balance is enough but three coins do not cover: regroup first.

### Crypto

Lamport for spends (16 384-byte public key, 8 192-byte signature, one use). Merkle/XMSS for validators is specified, **not wired** here. Emission cosine is `Decimal`, not `math.cos`.

The atelier seed `eidos-atelier-reseau-essai-v1` is public on purpose. Do not leave value in it.

```bash
cd atelier
npm install
npm test
npm run dev
npm run build:pages   # static export → dist/client, base /Eidos/
```

**Pages.** [oykdo.github.io/Eidos](https://oykdo.github.io/Eidos/).

### Licence

[Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0). Copyright 2026 Jeremy Zgonec.
