// Conceptor web screens. Same layout and wording as the Android app.
'use strict';

const S = new Studio();
const ui = { screen: 0, welcome: 0, track: 0, open: -1, dialog: null, banner: '', menu: false, micAsked: false, micOk: false };
const COLOURS = ['#E8C872', '#D99A4A', '#C96F4A', '#B85C6E', '#9B6BB0', '#6E7FC4', '#4F9BB8', '#4FB5A0', '#7DB85A', '#B4B84F', '#D2A24C', '#A68B6A'];
const $ = (q) => document.querySelector(q);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let bannerTimer = null;
function say(t) { ui.banner = t; clearTimeout(bannerTimer); bannerTimer = setTimeout(() => { ui.banner = ''; drawBanner(); }, 4000); drawBanner(); }
function drawBanner() { const b = $('#banner'); b.textContent = ui.banner; b.style.display = ui.banner ? 'block' : 'none'; }

// ------------------------------------------------------------------ small pieces
const btn = (label, act, cls = '', extra = '') => `<button class="w ${cls}" data-act="${act}" ${extra}>${esc(label)}</button>`;
const sw = (on, act) => `<button class="sw ${on ? 'on' : ''}" data-act="${act}" aria-pressed="${on}"><i></i></button>`;
function slider(label, value, lo, hi, step, bind, shown) {
  return `<div class="sl"><div class="row"><span>${esc(label)}</span><b data-show="${bind}">${shown}</b></div>
    <input type="range" min="${lo}" max="${hi}" step="${step}" value="${value}" data-bind="${bind}"></div>`;
}
const dbText = (v, lo) => (v <= lo + 0.5 && lo <= -59 ? 'off' : v.toFixed(1) + ' dB');
const panText = (v) => (Math.abs(v) < 0.02 ? 'centre' : v < 0 ? 'left ' + Math.round(-v * 100) : 'right ' + Math.round(v * 100));

// ------------------------------------------------------------------ screens
function render() {
  const app = $('#app');
  if (ui.screen === 0) app.innerHTML = welcome();
  else if (ui.screen === 1) app.innerHTML = mixScreen();
  else if (ui.screen === 2) app.innerHTML = trackScreen();
  else if (ui.screen === 3) app.innerHTML = drumScreen();
  else app.innerHTML = masterScreen();
  $('#dialog').innerHTML = ui.dialog ? dialogHtml() : '';
  $('#dialog').style.display = ui.dialog ? 'flex' : 'none';
  updateLive();
}

function welcome() {
  let body;
  if (ui.welcome === 0) body = `<p>Record ideas on your phone or computer. Twelve tracks, with amps, pedals and effects built in.</p>${btn('Start', 'w-start', 'strong full')}`;
  else if (ui.welcome === 1) body = `<p>Conceptor needs the microphone to record.</p>
      ${ui.micAsked && !ui.micOk ? '<p class="dim">The microphone was not allowed. Playback and mixing still work. Recording does not.</p>' : ''}
      ${ui.micOk ? btn('Next', 'w-next', 'strong full') : btn('Allow the microphone', 'w-mic', 'strong full') + btn('Carry on without it', 'w-next', 'full')}`;
  else body = `<p>Name the first song.</p><input id="firstName" class="text" value="Song 1">${btn('Create the song', 'w-create', 'strong full')}`;
  return `<div class="welcome"><img src="art.jpg" alt=""><h1>CONCEPTOR</h1>${body}</div>`;
}

function topBar(title, back) {
  return `<div class="top">${back ? btn('Back', 'back') : '<span class="brand">CONCEPTOR</span>'}
    <span class="${back ? 'title' : 'song'}">${esc(title)}</span>${back ? '' : btn('Menu', 'menu')}</div>`;
}

function mixScreen() {
  const s = S.song;
  let h = topBar(s.name, false);
  if (ui.menu) {
    const items = [['New song', 'm-new'], ['Open a song', 'm-open'], ['Save now', 'm-save'], ['Undo last take', 'm-undo'], ['Export', 'export'],
      ['Drum grid (Gillian and Stephen)', 'go-drums'], ['Mastering', 'go-master'], ['Tempo, click and loop', 'm-tempo'], ['Input and output', 'm-io'], ['Help', 'm-help']];
    h += `<div class="menu">${items.map(([l, a]) => `<div data-act="${a}">${l}</div>`).join('')}</div>`;
  }
  h += `<div class="master"><span class="lbl">MASTER</span><div class="grow">
        <input type="range" min="-60" max="6" step="0.1" value="${s.masterVol}" data-bind="masterVol">
        <div class="meters"><div class="lv"><i id="mL"></i></div><div class="lv"><i id="mR"></i></div></div></div>
        <b data-show="masterVol">${dbText(s.masterVol, -60)}</b></div>
      <div class="quick">${btn('Drums', 'go-drums', s.drums.on ? 'on' : '')}${btn('Mastering', 'go-master', s.master.on ? 'on' : '')}${btn('Export', 'export')}</div>
      <div class="tracks">`;
  for (let i = 0; i < s.shown; i++) {
    const t = s.tracks[i], c = COLOURS[i];
    const len = t.audio ? CZ.formatTime(t.audio.length / S.sr) : 'empty';
    h += `<div class="trk"><i class="strip" style="background:${c}"></i><div class="grow">
          <div class="row"><span class="name" data-act="open-${i}">${esc(t.name)}</span><small>${len}</small></div>
          <input type="range" min="-60" max="6" step="0.1" value="${t.vol}" data-bind="t${i}.vol" style="accent-color:${c}">
          <div class="lv thin"><i id="m${i}" style="background:${c}"></i></div></div>
          <div class="keys">${btn('R', 'arm-' + i, t.arm ? 'rec' : '')}${btn('M', 'mute-' + i, t.mute ? 'on' : '')}${btn('S', 'solo-' + i, t.solo ? 'solo' : '')}${btn('FX', 'open-' + i)}</div></div>`;
  }
  if (s.shown < 12) h += btn('Add track', 'add-track', 'full addtrk');
  h += `</div>${transport()}`;
  return h;
}

function transport() {
  const s = S.song;
  return `<div class="transport"><div id="time" class="time"></div><div class="tbtns">
    <button class="tb" data-act="rew" aria-label="Rewind">&#9198;</button>
    <button class="tb big ${S.playing && !S.recording ? 'on' : ''}" data-act="play" aria-label="Play or stop">${S.playing && !S.recording ? '&#9632;' : '&#9654;'}</button>
    <button class="tb big recb ${S.recording ? 'on' : ''}" data-act="rec" aria-label="Record">&#9679;</button>
    <button class="tb ${s.loop ? 'on' : ''}" data-act="loop" aria-label="Loop">&#10227;</button>
    <button class="tb ${s.click ? 'on' : ''}" data-act="click" aria-label="Click">&#9650;</button></div></div>`;
}

function effectCard(t, u, fx) {
  const open = ui.open === u, vars = CZ.VARIANTS[u];
  let h = `<div class="fx"><div class="fxhead" data-act="fx-open-${u}"><div class="grow"><b class="${fx.on ? 'gold' : ''}">${CZ.UNITS[u]}</b>
      <small>${vars.length ? vars[fx.variant] : CZ.BLURB[u]}</small></div>${sw(fx.on, `fx-on-${t}-${u}`)}</div>`;
  if (open) {
    h += '<div class="fxbody">';
    if (vars.length) h += `<div class="pills">${vars.map((v, i) => `<button class="pill ${i === fx.variant ? 'sel' : ''}" data-act="fx-var-${t}-${u}-${i}">${v}</button>`).join('')}</div>`;
    CZ.spec(u, fx.variant).forEach((k, i) => {
      h += `<div class="sl"><div class="row"><span>${k.name}</span><b data-show="k${t}.${u}.${i}">${CZ.knobText(k, fx.vals[i])}</b></div>
        <input type="range" min="0" max="1" step="0.001" value="${CZ.toFrac(k, fx.vals[i])}" data-bind="k${t}.${u}.${i}"></div>`;
    });
    h += btn('Reset knobs', `fx-reset-${t}-${u}`) + '</div>';
  }
  return h + '</div>';
}

function trackScreen() {
  const i = ui.track, t = S.song.tracks[i];
  let h = topBar('Track ' + (i + 1), true) + `<div class="scroll">
    <label class="fld">Name<input class="text" id="tname" value="${esc(t.name)}"></label>
    <h3>LEVELS</h3>
    ${slider('Input gain', t.trim, -12, 24, 0.1, `t${i}.trim`, t.trim.toFixed(1) + ' dB')}
    ${slider('Volume', t.vol, -60, 6, 0.1, `t${i}.vol`, dbText(t.vol, -60))}
    ${slider('Pan', t.pan, -1, 1, 0.01, `t${i}.pan`, panText(t.pan))}
    <div class="row gap">${btn('Import audio', 'import')}${btn('Clear this track', 'clear')}</div>
    <p class="dim small">Import puts the file at the start of this track and replaces what is there. Menu, Undo last take, puts it back.</p>
    <input type="file" id="file" accept="audio/*" hidden>
    <h3>EFFECTS, IN THE ORDER THE SOUND PASSES THROUGH THEM</h3>
    <p class="dim small">Switch an effect on with its switch. Tap its name to open its controls.</p>`;
  t.fx.forEach((fx, u) => { h += effectCard(i, u, fx); });
  return h + '</div>';
}

function drumScreen() {
  const d = S.song.drums;
  let h = `<div class="top">${btn('Back', 'back')}<span class="title">GILLIAN AND STEPHEN<small>Drum grid</small></span></div><div class="scroll">
    <div class="row line"><span>Drums on</span>${sw(d.on, 'drums-on')}</div>
    ${slider('Drum volume', d.vol, -40, 6, 0.1, 'drums.vol', d.vol.toFixed(1) + ' dB')}
    <div class="row line"><span class="dim">Tempo ${Math.round(S.song.bpm)} bpm, the same as the click.</span>${btn('Tempo', 'm-tempo')}</div>
    <h3>START FROM A PATTERN</h3><div class="pills">${CZ.DRUM_PRESETS.map((p, k) => `<button class="pill" data-act="preset-${k}">${p}</button>`).join('')}</div>
    <h3>ONE BAR, 16 STEPS. TAP A SQUARE TO SWITCH IT ON OR OFF.</h3>`;
  for (let v = 0; v < 6; v++) {
    h += `<div class="dname">${CZ.DRUMS[v]}</div><div class="grid">`;
    for (let st = 0; st < 16; st++) h += `<button class="cell ${d.steps[v][st] ? 'lit' : ''} ${(st >> 2) % 2 ? 'alt' : ''}" data-step="${st}" style="${d.steps[v][st] ? 'background:' + COLOURS[v] : ''}" data-act="cell-${v}-${st}"></button>`;
    h += '</div>';
  }
  h += '<div class="beats"><span>Beat 1</span><span>Beat 2</span><span>Beat 3</span><span>Beat 4</span></div></div>' + transport();
  return h;
}

function masterScreen() {
  const m = S.song.master;
  return `${topBar('MASTERING', true)}<div class="scroll">
    <div class="row line"><span>Mastering on</span>${sw(m.on, 'master-on')}</div>
    <p class="dim small">Works on the whole mix, in this order: EQ, compressor, limiter. It is heard when playing and is included when the mix is exported.</p>
    <h3>EQ AND COMPRESSOR</h3>${effectCard(-1, 4, m.eq)}${effectCard(-1, 1, m.comp)}
    <h3>LIMITER</h3>
    ${slider('Loudness', m.gain, 0, 12, 0.1, 'master.gain', m.gain.toFixed(1) + ' dB')}
    ${slider('Ceiling', m.ceiling, -6, 0, 0.1, 'master.ceiling', m.ceiling.toFixed(1) + ' dB')}
    <p class="dim small">Loudness makes the mix louder. Ceiling is the highest level allowed. Limiting now: <span id="limiting">0.0 dB</span></p></div>${transport()}`;
}

// ------------------------------------------------------------------ pop-ups
function box(title, body, buttons) { return `<div class="box"><h2>${esc(title)}</h2><div class="boxbody">${body}</div><div class="boxbtns">${buttons}</div></div>`; }
const tb = (label, act) => `<button class="tbtn" data-act="${act}">${esc(label)}</button>`;

function dialogHtml() {
  const d = ui.dialog, s = S.song;
  switch (d.kind) {
    case 'new': return box('New song', `<input class="text" id="newName" value="${esc(d.name)}">`, tb('Cancel', 'close') + tb('Create', 'new-ok'));
    case 'open': return box('Open a song', d.names.length ? d.names.map((n) => `<div class="row item"><span data-act="open-song" data-name="${esc(n)}">${esc(n)}${n === s.name ? '  (open now)' : ''}</span>${tb('Delete', 'ask-del')}</div>`).join('').replace(/data-act="ask-del"/g, (m, o) => m) : '<p>No saved songs.</p>', tb('Close', 'close'));
    case 'del': return box(`Delete "${d.name}"?`, '<p>The song and all its recordings are removed from this browser.</p>', tb('Cancel', 'close') + tb('Delete', 'del-ok'));
    case 'clear': return box(`Clear track ${ui.track + 1}?`, '<p>The recording on this track is removed. The effects settings stay.</p>', tb('Cancel', 'close') + tb('Clear', 'clear-ok'));
    case 'help': return box('Help', `<pre class="help">${esc(HELP)}</pre>`, tb('Close', 'close'));
    case 'busy': return box(d.title, `<p>${esc(d.text)}</p>`, '');
    case 'tempo': {
      const ls = s.loopStart, le = s.loopEnd;
      return box('Tempo, click and loop', `${slider('Tempo', s.bpm, 40, 240, 1, 'bpm', Math.round(s.bpm) + ' bpm')}
        <div class="row line"><span>Click track</span>${sw(s.click, 'click')}</div>
        <h3>LOOP</h3><p class="small">Loop plays one part again and again. Move the playhead, then set the start and the end.</p>
        <div class="row gap">${btn('Start here', 'loop-start')}${btn('End here', 'loop-end')}</div>
        <div class="row gap">${btn('Whole song', 'loop-whole')}${btn(s.loop ? 'Loop is on' : 'Loop is off', 'loop', s.loop ? 'on' : '')}</div>
        <p class="dim small">${le > ls + 0.05 ? `Loop: ${CZ.formatTime(ls)} to ${CZ.formatTime(le)}` : 'Loop: the whole song'}</p>`, tb('Done', 'close'));
    }
    case 'io': return box('Input and output', `<h3>RECORD FROM</h3>${['Automatic'].concat(d.inputs.map((x, k) => x.label || 'Input ' + (k + 1))).map((l, k) => {
        const id = k === 0 ? '' : d.inputs[k - 1].deviceId; return `<div class="item radio ${id === (S.inputId || '') ? 'sel' : ''}" data-act="pick-in" data-id="${esc(id)}">${esc(l)}</div>`; }).join('')}
        <h3>PLAY THROUGH</h3><p class="small">Sound plays through the device's normal output. Change it in the phone or computer settings.</p>
        <h3>RECORDING DELAY</h3><p class="small">Devices delay the sound a little between playing and hearing it. Conceptor shifts new recordings earlier to match. If a new part sounds late or early, adjust it here.</p>
        ${slider('Adjust', S.offsetMs, -100, 100, 1, 'offset', S.offsetMs + ' ms')}
        <p class="dim small">Measured delay now: ${S.ctx ? Math.round(((S.ctx.baseLatency || 0) + (S.ctx.outputLatency || 0)) * 1000) + ' ms' : 'not available yet'}</p>`, tb('Close', 'close'));
    case 'export': return exportHtml(d.plan);
  }
  return '';
}

function exportHtml(p) {
  const back = (to) => tb('Back', 'ex-back-' + to);
  switch (p.step) {
    case 0: return box('Export: what?', btn('The whole mix', 'ex-mix', 'full') + btn('One track', 'ex-one', 'full'), tb('Cancel', 'close'));
    case 1: {
      const used = S.song.tracks.map((t, i) => [t, i]).filter(([t]) => t.audio);
      return box('Export: which track?', used.length ? used.map(([t, i]) => `<div class="item" data-act="ex-track-${i}">${i + 1}.  ${esc(t.name)}   ${CZ.formatTime(t.audio.length / S.sr)}</div>`).join('') : '<p>No track has a recording yet.</p>', back(0));
    }
    case 2: return box('Export: with effects or raw?', btn('With effects, volume and pan', 'ex-fx', 'full') + btn('Raw recording, no effects', 'ex-raw', 'full'), back(1));
    case 3: return box('Export: which format?', btn('WAV (full quality, large file)', 'ex-wav', 'full') + btn('MP3 320k (smaller file)', 'ex-mp3', 'full'), back(p.track < 0 ? 0 : 2));
    default: {
      const L = Math.max(0.1, p.length);
      const tail = p.end >= p.length - 0.01 && !(p.track >= 0 && !p.withFx);
      return box('Export: crop', `<p class="small">Move the sliders to cut the start or the end. Leave them to export everything.</p>
        ${slider('Start', p.start, 0, L, 0.1, 'ex.start', p.start.toFixed(1) + ' s')}${slider('End', p.end, 0, L, 0.1, 'ex.end', p.end.toFixed(1) + ' s')}
        <p class="dim small" id="exsum">Exporting ${CZ.formatTime(p.start)} to ${CZ.formatTime(p.end)}${tail ? ', plus 3 seconds for effects to fade out.' : '.'}</p>
        ${btn('Use the whole length', 'ex-whole')}`, back(3) + tb('Export', 'ex-go'));
    }
  }
}

const HELP = `Recording
1. On the Mix screen, press R on the track you want to record. It turns red.
2. Press the red record button at the bottom. Play or sing.
3. Press stop. The recording is on that track.
Wear headphones, so the microphone does not pick up the playback.

More tracks
Four tracks show at first. Press Add track at the bottom of the list for more, up to 12.

Hearing yourself
A track with R lit plays what you play through its effects, so you can hear the amp and pedals while you play.

Effects
Tap FX on a track, or tap its name. Each track has the same eight effects in the same order: Gate, Compressor, Pedal, Amp, EQ, Analog delay, Digital delay and Reverb. The recording itself stays clean. The effects are applied when you play it back.

Import audio
Open a track, press Import audio and choose a file. It goes at the start of the track.

Drums
Press Drums. Switch the drums on, pick a pattern or tap squares in the grid. The drums follow the tempo of the click.

Mastering
Press Mastering and switch it on. EQ, compressor and limiter work on the whole mix.

Undo
Menu, Undo last take, puts back what was there before the last recording or import.

Saving and exporting
Songs save by themselves, in this browser on this device. Press Export to make a WAV or MP3 file of the mix or of one track.

Limits
Twelve tracks. Each track holds up to four minutes. One stereo output.`;

// ------------------------------------------------------------------ live parts (meters, time, step light)
const meterBuf = new Float32Array(256);
function peak(an) { if (!an) return 0; an.getFloatTimeDomainData(meterBuf); let m = 0; for (const x of meterBuf) m = Math.max(m, Math.abs(x)); return m; }
function updateLive() {
  if (!S.song) return;
  const t = $('#time'); if (t) t.textContent = CZ.formatTime(S.now()) + '  /  ' + CZ.formatTime(S.length());
  if (S.ctx && ui.screen === 1) {
    for (let i = 0; i < S.song.shown; i++) { const e = document.getElementById('m' + i); if (e) e.style.width = Math.min(100, peak(S.strips[i].meter) * 100) + '%'; }
    const p = Math.min(100, peak(S.master.meter) * 100);
    const l = $('#mL'), r = $('#mR'); if (l) l.style.width = p + '%'; if (r) r.style.width = p + '%';
  }
  const lim = $('#limiting'); if (lim && S.master) lim.textContent = (S.song.master.on ? S.master.reduction : 0).toFixed(1) + ' dB';
  if (ui.screen === 3) document.querySelectorAll('.cell').forEach((c) => c.classList.toggle('now', +c.dataset.step === S.drumStep));
}
(function loop() { updateLive(); requestAnimationFrame(loop); })();

// ------------------------------------------------------------------ sliders
document.addEventListener('input', (e) => {
  const el = e.target, b = el.dataset.bind; if (!b) return;
  const v = parseFloat(el.value), s = S.song;
  let shown = '';
  if (b === 'masterVol') { s.masterVol = v; shown = dbText(v, -60); }
  else if (b === 'bpm') { s.bpm = Math.round(v); shown = s.bpm + ' bpm'; }
  else if (b === 'offset') { S.offsetMs = Math.round(v); localStorage.setItem('cz.offsetMs', S.offsetMs); shown = S.offsetMs + ' ms'; }
  else if (b === 'drums.vol') { s.drums.vol = v; shown = v.toFixed(1) + ' dB'; }
  else if (b === 'master.gain') { s.master.gain = v; shown = v.toFixed(1) + ' dB'; }
  else if (b === 'master.ceiling') { s.master.ceiling = v; shown = v.toFixed(1) + ' dB'; }
  else if (b === 'ex.start' || b === 'ex.end') {
    const p = ui.dialog.plan;
    if (b === 'ex.start') p.start = Math.max(0, Math.min(v, p.end - 0.1)); else p.end = Math.min(p.length, Math.max(v, p.start + 0.1));
    el.value = b === 'ex.start' ? p.start : p.end; shown = (b === 'ex.start' ? p.start : p.end).toFixed(1) + ' s';
    const tail = p.end >= p.length - 0.01 && !(p.track >= 0 && !p.withFx);
    $('#exsum').textContent = `Exporting ${CZ.formatTime(p.start)} to ${CZ.formatTime(p.end)}${tail ? ', plus 3 seconds for effects to fade out.' : '.'}`;
  } else if (b[0] === 't') {
    const [ti, key] = b.slice(1).split('.'); const t = s.tracks[+ti]; t[key] = v;
    shown = key === 'pan' ? panText(v) : key === 'vol' ? dbText(v, -60) : v.toFixed(1) + ' dB';
  } else if (b[0] === 'k') {
    const [ti, u, i] = b.slice(1).split('.').map(Number);
    const fx = ti < 0 ? (u === 4 ? s.master.eq : s.master.comp) : s.tracks[ti].fx[u];
    const k = CZ.spec(u, fx.variant)[i]; fx.vals[i] = CZ.fromFrac(k, v); shown = CZ.knobText(k, fx.vals[i]);
  }
  document.querySelectorAll(`[data-show="${b}"]`).forEach((x) => { x.textContent = shown; });
  if (!b.startsWith('ex.') && b !== 'offset') S.changed('knob');
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'tname') { S.song.tracks[ui.track].name = e.target.value.trim() || 'Track ' + (ui.track + 1); S.changed(); }
  if (e.target.id === 'file' && e.target.files[0]) doImport(e.target.files[0]);
});

// ------------------------------------------------------------------ taps
async function doImport(file) {
  ui.dialog = { kind: 'busy', title: 'Importing', text: 'Reading the file. This takes a few seconds.' }; render();
  const r = await S.importFile(ui.track, file);
  ui.dialog = null; render();
  if (r === 'bad') say('This file could not be read. Try an MP3, WAV or M4A file.');
  else say(r === 'cut' ? 'Imported. The file was longer than 4 minutes, so the end was cut off.' : 'Imported to ' + S.song.tracks[ui.track].name + '.');
}
async function doExport(plan) {
  ui.dialog = { kind: 'busy', title: 'Exporting', text: 'Making the file. This takes a few seconds.' }; render();
  let out;
  try { out = await S.exportFile(plan); } catch (e) { console.error(e); out = null; }
  ui.dialog = null; render();
  if (!out) { say('The export did not work.'); return; }
  const file = new File([out.blob], out.name, { type: out.blob.type });
  if (navigator.canShare && navigator.canShare({ files: [file] }) && /iPhone|iPad|Android/.test(navigator.userAgent)) {
    try { await navigator.share({ files: [file], title: out.name }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(out.blob); a.download = out.name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  say('Saved ' + out.name + ' to Downloads.');
}

document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-act]'); if (!el) { if (ui.menu) { ui.menu = false; render(); } return; }
  const a = el.dataset.act, s = S.song;
  if (a !== 'menu') ui.menu = false;
  const m = (re) => a.match(re);
  let r;
  if (a === 'w-start') { await S.startAudio(); ui.welcome = 1; }
  else if (a === 'w-mic') { await S.startAudio(); ui.micOk = await S.openMic(); ui.micAsked = true; }
  else if (a === 'w-next') ui.welcome = 2;
  else if (a === 'w-create') { await S.newSong($('#firstName').value); localStorage.setItem('cz.intro', '1'); ui.screen = 1; }
  else if (a === 'menu') ui.menu = !ui.menu;
  else if (a === 'back') { ui.screen = 1; ui.open = -1; }
  else if (a === 'go-drums') ui.screen = 3;
  else if (a === 'go-master') { ui.screen = 4; ui.open = -1; }
  else if ((r = m(/^open-(\d+)$/))) { ui.track = +r[1]; ui.screen = 2; ui.open = -1; }
  else if ((r = m(/^(arm|mute|solo)-(\d+)$/))) { const t = s.tracks[+r[2]]; if (r[1] === 'arm') { if (!S.recording) t.arm = !t.arm; if (t.arm) { await S.startAudio(); if (!(await S.openMic())) { t.arm = false; say('Recording needs the microphone. Allow it in the browser settings for this page.'); } } } else t[r[1]] = !t[r[1]]; S.changed(); }
  else if (a === 'add-track') { if (s.shown < 12) { s.shown++; S.changed(); } }
  else if (a === 'play') { if (S.recording) S.stop(); else if (S.playing) S.stop(); else await S.play(); }
  else if (a === 'rec') { const res = await S.record(); if (res === 'noarm') say('Press R on a track first, then press the record button.'); if (res === 'nomic') say('Recording needs the microphone. Allow it in the browser settings for this page.'); }
  else if (a === 'rew') S.rewind();
  else if (a === 'loop') { s.loop = !s.loop; S.changed(); }
  else if (a === 'click') { s.click = !s.click; S.changed(); }
  else if (a === 'loop-start') { s.loopStart = S.now(); S.changed(); }
  else if (a === 'loop-end') { s.loopEnd = S.now(); S.changed(); }
  else if (a === 'loop-whole') { s.loopStart = 0; s.loopEnd = 0; S.changed(); }
  else if ((r = m(/^fx-open-(\d+)$/))) { if (!e.target.closest('.sw')) ui.open = ui.open === +r[1] ? -1 : +r[1]; }
  else if ((r = m(/^fx-on-(-?\d+)-(\d+)$/))) { const fx = fxOf(+r[1], +r[2]); fx.on = !fx.on; S.changed(); }
  else if ((r = m(/^fx-var-(-?\d+)-(\d+)-(\d+)$/))) { const fx = fxOf(+r[1], +r[2]); fx.variant = +r[3]; fx.vals = CZ.defaults(+r[2], fx.variant); fx.on = true; S.changed(); }
  else if ((r = m(/^fx-reset-(-?\d+)-(\d+)$/))) { const fx = fxOf(+r[1], +r[2]); fx.vals = CZ.defaults(+r[2], fx.variant); S.changed(); }
  else if (a === 'import') { $('#file').value = ''; $('#file').click(); return; }
  else if (a === 'clear') ui.dialog = { kind: 'clear' };
  else if (a === 'clear-ok') { S.clearTrack(ui.track); ui.dialog = null; }
  else if (a === 'drums-on') { s.drums.on = !s.drums.on; S.changed(); }
  else if ((r = m(/^preset-(\d+)$/))) { CZ.applyPreset(s, +r[1]); S.changed(); }
  else if ((r = m(/^cell-(\d+)-(\d+)$/))) { s.drums.steps[+r[1]][+r[2]] = !s.drums.steps[+r[1]][+r[2]]; S.changed(); }
  else if (a === 'master-on') { s.master.on = !s.master.on; S.changed(); }
  else if (a === 'm-new') { const names = await S.songNames(); let n = 'Song', k = 2; while (names.includes(n)) n = 'Song ' + k++; ui.dialog = { kind: 'new', name: n }; }
  else if (a === 'new-ok') { await S.newSong($('#newName').value); ui.dialog = null; }
  else if (a === 'm-open') ui.dialog = { kind: 'open', names: await S.songNames() };
  else if (a === 'open-song') { await S.saveNow(); await S.load(el.dataset.name); ui.dialog = null; }
  else if (a === 'ask-del') ui.dialog = { kind: 'del', name: el.closest('.row').querySelector('[data-name]').dataset.name };
  else if (a === 'del-ok') { const n = ui.dialog.name; await S.remove(n); ui.dialog = null; if (n === s.name) await S.newSong('Song'); }
  else if (a === 'm-save') { await S.saveNow(); say('Saved.'); }
  else if (a === 'm-undo') say(S.undoTake() ? 'Last take removed.' : 'Nothing to undo.');
  else if (a === 'm-tempo') ui.dialog = { kind: 'tempo' };
  else if (a === 'm-io') { await S.startAudio(); ui.dialog = { kind: 'io', inputs: await S.inputs() }; }
  else if (a === 'pick-in') { S.inputId = el.dataset.id || null; S.closeMic(); if (s.tracks.some((t) => t.arm)) await S.openMic(); ui.dialog = { kind: 'io', inputs: await S.inputs() }; }
  else if (a === 'm-help') ui.dialog = { kind: 'help' };
  else if (a === 'close') ui.dialog = null;
  else if (a === 'export') {
    if (S.exportLength(-1) <= 0 && !s.tracks.some((t) => t.audio)) say('There is nothing to export yet. Record something first.');
    else ui.dialog = { kind: 'export', plan: { step: 0, track: -1, withFx: true, format: 0, start: 0, end: 0, length: 0 } };
  } else if (a.startsWith('ex-')) {
    const p = ui.dialog.plan;
    const crop = () => { p.length = S.exportLength(p.track); p.start = 0; p.end = p.length; p.step = 4; };
    if (a === 'ex-mix') { p.track = -1; p.withFx = true; p.step = 3; }
    else if (a === 'ex-one') p.step = 1;
    else if ((r = m(/^ex-track-(\d+)$/))) { p.track = +r[1]; p.step = 2; }
    else if (a === 'ex-fx') { p.withFx = true; p.step = 3; }
    else if (a === 'ex-raw') { p.withFx = false; p.step = 3; }
    else if (a === 'ex-wav') { p.format = 0; crop(); }
    else if (a === 'ex-mp3') { p.format = 1; crop(); }
    else if (a === 'ex-whole') { p.start = 0; p.end = p.length; }
    else if ((r = m(/^ex-back-(\d)$/))) p.step = +r[1];
    else if (a === 'ex-go') { await doExport(p); return; }
  }
  render();
});
function fxOf(t, u) { return t < 0 ? (u === 4 ? S.song.master.eq : S.song.master.comp) : S.song.tracks[t].fx[u]; }

S.on((what) => { if (what === 'transport' || what === 'song' || what === 'audio') render(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && S.song) { if (S.playing) S.stop(); S.saveNow(); } });

// ------------------------------------------------------------------ start
(async function start() {
  const last = localStorage.getItem('cz.last');
  if (localStorage.getItem('cz.intro') && last && (await S.load(last).catch(() => false))) ui.screen = 1;
  else if (localStorage.getItem('cz.intro')) { await S.newSong('Song'); ui.screen = 1; }
  render();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
