import { create } from "zustand";
import {
  coffreAtelier,
  coffreNeuf,
  chargerScenario,
  verserRobinet,
  appliquerEnvoi,
  appliquerRegroupement,
  minerCoffre,
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
import { demanderAuReseau, type DemandeRobinet } from "./eidos/robinet.ts";
import { ETAT_URL } from "./eidos/envoi.ts";
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
import { preuveReseau, serialiser as serialiserPreuve } from "./eidos/merkle.ts";
import { selectionner, parserMontant } from "./eidos/coinselect.ts";
import { t, type Msg } from "./i18n.ts";
import { estPsnxEtranger } from "./eidos/portable.ts";
import { exporterCarnet, ouvrirFichier } from "./eidos/carnet.ts";
import { spinorDepuisOctets, type SpinorPublic } from "./eidos/spinor.ts";
import { tirerDansCoffre, normaliserObjets, signatureDe } from "./eidos/inventaire.ts";
import { craftDansCoffre, divinDansCoffre, type NomArme } from "./eidos/equipement.ts";
import { peutMiner } from "./eidos/poste.ts";
import { normaliserTour } from "./eidos/jauge.ts";
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
import { ETAGES } from "./eidos/tour.ts";

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
  robinetReseau: () => void;
  demandeReseau: DemandeRobinet | null;
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
  reseau: null,
  reseauOccupe: false,
  monde: null,
  derniereAscension: null,
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
      dest = saisieDest
        .trim()
        .toLowerCase()
        .replace(/[^0-9a-f]/g, "")
        .slice(0, 40);
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
      flash: r.trouvaille
        ? t("tour.fouille.trouve", { nom: r.trouvaille.nom, n: r.restantes })
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
    const lu = ouvrirFichier(nom, data);
    if ("erreur" in lu) {
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
    set({
      coffre,
      saisieMontant: montantPour(coffre.scenario ?? "vide"),
      erreur: null,
      flash: t("psnx.importe"),
      psnx: null,
    });
  },
}));
