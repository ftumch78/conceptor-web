// Conceptor waveform editor: Trim, Insert Silence (Tap Point, Paint), Fade In, Fade Out, Drop In, Play, Undo, Zoom.
// Used in Edit Mode (tracks), export step 2 (the whole mix) and Edit Sound (drum sounds).
'use strict';

const UNDO = new WeakMap();   // undo lists live outside the song, so they are not saved with it

class WaveEditor {
  // clip: { ch: [Float32Array...], fi, fo } . opts: { tools, sr, key, onChange(clip), askLength(sec) -> Promise<sec|null>,
  //   say(text), dropIn(a, b) -> Promise<Float32Array|null>, previewDrop(a, b, take), stopAll() }
  constructor(el, clip, opts) {
    this.el = el; this.c = clip; this.o = opts; this.sr = opts.sr;
    if (!UNDO.has(opts.key)) UNDO.set(opts.key, []);
    this.undo = UNDO.get(opts.key);
    this.tool = null; this.silMode = 'tap'; this.pending = null; this.zoom = 1; this.view = 0;
    this.a = 0; this.b = this.n(); this.playKind = null; this.ph = -1; this.recording = false;
    this.build(); this.refreshPeaks(); this.draw();
    this.raf = () => { if (!document.body.contains(this.el)) return; this.tick(); requestAnimationFrame(this.raf); };
    requestAnimationFrame(this.raf);
  }
  n() { return this.c.ch[0].length; }
  dn() { const p = this.pending; return p && p.kind === 'tap' ? this.n() + p.len : this.n(); }   // length shown

  // ------------------------------------------------------------------ layout
  build() {
    const names = { trim: 'Trim', sil: 'Insert Silence', fi: 'Fade In', fo: 'Fade Out', drop: 'Drop In' };
    const i = (k) => `<button class="info" data-tip="${k}" aria-label="About">i</button>`;
    let tools = this.o.tools.map((t) => `<button class="hex sm" data-ed="tool" data-t="${t}"><span>${names[t]}</span></button>`).join('');
    tools += `<button class="hex sm" data-ed="play"><span>Play</span></button><button class="hex sm" data-ed="undo"><span>Undo</span></button>`;
    tools += i('edtools') + (this.o.tools.includes('sil') ? i('silence') : '') + (this.o.tools.includes('drop') ? i('dropin') : '');
    this.el.innerHTML = `<div class="edtools">${tools}</div><canvas class="edc" width="1360" height="300"></canvas>
      <div class="edbar"><button class="hex mid" data-ed="zout" aria-label="Zoom out"><span>−</span></button><span class="zl">Zoom 1×</span>
      <button class="hex mid" data-ed="zin" aria-label="Zoom in"><span>+</span></button><input type="range" class="pan" min="0" max="1000" value="0" aria-label="Move along the wave">${i('zoom')}</div>
      <div class="edhint"></div><div class="edapply"></div>`;
    this.cv = this.el.querySelector('canvas');
    this.el.addEventListener('click', (e) => this.onClick(e));
    this.el.querySelector('.pan').addEventListener('input', (e) => { this.view = Math.round(e.target.value / 1000 * Math.max(0, this.dn() - this.vis())); this.draw(); });
    this.attach();
  }
  onClick(e) {
    const b = e.target.closest('[data-ed]'); if (!b) return;
    const a = b.dataset.ed;
    if (a === 'tool') this.setTool(b.dataset.t);
    else if (a === 'play') this.play();
    else if (a === 'undo') this.doUndo();
    else if (a === 'zin') { this.setZoom(this.zoom * 2); this.draw(); }
    else if (a === 'zout') { this.setZoom(this.zoom / 2); this.draw(); }
    else if (a === 'applytrim') this.applyTrim();
    else if (a === 'resethandles') { this.a = 0; this.b = this.n(); this.draw(); }
    else if (a === 'tap' || a === 'paint') { this.stop(); this.silMode = a; this.pending = null; this.draw(); }
    else if (a === 'preview') this.preview();
    else if (a === 'apply') this.commit();
    else if (a === 'clear') { this.stop(); this.pending = null; this.draw(); this.o.say('Cleared. Nothing changed.'); }
    else if (a === 'rec') this.recordDrop();
    else if (a === 'stop') this.stop();
  }

  // ------------------------------------------------------------------ peaks and drawing
  refreshPeaks() { this.bin = 256; this.pk = CZ.peaks(this.c.ch, this.bin); this.takePk = null; }
  vis() { return Math.max(Math.min(this.dn(), Math.round(this.sr * 0.05)), Math.floor(this.dn() / this.zoom)); }
  maxZoom() { return Math.max(1, this.dn() / (this.sr * 0.05)); }
  setZoom(z) { const before = this.vis(), centre = this.view + before / 2; this.zoom = Math.max(1, Math.min(this.maxZoom(), z)); this.view = Math.round(centre - this.vis() / 2); }
  // level of the committed audio from sample i0 to i1
  lvl(i0, i1) {
    const n = this.n(); i0 = Math.max(0, i0); i1 = Math.min(n, i1); if (i1 <= i0) return 0;
    if (i1 - i0 >= this.bin * 2) { let m = 0; for (let k = Math.floor(i0 / this.bin); k < Math.ceil(i1 / this.bin); k++) if (this.pk[k] > m) m = this.pk[k]; return m; }
    let m = 0; for (const c of this.c.ch) for (let i = i0; i < i1; i++) { const v = c[i] < 0 ? -c[i] : c[i]; if (v > m) m = v; } return m;
  }
  // level as it would be with the change not yet applied (pending)
  plvl(i0, i1) {
    const p = this.pending; if (!p) return this.lvl(i0, i1);
    if (p.kind === 'tap') {
      let m = 0;
      if (i0 < p.a) m = Math.max(m, this.lvl(i0, Math.min(i1, p.a)));
      if (i1 > p.a + p.len) m = Math.max(m, this.lvl(Math.max(i0, p.a + p.len) - p.len, i1 - p.len));
      return m;
    }
    let m = 0;
    if (i0 < p.a) m = Math.max(m, this.lvl(i0, Math.min(i1, p.a)));
    if (i1 > p.b) m = Math.max(m, this.lvl(Math.max(i0, p.b), i1));
    if (p.kind === 'drop' && p.take && i1 > p.a && i0 < p.b) { const s = Math.max(i0, p.a) - p.a, e = Math.min(i1, p.b) - p.a; for (let k = s; k < e; k++) { const v = Math.abs(p.take[k]); if (v > m) m = v; } }
    return m;
  }
  draw() {
    const g = this.cv.getContext('2d'), W = this.cv.width, H = this.cv.height, n = this.dn(), vis = this.vis();
    if (this.ph >= 0) { const pi = this.ph * this.sr; if (pi < this.view || pi > this.view + vis) this.view = Math.round(pi - vis * 0.1); }
    this.view = Math.max(0, Math.min(Math.max(0, n - vis), this.view));
    const spp = vis / W, X = (i) => (i - this.view) / spp;
    g.fillStyle = '#1C1D21'; g.fillRect(0, 0, W, H);
    const p = this.pending;
    if (p) {
      const recNow = this.recording && this.ph * this.sr >= p.a;
      g.fillStyle = recNow ? 'rgba(229,72,77,.55)' : p.kind === 'drop' && p.take ? 'rgba(88,194,125,.30)' : 'rgba(229,72,77,.28)';
      const b = p.kind === 'tap' ? p.a + p.len : p.b;
      g.fillRect(X(p.a), 0, Math.max(3, X(b) - X(p.a)), H);
    }
    const fiN = (this.c.fi || 0) * this.sr, foN = (this.c.fo || 0) * this.sr;
    for (let x = 0; x < W; x += 2) {
      const i0 = Math.floor(this.view + x * spp), i1 = Math.max(i0 + 1, Math.floor(this.view + (x + 2) * spp));
      if (i0 >= n) break;
      let e = 1;
      if (fiN > 0 && i0 < fiN) e = i0 / fiN;
      if (foN > 0 && i0 > n - foN) e = Math.min(e, (n - i0) / foN);
      const v = Math.min(1, this.plvl(i0, i1) * e), bh = Math.max(1.5, v * H * 0.9);
      const out = this.tool === 'trim' && (i0 < this.a || i0 >= this.b);
      const inDropTake = p && p.kind === 'drop' && p.take && i0 >= p.a && i0 < p.b;
      g.fillStyle = out ? '#3a3b40' : inDropTake ? '#58C27D' : '#E8C872';
      g.fillRect(x, (H - bh) / 2, 1.6, bh);
    }
    g.strokeStyle = '#ECEBE6'; g.lineWidth = 3;
    if (fiN > 0) { g.beginPath(); g.moveTo(X(0), H - 6); g.lineTo(X(fiN), 8); g.stroke(); }
    if (foN > 0) { g.beginPath(); g.moveTo(X(n - foN), 8); g.lineTo(X(n), H - 6); g.stroke(); }
    if (this.tool === 'trim') for (const i of [this.a, this.b]) { const x = X(i); g.fillStyle = '#E8C872'; g.fillRect(x - 3, 0, 6, H); g.fillRect(x - 16, H / 2 - 26, 32, 52); g.fillStyle = '#111'; g.fillRect(x - 2, H / 2 - 14, 4, 28); }
    if (this.ph >= 0) { g.fillStyle = '#fff'; g.fillRect(X(this.ph * this.sr) - 2, 0, 4, H); }
    g.fillStyle = '#9A988F'; g.font = '26px Arial'; g.textAlign = 'left'; g.fillText(this.t(this.view / this.sr), 10, 30);
    g.textAlign = 'right'; g.fillText(this.t(Math.min(n, this.view + vis) / this.sr), W - 10, 30);
    this.el.querySelector('.zl').textContent = 'Zoom ' + (Math.round(this.zoom * 10) / 10) + '×';
    const pan = this.el.querySelector('.pan'); pan.disabled = vis >= n; pan.value = n - vis > 0 ? this.view / (n - vis) * 1000 : 0;
    this.hints(); this.buttons();
  }
  t(s) { return s < 10 ? s.toFixed(2) + ' s' : CZ.formatTime(s); }
  hints() {
    const p = this.pending, H = {
      none: 'Pick a tool. Pinch, use + and −, or Ctrl and the mouse wheel to zoom in.', pan: 'Drag the wave or the slider to move along it.',
      trim: 'Drag the two handles. Everything outside them is removed when Apply Trim is pressed.',
      sil: 'Tap the point where the silence should go, then choose its length. Preview it, then Apply.',
      paint: 'Paint over the part to silence, like an eraser. Drag again to make it bigger. Preview it, then Apply.',
      fi: 'Drag from the start of the wave to set how long the fade in is.', fo: 'Drag from the end of the wave to set how long the fade out is.',
      drop: 'Drag over the part to re-record. Record Drop In plays 2 seconds before it, then records only that part.',
      dropdone: 'New take recorded, shown in green. Preview it, then Keep or Discard.' };
    let k;
    if (this.recording) k = this.ph * this.sr < (p ? p.a : 0) ? null : null;
    if (this.recording) { this.el.querySelector('.edhint').textContent = this.ph >= 0 && p && this.ph * this.sr < p.a ? 'Count-in. Get ready.' : 'Recording.'; return; }
    k = this.tool === 'drop' && p && p.take ? 'dropdone' : this.tool === 'sil' && this.silMode === 'paint' ? 'paint' : (this.tool || (this.zoom > 1 ? 'pan' : 'none'));
    this.el.querySelector('.edhint').textContent = H[k];
  }
  buttons() {
    const hb = (label, ed, cls = '') => `<button class="hex sm ${cls}" data-ed="${ed}"><span>${label}</span></button>`;
    const p = this.pending, playing = this.playKind != null;
    let a = '';
    if (this.tool === 'trim' && (this.a > 0 || this.b < this.n())) a = hb('Apply Trim', 'applytrim', 'on') + hb('Reset Handles', 'resethandles');
    if (this.tool === 'sil') {
      a = hb('Tap Point', 'tap', this.silMode === 'tap' ? 'on' : '') + hb('Paint', 'paint', this.silMode === 'paint' ? 'on' : '');
      if (p) a += hb(this.playKind === 'prev' ? 'Stop' : 'Preview', this.playKind === 'prev' ? 'stop' : 'preview', this.playKind === 'prev' ? 'on' : '') + hb('Apply', 'apply', 'on') + hb('Clear', 'clear');
    }
    if (this.tool === 'drop' && p) {
      if (p.take) a = hb(this.playKind === 'prev' ? 'Stop' : 'Preview', this.playKind === 'prev' ? 'stop' : 'preview') + hb('Keep', 'apply', 'on') + hb('Discard', 'clear');
      else a = this.recording ? hb('Stop', 'stop', 'red') : hb('&#9679; Record Drop In', 'rec', 'red') + hb('Clear', 'clear');
    }
    const box = this.el.querySelector('.edapply'); if (box._a !== a) { box.innerHTML = a; box._a = a; }
    this.el.querySelectorAll('[data-ed=tool]').forEach((b) => b.classList.toggle('on', b.dataset.t === this.tool));
    this.el.querySelector('[data-ed=play]').classList.toggle('on', this.playKind === 'all');
    void playing;
  }

  // ------------------------------------------------------------------ pointer: drag, pinch, wheel
  attach() {
    const c = this.cv, pts = new Map(); let drag = null, pinch0 = 0, z0 = 1;
    const idx = (e) => { const r = c.getBoundingClientRect(); return Math.round(this.view + (e.clientX - r.left) / r.width * this.vis()); };
    const dist = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); };
    c.addEventListener('pointerdown', (e) => {
      c.setPointerCapture(e.pointerId); pts.set(e.pointerId, e);
      if (pts.size === 2) { pinch0 = dist(); z0 = this.zoom; drag = null; return; }
      const n = this.n(), i = Math.max(0, Math.min(n, idx(e)));
      if (this.tool === 'trim') drag = Math.abs(i - this.a) < Math.abs(i - this.b) ? 'a' : 'b';
      else if (this.tool === 'fi') { this.push({ type: 'fade' }); drag = 'fi'; this.c.fi = i / this.sr; }
      else if (this.tool === 'fo') { this.push({ type: 'fade' }); drag = 'fo'; this.c.fo = (n - i) / this.sr; }
      else if (this.tool === 'drop') { if (this.recording || this.playKind) return; drag = 'drop'; const keep = this.pending && !this.pending.take; this.p0 = keep ? this.pending.a : i; this.p1 = keep ? this.pending.b : i; this.span('drop', i); }
      else if (this.tool === 'sil' && this.silMode === 'paint') { this.stop(); drag = 'paint'; const keep = this.pending && this.pending.kind === 'paint'; this.p0 = keep ? this.pending.a : i; this.p1 = keep ? this.pending.b : i; this.span('paint', i); }
      else if (this.tool === 'sil') this.tapAt(i);
      else drag = { x: e.clientX, view: this.view };
      this.draw();
    });
    c.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, e);
      if (pts.size === 2 && pinch0) { this.setZoom(z0 * dist() / pinch0); this.draw(); return; }
      if (!drag) return;
      const n = this.n(), i = Math.max(0, Math.min(n, idx(e)));
      if (drag === 'a') this.a = Math.max(0, Math.min(i, this.b - 64));
      else if (drag === 'b') this.b = Math.min(n, Math.max(i, this.a + 64));
      else if (drag === 'fi') this.c.fi = Math.min(n, i) / this.sr;
      else if (drag === 'fo') this.c.fo = (n - i) / this.sr;
      else if (drag === 'paint' || drag === 'drop') this.span(drag, i);
      else if (drag.x !== undefined) { const r = c.getBoundingClientRect(); this.view = Math.round(drag.view - (e.clientX - drag.x) / r.width * this.vis()); }
      this.draw();
    });
    const up = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch0 = 0; if (drag === 'fi' || drag === 'fo') this.changed(false); drag = null; this.draw(); };
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
    c.addEventListener('wheel', (e) => { if (!e.ctrlKey) return; e.preventDefault(); this.setZoom(this.zoom * (e.deltaY < 0 ? 1.25 : 0.8)); this.draw(); }, { passive: false });
  }
  span(kind, i) { this.p0 = Math.min(this.p0, i); this.p1 = Math.max(this.p1, i); this.pending = { kind, a: this.p0, b: this.p1 }; }

  // ------------------------------------------------------------------ tools
  setTool(t) { this.stop(); this.tool = this.tool === t ? null : t; this.pending = null; this.a = 0; this.b = this.n(); this.draw(); }
  push(u) { u.fi = this.c.fi || 0; u.fo = this.c.fo || 0; this.undo.push(u); }
  changed(peaks = true) { if (peaks) this.refreshPeaks(); this.o.onChange(this.c); }
  async tapAt(i) {
    this.stop();
    const sec = await this.o.askLength(i / this.sr); if (!sec) return;
    this.pending = { kind: 'tap', a: i, len: Math.round(sec * this.sr) };
    this.draw(); this.o.say('Not applied yet. Preview it, then Apply.');
  }
  // the channels as they would be with the pending change
  pendingCh() {
    const p = this.pending;
    return this.c.ch.map((c) => {
      if (p.kind === 'tap') { const o = new Float32Array(c.length + p.len); o.set(c.subarray(0, p.a)); o.set(c.subarray(p.a), p.a + p.len); return o; }
      const o = c.slice(); if (p.kind === 'paint') o.fill(0, p.a, p.b); else if (p.take) o.set(p.take.subarray(0, p.b - p.a), p.a); return o;
    });
  }
  commit() {
    const p = this.pending; if (!p) return; this.stop();
    if (p.kind === 'tap') this.push({ type: 'ins', at: p.a, len: p.len });
    else this.push({ type: 'rep', a: p.a, old: this.c.ch.map((c) => c.slice(p.a, p.b)) });
    const secs = ((p.kind === 'tap' ? p.len : p.b - p.a) / this.sr).toFixed(1);
    this.c.ch = this.pendingCh(); this.pending = null; this.a = 0; this.b = this.n();
    this.changed(); this.draw();
    this.o.say(p.kind === 'drop' ? 'Drop In kept.' : secs + ' s of silence applied.');
  }
  applyTrim() {
    this.stop();
    const a = this.a, b = this.b;
    this.push({ type: 'trim', head: this.c.ch.map((c) => c.slice(0, a)), tail: this.c.ch.map((c) => c.slice(b)) });
    this.c.ch = this.c.ch.map((c) => c.slice(a, b));
    const len = this.n() / this.sr; this.c.fi = Math.min(this.c.fi || 0, len); this.c.fo = Math.min(this.c.fo || 0, len);
    this.a = 0; this.b = this.n(); this.view = 0; this.zoom = 1;
    this.changed(); this.draw(); this.o.say('Trimmed. New length ' + this.t(len) + '.');
  }
  doUndo() {
    this.stop();
    if (this.pending) { this.pending = null; this.draw(); this.o.say('Change cleared. Nothing was applied.'); return; }
    const u = this.undo.pop(); if (!u) { this.o.say('Nothing to undo.'); return; }
    if (u.type === 'trim') this.c.ch = this.c.ch.map((c, k) => CZ.concat([u.head[k], c, u.tail[k]]));
    else if (u.type === 'ins') this.c.ch = this.c.ch.map((c) => CZ.concat([c.subarray(0, u.at), c.subarray(u.at + u.len)]));
    else if (u.type === 'rep') this.c.ch = this.c.ch.map((c, k) => { const o = c.slice(); o.set(u.old[k], u.a); return o; });
    this.c.fi = u.fi; this.c.fo = u.fo;
    this.a = 0; this.b = this.n(); this.changed(); this.draw(); this.o.say('Undone.');
  }

  // ------------------------------------------------------------------ listening and recording
  play() {
    if (this.playKind === 'all') { this.stop(); return; }
    this.stop();
    const from = this.zoom > 1 ? this.view / this.sr : 0;
    this.playKind = 'all'; this.base = 0;
    S.listen(this.c.ch.map((c) => CZ.faded(c, this.c.fi, this.c.fo, this.sr)), from, null, () => { this.playKind = null; this.ph = -1; this.draw(); });
    this.draw();
  }
  preview() {
    const p = this.pending; if (!p) return;
    this.stop();
    const b = p.kind === 'tap' ? p.a + p.len : p.b;
    const from = Math.max(0, p.a / this.sr - 2), to = b / this.sr + 2;
    this.playKind = 'prev';
    if (p.kind === 'drop' && this.o.previewDrop) { this.usesSong = true; this.o.previewDrop(from, to, this.pendingCh()[0], () => { this.playKind = null; this.ph = -1; this.usesSong = false; this.draw(); }); }
    else S.listen(this.pendingCh(), from, to, () => { this.playKind = null; this.ph = -1; this.draw(); });
    this.draw();
  }
  async recordDrop() {
    const p = this.pending;
    if (!p || p.b - p.a < this.sr * 0.05) { this.o.say('Drag over a part of the wave first.'); return; }
    this.stop(); this.recording = true; this.usesSong = true; this.draw();
    const take = await this.o.dropIn(p.a, p.b);
    this.recording = false; this.usesSong = false; this.ph = -1;
    if (take) { this.pending = { kind: 'drop', a: p.a, b: p.b, take }; this.o.say('Recorded. Preview it, then Keep or Discard.'); }
    this.draw();
  }
  stop() {
    if (this.recording) { S.stop(); return; }
    if (this.playKind) { S.stopListen(); if (this.usesSong) S.stop(); }
    this.playKind = null; this.ph = -1; this.usesSong = false;
  }
  tick() {
    if (this.recording || this.usesSong) { this.ph = S.playing ? S.now() : -1; this.draw(); return; }
    if (this.playKind) { this.ph = S.listenPos(); if (this.ph < 0) this.playKind = null; this.draw(); }
  }
}
