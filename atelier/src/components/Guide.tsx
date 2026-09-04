import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { useCoffre } from "@/lib/store.ts";
import { useI18n, type Msg } from "@/lib/i18n.ts";

type Chemin = "/" | "/journal" | "/temoin" | "/glyphes" | "/arbre" | "/signatures" | "/tour" | "/reliques";

function Registre({ n, titre, lede, children }: { n: string; titre: string; lede: string; children: ReactNode }) {
  return (
    <section className="rounded-lg bg-carte p-5 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)] sm:p-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-or">{n}</p>
      <h2 className="mt-1 font-mono text-base font-normal text-encre">{titre}</h2>
      <p className="mt-2 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">{lede}</p>
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Page({ titre, texte, to, bouton }: { titre: string; texte: string; to?: Chemin; bouton?: string }) {
  return (
    <div className="border-t border-trait pt-3">
      <h3 className="font-mono text-[13px] text-encre">{titre}</h3>
      <p className="mt-1 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">{texte}</p>
      {to && bouton ? (
        <Button asChild variant="discret" className="mt-2 w-auto">
          <Link to={to}>{bouton}</Link>
        </Button>
      ) : null}
    </div>
  );
}

const MOTS: Msg[] = ["guide.mot.piece", "guide.mot.artefact", "guide.mot.relique", "guide.mot.sceau", "guide.mot.objet"];

export function Guide() {
  const { t } = useI18n();
  const creer = useCoffre((s) => s.creer);
  const navigate = useNavigate();

  return (
    <Shell actuel="guide">
      <section className="rounded-lg bg-carte px-5 py-6 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)]">
        <h2 className="font-display text-[26px] font-light text-or">{t("guide.h")}</h2>
        <p className="mt-3 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">{t("guide.lede")}</p>
        <Button
          type="button"
          variant="or"
          className="mt-4 w-auto"
          onClick={() => {
            creer();
            void navigate({ to: "/" });
          }}
        >
          {t("creer.bouton")}
        </Button>
      </section>

      <Registre n="01" titre={t("nav.groupe.verifier")} lede={t("guide.verifier")}>
        <Page titre={t("nav.coffre")} texte={t("guide.01p")} to="/" bouton={t("nav.coffre")} />
        <Page titre={t("nav.journal")} texte={t("guide.02p")} to="/journal" bouton={t("nav.journal")} />
        <Page titre={t("nav.temoin")} texte={t("guide.03p")} to="/temoin" bouton={t("nav.temoin")} />
        <Page titre={t("nav.glyphes")} texte={t("guide.06p")} to="/glyphes" bouton={t("guide.06b")} />
      </Registre>

      <Registre n="02" titre={t("nav.groupe.lire")} lede={t("guide.lire")}>
        <Page titre={t("nav.arbre")} texte={t("guide.04p")} to="/arbre" bouton={t("guide.04b")} />
        <Page titre={t("nav.signatures")} texte={t("guide.07p")} to="/signatures" bouton={t("guide.07b")} />
      </Registre>

      <Registre n="03" titre={t("nav.groupe.jouer")} lede={t("guide.jouer")}>
        <Page titre={t("nav.reliques")} texte={t("guide.05p")} to="/reliques" bouton={t("guide.05b")} />
        <Page titre={t("nav.tour")} texte={t("guide.10p")} to="/tour" bouton={t("guide.10b")} />
        <Page titre={t("guide.09")} texte={t("guide.09p")} />
      </Registre>

      <section className="rounded-lg bg-carte p-5 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)] sm:p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-or">04</p>
        <h2 className="mt-1 font-mono text-base font-normal text-encre">{t("guide.mots")}</h2>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 font-mono text-[12.5px] leading-relaxed">
          {MOTS.map((k) => {
            const [mot, sens] = t(k).split(" — ");
            return (
              <div key={k} className="contents">
                <dt className="text-encre">{mot}</dt>
                <dd className="text-sourd text-pretty">{sens}</dd>
              </div>
            );
          })}
        </dl>
      </section>

      <section className="rounded-lg bg-carte p-5 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)] sm:p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-or">05</p>
        <h2 className="mt-1 font-mono text-base font-normal text-encre">{t("guide.08")}</h2>
        <p className="mt-2 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">{t("guide.08p")}</p>
      </section>
    </Shell>
  );
}
