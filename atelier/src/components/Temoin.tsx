import { useState } from "react";
import { Button } from "@/components/ui/button";
import { parserPreuve } from "@/lib/eidos/merkle.ts";
import { useCoffre } from "@/lib/store.ts";
import { useI18n } from "@/lib/i18n.ts";
import { cn } from "@/lib/utils";

function court(h: string): string {
  return `${h.slice(0, 8)}…${h.slice(-4)}`;
}

export function Temoin() {
  const { t } = useI18n();
  const temoin = useCoffre((s) => s.temoin);
  const flash = useCoffre((s) => s.temoinFlash);
  const suivre = useCoffre((s) => s.suivreTete);
  const soumettre = useCoffre((s) => s.soumettrePreuve);
  const importerTete = useCoffre((s) => s.importerTete);
  const oublier = useCoffre((s) => s.oublierTemoin);
  const reseau = useCoffre((s) => s.reseau);
  const reseauOccupe = useCoffre((s) => s.reseauOccupe);
  const suivreReseau = useCoffre((s) => s.suivreReseau);
  const jugerReseau = useCoffre((s) => s.jugerReseau);
  const coffre = useCoffre((s) => s.coffre);
  const [refReseau, setRefReseau] = useState("");
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
      <h2 className="font-mono text-base font-normal text-encre">{t("temoin.titre")}</h2>
      <p className="mb-4 mt-1 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">
        {t("temoin.lede")}
      </p>

      {temoin.tete ? (
        <div className="rounded-md bg-creux px-3 py-3 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)]">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-sourd">
            {t("temoin.tete", { h: temoin.tete.hauteur })}
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
          {t("temoin.vide")}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Button type="button" variant="or" className="w-auto" onClick={() => suivre()}>
          {t("temoin.suivre")}
        </Button>
        <Button type="button" variant="discret" className="w-auto" onClick={() => oublier()}>
          {t("temoin.oublier")}
        </Button>
      </div>

      {flash ? (
        <p className="mt-3 font-mono text-[12.5px] leading-relaxed text-cuivre">{flash}</p>
      ) : null}

      <div className="mt-4 border-t border-trait pt-4">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.12em] text-sourd">
          {t("temoin.reseau")}
        </p>
        <p className="mb-2 font-mono text-[12px] leading-relaxed text-sourd text-pretty">
          {t("temoin.reseau.lede")}
        </p>
        {reseau ? (
          <div className="rounded-md bg-creux px-3 py-3 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)]">
            <p className={cn("font-mono text-[12px]", reseau.verdict.ok ? "text-cuivre" : "text-fer")}>
              {reseau.verdict.ok
                ? t("temoin.reseau.verifiee", { h: reseau.tete.hauteur, v: reseau.verdict.validateur })
                : t("temoin.reseau.refusee", { h: reseau.tete.hauteur, m: reseau.verdict.motif })}
            </p>
            <p className="mt-1 font-mono text-[11px] text-sourd">
              id_bloc · {court(reseau.tete.idBloc)} · utxo_root · {court(reseau.tete.utxoRoot)} ·{" "}
              {reseau.sorties.length} {t("temoin.reseau.sorties")}
            </p>
          </div>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Button
            type="button"
            variant="or"
            className="w-auto"
            disabled={reseauOccupe}
            onClick={() => void suivreReseau()}
          >
            {reseauOccupe ? "…" : t("temoin.reseau.suivre")}
          </Button>
        </div>
        {reseau && reseau.verdict.ok ? (
          <div className="mt-3">
            <select
              value={refReseau}
              onChange={(e) => setRefReseau(e.target.value)}
              className="w-full rounded-sm bg-creux px-3 py-2 font-mono text-[11px] text-encre shadow-[0_0_0_1px_rgb(198_203_209_/_0.16)]"
            >
              <option value="">{t("temoin.reseau.choisir")}</option>
              {coffre.sorties
                .filter((s) => reseau.sorties.some((r) => `${r.txid}:${r.rang}` === s.ref))
                .map((s) => (
                  <option key={s.ref} value={s.ref}>
                    {court(s.txid)}:{s.rang} · {s.montant} atomes
                  </option>
                ))}
              {reseau.sorties.slice(0, 32).map((s) => (
                <option key={`r-${s.txid}:${s.rang}`} value={`${s.txid}:${s.rang}`}>
                  {court(s.txid)}:{s.rang} · {court(s.adresse)}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="discret"
              className="mt-2 w-auto"
              disabled={!refReseau}
              onClick={() => jugerReseau(refReseau)}
            >
              {t("temoin.reseau.juger")}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="mt-4 border-t border-trait pt-4">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.12em] text-sourd">
          {t("temoin.importer")}
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
