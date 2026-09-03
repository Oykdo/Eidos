import { useRef } from "react";
import { Download, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCoffre } from "@/lib/store.ts";
import { useI18n } from "@/lib/i18n.ts";
import { NOM_CARNET } from "@/lib/eidos/carnet.ts";

export function Sauvegarde() {
  const { t } = useI18n();
  const exporterFichier = useCoffre((s) => s.exporterFichier);
  const importerFichier = useCoffre((s) => s.importerFichier);
  const flash = useCoffre((s) => s.flash);
  const erreur = useCoffre((s) => s.erreur);
  const psnx = useCoffre((s) => s.psnx);
  const inputRef = useRef<HTMLInputElement>(null);

  function sauver() {
    const raw = exporterFichier();
    const blob = new Blob([raw], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = NOM_CARNET;
    a.click();
    URL.revokeObjectURL(url);
  }

  function ouvrir(f: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result;
      if (r instanceof ArrayBuffer) importerFichier(f.name, r);
      else if (typeof r === "string") importerFichier(f.name, r);
    };
    reader.readAsArrayBuffer(f);
  }

  return (
    <section className="rounded-lg bg-carte p-5 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)] sm:p-6">
      <h2 className="font-mono text-base font-normal text-encre">{t("psnx.exporter")}</h2>
      <p className="mb-4 mt-1 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">
        {t("psnx.aide")}
      </p>
      <div className="flex flex-col gap-2">
        <Button type="button" variant="or" onClick={sauver}>
          <Download className="size-4" strokeWidth={1.75} />
          {t("psnx.exporter")}
        </Button>
        <Button type="button" variant="discret" onClick={() => inputRef.current?.click()}>
          <FolderOpen className="size-4" strokeWidth={1.75} />
          {t("psnx.importer")}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".carnet,.psnx,.json,application/json,application/octet-stream"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) ouvrir(f);
            e.target.value = "";
          }}
        />
      </div>
      <p className="mt-3 min-h-5 font-mono text-sm" role="status">
        {erreur ? <span className="text-fer">{erreur}</span> : null}
        {!erreur && flash ? <span className="text-cuivre">{flash}</span> : null}
        {psnx ? (
          <span className="mt-1 block text-[11px] text-sourd">
            {t("psnx.digest")} · {psnx.digest.slice(0, 16)}…
          </span>
        ) : null}
      </p>
    </section>
  );
}
