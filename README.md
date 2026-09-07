[<img src="docs/banniere-en.svg" alt="Eidos — bounded emission, federated consensus, hash-based signatures" width="1280" />](https://oykdo.github.io/Eidos/)

# Eidos

**English** · [Français](README.fr.md)

[![Tests](https://github.com/Oykdo/Eidos/actions/workflows/tests.yml/badge.svg)](https://github.com/Oykdo/Eidos/actions/workflows/tests.yml)
[![Chain](https://github.com/Oykdo/Eidos/actions/workflows/chaine.yml/badge.svg)](https://github.com/Oykdo/Eidos/actions/workflows/chaine.yml)
[![Pages](https://github.com/Oykdo/Eidos/actions/workflows/pages.yml/badge.svg)](https://oykdo.github.io/Eidos/)

Eidos is three things that share one rule, *nothing is believed, everything is replayed*:

- **a prototype chain** with bounded emission and no halving, a federated consensus, and post-quantum signatures made of hashing alone — no elliptic curve anywhere; the specification is Python, standard library only;
- **a web atelier** that replays the same rules in the browser, byte for byte, and lets you check a coin, a signature, an address without trusting anyone;
- **a game** grown on top of the chain — a Tower of 255 floors, nine muses, and a daily roguelike, the Vigil, where a one-time key is your life and the proof of your run is judged by anyone without replaying the chain.

Testnet only: the eidôlon has no value.

- Live atelier: [oykdo.github.io/Eidos](https://oykdo.github.io/Eidos/)
- Testnet: seven validators, one block per hour forged by GitHub Actions; faucet through issues or email; transfers through issues; vigil proofs deposited through issues
- One file for your vault: `eidos.carnet`

## Contents

0. [Start here](#0-start-here)
1. [The unit and the form](#1-the-unit-and-the-form)
2. [Five claims](#2-five-claims)
3. [Emission](#3-emission)
4. [Glyphs](#4-glyphs)
5. [Signatures](#5-signatures)
6. [Federated consensus](#6-federated-consensus)
7. [The testnet](#7-the-testnet)
8. [Relics and age seals](#8-relics-and-age-seals)
9. [The atelier](#9-the-atelier)
10. [The game: the Tower and the Vigil](#10-the-game-the-tower-and-the-vigil)
11. [The world](#11-the-world)
12. [Repository layout](#12-repository-layout)
13. [Verify everything](#13-verify-everything)
14. [Documents](#14-documents)
15. [What this repository is not](#15-what-this-repository-is-not)
16. [Licence](#16-licence)

## 0. Start here

**As a player**, on [the atelier](https://oykdo.github.io/Eidos/):

1. Create a vault. The secret stays in your browser; save `eidos.carnet` at once, or the vault is lost.
2. Ask the faucet for one eidôlon: an issue with your address in glyphs, or an email. The node serves it at the next block, within the hour.
3. Follow the network on the Witness page: the signed head is verified in your browser, never trusted.
4. Climb the Tower: hosts, elixirs, capsules, secrets, doors that open with an age seal.
5. Keep a Vigil: sixty-four one-time keys as life, the day's twenty-seven rooms, a bag that the summit pours into the vault and that the last leaf loses.
6. Deposit your proof: an issue titled « veillée » with the exported file attached; the judge runs in the CI and answers you. The leaderboard is recomputed in every browser.

**As a verifier or a developer**:

```bash
git clone https://github.com/Oykdo/Eidos && cd Eidos
python3 verify_genesis.py        # 32 checks of the frozen genesis
python3 noeud.py --verifier      # replays the whole testnet chain, must end with « aucun refus »
cd atelier && npm ci && npm test # 30 script tests and 408 Eidos tests, vectors shared with Python
```

The Guide page of the atelier explains the core, the mechanics and the world in plain words; `CLAUDE.md` says what must never change; `docs/FEUILLE_DE_ROUTE.md` records every decision.

## 1. The unit and the form

The unit of account is the **eidôlon** — εἴδωλον, the image — set against *eidos*, εἶδος, the form. The form is the rule; the image is what circulates. 1 eidôlon = 10⁸ atoms.

## 2. Five claims

1. **The reward never halves.** It oscillates on a bounded cosine, and an epoch sums exactly to the atom.
2. **The week is not a convention.** 24 = 3 × 7 + 3; that remainder of three orders the days, and here it rotates the proposers.
3. **An address is readable.** Three stacked figures, six bits per glyph, a checksum the eye can verify.
4. **Energy is bounded by consensus, not by the reward.** Proof of work never caps energy; a federation does.
5. **Nothing is trusted, everything is replayed.** The UTXO ledger is never written to disk: it is rebuilt by full replay every time the chain is opened, by the same code that forged it.

## 3. Emission

```
R(h) = a + b·cos( 2π(h − h₀) / T )     with b = a/2
```

The cosine sums to zero over a full period, so an epoch emits **exactly** `a·T`, distributed to the atom by largest remainder.

| Parameter | Value | Origin |
|---|---|---|
| Block interval (spec) | 600 s | — |
| `T` — blocks per epoch | **1008** | 168 hours × 6 blocks = one week |
| `h₀` — peak | **492** | 41/84 of the epoch, an exact integer |
| Bounds | `[a/2, 3a/2]` | max/min ratio = 3 |

### The four ages

| Age | `a` | Epochs | Blocks | Emission | Seal stake (atelier) |
|---|---|---|---|---|---|
| Satya | 40 | 832 | 838 656 | 33 546 240 | 33.55 eidôla |
| Trétâ | 30 | 624 | 628 992 | 18 869 760 | 18.87 |
| Dvâpara | 20 | 416 | 419 328 | 8 386 560 | 8.39 |
| Kali | 10 | 208 | 209 664 | 2 096 640 | 2.10 |

**Total emission: 62 899 200** eidôla over 2 096 640 blocks, i.e. 2 080 weeks ≈ 39.9 years. Ratio 16 : 9 : 4 : 1. Seal stake = age emission / 1 000 000.

`math.cos` depends on the local libm: two nodes could disagree. Eidos computes the cosine in `decimal.Decimal` by Taylor series, with π to 68 decimals. The tables are frozen in `genesis.json`. **Any change to `eonis.py`, even a comment, invalidates genesis** — the CI checks its fingerprint.

```
genesis.json  06b47645abedb5e0ac7d2fc7a1dd6fcd386ef493874fd2774544565ac46dbe28
eonis.py      cc94ad1e6eadf7027414a1347e870a4842689431b8fca2c1b381f93f4f1dfabc
block 0       00003d32ffa7a1dc7f1ace8ec08d0c739126ad4449fe004ea772710baec2c7b6
```

The banner above is drawn from this formula by `docs/banniere.py`, with the same Decimal cosine. The same law, drawn as a polar curve, is the orbit behind the atelier's home page.

## 4. Glyphs

Three storeys, four states: empty `00`, circle `01`, crescent `10`, cross `11`. A glyph carries **6 bits**, read top to bottom.

| Use | Bits | Glyphs |
|---|---|---|
| Address | 160 | 27 |
| Checksum | 24 | 4 |
| Full digest | 256 | 43 |

The two padding bits of the 27th glyph must be zero, otherwise the address is refused. **Forbidden**: deriving a key or a seed from this alphabet. The sixty-four stacks are also the sixty-four eggs of the world (§11).

## 5. Signatures

Everything rests on SHA-256, **with no elliptic curve**. Quantum resistance is structural, not bolted on.

- **WOTS+ for spends** (`wots.py`, RFC 8391: w = 16, 67 SHA-256 chains, every link tweaked by the public seed and a hash address, L-tree). The verifier rebuilds the public key from the signature: a witness of **2 176 bytes** (public seed 32 + signature 2 144), against 24 576 with Lamport. Address = SHA-256(public seed ‖ L-tree root)[:20]. **A key signs once**: an address can be spent only once in the whole chain, and spent addresses are remembered even across an assume-valid resume. The wallet emits a fresh address after every use.
- **XMSS for validators.** 2^k WOTS+ keys under a tweaked Merkle tree, public key = (root, public seed). Block signature: 4 + 2 144 + 32·k bytes. A stateful scheme: restoring an old backup means replaying published indices. The signer therefore keeps a **persistent counter** (`indice-<v>.json`, monotone, written under an exclusive lock and re-read from disk before every signature), and a node that already knows published indices refuses to restart from the chain alone unless told so explicitly.
- **XMSS for players.** The same construction, height 6, is the life of a Vigil run: sixty-four leaves, one gesture per leaf, and a judge that refuses any run where an index signs twice (§10).
- **UTXO root in the signed header.** Every block declares the Merkle root of the whole ledger after it (leaf = SHA-256d(txid ‖ rank ‖ address ‖ amount), order (txid, rank)); `id_bloc = SHA-256d(E.header ‖ root)`. A witness holding only the signed head (`etat.json.tete_signee`) recomputes `id_bloc`, checks the XMSS signature and judges an output proof without replaying. `noeud.py --depuis <h> <root>` resumes from an explicit checkpoint, never an implicit one.
- **Canonical serialisation.** A transaction must round-trip to the byte, or it is rejected.
- **Lamport** remains in the atelier as a demonstration (reuse, audit), outside consensus.

## 6. Federated consensus

`n` validators, one slot per block. Proposer of slot `s`: `V[(3·s) mod n]`. With `n = 7`: `[0, 3, 6, 2, 5, 1, 4]`. An `n` divisible by three is refused.

**Finality**: threshold `⌊2n/3⌋ + 1`, **independent of the rotation step**. Seven validators → five signatures.

**Liveness**: a slot `s > slot(now) + 1` is refused; without that bound, a single block dated too far ahead would freeze the chain. Skipping a slot (silence) stays legal, and holes are published (`creneaux_sautes`). At most six slots are caught up per run.

**Replay**: `Σ utxo == cumulative emission` after every block; the node refuses to publish if the invariant breaks. The coinbase is exactly `reward(h) + fees`.

Two consensus paths coexist in the repository: the **federated** one (`federation.py` + `noeud.py`, the real one) and a historical **proof-of-work** toy (`consensus.py` + `store.py`). They are never mixed.

## 7. The testnet

| | |
|---|---|
| Validators | 7, seeds derived from the public tag `eidos-testnet-3` |
| Signatures | XMSS of height 12: 4 096 per validator, about three years of hourly blocks |
| Slot | 3 600 s on the testnet (`federation.json`), 600 s in the spec |
| Forge | `chaine.yml`, hourly cron on GitHub Actions, on `main` only |
| Chain file | `chaine-eidos.dat`, format 3, written by the CI and never by hand |
| Published state | `etat.json`: balances, outputs, signed head, relics, invariant |

- **Faucet.** Two channels feed the same queue: a GitHub issue containing an address in glyphs (`robinet.py`), or an email with subject `robinet` to the mailbox the node publishes in `etat.json.robinet_canaux` (`courriel.py`, IMAP from the standard library, no GitHub account). One eidôlon per request, one served request per author (GitHub account or sender address) per epoch, one pending at a time, within an epoch budget of `a·T / 8`. Neither an issue body nor an email body is ever interpolated into a command: they travel through an environment variable, and only what passes the glyph filter and the checksum is kept. The atelier home page prepares either request, follows it in `mempool.json`, and loads the coins once served.
- **Transfers.** The atelier signs a spend and emits a text block between `-----EIDOS-----` markers (base64, 76-column lines); paste it in an issue. The node validates each transfer in a candidate block on a deep copy of the ledger, includes at most 8 per block, carries their fees into the coinbase, and expires requests older than one epoch.
- **Vigil proofs.** An issue titled « veillée » with the exported proof attached (or a gist, or a raw file in a repository — three hosts only, two megabytes at most): the TypeScript judge runs in the CI (`veillees.yml`, `depot.ts`), checks that the proof's three heads are in the published chain, judges it without replaying, and commits it into `veillees/`. The issue receives the verdict and is closed.

Never write `chaine-eidos.dat`, `etat.json`, `mempool.json` or `veillees/` from a workstation: those files belong to the `chaine`, `robinet` and `veillees` workflows (one concurrency group).

## 8. Relics and age seals

A **relic** is a coin sealed on a WOTS+ address whose seed is printed in a QR code hidden somewhere in the world. Recovering it means spending it to your vault (Relics page → "Relic found", then a transfer issue). Since a key signs once, a relic can be recovered **once, by construction**: no server, no registry, the chain is the record. The keeper seals it with `python3 relique.py --sceller --age Kali --indice "…"` (QR as SVG, printable sheet, entry in `reliques.json`), and the seed exists **only in the QR**. The node publishes each declared relic's status in `etat.json` (`attente` / `intacte` / `recuperee`): a reading, not a proof. `python3 relique.py --animer <txid>` draws the relic in figures · ○ ☽ ✚ on the ellipse of its age.

A relic recovered into a vault becomes an **age seal**. The Tower is cut in four quarters (floors 0–63, 64–127, 128–191, 192–254); the doors at 64, 128 and 192 open only to the seal of the right age. The expected stake of a seal is its age's emission / 10⁶ — Kali 2.10, Dvâpara 8.39, Trétâ 18.87, Satya 33.55.

Details: [`docs/HANDOVER_RELIQUES_QR.md`](docs/HANDOVER_RELIQUES_QR.md).

## 9. The atelier

`atelier/` is the web interface (TanStack Start, React, three.js), 18 runtime dependencies. It replays the specification in TypeScript (`atelier/src/lib/eidos/`), and `vecteurs.json` — written by `vecteurs.py`, read by both sides, nine families — keeps Python and TypeScript identical to the byte (CI job `parite`).

| Register | Page | Role |
|---|---|---|
| Verify | **Vault** | Balance, faucet, send, save `eidos.carnet`. Behind it, the **orbital background**: the emission law drawn as a limaçon, nine muse-stars on nine orbits with their dances, the epoch's phase read from the followed head, a parallax toward the pointer, a click to each muse's page — a reading; nothing of the pointer is kept |
| | **Log** | Genesis, chain, Merkle proof |
| | **Witness** | A second memory: the signed head, not the keys. Judges a published output |
| | **Glyphs** | 64 stacks, padding refused, the egg of each stack |
| Read | **Map** | Relics of the world by age and by muse; trophy of a seal, judged without replay |
| | **Signs** | Readings of the same 64 glyphs |
| Play | **Tower** | 255 floors, nine muses as hosts, elixirs, capsules and bestiary, secrets, digs, doors by seal, the pendulum |
| | **Vigil** | The daily roguelike: 64 WOTS+ leaves as life, 27 rooms from the day's first block, the bag, the tree of leaves on screen, the proof, the leaderboard and the ghosts |
| | **Relics** | The relic scene and "Relic found" |
| | **Guide** | Where to start, Verify / Read / Play, the core, the mechanics, the lore, ten words, the limits |

**Figures are not proofs.** The map, the signs, the relic scene, the artefacts, the tree, the ghosts and the leaderboard are readings; only the ledger, the chain and the signatures commit. When a text of the atelier promises more than the code, the text is wrong.

**What counts is anchored.** An army of machines multiplies what is free — vaults, browsers, runs — and never the coins. A run that counts is seeded by a signed head and an unspent coin proven against the ledger root; neither the vault, nor the machine, nor the browser enters the seed. No browser fingerprint, no machine lock, no client proof of work ([`docs/SPEC_SYBIL.md`](docs/SPEC_SYBIL.md)).

**One file.** The vault is written to `eidos.carnet`. WOTS+ signs a spend, not the file — signing a backup would burn a one-time key; the file carries a SHA-256d trace bound to the current address. A legacy `.psnx` still opens, then rewrites as `.carnet`.

Details: [`atelier/README.md`](atelier/README.md).

## 10. The game: the Tower and the Vigil

Six laws are frozen in `integrite.ts` — conservation, group, doxa, seal, ages, resonance. They say the same thing from six sides: **no hit points, no level, no dice, no item that mutates, and a tier never multiplies the norm.** Everything that looks like chance derives from a seed and replays identically; the network knows nothing of the game except the seals and the exported proofs.

**The Tower.** 255 slices of rotation space, nine bands for nine muses from Thalia at the ground to Urania at the top, four age quarters, a nine-by-nine slab per floor with one to three occupants. Every floor is public and fixed. Hosts live on about one floor in seven and each asks for something read in your vault (a proof of inclusion, two items of the same orbit, a pair in resonance, an item of the biome's class…) and gives an item once per vault. Elixirs are the tria prima — salt, mercury, sulphur — drunk on one floor only. Secrets are read, never rolled: alcoves (the central cross of a slab), echoes (two floors of the same orbit), lairs (a ticket, a guardian, a duel in three beats with no hit points), the observatory where Urania reads the network head. Occupants are captured with hollow-glyph capsules and filed in a bestiary of twenty-one cells. The slab is dug three strokes per floor; finds sit on fixed public cells, their content belongs to each vault. At the end of a room, the **pendulum** reads what the vault did and proposes; the player decides among three announced floors, never the cell. An ascent is twenty-seven rooms; free, it is a reading; anchored on a block and a coin, it counts and is judged without replay.

**The Vigil.** You enter with an XMSS tree of **sixty-four one-time keys**. Every gesture that counts burns one — cross (twenty-six times, mandatory), talk, dig, capture; reading is free. The last leaf ends the climb: permadeath as a theorem, since a reused key is a compromised key and the judge refuses any run where an index serves twice. The day's twenty-seven rooms derive from the **first block of the UTC day**, proven by two signed heads, so they are the same for everyone; a room bears the era name of its egg. What you find goes into a **bag** of twenty-seven places: the summit, a closed door or fading away pour it into the vault, the last leaf loses it — the dilemma of parsimony. Free, a vigil is a reading; anchored on an unspent coin, it counts: the proof `eidos-veillee/1` carries the heads, the coin, every gesture signed by its leaf, and anyone judges it — heads, coin, leaves in order, route recomputed, ending consistent. The leaderboard is recomputed in every browser from the proofs deposited in `veillees/` (one coin, one vigil per day, the first deposited holds the place; score = rooms × 64 + loot); other players' runs come back as **ghosts**, an epithet and their last room, never a name. The judge does not know whose coin it is: that is proven by spending it. Design bible: [`docs/BIBLE_VEILLEE.md`](docs/BIBLE_VEILLEE.md).

## 11. The world

Nothing in the lore is invented on the spot: each figure comes from a written source and is transposed without its power.

- **Nine muses, nine stars, nine dances.** ⊕ Thalia the innkeeper, ☽ Clio the archivist, ☿ Calliope the apothecary, ♀ Terpsichore the dancing mistress, ☉ Melpomene the tragedienne, ♂ Erato the smith, ♃ Euterpe the musician, ♄ Polyhymnia the keeper of hymns, ★ Urania the astronomer. Each has three households, twenty-seven lines that state true rules, and a dance that animates the relics and the orbital background.
- **Four ages.** Satya, Trétâ, Dvâpara, Kali: a calendar and a geography — the quarters of the Tower, the metal of an item, the age of a proof, the stake of a seal — never a power.
- **The Chamber of Genesis.** Before time, a Singularity; from it, nine eggs. Eight carry a theme — Void, Quantum, Temporal, Spatial, Entropic, Harmonic, Celestial, Spinorial — and each opens a cycle of eight eras: sixty-four manifestations, which are the sixty-four glyphs. An egg's cycle is a band of the Tower; the ninth egg, The Unknown, is Urania, who reads and gives nothing. The era names name the rooms of the Vigil ([`docs/LORE_CHAMBRE.md`](docs/LORE_CHAMBRE.md), [`docs/TRANSPOSITION_EIDOLON.md`](docs/TRANSPOSITION_EIDOLON.md)).
- **The tria prima.** Salt, mercury, sulphur are the three levels of a glyph; the faucet's artefacts are Paracelsus's eggs; the philosopher's stone exists, one per vault among the first ten, and turns without enlarging.
- **Ghosts.** Six phrasings carried over from an older story — Echo, Reborn, Last, Shadow, Fading, Whisper — on the era name of the last room reached.

## 12. Repository layout

| File | Lines | Role | Checks |
|---|---|---|---|
| `eonis.py` | 267 | emission (Decimal cosine), glyph codec — **frozen** | 6 |
| `genesis.json` | 105 | frozen tables and fingerprints — **frozen** | — |
| `verify_genesis.py` | 134 | independent verification of genesis | 32 |
| `wots.py` | 284 | WOTS+ w = 16, L-tree, addresses, fingerprints | 5 |
| `utxo.py` | 509 | witnesses, addresses, transactions, ledger, UTXO root, validation | 15 |
| `federation.py` | 694 | XMSS, rotation, liveness, signed head, locked persistent counter | 18 |
| `noeud.py` | 1151 | testnet node: replay, forge, faucet, transfers, `--depuis`, relics, `etat.json` | 5 + 3 + 4 + 5 + 2 |
| `robinet.py` | 420 | faucet queue fed by issues and email, per-author brake | 14 |
| `courriel.py` | 321 | second faucet channel: IMAP mailbox, same filter, per-sender brake | 6 |
| `vecteurs.py` | 204 | shared vectors Python ↔ TS (`vecteurs.json`, 9 families) | parity |
| `qr.py` | 428 | QR encoder, standard library, level H, versions 1–10 | 5 |
| `relique.py` | 236 | relic keeper: seal, animate | 3 |
| `labo/aura_voxel_lab.py` | 132 | pendulum-9 lab: voxel avatar (grid of `voxels.ts`), graded aura, 8 aggregators | 11 |
| `labo/pendule9_run.py` | 193 | lab: free Tower over the atelier's run, seal, Cube and anchoring, muses from `signatures.ts` | 11 |
| `labo/unification.py` | 95 | lab: contract with `pendule.ts`, synthetic and real fixtures (`exporter-run.ts`), gift | 9 |
| `labo/aura_veillee.py` | 98 | lab: a vigil's aura, reading of the 64 leaves over 8 positions (bot and played vigil) | 8 |
| `consensus.py` | 204 | PoW difficulty and cumulative work — historical | 6 |
| `store.py` | 278 | PoW chain on disk — historical | — |
| `federation.json` | — | roots and public seeds of the 7 validators, t0, slot | — |
| `reliques.json` | — | declared relics: id, address, age, hint — never a seed | — |
| `chaine-eidos.dat` | — | the testnet chain, written by the CI | — |
| `etat.json`, `mempool.json` | — | published state; faucet and transfer requests | — |
| `veillees/` | — | deposited vigil proofs (`index.json`, one `eidos-veillee/1` file per proof), judged in every browser, never by a server | — |
| `docs/` | — | specifications, the vigil bible, the roadmap, the lore; banner generator | 2 |
| `atelier/` | — | web atelier; `npm test` runs 30 script tests and 408 Eidos tests | 408 |

CI (`.github/workflows/`): `tests.yml` (3 OS × 2 Python, fingerprints, hygiene, `parite`), `chaine.yml` (hourly forge), `robinet.yml` (faucet and transfer issues), `veillees.yml` (vigil proofs deposited by issue), `courriel.yml` (mailbox, when a mailbox is declared), `pages.yml` (atelier), `init.yml`. Python 3.9 is the floor; Node 22 for the atelier.

## 13. Verify everything

```bash
python3 verify_genesis.py      # 32 checks — always first
python3 eonis.py               # 6
python3 wots.py                # 5
python3 utxo.py                # 15
python3 vecteurs.py            # Python ↔ TS parity
python3 robinet.py --test      # 14
python3 courriel.py --test     # 6
python3 -c "import noeud as N; N._test_artefact()"
python3 -c "import noeud as N; N._test_envois()"      # 5
python3 -c "import noeud as N; N._test_paiements()"   # 3
python3 -c "import noeud as N; N._test_depuis()"      # 4
python3 -c "import noeud as N; N._test_indice()"      # 2
python3 -c "import noeud as N; N._test_reliques()"    # 5
python3 qr.py --test           # 5
python3 relique.py --test      # 3
python3 federation.py          # 18
python3 consensus.py           # 6, historical
python3 noeud.py --verifier    # full replay of the testnet: must end with « aucun refus »
python3 docs/banniere.py       # redraws the banners, 2 checks
cd atelier && npm ci && npm run typecheck && npm test && npm run build
npm run veillee-bot 60         # the vigil bot: three policies, a reading of the leaf budget
npm run dev                    # http://localhost:8080
```

Tests are plain `assert` and `print`, no framework. Every validation rule comes with a check that violates it. Every format shared by Python and TypeScript has a family in `vecteurs.json`.

## 14. Documents

| Document | What it holds |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | the project in one file: what it is, what never changes, how to verify, in what order to advance |
| [`docs/FEUILLE_DE_ROUTE.md`](docs/FEUILLE_DE_ROUTE.md) | the roadmap and every decision, chantier by chantier |
| [`docs/BIBLE_VEILLEE.md`](docs/BIBLE_VEILLEE.md) | the design bible of the Vigil: the key as life, the day, the bag, the proof, the ghosts, the risks |
| [`docs/PROMPT_ROGUELIKE_XMSS.md`](docs/PROMPT_ROGUELIKE_XMSS.md) | the prompt that fixed the identity of the game on what was already written |
| [`docs/SPEC_TOUR.md`](docs/SPEC_TOUR.md), [`docs/SPEC_PENDULE.md`](docs/SPEC_PENDULE.md) | the Tower (hosts, secrets, elixirs, capsules, seals) and the pendulum |
| [`docs/SPEC_SYBIL.md`](docs/SPEC_SYBIL.md) | one player, not an army: what is proven, what is costly, what is free |
| [`docs/SPEC_AUDIT_COFFRES.md`](docs/SPEC_AUDIT_COFFRES.md) | the 3D vault: tiers, palettes, ornaments |
| [`docs/SPEC_FORUM.md`](docs/SPEC_FORUM.md), [`docs/SPEC_BROUILLARD.md`](docs/SPEC_BROUILLARD.md), [`docs/ETUDE_ARBRE_VISITE.md`](docs/ETUDE_ARBRE_VISITE.md) | proposals not yet built: the realm's forum, the mist of the lairs, the visit tree |
| [`docs/LORE_CHAMBRE.md`](docs/LORE_CHAMBRE.md), [`docs/TRANSPOSITION_EIDOLON.md`](docs/TRANSPOSITION_EIDOLON.md) | the Chamber of Genesis and the rule of transposition: names and numbers, never power |
| [`docs/HANDOVER_RELIQUES_QR.md`](docs/HANDOVER_RELIQUES_QR.md) | relics: sealing, recovering, animating |
| [`veillees/README.md`](veillees/README.md) | how a vigil proof is deposited and judged |

## 15. What this repository is not

- **No peer network.** No peers, no real fork resolution: the testnet is one node on a cron.
- **No hardened key store.** The seed is plaintext in the file.
- **No external audit.** WOTS+, XMSS and the Merkle tree are in-house implementations written from RFC 8391, without official vectors.
- **A federation is not trustless.** `n` known signers can collude. Governance is the open question, not cryptography.
- **The judge does not know whose coin it is.** A vigil proof shows that a run happened on an unspent coin, not that the coin belongs to the depositor; that is proven by spending it.
- **Regulatory frame.** Prototyping is free; issuing and distributing a public token is not (MiCA in the EU). The eidôlon has no value.

## 16. Licence

[Apache License 2.0](LICENSE). Copyright 2026 Jeremy Zgonec.
