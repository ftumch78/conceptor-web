// Conceptor web engine: 12 mono tracks, eight effects per track, drum grid, mastering, export.
// Same knobs, ranges and defaults as the Android app (app/src/main/cpp/dsp.h).
'use strict';

const CZ = {};
CZ.TRACKS = 12;
CZ.MAX_SECONDS = 240;
CZ.UNITS = ['Gate', 'Compressor', 'Pedal', 'Amp', 'EQ', 'Analog delay', 'Digital delay', 'Reverb'];
CZ.U = { gate: 0, comp: 1, pedal: 2, amp: 3, eq: 4, adelay: 5, ddelay: 6, reverb: 7 };
CZ.VARIANTS = [[], ['Punch', 'Smooth'],
  ['Overdrive', 'Distortion', 'Fuzz', 'Big fuzz', 'Clean boost', 'Hard distortion', 'Chorus', 'Flanger', 'Tremolo'],
  ['Clean', 'Chime', 'Blues', 'Crunch', 'Lead', 'High gain', 'Bass'], [], [], [], ['Room', 'Hall', 'Plate', 'Spring']];
CZ.BLURB = ['Cuts the hiss and hum between notes.', 'Evens out loud and quiet playing.', 'A stomp box in front of the amp.',
  'The amp and speaker cabinet.', 'Four bands of bass and treble control.', 'Warm, slightly dirty repeats.', 'Clean, exact repeats.', 'Adds space around the sound.'];

// knob: [name, lo, hi, def, log, unit, decimals]
CZ.spec = function (u, v) {
  const k = (n, lo, hi, def, lg = false, un = '', dec = 2) => ({ name: n, lo, hi, def, log: lg, unit: un, dec });
  switch (u) {
    case 0: return [k('Threshold', -80, 0, -50, false, 'dB', 1), k('Attack', 0.1, 50, 1, true, 'ms', 1), k('Hold', 0, 500, 50, false, 'ms', 0),
      k('Release', 5, 1000, 150, true, 'ms', 0), k('Range', -80, 0, -80, false, 'dB', 0)];
    case 1: return v === 0
      ? [k('Input', 0, 30, 10, false, 'dB', 1), k('Ratio', 1.5, 20, 4, false, ':1', 1), k('Attack', 0.02, 0.8, 0.2, false, 'ms', 2), k('Release', 50, 1100, 250, true, 'ms', 0), k('Output', -24, 12, -6, false, 'dB', 1)]
      : [k('Amount', 0, 100, 40, false, '', 0), k('Gain', 0, 40, 8, false, 'dB', 1), k('Mix', 0, 1, 1)];
    case 2: switch (v) {
      case 0: return [k('Drive', 0, 1, 0.5), k('Tone', 0, 1, 0.5), k('Level', 0, 1, 0.6)];
      case 1: return [k('Dist', 0, 1, 0.5), k('Tone', 0, 1, 0.5), k('Level', 0, 1, 0.5)];
      case 2: return [k('Fuzz', 0, 1, 0.7), k('Tone', 0, 1, 0.5), k('Level', 0, 1, 0.5)];
      case 3: return [k('Sustain', 0, 1, 0.6), k('Tone', 0, 1, 0.5), k('Volume', 0, 1, 0.5)];
      case 4: return [k('Gain', 0, 1, 0.4), k('Treble', 0, 1, 0.5), k('Output', 0, 1, 0.5)];
      case 5: return [k('Distortion', 0, 1, 0.5), k('Filter', 0, 1, 0.4), k('Volume', 0, 1, 0.5)];
      case 6: return [k('Rate', 0.1, 8, 0.8, true, 'Hz', 2), k('Depth', 0, 1, 0.5), k('Vibrato', 0, 1, 0), k('Level', 0, 1, 0.7)];
      case 7: return [k('Manual', 0, 1, 0.5), k('Width', 0, 1, 0.6), k('Speed', 0.05, 5, 0.4, true, 'Hz', 2), k('Regen', 0, 1, 0.5)];
      default: return [k('Rate', 0.5, 12, 4, true, 'Hz', 1), k('Depth', 0, 1, 0.6), k('Wave', 0, 1, 0), k('Level', 0, 1, 0.7)];
    }
    case 3: return [k('Gain', 0, 1, 0.4), k('Bass', -1, 1, 0), k('Mid', -1, 1, 0), k('Treble', -1, 1, 0), k('Cabinet', 0, 1, 1), k('Level', -24, 12, 0, false, 'dB', 1)];
    case 4: return [k('Low gain', -16, 16, 0, false, 'dB', 1), k('Low freq', 30, 300, 100, true, 'Hz', 0), k('Low mid gain', -16, 16, 0, false, 'dB', 1), k('Low mid freq', 200, 2500, 700, true, 'Hz', 0),
      k('High mid gain', -16, 16, 0, false, 'dB', 1), k('High mid freq', 1000, 9000, 3500, true, 'Hz', 0), k('High gain', -16, 16, 0, false, 'dB', 1), k('High freq', 3000, 20000, 10000, true, 'Hz', 0), k('Output', -12, 12, 0, false, 'dB', 1)];
    case 5: return [k('Time', 1, 2000, 350, true, 'ms', 0), k('Feedback', 0, 0.95, 0.35), k('Tone', 500, 16000, 3500, true, 'Hz', 0), k('Mix', 0, 1, 0.25)];
    case 6: return [k('Time', 1, 2000, 350, true, 'ms', 0), k('Feedback', 0, 0.95, 0.35), k('Tone', 500, 16000, 12000, true, 'Hz', 0), k('Mix', 0, 1, 0.25), k('Ping-pong', 0, 1, 0)];
    case 7: {
      const sz = [0.35, 0.8, 0.6, 0.25], dm = [0.5, 0.35, 0.2, 0.7], mx = [0.22, 0.28, 0.25, 0.3], pd = [0, 25, 10, 0];
      const i = Math.max(0, Math.min(3, v));
      return [k('Size', 0, 1, sz[i]), k('Damping', 0, 1, dm[i]), k('Pre-delay', 0, 200, pd[i], false, 'ms', 0), k('Width', 0, 1, 1), k('Mix', 0, 1, mx[i])];
    }
  }
  return [];
};
CZ.defaults = (u, v) => CZ.spec(u, v).map((k) => k.def);
CZ.toFrac = (k, v) => { if (k.hi <= k.lo) return 0; const f = k.log && k.lo > 0 ? Math.log(Math.max(v, k.lo) / k.lo) / Math.log(k.hi / k.lo) : (v - k.lo) / (k.hi - k.lo); return Math.max(0, Math.min(1, f)); };
CZ.fromFrac = (k, f) => (k.log && k.lo > 0 ? k.lo * Math.pow(k.hi / k.lo, f) : k.lo + (k.hi - k.lo) * f);
CZ.knobText = (k, v) => { if (k.unit === 'Hz' && v >= 1000) return (v / 1000).toFixed(2) + ' kHz'; const n = v.toFixed(k.dec); return k.unit ? n + ' ' + k.unit : n; };
CZ.formatTime = (s) => { s = Math.max(0, s); const m = Math.floor(s / 60); const r = s - m * 60; return m + ':' + (r < 10 ? '0' : '') + r.toFixed(1); };
CZ.dbToGain = (db) => (db <= -59.5 ? 0 : Math.pow(10, db / 20));

CZ.DRUMS = ['Kick', 'Snare', 'Closed hat', 'Open hat', 'Clap', 'Tom'];
CZ.DRUM_PRESETS = ['Empty', 'Basic rock', 'Four on the floor', 'Half time', 'Shuffle feel'];
CZ.DRUM_PATTERNS = [
  ['................', '................', '................', '................', '................', '................'],
  ['x.......x.x.....', '....x.......x...', 'x.x.x.x.x.x.x.x.', '................', '................', '................'],
  ['x...x...x...x...', '................', '................', '..x...x...x...x.', '....x.......x...', '................'],
  ['x..........x....', '........x.......', 'x.x.x.x.x.x.x.x.', '................', '................', '...............x'],
  ['x.....x.x.......', '....x.......x..x', 'x..xx..xx..xx..x', '................', '................', '................']];

// ------------------------------------------------------------------ the song (plain data, saved to the browser)
CZ.newSong = function (name) {
  const tracks = [];
  for (let t = 0; t < CZ.TRACKS; t++) {
    tracks.push({ name: 'Track ' + (t + 1), vol: 0, pan: 0, trim: 0, mute: false, solo: false, arm: false,
      fx: CZ.UNITS.map((_, u) => ({ on: false, variant: 0, vals: CZ.defaults(u, 0) })), audio: null });
  }
  return {
    name, tracks, shown: 4, masterVol: 0, bpm: 100, click: false, loop: false, loopStart: 0, loopEnd: 0,
    drums: { on: false, vol: -6, steps: CZ.DRUM_PATTERNS[0].map(() => new Array(16).fill(false)) },
    master: { on: false, gain: 3, ceiling: -1, eq: { on: false, variant: 0, vals: CZ.defaults(4, 0) },
      comp: { on: true, variant: 1, vals: [25, 2, 1] } },
  };
};
CZ.applyPreset = function (song, k) {
  song.drums.steps = CZ.DRUM_PATTERNS[k].map((row) => Array.from(row).map((c) => c === 'x'));
};

// ------------------------------------------------------------------ shaping curves and impulse responses
CZ.curve = function (kind, drive) {
  const n = 2048, c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    let y;
    switch (kind) {
      case 'soft': y = Math.tanh(x * (1 + drive * 12)) / Math.tanh(1 + drive * 12); break;
      case 'hard': { const g = 1 + drive * 40; y = Math.max(-1, Math.min(1, x * g)) * 0.9 + Math.tanh(x * g) * 0.1; break; }
      case 'fuzz': { const g = 1 + drive * 80; const a = x * g; y = (a >= 0 ? Math.tanh(a) : Math.tanh(a * 0.6) * 0.8); break; }
      case 'asym': { const g = 1 + drive * 20; y = Math.tanh(x * g + 0.15) - Math.tanh(0.15); break; }
      default: y = x;
    }
    c[i] = y;
  }
  return c;
};
CZ.impulse = function (ctx, size, damping, type) {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * (0.4 + size * (type === 1 ? 4.2 : 2.6)));
  const buf = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0, seed = ch ? 777 : 333;
    const coef = 0.15 + (1 - damping) * 0.8;
    for (let i = 0; i < len; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const nz = seed / 2147483648 - 1;
      lp += coef * (nz - lp);
      const t = i / sr;
      const env = Math.pow(1 - i / len, 2.2) * (type === 3 ? (1 + 0.5 * Math.sin(t * 90)) : 1);
      d[i] = (type === 2 ? nz * 0.6 + lp * 0.4 : lp) * env * 0.5;
    }
  }
  return buf;
};

// ------------------------------------------------------------------ one effect unit as audio nodes
// Every unit has .input and .output; set(vals, variant) updates it.
CZ.makeUnit = function (ctx, u) {
  const input = ctx.createGain(), output = ctx.createGain();
  const unit = { input, output, u, variant: -1, set: () => {} };
  // first setting is immediate (no fade from the default); later changes glide, so knob moves do not click
  const P = (param, v) => { if (!unit.live) { param.value = v; return; } try { param.setTargetAtTime(v, ctx.currentTime, 0.01); } catch (e) { param.value = v; } };
  if (u === 0) {
    const g = new AudioWorkletNode(ctx, 'cz-gate', { outputChannelCount: [2] });
    input.connect(g); g.connect(output);
    unit.set = (v) => { ['threshold', 'attack', 'hold', 'release', 'range'].forEach((n, i) => g.parameters.get(n).setValueAtTime(v[i], ctx.currentTime)); };
  } else if (u === 1) {
    const pre = ctx.createGain(), comp = ctx.createDynamicsCompressor(), post = ctx.createGain(), dry = ctx.createGain(), wet = ctx.createGain();
    input.connect(pre); pre.connect(comp); comp.connect(post); post.connect(wet); wet.connect(output); input.connect(dry); dry.connect(output);
    comp.knee.value = 4;
    unit.comp = comp;
    // browsers add their own make-up gain to the compressor; this takes it back out
    const undoMakeup = (thr, ratio) => Math.pow(10, (-0.6 * -thr * (1 - 1 / ratio)) / 20);
    unit.set = (v, variant) => {
      if (variant === 0) {
        const r = Math.min(20, v[1]);
        P(pre.gain, Math.pow(10, v[0] / 20)); comp.threshold.value = -12; comp.ratio.value = r;
        comp.attack.value = v[2] / 1000; comp.release.value = v[3] / 1000; P(post.gain, Math.pow(10, v[4] / 20) * undoMakeup(-12, r)); P(wet.gain, 1); P(dry.gain, 0);
      } else {
        const t = -4 - v[0] * 0.4;
        P(pre.gain, 1); comp.threshold.value = t; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.25;
        P(post.gain, Math.pow(10, (v[1] * 0.6) / 20) * undoMakeup(t, 3)); P(wet.gain, v[2]); P(dry.gain, 1 - v[2]);
      }
    };
  } else if (u === 2) {
    // drive pedals: shaper; modulation pedals: delay with LFO; tremolo: gain with LFO
    const shaper = ctx.createWaveShaper(), pre = ctx.createGain(), tone = ctx.createBiquadFilter(), level = ctx.createGain();
    shaper.oversample = '2x'; tone.type = 'lowpass';
    const dly = ctx.createDelay(0.05), lfo = ctx.createOscillator(), lfoAmt = ctx.createGain(), fb = ctx.createGain(), wet = ctx.createGain(), dry = ctx.createGain();
    const trem = ctx.createGain(), tremAmt = ctx.createGain();
    lfo.connect(lfoAmt); lfo.start();
    let mode = '';
    const wire = (m) => {
      if (m === mode) return; mode = m;
      [input, pre, shaper, tone, dly, fb, wet, dry, trem, lfoAmt].forEach((n) => { try { n.disconnect(); } catch (e) {} });
      lfo.connect(lfoAmt);
      if (m === 'drive') { input.connect(pre); pre.connect(shaper); shaper.connect(tone); tone.connect(level); }
      else if (m === 'mod') { input.connect(dly); dly.connect(wet); wet.connect(level); input.connect(dry); dry.connect(level); dly.connect(fb); fb.connect(dly); lfoAmt.connect(dly.delayTime); }
      else { input.connect(trem); trem.connect(level); lfoAmt.connect(trem.gain); }
    };
    level.connect(output);
    unit.set = (v, variant) => {
      if (variant <= 5) {
        wire('drive');
        const kinds = ['soft', 'hard', 'fuzz', 'fuzz', 'soft', 'hard'];
        const drv = variant === 4 ? v[0] * 0.15 : v[0];
        if (unit.variant !== variant || unit.lastDrive !== drv) { shaper.curve = CZ.curve(kinds[variant], drv); unit.lastDrive = drv; }
        P(pre.gain, variant === 4 ? 1 + v[0] * 3 : 1);
        P(tone.frequency, 800 * Math.pow(12000 / 800, v[1]));
        const trim = [0.29, 0.2, 0.21, 0.21, 0.57, 0.2][variant];
        P(level.gain, (variant === 4 ? v[2] * 2 : v[2] * 1.6) * trim);
      } else if (variant === 6 || variant === 7) {
        wire('mod');
        const chorus = variant === 6;
        const base = chorus ? 0.012 : 0.001 + v[0] * 0.006;
        P(dly.delayTime, base);
        P(lfo.frequency, chorus ? v[0] : v[2]);
        P(lfoAmt.gain, chorus ? v[1] * 0.004 : v[1] * 0.003);
        P(fb.gain, chorus ? 0 : v[3] * 0.85);
        P(wet.gain, chorus ? 0.5 + v[2] * 0.5 : 0.6); P(dry.gain, chorus ? 1 - v[2] : 0.7);
        P(level.gain, chorus ? v[3] * 1.4 : 1);
      } else {
        wire('trem');
        lfo.type = v[2] > 0.5 ? 'square' : 'sine';
        P(lfo.frequency, v[0]);
        P(trem.gain, 1 - v[1] * 0.5); P(lfoAmt.gain, v[1] * 0.5);
        P(level.gain, v[3] * 1.4);
      }
    };
  } else if (u === 3) {
    const pre = ctx.createGain(), shaper = ctx.createWaveShaper(), bass = ctx.createBiquadFilter(), mid = ctx.createBiquadFilter(), treb = ctx.createBiquadFilter();
    const hp = ctx.createBiquadFilter(), cabLp = ctx.createBiquadFilter(), cabPk = ctx.createBiquadFilter(), cab = ctx.createGain(), nocab = ctx.createGain(), level = ctx.createGain();
    shaper.oversample = '2x'; bass.type = 'lowshelf'; mid.type = 'peaking'; treb.type = 'highshelf'; hp.type = 'highpass'; cabLp.type = 'lowpass'; cabPk.type = 'peaking';
    mid.Q.value = 0.8; cabPk.Q.value = 1.2;
    input.connect(pre); pre.connect(shaper); shaper.connect(bass); bass.connect(mid); mid.connect(treb);
    treb.connect(hp); hp.connect(cabPk); cabPk.connect(cabLp); cabLp.connect(cab); cab.connect(level); treb.connect(nocab); nocab.connect(level); level.connect(output);
    //            gLo gHi shape bass mid treb cabHp cabLp pk pkDb
    const A = [[1, 3, 'soft', 120, 700, 3000, 70, 6500, 2400, 2], [1, 6, 'asym', 110, 900, 3500, 80, 6000, 2800, 3], [2, 12, 'soft', 120, 650, 2800, 80, 5000, 1600, 2],
      [3, 25, 'asym', 110, 800, 3000, 90, 5200, 2000, 3], [6, 50, 'hard', 100, 750, 2800, 90, 4800, 1800, 4], [10, 90, 'hard', 90, 650, 3200, 100, 4500, 2200, 5], [1, 5, 'soft', 60, 500, 2500, 40, 4000, 800, 2]];
    unit.set = (v, variant) => {
      const a = A[variant] || A[0];
      const drive = a[0] + (a[1] - a[0]) * v[0];
      const key = variant + ':' + drive.toFixed(2);
      if (unit.curveKey !== key) { shaper.curve = CZ.curve(a[2], Math.min(1, drive / 100 + v[0] * 0.5)); unit.curveKey = key; }
      P(pre.gain, drive / 4);
      bass.frequency.value = a[3]; mid.frequency.value = a[4]; treb.frequency.value = a[5];
      P(bass.gain, v[1] * 12); P(mid.gain, v[2] * 10); P(treb.gain, v[3] * 12);
      hp.frequency.value = a[6]; cabLp.frequency.value = a[7]; cabPk.frequency.value = a[8]; cabPk.gain.value = a[9];
      P(cab.gain, v[4]); P(nocab.gain, 1 - v[4]);
      P(level.gain, Math.pow(10, v[5] / 20) * [0.64, 0.32, 0.24, 0.16, 0.125, 0.125, 0.8][variant]);
    };
  } else if (u === 4) {
    const f = [ctx.createBiquadFilter(), ctx.createBiquadFilter(), ctx.createBiquadFilter(), ctx.createBiquadFilter()], out = ctx.createGain();
    f[0].type = 'lowshelf'; f[1].type = 'peaking'; f[2].type = 'peaking'; f[3].type = 'highshelf'; f[1].Q.value = 0.9; f[2].Q.value = 0.9;
    input.connect(f[0]); f[0].connect(f[1]); f[1].connect(f[2]); f[2].connect(f[3]); f[3].connect(out); out.connect(output);
    unit.set = (v) => { for (let i = 0; i < 4; i++) { P(f[i].gain, v[i * 2]); P(f[i].frequency, Math.min(v[i * 2 + 1], ctx.sampleRate * 0.45)); } P(out.gain, Math.pow(10, v[8] / 20)); };
  } else if (u === 5 || u === 6) {
    const a = ctx.createDelay(2.5), b = ctx.createDelay(2.5), lpA = ctx.createBiquadFilter(), lpB = ctx.createBiquadFilter();
    const gAA = ctx.createGain(), gAB = ctx.createGain(), gBA = ctx.createGain(), wet = ctx.createGain(), dry = ctx.createGain();
    const toL = ctx.createGain(), toR = ctx.createGain(), bR = ctx.createGain(), merger = ctx.createChannelMerger(2), mono = ctx.createGain();
    lpA.type = 'lowpass'; lpB.type = 'lowpass';
    mono.channelCount = 1; mono.channelCountMode = 'explicit';
    input.connect(dry); dry.connect(output);
    input.connect(mono); mono.connect(a); a.connect(lpA); lpA.connect(gAA); gAA.connect(a); lpA.connect(gAB); gAB.connect(b); b.connect(lpB); lpB.connect(gBA); gBA.connect(a);
    lpA.connect(toL); lpA.connect(toR); lpB.connect(bR); toL.connect(merger, 0, 0); toR.connect(merger, 0, 1); bR.connect(merger, 0, 1);
    merger.connect(wet); wet.connect(output);
    let sat = null;
    if (u === 5) { sat = ctx.createWaveShaper(); sat.curve = CZ.curve('soft', 0.15); gAA.disconnect(); gAA.connect(sat); sat.connect(a); }
    unit.set = (v) => {
      const t = v[0] / 1000, fb = v[1], pp = u === 6 ? (v[4] > 0.5 ? 1 : 0) : 0;
      P(a.delayTime, t); P(b.delayTime, t); P(lpA.frequency, v[2]); P(lpB.frequency, v[2]);
      P(gAA.gain, fb * (1 - pp)); P(gAB.gain, fb * pp + (pp ? 1 : 0) * 0); P(gBA.gain, fb * pp);
      if (pp) P(gAB.gain, 1);
      P(toL.gain, 1); P(toR.gain, 1 - pp); P(bR.gain, pp);
      P(wet.gain, v[3]); P(dry.gain, 1);
    };
  } else if (u === 7) {
    const pre = ctx.createDelay(0.25), conv = ctx.createConvolver(), wet = ctx.createGain(), dry = ctx.createGain();
    input.connect(dry); dry.connect(output); input.connect(pre); pre.connect(conv); conv.connect(wet); wet.connect(output);
    unit.set = (v, variant) => {
      const key = variant + ':' + v[0].toFixed(2) + ':' + v[1].toFixed(2);
      if (unit.irKey !== key) { conv.buffer = CZ.impulse(ctx, v[0], v[1], variant); unit.irKey = key; }
      P(pre.delayTime, v[2] / 1000); P(wet.gain, v[4] * 1.2); P(dry.gain, 1 - v[4] * 0.5);
    };
  }
  return unit;
};

// A slot holds one unit and can bypass it.
CZ.makeSlot = function (ctx, u) {
  const unit = CZ.makeUnit(ctx, u);
  const slot = { input: ctx.createGain(), output: ctx.createGain(), unit, on: null };
  slot.apply = (fx) => {
    if (fx.on !== slot.on) {
      try { slot.input.disconnect(); } catch (e) {}
      try { unit.output.disconnect(); } catch (e) {}
      if (fx.on) { slot.input.connect(unit.input); unit.output.connect(slot.output); } else slot.input.connect(slot.output);
      slot.on = fx.on;
    }
    if (fx.on) { unit.set(fx.vals, fx.variant); unit.variant = fx.variant; unit.live = !(ctx instanceof OfflineAudioContext); }
  };
  return slot;
};

// A track strip: trim -> 8 effects -> volume -> pan
CZ.makeStrip = function (ctx, dest) {
  const s = { trim: ctx.createGain(), vol: ctx.createGain(), pan: ctx.createStereoPanner(), meter: ctx.createAnalyser(), slots: [] };
  s.meter.fftSize = 256;
  s.trim.channelCount = 2; s.trim.channelCountMode = 'explicit'; s.trim.channelInterpretation = 'speakers';
  let prev = s.trim;
  for (let u = 0; u < 8; u++) { const sl = CZ.makeSlot(ctx, u); prev.connect(sl.input); prev = sl.output; s.slots.push(sl); }
  prev.connect(s.vol); s.vol.connect(s.pan); s.pan.connect(dest); s.pan.connect(s.meter);
  s.apply = (t, audible) => {
    s.trim.gain.value = Math.pow(10, t.trim / 20);
    const g = audible ? CZ.dbToGain(t.vol) * Math.SQRT1_2 : 0;
    if (ctx instanceof OfflineAudioContext) s.vol.gain.value = g; else s.vol.gain.setTargetAtTime(g, ctx.currentTime, 0.01);
    s.pan.pan.value = t.pan;
    t.fx.forEach((fx, u) => s.slots[u].apply(fx));
  };
  return s;
};

// Mastering chain: EQ -> compressor -> limiter (or the safety limiter when mastering is off) -> master volume
CZ.makeMaster = function (ctx, dest) {
  const m = { input: ctx.createGain(), vol: ctx.createGain(), meter: ctx.createAnalyser(), reduction: 0 };
  m.meter.fftSize = 256;
  m.eq = CZ.makeSlot(ctx, 4); m.comp = CZ.makeSlot(ctx, 1);
  m.bypassed = ctx.createGain(); m.chain = ctx.createGain();
  m.lim = new AudioWorkletNode(ctx, 'cz-limiter', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2] });
  m.lim.port.onmessage = (e) => { m.reduction = e.data; };
  m.input.connect(m.vol);
  m.vol.connect(m.eq.input); m.eq.output.connect(m.comp.input); m.comp.output.connect(m.chain);
  m.vol.connect(m.bypassed);
  m.chain.connect(m.lim); m.bypassed.connect(m.lim); m.lim.connect(dest); m.lim.connect(m.meter);
  m.apply = (song) => {
    const ms = song.master;
    if (ctx instanceof OfflineAudioContext) m.vol.gain.value = CZ.dbToGain(song.masterVol); else m.vol.gain.setTargetAtTime(CZ.dbToGain(song.masterVol), ctx.currentTime, 0.01);
    m.chain.gain.value = ms.on ? 1 : 0; m.bypassed.gain.value = ms.on ? 0 : 1;
    m.eq.apply(ms.eq); m.comp.apply(ms.comp);
    m.lim.parameters.get('mode').setValueAtTime(ms.on ? 1 : 0, ctx.currentTime);
    m.lim.parameters.get('gain').setValueAtTime(ms.gain, ctx.currentTime);
    m.lim.parameters.get('ceiling').setValueAtTime(ms.ceiling, ctx.currentTime);
    if (!ms.on) m.reduction = 0;
  };
  return m;
};

// ------------------------------------------------------------------ drum sounds (generic, made in code)
CZ.drumBuffers = function (ctx) {
  const sr = ctx.sampleRate;
  let seed = 12345;
  const noise = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return (seed | 0) / 2147483648; };
  const make = (sec, fn) => { const b = ctx.createBuffer(1, Math.floor(sec * sr), sr); const d = b.getChannelData(0); fn(d); return b; };
  const out = [];
  out.push(make(0.45, (d) => { let ph = 0; for (let i = 0; i < d.length; i++) { const t = i / sr; const f = 48 + 110 * Math.exp(-t * 28); ph += 2 * Math.PI * f / sr; d[i] = Math.sin(ph) * Math.exp(-t * 7) * 0.95 + (i < 60 ? noise() * 0.3 * (1 - i / 60) : 0); } }));
  out.push(make(0.3, (d) => { let hp = 0, prev = 0, ph = 0; for (let i = 0; i < d.length; i++) { const t = i / sr; ph += 2 * Math.PI * 190 / sr; const x = noise(); hp = 0.85 * (hp + x - prev); prev = x; d[i] = Math.sin(ph) * Math.exp(-t * 30) * 0.45 + hp * Math.exp(-t * 16) * 0.55; } }));
  for (const v of [2, 3]) {
    const len = v === 2 ? 0.08 : 0.45, dec = v === 2 ? 60 : 9;
    out.push(make(len, (d) => { let hp = 0, prev = 0; for (let i = 0; i < d.length; i++) { const x = noise(); hp = 0.55 * (hp + x - prev); prev = x; d[i] = hp * Math.exp(-i / sr * dec) * 0.35; } }));
  }
  out.push(make(0.3, (d) => { let lp = 0, hp = 0, pl = 0; for (let i = 0; i < d.length; i++) { const t = i / sr; const burst = t % 0.011; const env = t < 0.033 ? Math.exp(-burst * 300) : Math.exp(-(t - 0.033) * 18) * 0.7; lp += 0.35 * (noise() - lp); hp = 0.9 * (hp + lp - pl); pl = lp; d[i] = hp * env * 0.9; } }));
  out.push(make(0.4, (d) => { let ph = 0; for (let i = 0; i < d.length; i++) { const t = i / sr; const f = 95 + 45 * Math.exp(-t * 12); ph += 2 * Math.PI * f / sr; d[i] = Math.sin(ph) * Math.exp(-t * 9) * 0.8; } }));
  return out;
};
CZ.clickBuffers = function (ctx) {
  const sr = ctx.sampleRate;
  return [1600, 1000].map((f) => { const b = ctx.createBuffer(1, 1200, sr); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.sin(2 * Math.PI * f * i / sr) * (1 - i / 1200) * 0.25; return b; });
};

// ------------------------------------------------------------------ helpers for files
CZ.songLength = (song) => { let m = 0; for (const t of song.tracks) if (t.audio) m = Math.max(m, t.audio.length); return m; };

CZ.encodeWav = function (channels, sr) {
  const ch = channels.length, n = channels[0].length, bytes = n * ch * 2;
  const buf = new ArrayBuffer(44 + bytes), v = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + bytes, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, ch, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * ch * 2, true); v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, bytes, true);
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const x = Math.max(-1, Math.min(1, channels[c][i])); v.setInt16(o, Math.round(x * 32767), true); o += 2; }
  return new Blob([buf], { type: 'audio/wav' });
};
CZ.encodeMp3 = function (channels, sr) {
  const ch = channels.length;
  const enc = new lamejs.Mp3Encoder(ch, sr, 320);
  const toInt = (f) => { const a = new Int16Array(f.length); for (let i = 0; i < f.length; i++) a[i] = Math.max(-32768, Math.min(32767, Math.round(f[i] * 32767))); return a; };
  const L = toInt(channels[0]), R = ch > 1 ? toInt(channels[1]) : null;
  const parts = [], block = 1152 * 10;
  for (let i = 0; i < L.length; i += block) {
    const d = ch > 1 ? enc.encodeBuffer(L.subarray(i, i + block), R.subarray(i, i + block)) : enc.encodeBuffer(L.subarray(i, i + block));
    if (d.length) parts.push(new Uint8Array(d));
  }
  const end = enc.flush(); if (end.length) parts.push(new Uint8Array(end));
  return new Blob(parts, { type: 'audio/mpeg' });
};
