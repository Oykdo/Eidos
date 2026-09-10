# La Moisson — un gain toutes les 12 heures, pris sur ce que le trésor garde

**Dépôt :** Oykdo/Eidos. **Statut :** étude chiffrée et conception, aucun code (2026-09-10).
**Périmètre :** faire sortir des eidôla du trésor vers les joueurs à cadence fixe, sans créer un atome. Ne conçoit pas les puits (`docs/SPEC_PUITS.md`, autre agent) ; dit seulement quel débit de puits ce gain exige. Mesures rejouées sur la chaîne réelle à la hauteur 45 (`etat.json`, `mempool.json`, `chaine-eidos.dat` = 126 493 octets).

---

## 1. Mesure — le trésor garde tout

| Grandeur | Valeur (h = 45) |
|---|---|
| Émission cumulée | **944,265 825 16 EIDL** |
| `en_circulation_atomes` publié | 944,265 825 16 — **égal à l'émission, par construction** |
| Détenu par les 46 adresses du trésor | **943,265 825 16 (99,894 1 %)** |
| Détenu par un joueur | **1,000 000 00** (une sortie, compte `Oykdo`, artefact `uranie`) |
| Budget robinet de l'époque servi | 1 / 5 040 EIDL = **0,019 8 %** ; **un seul compte** depuis la genèse |
| Récompense au bloc 45 | 21,249 150 83 EIDL (creux du cosinus ; moyenne d'époque : 40) |
| Créneaux pourvus | 46 / 100 — une panne contiguë (créneaux 8→61, 54 h), **38/38 depuis** |

**Le mot « circulation » d'`etat.json` ne mesure rien.** L'invariant impose `Σ utxo == emission_cumulee` : `en_circulation_atomes` vaut toujours l'émission, trésor compris. La grandeur qui manque est **le hors-trésor**, soit 1,00 EIDL. Toute la suite se lit sur celle-là.

**Projection à robinet inchangé** (1 EIDL par compte et par époque de 42 jours, un compte connu) : h = 1 045 (42 j) → 41 094 EIDL dormants sur 41 095 émis ; h = 10 045 (417 j) → 402 517 sur 402 518 ; h = 100 045 (11,4 ans) → la quasi-totalité de 3 998 873.

Même saturé, le robinet ne renverse pas cela : `MAX_PAIEMENTS = 3` par bloc et les paiements ne sont construits qu'au **dernier bloc de chaque exécution** du cron, soit 3/heure → 3 024 EIDL par époque, **60 % seulement de son propre budget** `a·T/8 = 5 040`. Les 7/8 dorment, et le huitième restant n'est atteignable qu'aux trois cinquièmes.

*(Correction d'un fait de la commande : le nœud inclut au plus **3** paiements robinet par bloc — `MAX_PAIEMENTS`. Le 8 est `MAX_ENVOIS`, plafond des transactions signées.)*

## 2. Mesure — le débit soutenable

Un créneau = 3 600 s, donc **12 h = 12 blocs**. `1008 / 12 = 84` exactement, et chaque âge compte un nombre entier d'époques : une fenêtre de 12 blocs ne chevauche jamais deux âges. Émission réelle d'une fenêtre de 12 blocs à Satya : **min 240,20 / moyenne 480,00 / max 719,80**. Indexer le gain sur le maximum instantané le ferait dépendre de la phase du cosinus ; on prend la moyenne, exacte à l'atome sur l'époque :

    plafond de la fenêtre = 12·a/8 = 3a/2 eidôla     et     84 × 3a/2 = 126a = a·T/8

| Âge | a | plafond / 12 blocs | par bloc | × 84 sillons | durée de l'âge |
|---|---|---|---|---|---|
| Satya | 40 | **60 EIDL** | 5,00 | 5 040 = a·T/8 | 95,7 ans |
| Trétâ | 30 | **45** | 3,75 | 3 780 | 71,8 ans |
| Dvâpara | 20 | **30** | 2,50 | 2 520 | 47,8 ans |
| Kali | 10 | **15** | 1,25 | 1 260 | 23,9 ans |

`3a/2` est entier pour les quatre âges : aucun atome à répartir au bord. Sur les fenêtres déjà forgées (blocs 0–47, creux du cosinus), 60 EIDL valent 23,7 % à 24,8 % de ce que la fenêtre émet — le trésor engrange encore les trois quarts. Les trois autres âges sont hors d'atteinte de ce réseau d'essai (Satya dure 95,7 ans) ; la table existe pour que la formule ne dépende d'aucune constante d'âge.

## 3. Mesure — la capacité en joueurs

Joueurs soutenus par fenêtre, `⌊3a/2 / X⌋`, borné par `MAX_GLANEURS = 128` sorties dans la transaction groupée (§8) :

| Âge | X = 0,25 | X = 0,5 | X = 1 | X = 2 |
|---|---|---|---|---|
| Satya | 128 (budget : 240) | 120 | **60** | 30 |
| Trétâ | 128 (budget : 180) | 90 | 45 | 22 |
| Dvâpara | 120 | 60 | 30 | 15 |
| Kali | 60 | 30 | 15 | 7 |

**Concurrence avec le robinet.** Pas sur le budget (comptes séparés) ni sur les sorties du trésor (12 coinbases neuves par fenêtre, 240 à 720 EIDL, contre 36 + 60 demandés au pire = 40 % de la fenêtre la plus maigre). Elle porte sur le groupe de concurrence `chaine` et sur l'amorçage : le robinet sert au plus 3 comptes neufs par heure, 36 par fenêtre — **43 h de robinet saturé pour amener 128 glaneurs**. Au-delà de 128 demandes par fenêtre, c'est la Moisson qui se rationne, jamais le robinet. Les deux saturés : 3 024 + 5 040 = 8 064 sur 40 320 émis = **20 % de l'émission, le trésor garde encore 80 %.** Aucune combinaison des plafonds actuels ne le vide.

## 4. Le nom

**La Moisson.** Le trésor est le grenier des quatre âges, l'émission est le champ ; toutes les 12 heures on coupe ce qui a poussé. « Robinet » est une bouche qu'on ouvre une fois et qui donne ; « Moisson » est périodique et bornée par ce que le champ a produit — une redistribution, jamais une frappe. La fenêtre de 12 blocs est un **sillon** (84 par époque, comme les 84 ans d'Uranus, muse déjà présente dans `CODES_ARTEFACT`), la part est une **gerbe**, le joueur qui la réclame un **glaneur** : celui qui prend une part bornée de ce qui existe déjà. Écarté : « la Rosée », recueillie deux fois le jour, mais on la boit, on ne la sème pas.

## 5. Le déclencheur : claim, jamais versement automatique

1. **Une adresse ne se dépense qu'une fois.** `Carnet.valider_bloc` note l'adresse dans `cles_usees` et refuse tout second usage, y compris entre deux entrées d'une même transaction : deux versements à la même adresse rendent le second **définitivement indépensable**. Un gain récurrent exige donc une adresse fraîche à chaque sillon, c'est-à-dire un message du joueur. Le claim n'est pas un choix, c'est une conséquence.
2. **Le nœud n'a pas de registre** : une liste d'inscrits serait un état local versionné de plus, interdit hors les trois fichiers connus.
3. **Le coût.** À 128 inscrits dont 10 % actifs, l'automatique gaspille 90 % du budget et 90 % des octets. Le claim ne paie que qui se présente — patron déjà arbitré du coffre horaire, « une pièce, un claim, par bloc ».

**Relève par cron, pas par issue.** Un déclencheur `issues: [opened]` coûterait 256 exécutions par jour dans le groupe `chaine` (~45 s chacune, 13 % d'occupation, en rafales) et ferait la course avec la forge de la minute 7. On relève donc comme le courriel : **`moisson.yml`, minute 27**, une exécution et un commit par heure, tous les claims de l'heure inscrits ensemble — ce qui supprime aussi la course entre deux issues.

## 6. Le frein, et ce que coûte une armée

« Un compte par époque » (42 jours) est trop lâche pour un gain bihoraire. Trois verrous, tous vérifiables par le carnet ou par la file :

1. **Un glaneur par sillon.** `sillon_de(h) = h // 12` remplace `epoque_de` dans le frein par auteur de `robinet.py` : une gerbe servie par compte et par sillon, une seule en attente. Auteur = `EIDOS_ISSUE_AUTHOR`, ou `courriel:<16 hex>`.
2. **Adresse fraîche** : aucune sortie non dépensée à la destination (`adresse_a_une_sortie` côté file, `verse_deja` côté nœud) — sans quoi la gerbe est morte à la naissance (verrou 1 du §5).
3. **La semence dépensée** : le compte doit avoir déjà été servi (robinet, moisson ou relique) **et** sa dernière adresse servie doit être vide. On ne glane pas ce qu'on n'a pas semé ; la première pièce vient du robinet, jamais de la Moisson. Ce verrou porte la dégressivité (§9) et garde vraie la phrase de `SPEC_SYBIL.md` : « le robinet, seul point d'entrée gratuit ».

**Coût d'une attaque Sybil.** Le partage est au prorata (§7) : *k* comptes face à *N* honnêtes captent `k/(N+k)`. Pour 10 % du débit — N = 10 : 2 comptes ; N = 20 : 3 ; N = 60 : 7 ; N = 100 : 12. Pour 50 %, il faut *N* comptes. Sept comptes GitHub pour 10 % de 60 EIDL, soit **6 EIDL par 12 h sur un réseau sans valeur** : bon marché, et accepté. La propriété qui compte n'est pas le coût mais que **le plafond `3a/2` ne bouge pas** : une armée ne fait pas enfler la masse, elle dilue les honnêtes, et la dilution est publiée (`etat.json.moisson_glaneurs`). Chaque compte doit en outre produire 2 issues et 1 transaction signée par jour, visibles dans la liste des issues, sous les limites secondaires de GitHub. Aucun verrou de navigateur, aucune preuve de travail client, aucun KYC : `SPEC_SYBIL.md` reste vrai mot pour mot.

## 7. Le budget et son refus

- **Part de l'émission : 1/8**, comme le robinet — `moisson_budget_atomes = a·T/8`, `moisson_plafond_sillon_atomes = 3a/2` (les deux se déduisent l'un de l'autre). Total des deux canaux : 1/4 ; les 3/4 restent au trésor.
- **Le reliquat ne se reporte pas.** Un sillon sans glaneur perd ses 60 EIDL : sinon un arrêt de 54 h (mesuré §1) armerait une rafale de 270 EIDL au redémarrage.
- **Une glane vaut pour son sillon** : non servie à la fin du sillon, elle est refusée, jamais reportée — la file ne peut pas gonfler pendant une panne.
- **Prorata au plus fort reste**, la règle d'arrondi de `build_epoch_table` : la somme des gerbes vaut `min(N·G_max, 3a/2)` **à l'atome près**.
- **`etat.json`** gagne `moisson_sillon`, `moisson_sillon_atomes`, `moisson_plafond_sillon_atomes`, `moisson_epoque_atomes`, `moisson_budget_atomes`, `moisson_glaneurs` — et, indépendamment de la Moisson, les trois seaux qui manquent : `tresor_atomes`, `hors_tresor_atomes`, `cendres_atomes` (§10).
- **Refus, quoi au lieu de quoi** (chacun exige son `doit_echouer`) : `Rejet("moisson 6100000000 au lieu de 6000000000 : plafond du sillon 3a/2")` ; `REFUS : semence non dépensée — l'adresse 47b1…fcd0 de la gerbe précédente est intacte` ; `REFUS : déjà glané au sillon 3 (bloc 45), prochain sillon au bloc 48` ; `REFUS : jamais servi — la première pièce vient du robinet, pas de la Moisson` ; `REFUS : 129 glaneurs au lieu de 128 au plus — glane refusée, sillon suivant`.

## 8. La mécanique on-chain

**Une transaction par sillon, pas une par joueur.** Le format le permet déjà : `n_out(2) [addr(20) atomes(8)]*` — aucun champ nouveau, aucun `FORMAT 4`, aucune `VERSION 3`.

| Transaction | Octets |
|---|---|
| bloc à coinbase seule (mesuré : 126 483 / 46 blocs) | 2 700 |
| paiement robinet (1 entrée, 2 sorties) | 2 283 |
| moisson 1 entrée, 60 gerbes | 3 935 → **65,6 o/gerbe** |
| moisson 3 entrées, 128 gerbes | 10 265 → **80,2 o/gerbe** |

Croissance : 23,67 Mo/an aujourd'hui ; **+7,5 Mo/an (+32 %)** pour 128 gerbes deux fois par jour ; le robinet saturé, une transaction par demande, coûterait **+60 Mo/an (+254 %)**. Le groupage n'est pas une optimisation, c'est la condition pour que le fichier reste committable. Une à trois entrées suffisent : une coinbase vaut 20 à 60 EIDL selon la phase.

**Chemin complet.** (1) Le joueur ouvre l'issue `moisson` : 31 glyphes d'une adresse fraîche, rien d'autre — même filtre `extraire` que le robinet, corps jamais interpolé, transitant par `EIDOS_ISSUE_BODY`. (2) `moisson.yml` (minute 27) relève les issues ouvertes, écrit corps et auteurs dans un fichier JSON via `gh`, appelle `robinet.py --moisson --lot <fichier>` : trois verrous du §6, inscription `type: "moisson"`, un commit. *(Une demande de type inconnu est déjà ignorée sans dommage par `construire_paiements` et `construire_envois` : la file peut apprendre la Moisson avant que le nœud ne la serve.)* (3) Au **dernier bloc du sillon** forgé, `construire_moisson` relit le carnet — la file ne fait pas foi —, calcule le prorata, prend une à trois sorties du trésor et signe **une** transaction : `N` gerbes et une monnaie rendue. (4) Le bloc est validé par le même code qu'à la forge, `Σ utxo == emission_cumulee` tient, `etat.json` est publié.

**Trois pièges d'intégration, un contrôle chacun.**
- `sorties_tresor` est appelée par le robinet puis par la Moisson dans le même bloc : sans lui passer les clés déjà retenues, les deux prennent la même sortie → `Rejet("double depense dans le bloc")`.
- `est_goutte(tx)` reconnaît une goutte à une sortie valant exactement 100 000 000 atomes : **une gerbe de 1 EIDL serait comptée dans `robinet_epoque_atomes`.** La marque doit être structurelle et rejouable — la monnaie rendue du robinet va sur `adr(sha256("<GRAINE>/rendu/<h>/<k>"))`, celle de la Moisson ira sur `adr(sha256("<GRAINE>/glane/<h>"))` : le rejeu distingue les deux canaux sans rien croire.
- **La Moisson ne frappe aucun artefact** : `artefact_de_goutte` tire 9 codes sur 64 (14,06 %) ; 256 gerbes par jour donneraient 36 artefacts par jour contre 1 en tout aujourd'hui. Les neuf empilements du chœur restent au robinet et aux reliques.

## 9. La dégressivité

**Retenu : le verrou 3 du §6, et rien d'autre.** Un glaneur ne détient jamais plus d'une gerbe non dépensée. Accumuler *n* eidôla coûte *n* transactions signées, *n* clés WOTS+ brûlées, 2*n* issues et 2 283 × *n* octets de chaîne : 10 EIDL = 5 jours et 20 issues ; 100 EIDL = 50 jours, 200 issues, 228 ko. L'accumulation stérile n'est pas interdite, elle est **facturée en clés** — et chaque dépense forcée est le moment exact où un puits peut prélever.

**Écarté : la gerbe qui décroît avec la bourse** (`G = G_max·2^−⌊solde/4⌋`, qui plafonnerait un thésauriseur à ≈ 34 EIDL au bout d'un an contre 730 pour un gain plat). Le nœud ne mesure la bourse que sur les adresses qu'il a servies ; une transaction vers une adresse fraîche la rend invisible. Une règle contournable pour une transaction est une taxe sur les honnêtes.

**Optionnel, quand les puits existeront : l'appariement.** `gerbe = socle (0,25) + min(0,75 ; ce que ce compte a versé à un puits depuis sa dernière gerbe)`. La boucle « verser puis récupérer » est alors **exactement neutre** : seul le socle grossit la masse, et l'inflation nette vaut 0,25 EIDL par glaneur actif et par sillon quoi que fasse le joueur. Capacité correspondante : 60 / 1,25 = 48 glaneurs au plafond.

## 10. L'équilibre avec les puits

Soit `M` la masse hors trésor, `n` glaneurs, `g` la gerbe, `p` la part de bourse rendue par sillon :

    dM/dsillon = min(n·g, 3a/2) − p·M      M* = min(n·g, 3a/2)/p      τ = 1/p sillons

| p (par sillon) | M* à Satya saturé | bourse moyenne (60 glaneurs) | τ |
|---|---|---|---|
| 0,50 | 120 EIDL | 2,0 | 1,0 j |
| 0,20 | 300 | 5,0 | 2,5 j |
| 0,10 | 600 | 10,0 | 5,0 j |
| 0,02 | 3 000 | 50,0 | 25 j |
| 0 | +43 830 EIDL/an, linéaire | — | asymptote 1/8 de l'émission |

**Débit de puits exigé au point fixe : `3a/2` par sillon — 60 EIDL à Satya, 5 par bloc, soit une gerbe par glaneur actif et par 12 h.** Le panier moyen d'un joueur actif doit donc coûter **une gerbe par sillon** (1 EIDL à Satya, 0,25 à Kali) : tarifé à 0,01 un puits ne stabilise rien, tarifé à 100 il vide les bourses en un sillon.

**Avertissement au concepteur des puits :** la conservation interdit de brûler, pas de rendre indépensable. Verser au trésor **n'est pas un puits** — `adresse_du_bloc(h)` dérive d'une graine publique, n'importe qui la dépense. Un vrai puits verse à une adresse **hors image** (20 octets nuls) : trouver une clé WOTS+ qui s'y projette coûte 2¹⁶⁰. D'où le seau `cendres_atomes` du §7. Les frais, eux, retournent à la coinbase donc au trésor : c'est une boucle, pas un puits.

## 11. Ce que ça touche

| PR | Fichiers | Contrôles ajoutés |
|---|---|---|
| 1 — mesurer | `noeud.py` (`ecrire_etat`), `etat.json` | 3 : `tresor + hors_tresor + cendres = emission_cumulee` ; trésor reconnu par dérivation ; aucun versement |
| 2 — la file | `robinet.py`, `moisson.yml`, `courriel.py` (auteur) | 8 : `sillon_de`, frein par sillon, adresse fraîche, semence dépensée, jamais servi, plafond en file, `MAX_GLANEURS`, glane périmée |
| 3 — le versement | `noeud.py` (`construire_moisson`, `graine_glane`, `est_goutte`, forge) | 12 : prorata exact à l'atome, plafond du sillon, budget d'époque (84 sillons pleins = a·T/8, le 85ᵉ refusé), sortie du trésor non disputée avec le robinet, `glane` ≠ `rendu`, aucun artefact, conservation, aller-retour ser/deser d'un bloc à 129 sorties |
| 4 — l'atelier | page Moisson, `i18n.ts`, `package.json` | compte à rebours **en blocs**, jamais en secondes ; FR/EN mêmes clés, « cycle » et non « époque » |
| 5 — l'appariement | après `SPEC_PUITS.md` | socle + apparié, neutralité de la boucle |

Non touchés : `eonis.py`, `genesis.json`, le format binaire, `federation.py`, `utxo.py`.

## Décisions à trancher

1. **La gerbe : 1 EIDL, ou 0,25 ?** À 1 EIDL le plafond porte 60 glaneurs et la gerbe est lisible (« un eidôlon, comme le robinet ») ; à 0,25 il en porte 240 (borné à 128 par la transaction) et la Sybil rapporte quatre fois moins par compte. Recommandation : **1 EIDL, prorata au-delà de 60 glaneurs** — la rareté se voit, la dilution est publiée.
2. **L'appariement (§9) maintenant ou après les puits ?** Il rend l'inflation nette exacte (0,25 par glaneur et par sillon) mais dépend d'une notion de puits qui n'existe pas encore. Recommandation : **après**, en PR 5.
3. **La Moisson accepte-t-elle le canal courriel ?** `SPEC_SYBIL.md` assume que l'expéditeur est plus faible qu'un compte GitHub ; la Moisson multiplie cette faiblesse par 84 (la fréquence). Recommandation : **GitHub seul au départ**, le courriel restant le canal d'amorçage du robinet ; à rouvrir si le débit observé le justifie.

## LIMITE

- **Le trésor est déjà dépensable par quiconque.** `graine_tresor(h) = sha256("<GRAINE>/tresor/<h>")` est publique et `adresse_du_bloc` le dit : les 943 EIDL mesurés ne sont pas verrouillés, personne ne s'en est saisi. Un envoi qui dépense une sortie du trésor brûle son adresse et **affame le robinet et la Moisson** jusqu'à la coinbase suivante. La Moisson ne crée pas ce risque, elle le rend moins tentant ; le corriger est un autre chantier (une graine secrète interdirait la reproductibilité du rejeu — c'est un arbitrage, pas un correctif).
- Tout chiffre au-delà de la hauteur 45 est une **projection à émission constante**, pas une mesure : un seul compte a été servi, la population de joueurs est inconnue.
- La Moisson est une **redistribution** : à budget saturé le trésor conserve 80 % de l'émission. Si l'objectif est une masse joueur significative, le levier est la **population** (128 glaneurs), pas le plafond.
- Le prorata suppose que le nœud connaît tous les claims du sillon au moment de payer : une glane inscrite après le dernier bloc du sillon est perdue — voulu, et dit au joueur quand l'issue est fermée.
- Rien ici n'est une figure : la Moisson écrit sur la chaîne. Chaque règle de refus du §7 exige son `doit_echouer` avant fusion (CLAUDE.md §4).
