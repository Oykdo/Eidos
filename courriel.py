#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
courriel.py — second canal du robinet : une demande par courriel.

Le robinet ne lisait que les issues GitHub : un joueur sans compte GitHub
n'avait aucune entrée. Ce module relève une boîte aux lettres par IMAP
(bibliothèque standard : imaplib, email, ssl) et passe chaque message non lu
au MÊME filtre que les issues — robinet.ajouter (adresse en 31 glyphes, somme
de contrôle) ou robinet.ajouter_envoi (transaction signée entre marqueurs).
Le frein par auteur (robinet.py, règle 4) s'applique à l'expéditeur : une
demande servie par expéditeur et par époque, une seule en attente. Un message
sans expéditeur lisible est REFUSÉ : sans auteur, pas de frein.

L'expéditeur n'est jamais publié : la file (mempool.json, versionnée) et le
journal du run ne portent que « courriel:<16 hex> », SHA-256 de l'adresse en
minuscules. Le frein compare des empreintes, pas des adresses.

Message accepté :
  Sujet       commence par « robinet » ou « envoi » (après décodage RFC 2047)
  Corps       la partie text/plain (le HTML est ignoré), tronquée à 65 536
              caractères, la limite d'une issue GitHub ; octets nuls retirés
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
pas faire échouer le cron à chaque heure ; un message qui fait lever une
exception est journalisé et sauté, la fournée continue. Les messages sont
adressés par UID, la connexion vérifie le certificat du serveur
(ssl.create_default_context) et porte un délai. Au plus MAX_MESSAGES par
relevé.

LIMITE. Une adresse de courriel coûte moins qu'un compte GitHub : le frein par
auteur est plus faible sur ce canal, et un expéditeur se forge. Le nœud
tranche toujours par adresse et par budget d'époque (a·T/8), qui bornent le
total versé ; seul le partage entre demandeurs dépend du frein. Une boîte
inondée n'arrête pas le cron : elle est relevée MAX_MESSAGES par heure, les
premiers arrivés d'abord, sans purge — les demandes honnêtes attendent. Le
mot de passe IMAP vit dans les secrets du dépôt : qui contrôle les secrets
contrôle la boîte, pas la chaîne. Aucune réponse n'est envoyée : le statut se
lit dans mempool.json publié.
"""

import email
import email.policy
import email.utils
import hashlib
import imaplib
import os
import re
import ssl
import sys

import robinet as R

MAX_CORPS = 65_536
MAX_SUJET = 200
MAX_MESSAGES = 50
DELAI_IMAP = 60                                   # secondes, par opération
ADRESSE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _sans_nul(s: str) -> str:
    """L'environnement refuse l'octet nul ; rien d'autre n'est retouché."""
    return s.replace("\x00", "")


def empreinte_expediteur(adresse: str) -> str:
    """« courriel:<16 hex> » : ce que la file et le journal retiennent."""
    return "courriel:" + hashlib.sha256(adresse.strip().lower().encode("utf-8")).hexdigest()[:16]


def analyser(brut: bytes) -> dict:
    """Décompose un message brut (RFC 822) en auteur (empreinte), titre,
    corps, ref. Rien n'est interprété : le corps est rendu tel quel, tronqué,
    sans octet nul."""
    msg = email.message_from_bytes(brut, policy=email.policy.default)
    titre = _sans_nul(str(msg.get("Subject", "") or "")).strip()[:MAX_SUJET]
    brut_de = str(msg.get("From", "") or "")
    adresse = email.utils.parseaddr(brut_de)[1].strip()
    auteur = empreinte_expediteur(adresse) if ADRESSE.match(adresse) else None
    corps = ""
    try:
        partie = msg.get_body(preferencelist=("plain",))
        if partie is not None:
            corps = partie.get_content()
    except Exception:
        corps = ""
    if not isinstance(corps, str):
        corps = ""
    corps = _sans_nul(corps)[:MAX_CORPS]
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
        print(f"ignoré : sujet {d['titre'][:40]!r}")
        return 3
    if not d.get("auteur"):
        print("REFUS : expéditeur illisible — sans auteur, pas de frein")
        return 2
    env = os.environ
    cles = ("EIDOS_ISSUE_BODY", "EIDOS_ISSUE_NUMBER", "EIDOS_ISSUE_AUTHOR",
            "EIDOS_ISSUE_TITLE", "EIDOS_CANAL", "EIDOS_CANAL_REF")
    anciens = {k: env.get(k) for k in cles}
    try:
        env["EIDOS_ISSUE_BODY"] = _sans_nul(d["corps"])
        env["EIDOS_ISSUE_NUMBER"] = "0"
        env["EIDOS_ISSUE_AUTHOR"] = d["auteur"]
        env["EIDOS_ISSUE_TITLE"] = _sans_nul(d["titre"])
        env["EIDOS_CANAL"] = "courriel"
        env["EIDOS_CANAL_REF"] = d["ref"]
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
    contexte = ssl.create_default_context()           # certificat vérifié
    with imaplib.IMAP4_SSL(hote, ssl_context=contexte, timeout=DELAI_IMAP) as boite:
        boite.login(utilisateur, mot_de_passe)
        boite.select(dossier)
        typ, donnees = boite.uid("search", None, "UNSEEN")
        if typ != "OK":
            raise SystemExit(f"IMAP : recherche refusée ({typ})")
        uids = donnees[0].split()
        if len(uids) > MAX_MESSAGES:
            print(f"{len(uids)} non-lus, {MAX_MESSAGES} relevés (garde-fou)")
        for uid in uids[:MAX_MESSAGES]:
            etiquette = uid.decode("ascii", "replace")
            try:
                typ, parties = boite.uid("fetch", uid, "(RFC822)")   # marque \Seen
                brut = next((p[1] for p in parties if isinstance(p, tuple)), None)
                if typ != "OK" or not isinstance(brut, (bytes, bytearray)):
                    print(f"message {etiquette} illisible, ignoré")
                    continue
                d = analyser(bytes(brut))
                print(f"message {etiquette} · {d['ref']} · {d['auteur'] or 'sans expéditeur'} "
                      f"· {genre(d['titre']) or 'sujet inconnu'}")
                if inscrire(d) == 0:
                    inscrits += 1
            except Exception as e:                    # un message ne tue pas la fournée
                print(f"message {etiquette} : erreur {type(e).__name__}, sauté")
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
    alice = empreinte_expediteur("alice@example.org")

    # 1. multipart/alternative : la partie text/plain (quoted-printable) est
    #    retenue, le HTML ignoré ; sujet RFC 2047 décodé ; expéditeur réduit à
    #    son empreinte, insensible à la casse ; l'adresse n'apparaît nulle part
    m = EmailMessage()
    m["From"] = "Alice Dupont <Alice@Example.org>"
    m["To"] = "robinet@example.org"
    m["Subject"] = "=?utf-8?b?cm9iaW5ldCDDoCBFaWRvcw==?="        # « robinet à Eidos »
    m["Message-ID"] = "<abc-1@example.org>"
    m.set_content("Bonjour,\n\nAdresse :\n\n" + glyphes + "\n\n-- Alice", cte="quoted-printable")
    m.add_alternative("<p>Bonjour</p><p>" + glyphes + "</p>", subtype="html")
    d = analyser(bytes(m))
    assert d["auteur"] == alice and "example.org" not in d["auteur"], d["auteur"]
    assert d["titre"] == "robinet à Eidos", d["titre"]
    assert genre(d["titre"]) == "robinet"
    assert R.extraire(d["corps"]) == a20
    assert d["ref"] == hashlib.sha256(b"<abc-1@example.org>").hexdigest()[:16]
    print("ok : multipart, RFC 2047, expéditeur en empreinte, glyphes retrouvés")

    # 2. corps en base64, sujet « envoi » ; expéditeur sans arobase → None ;
    #    sans Message-ID, la référence est celle des octets du message
    m2 = EmailMessage()
    m2["From"] = "quelqu'un"
    m2["Subject"] = "Envoi depuis mon coffre"
    m2.set_content("x" * 10, cte="base64")
    d2 = analyser(bytes(m2))
    assert d2["auteur"] is None and genre(d2["titre"]) == "envoi"
    assert d2["corps"].startswith("xxxxxxxxxx")
    assert genre("bonjour") is None
    assert d2["ref"] == hashlib.sha256(bytes(m2)).hexdigest()[:16]
    print("ok : base64, envoi, expéditeur invalide, référence sans Message-ID")

    # 3. corps tronqué à la limite d'une issue ; octets nuls retirés du corps
    #    et du sujet (l'environnement les refuse)
    m3 = EmailMessage()
    m3["From"] = "b@example.org"
    m3["Subject"] = "robinet"
    m3.set_content("y" * (MAX_CORPS + 5000))
    assert len(analyser(bytes(m3))["corps"]) == MAX_CORPS
    hostile = analyser(b"From: c@example.org\r\nSubject: rob\x00inet\r\n\r\nAdresse\x00 :\r\n" + glyphes.encode("utf-8") + b"\r\n")
    assert "\x00" not in hostile["corps"] and hostile["titre"] == "robinet"
    print("ok : corps tronqué à", MAX_CORPS, "; octets nuls retirés")

    # 4. inscription par l'environnement, dans une file temporaire
    with tempfile.TemporaryDirectory() as tmp:
        mempool, etat = R.MEMPOOL, R.ETAT
        R.MEMPOOL = os.path.join(tmp, "mempool.json")
        R.ETAT = os.path.join(tmp, "etat.json")          # absent : le nœud tranchera
        try:
            assert inscrire(d) == 0
            f = json.load(open(R.MEMPOOL, encoding="utf-8"))
            assert len(f["demandes"]) == 1
            e = f["demandes"][0]
            assert e["adresse"] == a20.hex() and e["auteur"] == alice
            assert e["canal"] == "courriel" and e["ref"] == d["ref"] and e["issue"] == 0
            assert "example.org" not in json.dumps(f)             # jamais l'adresse
            # même référence, autre adresse et autre expéditeur : ignoré (dédoublonnage par ref)
            b20 = hashlib.sha256(b"courriel-test-2").digest()[:20]
            assert inscrire({"auteur": empreinte_expediteur("z@example.org"), "titre": "robinet",
                             "corps": "Adresse :\n" + _encoder_glyphes(b20), "ref": d["ref"]}) == 0
            assert len(json.load(open(R.MEMPOOL, encoding="utf-8"))["demandes"]) == 1
            # même expéditeur, autre référence : frein (une demande en attente)
            d_bis = dict(d, corps="Adresse :\n" + _encoder_glyphes(b20), ref="f" * 16)
            assert inscrire(d_bis) == 2
            # autre expéditeur : servi
            d_ter = dict(d_bis, auteur=empreinte_expediteur("carol@example.org"), ref="e" * 16)
            assert inscrire(d_ter) == 0
            assert len(json.load(open(R.MEMPOOL, encoding="utf-8"))["demandes"]) == 2
            # sujet inconnu : ignoré ; expéditeur illisible : refusé, jamais inscrit
            assert inscrire(dict(d2, titre="bonjour")) == 3
            assert inscrire(dict(d2, titre="robinet", corps=glyphes, ref="a" * 16)) == 2
            assert len(json.load(open(R.MEMPOOL, encoding="utf-8"))["demandes"]) == 2
            print("ok : file temporaire — empreinte, référence, frein, sujet inconnu, sans expéditeur")

            # 5. un envoi par courriel : transaction entre marqueurs, inscrite telle quelle
            brut = bytes(range(256)) * 2
            b64 = base64.b64encode(brut).decode()
            corps = (R.DEBUT + "\n" + "\n".join(b64[i:i + 76] for i in range(0, len(b64), 76))
                     + "\n" + R.FIN + "\n")
            assert inscrire({"auteur": empreinte_expediteur("dave@example.org"), "titre": "envoi",
                             "corps": corps, "ref": "d" * 16}) == 0
            f = json.load(open(R.MEMPOOL, encoding="utf-8"))
            assert f["demandes"][-1]["type"] == "envoi" and f["demandes"][-1]["canal"] == "courriel"
            assert base64.b64decode(f["demandes"][-1]["donnees"]) == brut
            print("ok : envoi par courriel inscrit tel quel")

            # 6. le sujet décide du genre, pas le corps : des glyphes sous « envoi »
            #    sont refusés ; marqueurs inversés = refus propre, pas une exception
            assert inscrire({"auteur": empreinte_expediteur("erin@example.org"), "titre": "envoi",
                             "corps": glyphes, "ref": "c" * 16}) == 2
            assert inscrire({"auteur": empreinte_expediteur("fred@example.org"), "titre": "envoi",
                             "corps": R.FIN + "\n" + R.DEBUT + "\n", "ref": "b" * 16}) == 2
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
