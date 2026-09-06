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
  const corps = corpsDemande(symboles);
  const url =
    ROBINET_ISSUE +
    "?title=" +
    encodeURIComponent("robinet") +
    "&labels=robinet" +
    "&body=" +
    encodeURIComponent(corps);
  return { hexa, symboles, url };
}

/** Le corps d'une demande, identique sur tous les canaux : robinet.py ne
 *  retient que les 31 glyphes et leur somme de contrôle. */
export function corpsDemande(symboles: string): string {
  return (
    "Demande au robinet du reseau d'essai.\n\nAdresse :\n\n" +
    symboles +
    "\n\n(Envoye depuis le portefeuille Eidos. Ne modifiez pas les symboles.)"
  );
}

const BOITE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Second canal : un courriel prérempli vers la boîte que le nœud publie
 *  (etat.json.robinet_canaux.courriel), sujet « robinet », mêmes glyphes.
 *  Aucun compte GitHub ; le frein par auteur porte sur l'expéditeur. */
export function courrielDemande(coffre: Coffre, boite: string): DemandeRobinet | { refus: string } {
  if (coffre.nature === "atelier") {
    return {
      refus:
        "Graine d'atelier publique — le réseau verserait toujours à la même adresse. Passez en coffre personnel.",
    };
  }
  if (typeof boite !== "string" || boite.length > 254 || !BOITE.test(boite)) {
    return { refus: "Aucune boîte aux lettres publiée par le réseau." };
  }
  const hexa = adresseRobinet(coffre);
  const symboles = encoderAdresse(fromHex(hexa));
  const url =
    "mailto:" +
    encodeURIComponent(boite).replace("%40", "@") +
    "?subject=" +
    encodeURIComponent("robinet") +
    "&body=" +
    encodeURIComponent(corpsDemande(symboles));
  return { hexa, symboles, url };
}
