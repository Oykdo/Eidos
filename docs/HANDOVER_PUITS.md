# Handover — L'économie : les puits, puis la Moisson (C6)

**Dépôt :** Oykdo/Eidos · **Rédigé le :** 2026-09-14, contre `9927508` (hauteur 181, 183 sorties, `en_circulation == emission_cumulee`) · **Statut :** deux specs chiffrées (`SPEC_PUITS.md`, `SPEC_MOISSON.md`), zéro ligne de code ; **trois des cinq lots dépendent d'autres chantiers** (C4 PR 6, C7)
**Entrées :** `SPEC_PUITS.md` §1, §3, §4, §7 · `SPEC_MOISSON.md` §5–§11 · `FEUILLE_DE_ROUTE.md` C6, A6–A10, A12 · `noeud.py` (`BUDGET_RATIO`, `MAX_ENVOIS`, `MAX_PAIEMENTS`, `MAX_RENDUS`, `sorties_tresor`, `est_goutte`, `construire_paiements`), `robinet.py` (`auteur_autorise`, `ajouter_envoi`, `MAX_FILE`), `merkle.ts` (`verifierPreuve`)
**Ne change pas :** `eonis.py`, `genesis.json`, `utxo.py`, la validation, `FORMAT 3`, le format `Tx`, les familles existantes de `vecteurs.json`

---

## 1. L'idée en une phrase

L'ionos n'achète rien aujourd'hui ; il faut des **puits** — des sorties vers des adresses **sans clé** (le seul endroit où des atomes sortent de portée sans casser la conservation) — gros et rares parce que la ressource rare n'est pas la monnaie mais **192 transactions par jour** ; et une **Moisson** qui fait sortir du trésor, toutes les 12 heures, exactement ce que les puits absorbent.

## 2. Ce qui existe déjà, et les chiffres qui commandent

| Fait | Le chiffre | Où |
|---|---|---|
| Le seul puits possible | une sortie vers `A = SHA-256(…)[:20]` sans préimage WOTS+ : les atomes restent dans le carnet (`Σ utxo` inchangé), personne ne les dépensera (160 bits). Brûler les frais est **interdit** (`noeud.py` refuse de publier, `utxo.py` refuse le bloc) ; verser au trésor n'est pas un puits (`graine_tresor(h)` est publique) | `SPEC_PUITS.md` §1 |
| Le montant se prouve hors chaîne | feuille UTXO = `sha256d(txid ‖ rang ‖ adresse ‖ montant)`, `verifierPreuve` contre `utxo_root` | `merkle.ts`, `utxo.py` |
| La place dans les blocs | `MAX_ENVOIS = 8` → **192 tx/jour** pour tout le réseau ; une tx minimale 2 283 o, une sortie de plus **28 o** (81,5×) | `noeud.py:70`, `SPEC_PUITS.md` §2.4 |
| Le robinet | 1 IONOS par compte et par époque ; groupé depuis `26b78b3` : `MAX_PAIEMENTS = 64` joueurs par bloc en `MAX_RENDUS = 3` transactions — les « 3 024 joueurs par époque » de `SPEC_PUITS.md` §2.4 datent d'avant le groupement (**1 536 par jour** aujourd'hui, feuille de route §6 bis) | `noeud.py`, `robinet.py` |
| Le budget | `BUDGET_RATIO = 8` : `a·T/8` par époque = 5 040 IONOS à Satya, 120 IONOS/jour | `noeud.py:69`, `etat.json.robinet_budget_atomes` |
| Le frein manquant | `ajouter_envoi` n'a ni auteur ni quota (dette D7, A8 : un **montant plancher** recommandé) | `robinet.py:257` |
| Les prix retenus | P1 mise du sceau **4 IONOS / 64 actes**, P2 péage de lignée **1/4 IONOS** porté par la transaction d'échange (0 tx), P3 nom **2 IONOS** vers `A(nom) = sha256("eidos-nom/1" ‖ nom)[:20]` ; P4 porte gelé jusqu'à R2 (tenue le 2026-09-14 : le gel est levé), P5–P8 écartés par le chiffre | `SPEC_PUITS.md` §3, §6 |
| Le point fixe | `s = 0,1115` IONOS/joueur/jour → **1 076 joueurs** sur le budget, 8 609 sur l'émission ; bascule à N = 331 (avant : la capacité d'absorption borne, après : le trésor) | `SPEC_PUITS.md` §4 |
| La Moisson | budget 1/8 de l'émission, plafond **3a/2 par sillon** de 12 blocs (60 IONOS à Satya), **une transaction par sillon** (65,6 o par gerbe), claim par issue « moisson », relève par cron à la minute 27, trois verrous (un glaneur par sillon, adresse fraîche, semence dépensée), reliquat perdu | `SPEC_MOISSON.md` §5–§8 |

## 3. Ce que le format porte déjà, et ce qu'il faut regeler

Aucun champ nouveau : un puits est `[addr(20) atomes(8)]` dans `n_out`, une gerbe aussi. Ce qui manque est **partagé** entre Python et TS et doit donc entrer dans `vecteurs.json` — une famille `puits` : les quatre adresses fixes (`sceau`, `lignee`, `nom`, `porte`, calculées dans `SPEC_PUITS.md` §1 et jamais regelées), `A(nom)` pour trois noms d'essai (dont un avec accent : la normalisation Unicode du nom est **une décision**, A20), et la marque structurelle de la Moisson (`adr(sha256("<GRAINE>/glane/<h>"))`, distincte de `rendu/<h>/<k>` — sans elle `est_goutte` compterait une gerbe de 1 IONOS comme une goutte).

## 4. Chantiers, dans l'ordre — et ce qui les bloque

| PR | Contenu | Fichiers | Contrôles | Cible chiffrée | Ce qui le tue | Bloqué par |
|---|---|---|---|---|---|---|
| **E1 — mesurer** | les trois seaux dans `etat.json` : `tresor_atomes`, `hors_tresor_atomes`, `cendres_atomes` (les quatre adresses fixes), et `puits` = Σ brûlé / Σ versé ; famille `puits` de `vecteurs.json` | `noeud.py` (`ecrire_etat`), `vecteurs.py`, `vecteurs.test.ts`, README | 3 (`tresor + hors_tresor + cendres == emission_cumulee` ; trésor reconnu par dérivation ; aucune adresse de puits dans `cles_usees`) + la famille relue des deux côtés | `--verifier` inchangé, « aucun refus » ; 10 familles → 11 | un seau qui ne somme pas à l'émission : la dérivation du trésor est fausse quelque part | rien — **à faire d'abord** : c'est l'instrument |
| **E2 — le nom (P3)** | `nom.ts` : `adresseDuNom`, `estPris(etat, nom)` (lecture de `etat.json.sorties` par adresse), `nommer` → un envoi de 2 IONOS (le patron de `preparerRecuperation`) ; page Nom (registre Jouer), i18n FR/EN | `atelier/` seul | `nom.test.ts` : adresse = vecteur, nom pris/libre sur un `etat.json` figé, refus d'un nom vide ou > 64 octets, normalisation | zéro Python ; **0 tx dédiée** hors l'achat ; cliquet langue à 0 | un nom normalisé différemment des deux côtés : la famille `puits` le montrerait | E1 (le vecteur), A20 |
| **E3 — la Moisson** | `robinet.py --moisson --lot` (sillon, trois verrous, `MAX_GLANEURS = 128`), `moisson.yml` (minute 27), `noeud.py` `construire_moisson` (prorata au plus fort reste, une tx par sillon, `graine_glane`, `est_goutte` corrigé, aucun artefact), page Moisson (compte à rebours **en blocs**) | `robinet.py`, `noeud.py`, `moisson.yml`, `etat.json`, `atelier/` | 8 + 12 (liste dans `SPEC_MOISSON.md` §7 et §11 : chaque refus a son `doit_echouer`) | somme des gerbes = `min(N·G, 3a/2)` à l'atome ; 84 sillons pleins = `a·T/8`, le 85ᵉ refusé ; `sorties_tresor` non disputée avec le robinet ; +7,5 Mo/an de chaîne au plus | une gerbe comptée comme goutte ; une double dépense trésor robinet/Moisson dans un bloc ; le cron `moisson` qui fait la course avec la forge (groupe de concurrence `chaine`) | A9 (1 IONOS ou 0,25), A10 (courriel), et **E1** |
| **E4 — la mise du sceau (P1)** | le juge de CI impute chaque acte ancré (bataille, veillée) à une sortie brûlée ≥ 4 IONOS vers `A(sceau)` prouvée contre `utxo_root`, et refuse le 65ᵉ ; le décompte dans `veillees/index.json` | `depot.ts`, `veillee.ts` (la mise dans la preuve), `veillees.yml`, page Veillée | mise absente refusée ; 64 actes acceptés, le 65ᵉ refusé ; une mise ne sert qu'un joueur (adresse de la pièce d'ancrage = adresse qui a brûlé) | 0,0625 IONOS/joueur/jour ; **une tx par 64 actes** | un décompte qui **étend** ce que la preuve autorise (il ne peut que restreindre) | **C4 PR 6** (la preuve avec bataille), A6 |
| **E5 — le péage de lignée (P2)** | le juge de `lignee.ts` exige, pour tout maillon après l'origine, une sortie ≥ 1/4 IONOS vers `A(lignee)` **dans la transaction du maillon** | `lignee.ts`, `lignee.test.ts` | maillon sans péage refusé ; origine sans péage acceptée ; péage sur une autre tx refusé | 0 tx dédiée, 28 o par échange | — | **C7** (la lignée branchée), A7 |
| **E6 — l'appariement** | `gerbe = socle (0,25) + min(0,75 ; versé aux puits depuis la dernière gerbe)` | `noeud.py` | neutralité de la boucle | inflation nette 0,25 par glaneur et par sillon | — | E3 et E4 |

**La contrainte dure, à revérifier à chaque PR** : Σ des transactions dédiées (robinet ≤ 3, envois ≤ 8 par bloc ; Moisson 1 par 12 blocs) **reste sous 192 par jour**. Toute mécanique à une transaction par geste est morte d'avance (365 000 tx/an contre 70 080 possibles).

## 5. Décisions qui reviennent à l'auteur

| # | Question | Recommandation (celle des specs) |
|---|---|---|
| A6 | P1 par acte ou par mise ? | **la mise** (4 IONOS / 64 actes) ; le brûlage est la preuve, le décompte une figure |
| A7 | le péage est-il obligatoire ? | **oui, gratuit pour l'origine** |
| A8 | le canal `envoi` (D7) | **un montant plancher** par envoi, pas un frein par auteur |
| A9 | la gerbe : 1 IONOS ou 0,25 ? | **1 IONOS**, prorata au-delà de 60 glaneurs |
| A10 | la Moisson par courriel ? | **GitHub seul** au départ |
| A12 | `BUDGET_RATIO` 8 → 1 et `MAX_ENVOIS` 8 → 53 ? | seulement au-delà de ~1 000 joueurs, et **avant** : 640 Mo/an de chaîne |
| **A20** | la normalisation d'un nom (NFC ? minuscules ? espaces ?) — elle fixe l'adresse à jamais | NFC, tel quel sinon ; **regelée dans `vecteurs.json`** avant la première vente |
| **A21** | la caution de socle (`SPEC_PUITS.md` §7.4) : une réserve, jamais comptée comme absorption | à écarter tant que le marché n'existe pas |

## 6. Ce que ce handover ne couvre pas

La relève (remplaçante de la résurrection, `SPEC_PUITS.md` §6 — attend la permadeath, A5/V5), la porte de quartier (P4 : gelée par A2, levée par C2 ter, mais sans page pour la franchir tant que les sceaux ne sont pas branchés), et la baisse des prix aux changements d'âge (`SPEC_PUITS.md` LIMITE : rien n'est prévu, et l'âge suivant est dans 832 époques).

## 7. Comment on vérifie

```bash
python3 noeud.py --verifier                          # aucun refus, seaux publiés (E1)
python3 vecteurs.py && cd atelier && npm test        # famille puits relue des deux côtés
python3 robinet.py --test                            # 15 + les verrous de la Moisson (E3)
python3 -c "import noeud as N; N._test_moisson()"    # E3, 12 contrôles à écrire
```
