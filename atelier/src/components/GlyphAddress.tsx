import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { encoderAdresse, etagesDe, groupesUtiles } from "@/lib/eidos/glyphs";
import { fromHex } from "@/lib/eidos/hash";
import { GlypheSvg } from "./Mark";
import { cn } from "@/lib/utils";

export function GlyphAddress({
  hexa,
  compact = false,
  className,
}: {
  hexa: string;
  compact?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  let texte = hexa.length >= 16 ? hexa.slice(0, 16) + "…" : hexa;
  let groupes: string[] = [];
  try {
    if (hexa.length === 40) {
      texte = encoderAdresse(fromHex(hexa));
      groupes = groupesUtiles(hexa);
    }
  } catch {
    /* */
  }

  async function copier() {
    if (!texte) return;
    try {
      await navigator.clipboard.writeText(texte);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* */
    }
  }

  return (
    <div className={cn("min-w-0", className)}>
      {!compact && groupes.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-0.5" aria-hidden>
          {groupes.slice(0, 12).map((g, i) => (
            <GlypheSvg key={`${g}-${i}`} etages={etagesDe(g)} className="h-7 w-3.5" />
          ))}
        </div>
      )}
      <div className="flex items-start gap-2">
        <p className="sym min-w-0 flex-1 break-all font-mono text-[12.5px] leading-relaxed text-argent">
          {texte}
        </p>
        <button
          type="button"
          onClick={() => void copier()}
          className="relative mt-0.5 inline-flex size-8 shrink-0 items-center justify-center text-sourd after:absolute after:top-1/2 after:left-1/2 after:size-11 after:-translate-x-1/2 after:-translate-y-1/2 hover:text-encre"
          aria-label="Copier l'adresse"
        >
          {copied ? <Check className="size-3.5 text-cuivre" /> : <Copy className="size-3.5" />}
        </button>
      </div>
    </div>
  );
}
