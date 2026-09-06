import { Printer, ImageDown } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Marque } from "@/components/chymie/Marque.tsx";
import { analyserGraine } from "@/lib/eidos/lamport.ts";
import { fromHex } from "@/lib/eidos/hash.ts";
import { papiersDe, signeDe, type Carte, type Grille } from "@/lib/eidos/papier.ts";
import { useCoffre } from "@/lib/store.ts";
import { useI18n } from "@/lib/i18n.ts";
import { cn } from "@/lib/utils";

function Case({ code }: { code: number | null }) {
  if (code === null) {
    return <span className="block size-full rounded-[2px] bg-creux" />;
  }
  const s = signeDe(code);
  return <Marque trait={s.trait} uni={s.uni} className="size-4 text-[12px]" />;
}

function Mini({ g, i }: { g: Grille; i: number }) {
  return (
    <li className="min-w-0">
      <div className="grid grid-cols-2 gap-px bg-trait p-px">
        {([0, 1, 2, 3] as const).map((pos) => (
          <div key={pos} className="flex aspect-square items-center justify-center bg-carte">
            <Case code={pos === g.pos ? g.code : null} />
          </div>
        ))}
      </div>
      <p className="mt-0.5 text-center font-mono text-[9px] tabular-nums text-sourd">
        {String(i).padStart(2, "0")}
      </p>
    </li>
  );
}

function Carton({ carte, locale }: { carte: Carte; locale: "fr" | "en" }) {
  const nom = locale === "fr" ? carte.prima.fr : carte.prima.en;
  return (
    <article className="break-after-page rounded-md bg-fond p-3 shadow-[0_0_0_1px_rgb(198_203_209_/_0.14)] print:break-after-page print:shadow-none">
      <header className="mb-2 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.14em] text-or">
        <span>
          {carte.prima.uni} {nom}
        </span>
        <span className="text-sourd">32 × 64</span>
      </header>
      <ol className="grid grid-cols-4 gap-2 sm:grid-cols-8">
        {carte.grilles.map((g, i) => (
          <Mini key={i} g={g} i={i} />
        ))}
      </ol>
      <ol className="mt-3 flex items-center justify-center gap-2">
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
  const W = 520;
  const H = 640;
  const mini = 52;
  const cell = 24;
  const gapG = 10;
  const cols = 8;
  const left = 28;
  const top0 = 52;
  const pages = cartes.map((carte, p) => {
    const y0 = p * H;
    const grilles = carte.grilles
      .map((g, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x0 = left + col * (mini + gapG);
        const y1 = y0 + top0 + row * (mini + 18);
        const cells = [0, 1, 2, 3]
          .map((pos) => {
            const x = x0 + (pos % 2) * (cell + 1);
            const y = y1 + Math.floor(pos / 2) * (cell + 1);
            if (pos !== g.pos) {
              return `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="#1a1e24" stroke="#3a4048"/>`;
            }
            const s = signeDe(g.code);
            return `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="#161a20" stroke="#C9A227"/><text x="${x + cell / 2}" y="${y + cell / 2 + 5}" text-anchor="middle" font-size="13" fill="#C9A227">${esc(s.uni)}</text>`;
          })
          .join("");
        return `${cells}<text x="${x0 + cell}" y="${y1 + mini + 2}" text-anchor="middle" font-family="monospace" font-size="8" fill="#6E7581">${String(i).padStart(2, "0")}</text>`;
      })
      .join("");
    const ctrlY = y0 + top0 + 4 * (mini + 18) + 8;
    const ctrl = carte.controle
      .map((code, i) => {
        const s = signeDe(code);
        const x = left + 140 + i * 40;
        return `<rect x="${x}" y="${ctrlY}" width="32" height="32" fill="#1a1e24" stroke="#C9A227"/><text x="${x + 16}" y="${ctrlY + 22}" text-anchor="middle" font-size="16" fill="#C9A227">${esc(s.uni)}</text>`;
      })
      .join("");
    return `<rect x="0" y="${y0}" width="${W}" height="${H}" fill="#12151A"/><text x="${left}" y="${y0 + 32}" font-family="Georgia, serif" font-size="16" fill="#C9A227">${esc(carte.prima.uni)} ${esc(carte.prima.fr)}</text><text x="${W - 28}" y="${y0 + 32}" text-anchor="end" font-family="monospace" font-size="11" fill="#6E7581">32 × 64</text>${grilles}${ctrl}`;
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
