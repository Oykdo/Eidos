import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Nav } from "@/components/Nav";
import { Mark } from "@/components/Mark";
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
    <main className="mx-auto min-h-dvh w-full max-w-[560px] px-[18px] pt-[max(20px,env(safe-area-inset-top))] pb-[calc(32px+env(safe-area-inset-bottom))]">
      <header className="relative px-1 pb-7 pt-5 text-center">
        <div className="mb-3 flex justify-center">
          <Mark size={36} />
        </div>
        <h1 className="font-display text-[30px] font-light tracking-[0.42em] text-encre uppercase">
          Eidos
        </h1>
        <p className="mt-2 font-mono text-xs text-sourd">Guide — réseau d'essai</p>
        <div className="mt-4">
          <Nav actuel="guide" />
        </div>
      </header>

      <div className="flex flex-col gap-4">
        <section className="rounded-lg bg-carte px-5 py-6 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)]">
          <h2 className="font-display text-[26px] font-light text-or">Comment lire</h2>
          <p className="mt-3 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">
            Deux faces. Le coffre dépense. L'arbre situe. Ils partagent les
            sorties, pas le consensus : une adresse est posée sur un nœud par
            hachage, ce n'est pas un Merkle d'émission.
          </p>
        </section>

        <Etape n="01" titre="Genèse">
          <p>
            Sur le coffre, lancer la genèse. Dix-neuf contrôles rejouent le
            fichier gelé (émission, Merkle, bloc 0, glyphes), puis les tests du
            portefeuille. Rien ne se croit.
          </p>
          <Button asChild variant="discret">
            <Link to="/">Ouvrir le coffre</Link>
          </Button>
        </Etape>

        <Etape n="02" titre="Les deux trous">
          <p>
            Atelier Mixte, puis les montants. Le glouton prend au plus trois
            sorties, les plus petites qui atteignent. Un rendu sous 10 000 atomes
            n'est pas créé : l'écart devient frais. Si le solde suffit mais trois
            pièces ne couvrent pas : « solde suffisant mais fragmenté — regrouper
            d'abord ».
          </p>
          <ul className="flex flex-col gap-1.5 text-encre">
            <li>0,50 — deux ou trois petites</li>
            <li>Poussière — 1,00 sur une pièce à 1,000090</li>
            <li>4,00 — fragmenté, puis regrouper</li>
          </ul>
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

        <Etape n="03" titre="Clés Lamport">
          <p>
            Une clé signe une fois. Deux signatures sur la même clé révèlent
            assez de moitiés du secret pour forger. Le panneau Clés rejoue
            l'attaque. L'atelier a une graine publique : démonstration, pas un
            coffre. « Coffre personnel » tire 256 bits dans le navigateur.
          </p>
        </Etape>

        <Etape n="04" titre="Le pont coffre → arbre">
          <p>
            Chaque sortie a une adresse de 20 octets. On en fait un entier (FNV),
            modulo 425 nœuds. Même adresse, même nœud, toujours. Ce n'est pas une
            signature, pas un Merkle, pas la fédération.
          </p>
          <p>
            Dépenser consomme les clés et en crée d'autres : le rendu naît sur
            une adresse neuve, donc souvent un autre nœud. Les sphères d'or sur
            l'arbre sont les sorties actuelles. Dans le carnet, chaque ligne
            porte son palier (D0–D9) et son secteur. Toucher le libellé ouvre
            l'arbre sur ce nœud.
          </p>
          <Button asChild variant="discret">
            <Link to="/arbre">Voir l'arbre</Link>
          </Button>
        </Etape>

        <Etape n="05" titre="Lire l'arbre">
          <p>
            Épine des vingt premiers. Dix paliers de descendance. Trente-trois
            secteurs, onze familles. Tourner, toucher un disque, un premier, un
            nœud.
          </p>
          <p>
            ∇ Φ pointe vers le parent. ∇·v : sources en D0, puits en D9, somme
            nulle. ∇×v = 0 (forêt, pas de cycle). ∇²Φ mesure le branchement.
          </p>
          <p>
            Puits : même graphe, D0 au fond. Les anneaux horizon et 3/2 r_s sont
            une comparaison — ce n'est pas 2GM/c². Axiale : anneaux et axe,
            comme un détecteur, pas une collision.
          </p>
        </Etape>

        <Etape n="06" titre="Ce que ce n'est pas">
          <p>
            Pas de nœud réseau, pas de fédération réelle, pas de monnaie. Le
            carnet vit dans ce navigateur. Le validateur n'a pas été modifié :
            un atome de rendu reste légal. C'est le portefeuille qui refuse d'en
            créer un.
          </p>
        </Etape>
      </div>
    </main>
  );
}
