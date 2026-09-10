# Spécification — Les neuf muses : la classe qu'Eidos avait déjà

**Dépôt :** Oykdo/Eidos
**Statut :** proposition, 2026-09-10. Aucun code écrit. Décision 4 tranchée par la mesure le jour même. Les mesures du §1 sont reproductibles avec `combatDe`.
**Périmètre :** `atelier/` seulement. Le nœud, la chaîne, le carnet, `eonis.py`, `genesis.json` ne changent pas d'un octet.
**S'appuie sur :** `combat.ts`, `signatures.ts`, `capsules.ts`, `hotes.ts`, `fiche.ts`, `feuille-son.ts`, `bestiaire.ts`, `orbites.ts`

---

## 0. En cinq lignes

Les neuf muses sont partout dans le lore et presque nulle part dans le jeu. Or `combat.ts:64` fait déjà d'elles
la pièce la plus lourde du système : **la muse permute les quatre axes**. Le même mot devient un colosse sous
Uranie, une lame sous Polymnie, un archer sous Euterpe. Personne ne le sait, personne ne le voit, personne ne
peut le choisir. Cette spec ne propose pas d'inventer une mécanique : elle propose de **rendre visible et
gouvernable celle qui existe** — et qui se trouve être la seule progression que la loi de conservation autorise.

## 1. Ce que la muse fait déjà, et que personne ne voit

`combatDe` procède en trois temps (`combat.ts:60-70`) : il dépaquette le mot en quaternion, alloue les 64 points
au plus fort reste selon `|q₀|,|q₁|,|q₂|,|q₃|`, puis **applique `PERM[archetype]`** — une permutation des quatre
axes, propre à chaque muse.

Un seul mot, les neuf muses, mesuré :

| muse | astre | lame | ecu | eperon | arc | pointe |
|---|---|---|---|---|---|---|
| Uranie | ★ | 2 | **47** | 14 | 1 | ecu |
| Polymnie | ♄ | **47** | 1 | 2 | 14 | lame |
| Euterpe | ♃ | 1 | 14 | 2 | **47** | arc |
| Érato | ♂ | 1 | **47** | 14 | 2 | ecu |
| Melpomène | ☉ | 14 | 2 | **47** | 1 | eperon |
| Terpsichore | ♀ | **47** | 2 | 1 | 14 | lame |
| Calliope | ☿ | 14 | 2 | 1 | **47** | arc |
| Clio | ☽ | 2 | 1 | 14 | **47** | arc |
| Thalie | ⊕ | 14 | 1 | **47** | 2 | eperon |

**Le même mot donne un colosse, une lame, un archer ou un coureur selon sa muse.** La somme reste 64 dans les
neuf cas — la loi tient à l'octet — mais le jeu qu'on en tire n'a rien à voir. C'est, littéralement, un système
de classes, et il est déjà codé.

## 2. La thèse

`SPEC_TACTIQUE.md` §5 énonce le vœu : **« recruter, pas monter »** — une progression qui soit un roster et non
une courbe. Ce vœu n'a pas de mécanique. La muse en est une, et elle est la seule qui soit **conforme par
construction** :

> Deux objets du même mot sous deux muses portent **le même budget**, à un point près : jamais.
> Ce qui change est **où** ils le portent. Aucune inflation n'est possible, non pas parce qu'on s'en
> abstient, mais parce qu'une permutation est une bijection sur quatre cases.

C'est la réponse exacte à la question restée ouverte toute la journée — *comment faire varier la puissance sans
la faire enfler* — et la réponse était dans le dépôt depuis le début.

**Et elle corrige un défaut mesuré.** `ETUDE_EQUILIBRAGE_TACTIQUE` a établi qu'un mot extrême est plus faible
qu'un mot équilibré (19,5 % de victoires contre 55,6 %), parce que abattre demande de tenir *et* de frapper.
La muse ne corrige pas ce déséquilibre — elle le rend **jouable** : un mot très concentré est mauvais partout,
sauf sur l'axe où sa muse le pose. Choisir la muse, c'est choisir la niche.

## 3. Trois usages, du moins cher au plus cher

### 3.1 Voir — la muse est la classe (coût : un paragraphe de fiche)

`fiche.ts:161` lit déjà `o.archetype as SignatureId`. Il manque une phrase : **« Euterpe fait de ce mot un
archer ; sous Polymnie il serait une lame. »** Rien à calculer — `combatDe({...o, archetype})` sur les neuf
donne la table, et c'est une **lecture**, donc gratuite et sans engagement.

C'est le meilleur rapport gratification / lignes de tout le corpus : le joueur découvre d'un coup que ses objets
ont une nature, et que cette nature a un nom qu'il connaît déjà.

### 3.2 Choisir — la muse à la naissance (coût : un lot)

**Ce qu'on ne fera pas, et pourquoi : tourner la muse d'un objet existant.** La première version de cette spec
le proposait ; la mesure l'a tuée. `feuilleObjet` hache **le mot, l'archétype et l'âge** (`objets.ts:180-188`) :

```
un seul mot, quatre muses
  Uranie     sceau ○·○ ☽○· ○○· ☽✚· ○   espèce sel
  Polymnie   sceau ☽·· ☽○· ··○ ○·· ·   espèce sel
  Euterpe    sceau ○☽✚ ○☽○ ○✚☽ ○○○ ☽   espèce soufre   ← l'élixir a changé d'espèce
  Érato      sceau ○·○ ··○ ○☽○ ☽☽✚ ☽   espèce sel
```

Changer la muse change donc la feuille, et par elle : le **sceau glyptique** (`sceauObjet`), la place de l'objet
dans la **racine Merkle** du coffre (`racineObjets`), et — le plus brutal — **l'espèce d'un élixir**, puisque
`codeGlypheDe` lit `feuilleObjet(o)[0] >>> 2` (`elixirs.ts:184`). Un élixir qui tourne devient un autre élixir.
C'est une mutation d'identité, exactement ce que la loi « un objet ne mute pas » interdit.

**Ce qu'on fait à la place.** La muse se choisit **quand l'objet naît**, jamais après.
`capsuleDepuisGraine(graine, âge, hauteur, archetype)` le sait déjà faire (`capsules.ts:88`, substitution
l. 94) : rien ne mute, aucune feuille ne bouge, aucun sceau ne change. On obtient un objet **différent**, ce qui
est le sens littéral de « recruter, pas monter ».

C'est aussi la règle que la pierre suit déjà : `composer` ne modifie pas une pièce, elle en **fait une autre**,
et l'ancienne est consommée. La muse suit le même patron, et le corpus reste cohérent.

| | la pierre (`composer`) | la muse à la naissance |
|---|---|---|
| ce qui change | le mot, donc l'orbite et le plafond | **la permutation des axes** |
| l'objet est-il le même ? | non, c'en est un autre | **non plus** — et c'est voulu |
| peut-elle enfler ? | elle déplace le plafond | **non, jamais** : 64 sous les neuf |
| l'ancien survit-il ? | non, consommé | à trancher (§6.3) |

Le lore l'accueille sans une ligne neuve : **Érato est la forgeronne**, elle tient ♂/mars, et `SPEC_CHYMIE.md`
§8 cherchait déjà où poser sa forge spéciale — *« la mesure dit salle 9, le lore dit 6, la halle d'Érato »*.

### 3.3 Mériter — les neuf faveurs (coût : le vrai chantier)

Chaque muse tient un sous-système qui **existe déjà**. Une faveur ne donne jamais de puissance : elle donne un
**service**, ce que la loi n'interdit nulle part.

| muse | ce qu'elle tient déjà | la faveur proposée |
|---|---|---|
| **Thalie** ⊕ | l'étage 0, la porte de la ville | le stash de ville s'ouvre plus large |
| **Clio** ☽ | l'archiviste, le journal | un **point de reprise signé** — la borne sur N de la lignée |
| **Calliope** ☿ | l'apothicaire, les élixirs | boire un second élixir dans la même salle |
| **Terpsichore** ♀ | déjà une porte dans `bestiaire.ts:193` | l'offrande, étendue au-delà de venus |
| **Melpomène** ☉ | la tragédienne | le fantôme d'un mort porte son dernier geste |
| **Érato** ♂ | la forgeronne | **faire naître un objet sous la muse voulue** (§3.2) |
| **Euterpe** ♃ | une hauteur en hertz (`feuille-son.ts`) | la salle sonne ce qu'elle contient avant d'entrer |
| **Polymnie** ♄ | la gardienne des hymnes | déposer une preuve sans issue GitHub |
| **Uranie** ★ | l'étage 254, elle lit la tête | **la télégraphie à deux tours** au lieu d'un |

Aucune de ces faveurs n'ajoute un point à un axe. Toutes changent ce qu'on peut **faire**, jamais ce qu'on
**pèse**.

## 4. Comment une faveur se gagne

La règle doit être dérivée, pas décrétée. Trois candidates, à trancher (§6) :

1. **Par la bande.** Les neuf bandes de la Tour sont les neuf muses (255 étages / 9). Franchir la bande d'une
   muse gagne sa faveur. Dérivé de `biomeDe`, rien à écrire.
2. **Par le roster.** Tenir *k* objets d'une muse gagne sa faveur. Dérivé de `archetype`, rien à écrire — mais
   ça favorise l'accumulation, que `SPEC_TACTIQUE` §9 bis surveille.
3. **Par l'hôte.** Chaque muse a un hôte (`hotes.ts`, un étage sur sept) ; le satisfaire gagne sa faveur. C'est
   déjà le patron du dépôt — « chacun demande quelque chose qui se lit dans votre coffre et donne un objet, une
   fois par coffre ».

**Recommandation : (3).** Elle réemploie tout ce qui existe, elle est bornée par coffre, et elle donne à chaque
muse une scène plutôt qu'un compteur.

## 5. Ce que ça coûte

- **§3.1 — voir** : une fonction `musesDe(objet)` qui rend les neuf lectures, et un bloc de fiche. Une centaine
  de lignes, aucun risque, aucune règle nouvelle.
- **§3.2 — choisir** : un geste de forge qui **fabrique** un objet sous la muse voulue, son prix en lumens
  (`SPEC_CHYMIE` §7 a le barème), et un contrôle qui vérifie qu'**aucun objet existant n'est modifié**. Le
  vecteur gelé de `vecteurs.json` n'est pas touché.
- **§3.3 — mériter** : neuf faveurs, donc neuf branchements dans neuf sous-systèmes. C'est un chantier par
  faveur, pas un chantier de neuf.

## 6. Décisions à trancher

1. **Comment se gagne une faveur** — bande, roster, ou hôte. *Recommandation : l'hôte (§4.3).*
2. **Une faveur se perd-elle ?** Si elle est acquise pour toujours, un joueur ancien a neuf services qu'un
   nouveau n'a pas — ce n'est pas de la puissance, mais c'en est le voisinage. *Recommandation : acquise par
   coffre, comme les dons d'hôte, et perdue avec le coffre.*
3. **L'objet d'origine survit-il ?** La pierre consomme la pierre. Si naître sous une muse est gratuit et
   répétable sur le même mot, le joueur fabrique les neuf et garde la meilleure — ce qui **tue la niche** que le
   §2 défend. *Recommandation : le mot d'origine est consommé, comme pour la pierre.*
4. **TRANCHÉE le 2026-09-10, par la mesure.** La muse entre bien dans `feuilleObjet`, donc dans le sceau
   glyptique, la racine Merkle du coffre et l'espèce d'un élixir. **On ne tourne pas la muse d'un objet
   existant** ; on la choisit à la naissance (§3.2). La spec est livrable en l'état.
5. **Le mot « sceau » désigne deux choses.** `sceauObjet` est une lecture qui n'ouvre rien
   (*« INTERDIT : en faire une KDF, une graine, une clé »*) ; le sceau de `sceaux.ts` ouvre les portes 64, 128,
   192. Troisième collision de vocabulaire du dépôt après `trouvaille` et `lumen`. *À traiter hors de cette
   spec.*

## 7. Kill criteria, à écrire avec le code

1. **La somme reste 64** sous les neuf muses, pour mille mots tirés. Si une seule permutation la casse, tout tombe.
2. **Aucun objet existant n'est modifié.** Naître sous une muse crée un objet neuf ; tout objet déjà au coffre
   garde son mot, son archétype, sa feuille et son sceau, à l'octet. Le contrôle compare `racineObjets` du
   coffre avant et après, hors le nouvel objet.
3. **La permutation est une bijection** : les neuf lectures d'un mot sont des permutations les unes des autres,
   au multiensemble près.
4. **Aucune muse ne domine.** Taux de victoire par muse sur le banc, à mots égaux : bande sous **5 points**.
   C'est la cible qui tue le lot — si une muse gagne, elle n'est plus une forme, c'est une puissance.
5. **La niche existe.** Un mot très concentré doit gagner *davantage* sous la muse qui le pose sur son axe fort
   que sous les huit autres. Écart attendu > 10 points ; s'il est nul, la muse ne sert à rien.
6. **Aucun effet sur la chaîne** : `noeud.py --verifier` et les dix familles de `vecteurs.json` inchangés.

## LIMITE

- **La décision 4 a été vérifiée et elle a tué une moitié de la spec.** La muse entre dans `feuilleObjet` ;
  tourner un objet existant changerait son sceau, sa place dans la racine du coffre et, pour un élixir, son
  espèce. Le §3.2 a été réécrit en conséquence. Ce qui reste debout — voir, choisir à la naissance, mériter —
  ne touche aucune feuille.
- **Rien n'est mesuré.** Le tableau du §1 est une lecture exacte de `combatDe`, mais **aucune muse n'a jamais
  été mesurée au banc** : les cibles 4 et 5 du §7 sont des prédictions de conception, pas des résultats.
- **Neuf faveurs, c'est neuf chantiers.** Le §3.3 est un programme, pas un lot. Ne pas l'ouvrir avant que §3.1
  ait montré que le joueur s'intéresse à ses muses.
- **Figures ≠ preuves.** La muse, la pointe, la niche, la faveur : des lectures. Seuls le carnet, la chaîne et
  les signatures engagent.
