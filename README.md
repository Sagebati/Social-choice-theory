# Who Really Won?

A playable guide to voting systems and how to rig them, built on a Rust library
of social choice theory.

* **`crates/social-choice`**: the library. Fifteen voting methods, head-to-head
  (Condorcet) analysis, fairness criteria with counterexample search,
  manipulation search, a brute-force Arrow's theorem checker and the spatial
  "opinion map" model.
* **`crates/social-choice-wasm`**: the library's JSON API, compiled to
  WebAssembly with [`wasm-bindgen`](https://github.com/wasm-bindgen/wasm-bindgen)
  and run in the browser, in Web Workers.
* **`frontend`**: a Vue 3 explorable in the spirit of Nicky Case's *The
  Evolution of Trust*: a full-screen slide deck on one town square, where you
  bet on each count and watch ballots fly, piles move and faces react. It comes
  with a sandbox, a rigging handbook and a theorem lab.

Every number on the page is computed in the reader's browser, not looked up,
and the whole site is static files. The prose
version of the guide is in [`docs/rigging-guide.md`](docs/rigging-guide.md)
(in French: [`docs/rigging-guide.fr.md`](docs/rigging-guide.fr.md)).

The site speaks **English and French** (*Qui a vraiment gagné ?*). It follows
the browser's language, the EN/FR switch in the header changes it, and a link
with `?lang=fr` opens it in French. The library writes its explanations in the
same language. How the translations are organised, and how to add a language,
is in [`frontend/src/locales/README.md`](frontend/src/locales/README.md); the
French terms are in [`docs/glossary-fr.md`](docs/glossary-fr.md).

## The journey

The whole journey follows one town. Riverton is electing a mayor, and the same
five groups of voters (32 people) vote in every chapter; only the counting rule
changes, and with it the mayor.

| Group | Voters | Ranking |
| --- | --- | --- |
| Lucas, hardware store | 10 | Duck > Manu > Poutine > Melon > Cuauhtémoc |
| Léo, bike courier | 7 | Cuauhtémoc > Poutine > Manu > Duck > Melon |
| Aïda, parent of two | 6 | Melon > Manu > Poutine > Cuauhtémoc > Duck |
| Clélia, night-shift nurse | 4 | Poutine > Cuauhtémoc > Duck > Melon > Manu |
| Robinson, retired city clerk | 5 | Manu > Poutine > Melon > Cuauhtémoc > Duck |

Manu beats every rival one on one. Below him, Melon beats Cuauhtémoc, who beats
Duck, who beats Melon: the circle that lets Duck's voters win two rounds by
voting for Melon. These ballots were found by stating every slide's story as a
constraint: [`tools/riverton`](tools/riverton) holds the model, in MiniZinc and
for OR-Tools.

The journey is a full-screen slide deck played on Riverton's town square, in
the spirit of *The Evolution of Trust*: the words sit inside the scene
(captions, labels, the voters' speech bubbles, a stamp for each lesson), and
every count is something you watch happen. Like slides, it goes on when you tap
(or press →, Space or Enter) wherever there is text to read, and plays by
itself otherwise; *Skip* jumps to the next slide. Before each count you bet on
the winner; a board keeps score.

Each system, under the name Wikipedia gives it, opens with a short panel on
how it works. After each count, a panel names what went wrong and the idea
Riverton tries next, so every flaw motivates the next system: first past the
post elects a candidate most voters would beat, so the town adds a runoff; the
runoff can be gamed by voting for a weak rival in round one, so it lets voters
rank everyone; and so on. When a group cheats, its spokesperson thinks the
tactic through out loud, and the panel names and defines it (the lesser evil,
the push-over, burying, bullet voting).

| # | Slide | What happens | Mayor |
| --- | --- | --- | --- |
| 1 | Riverton elects a mayor | The five candidates walk on | |
| 2 | Five neighbours, five opinions | The spokespeople and their rankings; tap a face to hear why | |
| 3 | Each one speaks for a group | Each spokesperson's group fills in: 32 voters | |
| 4 | The game | Six counts to bet on | |
| 5 | First past the post | Ballots fly into piles under the majority line | Duck |
| 6 | The lesser evil (vote utile) | Aïda's group marks Manu instead of Melon | Manu |
| 7 | Two-round system | The top two meet; the other ballots move to the finalist each voter prefers | Cuauhtémoc |
| 8 | The push-over | Two of Lucas's group mark Melon in round one, so Duck meets her in the runoff, and beats her | Duck |
| 9 | Instant-runoff voting | The smallest pile is knocked out, round after round; Manu goes out second | Melon |
| 10 | Borda count | Coins rain into jars | Poutine |
| 11 | Burying | Robinson's group moves Poutine to last; his coins go to the three below him | Manu |
| 12 | Condorcet method | The crowd splits for each of the ten duels; arrows build the duel map, the circle in red | Manu |
| 13 | Approval voting | You tick your own ballot, each group ticks its top two, then Lucas's group ticks only Duck and it backfires | Manu, then Poutine |
| 14 | Same voters, five mayors | Every count's winner, your bets, and Arrow's and Gibbard's theorems | |

Who wins and by how much comes from the library; the stage only shows which
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

You need Rust (with the `wasm32-unknown-unknown` target),
[`wasm-bindgen-cli`](https://crates.io/crates/wasm-bindgen-cli) at the same
version as the `wasm-bindgen` crate in `Cargo.lock`, and Node 20.19+ or 22.12+.

```sh
rustup target add wasm32-unknown-unknown
cargo install wasm-bindgen-cli --version 0.2.129 --locked
npm --prefix frontend install

npm --prefix frontend run dev       # http://localhost:5173 with hot reload
```

`npm run dev`, `build` and `test` first run `npm run wasm`
(`frontend/scripts/build-wasm.mjs`): it compiles `crates/social-choice-wasm`
in release mode and writes the module and its bindings to `frontend/wasm/`
(not committed). After changing the Rust code, run `npm --prefix frontend run
wasm` again and the page reloads. To type-check on its own
(`npx vue-tsc --noEmit`), build the module once first.

To try the production build from a plain static server:

```sh
npm --prefix frontend run build     # writes frontend/dist
npm --prefix frontend run preview   # http://localhost:4173
```

Tests:

```sh
cargo test --workspace              # the library and its JSON API, natively
npm --prefix frontend test          # front-end unit tests, and the built wasm module
```

## Deploying

`frontend/dist` is the whole site: any static host works, as long as it
serves `index.html` for the router's paths (`/learn/3`, `/sandbox`, `/lab`…)
and `.wasm` files as `application/wasm`.

On Cloudflare it is a Worker with static assets and no script
(`frontend/wrangler.toml`), with the single-page-app fallback and long-lived
caching for the hashed files under `/assets` (`frontend/public/_headers`):

```sh
npm --prefix frontend run deploy    # builds, then `wrangler deploy`
```

**Size and speed.** The module is about 750 KB, 220 KB gzipped and 170 KB
with Brotli; it is fetched once and compiled while it downloads. The library
runs in two Web Workers (`frontend/src/engine`): one for quick calls (the
catalogue, counting an election, the opinion map) and one for slow ones (Yee
diagrams, manipulation searches, counterexamples, Arrow's theorem and the
manipulability sweep, which takes about a second for four candidates), so
neither dragging nor the journey's animations ever wait for a computation.

## API

The front end talks to the library through `api` (`frontend/src/api.ts`),
which sends each call to a worker as JSON. The same functions are the Rust
crate's public API: `social_choice_wasm::api::handle(endpoint, lang, body)`
takes and returns JSON, and the browser calls it through the exported
`call(endpoint, lang, body)`. Elections may omit approvals and scores; they
are derived from the rankings (approve the top half, score linearly). Every
call takes a language, `en` or `fr` (also as a regional tag like `fr-FR`;
anything else is English), and writes all its text (descriptions, round
notes, explanations, errors) in it. Errors are thrown with that message.

| Endpoint | Body | Returns |
| --- | --- | --- |
| `health` | | `{ ok, version }` |
| `methods` | | Every method: description, where it is used, how to rig it, criteria |
| `criteria` | | Every fairness criterion |
| `scenarios` | | The famous elections behind the journey |
| `elect` | `{ election, methods? }` | Outcomes, spoilers and the pairwise summary |
| `spatial` | `{ model, methods? }` | Voter positions, per-voter ballots, outcomes, pairwise summary |
| `yee` | `{ model, method, resolution?, spread?, count? }` | Winner of each cell of a Yee diagram |
| `manipulate` | `{ election, method, limit? }` | Honest outcome, profitable lies, spoilers |
| `manipulability` | `{ methods?, candidates?, samples?, seed? }` | Share of random elections that can be manipulated |
| `counterexample` | `{ method, criterion, seed?, attempts? }` | Whether the method satisfies the criterion, and a counterexample if not |
| `arrow` | `{ rule, voters? }` | Arrow's conditions checked on every profile |
| `random` | `{ candidates?, groups?, seed? }` | A random election |

```rust
use social_choice::Lang;
use social_choice_wasm::api::handle;

let body = r#"{
  "election": { "candidates": ["Ada", "Bea", "Cal"],
                "ballots": [{ "weight": 40, "ranking": [0, 1, 2] },
                            { "weight": 35, "ranking": [1, 2, 0] },
                            { "weight": 25, "ranking": [2, 1, 0] }] },
  "methods": ["plurality", "irv", "schulze"] }"#;
let json = handle("elect", Lang::En, body).unwrap();
```

## Layout

```
crates/social-choice/       the Rust library
crates/social-choice-wasm/  its JSON API (src/api.rs) and the WebAssembly export (src/lib.rs)
frontend/                   Vue 3 + Vite + TypeScript, wrangler.toml for the static deploy
  scripts/build-wasm.mjs    builds the wasm module into frontend/wasm/
  src/engine/               loads the module and runs it in Web Workers
  src/stage/                the journey's town square: TownStage, its animations and ballot plans
  src/cast.ts               Riverton's candidates and voter groups
  src/pages/                sandbox, rigging handbook, theorem lab
  src/components/           tallies, duel diagram, opinion map, Arrow lab, …
  src/locales/              English and French messages
docs/rigging-guide.md       the written guide
docs/glossary-fr.md         the French terms
```
