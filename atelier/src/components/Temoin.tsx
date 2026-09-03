import { useState } from "react";
import { Button } from "@/components/ui/button";
import { parserPreuve } from "@/lib/eidos/merkle.ts";
import { useCoffre } from "@/lib/store.ts";
import { cn } from "@/lib/utils";

function court(h: string): string {
  return `${h.slice(0, 8)}…${h.slice(-4)}`;
}

export function Temoin() {
  const temoin = useCoffre((s) => s.temoin);
  const flash = useCoffre((s) => s.temoinFlash);
  const suivre = useCoffre((s) => s.suivreTete);
  const soumettre = useCoffre((s) => s.soumettrePreuve);
  const importerTete = useCoffre((s) => s.importerTete);
  const oublier = useCoffre((s) => s.oublierTemoin);
  const [colle, setColle] = useState("");
  const [teteRaw, setTeteRaw] = useState("");
  const [err, setErr] = useState<string | null>(null);

  function coller() {
    const lu = parserPreuve(colle);
    if ("erreur" in lu) {
      setErr(lu.erreur);
      return;
    }
    setErr(null);
    soumettre(lu);
  }

  return (
    <section
      id="temoin"
      className="rounded-lg bg-carte p-5 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)] sm:p-6"
    >
      <h2 className="font-mono text-base font-normal text-encre">Témoin</h2>
      <p className="mb-4 mt-1 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">
        Seconde mémoire, sans les clés. Importer une tête (JSON exporté, ou
        lien) : un autre appareil peut juger une preuve. Suivre n'est possible
        que si ce navigateur a aussi le journal.
      </p>

      {temoin.tete ? (
        <div className="rounded-md bg-creux px-3 py-3 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)]">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-sourd">
            Tête connue · bloc {temoin.tete.hauteur}
          </p>
          <p className="mt-1 font-mono text-[12px] text-encre">
            {court(temoin.tete.hash)}
          </p>
          <p className="mt-1 font-mono text-[11px] text-sourd">
            merkle · {court(temoin.tete.merkle)}
          </p>
        </div>
      ) : (
        <p className="font-mono text-sm text-sourd">
          Aucune tête. Importer, ou suivre le journal s'il est ici.
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Button type="button" variant="or" className="w-auto" onClick={() => suivre()}>
          Suivre la tête
        </Button>
        <Button type="button" variant="discret" className="w-auto" onClick={() => oublier()}>
          Oublier
        </Button>
      </div>

      {flash ? (
        <p className="mt-3 font-mono text-[12.5px] leading-relaxed text-cuivre">{flash}</p>
      ) : null}

      <div className="mt-4 border-t border-trait pt-4">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.12em] text-sourd">
          Importer une tête
        </p>
        <textarea
          value={teteRaw}
          onChange={(e) => setTeteRaw(e.target.value)}
          spellCheck={false}
          rows={3}
          placeholder='{"v":1,"hauteur":1,"hash":"…","merkle":"…","prev":"…"}'
          className="w-full resize-y rounded-sm bg-creux px-3 py-2 font-mono text-[11px] text-encre shadow-[0_0_0_1px_rgb(198_203_209_/_0.16)] placeholder:text-sourd/70"
        />
        <Button
          type="button"
          variant="discret"
          className="mt-2 w-auto"
          onClick={() => importerTete(teteRaw)}
        >
          Adopter
        </Button>
      </div>

      <div className="mt-4 border-t border-trait pt-4">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.12em] text-sourd">
          Juger une preuve
        </p>
        <textarea
          value={colle}
          onChange={(e) => {
            setColle(e.target.value);
            setErr(null);
          }}
          spellCheck={false}
          rows={3}
          placeholder='{"v":1,"feuille":"…","freres":[],"racine":"…"}'
          className="w-full resize-y rounded-sm bg-creux px-3 py-2 font-mono text-[11px] text-encre shadow-[0_0_0_1px_rgb(198_203_209_/_0.16)] placeholder:text-sourd/70"
        />
        <Button type="button" variant="discret" className="mt-2 w-auto" onClick={coller}>
          Juger
        </Button>
        {err ? <p className="mt-2 font-mono text-[12.5px] text-fer">{err}</p> : null}
      </div>

      {temoin.vues.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-2">
          {temoin.vues.map((v, i) => (
            <li
              key={v.at + i}
              className={cn(
                "rounded-md bg-creux px-3 py-2 font-mono text-[12px] shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)]",
                v.code === "incluse" ? "text-cuivre" : "text-fer",
              )}
            >
              {v.detail}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
