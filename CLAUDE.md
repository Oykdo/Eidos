# CLAUDE.md — Eidos

Fichier de contexte pour Claude Code. À déposer à la racine du dépôt `Oykdo/Eidos`.
Il décrit ce qu'est le projet, ce qui ne se touche pas, comment on vérifie, et
dans quel ordre on avance. Lis-le entièrement avant toute modification.

---

## 1. Ce qu'est Eidos

Chaîne prototype à émission bornée sans halving, consensus fédéré, signatures
post-quantiques par hachage pur (aucune courbe elliptique). Unité : l'eidôlon
(EIDL), 1 eidôlon = 10⁸ atomes. Réseau d'essai uniquement, sans valeur.

Les cinq propositions, dans l'ordre où elles contraignent le code :

1. **La récompense ne se divise jamais.** `R(h) = a + (a/2)·cos(2π(h−h₀)/T)`,
   `T = 1008`, `h₀ = 492`. Une époque somme exactement `a·T`, à l'atome près,
   par répartition au plus fort reste.
2. **Rotation de pas 3.** Proposant du créneau `s` = `V[(3·s) mod n]`.
   `n` divisible par 3 est refusé.
3. **Une adresse se lit.** 27 glyphes de charge + 4 de contrôle, 6 bits/glyphe,
   bourrage du 27ᵉ glyphe nul sinon refus.
4. **L'énergie est bornée par le consensus.** Fédération, pas preuve de travail.
5. **Rien ne se croit, tout se rejoue.** Le carnet UTXO n'est jamais persisté :
   rejeu intégral et revalidation à chaque ouverture, par le même code qu'à la forge.

Quatre âges : Satya (a=40, 832 époques), Trétâ (30, 624), Dvâpara (20, 416),
Kali (10, 208). Total **62 899 200** eidôla sur 2 096 640 blocs.

## 2. Carte du dépôt

```
eonis.py            émission (cosinus Decimal, π à 68 décimales), codec glyphes   GELÉ
genesis.json        tables et empreintes figées                                   GELÉ
verify_genesis.py   32 contrôles d'intégrité de la genèse
wots.py             WOTS+ w=16 (RFC 8391), arbre L, adresses, empreintes (5 contrôles)
utxo.py             témoins WOTS+, adresses, Tx, Carnet, racine UTXO, validation (15 contrôles)
federation.py       XMSS, rotation, vivacité, tête signée (16 contrôles)
vecteurs.py         vecteurs partagés Python ↔ TS, écrit/relit vecteurs.json (6 familles)
noeud.py            nœud du testnet : rejeu, forge, robinet, envois, --depuis, reliques, etat.json (5 + 4 + 4 contrôles)
qr.py               encodeur QR stdlib, octets, niveau H, versions 1–10 (5 contrôles)
relique.py          gardien des reliques : --sceller (QR + planche + reliques.json), --animer (3 contrôles)
reliques.json       reliques déclarées : id, adresse, âge, indice — JAMAIS de graine
robinet.py          file mempool.json alimentée par issues GitHub (10 contrôles)
consensus.py        difficulté PoW et travail cumulé — chemin HISTORIQUE
store.py            chaîne PoW sur disque (chaine.dat) — chemin HISTORIQUE
federation.json     racines + graines publiques des 7 validateurs, t0, créneau 3600 s
chaine-eidos.dat    la chaîne du testnet (écrite par la CI, jamais à la main)
etat.json           état publié (soldes, sorties, artefacts, invariant)
mempool.json        demandes robinet / envoi
atelier/            interface web (TanStack Start, React), rejoue la spec en TS
.github/workflows/  tests.yml (3 OS × 2 Python + empreintes), chaine.yml (cron
                    horaire), robinet.yml (issues), pages.yml, init.yml
```

Deux consensus coexistent : **fédéré** (`federation.py` + `noeud.py`, le vrai) et
**PoW** (`consensus.py` + `store.py`, jouet d'origine). Ne pas les mélanger ; ne
pas étendre le chemin PoW.

Dans `atelier/src/lib/eidos/` : `eonis.ts`, `lamport.ts`, `merkle.ts`, `carnet.ts`,
`chaine.ts`, `temoin.ts`, `wallet.ts`, `coinselect.ts`, `glyphs.ts`, `portable.ts`,
`envoi.ts`, `wots.ts`, `xmss.ts`, `relique-qr.ts` — chacun avec son `.test.ts` ;
`vecteurs.test.ts` relit `vecteurs.json`. `lamport.ts` garde Lamport en démonstration mais dérive adresses,
empreintes et témoins via `wots.ts`. `genesis-data.ts` recopie `genesis.json`.

## 3. Invariants — ne jamais casser

- **`eonis.py` est gelé.** Son SHA-256 (`cc94ad1e…`) est dans `genesis.json` et
  vérifié par la CI (job `hygiene`). Modifier un commentaire invalide la genèse.
  Si une modification est indispensable : régénérer `genesis.json`, mettre à jour
  les trois empreintes du README, `genesis-data.ts`, et réinitialiser le testnet
  (voir §6).
- **Jamais `math.cos`.** Le cosinus est `decimal.Decimal` par série de Taylor.
  Deux nœuds avec deux libm = scission de chaîne.
- **Bibliothèque standard uniquement** côté Python. Pas de `pip install`, pas de
  dépendance. Python 3.9 est le plancher (CI).
- **Conservation** : `Σ utxo == emission_cumulee()` après chaque bloc. `noeud.py`
  refuse de publier si l'invariant est rompu.
- **Racine UTXO déclarée = racine calculée.** Tout bloc fédéré porte
  `utxo_root` ; `Carnet.valider_bloc` la recalcule (ordre `(txid, rang)`,
  feuille `sha256d(txid ‖ rang(4) ‖ adresse ‖ montant(8))`, même règle que
  `merkle.ts`) et refuse l'écart. `id_bloc = sha256d(E.header ‖ utxo_root)` :
  `E.header` reste gelé, la racine s'ajoute à côté.
- **Assume-valid jamais implicite.** `noeud.py --depuis` exige hauteur ET
  racine sur la ligne de commande ; sans `--depuis`, rejeu intégral.
- **Une clé WOTS+ signe une fois.** Une adresse ne peut être dépensée qu'une
  fois dans toute la chaîne (`cles_usees` note l'adresse, préfixe de 20 octets
  de l'empreinte `sha256(graine_pub ‖ racine_L)`). Se note sans reconstruire
  la clé : vaut aussi sur le chemin assume-valid de `--depuis`.
- **Aucun hachage nu dans WOTS+.** Chaque maillon est tweaké par (graine
  publique, ADRS) selon la RFC 8391 ; `wots.py` et `wots.ts` doivent rester
  identiques à l'octet, ce que `vecteurs.json` contrôle.
- **Un indice MSS ne sert qu'une fois** par validateur (`ChaineFederee.indices`).
- **Vivacité** : créneau `s > créneau(now)+1` refusé ; au plus 6 blocs par exécution.
- **Coinbase exacte** : `reward_at(h) + frais`, ni plus ni moins.
- **Sérialisation canonique** : `Tx.core()` retrouvé à l'octet près après
  désérialisation, sinon `ValueError`.
- **Le corps d'une issue n'est jamais interpolé dans une commande.** Il transite
  par `EIDOS_ISSUE_BODY` et `robinet.py` ne retient que ce qui passe le filtre
  de figures + somme de contrôle (ou base64 sur lignes entières pour `envoi`).
- **Aucun état local versionné** hors `chaine-eidos.dat`, `etat.json`,
  `mempool.json` (job `hygiene`). Pas de `chaine.dat`, pas de `portefeuille.json`.
- **Figures ≠ preuves.** L'Arbre, les Signes, les reliques, les artefacts sont
  des lectures ; seuls le carnet, la chaîne et les signatures engagent. Ne jamais
  présenter une figure comme une garantie dans le code, les tests ou les textes.
- **Une graine de relique n'existe que dans son QR.** Ni `reliques.json`, ni la
  planche, ni un commit, ni un log ne la contiennent ; `relique.py --sceller` ne
  l'affiche pas. Le statut publié (`etat.json.reliques`) est une lecture.

## 4. Comment on vérifie

```bash
python3 verify_genesis.py      # 32 contrôles — toujours en premier
python3 eonis.py               # 6
python3 wots.py                # 5
python3 utxo.py                # 15
python3 vecteurs.py            # parité Python ↔ TS (vecteurs.json)
python3 robinet.py --test      # 10
python3 -c "import noeud as N; N._test_artefact()"
python3 -c "import noeud as N; N._test_envois()"      # 5
python3 -c "import noeud as N; N._test_depuis()"      # 4
python3 -c "import noeud as N; N._test_reliques()"    # 4
python3 qr.py --test           # 5
python3 relique.py --test      # 3
python3 consensus.py           # 6 (historique)
python3 federation.py          # 16
python3 noeud.py --verifier    # rejeu intégral du testnet, doit finir « aucun refus »
cd atelier && npm test         # node --test, tous les .test.ts (liste dans package.json)
```

Règles :
- Toute nouvelle règle de validation = un contrôle `doit_echouer(...)` qui la
  viole, dans la suite du module concerné. On compte les contrôles dans le README.
- Une modification de format (`ser_bloc`, `ser_tx`) = aller-retour ser/deser
  testé + `noeud.py --verifier` sur la chaîne réelle.
- Jamais de `float` dans un chemin de consensus. `part_pionniers` (float) est
  hors consensus et le reste.
- Tests Python : `assert` + `print` nus, pas de framework. Garder ce style.

## 5. Formats binaires (gros-boutiste)

```
noeud.py — chaine-eidos.dat (FORMAT 3 depuis eidos-testnet-3)
  entête  MAGIC "EIDOS\0\0\1"(8) FORMAT(2)=3
  bloc    LONGUEUR(4) CORPS
  corps   height(8) prev(32) ts(8) utxo_root(32) validateur(2) indice(4)
          sig(2144) k(1) chemin(32k) n_tx(2) [tx]*
  tx      len_core(4) core n_temoins(2) [flag(1) (graine_pub(32) sig(2144))?]*
  core    VERSION(4)=2 n_in(2) [txid(32) vout(4)]* n_out(2) [addr(20) atomes(8)]*

E.header (gelé)  : height(8) prev(32) merkle(32) ts(8) nonce(8)
entête fédéré    : E.header ‖ utxo_root(32)            (U.entete_federe, 120 o)
id_bloc = SHA-256d(entête fédéré) ; nonce = 0 et bits = 0 en fédéré
utxo_root = Merkle SHA-256d des feuilles sha256d(txid ‖ rang(4) ‖ adresse ‖ montant(8)),
            ordre (txid, rang), carnet vide = 32 zéros (U.utxo_root)
sighash(i) = SHA-256(txid ‖ i(4))
etat.json.tete_signee : hauteur, prev, merkle, ts, utxo_root, id_bloc, validateur,
            indice, signature, chemin — de quoi juger sans rejouer (temoin.ts)
signature de bloc : XMSS, feuille = arbre L de la clé WOTS+ d'indice i,
ADRS indexées par i (OTS, L) et par (hauteur, indice) dans l'arbre
```

Toute évolution de format passe par `FORMAT = 4`, jamais par une lecture
tolérante de `FORMAT = 3`. Les formats 1 (Lamport) et 2 (sans racine) ne sont
plus lus.

## 6. Réinitialiser le testnet (quand un format ou la genèse change)

1. Mettre à jour `federation.json` (`t0_unix`, `t0_iso`, racines et
   `graines_publiques` si la dérivation change) et le tag `GRAINE` de
   `noeud.py` : `eidos-testnet-3` → `eidos-testnet-4`. La génération d'une clé
   XMSS de hauteur 12 prend ~40 s ; sept clés, ~5 min.
2. Supprimer `chaine-eidos.dat`, `etat.json`, vider `mempool.json`.
3. `python3 noeud.py --init && python3 noeud.py --forger && python3 noeud.py --verifier`.
4. Mettre à jour les empreintes du README et `genesis-data.ts`.
5. Commit unique « testnet : réinitialisation v2 », puis laisser `chaine.yml`
   reprendre au cron.

Le testnet n'a aucune valeur : le réinitialiser est gratuit. Ne pas bricoler
une migration in-place.

## 7. Feuille de route, par ordre de priorité

Chaque chantier est une PR isolée. Ne pas en ouvrir deux à la fois.

### P1 — Fermer la boucle atelier ↔ nœud — FAIT (septembre 2026)
- `noeud.py` : `construire_envois(ch, h, créneau, file, txs_avant)` décode
  (`decoder_envoi`, à l'octet près), valide chaque envoi dans un bloc candidat
  sur une copie profonde du carnet (`essayer_envoi`), écarte les fautifs
  (`etat: "refus"`, `motif`), inclut les valides après le robinet (au plus
  `MAX_ENVOIS = 8`), et porte leurs frais dans la coinbase. Un envoi en attente
  depuis plus de `EXPIRATION_ENVOI = T` créneaux passe en `refus / expiree`.
- `robinet.py --envoi` inscrit le `creneau` courant ; entre les marqueurs,
  toute ligne entièrement base64 est retenue (lignes de 76).
- Atelier : `envoi.ts` (ser/deser = `ser_tx`, base64 sans `Buffer`,
  encapsulation, `lireEtat`, `sortiesDuCoffre`) ; `wallet.ts` :
  `appliquerEnvoi` renvoie `envoi.texte` prêt pour une issue, `chargerTestnet`
  importe les pièces du testnet d'un coffre.
- Reste hors P1 : brancher l'export et l'import dans l'interface (page Coffre) ;
  un témoin Lamport (24 577 o) limite un envoi à UNE entrée par issue GitHub
  (65 536 caractères) — P2 lève cette limite.

### P2 — WOTS+ à la place de Lamport — FAIT (septembre 2026)
- `wots.py` : WOTS+ w=16, n=32, SHA-256, F/H/PRF à domaine séparé, ADRS de
  32 o, arbre L ; adresse = `sha256(graine_pub ‖ racine_L)[:20]`, empreinte =
  le hachage entier. Témoin 2 176 o. 5 contrôles (dont forge partielle par
  réemploi, tailles imprimées).
- `utxo.py` : `VERSION = 2`, témoin `(graine_pub, sig)`, Lamport retiré ;
  +1 contrôle « transaction sans entrée ». `federation.py` : XMSS (feuille =
  arbre L, arbre tweaké), clé publique = (racine, graine publique) ;
  `Federation(..., graines_pub=)` / `Federation.depuis_cles(cles, t0, h)`,
  `verifier_mss(racine, graine_pub, h, msg, sig)` ; +1 contrôle (signature
  altérée / indice changé).
- `noeud.py` : `FORMAT = 2`, tag `GRAINE = "eidos-testnet-2"`, clés mises en
  cache par exécution. `store.py` (PoW historique) suit le témoin.
- Atelier : `wots.ts` (port à l'octet), `lamport.ts` dérive adresses,
  empreintes et témoins via WOTS+ (Lamport conservé en démonstration),
  `envoi.ts` en `VERSION 2`, `constantes.ts` (témoin 2 177 o).
- `vecteurs.py` / `vecteurs.json` : amorce de P4 — clé, tx, feuille XMSS 0 ;
  `vecteurs.test.ts` relit le fichier. Manque encore le job CI `parite`.
- Testnet réinitialisé le 2026-09-04 (`eidos-testnet-2`, XMSS hauteur 12 :
  4 096 signatures par validateur, ~3 ans de blocs horaires).

### P3 — Racine UTXO dans l'en-tête — FAIT (septembre 2026)
- `utxo.py` : `feuille_sortie`, `utxo_root`, `entete_federe` (E.header gelé ‖
  racine), `racine_apres(carnet, blk)` pour le forgeron ; `valider_bloc`
  compare la racine déclarée, étend la tête, garde `carnet.racine_utxo` ;
  `verifier_temoins=False` pour l'assume-valid. +3 contrôles.
- `federation.py` : `id_bloc` exige `utxo_root`, `appliquer_sans_verifier`,
  `tete_signee` notée à chaque bloc ; +1 contrôle. `noeud.py` : `FORMAT = 3`
  (`utxo_root` après `ts`), `--depuis <h> <racine>` (3 contrôles),
  `etat.json` publie `utxo_root` et `tete_signee`. Testnet-3 réinitialisé.
- Atelier : `xmss.ts` (`verifierMss`), `merkle.ts` (`utxoRoot`, `preuveReseau`,
  ordre canonique), `temoin.ts` (`parserTeteReseau`, `parserFederation`,
  `enteteFedere`/`idBlocDe`, `verifierTeteReseau`, `jugerReseau`).
- `vecteurs.json` : familles `carnet` (3 sorties, racine) et `tete` (fédération
  h=4, tête signée, sorties engagées) ; relues par `merkle.test.ts`,
  `temoin.test.ts`, `xmss.test.ts`.
- Page Témoin branchée : `temoin.suivreReseau` lit `etat.json` et
  `federation.json` (raw.githubusercontent), vérifie la tête, juge une sortie
  publiée (`jugerSortieReseau`) ; store `reseau`, section « Réseau d'essai ».
- `--depuis` note les adresses dépensées des blocs sautés : un réemploi de clé
  brûlée avant le point de contrôle est refusé (4ᵉ contrôle).

### Reliques QR — FAIT (septembre 2026), voir docs/HANDOVER_RELIQUES_QR.md
- R1 `noeud.py` : `charger_reliques`, `noter_reliques` (sorties créées / dépensées
  sur les adresses déclarées), `etat_reliques` → `etat.json.reliques`
  (attente / intacte / recuperee avec bloc, txid, vers, artefact) ; 4 contrôles.
- R2 atelier : `relique-qr.ts` (`parserRelique` : URL `#r=1.<b64url>`, `eidos:relique/1/…`,
  fragment nu ; `statutRelique` ; `preparerRecuperation` = dépense signée WOTS+
  au format du nœud + URL d'issue) ; composant `ReliqueTrouvee` (fragment d'URL,
  collage, caméra via `BarcodeDetector` quand disponible) ; 4 tests, vecteur `relique`.
- R3 `relique.py --sceller` + `qr.py` (encodeur stdlib, niveau H, v1–10, masque par
  pénalité) : SVG du QR, planche sans graine, entrée dans `reliques.json`.
- R4 `relique.py --animer <txid>` : animation ASCII/unicode (figures · ○ ☽ ✚, ellipse
  de l'âge, R(θ) = a + b·cos θ, satellites et glyphe central tirés du txid).
- Choix par défaut : 1 eidôlon par relique via le robinet (aucun type `sceau`),
  gardien manuel (`reliques.json` committé), indices publics dès le scellement.
- Rendu : la scène three.js (SDF raymarché, `ReliqueCanvas`) est animée ; depuis
  R4, **une danse par muse** (`lib/reliques/danse.ts` = `danse()` du shader,
  identité à phase 0, période 11,3 s : nutation, précession, tempo, culbute,
  flamme, ronde, vis sans fin, phases, rebond), nom de la muse en tête de la
  scène, relique trouvée rendue avec sa muse, liste « Reliques du monde ».
  `forme.ts` reste la référence CPU du shader : toute retouche du GLSL se
  reporte dans `danse.ts` / `forme.ts` et leurs tests.
- Reste : `qr.py` n'a pas de décodeur (scanner l'écran avant d'imprimer).

### Coffre 3D — un seul coffre, palettes isochromatiques, ornements par butin (FAIT 2026-09)
`lib/eidos/coffres.ts` : `scoreButin` / `palierButin` (objets 1, gemme 2, affixe
rang−1, philosophale 4, sceau 1–4 ; seuils 1 / 4 / 9 → nu, garni, orné,
précieux), `paletteDePalier` (une teinte par palier — acier 215°, vert-de-gris
150°, ambre-or 42°, améthyste 275° — huit clartés 94→12 %, `hslVersHex`),
`ornementsDe` cumulatifs (tas 10, ferrures 28, cage 265, couronne 8 cellules).
`CoffreScene` : un coffre au pic de la cloche, cage au palier précieux.
Spec : `docs/SPEC_AUDIT_COFFRES.md` v2. Le palier lit la jauge, jamais le solde.

### Refonte du hub — FAIT
- H1 FAIT : navigation en trois registres (Vérifier / Lire / Jouer) + Guide,
  routes inchangées (`Nav.tsx`).
- H2 FAIT : l'Arbre d'origine (régimes, champ, lumen, ancre FNV : `lib/arbre/`,
  `components/arbre/`) est retiré. `/arbre` (chemin conservé, libellé « Carte »)
  affiche `CarteReliques` : grille 4 âges × 9 muses depuis `etat.json.reliques`
  (muse = œuf de la goutte), reliques du coffre cerclées, détail, **trophée**
  `eidos-sceau/1` (`trophee.ts` : sortie + preuve + tête signée, `jugerTrophee`
  contre federation.json, lien à la relique publiée en lecture ; 2 tests).
  `lib/eidos/etat-reseau.ts` remplace `lib/arbre/etat.ts` (2 tests).
- H3 FAIT : **sceaux d'âge**. `noeud.mise_sceau(age)` (émission de l'âge / 10⁶ :
  Kali 2,10 … Satya 33,55) ; `etat.json.reliques[]` porte `mise_attendue` et
  `scellee` (5ᵉ contrôle) ; la planche de `relique.py --sceller` annonce la mise.
  Atelier : `sceaux.ts` (quartiers 0–63 / 64–127 / 128–191 / 192–254, portes
  64 · 128 · 192, `sceauxDuCoffre` = reliques récupérées vers une adresse du
  coffre, `porteDe`), store `monde` / `chargerMonde`, la Tour ferme « Monter »
  devant une porte sans sceau (coffre d'atelier : ouvert, démonstration), la
  page Reliques ne vend plus (simulation en atelier seulement). 3 tests.
  Reste : le trophée exportable (avec la carte, H2).
- H4 FAIT : Guide en trois registres (Vérifier / Lire / Jouer), « Cinq mots »
  (pièce, artefact, relique, sceau, objet) et Limites ; textes FR/EN
  `guide.verifier`, `guide.lire`, `guide.jouer`, `guide.mot.*`. La refonte du
  hub est close ; reste la Tour (`docs/SPEC_TOUR.md`).
- La Tour : `docs/SPEC_TOUR.md` (hôtes = les neuf muses, secrets, élixirs
  de la tria prima, antres, portes par sceaux) — spec, à coder après H2/H3.

### P4 — Vecteurs de test partagés Python ↔ TS — FAIT (septembre 2026)
`vecteurs.json` : 8 familles (paramètres, clé WOTS+, tx, XMSS, carnet, tête
signée, relique, **glyphes** : adresse 27 + 4, condensat 43, bourrage refusé),
écrit par `vecteurs.py --generer`, relu par `vecteurs.py` et par
`vecteurs.test.ts`, `xmss.test.ts`, `merkle.test.ts`, `temoin.test.ts`,
`trophee.test.ts`, `relique-qr.test.ts`. Job CI **`parite`** (tests.yml) :
`python vecteurs.py`, puis `npm ci`, `npm run typecheck`, `npm test`.
Toute évolution d'un format : `vecteurs.py --generer`, puis les deux côtés.

### P5 — État MSS persistant
`k.indice = max(employes)+1` dérivé de la chaîne est sûr pour un seul écrivain
seulement. Avant toute fédération multi-écrivains : fichier `indice-<v>.json`
local, monotone, refus de signer en dessous, et test « fourche : même indice
sur deux branches » qui doit être refusé côté signataire.

### P6 — Hygiène
- `getcontext().prec = 60` global → `with localcontext()` dans `dcos` et
  `build_epoch_table` (ne change pas les tables ; vérifier par `verify_genesis.py`).
- Documenter l'ambiguïté de duplication de la dernière feuille Merkle
  (CVE-2012-2459) et pourquoi elle est bénigne ici (double dépense dans le bloc
  refusée).
- Déplacer `consensus.py` et `store.py` dans `historique/` avec leur test.
- Atelier — FAIT (septembre 2026) : retirés `better-auth`, `@electric-sql/pglite`,
  `kysely`, `jose`, `pg`, `src/lib/auth/`, `src/lib/db.ts`, `src/lib/app-data/`,
  `src/lib/multiplayer/`, `migrations/`, les scripts de migration, d'invariant
  d'auth et de fumée Playwright, `@react-three/drei`, `react-query`,
  `react-table`, `react-hook-form`, `recharts`, `cmdk`, `sonner`, `vaul`,
  `date-fns`, `react-day-picker`, tous les `@radix-ui/*` sauf `react-slot`
  (194 paquets en moins). Reste : **18 dépendances** d'exécution, 17 de dev.
  `@react-three/fiber` + `three` restent : quatre scènes les utilisent.
  `npm run build` ne migre plus rien. Le recensement des imports se refait avec
  un script qui lit les spécificateurs, pas un `grep` du nom du paquet.

## 8. Conventions d'écriture

- Code, commentaires, messages de commit, noms de contrôles : **en français**.
  Les fichiers anciens sont sans accents (`utxo.py`), les récents avec
  (`noeud.py`) ; ne pas « corriger » l'existant, suivre le style du fichier.
- Docstring de module = spec courte : ce que fait le fichier, le format, l'usage
  CLI, puis un AVERTISSEMENT ou une LIMITE assumée. Toujours.
- Chaque refus lève `U.Rejet` avec un message qui dit *quoi* et *au lieu de quoi*
  (`coinbase 12 au lieu de 11`).
- README : tableau des fichiers avec nombre de lignes et de contrôles, à
  maintenir à chaque PR.
- Ne jamais écrire dans `chaine-eidos.dat`, `etat.json`, `mempool.json` depuis
  un poste local : ces fichiers appartiennent aux workflows `chaine` et `robinet`
  (groupe de concurrence `chaine`).

## 9. Prompt de démarrage de session

```
Lis CLAUDE.md, puis lance dans l'ordre verify_genesis.py, utxo.py,
federation.py, robinet.py --test et noeud.py --verifier. Confirme que tout
passe et donne-moi le nombre de blocs revalidés. Ensuite ouvre le chantier
P<N> de la feuille de route : propose d'abord un plan en cinq lignes maximum
avec la liste des fichiers touchés et des contrôles ajoutés, attends mon
accord, puis implémente. Aucune modification de eonis.py ni de genesis.json
sans me le signaler explicitement avant.
```
