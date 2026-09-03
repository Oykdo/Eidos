import { sceller, blocGenese, merkleCarnet, chercherNonce } from "./chaine.ts";
import { ATOMES, BITS_MINE } from "./constantes.ts";
import { genesis } from "./genesis-data.ts";
import { rewardAt } from "./eonis.ts";
import { fromHex, hexOf } from "./hash.ts";
import {
  adresseDe,
  signerEntrees,
  txidLabel,
} from "./lamport.ts";
import type { Coffre, HistoriqueTx, ScenarioId, Sortie } from "./types.ts";
import { choisirRegroupement, selectionner } from "./coinselect.ts";

function aleaHex(n = 32): string {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return hexOf(b);
}

export const MAITRE_ATELIER = "eidos-atelier-reseau-essai-v1";

export const SCENARIOS: Record<
  ScenarioId,
  { nom: string; aide: string; montants: number[] }
> = {
  mixte: {
    nom: "Mixte",
    aide: "Huit sorties de tailles différentes. 0,50 · 1,00 · 3,00 · 4,00 révèlent les deux trous.",
    montants: [
      12_000_000, 15_000_000, 15_000_000, 18_000_000, 22_000_000, 40_000_000,
      100_009_000, 250_000_000,
    ],
  },
  poussiere: {
    nom: "Poussière",
    aide: "Une seule sortie à 1,000090. Envoyer 1,000000 : le rendu de 9 000 atomes devient frais.",
    montants: [100_009_000],
  },
  fragmente: {
    nom: "Fragmenté",
    aide: "Dix sorties de 0,15. Trois ne font que 0,45 : un envoi de 0,60 exige de regrouper.",
    montants: Array.from({ length: 10 }, () => 15_000_000),
  },
  "une-piece": {
    nom: "Une pièce",
    aide: "Une sortie de 5 eidôla. L'ancienne règle suffisait : une entrée, un rendu.",
    montants: [5 * ATOMES],
  },
  vide: {
    nom: "Vide",
    aide: "Coffre sans sorties. Le robinet verse 1 eidôlon sur une adresse neuve.",
    montants: [],
  },
};

function coffreVide(
  maitre: string,
  nature: Coffre["nature"],
  scenario: ScenarioId,
): Coffre {
  return {
    maitre,
    n: 0,
    sorties: [],
    historique: [],
    scenario,
    nature,
    clesUsees: [],
    derniereSig: null,
    chaine: [blocGenese()],
  };
}

export function coffreNeuf(scenario: ScenarioId = "mixte"): Coffre {
  return chargerScenario(coffreVide(aleaHex(32), "personnel", scenario), scenario);
}

export function coffreAtelier(scenario: ScenarioId = "mixte"): Coffre {
  return chargerScenario(coffreVide(MAITRE_ATELIER, "atelier", scenario), scenario);
}

export function chargerScenario(coffre: Coffre, scenario: ScenarioId): Coffre {
  const spec = SCENARIOS[scenario];
  let n = coffre.n;
  const sorties: Sortie[] = [];
  for (let i = 0; i < spec.montants.length; i++) {
    const indice = n;
    n += 1;
    const adresse = adresseDe(coffre.maitre, indice);
    const txid = txidLabel(`scenario/${scenario}/${i}/${adresse}`);
    sorties.push({
      ref: `${txid}:0`,
      txid,
      rang: 0,
      adresse,
      indice,
      montant: spec.montants[i]!,
    });
  }
  return sceller(
    {
      ...coffre,
      n,
      sorties,
      scenario,
      historique: [],
      clesUsees: [],
      derniereSig: null,
      chaine: [blocGenese()],
    },
    "atelier",
  );
}

export function verserRobinet(coffre: Coffre, atomes = ATOMES): Coffre {
  const indice = coffre.n;
  const adresse = adresseDe(coffre.maitre, indice);
  const txid = txidLabel(`robinet/${indice}/${adresse}/${Date.now()}`);
  const sortie: Sortie = {
    ref: `${txid}:0`,
    txid,
    rang: 0,
    adresse,
    indice,
    montant: atomes,
  };
  const histo: HistoriqueTx = {
    txid,
    at: Date.now(),
    montant: atomes,
    entrees: 0,
    rendu: 0,
    frais: 0,
    poussiere: false,
    kind: "robinet",
    note: "Robinet — 1 eidôlon",
  };
  return sceller(
    {
      ...coffre,
      n: indice + 1,
      sorties: [...coffre.sorties, sortie],
      historique: [histo, ...coffre.historique],
    },
    "robinet",
  );
}

export function minerCoffre(coffre: Coffre, bits = BITS_MINE, tsFixe?: number): Coffre {
  const base = coffre.chaine?.length ? coffre.chaine : [blocGenese()];
  const prev = base[base.length - 1]!;
  const hauteur = prev.hauteur + 1;
  const atomes = rewardAt(hauteur);
  if (atomes <= 0) return coffre;
  const indice = coffre.n;
  const adresse = adresseDe(coffre.maitre, indice);
  const txid = txidLabel(`mine/${hauteur}/${adresse}`);
  const sortie: Sortie = {
    ref: `${txid}:0`,
    txid,
    rang: 0,
    adresse,
    indice,
    montant: atomes,
  };
  const sorties = [...coffre.sorties, sortie];
  const merkle = merkleCarnet(sorties);
  const ts =
    tsFixe ??
    (coffre.nature === "atelier"
      ? genesis.bloc_genese.horodatage_unix + base.length
      : Math.floor(Date.now() / 1000));
  const trouve = chercherNonce({
    hauteur,
    prev: prev.hash,
    merkle,
    ts,
    bits,
  });
  const histo: HistoriqueTx = {
    txid,
    at: ts * 1000,
    montant: atomes,
    entrees: 0,
    rendu: 0,
    frais: 0,
    poussiere: false,
    kind: "mine",
    note: `Mine · bloc ${hauteur}`,
  };
  return {
    ...coffre,
    n: indice + 1,
    sorties,
    historique: [histo, ...coffre.historique],
    chaine: [
      ...base,
      {
        hauteur,
        prev: prev.hash,
        merkle,
        ts,
        nonce: trouve.nonce,
        bits,
        hash: trouve.hash,
        glyphes: trouve.glyphes,
        motif: "mine",
      },
    ],
  };
}

export function appliquerEnvoi(
  coffre: Coffre,
  montant: number,
  destHex: string,
): { coffre: Coffre; selection: ReturnType<typeof selectionner> } {
  const sel = selectionner(coffre.sorties, montant);
  if (!sel.ok) return { coffre, selection: sel };

  const dest = fromHex(destHex);
  if (dest.length !== 20) {
    return {
      coffre,
      selection: {
        ok: false,
        code: "cle",
        message: "Adresse de destination invalide.",
        solde: coffre.sorties.reduce((s, o) => s + o.montant, 0),
        couvertureMax: 0,
      },
    };
  }

  const consommees = new Set(sel.entrees.map((e) => e.ref));
  const restant = coffre.sorties.filter((s) => !consommees.has(s.ref));
  let n = coffre.n;
  const indiceRendu = sel.rendu > 0 ? n : null;
  if (indiceRendu != null) n += 1;

  const sig = signerEntrees(
    coffre.maitre,
    sel.entrees,
    dest,
    montant,
    sel.rendu,
    indiceRendu,
  );

  if (!sig.ok) {
    return {
      coffre,
      selection: {
        ok: false,
        code: "cle",
        message: sig.erreur ?? "Signature refusée.",
        solde: coffre.sorties.reduce((s, o) => s + o.montant, 0),
        couvertureMax: 0,
      },
    };
  }

  for (const emp of sig.empreintes) {
    if (coffre.clesUsees.includes(emp)) {
      return {
        coffre,
        selection: {
          ok: false,
          code: "cle",
          message: "Clé Lamport déjà employée — usage unique.",
          solde: coffre.sorties.reduce((s, o) => s + o.montant, 0),
          couvertureMax: 0,
        },
      };
    }
  }

  const nôtres: Sortie[] = [...restant];
  if (sel.rendu > 0 && indiceRendu != null && sig.adresseRendu) {
    nôtres.push({
      ref: `${sig.txid}:1`,
      txid: sig.txid,
      rang: 1,
      adresse: sig.adresseRendu,
      indice: indiceRendu,
      montant: sel.rendu,
    });
  }

  const histo: HistoriqueTx = {
    txid: sig.txid,
    at: Date.now(),
    montant,
    entrees: sel.entrees.length,
    rendu: sel.rendu,
    frais: sel.frais,
    poussiere: sel.poussiere,
    kind: "envoi",
    note: sel.poussiere
      ? `Signé. Poussière absorbée (${sel.frais} atomes de frais)`
      : `Signé. ${sel.entrees.length} entrée${sel.entrees.length > 1 ? "s" : ""}`,
  };

  return {
    coffre: sceller(
      {
        ...coffre,
        n,
        sorties: nôtres,
        historique: [histo, ...coffre.historique],
        clesUsees: [...coffre.clesUsees, ...sig.empreintes],
        derniereSig: {
          txid: sig.txid,
          ok: true,
          entrees: sel.entrees.length,
          octets: sig.octets,
        },
      },
      "envoi",
    ),
    selection: sel,
  };
}

export function appliquerRegroupement(coffre: Coffre): Coffre {
  const prises = choisirRegroupement(coffre.sorties);
  if (prises.length < 2) return coffre;
  const total = prises.reduce((s, o) => s + o.montant, 0);
  const consommees = new Set(prises.map((e) => e.ref));
  const restant = coffre.sorties.filter((s) => !consommees.has(s.ref));
  const indice = coffre.n;
  const adresse = adresseDe(coffre.maitre, indice);
  const sig = signerEntrees(
    coffre.maitre,
    prises,
    fromHex(adresse),
    total,
    0,
    null,
  );
  if (!sig.ok) return coffre;
  for (const emp of sig.empreintes) {
    if (coffre.clesUsees.includes(emp)) return coffre;
  }
  const fusion: Sortie = {
    ref: `${sig.txid}:0`,
    txid: sig.txid,
    rang: 0,
    adresse,
    indice,
    montant: total,
  };
  const histo: HistoriqueTx = {
    txid: sig.txid,
    at: Date.now(),
    montant: total,
    entrees: prises.length,
    rendu: 0,
    frais: 0,
    poussiere: false,
    kind: "regroupement",
    note: `Regroupement ${prises.length} → 1`,
  };
  return sceller(
    {
      ...coffre,
      n: indice + 1,
      sorties: [...restant, fusion],
      historique: [histo, ...coffre.historique],
      clesUsees: [...coffre.clesUsees, ...sig.empreintes],
      derniereSig: {
        txid: sig.txid,
        ok: true,
        entrees: prises.length,
        octets: sig.octets,
      },
    },
    "regroupement",
  );
}
