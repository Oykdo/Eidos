# La Ville et la Tour — décisions fondatrices (pendule-9)

**Dépôt :** Oykdo/Eidos
**Statut :** décisions fondatrices O1–O5, à valider avant tout GDD ou code (2026-09-04)
**Cadre :** ce document adapte le prompt « La Ville et la Tour aux 255 étages » à Eidos. Il **ne change ni le lore ni le cœur** : les six lois de `integrite.ts`, `docs/SPEC_TOUR.md` (hôtes, secrets, élixirs, capsules, sceaux) et « rien ne se croit, tout se rejoue » sont [FIXE]. Le pendule-9 y entre comme un système de **parcours**, jamais de **contenu**.

Marques : [FIXE] donnée d'auteur ou loi existante · [PROPOSÉ] à valider · [OUVERT] à trancher avant d'écrire du code.

---

## 0. Ce que le prompt apporte, ce qu'il heurte

**À garder tel quel** [PROPOSÉ] : la discipline (lore ≠ mécanique, chaque règle falsifiable, [FIXE]/[PROPOSÉ]/[OUVERT], traçabilité GDD ↔ TECH, prototypes par incréments, anti-objectifs). C'est la même exigence que « figures ≠ preuves ». Le pendule comme cycle déterministe, et le loot dépendant du spawn, s'emboîtent naturellement dans un projet où tout dérive de `SHA-256d(tag ‖ …)`.

**Ce qui heurte le cœur, et comment on le résout** :

| Élément du prompt | Loi ou lore d'Eidos [FIXE] | Résolution [PROPOSÉ] |
|---|---|---|
| « Le pendule détermine la génération du donjon suivant » | Un étage est **public et fixe** : `graineEtage(e) = SHA-256d(tag ‖ e)`, même hôte pour tous | Le pendule ne génère pas d'étage : il choisit **quels étages** un run traverse et **où** l'on y arrive (la case de la dalle 9 × 9) |
| Courbe de difficulté, montée en puissance (Azure Dreams) | Aucun point de vie, aucun niveau ; « un palier ne multiplie pas la norme » | La difficulté est une **exigence de lecture** : tenue de résonance requise (`COS_ELITE`, `COS_SUPREME`), nombre d'occupants, temps du duel |
| Économie, puits contre l'inflation | Émission bornée par la chaîne ; les objets n'ont pas de puissance | Rien à inventer : l'eidôlon vit sur la chaîne, la jauge ne s'échange pas ; puits = élixirs bus, captures offertes |
| Une ville de bâtiments devant la tour | « La ville est le coffre » | Les bâtiments sont les **sections du Coffre** (inventaire, journal, témoin, carte, reliques) ; ils évoluent par conséquence d'un run |
| Livre-jeu à embranchements écrits | Rien n'est tiré au sort ; les hôtes disent des règles vraies | Les paragraphes sont **écrits à la main** (27 répliques par muse déjà prévues) ; l'ordre de lecture est choisi par le pendule |

## 1. Décisions fondatrices

### O1 — La ville contre le « pas de hub »

**Décision [PROPOSÉ] : (c) + (d).** La ville est le Coffre, visitée **entre deux ascensions** seulement ; un run est une montée sans retour. Ce qui monte avec le joueur : ses objets, ses élixirs, ses captures, ses sceaux — les muses ne descendent pas en ville, mais Thalie tient la porte (étage 0) et Uranie l'observatoire (étage 254), qui sont déjà des lieux [FIXE] de la spec Tour.

- Option A, retenue : ville entre les runs, jamais pendant. Conséquence : tout ce qui se construit en ville (poste du jour, craft, bestiaire) est préparation ; la ville change par ce que le run rapporte (dons, captures, sceaux). Cohérent avec « la ville est le coffre » et « l'état de combat est éphémère : on le jette ».
- Option B, rejetée : retour en ville entre étages. Conséquence : la Tour redevient une suite de visites, le pendule perd sa raison d'être, et l'on introduit un feu de camp que le lore n'a pas.

**Falsification** : prototype sans ville pendant le run ; mesurer si les joueurs veulent redescendre. Seuil : si plus d'un run sur deux s'interrompt volontairement avant la première porte (étage 64), l'absence de retour est un frein, pas une tension.

### O2 — Pendule-9 et 255 étages

**Décision [PROPOSÉ] : l'unité de génération est le parcours, pas l'étage.** 255 = 2⁸ − 1 : un étage tient sur un octet et `etageDe` le fait déjà [FIXE] ; 255 = 9 bandes d'astre (≈ 28 étages) × … : les 9 bandes sont les 9 positions **de départ** possibles d'un segment, pas 9 étages. Un run traverse **9 segments** (un par bande, Terre → Uranie), chaque segment visite **3 étages** de sa bande, choisis par le pendule : 27 étages par ascension sur 255, donc chaque étage est vu par certains runs et pas d'autres, et la Tour reste entière, publique, rejouable.

- Option A, retenue : pendule → (étage suivant dans la bande, case de spawn sur la dalle). Conséquence : le contenu reste fixe, seul le chemin varie ; la reproductibilité tient (même graine de run + mêmes choix ⇒ même parcours).
- Option B, rejetée : pendule → paramètres de génération de l'étage. Conséquence : deux joueurs au même étage verraient deux étages ; « tout le monde rencontre le même hôte au même étage » tombe, et les vecteurs partagés Python ↔ TS n'auraient plus de sens pour la Tour.

**Falsification** : 10 000 parcours simulés (bot) ; mesurer la couverture des 255 étages et la répétition. Seuil : si moins de 200 étages sont atteints au moins une fois, ou si deux runs consécutifs partagent plus de 60 % de leurs étages, le pendule ne diversifie pas.

### O3 — Les Muses

**Décision [PROPOSÉ] : les neuf muses [FIXE] restent des hôtes de la Tour (spec Tour §3) ; l'hypothèse « 9 muses ↔ 9 positions du pendule » est retenue comme lecture, pas comme mécanique.** La position du pendule est un entier 0–8 ; la muse de la bande courante est **un des trois ingrédients** de sa transition (§3), pas son identité. Aucune muse n'est un patron de classe ni un juge : les archétypes des objets sont déjà les muses [FIXE], c'est suffisant.

- Option A, retenue : pendule = mécanisme aveugle, muse = ingrédient et voix. Conséquence : le joueur *lit* la muse dans la position du pendule (l'astre de la bande y est affiché), sans que la mécanique le lui doive.
- Option B, rejetée : pendule = la muse elle-même (9 positions = 9 muses, toujours). Conséquence : le pendule ne pourrait jamais pointer une muse d'une autre bande ; il n'aurait qu'une position utile par segment.

**Falsification** : présenter le pendule sans nommer la muse ; si les testeurs ne voient aucun sens à la position, la lecture est vide et l'on l'abandonne — sans toucher à la mécanique.

### O4 — Glyphes, reliques, mystères : un seul système ?

**Décision [PROPOSÉ] : trois, mutuellement exclusifs, et déjà nommés.**

| | Ce que c'est [FIXE] | Ce qu'il fait que les deux autres ne font pas |
|---|---|---|
| **Glyphe** | l'écriture : 64 empilements de trois figures, adresses, mots d'objets, visages d'hôtes | il **se lit et se vérifie** (somme de contrôle, bourrage refusé) ; il n'est jamais un objet ni un lieu |
| **Relique** | une pièce scellée dans le monde (QR), récupérée vers un coffre ; son sceau ouvre un quartier | elle **repose sur la chaîne** : la seule chose de la Tour qui soit une preuve |
| **Mystère** | un secret d'étage : alcôve, écho, antre, observatoire (spec Tour §4) | il **se découvre en lisant** l'étage (dalle symétrique, orbites égales) ; il n'engage rien et ne s'emporte pas |

Un objet n'est jamais deux de ces choses : une capsule est un objet, une capture est un objet, un élixir est un objet — aucun n'est un glyphe (il *porte* un glyphe), aucun n'est une relique.

**Falsification** : demander à un testeur, devant chaque chose rencontrée dans un run, « c'est lequel des trois ? » ; si le taux d'erreur dépasse 1 sur 5, les définitions ne sont pas exclusives en pratique.

### O5 — Livre-jeu contre procédural

**Décision [PROPOSÉ] : écrit à la main = les paragraphes et leurs choix ; généré = quel paragraphe on lit, où, et avec quelle case de spawn ; généré depuis un squelette écrit = rien (pas de gabarit textuel rempli par machine).**

- Un **paragraphe** = une réplique d'hôte (27 par muse, spec Tour §3.4) + **au plus trois choix** fixes : *monter*, *lire l'étage* (chercher le secret), *offrir* (à l'hôte). Le pendule choisit la réplique lue et l'étage suivant ; l'auteur écrit tout le texte.
- Option A, retenue : embranchements bornés à 3 par étage, 27 étages par run : un run est un chemin dans un arbre écrit, dont le pendule tire les feuilles. Conséquence : 9 muses × 27 répliques = 243 paragraphes à écrire, une fois.
- Option B, rejetée : texte généré par gabarit. Conséquence : « des mystères procéduraux qui sont des puzzles vides » — le prompt le redoute, le lore l'interdit (l'hôte dit vrai).

**Falsification** : donner à lire 20 paragraphes tirés par le pendule ; si un testeur en distingue un « généré » parmi les écrits, c'est que le tirage casse la voix. Seuil : 0 faux généré détecté sur 20.

## 2. Le pendule en jeu (GDD, esquisse)

Ce que le joueur voit : un cadran à **9 crans** (les neuf astres, Terre en bas, Uranie en haut), une aiguille, et sous l'aiguille l'**étage d'arrivée** et la **case** de la dalle 9 × 9 où il apparaîtra. Ce qu'il influence : son **choix** au paragraphe (monter, lire, offrir) et l'**objet porté**. Ce qu'il ne voit pas : le hachage. Lisible sans être prévisible : la case de spawn est affichée *avant* de monter, mais le don qui s'y trouve ne l'est pas — il dépend de (étage, case, coffre) et ne se révèle qu'en y arrivant.

## 3. Le pendule en spec (TECH-2, esquisse)

```
état : p ∈ {0..8}              // position du pendule
        s ∈ {0..8}²             // case de spawn (colonne, ligne) sur la dalle
        e ∈ {0..254}            // étage courant
        bande(e) = floor(e · 9 / 255)          // [FIXE] biomeDe
        graine_run = SHA-256d("eidos-run/1" ‖ maître ‖ n ‖ graine_ville)

transition(p, e, choix, porte, coffre) :
  h   = SHA-256d("eidos-pendule/1" ‖ graine_run ‖ u8(e) ‖ u8(p) ‖ u8(choix) ‖ u32(porte.mot))
  p'  = (p + 1 + (h[0] mod 3) + tenue(résonanceEtage(e)) mod 3) mod 9
  // trois ingrédients, tous entiers : le hachage, la résonance de l'étage quitté,
  // la muse de la bande (rang) qui fixe le sens : rang pair → +, impair → −
  if rang(bande(e)) impair : p' = (9 − p') mod 9
  e'  = début(bande(e) + 1) + (p' · 3 + h[1] mod 3)        // 9 positions × 3 = 27 étages par bande, bornés à la bande
  s'  = (h[2] mod 9, p')                                   // colonne libre, ligne = position du pendule
  return p', e', s'

don(e', s', coffre) = objet tiré de SHA-256d("eidos-don/1" ‖ u8(e') ‖ u8(s'.x) ‖ u8(s'.y) ‖ maître:n)
```

Garantie : même `graine_run` + mêmes `choix` + même objet porté ⇒ même suite `(p, e, s)`. Table de vérité à produire au prototype pour un run entier de 27 étapes, gelée dans un test.

[OUVERT] O6 — `graine_run` dépend-elle du **bloc courant du réseau** (id_bloc de la tête publiée, donc un run par heure « du monde ») ou seulement du coffre ? La première lie les runs à la chaîne (lecture, pas preuve) ; la seconde les rend rejouables hors ligne.

## 4. Phase 0 (un week-end) — la seule chose à prototyper

Construire : `pendule.ts` (transition ci-dessus), un bot qui joue 10 000 runs de 27 étapes avec des choix aléatoires (aléa **du bot**, pas du jeu), et trois mesures :

| Mesure | Seuil d'abandon |
|---|---|
| couverture des 255 étages | < 200 atteints au moins une fois |
| répétition entre deux runs successifs | > 60 % d'étages communs |
| distribution des genres de don par ligne de spawn | une ligne donne > 40 % des gemmes : le loot est prévisible |

Rien d'autre en phase 0 : ni hôte, ni texte, ni rendu. Si l'un des seuils tombe, on revoit la transition, pas le lore.

## 4bis. Branchement dans la Tour — FAIT (2026-09-04)

Décision d'auteur [FIXE] : **exploration libre, décision en fin de salle.** Le joueur explore
chaque salle avec tout ce que la Tour offre (hôte, fouille, prise, élixirs, antre) ; en fin de
salle, le pendule lit **l'acte du coffre dans la salle** comme choix — honoré : *offrir* ;
alcôve, antre ou prise : *lire* ; rien : *monter* — et l'objet porté (`tour.porte`), puis dépose
à l'étage et à la case qu'il calcule. Le joueur ne choisit jamais un jeton abstrait : son acte
est son choix (`ascension.choixDeSalle`).

- **Libre** : graine `sha256d("eidos-run/1" ‖ maître/n ‖ tête de la chaîne locale)`. Une lecture.
- **Ancrée** : tête signée et pièce du coffre gelées au départ (`ancrage.graineAncree`), exportée
  au sommet en `eidos-ascension/1`, jugée sans rejeu. Ce qui compte.
- Une **porte fermée arrête** l'ascension devant elle (`fin: "porte"`) : le pendule ne force
  pas un sceau. Le coffre d'atelier passe (démonstration).
- **Le don d'un hôte dépend de la case d'arrivée** pendant une ascension (`hotes.graineDon`
  inclut `spawn`) : « le loot dépend du spawn », sans rien changer hors ascension.
- Monter / descendre librement est suspendu pendant une ascension ; abandonner la clôt.
- Mesuré : le cran n'a que neuf états et le hachage ne se propage pas d'une salle à l'autre.
  Un acte différent change la **case d'arrivée** huit fois sur neuf, le **cran** (donc le
  chemin) deux fois sur trois. Comme le don dépend de la case, l'acte a toujours un effet ;
  il n'a pas toujours un effet sur le chemin. [OUVERT] O7 : faut-il propager un octet du
  hachage dans l'état (pendule à 9 × 256 états) pour qu'un acte change toujours le chemin ?
- Module `ascension.ts` (6 tests), composant `Pendule` dans la page Tour, jauge `tour.ascension`
  hors feuille, relue avec tolérance.

## 5. Ce qui reste à trancher avant le GDD

1. O6 (graine de run liée au bloc du réseau ou non) — impact fort : reproductibilité hors ligne.
2. Trois étages par bande, ou un nombre qui dépend de l'âge du quartier (Kali 2 … Satya 4) — impact moyen : longueur d'un run.
3. La mort n'existe pas (aucun point de vie) : qu'est-ce qui **termine** un run avant l'étage 254 ? Proposé : être *repoussé* trois fois de suite (duel d'antre perdu) — impact fort.
4. Qui écrit les 243 paragraphes — impact sur le calendrier, pas sur la mécanique.
