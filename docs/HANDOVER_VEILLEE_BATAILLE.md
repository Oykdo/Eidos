# Handover — La bataille dans la Veillée : feuilles, sac, permadeath, dépôt (C4, PR 5 et 6)

**Dépôt :** Oykdo/Eidos · **Rédigé le :** 2026-09-14, contre `9927508` (612 tests, 127 suites) · **Statut :** rien de codé ; un arbitrage bloquant (A17) que **la mesure tranche avant une ligne de code**
**Entrées :** `SPEC_TACTIQUE.md` §4, §8, §9, §10 · `BIBLE_VEILLEE.md` §4–§6, §12–§13 · `FEUILLE_DE_ROUTE.md` C4 · le code cité au §2
**Ne change pas :** `eonis.py`, `genesis.json`, `FORMAT 3`, `vecteurs.json`, `bataille.ts` (le moteur), `ia.ts` (la politique), les six lois d'`integrite.ts`

---

## 1. L'idée en une phrase

Une bataille devient un **acte de salle** de la Veillée : ce qui s'y signe brûle une feuille de l'arbre, le butin va au sac, une unité tombée en veillée ancrée quitte le coffre, et la preuve exportée porte les actes de chaque bataille pour que le juge de la CI la **rejoue** — jamais un résultat déclaré.

## 2. Ce qui existe déjà, et qu'on ne refait pas

| Besoin | Déjà là | Où |
|---|---|---|
| L'arbre, le message chaîné, le juge du budget et de l'ordre | 64 feuilles (`HAUTEUR_VEILLEE = 6`), `GESTES = franchir·parler·ouvrir·prendre`, message = `SHA-256d(tag ‖ racine ‖ i ‖ étape ‖ étage ‖ geste ‖ arg ‖ mot ‖ précédent)`, `jugerVeillee` refuse un indice répété ou un trou, une veillée libre ne s'exporte pas | `veillee.ts` (551 l.) |
| « L'acte d'abord, la feuille ensuite » | `parler`/`creuser`/`ouvrirAlcove`/`capturer`/`franchirDansCoffre` ; la réserve d'indice écrite avant la signature (`indiceReserve`, `reserverEnSession`) ; le sac de 81 (`SAC_PLACES = 3 · ETAPES`) ; `clore` : sommet et porte versent, épuisé perd | `veillee-tour.ts` (419 l.) |
| La main du joueur en bataille | `ouvrirPartie(coffre, étage, indices, feuilles = 64 simulées)`, `jouerActe`, `passerLaMain`, `Partie.actes` (de quoi rejouer), `avant`/`derniers` (de quoi animer), `MAX_COFFRE = 3` ; les Indéchiffrés = les **occupants restants** de l'étage (`1 + graineEtage(e)[0] % 3`, donc 1 à 3) | `tactique/partie.ts` (492 l.) |
| Ce qui coûte quoi | `frapper` : 1 PA **et une feuille, pour le coffre seul** ; la riposte ne coûte rien ; fin = `victoire`, `defaite`, `epuise` (feuilles = 0) ; `rejouer(etat, actes)` ; `traceBataille` = SHA-256d de l'échiquier | `tactique/bataille.ts` |
| L'adversaire qui joue seul | `jouerBataille(etat, tours ≤ 64)`, `annoncer`, `jouerPhaseTracee` — déterministe, `ia.ts` des deux côtés dans les bancs | `tactique/ia.ts` |
| La page | la `Partie` en état React local, **perdue en quittant la page** (voulu tant que rien n'est ancré), ouverte avec `FEUILLES_LIBRES` | `components/tactique/BatailleView.tsx` |
| La jauge | `Tour.veillee = { v, indiceReserve, sac }`, relue par `parserVeillee`, le sac borné à 81 | `jauge.ts`, `types.ts` |
| Le juge de la CI | issue titrée « veillée », corps par `EIDOS_ISSUE_BODY`, trois hôtes lus, `OCTETS_MAX` 2 Mo, nom `<jour>-<txid 8>-<rang>.json`, têtes retrouvées dans `chaine-eidos.dat`, puis `jugerVeillee` | `depot.ts` (149 l.), `veillees.yml`, `scripts/deposer-veillee.ts` |
| Le bot | trois politiques sur des veillées libres **signées** (2,5 à 4 s par run, l'arbre reconstruit à chaque ouverture) ; aucune bataille | `veillee-bot.ts` (369 l.) |

Ce qui manque : le geste de combat, la partie **dans la jauge** (aujourd'hui elle meurt avec la page), le sort des occupants abattus et des unités tombées, les actes de bataille dans la preuve, et le rejeu dans le juge.

## 3. L'arbitrage qui bloque tout : A17, ce qu'une feuille signe en combat

Deux textes du dépôt se contredisent, et `FEUILLE_DE_ROUTE.md` §3 ne tranche pas :

| | **« un coup »** — `SPEC_TACTIQUE.md` D2, notée « tranchée par l'auteur le 2026-09-10 » ; c'est ce que `bataille.ts` fait | **« une mort »** — `BIBLE_VEILLEE.md` §4.3, notée « décidé ici », jamais confirmée |
|---|---|---|
| ce qui brûle une feuille | chaque coup **porté par le coffre** | chaque Indéchiffré **retiré de la dalle**, riposte comprise |
| l'arbre | 64 feuilles (h = 6) | 32 feuilles (h = 5) |
| ce que coûte un coriace | de 1 à 8 feuilles (tenue 48 à 176 contre un coup de 24 à 88) : **2 en médiane, 4 au 95ᵉ centile** sur le moteur (bible §4.2) | toujours 1 |
| le message | `arg` = l'acte (unité, case visée), `mot` = 0 | `arg` = l'id de l'unité retirée, `mot` = **le mot de l'abattu** (le champ existe) |
| l'arithmétique de la bible (9 salles, 2 ennemis en moyenne) | 8 franchir + 36 coups médians = 44 sur 64 ; **arbre nu à la salle 7 au 95ᵉ centile** | 8 franchir + 18 morts = 26 sur 32 ; **6 feuilles pour le butin** |
| ce qu'il faut coder en plus | rien au moteur | le moteur ne décrémente plus `feuilles` au coup ; « à zéro feuille un coup qui abattrait laisse la cible à 1 de tenue » (bible §4.3) ; `epuise` cesse d'être une fin de bataille (§4.4) |

Dans les deux cas le format change de tag (`eidos-veillee/2`, jamais une lecture tolérante de `/1`) : `veillees/index.json` est vide, ce changement est gratuit aujourd'hui et ne le sera plus après C5.

**La mesure qui tranche (PR 5a, à livrer d'abord).** Un banc `atelier/scripts/banc-veillee.ts`, sur le patron de `banc-r2.ts` : **aucune signature** (le budget est une soustraction, l'arbre n'y change rien), donc des runs en millisecondes. Pour chaque run : le parcours du jour (`graineDuJour` du vecteur `veillee`, choix de fin de salle tirés par le xorshift du bot), à chaque salle une bataille `ouvrirBataille` + `jouerBataille` avec `ia.ts` des deux côtés, roster de trois objets tirés comme dans `banc-r2.ts` (`panelsParTier`), Indéchiffrés = `occupantsDe(étage)` (1 à 3). Quatre configurations, croisant A17 et A18 (27 salles telles quelles, ou 9 — `ETAGES_PAR_BANDE` 3 → 1, bible §6.1) ; 1 000 runs chacune ; ~27 batailles × 3 ms par run, soit **moins de deux minutes par configuration**, et un échantillon en CI sous 30 s.
Ce qu'on lit, par configuration : part des runs qui atteignent la dernière salle (le budget tient : franchir + combat ≤ arbre) ; feuilles restantes à l'arrivée (médiane, quartiles) ; part des arrivés avec plus de 6 feuilles inutilisées ; part des runs perdues sur `defaite` (roster balayé) et à quelle salle ; coups et morts par bataille.
**Seuils, annoncés d'avance** (bible §4.5) : **moins de 30 %** atteignent la dernière salle ⇒ l'arbre est trop court pour cette règle ; **plus de 80 %** des arrivés gardent plus de 6 feuilles ⇒ trop long. Une règle qui tient les deux seuils sur son arbre est retenue ; si les deux tiennent, on garde **« un coup »** (D2, déjà tranchée, rien au moteur) ; si aucune ne tient, ce n'est pas la constante qui est fausse mais le nombre d'ennemis par salle, et on le dit avant de toucher quoi que ce soit.
Ce que le banc ne mesure pas, et qu'on écrit : les gestes de butin (le bot ne parle ni ne creuse : les feuilles « restantes » sont leur plafond), la fuite par une sortie de salle (V3, non codée), et l'arbre nu qui « blesse au lieu de tuer ».

## 4. Modèle retenu pour le branchement (PR 5b), quelle que soit la sortie d'A17

- **Quand.** En entrant dans une salle (après `franchir`, ou à l'ouverture), si l'étage a des occupants restants, la salle est **tenue** : une partie s'ouvre sur l'étage courant avec `feuilles = feuillesRestantes(v)`. La salle se lit quand elle est vide (bible §5.2) : parler, creuser, ouvrir, prendre sont **refusés** tant qu'un Indéchiffré tient l'étage (`RefusVeillee.code = "tenue"`), jamais franchir.
- **Où vit la partie.** Dans la jauge : `Tour.veillee.bataille: Partie | null`, relue par `jauge.ts` (les actes rejoués depuis l'état d'ouverture, jamais l'état lui-même : rien ne se croit). `BatailleView` lit la partie du coffre quand une veillée est en cours, la sienne sinon.
- **Le geste.** `frapperDansCoffre(c, acte)` (ou `abattreDansCoffre`) suit la règle de `veillee-tour.ts` : **l'acte d'abord** (`jouerActe`, qui peut lever `RejetTactique`), **la feuille ensuite** — signée après, réserve d'indice avant, comme les quatre autres. Les actes gratuits (pas, passer, passer la main) ne signent rien mais s'ajoutent à `Partie.actes`.
- **Les occupants abattus** ne reviennent pas : `tour.abattus: [étage, k][]` dans la jauge, lu par `occupantsRestants` (aujourd'hui seules les captures en retirent). Sans quoi on capturerait un mort, ou on le combattrait deux fois.
- **La permadeath** (A5, recommandation « oui » ; V5) : une unité du coffre tombée en **veillée ancrée** est retirée d'`objets` à la fin de la bataille — c'est le seul puits réel du jeu (`SPEC_PUITS.md` §6). En veillée libre : rien, c'est une lecture. La défaite ne prend aucune feuille ; le sac reste ; on peut franchir.
- **Le sac.** Rien de neuf : la bataille ne rapporte rien par elle-même ; elle **ouvre** les gestes de butin, dont les objets vont au sac ; `epuise` perd le sac comme aujourd'hui.
- **La preuve** (PR 6) : `Veillee.batailles[]` = `{ étape, étage, indices du coffre, actes[] }`, sans résultat déclaré. `jugerVeillee` rejoue chaque bataille depuis `ouvrirBataille(étage, armeeDuCoffre(...), indechiffresDe(...))` et `jouerPhase` pour les Indéchiffrés, et vérifie que le k-ième geste de combat correspond au k-ième acte qui signe (« un coup » : le k-ième `frapper` ; « une mort » : le k-ième retrait, avec son mot). Une bataille qui ne se rejoue pas à la trace près est refusée, quoi au lieu de quoi. **Le juge exige alors le roster** : une unité se lit d'un `ObjetPorte` (mot, archétype, âge) et de sa classe (`ficheDe`), il faut donc les porter dans la preuve, ou les tirer d'un coffre horaire prouvé — à trancher (A19) ; la bible §11 propose « poses[] », sans dire d'où viennent les mots.
- **Un seul juge, un seul index.** Pas de `batailles/` ni de `depot-bataille.ts` ni de workflow neuf : la bataille est dans la preuve de veillée, le frein reste la pièce d'ancrage (une veillée par jour), `veillees.yml` ne bouge pas. `SPEC_TACTIQUE.md` §8 proposait un dépôt à part : c'était avant que la bataille soit une salle.

## 5. Chantiers, dans l'ordre

| PR | Contenu | Fichiers | Contrôles à ajouter | Cible chiffrée | Ce qui le tue |
|---|---|---|---|---|---|
| **5a** | le banc des budgets (§3) | `scripts/banc-veillee.ts`, `scripts/banc-veillee.test.ts`, `package.json` (`npm run banc-veillee`, test listé), `BIBLE_VEILLEE.md` §4.5 et `FEUILLE_DE_ROUTE.md` §3 (A17, A18 tranchés par le chiffre) | déterminisme (deux runs, même graine, mêmes comptes) ; l'échantillon CI à ±10 % de la calibration complète ; les quatre configurations produisent un rapport | quatre configurations × 1 000 runs, sous 2 min chacune, échantillon CI < 30 s | un échantillon sous 30 s qui ne reproduit pas la calibration à 10 % : le banc réduit serait un faux témoin |
| **5b** | le branchement (§4) | `veillee.ts` (geste neuf, tag `/2`, hauteur si « une mort »), `veillee-tour.ts` (`batailleDansCoffre`, `frapper`/`abattreDansCoffre`, salle tenue, abattus, permadeath), `jauge.ts`, `types.ts`, `store.ts`, `BatailleView.tsx`, `VeilleeView.tsx`, `i18n.ts`, `partie.ts` (feuilles depuis la veillée), `veillee-lexique.ts`, `veillee-bot.ts` (le bot se bat), `SPEC_TACTIQUE.md` §4, `SPEC_TOUR.md:14` | `veillee.test.ts` : geste de combat signé, message relu, refus d'un `frapper` sans bataille ouverte, refus d'un butin en salle tenue, `/1` refusé par le juge ; `veillee-tour.test.ts` : partie dans la jauge relue à la trace près, abattu retiré des occupants, unité tombée retirée du coffre en ancré et gardée en libre, défaite sans feuille ; `veillee-tour.test.ts` (la jauge s'y relit déjà) : bataille absurde → null ; cliquet `i18n.test.ts` à 0 | un run du bot **avec batailles** consomme ce que 5a a mesuré, ±10 % ; 612 tests → 612 + les neufs, 0 échec ; **0 dépendance nouvelle** | la partie dans la jauge dépasse ce que `localStorage` accepte (mesurer : 27 batailles × actes) ; ou le cliquet de la langue remonte |
| **6** | la preuve rejouée | `veillee.ts` (`batailles[]`, rejeu dans `jugerVeillee`), `depot.ts` (rien sauf le tag), `classement.ts` (V9 : rangs salles, retirés, butin), `deposer-veillee.ts` | une bataille altérée d'un acte est refusée ; un résultat déclaré n'existe pas ; taille de la preuve mesurée à 27 batailles ; temps de jugement | une preuve de 27 batailles sous `OCTETS_MAX` (2 Mo ; 64 gestes ≈ 310 Ko en hexadécimal aujourd'hui) et jugée sous 5 s en CI | la preuve ne tient pas dans une pièce jointe, ou le juge ne peut pas reconstruire le roster (A19 non tranché) |
| **7** | les Indéchiffrés (tamis, V6), textes sans nom ni fiche | `tactique/indechiffres.ts`, `i18n.ts`, Guide | pire cas du tamis sur 255 étages | `SEUIL_ILLISIBLE` tel que le pire étage tire < 4 096 fois | — ; ne bloque ni 5 ni 6 : il change les mots des ennemis, pas leur nombre |

Ordre obligatoire : **5a → décision → 5b → 6**. 7 est indépendant. Chaque `.test.ts` neuf s'ajoute à la main dans `package.json` et `CLAUDE.md` §2.

## 6. Décisions qui reviennent à l'auteur

| # | Question | Recommandation | Qui tranche |
|---|---|---|---|
| **A17** | une feuille signe un coup, ou une mort ? | aucune avant les chiffres ; à seuils tenus des deux côtés, « un coup » (déjà tranchée, rien au moteur) | **le banc 5a** |
| **A18** | 27 salles (le code) ou 9 (bible §6.1) ? | mesurer les deux dans 5a ; à 9, écrire `SAC_PLACES = DALLE_N²` d'abord (sinon le sac tombe à 27 sans décision) | le banc 5a, puis l'auteur |
| **A5 / V5** | l'unité tombée quitte-t-elle le coffre ? | oui, en veillée ancrée seulement | l'auteur, avant 5b |
| **A19** | d'où le juge tire-t-il le roster : les objets déclarés dans la preuve (mot, archétype, âge, classe — quelques octets par unité, 3 par bataille), ou des coffres horaires prouvés ? | les objets déclarés : le juge rejoue la bataille, il ne prouve pas que l'objet est au joueur — comme la pièce, cela se prouve ailleurs ; le coffre horaire prouvé viendra avec la lignée (C7) | l'auteur, avant 6 |
| **V3** | la sortie de salle (fuir sans nettoyer) | pas dans ce lot : elle demande `sortieDe(étage)`, un geste, un contrôle du juge et sa propre mesure | plus tard, sur un chiffre de 5a (part des runs perdues sur défaite) |

## 7. Ce que ce handover ne couvre pas

Les élixirs en bataille (V10, geste `boire`), les fantômes de bataille (§7 de la spec tactique), le classement final (V9 au-delà des rangs), la sortie de salle (V3), le dos gradué (V7). Aucun n'est bloquant pour 5a–6.

## 8. Comment on vérifie

```bash
cd atelier && npm run typecheck && npm test        # 612 aujourd'hui, 0 échec
npm run banc-veillee                                # 5a : les quatre configurations, hors CI
npm run veillee-bot 60                              # 5b : le bot se bat, le budget mesuré ±10 %
npm run langue                                      # le cliquet reste à 0
```
