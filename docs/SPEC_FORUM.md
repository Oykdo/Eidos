# Spec — le forum du royaume : échanger des objets entre joueurs

**Dépôt :** Oykdo/Eidos, dans l'écosystème Logos (Eidolon, Cipher, CardSwap).
**Statut :** spec proposée (2026-09-04), décisions F1–F7 (§9) à prendre par l'auteur avant tout chantier. Rien n'est implémenté.
**Règle de lecture :** la chaîne ne croit jamais le forum ; le forum ne touche la chaîne que par une transaction que le nœud valide comme n'importe quel envoi. Ce qui compte est ancré ; ce qui est libre ne vaut rien et ne se transfère pas (`docs/SPEC_SYBIL.md`). Figures ≠ preuves.

## 1. En cinq lignes

1. Un objet **échangeable** est un objet **né d'une dépense réelle** : chaque témoin WOTS+ d'une transaction de la chaîne fait naître un objet (`tirerObjet(sig, hash_bloc)`, la règle qui existe déjà en ville), **porté par la sortie de même rang**. L'objet suit la pièce : c'est une pièce colorée. Personne ne choisit le bloc, personne ne choisit la signature.
2. **Transférer l'objet, c'est dépenser la pièce qui le porte** vers l'autre joueur. La chaîne fait foi, une clé signe une fois, aucun serveur, aucun registre à croire : le nœud recalcule qui porte quoi en rejouant.
3. **Un échange est une seule transaction à deux témoins** : chaque joueur signe son entrée, les deux sorties vont à l'autre. Atomique par construction : soit les deux signatures sont là et tout passe, soit rien ne passe. Le format de transaction porte déjà un témoin absent (`flag = 0`).
4. **Le forum est le lieu de la négociation, pas du règlement** : identité par le coffre Eidolon, conversation dans Cipher (chiffrée de bout en bout), affichage public des offres, dépôt de la transaction achevée dans une issue comme tout envoi. Eidos ne vérifie aucune signature en réseau (hachage seul) : l'identité Eidolon est une **étiquette** pour Eidos, une **preuve** dans Cipher.
5. Ce qu'une offre **établit** se dit avec l'échelle de CardSwap, un barreau à la fois : intégrité (l'objet se recalcule depuis sa naissance), possession (la pièce est non dépensée dans la tête signée), lecture (la fiche) ; jamais un badge unique.

## 2. Ce qui existe déjà, dans les quatre projets

| Brique | Projet | Ce qu'elle apporte au forum |
|---|---|---|
| `tirerObjet(sig, hashBloc, age)`, `graineTirage` | Eidos `objets.ts` | la naissance d'un objet depuis une signature et un bloc : « le joueur ne choisit pas le bloc, le validateur ne choisit pas la sig » |
| `feuilleObjet`, `sceauObjet`, `canoniserMot` | Eidos `objets.ts` | l'identité d'un objet (mot canon, archétype, âge) et son sceau lisible |
| `ficheDe`, `texteFiche` | Eidos `fiche.ts` | la lecture complète d'un objet, en quatre registres |
| format de transaction, témoin absent `flag = 0`, `sighash(i) = SHA-256(txid ‖ i)` | Eidos `utxo.py`, `envoi.ts` | une transaction partielle se sérialise, chaque entrée est signée séparément sur le même cœur |
| envoi par issue `-----EIDOS-----`, `construire_envois`, expiration `T` | Eidos `robinet.py`, `noeud.py` | le dépôt et la validation d'une transaction sans serveur |
| tête signée, `utxo_root`, `preuveReseau`, `jugerSortieReseau` | Eidos `temoin.ts` | prouver qu'une pièce est non dépensée sans rejouer |
| coffre post-quantique, identité, `vault_id`, pont `eidolon_cipher_bridge.json` | Eidolon | l'identité du joueur dans le royaume, la même qui ouvre Cipher |
| messagerie chiffrée de bout en bout, contrat de vie privée | Cipher | la négociation privée entre deux joueurs, sans que le serveur lise |
| échelle de vérification intégrité / possession / communauté / certifié | CardSwap | dire ce qu'une offre établit, barreau par barreau |

## 3. Les objets ancrés : des pièces colorées

### 3.1 Naissance

À chaque transaction validée de la chaîne, pour chaque entrée `i` munie d'un témoin `(graine_pub, sig)`, le nœud calcule :

```
graine_i = SHA-256d("eidos-tirage/1" ‖ sig_i ‖ hash_bloc)
objet_i  = objetDepuisGraine(graine_i, âge du bloc)
```

C'est la règle qui existe déjà (`graineTirage`, `objetDepuisGraine`), appliquée aux vraies signatures. `sig_i` est imprévisible avant la signature, `hash_bloc` avant la forge : ni le dépensier ni le validateur ne choisit l'objet. L'**âge** est celui du bloc : un objet né sous Satya ne se reproduit plus après Satya — la rareté par l'histoire, comme les pièces.

### 3.2 Portage et héritage

L'objet `objet_i` est **porté par la sortie de rang `i`** de la même transaction, si elle existe ; sinon il meurt. Quand une sortie porteuse est dépensée à son tour, son objet **passe à la sortie de même rang** de la transaction qui la dépense : rang à rang, entrée `i` → sortie `i`. La coinbase n'a pas de témoin : elle ne porte rien. Deux conséquences :

- **une pièce porte au plus un objet**, et une transaction à `k` entrées peut en porter `k` ;
- **fusionner deux pièces porteuses dans une sortie unique perd le second objet** : c'est la règle, dite au joueur avant qu'il signe ; scinder est libre (l'objet reste au rang 0).

Le nœud tient ce portage par rejeu (`Carnet`), jamais par déclaration, et publie `etat.json.objets` : pour chaque sortie non dépensée porteuse, `{ txid, rang, feuille, mot, archetype, age, naissance: { txid, rang, bloc } }`. Une lecture, recalculable par quiconque rejoue.

### 3.3 Ce qui ne s'ancre pas

Les objets de la ville (tirés sur la chaîne locale du coffre) et de la Tour (dons, trouvailles, captures, coffrets) sont **jauge** : ils ne naissent d'aucune signature publique et ne se transfèrent jamais, ni par le forum ni autrement. Il n'y a pas de rite qui « ancre » un objet local : ancrer, c'est naître d'une dépense. Un joueur qui veut un objet échangeable dépense une pièce et reçoit l'objet que la chaîne lui donne. Cela ferme la porte aux armées de bots : un objet échangeable coûte une pièce et une clé.

## 4. L'échange : une transaction à deux témoins

Alice porte l'objet X sur la pièce `a` ; Bob porte l'objet Y sur la pièce `b` (ou offre `n` eidôla sur la pièce `b`).

1. **Offre.** Alice construit le cœur `T` : entrées `[a, b]`, sorties `[b → Bob : montant de a, a → Alice : montant de b]` (rang à rang : la sortie 0 reçoit X, la sortie 1 reçoit Y ; Alice met Bob au rang 0). Elle signe **son** entrée : `sighash(0) = SHA-256(txid ‖ 0)`. La transaction partielle (témoin 1 absent, `flag = 0`) est l'**offre**. Le cœur fixe tout : montants, adresses, frais.
2. **Acceptation.** Bob vérifie l'offre (§6), ajoute le témoin de son entrée sur le **même** cœur (même `txid`, donc même `sighash(1)`), et dépose la transaction complète dans une issue `envoi`, comme aujourd'hui.
3. **Règlement.** Le nœud valide l'envoi comme tout autre : témoins, adresses jamais dépensées, sérialisation canonique, coinbase exacte. Il rejoue le portage : X est à Bob, Y à Alice. Aucune étape intermédiaire, aucun dépôt fiduciaire, aucun tiers.

Ce qui rend l'échange sûr est déjà dans la chaîne : les deux signatures portent sur le même `txid` ; en changer un octet change le `txid` et invalide les deux ; une clé ne signe qu'une fois, donc une offre signée ne se réutilise pas sur un autre cœur. Refuser une offre coûte à Alice une clé brûlée (l'adresse `a` a signé) : **une offre est un engagement**, et le coffre lui produit une adresse fraîche pour la suite.

## 5. Le forum : identité Eidolon, conversation Cipher, dépôt Eidos

| Couche | Où | Ce qu'elle fait | Ce qu'elle ne fait pas |
|---|---|---|---|
| **Identité** | Eidolon | le coffre du joueur signe sa **déclaration de royaume** : `{ vault_id, adresse Eidos fraîche, date }` ; la même identité ouvre Cipher (`eidolon_cipher_bridge.json`) | Eidos ne vérifie pas Dilithium : hachage seul. Pour Eidos, `vault_id` est une étiquette ; c'est Cipher qui la prouve |
| **Négociation** | Cipher | la conversation entre Alice et Bob, chiffrée de bout en bout ; l'offre (transaction partielle en base64) y voyage comme un message | le serveur de Cipher ne lit rien et ne garde rien au-delà de son contrat |
| **Affichage** | un espace public du royaume (discussion GitHub `forum`, ou salon public Cipher) | la liste des offres ouvertes : objet (fiche), demande, `vault_id`, expiration | aucune promesse : ce qu'une offre établit se lit barreau par barreau (§6) |
| **Règlement** | Eidos, issue `envoi` | la transaction complète, validée et rejouée par le nœud | rien d'autre : le nœud ne lit ni Cipher ni la discussion |

Le fichier de pont côté Eidos suit la forme du pont Eidolon → Cipher : `eidos_realm_bridge.json` `{ schema_version, vault_id, adresse, declaration, signature_eidolon }`, écrit par Eidolon, lu par l'atelier pour afficher l'identité et par Cipher pour la vérifier.

## 6. Ce qu'une offre établit : l'échelle, barreau par barreau

CardSwap sépare quatre questions qu'on confond d'ordinaire. Ici, trois barreaux tiennent, et le quatrième est nommé pour dire qu'il n'existe pas.

| Barreau | Ce qu'il établit | Comment | Qui peut le vérifier |
|---|---|---|---|
| `intégrité` | l'objet est bien celui que la chaîne a fait naître | recalcul de `feuille` depuis `(sig, hash_bloc)` de la naissance, portage rejoué | quiconque rejoue, ou lit `etat.json.objets` publié par le nœud |
| `possession` | la pièce porteuse est non dépensée **maintenant** | preuve Merkle contre `utxo_root` de la tête signée (`jugerSortieReseau`) | le Témoin, sans rejouer |
| `identité` | l'offre vient d'un coffre Eidolon donné | signature Dilithium5 de la déclaration de royaume | Cipher et Eidolon ; pour Eidos, une étiquette |
| `certifié` | n'existe pas | il n'y a pas de grade externe pour un mot | personne : la **fiche** est une lecture, jamais une certification |

Un client ne peut jamais attester plus que l'intégrité (la règle de CardSwap vaut ici) : la possession vient de la tête signée, l'identité de Cipher.

## 7. Le frein et l'expiration

- Une offre ne coûte rien à la chaîne tant qu'elle n'est pas acceptée ; elle coûte une **clé** à celui qui l'a signée. C'est le frein naturel : on n'offre pas cent fois.
- Une offre **expire** avec l'adresse qu'elle engage : dès que la pièce `a` est dépensée autrement, ou après `T` créneaux (la règle des envois, `EXPIRATION_ENVOI`), l'affichage la retire.
- L'acceptation paie les **frais** de la transaction, dans la coinbase, comme tout envoi. Pas de frais de forum.
- Une offre par identité et par époque dans l'affichage public (la règle du robinet, par compte) ; aucune limite dans Cipher, qui est privé.

## 8. Esquisse technique

Côté chaîne (Python, bibliothèque standard, contrôles nus) :
- `objets.py` : port à l'octet de `objetDepuisGraine`, `paqueter`, `depaqueter`, `canoniserMot`, `feuilleObjet` ; famille `objets` dans `vecteurs.json` (parité Python ↔ TS, job `parite`). **Préalable :** la décision sur le signe de la composante omise (`CLAUDE.md`, fiche d'objet) — on ne porte pas un paquetage qu'on va changer.
- `utxo.py` / `noeud.py` : portage des objets rejoué dans `Carnet` (rang à rang, mort à la fusion), `etat.json.objets` publié ; +3 contrôles (naissance depuis un témoin, héritage rang à rang, perte à la fusion).

Côté atelier (TypeScript, aucune dépendance) :
- `forum.ts` : `offreDe(coffre, pièceA, demande)` → transaction partielle sérialisée (`envoi.ts`, témoin absent) ; `lireOffre(texte)` ; `jugerOffre(offre, tete, objets)` → les barreaux (intégrité, possession) ; `accepterOffre(coffre, offre)` → témoin ajouté sur le même cœur, texte d'issue `envoi`.
- `objets-ancres.ts` : mes objets ancrés depuis `etat.json.objets` et mes pièces ; la fiche (`fiche.ts`) les lit comme les autres.
- Page **Forum** (registre Lire) : mes objets ancrés, les offres ouvertes avec leurs barreaux, « Offrir », « Accepter », « Déposer dans une issue ». Aucune vérification Dilithium dans l'atelier : le `vault_id` s'affiche, ne se prouve pas.

Côté Logos :
- Eidolon écrit `eidos_realm_bridge.json` (déclaration de royaume signée) ; Cipher vérifie la signature et porte l'offre en message ; l'espace public liste les offres.

Contrôles (`forum.test.ts`) : une offre se sérialise avec un témoin absent et se relit à l'octet ; l'acceptation garde le `txid` ; changer un octet du cœur invalide les deux témoins ; le portage rang à rang ; la fusion perd le second objet et le dit ; une offre dont la pièce est dépensée est jugée « possession : non ».

## 9. Décisions qui reviennent à l'auteur

| # | Décision | Recommandation |
|---|---|---|
| F1 | Naissance : chaque témoin d'une dépense réelle fait naître un objet, ou seulement les dépenses marquées | **chaque témoin** : simple, rejouable, rien à déclarer |
| F2 | Héritage : rang à rang, le surplus meurt à la fusion | **oui** : une règle qu'on peut dire en une phrase ; scinder reste libre |
| F3 | Où vit l'affichage public : discussion GitHub `forum` ou salon public Cipher | **les deux** : GitHub pour qui n'a pas Cipher, Cipher pour la négociation |
| F4 | Identité : la déclaration de royaume signée par Eidolon, `vault_id` étiquette pour Eidos | **oui** : Eidos reste hachage seul ; la preuve vit là où la signature se vérifie |
| F5 | Frein : une offre publique par identité et par époque, expiration `T` | **oui** : la règle du robinet, déjà comprise |
| F6 | Les objets de jauge restent inéchangeables, sans rite d'ancrage | **oui** : c'est la règle Sybil ; un objet échangeable naît d'une dépense |
| F7 | Ordre : corriger le signe de `paqueter` avant tout port Python | **oui** : sinon on gèle un paquetage faux dans `vecteurs.json` |

## 10. Ce qu'on ne fait pas

- Pas de serveur d'échange, pas de dépôt fiduciaire, pas de registre d'objets à croire : le portage se rejoue.
- Pas de vérification de courbes ni de réseaux dans Eidos : Dilithium reste dans Eidolon et Cipher.
- Pas de transfert d'objets de jauge, pas de « conversion » d'un objet local en objet ancré.
- Pas de valeur : le réseau d'essai n'en a aucune, et un objet ancré n'est qu'une pièce qui porte un mot.
