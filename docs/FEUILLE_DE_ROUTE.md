# Feuille de route — historique des chantiers et décisions

**Dépôt :** Oykdo/Eidos. Extrait de `CLAUDE.md` §7 le 2026-09-07 pour alléger le contexte de session ;
à lire **avant d'ouvrir un chantier**. Chaque section garde ses décisions, limites et reliquats.


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
- Reste hors P1 : brancher l'export d'un envoi dans l'interface (page Coffre) —
  l'import des pièces du réseau est branché depuis le 2026-09-06 (section Robinet) ;
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

### Rendu de l'atelier — socle et quatre scènes (FAIT 2026-09-04)
Plan « Lumière et matière » (trois juges sur trois, greffes « Grain et
profondeur » et « Cohérence »), implémenté scène par scène avec relecture
adversariale (GLSL ES 1.00 / three, gardien Eidos, perf mobile) avant commit.
- Socle `components/canvas/` : `atelier.ts` (contrat de lumière : résidu
  ambiant 0,2, hémisphère encre/creux, clé inchangée, contre-lumière teintée
  par la scène, `ENV_INTENSITE`, `brouillard()` vers #12151a, **clé
  `toneMapping: 7` (Neutral) posée en dernier**, three importé en type
  seulement : les hôtes ne chargent pas three), `matiere.ts` (matières par
  palier, par âge, pierre, ferrure ; métal ≤ 0,60 ; `environnementDisponible`
  + repli « peinture » ; `couleurSRGB`, `disposerInstance`), `texel.ts` (Bayer
  4×4 par cellule entière, exact sur tout plan axial, occlusion de voisinage,
  cellules encloses ; test avec vecteur gelé Satya 168/216), `Lumieres.tsx`,
  `Environnement.tsx` (sphère de sommets préfiltrée une fois par PMREM 64 px,
  rebake par teinte d'âge/palier/biome seulement), `Halo.tsx` (dôme à couleurs
  de sommets, bords #12151a exacts sur les deux axes).
- Inventaire : couleur de la jauge en sRGB, cubes jointifs, trame + occlusion,
  encloses retirées, émissif supprimé, environnement par âge, halo, brouillard.
- Tour : dalle pierre satinée, clartés en sRGB, trois tons de faces par
  voisinage, ombre de contact, occupants en matière de classe derrière le
  repli, rendu à la demande. Coffre : `cellules.ts` (coque hors de la scène,
  ferrures dédoublonnées, trame et contact, testés), matière par palier, cage
  en ferrures ; `SPEC_AUDIT_COFFRES.md` v2.1. Relique : `glsl.test.ts` (filet
  statique ES 1.00, parité des uniforms), lumières et matière depuis le
  contrat, `envi()` analytique, `shade()` réécrit, sortie par
  `toneMapping()` + OETF de three, aura de fond exacte aux bords, Bayer 4×4 ;
  **SDF, danse et uniforms de forme intacts** (tests gelés).
- Règles : aucune dépendance, aucune texture ; jamais `#include` ni
  `dithering()` dans le shader ; pas de smoothstep à bornes inversées ; le
  navigateur est le seul compilateur GLSL : contrôle visuel sur `/`, `/tour`,
  `/reliques` avec la console ouverte à chaque retouche. Reste hors lot :
  tas du coffre partiellement enfoui dans le couvercle (décision de spec).

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
- La Tour : `docs/SPEC_TOUR.md` — FAIT, voir ci-dessous.
- Le pendule-9 : `docs/SPEC_PENDULE.md` — décisions fondatrices O1–O5 à
  valider (le pendule choisit le **parcours** et la case de spawn, jamais le
  contenu d'un étage, qui reste public et fixe), esquisse de la transition en
  pseudo-code. **Phase 0 FAITE** : `atelier/src/lib/eidos/pendule.ts`
  (transition, `etageDe` étalé sur la bande, spawn, genre du don),
  `pendule-phase0.ts` (bot xorshift, trois mesures, `npm run phase0 [runs]`),
  `pendule.test.ts` (6 tests, table de vérité gelée). Toute retouche de la
  transition régénère la table sciemment. **Branché dans la Tour** (§4bis de la
  spec) : exploration libre, décision en fin de salle **prise par le joueur**
  parmi les trois choix, l'acte du coffre n'étant que la proposition ; l'étage
  de chaque choix est annoncé (`destinationsDeSalle`), la case jamais
  (`ascension.ts`, 8 tests ; composant `Pendule` ; jauge `tour.ascension`) ;
  libre = lecture, ancrée sur bloc + pièce = ce qui compte, exportée au sommet ;
  une porte fermée arrête ; le don d'un hôte dépend de la case d'arrivée.

### La Tour — hôtes, secrets, élixirs, capsules, bestiaire (FAIT 2026-09, fourni par une session parallèle, fusionné le 2026-09-04)
Spec : `docs/SPEC_TOUR.md` (§11 décisions, §12 écarts mesurés). Tout dans
`atelier/src/lib/eidos/`, jauge `coffre.tour` hors feuille, aucune loi
d'`integrite.ts` touchée, `INTEGRITE` sans constante nouvelle.
- `jauge.ts` : `Tour`, `tourVide`, `normaliserTour` (relecture tolérante) ;
  `carnet.ts` exporte la jauge sous `tour`, à côté du feuillet, hors empreinte.
- `lecture.ts` : l'orbite au grain des figures (`figureOrbite` = première
  figure de `glypheLecture`), `paradeLue` (g x ḡ tient l'axe, seuil élite),
  `motDeQ` (mot d'une coupe). `memeOrbite` exact ne se produit jamais entre un
  mot et une coupe ; `ḡ(A)·(A·B)` rend toujours B : la Tour lit l'axe.
- `hotes.ts` + `hotes-lexique.ts` : présence 1/7 + 0, 254, portes, muse au
  médian de sa bande (Thalie 0, Uranie 254) ; 27 répliques × 9 muses, FR/EN,
  chaque phrase cite une règle vraie ; 9 × 12 noms de capture ; demandes lues
  dans le coffre ; dons `eidos-don/1` (elixir, gemme, lair ; jamais arme ni
  philosophale) ; Érato forge, Polymnie révèle, Uranie lit.
- `elixirs.ts` : espèce = étage dominant du glyphe ; bu à un étage, effet là
  seulement, mot noté dans `bus`, jamais rebu ; le soufre s'éteint après un tour.
- `secrets.ts` : alcôve = croix centrale de la dalle (13 étages ; la symétrie
  diagonale de la v1 vaut 2⁻³⁶) ; échos = même orbite exacte des coupes (44
  paires), montée dans l'ordre → mercure ; antre : gardien cherché depuis sa
  graine jusqu'à tenir l'axe (élite ; suprême aux portes), duel en trois temps
  (orbite / axe ou mercure / résonance d'ensemble avec la capture libérée),
  repoussé d'un étage, ticket consommé au passage ; observatoire = lecture.
- `capsules.ts` : capsule « ··· » (Thalie une par jour civil contre trois
  blocs, alcôve, forge gemme + sel) ; prise nette / fragile (sel) / brisée ;
  capture = `motDeQ(q)` de l'occupant, l'étage le perd pour ce coffre.
- `bestiaire.ts` : cellule = forme la plus proche des 101 ; 21 cellules →
  lecture d'Uranie ; accord par le mercure (conjugué par l'objet porté, ancien
  mot dans `bus`) ; offrande à Terpsichore → gemme.
- `sceaux.ts` : l'âge exact ouvre, le coffre d'atelier passe (démonstration).
- `fouilles.ts` (2026-09-04) : la dalle se creuse case par case ; trouvailles à
  des cases fixes et publiques (case pleine et `sha256d("eidos-fouille/1" ‖
  étage ‖ x ‖ y)[0] < 32` : 1 326 sur 10 379, aucun étage sans), trois coups de
  bêche par étage et par coffre (`tour.fouilles`, relecture plafonnée), la case
  d'arrivée du pendule donne toujours (même sur un trou) ; contenu (« trouve »,
  pierre une fois sur quatre) dérivé de (étage, case, coffre) : les cases sont
  à tous, le contenu à chacun. Occupants posés sur la dalle (`caseOccupant`,
  même règle que la scène). 6 contrôles. Cap proposé : `docs/CAP_METROIDVANIA.md`.
- Fiche d'objet (2026-09-04) : `fiche.ts` (lecture pure d'un mot : forme du
  catalogue la plus proche, cellule, proximité = rareté continue, palier, orbite,
  ascendant force/faiblesse, axe à l'ancre, sceau, résonance avec le coffre ;
  `texteFiche` en quatre registres FR/EN), `objets-lexique.ts` (21 caractères,
  4 orbites, 5 raretés, 4 âges, 10 genres, 6 affixes, 3 polarités, 9 tempéraments,
  chaque phrase cite une règle vraie), `FicheObjet.tsx` dans l'Inventaire ;
  6 contrôles. `titres.ts` (2026-09-04) : épithète = 21 figures de régime
  (avec genre) × 12 adjectifs d'orbite accordés, suffixe = 5 tournures de
  rareté × 9 muses, nom de base par genre ; trois tirages depuis
  `sha256d("eidos-titre/1" ‖ mot canon)` : même mot, même titre partout ;
  4 contrôles. **Limite découverte** : `objets.paqueter` omet la plus grande
  composante et perd son signe, `depaqueter` rend l'inverse de la rotation une
  fois sur deux ; 53 formes du catalogue sur 100 ne se relisent pas par
  `motDeQ` → `qDeMot` (nombre gelé dans `fiche.test.ts`). Correction = décision
  d'auteur (convention « composante omise ≥ 0 », touche `canoniserMot` donc les
  feuilles) : ne pas corriger à la volée.
- Transposition du dossier Eidolon (2026-09-04, `docs/TRANSPOSITION_EIDOLON.md`,
  `docs/LORE_CHAMBRE.md`) : refondre est refusé, transposer est fait pour les
  œufs — `oeufs.ts` + `oeufs-data.ts` (64 œufs = 64 empilements, œuf i =
  glyphe de code i, cycle i >> 3 = bande de la Tour de Thalie à Polymnie,
  L'Inconnu = Uranie ; noms d'ère traduits, huit récits FR/EN ; aucune
  puissance), page Glyphes (œuf de l'empilement choisi), 4 contrôles. Les
  dix catégories alchimiques et l'avatar : décisions T1–T4 dans la spec.
- Forum du royaume : `docs/SPEC_FORUM.md` (spec proposée, 2026-09-04) —
  objets ancrés = pièces colorées nées de chaque témoin d'une dépense réelle
  (`tirerObjet(sig, hash_bloc)`), portées rang à rang ; échange = une
  transaction à deux témoins (offre partielle `flag = 0`, acceptation sur le
  même `txid`) ; identité Eidolon, négociation Cipher, dépôt par issue ;
  échelle CardSwap (intégrité, possession, identité ; « certifié » n'existe
  pas) ; décisions F1–F7, dont corriger le signe de `paqueter` avant tout port.
- Brume des antres : `docs/SPEC_BROUILLARD.md` (spec proposée, 2026-09-04) —
  Earnshaw comme loi de la brume (neuf cases centrales jamais éclairées depuis
  le bord), coïncidence de deux faisceaux de couleurs différentes comme seule
  clé, fuite de relief au soufre, gardien à la case de laplacien maximal ;
  décisions B1–B5 à prendre avant tout chantier.
- UI : `TourView` (hôte et répliques, objet porté, occupants et prise, élixirs,
  antre, fouiller, carte 255 cases sans secrets non découverts, observatoire),
  `Bestiaire` dans la page Coffre ; `GENRES` gagne elixir, capsule, capture.
- Contrôles : lecture 3, hôtes 5, élixirs 4, secrets 4, capsules 5, bestiaire 3,
  sceaux +1. `npm test` : 254 (30 tests de scripts + 224 suites Eidos).

### Accueil, écosystème et robinet à deux canaux — FAIT (2026-09-06)
- `atelier/src/lib/navigation.ts` : la liste unique des pages (trois registres +
  Guide, label et lede) ; `Nav.tsx` et `Ecosysteme.tsx` la lisent. Ajouter une
  page = une entrée, une route, deux textes FR/EN ; `navigation.test.ts`
  vérifie les trois (3 contrôles).
- Accueil (`routes/index.tsx`) en quatre blocs : coffre (solde, scène, Créer /
  Ouvrir un carnet pour un coffre d'atelier), Robinet, Écosystème, contenu.
- `Robinet.tsx` : coffre d'atelier = versement local (« Ici · +1 », sans valeur) ;
  coffre personnel = adresse en glyphes, demande par issue GitHub préremplie ou
  par courriel prérempli quand `etat.json.robinet_canaux.courriel` est publié,
  statut de la demande lu dans `mempool.json` (`etat-reseau.parserMempool`,
  `statutDemande`, +3 contrôles), « Charger mes pièces du réseau »
  (`store.chargerReseau` → `wallet.chargerTestnet`, jamais si le réseau ne
  connaît aucune pièce du coffre). `robinet.courrielDemande` (+2 contrôles).
  `envoi.ETAT_URL` lit désormais le dépôt brut, comme `etat-reseau.ts` : le
  build Pages ne contient pas `etat.json`.
- Nœud : `courriel.py` (IMAP + email en bibliothèque standard, `--relever`,
  `--test`), `robinet.py` note `canal` et `ref` (`EIDOS_CANAL`,
  `EIDOS_CANAL_REF`, une référence jamais inscrite deux fois), `noeud.ecrire_etat`
  publie `robinet_canaux` (issue, courriel depuis `EIDOS_ROBINET_COURRIEL`).
  `courriel.yml` : cron à la minute 37, seulement si la variable de dépôt
  `EIDOS_ROBINET_COURRIEL` est posée ; secrets `EIDOS_IMAP_HOTE`,
  `EIDOS_IMAP_UTILISATEUR`, `EIDOS_IMAP_MOT_DE_PASSE`. Relecture (2026-09-06, quatre
  lentilles, sceptiques non joués faute de quota, constats vérifiés à la main) :
  expéditeur sous empreinte, refus sans expéditeur, TLS vérifié + délai + UID,
  octet nul retiré, message fautif sauté, marqueurs inversés = `ValueError`,
  `MAX_FILE` sur les demandes en attente, `ecrire_file` UTF-8 atomique,
  `lireRobinet`/`chargerReseau` ignorent une lecture d'un coffre changé,
  flash quand des pièces locales sont retirées. Décision D1 (2026-09-06) :
  un autre canal que GitHub ; le courriel est le seul qui ne coûte ni serveur
  ni compte nouveau au joueur, et son frein par expéditeur est assumé plus
  faible (`docs/SPEC_SYBIL.md` §3bis). Sans boîte déclarée, rien ne change.
- Racine `index.html` : n'est plus un portefeuille ; explique que Pages doit
  publier le workflow (Source : GitHub Actions) et redirige vers le dépôt.

### La Veillée — roguelike XMSS, PR 1 FAITE (2026-09-07), voir docs/BIBLE_VEILLEE.md
Prompt révisé `docs/PROMPT_ROGUELIKE_XMSS.md` (l'IP fixe ce qui est déjà écrit dans le
dépôt et la réserve Eidolon, sept décisions C1–C7 tranchées dans la bible).
- `veillee.ts` : **la clé comme vie** — arbre XMSS de hauteur 6 (64 feuilles WOTS+,
  port de `federation.CleValidateur`, parité à l'octet sur le vecteur `xmss`, vérifié
  par `xmss.verifierMss` inchangé) ; un geste (franchir, parler, ouvrir, prendre) =
  une feuille, message chaîné `sha256d("eidos-veillee/1/geste" ‖ racine ‖ i ‖ étape ‖
  étage ‖ geste ‖ arg ‖ mot ‖ précédent)`, étape et étage lus dans le pendule, jamais
  déclarés ; 26 franchir = sommet, 64 gestes = épuisé, porte / abandon ; export
  `eidos-veillee/1` jugé sans rejeu (deux têtes XMSS, pièce Merkle, chaque feuille,
  parcours recalculé, fin cohérente) ; score = salles × 64 + butin (lecture).
  **Le jour** : premier bloc du jour civil UTC, prouvé par la tête de la veille
  (`estPremierDuJour`) ; graine du parcours `sha256d("eidos-veillee/1" ‖ id_bloc)`
  la même pour tous, graine de l'arbre `…/arbre ‖ maître ‖ id_bloc ‖ txid ‖ rang`
  au coffre. 7 contrôles.
- `fantomes.ts` : nom de salle = nom d'ère de l'œuf des trois figures imaginaires de
  la coupe (C1) ; fantômes = six tournures des œufs légendaires de la réserve (écho,
  revenue, dernière, ombre, qui s'efface, murmure) sur la dernière salle (C2). 3 contrôles.
- `vecteurs.py` : famille `veillee` (trois têtes signées à cheval sur minuit).
- **PR 2, morceaux 1 et 2 FAITS (2026-09-07)** : `tour.veillee` dans la jauge
  (`types.ts`, `jauge.ts` : relecture par `parserVeillee`, `indiceReserve` jamais
  sous les gestes) ; `veillee-tour.ts` relie les gestes aux actes existants —
  parler = `honorerDansCoffre`, creuser = `fouillerCaseDansCoffre`, ouvrir l'alcôve,
  prendre = `prendreDansCoffre` (une prise qui échappe ou se brise a eu lieu et coûte
  sa feuille), franchir = `finDeSalleDansCoffre` — **l'acte d'abord, la feuille
  ensuite, seulement si l'acte a eu lieu** ; une porte fermée arrête en `porte` sans
  feuille ; la 26ᵉ feuille de franchir clôt l'ascension ; l'ascension est commencée
  avec la graine du jour (`commencerDansCoffre(c, ancre, graine)`) et le parcours
  recalculé de la preuve doit égaler l'étage de la jauge. Réserve d'indice : noté
  dans la jauge avant la signature (`indiceReserve = i + 1`) et dans un registre de
  session par racine (`reserverEnSession`, à remplacer par localStorage dans le
  store) ; une jauge relue d'avant un geste est refusée (`reserve`). L'arbre se
  reconstruit depuis le maître, jamais stocké ; le coffre d'atelier joue et
  n'exporte pas. 6 contrôles.
- **PR 2, morceaux 3 et 4 FAITS (2026-09-07)** : `chaine-reseau.ts` lit les en-têtes
  de `chaine-eidos.dat` (FORMAT 3, corps sautés par la longueur, `txid = sha256d(core)`
  pour la racine de Merkle), vérifie chaque tête XMSS et le chaînage, rend le premier
  bloc du jour et la tête de la veille (`premierDuJour`, `tetesDeLaVeillee`) ; testé
  sur la chaîne réelle du dépôt et sur les vecteurs, 4 contrôles. **L'ancre** : la
  pièce est prouvée contre une tête **du même jour**, au plus tôt le bloc du jour
  (`teteAncre`, en pratique la tête suivie, car `etat.json` ne publie que le carnet
  courant) ; le juge vérifie cette troisième tête ; famille `veillee` : sorties au
  second bloc, +1 contrôle. Page **Veillée** (registre Jouer, `routes/veillee.tsx`,
  `components/veillee/VeilleeView.tsx`) : lire la chaîne, suivre le réseau, le bloc du
  jour et la veille, ouvrir sur une pièce du coffre, compteur de feuilles, salle et
  nom d'ère, réplique de la muse (`veillee-lexique.ts`, une par muse, les trois groupes
  de neuf de `hotes-lexique.ts` intacts, 1 contrôle), gestes (parler, creuser la case
  d'arrivée, ouvrir l'alcôve, prendre, franchir vers les trois destinations,
  s'effacer), fin, verdict jugé sans rejeu, fantôme, preuve exportée. Store : réserve
  d'indice dans localStorage (`eidos-veillee-reserve-v1`) écrite avant la signature,
  repli session ; chaîne et fédération lues jamais persistées. `npm test` : 350.
- Reste : PR 3 (arbre à l'écran, son et haptique, classement statique, fantômes dans
  la salle ; bot xorshift sur mille veillées avant), PR 4 (gardiens C3, Guide
  « Jouer »), PR 5 [OUVERT] Godot/Rust. Limite connue : le coffre d'atelier ne peut
  ouvrir une veillée que s'il a une pièce sur le réseau ; une veillée libre (sans
  ancre, jauge seulement) reste à décider.

### P4 — Vecteurs de test partagés Python ↔ TS — FAIT (septembre 2026)
`vecteurs.json` : 9 familles (paramètres, clé WOTS+, tx, XMSS, carnet, tête
signée, **veillée** : trois têtes à cheval sur minuit UTC, relique, **glyphes** : adresse 27 + 4, condensat 43, bourrage refusé),
écrit par `vecteurs.py --generer`, relu par `vecteurs.py` et par
`vecteurs.test.ts`, `xmss.test.ts`, `merkle.test.ts`, `temoin.test.ts`,
`trophee.test.ts`, `relique-qr.test.ts`. Job CI **`parite`** (tests.yml) :
`python vecteurs.py`, puis `npm ci`, `npm run typecheck`, `npm test`.
Toute évolution d'un format : `vecteurs.py --generer`, puis les deux côtés.

### P5 — État MSS persistant — FAIT (septembre 2026)
`federation.CompteurMSS` (`indice-<v>.json`, spec `eidos-indice/1`, `prochain`
monotone) : `reserver(i)` prend un **verrou exclusif** non bloquant sur
`indice-<v>.json.lock` (fcntl / msvcrt, rendu à la mort du processus), **relit
le fichier sous le verrou** (le disque fait foi : deux objets ou deux processus
ne signent jamais le même indice), refuse i < prochain, écrit tmp + fsync +
`os.replace` + fsync du répertoire, AVANT la signature. Fichier strictement
validé (objet, spec, validateur, racine, entier borné, jamais un booléen) ;
`attacher` refuse prochain > 2^h. `noeud.indice_de_depart` = max(chaîne,
fichier) mais **refuse de repartir de la chaîne sans fichier** quand elle
connaît déjà des indices (vecteur de réemploi) sauf `--forger --amorcer-indice`
explicite ; clé épuisée = créneau sauté, pas boucle gelée. Relecture
adversariale (3 lentilles, 2 sceptiques par constat) : tous les constats
confirmés sont traités.
Contrôles : `federation.py` +2 (monotone / recul / fichier d'autrui ; fourche
même indice sur deux branches refusée côté signataire), `noeud._test_indice` 2
(fichier perdu → la chaîne fait foi ; blocs perdus → le fichier fait foi).
`chaine.yml` : forge seulement sur `main` ; cache `indice-<sha(federation.json)>-<run>-<tentative>`
avec restauration par préfixe de génération (une réinitialisation §6 change
`federation.json`, donc l'ancien état ne revient jamais) ; sans état, ou
avec moins de fichiers que de validateurs (2026-09-06 : les blocs 0 et 1 de
testnet-3 forgés sur le poste ont laissé le validateur 3 sans fichier, et le
cron a refusé chaque créneau pendant deux jours), amorçage explicite tracé par
un avertissement du run. Meilleur effort : perdu, le nœud CI repart de la
chaîne en le disant. Pour une fédération réelle, chaque
validateur garde son fichier chez lui, le sauvegarde, et ne l'amorce jamais
à l'aveugle.

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
  Tests des scripts du gabarit « app-builder » retirés (ils exigeaient
  `AGENTS.md`, `.grok/skills/og/SKILL.md` et le drapeau `VITE_AUTH_ENABLED`,
  absents du dépôt) ; `npm test` liste ses fichiers explicitement (le motif glob
  n'était pas développé sous Windows, la CI n'avait pas de job Node).
  `with-app-env` accepte `CLE=VALEUR` en tête et un shell sous Windows.
  `npm run build` ne migre plus rien. Le recensement des imports se refait avec
  un script qui lit les spécificateurs, pas un `grep` du nom du paquet.
