import { create } from "zustand";
import {
  coffreAtelier,
  coffreNeuf,
  chargerScenario,
  verserRobinet,
  appliquerEnvoi,
  appliquerRegroupement,
  minerCoffre,
} from "./eidos/wallet.ts";
import { blocGenese, sceller } from "./eidos/chaine.ts";
import {
  adopterTete,
  avancer,
  juger,
  parserTete,
  temoinVide,
  type Temoin,
} from "./eidos/temoin.ts";
import type { Coffre, ScenarioId } from "./eidos/types.ts";
import type { PreuvePortable } from "./eidos/merkle.ts";
import { demanderAuReseau, type DemandeRobinet } from "./eidos/robinet.ts";
import { selectionner, parserMontant } from "./eidos/coinselect.ts";
import { t, type Msg } from "./i18n.ts";
import { exporterCoffre, parserCoffrePortable, estPsnx } from "./eidos/portable.ts";
import { spinorDepuisOctets, type SpinorPublic } from "./eidos/spinor.ts";

const KEY = "eidos-coffre-v2";
const KEY_TEMOIN = "eidos-temoin-v1";

type Etat = {
  coffre: Coffre;
  saisieMontant: string;
  saisieDest: string;
  destInterne: boolean;
  erreur: string | null;
  flash: string | null;
  preuveRef: string | null;
  temoin: Temoin;
  temoinFlash: string | null;
  hydrater: () => void;
  charger: (id: ScenarioId) => void;
  robinet: () => void;
  robinetReseau: () => void;
  demandeReseau: DemandeRobinet | null;
  envoyer: () => void;
  regrouper: () => void;
  personnel: () => void;
  atelier: () => void;
  creer: () => void;
  miner: () => void;
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
};

function persister(c: Coffre) {
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    /* quota */
  }
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
  erreur: null,
  flash: null,
  preuveRef: null,
  temoin: temoinVide(),
  temoinFlash: null,
  demandeReseau: null,
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

  robinetReseau: () => {
    const r = demanderAuReseau(get().coffre);
    if ("refus" in r) {
      set({ erreur: t("err.atelier"), demandeReseau: null });
      return;
    }
    try {
      window.open(r.url, "_blank", "noopener");
    } catch {
      /* popup */
    }
    set({
      demandeReseau: r,
      erreur: null,
      flash: t("flash.reseau"),
    });
  },

  envoyer: () => {
    const { coffre, saisieMontant, destInterne, saisieDest } = get();
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
    let dest = "00".repeat(20);
    if (!destInterne && saisieDest.trim()) {
      dest = saisieDest.trim().toLowerCase().replace(/[^0-9a-f]/g, "").slice(0, 40);
      if (dest.length !== 40) {
        set({ erreur: t("err.dest") });
        return;
      }
    }
    const { coffre: next, selection } = appliquerEnvoi(coffre, m, dest);
    if (!selection.ok) {
      set({ erreur: t(`err.${selection.code}` as Msg) });
      return;
    }
    persister(next);
    set({
      coffre: next,
      erreur: null,
      flash: selection.poussiere
        ? t("flash.sigPoussiere", { n: selection.frais })
        : t("flash.sig", { n: selection.entrees.length }),
    });
  },

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
    const next = minerCoffre(get().coffre);
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
    set({ temoin: t, temoinFlash: "mémoire du témoin effacée" });
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

  exporterFichier: () => exporterCoffre(get().coffre),

  importerFichier: (nom, data) => {
    const octets =
      typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
    if (estPsnx(nom, octets)) {
      const spin = spinorDepuisOctets(octets);
      set({
        psnx: spin,
        erreur: null,
        flash: t("psnx.refus"),
      });
      return;
    }
    const texte = typeof data === "string" ? data : new TextDecoder().decode(octets);
    const lu = parserCoffrePortable(texte);
    if ("erreur" in lu) {
      set({ erreur: lu.erreur, flash: null });
      return;
    }
    let coffre = lu.coffre;
    if (!Array.isArray(coffre.clesUsees)) coffre.clesUsees = [];
    if (coffre.nature !== "personnel") coffre.nature = "atelier";
    if (!Array.isArray(coffre.chaine) || coffre.chaine.length === 0) {
      coffre = sceller({ ...coffre, chaine: [blocGenese()] }, "atelier");
    }
    persister(coffre);
    set({
      coffre,
      saisieMontant: montantPour(coffre.scenario ?? "vide"),
      erreur: null,
      flash: t("psnx.importe"),
      psnx: null,
    });
  },
}));
