# Handover — La lignée branchée, puis le forum (C7)

**Dépôt :** Oykdo/Eidos · **Rédigé le :** 2026-09-14, contre `9927508` · **Statut :** la règle est **codée et testée** (`lignee.ts`, 12 contrôles) et **aucun importateur ne l'appelle** ; le forum est spécifié (`SPEC_FORUM.md`), zéro ligne
**Entrées :** `ETUDE_ECHANGE_OBJETS.md` §7 (option d, exigence d'auteur du 2026-09-08) · `SPEC_FORUM.md` §4–§9 · `lignee.ts`, `coffre-horaire.ts` (`reclamerDansCoffre`), `envoi.ts` (`signerEnvoi`, `deserTx`), `chaine-reseau.ts` (`lireTetes`), `inventaire.ts`, `types.ts` (`ObjetPorte`) · `FEUILLE_DE_ROUTE.md` C7, A7
**Ne change pas :** `noeud.py`, `utxo.py`, la validation, `FORMAT 3`, `vecteurs.json` (jusqu'à L2 : une famille `lignee` s'y ajoute alors) — **aucune règle de consensus** : la duplication échoue parce que c'est une double dépense

---

## 1. L'idée en une phrase

Un objet est **tenu par une sortie** ; changer de mains, c'est **dépenser cette sortie** vers quelqu'un d'autre, et le maillon cite la transaction qui la dépense : deux lignées depuis la même origine exigeraient de dépenser deux fois la même sortie, ce que le nœud refuse déjà. Il reste à **brancher** cette règle sur l'inventaire, l'envoi et une page — puis à laisser deux joueurs se rencontrer.

## 2. Ce qui existe déjà

| Besoin | Déjà là | Où |
|---|---|---|
| La règle | `origine = sha256d(tag ‖ id_bloc ‖ txid ‖ rang ‖ j)`, `maillon_k = sha256d(tag ‖ maillon_{k−1} ‖ txid_k ‖ rang_k)` où `txid_k` **dépense** la sortie tenue ; `jugerLignee(l, regard)` : l'arithmétique d'abord, la chaîne ensuite ; `Regard = { inclus(txid), nonDepensee(tenue) }` **passé en paramètre** ; `octetsLignee` mesure le coût | `lignee.ts` (12 contrôles) |
| Le maillon porte son corps | `Maillon = { core: hex, rang }` : le corps canonique de la transaction prouve son `txid` et ce qu'elle dépense sans rien demander au réseau (`lireCore`) | `lignee.ts` |
| L'origine est déjà unique | le coffre horaire : `jugerClaim` refuse un même coffre réclamé deux fois ; la clé `txid:rang@id_bloc` est notée dans `tour.coffres` ; les `t` objets tirés (`j` = 0…t−1) entrent dans `coffre.objets` **sans porter leur origine** | `coffre-horaire.ts` (`reclamerDansCoffre`) |
| Répondre à `inclus` | `lireTetes` recalcule le `txid` de chaque transaction de `chaine-eidos.dat` pour rebâtir la racine Merkle — il suffit de **garder ces txids** (un `Set`) au lieu de les jeter | `chaine-reseau.ts` |
| Répondre à `nonDepensee` | `etat.json.sorties` à la tête suivie, `preuveReseau` contre `utxo_root` | `store.ts`, `merkle.ts` |
| Dépenser vers quelqu'un | `signerEnvoi(graine, [sorties], adresse, montant, frais, …)` → texte `-----EIDOS-----` → issue « envoi » (`MAX_TX_CARACTERES = 80 000`, `MAX_ENVOIS = 8` par bloc) ; `deserTx` relit à l'octet ; un témoin absent se sérialise `flag = 0` (le format de l'offre à deux témoins existe déjà) | `envoi.ts`, `robinet.py` |
| L'échange atomique | une transaction à **deux entrées, deux témoins** sur le même `txid` : une offre = le cœur signé par Alice seule ; l'acceptation = le témoin de Bob sur le **même** cœur ; refuser coûte une clé à Alice — l'offre est un engagement | `SPEC_FORUM.md` §4 |

## 3. Trois faits que le branchement doit dire au joueur avant qu'il signe

1. **Une pièce tient plusieurs objets.** Un coffre horaire réclamé sur la pièce `(txid, rang)` donne jusqu'à 9 objets, **tous tenus par la même sortie**. La dépenser les déplace tous : chacun doit recevoir un maillon — vers le receveur, ou vers **sa propre monnaie rendue** — sans quoi il est **brûlé** (`lignee.ts`, LIMITE). Conséquence : **tout envoi** qui dépense une pièce porteuse doit poser les maillons de ce qu'elle porte, même quand on ne donne rien. C'est `envoi.ts` et la page Envoi qui changent, pas seulement une page neuve.
2. **Donner coûte une transaction, et 28 octets par objet de plus** : N objets vers N sorties d'une même transaction (rangs distincts), la même arithmétique que le robinet groupé. Une sortie vaut au moins 1 atome (« sortie nulle » refusée).
3. **La lignée prouve le passage de mains, jamais le troc** : rien ne garantit qu'un vendeur soit payé hors de l'échange à deux témoins (§2, dernière ligne). Un don est sûr ; une vente l'est seulement par l'offre partielle.

## 4. Chantiers, dans l'ordre

| PR | Contenu | Fichiers | Contrôles | Cible chiffrée | Ce qui le tue |
|---|---|---|---|---|---|
| **L1 — l'origine sur l'objet** | `ObjetPorte.lignee?: Lignee` posé par `reclamerDansCoffre` (origine = clé du claim + `j`), relu par `jauge.ts` (`normaliserObjets`), affiché à l'inventaire (« tenu par la pièce … », « objet de jauge : ne se transfère pas ») ; `chaine-reseau.ts` garde les txids par bloc ; un `Regard` réel : `regardDuReseau(chaine, reseau)` | `types.ts`, `coffre-horaire.ts`, `jauge.ts`, `chaine-reseau.ts`, `lecture.ts` ou `inventaire.ts`, `i18n.ts` | claim → 9 objets avec 9 origines distinctes ; un objet de don sans lignée ; jauge relue à l'octet ; `inclus` vrai pour un txid de la chaîne réelle, faux sinon ; 612 + n tests | **0 dépendance** ; `jugerLignee` sur les objets d'un vrai claim : `ok`, `echanges = 0` | un claim déjà en jauge sans clé de coffre (jauges d'avant le coffre horaire) : ces objets restent de jauge, dit tel quel |
| **L2 — donner** | `donner(coffre, objets[], adresse)` : une transaction qui dépense la pièce tenante, N sorties d'1 atome (un objet chacune) + la monnaie rendue **avec les maillons des objets gardés** ; l'export `eidos-objet/1` (JSON : origine, maillons) ; `importer(texte, regard)` chez le receveur → `jugerLignee` puis l'objet entre au coffre avec sa lignée ; l'envoi ordinaire pose lui aussi les maillons des objets gardés ; famille `lignee` dans `vecteurs.json` (origine, deux maillons, refus de duplication) relue par Python | `lignee.ts` (sérialisation), `envoi.ts`, `coffre.ts`/`store.ts`, page Envoi (registre Vérifier), `vecteurs.py`, `vecteurs.test.ts`, `i18n.ts` | après envoi : le receveur juge `ok`, l'émetteur ne tient plus (kill 5 de l'étude) ; un envoi qui oublie un objet le déclare **brûlé** avant signature ; l'export relu à l'octet ; duplication refusée par le juge (kill 2) ; `noeud.py --verifier` inchangé (kill 6) | un objet change de mains **en une transaction** ; N objets en **un créneau et 28·N octets** ; taille et temps de jugement mesurés à N = 1, 8, 64 échanges (kill 7) — attendu ≈ 200 caractères par maillon, soit 13 Ko à 64 | un export à N échanges au-delà de ce qu'une pièce jointe ou un gist porte (2 Mo ≈ 10 000 maillons : la borne sur N, plafond ou point de reprise, n'est pas à trancher avant) |
| **L3 — le péage** | E5 de `HANDOVER_PUITS.md` : une sortie ≥ 1/4 EIDL vers `A(lignee)` dans la transaction de tout maillon après l'origine | `lignee.ts` | trois refus | 0 tx dédiée | — (A7 tranché : obligatoire, gratuit pour l'origine) |
| **L4 — l'offre à deux témoins** | `forum.ts` : `offreDe(coffre, pièce, demande)` → cœur à deux entrées, témoin 0 seul (`flag = 0` pour le 1) ; `lireOffre`, `jugerOffre` (intégrité = la lignée, possession = `nonDepensee`) ; `accepterOffre` → témoin 1 sur le même cœur, texte d'issue « envoi » ; les maillons des deux objets **rang à rang** dans la même transaction | `forum.ts`, `envoi.ts` (signer une entrée seule), `forum.test.ts`, page Forum (registre Lire) | offre relue à l'octet avec un témoin absent ; l'acceptation garde le `txid` ; un octet du cœur changé invalide les deux témoins ; pièce dépensée → « possession : non » ; refus d'une offre dont l'objet est de jauge (F6) | une vente = **une** transaction, atomique par construction ; frein : une offre publique par identité et par époque (F5) | `noeud.py` refuse une transaction à deux témoins pour une raison que les tests n'avaient pas vue (aller-retour `deserTx` ↔ `deser_tx` à contrôler **avant**, dans `vecteurs.json`) |
| **L5 — l'affichage** | la liste des offres ouvertes : discussion GitHub « forum » (F3), l'identité de royaume en étiquette seule (F4 : aucune vérification Dilithium dans Eidos), expiration à la dépense de la pièce ou après `EXPIRATION_ENVOI` | hors dépôt pour l'essentiel ; page Forum | — | — | — |

Ordre : **L1 → L2 → L3** (avec E5) → L4 → L5. L1 et L2 ne touchent aucune règle du nœud.

## 5. Ce que la lignée rend caduc dans `SPEC_FORUM.md`, à dire

`SPEC_FORUM.md` §3 (F1, F2) faisait naître un objet **à chaque témoin** d'une dépense réelle (`sha256d("eidos-tirage/1" ‖ sig ‖ hash_bloc)`) et le portait rang à rang **dans le nœud** (`etat.json.objets`). L'option (d) retenue le 2026-09-08 (`ETUDE_ECHANGE_OBJETS.md` §7) fait naître l'objet **au coffre horaire** et le porte **hors chaîne**, dans un fichier jugé par l'atelier : le nœud n'apprend rien, `etat.json` ne publie rien. Les deux modèles ne se cumulent pas. **F1 et F2 sont donc remplacés par la lignée** (A22, à confirmer par l'auteur) ; F3, F4, F5, F6 tiennent ; F7 (le signe de `paqueter`, A12) reste préalable à tout port Python d'`objets.ts` — et la lignée n'en exige aucun.

## 6. Décisions qui reviennent à l'auteur

| # | Question | Recommandation |
|---|---|---|
| **A22** | F1–F2 (naissance par témoin, portage dans le nœud) sont-ils abandonnés au profit de la lignée ? | **oui** : un seul modèle, hors chaîne, zéro Python |
| A7 | le péage (L3) | tranché : obligatoire, gratuit pour l'origine |
| **A23** | la borne sur N échanges : plafond, point de reprise signé, ou rien ? | **rien avant la mesure de L2** (kill 7) ; à 200 caractères par maillon la borne ne mord pas avant des milliers d'échanges |
| **A24** | un objet de don, de fouille, de capture ou d'hôte reste-t-il inéchangeable à jamais (F6), ou le coffre horaire est-il la seule porte vers l'échange ? | **F6 tel quel** : « ancrer » un objet de jauge serait une déclaration, et rien ne se croit |
| **A25** | l'identité du forum : le `vault_id` d'Eidolon en étiquette (F4), ou l'adresse Eidos seule ? | **l'adresse seule dans Eidos** ; l'étiquette vit là où elle se prouve |

## 7. Ce que ce handover ne couvre pas

Le péage tarifé (`HANDOVER_PUITS.md` E5), la valeur (aucune : réseau d'essai), un serveur d'échange ou un séquestre (il n'y en aura pas), la fiche des objets échangés (`fiche.ts` les lit comme les autres).

## 8. Comment on vérifie

```bash
cd atelier && npm run typecheck && npm test         # lignee.test.ts 12 → 12 + n
python3 vecteurs.py && npm test                     # famille lignee relue des deux côtés (L2)
python3 noeud.py --verifier                         # inchangé : aucune règle de consensus
npm run langue                                      # le cliquet reste à 0
```
