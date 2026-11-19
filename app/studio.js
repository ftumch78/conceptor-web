// Conceptor web studio: transport, recording, drums, saving songs in the browser, import and export.
'use strict';

class Studio {
  constructor() {
    this.ctx = null; this.song = null; this.pos = 0; this.playing = false; this.recording = false;
    this.sources = []; this.timer = null; this.listeners = []; this.dirty = false;
    this.offsetMs = parseFloat(localStorage.getItem('cz.offsetMs') || '0') || 0;
    this.undo = null; this.drumStep = -1;
  }
  on(fn) { this.listeners.push(fn); }
  emit(what) { for (const f of this.listeners) f(what); }
  get sr() { return this.ctx ? this.ctx.sampleRate : 48000; }

  // ------------------------------------------------------------------ audio start (must follow a tap)
  async startAudio() {
    if (this.ctx) { if (this.ctx.state !== 'running') await this.ctx.resume(); return; }
    if (navigator.audioSession) { try { navigator.audioSession.type = 'play-and-record'; } catch (e) {} }
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC({ latencyHint: 'interactive' });
    const unlock = this.ctx.resume();   // iPhone and iPad only allow sound to start inside the tap itself
    await this.ctx.audioWorklet.addModule('worklets.js');
    await unlock;
    this.drumBufs = CZ.drumBuffers(this.ctx); this.clickBufs = CZ.clickBuffers(this.ctx);
    this.master = CZ.makeMaster(this.ctx, this.ctx.destination);
    this.drumGain = this.ctx.createGain(); this.drumGain.connect(this.master.input);
    this.clickGain = this.ctx.createGain(); this.clickGain.connect(this.ctx.destination);
    this.strips = []; for (let t = 0; t < CZ.TRACKS; t++) this.strips.push(CZ.makeStrip(this.ctx, this.master.input));
    if (this.ctx.state !== 'running') await this.ctx.resume();
    if (this.song) { this.fitRate(); this.applyAll(); }
  }
  // songs keep the sample rate they were recorded at; a device with a different rate gets the audio converted once
  fitRate() {
    const s = this.song; if (!this.ctx || !s) return;
    const want = this.ctx.sampleRate, have = s.rate || want;
    if (have !== want) {
      const k = have / want;
      for (const t of s.tracks) if (t.audio) {
        const n = Math.floor(t.audio.length / k), a = new Float32Array(n);
        for (let i = 0; i < n; i++) { const x = i * k, i0 = Math.floor(x), i1 = Math.min(t.audio.length - 1, i0 + 1), f = x - i0; a[i] = t.audio[i0] * (1 - f) + t.audio[i1] * f; }
        t.audio = a;
      }
    }
    s.rate = want;
  }

  async openMic() {
    if (this.micNode) return true;
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: {
        deviceId: this.inputId ? { exact: this.inputId } : undefined, echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    } catch (e) { return false; }
    this.micNode = this.ctx.createMediaStreamSource(this.micStream);
    this.recNode = new AudioWorkletNode(this.ctx, 'cz-recorder', { numberOfOutputs: 0 });
    this.micNode.connect(this.recNode);
    this.recNode.port.onmessage = (e) => this.onRecData(e.data);
    this.monitorGains = this.strips.map((s) => { const g = this.ctx.createGain(); g.gain.value = 0; this.micNode.connect(g); g.connect(s.trim); return g; });
    this.applyAll();
    return true;
  }
  closeMic() {
    if (!this.micNode) return;
    this.micStream.getTracks().forEach((t) => t.stop());
    try { this.micNode.disconnect(); } catch (e) {}
    this.micNode = null; this.recNode = null; this.monitorGains = null;
  }
  async inputs() {
    try { const d = await navigator.mediaDevices.enumerateDevices(); return d.filter((x) => x.kind === 'audioinput'); } catch (e) { return []; }
  }

  // ------------------------------------------------------------------ applying the song to the audio graph
  applyAll() {
    if (!this.ctx || !this.song) return;
    const anySolo = this.song.tracks.some((t) => t.solo);
    this.song.tracks.forEach((t, i) => {
      this.strips[i].apply(t, !t.mute && (!anySolo || t.solo));
      if (this.monitorGains) this.monitorGains[i].gain.value = t.arm ? 1 : 0;
    });
    this.master.apply(this.song);
    this.drumGain.gain.value = this.song.drums.on ? CZ.dbToGain(this.song.drums.vol) : 0;
  }
  changed(what) { this.dirty = true; this.applyAll(); this.emit(what || 'change'); this.scheduleSave(); }

  // ------------------------------------------------------------------ transport
  length() { return CZ.songLength(this.song) / this.sr; }
  loopRange() {
    const s = this.song; const L = this.length();
    if (s.loopEnd > s.loopStart + 0.05) return [s.loopStart, s.loopEnd];
    return [0, L];
  }
  now() { return this.playing ? this.segPos + (this.ctx.currentTime - this.segAt) : this.pos; }

  async play() {
    await this.startAudio();
    if (this.playing) return;
    const L = this.length();
    if (!this.song.loop && this.pos >= L && !this.song.click && !this.song.drums.on) this.pos = 0;
    this.startSegment(this.ctx.currentTime + 0.05, this.pos);
    this.playing = true;
    this.timer = setInterval(() => this.tick(), 25);
    this.emit('transport');
  }
  stop() {
    if (!this.playing) return;
    this.pos = Math.max(0, this.now());
    for (const s of this.sources) { try { s.stop(); } catch (e) {} }
    this.sources = []; clearInterval(this.timer); this.timer = null;
    this.playing = false; this.drumStep = -1; this.rangeEnd = null;
    if (this.dropMon != null && this.monitorGains) { this.monitorGains[this.dropMon].gain.value = this.song.tracks[this.dropMon].arm ? 1 : 0; this.dropMon = null; }
    if (this.recording) this.finishRecording();
    this.emit('transport');
  }
  rewind() {
    const was = this.playing; if (was) this.stop();
    this.pos = this.song.loop ? this.loopRange()[0] : 0;
    if (was) this.play();
    this.emit('transport');
  }
  // plays the tracks from song time p, starting at context time at
  startSegment(at, p) {
    this.segAt = at; this.segPos = p; this.nextBeat = null;
    const sr = this.sr;
    this.song.tracks.forEach((t, i) => {
      if (!t.audio || t.audio.length / sr <= p) return;
      const audio = this.override && this.override.i === i ? this.override.audio : CZ.trackAudio(t, sr);
      const b = this.ctx.createBuffer(1, audio.length, sr); b.getChannelData(0).set(audio);
      const src = this.ctx.createBufferSource(); src.buffer = b; src.connect(this.strips[i].trim);
      src.start(at, p); this.sources.push(src);
    });
    this.schedFrom = p;
  }
  tick() {
    const ctx = this.ctx, s = this.song;
    const t = this.now();
    if (this.rangeEnd && t >= this.rangeEnd.to) { const cb = this.rangeEnd.onEnd; this.stop(); if (cb) cb(); return; }
    // loop and end of song
    if (s.loop && !this.recording && !this.rangeEnd) {
      const [a, b] = this.loopRange();
      if (b - a > 0.1) {
        const segEndAt = this.segAt + (b - this.segPos);
        if (t >= a - 0.01 && ctx.currentTime + 0.1 >= segEndAt && this.segPos < b) {
          const old = this.sources; this.sources = [];
          for (const x of old) { try { x.stop(segEndAt); } catch (e) {} }
          this.startSegment(segEndAt, a);
        }
      }
    } else if (!this.recording && !this.rangeEnd && !s.click && !s.drums.on && t >= this.length() + 0.05) {
      this.stop(); this.pos = this.length(); this.emit('transport'); return;
    }
    if (this.recording && t >= CZ.MAX_SECONDS) { this.stop(); return; }
    this.scheduleBeats();
    this.emit('tick');
  }
  // drums and click, scheduled a little ahead
  scheduleBeats() {
    const s = this.song, ctx = this.ctx;
    const step = 60 / Math.max(30, s.bpm) / 4;
    const horizon = ctx.currentTime + 0.12;
    if (this.nextBeat == null) this.nextBeat = Math.ceil(this.segPos / step - 1e-6);
    for (;;) {
      const songT = this.nextBeat * step;
      const at = this.segAt + (songT - this.segPos);
      if (at > horizon) break;
      if (at >= ctx.currentTime - 0.005) {
        const st = ((this.nextBeat % 16) + 16) % 16;
        if (s.drums.on) {
          for (let v = 0; v < 6; v++) if (s.drums.steps[v][st]) this.playDrum(v, at);
        }
        if (s.click && st % 4 === 0) this.playBuf(this.clickBufs[st === 0 ? 0 : 1], this.clickGain, at);
        const delayMs = Math.max(0, (at - ctx.currentTime) * 1000);
        setTimeout(() => { if (this.playing) { this.drumStep = st; this.emit('step'); } }, delayMs);
      }
      this.nextBeat++;
    }
  }
  playBuf(buf, dest, at) { const src = this.ctx.createBufferSource(); src.buffer = buf; src.connect(dest); src.start(at); return src; }
  playDrum(v, at) {
    if (v === 2 && this.openHat) { try { this.openHat.stop(at); } catch (e) {} }
    const src = this.playBuf(this.drumBuf(v), this.drumGain, at);
    if (v === 3) this.openHat = src;
  }

  // ------------------------------------------------------------------ recording
  async record() {
    if (this.recording) { this.stop(); return 'stopped'; }
    await this.startAudio();
    const armed = this.song.tracks.map((t, i) => (t.arm ? i : -1)).filter((i) => i >= 0);
    if (!armed.length) return 'noarm';
    if (!(await this.openMic())) return 'nomic';
    if (this.playing) this.stop();
    this.undo = armed.map((i) => ({ i, audio: this.song.tracks[i].audio ? this.song.tracks[i].audio.slice() : null }));
    this.recChunks = []; this.recArmed = armed; this.recPos = this.pos;
    const at = this.ctx.currentTime + 0.1;
    this.recNode.port.postMessage({ rec: true, at });
    this.startSegment(at, this.pos);
    this.playing = true; this.recording = true;
    this.timer = setInterval(() => this.tick(), 25);
    this.emit('transport');
    return 'ok';
  }
  onRecData(d) {
    if (d.data) this.recChunks.push(d.data);
    if (d.done) this.placeRecording();
  }
  finishRecording() { this.recording = false; if (this.recNode) this.recNode.port.postMessage({ rec: false }); }
  placeRecording() {
    const sr = this.sr;
    let n = 0; for (const c of this.recChunks) n += c.length;
    const all = new Float32Array(n); let o = 0; for (const c of this.recChunks) { all.set(c, o); o += c.length; }
    const lat = (this.ctx.baseLatency || 0) + (this.ctx.outputLatency || 0) + this.offsetMs / 1000;
    const shift = Math.round(lat * sr);
    if (this.drop) {   // Drop In: hand back only the chosen part, nothing is placed yet
      const d = this.drop; this.drop = null; this.recChunks = [];
      const g = Math.pow(10, this.song.tracks[d.i].trim / 20);
      const take = new Float32Array(d.b - d.a);
      const base = d.a - Math.round(this.recPos * sr) + shift;
      for (let k = 0; k < take.length; k++) { const j = base + k; take[k] = j >= 0 && j < n ? all[j] * g : d.orig[k]; }
      d.done(take); return;
    }
    const start = Math.round(this.recPos * sr);
    const max = CZ.MAX_SECONDS * sr;
    for (const i of this.recArmed) {
      const t = this.song.tracks[i];
      const g = Math.pow(10, t.trim / 20);
      const oldLen = t.audio ? t.audio.length : 0;
      const end = Math.min(max, Math.max(oldLen, start + n - shift));
      const a = new Float32Array(end); if (t.audio) a.set(t.audio.subarray(0, Math.min(oldLen, end)));
      for (let k = shift; k < n; k++) { const w = start + k - shift; if (w >= 0 && w < end) a[w] = all[k] * g; }
      t.audio = a;
    }
    this.recChunks = [];
    this.changed('audio'); this.saveNow();
  }
  undoTake() {
    if (!this.undo || this.playing) return false;
    for (const u of this.undo) { const t = this.song.tracks[u.i]; t.audio = u.audio; t.fi = u.fi || 0; t.fo = u.fo || 0; }
    this.undo = null; this.changed('audio'); return true;
  }
  clearTrack(i) { const t = this.song.tracks[i]; t.audio = null; t.fi = 0; t.fo = 0; t._undo = []; this.undo = null; this.changed('audio'); }

  // ------------------------------------------------------------------ import
  async importFile(i, file) {
    await this.startAudio();
    if (this.playing) this.stop();
    let buf;
    try { buf = await this.ctx.decodeAudioData(await file.arrayBuffer()); } catch (e) { return 'bad'; }
    const sr = this.sr, max = CZ.MAX_SECONDS * sr;
    const n = Math.min(buf.length, max);
    const a = new Float32Array(n);
    for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let k = 0; k < n; k++) a[k] += d[k] / buf.numberOfChannels; }
    const t = this.song.tracks[i];
    this.undo = [{ i, audio: t.audio ? t.audio.slice() : null, fi: t.fi, fo: t.fo }];
    t.audio = a; t.fi = 0; t.fo = 0; t._undo = [];
    if (/^Track \d+$/.test(t.name)) t.name = CZ.uniqueName(file.name.replace(/\.[^.]+$/, '').slice(0, 40), this.song.tracks.map((x) => x.name));
    this.changed('audio'); this.saveNow();
    return buf.length > max ? 'cut' : 'ok';
  }

  // ------------------------------------------------------------------ export
  exportLength(track) {
    if (track >= 0) { const a = this.song.tracks[track].audio; return a ? a.length / this.sr : 0; }
    const L = this.length();
    if (L > 0 || !this.song.drums.on) return L;
    return 16 * 60 / Math.max(30, this.song.bpm);
  }
  // returns {blob, name}
  async exportFile(plan) {
    await this.startAudio();
    if (this.playing) this.stop();
    const sr = this.sr, s = this.song;
    const full = this.exportLength(plan.track);
    const start = Math.max(0, plan.start), end = Math.min(full, plan.end > start ? plan.end : full);
    const raw = plan.track >= 0 && !plan.withFx;
    const tail = end >= full - 0.01 && !raw ? 3 : 0;
    let channels;
    if (raw) {
      const a = CZ.trackAudio(s.tracks[plan.track], sr);
      channels = [a.slice(Math.round(start * sr), Math.round(end * sr))];
    } else {
      const total = Math.ceil((end + tail) * sr);
      const off = new OfflineAudioContext(2, total, sr);
      await off.audioWorklet.addModule('worklets.js');
      const master = CZ.makeMaster(off, off.destination);
      const anySolo = s.tracks.some((t) => t.solo);
      const list = plan.track >= 0 ? [plan.track] : s.tracks.map((_, i) => i);
      let bus = master.input;
      if (plan.track >= 0) bus = off.destination;
      for (const i of list) {
        const t = s.tracks[i];
        if (!t.audio) continue;
        const strip = CZ.makeStrip(off, bus);
        strip.apply(t, plan.track >= 0 ? true : (!t.mute && (!anySolo || t.solo)));
        const audio = CZ.trackAudio(t, sr);
        const b = off.createBuffer(1, audio.length, sr); b.getChannelData(0).set(audio);
        const src = off.createBufferSource(); src.buffer = b; src.connect(strip.trim); src.start(0);
      }
      if (plan.track < 0) {
        master.apply(s);
        if (s.drums.on) {
          const dg = off.createGain(); dg.gain.value = CZ.dbToGain(s.drums.vol); dg.connect(master.input);
          const bufs = CZ.drumBuffers(off).map((b, v) => this.customDrum(off, v) || b);
          const step = 60 / Math.max(30, s.bpm) / 4;
          let open = null;
          for (let k = 0; k * step < end; k++) {
            const st = k % 16;
            for (let v = 0; v < 6; v++) if (s.drums.steps[v][st]) {
              if (v === 2 && open) { try { open.stop(k * step); } catch (e) {} }
              const src = off.createBufferSource(); src.buffer = bufs[v]; src.connect(dg); src.start(k * step);
              if (v === 3) open = src;
            }
          }
        }
      }
      const rendered = await off.startRendering();
      const a0 = Math.round(start * sr);
      channels = [rendered.getChannelData(0).slice(a0), rendered.getChannelData(1).slice(a0)];
    }
    // fades where it was cropped
    const n = channels[0].length;
    if (start > 0) { const f = Math.min(n, Math.round(sr / 200)); for (const c of channels) for (let i = 0; i < f; i++) c[i] *= i / f; }
    if (end < full - 0.01) { const f = Math.min(n, Math.round(sr / 100)); for (const c of channels) for (let i = 0; i < f; i++) c[n - 1 - i] *= i / f; }
    if (plan.channelsOnly) return { channels, sr };
    const blob = plan.format === 1 ? CZ.encodeMp3(channels, sr) : CZ.encodeWav(channels, sr);
    const clean = (x) => x.replace(/[^A-Za-z0-9 _-]/g, '_').trim() || 'Song';
    let name = clean(s.name);
    if (plan.track >= 0) name += ' - ' + clean(s.tracks[plan.track].name) + (raw ? ' (raw)' : '');
    return { blob, name: name + (plan.format === 1 ? '.mp3' : '.wav') };
  }


  // ------------------------------------------------------------------ custom drum sounds
  drumBuf(v) { return (this.ctx && this.customDrum(this.ctx, v)) || this.drumBufs[v]; }
  customDrum(ctx, v) {
    const smp = this.song && this.song.drums.samples && this.song.drums.samples[v];
    if (!smp || !smp.audio || !smp.audio.length) return null;
    const audio = CZ.faded(smp.audio, smp.fi, smp.fo, this.sr);
    if (ctx === this.ctx && smp._buf && smp._ver === smp.ver) return smp._buf;
    const b = ctx.createBuffer(1, audio.length, this.sr); b.getChannelData(0).set(audio);
    if (ctx === this.ctx) { Object.defineProperty(smp, '_buf', { value: b, writable: true, enumerable: false, configurable: true }); Object.defineProperty(smp, '_ver', { value: smp.ver, writable: true, enumerable: false, configurable: true }); }
    return b;
  }
  async decodeFile(file, maxSec) {
    await this.startAudio();
    let buf;
    try { buf = await this.ctx.decodeAudioData(await file.arrayBuffer()); } catch (e) { return null; }
    const n = Math.min(buf.length, Math.round(maxSec * this.sr)), a = new Float32Array(n);
    for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let k = 0; k < n; k++) a[k] += d[k] / buf.numberOfChannels; }
    return a;
  }
  setDrumSample(v, audio, name) { this.song.drums.samples[v] = { audio, name, fi: 0, fo: 0, ver: 1 }; this.changed('drums'); }
  resetDrumSample(v) { this.song.drums.samples[v] = null; this.changed('drums'); }

  // ------------------------------------------------------------------ listening to one clip (editor, audition)
  async listen(chs, from = 0, to = null, onEnd = null) {
    await this.startAudio();
    this.stopListen();
    if (this.playing) this.stop();
    const n = chs[0].length, sr = this.sr;
    const b = this.ctx.createBuffer(chs.length, n, sr); chs.forEach((c, k) => b.getChannelData(k).set(c));
    const src = this.ctx.createBufferSource(); src.buffer = b;
    const g = this.ctx.createGain(); g.gain.value = chs.length === 1 ? 0.8 : 1;
    src.connect(g); g.connect(this.ctx.destination);
    const end = to == null ? n / sr : Math.min(n / sr, to);
    const at = this.ctx.currentTime + 0.03;
    src.start(at, from, Math.max(0.01, end - from));
    this.lis = { src, at, from, end };
    src.onended = () => { if (this.lis && this.lis.src === src) { this.lis = null; if (onEnd) onEnd(); } };
  }
  listenPos() { return this.lis ? Math.min(this.lis.end, this.lis.from + Math.max(0, this.ctx.currentTime - this.lis.at)) : -1; }
  stopListen() { if (this.lis) { const s = this.lis.src; this.lis = null; try { s.stop(); } catch (e) {} } }

  // plays the song from `from` to `to` (seconds), optionally with a different audio on one track
  async playRange(from, to, override, onEnd) {
    await this.startAudio();
    this.stopListen(); if (this.playing) this.stop();
    this.override = override || null;
    this.pos = Math.max(0, from);
    await this.play();
    this.override = null;
    this.rangeEnd = { to, onEnd };
  }

  // Drop In: count-in from 2 s before a, records only a..b (samples), calls done(take) with the new audio
  async recordDropIn(i, a, b, done) {
    await this.startAudio();
    if (!(await this.openMic())) return 'nomic';
    this.stopListen(); if (this.playing) this.stop();
    const sr = this.sr;
    this.pos = Math.max(0, a / sr - 2);
    this.recChunks = []; this.recArmed = []; this.recPos = this.pos;
    const t = this.song.tracks[i];
    const orig = t.audio.slice(a, b);
    this.drop = { i, a, b, done, orig };
    const quiet = CZ.trackAudio(t, sr).slice(); quiet.fill(0, a, b);   // the old part is not heard while re-recording it
    this.override = { i, audio: quiet };
    this.dropMon = i; this.monitorGains[i].gain.value = 1;
    const at = this.ctx.currentTime + 0.1;
    this.recNode.port.postMessage({ rec: true, at });
    this.startSegment(at, this.pos);
    this.override = null;
    this.playing = true; this.recording = true;
    this.rangeEnd = { to: b / sr };
    this.timer = setInterval(() => this.tick(), 25);
    this.emit('transport');
    return 'ok';
  }

  // ------------------------------------------------------------------ songs, kept in the browser (IndexedDB)
  db() {
    if (this._db) return Promise.resolve(this._db);
    return new Promise((res, rej) => {
      const r = indexedDB.open('conceptor', 2);
      r.onupgradeneeded = () => {
        if (!r.result.objectStoreNames.contains('songs')) r.result.createObjectStore('songs', { keyPath: 'name' });
        if (!r.result.objectStoreNames.contains('kv')) r.result.createObjectStore('kv');
      };
      r.onsuccess = () => { this._db = r.result; res(r.result); };
      r.onerror = () => rej(r.error);
    });
  }
  async tx(mode, fn, store = 'songs') {
    const db = await this.db();
    return new Promise((res, rej) => {
      const t = db.transaction(store, mode); const st = t.objectStore(store);
      const out = fn(st); t.oncomplete = () => res(out && out.result !== undefined ? out.result : out); t.onerror = () => rej(t.error);
    });
  }
  kvGet(k) { return this.tx('readonly', (st) => st.get(k), 'kv'); }
  kvSet(k, v) { return this.tx('readwrite', (st) => st.put(v, k), 'kv'); }
  async allSongs() { return (await this.tx('readonly', (st) => st.getAll())) || []; }
  async songNames() {
    const all = await this.allSongs();
    return all.sort((a, b) => (b.saved || 0) - (a.saved || 0)).map((x) => x.name);
  }
  scheduleSave() { clearTimeout(this.saveTimer); this.saveTimer = setTimeout(() => this.saveNow(), 1500); }
  static fill(rec) {
    const song = Object.assign(CZ.newSong(rec.name), rec);
    song.tracks.forEach((t) => { t.arm = false; t.fi = t.fi || 0; t.fo = t.fo || 0; if (t.audio && !(t.audio instanceof Float32Array)) t.audio = new Float32Array(t.audio); });
    if (!song.drums.samples) song.drums.samples = [null, null, null, null, null, null];
    if (!song.exports) song.exports = [];
    if (!song.created) song.created = CZ.today();
    return song;
  }
  async saveNow() {
    if (!this.song || this.recording) return;
    this.song.saved = Date.now(); this.song.rate = this.song.rate || this.sr;
    await this.tx('readwrite', (st) => st.put(this.song));
    localStorage.setItem('cz.last', this.song.name);
    this.dirty = false;
    if (this.folderOn()) this.writeSongToFolder(this.song).catch(() => {});
  }
  async getSong(name) { const rec = await this.tx('readonly', (st) => st.get(name)); return rec ? Studio.fill(rec) : null; }
  async putSong(song) { song.saved = song.saved || Date.now(); await this.tx('readwrite', (st) => st.put(song)); if (this.folderOn()) this.writeSongToFolder(song).catch(() => {}); }
  async load(name) {
    const song = await this.getSong(name);
    if (!song) return false;
    this.setSong(song);
    return true;
  }
  async remove(name) { await this.tx('readwrite', (st) => st.delete(name)); }
  setSong(song) {
    if (this.playing) this.stop();
    this.song = song; this.pos = 0; this.undo = null;
    this.fitRate(); this.applyAll(); this.emit('song');
  }
  async newSongName(base) { return CZ.uniqueName(base || 'Untitled - ' + CZ.today(), await this.songNames()); }
  async newSong(name, open = true) {
    if (open && this.song) await this.saveNow();
    const n = await this.newSongName((name || '').trim() || null);
    const song = CZ.newSong(n);
    if (open) { this.setSong(song); await this.saveNow(); } else await this.putSong(song);
    return n;
  }
  async renameSong(oldName, wanted) {
    const others = (await this.songNames()).filter((n) => n !== oldName);
    const name = CZ.uniqueName((wanted || '').trim() || 'Untitled - ' + CZ.today(), others);
    if (name === oldName) return name;
    const song = this.song && this.song.name === oldName ? this.song : await this.getSong(oldName);
    await this.remove(oldName);
    const oldFolder = oldName;
    song.name = name;
    for (const e of song.exports) if (e.name.startsWith(oldName + ' – ')) e.name = name + e.name.slice(oldName.length);
    await this.tx('readwrite', (st) => st.put(song));
    if (this.song === song) localStorage.setItem('cz.last', name);
    if (this.folderOn()) { this.removeFolderSong(oldFolder).catch(() => {}); this.writeSongToFolder(song).catch(() => {}); }
    this.emit('song');
    return name;
  }

  // copies a track into another song (or the open one). Empty "Track n" slots are used first, up to 12.
  async copyTrack(fromName, ti, toName) {
    const from = this.song && this.song.name === fromName ? this.song : await this.getSong(fromName);
    const tr = from.tracks[ti];
    const target = this.song && this.song.name === toName ? this.song : await this.getSong(toName);
    let k = target.tracks.findIndex((t, i) => !t.audio && /^Track \d+$/.test(t.name) && i < 12);
    if (k < 0) return 'full';
    const t = target.tracks[k];
    t.name = tr.name; t.audio = tr.audio ? tr.audio.slice() : null; t.fi = tr.fi; t.fo = tr.fo;
    t.vol = tr.vol; t.pan = tr.pan; t.fx = JSON.parse(JSON.stringify(tr.fx));
    target.shown = Math.max(target.shown, k + 1);
    if (target === this.song) { this.changed('audio'); await this.saveNow(); } else { target.saved = Date.now(); await this.putSong(target); }
    return t.name;
  }

  // keeps an exported file in the song's Library folder
  async addExport(kind, name, fmt, blob, len) {
    const s = this.song;
    const list = s.exports.map((e) => e.name);
    const e = { id: Date.now() + '-' + Math.random().toString(36).slice(2, 7), kind, name: CZ.uniqueName(name, list), fmt, date: CZ.today(), len, blob };
    s.exports.unshift(e);
    await this.saveNow();
    return e;
  }
  async renderMixChannels() {
    return (await this.exportFile({ track: -1, withFx: true, format: 0, start: 0, end: 0, channelsOnly: true }));
  }

  // ------------------------------------------------------------------ Library folder (kept in sync by OneDrive or Google Drive)
  folderSupported() { return typeof window.showDirectoryPicker === 'function'; }
  folderOn() { return !!this.folder && localStorage.getItem('cz.libLoc') === 'folder'; }
  async restoreFolder() {
    try { const h = await this.kvGet('folder'); if (h) this.folder = h; } catch (e) {}
    return this.folder || null;
  }
  async pickFolder() {
    const h = await window.showDirectoryPicker({ id: 'conceptor-library', mode: 'readwrite' });
    this.folder = h; await this.kvSet('folder', h);
    return h;
  }
  async folderAllowed(ask) {
    if (!this.folder) return false;
    const o = { mode: 'readwrite' };
    if ((await this.folder.queryPermission(o)) === 'granted') return true;
    return ask ? (await this.folder.requestPermission(o)) === 'granted' : false;
  }
  async libDir() { return this.folder.getDirectoryHandle('Conceptor Library', { create: true }); }
  async writeFile(dir, name, data) {
    const fh = await dir.getFileHandle(name, { create: true });
    const w = await fh.createWritable(); await w.write(data); await w.close();
  }
  songText(s) {
    const d = new Date(s.saved || Date.now());
    const lines = ['Conceptor song', 'Name: ' + s.name, 'Created: ' + (s.created || ''), 'Saved: ' + d.getDate() + ' ' + CZ.MONTHS[d.getMonth()] + ' ' + d.getFullYear(),
      'Tempo: ' + Math.round(s.bpm) + ' bpm', 'Sample rate: ' + (s.rate || this.sr), 'Tracks:'];
    s.tracks.forEach((t, i) => { if (t.audio) lines.push('  ' + String(i + 1).padStart(2, '0') + ' ' + t.name + ' (' + CZ.formatTime(t.audio.length / (s.rate || this.sr)) + ')'); });
    lines.push('Exported mixes:'); s.exports.filter((e) => e.kind === 'mix').forEach((e) => lines.push('  ' + e.name + ' (' + e.fmt + ', ' + e.date + ')'));
    lines.push('Exported tracks:'); s.exports.filter((e) => e.kind === 'track').forEach((e) => lines.push('  ' + e.name + ' (' + e.fmt + ', ' + e.date + ')'));
    return lines.join('\n') + '\n';
  }
  async writeSongToFolder(s) {
    if (!(await this.folderAllowed(false))) return false;
    const lib = await this.libDir();
    const dir = await lib.getDirectoryHandle(CZ.cleanFile(s.name), { create: true });
    const sr = s.rate || this.sr;
    const meta = JSON.parse(JSON.stringify(s, (k, v) => (k === 'audio' || k === 'blob' || k.startsWith('_') ? undefined : v)));
    await this.writeFile(dir, 'song.txt', this.songText(s));
    await this.writeFile(dir, 'conceptor-song.json', JSON.stringify(meta));
    const td = await dir.getDirectoryHandle('Tracks', { create: true });
    for (let i = 0; i < s.tracks.length; i++) {
      const t = s.tracks[i], file = String(i + 1).padStart(2, '0') + '.wav';
      if (t.audio) await this.writeFile(td, file, CZ.encodeWav([t.audio], sr));
      else { try { await td.removeEntry(file); } catch (e) {} }
    }
    const ds = s.drums.samples || [];
    if (ds.some((x) => x)) { const dd = await dir.getDirectoryHandle('Drum Sounds', { create: true }); for (let v = 0; v < 6; v++) if (ds[v]) await this.writeFile(dd, v + '.wav', CZ.encodeWav([ds[v].audio], sr)); }
    for (const e of s.exports) {
      const sub = await dir.getDirectoryHandle(e.kind === 'mix' ? 'Exported Mixes' : 'Exported Tracks', { create: true });
      const fname = CZ.cleanFile(e.name) + (e.fmt === 'MP3 320k' ? '.mp3' : '.wav');
      try { await sub.getFileHandle(fname); } catch (er) { await this.writeFile(sub, fname, e.blob); }
    }
    return true;
  }
  async removeFolderSong(name) { if (!(await this.folderAllowed(false))) return; const lib = await this.libDir(); try { await lib.removeEntry(CZ.cleanFile(name), { recursive: true }); } catch (e) {} }
  async readSongFromFolder(dir) {
    let meta;
    try { meta = JSON.parse(await (await (await dir.getFileHandle('conceptor-song.json')).getFile()).text()); } catch (e) { return null; }
    const song = Studio.fill(meta);
    const readWav = async (d, n) => { try { const f = await (await d.getFileHandle(n)).getFile(); const b = await this.ctx.decodeAudioData(await f.arrayBuffer()); return b.getChannelData(0).slice(); } catch (e) { return null; } };
    let td = null; try { td = await dir.getDirectoryHandle('Tracks'); } catch (e) {}
    for (let i = 0; i < song.tracks.length; i++) song.tracks[i].audio = td ? await readWav(td, String(i + 1).padStart(2, '0') + '.wav') : null;
    let dd = null; try { dd = await dir.getDirectoryHandle('Drum Sounds'); } catch (e) {}
    for (let v = 0; v < 6; v++) if (song.drums.samples[v]) { const a = dd ? await readWav(dd, v + '.wav') : null; song.drums.samples[v] = a ? Object.assign(song.drums.samples[v], { audio: a }) : null; }
    for (const e of song.exports) {
      try { const sub = await dir.getDirectoryHandle(e.kind === 'mix' ? 'Exported Mixes' : 'Exported Tracks'); e.blob = await (await sub.getFileHandle(CZ.cleanFile(e.name) + (e.fmt === 'MP3 320k' ? '.mp3' : '.wav'))).getFile(); } catch (er) { e.blob = null; }
    }
    song.exports = song.exports.filter((e) => e.blob);
    return song;
  }
  // What is in the folder that is not here. Same name but different content: kept as a second copy.
  async folderSongs() {
    const lib = await this.libDir(), out = [];
    for await (const [n, h] of lib.entries()) if (h.kind === 'directory') out.push(h);
    return out;
  }
  async syncFolder(progress) {
    await this.startAudio();
    if (this.song) await this.saveNow();
    const local = await this.allSongs(), byName = new Map(local.map((s) => [s.name, s]));
    let brought = 0, sent = 0;
    for (const dir of await this.folderSongs()) {
      const s = await this.readSongFromFolder(dir);
      if (!s) continue;
      const mine = byName.get(s.name);
      if (mine && (mine.saved || 0) === (s.saved || 0)) continue;
      if (mine && (mine.saved || 0) > (s.saved || 0) && mine.syncedFrom === s.saved) continue;   // only changed here: this copy is sent below
      if (mine) { s.name = CZ.uniqueName(s.name + ' (computer copy)', [...byName.keys()]); }
      s.syncedFrom = s.saved;
      await this.tx('readwrite', (st) => st.put(s)); byName.set(s.name, s); brought++;
      if (progress) progress('Brought in ' + s.name);
    }
    for (const s of await this.allSongs()) { const full = Studio.fill(s); await this.writeSongToFolder(full); s.syncedFrom = s.saved; await this.tx('readwrite', (st) => st.put(s)); sent++; if (progress) progress('Saved ' + s.name); }
    const when = new Date(); localStorage.setItem('cz.lastSync', when.getDate() + ' ' + CZ.MONTHS[when.getMonth()] + ' ' + when.getFullYear() + ', ' + when.toTimeString().slice(0, 5));
    if (this.song) { const cur = await this.getSong(this.song.name); if (cur) { this.song.syncedFrom = cur.syncedFrom; } }
    return { brought, sent };
  }
}
