import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useOngletVisible, usePrefersReducedMotion } from "@/components/canvas/atelier.ts";
import {
  astreSous,
  DPR_MAX,
  IMAGES_PAR_SECONDE,
  inclinaison,
  PAGE_DE_MUSE,
  scene,
  type Astre,
  type Pointeur,
  type Scene,
} from "@/lib/accueil/orbites.ts";
import type { SignatureId } from "@/lib/eidos/signatures.ts";
import type { Chemin } from "@/lib/navigation.ts";
import {
  cadencer,
  lisser,
  normaliser,
  placerEtiquette,
  type Point,
  type Taille,
} from "@/components/accueil/fond-orbital.ts";

/** Les hex de styles.css, si la variable ne se lit pas. */
const REPLIS = {
  encre: "#dde1e6",
  sourd: "#79818e",
  or: "#c9a227",
} as const;
const POLICE_REPLI = '"IBM Plex Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace';

/** Corps des glyphes-astres (14 à 16 px : lisibles sans peser) et rayon du disque du réseau, en pixels CSS. */
const CORPS_ASTRE = 16;
const RAYON_RESEAU = 3.5;
/** Alphas : orbites, limaçon, astres assourdis quand un autre est survolé. */
const ALPHA_ORBITE = 0.2;
const ALPHA_LIMACON = 0.3;
const ALPHA_ASSOURDI = 0.45;
/** Taille présumée de l'étiquette avant sa première mesure. */
const ETIQUETTE_PRESUMEE: Taille = { largeur: 220, hauteur: 44 };

function lireVariable(nom: string, repli: string): string {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(nom).trim();
    return v || repli;
  } catch {
    return repli;
  }
}

function tailleDe(el: HTMLElement): Taille {
  return {
    largeur: el.offsetWidth || ETIQUETTE_PRESUMEE.largeur,
    hauteur: el.offsetHeight || ETIQUETTE_PRESUMEE.hauteur,
  };
}

/** La vue : la taille du canvas (fixe, plein écran), la même pour la boucle et l'étiquette. */
function vueDe(canvas: HTMLCanvasElement | null): Taille {
  return canvas
    ? { largeur: canvas.clientWidth, hauteur: canvas.clientHeight }
    : { largeur: window.innerWidth, hauteur: window.innerHeight };
}

type Survol = { id: SignatureId; muse: string; x: number; y: number };

export type FondOrbitalProps = {
  /** Hauteur de la tête suivie : l'astre du réseau est à 2π·((h − h₀) mod T)/T. Une lecture. */
  hauteur: number;
  langue: "fr" | "en";
  /** Une phrase par muse, passée par l'intégrateur (REPLIQUES_VEILLEE) : pas d'i18n ici. */
  repliques: Record<SignatureId, { fr: string; en: string }>;
  /** Clic sur un astre : la page de sa muse (PAGE_DE_MUSE). L'intégrateur branche la navigation. */
  onAstre?: (chemin: Chemin) => void;
};

/**
 * Fond orbital de l'accueil — un canvas 2D fixe, plein écran, derrière les
 * cartes, qui lit Eidos au lieu de décorer : le limaçon de l'émission de l'âge
 * courant, neuf orbites emboîtées, neuf astres-muses en glyphes que leur danse
 * anime, et l'astre du réseau à la phase de l'époque de la tête suivie. Tout
 * vient de `lib/accueil/orbites.ts` (la scène) ; ici seulement le trait, la
 * boucle, le pointeur et l'étiquette.
 *
 * Le pointeur ne vit que dans des références du composant : ni état persistant,
 * ni stockage, ni réseau, ni jauge ; il est oublié dès que l'effet se défait.
 * Parallaxe lissée à dix pour cent par image vers la cible, retour lent à plat
 * quand il sort ; aucune parallaxe au toucher. Au plus IMAGES_PAR_SECONDE
 * images, devicePixelRatio borné à DPR_MAX, boucle arrêtée quand l'onglet est
 * caché, image fixe si prefers-reduced-motion (un rendu à t = 0, redessiné
 * quand le survol, la taille ou la hauteur change). Survol = l'astre en or,
 * les autres assourdis, nom de la muse et réplique ; clic (événement `click`,
 * pas `pointerdown` : au toucher, un début de défilement ne doit pas naviguer)
 * = onAstre(page de la muse). Aucune dépendance, aucune texture, aucun aléa :
 * tout dérive de t, de la hauteur et du pointeur.
 *
 * Empilement : le canvas est `position: fixed; z-index: 0`. Un bloc en flux non
 * positionné se peint SOUS lui ; les cartes (ou leur conteneur) doivent donc
 * être `relative z-10` (voir les notes d'intégration) — l'en-tête `sticky z-20`
 * de Shell.tsx est déjà au-dessus. Le survol ne lit le pointeur que quand sa
 * cible est le canvas lui-même et le clic n'est écouté que sur lui : un astre
 * sous une carte ou sous l'en-tête ne se survole ni ne se clique ; la
 * parallaxe, elle, suit le pointeur partout dans la fenêtre. Aucun ancêtre du
 * canvas ne doit porter de transform : `fixed` s'y rapporterait et clientX/Y
 * ne seraient plus ses coordonnées. L'étiquette est en `z-30` pour rester
 * lisible.
 *
 * LIMITE : non testé sans DOM (les calculs purs le sont, fond-orbital.ts) ; les
 * cartes cachent le fond là où elles sont, et sur un petit écran il n'en reste
 * que les marges ; pas de clavier : les astres ne sont ni focalisables ni
 * annoncés (aria-hidden), les pages restent atteignables par la navigation ; un
 * pointeur immobile survole l'astre que la révolution lui amène ; les anneaux
 * sont tracés ici depuis le rayon, avec la projection de scene() (compression
 * cos(tx), cos(ty) autour du centre glissé) recopiée à la main : si orbites.ts
 * change sa projection, les anneaux doivent suivre, sinon un astre s'écarte de
 * son anneau à l'inclinaison maximale.
 */
export function FondOrbital({ hauteur, langue, repliques, onAstre }: FondOrbitalProps) {
  const toile = useRef<HTMLCanvasElement>(null);
  const etiquette = useRef<HTMLDivElement>(null);
  const reduit = usePrefersReducedMotion();
  const visible = useOngletVisible();
  const [survol, setSurvol] = useState<Survol | null>(null);

  // Le pointeur, en références seulement : jamais un état, jamais ailleurs.
  const pixel = useRef<Point | null>(null); // position brute en pixels CSS, sur le canvas seulement, pour le survol
  const cible = useRef<Pointeur>(null); // cible de la parallaxe, normalisée ; null au toucher
  const effectif = useRef<Pointeur>(null); // pointeur lissé, celui que la scène reçoit
  /** L'astre survolé tel que la boucle le sait ; survit aux relances de l'effet, l'état le suit. */
  const survolId = useRef<SignatureId | null>(null);
  const hauteurRef = useRef(hauteur);
  const onAstreRef = useRef(onAstre);
  const derniere = useRef<Scene | null>(null);
  const redessiner = useRef<(() => void) | null>(null);
  /** Origine du temps de la danse : posée une fois, jamais remise à zéro. */
  const origine = useRef<number | null>(null);

  useEffect(() => {
    onAstreRef.current = onAstre;
  }, [onAstre]);

  useEffect(() => {
    hauteurRef.current = hauteur;
    redessiner.current?.();
  }, [hauteur]);

  // L'étiquette vient de monter : la placer avec sa taille mesurée, dans la vue du canvas.
  useLayoutEffect(() => {
    const el = etiquette.current;
    if (!el || !survol) return;
    const p = placerEtiquette(survol, tailleDe(el), vueDe(toile.current));
    el.style.transform = `translate(${p.x}px, ${p.y}px)`;
  }, [survol]);

  useEffect(() => {
    const canvas = toile.current;
    if (!canvas || !visible) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const couleurs = {
      encre: lireVariable("--color-encre", REPLIS.encre),
      sourd: lireVariable("--color-sourd", REPLIS.sourd),
      or: lireVariable("--color-or", REPLIS.or),
    };
    const police = lireVariable("--font-mono", POLICE_REPLI);
    if (origine.current === null) origine.current = performance.now();
    const t0 = origine.current;

    let vue: Taille = { largeur: 0, hauteur: 0 };
    let image = 0;
    let precedent: number | null = null;

    const redimensionner = () => {
      const dpr = Math.min(DPR_MAX, window.devicePixelRatio || 1);
      vue = vueDe(canvas);
      canvas.width = Math.max(1, Math.round(vue.largeur * dpr));
      canvas.height = Math.max(1, Math.round(vue.hauteur * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const placer = (a: Astre) => {
      const el = etiquette.current;
      if (!el) return;
      const p = placerEtiquette(a, tailleDe(el), vue);
      el.style.transform = `translate(${p.x}px, ${p.y}px)`;
    };

    // Curseur et état ne changent que quand l'astre survolé change.
    const noterSurvol = (a: Astre | null) => {
      const id = a?.id ?? null;
      if (id === survolId.current) return;
      survolId.current = id;
      canvas.style.cursor = id ? "pointer" : "";
      setSurvol(a ? { id: a.id, muse: a.muse, x: a.x, y: a.y } : null);
    };

    const dessiner = (t: number) => {
      const pointeur = reduit ? null : effectif.current;
      const sc = scene(t, vue, hauteurRef.current, pointeur, reduit);
      derniere.current = sc;
      const px = pixel.current;
      const sous = px ? astreSous(sc.astres, px.x, px.y) : null;
      noterSurvol(sous);
      if (sous) placer(sous);

      const { tx, ty } = inclinaison(pointeur);
      ctx.clearRect(0, 0, vue.largeur, vue.hauteur);

      // Les neuf orbites : traits fins, sourds. Ellipses de la même projection
      // que scene() : X comprimé de cos(tx), Y de cos(ty), centre déjà glissé
      // (au plus 3°, cos ≈ 0,9986 : à peine un pixel).
      ctx.lineWidth = 1;
      ctx.strokeStyle = couleurs.sourd;
      ctx.globalAlpha = ALPHA_ORBITE;
      const kx = Math.cos(tx);
      const ky = Math.cos(ty);
      for (const o of sc.orbites) {
        ctx.beginPath();
        ctx.ellipse(sc.centre.x, sc.centre.y, o.rayon * kx, o.rayon * ky, 0, 0, 2 * Math.PI);
        ctx.stroke();
      }

      // Le limaçon de l'émission : un peu plus présent.
      if (sc.limacon.length > 1) {
        ctx.globalAlpha = ALPHA_LIMACON;
        ctx.beginPath();
        ctx.moveTo(sc.limacon[0]!.x, sc.limacon[0]!.y);
        for (let i = 1; i < sc.limacon.length; i++) ctx.lineTo(sc.limacon[i]!.x, sc.limacon[i]!.y);
        ctx.closePath();
        ctx.stroke();
      }

      // L'astre du réseau : où l'époque en est. Une lecture, jamais une garantie.
      ctx.globalAlpha = ALPHA_LIMACON;
      ctx.strokeStyle = couleurs.or;
      ctx.beginPath();
      ctx.arc(sc.reseau.x, sc.reseau.y, RAYON_RESEAU * 2, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = couleurs.or;
      ctx.beginPath();
      ctx.arc(sc.reseau.x, sc.reseau.y, RAYON_RESEAU, 0, 2 * Math.PI);
      ctx.fill();

      // Les neuf astres-muses, en glyphes monospace.
      ctx.font = `${CORPS_ASTRE}px ${police}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const a of sc.astres) {
        const lui = sous !== null && a.id === sous.id;
        ctx.fillStyle = lui ? couleurs.or : couleurs.encre;
        ctx.globalAlpha = sous === null || lui ? 1 : ALPHA_ASSOURDI;
        ctx.fillText(a.astre, a.x, a.y);
      }
      ctx.globalAlpha = 1;
    };

    const boucle = (maintenant: number) => {
      image = requestAnimationFrame(boucle);
      const suivant = cadencer(precedent, maintenant, IMAGES_PAR_SECONDE);
      if (suivant === null) return;
      precedent = suivant;
      effectif.current = lisser(effectif.current, cible.current);
      dessiner((maintenant - t0) / 1000);
    };

    // Image fixe : un seul rendu, redessiné quand le survol, la taille ou la hauteur change.
    const fixe = () => dessiner(0);
    redessiner.current = reduit ? fixe : null;

    const surMouvement = (e: PointerEvent) => {
      // Le survol n'existe que là où le canvas se voit : quand il est la cible
      // de l'événement, jamais à travers une carte ou l'en-tête qui le couvre.
      pixel.current = e.target === canvas ? { x: e.clientX, y: e.clientY } : null;
      cible.current = e.pointerType === "touch" ? null : normaliser(e.clientX, e.clientY, vue);
      if (reduit) {
        const sc = derniere.current;
        const px = pixel.current;
        const sous = sc && px ? astreSous(sc.astres, px.x, px.y) : null;
        if ((sous?.id ?? null) !== survolId.current) fixe();
      }
    };
    const quitter = () => {
      pixel.current = null;
      cible.current = null;
      if (reduit && survolId.current !== null) fixe();
    };
    const surSortie = (e: PointerEvent) => {
      if (e.relatedTarget === null) quitter();
    };
    const surClic = (e: MouseEvent) => {
      const sc = derniere.current;
      if (!sc) return;
      const a = astreSous(sc.astres, e.clientX, e.clientY);
      if (a) onAstreRef.current?.(PAGE_DE_MUSE[a.id]);
    };
    const surTaille = () => {
      redimensionner();
      if (reduit) fixe();
    };

    redimensionner();
    window.addEventListener("pointermove", surMouvement, { passive: true });
    window.addEventListener("pointerout", surSortie);
    window.addEventListener("pointercancel", quitter);
    window.addEventListener("blur", quitter);
    window.addEventListener("resize", surTaille);
    canvas.addEventListener("click", surClic);

    if (reduit) fixe();
    else image = requestAnimationFrame(boucle);

    return () => {
      cancelAnimationFrame(image);
      redessiner.current = null;
      // Le pointeur s'oublie avec l'effet : rien de lui ne survit à l'onglet caché ni au démontage.
      pixel.current = null;
      cible.current = null;
      window.removeEventListener("pointermove", surMouvement);
      window.removeEventListener("pointerout", surSortie);
      window.removeEventListener("pointercancel", quitter);
      window.removeEventListener("blur", quitter);
      window.removeEventListener("resize", surTaille);
      canvas.removeEventListener("click", surClic);
    };
  }, [reduit, visible]);

  return (
    <>
      <canvas
        ref={toile}
        aria-hidden="true"
        className="fixed inset-0 z-0 block h-full w-full"
        style={{ pointerEvents: "auto" }}
      />
      {survol ? (
        <div
          ref={etiquette}
          aria-hidden="true"
          className="pointer-events-none fixed top-0 left-0 z-30 max-w-[240px] rounded-sm bg-carte px-2.5 py-2 font-mono text-[11px] leading-snug shadow-[0_0_0_1px_rgb(198_203_209_/_0.16)]"
        >
          <p className="text-[10px] uppercase tracking-[0.14em] text-or">{survol.muse}</p>
          <p className="mt-1 text-encre text-pretty">{repliques[survol.id][langue]}</p>
        </div>
      ) : null}
    </>
  );
}
