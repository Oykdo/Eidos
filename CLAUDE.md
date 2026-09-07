# CLAUDE.md — Eidos

Fichier de contexte pour Claude Code. À déposer à la racine du dépôt `Oykdo/Eidos`.
Il décrit ce qu'est le projet, ce qui ne se touche pas, comment on vérifie, et
dans quel ordre on avance. Lis-le entièrement avant toute modification.

---

## 1. Ce qu'est Eidos

Chaîne prototype à émission bornée sans halving, consensus fédéré, signatures
post-quantiques par hachage pur (aucune courbe elliptique). Unité : l'eidôlon
(EIDL), 1 eidôlon = 10⁸ atomes. Réseau d'essai uniquement, sans valeur.

Trois couches partagent la règle « rien ne se croit, tout se rejoue » : la
**chaîne** (Python, bibliothèque standard), l'**atelier** (TypeScript, rejoue la
spec à l'octet), le **jeu** (la Tour, la Veillée — jauge hors feuille, sauf les
sceaux et les preuves exportées). Un joueur commence par le Guide de l'atelier ;
un développeur par ce fichier, puis `docs/FEUILLE_DE_ROUTE.md`.

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
vecteurs.py         vecteurs partagés Python ↔ TS, écrit/relit vecteurs.json (9 familles)
noeud.py            nœud du testnet : rejeu, forge, robinet, envois, --depuis, reliques, etat.json (5 + 3 + 4 + 4 contrôles)
qr.py               encodeur QR stdlib, octets, niveau H, versions 1–10 (5 contrôles)
relique.py          gardien des reliques : --sceller (QR + planche + reliques.json), --animer (3 contrôles)
reliques.json       reliques déclarées : id, adresse, âge, indice — JAMAIS de graine
robinet.py          file mempool.json alimentée par issues GitHub et courriels, frein par auteur (14 contrôles)
courriel.py         second canal du robinet : boîte IMAP relevée par courriel.yml, même filtre (6 contrôles)
consensus.py        difficulté PoW et travail cumulé — chemin HISTORIQUE
store.py            chaîne PoW sur disque (chaine.dat) — chemin HISTORIQUE
federation.json     racines + graines publiques des 7 validateurs, t0, créneau 3600 s
chaine-eidos.dat    la chaîne du testnet (écrite par la CI, jamais à la main)
etat.json           état publié (soldes, sorties, artefacts, invariant)
mempool.json        demandes robinet / envoi
labo/               laboratoire pendule-9 hors chaîne (aura, avatar, agrégateurs) — figures, pas preuves (37 contrôles)
veillees/           preuves de veillée déposées (index.json + un fichier par preuve), écrites par veillees.yml
atelier/            interface web (TanStack Start, React), rejoue la spec en TS ;
                    scripts/deposer-veillee.ts = le juge des preuves dans la CI (logique dans lib/eidos/depot.ts)
.github/workflows/  tests.yml (3 OS × 2 Python + empreintes), chaine.yml (cron
                    horaire), robinet.yml (issues), veillees.yml (issues « veillée » : le juge
                    TypeScript dépose les preuves dans veillees/), courriel.yml (boîte IMAP, minute 37,
                    seulement si la variable EIDOS_ROBINET_COURRIEL est posée), pages.yml, init.yml
```

Deux consensus coexistent : **fédéré** (`federation.py` + `noeud.py`, le vrai) et
**PoW** (`consensus.py` + `store.py`, jouet d'origine). Ne pas les mélanger ; ne
pas étendre le chemin PoW.

Dans `atelier/src/lib/eidos/` : `eonis.ts`, `lamport.ts`, `merkle.ts`, `carnet.ts`,
`chaine.ts`, `temoin.ts`, `wallet.ts`, `coinselect.ts`, `glyphs.ts`, `portable.ts`,
`envoi.ts`, `wots.ts`, `xmss.ts`, `relique-qr.ts`, `pendule.ts`, `ancrage.ts`, `veillee.ts`, `veillee-tour.ts`, `chaine-reseau.ts`, `fantomes.ts`, `classement.ts`, `arbre-vue.ts`, `feuille-son.ts`, `veillee-bot.ts` — chacun avec son `.test.ts` ;
`vecteurs.test.ts` relit `vecteurs.json`. `lamport.ts` garde Lamport en démonstration mais dérive adresses,
empreintes et témoins via `wots.ts`. `genesis-data.ts` recopie `genesis.json`.
La veillée : `veillee.ts` (arbre, jour, gestes, juge), `veillee-tour.ts` (gestes reliés aux actes, sac),
`chaine-reseau.ts` (en-têtes de `chaine-eidos.dat`), `classement.ts`, `arbre-vue.ts`, `feuille-son.ts`,
`veillee-bot.ts`, `depot.ts`, `fantomes.ts`, `veillee-lexique.ts`. L'accueil : `lib/accueil/orbites.ts`
et `components/accueil/FondOrbital.tsx`. `npm test` énumère ses fichiers dans `package.json` :
un `.test.ts` nouveau s'y ajoute à la main.

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
- **Un indice MSS ne sert qu'une fois** par validateur (`ChaineFederee.indices`),
  et le signataire s'en souvient hors chaîne : `CompteurMSS` (`indice-<v>.json`,
  monotone, écrit avant de rendre la signature) refuse tout recul, donc le même
  indice sur deux branches. Départ = max(chaîne, fichier). Jamais versionné ;
  le nœud CI le fait passer par `actions/cache`, meilleur effort.
- **Vivacité** : créneau `s > créneau(now)+1` refusé ; au plus 6 blocs par exécution.
- **Jamais écrire `chaine-eidos.dat` ni forger depuis un poste local pendant que
  le cron tourne** : le verrou protège la double signature sur une même machine,
  pas entre votre poste et le runner GitHub (deux fichiers d'état distincts).
- **Coinbase exacte** : `reward_at(h) + frais`, ni plus ni moins.
- **Sérialisation canonique** : `Tx.core()` retrouvé à l'octet près après
  désérialisation, sinon `ValueError`.
- **Le corps d'une issue ou d'un courriel n'est jamais interpolé dans une commande.**
  Vaut aussi pour `veillees.yml` : `depot.ts` ne retient du corps qu'un JSON qui se
  parse ou l'adresse d'un des trois hôtes autorisés, téléchargée avec un plafond.
  Il transite par `EIDOS_ISSUE_BODY` et `robinet.py` ne retient que ce qui passe
  le filtre de figures + somme de contrôle (ou base64 sur lignes entières pour
  `envoi`). `courriel.py` passe par le même chemin (`EIDOS_CANAL`, `EIDOS_CANAL_REF`),
  marque tout message lu qu'il soit accepté ou non, saute un message qui lève,
  refuse un message sans expéditeur, ne publie l'expéditeur que sous empreinte
  (`courriel:<16 hex>`), vérifie le certificat IMAP et n'écrit jamais les
  identifiants ailleurs que dans l'environnement du run. `MAX_FILE` borne les
  demandes en attente, jamais la file entière.
- **Aucun état local versionné** hors `chaine-eidos.dat`, `etat.json`,
  `mempool.json` (job `hygiene`). Pas de `chaine.dat`, pas de `portefeuille.json`.
- **Figures ≠ preuves.** L'Arbre, les Signes, les reliques, les artefacts sont
  des lectures ; seuls le carnet, la chaîne et les signatures engagent. Ne jamais
  présenter une figure comme une garantie dans le code, les tests ou les textes.
- **Ce qui compte est ancré, ce qui est libre ne vaut rien.** Un run de la
  jauge est gratuit et intransférable. Un run qui compte (sceau, porte,
  trophée) a pour graine `sha256d("eidos-ascension/1" ‖ id_bloc ‖ txid ‖ rang)` :
  une tête signée et une pièce prouvée, jamais le coffre ni la machine
  (`ancrage.ts`). Pas d'empreinte de navigateur, pas de verrou de machine,
  pas de preuve de travail client : voir `docs/SPEC_SYBIL.md`.
- **Le robinet freine par auteur.** `EIDOS_ISSUE_AUTHOR` : une demande servie
  par compte GitHub et par époque, une seule en attente (`robinet.py`, règle 4).
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
python3 robinet.py --test      # 14
python3 courriel.py --test     # 6
python3 -c "import noeud as N; N._test_artefact()"
python3 -c "import noeud as N; N._test_envois()"      # 5
python3 -c "import noeud as N; N._test_paiements()"   # 3
python3 -c "import noeud as N; N._test_depuis()"      # 4
python3 -c "import noeud as N; N._test_indice()"      # 2
python3 -c "import noeud as N; N._test_reliques()"    # 4
python3 qr.py --test           # 5
python3 relique.py --test      # 3
python3 consensus.py           # 6 (historique)
python3 federation.py          # 18
python3 noeud.py --verifier    # rejeu intégral du testnet, doit finir « aucun refus »
cd atelier && npm ci && npm run typecheck && npm test && npm run build   # 408 suites Eidos
npm run veillee-bot 60         # le bot de la veillée : une lecture du budget de feuilles (~4 s par run)
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
   reprendre au cron. Les blocs forgés à l'étape 3 laissent leurs
   `indice-<v>.json` sur le poste, jamais dans le cache CI : le premier cron
   voit un état MSS **incomplet** (moins de fichiers que de validateurs) et
   amorce ces validateurs depuis la chaîne, avec un avertissement dans le run
   (c'est ce que fait l'étape « Forger » ; un état partiel vaut absence). Ne
   plus jamais forger depuis le poste ensuite.
6. GitHub Pages doit rester activé (Settings → Pages → Source : GitHub
   Actions) : `deploy-pages` ne sait pas l'activer (404 « Ensure GitHub Pages
   has been enabled ») et le site rend 404 tant qu'il ne l'est pas.

Le testnet n'a aucune valeur : le réinitialiser est gratuit. Ne pas bricoler
une migration in-place.

## 7. Feuille de route, par ordre de priorité

Chaque chantier est une PR isolée. Ne pas en ouvrir deux à la fois.
L'historique détaillé (décisions, limites, reliquats de chaque chantier) est dans
`docs/FEUILLE_DE_ROUTE.md` : **le lire avant d'ouvrir un chantier**. Chantiers faits :

- P1 — Fermer la boucle atelier ↔ nœud — FAIT (septembre 2026)
- P2 — WOTS+ à la place de Lamport — FAIT (septembre 2026)
- P3 — Racine UTXO dans l'en-tête — FAIT (septembre 2026)
- Reliques QR — FAIT (septembre 2026), voir docs/HANDOVER_RELIQUES_QR.md
- Coffre 3D — un seul coffre, palettes isochromatiques, ornements par butin (FAIT 2026-09)
- Rendu de l'atelier — socle et quatre scènes (FAIT 2026-09-04)
- Refonte du hub — FAIT
- La Tour — hôtes, secrets, élixirs, capsules, bestiaire (FAIT 2026-09, fourni par une session parallèle, fusionné le 2026-09-04)
- Accueil, écosystème et robinet à deux canaux — FAIT (2026-09-06)
- La Veillée — roguelike XMSS, PR 1 à 3 FAITES (2026-09-07 : jauge, gestes reliés à la Tour, sac et extraction, en-têtes de chaîne côté atelier, page Veillée, arbre à l'écran, son, classement et fantômes, bot de mesure), voir docs/BIBLE_VEILLEE.md ; dépôt des preuves par issue (`veillees.yml`, `depot.ts`) ; Guide étoffé (cœur, mécaniques, lore)
- Fond orbital de l'accueil — FAIT (2026-09-07) : `lib/accueil/orbites.ts` (11 contrôles), `components/accueil/FondOrbital.tsx` + `fond-orbital.ts` (4), la loi d'émission en limaçon, neuf astres-muses dansants, phase de l'époque lue dans la tête suivie, parallaxe et clic vers la page de la muse ; aucune trace du pointeur
- Labo pendule-9 — aura, avatar voxelisé, 8 agrégateurs, pont `exporter-run.ts` → `labo/unification.py`, workflow `labo.yml`, aura de la veillée = lecture des 64 feuilles — PR 1–3 FAITES (2026-09-07), LIST des zones non branchées dans docs/FEUILLE_DE_ROUTE.md
- P4 — Vecteurs de test partagés Python ↔ TS — FAIT (septembre 2026)
- P5 — État MSS persistant — FAIT (septembre 2026)

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
- Ne jamais écrire dans `chaine-eidos.dat`, `etat.json`, `mempool.json` ni
  `veillees/` depuis un poste local : ces fichiers appartiennent aux workflows
  `chaine`, `robinet` et `veillees` (un seul groupe de concurrence, `chaine`).
- Textes de l'interface (`i18n.ts`) : FR et EN ont les mêmes clés, aucune valeur
  vide, et les mots « époque », « epoch », « aeon » y sont bannis (`i18n.test.ts`) :
  on dit « cycle » pour les 1008 blocs. Chaque phrase du Guide et des hôtes cite
  une règle vraie du code ; quand un texte promet plus que le code, c'est le texte
  qui a tort.
- Un chantier = une branche + une PR (`gh pr create`), fusionnée en rebase quand
  la CI est verte ; jamais de commit direct sur `main` sauf correctif urgent de la
  CI. Le cron `chaine` et le robinet committent aussi sur `main` : `git fetch` puis
  rebase avant de pousser.
- Un lot livré par un agent est relu par un relecteur adversarial (gardien Eidos,
  correction, intégration) qui corrige dans les fichiers du lot ; l'intégration
  (page, store, i18n, package.json, docs) reste à la main.

## 9. Prompt de démarrage de session

```
Lis CLAUDE.md, puis lance dans l'ordre verify_genesis.py, utxo.py,
federation.py, robinet.py --test, noeud.py --verifier, et dans atelier/
npm run typecheck && npm test. Confirme que tout passe et donne-moi le nombre
de blocs revalidés et de suites vertes. Ensuite ouvre le prochain chantier de
docs/FEUILLE_DE_ROUTE.md (section « Reste ») sur une branche : propose d'abord
un plan en cinq lignes maximum avec la liste des fichiers touchés et des
contrôles ajoutés, attends mon accord, puis implémente, ouvre la PR et
fusionne-la quand la CI est verte. Aucune modification de eonis.py ni de
genesis.json sans me le signaler explicitement avant.
```
