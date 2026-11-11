// Todo el sonido se genera en código con WebAudio: no hay archivos de audio.
export class AudioSys {
  constructor() {
    this.ctx = null;
    this.threat = 0;
    this.beatT = 0;
  }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    const ctx = (this.ctx = new C());
    this.master = ctx.createGain();
    this.master.gain.value = 0.85;
    const comp = ctx.createDynamicsCompressor();
    this.master.connect(comp); comp.connect(ctx.destination);

    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;

    // Bus de eco para voces y gritos lejanos.
    this.echo = ctx.createDelay(1);
    this.echo.delayTime.value = 0.36;
    const fb = ctx.createGain(); fb.gain.value = 0.48;
    const ef = ctx.createBiquadFilter(); ef.type = 'lowpass'; ef.frequency.value = 1700;
    this.echo.connect(ef); ef.connect(fb); fb.connect(this.echo); ef.connect(this.master);

    this.g = {};
    // Viento
    {
      const n = this.loopNoise();
      const f = (this.windF = ctx.createBiquadFilter()); f.type = 'lowpass'; f.frequency.value = 380;
      const g = (this.g.wind = ctx.createGain()); g.gain.value = 0;
      n.connect(f); f.connect(g); g.connect(this.master);
    }
    // Lluvia
    {
      const n = this.loopNoise();
      const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1400;
      const g = (this.g.rain = ctx.createGain()); g.gain.value = 0;
      n.connect(f); f.connect(g); g.connect(this.master);
    }
    // Grillos y chicharras
    {
      const g = (this.g.crickets = ctx.createGain()); g.gain.value = 0;
      g.connect(this.master);
      [[4100, 23, 0.21], [4750, 31, 0.13], [5400, 17, 0.29]].forEach(([fr, am, slow]) => {
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = fr;
        const a = ctx.createGain(); a.gain.value = 0.5;
        const l = ctx.createOscillator(); l.type = 'square'; l.frequency.value = am;
        const lg = ctx.createGain(); lg.gain.value = 0.5; l.connect(lg); lg.connect(a.gain);
        const b = ctx.createGain(); b.gain.value = 0.5;
        const s = ctx.createOscillator(); s.frequency.value = slow;
        const sg = ctx.createGain(); sg.gain.value = 0.5; s.connect(sg); sg.connect(b.gain);
        const out = ctx.createGain(); out.gain.value = 0.06;
        o.connect(a); a.connect(b); b.connect(out); out.connect(g);
        o.start(); l.start(); s.start();
      });
    }
    // Zumbido grave que crece con el miedo
    {
      const g = (this.g.drone = ctx.createGain()); g.gain.value = 0;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 210;
      [55, 58.4, 82.6].forEach((fr) => {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr;
        o.connect(f); o.start();
      });
      f.connect(g); g.connect(this.master);
    }
  }

  loopNoise() {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf; s.loop = true; s.start();
    return s;
  }

  setAmb(o) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (const k in o) if (this.g[k]) this.g[k].gain.setTargetAtTime(o[k], t, 1.0);
  }

  tick(dt, time) {
    if (!this.ctx) return;
    this.windF.frequency.value = 330 + Math.sin(time * 0.31) * 140 + Math.sin(time * 0.83) * 60;
    if (this.threat > 0.08) {
      this.beatT -= dt;
      if (this.beatT <= 0) { this.heart(this.threat); this.beatT = 1.15 - this.threat * 0.7; }
    }
  }

  out(pan = 0, vol = 1, echo = 0) {
    const ctx = this.ctx;
    const g = ctx.createGain(); g.gain.value = vol;
    let last = g;
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan));
      g.connect(p); last = p;
    }
    last.connect(this.master);
    if (echo > 0) { const e = ctx.createGain(); e.gain.value = echo; last.connect(e); e.connect(this.echo); }
    return g;
  }

  tone({ type = 'sine', f = [440], dur = 0.3, vol = 0.2, pan = 0, echo = 0, attack = 0.01, filter }) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f[0], t);
    for (let i = 1; i < f.length; i++) o.frequency.exponentialRampToValueAtTime(f[i], t + (dur * i) / (f.length - 1));
    const e = ctx.createGain();
    e.gain.setValueAtTime(0.0001, t);
    e.gain.linearRampToValueAtTime(1, t + attack);
    e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = o;
    if (filter) {
      const fl = ctx.createBiquadFilter(); fl.type = filter[0]; fl.frequency.value = filter[1]; fl.Q.value = filter[2] ?? 1;
      o.connect(fl); node = fl;
    }
    node.connect(e); e.connect(this.out(pan, vol, echo));
    o.start(t); o.stop(t + dur + 0.05);
  }

  burst({ dur = 0.1, vol = 0.2, pan = 0, type = 'lowpass', freq = 800, q = 1, echo = 0, attack = 0.004 }) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const e = ctx.createGain();
    e.gain.setValueAtTime(0.0001, t);
    e.gain.linearRampToValueAtTime(1, t + attack);
    e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(e); e.connect(this.out(pan, vol, echo));
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  }

  // --- Efectos ---
  step(stone) {
    this.burst({ dur: 0.09, vol: stone ? 0.09 : 0.075, freq: stone ? 1500 : 520 + Math.random() * 200, type: stone ? 'bandpass' : 'lowpass' });
  }
  pickup() { this.tone({ f: [620, 930], dur: 0.16, vol: 0.09 }); }
  page() { this.burst({ dur: 0.22, vol: 0.07, type: 'highpass', freq: 2600 }); }
  heart(v = 0.5) {
    this.tone({ f: [62, 40], dur: 0.16, vol: 0.5 * v });
    setTimeout(() => this.tone({ f: [56, 38], dur: 0.14, vol: 0.38 * v }), 160);
  }
  thump(pan, vol) {
    this.tone({ f: [95, 42], dur: 0.2, vol: 0.55 * vol, pan });
    this.burst({ dur: 0.12, vol: 0.22 * vol, pan, freq: 260 });
  }
  whisper(pan = 0, vol = 1) {
    for (let i = 0; i < 5; i++) setTimeout(() => this.burst({ dur: 0.16 + Math.random() * 0.2, vol: 0.07 * vol, pan, type: 'bandpass', freq: 2200 + Math.random() * 1400, q: 3, echo: 0.5, attack: 0.05 }), i * 190);
  }
  // Lamento de mujer: diente de sierra con vibrato por dos formantes.
  wail(pan = 0, vol = 1, low = false) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime, dur = 2.6;
    const base = low ? 190 : 330;
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(base, t);
    o.frequency.linearRampToValueAtTime(base * 1.5, t + 0.7);
    o.frequency.linearRampToValueAtTime(base * 1.33, t + 1.6);
    o.frequency.linearRampToValueAtTime(base * 0.8, t + dur);
    const vib = ctx.createOscillator(); vib.frequency.value = 5.5;
    const vg = ctx.createGain(); vg.gain.value = 9; vib.connect(vg); vg.connect(o.frequency);
    const e = ctx.createGain();
    e.gain.setValueAtTime(0.0001, t);
    e.gain.linearRampToValueAtTime(1, t + 0.35);
    e.gain.setValueAtTime(1, t + 1.7);
    e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const dst = this.out(pan, 0.11 * vol, 0.8);
    [[850, 6], [1250, 7], [2800, 5]].forEach(([fr, q], i) => {
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = fr; f.Q.value = q;
      const g = ctx.createGain(); g.gain.value = i === 2 ? 0.3 : 1;
      o.connect(f); f.connect(g); g.connect(e);
    });
    e.connect(dst);
    o.start(t); vib.start(t); o.stop(t + dur + 0.1); vib.stop(t + dur + 0.1);
  }
  scream(pan = 0, vol = 1) {
    this.tone({ type: 'sawtooth', f: [520, 1500, 1150, 320], dur: 1.3, vol: 0.2 * vol, pan, echo: 0.6, filter: ['bandpass', 1400, 1.2] });
    this.tone({ type: 'square', f: [540, 1560, 1100, 300], dur: 1.2, vol: 0.07 * vol, pan, echo: 0.4 });
    this.burst({ dur: 1.1, vol: 0.16 * vol, pan, type: 'bandpass', freq: 2400, q: 0.8, echo: 0.5 });
  }
  sting(vol = 1) {
    [110, 116.5, 155.6, 233, 246.9].forEach((fr) => this.tone({ type: 'sawtooth', f: [fr, fr * 0.97], dur: 1.9, vol: 0.075 * vol, attack: 0.005, filter: ['lowpass', 1400, 1] }));
    this.burst({ dur: 0.5, vol: 0.2 * vol, freq: 180 });
  }
  hit() {
    this.burst({ dur: 0.3, vol: 0.5, freq: 320 });
    this.tone({ f: [140, 40], dur: 0.35, vol: 0.5 });
  }
  bark(pan = 0, vol = 1) {
    const one = () => this.tone({ type: 'sawtooth', f: [420, 210], dur: 0.1, vol: 0.2 * vol, pan, filter: ['bandpass', 950, 1.5] });
    one(); setTimeout(one, 170);
  }
  growl(pan = 0, vol = 1) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 72;
    const l = ctx.createOscillator(); l.type = 'square'; l.frequency.value = 27;
    const a = ctx.createGain(); a.gain.value = 0.5;
    const lg = ctx.createGain(); lg.gain.value = 0.5; l.connect(lg); lg.connect(a.gain);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
    const e = ctx.createGain();
    e.gain.setValueAtTime(0.0001, t); e.gain.linearRampToValueAtTime(1, t + 0.15);
    e.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    o.connect(a); a.connect(f); f.connect(e); e.connect(this.out(pan, 0.22 * vol));
    o.start(t); l.start(t); o.stop(t + 1.2); l.stop(t + 1.2);
  }
  yelp(pan = 0, vol = 1) { this.tone({ f: [820, 1500, 620], dur: 0.32, vol: 0.2 * vol, pan, echo: 0.6 }); }
  thunder() {
    this.burst({ dur: 3.2, vol: 0.5, freq: 110, attack: 0.05 });
    this.burst({ dur: 0.5, vol: 0.25, freq: 900, attack: 0.01 });
  }
  bell() { [1, 2.76, 5.4].forEach((m, i) => this.tone({ f: [392 * m, 392 * m], dur: 2.6 - i * 0.6, vol: 0.09 / (i + 1), echo: 0.4 })); }
  crackle(vol = 1, pan = 0) { this.burst({ dur: 0.03 + Math.random() * 0.04, vol: 0.09 * vol, pan, type: 'bandpass', freq: 1800 + Math.random() * 2500, q: 2 }); }
  match() { this.burst({ dur: 0.5, vol: 0.14, type: 'highpass', freq: 3000, attack: 0.02 }); }
  rooster() {
    [[520, 780], [780, 760], [760, 900], [900, 500]].forEach((p, i) => setTimeout(() => this.tone({ type: 'sawtooth', f: p, dur: i === 3 ? 0.7 : 0.22, vol: 0.07, echo: 0.5, filter: ['bandpass', 1500, 2] }), i * 230));
  }
  // Motor: dos osciladores que suben de tono con las revoluciones (rpm de 0 a 1).
  engine(on, rpm = 0, kind = 'jeep') {
    if (!this.ctx) return;
    if (!this.eng) {
      if (!on) return;
      const ctx = this.ctx, g = ctx.createGain(); g.gain.value = 0;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
      const o1 = ctx.createOscillator(); o1.type = 'sawtooth';
      const o2 = ctx.createOscillator(); o2.type = 'square';
      const g2 = ctx.createGain(); g2.gain.value = 0.5;
      o1.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.connect(this.master); o1.start(); o2.start();
      this.eng = { g, f, o1, o2 };
    }
    const t = this.ctx.currentTime, fr = (kind === 'moto' ? 70 : kind === 'chiva' ? 30 : 42) + rpm * (kind === 'moto' ? 150 : 85);
    this.eng.o1.frequency.setTargetAtTime(fr, t, 0.06); this.eng.o2.frequency.setTargetAtTime(fr * 0.5, t, 0.06);
    this.eng.f.frequency.setTargetAtTime(380 + rpm * 900, t, 0.1);
    this.eng.g.gain.setTargetAtTime(on ? 0.05 + rpm * 0.05 : 0, t, 0.15);
  }
  horn(kind = 'jeep') {
    const f = kind === 'chiva' ? [330, 415] : kind === 'moto' ? [620, 622] : [392, 494];
    f.forEach((x) => this.tone({ type: 'square', f: [x, x], dur: 0.45, vol: 0.07, filter: ['lowpass', 1800, 1] }));
  }
  creak(pan = 0) { this.tone({ type: 'sawtooth', f: [90, 150, 70], dur: 0.5, vol: 0.045, pan, filter: ['bandpass', 700, 6] }); }
  coin() { this.tone({ f: [1320, 1760], dur: 0.12, vol: 0.06 }); setTimeout(() => this.tone({ f: [1760, 2100], dur: 0.14, vol: 0.05 }), 90); }
  bird(pan = 0) { this.tone({ f: [2200 + Math.random() * 900, 3200, 2500], dur: 0.18, vol: 0.035, pan }); }
}
