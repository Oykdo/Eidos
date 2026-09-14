/**
 * Langue — ce que l'interface dit encore de travers, page par page.
 *
 * Applique la règle d'écriture (`src/lib/ecriture.ts`) à `i18n.ts` et liste
 * les manquements groupés par préfixe de clé (la page), avec la règle et la
 * raison. C'est l'outil des PR B et C du chantier « langue » : on sait quoi
 * réécrire, et le cliquet d'`i18n.test.ts` dit qu'on n'a rien laissé remonter.
 *
 * Usage : node --experimental-strip-types scripts/langue.ts [prefixe]
 *   sans argument : les comptes par page et par règle ;
 *   avec un préfixe (guide, tour, veillee…) : chaque manquement de la page.
 */

import { EN, FR } from "../src/lib/i18n.ts";
import { compteParRegle, manquementsDe, type Manquement } from "../src/lib/ecriture.ts";

const prefixe = process.argv[2];
const tous = manquementsDe(FR, EN);

function page(m: Manquement): string {
  return m.cle.split(".")[0] ?? m.cle;
}

if (prefixe === undefined) {
  const pages = new Map<string, Manquement[]>();
  for (const m of tous) {
    const p = page(m);
    pages.set(p, [...(pages.get(p) ?? []), m]);
  }
  const lignes = [...pages.entries()].sort((a, b) => b[1].length - a[1].length);
  console.log(`${tous.length} manquements sur ${Object.keys(FR).length} clés`);
  const total = compteParRegle(tous);
  console.log(
    `lexique ${total.lexique} · chapeau ${total.chapeau} · phrase ${total.phrase} · tutoiement ${total.tutoiement}`,
  );
  for (const [p, liste] of lignes) {
    const c = compteParRegle(liste);
    console.log(
      `${p.padEnd(14)} ${String(liste.length).padStart(4)}   lexique ${c.lexique}  chapeau ${c.chapeau}  phrase ${c.phrase}  tutoiement ${c.tutoiement}`,
    );
  }
} else {
  const liste = tous.filter((m) => page(m) === prefixe);
  console.log(`${liste.length} manquements sur la page « ${prefixe} »`);
  for (const m of liste) console.log(`${m.langue}  ${m.regle.padEnd(11)} ${m.cle}  ${m.raison}`);
}
