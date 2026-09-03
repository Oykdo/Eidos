import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { useCoffre } from "@/lib/store.ts";
import { useI18n } from "@/lib/i18n.ts";

function Etape({ n, titre, children }: { n: string; titre: string; children: ReactNode }) {
  return (
    <section className="rounded-lg bg-carte p-5 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)] sm:p-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-or">{n}</p>
      <h2 className="mt-1 font-mono text-base font-normal text-encre">{titre}</h2>
      <div className="mt-3 flex flex-col gap-3 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">
        {children}
      </div>
    </section>
  );
}

export function Guide() {
  const { t } = useI18n();
  const creer = useCoffre((s) => s.creer);
  const navigate = useNavigate();

  return (
    <Shell actuel="guide">
      <section className="rounded-lg bg-carte px-5 py-6 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)]">
        <h2 className="font-display text-[26px] font-light text-or">{t("guide.h")}</h2>
        <p className="mt-3 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">
          {t("guide.lede")}
        </p>
      </section>

      <Etape n="01" titre={t("guide.01")}>
        <p>{t("guide.01p")}</p>
        <Button
          type="button"
          variant="or"
          onClick={() => {
            creer();
            void navigate({ to: "/" });
          }}
        >
          {t("creer.bouton")}
        </Button>
      </Etape>

      <Etape n="02" titre={t("guide.02")}>
        <p>{t("guide.02p")}</p>
        <Button asChild variant="discret">
          <Link to="/journal">{t("nav.journal")}</Link>
        </Button>
      </Etape>

      <Etape n="03" titre={t("guide.03")}>
        <p>{t("guide.03p")}</p>
        <Button asChild variant="discret">
          <Link to="/temoin">{t("nav.temoin")}</Link>
        </Button>
      </Etape>

      <Etape n="04" titre={t("guide.04")}>
        <p>{t("guide.04p")}</p>
        <Button asChild variant="discret">
          <Link to="/arbre">{t("guide.04b")}</Link>
        </Button>
      </Etape>

      <Etape n="05" titre={t("guide.05")}>
        <p>{t("guide.05p")}</p>
        <Button asChild variant="discret">
          <Link to="/reliques">{t("guide.05b")}</Link>
        </Button>
      </Etape>

      <Etape n="06" titre={t("guide.06")}>
        <p>{t("guide.06p")}</p>
        <Button asChild variant="discret">
          <Link to="/glyphes">{t("guide.06b")}</Link>
        </Button>
      </Etape>

      <Etape n="07" titre={t("guide.07")}>
        <p>{t("guide.07p")}</p>
        <Button asChild variant="discret">
          <Link to="/signatures">{t("guide.07b")}</Link>
        </Button>
      </Etape>

      <Etape n="08" titre={t("guide.08")}>
        <p>{t("guide.08p")}</p>
      </Etape>

      <Etape n="09" titre={t("guide.09")}>
        <p>{t("guide.09p")}</p>
      </Etape>

      <Etape n="10" titre={t("guide.10")}>
        <p>{t("guide.10p")}</p>
        <Button asChild variant="discret">
          <Link to="/tour">{t("guide.10b")}</Link>
        </Button>
      </Etape>
    </Shell>
  );
}
