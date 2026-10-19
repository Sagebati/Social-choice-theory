% Riverton: five groups of voters and five candidates, chosen so that every
% slide of the journey tells its story with the same ballots.
%
%   minizinc --solver gecode tools/riverton/riverton.mzn
%   minizinc --solver cp-sat -D 'T = 32;' tools/riverton/riverton.mzn
%
% tools/riverton/search.py states the same problem for OR-Tools CP-SAT.

include "globals.mzn";

int: T = 32;                                   % voters in town
bool: distinct_sizes = true;                   % no ties in round one
bool: leo_hates_duck = false;                  % Léo's cyclists rank Duck last (no Riverton up to 34 voters)

set of int: CAND = 1..5;
int: C = 1;  int: MA = 2;  int: ME = 3;  int: P = 4;  int: D = 5;
array[CAND] of string: name = ["Cuauhtémoc", "Manu", "Melon", "Poutine", "Duck"];

set of int: GRP = 1..5;
int: LUCAS = 1;  int: LEO = 2;  int: AIDA = 3;  int: CLELIA = 4;  int: ROBINSON = 5;
array[GRP] of string: who = ["Lucas", "Léo", "Aïda", "Clélia", "Robinson"];
array[GRP] of CAND: fav = [D, C, ME, P, MA];
array[CAND] of GRP: fan = [LEO, ROBINSON, AIDA, CLELIA, LUCAS];   % the group whose favourite c is

% ---- The voters.
array[GRP] of var 1..T: size;
array[GRP, CAND] of var 1..5: pos;             % where group g ranks c; 1 is the favourite
constraint sum(size) = T;
constraint forall(g in GRP)(all_different([pos[g, c] | c in CAND]) /\ pos[g, fav[g]] = 1);
constraint distinct_sizes -> all_different(size);

function var int: first(var CAND: c) = size[fan[c]];

% m[a, b]: voters who rank a above b.
array[CAND, CAND] of var 0..T: m;
constraint forall(a, b in CAND)(m[a, b] = sum(g in GRP)(size[g] * bool2int(pos[g, a] < pos[g, b])));

% ---- 1. One round: Duck has the most votes.
constraint forall(g in GRP where g != LUCAS)(size[LUCAS] > size[g]);

% ---- The lesser evil: a group whose favourite can't win marks its second
% choice, Manu, and Manu wins.
var {LEO, AIDA, CLELIA}: utile;
constraint pos[utile, MA] = 2;
constraint forall(c in CAND where c != MA)(
  first(MA) + size[utile] > first(c) - size[utile] * bool2int(c = fav[utile])
);

% ---- 2. Two rounds: Duck and Cuauhtémoc go through, nobody has a majority,
% and Cuauhtémoc wins the runoff.
constraint forall(g in {AIDA, CLELIA, ROBINSON})(size[LEO] > size[g]);
constraint 2 * size[LUCAS] <= T;
constraint m[C, D] > m[D, C];

% ---- The push-over: k of Lucas's group mark a weak candidate X in round one.
% Duck and X go through instead of Cuauhtémoc, and Duck beats X in the runoff.
var 1..T: k;
var {ME, P}: x;
constraint k < size[LUCAS];
constraint forall(c in CAND where c != D)(
  c != x -> (size[LUCAS] - k > first(c) /\ first(x) + k > first(c))
);
constraint 2 * (size[LUCAS] - k) <= T /\ 2 * (first(x) + k) <= T;
constraint m[D, x] > m[x, D];

% ---- 3. Instant runoff: four eliminations, the smallest pile each time.
array[1..4] of var CAND: out;
array[1..5, CAND] of var bool: active;
array[GRP, 1..4] of var CAND: top;             % the ballot's choice in each round
array[1..4, CAND] of var 0..T: tally;
constraint all_different(out);
constraint forall(c in CAND)(active[1, c]);
constraint forall(r in 1..4, c in CAND)(active[r + 1, c] <-> (active[r, c] /\ out[r] != c));
constraint forall(r in 1..4)(active[r, out[r]]);
constraint forall(g in GRP, r in 1..4)(
  active[r, top[g, r]] /\ forall(c in CAND)(active[r, c] -> pos[g, top[g, r]] <= pos[g, c])
);
constraint forall(r in 1..4, c in CAND)(tally[r, c] = sum(g in GRP)(size[g] * bool2int(top[g, r] = c)));
constraint forall(r in 1..4, c in CAND)(active[r, c] /\ c != out[r] -> tally[r, out[r]] < tally[r, c]);
var CAND: irv;
constraint active[5, irv];

% ---- 4. Borda: 4 points for a first place down to 0 for the last.
array[CAND] of var 0..4 * T: borda;
constraint forall(c in CAND)(borda[c] = sum(g in GRP)(size[g] * (5 - pos[g, c])));
var {ME, P}: bwin;
constraint forall(c in CAND where c != bwin)(borda[bwin] > borda[c]);

% ---- Burying: Robinson's group moves the Borda winner to last, and Manu wins.
array[CAND] of var 1..5: buried;
constraint forall(c in CAND)(
  buried[c] = if c = bwin then 5 elseif pos[ROBINSON, c] > pos[ROBINSON, bwin] then pos[ROBINSON, c] - 1 else pos[ROBINSON, c] endif
);
array[CAND] of var 0..4 * T: borda2;
constraint forall(c in CAND)(borda2[c] = borda[c] - size[ROBINSON] * (5 - pos[ROBINSON, c]) + size[ROBINSON] * (5 - buried[c]));
constraint forall(c in CAND where c != MA)(borda2[MA] > borda2[c]);

% ---- 5. Head to head: Manu beats every rival.
constraint forall(c in CAND where c != MA)(m[MA, c] > m[c, MA]);

% ---- 6. Approval: every group ticks its top two, and Manu wins.
array[CAND] of var 0..T: appr;
constraint forall(c in CAND)(appr[c] = sum(g in GRP)(size[g] * bool2int(pos[g, c] <= 2)));
constraint forall(c in CAND where c != MA)(appr[MA] > appr[c]);

% ---- The bullet vote: Lucas's group ticks only Duck, and someone Lucas likes
% less than Manu wins.
array[CAND] of var 0..T: bullet;
constraint forall(c in CAND)(bullet[c] = appr[c] - size[LUCAS] * bool2int(pos[LUCAS, c] = 2));
var CAND: bwin2;
constraint forall(c in CAND where c != bwin2)(bullet[bwin2] > bullet[c]);
constraint bwin2 != D /\ bwin2 != MA /\ pos[LUCAS, bwin2] > pos[LUCAS, MA];

% ---- Five different mayors.
constraint irv in {ME, P} /\ irv != bwin;

% ---- The story: as many voters as possible rank Duck last.
constraint leo_hates_duck -> pos[LEO, D] = 5;
var 0..T: last = sum(g in GRP)(size[g] * bool2int(pos[g, D] = 5));
% Then, between equals, Clélia's night-shift nurse ranks Manu last: he cut the night buses.
solve maximize 100 * last + bool2int(pos[CLELIA, MA] = 5);

output [
  "voters " ++ show(T) ++ ", Duck last on " ++ show(last) ++ " ballots\n",
  "lesser evil: " ++ who[fix(utile)] ++ "'s group marks Manu\n"
] ++ [
  who[g] ++ " ×" ++ show(size[g]) ++ ": " ++
  concat([name[c] ++ " " | r in 1..5, c in CAND where fix(pos[g, c]) = r]) ++ "\n" | g in GRP
] ++ [
  "push-over: " ++ show(k) ++ " of Lucas's group mark " ++ name[fix(x)] ++ "\n",
  "instant runoff out: " ++ show([name[fix(out[r])] | r in 1..4]) ++ " → " ++ name[fix(irv)] ++ "\n",
  "Borda " ++ show(borda) ++ " → " ++ name[fix(bwin)] ++ "; buried " ++ show(borda2) ++ "\n",
  "approval " ++ show(appr) ++ "; bullet " ++ show(bullet) ++ " → " ++ name[fix(bwin2)] ++ "\n",
];
