import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useI18n, type Msg } from "@/lib/i18n.ts";

export type NavId =
  "coffre" | "tour" | "journal" | "temoin" | "arbre" | "reliques" | "glyphes" | "signatures" | "guide";

const ITEMS: {
  to: "/" | "/tour" | "/journal" | "/temoin" | "/arbre" | "/reliques" | "/glyphes" | "/signatures" | "/guide";
  id: NavId;
  label: Msg;
}[] = [
  { to: "/", id: "coffre", label: "nav.coffre" },
  { to: "/tour", id: "tour", label: "nav.tour" },
  { to: "/journal", id: "journal", label: "nav.journal" },
  { to: "/temoin", id: "temoin", label: "nav.temoin" },
  { to: "/arbre", id: "arbre", label: "nav.arbre" },
  { to: "/reliques", id: "reliques", label: "nav.reliques" },
  { to: "/glyphes", id: "glyphes", label: "nav.glyphes" },
  { to: "/signatures", id: "signatures", label: "nav.signatures" },
  { to: "/guide", id: "guide", label: "nav.guide" },
];

export function Nav({ actuel }: { actuel: NavId }) {
  const { t } = useI18n();
  return (
    <nav className="flex flex-wrap items-center justify-center gap-1" aria-label="Sections">
      {ITEMS.map((it) => (
        <Link
          key={it.id}
          to={it.to}
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
      ))}
    </nav>
  );
}
