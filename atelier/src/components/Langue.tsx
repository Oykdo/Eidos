import { useEffect } from "react";
import { hydrateLocale, useI18n, type Locale } from "@/lib/i18n.ts";
import { cn } from "@/lib/utils";

export function Langue({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  useEffect(() => {
    hydrateLocale();
  }, []);
  return (
    <div className={cn("flex items-center justify-center gap-1", className)} role="group" aria-label="Language">
      {(["fr", "en"] as Locale[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          className={cn(
            "h-7 rounded-sm px-2 font-mono text-[11px] tracking-wide",
            locale === l ? "bg-or text-or-fg" : "text-sourd hover:text-encre",
          )}
        >
          {t(l === "fr" ? "lang.fr" : "lang.en")}
        </button>
      ))}
    </div>
  );
}
