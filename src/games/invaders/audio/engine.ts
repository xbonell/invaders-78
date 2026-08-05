import type { GameEvent } from '../game/types';

// D2 – B1 – Bb1 – A1 (m3, then two semitones); arcade is slightly detuned
const MARCH_FREQS = [73.42, 61.74, 58.27, 55.0];

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;
  private ufoOsc: OscillatorNode | null = null;
  private ufoGain: GainNode | null = null;
  private marchOsc: OscillatorNode | null = null;
  private marchGain: GainNode | null = null;
  private marchFilter: BiquadFilterNode | null = null;
  private unlockPromise: Promise<void> | null = null;

  isRunning(): boolean {
    return this.ctx?.state === 'running';
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master) {
      this.master.gain.value = muted ? 0 : 0.35;
    }
  }

  unlock(): Promise<void> {
    if (this.ctx?.state === 'running') return Promise.resolve();
    if (!this.unlockPromise) {
      this.unlockPromise = this.doUnlock().finally(() => {
        this.unlockPromise = null;
      });
    }
    return this.unlockPromise;
  }

  private async doUnlock(): Promise<void> {
    if (!this.ctx) {
      const w = window as Window & { webkitAudioContext?: typeof AudioContext };
      const Ctx = window.AudioContext ?? w.webkitAudioContext;
      if (!Ctx) throw new Error('AudioContext unavailable');
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.35;
      const comp = this.ctx.createDynamicsCompressor();
      this.master.connect(comp);
      comp.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    const silent = this.ctx.createBuffer(1, 1, this.ctx.sampleRate);
    const src = this.ctx.createBufferSource();
    src.buffer = silent;
    src.connect(this.master!);
    src.start(0);
  }

  suspend(): void {
    void this.ctx?.suspend();
  }

  resume(): void {
    void this.ctx?.resume();
  }

  handleEvents(events: GameEvent[]): void {
    for (const e of events) {
      switch (e.type) {
        case 'shoot':
          this.sweep(980, 220, 0.09);
          break;
        case 'alienHit':
          this.noiseBurst(0.1, 0.22);
          this.blip(110, 0.07, 'square', 0.1);
          break;
        case 'ufoHit':
          this.sweep(520, 60, 0.45);
          this.stopUfo();
          break;
        case 'playerHit':
          this.noiseBurst(0.45, 0.4);
          this.sweep(200, 40, 0.5);
          this.stopUfo();
          this.stopMarch();
          break;
        case 'bunkerHit':
          this.blip(90, 0.05, 'triangle', 0.07);
          break;
        case 'alienShotHit':
          this.noiseBurst(0.06, 0.12);
          this.blip(140, 0.04, 'square', 0.06);
          break;
        case 'formationStep':
          this.marchNote(e.note);
          break;
        case 'gameOver':
          this.sweep(180, 55, 0.6);
          this.stopUfo();
          this.stopMarch();
          break;
        case 'playerSwitch':
          this.blip(330, 0.12, 'square', 0.12);
          this.blip(440, 0.12, 'square', 0.1);
          break;
        case 'ufoSpawn':
          this.startUfo();
          break;
        case 'ufoDespawn':
        case 'waveClear':
          this.stopUfo();
          break;
      }
    }
  }

  private ensure(): AudioContext | null {
    return this.ctx;
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

    osc.addEventListener('ended', () => {
      if (this.marchOsc === osc) this.stopMarch();
    });
  }

  private stopMarch(): void {
    const ctx = this.ctx;
    if (this.marchGain && ctx) {
      try {
        this.marchGain.gain.cancelScheduledValues(ctx.currentTime);
        this.marchGain.gain.setValueAtTime(0.0001, ctx.currentTime);
      } catch {
        /* node already gone */
      }
    }
    try {
      this.marchOsc?.stop();
    } catch {
      /* already stopped */
    }
    this.marchOsc = null;
    this.marchGain = null;
    this.marchFilter = null;
  }

  private blip(freq: number, dur: number, type: OscillatorType, gain: number): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  private sweep(from: number, to: number, dur: number): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(from, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(to, ctx.currentTime + dur);
    g.gain.value = 0.18;
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  private noiseBurst(dur: number, gain: number): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(g);
    g.connect(this.master);
    src.start();
  }

  private startUfo(): void {
    const ctx = this.ensure();
    if (!ctx || !this.master || this.ufoOsc) return;
    this.ufoOsc = ctx.createOscillator();
    this.ufoGain = ctx.createGain();
    this.ufoOsc.type = 'sine';
    this.ufoOsc.frequency.value = 220;
    this.ufoGain.gain.value = 0.08;
    this.ufoOsc.connect(this.ufoGain);
    this.ufoGain.connect(this.master);
    this.ufoOsc.start();
    // wobbly siren
    this.ufoOsc.frequency.setValueAtTime(220, ctx.currentTime);
    const now = ctx.currentTime;
    for (let i = 0; i < 40; i++) {
      const t = now + i * 0.15;
      this.ufoOsc.frequency.linearRampToValueAtTime(i % 2 === 0 ? 280 : 180, t);
    }
  }

  private stopUfo(): void {
    try {
      this.ufoOsc?.stop();
    } catch {
      /* already stopped */
    }
    this.ufoOsc = null;
    this.ufoGain = null;
  }
}
