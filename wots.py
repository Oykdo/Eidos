#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
wots.py — signatures WOTS+ et arbre L, bibliotheque standard uniquement.

Remplace Lamport dans les transactions et sert de signature a usage unique
au MSS des validateurs, qui devient un XMSS conforme. Tout repose sur
SHA-256 : aucune courbe, resistance quantique structurelle.

Parametres (RFC 8391, XMSS-SHA2_*_256) : n = 32, w = 16, len1 = 64,
len2 = 3, len = 67. Chaque chaine est tweakee par une graine publique et
une adresse de hachage (ADRS, 32 octets) : aucun hachage nu.

  F(K, M)   = SHA-256(toByte(0, 32) ‖ K ‖ M)       maillon de chaine
  H(K, M)   = SHA-256(toByte(1, 32) ‖ K ‖ M)       noeud d'arbre, M sur 64 o
  PRF(K, M) = SHA-256(toByte(3, 32) ‖ K ‖ M)       cles et masques, M = ADRS

Le verificateur reconstruit la cle publique a partir de la signature ; le
temoin ne porte donc que la graine publique (32 o) et la signature (2 144 o),
soit 2 176 octets contre 24 576 pour Lamport.

Cle a usage unique derivee d'une graine de 32 octets :
  graine_pub = SHA-256(graine ‖ "pub")
  sk_i       = PRF(graine, ADRS(chaine = i))
  pk_i       = chaine(sk_i, 0, 15)
  racine     = arbre L des 67 pk_i (RAND_HASH tweake)
  adresse    = SHA-256(graine_pub ‖ racine)[:20]
  empreinte  = SHA-256(graine_pub ‖ racine)        usage unique dans la chaine

Usage :  python3 wots.py          auto-tests

AVERTISSEMENT. Une cle WOTS+ ne signe QU'UNE FOIS : deux signatures avec la
meme cle revelent des maillons intermediaires et permettent de forger tout
message dont les chiffres sont superieurs. La regle est inscrite dans le
carnet (utxo.py) : une empreinte ne peut apparaitre qu'une fois. On signe
ici des condensats de 32 octets deja haches (sighash, id de bloc) : pas de
H_msg randomise, ce qui est assume.
"""

import hashlib, sys

N = 32
W = 16
LOG_W = 4
LEN1 = 64
LEN2 = 3
LEN = LEN1 + LEN2          # 67
OCTETS_SIG = LEN * N       # 2 144
OCTETS_GRAINE = 32
OCTETS_TEMOIN = OCTETS_GRAINE + OCTETS_SIG   # 2 176

TYPE_OTS, TYPE_LTREE, TYPE_ARBRE = 0, 1, 2


def sha256(b): return hashlib.sha256(b).digest()


def _to_byte(x, n): return x.to_bytes(n, "big")


# ==========================================================================
# 1. Adresses de hachage (ADRS, 32 octets) et fonctions tweakees
# ==========================================================================
def adrs(type_, couche=0, arbre=0, a=0, b=0, c=0, masque=0):
    """layer(4) tree(8) type(4) x(4) y(4) z(4) keyAndMask(4).
    OTS   : x = adresse OTS, y = chaine, z = maillon
    L     : x = adresse L,   y = hauteur, z = indice
    arbre : x = 0,           y = hauteur, z = indice"""
    return (_to_byte(couche, 4) + _to_byte(arbre, 8) + _to_byte(type_, 4) +
            _to_byte(a, 4) + _to_byte(b, 4) + _to_byte(c, 4) + _to_byte(masque, 4))


def _masque(ad, m): return ad[:28] + _to_byte(m, 4)


def F(cle, m):   return sha256(_to_byte(0, N) + cle + m)
def H(cle, m):   return sha256(_to_byte(1, N) + cle + m)
def PRF(cle, m): return sha256(_to_byte(3, N) + cle + m)


def _xor(a, b):
    return (int.from_bytes(a, "big") ^ int.from_bytes(b, "big")).to_bytes(len(a), "big")


def chaine(x, depart, pas, graine_pub, ad):
    """Applique F de `depart` a `depart + pas - 1`, avec cle et masque
    derives de (graine publique, ADRS) a chaque maillon."""
    for j in range(depart, depart + pas):
        ad_j = ad[:24] + _to_byte(j, 4) + _to_byte(0, 4)
        cle = PRF(graine_pub, ad_j)
        bm = PRF(graine_pub, _masque(ad_j, 1))
        x = F(cle, _xor(x, bm))
    return x


def rand_hash(gauche, droite, graine_pub, ad):
    cle = PRF(graine_pub, _masque(ad, 0))
    bm0 = PRF(graine_pub, _masque(ad, 1))
    bm1 = PRF(graine_pub, _masque(ad, 2))
    return H(cle, _xor(gauche, bm0) + _xor(droite, bm1))


# ==========================================================================
# 2. WOTS+ : base w, somme de controle, generation, signature, verification
# ==========================================================================
def base_w(msg32):
    """64 chiffres en base 16 (quartets, poids fort d'abord), puis 3 chiffres
    de somme de controle : csum = Σ(15 - m_i), decalee de 4 bits, sur 2 octets."""
    chiffres = []
    for o in msg32:
        chiffres.append(o >> 4)
        chiffres.append(o & 15)
    csum = sum(W - 1 - m for m in chiffres) << 4
    cs = _to_byte(csum, 2)
    chiffres += [cs[0] >> 4, cs[0] & 15, cs[1] >> 4]
    assert len(chiffres) == LEN
    return chiffres


def graine_publique(graine):
    return sha256(graine + b"pub")


def _sk(graine, ad_ots, i):
    return PRF(graine, ad_ots[:20] + _to_byte(i, 4) + _to_byte(0, 8))


def cle_publique(graine, graine_pub, ad_ots):
    """67 elements de 32 octets."""
    return [chaine(_sk(graine, ad_ots, i), 0, W - 1, graine_pub,
                   ad_ots[:20] + _to_byte(i, 4) + _to_byte(0, 8))
            for i in range(LEN)]


def signer_wots(graine, graine_pub, ad_ots, msg32):
    if len(msg32) != N:
        raise ValueError("message de 32 octets attendu")
    return b"".join(chaine(_sk(graine, ad_ots, i), 0, m, graine_pub,
                           ad_ots[:20] + _to_byte(i, 4) + _to_byte(0, 8))
                    for i, m in enumerate(base_w(msg32)))


def cle_depuis_signature(sig, graine_pub, ad_ots, msg32):
    """Termine les chaines : la cle publique que cette signature implique."""
    if len(sig) != OCTETS_SIG or len(msg32) != N:
        return None
    return [chaine(sig[i * N:(i + 1) * N], m, W - 1 - m, graine_pub,
                   ad_ots[:20] + _to_byte(i, 4) + _to_byte(0, 8))
            for i, m in enumerate(base_w(msg32))]


# ==========================================================================
# 3. Arbre L : compression des 67 elements en une racine de 32 octets
# ==========================================================================
def arbre_l(pk, graine_pub, ad_l):
    noeuds = list(pk)
    hauteur = 0
    while len(noeuds) > 1:
        suivant = []
        for i in range(len(noeuds) // 2):
            ad = ad_l[:20] + _to_byte(hauteur, 4) + _to_byte(i, 4) + _to_byte(0, 4)
            suivant.append(rand_hash(noeuds[2 * i], noeuds[2 * i + 1], graine_pub, ad))
        if len(noeuds) % 2:
            suivant.append(noeuds[-1])
        noeuds = suivant
        hauteur += 1
    return noeuds[0]


# ==========================================================================
# 4. Cle a usage unique pour une transaction (ADRS OTS 0, arbre L 0)
# ==========================================================================
AD_OTS_TX = adrs(TYPE_OTS)
AD_L_TX = adrs(TYPE_LTREE)


def racine(graine):
    gp = graine_publique(graine)
    return gp, arbre_l(cle_publique(graine, gp, AD_OTS_TX), gp, AD_L_TX)


def adresse(graine_pub, racine_l):
    return sha256(graine_pub + racine_l)[:20]


def empreinte(graine_pub, racine_l):
    return sha256(graine_pub + racine_l)


def adresse_de(graine):
    return adresse(*racine(graine))


def empreinte_de(graine):
    return empreinte(*racine(graine))


def signer(graine, msg32):
    """Temoin : (graine publique, signature)."""
    gp = graine_publique(graine)
    return gp, signer_wots(graine, gp, AD_OTS_TX, msg32)


def racine_depuis_temoin(temoin, msg32):
    """None si le temoin n'a pas la forme attendue."""
    gp, sig = temoin
    if len(gp) != OCTETS_GRAINE:
        return None
    pk = cle_depuis_signature(sig, gp, AD_OTS_TX, msg32)
    if pk is None:
        return None
    return arbre_l(pk, gp, AD_L_TX)


def verifier(adresse20, msg32, temoin):
    """Vrai si la cle reconstruite depuis la signature donne l'adresse."""
    r = racine_depuis_temoin(temoin, msg32)
    return r is not None and adresse(temoin[0], r) == adresse20


# ==========================================================================
# 5. Auto-tests
# ==========================================================================
def tests():
    import time
    ok = 0
    graine = sha256(b"alice/0")
    m = sha256(b"message")

    t = time.time()
    gp, r = racine(graine)
    dt_cle = (time.time() - t) * 1000
    a = adresse(gp, r)
    t = time.time()
    temoin = signer(graine, m)
    dt_sig = (time.time() - t) * 1000
    t = time.time()
    assert verifier(a, m, temoin)
    dt_ver = (time.time() - t) * 1000
    assert temoin[0] == gp and len(temoin[1]) == OCTETS_SIG
    print(f"WOTS+ signe / verifie          : OK  (cle {dt_cle:.1f} ms, "
          f"signature {dt_sig:.1f} ms, verification {dt_ver:.1f} ms)"); ok += 1

    faux = bytearray(temoin[1]); faux[100] ^= 1
    assert not verifier(a, m, (gp, bytes(faux)))
    assert not verifier(a, m, (gp, temoin[1][:-1]))
    print("un octet altere, ou manquant   : refus"); ok += 1

    assert not verifier(a, sha256(b"autre"), temoin)
    assert not verifier(a, m, (sha256(b"autre graine"), temoin[1]))
    print("message ou graine publique autre: refus"); ok += 1

    # reemploi : deux signatures revelent les maillons ; un message dont chaque
    # chiffre est >= a ceux des deux messages se forge sans la graine
    m2 = sha256(b"second")
    temoin2 = signer(graine, m2)
    c1, c2 = base_w(m), base_w(m2)
    assert empreinte(gp, r) == empreinte_de(graine)      # meme cle, meme empreinte
    forge = bytearray(m)
    for i in range(N):
        forge[i] = (max(c1[2 * i], c2[2 * i]) << 4) | max(c1[2 * i + 1], c2[2 * i + 1])
    forge = bytes(forge)
    cf = base_w(forge)
    forgeable = all(cf[i] >= min(c1[i], c2[i]) for i in range(LEN))
    if forgeable:
        sig = b""
        for i in range(LEN):
            src, dep = (temoin, c1[i]) if c1[i] <= c2[i] else (temoin2, c2[i])
            sig += chaine(src[1][i * N:(i + 1) * N], dep, cf[i] - dep, gp,
                          AD_OTS_TX[:20] + _to_byte(i, 4) + _to_byte(0, 8))
        assert verifier(a, forge, (gp, sig))
    print(f"reemploi : 2 signatures, forge {'reussie' if forgeable else 'partielle'} "
          f"-> le carnet refuse la 2e (empreinte identique)"); ok += 1

    taille = OCTETS_GRAINE + len(temoin[1])
    assert taille == OCTETS_TEMOIN == 2176
    print(f"taille du temoin               : {taille} o (graine 32 + signature "
          f"{OCTETS_SIG}) contre 24 576 o en Lamport"); ok += 1

    print(f"\n{ok} verifications passees.")


if __name__ == "__main__":
    tests()
