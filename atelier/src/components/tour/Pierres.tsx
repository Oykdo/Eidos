import { Marque } from "@/components/chymie/Marque.tsx";
import { PIERRES, codePierre } from "@/lib/eidos/pierres.ts";
import { useI18n } from "@/lib/i18n.ts";
import { cn } from "@/lib/utils";
import type { ObjetPorte } from "@/lib/eidos/types.ts";

export function Pierres({ objets }: { objets: readonly ObjetPorte[] }) {
  const { t, locale } = useI18n();
  const tenues = new Set(
    objets
      .filter((o) => o.genre === "pierre" || o.genre === "gemme")
      .map((o) => codePierre(o)),
  );

  return (
    <div className="mt-4 rounded-md bg-fond p-3">
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-sourd">{t("pierres.h")}</p>
      <p className="mt-1 font-mono text-[11px] leading-relaxed text-sourd text-pretty">{t("pierres.lede")}</p>
      <ul className="mt-2 grid grid-cols-8 gap-1">
        {PIERRES.map((p) => {
          const on = tenues.has(p.code);
          return (
            <li key={p.id} title={locale === "fr" ? p.fr : p.en}>
              <Marque
                trait={p.trait}
                uni={p.uni}
                className={cn("size-5 text-[12px]", on ? "text-or" : "text-plomb")}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
