# Eidos

**Chaîne à émission bornée sans halving, consensus fédéré, cryptographie post-quantique par hachage pur.**

Prototype de spécification écrit en Python de la bibliothèque standard uniquement. Aucune dépendance, aucune extension compilée : il tourne tel quel sur un serveur Linux comme sur un téléphone.

L'unité de compte est l'**eidôlon** — εἴδωλον, l'image — en regard d'*eidos*, εἶδος, la forme. La forme est la règle ; l'image est ce qui circule.

---

## Les cinq propositions

1. **La récompense ne se divise jamais.** Elle oscille selon un cosinus borné, et la somme d'une époque est exacte à l'atome près.
2. **La semaine n'est pas une convention.** 24 = 3 × 7 + 3 ; ce reste de trois engendre l'ordre des jours, et sert ici de rotation des proposants.
3. **Une adresse se lit.** Trois figures empilées, six bits par glyphe, somme de contrôle vérifiable à l'œil.
4. **L'énergie est bornée par le consensus, pas par la récompense.** Une preuve de travail ne borne jamais l'énergie ; une fédération, si.
5. **Rien ne se croit, tout se rejoue.** Le carnet UTXO n'est jamais enregistré : il est reconstruit par rejeu intégral à chaque ouverture.

---

## Émission

```
R(h) = a + b·cos( 2π(h − h₀) / T )     avec b = a/2
```

La somme des cosinus sur une période complète est nulle — c'est la somme des racines T-ièmes de l'unité. Donc l'émission d'une époque vaut **exactement** `a·T`, quelle que soit l'oscillation.

| Paramètre | Valeur | Origine |
|---|---|---|
| Intervalle de bloc | 600 s | — |
| `T` — blocs par époque | **1008** | 168 heures × 6 blocs = une semaine |
| `h₀` — culmination | **492** | 41 / 84 de l'époque, entier exact |
| Bornes | `[a/2, 3a/2]` | rapport max/min = 3 |

### Les quatre âges

| Âge | `a` | Époques | Blocs | Émission | Empreinte de table |
|---|---|---|---|---|---|
| Satya | 40 | 832 | 838 656 | 33 546 240 | `2c4dc817…` |
| Trétâ | 30 | 624 | 628 992 | 18 869 760 | `adb95a75…` |
| Dvâpara | 20 | 416 | 419 328 | 8 386 560 | `f10ceef5…` |
| Kali | 10 | 208 | 209 664 | 2 096 640 | `ec54de67…` |

**Émission totale : 62 899 200** sur 2 096 640 blocs, soit 2 080 semaines ≈ 39,9 ans. Rapport entre âges : 16 : 9 : 4 : 1. La décroissance est forte, mais le pas d'un bloc au suivant reste borné par `2b` — jamais un facteur 2 sur `a`.

1 eidôlon = 10⁸ atomes.

### Reproductibilité

`math.cos` dépend de la libm de la plateforme : deux nœuds peuvent diverger sur le dernier bit, et la chaîne se scinde. Eidos calcule le cosinus en `decimal.Decimal` par série de Taylor, avec π à 68 décimales et une précision de 60 chiffres. Les arrondis sont répartis au plus fort reste, égalités tranchées par index croissant.

Les tables sont figées dans `genesis.json` par leur seule empreinte, avec celle du générateur. **Toute modification de `eonis.py`, même d'un commentaire, invalide la genèse.**

```
genesis.json  06b47645abedb5e0ac7d2fc7a1dd6fcd386ef493874fd2774544565ac46dbe28
eonis.py      cc94ad1e6eadf7027414a1347e870a4842689431b8fca2c1b381f93f4f1dfabc
bloc 0        00003d32ffa7a1dc7f1ace8ec08d0c739126ad4449fe004ea772710baec2c7b6
```

---

## Encodage à trois figures

Trois étages, quatre états par étage : vide `00`, cercle `01`, croissant `10`, croix `11`. Un glyphe porte **6 bits**, soit 64 points de code. Lecture de haut en bas, l'étage supérieur en poids fort.

Un simple masque de présence à trois bits ne suffirait pas : deux empilements peuvent employer les mêmes figures et ne différer que par leur ordre. L'ordre porte de l'information.

| Usage | Bits | Glyphes |
|---|---|---|
| Adresse | 160 | 27 |
| Somme de contrôle | 24 | 4 |
| Empreinte pleine | 256 | 43 |

160 bits tiennent en 27 glyphes contre 32 caractères en base-32 : l'encodage est plus compact que l'usage courant tout en restant lisible. Les quatre glyphes de contrôle dépassent les 32 bits habituels et se vérifient d'un coup d'œil.

**Interdit** : dériver une clé, une graine ou un nonce de cet alphabet. Un glyphe porte 6 bits ; toute sélection « signifiante » d'empilements effondre l'entropie réelle.

---

## Signatures

Tout repose sur SHA-256, sans aucune courbe elliptique. La résistance quantique est structurelle, pas ajoutée.

**Lamport** pour les transactions. 16 384 octets de clé publique, 8 192 de signature, 0,6 ms pour générer et signer, 0,22 ms pour vérifier. Une clé ne signe **qu'une fois** : signer deux fois révèle assez de moitiés du secret pour forger. La règle est inscrite dans la validation — une clé publique ne peut apparaître qu'une fois dans toute la chaîne. Le portefeuille produit donc une adresse fraîche à chaque usage.

**Merkle (XMSS réduit à l'essentiel)** pour les validateurs, qui doivent signer des milliers de blocs. 2^k clés Lamport rangées dans un arbre de Merkle ; la clé publique est la racine, 32 octets, immuable. 24 772 octets par signature.

Ce schéma est **à état**. Le compteur d'indice doit survivre aux redémarrages : restaurer une sauvegarde ancienne, c'est rejouer des indices déjà publiés — donc se faire exclure, ou se faire voler sa clé.

---

## Consensus fédéré

`n` validateurs, un créneau de 600 s chacun. Le proposant du créneau `s` est `V[(3·s) mod n]`.

Le pas de trois est celui qui engendre l'ordre des jours à partir de l'ordre des heures. Comme `pgcd(3, n) = 1` dès que `n` n'est pas divisible par trois, la rotation parcourt tous les validateurs sans en sauter aucun. Avec `n = 7` : `[0, 3, 6, 2, 5, 1, 4]`. Un `n` divisible par trois est refusé au chargement.

**Finalité** : un bloc est final dès que plus de `2n/3` validateurs distincts ont bâti par-dessus. Avec sept validateurs, cinq suffisent — soit environ cinquante minutes.

**Coût** : 0,69 ms par bloc, signature et vérification comprises, contre ≈ 262 000 hachages pour une preuve de travail à 18 bits. C'est ici, et nulle part ailleurs, que la sobriété énergétique est obtenue.

Règles d'horodatage disponibles pour une variante en preuve de travail : cible compacte sur 4 octets, travail cumulé (la chaîne la plus lourde, jamais la plus longue), réajustement toutes les 1008 fenêtres borné à ×4, median-time-past sur 11 blocs et 2 h de tolérance future.

---

## Fichiers

| Fichier | Lignes | Rôle |
|---|---|---|
| `eonis.py` | 267 | émission, codec à trois figures, minage jouet |
| `genesis.json` | 105 | paramètres gelés et empreintes |
| `verify_genesis.py` | 129 | vérification indépendante — 32 contrôles |
| `utxo.py` | 439 | carnet, Lamport, validation — 11 contrôles |
| `store.py` | 278 | persistance et rejeu intégral |
| `consensus.py` | 204 | difficulté et travail cumulé — 6 contrôles |
| `federation.py` | 347 | signatures Merkle et rotation — 11 contrôles |

---

## Démarrage

Aucune installation. Python 3.9 ou plus récent.

```bash
python3 verify_genesis.py     # 32 contrôles : la genèse est-elle reproductible ?
python3 utxo.py               # 11 contrôles : carnet et signatures
python3 federation.py --demo  # 14 blocs, deux tours de rotation
```

Persistance :

```bash
python3 store.py --init
python3 store.py --mine 3
python3 store.py --pay
python3 store.py --verify     # rejeu intégral depuis chaine.dat
```

Sans dépendances ni compilation, le protocole tourne aussi sur téléphone : sous iOS, l'application a-Shell fournit un Python 3 complet et suffit à exécuter l'ensemble.

`verify_genesis.py` ne fait confiance à rien. Il reconstruit les quatre tables à partir des seuls paramètres déclarés, recalcule les empreintes, refait la preuve de travail du bloc 0 et recompte les totaux. Modifier l'émission totale d'un seul atome le fait échouer.

---

## Ce que ce dépôt ne fait pas

À lire avant tout usage.

- **Pas de réseau.** Ni pairs, ni propagation, ni résolution de fork en conditions réelles.
- **Pas de stockage de clés sécurisé.** Le fichier de portefeuille contient une graine en clair.
- **Pas d'audit.** Aucune revue externe, et les schémas Lamport et Merkle sont ici des implémentations maison — corrects sur le papier, non durcis contre les attaques par canal auxiliaire.
- **Une fédération n'est pas sans confiance.** `n` signataires connus peuvent s'entendre, ou être contraints par la même juridiction. Eidos échange la résistance à la censure contre la sobriété. C'est un choix politique autant que technique, et il doit être assumé publiquement.
- **La question ouverte est la gouvernance**, pas la cryptographie : qui sont les validateurs, comment l'ensemble évolue, qui arbitre.
- **Cadre réglementaire.** Une émission publique relève de MiCA dans l'Union européenne. Prototyper et horodater est libre ; émettre et distribuer ne l'est pas.

---

## Antériorité

Les empreintes SHA-256 ci-dessus sont destinées à être ancrées auprès d'un tiers horodateur — OpenTimestamps, service RFC 3161, ou dépôt e-Soleau de l'INPI, qui n'exige que l'empreinte et non le contenu. Une date inscrite dans un fichier ne prouve rien par elle-même.

---

## Licence

À déterminer. Une chaîne dont personne ne peut auditer les règles de consensus est difficile à faire adopter : une licence permissive sur le protocole mérite d'être considérée.

---

Jeremy Zgonec
