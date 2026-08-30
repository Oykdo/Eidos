# L'intégration continue, expliquée

Note personnelle. Ce que fait la CI d'Eidos, pourquoi elle existe, et comment
la lire depuis un téléphone.

---

## 1. Le problème qu'elle résout

Vous avez sept fichiers et quarante-six vérifications automatiques. Aujourd'hui,
pour savoir si tout va bien, il faut ouvrir a-Shell et lancer cinq commandes à
la main. Vous le faites quand vous y pensez, sur un seul appareil, avec une
seule version de Python.

Le jour où vous corrigerez une virgule dans `utxo.py` depuis l'interface web de
GitHub — sans a-Shell sous la main — rien ne vous dira que vous venez de casser
la validation des signatures. Vous le découvrirez trois semaines plus tard.

L'intégration continue supprime ce délai. À chaque modification poussée sur le
dépôt, GitHub loue une machine, y installe Python, exécute vos tests, et affiche
une pastille verte ou rouge à côté du commit. C'est gratuit pour un dépôt public.

---

## 2. Ce que GitHub Actions fait, concrètement

Un **workflow** est un fichier YAML déposé dans `.github/workflows/`. GitHub le
lit à chaque événement déclencheur et exécute ce qu'il décrit.

Le vocabulaire, une fois pour toutes :

| Terme | Ce que c'est |
|---|---|
| **workflow** | le fichier entier |
| **job** (travail) | un bloc qui tourne sur sa propre machine neuve |
| **step** (étape) | une commande dans un job |
| **runner** | la machine louée, détruite à la fin |
| **matrix** (matrice) | multiplie un job sur plusieurs configurations |
| **artifact** | un fichier qu'un job produit et qu'un autre récupère |

Les jobs tournent en parallèle sauf si l'un déclare `needs:` un autre. Chaque
job part d'une machine vide : rien ne persiste entre eux, sauf par artifact.

Une étape échoue dès qu'une commande renvoie un code de sortie non nul. Un
`assert` Python qui casse, un `sys.exit("...")`, un `exit 1` en shell : tous
font rougir le workflow. C'est pour cela que vos suites de tests fonctionnent
telles quelles, sans adaptation — elles lèvent déjà des exceptions quand elles
échouent.

---

## 3. Ce que fait la CI d'Eidos

Quatre travaux.

### `suites` — les cinq suites de tests

Il exécute `verify_genesis.py`, `eonis.py`, `utxo.py`, `consensus.py`,
`federation.py`, puis l'aller-retour complet de `store.py` : création, minage,
paiement, rejeu intégral.

La matrice le décline sur **trois systèmes** (Linux, macOS, Windows) et **deux
versions de Python** (3.9 et 3.13), soit six exécutions. Python 3.9 est le
plancher : s'il casse, c'est que vous avez employé une syntaxe trop récente.

`fail-fast: false` demande à GitHub de ne pas tout interrompre à la première
erreur. Sinon vous verriez un seul échec au lieu de savoir si le problème touche
une plateforme ou toutes.

### `empreintes` puis `comparaison` — le contrôle qui compte vraiment

Celui-là justifie à lui seul le fichier.

Vous avez fait un choix de conception fort : ne pas utiliser `math.cos`, mais
recalculer le cosinus en `Decimal` par série de Taylor, parce que `math.cos`
dépend de la bibliothèque mathématique du système et peut diverger sur le
dernier bit. Deux nœuds qui calculent des récompenses différentes, c'est une
scission de chaîne.

Jusqu'ici, cette affirmation était un raisonnement. Maintenant elle est
**vérifiée à chaque commit** : chaque système calcule les quatre tables, publie
l'empreinte SHA-256 de sa version, et le job `comparaison` télécharge les trois
et exige qu'elles soient identiques. Une seule différence, et le workflow rougit.

C'est le genre de preuve qu'un auditeur demandera, et vous l'aurez déjà.

### `hygiene` — deux garde-fous

Le premier recalcule l'empreinte de `eonis.py` et la compare à celle inscrite
dans `genesis.json`. Toute modification du générateur — même un commentaire —
invalide la genèse, et vous l'apprendrez immédiatement plutôt qu'après l'avoir
publiée.

Le second refuse que `chaine.dat` ou `portefeuille.json` soient versionnés. Un
`.gitignore` n'empêche que les ajouts distraits ; il ne retire pas un fichier
déjà suivi. Ce contrôle, si.

---

## 4. Installation

Sur github.com, dépôt Oykdo/Eidos :

1. **Add file** → **Create new file**
2. Dans le champ du nom, tapez exactement : `.github/workflows/tests.yml`
   Les barres obliques créent les dossiers automatiquement.
3. Collez le contenu de `tests.yml`.
4. **Commit changes**.

Le workflow se déclenche immédiatement, puisque le commit est lui-même un push.

Attention à un piège : l'indentation YAML est **significative**, et uniquement
en espaces — jamais de tabulation. Si le clavier iOS reformate le collage, GitHub
signale une erreur de syntaxe dans l'onglet Actions plutôt que d'exécuter quoi
que ce soit.

---

## 5. Lire les résultats depuis le téléphone

L'onglet **Actions** liste les exécutions, la plus récente en haut. Touchez-en
une pour voir les huit travaux, chacun avec sa pastille. Touchez un travail pour
dérouler ses étapes, et une étape pour lire sa sortie complète — la même que
dans a-Shell.

Les pastilles apparaissent aussi à côté de chaque commit dans l'historique.
Vert : les quarante-six vérifications passent partout. Rouge : quelque chose est
cassé, et l'étape fautive est nommée.

Ajoutez le badge en haut du README pour l'afficher publiquement :

```markdown
[![tests](https://github.com/Oykdo/Eidos/actions/workflows/tests.yml/badge.svg)](https://github.com/Oykdo/Eidos/actions/workflows/tests.yml)
```

---

## 6. Ce qu'il faut savoir d'autre

**Coût.** Illimité et gratuit sur un dépôt public. Sur un dépôt privé, les
minutes sont comptées, et macOS comme Windows consomment plusieurs fois le tarif
de Linux.

**Durée.** Comptez deux à quatre minutes. La lenteur vient de `verify_genesis.py`,
qui recalcule 4 032 cosinus à soixante chiffres — c'est le prix du déterminisme,
et il est payé une fois par machine, pas à chaque bloc.

**Sécurité.** Un workflow s'exécute avec les droits du dépôt. N'y placez jamais
de clé en clair : GitHub fournit des *secrets* pour cela. La CI d'Eidos n'en a
besoin d'aucun.

**Épinglage.** `actions/checkout@v4` désigne une version majeure. Si un jour un
workflow casse sans que vous ayez touché au code, c'est souvent qu'une action a
changé — regardez d'abord de ce côté.

---

## 7. Ce que ça ne fait pas

La CI vérifie que votre code fait ce que vos tests décrivent. Elle ne vérifie
pas que vos tests décrivent la bonne chose.

Souvenez-vous du test de recul du compteur MSS : il passait alors qu'il aurait
dû échouer, parce qu'il visait un indice jamais employé. Le validateur était
correct, le test était faux — et une CI verte n'y aurait rien vu. Elle protège
contre la régression, pas contre l'erreur de raisonnement.

Elle ne remplace pas non plus un audit externe. C'est un filet, pas une preuve.
