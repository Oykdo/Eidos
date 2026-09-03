import type { ReactNode } from "react";
import { Mark } from "@/components/Mark";
import { Nav, type NavId } from "@/components/Nav";
import { Langue } from "@/components/Langue";
import { useI18n, type Msg } from "@/lib/i18n.ts";

const SOUS: Record<NavId, Msg> = {
  coffre: "sous.coffre",
  journal: "sous.journal",
  temoin: "sous.temoin",
  arbre: "sous.arbre",
  reliques: "sous.reliques",
  glyphes: "sous.glyphes",
  guide: "sous.guide",
};

export function Shell({
  actuel,
  children,
}: {
  actuel: NavId;
  children: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <main className="mx-auto min-h-dvh w-full max-w-[560px] px-[18px] pt-[max(20px,env(safe-area-inset-top))] pb-[calc(32px+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-10 -mx-[18px] bg-fond/95 px-[18px] pt-[max(12px,env(safe-area-inset-top))] pb-4 text-center backdrop-blur-sm">
        <div className="mb-3 flex justify-center">
          <Mark size={36} />
        </div>
        <h1 className="font-display text-[30px] font-light tracking-[0.42em] text-encre uppercase">
          Eidos
        </h1>
        <p className="mt-2 font-mono text-xs text-sourd">{t(SOUS[actuel])}</p>
        <div className="mt-3">
          <Langue />
        </div>
        <div className="mt-4">
          <Nav actuel={actuel} />
        </div>
      </header>
      <div className="flex flex-col gap-4">{children}</div>
    </main>
  );
}
