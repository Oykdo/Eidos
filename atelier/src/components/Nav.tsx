import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useI18n, type Msg } from "@/lib/i18n.ts";

export type NavId =
  "coffre" | "tour" | "journal" | "temoin" | "arbre" | "reliques" | "glyphes" | "signatures" | "guide";

type Chemin = "/" | "/tour" | "/journal" | "/temoin" | "/arbre" | "/reliques" | "/glyphes" | "/signatures" | "/guide";

type Item = { to: Chemin; id: NavId; label: Msg };

/**
 * Trois registres, pas neuf onglets à plat :
 *   Vérifier — ce qui engage : carnet, chaîne, signatures, adresses.
 *   Lire     — des figures : la carte des reliques, les lectures en muses.
 *   Jouer    — hors invariant : la tour, les sceaux et reliques.
 * Le Guide reste à part.
 */
const GROUPES: { id: "verifier" | "lire" | "jouer"; label: Msg; items: Item[] }[] = [
  {
    id: "verifier",
    label: "nav.groupe.verifier",
    items: [
      { to: "/", id: "coffre", label: "nav.coffre" },
      { to: "/journal", id: "journal", label: "nav.journal" },
      { to: "/temoin", id: "temoin", label: "nav.temoin" },
      { to: "/glyphes", id: "glyphes", label: "nav.glyphes" },
    ],
  },
  {
    id: "lire",
    label: "nav.groupe.lire",
    items: [
      { to: "/arbre", id: "arbre", label: "nav.arbre" },
      { to: "/signatures", id: "signatures", label: "nav.signatures" },
    ],
  },
  {
    id: "jouer",
    label: "nav.groupe.jouer",
    items: [
      { to: "/tour", id: "tour", label: "nav.tour" },
      { to: "/reliques", id: "reliques", label: "nav.reliques" },
    ],
  },
];

const GUIDE: Item = { to: "/guide", id: "guide", label: "nav.guide" };

function groupeDe(id: NavId): "verifier" | "lire" | "jouer" | "guide" {
  return GROUPES.find((g) => g.items.some((it) => it.id === id))?.id ?? "guide";
}

function Onglet({ it, actuel }: { it: Item; actuel: NavId }) {
  const { t } = useI18n();
  return (
    <Link
      to={it.to}
      aria-current={actuel === it.id ? "page" : undefined}
      className={cn(
        "h-8 rounded-sm px-2.5 font-mono text-[11px] tracking-wide",
        "inline-flex items-center",
        actuel === it.id
          ? "bg-or text-or-fg"
          : "text-sourd shadow-[0_0_0_1px_rgb(198_203_209_/_0.24)] hover:text-encre",
      )}
    >
      {t(it.label)}
    </Link>
  );
}

export function Nav({ actuel }: { actuel: NavId }) {
  const { t } = useI18n();
  const courant = groupeDe(actuel);
  return (
    <nav className="flex flex-wrap items-start justify-center gap-x-3 gap-y-2" aria-label="Sections">
      {GROUPES.map((g) => (
        <div key={g.id} className="flex flex-col items-center gap-1">
          <span
            className={cn(
              "font-mono text-[9.5px] uppercase tracking-[0.16em]",
              courant === g.id ? "text-encre" : "text-sourd/70",
            )}
          >
            {t(g.label)}
          </span>
          <div className="flex flex-wrap items-center justify-center gap-1">
            {g.items.map((it) => (
              <Onglet key={it.id} it={it} actuel={actuel} />
            ))}
          </div>
        </div>
      ))}
      <div className="flex flex-col items-center gap-1">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-sourd/70">·</span>
        <Onglet it={GUIDE} actuel={actuel} />
      </div>
    </nav>
  );
}
