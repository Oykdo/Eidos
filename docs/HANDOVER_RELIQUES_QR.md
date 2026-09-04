# Handover — Reliques dissimulées, récupérables par code QR

**Dépôt :** Oykdo/Eidos
**Statut :** proposition de conception, rien n'est codé
**Rédigé le :** 2026-09-04, après P1 (envois) et P2 (WOTS+ / XMSS, testnet-2)
**Entrées :** `prototype relique/` (4 captures, `prototype_ASCII_HC.docx`, `README.md`)

---

## 1. L'idée en une phrase

Une relique est une **pièce scellée sur une adresse dont la graine est imprimée
dans un code QR** caché dans le monde réel. La récupérer, c'est **dépenser cette
pièce** vers son propre coffre. Comme une clé WOTS+ ne signe qu'une fois, la
relique ne peut être récupérée qu'une fois, **par construction**, sans serveur,
sans registre, sans arbitre : la chaîne du réseau d'essai fait foi.

Tout ce qu'il faut existe déjà :

| Besoin | Déjà là |
|---|---|
| Adresse à usage unique dérivée d'une graine | `wots.adresse_de(graine)`, `wots.ts` |
| Créditer une adresse sur le testnet | robinet (issue GitHub, 1 eidôlon) |
| Dépenser depuis l'atelier vers le nœud | P1 : `envoi.ts`, `robinet.py --envoi`, `noeud.construire_envois` |
| Retrouver ses pièces | `etat.json`, `chargerTestnet` |
| Lecture symbolique d'une pièce | artefacts (9 empilements, `noeud.artefact_de_goutte`), reliques par âge (`relique.ts`) |
| Adresse lisible à l'œil | 27 + 4 glyphes (`glyphs.ts`, `addr_encode`) |

Ce qui manque : le format du QR, la page de récupération, le statut public des
reliques, l'outil du gardien. Quatre chantiers, détaillés en §6.

## 2. Ce que je retiens du dossier `prototype relique/`

Lu en entier. Franchement :

- **`README.md`** décrit PHASMA (adressage voxel dans un cristal liquide,
  registered report). Il n'a pas de rapport avec les reliques : je pense qu'il
  a été copié par erreur. À sortir du dossier.
- **Les quatre captures** sont des motifs visuels : symétrie de phase locale,
  rotation SU(2) → SO(3), cloche gaussienne, coordonnées sphériques. Deux d'entre
  eux sont **déjà** dans l'atelier (`docs/SPEC_AUDIT_COFFRES.md`, scène des
  coffres : gaussienne et sphère). Ce sont de bonnes références pour le **rendu**
  d'une relique trouvée (voir §5), pas des spécifications.
- **`prototype_ASCII_HC.docx`** (hypercube ASCII, octants, « antimots »,
  « médecine vectorielle »). J'en garde une seule chose, compatible avec
  l'invariant *figures ≠ preuves* : une **lecture** de la relique en octants,
  dérivée de son `txid` (3 bits → 8 octants, comme les 6 bits → 64 empilements
  des Signes). Je **ne recommande pas** d'embarquer les usages thérapeutiques ou
  « vibratoires » du document : ils ne sont ni vérifiables ni à leur place dans
  un projet dont la ligne est « rien ne se croit, tout se rejoue ».

## 3. Modèle

```
gardien                    monde réel                 chercheur
-------                    ----------                 ---------
graine g (32 o, aléa)  →   QR imprimé, caché    →     scan
adresse A = wots(g)                                    A = wots(g)
crédite A (robinet)                                    etat.json : A a une sortie ?
publie A dans reliques.json                            signe la dépense A → mon coffre
                                                       issue « envoi » (P1)
                                                       le nœud inclut : relique récupérée
```

Propriétés :

- **Unicité** : la dépense consomme la sortie et brûle la clé. Deux scans en
  concurrence : le nœud inclut la première demande valide, la seconde est
  refusée `entree inconnue ou deja depensee`. Aucune logique nouvelle.
- **Preuve** : la récupération est une transaction dans `chaine-eidos.dat`,
  rejouée par tout le monde. Le « qui » est une adresse ; le « quand » est un
  bloc. C'est tout, et c'est suffisant.
- **Pas de serveur** : le QR pointe sur l'atelier (GitHub Pages) avec la graine
  dans le **fragment d'URL** (`#…`), qui ne quitte jamais le navigateur.
- **Lecture, pas preuve** : l'artefact (planète), l'âge, l'octant sont des
  figures dérivées de `txid` et d'adresse. Ils s'affichent, ils n'engagent rien.

## 4. Formats

### 4.1 Graine et adresse

- `graine` : 32 octets tirés au hasard par le gardien (jamais dérivés d'un
  nom : c'est le seul secret).
- `adresse = wots.adresse_de(graine)` (SHA-256(graine_pub ‖ racine L)[:20]).
- `id_public = sha256("eidos-relique-qr/1" ‖ adresse)[:8]` en hexadécimal : sert
  de nom dans `reliques.json` et dans l'interface, ne révèle rien.

### 4.2 Charge utile du QR

```
https://oykdo.github.io/Eidos/reliques#r=1.<graine base64url 43 car.>
```

- Version `1` en tête, pour pouvoir changer la dérivation sans casser les QR
  déjà imprimés.
- base64url sans `=` : 43 caractères. URL totale ≈ 85 caractères → QR
  version 5 ou 6 en correction **H** (30 %), lisible abîmé.
- Variante hors ligne (gravure, NFC) : `eidos:relique/1/<base64url>` ; l'atelier
  accepte les deux.
- **Jamais** l'adresse ni les glyphes dans le QR : l'adresse est publique et
  dérivable ; le QR ne porte que le secret.

### 4.3 `reliques.json` (public, à la racine, écrit par le gardien)

```json
{
 "spec": "eidos-reliques/1",
 "reliques": [
  {"id": "3f1c9a02", "adresse": "…40 hex…", "age": "Kali",
   "indice": "Sous la troisième arche", "scellee_le": "2026-09-10"}
 ]
}
```

Le nœud le lit pour publier le statut (§4.4). L'`indice` est facultatif :
c'est le jeu, pas le protocole.

### 4.4 `etat.json` — section `reliques` (écrite par `noeud.py`)

```json
"reliques": [
 {"id": "3f1c9a02", "adresse": "…", "etat": "intacte",   "montant": 100000000},
 {"id": "8b20e7d4", "adresse": "…", "etat": "recuperee", "bloc": 412,
  "txid": "…", "vers": "…adresse du coffre…", "artefact": "lune"}
]
```

Trois états : `attente` (adresse publiée, pas encore créditée), `intacte`
(sortie non dépensée), `recuperee` (dépensée : bloc, txid, adresse de
destination). Calculé au rejeu, comme les gouttes du robinet (`noter_gouttes`).

## 5. Expérience de récupération (atelier)

1. **Scan.** Page `/reliques`, bouton « Scanner ». `BarcodeDetector` quand le
   navigateur l'offre (Chrome, Android) ; sinon lecture d'une photo importée
   (bibliothèque `jsqr`, ~40 Ko, sans dépendance) ; sinon coller l'URL. Le
   fragment est lu, jamais envoyé.
2. **Reconnaissance.** L'atelier dérive l'adresse, lit `etat.json`, et affiche :
   *intacte* (montant, âge, artefact), *déjà récupérée* (bloc, par qui), ou
   *inconnue* (pas dans `reliques.json` : QR étranger ou gardien non déclaré).
3. **Récupération.** Un clic : `signerEnvoi(graine, [sortie], mon adresse
   suivante, montant, 0, null)` → texte `-----EIDOS-----` → issue « envoi » via
   l'URL pré-remplie (comme le robinet). Le coffre note la relique **en
   attente** avec son `txid`.
4. **Confirmation.** Au prochain `chargerTestnet`, la sortie apparaît dans le
   coffre : la relique passe en **récupérée**. La page Reliques la range avec
   les reliques par âge, rendue selon l'âge et l'artefact.
5. **Rendu.** Reprendre la scène des coffres (gaussienne + sphère, déjà
   spécifiée) : une relique trouvée est un point `(r, θ, φ)` sur la cloche, dont
   `θ, φ` viennent du `txid` et `r` de l'âge. Les captures du dossier servent
   ici. Le spineur (SU(2) → SO(3)) peut animer la rotation d'une relique
   Satya : figure, pas preuve.

## 6. Chantiers (une PR chacun, dans cet ordre)

### R1 — Statut public des reliques (Python)
- `reliques.json` (spec ci-dessus), `noeud.py` : `noter_reliques(ch, blk)` au
  rejeu, section `reliques` dans `ecrire_etat`. Rien dans le consensus.
- Contrôles (`noeud._test_reliques`, 4) : attente → intacte après crédit ;
  intacte → recuperee après dépense (bloc, txid, destination) ; adresse
  absente de `reliques.json` ignorée ; artefact attaché.
- Fichiers : `noeud.py`, `reliques.json`, README, CLAUDE.md §2/§4, tests.yml.

### R2 — Lecture du QR et récupération (atelier)
- `relique-qr.ts` : `parserRelique(url)` (deux formes, version), `adresseRelique`,
  `statutRelique(etat, reliques)`, `preparerRecuperation(graine, etat, coffre)` →
  `EnvoiExporte` (réutilise `envoi.ts`). Aucune dépendance nouvelle.
- Page `/reliques` : scan (`BarcodeDetector` → photo → collage), fiche, bouton.
- Contrôles (`relique-qr.test.ts`, 5) : parse/refus des deux formes, adresse
  = `vecteurs.json`, statut sur un `etat.json` figé, envoi produit et relu par
  `deserTx`, refus si déjà récupérée.

### R3 — Outil du gardien (atelier, page privée ou script local)
- Génère une graine (CSPRNG), l'adresse, l'`id`, le QR en SVG (bibliothèque
  `qrcode-generator`, 20 Ko, sans dépendance), une planche imprimable :
  QR + glyphes de l'adresse + `id`. Ajoute l'entrée à `reliques.json` (à
  committer par le gardien) et fournit l'URL d'issue robinet pour créditer.
- La graine n'est **jamais** stockée : elle est dans le QR, point. Le gardien
  imprime, puis oublie.
- Contrôles (3) : dérivation = Python (`vecteurs.json`), SVG valide et lisible
  par `jsqr`, planche sans la graine en clair hors du QR.

### R4 — Rendu et lectures (atelier, optionnel)
- Relique trouvée dans la scène des coffres ; lecture en octants du `txid` ;
  galerie « reliques du monde » depuis `etat.json.reliques` (carte des
  trouvées / intactes, sans indice de lieu pour les intactes).

Estimation : R1 une demi-journée, R2 une journée, R3 une demi-journée, R4 selon
l'envie. Tout tient sur le testnet-2 sans réinitialisation.

## 7. Sécurité et limites, à dire à l'utilisateur

- **Le QR est un secret au porteur.** Une photo suffit à récupérer la relique.
  C'est voulu (premier arrivé) ; il faut le dire sur la planche imprimée.
- **Pas de preuve de lieu.** Rien ne prouve que le chercheur était sur place ;
  une position GPS serait une figure. Ne pas en faire une garantie.
- **Course.** Deux demandes pour la même relique : la première inscrite dans
  `mempool.json` gagne ; l'autre est refusée avec motif. Pas de tirage au sort.
- **La graine ne sort jamais du navigateur.** Elle n'est ni dans l'issue (seule
  la transaction signée y est), ni dans la transaction (seule la graine
  *publique* et la signature y sont).
- **Réseau d'essai, sans valeur.** Une relique vaut ce que vaut le jeu.
- **Montant.** Avec le robinet, 1 eidôlon par relique et une seule fois par
  adresse — suffisant. Si l'on veut des prix par âge (Kali 2,10 … Satya 33,55),
  il faut un type de demande `sceau` dans `noeud.py`, budgété comme le robinet.
  À décider après R1.

## 8. Décisions qui vous reviennent

1. Le montant d'une relique : 1 eidôlon (robinet, zéro code) ou prix par âge
   (nouveau type `sceau`, budget d'époque à fixer) ?
2. Les indices de lieu dans `reliques.json` : publics dès le scellement, ou
   révélés par vagues ?
3. Le gardien : vous seul (fichier `reliques.json` committé à la main), ou une
   issue « sceau » traitée par le workflow, comme le robinet ?
4. Sortir `prototype relique/README.md` (PHASMA) du dépôt Eidos.

## 9. Ce que ce handover ne couvre pas

- Une application mobile : l'atelier en PWA (déjà `sw.js`, `manifest`) suffit
  pour scanner.
- La vérification sans rejeu d'une récupération : viendra avec P3
  (`utxo_root` dans l'en-tête et le témoin).
- La signature XMSS côté atelier : P3 également.
