#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
courriel.py — second canal du robinet : une demande par courriel.

Le robinet ne lisait que les issues GitHub : un joueur sans compte GitHub
n'avait aucune entrée. Ce module relève une boîte aux lettres par IMAP
(bibliothèque standard : imaplib, email) et passe chaque message non lu au
MÊME filtre que les issues — robinet.ajouter (adresse en 31 glyphes, somme de
contrôle) ou robinet.ajouter_envoi (transaction signée entre marqueurs). Le
frein par auteur (robinet.py, règle 4) s'applique à l'adresse d'expéditeur,
normalisée en minuscules : une demande servie par adresse de courriel et par
époque, une seule en attente.

Message accepté :
  Sujet       commence par « robinet » ou « envoi » (après décodage RFC 2047)
  Corps       la partie text/plain (le HTML est ignoré), tronquée à 65 536
              caractères, la limite d'une issue GitHub
  Expéditeur  l'adresse entre < > de From:, sans le nom affiché

Usage :
  python3 courriel.py --relever      relève les non-lus, inscrit dans la file
  python3 courriel.py --test         contrôles

Environnement de --relever : EIDOS_IMAP_HOTE, EIDOS_IMAP_UTILISATEUR,
EIDOS_IMAP_MOT_DE_PASSE (secrets du dépôt), EIDOS_IMAP_DOSSIER (INBOX).

SÉCURITÉ. Le texte d'un courriel est écrit par n'importe qui. Il n'est jamais
interpolé dans une commande : il passe à robinet.py par l'environnement
(EIDOS_ISSUE_BODY), et rien n'en est retenu qui n'ait passé le filtre de
figures et la somme de contrôle. Un message est marqué lu dès qu'il est
relevé, accepté ou non : un message fautif n'est jamais relu, donc ne peut
pas faire échouer le cron à chaque heure. Au plus MAX_MESSAGES par relevé.

LIMITE. Une adresse de courriel coûte moins qu'un compte GitHub : le frein par
auteur est plus faible sur ce canal. Le nœud tranche toujours par adresse et
par budget d'époque (a·T/8), qui bornent le total versé ; seul le partage
entre demandeurs dépend du frein. Le mot de passe IMAP vit dans les secrets du
dépôt : qui contrôle les secrets contrôle la boîte, pas la chaîne. Aucune
réponse n'est envoyée : le statut se lit dans mempool.json publié.
"""

import email
import email.policy
import email.utils
import hashlib
import imaplib
import os
import re
import sys

import robinet as R

MAX_CORPS = 65_536
MAX_SUJET = 200
MAX_MESSAGES = 50
ADRESSE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def analyser(brut: bytes) -> dict:
    """Décompose un message brut (RFC 822) en auteur, titre, corps, ref.
    Rien n'est interprété : le corps est rendu tel quel, tronqué."""
    msg = email.message_from_bytes(brut, policy=email.policy.default)
    titre = str(msg.get("Subject", "") or "").strip()[:MAX_SUJET]
    auteur = email.utils.parseaddr(str(msg.get("From", "") or ""))[1].strip().lower()
    if not ADRESSE.match(auteur):
        auteur = None
    corps = ""
    try:
        partie = msg.get_body(preferencelist=("plain",))
        if partie is not None:
            corps = partie.get_content()
    except Exception:
        corps = ""
    if not isinstance(corps, str):
        corps = ""
    corps = corps[:MAX_CORPS]
    identifiant = str(msg.get("Message-ID", "") or "").strip()
    ref = hashlib.sha256(identifiant.encode("utf-8") if identifiant else brut).hexdigest()[:16]
    return {"auteur": auteur, "titre": titre, "corps": corps, "ref": ref}


def genre(titre: str):
    """« robinet » ou « envoi » selon le sujet, None sinon."""
    t = titre.strip().lower()
    if t.startswith("robinet"):
        return "robinet"
    if t.startswith("envoi"):
        return "envoi"
    return None


def inscrire(d: dict) -> int:
    """Passe le message à robinet.py par l'environnement, jamais par une
    commande. 0 inscrit ou déjà en file, 2 refusé, 3 ignoré."""
    g = genre(d["titre"])
    if g is None:
        print(f"ignoré : sujet {d['titre']!r}")
        return 3
    env = os.environ
    cles = ("EIDOS_ISSUE_BODY", "EIDOS_ISSUE_NUMBER", "EIDOS_ISSUE_AUTHOR",
            "EIDOS_ISSUE_TITLE", "EIDOS_CANAL", "EIDOS_CANAL_REF")
    anciens = {k: env.get(k) for k in cles}
    env["EIDOS_ISSUE_BODY"] = d["corps"]
    env["EIDOS_ISSUE_NUMBER"] = "0"
    env["EIDOS_ISSUE_AUTHOR"] = d["auteur"] or ""
    env["EIDOS_ISSUE_TITLE"] = d["titre"]
    env["EIDOS_CANAL"] = "courriel"
    env["EIDOS_CANAL_REF"] = d["ref"]
    try:
        if g == "envoi":
            R.ajouter_envoi()
        else:
            R.ajouter()
        return 0
    except ValueError as e:
        print(f"REFUS : {e}")
        return 2
    except SystemExit as e:
        return int(e.code) if isinstance(e.code, int) else 2
    finally:
        for k, v in anciens.items():
            if v is None:
                env.pop(k, None)
            else:
                env[k] = v


def relever() -> int:
    hote = os.environ.get("EIDOS_IMAP_HOTE", "").strip()
    utilisateur = os.environ.get("EIDOS_IMAP_UTILISATEUR", "").strip()
    mot_de_passe = os.environ.get("EIDOS_IMAP_MOT_DE_PASSE", "")
    dossier = os.environ.get("EIDOS_IMAP_DOSSIER", "INBOX").strip() or "INBOX"
    if not (hote and utilisateur and mot_de_passe):
        raise SystemExit("IMAP non configuré : EIDOS_IMAP_HOTE, "
                         "EIDOS_IMAP_UTILISATEUR, EIDOS_IMAP_MOT_DE_PASSE")
    inscrits = 0
    with imaplib.IMAP4_SSL(hote) as boite:
        boite.login(utilisateur, mot_de_passe)
        boite.select(dossier)
        typ, donnees = boite.search(None, "UNSEEN")
        if typ != "OK":
            raise SystemExit(f"IMAP : recherche refusée ({typ})")
        numeros = donnees[0].split()
        if len(numeros) > MAX_MESSAGES:
            print(f"{len(numeros)} non-lus, {MAX_MESSAGES} relevés (garde-fou)")
        for n in numeros[:MAX_MESSAGES]:
            typ, parties = boite.fetch(n, "(RFC822)")   # marque \Seen
            brut = next((p[1] for p in parties if isinstance(p, tuple)), None)
            if typ != "OK" or not isinstance(brut, (bytes, bytearray)):
                print(f"message {n.decode()} illisible, ignoré")
                continue
            d = analyser(bytes(brut))
            qui = d["auteur"] or "sans expéditeur"
            print(f"message {n.decode()} · {d['ref']} · {qui} · {d['titre'][:40]!r}")
            if inscrire(d) == 0:
                inscrits += 1
    print(f"{inscrits} demande(s) inscrite(s)")
    return inscrits


# --------------------------------------------------------------------------
def _encoder_glyphes(a20: bytes) -> str:
    """Encodeur de test : 27 glyphes de charge (160 bits + 2 de bourrage nul)
    et 4 de contrôle, 3 figures par glyphe. Miroir exact de robinet.decoder."""
    ctrl = R.sha(R.sha(a20))[:3]
    bits = "".join(format(b, "08b") for b in a20) + "00"
    bits += "".join(format(b, "08b") for b in ctrl)
    codes = [int(bits[i:i + 6], 2) for i in range(0, len(bits), 6)]
    assert len(codes) == 31
    return " ".join(R.FIGURES[c >> 4] + R.FIGURES[(c >> 2) & 3] + R.FIGURES[c & 3]
                    for c in codes)


def _tests():
    import base64
    import json
    import tempfile
    from email.message import EmailMessage

    a20 = hashlib.sha256(b"courriel-test-1").digest()[:20]
    glyphes = _encoder_glyphes(a20)
    assert R.decoder(glyphes) == a20

    # 1. multipart/alternative : la partie text/plain (quoted-printable) est
    #    retenue, le HTML ignoré ; sujet RFC 2047 décodé ; expéditeur normalisé
    m = EmailMessage()
    m["From"] = "Alice Dupont <Alice@Example.org>"
    m["To"] = "robinet@example.org"
    m["Subject"] = "=?utf-8?b?cm9iaW5ldCDDoCBFaWRvcw==?="        # « robinet à Eidos »
    m["Message-ID"] = "<abc-1@example.org>"
    m.set_content("Bonjour,\n\nAdresse :\n\n" + glyphes + "\n\n-- Alice", cte="quoted-printable")
    m.add_alternative("<p>Bonjour</p><p>" + glyphes + "</p>", subtype="html")
    d = analyser(bytes(m))
    assert d["auteur"] == "alice@example.org", d["auteur"]
    assert d["titre"] == "robinet à Eidos", d["titre"]
    assert genre(d["titre"]) == "robinet"
    assert R.extraire(d["corps"]) == a20
    assert d["ref"] == hashlib.sha256(b"<abc-1@example.org>").hexdigest()[:16]
    print("ok : multipart, RFC 2047, expéditeur normalisé, glyphes retrouvés")

    # 2. corps en base64, sujet « envoi » ; expéditeur sans arobase → None
    m2 = EmailMessage()
    m2["From"] = "quelqu'un"
    m2["Subject"] = "Envoi depuis mon coffre"
    m2.set_content("x" * 10, cte="base64")
    d2 = analyser(bytes(m2))
    assert d2["auteur"] is None and genre(d2["titre"]) == "envoi"
    assert d2["corps"].startswith("xxxxxxxxxx")
    assert genre("bonjour") is None
    # sans Message-ID, la référence est celle des octets du message
    assert d2["ref"] == hashlib.sha256(bytes(m2)).hexdigest()[:16]
    print("ok : base64, envoi, expéditeur invalide, référence sans Message-ID")

    # 3. corps tronqué à la limite d'une issue
    m3 = EmailMessage()
    m3["From"] = "b@example.org"
    m3["Subject"] = "robinet"
    m3.set_content("y" * (MAX_CORPS + 5000))
    assert len(analyser(bytes(m3))["corps"]) == MAX_CORPS
    print("ok : corps tronqué à", MAX_CORPS)

    # 4. inscription par l'environnement, dans une file temporaire : canal et
    #    référence notés, même message deux fois = une seule entrée, frein par
    #    expéditeur, second expéditeur servi, sujet inconnu ignoré
    with tempfile.TemporaryDirectory() as tmp:
        mempool, etat = R.MEMPOOL, R.ETAT
        R.MEMPOOL = os.path.join(tmp, "mempool.json")
        R.ETAT = os.path.join(tmp, "etat.json")          # absent : le nœud tranchera
        try:
            assert inscrire(d) == 0
            f = json.load(open(R.MEMPOOL, encoding="utf-8"))
            assert len(f["demandes"]) == 1
            e = f["demandes"][0]
            assert e["adresse"] == a20.hex() and e["auteur"] == "alice@example.org"
            assert e["canal"] == "courriel" and e["ref"] == d["ref"] and e["issue"] == 0
            assert inscrire(d) == 0                              # même référence : ignoré
            assert len(json.load(open(R.MEMPOOL, encoding="utf-8"))["demandes"]) == 1
            b20 = hashlib.sha256(b"courriel-test-2").digest()[:20]
            d_bis = dict(d, corps="Adresse :\n" + _encoder_glyphes(b20), ref="f" * 16)
            assert inscrire(d_bis) == 2                          # alice a déjà une demande en attente
            d_ter = dict(d_bis, auteur="carol@example.org", ref="e" * 16)
            assert inscrire(d_ter) == 0
            assert len(json.load(open(R.MEMPOOL, encoding="utf-8"))["demandes"]) == 2
            assert inscrire(dict(d2, titre="bonjour")) == 3      # sujet inconnu : ignoré
            print("ok : file temporaire — canal, référence, doublon, frein, sujet inconnu")

            # 5. un envoi par courriel : transaction entre marqueurs, inscrite telle quelle
            brut = bytes(range(256)) * 2
            b64 = base64.b64encode(brut).decode()
            corps = (R.DEBUT + "\n" + "\n".join(b64[i:i + 76] for i in range(0, len(b64), 76))
                     + "\n" + R.FIN + "\n")
            assert inscrire({"auteur": "dave@example.org", "titre": "envoi",
                             "corps": corps, "ref": "d" * 16}) == 0
            f = json.load(open(R.MEMPOOL, encoding="utf-8"))
            assert f["demandes"][-1]["type"] == "envoi" and f["demandes"][-1]["canal"] == "courriel"
            assert base64.b64decode(f["demandes"][-1]["donnees"]) == brut
            print("ok : envoi par courriel inscrit tel quel")

            # 6. le sujet décide du genre, pas le corps : des glyphes sous « envoi » sont refusés
            assert inscrire({"auteur": "erin@example.org", "titre": "envoi",
                             "corps": glyphes, "ref": "c" * 16}) == 2
            assert "EIDOS_CANAL" not in os.environ          # l'environnement est rendu
        finally:
            R.MEMPOOL, R.ETAT = mempool, etat
    print("ok : 6 controles courriel")


if __name__ == "__main__":
    if "--test" in sys.argv:
        _tests()
    elif "--relever" in sys.argv:
        relever()
    else:
        print(__doc__.strip().split("Usage :")[1].split("Environnement")[0].strip())
