import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n.ts";
import { useCoffre } from "@/lib/store.ts";
import { ETAT_URL } from "@/lib/eidos/envoi.ts";
import {
  parserRelique,
  preparerRecuperation,
  statutRelique,
  type Recuperation,
  type ReliqueLue,
  type StatutRelique,
} from "@/lib/eidos/relique-qr.ts";
import { adresseRobinet } from "@/lib/eidos/robinet.ts";
import { encoderAdresse } from "@/lib/eidos/glyphs.ts";
import { fromHex } from "@/lib/eidos/hash.ts";

type Detecteur = { detect(source: ImageBitmapSource): Promise<{ rawValue: string }[]> };
type FenetreScanner = Window & {
  BarcodeDetector?: new (o?: { formats: string[] }) => Detecteur;
};

function court(h: string): string {
  return `${h.slice(0, 8)}…${h.slice(-4)}`;
}

/** Relique trouvée : lire le QR (caméra, collage ou fragment d'URL), lire
 *  l'état publié, dépenser la pièce vers son coffre. Rien n'est envoyé au
 *  réseau depuis ici : l'issue « envoi » se poste à la main. */
export function ReliqueTrouvee() {
  const { t } = useI18n();
  const coffre = useCoffre((s) => s.coffre);
  const [texte, setTexte] = useState("");
  const [lue, setLue] = useState<ReliqueLue | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [statut, setStatut] = useState<StatutRelique | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [recup, setRecup] = useState<Recuperation | null>(null);
  const [scan, setScan] = useState(false);
  const [scanPossible, setScanPossible] = useState(false);
  const video = useRef<HTMLVideoElement | null>(null);
  const flux = useRef<MediaStream | null>(null);

  useEffect(() => {
    setScanPossible(typeof (window as FenetreScanner).BarcodeDetector === "function");
    const h = window.location.hash;
    if (h.includes("r=")) {
      setTexte(h);
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  function arreterScan() {
    flux.current?.getTracks().forEach((tr) => tr.stop());
    flux.current = null;
    setScan(false);
  }

  useEffect(() => arreterScan, []);

  async function lancerScan() {
    const Ctor = (window as FenetreScanner).BarcodeDetector;
    if (!Ctor || !navigator.mediaDevices?.getUserMedia) return;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      flux.current = s;
      setScan(true);
      await new Promise((r) => setTimeout(r, 50));
      if (video.current) {
        video.current.srcObject = s;
        await video.current.play();
      }
      const det = new Ctor({ formats: ["qr_code"] });
      const boucle = async () => {
        if (!flux.current || !video.current) return;
        try {
          const codes = await det.detect(video.current);
          const hit = codes.find((c) => parserRelique(c.rawValue) && !("erreur" in parserRelique(c.rawValue)));
          if (hit) {
            setTexte(hit.rawValue);
            arreterScan();
            return;
          }
        } catch {
          // image pas encore prête : on réessaie
        }
        setTimeout(() => void boucle(), 250);
      };
      void boucle();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
      arreterScan();
    }
  }

  async function lire() {
    setErreur(null);
    setRecup(null);
    setStatut(null);
    const r = parserRelique(texte);
    if ("erreur" in r) {
      setLue(null);
      setErreur(r.erreur);
      return;
    }
    setLue(r);
    setOccupe(true);
    try {
      const rep = await fetch(ETAT_URL, { cache: "no-store" });
      if (!rep.ok) throw new Error(`etat.json ${rep.status}`);
      setStatut(statutRelique(await rep.json(), r.adresse));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setOccupe(false);
    }
  }

  function recuperer() {
    if (!lue || !statut || statut.etat !== "intacte") return;
    const dest = adresseRobinet(coffre);
    const r = preparerRecuperation(lue.graine, statut.sortie, dest);
    if ("erreur" in r) {
      setErreur(r.erreur);
      return;
    }
    setRecup(r);
  }

  const etiquette = statut
    ? statut.etat === "intacte"
      ? t("relique.qr.intacte", { m: (statut.sortie.montant / 1e8).toFixed(6) })
      : statut.etat === "recuperee"
        ? t("relique.qr.recuperee", { b: statut.entree.bloc ?? "?", v: court(statut.entree.vers ?? "") })
        : statut.etat === "attente"
          ? t("relique.qr.attente")
          : t("relique.qr.horsListe")
    : null;

  return (
    <section className="rounded-lg bg-carte p-4 shadow-[0_0_0_1px_rgb(198_203_209_/_0.14)]">
      <h2 className="font-mono text-base font-normal text-encre">{t("relique.qr.titre")}</h2>
      <p className="mt-1 font-mono text-[12px] leading-relaxed text-sourd text-pretty">
        {t("relique.qr.lede")}
      </p>

      {scan ? (
        <div className="mt-3">
          <video ref={video} muted playsInline className="w-full rounded-sm bg-creux" />
          <Button type="button" variant="discret" className="mt-2 w-auto" onClick={arreterScan}>
            {t("relique.qr.arreter")}
          </Button>
        </div>
      ) : null}

      <textarea
        value={texte}
        onChange={(e) => {
          setTexte(e.target.value);
          setErreur(null);
        }}
        rows={2}
        spellCheck={false}
        placeholder={t("relique.qr.placeholder")}
        className="mt-3 w-full rounded-sm bg-creux p-3 font-mono text-[11px] text-encre shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)]"
      />
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Button type="button" variant="or" className="w-auto" disabled={occupe || !texte.trim()} onClick={() => void lire()}>
          {occupe ? "…" : t("relique.qr.lire")}
        </Button>
        {scanPossible && !scan ? (
          <Button type="button" variant="discret" className="w-auto" onClick={() => void lancerScan()}>
            {t("relique.qr.scanner")}
          </Button>
        ) : null}
      </div>
      {erreur ? <p className="mt-2 font-mono text-[12.5px] text-fer">{erreur}</p> : null}

      {lue ? (
        <div className="mt-3 rounded-md bg-creux px-3 py-3 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)]">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-sourd">
            relique {lue.id}
            {statut?.entree?.age ? ` · ${statut.entree.age}` : ""}
          </p>
          <p className="mt-1 break-all font-mono text-[11px] text-sourd">{encoderAdresse(fromHex(lue.adresse))}</p>
          {etiquette ? (
            <p className={"mt-2 font-mono text-[12.5px] " + (statut?.etat === "intacte" ? "text-cuivre" : "text-encre")}>
              {etiquette}
            </p>
          ) : null}
          {statut?.entree?.indice ? (
            <p className="mt-1 font-mono text-[12px] text-sourd">« {statut.entree.indice} »</p>
          ) : null}
          {statut?.etat === "intacte" && !recup ? (
            <div className="mt-3">
              {coffre.nature === "atelier" ? (
                <p className="mb-2 font-mono text-[12px] text-fer">{t("relique.qr.atelierPublic")}</p>
              ) : null}
              <Button type="button" variant="or" className="w-auto" onClick={recuperer}>
                {t("relique.qr.recuperer", { a: court(adresseRobinet(coffre)) })}
              </Button>
            </div>
          ) : null}
          {recup ? (
            <div className="mt-3">
              <p className="font-mono text-[12px] text-cuivre">
                {t("relique.qr.signee", { txid: court(recup.txid), o: recup.octets })}
              </p>
              <textarea
                readOnly
                value={recup.texte}
                rows={4}
                className="mt-2 w-full rounded-sm bg-fond p-2 font-mono text-[10px] text-sourd"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                <a
                  href={recup.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center rounded-sm bg-or px-3 font-mono text-[12px] text-or-fg"
                >
                  {t("relique.qr.ouvrir")}
                </a>
                <Button
                  type="button"
                  variant="discret"
                  className="w-auto"
                  onClick={() => void navigator.clipboard?.writeText(recup.texte)}
                >
                  {t("relique.qr.copier")}
                </Button>
              </div>
              <p className="mt-2 font-mono text-[11px] leading-relaxed text-sourd text-pretty">
                {t("relique.qr.apres")}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
