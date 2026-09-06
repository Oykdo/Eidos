import { Printer, ImageDown } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Marque } from "@/components/chymie/Marque.tsx";
import { analyserGraine } from "@/lib/eidos/lamport.ts";
import { fromHex } from "@/lib/eidos/hash.ts";
import {
  COTE,
  papiersDe,
  signeDe,
  type Carte,
} from "@/lib/eidos/papier.ts";
import { useCoffre } from "@/lib/store.ts";
import { useI18n } from "@/lib/i18n.ts";
import { cn } from "@/lib/utils";

function Case({ code }: { code: number | null }) {
  if (code === null) {
    return <span className="block size-full rounded-[2px] bg-creux" />;
  }
  const s = signeDe(code);
  return <Marque trait={s.trait} uni={s.uni} className="size-5 text-[14px]" />;
}

function Carton({ carte, locale }: { carte: Carte; locale: "fr" | "en" }) {
  const nom = locale === "fr" ? carte.prima.fr : carte.prima.en;
  return (
    <article className="break-after-page rounded-md bg-fond p-3 shadow-[0_0_0_1px_rgb(198_203_209_/_0.14)] print:break-after-page print:shadow-none">
      <header className="mb-2 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.14em] text-or">
        <span>
          {carte.prima.uni} {nom}
        </span>
        <span className="text-sourd">EIDOS</span>
      </header>
      <div
        className="grid gap-px bg-trait p-px"
        style={{ gridTemplateColumns: `repeat(${COTE}, minmax(0, 1fr))` }}
      >
        {carte.cellules.map((c) => (
          <div key={c.i} className="flex aspect-square items-center justify-center bg-carte">
            <Case code={c.code} />
          </div>
        ))}
      </div>
      <ol className="mt-2 flex items-center justify-center gap-2">
        {carte.controle.map((code, i) => (
          <li key={i} className="flex size-8 items-center justify-center rounded-sm bg-creux">
            <Case code={code} />
          </li>
        ))}
      </ol>
    </article>
  );
}

function svgPapier(cartes: Carte[]): string {
  const W = 420;
  const H = 520;
  const cell = 44;
  const gap = 4;
  const left = 42;
  const top0 = 56;
  const pages = cartes.map((carte, p) => {
    const y0 = p * H;
    const cells = carte.cellules
      .map((c) => {
        const r = Math.floor(c.i / COTE);
        const col = c.i % COTE;
        const x = left + col * (cell + gap);
        const y = y0 + top0 + r * (cell + gap);
        if (c.code === null) {
          return `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="#1a1e24" stroke="#3a4048"/>`;
        }
        const s = signeDe(c.code);
        return `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="#161a20" stroke="#3a4048"/><text x="${x + cell / 2}" y="${y + cell / 2 + 6}" text-anchor="middle" font-size="18" fill="#C9A227">${esc(s.uni)}</text>`;
      })
      .join("");
    const ctrl = carte.controle
      .map((code, i) => {
        const s = signeDe(code);
        const x = left + 70 + i * (cell + 8);
        const y = y0 + top0 + 7 * (cell + gap) + 16;
        return `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="#1a1e24" stroke="#C9A227"/><text x="${x + cell / 2}" y="${y + cell / 2 + 6}" text-anchor="middle" font-size="18" fill="#C9A227">${esc(s.uni)}</text>`;
      })
      .join("");
    const nom = carte.prima.fr;
    return `<rect x="0" y="${y0}" width="${W}" height="${H}" fill="#12151A"/><text x="${left}" y="${y0 + 32}" font-family="Georgia, serif" font-size="16" fill="#C9A227">${esc(carte.prima.uni)} ${esc(nom)}</text><text x="${W - 42}" y="${y0 + 32}" text-anchor="end" font-family="monospace" font-size="11" fill="#6E7581">EIDOS</text>${cells}${ctrl}`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H * 3}" viewBox="0 0 ${W} ${H * 3}">${pages.join("")}</svg>`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">");
}

async function proposerSvg(svg: string): Promise<"partage" | "telechargement" | "annule"> {
  const file = new File([svg], "eidos-papier.svg", { type: "image/svg+xml" });
  const n = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (typeof navigator.share === "function" && (n.canShare?.({ files: [file] }) ?? false)) {
    try {
      await navigator.share({ files: [file], title: "EIDOS papier" });
      return "partage";
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return "annule";
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  return "telechargement";
}

export function Papier() {
  const { t, locale } = useI18n();
  const coffre = useCoffre((s) => s.coffre);
  const [statut, setStatut] = useState<string | null>(null);
  const graine = analyserGraine(coffre.maitre);
  const cartes = useMemo(() => {
    if (graine.forme !== "hex256") return [];
    try {
      return papiersDe(fromHex(coffre.maitre));
    } catch {
      return [];
    }
  }, [coffre.maitre, graine.forme]);

  if (coffre.nature !== "personnel") {
    return (
      <section className="rounded-lg bg-carte p-5 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)] sm:p-6 print:hidden">
        <h2 className="font-mono text-base font-normal text-encre">{t("papier.h")}</h2>
        <p className="mt-1 font-mono text-[12.5px] leading-relaxed text-sourd">{t("papier.vide")}</p>
      </section>
    );
  }

  if (graine.publique || cartes.length !== 3) {
    return (
      <section className="rounded-lg bg-carte p-5 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)] sm:p-6 print:hidden">
        <h2 className="font-mono text-base font-normal text-encre">{t("papier.h")}</h2>
        <p className="mt-1 font-mono text-[12.5px] leading-relaxed text-sourd">{t("papier.publique")}</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg bg-carte p-5 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)] sm:p-6 print:bg-fond print:shadow-none">
      <h2 className="font-mono text-base font-normal text-encre print:hidden">{t("papier.h")}</h2>
      <p className="mt-1 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty print:hidden">
        {t("papier.lede")}
      </p>
      <div className="mt-3 flex flex-col gap-2 print:hidden">
        <Button type="button" variant="or" onClick={() => window.print()}>
          <Printer className="size-4" strokeWidth={1.75} />
          {t("papier.imprimer")}
        </Button>
        <Button
          type="button"
          variant="discret"
          onClick={() => {
            void proposerSvg(svgPapier(cartes)).then((i) => {
              setStatut(i === "annule" ? t("psnx.annule") : t("papier.sauve"));
            });
          }}
        >
          <ImageDown className="size-4" strokeWidth={1.75} />
          {t("papier.image")}
        </Button>
      </div>
      {statut ? <p className="mt-2 font-mono text-[12.5px] text-cuivre print:hidden">{statut}</p> : null}

      <div className="mt-4 flex flex-col gap-4">
        {cartes.map((c) => (
          <Carton key={c.prima.id} carte={c} locale={locale} />
        ))}
      </div>
      <p className={cn("mt-3 font-mono text-[11px] text-sourd print:hidden")}>{t("papier.ctrl")}</p>
    </section>
  );
}
