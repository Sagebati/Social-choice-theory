# Who Really Won?

A playable guide to voting systems and how to rig them, built on a Rust library
of social choice theory.

* **`crates/social-choice`**: the library. Fifteen voting methods, head-to-head
  (Condorcet) analysis, fairness criteria with counterexample search,
  manipulation search, a brute-force Arrow's theorem checker and the spatial
  "opinion map" model.
* **`backend`**: an [Axum](https://github.com/tokio-rs/axum) HTTP API over the
  library, compiled to WebAssembly and run as a Cloudflare Worker with
  [`workers-rs`](https://github.com/cloudflare/workers-rs).
* **`frontend`**: a Vue 3 explorable in the spirit of Nicky Case's *The
  Evolution of Trust*: a full-screen slide deck on one town square, where you
  bet on each count and watch ballots fly, piles move and faces react. It comes
  with a sandbox, a rigging handbook and a theorem lab.

Every number on the page is computed by the Worker, not looked up. The prose
version of the guide is in [`docs/rigging-guide.md`](docs/rigging-guide.md)
(in French: [`docs/rigging-guide.fr.md`](docs/rigging-guide.fr.md)).

The site speaks **English and French** (*Qui a vraiment gagné ?*). It follows
the browser's language, the EN/FR switch in the header changes it, and a link
with `?lang=fr` opens it in French. The API writes its explanations in the
same language. How the translations are organised, and how to add a language,
is in [`frontend/src/locales/README.md`](frontend/src/locales/README.md); the
French terms are in [`docs/glossary-fr.md`](docs/glossary-fr.md).

## The journey

The whole journey follows one town. Riverton is electing a mayor, and the same
five groups of voters (30 people) vote in every chapter; only the counting rule
changes, and with it the mayor.

| Group | Voters | Ranking |
| --- | --- | --- |
| Lucas, hardware store | 9 | Duck > Manu > Melon > Poutine > Cuauhtémoc |
| Léo, bike courier | 7 | Cuauhtémoc > Manu > Melon > Poutine > Duck |
| Aïda, parent of two | 6 | Melon > Poutine > Manu > Cuauhtémoc > Duck |
| Clélia, night-shift nurse | 5 | Poutine > Melon > Duck > Cuauhtémoc > Manu |
| Robinson, retired city clerk | 3 | Manu > Poutine > Cuauhtémoc > Melon > Duck |

The journey is a full-screen slide deck played on Riverton's town square, in
the spirit of *The Evolution of Trust*: the words sit inside the scene
(captions, labels, the voters' speech bubbles, a stamp for each lesson), and
every count is something you watch happen. Before each count you bet on the
winner; a board keeps score.

Each system opens with a short panel on how it works. After each count, a
panel names what went wrong and the idea Riverton tries next, so every flaw
motivates the next system: one mark elects the candidate most voters rank
last, so the town adds a runoff; the runoff brings back the lesser evil in
round one, so it lets voters rank everyone; and so on. When a group cheats,
its spokesperson thinks the tactic through out loud, and the panel names and
defines it (the lesser evil, burying, bullet voting).

| # | Slide | What happens | Mayor |
| --- | --- | --- | --- |
| 1 | Riverton elects a mayor | The five candidates walk on | |
| 2 | Five neighbours, five opinions | The spokespeople and their rankings; tap a face to hear why | |
| 3 | Each one speaks for a group | Each spokesperson's group fills in: 30 voters | |
| 4 | The game | Six counts to bet on | |
| 5 | One mark | Ballots fly into piles under the majority line | Duck |
| 6 | The lesser evil (vote utile) | Léo's group marks Manu instead of Cuauhtémoc | Manu |
| 7 | Two rounds | The top two meet; the other ballots move to the finalist each voter prefers | Cuauhtémoc |
| 8 | The lesser evil, in round one | Robinson's group marks Poutine in round one and puts him in the runoff | Poutine |
| 9 | Instant runoff | The smallest pile is knocked out, round after round | Poutine |
| 10 | Borda points | Coins rain into jars | Melon |
| 11 | Burying | Robinson's group moves Melon to last; three coins change jars | Manu |
| 12 | Head to head | The crowd splits for each of the ten duels; arrows build the duel map | Manu |
| 13 | Approval | You tick your own ballot, each group ticks its top two, then Lucas's group ticks only Duck and it backfires | Manu, then Poutine |
| 14 | Same voters, five mayors | Every count's winner, your bets, and Arrow's theorem | |

Who wins and by how much comes from the Worker; the stage only shows which
ballot goes where (`frontend/src/stage`). The opinion map, Yee diagrams,
criteria and theorems live in the sandbox, the rigging handbook and the lab.

## The library

```rust
use social_choice::{Election, Method, PairwiseMatrix};
use social_choice::manipulation::{find_manipulations, find_spoilers};

// 40 voters rank Ada > Bea > Cal, 35 rank Bea > Cal > Ada, 25 rank Cal > Bea > Ada.
let e = Election::named(3).with(40, &[0, 1, 2]).with(35, &[1, 2, 0]).with(25, &[2, 1, 0]);

assert_eq!(e.name(Method::Plurality.run(&e).winner), "Ada");
assert_eq!(PairwiseMatrix::new(&e).condorcet_winner(), Some(1)); // Bea
assert!(!find_spoilers(&e, Method::Plurality).is_empty());        // Cal spoils it
for m in find_manipulations(&e, Method::Plurality, 3) {
    println!("{}", m.explanation);
}
```

| Module | Contents |
| --- | --- |
| `election` | `Election`, `Ballot` (ranking, approvals and scores together), validation, restriction, compression |
| `methods` | Plurality, anti-plurality, two-round runoff, instant runoff, Coombs, Borda, agenda, Copeland, minimax, Schulze, ranked pairs, approval, score, STAR, dictatorship. Each returns a winner, a social ranking, the count round by round and whether a tie-break was needed. |
| `pairwise` | Pairwise matrix, Condorcet winner and loser, Smith set, shortest majority cycle |
| `criteria` | Majority, Condorcet winner/loser, Pareto, monotonicity, participation, IIA, independence of clones: the compliance table and a search that finds and shrinks counterexamples |
| `manipulation` | Every profitable lie for every bloc of voters, classified as compromising, burying, push-over, bullet voting or exaggeration; spoiler detection; manipulability rates |
| `arrow` | Checks any rule against every profile of 2–4 voters over 3 candidates and reports which of Arrow's conditions fail, with the most telling counterexample |
| `spatial` | Voters and candidates on a map, crowds, strategic voters, Yee diagrams |
| `scenarios`, `catalog` | Famous paradoxes and plain-language descriptions of every method and how to game it |

All of it is deterministic: ties go to the lowest candidate index and every
outcome says whether a tie-break was used.

The test suite cross-checks the theory: for each of the 15 × 8 method/criterion
pairs, it searches random elections and requires a counterexample for every
"fails" in the table and none for any "passes". It also checks every claim made
in the scenario stories and confirms Arrow's theorem for every rule.

## Running it locally

You need Rust (with the `wasm32-unknown-unknown` target) and Node 20.19+ or 22.12+.

```sh
rustup target add wasm32-unknown-unknown
npm --prefix frontend install
npm --prefix backend install

# Terminal 1: the API, built to wasm and served by wrangler on :8787
cd backend && npx wrangler dev

# Terminal 2: the front end with hot reload on :5173, proxying /api to :8787
cd frontend && npm run dev
```

`wrangler dev` builds the Worker with `worker-build` (installed by the build
command on first run) and serves `frontend/dist` as static assets, so run
`npm --prefix frontend run build` once first, or use the Vite dev server as
above.

Tests:

```sh
cargo test --workspace             # library and API (the API router is tested natively)
npm --prefix frontend test          # front-end unit tests
```

## Deploying to Cloudflare

```sh
npm --prefix frontend run build     # writes frontend/dist
cd backend && npx wrangler deploy   # builds the Worker and uploads it with the assets
```

One Worker serves everything: requests to `/api/*` run the Rust code, and every
other path is served from the static assets with a single-page-app fallback
(`backend/wrangler.toml`).

**CPU limits.** Most requests take well under a millisecond of CPU. The heavier
ones (Yee diagrams, the manipulability sweep and some counterexample searches)
can need tens to hundreds of milliseconds, more than the free plan's 10 ms per
request. On a paid plan, uncomment the `[limits]` block in `wrangler.toml`.

## API

All endpoints take and return JSON. Elections may omit approvals and scores;
they are derived from the rankings (approve the top half, score linearly).
Every endpoint accepts `?lang=en` (the default) or `?lang=fr` and writes all
its text (descriptions, round notes, explanations, errors) in that language.

| Endpoint | Body | Returns |
| --- | --- | --- |
| `GET /api/health` | | `{ ok, version }` |
| `GET /api/methods` | | Every method: description, where it is used, how to rig it, criteria |
| `GET /api/criteria` | | Every fairness criterion |
| `GET /api/scenarios` | | The famous elections behind the journey |
| `POST /api/elect` | `{ election, methods? }` | Outcomes, spoilers and the pairwise summary |
| `POST /api/spatial` | `{ model, methods? }` | Voter positions, per-voter ballots, outcomes, pairwise summary |
| `POST /api/yee` | `{ model, method, resolution?, spread?, count? }` | Winner of each cell of a Yee diagram |
| `POST /api/manipulate` | `{ election, method, limit? }` | Honest outcome, profitable lies, spoilers |
| `POST /api/manipulability` | `{ methods?, candidates?, samples?, seed? }` | Share of random elections that can be manipulated |
| `POST /api/counterexample` | `{ method, criterion, seed?, attempts? }` | Whether the method satisfies the criterion, and a counterexample if not |
| `POST /api/arrow` | `{ rule, voters? }` | Arrow's conditions checked on every profile |
| `POST /api/random` | `{ candidates?, groups?, seed? }` | A random election |

```sh
curl -s localhost:8787/api/elect -H 'content-type: application/json' -d '{
  "election": { "candidates": ["Ada", "Bea", "Cal"],
                "ballots": [{ "weight": 40, "ranking": [0, 1, 2] },
                            { "weight": 35, "ranking": [1, 2, 0] },
                            { "weight": 25, "ranking": [2, 1, 0] }] },
  "methods": ["plurality", "irv", "schulze"] }'
```

## Layout

```
crates/social-choice/   the Rust library
backend/                Axum router (src/api.rs) + Worker entry point (src/lib.rs), wrangler.toml
frontend/               Vue 3 + Vite + TypeScript
  src/stage/            the journey's town square: TownStage, its animations and ballot plans
  src/cast.ts           Riverton's candidates and voter groups
  src/pages/            sandbox, rigging handbook, theorem lab
  src/components/       tallies, duel diagram, opinion map, Arrow lab, …
  src/locales/          English and French messages
docs/rigging-guide.md   the written guide
docs/glossary-fr.md     the French terms
```
