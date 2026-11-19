// Conceptor audio worklets: noise gate, mastering limiter (with soft safety mode) and the recorder tap.

class GateProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'threshold', defaultValue: -50 }, { name: 'attack', defaultValue: 1 }, { name: 'hold', defaultValue: 50 },
      { name: 'release', defaultValue: 150 }, { name: 'range', defaultValue: -80 },
    ];
  }
  constructor() { super(); this.env = 0; this.g = 0; this.holdLeft = 0; }
  process(inputs, outputs, p) {
    const inp = inputs[0], out = outputs[0];
    if (!inp || inp.length === 0) return true;
    const n = inp[0].length;
    const thr = Math.pow(10, p.threshold[0] / 20), floor = Math.pow(10, p.range[0] / 20);
    const atk = 1 - Math.exp(-1 / Math.max(1, p.attack[0] * 0.001 * sampleRate));
    const rel = 1 - Math.exp(-1 / Math.max(1, p.release[0] * 0.001 * sampleRate));
    const holdS = p.hold[0] * 0.001 * sampleRate;
    for (let i = 0; i < n; i++) {
      let lvl = 0;
      for (let c = 0; c < inp.length; c++) lvl = Math.max(lvl, Math.abs(inp[c][i]));
      this.env = Math.max(lvl, this.env * 0.9995);
      let target;
      if (this.env >= thr) { target = 1; this.holdLeft = holdS; }
      else if (this.holdLeft > 0) { target = 1; this.holdLeft--; }
      else target = floor;
      this.g += (target - this.g) * (target > this.g ? atk : rel);
      for (let c = 0; c < out.length; c++) out[c][i] = (inp[c] || inp[0])[i] * this.g;
    }
    return true;
  }
}
registerProcessor('cz-gate', GateProcessor);

// mode 0: safety only (transparent under 0.8, rounds off peaks). mode 1: mastering limiter (gain, ceiling, 2 ms look-ahead).
class LimiterProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{ name: 'mode', defaultValue: 0 }, { name: 'gain', defaultValue: 3 }, { name: 'ceiling', defaultValue: -1 }];
  }
  constructor() {
    super();
    this.la = Math.max(8, Math.round(sampleRate / 500));
    this.dl = [new Float32Array(this.la), new Float32Array(this.la)];
    this.w = 0; this.g = 1; this.rel = 1 - Math.exp(-1 / (0.12 * sampleRate)); this.count = 0; this.minG = 1;
  }
  process(inputs, outputs, p) {
    const inp = inputs[0], out = outputs[0];
    const n = out[0].length;
    const L = inp && inp[0] ? inp[0] : null, R = inp && inp[1] ? inp[1] : L;
    if (p.mode[0] < 0.5) {
      for (let i = 0; i < n; i++) {
        for (let c = 0; c < 2; c++) {
          const x = c === 0 ? (L ? L[i] : 0) : (R ? R[i] : 0);
          const ax = Math.abs(x);
          const y = ax <= 0.8 ? x : Math.sign(x) * (0.8 + 0.2 * Math.tanh((ax - 0.8) / 0.2));
          out[c][i] = y;
        }
      }
      return true;
    }
    const gin = Math.pow(10, p.gain[0] / 20), ceil = Math.pow(10, p.ceiling[0] / 20);
    for (let i = 0; i < n; i++) {
      const xl = (L ? L[i] : 0) * gin, xr = (R ? R[i] : 0) * gin;
      const pk = Math.max(Math.abs(xl), Math.abs(xr));
      const target = pk > ceil ? ceil / pk : 1;
      if (target < this.g) this.g = target; else this.g += (target - this.g) * this.rel;
      const ol = this.dl[0][this.w], orr = this.dl[1][this.w];
      this.dl[0][this.w] = xl; this.dl[1][this.w] = xr;
      if (++this.w >= this.la) this.w = 0;
      out[0][i] = Math.max(-ceil, Math.min(ceil, ol * this.g));
      if (out[1]) out[1][i] = Math.max(-ceil, Math.min(ceil, orr * this.g));
      this.minG = Math.min(this.minG, this.g);
    }
    if (++this.count >= 40) { this.port.postMessage(-20 * Math.log10(Math.max(1e-6, this.minG))); this.count = 0; this.minG = 1; }
    return true;
  }
}
registerProcessor('cz-limiter', LimiterProcessor);

// Sends the microphone samples to the page while recording. Message {rec: true, at: contextTime} starts it.
class RecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.rec = false; this.at = 0; this.buf = []; this.size = 0;
    this.port.onmessage = (e) => {
      if (e.data.rec) { this.rec = true; this.at = e.data.at; }
      else { this.flush(); this.rec = false; this.port.postMessage({ done: true }); }
    };
  }
  flush() {
    if (!this.size) return;
    const a = new Float32Array(this.size); let o = 0;
    for (const b of this.buf) { a.set(b, o); o += b.length; }
    this.port.postMessage({ data: a, }, [a.buffer]);
    this.buf = []; this.size = 0;
  }
  process(inputs) {
    const inp = inputs[0];
    if (!this.rec || !inp || !inp[0]) return true;
    const n = inp[0].length;
    const t0 = currentTime;
    let start = 0;
    if (t0 < this.at) {
      const skip = Math.round((this.at - t0) * sampleRate);
      if (skip >= n) return true;
      start = skip;
    }
    const c = new Float32Array(n - start);
    for (let i = start; i < n; i++) {
      let s = 0; for (let k = 0; k < inp.length; k++) s += inp[k][i];
      c[i - start] = s / inp.length;
    }
    if (this.size === 0 && start === 0 && t0 > this.at) this.port.postMessage({ lateBy: t0 - this.at });
    this.buf.push(c); this.size += c.length;
    if (this.size >= sampleRate / 4) this.flush();
    return true;
  }
}
registerProcessor('cz-recorder', RecorderProcessor);
