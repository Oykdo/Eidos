# Coffre horaire — un coffre par bloc, une pièce par claim

**Dépôt :** Oykdo/Eidos. Labo : `labo/coffre_horaire.py` (K39–K46, rejoué sur les vraies têtes du testnet).
Figures, pas preuves : rien ici n'écrit sur la chaîne. Un coffre réclamé se juge hors ligne, comme une ascension.

## 1. L'horloge est le bloc
Un coffre par bloc. La chaîne forge un bloc par créneau de 3 600 s (`federation.json`) ; c'est la seule heure qu'un client ne peut pas avancer. Il n'y a pas de minuteur côté navigateur, pas de `Date.now()` dans la règle : un coffre existe parce qu'une tête signée existe.

## 2. Le claim : une pièce, un bloc, un coffre
Un claim est le triplet `(tête_h, pièce, preuve)` :
- `tête_h` : la tête signée du bloc h (`etat.json.tete_signee` ou l'en-tête relu de `chaine-eidos.dat`), vérifiée XMSS contre `federation.json` (`temoin.ts`).
- `pièce` : une sortie non dépensée `(txid, rang, adresse, montant)`.
- `preuve` : le chemin Merkle de la pièce contre `utxo_root_h` (`merkle.ts`).

Graine, à l'octet, même patron que l'ascension :

    graine = SHA-256d( "eidos-coffre/1" ‖ id_bloc(32) ‖ txid(32) ‖ rang(4, gros-boutiste) )

Même bloc + même pièce ⇒ même coffre, sur tout appareil, sans coffre-fort ni navigateur. Une pièce ne réclame qu'**un** coffre par bloc (le juge refuse la répétition : K43). Pas de pièce, pas de coffre — un joueur sans pièce voit un coffre « vide », lecture pure, rien à exporter.

## 3. La rareté : neuf tiers, sans table
    tier = 1 + (zéros de tête du premier octet de la graine)        ∈ 1..9
    P(tier = t) = 2^−t pour t = 1..8 ; P(tier = 9) = 2^−8 ; somme = 1 exactement (K40)

Neuf tiers pour neuf muses, du plus commun (1, Thalie) au plus rare (9, Uranie) : 1/2, 1/4, 1/8, 1/16, 1/32, 1/64, 1/128, 1/256, 1/256. Aucune table à maintenir, aucune constante à hasarder ; n'importe qui rejoue le tirage depuis la tête publiée. Sur les 24 têtes réelles × 25 pièces non dépensées du testnet (600 coffres), les comptes observés sont 302 · 153 · 71 · 37 · 16 · 10 · 5 · 3 · 3 pour 300 · 150 · 75 · 37,5 · 18,8 · 9,4 · 4,7 · 2,3 · 2,3 attendus (K41).

## 4. Le contenu
Un coffre de tier t donne **t objets réels**. Correction de la PR 3 : j'avais d'abord inventé une table de genres pour le labo ; un objet de coffre est un `ObjetPorte` comme un autre, dérivé par `objetDepuisGraine` + `habille`, exactement comme un tirage de bloc (`inventaire.ts`) — mot, archétype, genre, emplacement, affixe, sockets. Le labo n'a pas de mots : il s'arrête à la graine de l'objet et à son âge, et **c'est là que porte la parité** (famille `coffre` de `vecteurs.json`). L'objet j (0 ≤ j < t) :

    h_j   = SHA-256d( graine ‖ j(1) )
    genre = GENRES_DON[ h_j[0] mod 8 ]        — la même table que le don du pendule (élixir ×3, pierre ×2, gemme ×2, lair ×1)
    âge   = par tier : 1–3 Kali, 4–5 Dvâpara, 6–7 Trétâ, 8–9 Satya
    nonce = h_j[1..4] (gros-boutiste)         — la teinte, comme `rgbJauge`

Les objets entrent dans le **sac** (27 places, `SAC_PLACES` de `veillee-tour.ts`) ; le surplus est perdu (K44). Vider le sac dans `coffre.objets` est l'extraction déjà spécifiée dans la bible de la Veillée. Un objet de coffre est un objet comme les autres : mot, âge, teinte — il passe par `voxels.ts`.

## 5. Ce qui empêche la ferme
Multiplier les machines ne rapporte rien (même pièce, même coffre). Il faut multiplier les **pièces**, et les pièces viennent de l'émission bornée, du robinet freiné par auteur et par époque, des reliques cachées : c'est `SPEC_SYBIL.md` appliqué sans rien ajouter.

**La rafale rétroactive : mesurée, puis tranchée (K47).** Une pièce neuve peut réclamer d'un coup tous les blocs passés qu'elle sait prouver. Mesure sur les 36 têtes réelles du testnet : tout l'historique offre 77 objets, dont **27 pris et 50 perdus** ; la fenêtre d'un jour (24 blocs) en offre 53, dont **27 pris**. Le sac plafonne les deux à l'identique dès que l'historique dépasse ~14 blocs. **La fenêtre d'un jour ne change rien à ce qu'une pièce emporte : elle n'est pas adoptée.** Elle reste écrite ici au cas où le sac grandirait — c'est le sac, pas la fenêtre, qui borne la rafale.

## 6. Ce que ça n'est pas
- Pas une écriture sur la chaîne. Le nœud, la forge, `chaine.yml` ne changent pas d'un octet.
- Pas une preuve de propriété : le juge établit que la pièce existait à cette tête, pas qu'elle est au joueur. Cela se prouve en la dépensant, comme pour une ascension.
- Pas une valeur entre joueurs. Le jour où un objet de coffre doit s'échanger, c'est une transaction, et c'est une autre spec.

## 7. Contrôles et port
`labo/coffre_horaire.py` : tier borné et exact sur les 256 octets (K39), probabilités exactes (K40), distribution réelle plausible à 4σ (K41), déterminisme (K42), une pièce un bloc (K43), sac borné (K44), objets = tier (K45), têtes réelles espacées d'au moins une heure et contiguës (K46), fenêtre d'un jour sans effet sur la prise (K47). `labo/coffre_vecteurs.json` : 9 vecteurs (3 têtes × 3 pièces) pour le port.

**Port TS — FAIT.** `atelier/src/lib/eidos/coffre-horaire.ts` rejoue graine, tier et contenu à l'octet ; la famille `coffre` de `vecteurs.json` (trois claims, écrite par `vecteurs.py`) casse la parité ici avant qu'elle ne casse ailleurs, contrôlée par `vecteurs.test.ts`. `coffre-horaire.test.ts` : tier sur les 256 octets, probabilités lues à la main, déterminisme, une pièce un bloc, sac borné.

**Page — FAITE.** `/coffre-horaire`, registre **Jouer** (`navigation.ts`, sous-onglet après la Veillée). Pour la tête suivie et chaque pièce du coffre : graine, tier, chance, contenu, et un bouton **Réclamer**. Sans tête suivie elle le dit et n'invente aucune heure ; sans pièce, pas de coffre ; déjà réclamé, elle le montre.

**Réclamer — FAIT (PR 3).** `reclamerDansCoffre(coffre, claim, fédération)` : juge, puis pose les objets dans `coffre.objets` et la clé `txid:rang@id_bloc` dans `coffre.tour.coffres` (nouveau champ de `Tour`, normalisé et borné par `jauge.ts`). Le coffre n'est pas modifié en cas de refus. `store.reclamerCoffreHoraire(ref)` assemble tête, pièce et chemin depuis le réseau suivi.

**Le juge — FAIT (PR 3).** `jugerClaim` vérifie dans l'ordre où ça coûte le moins cher : déjà réclamé, puis la racine de la preuve = `utxoRoot` de la tête, puis la feuille = celle de cette pièce, puis le chemin Merkle, puis la signature XMSS (`verifierTeteReseau`). Rien de neuf n'est inventé : ce sont les vérifications de l'ascension. Testé contre la vraie tête signée de `vecteurs.json`, avec preuve étrangère et racine substituée refusées.

## 8. Décisions prises ici, à renverser si tu veux
1. Neuf tiers géométriques plutôt qu'une table : zéro constante, vérifiable à l'œil.
2. Le claim vaut hors run : un coffre se réclame avec une tête et une pièce, pas besoin d'être dans la Tour. Un claim *pendant* un run pourrait, plus tard, prendre la quantité de la position (`quantiteDon`) au lieu du tier — non fait.
3. Contenu = t objets, genres de `GENRES_DON`, âge par tier : le plus court chemin vers des objets qui existent déjà dans l'atelier.
