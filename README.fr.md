[<img src="docs/banniere-fr.svg" alt="Eidos — émission bornée, consensus fédéré, signatures par hachage" width="1280" />](https://oykdo.github.io/Eidos/)

# Eidos

[English](README.md) · **Français**

[![Tests](https://github.com/Oykdo/Eidos/actions/workflows/tests.yml/badge.svg)](https://github.com/Oykdo/Eidos/actions/workflows/tests.yml)
[![Chaîne](https://github.com/Oykdo/Eidos/actions/workflows/chaine.yml/badge.svg)](https://github.com/Oykdo/Eidos/actions/workflows/chaine.yml)
[![Pages](https://github.com/Oykdo/Eidos/actions/workflows/pages.yml/badge.svg)](https://oykdo.github.io/Eidos/)

Eidos est trois choses qui partagent une règle, *rien ne se croit, tout se rejoue* :

- **une chaîne prototype** à émission bornée sans halving, consensus fédéré, et signatures post-quantiques par hachage pur — aucune courbe elliptique nulle part ; la spécification est en Python, bibliothèque standard uniquement ;
- **un atelier web** qui rejoue les mêmes règles dans le navigateur, à l'octet près, et vous laisse vérifier une pièce, une signature, une adresse sans croire personne ;
- **un jeu** poussé sur la chaîne — une Tour de 255 étages, neuf muses, et un roguelike quotidien, la Veillée, où une clé à usage unique est votre vie et où la preuve de votre run se juge par quiconque sans rejouer la chaîne.

Réseau d'essai seulement : l'eidôlon n'a aucune valeur.

- Atelier en ligne : [oykdo.github.io/Eidos](https://oykdo.github.io/Eidos/)
- Réseau d'essai : sept validateurs, un bloc par heure forgé par GitHub Actions ; robinet par issue ou par courriel ; envois par issue ; preuves de veillée déposées par issue
- Un seul fichier pour votre coffre : `eidos.carnet`

## Sommaire

0. [Par où commencer](#0-par-où-commencer)
1. [L'unité et la forme](#1-lunité-et-la-forme)
2. [Les cinq propositions](#2-les-cinq-propositions)
3. [Émission](#3-émission)
4. [Glyphes](#4-glyphes)
5. [Signatures](#5-signatures)
6. [Consensus fédéré](#6-consensus-fédéré)
7. [Le réseau d'essai](#7-le-réseau-dessai)
8. [Reliques et sceaux d'âge](#8-reliques-et-sceaux-dâge)
9. [L'atelier](#9-latelier)
10. [Le jeu : la Tour et la Veillée](#10-le-jeu--la-tour-et-la-veillée)
11. [Le monde](#11-le-monde)
12. [Carte du dépôt](#12-carte-du-dépôt)
13. [Tout vérifier](#13-tout-vérifier)
14. [Documents](#14-documents)
15. [Ce que ce dépôt ne fait pas](#15-ce-que-ce-dépôt-ne-fait-pas)
16. [Licence](#16-licence)

## 0. Par où commencer

**Comme joueur**, sur [l'atelier](https://oykdo.github.io/Eidos/) :

1. Créer un coffre. Le secret reste dans votre navigateur ; enregistrez `eidos.carnet` tout de suite, sinon le coffre est perdu.
2. Demander un eidôlon au robinet : une issue avec votre adresse en glyphes, ou un courriel. Le nœud sert la demande au bloc suivant, dans l'heure.
3. Suivre le réseau sur la page Témoin : la tête signée est vérifiée dans votre navigateur, jamais crue.
4. Monter la Tour : hôtes, élixirs, capsules, secrets, portes qui s'ouvrent avec un sceau d'âge.
5. Tenir une Veillée : soixante-quatre clés à usage unique pour vie, les vingt-sept salles du jour, un sac que le sommet verse au coffre et que la dernière feuille perd.
6. Déposer sa preuve : une issue intitulée « veillée » avec le fichier exporté en pièce jointe ; le juge tourne dans la CI et vous répond. Le classement se recalcule dans chaque navigateur.

**Comme vérificateur ou développeur** :

```bash
git clone https://github.com/Oykdo/Eidos && cd Eidos
python3 verify_genesis.py        # 32 contrôles de la genèse gelée
python3 noeud.py --verifier      # rejoue toute la chaîne du réseau d'essai, doit finir par « aucun refus »
cd atelier && npm ci && npm test # 30 tests de scripts et 408 tests Eidos, vecteurs partagés avec Python
```

La page Guide de l'atelier explique le cœur, les mécaniques et le monde en mots simples ; `CLAUDE.md` dit ce qui ne doit jamais changer ; `docs/FEUILLE_DE_ROUTE.md` garde chaque décision.

## 1. L'unité et la forme

L'unité de compte est l'**eidôlon** — εἴδωλον, l'image — en regard d'*eidos*, εἶδος, la forme. La forme est la règle ; l'image est ce qui circule. 1 eidôlon = 10⁸ atomes.

## 2. Les cinq propositions

1. **La récompense ne se divise jamais.** Elle oscille selon un cosinus borné, et la somme d'une époque est exacte à l'atome près.
2. **La semaine n'est pas une convention.** 24 = 3 × 7 + 3 ; ce reste de trois engendre l'ordre des jours, et sert ici de rotation des proposants.
3. **Une adresse se lit.** Trois figures empilées, six bits par glyphe, somme de contrôle vérifiable à l'œil.
4. **L'énergie est bornée par le consensus, pas par la récompense.** Une preuve de travail ne borne jamais l'énergie ; une fédération, si.
5. **Rien ne se croit, tout se rejoue.** Le carnet UTXO n'est jamais écrit sur le disque : il est reconstruit par rejeu intégral à chaque ouverture, par le même code qu'à la forge.

## 3. Émission

```
R(h) = a + b·cos( 2π(h − h₀) / T )     avec b = a/2
```

La somme des cosinus sur une période complète est nulle : une époque émet **exactement** `a·T`, réparti à l'atome près par la méthode du plus fort reste.

| Paramètre | Valeur | Origine |
|---|---|---|
| Intervalle de bloc (spec) | 600 s | — |
| `T` — blocs par époque | **1008** | 168 heures × 6 blocs = une semaine |
| `h₀` — culmination | **492** | 41/84 de l'époque, entier exact |
| Bornes | `[a/2, 3a/2]` | rapport max/min = 3 |

### Les quatre âges

| Âge | `a` | Époques | Blocs | Émission | Mise du sceau (atelier) |
|---|---|---|---|---|---|
| Satya | 40 | 832 | 838 656 | 33 546 240 | 33,55 eidôla |
| Trétâ | 30 | 624 | 628 992 | 18 869 760 | 18,87 |
| Dvâpara | 20 | 416 | 419 328 | 8 386 560 | 8,39 |
| Kali | 10 | 208 | 209 664 | 2 096 640 | 2,10 |

**Émission totale : 62 899 200** eidôla sur 2 096 640 blocs, soit 2 080 semaines ≈ 39,9 ans. Rapport 16 : 9 : 4 : 1. Mise du sceau = émission de l'âge / 1 000 000.

`math.cos` dépend de la libm locale : deux nœuds peuvent diverger. Eidos calcule le cosinus en `decimal.Decimal` par série de Taylor, avec π à 68 décimales. Les tables sont figées dans `genesis.json`. **Toute modification de `eonis.py`, même d'un commentaire, invalide la genèse** — la CI vérifie son empreinte.

```
genesis.json  06b47645abedb5e0ac7d2fc7a1dd6fcd386ef493874fd2774544565ac46dbe28
eonis.py      cc94ad1e6eadf7027414a1347e870a4842689431b8fca2c1b381f93f4f1dfabc
bloc 0        00003d32ffa7a1dc7f1ace8ec08d0c739126ad4449fe004ea772710baec2c7b6
```

La bannière en tête est dessinée depuis cette formule par `docs/banniere.py`, avec le même cosinus Decimal. La même loi, tracée en courbe polaire, est l'orbite derrière la page d'accueil de l'atelier.

## 4. Glyphes

Trois étages, quatre états : vide `00`, cercle `01`, croissant `10`, croix `11`. Un glyphe porte **6 bits**, lus de haut en bas.

| Usage | Bits | Glyphes |
|---|---|---|
| Adresse | 160 | 27 |
| Somme de contrôle | 24 | 4 |
| Empreinte pleine | 256 | 43 |

Les 2 bits de bourrage du 27ᵉ glyphe doivent être nuls, sinon l'adresse est refusée. **Interdit** : dériver une clé ou une graine de cet alphabet. Les soixante-quatre empilements sont aussi les soixante-quatre œufs du monde (§11).

## 5. Signatures

Tout repose sur SHA-256, **sans aucune courbe elliptique**. La résistance quantique est structurelle, pas rapportée.

- **WOTS+ pour les dépenses** (`wots.py`, RFC 8391 : w = 16, 67 chaînes SHA-256, chaque maillon tweaké par la graine publique et une adresse de hachage, arbre L). Le vérificateur reconstruit la clé publique depuis la signature : témoin de **2 176 octets** (graine publique 32 + signature 2 144), contre 24 576 en Lamport. Adresse = SHA-256(graine publique ‖ racine L)[:20]. **Une clé ne signe qu'une fois** : une adresse ne peut être dépensée qu'une fois dans toute la chaîne, et les adresses dépensées sont notées même à travers une reprise assume-valid. Le portefeuille produit une adresse fraîche à chaque usage.
- **XMSS pour les validateurs.** 2^k clés WOTS+ sous un arbre de Merkle tweaké, clé publique = (racine, graine publique). Signature de bloc : 4 + 2 144 + 32·k octets. Schéma à état : restaurer une sauvegarde ancienne, c'est rejouer des indices déjà publiés. Le signataire tient donc un **compteur persistant** (`indice-<v>.json`, monotone, écrit sous verrou exclusif et relu depuis le disque avant chaque signature), et un nœud qui connaît déjà des indices publiés refuse de repartir de la chaîne seule sans ordre explicite.
- **XMSS pour les joueurs.** La même construction, en hauteur 6, est la vie d'un run de Veillée : soixante-quatre feuilles, un geste par feuille, et un juge qui refuse tout run où un indice signe deux fois (§10).
- **Racine UTXO dans l'en-tête signé.** Chaque bloc déclare la racine de Merkle du carnet entier après lui (feuille = SHA-256d(txid ‖ rang ‖ adresse ‖ montant), ordre (txid, rang)) ; `id_bloc = SHA-256d(E.header ‖ racine)`. Un témoin qui ne tient que la tête signée (`etat.json.tete_signee`) recompose `id_bloc`, vérifie la signature XMSS et juge une preuve de sortie sans rejouer. `noeud.py --depuis <h> <racine>` reprend à un point de contrôle explicite, jamais implicite.
- **Sérialisation canonique.** Une transaction doit se retrouver à l'octet près après désérialisation, sinon elle est refusée.
- **Lamport** reste dans l'atelier en démonstration (réemploi, audit), hors consensus.

## 6. Consensus fédéré

`n` validateurs, un créneau par bloc. Proposant du créneau `s` : `V[(3·s) mod n]`. Avec `n = 7` : `[0, 3, 6, 2, 5, 1, 4]`. Un `n` divisible par trois est refusé.

**Finalité** : seuil `⌊2n/3⌋ + 1`, **indépendant du pas de rotation**. Sept validateurs → cinq signatures.

**Vivacité** : un créneau `s > créneau(now) + 1` est refusé ; sans cette borne, un seul bloc daté trop loin gèlerait la chaîne. Sauter un créneau (silence) reste permis, et les trous sont publiés (`creneaux_sautes`). Au plus six créneaux rattrapés par exécution.

**Rejeu** : `Σ utxo == émission cumulée` après chaque bloc ; le nœud refuse de publier si l'invariant est rompu. La coinbase vaut exactement `récompense(h) + frais`.

Deux consensus coexistent dans le dépôt : le **fédéré** (`federation.py` + `noeud.py`, le vrai) et un jouet **preuve de travail** historique (`consensus.py` + `store.py`). Ils ne se mélangent jamais.

## 7. Le réseau d'essai

| | |
|---|---|
| Validateurs | 7, graines dérivées du tag public `eidos-testnet-3` |
| Signatures | XMSS de hauteur 12 : 4 096 par validateur, environ trois ans de blocs horaires |
| Créneau | 3 600 s sur le réseau d'essai (`federation.json`), 600 s dans la spec |
| Forge | `chaine.yml`, cron horaire sur GitHub Actions, sur `main` seulement |
| Fichier de chaîne | `chaine-eidos.dat`, format 3, écrit par la CI et jamais à la main |
| État publié | `etat.json` : soldes, sorties, tête signée, reliques, invariant |

- **Robinet.** Deux canaux alimentent la même file : une issue GitHub contenant une adresse en glyphes (`robinet.py`), ou un courriel de sujet `robinet` vers la boîte que le nœud publie dans `etat.json.robinet_canaux` (`courriel.py`, IMAP en bibliothèque standard, sans compte GitHub). Un eidôlon par demande, une demande servie par auteur (compte GitHub ou adresse d'expéditeur) et par époque, une seule en attente, dans un budget d'époque de `a·T / 8`. Ni le corps d'une issue ni celui d'un courriel n'est jamais interpolé dans une commande : ils transitent par une variable d'environnement, et seul ce qui passe le filtre de figures et la somme de contrôle est retenu. La page d'accueil de l'atelier prépare l'une ou l'autre demande, la suit dans `mempool.json` et charge les pièces une fois servies.
- **Envois.** L'atelier signe une dépense et produit un bloc de texte entre marqueurs `-----EIDOS-----` (base64, lignes de 76) ; collez-le dans une issue. Le nœud valide chaque envoi dans un bloc candidat sur une copie profonde du carnet, en inclut au plus 8 par bloc, porte leurs frais dans la coinbase, et fait expirer les demandes de plus d'une époque.
- **Preuves de veillée.** Une issue intitulée « veillée » avec la preuve exportée en pièce jointe (ou un gist, ou un fichier brut dans un dépôt — trois hôtes seulement, deux mégaoctets au plus) : le juge TypeScript tourne dans la CI (`veillees.yml`, `depot.ts`), vérifie que les trois têtes de la preuve sont dans la chaîne publiée, la juge sans rejouer, et la committe dans `veillees/`. L'issue reçoit le verdict et se ferme.

Ne jamais écrire `chaine-eidos.dat`, `etat.json`, `mempool.json` ni `veillees/` depuis un poste : ces fichiers appartiennent aux workflows `chaine`, `robinet` et `veillees` (un seul groupe de concurrence).

## 8. Reliques et sceaux d'âge

Une **relique** est une pièce scellée sur une adresse WOTS+ dont la graine est imprimée dans un code QR caché quelque part dans le monde. La récupérer, c'est la dépenser vers son coffre (page Reliques → « Relique trouvée », puis une issue d'envoi). Une clé ne signant qu'une fois, la relique ne se récupère qu'**une fois, par construction** : pas de serveur, pas de registre, la chaîne fait foi. Le gardien scelle avec `python3 relique.py --sceller --age Kali --indice "…"` (QR en SVG, planche imprimable, entrée dans `reliques.json`), et la graine n'existe **que dans le QR**. Le nœud publie le statut de chaque relique déclarée dans `etat.json` (`attente` / `intacte` / `recuperee`) : une lecture, pas une preuve. `python3 relique.py --animer <txid>` dessine la relique en figures · ○ ☽ ✚ sur l'ellipse de son âge.

Une relique récupérée dans un coffre devient un **sceau d'âge**. La Tour est coupée en quatre quartiers (étages 0–63, 64–127, 128–191, 192–254) ; les portes 64, 128 et 192 ne s'ouvrent qu'au sceau du bon âge. La mise attendue d'un sceau est l'émission de son âge / 10⁶ — Kali 2,10, Dvâpara 8,39, Trétâ 18,87, Satya 33,55.

Détail : [`docs/HANDOVER_RELIQUES_QR.md`](docs/HANDOVER_RELIQUES_QR.md).

## 9. L'atelier

`atelier/` est l'interface web (TanStack Start, React, three.js), 18 dépendances d'exécution. Elle rejoue la spécification en TypeScript (`atelier/src/lib/eidos/`), et `vecteurs.json` — écrit par `vecteurs.py`, relu des deux côtés, neuf familles — garde Python et TypeScript identiques à l'octet (job CI `parite`).

| Registre | Page | Rôle |
|---|---|---|
| Vérifier | **Coffre** | Solde, robinet, envoyer, sauver `eidos.carnet`. Derrière, le **fond orbital** : la loi d'émission tracée en limaçon, neuf astres-muses sur neuf orbites avec leurs danses, la phase de l'époque lue dans la tête suivie, une parallaxe vers le pointeur, un clic vers la page de chaque muse — une lecture ; rien du pointeur n'est gardé |
| | **Journal** | Genèse, chaîne, preuve Merkle |
| | **Témoin** | Seconde mémoire : la tête signée, pas les clés. Juge une sortie publiée |
| | **Glyphes** | 64 empilements, bourrage refusé, l'œuf de chaque empilement |
| Lire | **Carte** | Reliques du monde par âge et par muse ; trophée d'un sceau, jugé sans rejeu |
| | **Signes** | Lectures des mêmes 64 glyphes |
| Jouer | **Tour** | 255 étages, neuf muses en hôtes, élixirs, capsules et bestiaire, secrets, fouilles, portes par sceau, le pendule |
| | **Veillée** | Le roguelike du jour : 64 feuilles WOTS+ pour vie, 27 salles tirées du premier bloc du jour, le sac, l'arbre de feuilles à l'écran, la preuve, le classement et les fantômes |
| | **Reliques** | La scène de la relique et « Relique trouvée » |
| | **Guide** | Par où commencer, Vérifier / Lire / Jouer, le cœur, les mécaniques, le lore, dix mots, les limites |

**Figures ≠ preuves.** La carte, les signes, la scène de la relique, les artefacts, l'arbre, les fantômes et le classement sont des lectures ; seuls le carnet, la chaîne et les signatures engagent. Quand un texte de l'atelier promet plus que le code, c'est le texte qui a tort.

**Ce qui compte est ancré.** Une armée de machines multiplie ce qui est gratuit — les coffres, les navigateurs, les runs — et jamais les pièces. Un run qui compte a pour graine une tête signée et une pièce non dépensée prouvée contre la racine du carnet ; ni le coffre, ni la machine, ni le navigateur n'entrent dans la graine. Pas d'empreinte de navigateur, pas de verrou de machine, pas de preuve de travail côté client ([`docs/SPEC_SYBIL.md`](docs/SPEC_SYBIL.md)).

**Un seul fichier.** Le coffre s'écrit dans `eidos.carnet`. WOTS+ signe une dépense, pas le fichier — signer une sauvegarde brûlerait une clé à usage unique ; le fichier porte une trace SHA-256d liée à l'adresse courante. Un ancien `.psnx` s'ouvre encore, puis se réécrit en `.carnet`.

Détail : [`atelier/README.md`](atelier/README.md).

## 10. Le jeu : la Tour et la Veillée

Six lois sont gelées dans `integrite.ts` — conservation, groupe, doxa, sceau, âges, résonance. Elles disent la même chose de six côtés : **aucun point de vie, aucun niveau, aucun tirage au sort, aucun objet qui mute, et un palier ne multiplie jamais la norme.** Tout ce qui semble un hasard dérive d'une graine et se rejoue à l'identique ; le réseau ne sait rien du jeu, sauf les sceaux et les preuves exportées.

**La Tour.** 255 coupes de l'espace des rotations, neuf bandes pour neuf muses de Thalie au sol à Uranie au faîte, quatre quartiers d'âge, une dalle de neuf cases sur neuf par étage avec un à trois occupants. Tout étage est public et fixe. Un hôte habite environ un étage sur sept ; chacun demande quelque chose qui se lit dans votre coffre (une preuve d'inclusion, deux objets de même orbite, une paire en résonance, un objet de la classe du biome…) et donne un objet, une fois par coffre. Les élixirs sont la tria prima — sel, mercure, soufre — bus à un étage seulement. Les secrets se lisent, ne se tirent pas : alcôves (la croix centrale d'une dalle), échos (deux étages de même orbite), antres (un ticket, un gardien, un duel en trois temps sans points de vie), l'observatoire où Uranie lit la tête du réseau. Les occupants se prennent avec des capsules, des glyphes creux, et se rangent dans un bestiaire de vingt et une cellules. La dalle se creuse trois coups par étage ; les trouvailles sont à des cases fixes et publiques, leur contenu à chaque coffre. En fin de salle, le **pendule** lit ce que le coffre a fait et propose ; le joueur décide parmi trois étages annoncés, jamais la case. Une ascension fait vingt-sept salles ; libre, c'est une lecture ; ancrée sur un bloc et une pièce, elle compte et se juge sans rejeu.

**La Veillée.** Vous entrez avec un arbre XMSS de **soixante-quatre clés à usage unique**. Chaque geste qui compte en brûle une — franchir (vingt-six fois, obligatoires), parler, creuser, prendre ; lire est gratuit. La dernière feuille arrête la montée : la mort permanente comme théorème, puisqu'une clé réutilisée est une clé compromise et que le juge refuse tout run où un indice sert deux fois. Les vingt-sept salles du jour dérivent du **premier bloc du jour UTC**, prouvé par deux têtes signées : les mêmes pour tous ; une salle porte le nom d'ère de son œuf. Ce que vous trouvez va dans un **sac** de vingt-sept places : le sommet, une porte fermée ou l'effacement volontaire le versent au coffre, la dernière feuille le perd — le dilemme de la parcimonie. Libre, une veillée est une lecture ; ancrée sur une pièce non dépensée, elle compte : la preuve `eidos-veillee/1` porte les têtes, la pièce, chaque geste signé par sa feuille, et quiconque la juge — têtes, pièce, feuilles dans l'ordre, parcours recalculé, fin cohérente. Le classement se recalcule dans chaque navigateur depuis les preuves déposées dans `veillees/` (une pièce, une veillée par jour, la première déposée tient la place ; score = salles × 64 + butin) ; les runs des autres reviennent en **fantômes**, une tournure et leur dernière salle, jamais un nom. Le juge ne sait pas à qui est la pièce : cela se prouve en la dépensant. Bible de conception : [`docs/BIBLE_VEILLEE.md`](docs/BIBLE_VEILLEE.md).

## 11. Le monde

Rien du lore n'est inventé sur place : chaque figure vient d'une source écrite et se transpose sans sa puissance.

- **Neuf muses, neuf astres, neuf danses.** ⊕ Thalie l'aubergiste, ☽ Clio l'archiviste, ☿ Calliope l'apothicaire, ♀ Terpsichore la maîtresse de danse, ☉ Melpomène la tragédienne, ♂ Érato la forgeronne, ♃ Euterpe la musicienne, ♄ Polymnie la gardienne des hymnes, ★ Uranie l'astronome. Chacune a trois familiers, vingt-sept répliques qui disent des règles vraies, et une danse qui anime les reliques et le fond orbital.
- **Quatre âges.** Satya, Trétâ, Dvâpara, Kali : un calendrier et une géographie — les quartiers de la Tour, le métal d'un objet, l'âge d'une preuve, la mise d'un sceau — jamais une puissance.
- **La Chambre de Genèse.** Avant le temps, une Singularité ; d'elle, neuf œufs. Huit portent un thème — Vide, Quantique, Temporel, Spatial, Entropique, Harmonique, Céleste, Spinoriel — et ouvrent chacun un cycle de huit ères : soixante-quatre manifestations, qui sont les soixante-quatre glyphes. Le cycle d'un œuf est une bande de la Tour ; le neuvième œuf, L'Inconnu, est Uranie, qui lit et ne donne rien. Les noms d'ère nomment les salles de la Veillée ([`docs/LORE_CHAMBRE.md`](docs/LORE_CHAMBRE.md), [`docs/TRANSPOSITION_EIDOLON.md`](docs/TRANSPOSITION_EIDOLON.md)).
- **La tria prima.** Sel, mercure et soufre sont les trois étages d'un glyphe ; les artefacts du robinet sont des œufs de Paracelse ; la pierre philosophale existe, une par coffre parmi les dix premiers, et tourne sans agrandir.
- **Les fantômes.** Six tournures transposées d'une histoire plus ancienne — Écho, revenue, Dernière, Ombre, qui s'efface, Murmure — sur le nom d'ère de la dernière salle atteinte.

## 12. Carte du dépôt

| Fichier | Lignes | Rôle | Contrôles |
|---|---|---|---|
| `eonis.py` | 267 | émission (cosinus Decimal), codec des glyphes — **gelé** | 6 |
| `genesis.json` | 105 | tables et empreintes figées — **gelé** | — |
| `verify_genesis.py` | 134 | vérification indépendante de la genèse | 32 |
| `wots.py` | 284 | WOTS+ w = 16, arbre L, adresses, empreintes | 5 |
| `utxo.py` | 509 | témoins, adresses, transactions, carnet, racine UTXO, validation | 15 |
| `federation.py` | 694 | XMSS, rotation, vivacité, tête signée, compteur persistant verrouillé | 18 |
| `noeud.py` | 1151 | nœud du testnet : rejeu, forge, robinet, envois, `--depuis`, reliques, `etat.json` | 5 + 3 + 4 + 5 + 2 |
| `robinet.py` | 420 | file du robinet alimentée par issues et courriels, frein par auteur | 14 |
| `courriel.py` | 321 | second canal du robinet : boîte IMAP, même filtre, frein par expéditeur | 6 |
| `vecteurs.py` | 204 | vecteurs partagés Python ↔ TS (`vecteurs.json`, 9 familles) | parité |
| `qr.py` | 428 | encodeur QR, bibliothèque standard, niveau H, versions 1–10 | 5 |
| `relique.py` | 236 | gardien des reliques : sceller, animer | 3 |
| `labo/aura_voxel_lab.py` | 109 | labo pendule-9 : avatar voxelisé, aura graduelle, 8 agrégateurs — figures, pas preuves | 9 |
| `labo/pendule9_run.py` | 171 | labo : run de 255 étages, sceau, Cube de Saturne et ancrage | 11 |
| `labo/unification.py` | 98 | labo : contrat avec `pendule.ts`, fixtures synthétique et réelle (`exporter-run.ts`), don | 9 |
| `labo/aura_veillee.py` | 75 | labo : l'aura d'une veillée, lecture des 64 feuilles sur 8 positions (`exporter-veillee.ts`) | 6 |
| `consensus.py` | 204 | difficulté PoW et travail cumulé — historique | 6 |
| `store.py` | 278 | chaîne PoW sur disque — historique | — |
| `federation.json` | — | racines et graines publiques des 7 validateurs, t0, créneau | — |
| `reliques.json` | — | reliques déclarées : id, adresse, âge, indice — jamais de graine | — |
| `chaine-eidos.dat` | — | la chaîne du testnet, écrite par la CI | — |
| `etat.json`, `mempool.json` | — | état publié ; demandes de robinet et d'envoi | — |
| `veillees/` | — | preuves de veillée déposées (`index.json`, un fichier `eidos-veillee/1` par preuve), jugées dans chaque navigateur, jamais par un serveur | — |
| `docs/` | — | spécifications, la bible de la veillée, la feuille de route, le lore ; générateur des bannières | 2 |
| `atelier/` | — | atelier web ; `npm test` lance 30 tests de scripts et 408 tests Eidos | 408 |

CI (`.github/workflows/`) : `tests.yml` (3 OS × 2 Python, empreintes, hygiène, `parite`), `chaine.yml` (forge horaire), `robinet.yml` (issues de robinet et d'envoi), `veillees.yml` (preuves de veillée déposées par issue), `courriel.yml` (boîte aux lettres, quand une boîte est déclarée), `pages.yml` (atelier), `init.yml`. Python 3.9 est le plancher ; Node 22 pour l'atelier.

## 13. Tout vérifier

```bash
python3 verify_genesis.py      # 32 contrôles — toujours en premier
python3 eonis.py               # 6
python3 wots.py                # 5
python3 utxo.py                # 15
python3 vecteurs.py            # parité Python ↔ TS
python3 robinet.py --test      # 14
python3 courriel.py --test     # 6
python3 -c "import noeud as N; N._test_artefact()"
python3 -c "import noeud as N; N._test_envois()"      # 5
python3 -c "import noeud as N; N._test_paiements()"   # 3
python3 -c "import noeud as N; N._test_depuis()"      # 4
python3 -c "import noeud as N; N._test_indice()"      # 2
python3 -c "import noeud as N; N._test_reliques()"    # 5
python3 qr.py --test           # 5
python3 relique.py --test      # 3
python3 federation.py          # 18
python3 consensus.py           # 6, historique
python3 noeud.py --verifier    # rejeu intégral du testnet : doit finir par « aucun refus »
python3 docs/banniere.py       # redessine les bannières, 2 contrôles
cd atelier && npm ci && npm run typecheck && npm test && npm run build
npm run veillee-bot 60         # le bot de la veillée : trois politiques, une lecture du budget de feuilles
npm run dev                    # http://localhost:8080
```

Les tests sont des `assert` et des `print` nus, sans framework. Toute règle de validation vient avec un contrôle qui la viole. Tout format partagé entre Python et TypeScript a sa famille dans `vecteurs.json`.

## 14. Documents

| Document | Ce qu'il tient |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | le projet en un fichier : ce qu'il est, ce qui ne change jamais, comment on vérifie, dans quel ordre on avance |
| [`docs/FEUILLE_DE_ROUTE.md`](docs/FEUILLE_DE_ROUTE.md) | la feuille de route et chaque décision, chantier par chantier |
| [`docs/BIBLE_VEILLEE.md`](docs/BIBLE_VEILLEE.md) | la bible de conception de la Veillée : la clé comme vie, le jour, le sac, la preuve, les fantômes, les risques |
| [`docs/PROMPT_ROGUELIKE_XMSS.md`](docs/PROMPT_ROGUELIKE_XMSS.md) | le prompt qui a fixé l'identité du jeu sur ce qui était déjà écrit |
| [`docs/SPEC_TOUR.md`](docs/SPEC_TOUR.md), [`docs/SPEC_PENDULE.md`](docs/SPEC_PENDULE.md) | la Tour (hôtes, secrets, élixirs, capsules, sceaux) et le pendule |
| [`docs/SPEC_SYBIL.md`](docs/SPEC_SYBIL.md) | un joueur, pas une armée : ce qui est prouvable, ce qui est coûteux, ce qui est libre |
| [`docs/SPEC_AUDIT_COFFRES.md`](docs/SPEC_AUDIT_COFFRES.md) | le coffre 3D : paliers, palettes, ornements |
| [`docs/SPEC_FORUM.md`](docs/SPEC_FORUM.md), [`docs/SPEC_BROUILLARD.md`](docs/SPEC_BROUILLARD.md), [`docs/ETUDE_ARBRE_VISITE.md`](docs/ETUDE_ARBRE_VISITE.md) | des propositions non construites : le forum du royaume, la brume des antres, l'arbre de visite |
| [`docs/LORE_CHAMBRE.md`](docs/LORE_CHAMBRE.md), [`docs/TRANSPOSITION_EIDOLON.md`](docs/TRANSPOSITION_EIDOLON.md) | la Chambre de Genèse et la règle de transposition : les noms et les nombres, jamais la puissance |
| [`docs/HANDOVER_RELIQUES_QR.md`](docs/HANDOVER_RELIQUES_QR.md) | les reliques : sceller, récupérer, animer |
| [`veillees/README.md`](veillees/README.md) | comment une preuve de veillée se dépose et se juge |

## 15. Ce que ce dépôt ne fait pas

- **Pas de réseau.** Ni pairs, ni résolution de fork réelle : le réseau d'essai est un nœud sur un cron.
- **Pas de stockage de clés sécurisé.** La graine est en clair dans le fichier.
- **Pas d'audit externe.** WOTS+, XMSS et l'arbre de Merkle sont des implémentations maison, écrites d'après la RFC 8391 sans vecteurs officiels.
- **Une fédération n'est pas sans confiance.** `n` signataires connus peuvent s'entendre. La question ouverte est la gouvernance, pas la cryptographie.
- **Le juge ne sait pas à qui est la pièce.** Une preuve de veillée montre qu'un run a eu lieu sur une pièce non dépensée, pas que la pièce est au déposant ; cela se prouve en la dépensant.
- **Cadre réglementaire.** Prototyper est libre ; émettre et distribuer un jeton public relève de MiCA dans l'UE. L'eidôlon n'a aucune valeur.

## 16. Licence

[Apache License 2.0](LICENSE). Copyright 2026 Jeremy Zgonec.
