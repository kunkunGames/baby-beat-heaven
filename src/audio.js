// Studio-Grade WebAudio Engine
// - Sample-accurate lookahead clock anchored strictly to AudioContext.currentTime
// - Mastering chain: Highpass -> Soft Warmth Saturator -> Compressor -> Limiter + Stereo Room Reverb
// - Sidechain Ducking so vocal/rhythm cues ALWAYS shine over the arrangement
// - 3-Formant Phonetic Vocal Synthesizer for unmistakable cute/comedic Korean parenting cues
// - Bespoke multi-track band arrangements for Title, Menu, 5 Title Cards, Practice, 5 Full Stages, & 3 Looping Epilogues

function midiToHz(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

class StudioAudio {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.masterVol = 0.86;
    this.musicVol = 0.85;
    this.sfxVol = 0.95;
    this.offsetMs = 0; // Audio calibration offset
    this.noiseBuf = null;
    this.reverbNode = null;

    // Active background loop (Title / Menu / Practice / Epilogue)
    this.loopTimer = null;
    this.loopKind = null;
    this.loopBpm = 116;
    this.loopStartTime = 0;
    this.loopStep = 0;
    this.loopSubStage = "pacifier";
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC({ latencyHint: "interactive" });
      this._buildGraph();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    this.ready = true;
    return this.ctx;
  }

  now() {
    return this.ctx ? this.ctx.currentTime : performance.now() / 1000;
  }

  _buildGraph() {
    const c = this.ctx;
    this.masterGain = c.createGain();
    this.masterGain.gain.value = this.masterVol;

    // Highpass to keep low end tight
    const hp = c.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 34;

    // Subtle analog warmth waveshaper
    const sat = c.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 255 - 1;
      curve[i] = Math.tanh(x * 1.25) / Math.tanh(1.25);
    }
    sat.curve = curve;

    // Bus glue compressor + peak limiter
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 14;
    comp.ratio.value = 3.2;
    comp.attack.value = 0.006;
    comp.release.value = 0.14;

    const lim = c.createDynamicsCompressor();
    lim.threshold.value = -2.2;
    lim.knee.value = 2;
    lim.ratio.value = 18;
    lim.attack.value = 0.001;
    lim.release.value = 0.06;

    // Buses
    this.musicBus = c.createGain();
    this.musicBus.gain.value = this.musicVol;
    this.duckGain = c.createGain();
    this.duckGain.gain.value = 1.0;

    this.cueBus = c.createGain();
    this.cueBus.gain.value = this.sfxVol * 1.15;
    const cueEQ = c.createBiquadFilter();
    cueEQ.type = "highshelf";
    cueEQ.frequency.value = 2600;
    cueEQ.gain.value = 2.5;

    this.sfxBus = c.createGain();
    this.sfxBus.gain.value = this.sfxVol;

    // Procedural silky stereo room impulse response for ConvolverNode
    this.reverbSend = c.createGain();
    this.reverbSend.gain.value = 0.22;
    this.reverbNode = c.createConvolver();
    this.reverbNode.buffer = this._makeRoomIR(1.15, 2.8);

    this.musicBus.connect(this.duckGain);
    this.duckGain.connect(hp);
    this.duckGain.connect(this.reverbSend);

    this.cueBus.connect(cueEQ);
    cueEQ.connect(hp);
    cueEQ.connect(this.reverbSend);

    this.sfxBus.connect(hp);

    this.reverbSend.connect(this.reverbNode);
    this.reverbNode.connect(hp);

    hp.connect(sat);
    sat.connect(comp);
    comp.connect(lim);
    lim.connect(this.masterGain);
    this.masterGain.connect(c.destination);

    // Pre-generate crisp white noise buffer (2s)
    const len = c.sampleRate * 2;
    this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
    const ch = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
  }

  _makeRoomIR(duration, decay) {
    const c = this.ctx;
    const len = Math.floor(c.sampleRate * duration);
    const buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / len;
        const env = Math.pow(1 - t, decay);
        const n = (Math.random() * 2 - 1) * env;
        lp = lp * 0.72 + n * 0.28; // warm low-pass room tail
        data[i] = lp * (i < 480 ? i / 480 : 1);
      }
    }
    return buf;
  }

  applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(this.masterVol, t, 0.02);
    this.musicBus.gain.setTargetAtTime(this.musicVol, t, 0.02);
    this.cueBus.gain.setTargetAtTime(this.sfxVol * 1.15, t, 0.02);
    this.sfxBus.gain.setTargetAtTime(this.sfxVol, t, 0.02);
  }

  duck(time, depth = 0.62, dur = 0.2) {
    if (!this.ctx) return;
    const t = Math.max(this.ctx.currentTime, Number.isFinite(time) ? time : this.ctx.currentTime);
    const g = this.duckGain.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(1.0, t);
    g.linearRampToValueAtTime(depth, t + 0.015);
    g.exponentialRampToValueAtTime(1.0, t + dur);
  }

  _safeTime(t) {
    const now = this.ctx ? this.ctx.currentTime : 0;
    return Math.max(now, Number.isFinite(t) ? t : now);
  }

  // ===== STUDIO DRUMS & PERCUSSION =====
  kick(t, vel = 0.85, pitch = 135) {
    t = this._safeTime(t);
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(pitch, t);
    o.frequency.exponentialRampToValueAtTime(46, t + 0.085);
    o.frequency.exponentialRampToValueAtTime(34, t + 0.22);
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(vel * 0.9, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
    o.connect(g);
    g.connect(this.musicBus);
    o.start(t);
    o.stop(t + 0.28);
    // Beater click
    const cl = c.createOscillator();
    const cg = c.createGain();
    cl.type = "triangle";
    cl.frequency.setValueAtTime(950, t);
    cl.frequency.exponentialRampToValueAtTime(140, t + 0.018);
    cg.gain.setValueAtTime(vel * 0.22, t);
    cg.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
    cl.connect(cg);
    cg.connect(this.musicBus);
    cl.start(t);
    cl.stop(t + 0.025);
  }

  snare(t, vel = 0.65, tone = 195) {
    const c = this.ctx;
    // Snare wires
    const n = c.createBufferSource();
    n.buffer = this.noiseBuf;
    const hp = c.createBiquadFilter();
    hp.type = "bandpass";
    hp.frequency.value = 2400;
    hp.Q.value = 0.7;
    const ng = c.createGain();
    ng.gain.setValueAtTime(vel * 0.55, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    n.connect(hp);
    hp.connect(ng);
    ng.connect(this.musicBus);
    n.start(t);
    n.stop(t + 0.18);
    // Snare body
    const o = c.createOscillator();
    const og = c.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(tone, t);
    o.frequency.exponentialRampToValueAtTime(115, t + 0.08);
    og.gain.setValueAtTime(vel * 0.45, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
    o.connect(og);
    og.connect(this.musicBus);
    o.start(t);
    o.stop(t + 0.12);
  }

  hat(t, vel = 0.26, open = false) {
    const c = this.ctx;
    const n = c.createBufferSource();
    n.buffer = this.noiseBuf;
    const hp = c.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = open ? 6800 : 8400;
    const g = c.createGain();
    const dur = open ? 0.24 : 0.055;
    g.gain.setValueAtTime(vel * 0.42, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    n.connect(hp);
    hp.connect(g);
    g.connect(this.musicBus);
    n.start(t);
    n.stop(t + dur + 0.02);
  }

  clap(t, vel = 0.52, bus = null) {
    const c = this.ctx;
    const dest = bus || this.musicBus;
    for (let i = 0; i < 3; i++) {
      const dt = i * 0.011;
      const n = c.createBufferSource();
      n.buffer = this.noiseBuf;
      const bp = c.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 1550 + i * 220;
      bp.Q.value = 1.6;
      const g = c.createGain();
      g.gain.setValueAtTime(vel * (i === 2 ? 0.55 : 0.34), t + dt);
      g.gain.exponentialRampToValueAtTime(0.001, t + dt + (i === 2 ? 0.14 : 0.04));
      n.connect(bp);
      bp.connect(g);
      g.connect(dest);
      n.start(t + dt);
      n.stop(t + dt + 0.16);
    }
  }

  woodblock(t, midi = 76, vel = 0.45, bus = null) {
    const c = this.ctx;
    const dest = bus || this.musicBus;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    const f = midiToHz(midi);
    o.frequency.setValueAtTime(f * 1.15, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.012);
    g.gain.setValueAtTime(vel * 0.55, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    o.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + 0.08);
  }

  crash(t, vel = 0.35) {
    const c = this.ctx;
    const n = c.createBufferSource();
    n.buffer = this.noiseBuf;
    const hp = c.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 4800;
    const g = c.createGain();
    g.gain.setValueAtTime(vel * 0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.72);
    n.connect(hp);
    hp.connect(g);
    g.connect(this.musicBus);
    n.start(t);
    n.stop(t + 0.75);
  }

  // ===== STUDIO MELODIC INSTRUMENTS =====
  bass(t, midi, dur = 0.25, vel = 0.55, style = "funk") {
    const c = this.ctx;
    const f = midiToHz(midi);
    const o = c.createOscillator();
    const sub = c.createOscillator();
    o.type = style === "upright" ? "triangle" : "sawtooth";
    sub.type = "sine";
    o.frequency.setValueAtTime(f, t);
    sub.frequency.setValueAtTime(f, t);
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(style === "funk" ? f * 6.5 : f * 3.5, t);
    lp.frequency.exponentialRampToValueAtTime(f * 1.7, t + Math.min(0.14, dur));
    lp.Q.value = style === "funk" ? 3.2 : 1.0;
    const g = c.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(vel * 0.52, t + 0.008);
    g.gain.setTargetAtTime(vel * 0.34, t + 0.04, 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.05);
    o.connect(lp);
    sub.connect(g);
    lp.connect(g);
    g.connect(this.musicBus);
    o.start(t);
    sub.start(t);
    o.stop(t + dur + 0.07);
    sub.stop(t + dur + 0.07);
  }

  rhodes(t, midis, dur = 0.4, vel = 0.26) {
    const c = this.ctx;
    const list = Array.isArray(midis) ? midis : [midis];
    for (const m of list) {
      const f = midiToHz(m);
      const o = c.createOscillator();
      const bell = c.createOscillator();
      o.type = "sine";
      bell.type = "triangle";
      o.frequency.setValueAtTime(f, t);
      bell.frequency.setValueAtTime(f * 4, t);
      const bg = c.createGain();
      bg.gain.setValueAtTime(vel * 0.14, t);
      bg.gain.exponentialRampToValueAtTime(0.0005, t + 0.09);
      const g = c.createGain();
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(vel * 0.32, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.12);
      bell.connect(bg);
      bg.connect(this.musicBus);
      o.connect(g);
      g.connect(this.musicBus);
      o.start(t);
      bell.start(t);
      o.stop(t + dur + 0.14);
      bell.stop(t + 0.11);
    }
  }

  brass(t, midis, dur = 0.24, vel = 0.32, swell = false) {
    const c = this.ctx;
    const list = Array.isArray(midis) ? midis : [midis];
    for (const m of list) {
      const f = midiToHz(m);
      const o1 = c.createOscillator();
      const o2 = c.createOscillator();
      o1.type = "sawtooth";
      o2.type = "sawtooth";
      o1.frequency.setValueAtTime(f * 0.996, t);
      o2.frequency.setValueAtTime(f * 1.004, t);
      const lp = c.createBiquadFilter();
      lp.type = "lowpass";
      if (swell) {
        lp.frequency.setValueAtTime(420, t);
        lp.frequency.exponentialRampToValueAtTime(2800, t + dur * 0.75);
      } else {
        lp.frequency.setValueAtTime(2900, t);
        lp.frequency.exponentialRampToValueAtTime(1150, t + dur);
      }
      lp.Q.value = 1.6;
      const g = c.createGain();
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(vel * 0.26, t + (swell ? dur * 0.55 : 0.018));
      g.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.08);
      o1.connect(lp);
      o2.connect(lp);
      lp.connect(g);
      g.connect(this.musicBus);
      o1.start(t);
      o2.start(t);
      o1.stop(t + dur + 0.1);
      o2.stop(t + dur + 0.1);
    }
  }

  marimba(t, midi, dur = 0.22, vel = 0.36, bus = null) {
    const c = this.ctx;
    const dest = bus || this.musicBus;
    const f = midiToHz(midi);
    const o = c.createOscillator();
    const o2 = c.createOscillator();
    o.type = "sine";
    o2.type = "sine";
    o.frequency.setValueAtTime(f, t);
    o2.frequency.setValueAtTime(f * 3.98, t);
    const g = c.createGain();
    const g2 = c.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(vel * 0.55, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    g2.gain.setValueAtTime(vel * 0.22, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    o.connect(g);
    o2.connect(g2);
    g.connect(dest);
    g2.connect(dest);
    o.start(t);
    o2.start(t);
    o.stop(t + dur + 0.02);
    o2.stop(t + 0.05);
  }

  lead(t, midi, dur = 0.22, vel = 0.26, vibe = "pop") {
    const c = this.ctx;
    const f = midiToHz(midi);
    const o = c.createOscillator();
    o.type = vibe === "celesta" ? "sine" : vibe === "spy" ? "triangle" : "square";
    o.frequency.setValueAtTime(f, t);
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = vibe === "celesta" ? 5000 : vibe === "spy" ? 1800 : 2400;
    const g = c.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(vel * 0.35, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.07);
    o.connect(lp);
    lp.connect(g);
    g.connect(this.musicBus);
    o.start(t);
    o.stop(t + dur + 0.09);
  }

  // ===== 3-FORMANT PHONETIC VOCAL SYNTHESIZER =====
  // Synthesizes cute, expressive vowel-shaped vocalizations + consonant transients
  _formantVoice(t, { f0Start, f0End, dur, formants, gain = 0.42, bus = null, vibrato = 0, nasal = false }) {
    const c = this.ctx;
    const dest = bus || this.cueBus;
    const osc = c.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(f0Start, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, f0End), t + dur);

    if (vibrato > 0) {
      const lfo = c.createOscillator();
      const lg = c.createGain();
      lfo.frequency.value = 6.5;
      lg.gain.value = vibrato;
      lfo.connect(lg);
      lg.connect(osc.frequency);
      lfo.start(t);
      lfo.stop(t + dur + 0.04);
    }

    const env = c.createGain();
    env.gain.setValueAtTime(0.001, t);
    env.gain.linearRampToValueAtTime(gain, t + Math.min(0.025, dur * 0.25));
    env.gain.setValueAtTime(gain * 0.86, t + dur * 0.72);
    env.gain.exponentialRampToValueAtTime(0.001, t + dur);

    for (let i = 0; i < formants.length; i++) {
      const [freq, q, amp] = formants[i];
      const bp = c.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.setValueAtTime(freq, t);
      bp.Q.value = q;
      const fg = c.createGain();
      fg.gain.value = amp;
      osc.connect(bp);
      bp.connect(fg);
      fg.connect(env);
    }

    if (nasal) {
      const nOsc = c.createOscillator();
      const ng = c.createGain();
      nOsc.type = "sine";
      nOsc.frequency.setValueAtTime(f0Start, t);
      nOsc.frequency.exponentialRampToValueAtTime(Math.max(40, f0End), t + dur);
      ng.gain.value = 0.25;
      nOsc.connect(ng);
      ng.connect(env);
      nOsc.start(t);
      nOsc.stop(t + dur + 0.02);
    }

    env.connect(dest);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }

  _noiseBurst(t, freq, q, dur, gain, bus = null) {
    const c = this.ctx;
    const dest = bus || this.cueBus;
    const n = c.createBufferSource();
    n.buffer = this.noiseBuf;
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = freq;
    bp.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    n.connect(bp);
    bp.connect(g);
    g.connect(dest);
    n.start(t);
    n.stop(t + dur + 0.02);
  }

  playCue(kind, time = null) {
    this.ensure();
    const t = this._safeTime(time !== null ? time : this.now());
    this.duck(t, 0.65, 0.2);

    switch (kind) {
      case "baby_puff": // "우웁!" cheek puff
        this._formantVoice(t, {
          f0Start: 370, f0End: 560, dur: 0.16,
          formants: [[380, 5, 1.0], [820, 6, 0.7], [2600, 8, 0.35]],
          gain: 0.55,
        });
        break;
      case "baby_spit": // "퉤!" explosive pacifier spit
        this._noiseBurst(t, 3400, 2.2, 0.045, 0.58);
        this._formantVoice(t + 0.02, {
          f0Start: 640, f0End: 410, dur: 0.14,
          formants: [[520, 4.5, 1.0], [1850, 6, 0.85], [2900, 8, 0.4]],
          gain: 0.62,
        });
        // Elastic launch twang
        this.marimba(t + 0.01, 79, 0.14, 0.42, this.cueBus);
        break;
      case "baby_lob": // Mega slow-mo "에-취~ 퉤!!"
        this._formantVoice(t, {
          f0Start: 420, f0End: 790, dur: 0.38,
          formants: [[580, 5, 1.0], [1900, 6, 0.8], [2800, 8, 0.45]],
          gain: 0.58, vibrato: 12,
        });
        this.marimba(t, 76, 0.14, 0.36, this.cueBus);
        this.marimba(t + 0.18, 83, 0.18, 0.42, this.cueBus);
        break;
      case "dad_catch": { // Juicy suction pop "쫍!"
        const c = this.ctx;
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(190, t);
        o.frequency.exponentialRampToValueAtTime(980, t + 0.055);
        g.gain.setValueAtTime(0.001, t);
        g.gain.linearRampToValueAtTime(0.68, t + 0.006);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.075);
        o.connect(g);
        g.connect(this.sfxBus);
        o.start(t);
        o.stop(t + 0.085);
        this.marimba(t + 0.02, 84, 0.18, 0.42, this.sfxBus);
        break;
      }
      case "pat_todak": // Warm hollow palm pat "토닥!"
        this.woodblock(t, 64, 0.6, this.sfxBus);
        this._noiseBurst(t, 920, 1.4, 0.05, 0.38, this.sfxBus);
        break;
      case "burp_charge": // Cute rising "으음~" hold cue
        this._formantVoice(t, {
          f0Start: 290, f0End: 460, dur: 0.42,
          formants: [[390, 5, 1.0], [1180, 6, 0.65], [2400, 7, 0.3]],
          gain: 0.52, vibrato: 9, nasal: true,
        });
        this.marimba(t, 74, 0.15, 0.32, this.cueBus);
        break;
      case "baby_burp": // Symphonic comic "꺼억!!"
        this._formantVoice(t, {
          f0Start: 175, f0End: 112, dur: 0.28,
          formants: [[560, 4, 1.1], [1150, 5, 0.85], [2200, 7, 0.4]],
          gain: 0.72, vibrato: 26,
        });
        this.brass(t, [60, 64, 67, 72], 0.32, 0.44);
        this.marimba(t + 0.04, 84, 0.25, 0.42, this.sfxBus);
        break;
      case "shh_cue": // Silky "쉿~" rest cue
        this._noiseBurst(t, 4400, 2.6, 0.36, 0.46, this.cueBus);
        this._noiseBurst(t, 6200, 3.0, 0.32, 0.26, this.cueBus);
        this.lead(t, 88, 0.32, 0.28, "celesta");
        break;
      case "photo_peek": // "까—"
        this._formantVoice(t, {
          f0Start: 440, f0End: 550, dur: 0.24,
          formants: [[760, 4.5, 1.0], [1320, 5.5, 0.8], [2600, 7, 0.35]],
          gain: 0.54,
        });
        this._noiseBurst(t, 2600, 2.5, 0.03, 0.42);
        break;
      case "photo_boo": // "꿍!!"
        this._formantVoice(t, {
          f0Start: 590, f0End: 740, dur: 0.22,
          formants: [[360, 5, 1.0], [880, 6, 0.85], [2700, 8, 0.45]],
          gain: 0.64,
        });
        this.marimba(t, 86, 0.22, 0.5, this.cueBus);
        break;
      case "photo_here": // Quick "여기!"
        this._formantVoice(t, {
          f0Start: 510, f0End: 620, dur: 0.13,
          formants: [[540, 5, 1.0], [1780, 6, 0.8], [2750, 7, 0.4]],
          gain: 0.52,
        });
        this.woodblock(t, 81, 0.42, this.cueBus);
        break;
      case "photo_pose": // "포~즈!"
        this._formantVoice(t, {
          f0Start: 520, f0End: 760, dur: 0.3,
          formants: [[480, 4.5, 1.0], [950, 5.5, 0.8], [2650, 7, 0.45]],
          gain: 0.58, vibrato: 10,
        });
        [76, 80, 83, 88].forEach((m, i) => this.marimba(t + i * 0.055, m, 0.2, 0.32, this.cueBus));
        break;
      case "shutter_snap": // Real mechanical camera click-clack + flash!
        this._noiseBurst(t, 3800, 1.2, 0.035, 0.72, this.sfxBus);
        this._noiseBurst(t + 0.042, 2200, 1.5, 0.055, 0.58, this.sfxBus);
        this.woodblock(t, 91, 0.38, this.sfxBus);
        break;
      case "ninja_step": // Crisp floorboard tiptoe
        this.woodblock(t, 72, 0.52, this.sfxBus);
        this.woodblock(t + 0.02, 79, 0.25, this.sfxBus);
        break;
      case "ninja_freeze": // "멈춰!" — sharp stop clack + baby stir
        this.woodblock(t, 86, 0.65, this.cueBus);
        this.woodblock(t + 0.09, 86, 0.55, this.cueBus);
        this._formantVoice(t + 0.02, {
          f0Start: 360, f0End: 270, dur: 0.22,
          formants: [[520, 5, 1.0], [1180, 6, 0.7]],
          gain: 0.48,
        });
        break;
      case "ninja_go": // "출발!"
        this.woodblock(t, 79, 0.45, this.cueBus);
        this.woodblock(t + 0.08, 84, 0.55, this.cueBus);
        break;
      case "ninja_lights_out": // Dramatic light-switch clack!
        this._noiseBurst(t, 1800, 2.0, 0.04, 0.68, this.cueBus);
        this.bass(t, 38, 0.35, 0.65, "upright");
        break;
      case "door_click": // Satisfying brass latch click + heavenly harp!
        this._noiseBurst(t, 4200, 2.5, 0.03, 0.65, this.sfxBus);
        this.woodblock(t + 0.03, 88, 0.55, this.sfxBus);
        [72, 76, 79, 84, 88, 91].forEach((m, i) => this.lead(t + 0.04 + i * 0.045, m, 0.45, 0.26, "celesta"));
        break;
      case "duck_squeak": // Hilarious rubber duck miss!
        this._formantVoice(t, {
          f0Start: 920, f0End: 1380, dur: 0.14,
          formants: [[1100, 6, 1.1], [2300, 8, 0.9]],
          gain: 0.65, bus: this.sfxBus,
        });
        this._formantVoice(t + 0.15, {
          f0Start: 1280, f0End: 780, dur: 0.16,
          formants: [[1000, 6, 1.0], [2100, 8, 0.8]],
          gain: 0.55, bus: this.sfxBus,
        });
        break;
      case "baby_giggle":
        [0, 0.09, 0.18].forEach((dt, i) => {
          this._formantVoice(t + dt, {
            f0Start: 560 + i * 70, f0End: 720 + i * 60, dur: 0.075,
            formants: [[450, 5, 1.0], [2100, 6, 0.8]],
            gain: 0.45, bus: this.sfxBus,
          });
        });
        break;
      case "skill_star_cue": // Magical sparkling golden alert before Skill Star beat!
        [84, 88, 91, 96].forEach((m, i) => this.lead(t + i * 0.06, m, 0.25, 0.34, "celesta"));
        break;
      case "skill_star_hit": // Triumphant golden star explosion!
        [72, 76, 79, 84, 91, 96].forEach((m, i) => {
          this.marimba(t + i * 0.042, m, 0.45, 0.48, this.sfxBus);
          this.lead(t + i * 0.042, m, 0.55, 0.3, "celesta");
        });
        break;
      case "count_tick":
        this.woodblock(t, 82, 0.55, this.cueBus);
        break;
      case "count_go":
        this.woodblock(t, 89, 0.65, this.cueBus);
        this.clap(t, 0.45, this.cueBus);
        break;
      case "miss_bonk": {
        const c = this.ctx;
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = "sawtooth";
        o.frequency.setValueAtTime(215, t);
        o.frequency.exponentialRampToValueAtTime(92, t + 0.24);
        const lp = c.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 680;
        g.gain.setValueAtTime(0.45, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
        o.connect(lp);
        lp.connect(g);
        g.connect(this.sfxBus);
        o.start(t);
        o.stop(t + 0.28);
        break;
      }
      case "barely_wobble":
        this.woodblock(t, 67, 0.42, this.sfxBus);
        this.woodblock(t + 0.06, 65, 0.3, this.sfxBus);
        break;
      case "ui_move":
        this.marimba(t, 79, 0.08, 0.32, this.sfxBus);
        break;
      case "ui_ok":
        this.marimba(t, 76, 0.1, 0.36, this.sfxBus);
        this.marimba(t + 0.055, 83, 0.18, 0.42, this.sfxBus);
        break;
      case "ui_back":
        this.marimba(t, 74, 0.1, 0.32, this.sfxBus);
        this.marimba(t + 0.05, 69, 0.14, 0.28, this.sfxBus);
        break;
      case "ui_type":
        this.woodblock(t, 84 + Math.floor(Math.random() * 4), 0.18, this.sfxBus);
        break;
      case "stamp_slap":
        this.kick(t, 1.0, 150);
        this.clap(t, 0.85, this.sfxBus);
        this.crash(t, 0.42);
        break;
      case "unlock_burst":
        [60, 64, 67, 71, 74, 79, 84, 91].forEach((m, i) => {
          this.lead(t + i * 0.055, m, 0.75, 0.3, "celesta");
          if (i % 2 === 0) this.brass(t + i * 0.055, [m - 12, m], 0.45, 0.24, true);
        });
        this.crash(t + 0.25, 0.5);
        break;
      case "remix_cut": // Crisp DJ record whip-cut between Remix worlds!
        this._noiseBurst(t, 3200, 1.8, 0.07, 0.52, this.cueBus);
        this.clap(t, 0.55, this.cueBus);
        break;
    }
  }

  // ===== 4-BEAT DEDICATED TITLE CARD JINGLES =====
  playTitleCardJingle(stageId) {
    this.ensure();
    this.stopLoop();
    const t0 = this.now() + 0.08;
    if (stageId === "pacifier") {
      // 116 BPM Shibuya-kei brass funk jingle
      const b = 60 / 116;
      this.kick(t0, 0.85); this.bass(t0, 48, b * 0.7, 0.6);
      this.snare(t0 + b, 0.65); this.brass(t0 + b * 0.5, [67, 71, 74], b * 0.4, 0.34);
      this.kick(t0 + b * 2, 0.9); this.brass(t0 + b * 2, [69, 72, 76], b * 0.45, 0.36);
      this.brass(t0 + b * 2.5, [71, 74, 77], b * 0.45, 0.38);
      this.kick(t0 + b * 3, 1.0); this.crash(t0 + b * 3, 0.45);
      this.brass(t0 + b * 3, [72, 76, 79, 84], b * 1.4, 0.46, true);
      this.playCue("dad_catch", t0 + b * 3);
    } else if (stageId === "burp") {
      // 108 BPM Swung Big-Band Jazz Waltz jingle
      const b = 60 / 108;
      this.bass(t0, 41, b * 0.9, 0.6, "upright"); this.rhodes(t0, [65, 69, 72, 76], b * 0.9, 0.34);
      this.hat(t0 + b, 0.32); this.rhodes(t0 + b, [67, 70, 74, 77], b * 0.7, 0.32);
      this.snare(t0 + b * 2, 0.55); this.brass(t0 + b * 2, [65, 69, 72], b * 0.6, 0.36);
      this.kick(t0 + b * 3, 0.95); this.crash(t0 + b * 3, 0.4);
      this.brass(t0 + b * 3, [65, 69, 72, 77], b * 1.5, 0.48, true);
      this.marimba(t0 + b * 3.1, 89, 0.3, 0.4, this.sfxBus);
    } else if (stageId === "photo") {
      // 122 BPM Electro-Swing Studio Pop jingle
      const b = 60 / 122;
      this.kick(t0, 0.85); this.clap(t0 + b, 0.6);
      [72, 76, 79, 83].forEach((m, i) => this.marimba(t0 + i * b * 0.5, m, 0.2, 0.42));
      this.kick(t0 + b * 2, 0.9); this.snare(t0 + b * 2.5, 0.6);
      this.playCue("shutter_snap", t0 + b * 3);
      this.brass(t0 + b * 3, [72, 76, 79, 84], b * 1.3, 0.45);
      this.crash(t0 + b * 3, 0.4);
    } else if (stageId === "ninja") {
      // 112 BPM Smoky Stealth Spy Jazz jingle
      const b = 60 / 112;
      this.bass(t0, 45, b * 0.5, 0.65, "upright");
      this.bass(t0 + b * 0.75, 48, b * 0.4, 0.6, "upright");
      this.bass(t0 + b * 1.5, 51, b * 0.4, 0.62, "upright");
      this.bass(t0 + b * 2.25, 50, b * 0.5, 0.65, "upright");
      this.snare(t0 + b * 2.75, 0.55);
      this.kick(t0 + b * 3, 0.95); this.crash(t0 + b * 3, 0.45);
      this.brass(t0 + b * 3, [57, 60, 64, 68], b * 1.6, 0.48, true);
    } else {
      // 124 BPM GRAND REMIX Rainbow Fanfare!
      const b = 60 / 124;
      [60, 64, 67, 72, 76, 79].forEach((m, i) => {
        this.marimba(t0 + i * b * 0.38, m, 0.25, 0.44);
        this.lead(t0 + i * b * 0.38, m + 12, 0.25, 0.26, "celesta");
      });
      this.kick(t0, 0.9); this.snare(t0 + b, 0.7); this.kick(t0 + b * 2, 0.95);
      this.snare(t0 + b * 2.5, 0.7);
      this.kick(t0 + b * 3, 1.0); this.crash(t0 + b * 3, 0.55);
      this.brass(t0 + b * 3, [65, 69, 72, 76, 84], b * 1.8, 0.52, true);
    }
  }

  // ===== SCENE BACKGROUND LOOP SEQUENCER (Title / Menu / Practice / Epilogue) =====
  startLoop(kind, bpm = 116, subStage = "pacifier") {
    this.ensure();
    if (this.loopKind === kind && this.loopTimer && this.loopSubStage === subStage) return;
    this.stopLoop();
    this.loopKind = kind;
    this.loopBpm = bpm;
    this.loopSubStage = subStage;
    this.loopStartTime = this.now() + 0.06;
    this.loopStep = 0; // eighth-note steps

    const schedule = () => {
      if (!this.loopKind) return;
      const secPerEighth = 60 / this.loopBpm / 2;
      const horizon = this.now() + 0.16;
      while (this.loopStartTime + this.loopStep * secPerEighth < horizon) {
        const t = this.loopStartTime + this.loopStep * secPerEighth;
        this._playLoopStep(this.loopKind, this.loopStep, t, secPerEighth);
        this.loopStep++;
      }
    };
    schedule();
    this.loopTimer = setInterval(schedule, 25);
  }

  stopLoop() {
    if (this.loopTimer) {
      clearInterval(this.loopTimer);
      this.loopTimer = null;
    }
    this.loopKind = null;
  }

  getLoopBeat() {
    if (!this.loopKind || !this.ctx) return (performance.now() / 1000) * (this.loopBpm / 60);
    return Math.max(0, (this.now() - this.loopStartTime) * (this.loopBpm / 60));
  }

  _playLoopStep(kind, step, t, eighth) {
    const s = step % 32; // 4-bar phrase in eighth notes
    const bar = Math.floor(s / 8);
    const pos = s % 8;

    if (kind === "title") {
      // Sunny upbeat Rhythm Heaven title groove (C major / A minor pop)
      const roots = [48, 45, 41, 43]; // C A F G
      const chords = [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65]];
      const mel = [76, 0, 79, 84, 0, 83, 79, 0, 72, 0, 76, 79, 0, 76, 74, 0, 72, 0, 76, 81, 0, 79, 77, 0, 79, 81, 83, 0, 84, 0, 79, 0];
      if (pos === 0 || pos === 5) this.kick(t, 0.72);
      if (pos === 2 || pos === 6) this.snare(t, 0.45);
      if (pos % 2 === 1) this.hat(t, 0.22);
      if (pos === 0 || pos === 3 || pos === 6) this.bass(t, roots[bar], eighth * 1.4, 0.45);
      if (pos === 0 || pos === 4) this.rhodes(t, chords[bar], eighth * 2.5, 0.22);
      if (mel[s]) this.marimba(t, mel[s], eighth * 1.6, 0.32);
    } else if (kind === "menu") {
      // Iconic Rhythm Heaven groovy electro-bossa stage select map loop!
      const roots = [45, 50, 43, 48]; // Am7 Dm7 G7 Cmaj7
      const chords = [[60, 64, 67, 71], [62, 65, 69, 72], [59, 62, 65, 67], [60, 64, 67, 71]];
      const mel = [76, 0, 79, 0, 81, 0, 79, 76, 74, 0, 77, 0, 79, 0, 77, 74, 71, 0, 74, 0, 77, 0, 79, 81, 79, 0, 76, 0, 72, 0, 74, 0];
      if (pos === 0 || pos === 3 || pos === 6) this.kick(t, 0.62, 120);
      if (pos === 2 || pos === 6) this.clap(t, 0.24);
      this.hat(t, pos % 2 === 0 ? 0.16 : 0.24, pos === 7);
      if (pos === 0 || pos === 4 || pos === 6) this.bass(t, roots[bar] + (pos === 6 ? 7 : 0), eighth * 1.3, 0.42);
      if (pos === 0 || pos === 3) this.rhodes(t, chords[bar], eighth * 2.2, 0.24);
      if (mel[s]) this.lead(t, mel[s], eighth * 1.2, 0.17, "celesta");
    } else if (kind === "practice") {
      // Clean warm pocket bed during conversational practice
      if (pos === 0 || pos === 4) this.kick(t, 0.55, 115);
      if (pos === 2 || pos === 6) this.woodblock(t, 76, 0.22);
      if (pos % 2 === 1) this.hat(t, 0.16);
      const r = this.loopSubStage === "ninja" ? [45, 45, 48, 43] : [48, 48, 41, 43];
      if (pos === 0) this.bass(t, r[bar], eighth * 2.5, 0.36, "upright");
      if (pos === 0 || pos === 4) this.rhodes(t, [60, 64, 67], eighth * 1.8, 0.14);
    } else if (kind === "epilogue_superb") {
      // Joyful brass & bell victory celebration loop!
      const roots = [48, 53, 55, 48];
      const chords = [[60, 64, 67, 72], [65, 69, 72, 76], [67, 71, 74, 79], [60, 64, 67, 72]];
      const mel = [84, 0, 83, 84, 88, 0, 84, 0, 86, 0, 84, 81, 79, 0, 0, 0, 79, 83, 86, 0, 88, 86, 83, 0, 84, 0, 79, 84, 88, 0, 0, 0];
      if (pos === 0 || pos === 4) this.kick(t, 0.72);
      if (pos === 2 || pos === 6) { this.snare(t, 0.48); this.clap(t, 0.35); }
      this.hat(t, 0.2, pos === 7);
      if (pos === 0 || pos === 3 || pos === 6) this.bass(t, roots[bar], eighth * 1.2, 0.46);
      if (pos === 0 || pos === 4) this.brass(t, chords[bar], eighth * 1.8, 0.24);
      if (mel[s]) {
        this.marimba(t, mel[s], eighth * 1.5, 0.34);
        this.lead(t, mel[s], eighth * 1.5, 0.18, "celesta");
      }
    } else if (kind === "epilogue_ok") {
      // Breezy happy stroll loop ("좋아!")
      const roots = [48, 45, 41, 43];
      const mel = [76, 0, 79, 0, 76, 74, 72, 0, 72, 0, 76, 0, 79, 0, 0, 0, 77, 0, 76, 0, 74, 72, 74, 0, 79, 0, 76, 0, 72, 0, 0, 0];
      if (pos === 0 || pos === 4) this.kick(t, 0.56);
      if (pos === 2 || pos === 6) this.snare(t, 0.34);
      if (pos % 2 === 1) this.hat(t, 0.18);
      if (pos === 0 || pos === 4) this.bass(t, roots[bar], eighth * 1.8, 0.4, "upright");
      if (pos === 2 || pos === 6) this.rhodes(t, [60, 64, 67], eighth * 1.2, 0.18);
      if (mel[s]) this.marimba(t, mel[s], eighth * 1.6, 0.3);
    } else if (kind === "epilogue_tryagain") {
      // Sympathetic comical tuba waddle loop ("다시 한번...")
      const roots = [48, 47, 46, 43];
      const mel = [64, 0, 63, 0, 62, 0, 0, 0, 60, 0, 59, 0, 58, 0, 0, 0, 65, 0, 64, 0, 62, 60, 59, 0, 62, 0, 0, 0, 55, 0, 0, 0];
      if (pos === 0 || pos === 4) this.bass(t, roots[bar] - (pos === 4 ? 5 : 0), eighth * 1.6, 0.5, "upright");
      if (pos === 2 || pos === 6) this.woodblock(t, 68, 0.22);
      if (mel[s]) this.lead(t, mel[s], eighth * 1.4, 0.2, "spy");
    }
  }

  // ===== FULL MULTI-TRACK STAGE BGM ENGINE (Beat-indexed half-beat precision) =====
  // Called by GameSession's lookahead scheduler for every eighth-note (stepIndex = beat * 2)
  playStageEighth(stageId, stepIdx, t, bpm, transpose = 0, activeSubStage = null) {
    const eighth = 60 / bpm / 2;
    const style = stageId === "remix" ? (activeSubStage || "pacifier") : stageId;
    const bar = Math.floor(stepIdx / 8);
    const pos = stepIdx % 8; // 0..7 eighth notes in bar
    const phraseBar = bar % 4;
    const isFill = bar % 4 === 3 && pos >= 5;
    const tr = transpose;

    if (style === "pacifier") {
      // Funky Shibuya-kei / Brass-Pop (Key: C Major / D Minor funk)
      const prog = [
        { root: 48, chord: [60, 64, 67, 71] },
        { root: 45, chord: [57, 60, 64, 69] },
        { root: 50, chord: [62, 65, 69, 72] },
        { root: 43, chord: [59, 62, 65, 71] },
      ];
      const p = prog[phraseBar];
      if (pos === 0 || pos === 3 || (pos === 5 && bar % 2 === 1)) this.kick(t, 0.84, 138);
      if (pos === 2 || pos === 6) { this.snare(t, 0.62); this.clap(t, 0.28); }
      this.hat(t, pos % 2 === 0 ? 0.22 : 0.3, pos === 7);
      if (isFill) {
        this.snare(t, 0.55 + (pos - 5) * 0.1, 210 + (pos - 5) * 28);
      }
      if (pos === 0 || pos === 2 || pos === 5 || pos === 6) {
        const oct = pos === 6 ? 12 : 0;
        this.bass(t, p.root + oct + tr, eighth * 1.15, 0.56, "funk");
      }
      if (pos === 0 || pos === 3) this.rhodes(t, p.chord.map((n) => n + tr), eighth * 2.1, 0.24);
      if (pos === 0 && bar % 2 === 0) this.brass(t, p.chord.map((n) => n + tr), eighth * 1.4, 0.28);
      if (pos === 6 && bar % 2 === 1) this.brass(t, p.chord.map((n) => n + 12 + tr), eighth * 1.2, 0.26);
      // Catchy melody hooks
      const hooks = [
        [76, 0, 79, 0, 81, 79, 76, 0],
        [72, 0, 76, 0, 79, 0, 76, 72],
        [74, 0, 77, 0, 81, 79, 77, 74],
        [79, 81, 83, 0, 84, 0, 79, 0],
      ];
      const m = hooks[phraseBar][pos];
      if (m) this.marimba(t, m + tr, eighth * 1.35, 0.34);
    } else if (style === "burp") {
      // Bouncy Jazz Swing-Pop (Key: F Major)
      const prog = [
        { root: 41, chord: [65, 69, 72, 76] },
        { root: 46, chord: [65, 70, 74, 77] },
        { root: 43, chord: [62, 65, 69, 72] },
        { root: 48, chord: [64, 67, 70, 74] },
      ];
      const p = prog[phraseBar];
      const swingShift = pos % 2 === 1 ? eighth * 0.22 : 0;
      const st = t + swingShift;
      if (pos === 0 || pos === 4) this.kick(st, 0.72, 118);
      if (pos === 2 || pos === 6) this.snare(st, 0.48, 185);
      this.hat(st, pos % 2 === 0 ? 0.28 : 0.2, pos === 3 || pos === 7);
      if (isFill) this.woodblock(st, 72 + (pos - 5) * 4, 0.48);
      // Walking upright bass every beat
      if (pos % 2 === 0) {
        const walk = [0, 4, 7, 5][pos / 2];
        this.bass(st, p.root + walk + tr, eighth * 1.8, 0.56, "upright");
      }
      if (pos === 0 || pos === 3 || pos === 6) {
        this.rhodes(st, p.chord.map((n) => n + tr), eighth * 1.8, 0.25);
      }
      if (pos === 4 && bar % 2 === 1) this.brass(st, p.chord.map((n) => n + tr), eighth * 1.5, 0.28);
      const hooks = [
        [77, 0, 81, 0, 84, 0, 81, 77],
        [82, 0, 81, 79, 77, 0, 74, 0],
        [74, 0, 77, 0, 81, 0, 79, 77],
        [79, 0, 82, 0, 84, 0, 81, 0],
      ];
      const m = hooks[phraseBar][pos];
      if (m) this.marimba(st, m + tr, eighth * 1.5, 0.32);
    } else if (style === "photo") {
      // Energetic Electro-Swing Studio Pop (Key: G Major)
      const prog = [
        { root: 43, chord: [67, 71, 74, 78] },
        { root: 40, chord: [64, 67, 71, 74] },
        { root: 48, chord: [67, 72, 76, 79] },
        { root: 50, chord: [66, 69, 72, 76] },
      ];
      const p = prog[phraseBar];
      if (pos % 2 === 0) this.kick(t, 0.86, 142); // Four-on-the-floor dance studio energy!
      if (pos === 2 || pos === 6) { this.snare(t, 0.64); this.clap(t, 0.44); }
      if (pos % 2 === 1) this.hat(t, 0.32, pos === 7);
      if (isFill) {
        this.clap(t, 0.5);
        this.snare(t, 0.6, 220 + (pos - 5) * 35);
      }
      if (pos === 0 || pos === 1 || pos === 4 || pos === 6) {
        this.bass(t, p.root + (pos === 1 || pos === 6 ? 12 : 0) + tr, eighth * 0.9, 0.56, "funk");
      }
      if (pos === 1 || pos === 3 || pos === 5 || pos === 7) {
        this.rhodes(t, p.chord.map((n) => n + tr), eighth * 0.9, 0.24);
      }
      if (pos === 0) this.brass(t, p.chord.map((n) => n + tr), eighth * 1.2, 0.3);
      const hooks = [
        [79, 0, 83, 86, 0, 83, 79, 0],
        [76, 0, 79, 83, 0, 79, 76, 0],
        [84, 0, 83, 79, 0, 76, 79, 0],
        [81, 83, 86, 0, 88, 0, 86, 0],
      ];
      const m = hooks[phraseBar][pos];
      if (m) this.lead(t, m + tr, eighth * 1.15, 0.22, "pop");
    } else if (style === "ninja") {
      // Smoky Stealth Spy Jazz (Key: A Minor)
      const prog = [
        { root: 45, chord: [60, 64, 67, 71] },
        { root: 45, chord: [60, 64, 68, 71] },
        { root: 50, chord: [62, 65, 69, 72] },
        { root: 40, chord: [59, 64, 68, 71] },
      ];
      const p = prog[phraseBar];
      if (pos === 0 || pos === 4) this.kick(t, 0.68, 108);
      if (pos === 2 || pos === 6) this.woodblock(t, 74, 0.34);
      this.hat(t, pos % 2 === 0 ? 0.16 : 0.24, pos === 6);
      // Iconic spy-movie creeping bassline
      const spyLine = [0, 0, 3, 0, 4, 0, 3, 2];
      if (pos % 2 === 0 || pos === 7) {
        this.bass(t, p.root + spyLine[pos] + tr, eighth * 1.4, 0.58, "upright");
      }
      if (pos === 0 || pos === 6) this.rhodes(t, p.chord.map((n) => n + tr), eighth * 1.6, 0.2);
      const hooks = [
        [76, 0, 79, 0, 80, 79, 76, 0],
        [72, 0, 76, 0, 75, 0, 72, 0],
        [74, 0, 77, 0, 81, 0, 77, 74],
        [76, 0, 75, 0, 76, 0, 0, 0],
      ];
      const m = hooks[phraseBar][pos];
      if (m) this.lead(t, m + tr, eighth * 1.4, 0.22, "spy");
    }
  }
}
