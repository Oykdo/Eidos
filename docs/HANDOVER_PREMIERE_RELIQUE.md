# Handover — La première relique et la première preuve de veillée (C5)

**Dépôt :** Oykdo/Eidos · **Rédigé le :** 2026-09-14, contre `9927508` (chaîne à la hauteur 181, `reliques.json` et `veillees/index.json` vides) · **Statut :** rien à coder si tout passe — le livrable est **une donnée**, pas du code
**Entrées :** `HANDOVER_RELIQUES_QR.md` (la conception) · `relique.py`, `noeud.py` (`noter_reliques`, `etat_reliques`, `mise_sceau`) · `relique-qr.ts`, la page Reliques · `veillee.ts`, `veillee-tour.ts`, `depot.ts`, `veillees.yml`, la page Veillée · `FEUILLE_DE_ROUTE.md` C5, A13, A14
**Ne change pas :** aucun fichier de code, sauf les défauts du §5 s'ils se confirment (le premier est corrigé le 2026-09-14, `relique.py` 4 contrôles)

---

## 1. L'idée en une phrase

Faire tourner **en réel** deux machineries codées, testées, et jamais servies — le statut public d'une relique (3 + 5 contrôles) et le juge de CI d'une preuve de veillée (`depot.ts`, 8 contrôles) — pour apprendre ce que les tests n'ont pas vu ; **un refus est un résultat**, et il désigne le défaut à corriger avant tout dépôt public.

## 2. Ce qui existe déjà

| Étape | Déjà là | Où |
|---|---|---|
| Sceller | `relique.py --sceller --age A --indice "…" [--dossier D]` : graine par `secrets`, adresse WOTS+, id = `sha256("eidos-relique-qr/1" ‖ adresse)[:16]`, QR SVG (**seul** porteur de la graine), planche `.txt` (id, âge, adresse hex et en 31 glyphes, consignes), entrée ajoutée à `reliques.json` ; la graine n'est ni affichée ni stockée | `relique.py` (4 contrôles) |
| Publier le statut | à chaque rejeu, `noter_reliques` suit les sorties créées sur les adresses de `reliques.json` et leur dépense ; `etat_reliques` publie `attente` → `intacte` (txid, rang, montant, `scellee` = montant ≥ mise) → `recuperee` (bloc, txid, vers, artefact) dans `etat.json.reliques` | `noeud.py` (`_test_reliques`, 5 contrôles) |
| La mise d'un sceau | `mise_sceau(âge)` = émission de l'âge / 10⁶ : Kali **2,10** EIDL, Dvâpara 8,39, Trétâ 18,87, Satya 33,55 | `noeud.py`, `relique.ts` |
| Créditer | une issue « robinet » dont le corps porte les 31 glyphes de l'adresse ; une goutte de **1 EIDL** ; **une demande servie par compte GitHub et par époque** (règle 4) ; le cron `chaine.yml` forge à la minute 7 | `robinet.py`, `robinet.yml`, `chaine.yml` |
| Récupérer | page `/reliques` : `parserRelique` (deux formes), `statutRelique(etat.json, adresse)`, `preparerRecuperation` → une issue « envoi » ; le fragment `#r=1.<graine>` ne quitte pas le navigateur | `relique-qr.ts` (5 contrôles) |
| Jouer une veillée ancrée | la chaîne suivie (`chaine-eidos.dat` en en-têtes), le premier bloc du jour UTC et sa veille (`tetesDeLaVeillee`), une pièce **non dépensée du coffre** prouvée contre `utxo_root` de la tête suivie ; chaque geste signe une feuille ; `abandon` est une fin valide et **exportable** | `veillee.ts`, `veillee-tour.ts`, `store.ts` (`ouvrirVeillee(ref)`) |
| Déposer | la page Veillée montre la preuve (JSON) et ouvre une issue préremplie titrée « veillée » ; la preuve (100 à 300 Ko) se **joint** à l'issue (glisser le fichier) ; `veillees.yml` lance `deposer-veillee.ts` : sources autorisées, têtes retrouvées dans la chaîne, `jugerVeillee`, commit dans `veillees/` + `index.json`, réponse et fermeture de l'issue | `depot.ts`, `veillees.yml`, `VeilleeView.tsx` |
| Lire | le classement relit `veillees/index.json` et juge chaque preuve dans le navigateur ; les fantômes | `classement.ts`, `fantomes.ts` |

## 3. Livrable R — une relique scellée et publiée

1. **Sceller hors du dépôt.** `python3 relique.py --sceller --age Kali --indice "…" --dossier <un dossier hors du dépôt>`. Le `--dossier` par défaut est la racine du dépôt : le SVG y serait ignoré par `.gitignore` (`/*.svg`, `*graine*`), la planche non — ne pas s'y fier, sortir les deux. Scanner l'écran une fois avant d'imprimer (`qr.py` n'a pas de décodeur). Imprimer, cacher, **puis supprimer le SVG** : la graine n'existe plus qu'à l'endroit caché.
2. **Committer `reliques.json` seul**, sur une branche, PR « reliques : la première » — une entrée : id, adresse hex, âge, indice, date. Vérifier avant : `python3 relique.py --test` (4), `python3 -c "import noeud as N; N._test_reliques()"` (5), `python3 noeud.py --verifier` (« aucun refus » : le fichier est lu au rejeu).
3. **Créditer.** Ouvrir une issue « robinet » avec les 31 glyphes de la planche. Au cron suivant, `etat.json.reliques[0].etat` passe d'`attente` à `intacte`, `montant` 100 000 000, **`scellee: false`** (1 EIDL < 2,10). Lire aussi la page Reliques (statut « intacte », âge, artefact).
4. **Le sceau** (R1, tranché par l'auteur le 2026-09-14) : la première relique reste « intacte, sous-scellée » — la lecture est vraie et publiée. La mise entière, en **une seule sortie**, viendra d'un coffre qui la possède (§5, défaut 1).
5. **Ne pas récupérer soi-même** : la première récupération est un événement du jeu ; la machinerie est déjà couverte par `_test_reliques` (intacte → recuperee).

**Cible.** `reliques.json` porte 1 entrée ; `etat.json.reliques` la publie `intacte` avec son txid ; la page Reliques la lit ; aucune graine nulle part dans le dépôt (`grep -E '[A-Za-z0-9_-]{43}' reliques.json` vide — la note du fichier contient le mot « graine », pas une graine ; `git log -p reliques.json` sans octet de QR).
**Ce qui le tue.** Le nœud ne passe pas la relique en `intacte` après la goutte (alors `noter_reliques` ou l'adresse écrite sont faux), ou la page Reliques la dit « inconnue » (alors `statutRelique` lit mal `etat.json`). Chaque cas est un défaut, à corriger avec son contrôle avant le second scellement.

## 4. Livrable V — une preuve de veillée jugée par la CI

1. **Une pièce au coffre.** Un coffre **personnel** (jamais celui de l'atelier : `exporterVeilleeDuCoffre` le refuse), une adresse fraîche, une goutte du robinet — **d'un autre compte GitHub, ou à une autre époque que celle de la relique** (règle 4 : une goutte par compte et par époque). La pièce doit être visible dans `etat.json` à la tête suivie.
2. **Ouvrir la veillée du jour, ancrée** : Veillée → suivre la chaîne → choisir la pièce → ouvrir. Il faut que la chaîne publiée contienne le premier bloc du jour UTC **et** sa veille (`estPremierDuJour`) ; le cron rattrape par rafales de 6 et laisse des créneaux vides : si le jour n'a pas encore de bloc, attendre le cron.
3. **Jouer peu, finir vite** : un `franchir` (1,3 à 1,6 s de construction d'arbre à l'ouverture, puis une signature par geste), puis **S'effacer** (`abandon`) : la preuve est exportable telle quelle. Un run au sommet n'est pas nécessaire pour éprouver le juge.
4. **Déposer** : copier la preuve dans un fichier `.json`, ouvrir l'issue préremplie « veillée », y **glisser le fichier**. Le juge répond dans l'issue : accepté (`veillees/<jour>-<txid 8>-<rang>.json` committé, ligne dans `index.json`), ou le motif du refus — quoi au lieu de quoi.
5. **Lire** : page Veillée → classement : la preuve relue et jugée dans le navigateur, le fantôme dans la salle.

**Cible.** `veillees/index.json` porte 1 nom ; le fichier est la preuve **resérialisée** par l'atelier ; `jugerVeillee` la dit `ok` en CI et dans le navigateur ; les trois têtes (jour, veille, ancre) sont retrouvées dans `chaine-eidos.dat`.
**Ce qui le tue.** Un refus du juge pour une raison de **format** (pièce jointe non lue, JSON resérialisé différent, tête absente parce que le cron n'a pas gardé le bloc) : c'est un défaut de `depot.ts` ou de `veillees.yml`, et exactement ce que ce chantier cherche. Coût nul en cas d'échec, sauf le correctif — avec son contrôle.

## 5. Défauts déjà visibles, à confirmer en réel

1. **La planche conseillait un second versement, et il aurait été perdu — CORRIGÉ le 2026-09-14.** `relique.py` écrivait : « Le robinet n'en verse qu'un : compléter par un envoi depuis votre coffre vers cette adresse. » Or une clé WOTS+ ne signe qu'une fois **et `Carnet.valider_bloc` refuse une adresse déjà signée dans le même bloc** (`utxo.py`, « cle WOTS+ reutilisee — usage unique ») : de deux sorties sur l'adresse de la relique, **une seule sera jamais dépensable**, et `etat_reliques` ne lit que la première (`par_adresse[a][0]`). La planche dit désormais « une seule pièce, jamais les deux », un contrôle l'exige (`relique.py` 3 → 4), et `HANDOVER_RELIQUES_QR.md` §7 le porte. Reste vrai : la mise entière ne peut venir que d'un envoi en une sortie depuis un coffre qui la possède.
2. **`--dossier` par défaut = la racine du dépôt.** Sans dommage grâce à `.gitignore`, mais une planche `.txt` (adresse, indice) resterait dans l'arbre de travail. Correctif possible : refuser un `--dossier` sous le dépôt, ou l'exiger.
3. **Le frein d'auteur mord sur le chantier lui-même** : la relique et la pièce de veillée demandent deux gouttes, donc deux comptes ou deux époques (42 jours). Ce n'est pas un défaut du robinet ; c'est à savoir avant de commencer.

## 6. Décisions qui reviennent à l'auteur

| # | Question | Recommandation |
|---|---|---|
| R1 | Le sceau de la première relique : sous-scellée à 1 EIDL, ou la mise entière (Kali 2,10) en une sortie ? | **TRANCHÉ le 2026-09-14 : sous-scellée**, dite telle : c'est ce que le nœud publie, et rien ne promet plus. La mise entière attend un coffre qui la possède |
| R2 | L'indice de lieu : public dès le scellement (`reliques.json`), ou révélé plus tard ? | **Public** : c'est le jeu, pas le protocole, et l'entrée est relue par le nœud telle quelle |
| R3 | L'âge : Kali (le moins cher, ellipse la plus petite) ? | **Kali** pour la première ; les autres âges quand une mise entière sera possible |
| A13 | Le canal courriel : activé (`EIDOS_ROBINET_COURRIEL`) ou retiré de la mention publique ? | Sans rapport direct, mais le chantier le croise : `etat.json` publie `courriel: null`. Trancher dans la même passe |

## 7. Ce que ce handover ne couvre pas

La première **récupération** (elle appartient au chercheur), un dépôt de preuve **avec bataille** (`HANDOVER_VEILLEE_BATAILLE.md`, PR 6), et tout scellement en série : une relique à la fois, tant que la première n'a pas été retrouvée.

## 8. Comment on vérifie

```bash
python3 relique.py --test                                  # 4
python3 -c "import noeud as N; N._test_reliques()"         # 5
python3 noeud.py --verifier                                # aucun refus, reliques.json relu
grep -rE '[A-Za-z0-9_-]{43}' reliques.json               # rien : pas de base64url de 32 octets
cd atelier && npm test                                     # 612, 0 échec (rien ne bouge)
```
