# Les puits — à quoi sert l'eidôlon

**Dépôt :** Oykdo/Eidos · **Statut :** conception côté demande, aucune ligne de code · **Branche :** à ouvrir
**Périmètre :** `atelier/`, un juge de dépôt en CI, deux constantes de politique du nœud (`MAX_ENVOIS`, `BUDGET_RATIO`).
**Ne change pas :** `eonis.py`, `genesis.json`, `utxo.py`, la validation, `FORMAT 3`, le format `Tx`, `vecteurs.json`.
**S'appuie sur :** `utxo.py:196-275`, `noeud.py:261-278` et `:707-745`, `robinet.py`, `wots.py:182`, `merkle.ts`, `ancrage.ts`, `SPEC_SYBIL.md` §2 et §5.2, `SPEC_TACTIQUE.md` §9 bis, `SPEC_CRAFT.md` §3.4, `ETUDE_ECHANGE_OBJETS.md` §7.1, `SPEC_COFFRE_HORAIRE.md`.
**Ne touche pas :** le gain des 12 h (`SPEC_MOISSON.md`, autre agent). Ce document ne fixe que ce qui *absorbe*, et la contrainte que la moisson doit respecter (§4).
**Règle de lecture :** aucune phrase sans chiffre. Mesures : `etat.json` à la hauteur 45, `eonis.py`, scratchpad.

## 0. En cinq lignes
Il n'existe qu'**un seul endroit** où des atomes sortent de portée sans casser la conservation : une **adresse de 20 octets sans clé connue**. Brûler les frais est interdit — `en_circulation == emission_cumulee` (`noeud.py:738`) tomberait ; brûler vers le trésor ne brûle rien — sa graine est publique (`noeud.py:276`, « les fonds sont dépensables par quiconque »).
La rareté d'Eidos n'est pas la monnaie : c'est **192 transactions par jour** (`MAX_ENVOIS = 8`) et **120 EIDL par jour** (`a·T/8`). Un puits granulaire — un micro-paiement par craft, par sertissure, par fantôme — **ne rentre pas dans les blocs**. Les seuls puits possibles sont **gros et rares**, ou **gratuits en place** (une sortie de plus, 28 o contre 2 283 o pour une transaction : **81,5×**).
Trois puits suffisent : la **mise du sceau** (0,0625 EIDL/joueur/jour), le **péage de lignée** (0,025), le **nom** (0,016). Point fixe à **s = 0,1115 EIDL/joueur/jour**, soit **1 076 joueurs** sur le budget actuel et **8 609** sur l'émission entière.
Le puits le plus toxique, et il est écarté : la **résurrection**. Elle rachète la permadeath, qui est aujourd'hui le seul puits *réel* du jeu.

---

## 1. Le fait technique qui commande tout : où des atomes peuvent aller

Trois destinations, une seule tient.

| destination | Σ utxo | revient ? | verdict |
|---|---|---|---|
| **frais non recyclés** (coinbase = `reward_at(h)` seul) | Σ utxo = émission − frais | non | **interdit** : `noeud.py:744` refuse la publication, `utxo.py:261` refuse le bloc |
| **retour au trésor** | inchangé | **oui** : le robinet reverse, et `graine_tresor(h) = sha256("eidos-testnet-3/tresor/<h>")` est publique | **pas un puits** |
| **adresse sans clé** (20 o sans préimage WOTS+) | **inchangé** | non : dépenser exige `graine_pub‖racine_L` dont `sha256(...)[:20]` vaut l'adresse — **160 bits** | **le seul puits** |

Un brûlage est donc une **sortie ordinaire** : `utxo.py:196-275` n'impose rien sur l'adresse d'une sortie (`sortie nulle ou négative` est le seul refus, ligne 251). Les atomes restent dans `carnet.utxo`, la conservation tient à l'atome, `--verifier` ne change pas d'une ligne, et le puits **se lit dans le carnet** — c'est une preuve, pas une figure.

Les adresses, dérivées sans clé et vérifiables par quiconque :

```
A(nom) = SHA-256("eidos-puits/1/" ‖ nom)[:20]
  sceau    90b0a33c18ddcaa522d12392e6aae18289ea6b6f
  lignee   0e5cb5de6baaea47167b6f5efd7705c53cb07321
  nom      fb1c9d6db75ac3b31f1a321a42c6dd09cdea2637
  porte    a4c07e900075b1db9067366b3274f3257f972333
```

Chacune se lit en **27 glyphes de charge** par `encode_glyphs` comme n'importe quelle adresse. Elles ne sont jamais dans `cles_usees` : rien n'y est jamais dépensé.

**Le montant est prouvable hors chaîne.** La feuille UTXO vaut `sha256d(txid ‖ rang(4) ‖ adresse ‖ montant(8))` : un juge prouve « cette sortie de *m* atomes est allée à `A(sceau)` » contre `utxo_root`, avec `verifierPreuve` déjà écrit. Aucune règle de consensus nouvelle, aucun champ de données. **Tout le reste de ce document en découle.**

## 2. Diagnostic — pourquoi une monnaie sans puits est morte ici

### 2.1 Ce n'est pas l'hyperinflation d'Axie, et c'est pire à décrire
L'émission est bornée : 62 899 200 EIDL, 2 096 640 blocs, **239,2 ans** à un bloc par heure. La masse ne peut pas exploser. Ce qui explose est le **rapport d'ancienneté**, et il suffit à fermer le marché de D6.

Sans puits, la poche d'un joueur est `masse = revenu × ancienneté`, strictement croissante. À `g` par 12 h :

| blocs | jours | ans | gains | masse par joueur |
|---|---|---|---|---|
| 1 000 | 42 | 0,1 | 83 | 83·g |
| 10 000 | 417 | 1,1 | 833 | 833·g |
| 100 000 | 4 167 | 11,4 | 8 333 | 8 333·g |

À `g = 0,048` (le maximum soutenable pour N = 1 000, §4) : **43,5 EIDL** après un an, **130** après trois, **435** après dix. Le robinet donne **1 EIDL par époque** à un nouveau venu. Rapport vétéran/nouveau : **43×, 130×, 435×** — et il ne plafonne jamais.

Or les objets, eux, **sont bornés** : le sac plafonne à 27 (`SPEC_COFFRE_HORAIRE.md` K44), la permadeath en brûle, la forge en consomme deux par craft. Une masse qui croît linéairement en face d'un stock borné donne un prix qui croît linéairement : **le prix d'un T9 suit la poche du vétéran**. Au bout de trois ans, l'objet coûte 130 EIDL, le nouveau venu en a 1, et le marché se ferme. C'est exactement le mécanisme d'Axie, transposé : non pas « la monnaie ne vaut plus rien », mais **« le ticket d'entrée tend vers l'infini »**.

### 2.2 Le second effet, plus banal et plus grave
Sans puits, **aucune décision n'a de coût**. Un joueur n'arbitre jamais : il attend. La monnaie n'est pas une monnaie, c'est un **score d'ancienneté**. Un puits ne sert pas à « détruire de l'argent » ; il sert à ce que la question « est-ce que je paie ça ? » existe. C'est la partie que la plupart des économies de jeu ratent et c'est le §5.

### 2.3 Le trésor n'a pas de quoi payer une moisson naïve
Mesuré à la hauteur 45 : 944,27 EIDL émis, 47 sorties, `invariant true`. L'émission moyenne en Satya vaut **40 EIDL/bloc = 960 EIDL/jour** ; le budget du robinet vaut `a·T/8` = **5 040 EIDL/époque = 120 EIDL/jour**. Besoin d'une moisson à **1 EIDL par 12 h**, comparé à l'émission cumulée :

| blocs | émis (EIDL) | N=10 | N=100 | N=1 000 | N=10 000 |
|---|---|---|---|---|---|
| 1 000 | 40 160 | 833 | 8 333 | **83 333** | **833 333** |
| 10 000 | 401 559 | 8 333 | 83 333 | **833 333** | **8,3·10⁶** |
| 100 000 | 3 997 087 | 83 333 | 833 333 | **8,3·10⁶** | **8,3·10⁷** |
| 838 656 (fin de Satya) | 33 546 240 | 699 200 | 6,99·10⁶ | **6,99·10⁷** | **6,99·10⁸** |

En gras : au-delà de ce que la chaîne a émis. **1 EIDL par 12 h est impossible dès mille joueurs**, avant même de parler de puits. La moisson ne peut pas être ronde ; elle doit être une fraction.

### 2.4 La contrainte que personne n'avait chiffrée : la place dans les blocs
`MAX_ENVOIS = 8` (`noeud.py:66`) : **8 transactions de joueur par bloc, 192 par jour, pour tout le réseau.** `MAX_PAIEMENTS = 3` : le robinet sert au plus 72 demandes/jour, soit **3 024 joueurs par époque** — le vrai plafond, sous les 5 040 du budget.

Une transaction minimale à une entrée et deux sorties pèse **2 283 octets** (dont 2 177 de témoin WOTS+). Une **sortie de plus** en pèse **28** : **81,5× moins**. Conséquences :

- absorber 120 EIDL/jour avec 192 transactions exige **≥ 0,625 EIDL par transaction** ; absorber 960 EIDL/jour en exige **5,00** ;
- un joueur dispose de `192/N` transactions par jour : 0,192 à N = 1 000 (**une tous les 5,2 jours**), 0,019 à N = 10 000 (**une tous les 52 jours**) ;
- 8 envois pleins par bloc pèsent **160 Mo/an** (aujourd'hui 24,1 Mo/an), et `--verifier` rejoue tout.

**Un puits granulaire est physiquement impossible.** Payer 1/64 d'EIDL par craft, par sertissure, par fantôme inscrit : il n'y a pas la place. Les puits doivent être **gros et rares**, ou **portés par une transaction qui existait déjà**.

---

## 3. Les puits candidats

Prix en puissances de deux d'`ATOMES` (10⁸), comme la loi 2⁻ᵗ partout ailleurs. « Pouvoir » = est-ce que payer donne un avantage de combat ?

| # | puits | ce qu'il achète | prix | où vont les atomes | fréquence | tx dédiée | débit EIDL/j/joueur | pouvoir | verdict |
|---|---|---|---|---|---|---|---|---|---|
| **P1** | **Mise du sceau** | qu'un acte **compte** : bataille ancrée, veillée, cohorte | **4 EIDL / 64 actes** = 1/16 par acte | `A(sceau)`, brûlé | 1 acte/jour (D4-c), donc 1 mise / 64 j | 0,0156 | **0,0625** | non — achète une trace, pas une stat | **retenu, premier** |
| **P2** | **Péage de lignée** | un maillon `eidos-objet/1` valide | **1/4 EIDL** (`ATOMES/4`) | `A(lignee)`, sortie de plus **dans la transaction d'échange** (28 o) | 0,1 échange/jour | **0** | **0,025** | non — taxe le transfert | **retenu** |
| **P3** | **Nom** | nommer une unité, une relique, un fantôme, une lignée | **2 EIDL** | `A(nom) = sha256("eidos-nom/1" ‖ nom)[:20]` — le nom **est** l'adresse | 0,008/jour | 0,008 | **0,016** | **zéro** | **retenu** |
| **P4** | **Porte de quartier** | franchir 64 / 128 / 192 | **4 / 8 / 16 EIDL** | `A(porte)`, brûlé | 3 fois dans une vie | 0,0015 | **0,008** | indirect (butin de zone) — gelé jusqu'à R2 | **retenu, gelé** |
| P5 | Forge payée | monter un tier | 1/8 · 2^(t−1) | `A(forge)` | 0,3 craft/jour → **59 tx/jour à N=1 000** | 0,3 | 0,03 | **oui** : à T9, 52 % ont `lame+ecu ≥ 48` = 77,1 % de victoires (`SPEC_CRAFT` D1) | **écarté** : pas de place, et achète le trou |
| P6 | Sertissure de plus | une alvéole au-delà de `SOCKETS_MAX = 2` | 1/2 EIDL | `A(forge)` | rare | 0,01 | 0,005 | non, **mesuré** : la 3ᵉ pièce vaut +0,9 pt de plafond, la 4ᵉ +0,06 | **écarté** : personne ne paiera 0,5 EIDL pour +0,9 % |
| P7 | Classement / cohorte | inscrire un fantôme | 1/32 EIDL | `A(sceau)` | 0,05/jour | 0,05 | 0,0016 | non | **fondu dans P1** : trop granulaire seul |
| P8 | Résurrection | rendre une unité tombée | — | `A(sceau)` | — | — | — | **oui**, et pire | **écarté, §6** |

**Ce que P1 ferme au passage.** `ancrage.ts` écrit en tête : *« Ce qui n'est PAS prouvé ici : que la pièce appartient au joueur. Cela se prouve en la dépensant. »* `SPEC_SYBIL.md` §2 le répète, §5.2 demande s'il faut une mise minimale. La mise du sceau **est** cette dépense, et sa destination est le puits au lieu d'une adresse fraîche : le trou de preuve et le trou d'économie se bouchent d'un même geste, sans un octet de consensus nouveau.

**Comment 4 EIDL paient 64 actes sans contrat.** La mise est une sortie brûlée, prouvable contre `utxo_root`. Le juge de CI (`batailles/index.json`, patron de `veillees.yml` + `depot.ts`) tient le compte des actes déjà imputés à cette sortie et refuse le 65ᵉ. Le brûlage est une **preuve**, le décompte est une **figure** — et la figure ne peut que *restreindre* ce que la preuve autorise, jamais l'étendre. C'est la seule façon de tenir 64 actes dans une transaction, donc la seule façon de tenir dans 192 tx/jour.

## 4. L'équilibre

Par joueur et par jour, avec `r = 1/42 = 0,0238` (robinet) et `g` le gain de 12 h :

```
entrées  e = 2·g + r
sorties  s = Σ_j  f_j · p_j
point fixe : s = e          ⟺  masse en circulation stationnaire
```

Et globalement, au point fixe, `N·s = N·e` = **le débit sortant du trésor**. Autrement dit : **les puits doivent brûler exactement ce que le trésor verse.** Tout ce qui est émis finit alors dans deux endroits et deux seulement — le trésor qui ne dépense pas (7/8 par `BUDGET_RATIO`), et les adresses sans clé.

**Barème retenu**, `s = 0,1115 EIDL/joueur/jour` → **g = 0,0439**, arrondi à **g = 1/24 EIDL par 12 h** (0,04167) :

| N | robinet (EIDL/j) | g max budget `a·T/8` | g max émission | g max **capacité** | g retenu | s requis | tx/jour | `MAX_ENVOIS` requis |
|---|---|---|---|---|---|---|---|---|
| 10 | 0,24 | 5,99 | 47,99 | **0,170** | 0,170 | 0,363 | 1,3 | 8 |
| 100 | 2,38 | 0,588 | 4,788 | **0,170** | 0,170 | 0,363 | 12,5 | 8 |
| 1 000 | 23,81 | **0,0481** | 0,468 | 0,170 | 0,0417 | 0,107 | 125 | 8 |
| 10 000 | 238,10 | **impossible** | 0,0361 | 0,170 | 0,0361 | 0,096 | 1 251 | **53** |

**Deux régimes, et la bascule est à N = 331.**
- **N < 331 : c'est la capacité d'absorption qui borne, pas l'argent.** Un joueur ne peut pas ancrer plus de ~5 batailles par jour ; à 1/16 EIDL l'acte, il ne brûle pas plus de **0,363 EIDL/jour** quoi qu'il possède. Verser davantage s'accumule, point. Le budget autoriserait `g = 5,99` à N = 10 ; **le jeu n'en absorbe que 0,170**.
- **N > 331 : c'est le trésor qui borne.** À N = 10 000, le robinet seul (238 EIDL/j) dépasse le budget `a·T/8` (120) : il faut porter `BUDGET_RATIO` de 8 à 1, et `MAX_ENVOIS` de 8 à 53 (640 Mo/an de chaîne).

**Population portée par ce barème :** **1 076 joueurs** sur le budget actuel, **8 609** sur l'émission entière. Le barème est fixe en atomes ; c'est donc lui qui décide combien de joueurs l'économie porte — et c'est la bonne façon de le dire à l'auteur : *choisir les prix, c'est choisir la taille du jeu.*

**Masse en circulation à l'équilibre.** Un joueur garde le tampon de sa dépense la plus grosse : ~1 à 4 EIDL (une mise, un nom). `M* ≈ N × 1 à 4 EIDL`, soit **1 000 à 4 000 EIDL pour N = 1 000** — contre **350 000** au bout de dix ans sans puits. Rapport **100 à 350×**.

**Honnêteté sur la stabilité.** Des prix fixes ne donnent pas un attracteur mathématique : ils donnent un plafond mou, celui de l'achat le plus cher désirable. Le seul puits à demande non bornée est le **sceau** — il y a toujours une bataille de plus — et sa borne réelle est le **temps de jeu**, pas l'argent. C'est ce qui produit le régime N < 331. L'élasticité résiduelle est réelle mais faible : un joueur riche tient plus de pièces, donc peut ancrer plus d'actes par jour (une pièce, un acte, un bloc).

## 5. La demande — pourquoi un joueur paierait

Un puits que personne n'utilise n'absorbe rien. Pour les trois retenus :

**P1, la mise du sceau — le désir : que ça ait compté.** Le moment est le seul qui marche : **après** la bataille, pas avant. Le joueur vient de brûler 6 à 10 feuilles d'un arbre de 64, il a gagné à deux cases près, et il sait exactement ce qu'il tient. On lui demande 1/16 d'EIDL pour que la bataille entre dans `batailles/`, que l'unité survivante garde sa lignée, que le fantôme parte en cohorte. **Faire payer l'entrée est l'erreur classique** : à l'entrée l'espérance est incertaine et basse, le joueur refuse et le puits reste vide. À la sortie, le prix se compare à un gain connu. Et la demande est *structurelle*, pas aspirationnelle : sans sceau, l'objet n'a pas de lignée, donc **n'est pas vendable** — payer le sceau, c'est frapper l'objet pour le marché.

**P2, le péage de lignée — le désir : vendre.** Il ne se paie qu'au moment où quelqu'un veut faire passer un objet à quelqu'un d'autre, c'est-à-dire au moment où l'objet vaut quelque chose *pour deux personnes*. La disposition à payer y est maximale et bornée par la valeur du troc lui-même : c'est exactement la bonne assiette. Il coûte **zéro transaction** : la sortie brûlée voyage dans la transaction d'échange qui devait exister de toute façon (28 o sur 2 283). Et il fait payer les riches plus que les pauvres sans regarder personne : le débit du péage est proportionnel à l'activité de marché, qui est ce que fait un joueur riche.

**P3, le nom — le désir : avoir été celui qui l'a nommé.** C'est le seul achat dont la valeur **monte avec le nombre de joueurs** : un nom est pris une fois, globalement, pour toujours. `A(nom) = sha256("eidos-nom/1" ‖ nom)[:20]` fait que le nom **est** l'adresse : n'importe qui recalcule l'adresse depuis la chaîne de caractères et lit dans le carnet si elle a reçu une sortie, et laquelle est la première. Rien ne se croit, tout se rejoue — jusque dans un achat cosmétique. Zéro effet sur le combat, donc aucune raison de le brider : c'est le puits qu'on peut laisser grossir.

## 6. Ce qu'il ne faut pas faire

| puits séduisant | pourquoi c'est toxique **ici** |
|---|---|
| **La résurrection** — le pire | La permadeath est **le seul puits réel du jeu aujourd'hui** (`SPEC_TACTIQUE.md` §9 bis : « la permadeath est le puits qui manquait »). La racheter convertit un puits d'objets — la ressource réellement rare, sac de 27 — en puits de monnaie, la ressource abondante. On échange le bon puits contre le mauvais. Pire, le mort qu'on rachète est toujours le T9 : la mort devient une fonction de la fortune, ce qui est la définition du pay-to-win. Et elle contredit la primitive même de la chaîne : « une clé ne signe qu'une fois, et c'est la vie » (§4). **Transformation acceptable : la relève.** Brûler le socle du mort + 1 EIDL tire un objet **neuf** du coffre (loi 2⁻ᵗ, sans choix d'axe). Le mot est perdu pour toujours ; on rachète une place au roster, pas une unité. |
| **Vendre le frein de Sybil** — pièces, ancrages ou gouttes de robinet supplémentaires contre EIDL | Ce n'est même pas un puits, c'est un cycle : l'EIDL achèterait des pièces, et les pièces *sont* de l'EIDL. Surtout, `SPEC_SYBIL.md` repose sur « ce que le client ne peut pas fabriquer » ; le rendre achetable transforme la défense anti-bot en question de prix, et l'argent est ce dont une ferme de bots dispose le plus. **Disqualifié d'emblée.** |
| **Payer pour forger vers un axe** | À T9, viser `lame` ou `écu` donne 58 sur deux axes ; `lame+ecu ≥ 48` gagne **77,1 %** contre **3,97 %** (`ETUDE_EQUILIBRAGE_TACTIQUE.md`). Tant que R2 n'est pas tenu (\|r\| par axe < 0,30, quartiles < 3× ; aujourd'hui **0,934** et **4,06×**), payer la forge, c'est acheter 77 % de victoires. Le seul puits qui violerait la protection structurelle du §9 bis. |
| **Brûler les frais de transaction** | `Σ utxo == emission_cumulee()` tombe, `noeud.py:744` refuse de publier, `utxo.py:261` refuse le bloc. Interdit par la contrainte 1, sans discussion possible. |
| **Renvoyer au trésor** | `graine_tresor(h)` est publique et le robinet reverse : l'atome revient. Ce n'est pas un puits, c'est un détour. |
| **Un puits granulaire** (micro-paiement par craft, par sertissure, par fantôme) | 192 transactions par jour pour tout le réseau. À N = 1 000, 0,3 craft/jour font 300 transactions/jour : le puits **ne rentre pas dans les blocs**. |
| **Un puits d'entretien qui punit l'absence** (loyer, décroissance de la poche) | Il taxe le joueur qui ne joue pas, donc chasse exactement celui qu'on veut voir revenir, et il ne demande aucune décision. |
| **Une enchère ou une mise réglée sur la chaîne** | Il n'y a ni contrat, ni séquestre, ni condition de dépense au-delà de la signature. Un pari ne peut pas être payé. À écrire comme limite, pas à contourner. |
| **Un puits qui plafonne la poche** | Un plafond fait jeter le surplus au lieu de le dépenser : la décision disparaît, ce qui est le problème du §2.2 avec un pansement dessus. |

## 7. Décisions à trancher

1. **P1 est-il payé par acte ou par mise ?** La mise (4 EIDL / 64 actes) est la seule qui tienne dans 192 tx/jour, au prix d'un décompte hors chaîne dans `batailles/index.json`. *Recommandation : la mise, en disant clairement que le brûlage est la preuve et le décompte une figure.*
2. **Le péage de lignée est-il obligatoire ou facultatif ?** Obligatoire : le juge refuse un maillon dont la transaction ne porte pas de sortie ≥ 1/4 EIDL vers `A(lignee)`. Facultatif, il n'absorbe rien. *Recommandation : obligatoire, et gratuit pour le **premier** maillon (l'origine), pour ne pas taxer le coffre horaire.*
3. **`BUDGET_RATIO` et `MAX_ENVOIS`.** Au-delà de ~1 000 joueurs il faut les deux : 8 → 1 et 8 → 53. C'est de la politique de nœud, pas du consensus, mais c'est 640 Mo de chaîne par an et un `--verifier` d'autant plus long. *À trancher avant, pas pendant.*
4. **La caution de socle.** Exiger `montant(socle) ≥ CAUTION` immobilise de la monnaie proportionnellement au roster tradable — un vrai stabilisateur, mais **ce n'est pas un puits** : l'atome revient si la lignée est abandonnée. À décider comme réserve, jamais à compter comme absorption.
5. **La relève remplace-t-elle la résurrection ?** Elle absorbe sans rendre le mot. *Recommandation : oui, une fois la permadeath tranchée (D5 de `SPEC_TACTIQUE.md`).*
6. **P4 et P5 restent gelés jusqu'à R2.** Toute dépense qui ouvre du butin ou monte un tier achète indirectement `lame+ecu` tant que le prix des axes n'est pas corrigé.

## LIMITE
- **Le carnet grossit et rien ne l'élague.** Chaque brûlage est une sortie de plus dans `utxo.py`, à jamais : `utxo_root` la rehache à chaque bloc et `--verifier` la rejoue. À N = 1 000 et une mise tous les 64 jours, c'est 5 700 sorties par an — tenable ; à un brûlage par acte, 365 000 par an — pas tenable. **C'est ce chiffre, et lui seul, qui impose la mise plutôt que le paiement à l'acte.**
- **Les fréquences `f_j` sont des hypothèses, pas des mesures.** Aucun joueur n'a jamais payé quoi que ce soit dans Eidos. Le barème est une conjecture cohérente avec le budget ; les prix se recalent après la première époque de mesure, et le seul chiffre à surveiller est `Σ brûlé / Σ versé par le trésor` — publiable dans `etat.json.puits` comme lecture du carnet.
- **Aucun de ces prix n'est ancré à `R(h)`.** La récompense oscille entre 20 et 60 dans une époque : indexer les prix dessus les ferait tripler en six semaines. Ils sont fixes en atomes, et devront donc **baisser aux changements d'âge** (a : 40 → 30 → 20 → 10), sinon le puits dépasse la source. Rien n'est prévu pour ça ici.
- **Le testnet n'a et ne doit avoir aucune valeur.** Tout ce document parle d'arbitrage de joueur, jamais de prix en argent. Il n'existe ni séquestre, ni atomicité d'échange, ni enchère : un troc reste un accord entre deux personnes.
- **Figures ≠ preuves.** Le débit d'un puits, le décompte d'une mise, le prix d'un objet, la population portée : des lectures. Seuls le carnet, la chaîne et les signatures engagent — et une sortie brûlée est, elle, une preuve : elle est dans `utxo_root`, et personne ne la dépensera jamais.
