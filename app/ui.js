// Conceptor 0.4.3 screens. Landscape, transport in the top bar, mixer strips, Hand Hold tips and name labels, one question at a time.
'use strict';

const S = new Studio();
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmt = (s) => { s = Math.max(0, s); return Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0'); };
const fmtC = (s) => { s = Math.max(0, s); return fmt(s) + '.' + Math.floor((s % 1) * 10); };
const plural = (n, a, b) => n + ' ' + (n === 1 ? a : (b || a + 's'));
const isPhone = () => /iPhone|iPad|Android/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
function toast(t) { const e = $('toast'); e.textContent = t; e.style.display = 'block'; clearTimeout(e._t); e._t = setTimeout(() => { e.style.display = 'none'; }, 2600); }
const say = toast;
const B = (label, on, cls = '', attr = '') => `<button class="b ${cls}" onclick="${on}" ${attr}>${label}</button>`;
const ii = (k) => `<button class="info" onclick="tip('${k}',event)" aria-label="About this">i</button>`;
const COL = CZ.TRACKCOL, DRUMCOL = '#DCB74F';

// ------------------------------------------------------------------ icons
const HIVE = `<svg width="14" height="12" viewBox="0 0 28 24" fill="none" stroke="currentColor" stroke-width="2.2">${[[6, 7], [14, 12], [22, 7], [14, 3], [6, 17], [22, 17]].map(([x, y]) => `<polygon points="${[0, 1, 2, 3, 4, 5].map((k) => { const a = Math.PI / 3 * k; return (x + 5 * Math.cos(a)).toFixed(1) + ',' + (y + 5 * Math.sin(a)).toFixed(1); }).join(' ')}"/>`).join('')}</svg>`;
const BOOK = (w = 22) => `<svg width="${w}" height="${w}" viewBox="0 0 40 40"><rect x="7" y="4" width="26" height="32" rx="2" fill="#6b2a2e" stroke="#E2BF6A" stroke-width="1.5"/><rect x="7" y="4" width="5" height="32" rx="1.5" fill="#4a1c1f" stroke="#E2BF6A" stroke-width="1.2"/><rect x="31" y="7" width="3" height="27" fill="#efe6cf"/><rect x="16" y="11" width="13" height="7" rx="1" fill="none" stroke="#E2BF6A" stroke-width="1.2"/><line x1="16" y1="24" x2="29" y2="24" stroke="#E2BF6A" stroke-width="1"/></svg>`;
const BLASTER = (w = 22) => `<svg width="${Math.round(w * 1.3)}" height="${w}" viewBox="0 0 52 40"><path d="M14 9 Q26 1 38 9" fill="none" stroke="#C1C5C8" stroke-width="2.5"/><rect x="2" y="9" width="48" height="27" rx="4" fill="#2E2F34" stroke="#C1C5C8" stroke-width="1.5"/><circle cx="13" cy="24" r="8" fill="#121316" stroke="#9AD6C5" stroke-width="1.5"/><circle cx="13" cy="24" r="3" fill="#9AD6C5"/><circle cx="39" cy="24" r="8" fill="#121316" stroke="#9AD6C5" stroke-width="1.5"/><circle cx="39" cy="24" r="3" fill="#9AD6C5"/><rect x="21" y="13" width="10" height="6" rx="1" fill="#070A08" stroke="#35FF6A" stroke-width="1"/><rect x="22" y="23" width="8" height="8" rx="1" fill="#121316" stroke="#E2BF6A" stroke-width="1"/></svg>`;
const TUNEI = `<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 15 A8 8 0 0 1 17 15"/><line x1="10" y1="15" x2="13" y2="8"/></svg>`;
const DROPI = `<svg width="15" height="12" viewBox="0 0 22 16"><path d="M2 2 v12 M20 2 v12" stroke="currentColor" stroke-width="2"/><circle cx="11" cy="8" r="4" fill="#E3242B"/></svg>`;
const BACKI = `<svg width="13" height="12" viewBox="0 0 13 12"><rect x="0" y="1" width="2" height="10" fill="currentColor"/><polygon points="7,1 2,6 7,11" fill="currentColor"/><polygon points="12,1 7,6 12,11" fill="currentColor"/></svg>`;
const PLAYI = `<svg width="12" height="12" viewBox="0 0 12 12"><polygon points="2,1 11,6 2,11" fill="currentColor"/></svg>`;
const STOPI = `<svg width="11" height="11" viewBox="0 0 11 11"><rect x="1" y="1" width="9" height="9" fill="currentColor"/></svg>`;
const RECI = `<svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="5" fill="currentColor"/></svg>`;
const LOOPI = `<svg width="14" height="12" viewBox="0 0 16 14" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9 V5 a2 2 0 0 1 2-2 h8 M11 1 l2 2 l-2 2 M13 5 v4 a2 2 0 0 1-2 2 H3 M5 13 l-2-2 l2-2"/></svg>`;
const CLICKI = `<svg width="12" height="13" viewBox="0 0 12 13"><polygon points="3,12 9,12 7,1 5,1" fill="none" stroke="currentColor" stroke-width="1.6"/><line x1="6" y1="9" x2="10" y2="3" stroke="currentColor" stroke-width="1.6"/></svg>`;
const IMPI = `<svg width="12" height="11" viewBox="0 0 24 22" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M2 6 h7 l2 3 h11 v11 h-20z"/><path d="M12 11 v6 M9 14 l3 3 l3 -3"/></svg>`;

// ------------------------------------------------------------------ Hand Hold
const TIPS = Object.assign({}, CZ.TIPS, {
  menu: ['Menu', 'All the main parts of Conceptor.'],
  input: ['Input', 'Picks which input feeds this track. To record two tracks at once, give each track a different input and tap R on both.'],
  wave: ['Wave edit', 'Opens the track\'s waveform: Trim, Insert Silence (paint over a part) and Clip Gain. Preview listens to the result. Undo goes back one step at a time.'],
  drop: ['Drop In', 'Asks which track, then how many seconds of run-up. It plays the run-up while the counter counts down in orange, then records from the cursor (counter red) until Stop. Put the cursor where recording should start first.'],
  waves: ['View All Waves', 'Shows every track\'s waveform above the faders. Tap or drag the ruler to move the cursor. Hide it if it gets in the way.'],
  samples: ['Drum samples', 'The drum samples folder in Lt. Joe Bookman. Listen to a sample, then Use to put it on this drum. From device adds a new file to the library first.'],
  master: ['Master', 'Volume of the whole mix, with mastering for the whole mix: 7-band EQ, Compressor, Loudness and Ceiling. Mastering is in Polished Mode only.'],
  tuner: ['Tuner', 'Play one string. Green means in tune, orange is close, red is out.'],
  eq: ['7-band EQ', 'Drag a point up or down to boost or cut that band. Double-tap a point to set it back to 0. Flat sets every band back to 0.'],
  pedals: ['Amp and pedals', 'Every pedal is on the board at once. Tap a footswitch to switch a pedal on or off. Drag a pedal by its name to change the order. The signal runs left to right, then into the amp.'],
  chain: ['Signal chain', 'The effects run left to right in this order. Tap one to open it. Drag one left or right to change the order.'],
  cursor: ['Cursor', 'Tap the ruler to put the cursor anywhere. Drag along the ruler to scrub. Play starts from the cursor.'],
  lib: ['Lt. Joe Bookman', 'The library. Every song, mix, track, imported file, drum sample and playlist is here. Files are deleted here only.'],
  um: ['Ultrasound Machine', 'Plays anything in the library. Browse the folders, or open a playlist. Files can\'t be deleted from here.'],
  drumms: ['Mute and solo', 'M mutes one drum sound. S plays only the soloed sounds. The 2 and 4 buttons set the length of the pattern. All bars show at once.'],
  io: ['Input and Output', 'Shows which audio device is used for recording and playback, and the levels coming in on Input 1 and Input 2.'],
  hh: ['Hand Hold', 'Shows the small (i) buttons that explain each feature, and the full name of a control when the mouse is over it (or when it is pressed and held on a phone).'],
  strips: ['Channel strips', 'One strip per track. In picks the input. The knob is Pan. FX opens the effects, EQ the 7-band EQ, Wave the wave edit. R arms recording, M mutes, S solos. Drag the fader to set the volume.'],
  drumstrip: ['Drum channel', 'The drum track\'s own channel. Pattern opens Gillian and Stephen, the drum programmer.'],
  exportn: ['Export', 'Step by step: what to export, trim the start and end, mastering (Polished only), then the format. The file is saved to Lt. Joe Bookman.'],
  extrim: ['Trim', 'Drag the gold handles to cut the start or the end. Tap the wave to put the cursor there, then Play to listen from it.'],
  trackname: ['Track', 'Rename the track, import an audio file onto it, or clear it.'],
});
function handHold() { return localStorage.getItem('cz.hh') !== '0'; }
function setHandHold(on) { localStorage.setItem('cz.hh', on ? '1' : '0'); document.body.classList.toggle('nohh', !on); }
function tip(k, e) { if (e) { e.stopPropagation(); e.preventDefault(); } const t = TIPS[k]; if (!t) return; $('tipT').textContent = t[0]; $('tipP').textContent = t[1]; $('tip').classList.add('show'); }

// B3: full control names on hover (press and hold on a phone)
const SHORT = { R: 'Record arm', M: 'Mute', S: 'Solo', FX: 'Effects', EQ: '7-band EQ', Wave: 'Wave edit', Menu: 'Menu', Done: 'Close this panel' };
const tipName = (el) => el.dataset.n || (el.classList.contains('knob') ? ((el.querySelector('.kl') || {}).textContent || 'Pan') + ' knob' : el.classList.contains('fader') ? 'Volume fader' : el.classList.contains('info') ? 'Hand Hold: what this does' : SHORT[el.textContent.trim()] || null);
const TIPSEL = 'button,.knob,.fader,.inp,.clock,.mode,.nm,.hf,.fs,.ruler,.eqc,[data-n]';
function showName(el) {
  const n = tipName(el), d = $('dev'), h = $('htip'); if (!n || !handHold()) return;
  const dr = d.getBoundingClientRect(), r = el.getBoundingClientRect();
  h.textContent = n; h.style.display = 'block';
  let x = r.left - dr.left + r.width / 2 - h.offsetWidth / 2, y = r.bottom - dr.top + 6;
  if (y + h.offsetHeight > d.clientHeight - 4) y = r.top - dr.top - h.offsetHeight - 6;
  h.style.left = clamp(x, 4, d.clientWidth - h.offsetWidth - 4) + 'px'; h.style.top = y + 'px';
}
function hideName() { $('htip').style.display = 'none'; }

// ------------------------------------------------------------------ dialogs: one question at a time
let DL = null;
function step(o) {
  DL = o;
  const box = $('dlg').querySelector('.box'); box.className = 'box' + (o.wide ? ' wide' : '');
  box.innerHTML = (o.n ? `<div class="stepn">Step ${o.n}${o.total ? ' of ' + o.total : ''}</div>` : '') + `<h3>${esc(o.title)}${o.tip ? ii(o.tip) : ''}</h3>` + (o.text ? `<p>${o.text}</p>` : '') + (o.html || '') +
    `<div class="opts">${(o.opts || []).map((x, i) => `<button class="b wide ${x[2] || ''}" onclick="DL.opts[${i}][1]()" ${x[3] ? 'disabled' : ''}>${x[0]}</button>`).join('')}</div>` +
    `<div class="foot">${o.back ? B('Back', 'DL.back()') : '<span></span>'}${o.cancel === false ? '' : B(o.cancelLabel || 'Cancel', 'cancelBox()')}</div>`;
  $('dlg').classList.add('show'); if (o.after) o.after();
}
function closeBox() { $('dlg').classList.remove('show'); DL = null; }
function cancelBox() { const o = DL; closeBox(); S.stopListen(); if (o && o.onCancel) o.onCancel(); }
function message(title, text) { step({ title, text, cancel: false, opts: [['OK', closeBox]] }); }
function busy(title, text) { step({ title, text, cancel: false, opts: [] }); }

// ------------------------------------------------------------------ A1: keep the scroll position on every redraw
function saveScroll() { const m = {}; document.querySelectorAll('[data-keep]').forEach((e) => { m[e.dataset.keep] = [e.scrollLeft, e.scrollTop]; }); return m; }
function restoreScroll(m) { document.querySelectorAll('[data-keep]').forEach((e) => { const v = m[e.dataset.keep]; if (v) { e.scrollLeft = v[0]; e.scrollTop = v[1]; } }); }
const KEEP = {};   // remembered between screens too
function rememberScroll() { Object.assign(KEEP, saveScroll()); }

// ------------------------------------------------------------------ state
const ui = { screen: 'welcome', welcome: 0, micAsked: false, micOk: false, waves: localStorage.getItem('cz.waves') !== '0', selT: 0, pickMode: 'demo', runUp: +(localStorage.getItem('cz.runUp') || 5), runUpUsed: !!localStorage.getItem('cz.runUp') };
const song = () => S.song;
const pol = () => S.polished();
const tracksShown = () => song().tracks.slice(0, song().shown);
const ch = (id) => (id === 'd' ? song().drums.ch : id === 'm' ? null : song().tracks[+id]);
const colOf = (id) => (id === 'd' ? DRUMCOL : id === 'm' ? '#E2BF6A' : COL[+id % COL.length]);
const nameOf = (id) => (id === 'd' ? 'Drums' : id === 'm' ? 'Master' : song().tracks[+id].name);
// fader position (0..1) and dB: 0.8 is 0 dB, the top is +6 dB, the bottom is off
const posToDb = (v) => (v < 0.01 ? -60 : v >= 0.8 ? (v - 0.8) / 0.2 * 6 : (v - 0.8) / 0.8 * 60);
const dbToPos = (db) => (db <= -59.5 ? 0 : db >= 0 ? 0.8 + db / 6 * 0.2 : 0.8 + db / 60 * 0.8);
const dbText = (db) => (db <= -59.5 ? '-inf' : (db > 0 ? '+' : '') + db.toFixed(1) + ' dB');

// ------------------------------------------------------------------ menu
function openMenu() {
  const items = [['Mixer', "go('mix')"], ['Edit Mode', "go('edit')"], ['Drum programmer', "go('drums')"], ['Mastering', "openFx('m','eq')", !pol()], ['Export', 'exportFlow()'],
    [BOOK(18) + 'Lt. Joe Bookman', "go('lib')"], [BLASTER(14) + 'Ultrasound Machine', "go('um')"], [TUNEI + 'Tuner', 'openTuner()'], ['Input and Output', "go('io')"],
    ['Tempo and loop', 'tempoDialog()'], ['Mode: ' + (pol() ? 'Polished' : 'Demo'), 'changeMode()'], ['New song', 'newSongFlow()'], ['Open a song', 'openSongs()'],
    ['Undo last take', 'undoTake()'], ['Save now', "S.saveNow().then(()=>toast('Saved.'))"], ['Help', 'helpBox()']];
  $('menuPan').innerHTML = items.map(([l, a, off]) => `<div class="hx ${off ? 'off' : ''}" onclick="closeMenu();${a}"><span>${l}</span>${off ? '<small style="font-size:9px;color:var(--dim)">Polished only</small>' : ''}</div>`).join('') +
    `<div class="hx" onclick="toggleHH()"><span>Hand Hold ${ii('hh')}</span><span class="tg ${handHold() ? 'on' : ''}"><i></i></span></div>
     <div class="dim" style="text-align:center;margin-top:4px">Conceptor ${CZ.VERSION}</div>`;
  $('menu').classList.add('show');
}
function closeMenu() { $('menu').classList.remove('show'); }
function toggleHH() { setHandHold(!handHold()); toast(handHold() ? 'Hand Hold on.' : 'Hand Hold off.'); openMenu(); }
function undoTake() { toast(S.undoTake() ? 'Last take removed.' : 'Nothing to undo.'); render(); }

// ------------------------------------------------------------------ render
const screens = {}, after = {};
function go(s) {
  S.stopListen(); closeMenu(); rememberScroll();
  if (ui.screen === 'drums' && s !== 'drums' && S.previewPat) S.stop();
  if (s === 'um' || s === 'lib') { libRefresh(); }
  if (ui.screen === 'um' && s !== 'um') umPause();
  ui.screen = s; render();
}
function render() {
  const keep = Object.assign({}, KEEP, saveScroll());
  const A = $('app');
  if (ui.screen === 'intro') A.innerHTML = introHTML();
  else if (ui.screen === 'welcome') A.innerHTML = welcome();
  else if (ui.screen === 'songs') A.innerHTML = songsScreen();
  else if (ui.screen === 'mode') A.innerHTML = modeScreen();
  else A.innerHTML = topBar() + `<div class="main">${screens[ui.screen]()}</div>`;
  if (after[ui.screen]) after[ui.screen]();
  restoreScroll(keep); Object.assign(KEEP, keep);
  live();
}
function topBar() {
  const sc = ui.screen, home = sc === 'mix' ? '' : B(HIVE + 'Home', 'goHome()', 's', 'data-n="Home: the tracking screen"');
  const title = { mix: '', edit: 'EDIT MODE', drums: 'GILLIAN AND STEPHEN', lib: 'LT. JOE BOOKMAN', um: 'ULTRASOUND MACHINE', io: 'INPUT AND OUTPUT' }[sc];
  const playing = S.playing && !S.recording, rec = S.recording && S.dropTrack == null, drop = S.recording && S.dropTrack != null;
  return `<div class="top" data-keep="top">${home}<span class="brand">CONCEPTOR</span>${title ? `<span class="ttl">${title}</span>` : ''}<span class="song" onclick="renameSongFlow()" data-n="Song name: tap to rename">${esc(song().name)}</span><span class="mode ${pol() ? 'p' : ''}" onclick="changeMode()" data-n="Mode: tap to change Demo or Polished">${pol() ? 'POLISHED' : 'DEMO'}</span>
    <span class="sp"></span><span class="clock" id="clock" data-n="Counter: green playing, orange counting down, red recording">${fmtC(S.now())}</span>
    <span class="tp">${B(BACKI, 'tStart()', 't', 'data-n="Stop and go to the start"')}${B(playing ? STOPI : PLAYI, 'tPlay()', 't gplay ' + (playing ? 'on' : ''), 'data-n="Play / Stop"')}${B(RECI, 'tRec()', 't ' + (rec ? 'rec' : 'grec'), 'data-n="Record the armed tracks"')}
      ${B(DROPI, 'dropIn()', 't ' + (drop ? 'rec' : ''), 'data-n="Drop In: pick a track and a run-up, then record from the cursor"')}${B(LOOPI, 'toggleLoop()', 't ' + (song().loop ? 'on' : ''), 'data-n="Loop"')}${B(CLICKI, 'toggleClick()', 't ' + (song().click ? 'on' : ''), 'data-n="Click (metronome)"')}${ii('drop')}</span>
    <span class="sp"></span>${B(TUNEI, 'openTuner()', 'r', 'data-n="Guitar tuner"')}${B('Menu', 'openMenu()', '', 'data-n="Menu"')}${ii('menu')}</div>`;
}
function goHome() { closeBox(); closePop(true); $('tip').classList.remove('show'); S.stopListen(); if (S.playing) S.stop(); go('mix'); }

// ------------------------------------------------------------------ transport
async function tPlay() { if (S.playing) S.stop(); else { if (S.previewPat) S.stop(); await S.play(); } }
async function tRec() {
  if (S.recording) { S.stop(); toast('Recording stopped.'); return; }
  const r = await S.record();
  if (r === 'noarm') toast('Tap R on a track first.');
  else if (r === 'noinput') toast('The armed track has no input. Tap In on the track and pick one.');
  else if (r === 'nomic') message('Record', 'Recording needs the microphone. Allow it in the browser settings for this page.');
  else if (r === 'ok') toast('Recording ' + plural(S.recArmed.length, 'track') + '.');
}
function tStart() { const was = S.playing || S.recording; S.rewind(); if (was) toast('Stopped. Back to the start.'); render(); }   // A3
function toggleLoop() { song().loop = !song().loop; S.changed('loop'); render(); }
function toggleClick() { song().click = !song().click; S.changed('click'); render(); }
// D1: Drop In, as in Birthing Unit. Which track, then the run-up, then straight in.
function dropIn(pre) {
  if (S.recording) { S.stop(); toast('Drop In stopped.'); return; }
  const list = tracksShown().map((t, i) => [t, i]);
  const tot = pre == null ? 2 : 1;
  const ask2 = (i) => step({ title: 'Drop In', tip: 'drop', n: tot, total: tot, text: `Run-up: seconds of playback before recording starts on <b>${esc(song().tracks[i].name)}</b> at ${fmtC(S.pos)}.`,
    opts: [1, 2, 3, 5, 8].map((x) => [x + ' seconds' + (x === ui.runUp ? (ui.runUpUsed ? ' (last used)' : ' (default)') : ''), () => { ui.runUp = x; ui.runUpUsed = true; localStorage.setItem('cz.runUp', x); closeBox(); dropGo(i); }, x === ui.runUp ? 'on' : '']),
    back: pre == null ? ask1 : null });
  const ask1 = () => step({ title: 'Drop In', tip: 'drop', n: 1, total: 2, text: 'Which track?', opts: list.map(([t, i]) => [esc(t.name), () => ask2(i)]) });
  if (pre == null) ask1(); else ask2(pre);
}
async function dropGo(i) {
  if (S.playing) S.stop();
  const r = await S.dropIn(i, ui.runUp);
  if (r === 'nomic') message('Drop In', 'Recording needs the microphone. Allow it in the browser settings for this page.');
  render();
}

// ------------------------------------------------------------------ welcome, songs, mode
function welcome() {
  let body;
  if (ui.welcome === 0) body = `<p>Record ideas on a phone or computer. Twelve tracks plus drums, with amps, pedals and effects built in.</p>${B('Start', 'wStart()', 'on wide')}`;
  else if (ui.welcome === 1) body = `<p>Conceptor needs the microphone to record.</p>
      ${ui.micAsked && !ui.micOk ? '<p class="dim">The microphone was not allowed. Playback and mixing still work. Recording does not.</p>' : ''}
      ${ui.micOk ? B('Next', 'ui.welcome=2;render()', 'on wide') : B('Allow the microphone', 'wMic()', 'on wide') + B('Carry on without it', 'ui.welcome=2;render()', 'wide')}`;
  else body = `<p>Name the first song. Leave it as it is to name it later.</p><input id="firstName" class="text" value="${esc('Untitled - ' + CZ.today())}">${B('Create the song', 'wCreate()', 'on wide')}`;
  return `<div class="welcome"><img src="art.jpg" alt=""><div class="wbox"><h1>CONCEPTOR</h1>${body}</div></div>`;
}
async function wStart() { await S.startAudio(); ui.welcome = 1; render(); }
async function wMic() { await S.startAudio(); ui.micOk = await S.openMic(); ui.micAsked = true; render(); }
async function wCreate() { await S.newSong($('firstName').value); localStorage.setItem('cz.intro', '1'); askMode(); }
let SONGLIST = [];
async function openSongs() { if (S.song) await S.saveNow(); const all = await S.allSongs(); SONGLIST = all.sort((a, b) => (b.saved || 0) - (a.saved || 0)).map((x) => ({ name: x.name, mode: x.mode, saved: x.saved })); ui.screen = 'songs'; render(); }
function songsScreen() {
  return `<div class="top"><span class="brand">CONCEPTOR</span><span class="ttl">OPEN A SONG</span><span class="sp"></span>${S.song ? B(HIVE + 'Back to ' + esc(song().name), "go('mix')", 's') : ''}</div><div class="scroll" data-keep="songs"><div style="max-width:560px;margin:0 auto">
    <div class="lab" style="margin:6px 0">SONGS</div>
    ${SONGLIST.map((s, i) => `<div class="file" style="cursor:pointer" onclick="pickSong(${i})"><span class="fn">${esc(s.name)}<small>${s.mode === 'polished' ? 'Polished' : 'Demo'} · saved ${dateOf(s.saved)}</small></span>&#8250;</div>`).join('')}
    <div style="margin-top:10px">${B('New song', 'newSongFlow()', 'on wide')}</div></div></div>`;
}
const dateOf = (t) => { const d = new Date(t || Date.now()); return d.getDate() + ' ' + CZ.MONTHS[d.getMonth()] + ' ' + d.getFullYear(); };
async function pickSong(i) { if (await S.load(SONGLIST[i].name)) askMode(); }
async function newSongFlow() { await S.newSong(null); askMode(); }
const MODE_TEXT = { demo: 'Simple recording and arranging for capturing ideas quickly. No mastering section; export includes trim only.', polished: 'Full feature set, including the mastering section. For tracks being prepared for release.' };
function askMode() { ui.pickMode = song().mode || 'demo'; ui.screen = 'mode'; render(); }
function modeScreen() {
  const c = (m, t) => `<button class="file mcard ${ui.pickMode === m ? 'sel' : ''}" onclick="ui.pickMode='${m}';render()"><b style="color:var(--gold);font-size:14px">${ui.pickMode === m ? '&#9673;' : '&#9675;'} ${t}</b><p style="margin-top:6px;font-size:12px;line-height:1.4">${MODE_TEXT[m]}</p></button>`;
  return `<div class="top"><span class="brand">CONCEPTOR</span><span class="song">${esc(song().name)}</span>${ii('mode')}</div><div class="scroll" data-keep="mode"><div style="max-width:640px;margin:0 auto">
    <div class="lab" style="margin:4px 0 8px">CHOOSE A MODE</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${c('demo', 'Demo Mode')}${c('polished', 'Polished Mode')}</div>
    <p class="dim" style="margin:6px 2px 10px">The mode can be changed later in the Menu.</p>${B('Open song', 'confirmMode()', 'on wide')}</div></div>`;
}
function confirmMode() { song().mode = ui.pickMode; S.changed('mode'); go('mix'); }
function changeMode() {
  const s = song();
  step({ title: 'Mode', tip: 'mode', text: `<b>Demo Mode:</b> ${MODE_TEXT.demo}<br><br><b>Polished Mode:</b> ${MODE_TEXT.polished}`, opts: [
    ['Demo Mode', () => { s.mode = 'demo'; closeBox(); S.changed('mode'); render(); toast('Demo Mode.'); }, s.mode === 'demo' ? 'on' : ''],
    ['Polished Mode', () => { s.mode = 'polished'; closeBox(); S.changed('mode'); render(); toast('Polished Mode.'); }, s.mode === 'polished' ? 'on' : '']] });
}
function renameSongFlow(name) {
  name = name || song().name;
  step({ title: 'Rename song', html: `<input id="rn" class="text" value="${esc(name)}">`, opts: [['Save', async () => { const n = await S.renameSong(name, $('rn').value); closeBox(); toast('Renamed: ' + n); render(); if (ui.screen === 'lib') libRefresh(); }]] });
  setTimeout(() => $('rn') && $('rn').select(), 30);
}
function tempoDialog() {
  const s = song(), ls = s.loopStart, le = s.loopEnd;
  step({ title: 'Tempo and loop', tip: 'tempo', cancelLabel: 'Done', html: `<div class="row" style="gap:12px;margin-bottom:8px"><div id="tempoK"></div><span class="dim">Tempo sets the speed of the click and the drums.</span></div>
    <div class="lab" style="margin:6px 0">LOOP</div><p>Loop plays one part again and again. Move the cursor, then set the start and the end.</p>
    <div class="row" style="flex-wrap:wrap">${B('Start here', 'song().loopStart=S.now();S.changed();tempoDialog()', 's')}${B('End here', 'song().loopEnd=S.now();S.changed();tempoDialog()', 's')}${B('Whole song', 'song().loopStart=0;song().loopEnd=0;S.changed();tempoDialog()', 's')}${B(s.loop ? 'Loop is on' : 'Loop is off', 'toggleLoop();tempoDialog()', 's ' + (s.loop ? 'on' : ''))}</div>
    <p class="dim" style="margin-top:6px">${le > ls + 0.05 ? `Loop: ${fmt(ls)} to ${fmt(le)}` : 'Loop: the whole song'}</p>`,
    after: () => { $('tempoK').innerHTML = knob('tempo', 'Tempo', () => (s.bpm - 40) / 2, (v) => { s.bpm = Math.round(40 + v * 2); CZ.fillPh(s); S.changed('tempo'); }, 44, () => Math.round(s.bpm) + ' bpm'); wireControls($('tempoK')); } });
}
const HELP = `Recording
1. Tap R on a track. It turns red. Two tracks can record at once, each from its own input (the In box).
2. Press the red record button in the top bar. Play or sing.
3. Press Play / Stop. The recording is on that track.
Wear headphones, so the microphone does not pick up the playback.

Drop In
Put the cursor where recording should start. Press Drop In, pick the track and the run-up. The counter counts down in orange, then records in red until Stop.

Hand Hold
The small (i) buttons explain each feature. With Hand Hold on, pointing at a control shows its full name (press and hold on a phone). Switch it off in the Menu.

Lt. Joe Bookman
The library. Songs, mixes, tracks, imported files, drum samples and playlists. Files are deleted only here.

Limits
Twelve tracks plus drums. Each track holds up to four minutes. One stereo output.`;
function helpBox() { step({ title: 'Help', html: `<div class="help">${esc(HELP)}</div>`, cancelLabel: 'Close', wide: true }); }

// ------------------------------------------------------------------ controls: fader, knob
function faderHTML(id, db) { const v = dbToPos(db); return `<div class="fader" data-f="${id}"><div class="ln"></div><div class="fill" style="height:calc((100% - 12px) * ${v})"></div><div class="zero" style="bottom:calc(6px + (100% - 12px) * .8)"></div><div class="cap" style="top:calc(6px + (100% - 12px) * ${1 - v})"></div></div>`; }
function knobSVG(v, size = 30, col = '#B9AAE0') {
  const a = (-135 + v * 2.7) * Math.PI / 180, x = 16 + 11 * Math.sin(a), y = 16 - 11 * Math.cos(a);
  return `<svg width="${size}" height="${size}" viewBox="0 0 32 32"><circle cx="16" cy="16" r="13" fill="#2E2F34" stroke="#484A51" stroke-width="1.5"/><line x1="${(16 + 4 * Math.sin(a)).toFixed(1)}" y1="${(16 - 4 * Math.cos(a)).toFixed(1)}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${col}" stroke-width="2.4" stroke-linecap="round"/></svg>`;
}
const KN = {};   // knob registry: key -> [get (0..100), set, text]
function knob(key, label, get, set, size, text, cls = '', attr = '') {
  KN[key] = [get, set, text];
  return `<div class="knob ${cls}" data-k="${key}" data-s="${size || 30}" ${attr} tabindex="0" role="slider" aria-label="${esc(label || 'Pan')}">${knobSVG(get(), size)}<span class="kl">${esc(label)}</span><br><b class="kv">${text ? text() : Math.round(get())}</b></div>`;
}
function wireControls(root = document) {
  root.querySelectorAll('.knob[data-k]').forEach((el) => {
    const upd = () => { const k = KN[el.dataset.k]; el.querySelector('svg').outerHTML = knobSVG(k[0](), +el.dataset.s); el.querySelector('.kv').textContent = k[2] ? k[2]() : Math.round(k[0]()); };
    el.onpointerdown = (e) => {
      e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (x) {}
      const k = KN[el.dataset.k], y0 = e.clientY, v0 = k[0]();
      el.onpointermove = (ev) => { k[1](clamp(Math.round(v0 + (y0 - ev.clientY) * 0.8), 0, 100)); upd(); };
      el.onpointerup = el.onpointercancel = () => { el.onpointermove = null; };
    };
    el.ondblclick = () => { const k = KN[el.dataset.k]; if (el.dataset.k.startsWith('pan')) { k[1](50); upd(); } };
    el.onkeydown = (e) => { if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return; e.preventDefault(); const k = KN[el.dataset.k]; k[1](clamp(k[0]() + (e.key === 'ArrowUp' ? 2 : -2), 0, 100)); upd(); };
  });
  root.querySelectorAll('.fader[data-f]').forEach((el) => {
    el.onpointerdown = (e) => {
      e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (x) {}
      const id = el.dataset.f;
      const set = (ev) => {
        const r = el.getBoundingClientRect(), v = clamp(1 - (ev.clientY - r.top - 6) / (r.height - 12), 0, 1), db = Math.round(posToDb(v) * 10) / 10;
        if (id === 'm') song().masterVol = db; else ch(id).vol = db;
        el.querySelector('.fill').style.height = `calc((100% - 12px) * ${v})`; el.querySelector('.cap').style.top = `calc(6px + (100% - 12px) * ${1 - v})`;
        const d = el.closest('.strip') && el.closest('.strip').querySelector('.db'); if (d) d.textContent = dbText(db);
        S.changed('fader');
      };
      set(e); el.onpointermove = set; el.onpointerup = el.onpointercancel = () => { el.onpointermove = null; };
    };
    el.ondblclick = () => { const id = el.dataset.f; if (id === 'm') song().masterVol = 0; else ch(id).vol = 0; S.changed('fader'); render(); };
  });
}

// ------------------------------------------------------------------ C: the tracking screen (mixer)
const inpBox = (i) => { const t = song().tracks[i]; return `<div class="inp ${t.input === 'none' ? 'none' : ''}" onclick="event.stopPropagation();pickInput(${i})" data-n="Input selector: which input feeds ${esc(t.name)}"><span>In</span><b>${CZ.inputShort(t.input)}</b></div>`; };
const patBox = () => `<div class="inp" onclick="event.stopPropagation();go('drums')" style="justify-content:center" data-n="Pattern: open the drum programmer"><b>Pattern</b></div>`;
const bR = (i) => B('R', `event.stopPropagation();arm(${i})`, 's r ' + (song().tracks[i].arm ? 'rec' : ''), 'data-n="Record arm"');
const bM = (id) => B('M', `event.stopPropagation();toggleMS('${id}','mute')`, 's r ' + (ch(id).mute ? 'on' : ''), 'data-n="Mute"');
const bS = (id) => B('S', `event.stopPropagation();toggleMS('${id}','solo')`, 's r ' + (ch(id).solo ? 'yel' : ''), 'data-n="Solo"');
const bFX = (id) => B('FX', `event.stopPropagation();openFx('${id}','${id === 'd' ? 'comp' : 'amp'}')`, 's', 'data-n="Effects"');
const bEQ = (id) => B('EQ', `event.stopPropagation();openFx('${id}','eq')`, 's', 'data-n="7-band EQ"');
const bW = (i) => B('Wave', `event.stopPropagation();openWave(${i})`, 's', (song().tracks[i].audio ? '' : 'disabled ') + 'data-n="Wave edit: Trim, Insert Silence, Clip Gain"');
const panKnob = (id, size) => knob('pan' + id, 'Pan', () => (ch(id).pan + 1) * 50, (v) => { ch(id).pan = v / 50 - 1; S.changed('pan'); }, size, () => { const p = ch(id).pan; return Math.abs(p) < 0.02 ? 'C' : (p < 0 ? 'L' : 'R') + Math.round(Math.abs(p) * 100); }, 'kc', 'data-n="Pan knob"');
function toggleMS(id, k) { const c = ch(id); c[k] = !c[k]; S.changed('ms'); render(); }
const MENUSTRIP = () => [['Edit Mode', "go('edit')"], ['Drums', "go('drums')"], ['Mastering', "openFx('m','eq')", !pol()], ['Export', 'exportFlow()'], [BOOK(14) + 'Lt. Joe Bookman', "go('lib')"], [BLASTER(10) + 'Ultrasound', "go('um')"], [TUNEI + 'Tuner', 'openTuner()'], ['Input and Output', "go('io')"]]
  .map(([l, a, off]) => B(l, a, 's', (off ? 'disabled ' : '') + `data-n="${l.replace(/<[^>]+>/g, '')}${off ? ' (Polished only)' : ''}"`)).join('');
screens.mix = () => {
  const s = song();
  let h = `<div class="mixmain ${ui.waves ? '' : 'nowaves'}">${ui.waves ? `<div class="upper">${lanesHTML('mini')}</div>` : ''}
    <div class="mstrip" data-keep="mstrip">${MENUSTRIP()}<span class="sp"></span>${B(ui.waves ? 'Hide waves' : 'View All Waves', 'toggleWaves()', 's ' + (ui.waves ? 'on' : ''), 'data-n="View All Waves: show or hide every track\'s waveform"')}${ii('waves')}${ii('strips')}</div>
    <div class="mixer" data-keep="mixer">`;
  // the drum channel first, then the audio tracks
  const dc = s.drums.ch;
  h += `<div class="strip"><div class="tab" style="background:${DRUMCOL}"></div><div class="nm" style="border-color:${DRUMCOL}" onclick="go('drums')" data-n="Drums: open the drum programmer">Drums ${ii('drumstrip')}</div>
    <div class="sbody"><div class="sc"><div class="row" style="width:100%;gap:3px">${patBox()}${panKnob('d', 20)}</div>
      <div class="btns">${bFX('d')}${bEQ('d')}</div><div class="btns">${bM('d')}${bS('d')}</div></div>
    <div class="fz">${faderHTML('d', dc.vol)}<div class="meter"><i id="mt-d"></i></div></div></div><div class="db">${dbText(dc.vol)}</div></div>`;
  tracksShown().forEach((t, i) => {
    h += `<div class="strip"><div class="tab" style="background:${colOf(i)}"></div>
      <div class="nm" style="border-color:${colOf(i)}" onclick="trackMenu(${i})" data-n="Track name: rename, import audio or clear">${esc(t.name)}</div>
      <div class="sbody"><div class="sc"><div class="row" style="width:100%;gap:3px">${inpBox(i)}${panKnob(i, 20)}</div>
        <div class="btns">${bFX(i)}${bEQ(i)}${bW(i)}</div><div class="btns">${bR(i)}${bM(i)}${bS(i)}</div></div>
      <div class="fz">${faderHTML(i, t.vol)}<div class="meter"><i id="mt-${i}"></i></div></div></div><div class="db">${dbText(t.vol)}</div></div>`;
  });
  if (s.shown < CZ.TRACKS) h += `<div class="strip add" onclick="addTrack()" data-n="Add an audio track"><b style="font-size:18px;color:var(--gold)">+</b>Add track<span style="font-size:8px">${s.shown} of 12</span></div>`;
  const mb = (l, tab, n) => B(l, `openFx('m','${tab}')`, 's', (pol() ? '' : 'disabled ') + `data-n="${n}${pol() ? '' : ' (Polished only)'}"`);
  h += `<span class="sp"></span><div class="strip master"><div class="tab" style="background:var(--gold)"></div><div class="nm" style="border-color:var(--gold);color:var(--gold)">Master ${ii('master')}</div>
    <div class="sbody"><div class="sc"><div class="btns">${mb('EQ', 'eq', 'Mastering 7-band EQ')}${mb('Comp', 'comp', 'Mastering compressor')}</div><div class="btns">${mb('Loud', 'loud', 'Loudness')}${mb('Ceil', 'ceil', 'Ceiling (limiter)')}</div>
      <div class="btns">${B('Export', 'exportFlow()', 's on', 'data-n="Export"')}</div>${pol() ? '' : '<span class="dim" style="font-size:8px;text-align:center">Mastering: Polished only</span>'}</div>
    <div class="fz">${faderHTML('m', s.masterVol)}<div class="meter"><i id="mt-L"></i></div><div class="meter"><i id="mt-R"></i></div></div></div><div class="db">${dbText(s.masterVol)}</div></div>`;
  return h + `</div></div>`;
};
after.mix = () => { wireControls(); lanesAfter(); };
function toggleWaves() { ui.waves = !ui.waves; localStorage.setItem('cz.waves', ui.waves ? '1' : '0'); render(); }
async function arm(i) {
  const t = song().tracks[i]; if (S.recording) return;
  t.arm = !t.arm;
  const armed = song().tracks.filter((x) => x.arm);
  if (t.arm && armed.length > 2) { t.arm = false; toast('Two tracks can record at once.'); return; }
  if (t.arm) { await S.startAudio(); if (!(await S.openMic())) { t.arm = false; message('Record', 'Recording needs the microphone. Allow it in the browser settings for this page.'); render(); return; } }
  if (armed.length === 2 && armed[0].input === armed[1].input && armed[0].input !== 'none') toast('Both armed tracks use ' + CZ.inputName(armed[0].input) + '. Pick a different input for one of them.');
  if (t.arm && t.input === 'none') toast('This track has no input. Tap In to pick one.');
  S.changed('arm'); render();
}
function pickInput(i) {
  const t = song().tracks[i];
  step({ title: 'Input for ' + t.name, tip: 'input', text: 'Which input feeds this track?', opts: CZ.INPUTS.map(([k, n]) => [n + (t.input === k ? ' (now)' : ''), () => {
    t.input = k; if (k === '12' && t.audio && !t.audioR) t.audioR = t.audio.slice(); if (k !== '12' && t.audioR) { /* keeps the left side */ t.audioR = null; }
    closeBox(); S.changed('input'); render(); }, t.input === k ? 'on' : '']) });
}
function addTrack() { const s = song(); if (s.shown >= CZ.TRACKS) { toast('12 tracks is the most.'); return; } s.shown++; S.changed('add'); render(); }
function trackMenu(i) {
  const t = song().tracks[i];
  step({ title: t.name, tip: 'trackname', opts: [['Rename', () => renameTrack(i)], ['Import audio from this device', () => { closeBox(); pickFile((f) => doImport(i, f[0])); }],
    ['Import audio from Lt. Joe Bookman', () => importFromLib(i)], ['Clear the track', () => step({ title: `Clear ${t.name}?`, text: 'The recording on this track is removed. The effect settings stay. Undo last take in the Menu puts it back.', opts: [['Clear', () => { S.undo = [{ i, audio: t.audio, audioR: t.audioR, fi: t.fi, fo: t.fo }]; const u = S.undo; S.clearTrack(i); S.undo = u; closeBox(); render(); }, 'red']], back: () => trackMenu(i) }), '', !t.audio]] });
}
function renameTrack(i) {
  const t = song().tracks[i];
  step({ title: 'Rename track', html: `<input id="rn" class="text" value="${esc(t.name)}">`, opts: [['Save', () => { t.name = $('rn').value.trim() || 'Track ' + (i + 1); closeBox(); S.changed('name'); render(); }]], back: () => trackMenu(i) });
  setTimeout(() => $('rn') && $('rn').select(), 30);
}
function pickFile(cb, multiple = false) {
  const f = $('file'); f.multiple = multiple; f.value = '';
  f.onchange = () => { if (f.files.length) cb([...f.files]); };
  f.click();
}
async function doImport(i, file) {
  busy('Import', 'Reading ' + esc(file.name) + '.');
  const r = await S.importFile(i, file);
  if (r === 'bad') { message('Import', 'That file could not be read. WAV, MP3, M4A and most audio files work.'); return; }
  try { await S.addFile('imp', file.name, file, 0); } catch (e) {}
  closeBox(); render(); toast(r === 'cut' ? 'Imported. Only the first 4 minutes fit.' : 'Imported. Also kept in Lt. Joe Bookman, Imported.');
}

// ------------------------------------------------------------------ lanes: View All Waves (mini heads) and Edit Mode (full heads)
const PKS = new WeakMap();
function peaksFor(t) {
  const a = t.audio; if (!a) return null;
  let p = PKS.get(a);
  if (!p || p.gain !== t.gain || p.fi !== t.fi || p.fo !== t.fo) { const chs = CZ.trackChannels(t, S.sr); p = { gain: t.gain, fi: t.fi, fo: t.fo, pk: CZ.peaks(chs, Math.max(64, Math.floor(a.length / 3000))) }; PKS.set(a, p); }
  return p.pk;
}
let PXS = 5;
function lanesHTML(kind, availW) {
  const s = song(), L = Math.max(30, S.length() + 5), HW = kind === 'mini' ? 96 : (document.body.classList.contains('computer') ? 300 : 250);
  const avail = Math.max(200, (availW || $('app').clientWidth) - HW - 12);
  PXS = clamp(avail / L, 2, 40);
  const w = Math.ceil(L * PXS) + 40;
  const stepT = PXS > 20 ? 1 : PXS > 8 ? 5 : PXS > 4 ? 10 : 30;
  let ruler = ''; for (let t = 0; t <= L; t += stepT) ruler += `<span style="left:${t * PXS}px">${fmt(t)}</span>`;
  let h = `<div class="lanes" data-keep="lanes-${kind}"><div style="position:relative;width:${w + HW}px;min-width:100%">
    <div style="display:flex;position:sticky;top:0;z-index:6"><div class="lcorner" style="width:${HW}px">Cursor <b id="curLab" style="color:var(--gold)">${fmtC(S.now())}</b> ${kind === 'full' ? ii('cursor') : ''}</div>
    <div class="ruler" id="ruler" style="width:${w}px;flex:1 0 auto" data-n="Ruler: tap or drag to move the cursor">${ruler}</div></div><div style="position:relative">`;
  // drum lane: the Pattern Compile row as blocks
  const d = s.drums, sel = (id) => kind === 'full' && String(ui.selT) === String(id);
  const head = (id) => {
    const audio = id !== 'd', t = ch(id);
    if (kind === 'mini') return `<div class="lhead mini" style="width:${HW}px"><span class="nm" style="border-color:${colOf(id)}">${esc(nameOf(id))}</span><div class="row">${bM(id)}${bS(id)}</div></div>`;
    return `<div class="lhead" style="width:${HW}px" onclick="ui.selT='${id}';render()"><div class="row"><span class="nm" style="border-color:${colOf(id)};flex:1">${esc(nameOf(id))}</span>${audio ? inpBox(id) : patBox()}</div>
      <div class="row">${audio ? bR(id) : ''}${bM(id)}${bS(id)}${bFX(id)}${bEQ(id)}${audio ? bW(id) : ''}</div>
      <div class="row">${panKnob(id, 18)}<input type="range" class="hf" min="0" max="1000" value="${Math.round(dbToPos(t.vol) * 1000)}" data-n="Volume fader" onclick="event.stopPropagation()" oninput="laneVol('${id}',this)"><span class="dim" style="font-size:9px">${dbText(t.vol)}</span></div></div>`;
  };
  let blocks = '', at = 0;
  d.comp.forEach((b) => { const p = CZ.pat(d, b.p); if (!p) return; const sec = CZ.patSec(s, p); blocks += `<div class="clip" style="left:${at * PXS}px;width:${Math.max(2, sec * PXS - 1)}px;background:${p.color}${b.ph ? '14' : '29'};opacity:${d.ch.mute ? 0.35 : 1}"><div class="tt" style="background:${p.color}c7">${b.ph ? 'Placeholder' : esc(p.name)}</div></div>`; at += sec; });
  h += `<div class="lane ${sel('d') ? 'sel' : ''} ${kind === 'mini' ? 'mini' : ''}">${head('d')}<div class="larea" style="width:${w}px;flex:1 0 auto" onclick="ui.selT='d';${kind === 'full' ? 'render()' : ''}">${blocks}</div></div>`;
  tracksShown().forEach((t, i) => {
    h += `<div class="lane ${sel(i) ? 'sel' : ''} ${kind === 'mini' ? 'mini' : ''}">${head(i)}
      <div class="larea" style="width:${w}px;flex:1 0 auto" onclick="ui.selT=${i};${kind === 'full' ? 'render()' : ''}">${t.audio ? `<div class="clip" style="left:0;width:${t.audio.length / S.sr * PXS}px;background:${colOf(i)}29;opacity:${t.mute ? 0.35 : 1}"><div class="tt" style="background:${colOf(i)}c7">${esc(t.name)}${t.audioR ? ' · stereo' : ''}${t.gain ? ` · ${t.gain > 0 ? '+' : ''}${t.gain} dB` : ''}</div><canvas data-wave="${i}"></canvas></div>` : ''}</div></div>`;
  });
  return h + `<div class="cursor" id="ecur" style="left:${S.now() * PXS + HW}px"></div></div></div></div>`;
}
function laneVol(id, el) { const db = Math.round(posToDb(el.value / 1000) * 10) / 10; ch(id).vol = db; el.nextElementSibling.textContent = dbText(db); S.changed('fader'); }
function lanesAfter() {
  wireControls();
  document.querySelectorAll('canvas[data-wave]').forEach((c) => {
    const i = +c.dataset.wave, t = song().tracks[i], pk = peaksFor(t); if (!pk) return;
    const g = c.getContext('2d'); c.width = Math.max(1, Math.min(8000, c.clientWidth * 2)); c.height = Math.max(1, c.clientHeight * 2);
    g.fillStyle = colOf(i); const n = pk.length;
    for (let x = 0; x < c.width; x++) { const k0 = Math.floor(x / c.width * n), k1 = Math.max(k0 + 1, Math.floor((x + 1) / c.width * n)); let m = 0; for (let k = k0; k < k1 && k < n; k++) m = Math.max(m, pk[k]); const bh = Math.max(1, Math.min(1, m) * c.height * 0.92); g.fillRect(x, (c.height - bh) / 2, 1, bh); }
  });
  const r = $('ruler'); if (!r) return;
  r.onpointerdown = (e) => {
    try { r.setPointerCapture(e.pointerId); } catch (x) {}
    const was = S.playing && !S.recording; if (S.recording) return; if (was) S.stop();
    const mv = (ev) => { S.pos = clamp((ev.clientX - r.getBoundingClientRect().left) / PXS, 0, S.length() + 5); live(); };   // scrub: the cursor follows the finger
    mv(e); r.onpointermove = mv; r.onpointerup = r.onpointercancel = () => { r.onpointermove = null; if (was) S.play(); };
  };
}

// ------------------------------------------------------------------ E: Edit Mode
screens.edit = () => {
  const sel = ui.selT, ok = sel !== 'd' && song().tracks[+sel] && +sel < song().shown;
  return `<div class="row" style="padding:5px 10px;border-bottom:1px solid var(--line);background:var(--panel);flex:none;flex-wrap:wrap">${B('&#9664; 5 s', 'nudge(-5)', 's', 'data-n="Cursor back 5 seconds"')}${B('5 s &#9654;', 'nudge(5)', 's', 'data-n="Cursor forward 5 seconds"')}${ii('cursor')}
    <span class="sp"></span><span class="dim">Track: <b style="color:var(--gold)">${ok ? esc(song().tracks[+sel].name) : 'tap a track'}</b></span>
    ${B('Trim', "editTool('trim')", 's', 'data-n="Trim the selected track"')}${B('Insert Silence', "editTool('sil')", 's', 'data-n="Insert Silence: paint over a part of the selected track"')}${B(DROPI + 'Drop In', 'editDrop()', 's', 'data-n="Drop In on the selected track, from the cursor"')}${ii('edit')}</div>
    ${lanesHTML('full')}`;
};
after.edit = () => lanesAfter();
function nudge(sec) { if (S.recording) return; const was = S.playing; if (was) S.stop(); S.pos = clamp(S.now() + sec, 0, S.length() + 5); if (was) S.play(); live(); }
function pickTrack(then) { step({ title: 'Which track?', opts: tracksShown().map((t, i) => [esc(t.name), () => { closeBox(); ui.selT = i; then(i); }]) }); }
const selAudio = () => (ui.selT !== 'd' && +ui.selT < song().shown ? +ui.selT : -1);
function editTool(tool) { const go_ = (i) => { if (!song().tracks[i].audio) { toast('That track is empty.'); return; } openWave(i, tool); }; selAudio() >= 0 ? go_(selAudio()) : pickTrack(go_); }
function editDrop() { selAudio() >= 0 ? dropIn(selAudio()) : dropIn(); }

// ------------------------------------------------------------------ pop-up sheet
let POP = null;
function openPop(title, bodyFn, o = {}) { POP = Object.assign({ title, bodyFn }, o); drawPop(); $('pop').classList.add('show'); }
function drawPop() {
  if (!POP) return; const k = Object.assign({}, KEEP, saveScroll());
  $('popH').innerHTML = `<span class="ttl">${POP.title}</span>${POP.tip ? ii(POP.tip) : ''}${B('Done', 'closePop()', 'on', 'data-n="Close this panel"')}`;
  $('popB').innerHTML = POP.bodyFn(); wireControls($('popB')); if (POP.after) POP.after(); wireSort(); restoreScroll(k);
}
function closePop(quiet) { if (!POP) return; const f = POP.onClose; POP = null; FXI = null; $('pop').classList.remove('show'); S.stopListen(); if (f) f(); if (!quiet) render(); }

// ------------------------------------------------------------------ C7-C9a: effects pop-up. 'm' = the master channel (mastering), 'd' = drums.
let fxTab = 'amp', FXI = null;
const fxOf = (id) => (id === 'm' ? song().master : ch(id).fx);
const kindOf = (id) => (id === 'm' ? 'master' : id === 'd' ? 'drum' : 'track');
function openFx(id, tab) {
  if (id === 'm' && !pol()) { message('Mastering', 'Mastering is in Polished Mode only. Change the mode in the Menu.'); return; }
  fxTab = tab; FXI = id;
  openPop(id === 'm' ? 'MASTERING · WHOLE MIX' : `EFFECTS · ${esc(nameOf(id)).toUpperCase()}`, () => fxBody(id), { tip: id === 'm' ? 'mastering' : 'effects', after: () => { const c = $('eqc'); if (c) drawEQ(c, fxOf(id)); } });
}
function fxSet() { S.changed('fx'); }
function fxBody(id) {
  const f = fxOf(id), kind = kindOf(id), keys = CZ.ORDER[kind];
  if (!f.order || f.order.length !== keys.length) f.order = keys.slice();
  if (!keys.includes(fxTab)) fxTab = keys[0];
  const isOn = (k) => (k === 'amp' ? f.amp.on || f.pedals.some((p) => p.on) : f[k + 'On']);
  let h = `<div class="lab" style="margin-bottom:3px">SIGNAL CHAIN, LEFT TO RIGHT · DRAG TO REORDER ${ii('chain')}</div><div class="tabs" id="fxtabs">${f.order.map((k) => B('<span class="grip">&#10303;</span>' + CZ.FXLABEL[k] + (isOn(k) ? ' &#9679;' : ''), `if(this._noClick)return;fxTab='${k}';drawPop()`, 's ' + (fxTab === k ? 'on' : ''), `data-k="${k}" data-n="${CZ.FXLABEL[k]}: tap to open, drag to move in the chain"`)).join('')}</div>`;
  const onSw = (k) => `<label class="row onsw" onclick="fxOf('${id}').${k}On=!fxOf('${id}').${k}On;fxSet();drawPop()" data-n="Switch ${CZ.FXLABEL[k]} on or off"><span class="tg ${f[k + 'On'] ? 'on' : ''}"><i></i></span>On</label>`;
  const kset = (k) => `<div class="knobs">${CZ.FXKNOBS[k].map((n, j) => knob(`${k}${id}_${j}`, n, () => f[k][j], (v) => { f[k][j] = v; fxSet(); }, 40, () => CZ.knobText(k, j, f[k][j]))).join('')}</div>`;
  if (fxTab === 'eq') h += onSw('eq') + `<canvas class="eqc" id="eqc" width="1200" height="300" data-n="7-band EQ curve: drag a point up or down"></canvas><div class="row" style="justify-content:space-between;margin-top:4px">${CZ.EQF.map((x, j) => `<span class="dim" style="font-size:9px;text-align:center">${x >= 1000 ? x / 1000 + 'k' : x} Hz<br><b style="color:var(--ink)" id="eqv${j}">${f.eq[j].toFixed(1)} dB</b></span>`).join('')}${ii('eq')}</div>
    <div class="row" style="margin-top:6px">${B('Flat', `fxOf('${id}').eq=[0,0,0,0,0,0,0];fxSet();drawPop()`, 's', 'data-n="Set every band back to 0"')}</div>`;
  else if (fxTab === 'amp') {
    h += `<div class="lab" style="margin-bottom:4px">PEDALBOARD: EVERY PEDAL AT ONCE · DRAG A PEDAL BY ITS NAME TO REORDER ${ii('pedals')}</div><div class="pedals" id="pedalbox" data-keep="pedals">${f.pedalOrder.map((j) => { const p = CZ.PEDALS[j], st = f.pedals[j]; return `<div class="pedal ${st.on ? 'on' : ''}" style="background:${p.c}"><span class="pn" data-n="${p.n}${p.d ? ' (' + p.d + ')' : ''}: drag to move on the board"><span class="grip">&#10303;</span>${p.n}</span><span class="led"></span>
      <div class="row" style="gap:3px">${p.k.map((kn, m) => `<div class="kw">${knob(`pd${id}_${j}_${m}`, kn, () => st.k[m], (v) => { st.k[m] = v; fxSet(); }, 24)}</div>`).join('')}</div>
      <div class="fs" data-n="${p.n} footswitch: on or off" onclick="pedalSw('${id}',${j})"></div></div>`; }).join('')}</div>
      <div class="amp" style="margin-top:8px"><div class="row" style="justify-content:space-between;margin-bottom:6px"><b style="color:var(--gold);font-size:11px;letter-spacing:1px">AMP</b>
      <label class="row onsw" onclick="fxOf('${id}').amp.on=!fxOf('${id}').amp.on;fxSet();drawPop()" data-n="Switch the amp on or off"><span class="tg ${f.amp.on ? 'on' : ''}"><i></i></span>On</label></div>
      <div class="ul" style="margin-bottom:8px">${CZ.AMPSTYLES.map((x) => `<button class="chip ${f.amp.style === x ? 'on' : ''}" onclick="fxOf('${id}').amp.style='${x}';fxOf('${id}').amp.on=true;fxSet();drawPop()" data-n="Amp style: ${x}">${x}</button>`).join('')}</div>
      <div class="knobs">${CZ.AMPKNOBS.map((n, j) => knob(`amp${id}_${j}`, n, () => f.amp.k[j], (v) => { f.amp.k[j] = v; fxSet(); }, 40)).join('')}</div></div>`;
  } else {
    h += onSw(fxTab) + kset(fxTab);
    if (fxTab === 'loud') h += '<p class="dim" style="margin-top:6px">How loud the whole mix is made.</p>';
    if (fxTab === 'ceil') h += '<p class="dim" style="margin-top:6px">The highest level the mix can reach. Stops clipping. Limiting now: <b id="limiting">0.0 dB</b></p>';
  }
  return h;
}
function pedalSw(id, j) { const p = fxOf(id).pedals[j]; p.on = !p.on; fxSet(); drawPop(); }
const FXSHORT = (k) => CZ.FXSHORT[k];
function wireSort() {
  if (FXI == null) return; const f = fxOf(FXI);
  const tb = $('fxtabs'); if (tb) sortable(tb, 'button', null, (a, b) => { const x = f.order.splice(a, 1)[0]; f.order.splice(b, 0, x); fxSet(); drawPop(); toast('Chain: ' + f.order.map(FXSHORT).join(' → ')); });
  const pb = $('pedalbox'); if (pb) sortable(pb, '.pedal', '.pn', (a, b) => { const x = f.pedalOrder.splice(a, 1)[0]; f.pedalOrder.splice(b, 0, x); fxSet(); drawPop(); toast('Pedals: ' + f.pedalOrder.map((j) => CZ.PEDALS[j].n).join(' → ')); });
}
function sortable(box, sel, handleSel, onMove) {
  const items = [...box.querySelectorAll(sel)];
  items.forEach((el, idx) => {
    const h = handleSel ? el.querySelector(handleSel) : el; h.style.touchAction = 'none'; h.style.cursor = 'grab';
    h.onpointerdown = (e) => {
      const x0 = e.clientX; let drag = false, line = null, to = idx; try { h.setPointerCapture(e.pointerId); } catch (x) {}
      h.onpointermove = (ev) => {
        if (!drag && Math.abs(ev.clientX - x0) > 6) { drag = true; el.classList.add('dragging'); line = document.createElement('div'); line.className = 'dline'; box.appendChild(line); }
        if (!drag) return;
        const rs = items.map((it) => it.getBoundingClientRect()), br = box.getBoundingClientRect();
        let best = 0, bd = 1e9; rs.forEach((r, j) => { const d = Math.hypot(ev.clientX - (r.left + r.width / 2), ev.clientY - (r.top + r.height / 2)); if (d < bd) { bd = d; best = j; } });
        to = ev.clientX > rs[best].left + rs[best].width / 2 ? best + 1 : best;
        const r = to < items.length ? rs[to] : rs[items.length - 1], x = to < items.length ? r.left : r.right;
        line.style.left = (x - br.left + box.scrollLeft - 4) + 'px'; line.style.top = (r.top - br.top + box.scrollTop) + 'px'; line.style.height = r.height + 'px';
      };
      h.onpointerup = h.onpointercancel = () => { h.onpointermove = null; if (!drag) return; el.classList.remove('dragging'); line.remove(); h._noClick = true; setTimeout(() => { h._noClick = false; }, 60); const dest = to > idx ? to - 1 : to; if (dest !== idx) onMove(idx, dest); };
    };
  });
}
function drawEQ(c, f) {
  const eq = f.eq, g = c.getContext('2d'), W = c.width, H = c.height, X = (fr) => Math.log10(fr / 20) / Math.log10(1000) * W, Y = (db) => H / 2 - db / 15 * (H / 2 - 16);
  const draw = () => {
    g.fillStyle = '#121316'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#2a2b30'; g.lineWidth = 1; [100, 1000, 10000].forEach((fr) => { g.beginPath(); g.moveTo(X(fr), 0); g.lineTo(X(fr), H); g.stroke(); });
    [-12, -6, 0, 6, 12].forEach((d) => { g.strokeStyle = d ? '#2a2b30' : '#4a4c53'; g.beginPath(); g.moveTo(0, Y(d)); g.lineTo(W, Y(d)); g.stroke(); });
    g.beginPath(); for (let x = 0; x <= W; x += 4) { const fr = 20 * Math.pow(1000, x / W); let db = 0; CZ.EQF.forEach((cf, j) => { const o = Math.log2(fr / cf); db += eq[j] * (j === 0 ? (o < 0 ? 1 : Math.exp(-o * o * 1.6)) : j === 6 ? (o > 0 ? 1 : Math.exp(-o * o * 1.6)) : Math.exp(-o * o * 1.6)); }); if (x) g.lineTo(x, Y(db)); else g.moveTo(x, Y(db)); }
    g.strokeStyle = f.eqOn ? '#E2BF6A' : '#6a6c73'; g.lineWidth = 3; g.stroke(); g.lineTo(W, H / 2); g.lineTo(0, H / 2); g.fillStyle = 'rgba(154,214,197,.12)'; g.fill();
    CZ.EQF.forEach((cf, j) => { g.beginPath(); g.arc(X(cf), Y(eq[j]), 12, 0, 7); g.fillStyle = COL[j]; g.fill(); g.fillStyle = '#1B1C1F'; g.font = 'bold 12px Arial'; g.textAlign = 'center'; g.fillText(j + 1, X(cf), Y(eq[j]) + 4); });
  };
  draw(); let band = -1, lastTap = 0, lastBand = -1;
  const upd = () => CZ.EQF.forEach((_, j) => { const e = $('eqv' + j); if (e) e.textContent = eq[j].toFixed(1) + ' dB'; });
  c.onpointerdown = (e) => {
    try { c.setPointerCapture(e.pointerId); } catch (x) {}
    const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W; band = CZ.EQF.reduce((b, cf, j) => (Math.abs(X(cf) - x) < Math.abs(X(CZ.EQF[b]) - x) ? j : b), 0);
    if (performance.now() - lastTap < 320 && lastBand === band) { eq[band] = 0; band = -1; draw(); upd(); fxSet(); }
    lastTap = performance.now(); lastBand = band;
  };
  c.onpointermove = (e) => { if (band < 0) return; const r = c.getBoundingClientRect(), y = (e.clientY - r.top) / r.height * H; eq[band] = clamp(Math.round((H / 2 - y) / (H / 2 - 16) * 15 * 2) / 2, -12, 12); if (!f.eqOn) f.eqOn = true; draw(); upd(); fxSet(); };
  c.onpointerup = c.onpointercancel = () => { band = -1; };
}

// ------------------------------------------------------------------ C10: wave edit pop-up: Trim, Insert Silence (paint), Clip Gain
let WE = null;
function openWave(i, tool) {
  const t = song().tracks[i]; if (!t.audio) { toast('That track is empty.'); return; }
  if (S.playing) S.stop();
  WE = { i, tool: tool || (isLight() ? 'sil' : 'trim'), a: 0, b: t.audio.length, paint: null, gain: t.gain || 0, undo: [], cur: -1, spot: t.spot ? t.spot.slice() : null };
  openPop(`${isLight() ? 'WAVE' : 'WAVE EDIT'} · ${esc(t.name).toUpperCase()}`, waveBody, { tip: 'wave', after: () => drawWave(), onClose: () => { WE = null; } });
}
function waveBody() {
  const w = WE, t0 = song().tracks[w.i], n = t0.audio.length, pending = (w.tool === 'trim' && (w.a > 0 || w.b < n)) || (w.tool === 'sil' && w.paint) || (w.tool === 'gain' && w.gain !== (t0.gain || 0)) || (w.tool === 'spot' && w.spot && w.spot[1] > w.spot[0] && JSON.stringify(w.spot) !== JSON.stringify(t0.spot || null));
  return `<div class="tabs">${isLight() ? '' : B('Trim', "WE.tool='trim';WE.paint=null;drawPop()", 's ' + (w.tool === 'trim' ? 'on' : ''), 'data-n="Trim: drag the two handles"')}${B('Insert Silence', "WE.tool='sil';drawPop()", 's ' + (w.tool === 'sil' ? 'on' : ''), 'data-n="Insert Silence: paint over a part"')}${isLight() ? B('Drop In spots', "WE.tool='spot';WE.paint=null;drawPop()", 's ' + (w.tool === 'spot' ? 'on' : ''), 'data-n="Drop In spots: tap IN, then OUT"') : ''}${B(isLight() ? 'Gain' : 'Clip Gain', "WE.tool='gain';drawPop()", 's ' + (w.tool === 'gain' ? 'on' : ''), 'data-n="Gain: level of the whole track"')}
    <span class="sp"></span>${B(S.lis ? STOPI + ' Stop' : PLAYI + ' Preview', 'wePreview()', 's gplay ' + (S.lis ? 'on' : ''), 'data-n="Preview: listen to the result"')}${B('Undo', 'weUndo()', 's', (w.undo.length ? '' : 'disabled ') + 'data-n="Undo the last change"')}${B('Clear', 'weClear()', 's', (pending ? '' : 'disabled ') + 'data-n="Clear: forget the change not applied yet"')}</div>
    <canvas class="wv" id="wv" width="1400" height="260"></canvas>
    <p class="dim" style="margin-top:5px">${{ trim: 'Drag the two gold handles. Apply removes everything outside them. The part kept stays where it is in the song.', sil: 'Paint over the part to silence with a finger or the mouse, like an eraser. Preview it, then Apply.', gain: 'Turn the knob to make the whole clip louder or quieter, then Apply.', spot: 'Tap the wave to set IN, then tap again to set OUT. Apply keeps them. Drop In then records from IN and stops at OUT by itself.' + (t0.spot ? ' Now: IN ' + fmtC(t0.spot[0]) + ', OUT ' + fmtC(t0.spot[1]) + '.' : '') }[w.tool]}${w.tool === 'spot' ? ii('spots') : ''}</p>
    <div class="row" style="margin-top:8px;flex-wrap:wrap">${w.tool === 'gain' ? `<span id="cgk"></span><span class="dim">-24 dB to +12 dB</span>` : ''}${B('Apply', 'weApply()', 'on', pending ? '' : 'disabled')}<span class="dim">Clip gain now: ${(song().tracks[w.i].gain || 0) > 0 ? '+' : ''}${song().tracks[w.i].gain || 0} dB</span></div>`;
}
// the audio as it would be after the pending change
function wePending() {
  const w = WE, t = song().tracks[w.i], sr = S.sr;
  let chs = CZ.trackChannels(Object.assign({}, t, { gain: w.gain }), sr).map((c) => (c === t.audio || c === t.audioR ? c.slice() : c));
  if (w.tool === 'trim') chs = chs.map((c) => { c.fill(0, 0, w.a); return c.slice(0, w.b); });
  if (w.tool === 'sil' && w.paint) chs.forEach((c) => c.fill(0, w.paint[0], w.paint[1]));
  return chs;
}
function drawWave() {
  const c = $('wv'); if (!c || !WE) return; const w = WE, t = song().tracks[w.i], n = t.audio.length, g = c.getContext('2d'), W = c.width, H = c.height, sr = S.sr;
  if (!w.pk || w.pkFor !== t.audio) { w.pk = CZ.peaks(t.audioR ? [t.audio, t.audioR] : [t.audio], Math.max(1, Math.floor(n / W))); w.pkFor = t.audio; }
  const gm = Math.pow(10, w.gain / 20), X = (s) => s / n * W;
  g.fillStyle = '#121316'; g.fillRect(0, 0, W, H);
  for (let x = 0; x < W; x++) {
    const s = x / W * n, v = Math.min(1, (w.pk[Math.min(w.pk.length - 1, Math.floor(x / W * w.pk.length))] || 0) * gm);
    const silent = w.tool === 'sil' && w.paint && s >= w.paint[0] && s < w.paint[1], out = w.tool === 'trim' && (s < w.a || s >= w.b);
    g.fillStyle = out ? '#3a3b40' : silent ? '#5a2a2e' : colOf(w.i); const bh = Math.max(2, (silent ? 0.01 : v) * H * 0.85); g.fillRect(x, (H - bh) / 2, 1, bh);
  }
  if (w.tool === 'sil' && w.paint) { g.fillStyle = 'rgba(227,36,43,.22)'; g.fillRect(X(w.paint[0]), 0, X(w.paint[1] - w.paint[0]), H); }
  if (w.tool === 'trim') [w.a, w.b].forEach((k) => { g.fillStyle = '#E2BF6A'; g.fillRect(X(k) - 2, 0, 4, H); g.fillRect(X(k) - 12, H / 2 - 20, 24, 40); });
  if (w.spot) w.spot.forEach((sec, j) => { if (sec == null || (j === 1 && !(w.spot[1] > w.spot[0]))) return; const x = X(sec * sr); g.fillStyle = '#FF9A1F'; g.fillRect(x - 2, 0, 4, H); g.font = 'bold 22px Arial'; g.fillText(j ? 'OUT' : 'IN', x + 6, 52); });
  const lp = S.listenPos(); if (lp >= 0) { g.fillStyle = '#fff'; g.fillRect(X(lp * sr), 0, 3, H); }
  g.fillStyle = '#8C8E95'; g.font = '20px Arial'; g.textAlign = 'left'; g.fillText('0:00', 8, 24); g.textAlign = 'right'; g.fillText(fmt(n / sr), W - 8, 24); g.textAlign = 'left';
  if (w.tool === 'trim') { g.fillStyle = '#E2BF6A'; g.fillText('Start ' + fmtC(w.a / sr), 70, 24); g.textAlign = 'right'; g.fillText('End ' + fmtC(w.b / sr), W - 80, 24); g.textAlign = 'left'; }
  if (w.tool === 'gain' && $('cgk') && !$('cgk').firstChild) { $('cgk').innerHTML = knob('cg', 'Clip gain', () => (w.gain + 24) / 36 * 100, (v) => { w.gain = Math.round(v / 100 * 36 - 24); drawWave(); }, 46, () => (w.gain > 0 ? '+' : '') + w.gain + ' dB'); wireControls($('cgk')); }
  c.onpointerdown = (e) => {
    if (w.tool === 'gain') return;
    try { c.setPointerCapture(e.pointerId); } catch (x) {}
    const ix = (ev) => { const r = c.getBoundingClientRect(); return clamp(Math.round((ev.clientX - r.left) / r.width * n), 0, n); };
    if (w.tool === 'spot') { const sec = ix(e) / sr; if (!w.spot || w.spot[1] > w.spot[0]) w.spot = [sec, -1]; else if (sec > w.spot[0]) w.spot = [w.spot[0], sec]; else w.spot = [sec, w.spot[0]]; drawPop(); return; }
    const i0 = ix(e), hnd = Math.abs(i0 - w.a) < Math.abs(i0 - w.b) ? 'a' : 'b', minLen = Math.round(sr * 0.05);
    if (w.tool === 'sil') w.paint = w.paint ? [Math.min(w.paint[0], i0), Math.max(w.paint[1], i0 + 1)] : [i0, i0 + 1];
    const mv = (ev) => { const i = ix(ev); if (w.tool === 'trim') { if (hnd === 'a') w.a = clamp(i, 0, w.b - minLen); else w.b = clamp(i, w.a + minLen, n); } else w.paint = [Math.min(w.paint[0], i), Math.max(w.paint[1], i + 1)]; drawWave(); };
    mv(e); c.onpointermove = mv; c.onpointerup = c.onpointercancel = () => { c.onpointermove = null; drawPop(); };
  };
}
function weApply() {
  const w = WE, t = song().tracks[w.i];
  w.undo.push({ audio: t.audio, audioR: t.audioR, gain: t.gain || 0 });
  if (w.tool === 'gain') { t.gain = w.gain; toast('Gain set.'); }
  else if (w.tool === 'spot') { w.undo.pop(); t.spot = w.spot.slice(); toast('Drop In spots set: IN ' + fmtC(t.spot[0]) + ', OUT ' + fmtC(t.spot[1]) + '.'); }
  else {
    const edit = (c) => { if (!c) return c; let x = c.slice(); if (w.tool === 'trim') { x.fill(0, 0, w.a); x = x.slice(0, w.b); } else if (w.paint) x.fill(0, w.paint[0], w.paint[1]); return x; };
    t.audio = edit(t.audio); t.audioR = edit(t.audioR);
    toast(w.tool === 'trim' ? 'Trimmed.' : 'Silence applied.');
    w.a = 0; w.b = t.audio.length; w.paint = null; w.pk = null;
  }
  S.changed('audio'); S.saveNow(); drawPop();
}
function weUndo() { const w = WE, u = w.undo.pop(); if (!u) { toast('Nothing to undo.'); return; } const t = song().tracks[w.i]; t.audio = u.audio; t.audioR = u.audioR; t.gain = u.gain; w.gain = u.gain; w.a = 0; w.b = t.audio.length; w.paint = null; w.pk = null; S.changed('audio'); S.saveNow(); drawPop(); toast('Undone.'); }
function weClear() { const w = WE; w.a = 0; w.b = song().tracks[w.i].audio.length; w.paint = null; w.gain = song().tracks[w.i].gain || 0; drawPop(); }
function wePreview() {
  if (S.lis) { S.stopListen(); drawPop(); return; }
  const w = WE, sr = S.sr, chs = wePending(), n = chs[0].length;
  let from = 0, to = n / sr;
  if (w.tool === 'sil' && w.paint) { from = Math.max(0, w.paint[0] / sr - 1.5); to = Math.min(n / sr, w.paint[1] / sr + 1.5); }
  if (w.tool === 'trim') { from = w.a / sr; to = Math.min(w.b / sr, from + 30); }
  S.listen(chs, from, to, () => { if (WE) drawPop(); }).then(() => drawPop());
}

// ------------------------------------------------------------------ F: Export, one question at a time
let EX = null;
function exportFlow() {
  if (S.playing) S.stop();
  const s = song(), tot = pol() ? 4 : 3;
  if (S.length() <= 0) { message('Export', 'This song has no audio yet.'); return; }
  EX = { what: -1 };
  const withAudio = tracksShown().map((t, i) => [t, i]).filter(([t]) => t.audio);
  step({ title: 'Export', tip: 'exportn', n: 1, total: tot, text: 'Export what?', opts: [['The whole mix', () => exTrim(-1)], ['One track', () => step({ title: 'Export', n: 1, total: tot, text: 'Which track? It is exported with its effects.', opts: withAudio.map(([t, i]) => [esc(t.name), () => exTrim(i)]), back: exportFlow }), '', !withAudio.length]] });
}
async function exTrim(what) {
  const tot = pol() && what < 0 ? 4 : 3;
  if (!EX || EX.what !== what || !EX.ch) {
    busy('Export', 'Making the ' + (what < 0 ? 'mix' : 'track') + '. This takes a few seconds.');
    const r = what < 0 ? await S.renderMixChannels(false) : await S.exportFile({ track: what, withFx: true, format: 0, start: 0, end: 0, channelsOnly: true });
    let chs = r.channels; if (chs.length === 1) chs = [chs[0], chs[0]];
    EX = { what, ch: chs, a: 0, b: 1, cur: 0 };
  }
  step({ title: 'Export', tip: 'extrim', n: 2, total: tot, text: 'Trim the start and the end. Tap the wave to put the cursor there, then Play to listen from it.', wide: true,
    html: `<canvas class="wv" id="exw" width="1400" height="220" style="height:110px"></canvas><div class="row" style="margin-top:5px"><span class="dim">Start <b id="exa" style="color:var(--gold)"></b></span><span class="sp"></span><span class="dim">Cursor <b id="exc" style="color:var(--gold)"></b></span><span class="sp"></span><span class="dim">End <b id="exb" style="color:var(--gold)"></b></span></div>
      <div class="row" style="margin-top:6px;justify-content:center">${B(BACKI, 'exStop();EX.cur=EX.a;exDraw()', 's', 'data-n="Cursor to the start"')}${B(PLAYI + ' Play from cursor', 'exPlay()', 's gplay', 'id="exp" data-n="Play from the cursor"')}</div>`,
    opts: [['Next', () => { exStop(); pol() && EX.what < 0 ? exMaster() : exFormat(); }]], back: () => { exStop(); exportFlow(); }, onCancel: exStop, after: exWire });
}
const exLen = () => EX.ch[0].length / S.sr;
function exDraw() {
  const c = $('exw'); if (!c || !EX) return; const g = c.getContext('2d'), W = c.width, H = c.height;
  if (!EX.pk) EX.pk = CZ.peaks(EX.ch, Math.max(1, Math.floor(EX.ch[0].length / W)));
  g.fillStyle = '#121316'; g.fillRect(0, 0, W, H);
  for (let x = 0; x < W; x++) { const v = EX.pk[Math.min(EX.pk.length - 1, Math.floor(x / W * EX.pk.length))] || 0, f = x / W, out = f < EX.a || f > EX.b; g.fillStyle = out ? '#3a3b40' : '#9AD6C5'; const bh = Math.max(2, Math.min(1, v) * H * 0.85); g.fillRect(x, (H - bh) / 2, 1, bh); }
  [EX.a, EX.b].forEach((f) => { g.fillStyle = '#E2BF6A'; g.fillRect(f * W - 2, 0, 4, H); g.fillRect(f * W - 10, H / 2 - 16, 20, 32); });
  g.fillStyle = '#fff'; g.fillRect(EX.cur * W - 1, 0, 3, H); g.beginPath(); g.moveTo(EX.cur * W - 8, 0); g.lineTo(EX.cur * W + 9, 0); g.lineTo(EX.cur * W, 12); g.fill();
  const L = exLen(); $('exa').textContent = fmtC(EX.a * L); $('exb').textContent = fmtC(EX.b * L); $('exc').textContent = fmtC(EX.cur * L);
}
function exWire() {
  exDraw(); const c = $('exw');
  c.onpointerdown = (e) => {
    try { c.setPointerCapture(e.pointerId); } catch (x) {}
    const f = (ev) => clamp((ev.clientX - c.getBoundingClientRect().left) / c.getBoundingClientRect().width, 0, 1); const x = f(e);
    const hnd = Math.abs(x - EX.a) < 0.025 ? 'a' : Math.abs(x - EX.b) < 0.025 ? 'b' : 'cur';
    if (hnd === 'cur') exStop();
    const mv = (ev) => { const v = f(ev); if (hnd === 'a') EX.a = Math.min(v, EX.b - 0.01); else if (hnd === 'b') EX.b = Math.max(v, EX.a + 0.01); else EX.cur = v; exDraw(); };
    mv(e); c.onpointermove = mv; c.onpointerup = c.onpointercancel = () => { c.onpointermove = null; };
  };
}
function exPlay() {
  if (S.lis) { exStop(); return; }
  const L = exLen(); if (EX.cur < EX.a || EX.cur >= EX.b) EX.cur = EX.a;
  S.listen(EX.ch, EX.cur * L, EX.b * L, () => { const b = $('exp'); if (b) b.classList.remove('on'); });
  const b = $('exp'); if (b) b.classList.add('on');
}
function exStop() { S.stopListen(); const b = $('exp'); if (b) b.classList.remove('on'); }
function exMaster() { step({ title: 'Export', tip: 'masterchoice', n: 3, total: 4, text: 'Use the mastering settings on this export?', opts: [['Yes, with mastering', () => { EX.mastering = true; exFormat(); }], ['No, without mastering', () => { EX.mastering = false; exFormat(); }]], back: () => exTrim(EX.what) }); }
function exFormat() {
  const tot = pol() && EX.what < 0 ? 4 : 3;
  step({ title: 'Export', n: tot, total: tot, text: 'Format?', opts: [['WAV', () => exSave('WAV')], ['MP3 320k', () => exSave('MP3 320k')]], back: pol() && EX.what < 0 ? exMaster : () => exTrim(EX.what) });
}
// H1: the bounce saves itself to Lt. Joe Bookman, then offers what to do next
async function exSave(fmtName) {
  busy('Export', 'Saving. This takes a few seconds.');
  const s = song(), sr = S.sr, L = EX.ch[0].length, a = Math.round(EX.a * L), b = Math.round(EX.b * L);
  let chs = EX.ch.map((c) => c.slice(a, b));
  const fl = Math.min(chs[0].length, Math.round(sr / 200));
  if (a > 0) for (const c of chs) for (let i = 0; i < fl; i++) c[i] *= i / fl;
  if (b < L) for (const c of chs) for (let i = 0; i < fl; i++) c[c.length - 1 - i] *= i / fl;
  if (EX.what < 0 && EX.mastering) chs = await S.masterProcess(chs);
  const blob = fmtName === 'MP3 320k' ? CZ.encodeMp3(chs, sr) : CZ.encodeWav(chs, sr);
  const name = EX.what < 0 ? s.name + ' – Exported Mix' : s.name + ' – ' + s.tracks[EX.what].name + ' (with effects)';
  const e = await S.addExport(EX.what < 0 ? 'mix' : 'track', name, fmtName, blob, chs[0].length / sr);
  EX = null; libRefresh();
  const ref = 'x:' + s.name + ':' + e.id;
  step({ title: 'Saved to Lt. Joe Bookman', text: `"${esc(e.name)}" is in the library, in the song's folder and in ${e.kind === 'mix' ? 'Mixes' : 'Tracks'}.`, cancel: false, opts: [
    [BOOK(16) + ' Add to Playlist', () => addToPlaylist(ref, e.name)], [BLASTER(12) + ' Play in Ultrasound', () => { closeBox(); umPlayRef(ref); }],
    [BOOK(16) + ' View in Library', () => { closeBox(); LIBV.cat = e.kind === 'mix' ? 'Mixes' : 'Tracks'; go('lib'); }], ['Share File', () => shareBlob(blob, fileNameOf(e))], ['Close', closeBox]] });
}
const fileNameOf = (e) => CZ.cleanFile(e.name) + (e.fmt === 'MP3 320k' ? '.mp3' : '.wav');
function downloadBlob(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
}
// Share File: the device's normal share menu. Where there is none (most computers), the file is saved to Downloads.
async function shareBlob(blob, name) {
  const file = new File([blob], name, { type: blob.type || 'audio/wav' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: name }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  downloadBlob(blob, name); toast(name + ' saved to Downloads.');
}

// ------------------------------------------------------------------ G: guitar tuner
const TUN = { input: localStorage.getItem('cz.tunIn') || '1', f: 0, smooth: 0, note: '–', cents: 0, held: 0 };
const STRINGS = [['E', 82.41], ['A', 110], ['D', 146.83], ['G', 196], ['B', 246.94], ['e', 329.63]];
async function openTuner() {
  await S.startAudio();
  if (!(await S.openMic())) { message('Tuner', 'The tuner needs the microphone. Allow it in the browser settings for this page.'); return; }
  openPop(TUNEI + ' TUNER', tunerBody, { tip: 'tuner', onClose: () => { TUN.on = false; } });
  TUN.on = true;
}
function tunerBody() {
  return `<div class="tuner"><div class="row">${['1', '2'].map((k) => `<button class="chip ${TUN.input === k ? 'on' : ''}" onclick="TUN.input='${k}';localStorage.setItem('cz.tunIn','${k}');drawPop()" data-n="Tune from Input ${k}">Input ${k}</button>`).join('')}<span class="dim">A = 440 Hz</span>${ii('tuner')}</div>
    <svg width="300" height="160" viewBox="0 0 300 160"><path d="M40 140 A110 110 0 0 1 77 57" stroke="#E3242B" stroke-width="10" fill="none"/><path d="M77 57 A110 110 0 0 1 129 32" stroke="#FF9A1F" stroke-width="10" fill="none"/>
      <path d="M129 32 A110 110 0 0 1 171 32" stroke="#2DFF5C" stroke-width="10" fill="none"/><path d="M171 32 A110 110 0 0 1 223 57" stroke="#FF9A1F" stroke-width="10" fill="none"/><path d="M223 57 A110 110 0 0 1 260 140" stroke="#E3242B" stroke-width="10" fill="none"/>
      <line id="tneedle" x1="150" y1="140" x2="150" y2="30" stroke="#8C8E95" stroke-width="4" stroke-linecap="round"/><circle id="tdot" cx="150" cy="140" r="8" fill="#8C8E95"/></svg>
    <div class="tnote" id="tnote" style="color:#8C8E95">–</div><div class="tcents" id="tcents" style="color:#8C8E95">Play one string.</div>
    <div class="row" style="margin-top:4px"><span class="dim">Guitar strings:</span>${STRINGS.map(([s], j) => `<span class="chip" id="tstr${j}">${s}</span>`).join('')}</div></div>`;
}
const tunBuf = new Float32Array(2048);
function tunerLive() {
  if (!TUN.on || !S.inAn) return;
  const an = S.inAn[TUN.input === '2' ? 1 : 0]; an.getFloatTimeDomainData(tunBuf);
  const f = CZ.pitch(tunBuf, S.sr);
  if (f > 0) { TUN.smooth = TUN.smooth && Math.abs(Math.log2(f / TUN.smooth)) < 0.05 ? TUN.smooth * 0.7 + f * 0.3 : f; TUN.held = 30; }
  else if (TUN.held > 0) TUN.held--; else TUN.smooth = 0;
  const nd = $('tneedle'); if (!nd) return;
  if (!TUN.smooth) { nd.setAttribute('x2', 150); nd.setAttribute('y2', 30); nd.setAttribute('stroke', '#8C8E95'); $('tdot').setAttribute('fill', '#8C8E95'); $('tnote').textContent = '–'; $('tnote').style.color = '#8C8E95'; $('tcents').textContent = 'Play one string.'; $('tcents').style.color = '#8C8E95'; STRINGS.forEach((_, j) => $('tstr' + j).classList.remove('on')); return; }
  const n = CZ.noteOf(TUN.smooth), c = n.cents, col = Math.abs(c) <= 5 ? '#2DFF5C' : Math.abs(c) <= 20 ? '#FF9A1F' : '#E3242B';
  const word = Math.abs(c) <= 5 ? 'In tune' : c < 0 ? 'Too low: tune up' : 'Too high: tune down';
  const a = clamp(c, -50, 50) / 50 * 60 * Math.PI / 180;
  nd.setAttribute('x2', (150 + 110 * Math.sin(a)).toFixed(1)); nd.setAttribute('y2', (140 - 110 * Math.cos(a)).toFixed(1)); nd.setAttribute('stroke', col); $('tdot').setAttribute('fill', col);
  $('tnote').textContent = n.name; $('tnote').style.color = col; $('tcents').textContent = (c > 0 ? '+' : '') + c + ' cents · ' + word; $('tcents').style.color = col;
  let best = 0; STRINGS.forEach(([, hz], j) => { if (Math.abs(Math.log2(TUN.smooth / hz)) < Math.abs(Math.log2(TUN.smooth / STRINGS[best][1]))) best = j; });
  STRINGS.forEach((_, j) => $('tstr' + j).classList.toggle('on', j === best && Math.abs(Math.log2(TUN.smooth / STRINGS[best][1])) < 0.25));
}

// ------------------------------------------------------------------ A4: Input and Output. One device per line, nothing overlaps.
const IOS = { inputs: [], outputs: [] };
async function ioLoad() { await S.startAudio(); try { const d = await navigator.mediaDevices.enumerateDevices(); IOS.inputs = d.filter((x) => x.kind === 'audioinput'); IOS.outputs = d.filter((x) => x.kind === 'audiooutput'); } catch (e) {} if (ui.screen === 'io') render(); }
screens.io = () => {
  const radio = (on) => `<span class="rad ${on ? 'on' : ''}">${on ? '<i></i>' : ''}</span>`;
  const ins = [{ deviceId: '', label: 'Automatic (the device\'s normal input)' }].concat(IOS.inputs.filter((x) => x.deviceId !== 'default' && x.deviceId !== ''));
  const outs = IOS.outputs.filter((x) => x.deviceId !== 'default' && x.deviceId !== '');
  const canOut = typeof (S.ctx && S.ctx.setSinkId) === 'function';
  const lat = S.ctx ? Math.round(((S.ctx.baseLatency || 0) + (S.ctx.outputLatency || 0)) * 1000) : 0;
  return `<div class="scroll" data-keep="io"><div class="row" style="margin-bottom:8px"><b style="font-size:14px">Input and Output</b>${ii('io')}<span class="sp"></span>${B('Test sound', 'testTone()', 's', 'data-n="Play a short test tone through the output"')}</div><div class="io">
  <div class="iob"><h4>RECORDING (INPUT)</h4>${ins.map((d, k) => `<div class="ior dev" onclick="pickIn(${k})">${radio((S.inputId || '') === d.deviceId)}<b class="dn ${(S.inputId || '') === d.deviceId ? 'on' : ''}">${esc(d.label || 'Input device ' + k)}</b></div>`).join('')}
    ${IOS.inputs.length && !IOS.inputs[0].label ? '<p class="iop">The device names show after the microphone is allowed.</p>' : ''}
    <div class="ior"><span>Input 1</span><div class="hm"><i id="io1"></i></div><b id="io1t" style="min-width:60px;text-align:right">–</b></div>
    <div class="ior"><span>Input 2</span><div class="hm"><i id="io2"></i></div><b id="io2t" style="min-width:60px;text-align:right">–</b></div>
    <p class="iop" style="margin-top:6px">${S.micNode ? (S.micChannels > 1 ? 'This device has 2 or more inputs.' : 'This device has 1 input. Input 2 is silent.') : B('Start the input meters', 'ioMic()', 's')}</p></div>
  <div class="iob"><h4>PLAYBACK (OUTPUT)</h4>${canOut ? [{ deviceId: '', label: 'Automatic (the device\'s normal output)' }].concat(outs).map((d, k) => `<div class="ior dev" onclick="pickOut(${k})">${radio((S.outputId || '') === d.deviceId)}<b class="dn ${(S.outputId || '') === d.deviceId ? 'on' : ''}">${esc(d.label || 'Output device ' + k)}</b></div>`).join('')
      : '<p class="iop">Sound plays through the device\'s normal output. Change it in the phone or computer settings.</p>'}
    <h4 style="margin-top:12px">RECORDING DELAY</h4>
    <p class="iop">Conceptor shifts new recordings earlier to match the device's delay. If a new part sounds late or early, adjust it here.</p>
    <div class="ior"><span>Adjust</span><span class="row">${B('&minus;', 'adjOffset(-1)', 's r', 'data-n="Recording delay: 1 ms less"')}<b style="min-width:60px;text-align:center">${S.offsetMs} ms</b>${B('+', 'adjOffset(1)', 's r', 'data-n="Recording delay: 1 ms more"')}</span></div>
    <div class="ior"><span>Measured delay now</span><b>${lat} ms</b></div></div></div></div>`;
};
after.io = () => { if (!IOS.loaded) { IOS.loaded = true; ioLoad(); } };
async function ioMic() { await S.startAudio(); if (await S.openMic()) { await ioLoad(); render(); } else message('Input and Output', 'The microphone was not allowed. Allow it in the browser settings for this page.'); }
async function pickIn(k) {
  const ins = [{ deviceId: '' }].concat(IOS.inputs.filter((x) => x.deviceId !== 'default' && x.deviceId !== ''));
  S.inputId = ins[k].deviceId || null; localStorage.setItem('cz.inputId', S.inputId || '');
  const was = !!S.micNode; S.closeMic(); if (was || song().tracks.some((t) => t.arm)) await S.openMic();
  render();
}
async function pickOut(k) {
  const outs = [{ deviceId: '' }].concat(IOS.outputs.filter((x) => x.deviceId !== 'default' && x.deviceId !== ''));
  S.outputId = outs[k].deviceId || ''; localStorage.setItem('cz.outputId', S.outputId);
  try { await S.ctx.setSinkId(S.outputId); } catch (e) { toast('That output could not be used.'); }
  render();
}
function adjOffset(d) { S.offsetMs = clamp(S.offsetMs + d, -200, 200); localStorage.setItem('cz.offsetMs', S.offsetMs); render(); }
async function testTone() { await S.startAudio(); const c = S.ctx, o = c.createOscillator(), g = c.createGain(); o.frequency.value = 440; g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.exponentialRampToValueAtTime(0.2, c.currentTime + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.8); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.85); }

// ------------------------------------------------------------------ live parts: counter, meters, cursor, player, tuner
const meterBuf = new Float32Array(256);
function peak(an) { if (!an) return 0; an.getFloatTimeDomainData(meterBuf); let m = 0; for (const x of meterBuf) m = Math.max(m, Math.abs(x)); return m; }
const lvl = (p) => clamp((20 * Math.log10(Math.max(p, 1e-5)) + 60) / 66 * 100, 0, 100);
function live() {
  if (!S.song) { if (ui.screen === 'intro') [1, 2].forEach((k) => { const p = S.inputLevel ? S.inputLevel(k - 1) : 0, e = $('io' + k); if (e) e.style.width = lvl(p) + '%'; }); if (typeof umLive === 'function') umLive(); tunerLive(); return; }
  const c = $('clock');
  if (c) {   // A2: runs while recording, red; orange "REC IN" during the Drop In run-up
    const wait = S.countIn();
    c.classList.toggle('cnt', wait > 0.02); c.classList.toggle('rec', S.recording && wait <= 0.02);
    c.textContent = wait > 0.02 ? 'REC IN ' + Math.ceil(wait) : fmtC(S.now());
  }
  if (S.ctx && S.strips) {
    tracksShown().forEach((t, i) => { const e = $('mt-' + i); if (e) e.style.height = lvl(peak(S.strips[i].meter)) + '%'; });
    const d = $('mt-d'); if (d) d.style.height = lvl(peak(S.drumStrip.meter)) + '%';
    const L = $('mt-L'), R = $('mt-R'); if (L) L.style.height = lvl(peak(S.master.meters[0])) + '%'; if (R) R.style.height = lvl(peak(S.master.meters[1])) + '%';
    const lim = $('limiting'); if (lim) lim.textContent = S.master.reduction.toFixed(1) + ' dB';
  }
  const cu = $('ecur'); if (cu) { const hw = cu.parentElement.parentElement.querySelector('.lcorner'); cu.style.left = (S.now() * PXS + (hw ? hw.offsetWidth : 0)) + 'px'; }
  const cl = $('curLab'); if (cl) cl.textContent = fmtC(S.now());
  if (ui.screen === 'io' || ui.screen === 'intro') [1, 2].forEach((k) => { const p = S.inputLevel(k - 1), e = $('io' + k), t = $('io' + k + 't'); if (e) e.style.width = lvl(p) + '%'; if (t) t.textContent = S.micNode ? (p < 1e-4 ? '-inf' : (20 * Math.log10(p)).toFixed(0) + ' dB') : '–'; });
  if (WE && S.lis) drawWave();
  if (EX && S.lis && $('exw')) { EX.cur = S.listenPos() / exLen(); exDraw(); }
  if (typeof drumLive === 'function') drumLive();
  if (typeof umLive === 'function') umLive();
  tunerLive();
}
(function loop() { try { live(); } catch (e) { console.error(e); } requestAnimationFrame(loop); })();

S.on((what) => {
  if (what === 'transport' || what === 'song') { if (WE && S.lis) return; if (['mix', 'edit', 'drums', 'lib', 'um', 'io'].includes(ui.screen)) render(); }
  else if (what === 'audio' && ['mix', 'edit'].includes(ui.screen)) render();
});
document.addEventListener('visibilitychange', () => { if (document.hidden && S.song) { if (S.playing) S.stop(); S.saveNow(); } });

// ------------------------------------------------------------------ start
function sizeClass() { document.body.classList.toggle('computer', window.innerHeight >= 560 && window.innerWidth >= 900); document.body.classList.toggle('phone', !(window.innerHeight >= 560 && window.innerWidth >= 900)); }
let rsT = null;
window.addEventListener('resize', () => { sizeClass(); clearTimeout(rsT); rsT = setTimeout(() => { if (['mix', 'edit', 'intro'].includes(ui.screen)) render(); }, 200); });
(async function start() {
  if (document.readyState === 'loading') await new Promise((r) => document.addEventListener('DOMContentLoaded', r));
  sizeClass(); setHandHold(handHold());
  S.inputId = localStorage.getItem('cz.inputId') || null; S.outputId = localStorage.getItem('cz.outputId') || '';
  const d = $('dev');
  d.addEventListener('pointerover', (e) => { if (e.pointerType === 'touch') return; const el = e.target.closest(TIPSEL); if (el) showName(el); else hideName(); });
  d.addEventListener('pointerleave', hideName);
  let holdT = null;
  d.addEventListener('pointerdown', (e) => { hideName(); if (e.pointerType !== 'touch') return; const el = e.target.closest(TIPSEL); clearTimeout(holdT); if (el) holdT = setTimeout(() => { showName(el); setTimeout(hideName, 1800); }, 500); });
  d.addEventListener('pointerup', () => clearTimeout(holdT));
  d.addEventListener('contextmenu', (e) => { if (isPhone()) e.preventDefault(); });
  await S.restoreFolder();
  ui.screen = 'intro'; IN.step = 0;   // 0.4.4: the intro screens show every time the app opens
  render();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
