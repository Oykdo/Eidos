# Handover — P6, l'hygiène (C8, dette D8) et ce qui reste de D5

**Dépôt :** Oykdo/Eidos · **Rédigé le :** 2026-09-14, contre `9927508` · **Statut :** trois retouches sans format ni empreinte — dont **une qui n'est pas ce que `CLAUDE.md` §7 dit** : toucher `eonis.py`, même d'un commentaire, vaut réinitialisation du testnet
**Entrées :** `CLAUDE.md` §3 (`eonis.py` gelé), §6 (réinitialiser), §7 P6 · `FEUILLE_DE_ROUTE.md` D5, D8, C8 · `eonis.py:26` et `:63`, `utxo.py:151` (`merkle_root`), `merkle.ts`, `consensus.py`, `store.py`, `.github/workflows/tests.yml:73-84`, `federation.json:14`
**Ne change pas :** `genesis.json`, les trois empreintes du README, `FORMAT 3`, `vecteurs.json`, le testnet

---

## 1. L'idée en une phrase

Trois dettes d'entretien qu'on paie sans toucher à rien qui engage — et pour la première, **la seule façon de la payer sans réinitialiser le testnet est de ne pas la payer dans le fichier gelé**.

## 2. Les trois retouches, et ce que chacune coûte vraiment

### H1 — `getcontext().prec = 60`, global dans `eonis.py`

**Le fait.** `eonis.py:26` règle la précision `Decimal` **du processus entier** à l'import ; `dcos` (`:63`) lit `getcontext().prec` pour sa borne d'arrêt, `build_epoch_table` en dépend. `CLAUDE.md` §7 demande `with localcontext()` dans les deux fonctions.
**Ce que ça coûte, et que la feuille ne disait pas.** `eonis.py` est gelé : son SHA-256 (`2eb70acb…`) est dans `genesis.json` et le job `hygiene` le vérifie **octet par octet**. Passer à `localcontext()` — ou ajouter le commentaire de repli que C8 proposait — change l'empreinte, donc invalide la genèse, donc **réinitialise le testnet** (`CLAUDE.md` §6 : `eidos-testnet-4`, sept clés XMSS ≈ 5 min, `federation.json`, README, `genesis-data.ts`, et plus jamais forger depuis le poste).
**Ce que ça rapporte.** Rien en consensus : aucun autre module du dépôt n'utilise `Decimal` (grep : `eonis.py` seul ; les `Decimal` sous `atelier/docs/expé/` sont des fichiers d'une autre session, ignorés). Les chemins de consensus sont entiers ; `Decimal` ne sert qu'à **produire** la table figée, que `verify_genesis.py` recompute (32 contrôles).
**Recommandation.** **Ne pas toucher `eonis.py`.** Écrire le fait là où il se lit — `CLAUDE.md` §3 (une ligne sous « `eonis.py` est gelé ») et le docstring de `verify_genesis.py` : « précision globale, connue, inoffensive ; à passer en `localcontext()` **à la prochaine réinitialisation**, jamais seule ». Si l'auteur veut la payer maintenant, c'est une réinitialisation, décidée comme telle (A26), et elle se fait **avec** tout ce qui attend une réinitialisation — aujourd'hui rien d'autre.
**Ce qui le tue.** Un seul chiffre des tables qui bouge après `localcontext()` : on garde le global. À vérifier **avant** la réinitialisation, sur une copie : `verify_genesis.py` 32/32 avec le nouveau `eonis.py` et un `genesis.json` régénéré.

### H2 — CVE-2012-2459, la dernière feuille dupliquée

**Le fait.** `merkle_root` (`utxo.py:151`) et `merkleRoot` (`merkle.ts`) recopient la dernière feuille quand le niveau est impair (la règle de Bitcoin) : `[a, b, c]` et `[a, b, c, c]` ont **la même racine**. Dans Bitcoin, un bloc invalide (transaction dupliquée) pouvait ainsi porter la racine d'un bloc valide et l'empoisonner dans le cache des blocs rejetés.
**Pourquoi c'est bénin ici, et il faut l'écrire.** Pour la racine des transactions : une transaction dupliquée dans un bloc dépense deux fois les mêmes entrées, `Carnet.valider_bloc` la refuse (« double depense dans le bloc ») **avant** que la racine ne compte ; et la coinbase ne se duplique pas (une seule sans entrée acceptée). Pour la racine UTXO : les feuilles sont indexées par `(txid, rang)`, uniques par construction — un carnet ne peut pas contenir deux fois la même feuille, donc l'ambiguïté ne désigne aucun carnet possible. **L'argument ne tient qu'à cela** : il ne vaut pas pour un Merkle de verdicts, de figures ou d'actes de bataille, où deux feuilles égales sont possibles — à dire noir sur blanc pour qui bâtirait le prochain arbre (`HANDOVER_VEILLEE_BATAILLE.md`, PR 6).
**Le correctif.** Un paragraphe dans le docstring de `merkle_root` (`utxo.py`, non gelé), le même en tête de `merkle.ts`, et **un contrôle** dans `utxo.py` : un bloc à transaction dupliquée est refusé pour double dépense, et sa racine est bien celle du bloc sans doublon — le contrôle montre l'ambiguïté et le refus qui la couvre. `utxo.py` 16 → 17, README à jour.
**Ce qui le tue.** Le contrôle passe par une autre voie que « double depense » : alors la protection n'est pas celle qu'on croit, et il faut la nommer.

### H3 — `consensus.py` et `store.py` dans `historique/`

**Le fait.** Le chemin PoW (jouet d'origine, jamais mélangé au fédéré) vit à la racine, à côté du vrai ; `tests.yml` le lance (`python consensus.py`, 6 contrôles ; `store.py --init / --mine 2 / --pay / --verify`) ; les deux importent `eonis`, `utxo`, `wots` par `sys.path.insert(0, HERE)` ; `store.py` écrit `chaine.dat` (ignoré par `.gitignore`, interdit par le job `hygiene`).
**Le correctif.** `git mv` vers `historique/`, `HERE` → le parent dans les deux `sys.path.insert`, `tests.yml` et le job `hygiene` (`historique/chaine.dat`), `.gitignore`, README (tableau des fichiers, §« deux consensus ») et `CLAUDE.md` §2 et §4. Un `historique/README.md` de dix lignes : ce que c'est, pourquoi on ne l'étend pas.
**Ce qui le tue.** Rien — mais **ne pas en profiter** pour toucher au code PoW : il n'est pas mort, il est historique.

## 3. Ce qui reste de D5 (les textes périmés), à faire dans la même PR

| Texte | Il dit | Le code fait | Correctif |
|---|---|---|---|
| `federation.json:14` | `"format_chaine": 2` | `chaine-eidos.dat` porte `FORMAT 3` ; le champ n'est lu par personne (grep : aucun lecteur) | `3`, et un lecteur : `noeud.py` refuse au chargement un `format_chaine` ≠ `FORMAT` (**un contrôle**, sinon il dérivera de nouveau) |
| `SPEC_CHYMIE.md:3` | « aucune ligne de code de jeu écrite » | 12 espèces codées (`elixirs.ts`, `chymie.ts`) | l'en-tête |
| README, CLAUDE.md, feuille de route | compteurs de tests et de contrôles | 612 tests / 127 suites au 2026-09-14 ; `utxo.py` 17 après H2 | les mettre à jour **avec la commande qui les produit à côté** — la règle de D5 |

## 4. Chantier

Une seule PR, `hygiene-p6` : H2, H3, §3, et la ligne de `CLAUDE.md` §3 pour H1. **Aucun format, aucune empreinte, aucun vecteur.**
**Cible.** `verify_genesis.py` 32/32 (inchangé) ; `utxo.py` 17 ; `consensus.py` 6 depuis `historique/` ; `noeud.py --verifier` « aucun refus » ; `federation.py` 18 ; un contrôle sur `format_chaine` ; le job `hygiene` vert ; 612 tests atelier inchangés.
**Ce qui le tue.** L'empreinte d'`eonis.py` qui bouge (H1 fait par erreur), ou un `chaine.dat` qui réapparaît à la racine.

## 5. Décisions qui reviennent à l'auteur

| # | Question | Recommandation |
|---|---|---|
| **A26** | H1 maintenant, au prix d'une réinitialisation (`eidos-testnet-4`), ou à la prochaine réinitialisation, quelle qu'en soit la cause ? | **FAIT le 2026-09-15** : la réinitialisation `eidos-testnet-4` est venue d'ailleurs (l'unité renommée ionos, genèse regénérée), H1 l'a accompagnée ; tables inchangées, `verify_genesis.py` 32/32 |
| **A27** | `format_chaine` : le corriger seul, ou lui donner un lecteur qui refuse ? | **FAIT le 2026-09-15** : `noeud.config()` lit le champ et refuse tout écart avec `FORMAT` (`_test_config`, 2 contrôles) ; `federation.json` du testnet-4 dit 3 |

## 6. Comment on vérifie

```bash
python3 verify_genesis.py                 # 32 — toujours en premier ; l'empreinte d'eonis.py n'a pas bougé
python3 utxo.py                           # 17 après H2
python3 historique/consensus.py           # 6
python3 historique/store.py --init && python3 historique/store.py --mine 2 && python3 historique/store.py --pay && python3 historique/store.py --verify
python3 federation.py && python3 noeud.py --verifier
```
