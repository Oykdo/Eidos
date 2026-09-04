import { genesis } from "./genesis-data.ts";
import { ATOMES, MAX_ENTREES, POUSSIERE_ATOMES } from "./constantes.ts";
import {
  ageOf,
  empreinteTable,
  hashBloc0,
  rewardAt,
  T,
} from "./eonis.ts";
import { hexOf, sha256, utf8 } from "./hash.ts";
import {
  adresseDe,
  analyserGraine,
  demonstrerReemploi,
  lamportPublic,
  lamportSecret,
  lamportSign,
  lamportVerify,
  graineDe,
} from "./lamport.ts";
import { MSG_FRAGMENTE, selectionner } from "./coinselect.ts";
import { verifierChaine } from "./chaine.ts";
import {
  appliquerEnvoi,
  coffreAtelier,
  coffreNeuf,
} from "./wallet.ts";
import type { Coffre } from "./types.ts";

export type Controle = {
  id: string;
  ok: boolean;
  label: string;
  detail: string;
};

export type Rapport = {
  titre: string;
  ok: boolean;
  passes: number;
  echecs: number;
  controles: Controle[];
};

function C(
  id: string,
  ok: boolean,
  label: string,
  detail = "",
): Controle {
  return { id, ok, label, detail };
}

export function verifierParametres(): Controle[] {
  const g = genesis;
  const t = g.temps;
  const e = g.emission;
  return [
    C(
      "spec",
      g.spec === "eonis-genesis/1",
      "spécification",
      g.spec,
    ),
    C(
      "T",
      e.T === t.heures_par_epoque * t.blocs_par_heure && e.T === T,
      "T = heures × blocs/heure",
      `${t.heures_par_epoque} × ${t.blocs_par_heure} = ${e.T}`,
    ),
    C(
      "intervalle",
      t.intervalle_bloc_s * t.blocs_par_heure === 3600,
      "intervalle de bloc",
      `${t.intervalle_bloc_s} s × ${t.blocs_par_heure} = 3600`,
    ),
  ];
}

export function verifierAges(): Controle[] {
  const g = genesis;
  const out: Controle[] = [];
  let attendu = 0;
  let contigu = true;
  let totalAtomes = 0;
  let totalBlocs = 0;
  for (const age of g.ages) {
    contigu =
      contigu &&
      age.hauteur_debut === attendu &&
      age.hauteur_fin === attendu + age.blocs - 1;
    attendu += age.blocs;
    totalAtomes += age.emission_age_atomes;
    totalBlocs += age.blocs;
    out.push(
      C(
        `age-${age.nom}`,
        age.blocs === age.epoques * g.emission.T &&
          age.emission_age_atomes === age.a_eidolon * age.epoques * g.emission.T * ATOMES,
        `âge ${age.nom}`,
        `${age.epoques} époques · ${age.a_eidolon} eidôla · ${age.blocs} blocs`,
      ),
    );
  }
  out.push(
    C(
      "contigu",
      contigu,
      "âges contigus, sans trou ni recouvrement",
    ),
  );
  out.push(
    C(
      "total",
      totalAtomes === g.emission.total_atomes &&
        totalBlocs === g.emission.blocs_totaux &&
        totalBlocs / g.emission.T === g.temps.epoques_totales,
      "émission totale",
      `${g.emission.total_eidolon.toLocaleString("fr-FR")} eidôla · ${g.emission.blocs_totaux.toLocaleString("fr-FR")} blocs`,
    ),
  );
  return out;
}

export function verifierBloc0(): Controle[] {
  const b = genesis.bloc_genese;
  const rec = hashBloc0(b.message, b.horodatage_unix, b.nonce);
  const hashHex = hexOf(rec.hash);
  const n = BigInt("0x" + hashHex);
  const cible = 1n << BigInt(256 - b.bits);
  return [
    C(
      "merkle",
      hexOf(rec.merkle) === b.merkle_root,
      "racine de Merkle = SHA-256(message)",
      hexOf(rec.merkle).slice(0, 16),
    ),
    C(
      "hash",
      hashHex === b.hash,
      "hash du bloc 0 reproduit",
      hashHex.slice(0, 16),
    ),
    C(
      "pow",
      n < cible,
      "preuve de travail atteinte",
      `${b.bits} bits de tête`,
    ),
    C(
      "glyphes",
      rec.glyphes === b.glyphes,
      "glyphes du bloc 0",
    ),
    C(
      "recompense",
      rewardAt(0) === b.recompense_atomes,
      "récompense du bloc 0",
      `${(b.recompense_atomes / ATOMES).toFixed(6)} eidôlon`,
    ),
    C(
      "age0",
      ageOf(0)?.nom === "Satya",
      "bloc 0 dans Satya",
    ),
  ];
}

export function verifierTables(): Controle[] {
  const out: Controle[] = [];
  for (const age of genesis.ages) {
    const h = empreinteTable(age.a_eidolon);
    out.push(
      C(
        `table-${age.nom}`,
        h === age.table_sha256,
        `table ${age.nom} empreinte`,
        h.slice(0, 16),
      ),
    );
  }
  return out;
}

export function verifierPortefeuille(coffre: Coffre): Controle[] {
  const g = analyserGraine(coffre.maitre);
  const solde = coffre.sorties.reduce((s, o) => s + o.montant, 0);
  const adrOk =
    coffre.sorties.length === 0 ||
    coffre.sorties[0]!.adresse === adresseDe(coffre.maitre, coffre.sorties[0]!.indice);
  const uniques =
    new Set(coffre.sorties.map((s) => s.adresse)).size === coffre.sorties.length;
  return [
    C(
      "coffre",
      Boolean(coffre.maitre) && typeof coffre.n === "number",
      "coffre ouvert",
      coffre.nature === "personnel" ? "personnel" : "atelier public",
    ),
    C(
      "graine",
      g.forme === "hex256" || coffre.nature === "atelier",
      g.forme === "hex256" ? "graine à 256 bits" : "graine d'atelier (publique)",
      g.forme === "hex256" ? "CSPRNG du navigateur" : coffre.maitre,
    ),
    C(
      "adresses",
      adrOk,
      "adresses = SHA-256(graine pub ∥ racine L)[:20]",
      adrOk ? "rejouées depuis la graine" : "non reproductibles",
    ),
    C(
      "uniques",
      uniques,
      "une clé par sortie",
      `${coffre.sorties.length} sortie${coffre.sorties.length > 1 ? "s" : ""} · ${coffre.clesUsees.length} publiée${coffre.clesUsees.length > 1 ? "s" : ""}`,
    ),
    C(
      "solde",
      solde > 0,
      solde > 0 ? "solde en coffre" : "coffre vide — servir le robinet",
      `${(solde / ATOMES).toFixed(6)} eidôlon`,
    ),
  ];
}

export function verifierCrypto(): Controle[] {
  const seed = graineDe("eidos-atelier-reseau-essai-v1", 0);
  const sk = lamportSecret(seed);
  const pk = lamportPublic(sk);
  const m = sha256(utf8("message"));
  const sig = lamportSign(sk, m);
  const forge = demonstrerReemploi();
  return [
    C(
      "lamport",
      lamportVerify(pk, m, sig) && !lamportVerify(pk, sha256(utf8("autre")), sig),
      "Lamport signe et vérifie",
      `pk ${pk.length} o · sig ${sig.length} o`,
    ),
    C(
      "reemploi",
      forge.verifieForge && forge.verifie1 && forge.verifie2,
      "deux signatures forgent un troisième message",
      `${forge.bits} bits divergents · le validateur doit refuser la clé`,
    ),
    C(
      "poussiere",
      POUSSIERE_ATOMES === 10_000 && MAX_ENTREES === 3,
      "poussière 10 000 atomes · au plus 3 entrées",
    ),
  ];
}

export function verifierEchanges(coffre: Coffre): Controle[] {
  const solde = coffre.sorties.reduce((s, o) => s + o.montant, 0);
  const essai = 1 * ATOMES;
  const sel = selectionner(coffre.sorties, essai);
  const liveOk = sel.ok;
  const fragmente = !sel.ok && sel.code === "fragmente";

  const temoin = coffreAtelier("une-piece");
  const envoi = appliquerEnvoi(temoin, essai, "00".repeat(20));
  const signe = envoi.selection.ok && envoi.coffre.derniereSig?.ok === true;
  const reuse = appliquerEnvoi(
    {
      ...envoi.coffre,
      sorties: temoin.sorties,
      clesUsees: envoi.coffre.clesUsees,
    },
    essai,
    "00".repeat(20),
  );
  const refuseReuse = !reuse.selection.ok && reuse.selection.code === "cle";

  const perso = coffreNeuf("une-piece");
  const persoOk = /^[0-9a-f]{64}$/.test(perso.maitre);

  return [
    C(
      "essai",
      Boolean(signe),
      "échange d'essai signé (Lamport)",
      signe
        ? `${envoi.coffre.derniereSig!.entrees} entrée · ${envoi.coffre.derniereSig!.txid.slice(0, 16)}…`
        : envoi.selection.ok
          ? "signature manquante"
          : "sélection refusée",
    ),
    C(
      "reuse",
      refuseReuse,
      "réemploi de clé refusé",
    ),
    C(
      "ce-coffre",
      liveOk,
      liveOk
        ? "ce coffre peut envoyer 1 eidôlon"
        : fragmente
          ? MSG_FRAGMENTE
          : solde === 0
            ? "coffre vide — servir le robinet"
            : sel.message,
      liveOk && sel.ok
        ? `${sel.entrees.length} entrée${sel.entrees.length > 1 ? "s" : ""}`
        : "",
    ),
    C(
      "personnel",
      persoOk,
      "coffre personnel possible",
      "256 bits au générateur du navigateur",
    ),
  ];
}

export function verifierJournal(coffre: Coffre): Controle[] {
  return verifierChaine(coffre).map((c) =>
    C(c.id, c.ok, c.label, c.detail),
  );
}

export function lancerGenese(): Rapport {
  const controles = [
    ...verifierParametres(),
    ...verifierAges(),
    ...verifierBloc0(),
    ...verifierTables(),
  ];
  const passes = controles.filter((c) => c.ok).length;
  const echecs = controles.length - passes;
  return {
    titre: "Genèse",
    ok: echecs === 0,
    passes,
    echecs,
    controles,
  };
}

export function lancerPrealables(coffre: Coffre): Rapport {
  const controles = [
    ...verifierCrypto(),
    ...verifierPortefeuille(coffre),
    ...verifierEchanges(coffre),
    ...verifierJournal(coffre),
  ];
  const passes = controles.filter((c) => c.ok).length;
  const echecs = controles.length - passes;
  return {
    titre: "Tests préalables",
    ok: echecs === 0,
    passes,
    echecs,
    controles,
  };
}

export { genesis };
