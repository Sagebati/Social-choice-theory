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
  Evolution of Trust*: seventeen short steps, each adding one new idea and one
  new tool, each with something to predict or a puzzle to solve before the
  lesson appears. It comes with a sandbox, a rigging handbook and a theorem lab.

Every number on the page is computed by the Worker, not looked up. The prose
version of the guide is in [`docs/rigging-guide.md`](docs/rigging-guide.md).

## The journey

| Chapter | Steps | What you play with |
| --- | --- | --- |
| One person, one mark | 1–4 | The opinion map, plurality, the spoiler effect, lesser-evil (compromise) voting |
| Rank everyone | 5–7 | Instant runoff round by round, the centre squeeze and Yee diagrams, winning by losing (non-monotonicity, push-over) |
| Points for everyone | 8–9 | Borda count; burying and teaming, plus a machine that finds profitable lies |
| Head to head | 10–12 | The Condorcet winner, the Condorcet paradox and agenda rigging, burying under Condorcet methods |
| Grade, don't rank | 13–14 | Approval voting and where to draw the line; score vs STAR under exaggeration |
| The impossible ballot | 15–16 | Arrow's theorem checked on all 216 elections; Gibbard–Satterthwaite measured |
| Your turn | 17 | Cheat sheet, then the sandbox, handbook and lab |

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
  src/journey/          the seventeen steps
  src/pages/            sandbox, rigging handbook, theorem lab
  src/components/       opinion map, tallies, duel diagram, ballot editor, Arrow lab, …
docs/rigging-guide.md   the written guide
```
