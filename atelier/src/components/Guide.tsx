import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { useCoffre } from "@/lib/store.ts";

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
  const charger = useCoffre((s) => s.charger);
  const navigate = useNavigate();

  return (
    <Shell actuel="guide" sous="Guide — réseau d'essai">
      <section className="rounded-lg bg-carte px-5 py-6 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)]">
        <h2 className="font-display text-[26px] font-light text-or">Comment lire</h2>
        <p className="mt-3 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">
          Coffre : dépenser. Journal : genèse, chaîne, preuve. Témoin : une
          tête, sans les clés — y compris sur un autre appareil si on lui
          passe la tête. Arbre : une carte, pas un Merkle.
        </p>
      </section>

      <Etape n="01" titre="Coffre">
        <p>
          Mixte, puis les montants. Glouton au plus trois. Poussière sous
          10 000 atomes. Fragmenté : regrouper d'abord.
        </p>
        <Button
          type="button"
          variant="or"
          onClick={() => {
            charger("mixte");
            void navigate({ to: "/" });
          }}
        >
          Charger Mixte
        </Button>
      </Etape>

      <Etape n="02" titre="Journal">
        <p>
          Lancer la genèse. Le Merkle du carnet s'ancre dans la tête de
          chaîne. Exporter la tête : JSON ou lien vers le témoin.
        </p>
        <Button asChild variant="discret">
          <Link to="/journal">Ouvrir le journal</Link>
        </Button>
      </Etape>

      <Etape n="03" titre="Témoin — autre mémoire">
        <p>
          Il n'a pas les clés. Il adopte une tête (import ou lien), puis juge
          une preuve. Si la racine n'est pas celle de sa tête : étrangère.
          Deux onglets, deux appareils : même règle.
        </p>
        <Button asChild variant="discret">
          <Link to="/temoin">Ouvrir le témoin</Link>
        </Button>
      </Etape>

      <Etape n="04" titre="Arbre">
        <p>
          Épine, dix paliers, 33 secteurs. ∇, puits, axiale : le bandeau
          Contrôles. Une punaise FNV n'est pas une preuve.
        </p>
        <Button asChild variant="discret">
          <Link to="/arbre">Voir l'arbre</Link>
        </Button>
      </Etape>

      <Etape n="05" titre="Ce que ce n'est pas">
        <p>
          Pas de nœud réseau, pas de fédération, pas de monnaie. Le témoin
          croit la tête qu'on lui donne tant qu'il ne rejoue pas le journal.
        </p>
      </Etape>
    </Shell>
  );
}
