import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  BOITE_ARBRE,
  cheminAuthentification,
  derniereFeuille,
  detailGeste,
  etatsFeuilles,
  geometrieArbre,
  gesteDeFeuille,
  indexNoeud,
  type DetailGeste,
  type EtatFeuille,
  type RefNoeud,
} from "@/lib/eidos/arbre-vue.ts";
import { HAUTEUR_VEILLEE, feuillesRestantes, type GesteId, type GesteSigne, type Veillee } from "@/lib/eidos/veillee.ts";

type Langue = "fr" | "en";

/** Textes minimaux, en dur : le composant se lit sans i18n. */
const TEXTES: Record<
  Langue,
  {
    restantes: (n: number) => string;
    racine: string;
    feuille: string;
    vive: string;
    geste: string;
    etape: string;
    etage: string;
    gestes: Record<GesteId, string>;
    choix: Record<"monter" | "lire" | "offrir", string>;
    objet: string;
    hote: string;
    case: string;
    alcove: string;
    occupant: string;
    chemin: string;
    illisible: (h: number, n: number) => string;
  }
> = {
  fr: {
    restantes: (n) => `${n} ${n === 1 ? "feuille restante" : "feuilles restantes"}`,
    racine: "racine",
    feuille: "feuille",
    vive: "vive — rien de signé",
    geste: "geste",
    etape: "étape",
    etage: "étage",
    gestes: { franchir: "franchir", parler: "parler", ouvrir: "ouvrir", prendre: "prendre" },
    choix: { monter: "monter", lire: "lire", offrir: "offrir" },
    objet: "objet",
    hote: "hôte de l'étage",
    case: "case",
    alcove: "alcôve",
    occupant: "occupant",
    chemin: "chemin d'authentification",
    illisible: (h, n) => `arbre illisible : hauteur ${h}, ${n} gestes — un arbre de hauteur ${HAUTEUR_VEILLEE} attendu`,
  },
  en: {
    restantes: (n) => `${n} ${n === 1 ? "leaf left" : "leaves left"}`,
    racine: "root",
    feuille: "leaf",
    vive: "alive — nothing signed",
    geste: "move",
    etape: "step",
    etage: "floor",
    gestes: { franchir: "cross", parler: "talk", ouvrir: "open", prendre: "take" },
    choix: { monter: "climb", lire: "read", offrir: "offer" },
    objet: "item",
    hote: "host of floor",
    case: "cell",
    alcove: "alcove",
    occupant: "occupant",
    chemin: "authentication path",
    illisible: (h, n) => `unreadable tree: height ${h}, ${n} moves — a tree of height ${HAUTEUR_VEILLEE} expected`,
  },
};

const DUREE_ALLUMAGE_MS = 1000;

function cle(n: RefNoeud): string {
  return `${n.niveau}:${n.indice}`;
}

function texteDetail(d: DetailGeste, x: (typeof TEXTES)[Langue]): string {
  switch (d.genre) {
    case "choix":
      return `${x.choix[d.choix]} · ${x.objet} ${d.mot}`;
    case "hote":
      return `${x.hote} ${d.etage}`;
    case "case":
      return `${x.case} ${d.x},${d.y}`;
    case "alcove":
      return x.alcove;
    case "occupant":
      return `${x.occupant} ${d.k}`;
  }
}

/** « feuille 3 · geste ouvrir · case 5,4 · étape 2 / étage 41 » */
function legendeDe(g: GesteSigne, x: (typeof TEXTES)[Langue]): string {
  let detail = "";
  try {
    detail = ` · ${texteDetail(detailGeste(g), x)}`;
  } catch {
    detail = ` · arg ${g.arg}`;
  }
  return `${x.feuille} ${g.i} · ${x.geste} ${x.gestes[g.g]}${detail} · ${x.etape} ${g.etape} / ${x.etage} ${g.etage}`;
}

const COULEUR: Record<EtatFeuille, string> = {
  vive: "text-encre",
  brulee: "text-sourd",
  derniere: "text-cuivre",
};

type Props = {
  v: Veillee;
  langue: Langue;
  /** appelé au clic d'une feuille brûlée, avec son indice */
  onFeuille?: (i: number) => void;
};

/**
 * L'arbre de feuilles : un arbre de Merkle qui se dépouille de bas en haut. Une
 * feuille brûlée s'éteint, la dernière est en cuivre, et son chemin
 * d'authentification — les frères remontés, ce que sa signature porte — est
 * en or : vif pendant une seconde après le geste, posé ensuite. Cliquer une
 * feuille brûlée allume son chemin et dit le geste qu'elle a signé. L'arbre
 * est la preuve ; ce dessin en est une lecture.
 *
 * LIMITE : pas de DOM sous node --test, le composant n'est pas testé — la
 * géométrie, l'état et le chemin le sont dans arbre-vue.ts. Sous role="img",
 * les feuilles cliquables ne sont ni au clavier ni au lecteur d'écran (<title>
 * seulement) ; la légende sous le SVG est du texte. Les textes FR/EN sont en
 * dur. Une veillée mal formée (hauteur ≠ 6, plus de gestes que de feuilles :
 * ce que `parserVeillee` laisse passer et que `jugerVeillee` refuse) rend une
 * ligne, jamais une exception. Son et haptique : feuille-son.ts.
 */
export function ArbreFeuilles({ v, langue, onFeuille }: Props) {
  const x = TEXTES[langue];
  const h = v.hauteur;
  const nGestes = v.gestes.length;
  // un arbre plus haut que la veillée (2^20 feuilles) ne se dessine pas ; plus de gestes que de feuilles, non plus
  const lisible = Number.isInteger(h) && h >= 1 && h <= HAUTEUR_VEILLEE && nGestes <= 1 << h;
  const noeuds = useMemo(() => (lisible ? geometrieArbre(h) : []), [lisible, h]);
  const etats = useMemo(() => (lisible ? etatsFeuilles(v) : []), [lisible, v]);
  const restantes = lisible ? feuillesRestantes(v) : 0;
  const derniere = lisible ? derniereFeuille(v) : null;

  const [choisie, setChoisie] = useState<number | null>(null);
  const [recent, setRecent] = useState(false);
  const avant = useRef(nGestes);
  const racineVue = useRef(v.racine);

  // Une feuille vient de brûler : son chemin s'allume une seconde — un état posé
  // par un minuteur, jamais une boucle. Une autre veillée — autre racine, ou la
  // même racine avec moins de gestes (même coffre, même jour, même « libre » :
  // l'arbre est le même) : la sélection s'efface.
  useEffect(() => {
    let minuteur: ReturnType<typeof setTimeout> | null = null;
    if (racineVue.current !== v.racine || nGestes < avant.current) {
      racineVue.current = v.racine;
      setChoisie(null);
    } else if (nGestes > avant.current) {
      setChoisie(null);
      setRecent(true);
      minuteur = setTimeout(() => setRecent(false), DUREE_ALLUMAGE_MS);
    }
    avant.current = nGestes;
    return () => {
      if (minuteur !== null) clearTimeout(minuteur);
    };
  }, [nGestes, v.racine]);

  const allumee = choisie !== null && choisie < nGestes ? choisie : derniere;
  const chemin = useMemo(() => (allumee === null ? null : cheminAuthentification(allumee, h)), [allumee, h]);
  const freres = useMemo(() => new Set(chemin ? chemin.freres.map(cle) : []), [chemin]);
  const route = useMemo(
    () => new Set(chemin && allumee !== null ? [cle({ niveau: 0, indice: allumee }), ...chemin.ancetres.map(cle)] : []),
    [chemin, allumee],
  );
  const legende = choisie !== null && lisible ? gesteDeFeuille(v, choisie) : null;

  if (!lisible) {
    return (
      <p className="mt-3 font-mono text-[11px] text-cuivre" data-arbre="illisible">
        {x.illisible(h, nGestes)}
      </p>
    );
  }

  const racine = noeuds[noeuds.length - 1]!;
  const { largeur, hauteur, marge } = BOITE_ARBRE;
  const rayonFeuille = Math.max(2, Math.min(4, ((largeur - 2 * marge) / (1 << h)) * 0.36));

  return (
    <div className="mt-3">
      <svg
        viewBox={`0 0 ${largeur} ${hauteur}`}
        width="100%"
        className="block h-auto"
        role="img"
        aria-label={x.restantes(restantes)}
      >
        {/* les arêtes : la route de la feuille allumée jusqu'à la racine est en or */}
        <g fill="none" strokeLinecap="round">
          {noeuds.map((n) => {
            if (n.niveau === h) return null;
            const p = noeuds[indexNoeud(h, n.niveau + 1, n.indice >> 1)]!;
            const surRoute = route.has(cle(n));
            return (
              <line
                key={`a${cle(n)}`}
                x1={n.x}
                y1={n.y}
                x2={p.x}
                y2={p.y}
                stroke="currentColor"
                strokeWidth={surRoute ? 1.4 : 0.6}
                opacity={surRoute ? (recent ? 1 : 0.7) : 0.28}
                className={surRoute ? "text-or" : "text-sourd"}
              />
            );
          })}
        </g>

        {/* les nœuds internes : petits ; les frères du chemin, en or */}
        <g>
          {noeuds.map((n) => {
            if (n.niveau === 0 || n.niveau === h) return null;
            const frere = freres.has(cle(n));
            const ancetre = route.has(cle(n));
            return (
              <circle
                key={`n${cle(n)}`}
                cx={n.x}
                cy={n.y}
                r={frere ? 2.6 : 1.7}
                fill={ancetre ? "none" : "currentColor"}
                stroke={ancetre ? "currentColor" : "none"}
                strokeWidth={1.2}
                opacity={frere ? (recent ? 1 : 0.85) : ancetre ? 0.8 : 0.45}
                className={frere || ancetre ? "text-or" : "text-sourd"}
              />
            );
          })}
        </g>

        {/* la racine : engagée dans chaque geste, ses huit premiers hex */}
        <g className={route.size > 0 ? "text-or" : "text-encre"}>
          <circle cx={racine.x} cy={racine.y} r={3} fill="currentColor" opacity={0.9} />
          <text
            x={racine.x + 8}
            y={racine.y + 3.5}
            fontSize={9}
            fill="currentColor"
            className="font-mono"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {x.racine} · {v.racine.slice(0, 8)}
          </text>
        </g>

        {/* le compte, en monospace, jamais animé */}
        <text
          x={marge}
          y={racine.y + 3.5}
          fontSize={11}
          fill="currentColor"
          className="font-mono text-encre"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {restantes} / {1 << h}
        </text>

        {/* les feuilles : vives pleines, brûlées éteintes, la dernière en cuivre */}
        <g>
          {noeuds.map((n) => {
            if (n.niveau !== 0) return null;
            const etat = etats[n.indice]!;
            const brulee = etat !== "vive";
            const frere = freres.has(cle(n));
            const ici = allumee === n.indice;
            const g = brulee ? gesteDeFeuille(v, n.indice) : null;
            const titre = g ? `${x.feuille} ${n.indice} · ${x.gestes[g.g]}` : `${x.feuille} ${n.indice} · ${x.vive}`;
            return (
              <circle
                key={`f${n.indice}`}
                data-feuille={n.indice}
                data-etat={etat}
                cx={n.x}
                cy={n.y}
                r={ici ? rayonFeuille + 0.8 : rayonFeuille}
                fill="currentColor"
                stroke={ici || choisie === n.indice ? "currentColor" : "none"}
                strokeWidth={1}
                opacity={etat === "brulee" ? (frere ? 0.6 : 0.35) : 1}
                className={cn(frere && etat === "brulee" ? "text-or" : COULEUR[etat], brulee && "cursor-pointer")}
                onClick={
                  brulee
                    ? () => {
                        setChoisie((c) => (c === n.indice ? null : n.indice));
                        onFeuille?.(n.indice);
                      }
                    : undefined
                }
              >
                <title>{titre}</title>
              </circle>
            );
          })}
        </g>
      </svg>

      {legende ? (
        <p className="mt-2 font-mono text-[11px] text-encre" style={{ fontVariantNumeric: "tabular-nums" }}>
          {legendeDe(legende, x)}
          <span className="text-sourd"> · {x.chemin} · msg {legende.msg.slice(0, 8)}</span>
        </p>
      ) : null}
    </div>
  );
}
