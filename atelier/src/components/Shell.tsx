import type { ReactNode } from "react";
import { Mark } from "@/components/Mark";
import { Nav, type NavId } from "@/components/Nav";

export function Shell({
  actuel,
  sous,
  children,
}: {
  actuel: NavId;
  sous?: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-[560px] px-[18px] pt-[max(20px,env(safe-area-inset-top))] pb-[calc(32px+env(safe-area-inset-bottom))]">
      <header className="relative px-1 pb-7 pt-5 text-center">
        <div className="mb-3 flex justify-center">
          <Mark size={36} />
        </div>
        <h1 className="font-display text-[30px] font-light tracking-[0.42em] text-encre uppercase">
          Eidos
        </h1>
        {sous ? (
          <p className="mt-2 font-mono text-xs text-sourd">{sous}</p>
        ) : null}
        <div className="mt-4">
          <Nav actuel={actuel} />
        </div>
      </header>
      <div className="flex flex-col gap-4">{children}</div>
    </main>
  );
}
