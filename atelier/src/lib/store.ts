import { create } from "zustand";
import {
  coffreAtelier,
  coffreNeuf,
  chargerScenario,
  verserRobinet,
  appliquerEnvoi,
  appliquerRegroupement,
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
  setMontant: (s: string) => void;
  setDest: (s: string) => void;
  setDestInterne: (v: boolean) => void;
  setPreuveRef: (ref: string | null) => void;
  suivreTete: () => void;
  soumettrePreuve: (p: PreuvePortable) => void;
  oublierTemoin: () => void;
  importerTete: (raw: string) => void;
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
  coffre: coffreAtelier("mixte"),
  saisieMontant: "4.00",
  saisieDest: "",
  destInterne: true,
  erreur: null,
  flash: null,
  preuveRef: null,
  temoin: temoinVide(),
  temoinFlash: null,
  demandeReseau: null,

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
      flash: `Atelier : ${id}`,
      preuveRef: next.sorties[0]?.ref ?? null,
    });
  },

  robinet: () => {
    const next = verserRobinet(get().coffre);
    persister(next);
    set({ coffre: next, flash: "Robinet : +1,000000 eidôlon (ce navigateur)", erreur: null });
  },

  robinetReseau: () => {
    const r = demanderAuReseau(get().coffre);
    if ("refus" in r) {
      set({ erreur: r.refus, demandeReseau: null });
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
      flash: "Validez l'issue GitHub. Le nœud verse au prochain bloc (une heure au plus).",
    });
  },

  envoyer: () => {
    const { coffre, saisieMontant, destInterne, saisieDest } = get();
    const m = parserMontant(saisieMontant);
    if (m == null) {
      set({ erreur: "Montant invalide." });
      return;
    }
    const sel = selectionner(coffre.sorties, m);
    if (!sel.ok) {
      set({ erreur: sel.message });
      return;
    }
    let dest = "00".repeat(20);
    if (!destInterne && saisieDest.trim()) {
      dest = saisieDest.trim().toLowerCase().replace(/[^0-9a-f]/g, "").slice(0, 40);
      if (dest.length !== 40) {
        set({ erreur: "Adresse de destination invalide." });
        return;
      }
    }
    const { coffre: next, selection } = appliquerEnvoi(coffre, m, dest);
    if (!selection.ok) {
      set({ erreur: selection.message });
      return;
    }
    persister(next);
    set({
      coffre: next,
      erreur: null,
      flash: selection.poussiere
        ? `Signé (Lamport). Poussière absorbée — ${selection.frais} atomes de frais.`
        : `Signé (Lamport). ${selection.entrees.length} entrée${selection.entrees.length > 1 ? "s" : ""}.`,
    });
  },

  regrouper: () => {
    const { coffre } = get();
    if (coffre.sorties.length < 2) {
      set({ erreur: "Rien à regrouper — il faut au moins deux sorties." });
      return;
    }
    const next = appliquerRegroupement(coffre);
    persister(next);
    set({ coffre: next, erreur: null, flash: "Regroupement signé : 3 sorties au plus → 1." });
  },

  personnel: () => {
    const id = get().coffre.scenario ?? "mixte";
    const next = coffreNeuf(id);
    persister(next);
    set({
      coffre: next,
      saisieMontant: montantPour(id),
      erreur: null,
      flash: "Coffre personnel — graine tirée par le navigateur.",
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
      flash: "Atelier public — graine connue, sans valeur.",
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
}));
