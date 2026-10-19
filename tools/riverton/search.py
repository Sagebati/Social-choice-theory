"""Riverton, as a CP-SAT problem: the same constraints as riverton.mzn.

    pip install ortools
    python3 tools/riverton/search.py            # 32 voters, the town the journey uses
    python3 tools/riverton/search.py 28 34      # try 28 to 34 voters

Each group picks one of the 24 rankings that start with its favourite; y[g][p]
is the group's size when it picks ranking p and 0 otherwise, so every count the
journey makes is a linear sum of the y.
"""

import itertools
import sys

from ortools.sat.python import cp_model

C, MA, ME, P, D = range(5)
NAME = ['Cuauhtémoc', 'Manu', 'Melon', 'Poutine', 'Duck']
LUCAS, LEO, AIDA, CLELIA, ROBINSON = range(5)
WHO = ['Lucas', 'Léo', 'Aïda', 'Clélia', 'Robinson']
CANDS = range(5)
GROUPS = range(5)
ALL = [list(r) for r in itertools.permutations(CANDS)]
# Each spokesperson's favourite: the shopkeeper backs Duck, the cyclist Cuauhtémoc, the
# parent Melon, the bus commuter Poutine, the retired clerk Manu. Below that, anything goes.
FAV = [D, C, ME, P, MA]
RANKS = [[r for r in ALL if r[0] == FAV[g]] for g in GROUPS]


def solve(total, distinct_sizes=True, seconds=120, leo_hates_duck=False, five_mayors=True, every=False):
    md = cp_model.CpModel()
    size = [md.NewIntVar(1, total, f'size{g}') for g in GROUPS]
    md.Add(sum(size) == total)
    pick = [[md.NewBoolVar(f'x{g}_{p}') for p in range(len(RANKS[g]))] for g in GROUPS]
    y = [[md.NewIntVar(0, total, f'y{g}_{p}') for p in range(len(RANKS[g]))] for g in GROUPS]
    for g in GROUPS:
        md.AddExactlyOne(pick[g])
        for p in range(len(RANKS[g])):
            md.Add(y[g][p] == size[g]).OnlyEnforceIf(pick[g][p])
            md.Add(y[g][p] == 0).OnlyEnforceIf(pick[g][p].Not())

    def count(test, groups=GROUPS):
        """Voters in `groups` whose ranking passes test(g, ranking)."""
        return sum(y[g][p] for g in groups for p, r in enumerate(RANKS[g]) if test(g, r))

    def m(a, b):
        return count(lambda g, r: r.index(a) < r.index(b))

    def beats(a, b):
        return m(a, b) > m(b, a)

    def first(c):
        """Round-one votes for c."""
        return count(lambda g, r: r[0] == c)

    def either(options):
        flags = {o: md.NewBoolVar(f'opt{o}') for o in options}
        md.AddExactlyOne(flags.values())
        return flags

    # Every candidate leads somewhere, and no two tie in round one.
    for c in CANDS:
        md.Add(first(c) >= 1)
    if distinct_sizes:
        for a in CANDS:
            for b in CANDS:
                if a < b:
                    md.Add(first(a) != first(b))
    # 1. One round: Duck has the most votes.
    for c in CANDS:
        if c != D:
            md.Add(first(D) > first(c))
    # The lesser evil: a group whose favourite can't win marks its second choice, Manu,
    # and Manu wins. (Léo's cyclists ranking Duck last leaves no Riverton up to 34 voters.)
    if leo_hates_duck:
        for p, r in enumerate(RANKS[LEO]):
            if r[4] != D:
                md.Add(pick[LEO][p] == 0)
    utile = either((LEO, AIDA, CLELIA))
    for g, on in utile.items():
        md.AddBoolOr([on.Not()] + [pick[g][p] for p, r in enumerate(RANKS[g]) if r[1] == MA])
        for c in CANDS:
            if c != MA:
                moved = size[g] if c == FAV[g] else 0
                md.Add(first(MA) + size[g] > first(c) - moved).OnlyEnforceIf(on)
    # 2. Two rounds: Duck and Cuauhtémoc go through, nobody has a majority, Cuauhtémoc wins.
    for c in (MA, ME, P):
        md.Add(first(C) > first(c))
    md.Add(2 * first(D) <= total)
    md.Add(beats(C, D))
    # The push-over: k of Lucas's group mark a weak candidate x in round one; Duck and x
    # go through instead of Cuauhtémoc, and Duck beats x in the runoff.
    k = md.NewIntVar(1, total, 'k')
    md.Add(k < size[LUCAS])
    push = either((ME, P))
    for x, on in push.items():
        for c in CANDS:
            if c not in (D, x):
                md.Add(first(D) - k > first(c)).OnlyEnforceIf(on)
                md.Add(first(x) + k > first(c)).OnlyEnforceIf(on)
        md.Add(2 * (first(x) + k) <= total).OnlyEnforceIf(on)
        md.Add(m(D, x) > m(x, D)).OnlyEnforceIf(on)
    # 3. Instant runoff: one of the 120 elimination orders, the smallest pile out each round.
    orders = list(itertools.permutations(CANDS, 4))
    order = either(range(len(orders)))
    irv_winner = {}
    for o, on in order.items():
        out = orders[o]
        (winner,) = [c for c in CANDS if c not in out]
        irv_winner[o] = winner
        if winner not in (ME, P) and five_mayors:
            md.Add(on == 0)
            continue
        for rnd in range(4):
            gone = set(out[:rnd])

            def tally(c, gone=gone):
                return count(lambda g, r: next(x for x in r if x not in gone) == c)

            for c in CANDS:
                if c not in gone and c != out[rnd]:
                    md.Add(tally(out[rnd]) < tally(c)).OnlyEnforceIf(on)
    # 4. Borda: 4 points for a first place down to 0; Melon or Poutine wins.
    def borda(c):
        return sum(y[g][p] * (4 - r.index(c)) for g in GROUPS for p, r in enumerate(RANKS[g]))

    bwin = either((ME, P))
    for w, on in bwin.items():
        for c in CANDS:
            if c != w:
                md.Add(borda(w) > borda(c)).OnlyEnforceIf(on)
        # Five different mayors: the instant runoff elects the other one.
        for o, o_on in order.items():
            if irv_winner[o] == w and five_mayors:
                md.AddBoolOr([on.Not(), o_on.Not()])
        # Burying: Robinson's group moves the Borda winner to last, and Manu wins.
        for p, r in enumerate(RANKS[ROBINSON]):
            buried = [c for c in r if c != w] + [w]

            def after(c, p=p, r=r, buried=buried):
                return borda(c) - y[ROBINSON][p] * (4 - r.index(c)) + y[ROBINSON][p] * (4 - buried.index(c))

            for c in CANDS:
                if c != MA:
                    md.Add(after(MA) > after(c)).OnlyEnforceIf([on, pick[ROBINSON][p]])
    # 5. Head to head: Manu beats every rival.
    for c in CANDS:
        if c != MA:
            md.Add(beats(MA, c))
    # 6. Approval: every group ticks its top two, and Manu wins.
    def appr(c, bullet=False):
        return count(lambda g, r: r.index(c) == 0 or (r.index(c) == 1 and not (bullet and g == LUCAS)))

    for c in CANDS:
        if c != MA:
            md.Add(appr(MA) > appr(c))
    # The bullet vote: Lucas's group ticks only Duck, and someone Lucas likes less than Manu wins.
    bw = either((C, ME, P))
    for w, on in bw.items():
        for c in CANDS:
            if c != w:
                md.Add(appr(w, True) > appr(c, True)).OnlyEnforceIf(on)
        for p, r in enumerate(RANKS[LUCAS]):
            if r.index(w) < r.index(MA):
                md.AddBoolOr([on.Not(), pick[LUCAS][p].Not()])
    # The story: as many voters as possible rank Duck last.
    last = count(lambda g, r: r[4] == D)

    def read(v):
        ranks = [RANKS[g][next(p for p in range(len(RANKS[g])) if v(pick[g][p]))] for g in GROUPS]
        return {
            'utile': WHO[next(g for g, on in utile.items() if v(on))],
            'sizes': [v(s) for s in size],
            'ranks': ranks,
            'push': (v(k), NAME[next(x for x, on in push.items() if v(on))]),
            'irv': [NAME[c] for c in orders[next(o for o, on in order.items() if v(on))]],
            'last': v(last),
        }

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = seconds
    if every:
        # Every Riverton (distinct rankings and sizes), not just the best one.
        found = {}

        class Collect(cp_model.CpSolverSolutionCallback):
            def on_solution_callback(self):
                r = read(self.Value)
                found[(tuple(r['sizes']), tuple(map(tuple, r['ranks'])))] = r

        solver.parameters.enumerate_all_solutions = True
        solver.Solve(md, Collect())
        return list(found.values())
    # Then, between equals, Clélia's night-shift nurse ranks Manu last: he cut the night buses.
    clelia = sum(pick[CLELIA][p] for p, r in enumerate(RANKS[CLELIA]) if r[4] == MA)
    md.Maximize(100 * last + clelia)
    solver.parameters.num_workers = 4
    status = solver.Solve(md)
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        print('   ', solver.StatusName(status), file=sys.stderr)
        return None
    return {**read(solver.Value), 'optimal': status == cp_model.OPTIMAL}


if __name__ == '__main__':
    lo = int(sys.argv[1]) if len(sys.argv) > 1 else 32
    hi = int(sys.argv[2]) if len(sys.argv) > 2 else lo
    for total in range(lo, hi + 1):
        res = solve(total)
        if not res:
            print(total, 'voters: no Riverton')
            continue
        print(f"{total} voters, Duck last on {res['last']} ballots{'' if res['optimal'] else ' (not proven best)'}")
        for g in GROUPS:
            print(f"  {WHO[g]:9} ×{res['sizes'][g]:<2} " + ' > '.join(NAME[c] for c in res['ranks'][g]))
        print(f"  lesser evil: {res['utile']}'s group marks Manu")
        print(f"  push-over: {res['push'][0]} of Lucas's group mark {res['push'][1]}")
        print(f"  instant runoff, out in order: {', '.join(res['irv'])}")
