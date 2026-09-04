import { VoxelIcon } from "@/components/inventaire/VoxelIcon";
import { useI18n } from "@/lib/i18n.ts";
import { useCoffre } from "@/lib/store.ts";
import { bestiaireDe } from "@/lib/eidos/bestiaire.ts";
import { CLASSES, REGIMES } from "@/lib/eidos/cosmos.ts";
import { celluleDoxa } from "@/lib/eidos/integrite.ts";
import { signatureDe } from "@/lib/eidos/inventaire.ts";
import { cn } from "@/lib/utils";

/** Le bestiaire du coffre : les captures par cellule de la doxa, 3 classes × 7 régimes. */
export function Bestiaire() {
  const { t } = useI18n();
  const coffre = useCoffre((s) => s.coffre);
  const b = bestiaireDe(coffre);
  const captures = (coffre.objets ?? []).filter((o) => o.genre === "capture");

  return (
    <section className="rounded-lg bg-carte p-4 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)] sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-mono text-base font-normal text-encre">{t("inv.bestiaire")}</h2>
        <p className="font-mono text-[11px] text-sourd">
          {t("inv.bestiaire.cellules", { n: b.remplies.length, max: b.total })}
        </p>
      </div>
      <p className="mt-2 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">
        {t("inv.bestiaire.lede")}
      </p>
      {captures.length === 0 ? (
        <p className="mt-3 font-mono text-[12px] text-sourd">{t("inv.bestiaire.vide")}</p>
      ) : null}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-separate border-spacing-1 font-mono text-[10px]">
          <thead>
            <tr>
              <th className="text-left font-normal text-sourd" />
              {REGIMES.map((r) => (
                <th key={r} className="font-normal text-sourd">
                  {r}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CLASSES.map((c) => (
              <tr key={c}>
                <td className="text-sourd">{c}</td>
                {REGIMES.map((r) => {
                  const k = celluleDoxa(c, r);
                  const os = b.cellules[k] ?? [];
                  return (
                    <td
                      key={k}
                      className={cn(
                        "h-12 min-w-12 rounded-sm text-center align-middle",
                        os.length
                          ? "bg-fond shadow-[0_0_0_1px_#3e8e6e]"
                          : "bg-fond shadow-[0_0_0_1px_rgb(198_203_209_/_0.12)]",
                      )}
                      title={k}
                    >
                      {os.length ? (
                        <div className="flex flex-col items-center">
                          <VoxelIcon objet={os[0]!} size={28} />
                          <span className="text-encre">
                            {os.length > 1 ? `${os[0]!.nom} +${os.length - 1}` : os[0]!.nom}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sourd">·</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {captures.length > 0 ? (
        <p className="mt-2 font-mono text-[11px] text-sourd">
          {captures
            .map((o) => `${o.nom} · ${signatureDe(o.archetype).muse} · ${o.age}`)
            .join("  —  ")}
        </p>
      ) : null}
    </section>
  );
}
