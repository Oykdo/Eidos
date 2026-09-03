import { fromHex } from "./hash.ts";
import { encoderAdresse } from "./glyphs.ts";
import { adresseDe } from "./lamport.ts";
import type { Coffre } from "./types.ts";

export const ROBINET_ISSUE =
  "https://github.com/Oykdo/Eidos/issues/new";

export type DemandeRobinet = {
  hexa: string;
  symboles: string;
  url: string;
};

export function adresseRobinet(coffre: Coffre): string {
  return adresseDe(coffre.maitre, coffre.n);
}

export function demanderAuReseau(coffre: Coffre): DemandeRobinet | { refus: string } {
  if (coffre.nature === "atelier") {
    return {
      refus:
        "Graine d'atelier publique — le réseau verserait toujours à la même adresse. Passez en coffre personnel.",
    };
  }
  const hexa = adresseRobinet(coffre);
  const symboles = encoderAdresse(fromHex(hexa));
  const corps =
    "Demande au robinet du reseau d'essai.\n\nAdresse :\n\n" +
    symboles +
    "\n\n(Envoye depuis le portefeuille Eidos. Ne modifiez pas les symboles.)";
  const url =
    ROBINET_ISSUE +
    "?title=" +
    encodeURIComponent("robinet") +
    "&labels=robinet" +
    "&body=" +
    encodeURIComponent(corps);
  return { hexa, symboles, url };
}
