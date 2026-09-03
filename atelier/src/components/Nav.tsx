import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const ITEMS = [
  { to: "/", id: "coffre" as const, label: "Coffre" },
  { to: "/arbre", id: "arbre" as const, label: "Arbre" },
  { to: "/guide", id: "guide" as const, label: "Guide" },
];

export function Nav({ actuel }: { actuel: "coffre" | "arbre" | "guide" }) {
  return (
    <nav className="flex items-center justify-center gap-1" aria-label="Sections">
      {ITEMS.map((it) => (
        <Link
          key={it.id}
          to={it.to}
          className={cn(
            "h-8 rounded-sm px-3 font-mono text-[11px] tracking-wide",
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
