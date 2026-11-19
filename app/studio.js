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
    this.playing = false; this.drumStep = -1;
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
      const b = this.ctx.createBuffer(1, t.audio.length, sr); b.getChannelData(0).set(t.audio);
      const src = this.ctx.createBufferSource(); src.buffer = b; src.connect(this.strips[i].trim);
      src.start(at, p); this.sources.push(src);
    });
    this.schedFrom = p;
  }
  tick() {
    const ctx = this.ctx, s = this.song;
    const t = this.now();
    // loop and end of song
    if (s.loop && !this.recording) {
      const [a, b] = this.loopRange();
      if (b - a > 0.1) {
        const segEndAt = this.segAt + (b - this.segPos);
        if (t >= a - 0.01 && ctx.currentTime + 0.1 >= segEndAt && this.segPos < b) {
          const old = this.sources; this.sources = [];
          for (const x of old) { try { x.stop(segEndAt); } catch (e) {} }
          this.startSegment(segEndAt, a);
        }
      }
    } else if (!this.recording && !s.click && !s.drums.on && t >= this.length() + 0.05) {
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
    const src = this.playBuf(this.drumBufs[v], this.drumGain, at);
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
    for (const u of this.undo) this.song.tracks[u.i].audio = u.audio;
    this.undo = null; this.changed('audio'); return true;
  }
  clearTrack(i) { this.song.tracks[i].audio = null; this.undo = null; this.changed('audio'); }

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
    this.undo = [{ i, audio: t.audio ? t.audio.slice() : null }];
    t.audio = a;
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
      const a = s.tracks[plan.track].audio;
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
        const b = off.createBuffer(1, t.audio.length, sr); b.getChannelData(0).set(t.audio);
        const src = off.createBufferSource(); src.buffer = b; src.connect(strip.trim); src.start(0);
      }
      if (plan.track < 0) {
        master.apply(s);
        if (s.drums.on) {
          const dg = off.createGain(); dg.gain.value = CZ.dbToGain(s.drums.vol); dg.connect(master.input);
          const bufs = CZ.drumBuffers(off);
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
    const blob = plan.format === 1 ? CZ.encodeMp3(channels, sr) : CZ.encodeWav(channels, sr);
    const clean = (x) => x.replace(/[^A-Za-z0-9 _-]/g, '_').trim() || 'Song';
    let name = clean(s.name);
    if (plan.track >= 0) name += ' - ' + clean(s.tracks[plan.track].name) + (raw ? ' (raw)' : '');
    return { blob, name: name + (plan.format === 1 ? '.mp3' : '.wav') };
  }

  // ------------------------------------------------------------------ songs, kept in the browser (IndexedDB)
  db() {
    if (this._db) return Promise.resolve(this._db);
    return new Promise((res, rej) => {
      const r = indexedDB.open('conceptor', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('songs', { keyPath: 'name' });
      r.onsuccess = () => { this._db = r.result; res(r.result); };
      r.onerror = () => rej(r.error);
    });
  }
  async tx(mode, fn) {
    const db = await this.db();
    return new Promise((res, rej) => {
      const t = db.transaction('songs', mode); const st = t.objectStore('songs');
      const out = fn(st); t.oncomplete = () => res(out && out.result !== undefined ? out.result : out); t.onerror = () => rej(t.error);
    });
  }
  async songNames() {
    const all = await this.tx('readonly', (st) => st.getAll());
    return (all || []).sort((a, b) => (b.saved || 0) - (a.saved || 0)).map((x) => x.name);
  }
  scheduleSave() { clearTimeout(this.saveTimer); this.saveTimer = setTimeout(() => this.saveNow(), 1500); }
  async saveNow() {
    if (!this.song || this.recording) return;
    const copy = JSON.parse(JSON.stringify(this.song, (k, v) => (k === 'audio' ? undefined : v)));
    copy.tracks.forEach((t, i) => { t.arm = false; t.audio = this.song.tracks[i].audio ? this.song.tracks[i].audio.slice() : null; });
    copy.saved = Date.now(); copy.rate = this.song.rate || this.sr;
    await this.tx('readwrite', (st) => st.put(copy));
    localStorage.setItem('cz.last', this.song.name);
    this.dirty = false;
  }
  async load(name) {
    const rec = await this.tx('readonly', (st) => st.get(name));
    if (!rec) return false;
    const fresh = CZ.newSong(rec.name);
    const song = Object.assign(fresh, rec);
    song.tracks.forEach((t) => { t.arm = false; if (t.audio && !(t.audio instanceof Float32Array)) t.audio = new Float32Array(t.audio); });
    this.setSong(song);
    return true;
  }
  async remove(name) { await this.tx('readwrite', (st) => st.delete(name)); }
  setSong(song) {
    if (this.playing) this.stop();
    this.song = song; this.pos = 0; this.undo = null;
    this.fitRate(); this.applyAll(); this.emit('song');
  }
  async newSong(name) {
    if (this.song) await this.saveNow();
    const names = await this.songNames();
    let n = (name || '').trim() || 'Song', base = n, k = 2;
    while (names.includes(n)) n = base + ' ' + k++;
    this.setSong(CZ.newSong(n));
    await this.saveNow();
  }
}
