# Formation March Music — Design Spec

Date: 2026-07-26

## Intent

Make the in-game “music” recognizable as the classic 1978 arcade invaders four-note descending march by tuning the existing procedural `formationStep` voice — no sample files (the Wikipedia OGG is copyrighted reference only).

## Decisions

| Topic | Choice |
|-------|--------|
| Delivery | Procedural Web Audio only (no `public/` audio assets) |
| Trigger | Existing `formationStep` events from sim |
| Timbre | Dedicated march voice: square wave + light lowpass, not the short SFX `blip()` |
| Pitch | Four **descending** bass tones, tuned by ear against the public reference sample |
| Duration | Note sustains for most of a formation step (cut off / retriggered on next step) |
| Attract | Unchanged — march/SFX silent in attract; FX still run |
| Mute / tab | Unchanged — master mute + suspend when hidden |

## Behavior

During active play phases already gated in `useGameLoop` (`playing`, `dying`, `waveClear`, `playerSwitch`, `gameOver`):

1. Each formation step advances `marchNote` 0→1→2→3→0 and emits `{ type: 'formationStep', note }`.
2. Audio plays the corresponding descending tone loudly enough to read as music, not a quiet click.
3. Tempo remains sim-driven: step interval shortens as alive count drops / wave rises.
4. Overlapping steps: stop or duck the previous march oscillator before starting the next so notes don’t stack into mud.

## Architecture

```
simulation stepFormation → GameEvent formationStep
        ↓
useGameLoop handleEvents (active phases only)
        ↓
AudioEngine.marchNote(noteIndex)
  square Oscillator → Gain (attack/sustain/release) → BiquadFilter (lowpass) → master
```

- **No sim changes required** unless note index mapping is wrong (it already cycles 0–3).
- All sound character lives in [`src/audio/engine.ts`](../../../src/audio/engine.ts).
- Keep `src/game/` free of Audio APIs.

### March voice (concrete)

- Frequencies: **D2 – B1 – Bb1 – A1** ≈ `[73.42, 61.74, 58.27, 55.0]` Hz (m3, then two semitones). Arcade analogue may sit slightly off concert pitch; nudge ± a few Hz only if ear-matching requires it.
- Envelope: short attack (~5–15 ms), sustain ~0.12–0.18 gain, exponential release; total length ~0.25–0.4 s at slow steps (or until next step stops it).
- Filter: lowpass ~800–1200 Hz so the square is thumpy, not buzzy.
- Do not change shoot/hit/UFO SFX paths except shared master gain.

## Error handling / edge cases

- If AudioContext not unlocked yet, `ensure()` no-ops (same as today).
- On `gameOver` / mute / tab hide: existing stop/suspend paths; stop any active march oscillator with UFO-style cleanup.
- Rapid late-game steps: always stop previous march voice before starting next.

## Testing

- Automated: no new Vitest cases required for oscillator tone (no DOM Audio in `src/game/`). Existing formation step / event tests remain valid.
- Manual:
  1. Start 1P with sound on — hear descending 4-note loop synced to alien steps.
  2. Kill aliens — tempo rises with formation.
  3. Attract demo — no march spam.
  4. Mute toggle — silence including march.
  5. Compare briefly to https://upload.wikimedia.org/wikipedia/en/d/d6/Space_Invaders_Music.ogg for recognizability (do not bundle the file).

## Out of scope

Sample playback, full 556/RC circuit SPICE model, separate BGM track, attract-mode music, SFX redesign beyond what is needed so the march sits clearly in the mix.

## Docs to update when shipping

- Main design [`2026-07-25-space-invaders-design.md`](./2026-07-25-space-invaders-design.md) Audio section
- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) backlog / audio note if needed
