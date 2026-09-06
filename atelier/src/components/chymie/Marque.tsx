import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const P = {
  mars: "M8 3.5a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4ZM10.5 5.2l3.2-3.2M11.2 2h2.5v2.5",
  venus: "M8 2.8a3.1 3.1 0 1 0 0 6.2 3.1 3.1 0 0 0 0-6.2ZM8 9v4.4M5.8 11.2h4.4",
  mercure: "M8 5.2a3 3 0 1 0 0 6 3 3 0 0 0 0-6.2ZM8 11.2v3M6.2 12.7h3.6M5.2 3.2c.8-1.4 2.4-1.8 2.8-1.8s2 .4 2.8 1.8",
  lune: "M10.2 3.2a4.4 4.4 0 1 0 0 9.6 4.6 4.6 0 0 1 0-9.6Z",
  soleil: "M8 4.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6ZM8 8h.01",
  jupiter: "M6 3.2h4.2c1.4 0 2.2 1 2.2 2.2S11.6 7.6 10 7.6H6.2M8.6 7.6v5.6M6.4 11h4.6",
  plomb: "M5.2 3.2h5.2M7.8 3.2v4.4M5.5 12.6c0-2.6 1.2-4.6 2.6-4.6s2.6 2 2.6 4.6",
  antimoine: "M8 3.2v9.6M5 12.8h6M8 3.2 5.2 6.2M8 3.2l2.8 3",
  air: "M8 3.2 13 12.2H3Z M5.2 8.4h5.6",
  feu: "M8 3.2 13 12.4H3Z",
  eau: "M8 12.8 3 3.6h10Z",
  terre: "M8 3.4 13 8 8 12.6 3 8Z M8 5.4v5.2M5.4 8h5.2",
  sel: "M4.2 4.2h7.6v7.6H4.2Z M8 4.2v7.6M4.2 8h7.6",
  soufre: "M8 2.6 12.6 10H3.4Z M8 10v3.6M5.6 12h4.8",
  alambic: "M5 3.2h6v3.2c0 1.6-1.2 2.6-3 2.6s-3-1-3-2.6ZM8 8.8v2.2M5.2 13.2h5.6M4.2 13.2h8",
  lune2: "M10.2 3.2a4.4 4.4 0 1 0 0 9.6 4.6 4.6 0 0 1 0-9.6Z",
} as const;

function Trait({ d, className }: { d: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={cn("inline-block size-4 shrink-0 text-or", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}

function Glyph({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={cn("inline-block size-4 shrink-0 text-or", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

const DESSINS: Record<string, (className?: string) => ReactNode> = {
  mars: (c) => <Trait d={P.mars} className={c} />,
  venus: (c) => <Trait d={P.venus} className={c} />,
  mercure: (c) => <Trait d={P.mercure} className={c} />,
  lune: (c) => <Trait d={P.lune} className={c} />,
  soleil: (c) => (
    <Glyph className={c}>
      <circle cx="8" cy="8" r="3.6" />
      <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" />
    </Glyph>
  ),
  jupiter: (c) => <Trait d={P.jupiter} className={c} />,
  plomb: (c) => <Trait d={P.plomb} className={c} />,
  antimoine: (c) => <Trait d={P.antimoine} className={c} />,
  air: (c) => <Trait d={P.air} className={c} />,
  feu: (c) => <Trait d={P.feu} className={c} />,
  eau: (c) => <Trait d={P.eau} className={c} />,
  terre: (c) => <Trait d={P.terre} className={c} />,
  sel: (c) => <Trait d={P.sel} className={c} />,
  soufre: (c) => <Trait d={P.soufre} className={c} />,
  alambic: (c) => <Trait d={P.alambic} className={c} />,
  aimant: (c) => (
    <Glyph className={c}>
      <path d="M4.2 6.2v4.2a3.8 3.8 0 0 0 7.6 0V6.2" />
      <path d="M4.2 6.2h2.2M9.6 6.2h2.2" />
    </Glyph>
  ),
  alun: (c) => (
    <Glyph className={c}>
      <circle cx="8" cy="8" r="4.2" />
      <rect x="5.6" y="5.6" width="4.8" height="4.8" />
    </Glyph>
  ),
  amalgame: (c) => (
    <Glyph className={c}>
      <path d="M3.2 8h2.2M6.6 8h2.8M10.6 8h2.2" />
      <path d="M4.3 6.6v2.8M7.9 6.6v2.8M11.7 6.6v2.8" />
    </Glyph>
  ),
  aquarius: (c) => (
    <Glyph className={c}>
      <path d="M3 6.2h10M3 9.8h10" />
      <path d="M5 5.2v2M8 5.2v2M11 5.2v2M5 8.8v2M8 8.8v2M11 8.8v2" />
    </Glyph>
  ),
  aries: (c) => (
    <Glyph className={c}>
      <path d="M3.6 8.8c0-3 2-5.4 4.4-5.4S12.4 5.8 12.4 8.8" />
      <path d="M8 3.6v9.2" />
    </Glyph>
  ),
  arsenic: (c) => (
    <Glyph className={c}>
      <circle cx="5.4" cy="8" r="2.4" />
      <circle cx="10.6" cy="8" r="2.4" />
    </Glyph>
  ),
  bain: (c) => (
    <Glyph className={c}>
      <path d="M4 5.2h8v6.4H4Z" />
      <path d="M4 8.4h8" />
    </Glyph>
  ),
  balance: (c) => (
    <Glyph className={c}>
      <path d="M8 3.4v3.4M3.6 6.8h8.8" />
      <path d="M4.4 6.8l-1.6 4.2h3.2Z M11.6 6.8l-1.6 4.2h3.2Z" />
    </Glyph>
  ),
  borax: (c) => (
    <Glyph className={c}>
      <path d="M4.2 11.6 8 4.2l3.8 7.4Z" />
      <path d="M5.6 11.6h4.8" />
    </Glyph>
  ),
  calciner: (c) => (
    <Glyph className={c}>
      <path d="M3.6 11.4c2.2-4.4 6.6-4.4 8.8 0" />
    </Glyph>
  ),
  cancer: (c) => (
    <Glyph className={c}>
      <path d="M4.2 5.4a3 3 0 0 1 3.8 2.8 3 3 0 0 1-3.8 2.8" />
      <path d="M11.8 5.4a3 3 0 0 0-3.8 2.8 3 3 0 0 0 3.8 2.8" />
    </Glyph>
  ),
  capricorne: (c) => (
    <Glyph className={c}>
      <path d="M4 5.2c2-2 4.4.4 4.4 2.6S7 11.6 5.6 12.4" />
      <path d="M8.4 7.8c1.4 0 3.6 1.4 3.6 3.2" />
    </Glyph>
  ),
  cendres: (c) => (
    <Glyph className={c}>
      <path d="M4 11.4h8M5.2 11.4V7.2M8 11.4V5.2M10.8 11.4V7.2" />
    </Glyph>
  ),
  chaux: (c) => (
    <Glyph className={c}>
      <circle cx="6" cy="8" r="2.6" />
      <path d="M9.2 5.4h3.2v5.2H9.2" />
    </Glyph>
  ),
  cinnabre: (c) => (
    <Glyph className={c}>
      <path d="M8 3.4v9.2M5.4 12.6h5.2" />
      <circle cx="8" cy="6.2" r="2.2" />
    </Glyph>
  ),
  coaguler: (c) => (
    <Glyph className={c}>
      <path d="M4.2 4.6h7.6v2.4H4.2Z M4.2 9h7.6v2.4H4.2Z" />
    </Glyph>
  ),
  creuset: (c) => (
    <Glyph className={c}>
      <path d="M5 3.6h6L9.6 12.4H6.4Z" />
    </Glyph>
  ),
  cristal: (c) => (
    <Glyph className={c}>
      <path d="M8 2.8 12.4 8 8 13.2 3.6 8Z" />
    </Glyph>
  ),
  distiller: (c) => (
    <Glyph className={c}>
      <path d="M4.4 4.2h5.2l1.6 3.2H6Z" />
      <path d="M10.4 7.4c1.6.4 2.4 2 1.4 3.4" />
      <circle cx="11.2" cy="12.4" r="0.8" fill="currentColor" stroke="none" />
    </Glyph>
  ),
  eauforte: (c) => (
    <Glyph className={c}>
      <path d="M8 12.6 3.4 4h9.2Z" />
      <path d="M5.6 8.4h4.8" />
    </Glyph>
  ),
  eauregale: (c) => (
    <Glyph className={c}>
      <path d="M8 12.6 3.4 4h9.2Z" />
      <path d="M8 6.4v4" />
    </Glyph>
  ),
  eaudevie: (c) => (
    <Glyph className={c}>
      <circle cx="6.2" cy="6.4" r="2.4" />
      <circle cx="10.2" cy="9.8" r="2.4" />
    </Glyph>
  ),
  esprit: (c) => (
    <Glyph className={c}>
      <path d="M3.4 8h9.2M5 6.2c1.4 1.8 4.6 1.8 6 0" />
    </Glyph>
  ),
  filtrer: (c) => (
    <Glyph className={c}>
      <path d="M4 3.8h8L8 12.6Z" />
      <path d="M5.6 6.4h4.8" />
    </Glyph>
  ),
  huile: (c) => (
    <Glyph className={c}>
      <circle cx="5.4" cy="8" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="8" cy="8" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="10.6" cy="8" r="1.1" fill="currentColor" stroke="none" />
    </Glyph>
  ),
  gemeaux: (c) => (
    <Glyph className={c}>
      <path d="M5.4 3.8v8.4M10.6 3.8v8.4M4.4 3.8h7.2M4.4 12.2h7.2" />
    </Glyph>
  ),
  lion: (c) => (
    <Glyph className={c}>
      <circle cx="6.4" cy="6.4" r="2.4" />
      <path d="M8.2 8.2c2 1 3.2 3.2 2.2 4.8" />
    </Glyph>
  ),
  poissons: (c) => (
    <Glyph className={c}>
      <path d="M4 6.2c2.4-2.6 6.2.4 8 2.6M4 9.8c2.4 2.6 6.2-.4 8-2.6" />
    </Glyph>
  ),
  poudre: (c) => (
    <Glyph className={c}>
      <circle cx="5.2" cy="6.2" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="8.8" cy="5.4" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="7" cy="8.6" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="10.6" cy="9.2" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="5.8" cy="11" r="0.8" fill="currentColor" stroke="none" />
    </Glyph>
  ),
  precipiter: (c) => (
    <Glyph className={c}>
      <path d="M4 5.2h8M8 5.2v6.6M5.6 9.6 8 12.2l2.4-2.6" />
    </Glyph>
  ),
  purifier: (c) => (
    <Glyph className={c}>
      <path d="M4.4 5.2h7.2c0 4.2-1.6 7.2-3.6 7.2s-3.6-3-3.6-7.2Z" />
    </Glyph>
  ),
  quintessence: (c) => (
    <Glyph className={c}>
      <circle cx="8" cy="8" r="4.4" />
      <path d="M8 4.4v7.2M4.4 8h7.2" />
    </Glyph>
  ),
  realgar: (c) => (
    <Glyph className={c}>
      <path d="M4.2 11.4 8 4.4l3.8 7" />
      <path d="M5.6 8.4h4.8" />
    </Glyph>
  ),
  cornue: (c) => (
    <Glyph className={c}>
      <circle cx="5.6" cy="9.2" r="2.8" />
      <path d="M8.2 8.2 13 4.6" />
    </Glyph>
  ),
  sagittaire: (c) => (
    <Glyph className={c}>
      <path d="M4 12 12.2 3.8M9.4 3.8h2.8v2.8M5.2 8.2l3.2 3.2" />
    </Glyph>
  ),
  scorpion: (c) => (
    <Glyph className={c}>
      <path d="M3.6 8.6h6.4c1.4 0 2.4 1.4 2.4 2.8" />
      <path d="M5 8.6V6.2M7 8.6V6.2M9 8.6V6.2" />
    </Glyph>
  ),
  selalkali: (c) => (
    <Glyph className={c}>
      <path d="M4.4 11.2h7.2M4.8 11.2 8 4.6l3.2 6.6" />
    </Glyph>
  ),
  selammoniac: (c) => (
    <Glyph className={c}>
      <path d="M8 3.4v9.2M4.4 5.6l7.2 4.8M11.6 5.6 4.4 10.4" />
    </Glyph>
  ),
  sublimer: (c) => (
    <Glyph className={c}>
      <path d="M4 10.8h8M8 10.8V4.4M5.8 6.4 8 4.2l2.2 2.2" />
    </Glyph>
  ),
  talc: (c) => (
    <Glyph className={c}>
      <path d="M4.2 4.4 11.8 11.6M11.8 4.4 4.2 11.6" />
    </Glyph>
  ),
  taureau: (c) => (
    <Glyph className={c}>
      <circle cx="8" cy="9.2" r="3" />
      <path d="M4.2 4.6c1.4 1.6 2.6 2.2 3.8 2.4M11.8 4.6c-1.4 1.6-2.6 2.2-3.8 2.4" />
    </Glyph>
  ),
  verre: (c) => (
    <Glyph className={c}>
      <path d="M6.2 3.6h3.6L11.4 12.4H4.6Z" />
    </Glyph>
  ),
  vin: (c) => (
    <Glyph className={c}>
      <path d="M5.2 3.8h5.6L8 12.4Z" />
    </Glyph>
  ),
  vinaigre: (c) => (
    <Glyph className={c}>
      <path d="M4.2 4.2 11.8 11.8M11.8 4.2 4.2 11.8" />
    </Glyph>
  ),
  vitriol: (c) => (
    <Glyph className={c}>
      <circle cx="8" cy="8" r="4.2" />
      <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" />
    </Glyph>
  ),
  vitriolblanc: (c) => (
    <Glyph className={c}>
      <rect x="4.2" y="4.2" width="7.6" height="7.6" />
      <rect x="6.2" y="6.2" width="3.6" height="3.6" />
    </Glyph>
  ),
  vitriolbleu: (c) => (
    <Glyph className={c}>
      <circle cx="8" cy="8" r="4.2" />
      <path d="M8 5.4v5.2M5.4 8h5.2" />
    </Glyph>
  ),
  soufresages: (c) => (
    <Glyph className={c}>
      <path d="M8 2.8 12.4 9.4H3.6Z" />
      <path d="M8 9.4v3.8M5.8 11.6h4.4" />
      <circle cx="8" cy="6.6" r="0.9" fill="currentColor" stroke="none" />
    </Glyph>
  ),
  selgemme: (c) => (
    <Glyph className={c}>
      <path d="M8 3.2 12.6 8 8 12.8 3.4 8Z" />
      <path d="M8 5.6v4.8" />
    </Glyph>
  ),
};

export function Marque({
  trait,
  uni,
  className,
}: {
  trait?: string;
  uni?: string;
  className?: string;
}) {
  if (uni) {
    return (
      <span
        className={cn(
          "inline-flex size-4 shrink-0 items-center justify-center font-serif text-[13px] leading-none text-or",
          className,
        )}
        aria-hidden
      >
        {uni}
      </span>
    );
  }
  const f = DESSINS[trait ?? "sel"] ?? DESSINS.sel;
  return f(className);
}
