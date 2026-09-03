import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export type NavId = "coffre" | "journal" | "temoin" | "arbre" | "guide";

const ITEMS: { to: "/" | "/journal" | "/temoin" | "/arbre" | "/guide"; id: NavId; label: string }[] = [
  { to: "/", id: "coffre", label: "Coffre" },
  { to: "/journal", id: "journal", label: "Journal" },
  { to: "/temoin", id: "temoin", label: "Témoin" },
  { to: "/arbre", id: "arbre", label: "Arbre" },
  { to: "/guide", id: "guide", label: "Guide" },
];

export function Nav({ actuel }: { actuel: NavId }) {
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
          {it.label}
        </Link>
      ))}
    </nav>
  );
}
