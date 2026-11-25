// Conceptor 0.4.4: Conceptor - Light and Conceptor - Heavy.
// Light: the Android app and the web app (portrait on a phone, landscape on a computer). Heavy: the Mac and Windows apps.
// The desktop apps can also run Light. The intro screens show one at a time every time the app opens.
'use strict';

CZ.DESKTOP = location.protocol === 'app:' || /Electron/i.test(navigator.userAgent) || (location.hostname === 'localhost' && /[?&]desktop=1/.test(location.search));
CZ.LIGHT_TRACKS = 4;
const ED = { v: CZ.DESKTOP ? (localStorage.getItem('cz.ed') === 'light' ? 'light' : 'heavy') : 'light' };
const isLight = () => ED.v === 'light';
const edName = (v) => 'Conceptor - ' + (v === 'light' ? 'Light' : 'Heavy');
function applyEd() {
  document.body.classList.toggle('ed-light', isLight()); document.body.classList.toggle('ed-heavy', !isLight());
  document.title = edName(ED.v);
}
function portClass() { document.body.classList.toggle('port', window.innerHeight > window.innerWidth); }
window.addEventListener('resize', portClass);

// A song is Light or Heavy. Older songs: Light if they fit inside the Light limits.
const fitsLight = (s) => {
  const n = s.shown || 1, tr = (s.tracks || []).slice(0, n);
  const pats = (s.drums && s.drums.patterns) || [];
  return n <= CZ.LIGHT_TRACKS && !tr.some((t) => t.audioR || t.input === '12' || t.input === '2') && !pats.some((p) => p.steps && p.steps.some((r) => r.slice(2 * CZ.STEPS_PER_BAR).some(Boolean)));
};
CZ.songKind = (s) => (s.kind === 'heavy' ? 'heavy' : fitsLight(s) ? 'light' : 'heavy');
function applySongEd() {
  const s = song(); if (!s) return;
  if (isLight()) {
    s.kind = 'light'; s.mode = 'polished';
    s.shown = Math.min(Math.max(1, s.shown || 1), CZ.LIGHT_TRACKS);
    s.tracks.forEach((t) => { t.input = '1'; t.arm = false; });
    s.drums.patterns.forEach((p) => { p.bars = 2; });
    CZ.fillPh(s);
  } else if (!s.kind) s.kind = CZ.songKind(s);
  S.changed('kind');
}
const _newPattern = CZ.newPattern;
CZ.newPattern = (d, steps) => { const p = _newPattern(d, steps); if (isLight()) p.bars = 2; return p; };

Object.assign(TIPS, {
  edchoice: ['Light or Heavy', 'Conceptor - Light has fewer controls: up to 4 tracks, one track records at a time and drum patterns are 2 bars. It opens Light songs only. Conceptor - Heavy has every control and opens both.'],
  lightonly: ['Conceptor - Light', 'This is the Light version. For Conceptor - Heavy, use the desktop app on a Mac or Windows computer.'],
  audioset: ['Audio hardware', 'Picks the microphone or audio interface used for recording. It can be changed later in Input + Output.'],
  libset: ['Library settings', 'Where Lt. Joe Bookman keeps songs, mixes and tracks. A cloud drive folder (Google Drive, OneDrive, Dropbox or iCloud Drive) opens on other devices too.'],
  startm: ['Start', 'New Song opens an empty song. Open an existing song goes to Lt. Joe Bookman, My Songs. The Ultrasound Machine plays the library.'],
  palette: ['Menu palette', 'Every main part of Conceptor. Tap a hexagon to open it.'],
  lstrips: ['Mixer', 'One strip per channel. FX opens the effects. Wave opens the track\'s wave. The red button arms the track for recording: one track at a time. Drag the fader to set the volume.'],
  spots: ['Drop In spots', 'Tap the wave to set IN, then again to set OUT. Drop In then records from IN and stops at OUT by itself.'],
  bounce: ['Bounce', 'Makes one stereo file of the whole song with all effects. Trim the start and the end, and fade out the end, then Save. It goes to Lt. Joe Bookman, Mixes.'],
  fade: ['Fade out', 'The last part of the song gets quieter until it is silent. Off leaves the end as it is.'],
  songkind: ['Heavy and Light songs', 'Songs made in Conceptor - Heavy are in the Heavy folder. Songs made in Conceptor - Light are in the Light folder. Light opens Light songs only.'],
});

// ------------------------------------------------------------------ intro: one screen at a time
const IN = { step: 0, usb: false, cloud: 'Google Drive' };
const introSteps = () => (CZ.DESKTOP ? ['choose', 'audio', 'library', 'start'] : ['light', 'audio', 'library', 'start']);
function introGo(k) { IN.step = clamp(k, 0, 3); if (introSteps()[IN.step] === 'audio' && !isLight()) { IOS.loaded = true; ioLoad(); } ui.screen = 'intro'; render(); }
function toIntroStart() { if (S.playing) S.stop(); closePop(true); closeBox(); closeMenu(); if (S.song) S.saveNow(); introGo(3); }
const hexI = (col, svg, w = 46) => `<span class="ihx" style="background:${col};width:${w}px;height:${Math.round(w * 1.15)}px">${svg}</span>`;
const IC = {
  plus: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1B1C1F" stroke-width="2.6"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  folder: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1B1C1F" stroke-width="2.2"><path d="M3 6h7l2 2h9v11H3z"/></svg>',
  phone: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1B1C1F" stroke-width="2"><rect x="7" y="2" width="10" height="20" rx="2"/><line x1="11" y1="18" x2="13" y2="18"/></svg>',
  mic: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1B1C1F" stroke-width="2"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><line x1="12" y1="18" x2="12" y2="22"/></svg>',
  cloud: '<svg width="22" height="20" viewBox="0 0 26 20" fill="none" stroke="#1B1C1F" stroke-width="2"><path d="M7 17h12a5 5 0 0 0 0-10 7 7 0 0 0-13 2 4 4 0 0 0 1 8z"/></svg>',
  drive: '<svg width="22" height="20" viewBox="0 0 26 20" fill="none" stroke="#1B1C1F" stroke-width="2"><rect x="2" y="5" width="22" height="10" rx="2"/><circle cx="19" cy="10" r="1.5" fill="#1B1C1F"/></svg>',
};
function introHTML() {
  const k = introSteps()[IN.step], dots = [0, 1, 2, 3].map((i) => `<span class="${i <= IN.step ? 'on' : ''}"></span>`).join('');
  const head = `<div class="ihead"><span class="ibrand">CONCEPTOR <b>${isLight() ? 'LIGHT' : 'HEAVY'}</b></span><span class="sp"></span><span class="istep">STEP ${IN.step + 1} OF 4</span><span class="idots">${dots}</span></div>`;
  const nav = (next, back = true, label = 'Next') => `<div class="inav">${back && IN.step > 0 ? `<button class="b inb" onclick="introGo(${IN.step - 1})">Back</button>` : ''}${next ? `<button class="b inb on" onclick="${next}">${label}</button>` : ''}</div>`;
  let body = '';
  if (k === 'light') {
    body = `<div class="ihero">${hexI('#E2BF6A', '<b style="font-size:40px;color:#1B1C1F">C</b>', 96)}<div class="iname">CONCEPTOR<small>LIGHT</small></div>
      <div class="icard"><p>Light version only.</p><p class="dim2">Up to 4 tracks. One track records at a time. Drum patterns are 2 bars.</p><p class="dim2">For the Heavy version, use the desktop app on a Mac or Windows computer.</p></div></div>
      ${nav(`introGo(1)`, false, 'Proceed')}`;
  } else if (k === 'choose') {
    const card = (v, col, letter, lines) => `<button class="ichoice ${ED.v === v ? 'sel' : ''}" onclick="pickEd('${v}')">${hexI(col, `<b style="font-size:24px;color:#1B1C1F">${letter}</b>`, 60)}<b class="ict">${edName(v)}</b>${lines.map((l) => `<span>${l}</span>`).join('')}</button>`;
    body = `<h2>Choose a version ${ii('edchoice')}</h2><div class="ichoices">
      ${card('light', '#9AD6C5', 'L', ['Fewer controls. The same as the phone version.', 'Up to 4 tracks. One track records at a time.', 'Drum patterns are 2 bars.', 'Opens Light songs only.'])}
      ${card('heavy', '#E2BF6A', 'H', ['Every control.', 'Up to 12 tracks. Two tracks record at once (Input 1, Input 2, or 1+2 stereo).', 'Drum patterns are 2 or 4 bars. Edit Mode, pedals, amp, 7-band EQ, mastering.', 'Opens Heavy and Light songs.'])}</div>
      ${nav('introGo(1)', false)}`;
  } else if (k === 'audio') body = introAudio() + nav('introGo(2)');
  else if (k === 'library') body = introLibrary() + nav('introGo(3)');
  else body = introStart();
  return `<div class="intro" data-keep="intro"><div class="ibox">${head}${body}</div></div>`;
}
function pickEd(v) { ED.v = v; localStorage.setItem('cz.ed', v); applyEd(); if (S.song && isLight() && CZ.songKind(S.song) === 'heavy') S.song = null; render(); }

// audio hardware
function introAudio() {
  const lvl1 = `<div class="ilvl"><span>Input level</span><div class="hm"><i id="io1"></i></div></div>`;
  if (isLight()) {
    const opt = (usb, col, icon, name, note) => `<button class="iopt ${IN.usb === usb && S.micNode ? 'sel' : ''}" onclick="pickMic(${usb})">${hexI(col, icon)}<span><b>${name}</b><small>${note}</small></span></button>`;
    const phoneish = isPhone();
    let devs = '';
    if (IN.usb && S.micNode) {
      const ins = IOS.inputs.filter((x) => x.deviceId !== 'default' && x.deviceId !== '');
      devs = `<div class="lab" style="margin-top:4px">WHICH ONE?</div>` + (ins.length ? ins.map((d, j) => `<button class="iopt sm ${(S.inputId || '') === d.deviceId ? 'sel' : ''}" onclick="pickUsbDev(${j})"><span><b>${esc(d.label || 'Input ' + (j + 1))}</b></span></button>`).join('') : '<p class="dim2">Plug in the USB mic, then tap USB mic again.</p>');
    }
    return `<h2>Audio hardware ${ii('audioset')}</h2><p class="dim2">Which microphone records?</p>
      ${opt(false, '#9AD6C5', IC.phone, phoneish ? 'Phone Mic' : 'Built-in mic', phoneish ? 'The microphone built into the phone.' : 'The microphone built into the computer.')}
      ${opt(true, '#A2C9E8', IC.mic, 'USB mic', phoneish ? 'A microphone or interface plugged into the phone.' : 'A microphone or interface plugged into the computer.')}
      ${devs}${S.micNode ? lvl1 : ''}${ui.micAsked && !S.micNode ? '<p class="dim2">The microphone was not allowed. Playback and mixing still work. Recording does not.</p>' : ''}`;
  }
  const ins = [{ deviceId: '', label: 'Automatic (the normal input)' }].concat(IOS.inputs.filter((x) => x.deviceId !== 'default' && x.deviceId !== ''));
  const outs = IOS.outputs.filter((x) => x.deviceId !== 'default' && x.deviceId !== '');
  const canOut = typeof (S.ctx && S.ctx.setSinkId) === 'function';
  return `<h2>Audio hardware ${ii('audioset')}</h2><div class="icols">
    <div class="iblock"><div class="lab">INPUT</div>${ins.map((d, j) => `<button class="iopt sm ${(S.inputId || '') === d.deviceId ? 'sel' : ''}" onclick="pickIn(${j})"><span><b>${esc(d.label || 'Input device ' + j)}</b></span></button>`).join('')}
      ${S.micNode ? '' : B('Allow the microphone', 'introMic()', 'on wide')}</div>
    <div class="iblock"><div class="lab">OUTPUT</div>${canOut ? [{ deviceId: '', label: 'Automatic (the normal output)' }].concat(outs).map((d, j) => `<button class="iopt sm ${(S.outputId || '') === d.deviceId ? 'sel' : ''}" onclick="pickOut(${j})"><span><b>${esc(d.label || 'Output device ' + j)}</b></span></button>`).join('') : '<p class="dim2">Sound plays through the normal output. Change it in the computer settings.</p>'}
      ${B('Test sound', 'testTone()', 's')}</div></div>
    <div class="icols"><div class="iblock"><div class="lab">INPUT LEVELS</div><div class="ilvl"><span>Input 1</span><div class="hm"><i id="io1"></i></div></div><div class="ilvl"><span>Input 2</span><div class="hm"><i id="io2"></i></div></div></div>
    <div class="iblock"><div class="lab">RECORDING DELAY</div><div class="row">${B('&minus;', 'adjOffset(-1)', 'r')}<b style="min-width:70px;text-align:center;color:var(--gold)">${S.offsetMs} ms</b>${B('+', 'adjOffset(1)', 'r')}<span class="dim2">Lines up new takes with the song.</span></div></div></div>`;
}
async function introMic() { await S.startAudio(); ui.micOk = await S.openMic(); ui.micAsked = true; await ioLoad(); render(); }
async function pickMic(usb) {
  IN.usb = usb; await S.startAudio();
  if (!usb) { S.inputId = null; localStorage.setItem('cz.inputId', ''); S.closeMic(); }
  ui.micOk = await S.openMic(); ui.micAsked = true;
  if (usb && ui.micOk) {
    await ioLoad(); const ins = IOS.inputs.filter((x) => x.deviceId !== 'default' && x.deviceId !== '');
    const u = ins.find((x) => /usb|interface|scarlett|focusrite|audient|presonus|motu|rode|shure|blue|zoom|steinberg|behringer/i.test(x.label));
    if (u && S.inputId !== u.deviceId) { S.inputId = u.deviceId; localStorage.setItem('cz.inputId', u.deviceId); S.closeMic(); await S.openMic(); }
  }
  render();
}
async function pickUsbDev(j) { const ins = IOS.inputs.filter((x) => x.deviceId !== 'default' && x.deviceId !== ''); S.inputId = ins[j].deviceId; localStorage.setItem('cz.inputId', S.inputId); S.closeMic(); await S.openMic(); render(); }

// library settings
function libWhere() { return localStorage.getItem('cz.libKind') || 'device'; }
function introLibrary() {
  const can = S.folderSupported(), where = libWhere(), dev = isPhone() ? 'This phone' : 'This computer';
  const opt = (k, col, icon, name, note, off) => `<button class="iopt ${where === k ? 'sel' : ''}" ${off ? 'disabled' : ''} onclick="pickLib('${k}')">${hexI(col, icon)}<span><b>${name}</b><small>${note}</small></span></button>`;
  const clouds = ['Google Drive', 'OneDrive', 'Dropbox', 'iCloud Drive'];
  const folder = localStorage.getItem('cz.libLoc') === 'folder' && S.folder ? S.folder.name : '';
  return `<h2>Library settings ${ii('libset')}</h2><p class="dim2">Where Lt. Joe Bookman keeps songs and mixes.</p>
    ${opt('device', '#9AD6C5', isPhone() ? IC.phone : IC.drive, dev, CZ.DESKTOP ? 'Kept in Conceptor on this computer.' : 'Kept in this browser on this ' + (isPhone() ? 'phone.' : 'computer.'))}
    ${CZ.DESKTOP || !isPhone() ? opt('external', '#F0D68C', IC.drive, 'External drive', can ? 'A copy is kept in a folder on a USB or external drive.' : 'Needs Chrome or Edge on a computer.', !can) : ''}
    ${opt('cloud', '#A2C9E8', IC.cloud, 'Cloud drive', can ? 'A copy is kept in a synced folder. It opens on other devices too.' : 'Needs Chrome or Edge on a computer. On a phone, use Export to keep copies.', !can)}
    ${where === 'cloud' && can ? `<div class="row" style="flex-wrap:wrap;margin:2px 0 4px">${clouds.map((c) => B(c, `IN.cloud='${c}';localStorage.setItem('cz.libCloud','${c}');render()`, 's ' + ((localStorage.getItem('cz.libCloud') || IN.cloud) === c ? 'yel' : ''))).join('')}</div>` : ''}
    ${where !== 'device' && can ? `<div class="ifold"><span class="lab">FOLDER</span><b>${folder ? esc(folder) + ' / Conceptor Library' : 'Not chosen yet'}</b>${B(folder ? 'Change folder…' : 'Choose folder…', 'chooseLibFolder()', 's on')}</div>
      <p class="dim2">${where === 'cloud' ? 'Choose the ' + esc(localStorage.getItem('cz.libCloud') || IN.cloud) + ' folder on this computer.' : 'Choose a folder on the external drive.'} Heavy and Light songs go in separate folders inside: My Songs / Heavy and My Songs / Light.</p>` : ''}`;
}
function pickLib(k) { localStorage.setItem('cz.libKind', k); if (k === 'device') localStorage.setItem('cz.libLoc', 'browser'); render(); }
async function chooseLibFolder() {
  try { await S.pickFolder(); } catch (e) { return; }
  if (!(await S.folderAllowed(true))) { message('Library settings', 'Conceptor was not allowed to use that folder.'); return; }
  localStorage.setItem('cz.libLoc', 'folder'); render(); toast('Library folder set.');
}

// start
function introStart() {
  const t = (on, col, icon, name, note) => `<button class="iopt big" onclick="${on}">${hexI(col, icon, 52)}<span><b>${name}</b><small>${note}</small></span></button>`;
  return `<h2>Start ${ii('startm')}</h2><div class="istart">
    ${t('startNew()', '#9AD6C5', IC.plus, 'New Song', 'Opens the main screen.')}
    ${t('startOpen()', '#F0D68C', IC.folder, 'Open an existing song', isLight() ? 'Light songs only.' : 'Opens Lt. Joe Bookman, My Songs.')}
    ${t('startUm()', '#B9AAE0', BLASTER(18), 'Turn on the Ultrasound Machine', 'Plays songs and playlists.')}
    ${t('startLib()', '#EAB592', BOOK(20), 'View Library', 'Opens Lt. Joe Bookman.')}</div>
    ${isLight() ? `<p class="inote"><span class="info" style="pointer-events:none">i</span>Conceptor - Light opens Light songs only. Heavy songs open in the desktop app.</p>` : ''}
    <div class="inav"><button class="b inb" onclick="introGo(2)">Back</button>${S.song ? `<button class="b inb" onclick="go('mix')">Back to ${esc(song().name)}</button>` : ''}</div>`;
}
async function startNew() {
  await S.startAudio(); await S.newSong(null);
  song().kind = ED.v; if (isLight()) song().mode = 'polished';
  applySongEd(); localStorage.setItem('cz.intro', '1'); go('mix');
}
function startOpen() { LIBV.cat = 'Songs'; LIBV.kind = ED.v; go('lib'); }
async function startUm() { await S.startAudio(); go('um'); }
function startLib() { LIBV.cat = 'Songs'; LIBV.kind = ED.v; go('lib'); }
function askMode() { applySongEd(); localStorage.setItem('cz.intro', '1'); go('mix'); }
function openSongs() { startOpen(); }
async function libOpenSong(i) {
  const x = libSongs()[i]; if (!x) return;
  if (isLight() && x.kind === 'heavy') { message('Heavy song', '"' + esc(x.name) + '" is a Heavy song. It opens in Conceptor - Heavy on a Mac or Windows computer.'); return; }
  if (S.song && x.name === S.song.name) { applySongEd(); go('mix'); return; }
  if (S.song) await S.saveNow();
  if (await S.load(x.name)) askMode();
}
const libSongs = () => LIBV.songs.filter((s) => s.kind === (LIBV.kind || ED.v));

// ------------------------------------------------------------------ main screen: palette on top, faders below
const PAL_L = () => [['Drums', "go('drums')", '#F0D68C'], ['Drop In', 'dropIn()', '#EAB592'], ['Tuner', 'openTuner()', '#A2C9E8'], ['Bounce', 'bounceFlow()', '#9AD6C5'],
  ['Add Track', 'addTrack()', '#B9AAE0', song().shown >= CZ.LIGHT_TRACKS], ['Save', "S.saveNow().then(()=>toast('Saved.'))", '#E5AAB9'], ['Hand Hold', 'toggleHH2()', handHold() ? '#C9CBD0' : '#77797f'],
  ['Lt. Joe Bookman', "go('lib')", '#EAB592'], ['Ultrasound Machine', "go('um')", '#B9AAE0'], ['Input + Output', "go('io')", '#A2C9E8'], ['Home', 'toIntroStart()', '#F0D68C']];
const PAL_H = () => [['Edit Mode', "go('edit')", '#F0D68C'], ['Drop In', 'dropIn()', '#EAB592'], ['Trim', "editTool('trim')", '#C9CBD0'], ['Insert Silence', "editTool('sil')", '#C9CBD0'], ['Drums', "go('drums')", '#F0D68C'], ['Tuner', 'openTuner()', '#A2C9E8'], ['Bounce', 'exTrim(-1)', '#9AD6C5'],
  ['Export', 'exportFlow()', '#9AD6C5'], ['Add Track', 'addTrack()', '#B9AAE0', song().shown >= CZ.TRACKS], ['Save', "S.saveNow().then(()=>toast('Saved.'))", '#E5AAB9'], ['Undo', 'undoTake()', '#E5AAB9'], ['Input + Output', "go('io')", '#A2C9E8'], ['Song Settings', 'tempoDialog()', '#B9AAE0'],
  ['Hand Hold', 'toggleHH2()', handHold() ? '#C9CBD0' : '#77797f'], [pol() ? 'Polished' : 'Demo', 'changeMode()', '#F0D68C'], ['Lt. Joe Bookman', "go('lib')", '#EAB592'], ['Ultrasound Machine', "go('um')", '#B9AAE0'], ['Light or Heavy', 'switchEd()', '#9AD6C5'], ['Home', 'toIntroStart()', '#F0D68C']];
function toggleHH2() { setHandHold(!handHold()); toast(handHold() ? 'Hand Hold on.' : 'Hand Hold off.'); render(); }
function switchEd() { step({ title: 'Light or Heavy', tip: 'edchoice', text: 'Changing the version goes back to the start screens. The song is saved first.', opts: [['Change version', async () => { closeBox(); if (S.song) await S.saveNow(); introGo(0); }]] }); }
// rows of a honeycomb, and a hexagon size that fits the space
function palette(items, W, H, maxHw = 128) {
  const n = items.length, gap = 6;
  let best = null;
  for (let r = 1; r <= 6; r++) {
    let a = 1; while (Math.ceil(r / 2) * a + Math.floor(r / 2) * (a - 1) < n) a++;   // rows go a, a-1, a, ...
    const hw = Math.min((W - (a - 1) * gap - 8) / a, (H - 22) / (1.15 * (1 + (r - 1) * 0.76)));
    if (!best || (best.hw < maxHw && hw > best.hw + 0.5)) best = { r, a, hw };
  }
  const hw = Math.max(40, Math.min(best.hw, maxHw)), hh = hw * 1.15, rows = [];
  for (let i = 0, k = 0; i < best.r; i++) { const c = i % 2 === 0 ? best.a : best.a - 1; rows.push(items.slice(k, k + c)); k += c; }
  const fs = clamp(Math.round(hw / 7.2), 9, 16);
  return `<div class="pal" style="--hw:${hw.toFixed(0)}px;--hh:${hh.toFixed(0)}px;--g:${gap}px;--fs:${fs}px">${rows.filter((x) => x.length).map((row) => `<div class="prow">${row.map(([l, a, col, off]) => `<button class="phx" style="background:${col}" onclick="${a}" ${off ? 'disabled' : ''} data-n="${l}">${l}</button>`).join('')}</div>`).join('')}</div>`;
}
function mixLight() {
  const s = song(), app = $('app'), W = app.clientWidth || window.innerWidth, H = (app.clientHeight || window.innerHeight) - (document.querySelector('.top') ? 0 : 52);
  const palH = Math.max(150, Math.round(H * 0.5) - 52);
  let h = `<div class="edmix"><div class="edtop" style="height:${palH}px">${palette(PAL_L(), W - 12, palH)}</div>
    <div class="edlow"><div class="edlab"><span>MIXER · ${s.shown} OF 4 TRACKS</span><span class="sp"></span><span>REC: ONE TRACK AT A TIME</span>${ii('lstrips')}</div><div class="lstrips">`;
  const strip = (id, col, name, b2, arm, isM) => `<div class="ls ${isM ? 'master' : ''}"><div class="tab" style="background:${col}"></div><div class="lnm" ${id !== 'd' && id !== 'm' ? `onclick="trackMenu(${id})"` : ''} data-n="${esc(name)}">${esc(name)}</div>
    ${B('FX', isM ? "openFx('m','eq')" : `openFx('${id}','${id === 'd' ? 'comp' : 'amp'}')`, 's fxb', 'data-n="Effects"')}${b2}
    ${isM ? '<div class="kpad"></div>' : `<div class="kwrap">${panKnob(id, 24)}</div>`}
    ${isM ? '<div class="mspad"></div>' : `<div class="ms">${bM(id)}${bS(id)}</div>`}${arm}
    <div class="fz">${faderHTML(id, isM ? s.masterVol : ch(id).vol)}${isM ? '<div class="meter"><i id="mt-L"></i></div><div class="meter"><i id="mt-R"></i></div>' : `<div class="meter"><i id="mt-${id}"></i></div>`}</div><div class="db">${dbText(isM ? s.masterVol : ch(id).vol)}</div></div>`;
  h += strip('d', DRUMCOL, 'Drums', B('Beats', "go('drums')", 's', 'data-n="Open the drum programmer"'), '<div class="armpad"></div>');
  tracksShown().forEach((t, i) => { h += strip(i, colOf(i), t.name, B('Wave', `openWave(${i})`, 's', (t.audio ? '' : 'disabled ') + 'data-n="Wave: Insert Silence, Drop In spots, Gain"'), `<button class="arm ${t.arm ? 'on' : ''}" onclick="arm(${i})" aria-label="Arm ${esc(t.name)} to record" data-n="Record arm: one track at a time"><i></i></button>`); });
  h += strip('m', '#E2BF6A', 'Master', '<div class="b2pad"></div>', '<div class="armpad"></div>', true);
  return h + '</div></div></div>';
}
function mixHeavy() {
  const app = $('app'), W = app.clientWidth || window.innerWidth, H = app.clientHeight || window.innerHeight;
  const palH = Math.max(160, Math.round((H - 58) * 0.5)), palW = Math.round(W * 0.56);
  const w0 = ui.waves; ui.waves = false;
  const strips = screens.mix043().replace(/^<div class="mixmain[^>]*>[\s\S]*?<div class="mixer" data-keep="mixer">/, '<div class="mixer hmixer" data-keep="mixer">').replace(/<\/div>$/, '');
  ui.waves = w0;
  return `<div class="edmix heavy"><div class="edtop" style="height:${palH}px"><div class="palbox" style="width:${palW}px">${palette(PAL_H(), palW - 12, palH, 86)}</div><div class="hov">${lanesHTML('mini', W - palW - 16)}</div></div>
    <div class="edlow">${strips}</div></div>`;
}
screens.mix043 = screens.mix;
screens.mix = () => (isLight() ? mixLight() : mixHeavy());
after.mix = () => { wireControls(); if (!isLight()) lanesAfter(); };

// top bar
const _topBar = topBar;
topBar = function () {   // eslint-disable-line no-func-assign
  if (!S.song) return `<div class="top">${B(HIVE + 'Start', 'toIntroStart()', 's', 'data-n="The start screen"')}<span class="brand">CONCEPTOR <span class="edn">${isLight() ? 'LIGHT' : 'HEAVY'}</span></span><span class="ttl">${{ lib: 'LT. JOE BOOKMAN', um: 'ULTRASOUND MACHINE', io: 'INPUT AND OUTPUT' }[ui.screen] || ''}</span></div>`;
  if (!isLight()) return _topBar().replace('<span class="brand">CONCEPTOR</span>', '<span class="brand">CONCEPTOR <span class="edn">HEAVY</span></span>').replace(HIVE + 'Home', HIVE + 'Mixer');
  const sc = ui.screen, back = sc === 'mix' ? '' : B(HIVE + 'Mixer', 'goHome()', 's', 'data-n="Back to the main screen"');
  const title = { drums: 'DRUMS', lib: 'LT. JOE BOOKMAN', um: 'ULTRASOUND', io: 'INPUT + OUTPUT' }[sc];
  const playing = S.playing && !S.recording, rec = S.recording && S.dropTrack == null, drop = S.recording && S.dropTrack != null;
  return `<div class="top ltop">${back}<span class="lbr"><span class="brand">CONCEPTOR <span class="edn">LIGHT</span></span><span class="song" onclick="renameSongFlow()" data-n="Song name: tap to rename">${title ? title : esc(song().name)}</span></span><span class="sp"></span>
    <span class="clock" id="clock" data-n="Counter: green playing, orange counting down, red recording">${fmtC(S.now())}</span>
    <span class="tp">${B(BACKI, 'tStart()', 't', 'data-n="Stop and go to the start"')}${B(playing ? STOPI : PLAYI, 'tPlay()', 't gplay ' + (playing ? 'on' : ''), 'data-n="Play / Stop"')}${B(RECI, drop ? 'dropIn()' : 'tRec()', 't ' + (rec || drop ? 'rec' : 'grec'), 'data-n="Record the armed track"')}</span>${B('&#9776;', 'openMenu()', 't', 'data-n="Menu" aria-label="Menu"')}</div>`;
};
function goHome() { closeBox(); closePop(true); $('tip').classList.remove('show'); S.stopListen(); if (S.playing) S.stop(); if (S.song) go('mix'); else toIntroStart(); }

const _openMenu = openMenu;
openMenu = function () {   // eslint-disable-line no-func-assign
  if (!isLight()) { _openMenu(); const p = $('menuPan'); p.insertAdjacentHTML('afterbegin', `<div class="hx" onclick="closeMenu();toIntroStart()"><span>${HIVE} Start screen</span></div><div class="hx" onclick="closeMenu();switchEd()"><span>Light or Heavy</span></div>`); p.querySelector('.dim:last-child').textContent = edName('heavy') + ' ' + CZ.VERSION; return; }
  const items = [['Start screen', 'toIntroStart()'], ['Tempo and loop', 'tempoDialog()'], ['New song', 'startNew()'], ['Open a song', 'startOpen()'], ['Undo last take', 'undoTake()'], ['Save now', "S.saveNow().then(()=>toast('Saved.'))"], ['Help', 'helpBox()']]
    .concat(CZ.DESKTOP ? [['Light or Heavy', 'switchEd()']] : []);
  $('menuPan').innerHTML = items.map(([l, a]) => `<div class="hx" onclick="closeMenu();${a}"><span>${l}</span></div>`).join('') +
    `<div class="hx" onclick="toggleHH()"><span>Hand Hold ${ii('hh')}</span><span class="tg ${handHold() ? 'on' : ''}"><i></i></span></div><div class="dim" style="text-align:center;margin-top:4px">${edName('light')} ${CZ.VERSION}</div>`;
  $('menu').classList.add('show');
};

// ------------------------------------------------------------------ Light limits
const _addTrack = addTrack;
addTrack = function () {   // eslint-disable-line no-func-assign
  if (isLight() && song().shown >= CZ.LIGHT_TRACKS) { toast('4 tracks is the most in Conceptor - Light.'); return; }
  _addTrack();
};
const _arm = arm;
arm = async function (i) {   // eslint-disable-line no-func-assign
  if (!isLight()) return _arm(i);
  const s = song(), t = s.tracks[i]; if (S.recording) return;
  const on = !t.arm; s.tracks.forEach((x) => { x.arm = false; });
  if (on) { await S.startAudio(); if (!(await S.openMic())) { message('Record', 'Recording needs the microphone. Allow it in the settings for this app.'); render(); return; } t.input = '1'; t.arm = true; }
  S.changed('arm'); render();
};
const _go = go;
go = function (sc) {   // eslint-disable-line no-func-assign
  if (isLight() && sc === 'edit') { toast('Edit Mode is in Conceptor - Heavy.'); return; }
  if (!S.song && ['mix', 'edit', 'drums'].includes(sc)) { toIntroStart(); return; }
  _go(sc);
};
const _exportFlow = exportFlow;
exportFlow = function () { if (isLight()) bounceFlow(); else _exportFlow(); };   // eslint-disable-line no-func-assign
const _dpBars = dpBars;
dpBars = function (b) { if (isLight() && b !== 2) { toast('Drum patterns are 2 bars in Conceptor - Light.'); return; } _dpBars(b); };   // eslint-disable-line no-func-assign
const _pickInput = pickInput;
pickInput = function (i) { if (isLight()) { toast('Conceptor - Light records from Input 1.'); return; } _pickInput(i); };   // eslint-disable-line no-func-assign

// Drop In: with spots set on the wave, recording starts at IN and stops at OUT by itself
const _dropGo = dropGo;
dropGo = async function (i) {   // eslint-disable-line no-func-assign
  const t = song().tracks[i];
  if (isLight() && t.spot && t.spot[1] > t.spot[0]) { S.pos = t.spot[0]; ui.dropOut = t.spot[1]; } else ui.dropOut = null;
  return _dropGo(i);
};
(function spotLoop() {
  try {
    if (ui.dropOut != null) {
      if (!S.recording) ui.dropOut = null;
      else if (S.dropTrack != null && S.countIn() <= 0.02 && S.now() >= ui.dropOut) { ui.dropOut = null; S.stop(); toast('Drop In done. Stopped at OUT.'); }
    }
  } catch (e) {}
  requestAnimationFrame(spotLoop);
})();

// ------------------------------------------------------------------ Light bounce: trim and fade out, then save
function bounceFlow() {
  if (S.playing) S.stop();
  if (S.length() <= 0) { message('Bounce', 'This song has no audio yet.'); return; }
  bounceRender();
}
async function bounceRender() {
  busy('Bounce', 'Making the mix. This takes a few seconds.');
  const r = await S.renderMixChannels(); let chs = r.channels; if (chs.length === 1) chs = [chs[0], chs[0]];
  EX = { what: -1, ch: chs, a: 0, b: 1, cur: 0, fade: +(localStorage.getItem('cz.fade') || 0), bounce: true };
  bounceStep();
}
function bounceStep() {
  const fades = [0, 2, 5, 10];
  step({ title: 'Bounce: ' + song().name, tip: 'bounce', wide: true, text: 'Bounced. Trim the start and the end, and fade out the end if needed.',
    html: `<div class="lab" style="margin:2px 0 4px">TRIM ${ii('extrim')}</div><canvas class="wv" id="exw" width="1400" height="220" style="height:110px"></canvas><div class="row" style="margin-top:5px"><span class="dim">Start <b id="exa" style="color:var(--gold)"></b></span><span class="sp"></span><span class="dim">Cursor <b id="exc" style="color:var(--gold)"></b></span><span class="sp"></span><span class="dim">End <b id="exb" style="color:var(--gold)"></b></span></div>
      <div class="row" style="margin-top:6px;justify-content:center">${B(BACKI, 'exStop();EX.cur=EX.a;exDraw()', 's', 'data-n="Cursor to the start"')}${B(PLAYI + ' Play from cursor', 'exPlay()', 's gplay', 'id="exp" data-n="Play from the cursor"')}</div>
      <div class="lab" style="margin:10px 0 4px">FADE OUT ${ii('fade')}</div><div class="row" style="flex-wrap:wrap">${fades.map((f) => B(f ? f + ' s' : 'Off', `EX.fade=${f};localStorage.setItem('cz.fade',${f});bounceFadeSel()`, 's fadeb ' + (EX.fade === f ? 'yel' : ''), `data-f="${f}"`)).join('')}</div>`,
    opts: [['Save', () => { exStop(); bounceSave(); }, 'on']], cancelLabel: 'Close without saving', onCancel: () => { exStop(); EX = null; }, after: exWire });
}
function bounceFadeSel() { document.querySelectorAll('.fadeb').forEach((b) => b.classList.toggle('yel', +b.dataset.f === EX.fade)); exDraw(); }
const _exDraw = exDraw;
exDraw = function () {   // eslint-disable-line no-func-assign
  _exDraw(); if (!EX || !EX.bounce || !EX.fade) return;
  const c = $('exw'); if (!c) return; const g = c.getContext('2d'), W = c.width, H = c.height, L = exLen(), fw = Math.min(EX.b - EX.a, EX.fade / L);
  const x0 = (EX.b - fw) * W, x1 = EX.b * W, gr = g.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, 'rgba(18,19,22,0)'); gr.addColorStop(1, 'rgba(18,19,22,.85)');
  g.fillStyle = gr; g.fillRect(x0, 0, x1 - x0, H); g.fillStyle = '#E2BF6A'; g.font = '18px Arial'; g.textAlign = 'right'; g.fillText('Fade ' + EX.fade + ' s', x1 - 8, H - 10); g.textAlign = 'left';
};
async function bounceSave() {
  busy('Bounce', 'Saving. This takes a few seconds.');
  const s = song(), sr = S.sr, L = EX.ch[0].length, a = Math.round(EX.a * L), b = Math.round(EX.b * L);
  const chs = EX.ch.map((c) => c.slice(a, b)), n = chs[0].length;
  const fl = Math.min(n, Math.round(sr / 200));
  if (a > 0) for (const c of chs) for (let i = 0; i < fl; i++) c[i] *= i / fl;
  const fn = EX.fade ? Math.min(n, Math.round(EX.fade * sr)) : (b < L ? fl : 0);
  for (const c of chs) for (let i = 0; i < fn; i++) c[n - 1 - i] *= i / fn;
  const blob = CZ.encodeWav(chs, sr);
  const e = await S.addExport('mix', s.name + ' – Mix', 'WAV', blob, n / sr);
  EX = null; libRefresh();
  const ref = 'x:' + s.name + ':' + e.id;
  step({ title: 'Saved to Lt. Joe Bookman', text: `"${esc(e.name)}" is in the library, in Mixes.`, cancel: false, opts: [
    [BOOK(16) + ' Add to Playlist', () => addToPlaylist(ref, e.name)], [BLASTER(12) + ' Play in Ultrasound', () => { closeBox(); umPlayRef(ref); }],
    [BOOK(16) + ' View in Library', () => { closeBox(); LIBV.cat = 'Mixes'; go('lib'); }], ['Share File', () => shareBlob(blob, fileNameOf(e))], ['Close', closeBox]] });
}

// Light help
const HELP_L = `Recording
1. Tap the red button on a track. One track records at a time.
2. Press the red record button in the top bar. Play or sing.
3. Press Play / Stop. The recording is on that track.
Wear headphones, so the microphone does not pick up the playback.

Wave
Wave on a track opens its waveform: Insert Silence (paint over a part), Drop In spots (IN and OUT) and Gain.

Drop In
Set the spots on the wave first, or put the cursor where recording should start. Press Drop In, pick the track and the run-up.

Bounce
Makes the finished mix. Trim the start and the end, fade out the end, then Save.

Limits
Up to 4 tracks plus drums. One track records at a time. Drum patterns are 2 bars. Each track holds up to four minutes.`;
const _helpBox = helpBox;
helpBox = function () { if (isLight()) step({ title: 'Help', html: `<div class="help">${esc(HELP_L)}</div>`, cancelLabel: 'Close', wide: true }); else _helpBox(); };   // eslint-disable-line no-func-assign

applyEd(); portClass();
