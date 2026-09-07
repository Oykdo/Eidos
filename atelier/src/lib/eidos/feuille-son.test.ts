import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DANSES } from "../reliques/danse.ts";
import {
  DUREE_SON_S,
  GAIN_SON,
  HAUTEURS_HZ,
  SEUIL_DERNIERES,
  VIBRATION_COURTE_MS,
  VIBRATION_LONGUE_MS,
  jouerRetour,
  motifRetour,
  type ContexteAudioMin,
  type FenetreSonore,
  type MotifRetour,
} from "./feuille-son.ts";
import { SIGNATURES, type SignatureId } from "./signatures.ts";
import { FEUILLES, type Fin } from "./veillee.ts";

/** Une fenêtre factice qui note ce que jouerRetour lui demande. */
function fenetreFactice(
  opts: {
    vibrateRend?: boolean;
    vibrateLeve?: boolean;
    contexteLeve?: boolean;
    /** createGain lève : l'API casse en route */
    gainLeve?: boolean;
    /** close lève : un contexte déjà fermé */
    closeLeve?: boolean;
    /** onended ne vient jamais : contexte suspendu */
    onendedMuet?: boolean;
    /** la fenêtre a un setTimeout, noté sans être déclenché */
    avecDelai?: boolean;
    delaiLeve?: boolean;
  } = {},
) {
  const journal = {
    contextes: 0,
    fermes: 0,
    type: "",
    hz: 0,
    gain: [] as [string, number, number][],
    connexions: [] as string[],
    start: null as number | null,
    stop: null as number | null,
    vibrations: [] as (number | number[])[],
    delais: [] as [() => void, number][],
  };
  class Contexte implements ContexteAudioMin {
    currentTime = 1.5;
    destination = "destination";
    constructor() {
      if (opts.contexteLeve) throw new Error("NotAllowedError");
      journal.contextes += 1;
    }
    createOscillator() {
      const osc = {
        type: "sine",
        frequency: { value: 0 },
        onended: null as unknown,
        connect(n: unknown) {
          journal.connexions.push(`osc→${String(n)}`);
          return n;
        },
        start(q?: number) {
          journal.start = q ?? -1;
        },
        stop(q?: number) {
          journal.stop = q ?? -1;
          journal.type = osc.type;
          journal.hz = osc.frequency.value;
          if (!opts.onendedMuet && typeof osc.onended === "function") (osc.onended as () => void)();
        },
      };
      return osc;
    }
    createGain() {
      if (opts.gainLeve) throw new Error("createGain refusé");
      return {
        gain: {
          setValueAtTime(v: number, t: number) {
            journal.gain.push(["set", v, t]);
          },
          exponentialRampToValueAtTime(v: number, t: number) {
            journal.gain.push(["exp", v, t]);
          },
        },
        connect(n: unknown) {
          journal.connexions.push(`gain→${String(n)}`);
          return n;
        },
        toString() {
          return "gain";
        },
      };
    }
    close() {
      journal.fermes += 1;
      if (opts.closeLeve) throw new Error("InvalidStateError");
      return Promise.resolve();
    }
  }
  const fenetre: FenetreSonore = {
    AudioContext: Contexte,
    navigator: {
      vibrate(motif) {
        if (opts.vibrateLeve) throw new Error("vibrate refusé");
        journal.vibrations.push(motif);
        return opts.vibrateRend ?? true;
      },
    },
  };
  if (opts.avecDelai) {
    fenetre.setTimeout = (fn, ms) => {
      if (opts.delaiLeve) throw new Error("setTimeout refusé");
      journal.delais.push([fn, ms]);
      return 1;
    };
  }
  return { fenetre, journal };
}

const MUSES = SIGNATURES.map((s) => s.id);

describe("feuille-son : un son sec par geste, la dernière = silence", () => {
  it("silence à la dernière feuille, son sec sinon — et jamais d'aléa", () => {
    assert.equal(motifRetour(0, null, "terre").son, "silence");
    assert.equal(motifRetour(0, "epuise", "uranie").son, "silence");
    for (const n of [1, 2, SEUIL_DERNIERES, SEUIL_DERNIERES + 1, 37, FEUILLES]) {
      assert.equal(motifRetour(n, null, "terre").son, "sec", `${n} feuilles`);
    }
    // un compte négatif ou non fini vaut zéro : silence, jamais une exception
    assert.equal(motifRetour(-3, null, "lune").son, "silence");
    assert.equal(motifRetour(Number.NaN, null, "lune").son, "silence");
    for (const muse of MUSES) {
      assert.deepEqual(motifRetour(7, null, muse), motifRetour(7, null, muse));
    }
  });

  it("vibration : aucune au-dessus de dix, courte à dix et à une, longue à zéro", () => {
    assert.deepEqual(motifRetour(FEUILLES, null, "terre").vibration, []);
    assert.deepEqual(motifRetour(SEUIL_DERNIERES + 1, null, "terre").vibration, []);
    assert.deepEqual(motifRetour(SEUIL_DERNIERES, null, "terre").vibration, [VIBRATION_COURTE_MS]);
    assert.deepEqual(motifRetour(5, null, "terre").vibration, [VIBRATION_COURTE_MS]);
    assert.deepEqual(motifRetour(1, null, "terre").vibration, [VIBRATION_COURTE_MS]);
    assert.deepEqual(motifRetour(0, null, "terre").vibration, [VIBRATION_LONGUE_MS]);
    assert.ok(VIBRATION_COURTE_MS < VIBRATION_LONGUE_MS);
    // le motif rendu est neuf à chaque appel : le muter ne change pas le suivant
    const m = motifRetour(3, null, "terre");
    m.vibration.push(999);
    assert.deepEqual(motifRetour(3, null, "terre").vibration, [VIBRATION_COURTE_MS]);
  });

  it("une fin qui tombe vibre long, quelles que soient les feuilles ; le son suit le compte", () => {
    const fins: Fin[] = ["sommet", "epuise", "porte", "abandon"];
    for (const fin of fins) {
      for (const n of [0, 1, SEUIL_DERNIERES, 37, FEUILLES]) {
        const m = motifRetour(n, fin, "soleil");
        assert.deepEqual(m.vibration, [VIBRATION_LONGUE_MS], `${fin} à ${n}`);
        assert.equal(m.son, n === 0 ? "silence" : "sec", `${fin} à ${n}`);
      }
    }
    // sans fin, la longue n'arrive qu'à zéro
    assert.notDeepEqual(motifRetour(37, null, "soleil").vibration, [VIBRATION_LONGUE_MS]);
  });

  it("neuf hauteurs entières, distinctes, décroissantes d'Uranie à Thalie, dans l'ordre des SIGNATURES", () => {
    assert.equal(Object.keys(HAUTEURS_HZ).length, 9);
    assert.equal(SIGNATURES[0]!.muse, "Uranie");
    assert.equal(SIGNATURES[8]!.muse, "Thalie");
    const hz = MUSES.map((muse) => motifRetour(20, null, muse).hauteurHz);
    for (const h of hz) {
      assert.ok(Number.isInteger(h) && h > 0, `hauteur ${h}`);
    }
    assert.equal(new Set(hz).size, 9);
    for (let k = 1; k < hz.length; k++) {
      assert.ok(hz[k]! < hz[k - 1]!, `${SIGNATURES[k]!.muse} (${hz[k]}) doit sonner plus grave que ${SIGNATURES[k - 1]!.muse} (${hz[k - 1]})`);
    }
    assert.equal(motifRetour(20, null, "uranie").hauteurHz, Math.max(...hz));
    assert.equal(motifRetour(20, null, "terre").hauteurHz, Math.min(...hz));
    // la hauteur ne dépend ni du compte ni de la fin : la muse seule la donne
    assert.equal(motifRetour(0, "epuise", "lune").hauteurHz, motifRetour(64, null, "lune").hauteurHz);
    // une lecture des neuf danses : chaque hauteur a sa danse nommée
    for (const muse of MUSES) assert.ok(DANSES[muse].fr, muse);
    // dans le registre où 30 ms font encore un son : au moins dix périodes
    for (const h of hz) assert.ok(h * DUREE_SON_S >= 10, `${h} Hz sur ${DUREE_SON_S} s`);
  });

  it("une muse hors des neuf est refusée, avec le nom attendu", () => {
    assert.throws(() => motifRetour(5, null, "pluton" as SignatureId), /muse inconnue « pluton » au lieu d'une des neuf/);
    // la table seule répond, jamais son prototype : « constructor » n'est pas une muse
    for (const faux of ["constructor", "toString", "__proto__", "hasOwnProperty"]) {
      assert.throws(() => motifRetour(5, null, faux as SignatureId), /muse inconnue/, faux);
    }
    assert.ok(Object.isFrozen(HAUTEURS_HZ), "la table est gelée");
  });

  it("jouerRetour sans AudioContext ni navigator rend false sans lever", () => {
    const m = motifRetour(5, null, "mars");
    assert.equal(jouerRetour(m, {}), false);
    assert.equal(jouerRetour(m, { navigator: null }), false);
    assert.equal(jouerRetour(m, { navigator: {} }), false);
    assert.equal(jouerRetour(m, { AudioContext: "pas un constructeur" }), false);
    // un contexte qui refuse de naître (NotAllowedError) : false, sans lever
    const { fenetre, journal } = fenetreFactice({ contexteLeve: true });
    assert.equal(jouerRetour({ ...m, vibration: [] }, fenetre), false);
    assert.equal(journal.contextes, 0);
    // vibrate qui lève, ou qui refuse le motif : false, sans lever
    assert.equal(jouerRetour({ son: "silence", vibration: [200], hauteurHz: 392 }, fenetreFactice({ vibrateLeve: true }).fenetre), false);
    assert.equal(jouerRetour({ son: "silence", vibration: [200], hauteurHz: 392 }, fenetreFactice({ vibrateRend: false }).fenetre), false);
    // le sandbox de node : globalThis n'a ni AudioContext ni navigator.vibrate
    assert.equal(jouerRetour(m), false);
  });

  it("jouerRetour sur une fenêtre factice : triangle, 30 ms, gain 0,15 en décroissance, contexte fermé, vibration transmise", () => {
    const { fenetre, journal } = fenetreFactice();
    const m = motifRetour(SEUIL_DERNIERES, null, "venus");
    assert.equal(jouerRetour(m, fenetre), true);
    assert.equal(journal.contextes, 1);
    assert.equal(journal.fermes, 1, "un contexte créé, un contexte fermé");
    assert.equal(journal.type, "triangle");
    assert.equal(journal.hz, HAUTEURS_HZ.venus);
    assert.equal(journal.start, 1.5);
    assert.ok(Math.abs(journal.stop! - (1.5 + DUREE_SON_S)) < 1e-9);
    assert.deepEqual(journal.gain[0], ["set", GAIN_SON, 1.5]);
    assert.equal(journal.gain[1]![0], "exp");
    assert.ok(journal.gain[1]![1] < GAIN_SON, "l'enveloppe décroît");
    assert.deepEqual(journal.connexions, ["osc→gain", "gain→destination"]);
    assert.deepEqual(journal.vibrations, [[VIBRATION_COURTE_MS]]);
    // deux gestes, deux contextes, deux fermetures : rien ne reste ouvert
    jouerRetour(motifRetour(9, null, "venus"), fenetre);
    assert.equal(journal.contextes, 2);
    assert.equal(journal.fermes, 2);
  });

  it("contexte suspendu : onended ne vient jamais, le délai de secours de 250 ms ferme — une seule fois", () => {
    const { fenetre, journal } = fenetreFactice({ onendedMuet: true, avecDelai: true });
    assert.equal(jouerRetour(motifRetour(20, null, "lune"), fenetre), true);
    assert.equal(journal.contextes, 1);
    assert.equal(journal.fermes, 0, "rien ne ferme tant que ni onended ni le délai ne tombent");
    assert.equal(journal.delais.length, 1);
    assert.equal(journal.delais[0]![1], 250);
    journal.delais[0]![0]();
    assert.equal(journal.fermes, 1);
    journal.delais[0]![0]();
    assert.equal(journal.fermes, 1, "fermé une fois, jamais deux");
    // quand onended vient aussi, le délai qui tombe ensuite ne ferme pas une seconde fois
    const b = fenetreFactice({ avecDelai: true });
    assert.equal(jouerRetour(motifRetour(20, null, "lune"), b.fenetre), true);
    assert.equal(b.journal.fermes, 1);
    b.journal.delais[0]![0]();
    assert.equal(b.journal.fermes, 1);
  });

  it("l'API qui casse en route ne remonte jamais au clic : createGain, close, setTimeout, fenêtre ou motif nuls", () => {
    const sec: MotifRetour = { son: "sec", vibration: [], hauteurHz: HAUTEURS_HZ.lune };
    // createGain lève : false, et le contexte né est fermé quand même
    const g = fenetreFactice({ gainLeve: true });
    assert.equal(jouerRetour(sec, g.fenetre), false);
    assert.equal(g.journal.contextes, 1);
    assert.equal(g.journal.fermes, 1, "un contexte né est fermé même quand le son échoue");
    // close lève : le son est parti, true
    const c = fenetreFactice({ closeLeve: true });
    assert.equal(jouerRetour(sec, c.fenetre), true);
    assert.equal(c.journal.fermes, 1);
    // setTimeout lève : le son est parti quand même, onended ferme
    const d = fenetreFactice({ avecDelai: true, delaiLeve: true });
    assert.equal(jouerRetour(sec, d.fenetre), true);
    assert.equal(d.journal.fermes, 1);
    // une fenêtre nulle, un motif nul : false, sans lever
    assert.equal(jouerRetour(null as unknown as MotifRetour, {}), false);
    assert.equal(jouerRetour(sec, null as unknown as FenetreSonore), false);
  });

  it("la dernière feuille : aucun oscillateur, la vibration longue seule — et c'est « joué »", () => {
    const { fenetre, journal } = fenetreFactice();
    const m: MotifRetour = motifRetour(0, "epuise", "terre");
    assert.equal(m.son, "silence");
    assert.equal(jouerRetour(m, fenetre), true);
    assert.equal(journal.contextes, 0, "silence : pas de son");
    assert.deepEqual(journal.vibrations, [[VIBRATION_LONGUE_MS]]);
    // et sans vibreur, la dernière feuille ne joue rien du tout
    assert.equal(jouerRetour(m, { AudioContext: fenetre.AudioContext }), false);
    assert.equal(journal.contextes, 0);
  });
});
