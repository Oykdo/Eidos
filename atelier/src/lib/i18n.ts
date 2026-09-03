import { useEffect, useState } from "react";

export type Locale = "fr" | "en";

const KEY = "eidos-lang";

export const FR = {
  "nav.coffre": "Coffre",
  "nav.journal": "Journal",
  "nav.temoin": "Témoin",
  "nav.arbre": "Arbre",
  "nav.reliques": "Reliques",
  "nav.glyphes": "Glyphes",
  "nav.guide": "Guide",

  "sous.coffre": "Réseau d'essai — sans valeur",
  "sous.journal": "Genèse, clés, chaîne, preuve",
  "sous.temoin": "Seconde mémoire — sans les clés",
  "sous.arbre": "Carte, pas un Merkle",
  "sous.reliques": "Lumen d'époque",
  "sous.glyphes": "6 bits, pas une clé",
  "sous.guide": "Réseau d'essai",

  "coffre.eidolon": "eidôlon en coffre",
  "coffre.sorties": "{n} sortie{s} · poussière {dust} atomes",
  "coffre.ailleurs": "la preuve vit ailleurs.",

  "atelier.titre": "Atelier",
  "atelier.lede": "Deux trous : plusieurs entrées, et la poussière. Le validateur n'y touche pas.",
  "atelier.mixte": "Mixte",
  "atelier.poussiere": "Poussière",
  "atelier.fragmente": "Fragmenté",
  "atelier.unePiece": "Une pièce",
  "atelier.vide": "Vide",
  "atelier.aide.mixte": "Huit sorties. 0,50 · 1,00 · 3,00 · 4,00 révèlent les deux trous.",
  "atelier.aide.poussiere": "Une sortie à 1,000090. Envoyer 1,00 : le rendu devient frais.",
  "atelier.aide.fragmente": "Dix fois 0,15. Un envoi de 0,60 exige de regrouper.",
  "atelier.aide.une-piece": "Une sortie de 5. L'ancienne règle suffisait.",
  "atelier.aide.vide": "Coffre vide. Le robinet verse 1 eidôlon.",
  "atelier.robinetLocal": "Atelier · +1 ici",
  "atelier.robinetReseau": "Réseau · 1 eidôlon",
  "atelier.aidePublique": "Graine d'atelier publique. Coffre personnel, puis Réseau.",
  "atelier.aidePersonnel": "Réseau : une issue GitHub. Le nœud verse au bloc suivant.",
  "atelier.adresseIssue": "Adresse à coller dans l'issue",
  "atelier.popup": "Ouvrir l'issue si le popup est bloqué",

  "envoi.titre": "Envoyer",
  "envoi.lede": "Les plus petites sorties qui atteignent m + poussière, au plus trois.",
  "envoi.montant": "Montant (eidôlon)",
  "envoi.h050": "deux petites",
  "envoi.h100": "poussière",
  "envoi.h300": "trois pièces",
  "envoi.h400": "fragmenté",
  "envoi.regrouper": "Regrouper d'abord",
  "envoi.envoyer": "Préparer l'envoi",
  "envoi.regrouper3": "Regrouper (≤ 3 → 1)",

  "err.montant": "Montant invalide.",
  "err.vide": "Aucune sortie dépensable.",
  "err.insuffisant": "Solde insuffisant.",
  "err.fragmente": "solde suffisant mais fragmenté — regrouper d'abord",
  "err.cle": "Clé déjà utilisée.",
  "err.dest": "Adresse de destination invalide.",
  "err.atelier": "Graine d'atelier publique — passez en coffre personnel.",
  "err.regrouper": "Rien à regrouper — au moins deux sorties.",

  "flash.robinet": "Robinet : +1 eidôlon (ici)",
  "flash.mine": "Bloc {h} miné · nonce {n}",
  "mine.bouton": "Miner {r}",
  "flash.reseau": "Validez l'issue. Versement au prochain bloc (≤ 1 h).",
  "flash.sigPoussiere": "Signé. Poussière absorbée — {n} atomes de frais.",
  "flash.sig": "Signé (Lamport). {n} entrée{s}.",
  "flash.regrouper": "Regroupement signé : ≤ 3 sorties → 1.",
  "flash.personnel": "Coffre personnel — graine tirée ici.",
  "flash.atelier": "Atelier public — graine connue, sans valeur.",
  "flash.scenario": "Atelier : {id}",

  "selecteur.titre": "Sorties · glouton borné à {max}",
  "selecteur.vide": "Coffre vide.",

  "decision.titre": "Décision · glouton, pas quadratique",
  "decision.oui": "oui",
  "decision.non": "non",
  "decision.q.montant": "montant > 0 ?",
  "decision.q.solde": "solde ≥ m ?",
  "decision.q.couverture": "les 3 plus grosses ≥ m ?",
  "decision.q.poussiere": "0 < rendu < 10 000 atomes ?",
  "decision.invalide.titre": "Montant invalide",
  "decision.invalide.aide": "Un entier d'atomes strictement positif.",
  "decision.vide.titre": "Coffre vide",
  "decision.vide.aide": "Aucune sortie dépensable.",
  "decision.insuffisant.titre": "Solde insuffisant",
  "decision.insuffisant.aide": "Le coffre n'a pas m.",
  "decision.fragmente.titre": "Fragmenté",
  "decision.fragmente.aide": "Solde suffisant, trois pièces ne font pas m. Regrouper.",
  "decision.poussiere.titre": "Poussière",
  "decision.poussiere.aide": "Le rendu devient frais. Pas de sortie poussiéreuse.",
  "decision.exact.titre": "Exact",
  "decision.exact.aide": "Les entrées font m. Pas de rendu.",
  "decision.rendu.titre": "Rendu",
  "decision.rendu.aide": "Une sortie de rendu, adresse neuve.",
  "decision.note": "Le glouton classe quatre issues, borné à trois. Ce n'est pas D = b² − 4ac.",

  "sorties.titre": "Carnet · {n} sortie{s}",
  "sorties.lede": "Une clé Lamport ne signe qu'une fois. « Preuve » : chemin jusqu'à la racine.",
  "sorties.vide": "Aucune sortie. Servez le robinet.",
  "sorties.preuve": "preuve",
  "copy.adresse": "Copier l'adresse",

  "genese.titre": "Genèse",
  "genese.lede": "Rejouer le fichier gelé.",
  "genese.lancer": "Lancer la genèse",
  "genese.busyG": "Genèse…",
  "genese.busyP": "Portefeuille…",
  "genese.busy": "Rejeu…",
  "genese.ok": "Portefeuille en place. Échanges possibles.",
  "genese.crash": "rejeu interrompu",
  "genese.okCount": "{titre} · {n} ok",
  "genese.fail": " · {n} échec{s}",

  "cles.titre": "Clés",
  "cles.lede": "Chaque constat se rejoue ici. Une clé Lamport ne signe qu'une fois.",
  "cles.tous": "Tous les constats tiennent",
  "cles.fautes": "{n} faute{s} · {a} attention{s}",
  "cles.attentions": "{a} attention{s} — réseau d'essai",
  "cles.personnel": "Coffre personnel",
  "cles.atelier": "Atelier public",
  "cles.masquer": "Masquer la graine",
  "cles.afficher": "Afficher la graine",

  "chaine.titre": "Chaîne",
  "chaine.lede":
    "Bloc 0 gelé (18 bits). Les suivants : Merkle du carnet, bits 0. Exporter la tête.",
  "emission.ligne": "{age} · hauteur {h} · R(h) = {r} — miné, pas tapé.",
  "chaine.ok": "Tête · bloc {h} · chainage intact",
  "chaine.ko": "Chainage rompu",
  "chaine.sansPow": "sans PoW",
  "chaine.bits": "{n} bits",
  "chaine.copie": "Tête copiée",
  "chaine.exporter": "Exporter la tête",
  "chaine.ouvrir": "Ouvrir dans le témoin",

  "merkle.titre": "Preuve d'inclusion",
  "merkle.vide": "Pas de feuille. Le robinet en crée une.",
  "merkle.ok": "Racine reproduite. La pièce est dans le carnet.",
  "merkle.ko": "Racine rompue. La pièce n'est pas dans ce carnet.",
  "merkle.copie": "Copiée",
  "merkle.copier": "Copier la preuve",
  "merkle.restaurer": "Restaurer la feuille",
  "merkle.alterer": "Altérer la feuille",

  "temoin.titre": "Témoin",
  "temoin.lede":
    "Seconde mémoire, sans les clés. Importer une tête : un autre appareil juge une preuve.",
  "temoin.tete": "Tête connue · bloc {h}",
  "temoin.vide": "Aucune tête. Importer, ou suivre le journal s'il est ici.",
  "temoin.suivre": "Suivre la tête",
  "temoin.oublier": "Oublier",
  "temoin.importer": "Importer une tête",

  "guide.sous": "Guide — réseau d'essai",
  "guide.h": "Comment lire",
  "guide.lede":
    "Coffre : dépenser. Journal : genèse. Témoin : une tête. Arbre : une carte. Reliques : lumen. Glyphes : 6 bits.",
  "guide.01": "Coffre",
  "guide.01p":
    "Un bouton : créer le coffre. Puis dépenser. Glouton au plus trois. Poussière sous 10 000 atomes.",
  "guide.02": "Journal",
  "guide.02p": "Lancer la genèse. Toucher « preuve » sur une sortie. Exporter la tête.",
  "guide.03": "Témoin",
  "guide.03p": "Adopter la tête, juger. Sans suivre : racine étrangère.",
  "guide.04": "Arbre",
  "guide.04p": "Épine, dix paliers, 33 secteurs. Une punaise FNV n'est pas une preuve.",
  "guide.04b": "Voir l'arbre",
  "guide.05": "Reliques",
  "guide.05p": "Quatre cavités. Trouvaille : l'ASCII mesure a × a/2. Pas un glyphe.",
  "guide.05b": "Voir les reliques",
  "guide.06": "Glyphes",
  "guide.06p": "Quatre figures, 64 empilements. 27 + 4. Altérer un étage rompt la somme.",
  "guide.06b": "Lire les glyphes",
  "guide.07": "Ce que ce n'est pas",
  "guide.07p": "Pas de nœud réseau, pas de fédération, pas de monnaie.",

  "arbre.intro": "Épine des premiers. Dix paliers. Trente-trois secteurs. Tournez. Touchez.",
  "arbre.axial":
    "Vue axiale : anneaux et axe. Les traces d'un collisionneur ne sont pas des transactions.",
  "arbre.premier": "Nombre premier : irréductible.",
  "arbre.palier": "Ce qui est en bas hérite des contraintes d'en haut.",
  "arbre.racine": "Racine de continuité",
  "arbre.parent": "Parent {id} (D{p})",
  "arbre.curl": "Circulation azimutale presque nulle : pas de tourbillon.",
  "arbre.fermer": "Fermer",
  "arbre.ouv": "Ouverture de l'arbre…",
  "arbre.souffle":
    "Souffle ρ = {rho} · h = {h} · {age}. Proéminences = sorties ancrées. p = 41 à la culmination.",
  "arbre.charge": "charge réseau · {m}",
  "arbre.chaud": "Secteur de la coinbase — ancre du trésor.",

  "relique.lede": "Lumen = ellipse a × a/2. Pas un glyphe. Le ratio ne grandit pas.",
  "relique.coupe": "Coupe",
  "relique.trouvaille": "Trouvaille",
  "relique.ouv": "Ouverture des reliques…",
  "relique.a": "a",
  "relique.b": "b",
  "relique.ratio": "b/a",
  "relique.aire": "aire πab",
  "relique.epoques": "époques",

  "glyphes.h": "Quatre figures",
  "glyphes.lede":
    "2 bits chacune. 31 groupes : 27 + 4. Loi gelée : pas de Reed-Solomon, pas de Huffman.",
  "glyphes.empiler": "Empiler",
  "glyphes.empilerLede": "Haut, milieu, bas. Le code est la lecture des trois étages.",
  "glyphes.64": "Les 64",
  "glyphes.64lede": "Tout l'alphabet. Rien de plus.",
  "glyphes.adresse": "Adresse",
  "glyphes.adresseLede": "27 glyphes + 4 de somme. Altérer un étage doit dire rompue.",
  "glyphes.alterer": "Altérer un étage",
  "glyphes.restaurer": "Restaurer",
  "glyphes.ok": "Somme intacte · {h}…",
  "glyphes.vide": "Aucune sortie — le robinet en crée une.",

  "creer.titre": "Créer mon coffre",
  "creer.lede": "Une graine dans ce navigateur. Le tap verse 1 eidôlon, une fois.",
  "creer.bouton": "Créer mon coffre",
  "creer.fait": "Coffre créé. La graine reste ici.",
  "robinet.bouton": "Robinet · +1",
  "creer.personnel": "Coffre personnel · ce navigateur",
  "creer.auto": "1 eidôlon versé ici. Demande réseau lancée (une issue GitHub).",
  "creer.popup": "Ouvrir l'issue si le popup est bloqué",
  "psnx.exporter": "Exporter le coffre",
  "psnx.importer": "Ouvrir un fichier",
  "psnx.aide":
    "Téléphone : un .eidos ouvre le coffre. Un .psnx Eidolon ne donne que l'empreinte — pas la graine Lamport.",
  "psnx.refus": "Empreinte PSNX lue. Ce n'est pas la graine. Exportez un .eidos depuis ce coffre.",
  "psnx.importe": "Coffre ouvert depuis le fichier.",
  "psnx.digest": "digest",

  "lang.fr": "FR",
  "lang.en": "EN",
} as const;

export const EN: { [K in keyof typeof FR]: string } = {
  "nav.coffre": "Vault",
  "nav.journal": "Ledger",
  "nav.temoin": "Witness",
  "nav.arbre": "Tree",
  "nav.reliques": "Relics",
  "nav.glyphes": "Glyphs",
  "nav.guide": "Guide",

  "sous.coffre": "Test network — no monetary value",
  "sous.journal": "Genesis, keys, chain, proof",
  "sous.temoin": "Second memory — no keys",
  "sous.arbre": "A map, not a Merkle tree",
  "sous.reliques": "Epoch lumen",
  "sous.glyphes": "6 bits, not a key",
  "sous.guide": "Test network",

  "coffre.eidolon": "eidolon in vault",
  "coffre.sorties": "{n} output{s} · dust {dust} atoms",
  "coffre.ailleurs": "the proof lives elsewhere.",

  "atelier.titre": "Studio",
  "atelier.lede": "Two holes: several inputs, and dust. The validator does not touch them.",
  "atelier.mixte": "Mixed",
  "atelier.poussiere": "Dust",
  "atelier.fragmente": "Fragmented",
  "atelier.unePiece": "One coin",
  "atelier.vide": "Empty",
  "atelier.aide.mixte": "Eight outputs. 0.50 · 1.00 · 3.00 · 4.00 show both holes.",
  "atelier.aide.poussiere": "One output at 1.000090. Send 1.00: change becomes fee.",
  "atelier.aide.fragmente": "Ten times 0.15. Sending 0.60 requires consolidating first.",
  "atelier.aide.une-piece": "One output of 5. The old rule was enough.",
  "atelier.aide.vide": "Empty vault. The faucet pays 1 eidolon.",
  "atelier.robinetLocal": "Studio · +1 here",
  "atelier.robinetReseau": "Network · 1 eidolon",
  "atelier.aidePublique": "Public studio seed. Switch to a personal vault, then Network.",
  "atelier.aidePersonnel": "Network: a GitHub issue. The node pays in the next block.",
  "atelier.adresseIssue": "Address to paste in the issue",
  "atelier.popup": "Open the issue if the popup was blocked",

  "envoi.titre": "Send",
  "envoi.lede": "Smallest outputs that cover m + dust, at most three.",
  "envoi.montant": "Amount (eidolon)",
  "envoi.h050": "two small",
  "envoi.h100": "dust",
  "envoi.h300": "three coins",
  "envoi.h400": "fragmented",
  "envoi.regrouper": "Consolidate first",
  "envoi.envoyer": "Prepare send",
  "envoi.regrouper3": "Consolidate (≤ 3 → 1)",

  "err.montant": "Invalid amount.",
  "err.vide": "No spendable output.",
  "err.insuffisant": "Insufficient balance.",
  "err.fragmente": "balance sufficient but fragmented — consolidate first",
  "err.cle": "Key already used.",
  "err.dest": "Invalid destination address.",
  "err.atelier": "Public studio seed — switch to a personal vault.",
  "err.regrouper": "Nothing to consolidate — need at least two outputs.",

  "flash.robinet": "Faucet: +1 eidolon (here)",
  "flash.mine": "Block {h} mined · nonce {n}",
  "mine.bouton": "Mine {r}",
  "flash.reseau": "Submit the issue. Paid in the next block (≤ 1 h).",
  "flash.sigPoussiere": "Signed. Dust absorbed — {n} atoms as fee.",
  "flash.sig": "Signed (Lamport). {n} input{s}.",
  "flash.personnel": "Personal vault — seed drawn here.",
  "flash.atelier": "Public studio — known seed, no value.",
  "flash.scenario": "Studio: {id}",
  "flash.regrouper": "Consolidation signed: ≤ 3 outputs → 1.",

  "selecteur.titre": "Outputs · greedy cap {max}",
  "selecteur.vide": "Empty vault.",

  "decision.titre": "Decision · greedy, not quadratic",
  "decision.oui": "yes",
  "decision.non": "no",
  "decision.q.montant": "amount > 0?",
  "decision.q.solde": "balance ≥ m?",
  "decision.q.couverture": "3 largest ≥ m?",
  "decision.q.poussiere": "0 < change < 10,000 atoms?",
  "decision.invalide.titre": "Invalid amount",
  "decision.invalide.aide": "A strictly positive integer of atoms.",
  "decision.vide.titre": "Empty vault",
  "decision.vide.aide": "No spendable output.",
  "decision.insuffisant.titre": "Insufficient balance",
  "decision.insuffisant.aide": "The vault does not have m.",
  "decision.fragmente.titre": "Fragmented",
  "decision.fragmente.aide": "Balance is enough; three coins do not make m. Consolidate.",
  "decision.poussiere.titre": "Dust",
  "decision.poussiere.aide": "Change becomes fee. No dust output.",
  "decision.exact.titre": "Exact",
  "decision.exact.aide": "Inputs equal m. No change.",
  "decision.rendu.titre": "Change",
  "decision.rendu.aide": "A change output, fresh address.",
  "decision.note":
    "The greedy path classifies four outcomes, capped at three. This is not D = b² − 4ac.",

  "sorties.titre": "Book · {n} output{s}",
  "sorties.lede": "A Lamport key signs once. “Proof”: path to the book root.",
  "sorties.vide": "No output. Use the faucet.",
  "sorties.preuve": "proof",
  "copy.adresse": "Copy address",

  "genese.titre": "Genesis",
  "genese.lede": "Replay the frozen file.",
  "genese.lancer": "Run genesis",
  "genese.busyG": "Genesis…",
  "genese.busyP": "Wallet…",
  "genese.busy": "Replay…",
  "genese.ok": "Wallet in place. Signed sends work.",
  "genese.crash": "replay interrupted",
  "genese.okCount": "{titre} · {n} ok",
  "genese.fail": " · {n} failed",

  "cles.titre": "Keys",
  "cles.lede": "Every check is replayed here. A Lamport key signs once.",
  "cles.tous": "Every check holds",
  "cles.fautes": "{n} fault{s} · {a} warning{s}",
  "cles.attentions": "{a} warning{s} — test network",
  "cles.personnel": "Personal vault",
  "cles.atelier": "Public studio",
  "cles.masquer": "Hide seed",
  "cles.afficher": "Show seed",

  "chaine.titre": "Chain",
  "chaine.lede": "Block 0 frozen (18 bits). Later: book Merkle, bits 0. Export the tip.",
  "emission.ligne": "{age} · height {h} · R(h) = {r} — mined, not tapped.",
  "chaine.ok": "Tip · block {h} · chain intact",
  "chaine.ko": "Broken chain",
  "chaine.sansPow": "no PoW",
  "chaine.bits": "{n} bits",
  "chaine.copie": "Tip copied",
  "chaine.exporter": "Export tip",
  "chaine.ouvrir": "Open in witness",

  "merkle.titre": "Inclusion proof",
  "merkle.vide": "No leaf. The faucet makes one.",
  "merkle.ok": "Root matches. The coin is in the book.",
  "merkle.ko": "Broken root. The coin is not in this book.",
  "merkle.copie": "Copied",
  "merkle.copier": "Copy proof",
  "merkle.restaurer": "Restore leaf",
  "merkle.alterer": "Tamper with leaf",

  "temoin.titre": "Witness",
  "temoin.lede": "Second memory, no keys. Import a tip: another device can judge a proof.",
  "temoin.tete": "Known tip · block {h}",
  "temoin.vide": "No tip. Import one, or follow the ledger if it is here.",
  "temoin.suivre": "Follow the tip",
  "temoin.oublier": "Forget",
  "temoin.importer": "Import a tip",

  "guide.sous": "Guide — test network",
  "guide.h": "How to read",
  "guide.lede":
    "Vault: spend. Ledger: genesis. Witness: a tip. Tree: a map. Relics: lumen. Glyphs: 6 bits.",
  "guide.01": "Vault",
  "guide.01p":
    "One button: create the vault. Then spend. Greedy, at most three. Dust under 10,000 atoms.",
  "guide.02": "Ledger",
  "guide.02p": "Run genesis. Tap “proof” on an output. Export the tip.",
  "guide.03": "Witness",
  "guide.03p": "Adopt the tip, judge. Without following: foreign root.",
  "guide.04": "Tree",
  "guide.04p": "Spine, ten tiers, 33 sectors. An FNV pin is not a proof.",
  "guide.04b": "See the tree",
  "guide.05": "Relics",
  "guide.05p": "Four cavities. Find: ASCII measures a × a/2. Not a glyph.",
  "guide.05b": "See the relics",
  "guide.06": "Glyphs",
  "guide.06p": "Four figures, 64 stacks. 27 + 4. Tamper with a floor: checksum breaks.",
  "guide.06b": "Read the glyphs",
  "guide.07": "What this is not",
  "guide.07p": "No network node, no federation, no money.",

  "arbre.intro": "Prime spine. Ten tiers. Thirty-three sectors. Turn. Touch.",
  "arbre.axial": "Axial view: rings and axis. Collider tracks are not transactions.",
  "arbre.premier": "Prime: irreducible.",
  "arbre.palier": "What is below inherits constraints from above.",
  "arbre.racine": "Continuity root",
  "arbre.parent": "Parent {id} (D{p})",
  "arbre.curl": "Azimuthal circulation almost nil: no vortex.",
  "arbre.fermer": "Close",
  "arbre.ouv": "Opening the tree…",
  "arbre.souffle":
    "Breath ρ = {rho} · h = {h} · {age}. Prominences = anchored outputs. p = 41 at culmination.",
  "arbre.charge": "network charge · {m}",
  "arbre.chaud": "Coinbase sector — treasury pin.",

  "relique.lede": "Lumen = ellipse a × a/2. Not a glyph. The ratio does not grow.",
  "relique.coupe": "Cut",
  "relique.trouvaille": "Find",
  "relique.ouv": "Opening relics…",
  "relique.a": "a",
  "relique.b": "b",
  "relique.ratio": "b/a",
  "relique.aire": "area πab",
  "relique.epoques": "epochs",

  "glyphes.h": "Four figures",
  "glyphes.lede": "2 bits each. 31 groups: 27 + 4. Frozen: no Reed-Solomon, no Huffman.",
  "glyphes.empiler": "Stack",
  "glyphes.empilerLede": "Top, middle, bottom. The code is those three floors.",
  "glyphes.64": "The 64",
  "glyphes.64lede": "The whole alphabet. Nothing more.",
  "glyphes.adresse": "Address",
  "glyphes.adresseLede": "27 glyphs + 4 checksum. Tamper with a floor: it must break.",
  "glyphes.alterer": "Tamper with a floor",
  "glyphes.restaurer": "Restore",
  "glyphes.ok": "Checksum intact · {h}…",
  "glyphes.vide": "No output — the faucet makes one.",

  "creer.titre": "Create my vault",
  "creer.lede": "A seed in this browser. The tap pays 1 eidolon, once.",
  "creer.bouton": "Create my vault",
  "creer.fait": "Vault created. The seed stays here.",
  "robinet.bouton": "Faucet · +1",
  "creer.personnel": "Personal vault · this browser",
  "creer.auto": "1 eidolon paid here. Network request opened (a GitHub issue).",
  "creer.popup": "Open the issue if the popup was blocked",
  "psnx.exporter": "Export the vault",
  "psnx.importer": "Open a file",
  "psnx.aide":
    "Phone: a .eidos file opens the vault. An Eidolon .psnx is only a fingerprint — not the Lamport seed.",
  "psnx.refus": "PSNX fingerprint read. That is not the seed. Export a .eidos from this vault.",
  "psnx.importe": "Vault opened from file.",
  "psnx.digest": "digest",

  "lang.fr": "FR",
  "lang.en": "EN",
};

export type Msg = keyof typeof FR;

const DICT: Record<Locale, Record<Msg, string>> = { fr: FR, en: EN };

function detect(): Locale {
  try {
    const s = localStorage.getItem(KEY);
    if (s === "en" || s === "fr") return s;
    if (typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("en")) {
      return "en";
    }
  } catch {
    /* */
  }
  return "fr";
}

let locale: Locale = "fr";
const listeners = new Set<() => void>();

export function getLocale(): Locale {
  return locale;
}

export function setLocale(next: Locale) {
  locale = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* */
  }
  if (typeof document !== "undefined") document.documentElement.lang = next;
  for (const fn of listeners) fn();
}

export function hydrateLocale() {
  setLocale(detect());
}

export function t(key: Msg, vars?: Record<string, string | number>): string {
  let s = DICT[locale][key] ?? DICT.fr[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replaceAll(`{${k}}`, String(v));
    }
  }
  return s.replaceAll("{s}", vars && Number(vars.n) === 1 ? "" : locale === "en" ? "s" : "s");
}

export function useI18n(): { locale: Locale; t: typeof t; setLocale: typeof setLocale } {
  const [, tick] = useState(0);
  useEffect(() => {
    const fn = () => tick((x) => x + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return { locale, t, setLocale };
}
