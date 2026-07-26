# Formation March Music Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the procedural `formationStep` march sound like the classic descending four-note Space Invaders bass loop (no sample files).

**Architecture:** Keep sim → `formationStep` → `AudioEngine.handleEvents` wiring. Replace the short SFX `blip()` for march with a dedicated retriggerable square + envelope + lowpass voice that stops the previous note on each step.

**Tech Stack:** Web Audio API, TypeScript, existing `AudioEngine` in `src/audio/engine.ts`.

## Global Constraints

- Procedural Web Audio only — no `public/` audio assets / no Wikipedia OGG bundling
- Do not put Audio APIs in `src/game/`
- Attract remains silent for march/SFX (gate stays in `useGameLoop`)
- Mute + tab suspend behavior unchanged
- Spec: `docs/superpowers/specs/2026-07-26-march-music-design.md`
- Do not commit unless the user explicitly asks

---

### Task 1: Dedicated march voice in AudioEngine

**Files:**
- Modify: `src/audio/engine.ts`
- Docs already updated: `docs/superpowers/specs/2026-07-26-march-music-design.md`, Audio section in `docs/superpowers/specs/2026-07-25-space-invaders-design.md`

**Interfaces:**
- Consumes: `GameEvent` `{ type: 'formationStep'; note: number }` (existing)
- Produces: `private marchNote(note: number): void`, `private stopMarch(): void`; call `stopMarch()` from `gameOver` / `playerHit` paths alongside UFO stop if needed for cleanup

- [x] **Step 1: Replace march frequencies and add march node fields**

In `src/audio/engine.ts`, change constants and class fields:

```ts
const MARCH_FREQS = [73.42, 61.74, 58.27, 55.0]; // D2 – B1 – Bb1 – A1

export class AudioEngine {
  // ...existing fields...
  private marchOsc: OscillatorNode | null = null;
  private marchGain: GainNode | null = null;
  private marchFilter: BiquadFilterNode | null = null;
```

- [x] **Step 2: Implement `stopMarch` and `marchNote`**

```ts
private stopMarch(): void {
  try {
    this.marchOsc?.stop();
  } catch {
    /* already stopped */
  }
  this.marchOsc = null;
  this.marchGain = null;
  this.marchFilter = null;
}

private marchNote(note: number): void {
  const ctx = this.ensure();
  if (!ctx || !this.master) return;

  this.stopMarch();

  const freq = MARCH_FREQS[note % 4] ?? 80;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = 'square';
  osc.frequency.value = freq;

  filter.type = 'lowpass';
  filter.frequency.value = 1000;
  filter.Q.value = 0.7;

  const now = ctx.currentTime;
  const attack = 0.01;
  const sustain = 0.16;
  const hold = 0.28;
  const release = 0.08;

  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(sustain, now + attack);
  g.gain.setValueAtTime(sustain, now + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, now + hold + release);

  osc.connect(filter);
  filter.connect(g);
  g.connect(this.master);

  osc.start(now);
  osc.stop(now + hold + release + 0.02);

  this.marchOsc = osc;
  this.marchGain = g;
  this.marchFilter = filter;

  osc.onended = () => {
    if (this.marchOsc === osc) this.stopMarch();
  };
}
```

- [x] **Step 3: Wire `handleEvents` and cleanup**

Replace `formationStep` case:

```ts
case 'formationStep':
  this.marchNote(e.note);
  break;
```

Call `this.stopMarch()` wherever `stopUfo()` is already called on terminal moments (`playerHit`, `gameOver`, and keep UFO stop on hit/despawn as today).

- [x] **Step 4: Verify build + unit tests still pass**

Run:

```bash
npm test && npm run build
```

Expected: all Vitest tests pass; production build succeeds.

- [ ] **Step 5: Manual listen check** (run `npm run dev` — agent cannot hear output)

Run `npm run dev`, start 1P with sound on:

1. Descending 4-note loop synced to alien steps
2. Tempo rises as aliens die
3. Attract has no march
4. Mute silences march
5. Rough match vs reference OGG (do not download into repo)

Tune `MARCH_FREQS` / `sustain` / `filter.frequency` if needed after listening.

- [x] **Step 6: Light ARCHITECTURE note (if backlog mentions audio polish)**

If `docs/ARCHITECTURE.md` backlog still implies missing march polish, add a one-liner that march voice was tuned; do not expand scope.

---

## Spec coverage

| Spec requirement | Task |
|------------------|------|
| Descending procedural tones | Task 1 |
| Dedicated voice vs short blip | Task 1 |
| Retrigger / stop previous | Task 1 `stopMarch` |
| No samples | Global + Task 1 |
| Attract silent | Existing `useGameLoop` (unchanged) |
| Manual testing | Step 5 |
