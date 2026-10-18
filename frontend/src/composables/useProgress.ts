import { reactive, watch } from 'vue'

// What the reader has done in the journey: solved challenges and the furthest
// step reached. A convenience only, so storage failures are ignored.
interface Progress {
  solved: Record<string, true>
  /** Puzzles the reader skipped with "just show me". */
  revealed: Record<string, true>
  furthest: number
}

const KEY = 'who-really-won/progress'

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Progress>
      return { solved: parsed.solved ?? {}, revealed: parsed.revealed ?? {}, furthest: parsed.furthest ?? 0 }
    }
  } catch {
    // Private mode or blocked storage: start fresh.
  }
  return { solved: {}, revealed: {}, furthest: 0 }
}

const progress = reactive<Progress>(load())

watch(
  progress,
  (value) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(value))
    } catch {
      // Nothing to do: progress simply won't survive a reload.
    }
  },
  { deep: true },
)

export function useProgress() {
  return {
    progress,
    solve(id: string) {
      progress.solved[id] = true
    },
    isSolved(id: string) {
      return progress.solved[id] === true
    },
    reveal(id: string) {
      progress.revealed[id] = true
    },
    /** Solved, or skipped: either way the lesson can be shown. */
    isOpen(id: string) {
      return progress.solved[id] === true || progress.revealed[id] === true
    },
    reach(step: number) {
      progress.furthest = Math.max(progress.furthest, step)
    },
    reset() {
      progress.solved = {}
      progress.revealed = {}
      progress.furthest = 0
    },
  }
}
