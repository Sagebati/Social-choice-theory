// A tiny animation engine for the town stage: one requestAnimationFrame loop
// for every tween on screen. Cancelling drops the pending tweens without ever
// resolving their promises, so a slide's script stops where it stands when the
// reader moves on, with nothing left to clean up.

interface Job {
  start: number
  dur: number
  frame: (t: number) => void
  resolve: () => void
}

export class Animator {
  private jobs: Job[] = []
  private raf = 0
  /** 0 when the reader prefers reduced motion: every tween jumps to its end. */
  private readonly speed: number

  constructor(reducedMotion: boolean) {
    this.speed = reducedMotion ? 0 : 1
  }

  get reduced(): boolean {
    return this.speed === 0
  }

  /** Calls `frame(t)` with t from 0 to 1 over `dur` ms, after `delay` ms. */
  animate(dur: number, frame: (t: number) => void, delay = 0): Promise<void> {
    const d = dur * this.speed
    const wait = delay * this.speed
    if (d <= 0 && wait <= 0) {
      frame(1)
      return Promise.resolve()
    }
    return new Promise((resolve) => {
      this.jobs.push({ start: performance.now() + wait, dur: Math.max(1, d), frame, resolve })
      if (!this.raf) this.raf = requestAnimationFrame(this.tick)
    })
  }

  sleep(ms: number): Promise<void> {
    return this.animate(ms, () => {})
  }

  /** Drops every pending tween; their scripts never resume. */
  cancel() {
    this.jobs = []
    if (this.raf) cancelAnimationFrame(this.raf)
    this.raf = 0
  }

  private tick = (now: number) => {
    for (let i = this.jobs.length - 1; i >= 0; i--) {
      const job = this.jobs[i]
      if (now < job.start) continue
      const t = Math.min(1, (now - job.start) / job.dur)
      job.frame(t)
      if (t >= 1) {
        this.jobs.splice(i, 1)
        job.resolve()
      }
    }
    this.raf = this.jobs.length ? requestAnimationFrame(this.tick) : 0
  }
}

export const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
/** Overshoots a little, then settles: for things that pop in. */
export const back = (t: number) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2)

export interface Point {
  x: number
  y: number
}

/** A point at `e` (0 to 1) along an arc from `from` to `to`, peaking `lift` above the higher end. */
export function arc(from: Point, to: Point, lift: number, e: number): Point {
  const mid = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - lift }
  return {
    x: (1 - e) * (1 - e) * from.x + 2 * (1 - e) * e * mid.x + e * e * to.x,
    y: (1 - e) * (1 - e) * from.y + 2 * (1 - e) * e * mid.y + e * e * to.y,
  }
}
