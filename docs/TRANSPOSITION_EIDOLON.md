# Transposition du dossier Eidolon — transposer, ne pas refondre

**Dépôt :** Oykdo/Eidos. **Statut :** décision d'auteur du 2026-09-04 (« transpose, ne refond pas ») ; ce document en tient le registre. Le dossier d'origine (`atelier/docs/expé/Dossiere_refonte`, hors dépôt) est la couche jeu d'Eidolon de janvier 2026 : 90 modules Python, 860 fichiers de données, un action RPG avec statistiques, NFT, runes Bitcoin, portefeuilles EVM, sécurité par apprentissage machine.

## 1. Pourquoi ne pas refondre

Pris tel quel, le dossier défait les cinq propositions d'Eidos :

| Règle d'Eidos | Le dossier | Ce qui casserait |
|---|---|---|
| bibliothèque standard, aucun service | `cryptography` (59 modules), numpy, requests, API Alchemy, HSM, multi-tenant | « rien ne se croit, tout se rejoue » |
| hachage seul, aucune courbe | NFT ERC-721 et BEP-721, portefeuilles Bitcoin et EVM | la résistance quantique structurelle |
| rien n'est tiré au sort | `secrets`, poids de rareté, `rng_config` | deux nœuds ne rejouent plus le même monde |
| aucune puissance | multiplicateurs de rareté jusqu'à ×50, XP d'évolution, multiplicateur fondateur, pierre à 3 333 | la conservation de la norme |
| ce qui compte est ancré, jamais de verrou | `machine_lock`, attestation matérielle | `SPEC_SYBIL` |
| neuf muses, quatre âges, sept régimes | huit cycles × huit ères, 64 œufs, L'Inconnu | une seconde cosmologie |

## 2. Ce qui était déjà transposé

| Module du dossier | Dans Eidos | La puissance retirée, la règle gardée |
|---|---|---|
| `spinor_crypto`, `poly_spinor_hash` | `spinor.ts` | — |
| `lair_system` | les antres (`secrets.ts`) | duel en trois temps, sans points de vie |
| `stone_system`, `glyph_gem_system` | pierres T et S, gemmes (`equipement.ts`) | une pierre tourne un mot, elle ne l'agrandit pas |
| `potion_system` | élixirs bus à un étage (`elixirs.ts`) | effet là seulement, jamais rebu, jamais permanent |
| `philosopher_stone` | genre `philosophale` | une par coffre personnel parmi les dix premiers |
| rangs de genèse, chests de pionnier | paliers Suprême / Élite (`cosmos.ts`) | les tirages se multiplient, jamais la norme |
| `artifact_vault` (détachement, transfert) | `docs/SPEC_FORUM.md` | des pièces colorées, une transaction à deux témoins |
| `avatar_merkle_tree` | `racineObjets`, feuilles | — |
| `machine_lock`, `hardware_attestation` | refusés (`SPEC_SYBIL` §1) | — |

## 3. Ce qui est transposé maintenant : les œufs

`oeufs.ts`, `oeufs-data.ts`, page Glyphes, `docs/LORE_CHAMBRE.md`. Les soixante-quatre œufs sont les soixante-quatre empilements ; le cycle est la bande de la Tour ; L'Inconnu est Uranie. Aucune statistique, aucun tirage. Quatre contrôles.

## 4. Ce qui reste à décider

### 4.1 Les dix catégories alchimiques

| Catégorie du dossier | Dans Eidos | Décision |
|---|---|---|
| potions (effet temporaire) | élixirs bus à un étage | déjà là |
| élixirs (bonus permanent) | — | **refusé** : un bonus permanent est une puissance |
| runes (enchantement d'artefact) | gemmes T et S enchâssées | déjà là |
| parchemins (effet unique puissant) | — | T1 : à décider ; en jauge, sans effet sur un mot, ce serait un objet mort |
| essences (matériau) | trouvailles (`fouilles.ts`) | déjà là |
| talismans (protection) | — | T2 : à décider ; la seule « protection » d'Eidos est l'axe tenu, qui se lit, ne s'équipe pas |
| orbes (réserve d'énergie) | — | T3 : à décider ; Eidos n'a pas d'énergie |
| sceaux (verrouillage) | sceaux d'âge (`sceaux.ts`) | déjà là, comme clés des portes |
| sigils (marquage) | le sceau glyptique d'un objet (`sceauObjet`) | déjà là |
| catalyseurs / autres | la forge d'Érato (gemme + sel → capsule) | déjà là |

Recommandation : ne pas ajouter de genre sans une règle qui le lise ; parchemins, talismans et orbes attendent une mécanique de la Tour qui en ait besoin.

### 4.2 L'avatar

`avatar_generator`, `avatar_evolution`, galeries HTML : l'avatar d'Eidos est le **pion** du chantier « la salle » (`docs/CAP_METROIDVANIA.md` §3.1), une forme dérivée de la graine du coffre comme un objet, sans évolution par XP ; sa galerie est la Carte. T4 : ouvrir ce chantier avec la salle, pas avant.

## 5. Ce qui n'entrera pas

Ponts web3, NFT, API Alchemy, runes Bitcoin, sécurité par apprentissage machine, moteur Blender, évolution par XP, multiplicateurs, verrous de machine. Le dossier reste une carrière de lore et de numération ; rien n'en entre dans le dépôt tel quel.
