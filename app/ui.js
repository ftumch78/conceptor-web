// Conceptor 0.4 web screens. Capsule and round buttons (hexagons only in the menu), Hand Hold tips, Home on every screen and pop-up, one question at a time.
'use strict';

const S = new Studio();
const ui = { screen: 0, welcome: 0, track: 0, open: -1, menu: false, micAsked: false, micOk: false, sel: 0, pop: null, dialog: null };
const COLOURS = ['#E8C872', '#D99A4A', '#C96F4A', '#B85C6E', '#9B6BB0', '#6E7FC4', '#4F9BB8', '#4FB5A0', '#7DB85A', '#B4B84F', '#D2A24C', '#A68B6A'];
const $ = (q) => document.querySelector(q);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isPhone = () => /iPhone|iPad|Android/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
let bannerTimer = null;
function say(t) { const b = $('#banner'); b.textContent = t; b.style.display = 'block'; clearTimeout(bannerTimer); bannerTimer = setTimeout(() => { b.style.display = 'none'; }, 3500); }

// ------------------------------------------------------------------ small pieces (capsule and round buttons; hexagons only in the menu)
const hx = (label, act, cls = '', extra = '') => `<button class="hex ${cls}" data-act="${act}" ${extra}><span>${label}</span></button>`;
const ii = (k) => `<button class="info" data-tip="${k}" aria-label="About this">i</button>`;
const sw = (on, act) => `<button class="sw ${on ? 'on' : ''}" data-act="${act}" aria-pressed="${on}"><i></i></button>`;
const HIVE = (() => { const h = (x, y) => `<polygon points="${[0, 1, 2, 3, 4, 5].map((k) => { const a = Math.PI / 3 * k; return (x + 5 * Math.cos(a)).toFixed(1) + ',' + (y + 5 * Math.sin(a)).toFixed(1); }).join(' ')}"/>`;
  return `<svg width="20" height="17" viewBox="0 0 28 24" class="hive" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">${h(6, 7)}${h(14, 12)}${h(22, 7)}${h(14, 3)}${h(6, 17)}${h(22, 17)}</svg>`; })();
const homeBtn = () => `<span class="lbl">${hx(HIVE + 'Home', 'home', 'sm')}${ii('home')}</span>`;
function slider(label, value, lo, hi, step, bind, shown) {
  return `<div class="sl"><div class="row"><span>${esc(label)}</span><b data-show="${bind}">${shown}</b></div>
    <input type="range" min="${lo}" max="${hi}" step="${step}" value="${value}" data-bind="${bind}" aria-label="${esc(label)}"></div>`;
}
const dbText = (v, lo) => (v <= lo + 0.5 && lo <= -59 ? 'off' : v.toFixed(1) + ' dB');
const panText = (v) => (Math.abs(v) < 0.02 ? 'centre' : v < 0 ? 'left ' + Math.round(-v * 100) : 'right ' + Math.round(v * 100));
const fmt = CZ.formatTime;
const plural = (n, a, b) => n + ' ' + (n === 1 ? a : (b || a + 's'));

// ------------------------------------------------------------------ Hand Hold
function handHold() { return localStorage.getItem('cz.hh') !== '0'; }
function setHandHold(on) { localStorage.setItem('cz.hh', on ? '1' : '0'); document.body.classList.toggle('nohh', !on); }
function tip(k) { const t = CZ.TIPS[k]; if (!t) return; $('#tipT').textContent = t[0]; $('#tipP').textContent = t[1]; $('#tip').classList.add('show'); }

// ------------------------------------------------------------------ dialogs: one question at a time
const DL = {};
function step(o) {
  const L = o.layer || 'dialog'; DL[L] = o;
  const el = $('#' + L);
  el.innerHTML = `<div class="box">${o.n ? `<div class="stepn">Step ${o.n}${o.total ? ' of ' + o.total : ''}</div>` : ''}<h2>${esc(o.title)}${o.tip ? ii(o.tip) : ''}</h2>
    <div class="boxbody">${o.text ? `<p>${o.text}</p>` : ''}${o.html || ''}<div class="opts">${(o.opts || []).map((x, i) =>
      `<button class="hex full ${x[2] || ''}" data-pick="${i}" ${x[3] ? 'disabled' : ''}><span>${esc(x[0])}</span></button>`).join('')}</div></div>
    <div class="boxbtns">${o.back ? hx('Back', 'dl-back') : '<span></span>'}${o.cancel === false ? '' : hx(o.cancelLabel || 'Cancel', 'dl-close')}</div></div>`;
  el.style.display = 'flex';
  if (o.mount) o.mount(el);
}
function closeBox(L = 'dialog') { const el = $('#' + L); el.style.display = 'none'; el.innerHTML = ''; delete DL[L]; }
function closeAllBoxes() { closeBox('dialog'); closeBox('dialog2'); }
function message(title, text, layer) { step({ title, text, layer, cancel: false, opts: [['OK', () => closeBox(layer || 'dialog')]] }); }
function busy(title, text) { step({ title, text, cancel: false, opts: [] }); }
function ask(title, text, opts, layer = 'dialog2') { return new Promise((res) => step({ layer, title, text, opts: opts.map((o, i) => [o, () => { closeBox(layer); res(i); }]), onCancel: () => res(-1) })); }

// ------------------------------------------------------------------ screens
function render() {
  const app = $('#app');
  if (ui.screen === 0) app.innerHTML = welcome();
  else if (ui.screen === 1) app.innerHTML = mixScreen();
  else if (ui.screen === 2) app.innerHTML = trackScreen();
  else if (ui.screen === 3) { app.innerHTML = drumScreen(); drumsAfter(); }
  else if (ui.screen === 6) app.innerHTML = modeScreen();
  else if (ui.screen === 4) app.innerHTML = masterScreen();
  else if (ui.screen === 5) { app.innerHTML = editScreen(); mountTrackEditor(); }
  updateLive();
}

function welcome() {
  let body;
  if (ui.welcome === 0) body = `<p>Record ideas on a phone or computer. Twelve tracks, with amps, pedals and effects built in.</p>${hx('Start', 'w-start', 'on full')}`;
  else if (ui.welcome === 1) body = `<p>Conceptor needs the microphone to record.</p>
      ${ui.micAsked && !ui.micOk ? '<p class="dim">The microphone was not allowed. Playback and mixing still work. Recording does not.</p>' : ''}
      ${ui.micOk ? hx('Next', 'w-next', 'on full') : hx('Allow the microphone', 'w-mic', 'on full') + hx('Carry on without it', 'w-next', 'full')}`;
  else body = `<p>Name the first song. Leave it as it is to name it later.</p><input id="firstName" class="text" value="${esc('Untitled - ' + CZ.today())}">${hx('Create the song', 'w-create', 'on full')}`;
  return `<div class="welcome"><img src="art.jpg" alt=""><h1>CONCEPTOR</h1>${body}</div>`;
}

function topMain() {
  return `<div class="top"><span class="brand">CONCEPTOR</span>
    <span class="songname" data-act="rename-song"><span>${esc(S.song.name)}</span></span><button class="modetag ${S.polished() ? 'p' : ''}" data-act="m-mode">${S.polished() ? 'POLISHED' : 'DEMO'}</button>${ii('songname')}
    <span class="lbl">${hx('Menu', 'menu', 'sm')}${ii('menu')}</span></div>`;
}
function topBack(title, k) { return `<div class="top">${homeBtn()}<span class="title">${title}</span>${k ? ii(k) : '<span class="sp"></span>'}</div>`; }

function menuHtml() {
  const pol = S.polished();
  const items = [['New song', 'm-new'], ['Library', 'lib', 'lib'], ['Mode: ' + (pol ? 'Polished' : 'Demo'), 'm-mode', 'mode'], ['Edit Mode', 'go-edit', 'edit'], ['Ultrasound Machine', 'um', 'um'],
    ['Export', 'export', 'export'], ['Drum programmer', 'go-drums', 'drums'], ['Mastering', 'go-master', 'mastering', !pol], ['Tempo, click and loop', 'm-tempo', 'tempo'],
    ['Input and output', 'm-io', 'io'], ['Save now', 'm-save'], ['Undo last take', 'm-undo', 'undo'], ['Help', 'm-help']];
  return `<div class="menuback" data-act="menu"></div><div class="menu">${items.map(([l, a, k, off]) => `<div class="hx ${off ? 'off' : ''}" data-act="${off ? 'polished-only' : a}"><span class="lbl">${l}${k ? ii(k) : ''}</span>${off ? '<small>Polished only</small>' : ''}</div>`).join('')}
    <div class="hx" data-act="hh"><span class="lbl">Hand Hold${ii('hh')}</span><span class="toggle ${handHold() ? 'on' : ''}"><i></i></span></div></div>`;
}

// ------------------------------------------------------------------ Demo Mode and Polished Mode
const MODE_TEXT = {
  demo: 'Simple recording and arranging for capturing ideas quickly. No mastering section; export includes trim only.',
  polished: 'Full feature set, including the mastering section. For tracks being prepared for release.' };
function modeScreen() {
  const c = (m, t) => `<button class="modecard ${ui.pickMode === m ? 'sel' : ''}" data-act="pick-${m}" aria-pressed="${ui.pickMode === m}"><h3><span class="radio"></span>${t}</h3><p>${MODE_TEXT[m]}</p></button>`;
  return `<div class="top"><span class="brand">CONCEPTOR</span><span class="songname">${esc(S.song.name)}</span>${ii('mode')}</div><div class="scroll">
    <div class="section">CHOOSE A MODE</div>${c('demo', 'Demo Mode')}${c('polished', 'Polished Mode')}
    <p class="dim small">The mode can be changed later in the Menu.</p>${hx('Open song', 'mode-open', 'on wide')}</div>`;
}
function askMode() { ui.pickMode = S.song.mode || 'demo'; ui.screen = 6; ui.menu = false; render(); }
function changeMode() {
  const s = S.song;
  step({ title: 'Mode', tip: 'mode', text: `<b>Demo Mode:</b> ${MODE_TEXT.demo}<br><br><b>Polished Mode:</b> ${MODE_TEXT.polished}`, opts: [
    ['Demo Mode', () => { s.mode = 'demo'; closeBox(); S.changed('mode'); render(); say('Demo Mode.'); }, s.mode === 'demo' ? 'on' : ''],
    ['Polished Mode', () => { s.mode = 'polished'; closeBox(); S.changed('mode'); render(); say('Polished Mode.'); }, s.mode === 'polished' ? 'on' : '']] });
}

function mixScreen() {
  const s = S.song;
  let h = topMain() + (ui.menu ? menuHtml() : '');
  h += `<div class="master"><span class="lbl mlbl">MASTER${ii('master')}</span><div class="grow">
        <input type="range" min="-60" max="6" step="0.1" value="${s.masterVol}" data-bind="masterVol" aria-label="Master volume">
        <div class="meters"><div class="lv"><i id="mL"></i></div><div class="lv"><i id="mR"></i></div></div></div>
        <b data-show="masterVol">${dbText(s.masterVol, -60)}</b></div>
      <div class="tracks"><div class="section">TRACKS ${ii('tracks')}</div>`;
  for (let i = 0; i < s.shown; i++) {
    const t = s.tracks[i], c = COLOURS[i];
    const len = t.audio ? fmt(t.audio.length / S.sr) : 'empty';
    h += `<div class="trk"><i class="strip" style="background:${c}"></i><div class="grow">
          <div class="row"><span class="name" data-act="open-${i}">${esc(t.name)}</span><small>${len}</small></div>
          <input type="range" min="-60" max="6" step="0.1" value="${t.vol}" data-bind="t${i}.vol" style="accent-color:${c}" aria-label="${esc(t.name)} volume">
          <div class="lv thin"><i id="m${i}" style="background:${c}"></i></div></div>
          <div class="keys">${hx('R', 'arm-' + i, 'mid ' + (t.arm ? 'red on' : ''))}${hx('M', 'mute-' + i, 'mid ' + (t.mute ? 'on' : ''))}${hx('S', 'solo-' + i, 'mid ' + (t.solo ? 'good on' : ''))}${hx('FX', 'open-' + i, 'mid')}${hx('&#8943;', 'tmenu-' + i, 'mid', 'aria-label="More for this track"')}</div></div>`;
  }
  h += `<div class="lbl center">${hx('Add track', 'add-track', '', s.shown >= 12 ? 'disabled' : '')}${ii('addtrack')}</div></div>`;
  h += `<div class="quick">${hx('Edit Mode', 'go-edit', 'sm')}${hx('Drums', 'go-drums', 'sm ' + (s.drums.comp.length ? 'on' : ''))}${S.polished() ? hx('Mastering', 'go-master', 'sm ' + (s.master.on ? 'on' : '')) : ''}${hx('Export', 'export', 'sm')}${hx('Library', 'lib', 'sm')}${hx('Player', 'um', 'sm')}${ii('shortcuts')}</div>`;
  return h + transport();
}

function transport() {
  const s = S.song, playOn = S.playing && !S.recording;
  return `<div class="transport"><div class="row center"><span id="time" class="time"></span><span class="bpm" data-act="m-tempo">${Math.round(s.bpm)} BPM</span>${ii('transport')}</div><div class="tbtns">
    ${hx('&#9198;', 'rew', 'mid', 'aria-label="Rewind"')}
    ${hx(playOn ? '&#9632;' : '&#9654;', 'play', 'big ' + (playOn ? 'on' : ''), 'aria-label="Play or stop"')}
    ${hx('&#9679;', 'rec', 'big red ' + (S.recording ? 'on' : ''), 'aria-label="Record"')}
    ${hx('&#10227;', 'loop', 'mid ' + (s.loop ? 'on' : ''), 'aria-label="Loop"')}
    ${hx('&#9650;', 'click', 'mid ' + (s.click ? 'on' : ''), 'aria-label="Click"')}</div></div>`;
}

function effectCard(t, u, fx) {
  const open = ui.open === u, vars = CZ.VARIANTS[u];
  let h = `<div class="fx"><div class="fxhead" data-act="fx-open-${u}"><div class="grow"><b class="${fx.on ? 'gold' : ''}">${CZ.UNITS[u]}</b>
      <small>${vars.length ? vars[fx.variant] : CZ.BLURB[u]}</small></div>${sw(fx.on, `fx-on-${t}-${u}`)}</div>`;
  if (open) {
    h += '<div class="fxbody">';
    if (vars.length) h += `<div class="pills">${vars.map((v, i) => hx(v, `fx-var-${t}-${u}-${i}`, 'sm ' + (i === fx.variant ? 'on' : ''))).join('')}</div>`;
    CZ.spec(u, fx.variant).forEach((k, i) => {
      h += `<div class="sl"><div class="row"><span>${k.name}</span><b data-show="k${t}.${u}.${i}">${CZ.knobText(k, fx.vals[i])}</b></div>
        <input type="range" min="0" max="1" step="0.001" value="${CZ.toFrac(k, fx.vals[i])}" data-bind="k${t}.${u}.${i}" aria-label="${k.name}"></div>`;
    });
    h += hx('Reset knobs', `fx-reset-${t}-${u}`, 'sm') + '</div>';
  }
  return h + '</div>';
}

function trackScreen() {
  const i = ui.track, t = S.song.tracks[i];
  let h = topBack('TRACK ' + (i + 1), 'track') + `<div class="scroll">
    <label class="fld">Name<input class="text" id="tname" value="${esc(t.name)}"></label>
    <div class="section">LEVELS ${ii('levels')}</div>
    ${slider('Input gain', t.trim, -12, 24, 0.1, `t${i}.trim`, t.trim.toFixed(1) + ' dB')}
    ${slider('Volume', t.vol, -60, 6, 0.1, `t${i}.vol`, dbText(t.vol, -60))}
    ${slider('Pan', t.pan, -1, 1, 0.01, `t${i}.pan`, panText(t.pan))}
    <div class="row gap">${hx('Import Audio', 'import-' + i, 'sm')}${hx('Edit in Edit Mode', 'edit-' + i, 'sm', t.audio ? '' : 'disabled')}${hx('Clear this track', 'clear', 'sm')}${ii('importaudio')}</div>
    <div class="section">EFFECTS, IN THE ORDER THE SOUND PASSES THROUGH THEM ${ii('effects')}</div>`;
  t.fx.forEach((fx, u) => { h += effectCard(i, u, fx); });
  return h + '</div>' + transport();
}

function masterScreen() {
  const m = S.song.master;
  return `${topBack('MASTERING', 'mastering')}<div class="scroll">
    <div class="row line"><span>Mastering on</span>${sw(m.on, 'master-on')}</div>
    <p class="dim small">Works on the whole mix, in this order: EQ, compressor, limiter. It is heard when playing and is included when the mix is exported.</p>
    <div class="section">EQ AND COMPRESSOR</div>${effectCard(-1, 4, m.eq)}${effectCard(-1, 1, m.comp)}
    <div class="section">LIMITER ${ii('limiter')}</div>
    ${slider('Loudness', m.gain, 0, 12, 0.1, 'master.gain', m.gain.toFixed(1) + ' dB')}
    ${slider('Ceiling', m.ceiling, -6, 0, 0.1, 'master.ceiling', m.ceiling.toFixed(1) + ' dB')}
    <p class="dim small">Limiting now: <span id="limiting">0.0 dB</span></p></div>${transport()}`;
}

// ------------------------------------------------------------------ Edit Mode
function editScreen() {
  const s = S.song; ui.sel = Math.max(0, Math.min(s.shown - 1, ui.sel));
  let h = topBack('EDIT MODE', 'edit') + `<div class="scroll"><div class="section">SELECT A TRACK</div>`;
  for (let i = 0; i < s.shown; i++) {
    const t = s.tracks[i];
    h += `<div class="trk click ${i === ui.sel ? 'sel' : ''}" data-act="esel-${i}"><i class="strip" style="background:${COLOURS[i]}"></i><span class="name grow">${esc(t.name)}</span><small>${t.audio ? fmt(t.audio.length / S.sr) : 'empty'}</small></div>`;
  }
  const t = s.tracks[ui.sel];
  h += `<div class="section">${esc(t.name).toUpperCase()}</div>`;
  h += t.audio ? '<div class="ed" id="trackEd"></div>' : `<p class="dim">This track is empty. Record or import audio first.</p><div class="row gap">${hx('Import Audio', 'import-' + ui.sel, 'sm')}</div>`;
  return h + `</div><div class="quick">${hx('Done', 'home')}</div>`;
}
function editorOpts(extra) {
  return Object.assign({ sr: S.sr, say,
    askLength: async (sec) => { const L = [0.5, 1, 2, 5]; const k = await ask('Insert Silence', `Length of silence at ${sec < 10 ? sec.toFixed(2) + ' s' : fmt(sec)}?`, ['0.5 seconds', '1 second', '2 seconds', '5 seconds']); return k < 0 ? null : L[k]; } }, extra);
}
function mountTrackEditor() {
  const el = $('#trackEd'); if (!el) return;
  const i = ui.sel, t = S.song.tracks[i];
  const clip = { ch: [t.audio], fi: t.fi, fo: t.fo };
  ui.editor = new WaveEditor(el, clip, editorOpts({ key: t, tools: ['trim', 'sil', 'fi', 'fo', 'drop'],
    onChange: (c) => { t.audio = c.ch[0]; t.fi = c.fi; t.fo = c.fo; S.undo = null; S.changed('edit'); },
    dropIn: (a, b) => new Promise(async (res) => { const r = await S.recordDropIn(i, a, b, (take) => res(take)); if (r === 'nomic') { say('Recording needs the microphone. Allow it in the browser settings for this page.'); res(null); } }),
    previewDrop: (from, to, audio, onEnd) => S.playRange(from, to, { i, audio: CZ.faded(audio, t.fi, t.fo, S.sr) }, onEnd) }));
}

// ------------------------------------------------------------------ track menu, rename, copy, import
function trackMenu(i) {
  const t = S.song.tracks[i];
  step({ title: t.name, text: t.audio ? `Length ${fmt(t.audio.length / S.sr)}.` : 'This track is empty.', opts: [
    ['Import Audio', () => { closeBox(); pickFile((f) => doImport(i, f)); }],
    ['Edit in Edit Mode', () => { closeBox(); ui.sel = i; go(5); }, '', !t.audio],
    ['Copy To Song…', () => copyFlow(S.song.name, i), '', !t.audio],
    ['Rename track', () => renameTrack(i)]] });
}
function pickFile(cb, multiple = false) {
  const f = $('#file'); f.value = ''; f.multiple = multiple;
  f.onchange = () => { if (f.files.length) cb(multiple ? [...f.files] : f.files[0]); };
  f.click();
}
async function doImport(i, file) {
  busy('Importing', 'Reading the file. This takes a few seconds.');
  const r = await S.importFile(i, file);
  closeBox(); render();
  if (r === 'bad') say('This file could not be read. Try an MP3, WAV or M4A file.');
  else say(r === 'cut' ? 'Imported. The file was longer than 4 minutes, so the end was cut off.' : 'Imported. Select the track in Edit Mode to edit it.');
}
function renameTrack(i) {
  const t = S.song.tracks[i];
  step({ title: 'Rename track', html: `<input id="rn" class="text" value="${esc(t.name)}">`,
    opts: [['Save', () => { t.name = $('#rn').value.trim() || 'Track ' + (i + 1); closeBox(); S.changed(); render(); }]] });
  setTimeout(() => $('#rn') && $('#rn').select(), 30);
}
function renameSongFlow(name) {
  step({ title: 'Rename song', text: 'Leave it empty to use "Untitled" and the date.', html: `<input id="rn" class="text" value="${esc(name)}">`,
    opts: [['Save', async () => { const n = await S.renameSong(name, $('#rn').value); closeBox(); render(); if (ui.pop === 'lib') { if (lib.folder === name) lib.folder = n; drawLib(); } }]] });
  setTimeout(() => $('#rn') && $('#rn').select(), 30);
}
async function copyFlow(fromName, ti) {
  const names = (await S.songNames()).filter((n) => n !== fromName);
  const from = fromName === S.song.name ? S.song : await S.getSong(fromName);
  const opts = names.map((n) => [n + (n === S.song.name ? ' (open)' : ''), () => doCopy(fromName, ti, n)]);
  opts.push(['New song', async () => doCopy(fromName, ti, await S.newSong(null, false))]);
  step({ title: 'Copy To Song', text: `Copy "${esc(from.tracks[ti].name)}" to which song? The original stays where it is.`, opts });
}
async function doCopy(fromName, ti, to) {
  const r = await S.copyTrack(fromName, ti, to);
  if (r === 'full') { message('Copy To Song', `${esc(to)} already has 12 tracks in use.`); return; }
  closeBox(); render(); if (ui.pop === 'lib') drawLib();
  say(`Copied "${r}" to ${to}.`);
}

// ------------------------------------------------------------------ export (one question at a time)
let ex = null;
function exportFlow() {
  const s = S.song; ex = { clip: null };
  if (S.exportLength(-1) <= 0) { message('Export', 'This song has no audio yet.'); return; }
  if (!S.polished()) { exTrim(); return; }
  step({ title: 'Export', n: 1, total: 4, tip: 'export', text: 'Export what?', opts: [['Exported Mix (whole song)', exMix], ['Individual Tracks', exTracks, '', !s.tracks.some((t) => t.audio)]] });
}
async function exRender() {
  if (ex.clip) return;
  busy('Export', 'Making the mix. This takes a few seconds.');
  const r = await S.renderMixChannels(false);   // mastering is chosen later (Polished) or not used (Demo)
  ex.clip = { ch: r.channels, fi: 0, fo: 0 };
}
// Demo export, step 1: trim the start and end over the wave
async function exTrim() {
  await exRender();
  const sr = S.sr, L = ex.clip.ch[0].length / sr;
  if (ex.a == null) { ex.a = 0; ex.b = L; }
  step({ title: 'Export', n: 1, total: 2, tip: 'demoexport', text: 'Trim the start and the end. Leave them to keep everything.',
    html: `<canvas id="trimWave" width="1360" height="160"></canvas>
      ${slider('Start', ex.a, 0, L, 0.1, 'ex.a', fmt(ex.a))}${slider('End', ex.b, 0, L, 0.1, 'ex.b', fmt(ex.b))}
      <div class="row gap">${hx('&#9654; Play', 'ex-trimplay')}</div>`,
    opts: [['Next', () => { S.stopListen(); exFormat('demo'); }]], onCancel: () => S.stopListen(), mount: drawTrimWave });
}
function drawTrimWave() {
  const c = $('#trimWave'); if (!c) return;
  const g = c.getContext('2d'), W = c.width, H = c.height, ch = ex.clip.ch, n = ch[0].length, pk = CZ.peaks(ch, Math.max(1, Math.floor(n / (W / 2)))), sr = S.sr;
  g.fillStyle = '#1C1D21'; g.fillRect(0, 0, W, H);
  for (let x = 0; x < W; x += 2) { const v = pk[Math.min(pk.length - 1, Math.floor(x / W * pk.length))] || 0, bh = Math.max(2, v * H * 0.9); g.fillStyle = '#E8C872'; g.fillRect(x, (H - bh) / 2, 1.6, bh); }
  g.fillStyle = 'rgba(0,0,0,.65)'; g.fillRect(0, 0, ex.a * sr / n * W, H); g.fillRect(ex.b * sr / n * W, 0, W, H);
}
async function exMix() {
  await exRender();
  step({ title: 'Export mix', n: 2, total: 4, tip: 'exedit', text: 'Edit the mix if needed: trim, insert silence or fade. Then press Next.',
    html: '<div class="ed" id="mixEd"></div>', opts: [['Next', () => { S.stopListen(); exMaster(); }]], back: () => { S.stopListen(); exportFlow(); },
    mount: () => new WaveEditor($('#mixEd'), ex.clip, editorOpts({ key: ex, tools: ['trim', 'sil', 'fi', 'fo'], onChange: () => {} })) });
}
function exMaster() {
  step({ title: 'Export', n: 3, total: 4, tip: 'masterchoice', text: 'Use the mastering settings on this export?', back: exMix,
    opts: [['Yes, with mastering', () => { ex.mastering = true; exFormat('mix'); }], ['No, without mastering', () => { ex.mastering = false; exFormat('mix'); }]] });
}
function exTracks() { step({ title: 'Export tracks', n: 2, total: 3, text: 'Raw tracks, or with their effects?', opts: [['Raw', () => exFormat('raw')], ['With effects', () => exFormat('fx')]], back: exportFlow }); }
function exFormat(kind) {
  const demo = kind === 'demo';
  step({ title: 'Export', n: demo ? 2 : kind === 'mix' ? 4 : 3, total: demo ? 2 : kind === 'mix' ? 4 : 3, text: 'Format?',
    opts: [['WAV', () => exConfirm(kind, 'WAV')], ['MP3 320k', () => exConfirm(kind, 'MP3 320k')]], back: demo ? exTrim : kind === 'mix' ? exMaster : exTracks });
}
function exConfirm(kind, f) {
  const s = S.song, n = s.tracks.filter((t) => t.audio).length;
  const what = kind === 'mix' || kind === 'demo' ? `"${s.name} – Exported Mix"` : `${plural(n, 'track')} (${kind === 'raw' ? 'raw' : 'with effects'})`;
  step({ title: 'Export', text: `Saves ${esc(what)} as ${f} in the Library, in the folder "${esc(s.name)}".`, opts: [['Save', () => exDone(kind, f)]], back: () => exFormat(kind) });
}
async function exDone(kind, f) {
  const s = S.song, sr = S.sr, mp3 = f === 'MP3 320k';
  busy('Export', 'Saving. This takes a few seconds.');
  let saved = [];
  if (kind === 'mix' || kind === 'demo') {
    let ch = ex.clip.ch.map((c) => CZ.faded(c, ex.clip.fi, ex.clip.fo, sr));
    if (kind === 'demo') { const a = Math.round(ex.a * sr), b = Math.round(ex.b * sr); ch = ch.map((c) => c.slice(a, b)); const f = Math.min(ch[0].length, Math.round(sr / 200)); for (const c of ch) for (let i = 0; i < f; i++) { c[i] *= i / f; c[c.length - 1 - i] *= i / f; } }
    if (kind === 'mix' && ex.mastering) ch = await S.masterProcess(ch);
    const blob = mp3 ? CZ.encodeMp3(ch, sr) : CZ.encodeWav(ch, sr);
    saved.push(await S.addExport('mix', s.name + ' – Exported Mix', f, blob, ch[0].length / sr));
    ex = null;
  } else {
    for (let i = 0; i < s.tracks.length; i++) {
      const t = s.tracks[i]; if (!t.audio) continue;
      const r = await S.exportFile({ track: i, withFx: kind === 'fx', format: mp3 ? 1 : 0, start: 0, end: 0 });
      saved.push(await S.addExport('track', `${t.name} (${kind === 'raw' ? 'raw' : 'with effects'})`, f, r.blob, 0));
    }
  }
  const one = saved[0];
  if (kind === 'demo') kind = 'mix';
  step({ title: 'Saved', text: `${esc(kind === 'mix' ? one.name : plural(saved.length, 'track'))} ${kind === 'mix' ? 'is' : 'are'} in the Library.`, cancel: false, opts: [
    ['Open Library', () => { closeBox(); openLib(s.name); }],
    ...(kind === 'mix' ? [['Play in Ultrasound Machine', () => { closeBox(); openUM('final', one.id); }]] : []),
    [kind === 'mix' ? 'Save a copy to this device' : 'Save copies to this device', async () => { for (const e of saved) await toDevice(e.blob, fileName(e)); }],
    ['Close', () => closeBox()]] });
}
const fileName = (e) => CZ.cleanFile(e.name) + (e.fmt === 'MP3 320k' ? '.mp3' : '.wav');
function downloadBlob(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
}
async function toDevice(blob, name) {
  if (isPhone() && navigator.canShare) { const file = new File([blob], name, { type: blob.type }); if (navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file] }); return; } catch (e) { if (e.name === 'AbortError') return; } } }
  downloadBlob(blob, name); say('Saved ' + name + ' to Downloads.');
}

// ------------------------------------------------------------------ pop-ups: Library, Ultrasound Machine, Edit Sound
function showPop(kind, title, tipKey, closeLabel, closeAct) {
  ui.pop = kind; ui.menu = false;
  $('#pop').innerHTML = `<div class="sheet"><div class="top"><span class="title left">${title}</span>${ii(tipKey)}${hx(closeLabel, closeAct, 'sm')}${homeBtn()}</div><div class="body" id="popBody"></div><div class="actions" id="popActions"></div></div>`;
  $('#pop').style.display = 'block';
}
function hidePop() { ui.pop = null; $('#pop').style.display = 'none'; $('#pop').innerHTML = ''; }

const lib = { folder: null };
async function openLib(folder = null) { if (S.song) await S.saveNow(); lib.folder = folder; showPop('lib', 'LIBRARY', 'lib', 'Close Library', 'lib-close'); drawLib(); }
function locText() { return localStorage.getItem('cz.libLoc') === 'folder' && S.folder ? 'In this browser, and in the folder "' + S.folder.name + '"' : 'In this browser on this device'; }
async function drawLib() {
  const B = $('#popBody'), A = $('#popActions'); if (!B) return;
  const all = (await S.allSongs()).sort((a, b) => (b.saved || 0) - (a.saved || 0));
  if (!lib.folder || !all.some((s) => s.name === lib.folder)) {
    lib.folder = null;
    const last = localStorage.getItem('cz.lastSync');
    B.innerHTML = `<div class="loc"><span>Saved: <b>${esc(locText())}</b>${last ? `<br>Last synced: ${esc(last)}` : '<br>Not synced yet'}</span>${ii('libloc')}</div><div class="section">SONGS</div>` +
      all.map((s) => `<div class="row click" data-act="lf" data-name="${esc(s.name)}"><div class="grow">${esc(s.name)}<div class="sub">Saved ${dateOf(s.saved)} · ${plural(s.tracks.filter((t) => t.audio).length, 'track')} · ${plural((s.exports || []).filter((e) => e.kind === 'mix').length, 'mix', 'mixes')}</div></div>${s.name === S.song.name ? '<span class="tag">OPEN</span>' : ''}<span class="dim">&#8250;</span></div>`).join('');
    A.innerHTML = hx('Library Location', 'lib-loc', 'sm') + hx('Sync Library', 'lib-sync', 'sm') + ii('sync');
    return;
  }
  const s = Studio.fill(all.find((x) => x.name === lib.folder)), open = s.name === S.song.name;
  const mixes = s.exports.filter((e) => e.kind === 'mix'), extr = s.exports.filter((e) => e.kind === 'track');
  let h = `<div class="row plain">${hx('&#8249; All songs', 'lib-all', 'sm')}${open ? '<span class="tag">OPEN</span>' : ''}${ii('folder')}</div>
    <div class="fname">${esc(s.name)}</div><div class="dim">Saved ${dateOf(s.saved)}</div>`;
  h += '<div class="section">EXPORTED MIXES</div>' + (mixes.length ? mixes.map((m) => `<div class="row"><div class="grow">${esc(m.name)}<div class="sub">${m.fmt} · ${m.date}${m.len ? ' · ' + fmt(m.len) : ''}</div></div>${hx('Play', 'lplay-' + m.id, 'sm')}</div>`).join('') : '<p class="dim">None yet.</p>');
  if (extr.length) h += '<div class="section">EXPORTED TRACKS</div>' + extr.map((m) => `<div class="row"><div class="grow">${esc(m.name)}<div class="sub">${m.fmt} · ${m.date}</div></div>${hx('Save to device', 'ldev-' + m.id, 'sm')}</div>`).join('');
  h += '<div class="section">TRACKS</div>' + (s.tracks.some((t) => t.audio) ? s.tracks.map((t, k) => t.audio ? `<div class="row"><div class="grow">${esc(t.name)}<div class="sub">${fmt(t.audio.length / (s.rate || S.sr))}</div></div>${hx('Copy To Song…', 'lcopy-' + k, 'sm')}</div>` : '').join('') : '<p class="dim">No audio yet.</p>');
  B.innerHTML = h;
  A.innerHTML = (open ? '' : hx('Open Song', 'lopen', 'sm')) + hx('Rename', 'lrename', 'sm') + hx('Delete', 'ldelete', 'sm red');
}
function dateOf(t) { const d = new Date(t || Date.now()); return d.getDate() + ' ' + CZ.MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }
async function findExport(id) { for (const s of await S.allSongs()) for (const e of s.exports || []) if (e.id === id) return { song: s, e }; return null; }

function deleteFlow(name) {
  if (name === S.song.name) { message('Delete', 'Close this song before deleting it.'); return; }
  step({ title: 'Delete this song?', text: 'Export or copy anything you want to keep first. This cannot be undone.',
    opts: [['Delete', async () => { await S.remove(name); if (S.folderOn()) S.removeFolderSong(name).catch(() => {}); closeBox(); lib.folder = null; drawLib(); say(name + ' deleted.'); }, 'red']] });
}
function locationFlow() {
  const can = S.folderSupported();
  step({ title: 'Library Location', n: 1, text: `Now: ${esc(locText())}. Where should the Library be kept?`, opts: [
    ['In this browser on this device', () => { localStorage.setItem('cz.libLoc', 'browser'); closeBox(); drawLib(); say('Library is kept in this browser.'); }],
    ['Also in a synced folder (OneDrive or Google Drive)', locFolder, '', !can]],
    html: can ? '' : '<p class="dim small">A synced folder needs Chrome or Edge on a computer. On phones and tablets the Library stays on the device. Use Export to keep copies.</p>' });
}
function locFolder() {
  step({ title: 'Library Location', n: 2, total: 2, back: locationFlow,
    text: 'Choose the OneDrive or Google Drive folder on this computer. Conceptor makes a folder called "Conceptor Library" inside it. That app keeps it in sync with the cloud.',
    opts: [['Choose folder', async () => {
      try { await S.pickFolder(); } catch (e) { return; }
      if (!(await S.folderAllowed(true))) { message('Library Location', 'Conceptor was not allowed to use that folder.'); return; }
      localStorage.setItem('cz.libLoc', 'folder'); closeBox(); drawLib(); say('Library is also kept in ' + S.folder.name + '. Press Sync Library to copy everything there now.');
    }]] });
}
function syncFlow() {
  step({ title: 'Sync Library', n: 1, text: 'Sync with what?', opts: [
    ['A synced folder (OneDrive or Google Drive)', syncFolder, '', !S.folderSupported()],
    ['Computer (Honey Trap): not available yet', () => {}, '', true],
    ['Computer (Lt. Joe Bookman): not available yet', () => {}, '', true]],
    html: S.folderSupported() ? '' : '<p class="dim small">Syncing needs Chrome or Edge on a computer.</p>' });
}
async function syncFolder() {
  if (!S.folder) await S.restoreFolder();
  if (!S.folder) {
    step({ title: 'Sync Library', n: 2, total: 3, back: syncFlow, text: 'Choose the OneDrive or Google Drive folder on this computer.', opts: [['Choose folder', async () => {
      try { await S.pickFolder(); } catch (e) { return; } localStorage.setItem('cz.libLoc', 'folder'); syncFolder(); }]] });
    return;
  }
  if (!(await S.folderAllowed(true))) { message('Sync Library', 'Conceptor was not allowed to use the folder "' + esc(S.folder.name) + '".'); return; }
  const there = await S.folderSongs();
  const go2 = async () => {
    busy('Syncing', 'Copying songs, tracks and mixes.');
    try { const r = await S.syncFolder((t) => { const p = $('#dialog p'); if (p) p.textContent = t; }); closeBox(); drawLib(); say(`Library synced. ${plural(r.brought, 'song')} brought in, ${plural(r.sent, 'song')} saved to the folder.`); }
    catch (e) { console.error(e); message('Sync Library', 'The sync did not finish. Check the folder is still there, then try again.'); }
  };
  if (there.length) step({ title: 'Library found', n: 3, total: 3, back: syncFlow, text: `"${esc(S.folder.name)}" already has a Conceptor Library with ${plural(there.length, 'song')}. Combine it with the Library here? Nothing is deleted. If both have a song with the same name and different content, both copies are kept.`, opts: [['Combine and sync', go2]] });
  else step({ title: 'Sync Library', n: 3, total: 3, back: syncFlow, text: `Copies every song to "${esc(S.folder.name)}/Conceptor Library".`, opts: [['Start sync', go2]] });
}

// Ultrasound Machine
const um = { tab: 'working', sel: 0, items: [], buf: null, pos: 0, playing: false, loop: false, src: null, at: 0, gain: null, vol: 0.8, key: null };
async function openUM(tab = 'working', selId = null) {
  if (S.playing) S.stop(); S.stopListen();
  um.tab = tab; um.selId = selId;
  showPop('um', 'ULTRASOUND MACHINE', 'um', 'Close', 'um-close');
  $('#popBody').innerHTML = `<div class="tabs">${hx('Working Mixes', 'umtab-working', 'sm')}${hx('Final Mixes', 'umtab-final', 'sm')}${ii('tabs')}</div>
    <div class="list" id="umList"></div><div class="now"><div class="t" id="umT"></div><div class="s" id="umS"></div>
    <canvas id="umWave" width="1360" height="200"></canvas>
    <div class="skip">${hx('&#8630; 10 s', 'um-b10', 'sm')}<span><span id="umPos">0:00</span> / <span id="umLen">0:00</span></span><span class="lbl">${ii('skip')}${hx('10 s &#8631;', 'um-f10', 'sm')}</span></div></div>
    <div class="tbtns">${hx('&#9198;', 'um-prev', 'mid', 'aria-label="Previous"')}${hx('&#9632;', 'um-stop', 'mid', 'aria-label="Stop"')}${hx('&#9654;', 'um-play', 'big', 'id="umPlay" aria-label="Play or pause"')}${hx('&#8635;', 'um-loop', 'mid', 'id="umLoop" aria-label="Loop"')}${hx('&#9197;', 'um-next', 'mid', 'aria-label="Next"')}</div>
    <div class="vol"><span>Volume</span><input type="range" min="0" max="1" step="0.01" value="${um.vol}" id="umVol" aria-label="Playback volume">${ii('loop')}</div>`;
  $('#popActions').innerHTML = hx('Export', 'um-export', 'sm') + hx('Share', 'um-share', 'sm') + hx('Open Library', 'um-lib', 'sm') + ii('umactions');
  $('#umVol').oninput = (e) => { um.vol = +e.target.value; if (um.gain) um.gain.gain.value = um.vol; };
  $('#umWave').onclick = (e) => { if (!um.buf) return; const r = e.target.getBoundingClientRect(); umSeek((e.clientX - r.left) / r.width * um.buf.duration); };
  await umList();
}
async function umList() {
  const all = (await S.allSongs()).sort((a, b) => (b.saved || 0) - (a.saved || 0));
  um.items = um.tab === 'working' ? all.map((s) => ({ kind: 'work', name: s.name, sub: 'Working mix · saved ' + dateOf(s.saved), song: s.name }))
    : all.flatMap((s) => (s.exports || []).filter((e) => e.kind === 'mix').map((e) => ({ kind: 'final', name: e.name, sub: `Final mix · ${e.fmt} · ${e.date}`, id: e.id, song: s.name, fmt: e.fmt, blob: e.blob })));
  um.sel = um.selId ? Math.max(0, um.items.findIndex((x) => x.id === um.selId)) : (um.tab === 'working' ? Math.max(0, um.items.findIndex((x) => x.song === S.song.name)) : 0);
  um.selId = null;
  document.querySelectorAll('[data-act^="umtab-"]').forEach((b) => b.classList.toggle('on', b.dataset.act === 'umtab-' + um.tab));
  $('#umList').innerHTML = um.items.length ? um.items.map((m, i) => `<div class="row click ${i === um.sel ? 'sel' : ''}" data-act="umsel-${i}"><div class="grow">${esc(m.name)}</div></div>`).join('')
    : '<p class="dim">No final mixes yet. Export a mix first.</p>';
  await umLoad();
}
async function umLoad() {
  umPause(); um.pos = 0; um.buf = null;
  document.querySelectorAll('#umList .row').forEach((r, i) => r.classList.toggle('sel', i === um.sel));
  const m = um.items[um.sel];
  $('#umT').textContent = m ? m.name : ''; $('#umS').textContent = m ? m.sub : '';
  umDraw(); if (!m) return;
  const key = m.kind + ':' + (m.id || m.song); um.key = key;
  $('#umS').textContent = m.sub + ' · loading';
  let buf = null;
  try {
    await S.startAudio();
    if (m.kind === 'final') buf = await S.ctx.decodeAudioData(await m.blob.arrayBuffer());
    else {
      const song = m.song === S.song.name ? S.song : await S.getSong(m.song);
      if (CZ.songLength(song) > 0 || song.drums.comp.length) {
        const keep = S.song; S.song = song;
        try { const r = await S.renderMixChannels(); buf = S.ctx.createBuffer(2, r.channels[0].length, S.sr); r.channels.forEach((c, k) => buf.getChannelData(k).set(c)); } finally { S.song = keep; }
      }
    }
  } catch (e) { console.error(e); }
  if (um.key !== key) return;
  um.buf = buf; um.peaks = buf ? CZ.peaks([buf.getChannelData(0), buf.getChannelData(1)], Math.max(1, Math.floor(buf.length / 680))) : null;
  $('#umS').textContent = m.sub + (buf ? '' : ' · no audio yet');
  umDraw();
}
function umNow() { return um.playing ? Math.min(um.buf.duration, um.pos + S.ctx.currentTime - um.at) : um.pos; }
function umDraw() {
  const c = $('#umWave'); if (!c) return;
  const g = c.getContext('2d'), W = c.width, H = c.height;
  g.fillStyle = '#1C1D21'; g.fillRect(0, 0, W, H);
  if (!um.buf) { $('#umPos').textContent = '0:00'; $('#umLen').textContent = '0:00'; return; }
  const len = um.buf.duration, t = umNow(), cut = t / len * W, N = um.peaks.length;
  for (let x = 0; x < W; x += 2) { const v = um.peaks[Math.min(N - 1, Math.floor(x / W * N))] || 0, bh = Math.max(2, v * H * 0.9); g.fillStyle = x < cut ? '#E8C872' : '#4a4b52'; g.fillRect(x, (H - bh) / 2, 1.6, bh); }
  g.fillStyle = '#ECEBE6'; g.fillRect(cut - 2, 0, 4, H);
  $('#umPos').textContent = fmt(t).replace(/\.\d$/, ''); $('#umLen').textContent = fmt(len).replace(/\.\d$/, '');
}
function umPlay() {
  if (!um.buf) { say('Nothing to play.'); return; }
  if (um.playing) { umPause(); return; }
  if (um.pos >= um.buf.duration - 0.05) um.pos = 0;
  const src = S.ctx.createBufferSource(); src.buffer = um.buf;
  um.gain = S.ctx.createGain(); um.gain.gain.value = um.vol; src.connect(um.gain); um.gain.connect(S.ctx.destination);
  um.at = S.ctx.currentTime + 0.02; src.start(um.at, um.pos); um.src = src; um.playing = true;
  src.onended = () => { if (um.src !== src) return; um.playing = false; um.src = null; if (um.loop) { um.pos = 0; umPlay(); } else { um.pos = um.buf.duration; umIcons(); umDraw(); } };
  umIcons();
}
function umPause() { if (um.playing) { um.pos = umNow(); um.playing = false; const s = um.src; um.src = null; try { s.stop(); } catch (e) {} } umIcons(); }
function umStop() { umPause(); um.pos = 0; umDraw(); }
function umSeek(t) { const was = um.playing; umPause(); um.pos = Math.max(0, Math.min(um.buf ? um.buf.duration : 0, t)); if (was) umPlay(); umDraw(); }
function umIcons() { const b = $('#umPlay'); if (!b) return; b.classList.toggle('on', um.playing); b.querySelector('span').innerHTML = um.playing ? '&#10074;&#10074;' : '&#9654;'; }
function umCur() { return um.items[um.sel]; }
function umExport() {
  const m = umCur(); if (!m || !um.buf) return;
  step({ title: 'Export', n: 1, total: 2, text: `Format for "${esc(m.name)}"?`, opts: [['WAV', () => umWhere('WAV')], ['MP3 320k', () => umWhere('MP3 320k')]] });
}
async function umBlob(f) {
  const m = umCur();
  if (m.kind === 'final' && m.fmt === f) return m.blob;
  const ch = [um.buf.getChannelData(0), um.buf.getChannelData(1)];
  return f === 'MP3 320k' ? CZ.encodeMp3(ch, um.buf.sampleRate) : CZ.encodeWav(ch, um.buf.sampleRate);
}
function umWhere(f) {
  const m = umCur();
  step({ title: 'Export', n: 2, total: 2, text: 'Save where?', back: umExport, opts: [
    ['Library', async () => {
      busy('Export', 'Saving.');
      const blob = await umBlob(f), name = m.kind === 'final' ? m.name : m.song + ' – Exported Mix';
      if (m.song === S.song.name) await S.addExport('mix', name, f, blob, um.buf.duration);
      else { const song = await S.getSong(m.song); song.exports.unshift({ id: Date.now() + '-u', kind: 'mix', name: CZ.uniqueName(name, song.exports.map((e) => e.name)), fmt: f, date: CZ.today(), len: um.buf.duration, blob }); await S.putSong(song); }
      closeBox(); say(`Saved to the Library as ${f}.`);
    }],
    ['This device (Downloads)', async () => { busy('Export', 'Saving.'); const blob = await umBlob(f); closeBox(); await toDevice(blob, CZ.cleanFile(m.kind === 'final' ? m.name : m.song + ' – Working Mix') + (f === 'WAV' ? '.wav' : '.mp3')); }]] });
}
function umShare() {
  const m = umCur(); if (!m || !um.buf) return;
  step({ title: 'Share', n: 1, total: 2, text: `Send "${esc(m.name)}" to?`, opts: [
    ['Social media', umSocial], ['Email', () => umSend('Email')], ['Open in VLC', () => umSend('VLC')], ['Other apps', () => umSend('')]] });
}
function umSocial() { step({ title: 'Share', n: 2, total: 2, text: 'Which one?', back: umShare, opts: ['Instagram', 'Facebook', 'YouTube', 'SoundCloud'].map((x) => [x, () => umSend(x)]) }); }
async function umSend(app) {
  const m = umCur(); busy('Share', 'Preparing the file.');
  const blob = await umBlob('MP3 320k'), name = CZ.cleanFile(m.kind === 'final' ? m.name : m.song + ' – Working Mix') + '.mp3';
  closeBox();
  const file = new File([blob], name, { type: 'audio/mpeg' });
  if (isPhone() && navigator.canShare && navigator.canShare({ files: [file] })) {
    if (app) say(`Choose ${app} in the share menu.`);
    try { await navigator.share({ files: [file], title: m.name }); } catch (e) { if (e.name !== 'AbortError') message('Share', 'Sharing did not work on this device. Use Export, This device, then share the file from there.'); }
    return;
  }
  downloadBlob(blob, name);
  message('Share', `${esc(name)} is in Downloads.` + (app === 'Email' ? ' Attach it to an email from there.' : app === 'VLC' ? ' Open it with VLC from there.' : app ? ` Upload it to ${app} from there.` : ''));
}

// Edit Sound (drum programmer)
function openDed(v) {
  const smp = S.song.drums.samples[v];
  showPop('ded', 'EDIT SOUND – ' + CZ.DRUMS[v].toUpperCase(), 'drumimport', 'Done', 'ded-done');
  $('#popBody').innerHTML = '<div class="ed" id="dedEd"></div>';
  new WaveEditor($('#dedEd'), { ch: [smp.audio], fi: smp.fi, fo: smp.fo }, editorOpts({ key: smp, tools: ['trim', 'fi', 'fo'],
    onChange: (c) => { smp.audio = c.ch[0]; smp.fi = c.fi; smp.fo = c.fo; smp.ver = (smp.ver || 0) + 1; S.changed('drums'); } }));
}
const cand = { list: [] };
function drumImport(v, back, two) {
  const rows = cand.list.map((f, k) => `<div class="row"><div class="grow">${esc(f.name)}<div class="sub">${f.audio.length / S.sr < 10 ? (f.audio.length / S.sr).toFixed(2) + ' s' : fmt(f.audio.length / S.sr)}</div></div>${hx('&#9654; Listen', 'cl-' + k, 'sm')}${hx('Use', 'cu-' + v + '-' + k, 'sm on')}</div>`).join('');
  const lib = S.song.tracks.map((t, i) => t.audio ? `<div class="row"><div class="grow">${esc(t.name)}<div class="sub">Track ${i + 1} of this song, first 4 seconds</div></div>${hx('&#9654; Listen', 'tl-' + i, 'sm')}${hx('Use', 'tu-' + v + '-' + i, 'sm on')}</div>` : '').join('');
  step({ title: 'Import Audio', n: two ? 2 : 1, total: two ? 2 : 1, back,
    text: `Listen first, then press Use to replace ${CZ.DRUMS[v]}.`,
    html: `<div class="row plain">${hx('Choose files on this device', 'cfiles-' + v, 'sm')}</div>${rows}${lib ? '<div class="section">FROM THIS SONG</div>' + lib : ''}`, opts: [] });
  DL.dialog.redraw = () => drumImport(v, back, two);
}

// ------------------------------------------------------------------ other pop-up dialogs
function tempoDialog() {
  const s = S.song, ls = s.loopStart, le = s.loopEnd;
  step({ title: 'Tempo, click and loop', cancelLabel: 'Done', html: `${slider('Tempo', s.bpm, 40, 240, 1, 'bpm', Math.round(s.bpm) + ' bpm')}
    <div class="row line"><span>Click track</span>${sw(s.click, 'click')}</div>
    <div class="section">LOOP</div><p class="small">Loop plays one part again and again. Move the playhead, then set the start and the end.</p>
    <div class="row gap">${hx('Start here', 'loop-start', 'sm')}${hx('End here', 'loop-end', 'sm')}</div>
    <div class="row gap">${hx('Whole song', 'loop-whole', 'sm')}${hx(s.loop ? 'Loop is on' : 'Loop is off', 'loop', 'sm ' + (s.loop ? 'on' : ''))}</div>
    <p class="dim small">${le > ls + 0.05 ? `Loop: ${fmt(ls)} to ${fmt(le)}` : 'Loop: the whole song'}</p>` });
  DL.dialog.redraw = tempoDialog;
}
async function ioDialog() {
  await S.startAudio();
  const inputs = await S.inputs();
  step({ title: 'Input and output', cancelLabel: 'Close', html: `<div class="section">RECORD FROM</div>${[''].concat(inputs.map((x) => x.deviceId)).map((id, k) =>
      `<div class="item radio ${id === (S.inputId || '') ? 'sel' : ''}" data-act="pick-in" data-id="${esc(id)}">${esc(k === 0 ? 'Automatic' : inputs[k - 1].label || 'Input ' + k)}</div>`).join('')}
    <div class="section">PLAY THROUGH</div><p class="small">Sound plays through the device's normal output. Change it in the phone or computer settings.</p>
    <div class="section">RECORDING DELAY</div><p class="small">Devices delay the sound a little between playing and hearing it. Conceptor shifts new recordings earlier to match. If a new part sounds late or early, adjust it here.</p>
    ${slider('Adjust', S.offsetMs, -100, 100, 1, 'offset', S.offsetMs + ' ms')}
    <p class="dim small">Measured delay now: ${Math.round(((S.ctx.baseLatency || 0) + (S.ctx.outputLatency || 0)) * 1000)} ms</p>` });
}
const HELP = `Recording
1. On the main screen, press R on the track to record. It turns red.
2. Press the red record button at the bottom. Play or sing.
3. Press stop. The recording is on that track.
Wear headphones, so the microphone does not pick up the playback.

Hand Hold
The small (i) buttons explain each feature. Switch them off in the Menu.

Edit Mode
Trim, insert silence, fade and Drop In (re-record a part) on any track. Undo has no limit.

Library
Every song is a folder with its tracks and exported mixes. Library is in the Menu and on the main screen.

Ultrasound Machine
Plays working mixes and final mixes. Export and Share are there too.

Home
The Home button (with the beehive) returns to the main screen from anywhere.

Limits
Twelve tracks. Each track holds up to four minutes. One stereo output.`;

// ------------------------------------------------------------------ live parts (meters, time, step light)
const meterBuf = new Float32Array(256);
function peak(an) { if (!an) return 0; an.getFloatTimeDomainData(meterBuf); let m = 0; for (const x of meterBuf) m = Math.max(m, Math.abs(x)); return m; }
function updateLive() {
  if (!S.song) return;
  const t = $('#time'); if (t) t.textContent = fmt(S.now()) + '  /  ' + fmt(S.length());
  if (S.ctx && ui.screen === 1) {
    for (let i = 0; i < S.song.shown; i++) { const e = document.getElementById('m' + i); if (e) e.style.width = Math.min(100, peak(S.strips[i].meter) * 100) + '%'; }
    const p = Math.min(100, peak(S.master.meter) * 100); const l = $('#mL'), r = $('#mR'); if (l) l.style.width = p + '%'; if (r) r.style.width = p + '%';
  }
  const lim = $('#limiting'); if (lim && S.master) lim.textContent = (S.song.master.on ? S.master.reduction : 0).toFixed(1) + ' dB';
  drumLive();
  if (ui.pop === 'um' && um.playing) umDraw();
}
(function loop() { updateLive(); requestAnimationFrame(loop); })();

// ------------------------------------------------------------------ sliders and text
document.addEventListener('input', (e) => {
  const el = e.target, b = el.dataset.bind; if (!b) return;
  const v = parseFloat(el.value), s = S.song;
  let shown = '';
  if (b === 'masterVol') { s.masterVol = v; shown = dbText(v, -60); }
  else if (b === 'bpm') { s.bpm = Math.round(v); shown = s.bpm + ' bpm'; CZ.fillPh(s); }
  else if (b === 'ex.a' || b === 'ex.b') {
    const L = ex.clip.ch[0].length / S.sr;
    if (b === 'ex.a') ex.a = Math.max(0, Math.min(v, ex.b - 0.1)); else ex.b = Math.min(L, Math.max(v, ex.a + 0.1));
    el.value = ex[b.slice(3)]; shown = fmt(ex[b.slice(3)]); drawTrimWave();
    document.querySelectorAll(`[data-show="${b}"]`).forEach((x) => { x.textContent = shown; }); return;
  }
  else if (b === 'offset') { S.offsetMs = Math.round(v); localStorage.setItem('cz.offsetMs', S.offsetMs); shown = S.offsetMs + ' ms'; }
  else if (b === 'drums.vol') { s.drums.vol = v; shown = v.toFixed(1) + ' dB'; }
  else if (b === 'master.gain') { s.master.gain = v; shown = v.toFixed(1) + ' dB'; }
  else if (b === 'master.ceiling') { s.master.ceiling = v; shown = v.toFixed(1) + ' dB'; }
  else if (b[0] === 't') { const [ti, key] = b.slice(1).split('.'); s.tracks[+ti][key] = v; shown = key === 'pan' ? panText(v) : key === 'vol' ? dbText(v, -60) : v.toFixed(1) + ' dB'; }
  else if (b[0] === 'k') {
    const [ti, u, i] = b.slice(1).split('.').map(Number);
    const fx = fxOf(ti, u), k = CZ.spec(u, fx.variant)[i]; fx.vals[i] = CZ.fromFrac(k, v); shown = CZ.knobText(k, fx.vals[i]);
  }
  document.querySelectorAll(`[data-show="${b}"]`).forEach((x) => { x.textContent = shown; });
  if (b !== 'offset') S.changed('knob');
});
document.addEventListener('change', (e) => { if (e.target.id === 'tname') { S.song.tracks[ui.track].name = e.target.value.trim() || 'Track ' + (ui.track + 1); S.changed(); } });

// ------------------------------------------------------------------ taps
function go(screen) { S.stopListen(); ui.screen = screen; ui.menu = false; ui.open = -1; render(); }
function goHome() {
  closeAllBoxes(); hidePop(); $('#tip').classList.remove('show'); umStop(); S.stopListen(); if (S.playing) S.stop();
  ui.screen = 1; ui.menu = false; ui.open = -1; ui.editor = null; render();
}
function fxOf(t, u) { return t < 0 ? (u === 4 ? S.song.master.eq : S.song.master.comp) : S.song.tracks[t].fx[u]; }

document.addEventListener('click', async (e) => {
  const ti = e.target.closest('[data-tip]'); if (ti) { e.preventDefault(); e.stopPropagation(); tip(ti.dataset.tip); return; }
  const pk = e.target.closest('[data-pick]');
  if (pk) { const L = pk.closest('.dlg').id; DL[L].opts[+pk.dataset.pick][1](); return; }
  const el = e.target.closest('[data-act]'); if (!el) { if (ui.menu && !e.target.closest('.menu')) { ui.menu = false; render(); } return; }
  const a = el.dataset.act, s = S.song;
  if (a !== 'menu' && ui.menu) ui.menu = false;
  const m = (re) => a.match(re);
  let r, rerender = true;
  if (a === 'got-it') { $('#tip').classList.remove('show'); return; }
  if (a === 'dl-close') { const L = el.closest('.dlg').id; const o = DL[L]; S.stopListen(); closeBox(L); if (o && o.onCancel) o.onCancel(); if (o && o.redraw === tempoDialog) render(); return; }
  if (a === 'dl-back') { const L = el.closest('.dlg').id; DL[L].back(); return; }
  if (a === 'home') { goHome(); return; }
  if (a === 'w-start') { await S.startAudio(); ui.welcome = 1; }
  else if (a === 'w-mic') { await S.startAudio(); ui.micOk = await S.openMic(); ui.micAsked = true; }
  else if (a === 'w-next') ui.welcome = 2;
  else if (a === 'w-create') { await S.newSong($('#firstName').value); localStorage.setItem('cz.intro', '1'); askMode(); return; }
  else if (a === 'menu') ui.menu = !ui.menu;
  else if (a === 'hh') { setHandHold(!handHold()); say(handHold() ? 'Hand Hold on.' : 'Hand Hold off.'); ui.menu = true; }
  else if (a === 'rename-song') { renameSongFlow(s.name); rerender = false; }
  else if (a === 'go-drums') go(3);
  else if (a === 'go-master') { if (!S.polished()) { message('Mastering', 'Mastering is in Polished Mode only. Change the mode in the Menu.'); return; } go(4); }
  else if (a === 'go-edit') { ui.sel = Math.max(0, s.tracks.findIndex((t) => t.audio)); go(5); }
  else if ((r = m(/^esel-(\d+)$/))) { if (ui.editor) ui.editor.stop(); ui.sel = +r[1]; render(); }
  else if ((r = m(/^edit-(\d+)$/))) { ui.sel = +r[1]; go(5); }
  else if ((r = m(/^open-(\d+)$/))) { ui.track = +r[1]; go(2); }
  else if ((r = m(/^tmenu-(\d+)$/))) { trackMenu(+r[1]); rerender = false; }
  else if ((r = m(/^import-(\d+)$/))) { pickFile((f) => doImport(+r[1], f)); rerender = false; }
  else if ((r = m(/^(arm|mute|solo)-(\d+)$/))) { const t = s.tracks[+r[2]]; if (r[1] === 'arm') { if (!S.recording) t.arm = !t.arm; if (t.arm) { await S.startAudio(); if (!(await S.openMic())) { t.arm = false; say('Recording needs the microphone. Allow it in the browser settings for this page.'); } } } else t[r[1]] = !t[r[1]]; S.changed(); }
  else if (a === 'add-track') { if (s.shown < 12) { s.shown++; S.changed(); } }
  else if (a === 'play') { if (S.playing) S.stop(); else await S.play(); }
  else if (a === 'rec') { const res = await S.record(); if (res === 'noarm') say('Press R on a track first, then press the record button.'); if (res === 'nomic') say('Recording needs the microphone. Allow it in the browser settings for this page.'); }
  else if (a === 'rew') S.rewind();
  else if (a === 'loop') { s.loop = !s.loop; S.changed(); if (DL.dialog && DL.dialog.redraw === tempoDialog) tempoDialog(); }
  else if (a === 'click') { s.click = !s.click; S.changed(); if (DL.dialog && DL.dialog.redraw === tempoDialog) tempoDialog(); }
  else if (a === 'loop-start') { s.loopStart = S.now(); S.changed(); tempoDialog(); }
  else if (a === 'loop-end') { s.loopEnd = S.now(); S.changed(); tempoDialog(); }
  else if (a === 'loop-whole') { s.loopStart = 0; s.loopEnd = 0; S.changed(); tempoDialog(); }
  else if ((r = m(/^fx-open-(\d+)$/))) { if (!e.target.closest('.sw')) ui.open = ui.open === +r[1] ? -1 : +r[1]; }
  else if ((r = m(/^fx-on-(-?\d+)-(\d+)$/))) { const fx = fxOf(+r[1], +r[2]); fx.on = !fx.on; S.changed(); }
  else if ((r = m(/^fx-var-(-?\d+)-(\d+)-(\d+)$/))) { const fx = fxOf(+r[1], +r[2]); fx.variant = +r[3]; fx.vals = CZ.defaults(+r[2], fx.variant); fx.on = true; S.changed(); }
  else if ((r = m(/^fx-reset-(-?\d+)-(\d+)$/))) { const fx = fxOf(+r[1], +r[2]); fx.vals = CZ.defaults(+r[2], fx.variant); S.changed(); }
  else if (a === 'clear') { step({ title: `Clear track ${ui.track + 1}?`, text: 'The recording on this track is removed. The effect settings stay.', opts: [['Clear', () => { S.clearTrack(ui.track); closeBox(); render(); }, 'red']] }); rerender = false; }
  else if (a.startsWith('dp-')) { await drumAct(a); return; }
  else if (a === 'm-mode') { changeMode(); return; }
  else if (a === 'pick-demo' || a === 'pick-polished') ui.pickMode = a.slice(5);
  else if (a === 'mode-open') { s.mode = ui.pickMode; S.changed('mode'); ui.screen = 1; say((s.mode === 'polished' ? 'Polished' : 'Demo') + ' Mode.'); }
  else if (a === 'polished-only') { ui.menu = false; render(); message('Mastering', 'Mastering is in Polished Mode only. Change the mode in the Menu.'); return; }
  else if (a === 'ex-trimplay') { const sr = S.sr; S.listen(ex.clip.ch, ex.a, ex.b); return; }
  else if ((r = m(/^cfiles-(\d+)$/))) { pickFile(async (files) => { for (const f of files) { const au = await S.decodeFile(f, 4); if (au) cand.list.push({ name: f.name, audio: au }); else say(f.name + ' could not be read.'); } DL.dialog.redraw(); }, true); return; }
  else if ((r = m(/^cl-(\d+)$/))) { S.listen([cand.list[+r[1]].audio]); return; }
  else if ((r = m(/^tl-(\d+)$/))) { S.listen([s.tracks[+r[1]].audio.slice(0, S.sr * 4)]); return; }
  else if ((r = m(/^cu-(\d+)-(\d+)$/))) { const f = cand.list[+r[2]]; S.stopListen(); S.setDrumSample(+r[1], f.audio.slice(), f.name); closeBox(); say('Imported. Tap the sound name, then Edit Sound, to trim or fade it.'); }
  else if ((r = m(/^tu-(\d+)-(\d+)$/))) { const t = s.tracks[+r[2]]; S.stopListen(); S.setDrumSample(+r[1], t.audio.slice(0, S.sr * 4), t.name); closeBox(); say('Imported. Tap the sound name, then Edit Sound, to trim or fade it.'); }
  else if (a === 'ded-done') { hidePop(); S.saveNow(); say('Sound saved. It plays in the pattern.'); }
  else if (a === 'master-on') { s.master.on = !s.master.on; S.changed(); }
  else if (a === 'm-new') { await S.newSong(null); askMode(); return; }
  else if (a === 'm-save') { await S.saveNow(); say('Saved.'); }
  else if (a === 'm-undo') say(S.undoTake() ? 'Last take removed.' : 'Nothing to undo.');
  else if (a === 'm-tempo') { tempoDialog(); rerender = ui.screen !== 5; }
  else if (a === 'm-io') { await ioDialog(); }
  else if (a === 'pick-in') { S.inputId = el.dataset.id || null; S.closeMic(); if (s.tracks.some((t) => t.arm)) await S.openMic(); await ioDialog(); }
  else if (a === 'm-help') step({ title: 'Help', html: `<pre class="help">${esc(HELP)}</pre>`, cancelLabel: 'Close' });
  else if (a === 'export') { exportFlow(); rerender = false; }
  // Library
  else if (a === 'lib') { await openLib(); return; }
  else if (a === 'lib-close') { hidePop(); }
  else if (a === 'lib-all') { lib.folder = null; drawLib(); return; }
  else if (a === 'lf') { lib.folder = el.dataset.name; drawLib(); return; }
  else if (a === 'lib-loc') { locationFlow(); return; }
  else if (a === 'lib-sync') { syncFlow(); return; }
  else if (a === 'lopen') { await S.saveNow(); await S.load(lib.folder); hidePop(); askMode(); return; }
  else if (a === 'lrename') { renameSongFlow(lib.folder); return; }
  else if (a === 'ldelete') { deleteFlow(lib.folder); return; }
  else if ((r = m(/^lcopy-(\d+)$/))) { copyFlow(lib.folder, +r[1]); return; }
  else if ((r = m(/^lplay-(.+)$/))) { hidePop(); await openUM('final', r[1]); return; }
  else if ((r = m(/^ldev-(.+)$/))) { const f = await findExport(r[1]); if (f) await toDevice(f.e.blob, fileName(f.e)); return; }
  // Ultrasound Machine
  else if (a === 'um') { await openUM(); return; }
  else if (a === 'um-close') { umStop(); hidePop(); }
  else if ((r = m(/^umtab-(\w+)$/))) { um.tab = r[1]; await umList(); return; }
  else if ((r = m(/^umsel-(\d+)$/))) { um.sel = +r[1]; await umLoad(); return; }
  else if (a === 'um-play') { await S.startAudio(); umPlay(); return; }
  else if (a === 'um-stop') { umStop(); return; }
  else if (a === 'um-b10') { umSeek(umNow() - 10); return; }
  else if (a === 'um-f10') { umSeek(umNow() + 10); return; }
  else if (a === 'um-loop') { um.loop = !um.loop; $('#umLoop').classList.toggle('on', um.loop); say(um.loop ? 'Loop on.' : 'Loop off.'); return; }
  else if (a === 'um-prev') { if (umNow() > 3) umSeek(0); else if (um.items.length) { um.sel = (um.sel - 1 + um.items.length) % um.items.length; await umLoad(); } return; }
  else if (a === 'um-next') { if (um.items.length) { um.sel = (um.sel + 1) % um.items.length; await umLoad(); } return; }
  else if (a === 'um-export') { umExport(); return; }
  else if (a === 'um-share') { umShare(); return; }
  else if (a === 'um-lib') { umStop(); hidePop(); await openLib(); return; }
  if (rerender) render();
});

S.on((what) => {
  if (ui.screen === 5 || ui.pop === 'ded' || (DL.dialog && DL.dialog.mount)) { const t = $('#time'); if (t) updateLive(); return; }   // keep the editor as it is
  if (what === 'transport' || what === 'song' || what === 'audio' || what === 'drums') render();
});
document.addEventListener('visibilitychange', () => { if (document.hidden && S.song) { if (S.playing) S.stop(); S.saveNow(); } });

// ------------------------------------------------------------------ start
(async function start() {
  setHandHold(handHold());
  await S.restoreFolder();
  const last = localStorage.getItem('cz.last');
  if (localStorage.getItem('cz.intro') && last && (await S.load(last).catch(() => false))) ui.screen = 1;
  else if (localStorage.getItem('cz.intro')) { await S.newSong(null); ui.screen = 1; }
  render();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
