# Bible de conception — La Veillée (roguelike XMSS sur Eidos)

**Dépôt :** Oykdo/Eidos. **Statut :** bible v1 (2026-09-07), réponse au prompt `docs/PROMPT_ROGUELIKE_XMSS.md` ; la PR 1 (§10) est codée dans le même lot : `atelier/src/lib/eidos/veillee.ts`, `fantomes.ts`, famille `veillee` de `vecteurs.json`.
**Règle de lecture :** [FIXE] loi ou lore existant · [PROPOSÉ] décidé ici, falsifiable · [OUVERT] à trancher. Figures ≠ preuves ; ce qui compte est ancré, ce qui est libre ne vaut rien. Aucune mythologie neuve : chaque figure cite sa source (§8).

---

## 1. Vision

**La promesse, en une phrase.** *Une clé ne signe qu'une fois* : tu montes la Tour avec soixante-quatre feuilles, chaque geste en brûle une, et quand l'arbre est nu ta montée s'arrête — mais tout ce que tu as signé reste vrai, pour toujours, pour quiconque veut le vérifier.

**Ce que c'est.** Un roguelike de parcimonie posé sur la Tour d'Eidos [FIXE] (255 coupes, neuf muses, quatre quartiers, portes à sceau). Pas de points de vie, pas de niveau, pas de hasard : la seule ressource est cryptographique, le seul adversaire est le compte des feuilles, la seule preuve est une signature. Le réseau ignore le jeu ; il fournit deux choses rares, un bloc et une pièce, et le jeu en fait un jour.

**Trois boucles.**

| Boucle | Durée | Ce qu'on fait | Ce qui en reste |
|---|---|---|---|
| **la salle** | dix minutes | le pion sur la dalle 9 × 9 ; on parle à l'hôte, on creuse, on prend un occupant, on franchit — chaque acte coûte une feuille ; on lit l'étage avant d'y toucher, parce que lire est gratuit et signer ne l'est pas | des dons, des trouvailles, des captures (jauge) ; un geste signé de plus dans la preuve |
| **la veillée** | un jour | l'ascension du jour, 27 salles identiques pour tous (§4), ancrée sur le premier bloc du jour et sur une pièce ; trois blocs du poste du jour = trois moments où l'on peut s'arrêter pour compter | une preuve `eidos-veillee/1` : jugée sans rejeu, classée, relue comme un fantôme (§6) |
| **l'âge** | des semaines | les sceaux d'âge (reliques du monde) ouvrent les quartiers ; les pouvoirs des muses (cap metroidvania, document retiré le 2026-09-07 : idée non retenue) rouvriraient ce qu'on a vu ; l'âge du bloc d'ancrage date chaque preuve | un coffre qui monte plus haut, des preuves d'âges différents, des fantômes en écho |

**Libre ou ancrée.** Comme l'ascension, une veillée peut être **libre** : les mêmes salles du jour, le même arbre de soixante-quatre feuilles, aucune pièce — une lecture, qui ne s'exporte pas et que le juge refuse. C'est ainsi que le coffre d'atelier, ou un coffre sans pièce, joue. Ce qui compte est ancré ; ce qui est libre ne vaut rien, et se joue quand même.

**Ce qu'on ne fait pas.** Une IP à côté d'Eidos (C4), des points de vie déguisés, un aléa client, un serveur de classement, un verrou de machine, un objet plus fort qu'un autre.

## 2. La clé comme vie

### 2.1 L'arbre [PROPOSÉ, codé]

Le joueur entre avec un **arbre XMSS de hauteur 6 : 64 feuilles WOTS+**, exactement la construction de la clé d'un validateur (`federation.CleValidateur`, portée dans `veillee.construireArbre`, vérifiée par `xmss.verifierMss` sans changement). Le test de parité rejoue le vecteur `xmss` de `vecteurs.json` (hauteur 4) : racine, feuille 0 et signature identiques à l'octet entre Python et TypeScript.

- **Pourquoi 64.** 27 salles exigent 26 gestes « franchir » (fin de salle, obligatoire). Reste **38 feuilles** pour parler, ouvrir, prendre : 1,4 par salle en moyenne. C'est la parcimonie voulue : on ne fait pas tout dans une salle, on choisit. 64 est aussi le nombre des œufs et des glyphes [FIXE] : l'arbre se dépouille sur l'alphabet.
- **Pourquoi la hauteur et pas N libre.** Un arbre XMSS a 2^h feuilles ; h = 6 se construit en une à deux secondes sur un poste ordinaire (64 clés × 67 chaînes × 15 maillons ; mesuré 1,3–1,6 s en Node sur ce poste, une fois par veillée) ; h = 7 doublerait le budget, le temps, et tuerait le dilemme.
- **Graine de l'arbre** : `SHA-256d("eidos-veillee/1/arbre" ‖ maître ‖ id_bloc ‖ txid ‖ rang)`. Elle est **au coffre** (le maître est le secret du coffre) et **au jour** (bloc + pièce d'ancrage). Même coffre, même bloc, même pièce ⇒ même arbre : c'est ce qui rend « deux appareils » lisible (§7).
- **Racine engagée** : chaque message signé contient la racine de l'arbre ; l'export porte racine et graine publique ; le juge vérifie chaque feuille contre elles. L'arbre est donc une **preuve**, pas une figure — la condition posée en C6 est remplie. (L'Arbre d'origine retiré en H2 était une lecture qu'on présentait comme une garantie ; celui-ci est une garantie qu'on présente comme un arbre.)

### 2.2 Le coût des gestes [PROPOSÉ, codé]

| Geste | Ce qu'il fait dans la Tour (existant) | Coût | Ce que signe la feuille |
|---|---|---|---|
| **franchir** | la fin de salle : le choix (monter / lire / offrir) et l'objet porté passent au pendule (`ascension.finDeSalleDansCoffre`) | 1 feuille, obligatoire, 26 fois | `arg` = choix, `mot` = objet porté |
| **parler** | honorer l'hôte (`hotes.honorerDansCoffre`) | 1 feuille | `arg` = étage de l'hôte |
| **ouvrir** | creuser une case (`fouilles`), ouvrir l'alcôve (`secrets`) | 1 feuille | `arg` = case (x·9 + y) |
| **prendre** | la capsule sur un occupant (`capsules`) | 1 feuille | `arg` = occupant k |

**Lire est gratuit** : regarder la dalle, la coupe, les occupants, la carte, l'observatoire ne signe rien. La tension du jeu est là : la Tour est publique et fixe [FIXE], on peut tout savoir avant de toucher ; ce qui coûte, c'est d'agir.

**Message du geste i** : `SHA-256d("eidos-veillee/1/geste" ‖ racine ‖ i ‖ étape ‖ étage ‖ geste ‖ arg ‖ mot ‖ message_{i−1})`, `message_{−1}` = graine du jour. Une chaîne : l'ordre est fixé ; un indice de feuille : le budget est fixé ; étape et étage ne sont **jamais déclarés par le joueur**, ils sont lus dans le parcours du pendule et vérifiés par le juge.

### 2.3 Pourquoi la jauge de feuilles remplace les PV

Un point de vie est une soustraction qu'on peut remonter (potion) et que le serveur doit croire. Une feuille brûlée est **irréversible par construction** (une clé WOTS+ réutilisée est une clé compromise) et **vérifiable par n'importe qui** (indice, signature, chemin, racine). La mort permanente du roguelike n'est plus une règle de design : c'est un théorème.

### 2.4 La dernière feuille

Ce qu'on ressent doit être ce que le code fait : le compteur `feuillesRestantes` ne remonte jamais ; à 0, `signerGeste` répond `vide` et la veillée passe à `epuise` — la preuve est **exportable** avec le nombre de salles atteintes (§5). Rendu (PR 3) : l'arbre à 64 feuilles dessiné comme un arbre de Merkle qui se dépouille de bas en haut, un son de feuille qui tombe par geste, une vibration courte à la dixième dernière, longue à la dernière ; le chiffre en monospace, jamais animé vers le haut.

**Falsification** : bot xorshift sur 1 000 veillées ; si plus de 80 % des runs qui touchent le sommet ont dépensé exactement 38 feuilles de butin, le dilemme est absent (on choisit toujours « tout prendre ») → passer à h = 6 avec 30 feuilles de butin (coût 2 pour « prendre »). Si moins de 30 % touchent le sommet, le budget est trop court → coût 0 pour « parler ».

## 3. Le loot

Deux natures, déjà distinguées par `SPEC_SYBIL` et `SPEC_FORUM` §3.3 [FIXE], que la veillée ne change pas :

| | Jauge | Ancré |
|---|---|---|
| naît de | un geste signé dans la Tour (don, trouvaille, capture) | un témoin WOTS+ d'une dépense réelle (`tirerObjet(sig, hash_bloc)`) |
| se transfère | jamais | par le forum : une transaction à deux témoins |
| se prouve | non : c'est une lecture du coffre | oui : intégrité (recalcul), possession (tête signée) |
| ce que la veillée y ajoute | **le geste qui l'a produit est signé** : la preuve dit « ce coffre a ouvert la case (3, 4) de l'étage 41 au 12ᵉ geste » — pas ce qu'il y a trouvé | rien ; la veillée ne fait naître aucune pièce |

### 3.1 Le sac et l'extraction (décision d'auteur, 2026-09-07)

Ce qu'une veillée rapporte — dons, trouvailles, coffrets, captures, élixirs d'écho — n'entre pas au coffre au geste : il va dans un **sac de vingt-sept places** (une par salle), noté dans la jauge (`tour.veillee.sac`). Le **sommet**, une **porte** fermée et l'**effacement** volontaire versent le sac au coffre ; l'**arbre épuisé le perd** : les gestes restent dans la preuve, les objets ne reviennent pas. Un sac plein refuse les gestes de butin, jamais franchir. Ce qu'on porte vient du coffre ; ce qu'on trouve va au sac. C'est ce qui fait de la dernière feuille un vrai dilemme : brûler tout l'arbre coûte le butin, s'effacer à temps le garde. Aucune valeur en jeu : le sac est une jauge, rien ne touche la chaîne. Le coffre lui-même n'a pas de places : ajouter des « slots » au coffre n'augmenterait rien, ce qui borne le butin est l'arbre.

**Falsification** : avec le bot « mesuré » (§2.4), si moins d'un run sur cinq s'efface volontairement avant l'épuisement, le sac ne crée pas de dilemme → réduire ses places à 9 ; si plus de deux runs sur trois s'effacent avant la salle 14, il en crée trop → passer à 40.

**« Garder le loot » quand rien ne se re-signe** veut dire exactement ceci : la preuve survit à l'arbre, et le sac ne survit qu'au retour. L'arbre nu ne fait pas disparaître les gestes signés ; le coffre garde ce qu'il avait ; et **le seul loot qui compte est celui qu'on rend à la chaîne** : la pièce d'ancrage dépensée vers une adresse fraîche du coffre est le sceau final d'une veillée qui compte (règle de `SPEC_SYBIL` §2, inchangée). Anti-rejeu et anti-farm en découlent sans code neuf : une pièce n'ancre qu'une veillée par jour (elle est engagée dans la graine de l'arbre et la dédoublonne au classement), et rejouer avec le même arbre reproduit exactement les mêmes signatures.

**Lien objet ↔ racine** : le don de fin de salle dépend de (étage, case, coffre) [FIXE] ; la veillée n'y touche pas. Ce qui est neuf : la racine de l'arbre, engagée dans chaque geste, **date** le loot de jauge — un objet reçu au geste 12 de la veillée du jour J est lisible comme tel dans le Journal (PR 2). Une lecture, pas une preuve de l'objet.

## 4. La Tour du jour

### 4.1 Le bloc du jour (C7 : option A, codée)

La veillée du jour civil UTC J est ancrée sur le **premier bloc dont `ts` ≥ minuit de J**. Cela se prouve avec **deux têtes signées** et sans rejeu (`estPremierDuJour`) : la tête du jour `T` et celle de la veille `V`, telles que `T.prev = id_bloc(V)`, `T.hauteur = V.hauteur + 1`, `jour(V.ts) < jour(T.ts)`. Les deux sont vérifiées XMSS contre `federation.json` ; les deux voyagent dans l'export. La famille `veillee` de `vecteurs.json` gèle trois blocs de test à cheval sur le 2025-08-31 00:00 UTC (la veille, le premier du jour, le second du jour, qui est refusé).

- **Graine du parcours** : `SHA-256d("eidos-veillee/1" ‖ id_bloc du jour)` — **la même pour tous**, indépendante de la pièce : c'est ce qui fait un Wordle (27 salles identiques). Elle diffère de la graine d'ascension (`eidos-ascension/1` ‖ bloc ‖ pièce), qui reste celle de l'épreuve individuelle.
- **Ancre** : la pièce du joueur, non dépensée, prouvée contre `utxo_root` d'une **tête du même jour** (`teteAncre`, hauteur ≥ celle du bloc du jour ; en pratique la tête où l'on ouvre, car `etat.json` ne publie que le carnet courant). Le juge vérifie cette troisième tête comme les deux autres. Deux joueurs, mêmes salles, pièces différentes, arbres différents ; une pièce, une veillée par jour, quelle que soit l'heure de l'ancre.
- **Où prendre la tête de la veille** : `etat.json` ne publie que la tête courante ; le Témoin de l'atelier note chaque tête vue (`temoin.avancer`) et la chaîne brute est publique (`chaine-eidos.dat`, format 3). PR 2 lit les en-têtes du fichier de chaîne côté atelier pour retrouver `V` et `T` à toute heure ; ce sont des en-têtes signés, rien n'est cru.
- **Fourches** : le jour est défini par la chaîne signée ; en cas de réorganisation (créneau refusé puis remplacé), la tête de plus grande hauteur signée par le proposant légitime du créneau fait foi, et une veillée ancrée sur un bloc orphelin devient un « murmure » (§6) : jugeable, non classée, car sa tête ne s'étend plus. Le nœud fédéré ne réorganise pas en pratique (finalité au tour complet, `ChaineFederee.finalise`) ; la règle est écrite pour le jour où il le ferait.

### 4.2 Les 27 salles

Le parcours est celui du pendule-9 [FIXE] : 9 segments × 3 étages, étape 0 = étage 0 (Thalie, la porte de la ville), l'étage de chaque étape choisi par la transition (graine, étape, position, choix, objet porté, résonance de l'étage quitté, sens de la muse). Le contenu d'un étage est public et fixe ; seule la traversée est du jour. **Chaque salle porte un nom** (C1) : le nom d'ère de l'œuf de sa coupe (`fantomes.nomDeSalle`). Une porte fermée (64, 128, 192 sans sceau) arrête la veillée : `fin = porte`, preuve exportable.

**Dilemmes** (tous existants, la veillée leur donne un prix) :
- **parler** coûte une feuille et donne une réplique vraie et un don (`hotes`) — mais l'hôte n'est présent qu'un étage sur sept, et sa demande se lit gratuitement avant ;
- **ouvrir** coûte une feuille pour un contenu dérivé de (étage, case, coffre), jamais tiré au sort ; les cases qui portent une trouvaille sont fixes et publiques (`fouilles`, une sur huit) : qui a lu la dalle creuse mieux ;
- **prendre** coûte une feuille et, si la capsule n'est pas accordée, la brise ;
- **franchir** ne coûte qu'une feuille mais engage le choix (l'étage de chaque choix est annoncé, la case jamais [FIXE]).

### 4.3 Les trois blocs

Le poste du jour [FIXE] fait trois blocs. Dans la veillée, ce sont **trois moments d'arrêt honorables** : après les salles 9, 18 et 27 (fin de chaque tiers, portes 64 et 128 incluses par géométrie), `abandonner` est proposé avec le score courant ; entre ces moments, abandonner est possible mais s'appelle « s'effacer » (§6). Une lecture d'interface ; le juge ne distingue pas.

### 4.4 Deux runs, feuille par feuille

Graine du jour = celle du vecteur `veillee` (`premier_du_jour`), coffre d'atelier ; les noms sont ceux de `nomDeSalle` (à afficher par PR 2, l'exemple ci-dessous donne les étapes du vecteur telles que `veillee.test.ts` les recalcule).

**Run A — « monter » 26 fois, un mot à l'hôte.** Geste 0 : parler à Thalie (étage 0). Gestes 1–26 : franchir, choix « monter », objet porté 1000 + k. Fin : `sommet`, 27 feuilles brûlées, 37 restantes, butin 1, score 27 × 64 + 1 = 1 729. Dernière salle dans la bande d'Uranie (étage ≥ 226). C'est le run du joueur qui ne cherche pas : il finit, il ne rapporte rien.

**Run B — creuser et prendre sans compter.** Gestes 0–9 : franchir 10 fois. Gestes 10–63 : ouvrir, prendre, ouvrir, prendre… 54 feuilles de butin. Fin : `epuise` à la salle 11 (étage de l'étape 10), 64 feuilles brûlées, score 11 × 64 + 54 = 758. C'est le run du joueur qui prend tout : il meurt à la onzième salle, sa preuve dit chacun de ses gestes.

Entre les deux, la stratégie : 26 feuilles de franchir sont dues ; 38 sont à placer là où la lecture dit qu'elles paient (un hôte dont on a la demande, une case qui porte une trouvaille, un occupant à l'orbite de la capsule).

## 5. Preuves et vérification

**Format d'export** : `eidos-veillee/1` (nouveau tag, C7 : distinct d'`eidos-ascension/1` parce qu'il porte deux têtes, une racine d'arbre et des gestes signés — étendre l'ascension aurait mêlé deux graines).

```
Veillee {
  v: 1, spec: "eidos-veillee/1", jour,
  tete, veille            en-têtes étendus + signature XMSS (temoin.TeteReseau)
  ancre                   null (veillée libre : une lecture) ou { teteAncre, piece, preuve } :
                          une tête du même jour, une sortie non dépensée à son utxo_root, la preuve Merkle
  racine, grainePub, hauteur = 6
  gestes[]                { i, g, etape, etage, arg, mot, msg, sig: { indice, wots, chemin } }
  fin                     sommet | epuise | porte | abandon
}
```

Taille : un geste = 2 144 + 6 × 32 octets de signature ≈ 2,4 Ko ; 64 gestes ≈ 150 Ko en hexadécimal. C'est un fichier, pas une issue GitHub : le règlement sur la chaîne (dépenser la pièce) tient dans une issue, la preuve de veillée voyage à côté (Pages, partage direct, Cipher). [OUVERT] compresser les signatures WOTS+ par chaînes partielles n'est pas nécessaire tant que la preuve n'entre pas dans une issue.

**Le juge** (`jugerVeillee`, sans rejeu, sans serveur) :
1. les deux têtes vérifiées XMSS contre `federation.json` ; le jour prouvé (§4.1) ;
2. la tête d'ancrage vérifiée, du même jour, pas avant le bloc du jour ; la pièce : feuille recalculée, chemin vérifié, racine = son `utxo_root` ;
3. chaque geste, dans l'ordre : indice = rang (une feuille par geste, sans trou), message recalculé (chaîne intacte), signature WOTS+ vérifiée contre la racine de l'arbre, étape et étage égaux à ceux du pendule recalculé ;
4. la fin cohérente avec les comptes (sommet ⇔ 26 franchir ; épuisé ⇔ 64 gestes).

**Classement** : une page statique (PR 3) lit des preuves déposées (fichiers dans un dossier du dépôt ou liens), les juge dans le navigateur, et classe par **score = salles × 64 + butin** (`scoreVeillee`), une preuve par pièce et par jour (la première jugée valide l'emporte : l'ordre du dépôt est public). Aucun serveur ne fait foi ; un lecteur qui doute rejuge.

**Triche, et ce qui l'arrête :**

| Tentative | Ce qui l'arrête |
|---|---|
| rejouer un geste (revenir en arrière) | la feuille i a déjà signé un autre message : deux signatures du même indice = run refusé (`indice`) ; un seul indice ne peut porter deux messages |
| déclarer un étage plus haut | étape/étage sont recalculés par le pendule sur les gestes franchir (`parcours`) |
| trouver le sommet en 20 gestes | 26 gestes franchir sont exigés, chacun signé |
| farmer avec mille coffres | chaque veillée qui compte exige une pièce non dépensée à la tête du jour : une pièce, une veillée par jour |
| jouer le jour sur un autre bloc | deux têtes signées prouvent « premier du jour » ; le second bloc est refusé (vecteur) |
| précalculer la veillée dès minuit | oui, c'est permis : la Tour est publique, le Wordle aussi ; ce qui n'est pas précalculable est la pièce |
| prêter son arbre | l'arbre dérive du maître du coffre et de la pièce : le prêter, c'est prêter le coffre |
| ancrer sur la pièce d'autrui (`etat.json` est public) et déposer le premier | possible : la place (jour, pièce) est prise, c'est un déni, pas un gain ; parade prévue et non codée : le **sceau final** (la dépense de la pièce vers une adresse fraîche) départage deux preuves sur la même pièce — celle dont le signataire a pu dépenser l'emporte |

## 6. Les fantômes (C2)

Un fantôme est la preuve d'un autre, relue : son parcours (étapes recalculées) s'affiche dans la salle comme une trace, sans nom ni visage, avec une **épithète** tirée des six tournures que la réserve Eidolon donnait aux œufs légendaires (`cosmic_history.md` : Echo of, Fading, Shadow, Whisper, Last, Reborn), transposées sans stats (`fantomes.tournureDe`) :

| Tournure | Quand | FR / EN |
|---|---|---|
| **écho** | le bloc d'ancrage est d'un autre âge que la tête suivie | Écho de l'Ère … / Echo of the Era … |
| **revenue** | sommet | L'Ère … revenue / … Reborn |
| **dernière** | épuisé | Dernière Ère … / Last Era … |
| **ombre** | porte | Ombre de l'Ère … / Era …'s Shadow |
| **qui s'efface** | abandon | L'Ère … qui s'efface / Fading Era … |
| **murmure** | en cours, ou bloc orphelin | Murmure de l'Ère … / Whisper of the Era … |

Le nom est **celui de la dernière salle atteinte** : « Ombre de l'Ère des Chemins incertains » dit tout d'un run arrêté devant la porte 64. Multijoueur asynchrone par défaut [FIXE du prompt] : les fantômes sont des preuves relues, jamais un état partagé.

## 7. Mise au point

- **UI de l'arbre** (PR 3) : 64 feuilles en bas, 6 niveaux, la racine en haut ; une feuille brûlée s'éteint, son chemin d'authentification s'allume une seconde ; le compteur à côté, monospace. L'arbre *est* la preuve : cliquer une feuille montre le geste qu'elle a signé.
- **Haptique / audio** : une danse par muse [FIXE] donne la signature sonore de la bande (rebond pour Thalie, phases pour Clio…) ; une feuille = un son sec, jamais un jingle ; la dernière = silence.
- **Didacticiel par le jeu** : les hôtes disent déjà les règles [FIXE] — Clio demande une preuve d'inclusion, Uranie lit la tête signée ; la veillée ajoute huit répliques (§8.2) qui disent l'arbre.
- **Accessibilité** : tout est texte (glyphes, monospace, noms de salles) ; aucune information n'est portée par la couleur seule ; les gestes sont des boutons nommés.
- **Edge cases** :
  - *clé perdue* (maître du coffre) : l'arbre est irrécupérable, la preuve exportée reste jugeable ; rien de nouveau par rapport au coffre ;
  - *arbre épuisé avant la fin* : `epuise`, preuve exportable, score partiel ; c'est le jeu ;
  - *deux appareils* : même coffre ⇒ même arbre ⇒ deux gestes d'indice égal ⇒ run refusé par tout juge : on le dit à l'écran (« un arbre, un appareil, un jour »), et PR 2 note dans la jauge l'indice courant comme `CompteurMSS` le fait pour un validateur, sans verrou entre appareils (assumé, comme `indice-<v>.json`) ;
  - *hash contesté / tête de la veille absente* : lire la chaîne brute (PR 2) ; sans les deux têtes, pas de veillée qui compte, seulement une veillée libre (jauge) ;
  - *`indice-<v>.json` perdu côté validateur* : sans effet sur la veillée, qui ne signe que des feuilles de joueur.

## 8. Identité : décisions et table des figures

### 8.1 Les sept décisions

| # | Décision | Falsification |
|---|---|---|
| C1 | **Salles nommées par l'ère de leur œuf** (trois figures imaginaires de la coupe → glyphe → œuf → nom d'ère, `fantomes.nomDeSalle`) | montrer vingt noms de salles à un testeur avec la dalle ; s'il ne relie pas nom et glyphe au moins une fois sur quatre, ajouter l'œuf à côté du nom |
| C2 | **Fantômes nommés par les six tournures** de la réserve, sur le nom de la dernière salle | si deux fantômes de même tournure et même salle sont indistinguables en pratique pour le classement, ajouter le jour |
| C3 | **Gardiens de porte et de bande nommés par le séparateur primordial de leur bande** (le Vide primordial pour Thalie … la Géométrie sacrée pour Polymnie) ; les gardiens d'antre ordinaires gardent leur nom de capture ; [OUVERT] la traduction des 192 noms mythiques | PR 4, avec le lexique ; hors PR 1 |
| C4 | **« La Veillée » est un mode d'Eidos**, pas un produit ; sous-titre *une clé ne signe qu'une fois* | si la page Veillée devient la première page visitée du site, réévaluer un nom de produit |
| C5 | **Le pion est le glyphe de l'objet porté** ; pas de galerie d'avatars | si les testeurs demandent « qui suis-je » plus d'une fois sur cinq, afficher le titre de l'objet (`titres.ts`) sous le pion |
| C6 | **L'arbre s'affiche comme un arbre parce que c'en est un** ; sa racine est engagée dans chaque geste (codé) | si un testeur croit que l'arbre est décoratif, afficher le chemin d'authentification au clic |
| C7 | **Bloc du jour = premier bloc après minuit UTC**, prouvé par deux têtes (codé) ; tag `eidos-veillee/1` distinct | si plus d'un jour sur dix n'a pas de bloc « premier » lisible (créneaux sautés à minuit), passer à « premier bloc dont le créneau ≥ minuit », qui se prouve de la même façon |

### 8.2 Neuf répliques (`veillee-lexique.ts`, une par muse ; les trois groupes de neuf de `hotes-lexique.ts` restent intacts)

| Muse | FR | EN |
|---|---|---|
| Thalie | Soixante-quatre feuilles, et chacune ne signe qu'une fois. | Sixty-four leaves, and each one signs only once. |
| Clio | Ta veillée a deux têtes : la veille et le jour, toutes deux signées. | Your vigil has two heads: the eve and the day, both signed. |
| Calliope | Lire ne coûte rien ; signer coûte une feuille. | Reading costs nothing; signing costs a leaf. |
| Terpsichore | Le pendule choisit l'étage, jamais ce qu'il contient. | The pendulum picks the floor, never what it holds. |
| Melpomène | La dernière feuille ne remonte pas ; la preuve, elle, reste. | The last leaf never returns; the proof remains. |
| Érato | Une feuille brûlée deux fois, et tout le run est refusé. | Burn one leaf twice and the whole run is refused. |
| Euterpe | Le premier bloc du jour fait la veillée ; le second n'est plus qu'un bloc. | The day's first block makes the vigil; the second is just a block. |
| Polymnie | Une porte sans sceau arrête la veillée, et ne brûle rien. | A door without a seal ends the vigil, and burns nothing. |
| Uranie | Ce que tu as signé, quiconque le juge sans rejouer la chaîne. | What you signed, anyone judges without replaying the chain. |

### 8.3 Table figure → source → usage

| Figure | Source | Usage dans la veillée |
|---|---|---|
| l'arbre de 64 feuilles | `federation.CleValidateur`, RFC 8391 ; 64 = les 64 œufs (`LORE_CHAMBRE.md`) | la vie (§2) |
| les gestes franchir / parler / ouvrir / prendre | `ascension.ts`, `hotes.ts`, `fouilles.ts`, `capsules.ts` | les seuls actes qui signent |
| le parcours de 27 salles | `pendule.ts`, `SPEC_PENDULE` O2 | la Tour du jour |
| les noms de salles | `oeufs-data.ts` (64 noms d'ère), `integrite.glypheLecture` | C1 |
| les six tournures des fantômes | `cosmic_history.md`, hiérarchie des œufs légendaires (sans stats) | C2 |
| le premier bloc du jour | `temoin.ts` (têtes signées), `federation.py` (`tete_signee`) | C7 |
| la pièce d'ancrage, la preuve Merkle | `ancrage.ts`, `merkle.ts`, `SPEC_SYBIL` §2 | ce qui compte |
| les trois moments d'arrêt | le poste du jour (`poste.ts`, trois blocs) | §4.3 |
| la danse comme signature sonore | `reliques/danse.ts` | §7 |
| les portes à sceau | `sceaux.ts`, reliques QR | `fin = porte` |
| les répliques des hôtes | `hotes-lexique.ts` (27 par muse) | §8.2 |

Rien ici n'emprunte aux statistiques, aux rangs, aux multiplicateurs ni à l'incubation de la réserve (`TRANSPOSITION_EIDOLON.md` §5).

## 9. Risques cryptographiques et parades

| Risque | Parade |
|---|---|
| réutilisation d'une feuille WOTS+ (deux appareils, un bug de compteur) | le juge refuse tout run à indices non strictement croissants ; le coffre note l'indice courant dans la jauge avant de rendre la signature (PR 2, même discipline que `CompteurMSS`) ; deux signatures du même indice sur deux messages exposent la clé, mais elle ne signe que des gestes de jeu — rien de la chaîne |
| graine de l'arbre devinable | elle dérive du maître du coffre (32 octets aléatoires pour un coffre personnel) ; le coffre d'atelier a une graine publique : ses veillées sont des démonstrations, jamais classées |
| le message ne lie pas assez (substitution d'un geste) | message = tag ‖ racine ‖ indice ‖ étape ‖ étage ‖ geste ‖ arg ‖ mot ‖ précédent : tout est engagé, l'ordre par la chaîne, l'appartenance par la racine |
| deux têtes forgées pour un faux « premier du jour » | les deux sont signées XMSS par le proposant de leur créneau ; forger l'une exige une clé de validateur |
| malléabilité de l'export JSON | le juge recalcule tout depuis les champs engagés ; l'export n'est pas haché, il est rejoué |
| taille des preuves | 150 Ko par run ; hors issue GitHub ; acceptable pour une page statique ; compression ultérieure [OUVERT] |
| dérive Python ↔ TS de l'arbre | test de parité sur le vecteur `xmss` (racine, feuille, signature) ; toute évolution passe par `vecteurs.py --generer` |
| aléa côté client | aucun : `signerWots` est déterministe, l'arbre aussi, le pendule aussi |

## 10. Modules et PR

```
veillee.ts     arbre (construireArbre, signerFeuille, cheminDe) · jour (jourDe, estPremierDuJour,
               graineDuJour, graineArbre) · état (ouvrirVeillee, signerGeste, arreterVeillee,
               parcoursDe, feuillesRestantes) · juge (jugerVeillee, scoreVeillee) · export (ser/parser)
fantomes.ts    oeufDeSalle, nomDeSalle · tournureDe, epithete, fantomeDe
vecteurs.py    famille `veillee` : trois têtes à cheval sur minuit, sorties du premier bloc
```

| PR | Contenu | Taille | Contrôles |
|---|---|---|---|
| **1 (ce lot)** | `veillee.ts`, `fantomes.ts`, famille `veillee`, cette bible, prompt révisé | ~900 lignes | veillée 7 (parité arbre, feuilles, jour, sommet, épuisé, arrêts, refus), fantômes 3 |
| 2 | brancher dans la Tour : `tour.veillee` (jauge, indice courant noté avant signature), gestes reliés à `honorer` / `creuser` / `prendre` / `finDeSalle`, lecture des en-têtes de `chaine-eidos.dat` côté atelier pour la tête de la veille, page **Veillée** (registre Jouer, `navigation.ts`), huit répliques dans `hotes-lexique.ts` | ~700 lignes | 6 |
| 3 | l'arbre à l'écran, son et haptique, classement statique (dossier `veillees/` ou liens), fantômes dans la salle | ~600 lignes | 4 |
| 4 | noms des gardiens (C3), traduction des 192 noms mythiques, cap metroidvania M1 (pouvoirs) — indépendant | ~500 lignes | 9 |
| 5 | [OUVERT] Godot 4 + cœur Rust : port à l'octet de `wots` / `veillee` avec `vecteurs.json` comme oracle ; à n'ouvrir que si le web ne suffit plus | — | parité |

L'ordre : 1 → 2 → 3 ; 4 en parallèle après 2 ; 5 jamais avant que 3 ait des joueurs. Aucune de ces PR ne touche `eonis.py`, `genesis.json`, le format de chaîne ni les six lois.
