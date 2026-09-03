import { useState } from "react";
import { Check, LoaderCircle, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  lancerGenese,
  lancerPrealables,
  type Controle,
  type Rapport,
} from "@/lib/eidos/genese.ts";
import { useCoffre } from "@/lib/store.ts";

function Marque({ ok }: { ok: boolean }) {
  return ok ? (
    <Check className="size-4 text-cuivre" strokeWidth={1.75} />
  ) : (
    <X className="size-4 text-fer" strokeWidth={1.75} />
  );
}

function Liste({ controles }: { controles: Controle[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {controles.map((c) => (
        <li
          key={c.id}
          className="flex gap-3 rounded-md bg-creux px-3 py-3 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)]"
        >
          <span className="mt-0.5 shrink-0">
            <Marque ok={c.ok} />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-sm text-encre">{c.label}</p>
            {c.detail ? (
              <p className="mt-1 break-all font-mono text-[12.5px] leading-relaxed text-sourd">
                {c.detail}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function EnTete({ rapport }: { rapport: Rapport }) {
  return (
    <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-sourd">
      {rapport.titre} · {rapport.passes} ok
      {rapport.echecs > 0 ? ` · ${rapport.echecs} échec${rapport.echecs > 1 ? "s" : ""}` : ""}
    </p>
  );
}

export function Genese() {
  const coffre = useCoffre((s) => s.coffre);
  const [busy, setBusy] = useState(false);
  const [etape, setEtape] = useState<string | null>(null);
  const [genese, setGenese] = useState<Rapport | null>(null);
  const [prealables, setPrealables] = useState<Rapport | null>(null);

  function lancer() {
    if (busy) return;
    setBusy(true);
    setEtape("Genèse…");
    setGenese(null);
    setPrealables(null);
    window.setTimeout(() => {
      try {
        const g = lancerGenese();
        setGenese(g);
        setEtape("Portefeuille et échanges…");
        window.setTimeout(() => {
          try {
            setPrealables(lancerPrealables(coffre));
          } finally {
            setEtape(null);
            setBusy(false);
          }
        }, 30);
      } catch (e) {
        setEtape(null);
        setBusy(false);
        setGenese({
          titre: "Genèse",
          ok: false,
          passes: 0,
          echecs: 1,
          controles: [
            {
              id: "crash",
              ok: false,
              label: "rejeu interrompu",
              detail: e instanceof Error ? e.message : "erreur",
            },
          ],
        });
      }
    }, 30);
  }

  const pret =
    genese?.ok === true &&
    prealables?.ok === true;

  return (
    <section className="rounded-lg bg-carte p-5 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)] sm:p-6">
      <h2 className="font-mono text-base font-normal text-encre">Genèse</h2>
      <p className="mb-4 mt-1 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">
        Rejouer le fichier gelé, puis les tests du portefeuille. Rien ne se
        croit.
      </p>

      <Button type="button" disabled={busy} onClick={() => lancer()}>
        {busy ? (
          <LoaderCircle className="size-4 animate-spin" strokeWidth={1.75} />
        ) : (
          <Play className="size-4" strokeWidth={1.75} />
        )}
        {busy ? etape ?? "Rejeu…" : "Lancer la genèse et les tests"}
      </Button>

      {pret ? (
        <p className="mt-4 font-mono text-sm text-cuivre">
          Portefeuille en place. Échanges signés possibles.
        </p>
      ) : null}

      {genese ? (
        <div className="mt-5">
          <EnTete rapport={genese} />
          <Liste controles={genese.controles} />
        </div>
      ) : null}

      {prealables ? (
        <div className="mt-6 border-t border-trait pt-4">
          <EnTete rapport={prealables} />
          <Liste controles={prealables.controles} />
        </div>
      ) : null}
    </section>
  );
}
