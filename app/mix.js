// Conceptor 0.4.3 mixer engine: effects with knobs (0 to 100), 7-band curve EQ, an effects chain that can be re-ordered,
// a pedalboard with all nine pedals at once, a drum channel and a master channel (EQ, Comp, Loud, Ceil).
'use strict';

CZ.EQF = [60, 150, 400, 1000, 2500, 6000, 12000];
CZ.PEDALS = [
  { key: 'od', n: 'Overdrive', c: '#E9D08E', k: ['Drive', 'Tone', 'Level'], def: [50, 50, 50] },
  { key: 'vf', n: 'Vintage Fuzz', c: '#E9A97D', k: ['Attack', 'Level'], def: [70, 50], d: '60s fuzz, Tone Bender type' },
  { key: 'bf', n: 'Big Fuzz', c: '#C9B6A0', k: ['Sustain', 'Tone', 'Volume'], def: [60, 50, 50], d: 'Big Muff style' },
  { key: 'ch', n: 'Chorus', c: '#A2C9E8', k: ['Rate', 'Depth'], def: [35, 50] },
  { key: 'ph', n: 'Phaser', c: '#B9AAE0', k: ['Rate', 'Depth'], def: [30, 60] },
  { key: 'fl', n: 'Flanger', c: '#A9D4E0', k: ['Rate', 'Depth', 'Feedback'], def: [30, 60, 50], d: 'jet sweep' },
  { key: 'tr', n: 'Tremolo', c: '#9AD6C5', k: ['Rate', 'Depth'], def: [50, 50] },
  { key: 'wa', n: 'Wah', c: '#E5AAB9', k: ['Sweep', 'Q'], def: [50, 50] },
  { key: 'cp', n: 'Compressor', c: '#DCB74F', k: ['Sustain', 'Level'], def: [50, 50] }];
CZ.AMPSTYLES = ['Clean', 'Crunch', 'Lead', 'Bass', 'Acoustic'];
CZ.AMPKNOBS = ['Gain', 'Bass', 'Middle', 'Treble', 'Volume'];
CZ.FXLABEL = { amp: 'Amp and pedals', eq: 'EQ', comp: 'Compressor', gate: 'Gate', rev: 'Reverb', dd: 'Digital delay', ad: 'Analog delay', loud: 'Loudness', ceil: 'Ceiling' };
CZ.FXSHORT = { amp: 'Amp', eq: 'EQ', comp: 'Comp', gate: 'Gate', rev: 'Reverb', dd: 'Digital delay', ad: 'Analog delay', loud: 'Loudness', ceil: 'Ceiling' };
CZ.FXKNOBS = { comp: ['Threshold', 'Ratio', 'Attack', 'Release'], gate: ['Threshold', 'Release'], rev: ['Size', 'Tone', 'Mix'], dd: ['Time', 'Repeats', 'Mix'],
  ad: ['Time', 'Repeats', 'Warmth', 'Mix'], loud: ['Loudness'], ceil: ['Ceiling'] };
CZ.FXDEF = { comp: [40, 30, 30, 40], gate: [30, 40], rev: [35, 50, 30], dd: [40, 30, 25], ad: [45, 35, 50, 25], loud: [40], ceil: [83] };
CZ.ORDER = { track: ['gate', 'comp', 'amp', 'eq', 'ad', 'dd', 'rev'], drum: ['eq', 'comp', 'rev'], master: ['eq', 'comp', 'loud', 'ceil'] };
CZ.INPUTS = [['1', 'Input 1'], ['2', 'Input 2'], ['12', 'Inputs 1 + 2 (stereo)'], ['none', 'None']];
CZ.inputName = (k) => (CZ.INPUTS.find((x) => x[0] === k) || CZ.INPUTS[0])[1];
CZ.inputShort = (k) => ({ 1: '1', 2: '2', 12: '1+2', none: 'None' }[k] || '1');

CZ.newFx = function (kind) {
  const f = { order: CZ.ORDER[kind].slice(), eq: [0, 0, 0, 0, 0, 0, 0], eqOn: true };
  for (const k of CZ.ORDER[kind]) if (CZ.FXDEF[k]) { f[k] = CZ.FXDEF[k].slice(); f[k + 'On'] = kind === 'master'; }
  if (kind === 'track') {
    f.amp = { style: 'Clean', k: [40, 50, 50, 50, 67], on: false };
    f.pedals = CZ.PEDALS.map((p) => ({ on: false, k: p.def.slice() }));
    f.pedalOrder = CZ.PEDALS.map((_, j) => j);
  }
  return f;
};

// knob (0..100) to real values
const kExp = (v, lo, hi) => lo * Math.pow(hi / lo, v / 100);
const kLin = (v, lo, hi) => lo + (hi - lo) * v / 100;
const kInvExp = (x, lo, hi) => Math.max(0, Math.min(100, Math.log(Math.max(lo, Math.min(hi, x)) / lo) / Math.log(hi / lo) * 100));
CZ.knobText = function (key, j, v) {
  switch (key) {
    case 'comp': return [kLin(v, -60, 0).toFixed(0) + ' dB', kLin(v, 1, 20).toFixed(1) + ':1', kExp(v, 0.1, 100).toFixed(1) + ' ms', kExp(v, 20, 1000).toFixed(0) + ' ms'][j];
    case 'gate': return [kLin(v, -80, 0).toFixed(0) + ' dB', kExp(v, 5, 1000).toFixed(0) + ' ms'][j];
    case 'dd': case 'ad': return j === 0 ? kExp(v, 20, 1500).toFixed(0) + ' ms' : Math.round(v) + '';
    case 'loud': return '+' + kLin(v, 0, 12).toFixed(1) + ' dB';
    case 'ceil': return kLin(v, -6, 0).toFixed(1) + ' dB';
    default: return Math.round(v) + '';
  }
};

// ------------------------------------------------------------------ one switchable unit: .input .output .set(on, ...)
CZ.bypass = function (ctx, unit) {
  const s = { input: ctx.createGain(), output: ctx.createGain(), unit, on: null };
  s.setOn = (on) => {
    if (on === s.on) return;
    try { s.input.disconnect(); } catch (e) {}
    try { unit.output.disconnect(); } catch (e) {}
    if (on) { s.input.connect(unit.input); unit.output.connect(s.output); } else s.input.connect(s.output);
    s.on = on;
  };
  return s;
};
const isLive = (ctx) => !(ctx instanceof OfflineAudioContext);
const setP = (ctx, param, v) => { if (!isLive(ctx)) { param.value = v; return; } try { param.setTargetAtTime(v, ctx.currentTime, 0.01); } catch (e) { param.value = v; } };

CZ.makeEQ7 = function (ctx) {
  const input = ctx.createGain(), output = ctx.createGain();
  const f = CZ.EQF.map((fr, i) => { const b = ctx.createBiquadFilter(); b.type = i === 0 ? 'lowshelf' : i === 6 ? 'highshelf' : 'peaking'; b.frequency.value = Math.min(fr, ctx.sampleRate * 0.45); b.Q.value = 1.1; return b; });
  input.connect(f[0]); for (let i = 0; i < 6; i++) f[i].connect(f[i + 1]); f[6].connect(output);
  return { input, output, set: (g) => f.forEach((b, i) => setP(ctx, b.gain, Math.max(-12, Math.min(12, g[i] || 0)))) };
};
CZ.makeComp = function (ctx) {
  const input = ctx.createGain(), comp = ctx.createDynamicsCompressor(), post = ctx.createGain();
  comp.knee.value = 6; input.connect(comp); comp.connect(post);
  const undo = (thr, r) => Math.pow(10, (-0.6 * -thr * (1 - 1 / r)) / 20);   // takes the browser's own make-up gain back out
  return { input, output: post, comp, set: (v) => {
    const thr = kLin(v[0], -60, 0), r = kLin(v[1], 1, 20);
    comp.threshold.value = thr; comp.ratio.value = r; comp.attack.value = kExp(v[2], 0.1, 100) / 1000; comp.release.value = kExp(v[3], 20, 1000) / 1000;
    setP(ctx, post.gain, undo(thr, r) * Math.pow(10, (-thr * (1 - 1 / r)) * 0.35 / 20));   // a little make-up gain back
  } };
};
CZ.makeGate = function (ctx) {
  const u = CZ.makeUnit(ctx, 0);
  return { input: u.input, output: u.output, set: (v) => u.set([kLin(v[0], -80, 0), 1, 50, kExp(v[1], 5, 1000), -80]) };
};
CZ.makeRev = function (ctx) {
  const u = CZ.makeUnit(ctx, 7); u.live = isLive(ctx);
  return { input: u.input, output: u.output, set: (v) => u.set([v[0] / 100, 1 - v[1] / 100, 10, 1, v[2] / 100 * 0.8], v[0] > 60 ? 1 : 0) };
};
CZ.makeDelay = function (ctx, analog) {
  const u = CZ.makeUnit(ctx, analog ? 5 : 6); u.live = isLive(ctx);
  return { input: u.input, output: u.output, set: (v) => u.set(analog ? [kExp(v[0], 20, 1500), v[1] / 100 * 0.9, kExp(100 - v[2], 1000, 12000), v[3] / 100]
    : [kExp(v[0], 20, 1500), v[1] / 100 * 0.9, 12000, v[2] / 100, 0]) };
};
CZ.makeGainStage = function (ctx) { const g = ctx.createGain(); return { input: g, output: g, set: (v) => setP(ctx, g.gain, Math.pow(10, kLin(v[0], 0, 12) / 20)) }; };
CZ.makeCeil = function (ctx) {
  const lim = new AudioWorkletNode(ctx, 'cz-limiter', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2] });
  const input = ctx.createGain(); input.connect(lim);
  const u = { input, output: lim, reduction: 0, set: (v) => { lim.parameters.get('mode').setValueAtTime(1, ctx.currentTime); lim.parameters.get('gain').setValueAtTime(0, ctx.currentTime); lim.parameters.get('ceiling').setValueAtTime(kLin(v[0], -6, 0), ctx.currentTime); } };
  lim.port.onmessage = (e) => { u.reduction = e.data; };
  return u;
};

// ------------------------------------------------------------------ pedals
CZ.makePedal = function (ctx, key) {
  const input = ctx.createGain(), output = ctx.createGain();
  const P = (p, v) => setP(ctx, p, v);
  if (key === 'od' || key === 'ch' || key === 'fl' || key === 'tr') {
    const u = CZ.makeUnit(ctx, 2); u.live = isLive(ctx);
    const variant = { od: 0, ch: 6, fl: 7, tr: 8 }[key];
    return { input: u.input, output: u.output, set: (v) => {
      let vals;
      if (key === 'od') vals = [v[0] / 100, v[1] / 100, v[2] / 100 * 1.2];
      else if (key === 'ch') vals = [kExp(v[0], 0.1, 6), v[1] / 100, 0, 0.7];
      else if (key === 'fl') vals = [0.5, v[1] / 100, kExp(v[0], 0.05, 4), v[2] / 100];
      else vals = [kExp(v[0], 0.5, 12), v[1] / 100, 0, 0.7];
      u.set(vals, variant); u.variant = variant;
    } };
  }
  if (key === 'vf') {   // Vintage Fuzz: rough, gated, mid-heavy (60s Tone Bender type)
    const pre = ctx.createGain(), hp = ctx.createBiquadFilter(), sh = ctx.createWaveShaper(), mid = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter(), lvl = ctx.createGain();
    hp.type = 'highpass'; hp.frequency.value = 180; mid.type = 'peaking'; mid.frequency.value = 900; mid.Q.value = 0.9; mid.gain.value = 6; lp.type = 'lowpass'; lp.frequency.value = 4500;
    sh.oversample = '4x';
    input.connect(hp); hp.connect(pre); pre.connect(sh); sh.connect(mid); mid.connect(lp); lp.connect(lvl); lvl.connect(output);
    let last = -1;
    return { input, output, set: (v) => {
      const a = v[0] / 100;
      if (a !== last) {   // asymmetric clipping with a dead zone: sputters and gates as the note dies away
        const n = 2048, c = new Float32Array(n), g = 4 + a * 90, dz = 0.02 * (1 - a * 0.6);
        for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; const y = Math.abs(x) < dz ? 0 : (x - Math.sign(x) * dz); const s = y * g; c[i] = s >= 0 ? Math.tanh(s * 1.4) : Math.tanh(s * 0.7) * 0.75; }
        sh.curve = c; last = a;
      }
      P(pre.gain, 1); P(lvl.gain, v[1] / 100 * 0.5);
    } };
  }
  if (key === 'bf') {   // Big Fuzz: two clipping stages, thick sustain, tone control with scooped mids (Big Muff style)
    const pre = ctx.createGain(), s1 = ctx.createWaveShaper(), s2 = ctx.createWaveShaper(), lp = ctx.createBiquadFilter(), hp = ctx.createBiquadFilter(), gl = ctx.createGain(), gh = ctx.createGain(), lvl = ctx.createGain(), hp0 = ctx.createBiquadFilter();
    hp0.type = 'highpass'; hp0.frequency.value = 60; lp.type = 'lowpass'; lp.frequency.value = 650; hp.type = 'highpass'; hp.frequency.value = 1200; s1.oversample = '2x'; s2.oversample = '2x';
    input.connect(hp0); hp0.connect(pre); pre.connect(s1); s1.connect(s2); s2.connect(lp); s2.connect(hp); lp.connect(gl); hp.connect(gh); gl.connect(lvl); gh.connect(lvl); lvl.connect(output);
    let last = -1;
    return { input, output, set: (v) => {
      const su = v[0] / 100;
      if (su !== last) { s1.curve = CZ.curve('soft', 0.5 + su * 0.5); s2.curve = CZ.curve('soft', 0.3 + su * 0.6); last = su; }
      const t = v[1] / 100; P(gl.gain, 1 - t); P(gh.gain, t * 1.4);
      P(pre.gain, 1 + su * 8); P(lvl.gain, v[2] / 100 * 1.0);
    } };
  }
  if (key === 'ph') {   // four all-pass stages swept by an LFO, mixed with the dry sound
    const ap = [0, 1, 2, 3].map(() => { const f = ctx.createBiquadFilter(); f.type = 'allpass'; f.frequency.value = 800; f.Q.value = 0.7; return f; });
    const lfo = ctx.createOscillator(), amt = ctx.createGain(), wet = ctx.createGain(), dry = ctx.createGain();
    input.connect(dry); input.connect(ap[0]); for (let i = 0; i < 3; i++) ap[i].connect(ap[i + 1]); ap[3].connect(wet); wet.connect(output); dry.connect(output);
    lfo.connect(amt); ap.forEach((f) => amt.connect(f.frequency)); lfo.start();
    wet.gain.value = 0.5; dry.gain.value = 0.5;
    return { input, output, set: (v) => { P(lfo.frequency, kExp(v[0], 0.08, 5)); P(amt.gain, 200 + v[1] * 9); } };
  }
  if (key === 'wa') {   // Wah: a resonant band set by Sweep (where the pedal is pressed)
    const bp = ctx.createBiquadFilter(), g = ctx.createGain(), dry = ctx.createGain();
    bp.type = 'bandpass'; input.connect(bp); bp.connect(g); g.connect(output); input.connect(dry); dry.connect(output); dry.gain.value = 0.15;
    return { input, output, set: (v) => { P(bp.frequency, kExp(v[0], 350, 2500)); P(bp.Q, kLin(v[1], 1.5, 12)); P(g.gain, (0.9 + v[1] / 100 * 0.8) * 2.6); } };
  }
  if (key === 'cp') {
    const c = ctx.createDynamicsCompressor(), lvl = ctx.createGain();
    c.ratio.value = 8; c.attack.value = 0.003; c.release.value = 0.2; c.knee.value = 6;
    input.connect(c); c.connect(lvl); lvl.connect(output);
    return { input, output, set: (v) => { const thr = -6 - v[0] * 0.4; c.threshold.value = thr; P(lvl.gain, v[1] / 50 * Math.pow(10, (-0.6 * -thr * (1 - 1 / 8)) / 20) * Math.pow(10, -thr * 0.3 / 20)); } };
  }
  input.connect(output);
  return { input, output, set: () => {} };
};
CZ.makeAmp = function (ctx) {
  const u = CZ.makeUnit(ctx, 3); u.live = isLive(ctx);
  const bright = ctx.createBiquadFilter(); bright.type = 'highshelf'; bright.frequency.value = 5000;
  u.output.connect(bright);
  return { input: u.input, output: bright, set: (a) => {
    const variant = { Clean: 0, Crunch: 3, Lead: 4, Bass: 6, Acoustic: 0 }[a.style] || 0, ac = a.style === 'Acoustic';
    u.set([a.k[0] / 100 * (ac ? 0.3 : 1), (a.k[1] - 50) / 50, (a.k[2] - 50) / 50, (a.k[3] - 50) / 50, ac ? 0 : 1, kLin(a.k[4], -24, 12)], variant); u.variant = variant;
    setP(ctx, bright.gain, ac ? 5 : 0);
  } };
};
// pedals left to right in their order, then the amp
CZ.makeBoard = function (ctx) {
  const input = ctx.createGain(), output = ctx.createGain();
  const pedals = CZ.PEDALS.map((p) => CZ.bypass(ctx, CZ.makePedal(ctx, p.key)));
  const amp = CZ.bypass(ctx, CZ.makeAmp(ctx));
  let orderKey = '';
  return { input, output, set: (f) => {
    const key = f.pedalOrder.join(',');
    if (key !== orderKey) {
      try { input.disconnect(); } catch (e) {}
      pedals.forEach((p) => { try { p.output.disconnect(); } catch (e) {} });
      let prev = input; for (const j of f.pedalOrder) { prev.connect(pedals[j].input); prev = pedals[j].output; }
      prev.connect(amp.input); try { amp.output.disconnect(); } catch (e) {} amp.output.connect(output); orderKey = key;
    }
    f.pedals.forEach((st, j) => { pedals[j].setOn(!!st.on); if (st.on) pedals[j].unit.set(st.k); });
    amp.setOn(!!f.amp.on); if (f.amp.on) amp.unit.set(f.amp);
  } };
};

// ------------------------------------------------------------------ a chain of units in the saved order
CZ.makeChain = function (ctx, kind) {
  const input = ctx.createGain(), output = ctx.createGain();
  const mk = { eq: () => CZ.makeEQ7(ctx), comp: () => CZ.makeComp(ctx), gate: () => CZ.makeGate(ctx), rev: () => CZ.makeRev(ctx), dd: () => CZ.makeDelay(ctx, false),
    ad: () => CZ.makeDelay(ctx, true), amp: () => CZ.makeBoard(ctx), loud: () => CZ.makeGainStage(ctx), ceil: () => CZ.makeCeil(ctx) };
  const units = {}; for (const k of CZ.ORDER[kind]) units[k] = CZ.bypass(ctx, mk[k]());
  let orderKey = '';
  const ch = { input, output, units, apply: (f) => {
    const order = (f.order && f.order.length === CZ.ORDER[kind].length) ? f.order : CZ.ORDER[kind];
    const key = order.join(',');
    if (key !== orderKey) {
      try { input.disconnect(); } catch (e) {}
      for (const k in units) { try { units[k].output.disconnect(); } catch (e) {} }
      let prev = input; for (const k of order) { prev.connect(units[k].input); prev = units[k].output; } prev.connect(output); orderKey = key;
    }
    for (const k in units) {
      const on = k === 'amp' ? true : !!f[k + 'On'];
      units[k].setOn(on);
      if (on) units[k].unit.set(k === 'amp' ? f : f[k]);
    }
  } };
  return ch;
};

// a channel strip: input (trim) -> effects chain -> volume -> pan -> out, with a level meter
CZ.makeStrip = function (ctx, dest, kind = 'track') {
  const s = { trim: ctx.createGain(), chain: CZ.makeChain(ctx, kind), vol: ctx.createGain(), pan: ctx.createStereoPanner(), meter: ctx.createAnalyser() };
  s.meter.fftSize = 256;
  s.trim.channelCount = 2; s.trim.channelCountMode = 'explicit'; s.trim.channelInterpretation = 'speakers';
  s.trim.connect(s.chain.input); s.chain.output.connect(s.vol); s.vol.connect(s.pan); s.pan.connect(dest); s.pan.connect(s.meter);
  s.apply = (t, audible) => {
    s.trim.gain.value = Math.pow(10, (t.trim || 0) / 20);
    const g = audible ? CZ.dbToGain(t.vol) * Math.SQRT1_2 : 0;
    if (isLive(ctx)) s.vol.gain.setTargetAtTime(g, ctx.currentTime, 0.01); else s.vol.gain.value = g;
    s.pan.pan.value = t.pan || 0;
    s.chain.apply(t.fx);
  };
  return s;
};

// master: volume -> mastering chain (Polished) or the safety limiter -> out, with a stereo meter
CZ.makeMaster = function (ctx, dest) {
  const m = { input: ctx.createGain(), vol: ctx.createGain(), chain: CZ.makeChain(ctx, 'master'), on: ctx.createGain(), off: ctx.createGain(), split: ctx.createChannelSplitter(2), meters: [ctx.createAnalyser(), ctx.createAnalyser()] };
  m.meter = ctx.createAnalyser(); m.meter.fftSize = 256; m.meters.forEach((x) => { x.fftSize = 256; });
  m.safety = new AudioWorkletNode(ctx, 'cz-limiter', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2] });
  m.input.connect(m.vol); m.vol.connect(m.chain.input); m.chain.output.connect(m.on); m.vol.connect(m.off); m.off.connect(m.safety);
  m.on.connect(dest); m.safety.connect(dest);
  [m.on, m.safety].forEach((n) => { n.connect(m.meter); n.connect(m.split); });
  m.split.connect(m.meters[0], 0); m.split.connect(m.meters[1], 1);
  Object.defineProperty(m, 'reduction', { get: () => (m.mastering ? m.chain.units.ceil.unit.reduction || 0 : 0) });
  m.apply = (song, enabled) => {
    m.mastering = !!enabled;
    const g = CZ.dbToGain(song.masterVol || 0);
    if (isLive(ctx)) m.vol.gain.setTargetAtTime(g, ctx.currentTime, 0.01); else m.vol.gain.value = g;
    m.on.gain.value = enabled ? 1 : 0; m.off.gain.value = enabled ? 0 : 1;
    m.safety.parameters.get('mode').setValueAtTime(0, ctx.currentTime);
    m.chain.apply(song.master);
  };
  return m;
};

// ------------------------------------------------------------------ songs from 0.4.2 and earlier: effects, drums and master into the 0.4.3 form
CZ.migrate043 = function (song, old) {
  song.tracks.forEach((t, i) => {
    if (!t.input) t.input = '1';
    if (typeof t.gain !== 'number') t.gain = 0;
    if (t.audioR === undefined) t.audioR = null;
    if (Array.isArray(t.fx)) t.fx = CZ.fxFromOld(t.fx);
    if (!t.fx || !t.fx.order) t.fx = CZ.newFx('track');
  });
  if (!song.shown || song.shown < 1) song.shown = 1;
  const d = song.drums;
  if (!d.ch || old) d.ch = { vol: typeof d.vol === 'number' ? d.vol : -6, pan: 0, mute: false, solo: false, fx: CZ.newFx('drum') };
  if (!d.ms) d.ms = Array.from({ length: CZ.NDRUMS }, () => ({ m: false, s: false }));
  const m = song.master || {};
  if (!m.order || old && m.order && !Array.isArray(m.order)) {
    const nm = CZ.newFx('master');
    const on = !!m.on;
    if (m.eq && m.eq.vals) nm.eq = CZ.eq7FromOld(m.eq.vals);
    nm.eqOn = on && !!(m.eq && m.eq.on); nm.compOn = on && !!(m.comp && m.comp.on); nm.loudOn = on; nm.ceilOn = on;
    if (typeof m.gain === 'number') nm.loud = [Math.max(0, Math.min(100, m.gain / 12 * 100))];
    if (typeof m.ceiling === 'number') nm.ceil = [Math.max(0, Math.min(100, (m.ceiling + 6) / 6 * 100))];
    song.master = nm;
  }
  song.v043 = true;
  return song;
};
CZ.eq7FromOld = function (v) {   // 4-band EQ (gain, freq pairs) to the nearest of the 7 bands
  const g = [0, 0, 0, 0, 0, 0, 0];
  for (let b = 0; b < 4; b++) {
    const gain = v[b * 2] || 0, fr = v[b * 2 + 1] || CZ.EQF[0];
    let best = 0; CZ.EQF.forEach((f, j) => { if (Math.abs(Math.log(f / fr)) < Math.abs(Math.log(CZ.EQF[best] / fr))) best = j; });
    g[best] = Math.max(-12, Math.min(12, g[best] + gain));
  }
  return g;
};
CZ.fxFromOld = function (old) {
  const f = CZ.newFx('track'), u = (k) => old[k] || { on: false, variant: 0, vals: [] };
  const g = u(0); f.gateOn = !!g.on; if (g.vals.length) f.gate = [(g.vals[0] + 80) / 0.8, kInvExp(g.vals[3], 5, 1000)];
  f.compOn = !!u(1).on;
  const p = u(2);
  if (p.on) {
    const map = [0, 0, 1, 2, 0, 0, 3, 5, 6], j = map[p.variant] || 0;
    f.pedals[j].on = true;
    if (j === 0) f.pedals[0].k = [Math.round((p.vals[0] || 0.5) * (p.variant === 4 ? 30 : 100)), Math.round((p.vals[1] || 0.5) * 100), 50];
  }
  const a = u(3);
  f.amp.on = !!a.on; f.amp.style = ['Clean', 'Clean', 'Crunch', 'Crunch', 'Lead', 'Lead', 'Bass'][a.variant] || 'Clean';
  if (a.vals.length) f.amp.k = [a.vals[0] * 100, (a.vals[1] + 1) * 50, (a.vals[2] + 1) * 50, (a.vals[3] + 1) * 50, Math.max(0, Math.min(100, (a.vals[5] + 24) / 0.36))].map(Math.round);
  const e = u(4); f.eqOn = !!e.on; if (e.vals.length) f.eq = CZ.eq7FromOld(e.vals);
  const ad = u(5); f.adOn = !!ad.on; if (ad.vals.length) f.ad = [kInvExp(ad.vals[0], 20, 1500), ad.vals[1] / 0.9 * 100, 100 - kInvExp(ad.vals[2], 1000, 12000), ad.vals[3] * 100].map(Math.round);
  const dd = u(6); f.ddOn = !!dd.on; if (dd.vals.length) f.dd = [kInvExp(dd.vals[0], 20, 1500), dd.vals[1] / 0.9 * 100, dd.vals[3] * 100].map(Math.round);
  const r = u(7); f.revOn = !!r.on; if (r.vals.length) f.rev = [r.vals[0] * 100, (1 - r.vals[1]) * 100, r.vals[4] / 0.8 * 100].map((x) => Math.round(Math.max(0, Math.min(100, x))));
  return f;
};

// ------------------------------------------------------------------ track audio for playback: fades, clip gain, one or two channels
CZ.trackChannels = function (t, sr) {
  const g = Math.pow(10, (t.gain || 0) / 20);
  const one = (a) => { let x = CZ.faded(a, t.fi, t.fo, sr); if (g !== 1) { x = x === a ? a.slice() : x; for (let i = 0; i < x.length; i++) x[i] *= g; } return x; };
  return t.audioR ? [one(t.audio), one(t.audioR)] : [one(t.audio)];
};

// ------------------------------------------------------------------ pitch for the tuner (autocorrelation, 60 to 1200 Hz)
CZ.pitch = function (buf, sr) {
  const n = buf.length; let rms = 0; for (let i = 0; i < n; i++) rms += buf[i] * buf[i]; rms = Math.sqrt(rms / n);
  if (rms < 0.008) return 0;
  const minL = Math.floor(sr / 1200), maxL = Math.min(n >> 1, Math.ceil(sr / 60));
  const c = new Float32Array(maxL + 1);
  for (let l = minL; l <= maxL; l++) { let s = 0, e1 = 0, e2 = 0; for (let i = 0; i < n - l; i++) { s += buf[i] * buf[i + l]; e1 += buf[i] * buf[i]; e2 += buf[i + l] * buf[i + l]; } c[l] = s / Math.sqrt(e1 * e2 + 1e-12); }
  let best = -1, bv = 0;
  // the first strong peak (avoids octave errors)
  let mx = 0; for (let l = minL; l <= maxL; l++) mx = Math.max(mx, c[l]);
  for (let l = minL + 1; l < maxL; l++) if (c[l] > 0.9 * mx && c[l] >= c[l - 1] && c[l] >= c[l + 1]) { best = l; bv = c[l]; break; }
  if (best < 0 || bv < 0.5) return 0;
  const a = c[best - 1], b = c[best], d = c[best + 1], shift = (a - d) / (2 * (a - 2 * b + d) || 1);
  return sr / (best + (isFinite(shift) ? shift : 0));
};
CZ.NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
CZ.noteOf = (f) => { const m = 69 + 12 * Math.log2(f / 440), r = Math.round(m); return { name: CZ.NOTES[((r % 12) + 12) % 12], octave: Math.floor(r / 12) - 1, cents: Math.round((m - r) * 100) }; };

// ------------------------------------------------------------------ built-in drum samples for the library (made in code)
CZ.SAMPLES = [
  ['Kicks', 'Kick – Deep 808', { f0: 45, f1: 120, k: 18, dec: 3.5, len: 0.9 }], ['Kicks', 'Kick – Tight acoustic', { f0: 60, f1: 160, k: 35, dec: 10, len: 0.35, click: 0.4 }],
  ['Kicks', 'Kick – Vinyl thump', { f0: 52, f1: 110, k: 25, dec: 7, len: 0.5, lp: 0.2 }],
  ['Snares', 'Snare – Crack', { tone: 210, nz: 0.7, dec: 22, len: 0.3 }], ['Snares', 'Snare – Brush', { tone: 0, nz: 0.6, dec: 9, len: 0.4, soft: 1 }], ['Snares', 'Snare – Rimshot', { tone: 330, nz: 0.5, dec: 35, len: 0.2 }],
  ['Hats', 'Hat – Closed tight', { hat: 1, dec: 70, len: 0.07 }], ['Hats', 'Hat – Open wash', { hat: 1, dec: 6, len: 0.6 }], ['Hats', 'Hat – Shaker', { hat: 2, dec: 25, len: 0.15 }],
  ['Percussion', 'Clap – Room', { clap: 1, len: 0.45 }], ['Percussion', 'Tom – Floor', { f0: 80, f1: 120, k: 10, dec: 7, len: 0.5 }], ['Percussion', 'Tom – Rack', { f0: 150, f1: 210, k: 12, dec: 9, len: 0.35 }],
  ['Percussion', 'Rim – Click', { rim: 1, len: 0.06 }]];
CZ.sampleAudio = function (spec, sr) {
  const n = Math.floor(spec.len * sr), d = new Float32Array(n); let seed = 4242, ph = 0, hp = 0, pv = 0, lp = 0;
  const nz = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return (seed | 0) / 2147483648; };
  for (let i = 0; i < n; i++) {
    const t = i / sr; let x = 0;
    if (spec.f0) { const f = spec.f0 + spec.f1 * Math.exp(-t * spec.k); ph += 2 * Math.PI * f / sr; x = Math.sin(ph) * Math.exp(-t * spec.dec) * 0.95; if (spec.click && i < 80) x += nz() * spec.click * (1 - i / 80); }
    else if (spec.hat) { const w = nz(); hp = 0.55 * (hp + w - pv); pv = w; x = (spec.hat === 2 ? hp * (0.5 + 0.5 * Math.sin(t * 60)) : hp) * Math.exp(-t * spec.dec) * 0.4; }
    else if (spec.clap) { const b = t % 0.012, env = t < 0.036 ? Math.exp(-b * 280) : Math.exp(-(t - 0.036) * 12) * 0.7; lp += 0.35 * (nz() - lp); hp = 0.9 * (hp + lp - pv); pv = lp; x = hp * env; }
    else if (spec.rim) { ph += 2 * Math.PI * 1800 / sr; x = (Math.sin(ph) * 0.6 + nz() * 0.3) * Math.exp(-t * 80); }
    else { ph += 2 * Math.PI * (spec.tone || 200) / sr; const w = nz(); hp = 0.85 * (hp + w - pv); pv = w; x = (spec.tone ? Math.sin(ph) * Math.exp(-t * 30) * 0.4 : 0) + hp * spec.nz * Math.exp(-t * spec.dec) * (spec.soft ? 0.6 : 1); }
    if (spec.lp) { lp += spec.lp * (x - lp); x = lp * 1.6; }
    d[i] = x;
  }
  return d;
};
CZ.SAMPLE_FOLDER = ['Kicks', 'Snares', 'Hats', 'Hats', 'Percussion', 'Percussion', 'Percussion', 'Percussion'];
