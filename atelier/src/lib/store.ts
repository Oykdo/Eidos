import { create } from "zustand";
import {
  coffreAtelier,
  coffreNeuf,
  chargerScenario,
  verserRobinet,
  appliquerEnvoi,
  appliquerRegroupement,
  minerCoffre,
  chargerTestnet,
  acheterRelique as appliquerAchat,
} from "./eidos/wallet.ts";
import { blocGenese, sceller } from "./eidos/chaine.ts";
import {
  adopterTete,
  avancer,
  juger,
  jugerSortieReseau,
  parserTete,
  suivreReseau,
  temoinVide,
  type Temoin,
  type TemoinReseau,
} from "./eidos/temoin.ts";
import type { Coffre, NomAge, ScenarioId } from "./eidos/types.ts";
import type { PreuvePortable } from "./eidos/merkle.ts";
import { type DemandeRobinet } from "./eidos/robinet.ts";
import { ETAT_URL, lireEtat, urlIssueEnvoi } from "./eidos/envoi.ts";
import { verifierAdresse } from "./eidos/glyphs.ts";
import {
  MEMPOOL_URL,
  parserCanaux,
  parserEtat,
  parserMempool,
  statutDemande,
  type CanauxRobinet,
  type DemandeReseau,
} from "./eidos/etat-reseau.ts";
import { adresseDe } from "./eidos/lamport.ts";
import { agesScelles, sceauxDuCoffre, type EntreeMonde, type Sceau } from "./eidos/sceaux.ts";
import {
  abandonnerDansCoffre,
  commencerDansCoffre,
  exporterAscension,
  finDeSalleDansCoffre,
} from "./eidos/ascension.ts";
import { serialiserAscension } from "./eidos/ancrage.ts";
import type { Choix } from "./eidos/pendule.ts";
import { fouillerCaseDansCoffre } from "./eidos/fouilles.ts";
import { suivreChaine, tetesDeLaVeillee } from "./eidos/chaine-reseau.ts";
import { FEDERATION_URL, parserFederation, type FederationPublique, type TeteReseau } from "./eidos/temoin.ts";
import { serialiserVeillee } from "./eidos/veillee.ts";
import { classer, lireVeillees, type Classement, type RefusLecture } from "./eidos/classement.ts";
import { jouerRetour, motifRetour } from "./eidos/feuille-son.ts";
import {
  abandonnerVeilleeDansCoffre,
  capturerDansCoffre,
  creuserDansCoffre,
  effacerVeilleeDansCoffre,
  exporterVeilleeDuCoffre,
  franchirDansCoffre,
  ouvrirAlcoveDansCoffre,
  ouvrirVeilleeDansCoffre,
  parlerDansCoffre,
  reserverEnSession,
  veilleeDe,
  type GesteOk,
  type RefusVeillee,
  type Reserver,
} from "./eidos/veillee-tour.ts";
import { preuveReseau, serialiser as serialiserPreuve } from "./eidos/merkle.ts";
import { reclamerDansCoffre } from "./eidos/coffre-horaire.ts";
import { selectionner, parserMontant } from "./eidos/coinselect.ts";
import { getLocale, t, type Msg } from "./i18n.ts";
import { estPsnxEtranger } from "./eidos/portable.ts";
import { exporterCarnet, ouvrirFichier } from "./eidos/carnet.ts";
import { spinorDepuisOctets, type SpinorPublic } from "./eidos/spinor.ts";
import { tirerDansCoffre, normaliserObjets, signatureDe } from "./eidos/inventaire.ts";
import { craftDansCoffre, divinDansCoffre, type NomArme } from "./eidos/equipement.ts";
import { peutMiner } from "./eidos/poste.ts";
import { normaliserTour, tourDe} from "./eidos/jauge.ts";
import { honorerDansCoffre, tournerDansLaTour } from "./eidos/hotes.ts";
import { boireDansCoffre } from "./eidos/elixirs.ts";
import { arriverDansCoffre, franchirAntre, ouvrirAlcove } from "./eidos/secrets.ts";
import {
  capsuleDeThalie,
  forgerCapsule,
  libererDansCoffre,
  prendreDansCoffre,
} from "./eidos/capsules.ts";
import { accorderDansCoffre, offrirDansCoffre } from "./eidos/bestiaire.ts";
import { ETAGES, biomeDe } from "./eidos/tour.ts";

const KEY = "eidos-coffre-v2";
const KEY_TEMOIN = "eidos-temoin-v1";

type Etat = {
  coffre: Coffre;
  saisieMontant: string;
  saisieDest: string;
  destInterne: boolean;
  /**
   * La depense signee, gardee jusqu'au depot. **Rien n'est envoye tant que le
   * noeud ne l'a pas incluse** : le coffre a deja retire ses pieces et brule
   * sa cle, mais seule l'issue porte la transaction jusqu'au reseau. Jamais
   * persistee : elle vit le temps de la copier.
   */
  envoiSigne: { texte: string; txid: string; url: string; entrees: number } | null;
  oublierEnvoi: () => void;
  erreur: string | null;
  flash: string | null;
  preuveRef: string | null;
  temoin: Temoin;
  temoinFlash: string | null;
  /** Tête du réseau d'essai, vérifiée à la lecture ; jamais persistée. */
  reseau: TemoinReseau | null;
  reseauOccupe: boolean;
  suivreReseau: () => Promise<void>;
  jugerReseau: (ref: string) => void;
  /** Reliques du monde (etat.json.reliques) ; null tant que rien n'est lu. Lecture, pas preuve. */
  monde: EntreeMonde[] | null;
  chargerMonde: () => Promise<void>;
  sceaux: () => Sceau[];
  agesScelles: () => NomAge[];
  hydrater: () => void;
  charger: (id: ScenarioId) => void;
  robinet: () => void;
  demandeReseau: DemandeRobinet | null;
  /** Le robinet vu du réseau : canaux publiés, demande de ce coffre dans la
   *  file, hauteur ; lecture (etat.json, mempool.json), jamais persistée. */
  canaux: CanauxRobinet | null;
  demandeStatut: DemandeReseau | null;
  reseauHauteur: number | null;
  robinetOccupe: boolean;
  lireRobinet: () => Promise<void>;
  chargerReseau: () => Promise<void>;
  noterDemande: (r: DemandeRobinet) => void;
  envoyer: () => void;
  regrouper: () => void;
  personnel: () => void;
  atelier: () => void;
  creer: () => void;
  miner: () => void;
  acheterRelique: (nom: NomAge) => void;
  tirer: () => void;
  craft: (i: number, j: number) => void;
  divin: (nom: NomArme) => void;
  setMontant: (s: string) => void;
  setDest: (s: string) => void;
  setDestInterne: (v: boolean) => void;
  setPreuveRef: (ref: string | null) => void;
  suivreTete: () => void;
  soumettrePreuve: (p: PreuvePortable) => void;
  oublierTemoin: () => void;
  importerTete: (raw: string) => void;
  exporterFichier: () => string;
  importerFichier: (nom: string, data: ArrayBuffer | string) => void;
  psnx: SpinorPublic | null;
  /** La Tour — jauge hors feuille, docs/SPEC_TOUR.md */
  allerEtage: (etage: number) => void;
  honorer: () => void;
  boire: (i: number) => void;
  porter: (mot: number | null) => void;
  liberer: (mot: number | null) => void;
  prendre: (k: number, i: number) => void;
  franchir: () => void;
  fouiller: () => void;
  /** Un coup de bêche sur une case de la dalle (fouilles.ts) */
  fouillerCase: (x: number, y: number) => void;
  capsuleThalie: () => void;
  forgerCapsule: (iGemme: number, iSel: number) => void;
  tournerTour: (i: number, j: number) => void;
  accorder: (i: number) => void;
  offrir: (i: number) => void;
  /** Le pendule : ascension libre (lecture) ou ancrée (ce qui compte) */
  commencerAscension: (ref: string | null) => void;
  finDeSalle: (decision?: Choix | null) => void;
  abandonnerAscension: () => void;
  derniereAscension: string | null;
  /** La veillée — chaine-reseau.ts, veillee-tour.ts. La chaîne lue et la fédération ne sont jamais persistées. */
  chaine: { tetes: TeteReseau[]; hauteur: number } | null;
  chaineOccupe: boolean;
  federation: FederationPublique | null;
  suivreChaine: () => Promise<void>;
  /** ref null : une veillée libre, sans pièce — une lecture */
  ouvrirVeillee: (ref: string | null) => void;
  reclamerCoffreHoraire: (ref: string) => void;
  veilleeParler: () => void;
  veilleeCreuser: (x: number, y: number) => void;
  veilleeAlcove: () => void;
  veilleeCapturer: (k: number, i: number) => void;
  veilleeFranchir: (decision?: Choix | null) => void;
  veilleeAbandonner: () => void;
  veilleeEffacer: () => void;
  derniereVeillee: string | null;
  /** Le classement : les preuves de veillees/ relues et jugées ici ; jamais persisté. */
  classement: Classement | null;
  classementRefus: RefusLecture[];
  classementOccupe: boolean;
  lireClassement: () => Promise<void>;
};

function persister(c: Coffre) {
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    /* quota */
  }
}

const KEY_RESERVE = "eidos-veillee-reserve-v1";

/** La réserve d'indice, écrite dans localStorage AVANT la signature (comme
 *  indice-<v>.json chez un validateur) ; repli sur la session si le stockage manque. */
const reserverLocal: Reserver = (racine, i) => {
  try {
    const m = JSON.parse(localStorage.getItem(KEY_RESERVE) ?? "{}") as Record<string, unknown>;
    const dernier = typeof m[racine] === "number" ? (m[racine] as number) : 0;
    if (i < dernier) return false;
    m[racine] = i + 1;
    localStorage.setItem(KEY_RESERVE, JSON.stringify(m));
  } catch {
    /* stockage absent : la session fait foi */
  }
  return reserverEnSession(racine, i);
};

/** Après un geste : persister, dire la feuille ou la fin, préparer l'export si elle est finie. */
function apresGeste(
  r: GesteOk | RefusVeillee,
  set: (p: Partial<Pick<Etat, "coffre" | "erreur" | "flash" | "derniereVeillee">>) => void,
): void {
  if (!r.ok) {
    set({ erreur: `${t(`veillee.err.${r.code}` as Msg)} — ${r.motif}`, flash: null });
    return;
  }
  persister(r.coffre);
  let derniereVeillee: string | null = null;
  const w = veilleeDe(r.coffre);
  if (w && w.v.fin !== null) {
    const ex = exporterVeilleeDuCoffre(r.coffre);
    if (!("ok" in ex)) derniereVeillee = serialiserVeillee(ex);
  }
  let flash = r.fin ? t(`veillee.fin.${r.fin}` as Msg) : t("veillee.flash.feuille", { n: r.feuilles });
  if (r.ajoutes.length > 0 && !r.fin) flash += ` · ${t("veillee.sac.ajoute", { n: r.ajoutes.length })}`;
  if (r.verses.length > 0) flash += ` ${t("veillee.sac.verse", { n: r.verses.length })}`;
  if (r.perdus.length > 0) flash += ` ${t("veillee.sac.perdu", { n: r.perdus.length })}`;
  set({ coffre: r.coffre, erreur: null, flash, derniereVeillee });
  // le retour de la feuille : un son sec, la dernière = silence ; une porte fermée ne brûle rien, rien ne sonne
  if (r.fin !== "porte") jouerRetour(motifRetour(r.feuilles, r.fin, biomeDe(r.coffre.tour.etage).id));
}

function persisterTemoin(t: Temoin) {
  try {
    localStorage.setItem(KEY_TEMOIN, JSON.stringify(t));
  } catch {
    /* quota */
  }
}

function montantPour(id: ScenarioId): string {
  if (id === "fragmente") return "0.60";
  if (id === "poussiere") return "1.00";
  if (id === "une-piece") return "1.00";
  if (id === "vide") return "";
  return "4.00";
}

export const useCoffre = create<Etat>((set, get) => ({
  coffre: coffreAtelier("vide"),
  saisieMontant: "",
  saisieDest: "",
  destInterne: true,
  envoiSigne: null,
  erreur: null,
  flash: null,
  preuveRef: null,
  temoin: temoinVide(),
  temoinFlash: null,
  reseau: null,
  reseauOccupe: false,
  monde: null,
  derniereAscension: null,
  chaine: null,
  chaineOccupe: false,
  federation: null,
  derniereVeillee: null,
  classement: null,
  classementRefus: [],
  classementOccupe: false,
  demandeReseau: null,
  canaux: null,
  demandeStatut: null,
  reseauHauteur: null,
  robinetOccupe: false,
  psnx: null,

  hydrater: () => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        let coffre = JSON.parse(raw) as Coffre;
        if (coffre?.maitre && Array.isArray(coffre.sorties)) {
          if (!Array.isArray(coffre.clesUsees)) coffre.clesUsees = [];
          if (coffre.nature !== "personnel") coffre.nature = "atelier";
          if (coffre.derniereSig === undefined) coffre.derniereSig = null;
          if (!Array.isArray(coffre.reliques)) coffre.reliques = [];
          coffre.objets = normaliserObjets(coffre.objets);
          if (coffre.philosophale === undefined) coffre.philosophale = null;
          coffre.tour = normaliserTour(coffre.tour);
          if (!Array.isArray(coffre.chaine) || coffre.chaine.length === 0) {
            coffre = sceller({ ...coffre, chaine: [blocGenese()] }, "atelier");
          }
          set({
            coffre,
            saisieMontant: montantPour(coffre.scenario ?? "mixte"),
          });
        }
      }
    } catch {
      /* */
    }
    try {
      const rawT = localStorage.getItem(KEY_TEMOIN);
      if (!rawT) return;
      const temoin = JSON.parse(rawT) as Temoin;
      if (temoin && (temoin.tete === null || typeof temoin.tete?.hash === "string")) {
        if (!Array.isArray(temoin.vues)) temoin.vues = [];
        set({ temoin });
      }
    } catch {
      /* */
    }
  },

  charger: (id) => {
    const next = chargerScenario(get().coffre, id);
    persister(next);
    set({
      coffre: next,
      saisieMontant: montantPour(id),
      erreur: null,
      flash: t("flash.scenario", { id }),
      preuveRef: next.sorties[0]?.ref ?? null,
    });
  },

  robinet: () => {
    const next = verserRobinet(get().coffre);
    persister(next);
    set({ coffre: next, flash: t("flash.robinet"), erreur: null });
  },

  noterDemande: (r) => set({ demandeReseau: r, erreur: null, flash: t("flash.reseau") }),

  lireRobinet: async () => {
    const { coffre } = get();
    const maitre = coffre.maitre;
    const adresses = new Set<string>();
    for (let i = 0; i < coffre.n + 8; i++) adresses.add(adresseDe(coffre.maitre, i));
    try {
      const [re, rm] = await Promise.all([
        fetch(ETAT_URL, { cache: "no-store" }),
        fetch(MEMPOOL_URL, { cache: "no-store" }),
      ]);
      const etat: unknown = re.ok ? await re.json() : null;
      const mempool: unknown = rm.ok ? await rm.json() : null;
      if (get().coffre.maitre !== maitre) return; // le coffre a changé pendant la lecture
      set({
        canaux: etat ? parserCanaux(etat) : get().canaux,
        reseauHauteur: etat ? parserEtat(etat).hauteur : get().reseauHauteur,
        demandeStatut: mempool ? statutDemande(parserMempool(mempool), adresses) : get().demandeStatut,
      });
    } catch {
      /* réseau injoignable : on garde ce qu'on a */
    }
  },

  chargerReseau: async () => {
    if (get().robinetOccupe) return;
    const coffre = get().coffre;
    if (coffre.nature !== "personnel") {
      set({ erreur: t("err.atelier") });
      return;
    }
    set({ robinetOccupe: true });
    try {
      const etat = await lireEtat();
      if (get().coffre.maitre !== coffre.maitre) return; // le coffre a changé pendant la lecture
      const next = chargerTestnet(coffre, etat);
      if (next.sorties.length === 0) {
        set({ erreur: null, flash: t("robinet.chargeVide"), reseauHauteur: etat.hauteur });
        return;
      }
      // les pièces du réseau remplacent les pièces locales : seul le carnet
      // du nœud fait foi, et on le dit quand quelque chose disparaît
      const refs = new Set(next.sorties.map((s) => s.ref));
      const retirees = coffre.sorties.filter((s) => !refs.has(s.ref)).length;
      persister(next);
      set({
        coffre: next,
        erreur: null,
        flash:
          retirees > 0
            ? t("robinet.chargeRemplace", { n: next.sorties.length, m: retirees })
            : t("robinet.charge", { n: next.sorties.length }),
        reseauHauteur: etat.hauteur,
      });
    } catch {
      set({ erreur: t("robinet.injoignable") });
    } finally {
      set({ robinetOccupe: false });
    }
  },

  envoyer: () => {
    const { coffre, saisieMontant, saisieDest } = get();
    const m = parserMontant(saisieMontant);
    if (m == null) {
      set({ erreur: t("err.montant") });
      return;
    }
    const sel = selectionner(coffre.sorties, m);
    if (!sel.ok) {
      set({ erreur: t(`err.${sel.code}` as Msg) });
      return;
    }
    // La destination est obligatoire, et elle se lit en glyphes : les quatre
    // groupes de controle refusent une adresse alteree. Sans ce garde-fou, une
    // saisie vide signait vers l'adresse nulle — la piece brulee et la cle
    // WOTS+ consommee pour rien, puisqu'une cle ne signe qu'une fois.
    let dest: string;
    try {
      dest = verifierAdresse(saisieDest).hexa;
    } catch (e) {
      set({ erreur: e instanceof Error ? e.message : t("err.dest") });
      return;
    }
    const { coffre: next, selection, envoi } = appliquerEnvoi(coffre, m, dest);
    if (!selection.ok) {
      set({ erreur: t(`err.${selection.code}` as Msg) });
      return;
    }
    if (!envoi) {
      set({ erreur: t("err.dest") });
      return;
    }
    persister(next);
    set({
      coffre: next,
      erreur: null,
      envoiSigne: {
        texte: envoi.texte,
        txid: envoi.txid,
        url: urlIssueEnvoi(envoi.texte),
        entrees: selection.entrees.length,
      },
      flash: selection.poussiere
        ? t("flash.sigPoussiere", { n: selection.frais })
        : t("flash.sig", { n: selection.entrees.length }),
    });
  },

  oublierEnvoi: () => set({ envoiSigne: null }),

  regrouper: () => {
    const { coffre } = get();
    if (coffre.sorties.length < 2) {
      set({ erreur: t("err.regrouper") });
      return;
    }
    const next = appliquerRegroupement(coffre);
    persister(next);
    set({ coffre: next, erreur: null, flash: t("flash.regrouper") });
  },

  personnel: () => {
    const next = coffreNeuf("vide");
    persister(next);
    set({
      coffre: next,
      saisieMontant: "",
      erreur: null,
      flash: t("flash.personnel"),
    });
  },

  creer: () => {
    if (get().coffre.nature === "personnel") return;
    let next = coffreNeuf("vide");
    next = verserRobinet(next);
    persister(next);
    set({
      coffre: next,
      saisieMontant: "0.50",
      erreur: null,
      flash: t("creer.fait"),
      demandeReseau: null,
    });
  },

  miner: () => {
    const actuel = get().coffre;
    if (!peutMiner(actuel)) {
      set({ erreur: t("inv.epuise"), flash: null });
      return;
    }
    const next = minerCoffre(actuel);
    persister(next);
    const tip = next.chaine[next.chaine.length - 1]!;
    set({
      coffre: next,
      erreur: null,
      flash: t("flash.mine", { h: String(tip.hauteur), n: String(tip.nonce) }),
    });
  },

  atelier: () => {
    const id = get().coffre.scenario ?? "mixte";
    const next = coffreAtelier(id);
    persister(next);
    set({
      coffre: next,
      saisieMontant: montantPour(id),
      erreur: null,
      flash: t("flash.atelier"),
    });
  },

  setMontant: (s) => set({ saisieMontant: s, erreur: null }),
  setDest: (s) => set({ saisieDest: s }),
  setDestInterne: (v) => set({ destInterne: v }),
  setPreuveRef: (ref) => set({ preuveRef: ref }),

  suivreTete: () => {
    const { temoin, coffre } = get();
    const r = avancer(temoin, coffre.chaine ?? []);
    persisterTemoin(r.temoin);
    set({ temoin: r.temoin, temoinFlash: r.message });
  },

  soumettrePreuve: (p) => {
    const { temoin } = get();
    const r = juger(temoin, p);
    persisterTemoin(r.temoin);
    set({ temoin: r.temoin, temoinFlash: r.vue.detail });
  },

  oublierTemoin: () => {
    const t = temoinVide();
    persisterTemoin(t);
    set({ temoin: t, reseau: null, temoinFlash: "mémoire du témoin effacée" });
  },

  suivreReseau: async () => {
    set({ reseauOccupe: true });
    const r = await suivreReseau();
    if ("erreur" in r) {
      set({ reseauOccupe: false, temoinFlash: r.erreur });
      return;
    }
    set({
      reseau: r,
      reseauOccupe: false,
      temoinFlash: r.verdict.ok
        ? `réseau · bloc ${r.tete.hauteur} signé par le validateur ${r.verdict.validateur} — vérifié`
        : `réseau · bloc ${r.tete.hauteur} — signature refusée (${r.verdict.motif})`,
    });
  },

  chargerMonde: async () => {
    try {
      const r = await fetch(ETAT_URL, { cache: "no-store" });
      if (!r.ok) throw new Error(String(r.status));
      const e = (await r.json()) as { reliques?: unknown };
      set({ monde: Array.isArray(e.reliques) ? (e.reliques as EntreeMonde[]) : [] });
    } catch {
      if (get().monde === null) set({ monde: [] });
    }
  },

  sceaux: () => sceauxDuCoffre(get().monde, get().coffre),

  agesScelles: () => agesScelles(sceauxDuCoffre(get().monde, get().coffre), get().coffre),

  jugerReseau: (ref) => {
    const { reseau, temoin } = get();
    if (!reseau) {
      set({ temoinFlash: "suivre d'abord le réseau" });
      return;
    }
    const { vue } = jugerSortieReseau(reseau, ref);
    const next = { ...temoin, vues: [vue, ...temoin.vues].slice(0, 8) };
    persisterTemoin(next);
    set({ temoin: next, temoinFlash: vue.detail });
  },

  importerTete: (raw) => {
    const lu = parserTete(raw);
    if ("erreur" in lu) {
      set({ temoinFlash: lu.erreur });
      return;
    }
    const next = adopterTete(get().temoin, lu);
    persisterTemoin(next);
    set({
      temoin: next,
      temoinFlash: `tête importée · bloc ${lu.hauteur} — non rejouée depuis le journal`,
    });
  },

  acheterRelique: (nom) => {
    const { coffre: next, selection } = appliquerAchat(get().coffre, nom);
    if (!selection.ok) {
      set({ erreur: t(`err.${selection.code}` as Msg), flash: null });
      return;
    }
    persister(next);
    set({
      coffre: next,
      erreur: null,
      flash: t("relique.achetee", { nom }),
    });
  },

  tirer: () => {
    const r = tirerDansCoffre(get().coffre);
    if (!r.ok) {
      set({
        erreur: t(r.code === "hauteur" ? "inv.deja" : "inv.hash"),
        flash: null,
      });
      return;
    }
    persister(r.coffre);
    set({
      coffre: r.coffre,
      erreur: null,
      flash: t("flash.tirage", {
        muse: signatureDe(r.objet.archetype).muse,
        age: r.objet.age,
      }),
    });
  },

  craft: (i, j) => {
    const r = craftDansCoffre(get().coffre, i, j);
    if (!r.ok) {
      set({ erreur: t(`inv.craft.${r.code}` as Msg), flash: null });
      return;
    }
    persister(r.coffre);
    set({
      coffre: r.coffre,
      erreur: null,
      flash: t("inv.craft.ok", { nom: r.objet.nom }),
    });
  },

  divin: (nom) => {
    const r = divinDansCoffre(get().coffre, nom);
    if (!r.ok) {
      set({ erreur: t("inv.philo.ko"), flash: null });
      return;
    }
    persister(r.coffre);
    set({ coffre: r.coffre, erreur: null, flash: t("inv.philo.ok", { nom }) });
  },

  exporterFichier: () => exporterCarnet(get().coffre),

  commencerAscension: (ref) => {
    const { coffre, reseau } = get();
    let ancre = null;
    if (ref) {
      if (!reseau || !reseau.verdict.ok) {
        set({ erreur: t("tour.pendule.err.tete"), flash: null });
        return;
      }
      const piece = reseau.sorties.find((s) => `${s.txid}:${s.rang}` === ref);
      const p = piece ? preuveReseau(reseau.sorties, ref) : null;
      if (!piece || !p || !coffre.sorties.some((s) => s.adresse === piece.adresse)) {
        set({ erreur: t("tour.pendule.err.piece"), flash: null });
        return;
      }
      ancre = {
        tete: reseau.tete,
        piece: {
          txid: piece.txid,
          rang: piece.rang,
          adresse: piece.adresse,
          montant: piece.montant,
        },
        preuve: serialiserPreuve(p),
      };
    }
    const next = commencerDansCoffre(coffre, ancre);
    persister(next);
    set({
      coffre: next,
      erreur: null,
      derniereAscension: null,
      flash: t(ancre ? "tour.pendule.flash.ancree" : "tour.pendule.flash.libre"),
    });
  },

  finDeSalle: (decision = null) => {
    const { coffre, monde } = get();
    const r = finDeSalleDansCoffre(coffre, monde, decision);
    if (!r.ok) {
      set({ erreur: t(`tour.pendule.err.${r.code}` as Msg), flash: null });
      return;
    }
    persister(r.coffre);
    let derniereAscension: string | null = null;
    if (r.fin === "sommet") {
      const ex = exporterAscension(r.coffre);
      if (!("erreur" in ex)) derniereAscension = serialiserAscension(ex);
    }
    set({
      coffre: r.coffre,
      erreur: null,
      derniereAscension,
      flash: r.fin
        ? t(`tour.pendule.fin.${r.fin}` as Msg)
        : t("tour.pendule.flash.salle", {
            choix: t(`tour.pendule.choix.${r.choix}` as Msg),
            n: r.etage,
            x: r.spawn.x,
            y: r.spawn.y,
          }),
    });
  },

  suivreChaine: async () => {
    set({ chaineOccupe: true });
    let fed = get().federation;
    if (!fed) {
      try {
        const r = await fetch(FEDERATION_URL, { cache: "no-store" });
        const f = parserFederation(await r.json());
        if ("erreur" in f) {
          set({ chaineOccupe: false, erreur: f.erreur, flash: null });
          return;
        }
        fed = f;
      } catch (e) {
        set({ chaineOccupe: false, erreur: e instanceof Error ? e.message : String(e), flash: null });
        return;
      }
    }
    const r = await suivreChaine(fed);
    if ("erreur" in r) {
      set({ chaineOccupe: false, erreur: r.erreur, flash: null });
      return;
    }
    set({
      chaine: r,
      federation: fed,
      chaineOccupe: false,
      erreur: null,
      flash: t("veillee.chaine.hauteur", { h: r.hauteur }),
    });
  },

  /**
   * Réclamer le coffre de l'heure : le juge (coffre-horaire.ts) demande la tête signée, la pièce
   * et son chemin Merkle ; ici on ne fait qu'assembler ces trois-là depuis le réseau suivi.
   * Une pièce, un bloc, un coffre — la clé est notée dans `tour.coffres`, le carnet la garde.
   */
  reclamerCoffreHoraire: (ref) => {
    const { coffre, reseau, federation } = get();
    if (!reseau || !reseau.verdict.ok) {
      set({ erreur: t("coffreh.err.tete"), flash: null });
      return;
    }
    if (!federation) {
      set({ erreur: t("coffreh.err.federation"), flash: null });
      return;
    }
    const piece = reseau.sorties.find((s) => `${s.txid}:${s.rang}` === ref);
    const p = piece ? preuveReseau(reseau.sorties, ref) : null;
    if (!piece || !p || !coffre.sorties.some((s) => s.adresse === piece.adresse)) {
      set({ erreur: t("coffreh.err.piece"), flash: null });
      return;
    }
    const r = reclamerDansCoffre(
      { ...coffre, tour: tourDe(coffre) },
      { tete: reseau.tete, piece, preuve: serialiserPreuve(p) },
      federation,
    );
    if (!r.ok) {
      set({ erreur: `${t("coffreh.err.refus")} — ${r.motif}`, flash: null });
      return;
    }
    persister(r.coffre);
    set({
      coffre: r.coffre,
      erreur: null,
      flash: t("coffreh.flash.reclame", { t: r.tier, n: r.pris.length, p: r.perdus }),
    });
  },

  ouvrirVeillee: (ref) => {
    const { coffre, chaine, reseau } = get();
    if (!chaine) {
      set({ erreur: t("veillee.err.chaine"), flash: null });
      return;
    }
    const jour = tetesDeLaVeillee(chaine.tetes);
    if (!jour) {
      set({ erreur: t("veillee.err.jour"), flash: null });
      return;
    }
    let ancre: Parameters<typeof ouvrirVeilleeDansCoffre>[3] = null;
    if (ref !== null) {
      if (!reseau || !reseau.verdict.ok) {
        set({ erreur: t("veillee.err.tete"), flash: null });
        return;
      }
      const piece = reseau.sorties.find((s) => `${s.txid}:${s.rang}` === ref);
      const p = piece ? preuveReseau(reseau.sorties, ref) : null;
      if (!piece || !p || !coffre.sorties.some((s) => s.adresse === piece.adresse)) {
        set({ erreur: t("veillee.err.piece"), flash: null });
        return;
      }
      ancre = { piece, preuve: serialiserPreuve(p), teteAncre: reseau.tete };
    }
    const r = ouvrirVeilleeDansCoffre(coffre, jour.tete, jour.veille, ancre);
    if (!r.ok) {
      set({ erreur: `${t(`veillee.err.${r.code}` as Msg)} — ${r.motif}`, flash: null });
      return;
    }
    persister(r.coffre);
    set({
      coffre: r.coffre,
      erreur: null,
      flash: t(ancre ? "veillee.flash.ouverte" : "veillee.flash.ouverteLibre", { h: jour.tete.hauteur }),
      derniereVeillee: null,
    });
  },

  veilleeParler: () => apresGeste(parlerDansCoffre(get().coffre, get().monde, reserverLocal), set),
  veilleeCreuser: (x, y) => apresGeste(creuserDansCoffre(get().coffre, x, y, reserverLocal), set),
  veilleeAlcove: () => apresGeste(ouvrirAlcoveDansCoffre(get().coffre, reserverLocal), set),
  veilleeCapturer: (k, i) => apresGeste(capturerDansCoffre(get().coffre, k, i, reserverLocal), set),
  veilleeFranchir: (decision = null) =>
    apresGeste(franchirDansCoffre(get().coffre, get().monde, decision, reserverLocal), set),
  veilleeAbandonner: () => {
    const next = abandonnerVeilleeDansCoffre(get().coffre);
    persister(next);
    const ex = exporterVeilleeDuCoffre(next);
    set({
      coffre: next,
      erreur: null,
      flash: t("veillee.fin.abandon"),
      derniereVeillee: "ok" in ex ? null : serialiserVeillee(ex),
    });
  },
  veilleeEffacer: () => {
    const next = effacerVeilleeDansCoffre(get().coffre);
    persister(next);
    set({ coffre: next, erreur: null, flash: null, derniereVeillee: null });
  },

  lireClassement: async () => {
    const { federation, reseau } = get();
    if (!federation) {
      set({ erreur: t("veillee.err.classement"), flash: null });
      return;
    }
    set({ classementOccupe: true });
    const lu = await lireVeillees();
    if ("erreur" in lu) {
      set({ classementOccupe: false, erreur: lu.erreur, flash: null });
      return;
    }
    // classer est synchrone (jusqu'à 64 signatures par preuve) : après l'attente réseau, jamais dans un rendu
    const cl = classer(lu.preuves, federation, { hauteurCourante: reseau?.tete.hauteur, langue: getLocale() });
    set({
      classement: cl,
      classementRefus: lu.refus,
      classementOccupe: false,
      erreur: null,
      flash: t("veillee.classement.lu", { n: cl.classees.length, r: cl.refusees.length + lu.refus.length }),
    });
  },

  abandonnerAscension: () => {
    const next = abandonnerDansCoffre(get().coffre);
    persister(next);
    set({ coffre: next, flash: t("tour.pendule.fin.abandon"), derniereAscension: null });
  },

  allerEtage: (etage) => {
    const e = Math.max(0, Math.min(ETAGES - 1, etage | 0));
    const r = arriverDansCoffre(get().coffre, e);
    persister(r.coffre);
    const echo = r.echos[0];
    set({
      coffre: r.coffre,
      erreur: null,
      flash: echo ? t("tour.flash.echo", { a: echo[0], b: echo[1] }) : null,
    });
  },

  honorer: () => {
    const { coffre, monde } = get();
    const ages = agesScelles(sceauxDuCoffre(monde, coffre), coffre);
    const r = honorerDansCoffre(coffre, coffre.tour.etage, { ages });
    if (!r.ok) {
      set({ erreur: t(`tour.flash.${r.code}` as Msg), flash: null });
      return;
    }
    persister(r.coffre);
    set({
      coffre: r.coffre,
      erreur: null,
      flash: t("tour.flash.don", {
        nom: signatureDe(r.hote.muse).muse,
        don: r.don.genre === "elixir" ? t(`tour.espece.${r.don.nom}` as Msg) : r.don.nom,
      }),
    });
  },

  boire: (i) => {
    const { coffre } = get();
    const r = boireDansCoffre(coffre, i, coffre.tour.etage);
    if (!r.ok) {
      set({ erreur: t(`tour.boire.${r.code}` as Msg), flash: null });
      return;
    }
    persister(r.coffre);
    set({
      coffre: r.coffre,
      erreur: null,
      flash: t("tour.flash.bu", { espece: r.espece, n: r.etage }),
    });
  },

  porter: (mot) => {
    const { coffre } = get();
    const next = {
      ...coffre,
      tour: { ...normaliserTour(coffre.tour), porte: mot === null ? null : mot >>> 0 },
    };
    persister(next);
    set({ coffre: next });
  },

  liberer: (mot) => {
    const next = libererDansCoffre(get().coffre, mot);
    persister(next);
    set({ coffre: next });
  },

  prendre: (k, i) => {
    const { coffre } = get();
    const r = prendreDansCoffre(coffre, coffre.tour.etage, k, i);
    persister(r.coffre);
    if (!r.ok) {
      set({ coffre: r.coffre, erreur: t(`tour.prise.${r.code}` as Msg), flash: null });
      return;
    }
    set({
      coffre: r.coffre,
      erreur: null,
      flash:
        t(`tour.prise.${r.prise.issue}` as Msg) +
        " " +
        t("tour.flash.capture", { nom: r.capture.nom }),
    });
  },

  franchir: () => {
    const { coffre } = get();
    const r = franchirAntre(coffre, coffre.tour.etage);
    persister(r.coffre);
    if (!r.ok) {
      set({
        coffre: r.coffre,
        erreur: r.code === "repousse" ? null : t(`tour.antre.${r.code}` as Msg),
        flash: r.code === "repousse" ? t("tour.flash.repousse", { n: r.coffre.tour.etage }) : null,
      });
      return;
    }
    set({
      coffre: r.coffre,
      erreur: null,
      flash: t("tour.flash.antre", { n: r.duel.temps ?? 0, don: r.don.nom }),
    });
  },

  fouiller: () => {
    const { coffre } = get();
    const r = ouvrirAlcove(coffre, coffre.tour.etage);
    if (!r.ok) {
      set({ erreur: null, flash: t(`tour.fouille.${r.code}` as Msg) });
      return;
    }
    persister(r.coffre);
    set({ coffre: r.coffre, erreur: null, flash: t("tour.flash.alcove", { don: r.coffret.nom }) });
  },

  fouillerCase: (x, y) => {
    const { coffre } = get();
    const r = fouillerCaseDansCoffre(coffre, coffre.tour.etage, x, y);
    if (!r.ok) {
      set({ erreur: null, flash: t(`tour.fouille.${r.code}` as Msg) });
      return;
    }
    persister(r.coffre);
    set({
      coffre: r.coffre,
      erreur: null,
      flash: r.objet
        ? t("tour.fouille.trouve", { nom: r.objet.nom, n: r.restantes })
        : t("tour.fouille.rien", { n: r.restantes }),
    });
  },

  capsuleThalie: () => {
    const r = capsuleDeThalie(get().coffre);
    if (!r.ok) {
      set({ erreur: t("tour.flash.poste"), flash: null });
      return;
    }
    persister(r.coffre);
    set({ coffre: r.coffre, erreur: null, flash: t("tour.flash.capsule") });
  },

  forgerCapsule: (iGemme, iSel) => {
    const r = forgerCapsule(get().coffre, iGemme, iSel);
    if (!r.ok) {
      set({ erreur: t(`tour.forge.${r.code}` as Msg), flash: null });
      return;
    }
    persister(r.coffre);
    set({ coffre: r.coffre, erreur: null, flash: t("tour.flash.forge") });
  },

  tournerTour: (i, j) => {
    const { coffre } = get();
    const r = tournerDansLaTour(coffre, coffre.tour.etage, i, j);
    if (!r.ok) {
      set({
        erreur: t(r.code === "soufre" ? "tour.tourner.soufre" : (`inv.craft.${r.code}` as Msg)),
        flash: null,
      });
      return;
    }
    persister(r.coffre);
    set({ coffre: r.coffre, erreur: null, flash: t("inv.craft.ok", { nom: r.objet.nom }) });
  },

  accorder: (i) => {
    const { coffre } = get();
    const r = accorderDansCoffre(coffre, i, coffre.tour.etage);
    if (!r.ok) {
      set({ erreur: t(`tour.accord.${r.code}` as Msg), flash: null });
      return;
    }
    persister(r.coffre);
    set({ coffre: r.coffre, erreur: null, flash: t("tour.flash.accord", { nom: r.capture.nom }) });
  },

  offrir: (i) => {
    const { coffre } = get();
    const r = offrirDansCoffre(coffre, i, coffre.tour.etage);
    if (!r.ok) {
      set({ erreur: t(`tour.offrande.${r.code}` as Msg), flash: null });
      return;
    }
    persister(r.coffre);
    set({ coffre: r.coffre, erreur: null, flash: t("tour.flash.offrande", { nom: r.gemme.nom }) });
  },

  importerFichier: (nom, data) => {
    const lu = ouvrirFichier(nom, data);
    if ("erreur" in lu) {
      const octets = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
      if (estPsnxEtranger(nom, octets)) {
        const spin = spinorDepuisOctets(octets);
        set({
          psnx: spin,
          erreur: null,
          flash: t("psnx.refus"),
        });
        return;
      }
      set({ erreur: lu.erreur, flash: null });
      return;
    }
    let coffre = lu.coffre;
    if (!Array.isArray(coffre.clesUsees)) coffre.clesUsees = [];
    if (!Array.isArray(coffre.reliques)) coffre.reliques = [];
    coffre.objets = normaliserObjets(coffre.objets);
    if (coffre.philosophale === undefined) coffre.philosophale = null;
    coffre.tour = normaliserTour(coffre.tour);
    if (coffre.nature !== "personnel") coffre.nature = "atelier";
    if (!Array.isArray(coffre.chaine) || coffre.chaine.length === 0) {
      coffre = sceller({ ...coffre, chaine: [blocGenese()] }, "atelier");
    }
    persister(coffre);
    const n = coffre.sorties.length;
    const m = coffre.objets.length;
    const vide = n === 0 && m === 0;
    set({
      coffre,
      saisieMontant: montantPour(coffre.scenario ?? "vide"),
      erreur: null,
      flash: vide ? t("psnx.importe.vide") : t("psnx.importe", { n, m }),
      psnx: null,
    });
  },
}));
