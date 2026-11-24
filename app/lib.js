// Conceptor 0.4.3: Lt. Joe Bookman (the library) and the Ultrasound Machine (the player).
// Files are deleted only in Lt. Joe Bookman. Playlists are kept in the library.
'use strict';

CZ.SAMPLE_CATS = ['Kicks', 'Snares', 'Hats', 'Percussion', 'Imported'];
const LIBV = { cat: 'Songs', sub: 'Kicks', songs: [], exports: [], files: [], playlists: [] };
async function libRefresh() {
  try {
    if (S.song) await S.saveNow();
    const all = await S.allSongs();
    LIBV.songs = all.sort((a, b) => (b.saved || 0) - (a.saved || 0)).map((x) => ({ name: x.name, mode: x.mode, saved: x.saved, tracks: (x.tracks || []).filter((t) => t.audio).length, mixes: (x.exports || []).length }));
    LIBV.exports = []; for (const s of all) for (const e of s.exports || []) LIBV.exports.push({ e, song: s.name });
    LIBV.exports.sort((a, b) => String(b.e.id).localeCompare(String(a.e.id)));
    LIBV.files = (await S.allFiles()).sort((a, b) => String(b.id).localeCompare(String(a.id)));
    LIBV.playlists = await S.playlists();
  } catch (e) { console.error(e); }
  if (ui.screen === 'lib' || ui.screen === 'um') render();
}
function drumSampleList(cat) {
  if (cat === 'Imported') return LIBV.files.filter((f) => f.cat === 'drum').map((f) => ({ ref: 'f:' + f.id, name: f.name, blob: f.blob, len: f.len, imported: true }));
  return CZ.SAMPLES.map((x, k) => ({ ref: 'b:' + k, name: x[1], builtin: k, cat: x[0], len: x[2].len })).filter((x) => x.cat === cat);
}
// one entry for anything that can be played: exported mixes and tracks (x:), imported files (f:), built-in drum samples (b:)
function refInfo(ref) {
  if (ref.startsWith('x:')) { const song_ = ref.slice(2, ref.lastIndexOf(':')), id = ref.slice(ref.lastIndexOf(':') + 1); const x = LIBV.exports.find((q) => q.song === song_ && q.e.id === id); return x ? { ref, name: x.e.name, sub: `${x.e.kind === 'mix' ? 'Mix' : 'Track'} · ${x.e.fmt} · ${x.e.date}${x.e.len ? ' · ' + fmt(x.e.len) : ''}`, blob: x.e.blob, file: fileNameOf(x.e), song: song_, id } : null; }
  if (ref.startsWith('f:')) { const f = LIBV.files.find((q) => 'f:' + q.id === ref); return f ? { ref, name: f.name, sub: `${f.cat === 'drum' ? 'Drum sample · Imported' : 'Imported'} · ${f.date}`, blob: f.blob, file: f.name, fileId: f.id } : null; }
  if (ref.startsWith('b:')) { const k = +ref.slice(2), x = CZ.SAMPLES[k]; return x ? { ref, name: x[1], sub: 'Drum sample · ' + x[0], builtin: k, file: CZ.cleanFile(x[1]) + '.wav' } : null; }
  return null;
}
async function refBlob(info) { if (info.blob) return info.blob; await S.startAudio(); return CZ.encodeWav([CZ.sampleAudio(CZ.SAMPLES[info.builtin][2], S.sr)], S.sr); }
function itemsOf(cat, sub) {
  if (cat === 'Mixes' || cat === 'Tracks') return LIBV.exports.filter((x) => (x.e.kind === 'mix') === (cat === 'Mixes')).map((x) => refInfo('x:' + x.song + ':' + x.e.id));
  if (cat === 'Imported') return LIBV.files.filter((f) => f.cat === 'imp').map((f) => refInfo('f:' + f.id));
  if (cat === 'Drum samples') return drumSampleList(sub).map((f) => refInfo(f.ref));
  return [];
}
const catCount = (c) => (c === 'Songs' ? LIBV.songs.length : c === 'Playlists' ? LIBV.playlists.length : c === 'Drum samples' ? CZ.SAMPLES.length + LIBV.files.filter((f) => f.cat === 'drum').length : itemsOf(c).length);

// ------------------------------------------------------------------ H2: Lt. Joe Bookman
screens.lib = () => {
  const c = LIBV.cat;
  let h = `<div class="split"><div class="cats" data-keep="libcats"><div class="row" style="padding:4px 4px 8px">${BOOK(30)}<b style="color:var(--gold);font-size:11px;line-height:1.2">LT. JOE<br>BOOKMAN</b>${ii('lib')}</div>
    ${['Songs', 'Mixes', 'Tracks', 'Imported', 'Drum samples', 'Playlists'].map((x) => `<div class="cat ${c === x ? 'sel' : ''}" onclick="LIBV.cat='${x}';render()">${x}<small>${catCount(x)}</small></div>` +
      (x === 'Drum samples' && c === x ? CZ.SAMPLE_CATS.map((sname) => `<div class="cat sub ${LIBV.sub === sname ? 'sel' : ''}" onclick="LIBV.sub='${sname}';render()">${sname}<small>${drumSampleList(sname).length}</small></div>`).join('') : '')).join('')}
    <div style="margin-top:8px;display:flex;flex-direction:column;gap:5px">${B(BLASTER(12) + ' Ultrasound Machine', "go('um')", 's', 'data-n="Open the Ultrasound Machine"')}${B('Library Location', 'locationFlow()', 's', 'data-n="Where the library is kept"')}${ii('libloc')}${B('Sync Library', 'syncFlow()', 's', 'data-n="Copy the library to a synced folder"')}${ii('sync')}</div>
    <p class="dim" style="font-size:9px;margin-top:6px">${esc(locText())}</p></div>
    <div class="files" data-keep="libfiles-${c}">`;
  if (c === 'Songs') h += LIBV.songs.map((s, i) => `<div class="file ${S.song && s.name === S.song.name ? 'sel' : ''}"><span class="fn" onclick="libOpenSong(${i})">${esc(s.name)}<small>Folder · ${plural(s.tracks, 'track')} · ${plural(s.mixes, 'export')} · ${s.mode === 'polished' ? 'Polished' : 'Demo'} · saved ${dateOf(s.saved)}${S.song && s.name === S.song.name ? ' · open now' : ''}</small></span>${B('Open song', `libOpenSong(${i})`, 's')}${B('Rename', `renameSongFlow(LIBV.songs[${i}].name)`, 's')}${B('Copy a track', `copyFlow(${i})`, 's', s.tracks ? 'data-n="Copy a track into another song"' : 'disabled')}${B('Delete', `libDeleteSong(${i})`, 's red')}</div>`).join('') + B('New song', 'newSongFlow()', 's on');
  else if (c === 'Playlists') h += LIBV.playlists.map((p, i) => `<div class="file"><span class="fn" onclick="UMV.pl=${i};go('um')">${esc(p.n)}<small>Playlist · ${plural(p.items.length, 'file')}</small></span>${B(PLAYI + ' Play', `umPlaylist(${i})`, 's gplay')}${B('Rename', `renamePl(${i})`, 's')}${B('Delete', `delPl(${i})`, 's red')}</div>`).join('') + B('New playlist', 'newPlaylist()', 's on');
  else {
    const items = itemsOf(c, LIBV.sub).filter(Boolean);
    if (c === 'Imported' || (c === 'Drum samples' && LIBV.sub === 'Imported')) h += `<div class="row" style="margin-bottom:6px">${B('Import a file', `libImport('${c === 'Imported' ? 'imp' : 'drum'}')`, 's on', 'data-n="Add an audio file from this device to the library"')}</div>`;
    h += items.map((f, i) => `<div class="file"><span class="fn" onclick="libPlay(${i})">${esc(f.name)}<small>${esc(f.sub)}</small></span>${B(PLAYI + ' Play', `libPlay(${i})`, 's gplay')}${B('Add to Playlist', `libAddPl(${i})`, 's')}${B('Share', `libShare(${i})`, 's')}${f.builtin != null ? '' : B('Delete', `libDelete(${i})`, 's red')}</div>`).join('') || '<p class="dim">Nothing here yet.</p>';
  }
  return h + '</div></div>';
};
const libItem = (i) => itemsOf(LIBV.cat, LIBV.sub).filter(Boolean)[i];
function libPlay(i) { umPlayRef(libItem(i).ref); }
function libAddPl(i) { const f = libItem(i); addToPlaylist(f.ref, f.name); }
async function libShare(i) { const f = libItem(i); shareBlob(await refBlob(f), f.file); }
function libDelete(i) {
  const f = libItem(i);
  step({ title: `Delete "${f.name}"?`, text: 'This removes it from the library and from any playlists. This cannot be undone.', opts: [['Delete', async () => {
    if (f.song) await S.deleteExport(f.song, f.id); else if (f.fileId) await S.delFile(f.fileId);
    const pls = LIBV.playlists; pls.forEach((p) => { p.items = p.items.filter((r) => r !== f.ref); }); await S.setPlaylists(pls);
    if (UMV.ref === f.ref) umStop(true);
    closeBox(); await libRefresh(); toast('Deleted.');
  }, 'red']] });
}
async function libOpenSong(i) { const n = LIBV.songs[i].name; if (S.song && n === S.song.name) { go('mix'); return; } await S.saveNow(); if (await S.load(n)) askMode(); }
function libDeleteSong(i) {
  const n = LIBV.songs[i].name;
  if (S.song && n === S.song.name) { message('Delete', 'This song is open. Open another song first, then delete this one.'); return; }
  step({ title: `Delete "${n}"?`, text: 'The song folder is removed: its tracks and its exported mixes and tracks. Export or copy anything to keep first. This cannot be undone.', opts: [['Delete', async () => {
    const pre = 'x:' + n + ':'; const pls = LIBV.playlists; pls.forEach((p) => { p.items = p.items.filter((r) => !r.startsWith(pre)); }); await S.setPlaylists(pls);
    await S.remove(n); if (S.folderOn()) S.removeFolderSong(n).catch(() => {}); closeBox(); await libRefresh(); toast(n + ' deleted.');
  }, 'red']] });
}
function libImport(cat) {
  pickFile(async (files) => {
    busy('Import', 'Reading the files.');
    let n = 0;
    for (const file of files) { const a = await S.decodeFile(file, cat === 'drum' ? 4 : CZ.MAX_SECONDS); if (!a) { toast(file.name + ' could not be read.'); continue; } await S.addFile(cat, file.name, file, a.length / S.sr); n++; }
    closeBox(); await libRefresh(); if (n) toast(plural(n, 'file') + ' added to the library.');
  }, true);
}
// a track from the library onto a track of the song
function importFromLib(ti) {
  const items = LIBV.exports.map((x) => refInfo('x:' + x.song + ':' + x.e.id)).concat(LIBV.files.map((f) => refInfo('f:' + f.id))).filter(Boolean);
  if (!items.length) { message('Import', 'The library has no mixes, tracks or imported files yet.'); return; }
  step({ title: 'Import from Lt. Joe Bookman', text: 'Which file? It goes at the start of ' + esc(song().tracks[ti].name) + ', replacing what is there.', back: () => trackMenu(ti),
    opts: items.slice(0, 40).map((f) => [esc(f.name), async () => { const b = await refBlob(f); closeBox(); await doImport(ti, new File([b], f.file, { type: b.type })); }]) });
}
function copyFlow(i) {
  const name = LIBV.songs[i].name;
  S.getSong(name).then((from) => {
    const list = from.tracks.map((t, k) => [t, k]).filter(([t]) => t.audio);
    step({ title: 'Copy a track', n: 1, total: 2, text: 'Which track?', opts: list.map(([t, k]) => [esc(t.name), () => step({ title: 'Copy a track', n: 2, total: 2, text: `Copy "${esc(t.name)}" into which song?`, back: () => copyFlow(i),
      opts: LIBV.songs.map((s) => [esc(s.name) + (s.name === name ? ' (this song)' : ''), async () => { busy('Copy', 'Copying.'); const r = await S.copyTrack(name, k, s.name); closeBox(); await libRefresh(); toast(r === 'full' ? 'That song has no empty track left.' : `Copied as "${r}".`); }]) })]) });
  });
}

// ------------------------------------------------------------------ playlists (kept in the library)
async function savePls() { await S.setPlaylists(LIBV.playlists); render(); }
function addToPlaylist(ref, name) {
  step({ title: 'Add to Playlist', text: `Add "${esc(name)}" to which playlist?`, opts: [...LIBV.playlists.map((p) => [esc(p.n), async () => { if (!p.items.includes(ref)) p.items.push(ref); closeBox(); await savePls(); toast(`Added to ${p.n}.`); }]), ['New playlist', () => newPlaylist(ref)]] });
}
function newPlaylist(first) {
  step({ title: 'New playlist', html: `<input id="rn" class="text" value="Playlist ${LIBV.playlists.length + 1}">`, opts: [['Save', async () => { LIBV.playlists.push({ n: $('rn').value.trim() || 'Playlist', items: typeof first === 'string' ? [first] : [] }); closeBox(); await savePls(); toast('Playlist saved in the library.'); }]] });
  setTimeout(() => $('rn') && $('rn').select(), 30);
}
function renamePl(i) { step({ title: 'Rename playlist', html: `<input id="rn" class="text" value="${esc(LIBV.playlists[i].n)}">`, opts: [['Save', async () => { LIBV.playlists[i].n = $('rn').value.trim() || LIBV.playlists[i].n; closeBox(); await savePls(); }]] }); }
function delPl(i) { step({ title: 'Delete playlist?', text: 'The playlist is removed. The files in it stay in the library.', opts: [['Delete playlist', async () => { LIBV.playlists.splice(i, 1); if (UMV.pl === i) UMV.pl = null; closeBox(); await savePls(); }, 'red']] }); }

// ------------------------------------------------------------------ Library Location and Sync Library (as in 0.4.2)
function locText() { return localStorage.getItem('cz.libLoc') === 'folder' && S.folder ? 'Kept in this browser, and in the folder "' + S.folder.name + '"' : 'Kept in this browser on this device'; }
function locationFlow() {
  const can = S.folderSupported();
  step({ title: 'Library Location', tip: 'libloc', n: 1, text: `Now: ${esc(locText())}. Where should the library be kept?`, opts: [
    ['In this browser on this device', () => { localStorage.setItem('cz.libLoc', 'browser'); closeBox(); render(); toast('Library is kept in this browser.'); }],
    ['Also in a synced folder (OneDrive or Google Drive)', locFolder, '', !can]],
    html: can ? '' : '<p class="dim">A synced folder needs Chrome or Edge on a computer. On phones and tablets the library stays on the device. Use Export to keep copies.</p>' });
}
function locFolder() {
  step({ title: 'Library Location', n: 2, total: 2, back: locationFlow,
    text: 'Choose the OneDrive or Google Drive folder on this computer. Conceptor makes a folder called "Conceptor Library" inside it. That app keeps it in sync with the cloud.',
    opts: [['Choose folder', async () => {
      try { await S.pickFolder(); } catch (e) { return; }
      if (!(await S.folderAllowed(true))) { message('Library Location', 'Conceptor was not allowed to use that folder.'); return; }
      localStorage.setItem('cz.libLoc', 'folder'); closeBox(); render(); toast('Library is also kept in ' + S.folder.name + '. Press Sync Library to copy everything there now.');
    }]] });
}
function syncFlow() {
  step({ title: 'Sync Library', tip: 'sync', n: 1, text: 'Sync with what?', opts: [['A synced folder (OneDrive or Google Drive)', syncFolder, '', !S.folderSupported()]],
    html: S.folderSupported() ? '' : '<p class="dim">Syncing needs Chrome or Edge on a computer.</p>' });
}
async function syncFolder() {
  if (!S.folder) await S.restoreFolder();
  if (!S.folder) { step({ title: 'Sync Library', n: 2, total: 3, back: syncFlow, text: 'Choose the OneDrive or Google Drive folder on this computer.', opts: [['Choose folder', async () => { try { await S.pickFolder(); } catch (e) { return; } localStorage.setItem('cz.libLoc', 'folder'); syncFolder(); }]] }); return; }
  if (!(await S.folderAllowed(true))) { message('Sync Library', 'Conceptor was not allowed to use the folder "' + esc(S.folder.name) + '".'); return; }
  const there = await S.folderSongs();
  const go2 = async () => {
    busy('Syncing', 'Copying songs, tracks and mixes.');
    try { const r = await S.syncFolder((t) => { const p = $('dlg').querySelector('p'); if (p) p.textContent = t; }); closeBox(); await libRefresh(); toast(`Library synced. ${plural(r.brought, 'song')} brought in, ${plural(r.sent, 'song')} saved to the folder.`); }
    catch (e) { console.error(e); message('Sync Library', 'The sync did not finish. Check the folder is still there, then try again.'); }
  };
  if (there.length) step({ title: 'Library found', n: 3, total: 3, back: syncFlow, text: `"${esc(S.folder.name)}" already has a Conceptor Library with ${plural(there.length, 'song')}. Combine it with the library here? Nothing is deleted. If both have a song with the same name and different content, both copies are kept.`, opts: [['Combine and sync', go2]] });
  else step({ title: 'Sync Library', n: 3, total: 3, back: syncFlow, text: `Copies every song to "${esc(S.folder.name)}/Conceptor Library".`, opts: [['Start sync', go2]] });
}

// ------------------------------------------------------------------ I: Ultrasound Machine. Browse the library, play, playlists. No deleting.
const UMV = { cat: 'Mixes', sub: 'Kicks', pl: null, ref: null, name: '', buf: null, pk: null, pos: 0, playing: false, src: null, at: 0, queue: null, qi: 0 };
screens.um = () => {
  let h = `<div class="split"><div class="cats" data-keep="umcats"><div class="row" style="padding:4px 4px 8px">${BLASTER(26)}${ii('um')}</div>
    <div class="lab" style="margin:2px 4px 4px">LIBRARY</div>${['Mixes', 'Tracks', 'Imported', 'Drum samples', 'Playlists'].map((c) => `<div class="cat ${UMV.cat === c && UMV.pl == null ? 'sel' : ''}" onclick="UMV.cat='${c}';UMV.pl=null;render()">${c}<small>${catCount(c)}</small></div>` +
      (c === 'Drum samples' && UMV.cat === c && UMV.pl == null ? CZ.SAMPLE_CATS.map((sname) => `<div class="cat sub ${UMV.sub === sname ? 'sel' : ''}" onclick="UMV.sub='${sname}';render()">${sname}<small>${drumSampleList(sname).length}</small></div>`).join('') : '')).join('')}
    <div class="file" style="margin-top:10px;cursor:pointer;background:var(--goldDark);border-color:rgba(226,191,106,.5);flex-wrap:nowrap" onclick="go('lib')" data-n="Open Lt. Joe Bookman, the library">${BOOK(40)}<span style="font-size:10px;color:var(--gold);line-height:1.3">Open<br>Lt. Joe<br>Bookman</span></div></div>
    <div class="files" data-keep="umfiles">`;
  if (UMV.pl != null && LIBV.playlists[UMV.pl]) {
    const p = LIBV.playlists[UMV.pl];
    h += `<div class="row" style="margin-bottom:6px;flex-wrap:wrap">${B('&#8249; Playlists', "UMV.pl=null;UMV.cat='Playlists';render()", 's')}<b style="color:var(--gold)">${esc(p.n)}</b><span class="sp"></span>${B(PLAYI + ' Play all', `umPlaylist(${UMV.pl})`, 's gplay', 'data-n="Play the playlist from the top"')}${B('Rename', `renamePl(${UMV.pl})`, 's')}</div>`;
    h += p.items.map((r, i) => { const f = refInfo(r); return `<div class="file ${UMV.ref === r ? 'sel' : ''}"><span class="fn" onclick="umPlaylist(${UMV.pl},${i})">${esc(f ? f.name : 'Missing file')}<small>${f ? esc(f.sub) : 'No longer in the library'}</small></span>${B('&#9650;', `plMove(${i},-1)`, 's r', (i ? '' : 'disabled ') + 'data-n="Move up"')}${B('&#9660;', `plMove(${i},1)`, 's r', (i < p.items.length - 1 ? '' : 'disabled ') + 'data-n="Move down"')}${B('Take out', `plTakeOut(${i})`, 's', 'data-n="Take out of this playlist. The file stays in the library."')}</div>`; }).join('') || '<p class="dim">Empty. Add files from the folders on the left with + Playlist.</p>';
    h += '<p class="dim" style="margin-top:6px">Take out removes the file from this playlist only. Files are deleted in Lt. Joe Bookman.</p>';
  } else if (UMV.cat === 'Playlists') {
    h += LIBV.playlists.map((p, i) => `<div class="file"><span class="fn" onclick="UMV.pl=${i};render()">${esc(p.n)}<small>${plural(p.items.length, 'file')} · kept in the library</small></span>${B('Open', `UMV.pl=${i};render()`, 's')}${B(PLAYI + ' Play', `umPlaylist(${i})`, 's gplay')}</div>`).join('') + B('New playlist', 'newPlaylist()', 's on');
  } else {
    h += itemsOf(UMV.cat, UMV.sub).filter(Boolean).map((f, i) => `<div class="file ${UMV.ref === f.ref ? 'sel' : ''}"><span class="fn" onclick="umIdx(${i})">${esc(f.name)}<small>${esc(f.sub)}</small></span>${B(PLAYI, `umIdx(${i})`, 's r gplay', 'data-n="Play"')}${B('+ Playlist', `umIdx(${i},1)`, 's', 'data-n="Add to a playlist"')}</div>`).join('') || '<p class="dim">Nothing here yet.</p>';
  }
  h += `</div></div><div class="nowp"><div class="row" style="margin-bottom:4px"><b style="font-size:11px;color:var(--gold);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${UMV.ref ? esc(UMV.name) : 'Nothing playing. Pick a file.'}</b><span class="clock" style="font-size:11px;min-width:0;padding:2px 8px" id="umc">0:00 / 0:00</span></div>
    <canvas id="umw" width="1400" height="70" data-n="Tap to jump"></canvas><div class="row" style="justify-content:center;margin-top:5px">${B('&#8630; 10 s', 'umSkip(-10)', 's', 'data-n="Back 10 seconds"')}${B(UMV.playing ? '&#10074;&#10074;' : PLAYI, 'umToggle()', 't gplay ' + (UMV.playing ? 'on' : ''), 'data-n="Play / Pause"')}${B('10 s &#8631;', 'umSkip(10)', 's', 'data-n="Forward 10 seconds"')}</div></div>`;
  return h;
};
after.um = () => { const c = $('umw'); if (c) c.onclick = (e) => { if (!UMV.buf) return; const r = c.getBoundingClientRect(); umSeek((e.clientX - r.left) / r.width * UMV.buf.duration); }; umDraw(); };
function umIdx(i, pl) { const f = itemsOf(UMV.cat, UMV.sub).filter(Boolean)[i]; if (pl) addToPlaylist(f.ref, f.name); else umPlayRef(f.ref); }
async function plMove(i, d) { const a = LIBV.playlists[UMV.pl].items; [a[i], a[i + d]] = [a[i + d], a[i]]; await savePls(); }
async function plTakeOut(i) { LIBV.playlists[UMV.pl].items.splice(i, 1); await savePls(); }
const umNow = () => (UMV.playing ? Math.min(UMV.buf.duration, UMV.pos + S.ctx.currentTime - UMV.at) : UMV.pos);
async function umPlayRef(ref, keepQueue) {
  await libRefresh();
  const f = refInfo(ref); if (!f) { toast('That file is no longer in the library.'); return; }
  if (!keepQueue) UMV.queue = null;
  umStop(true); if (S.playing) S.stop(); S.stopListen();
  UMV.ref = ref; UMV.name = f.name; UMV.buf = null; UMV.pos = 0;
  if (ui.screen !== 'um') { if (UMV.pl == null && !keepQueue) { UMV.cat = ref.startsWith('b:') || (ref.startsWith('f:') && f.sub.startsWith('Drum')) ? 'Drum samples' : ref.startsWith('f:') ? 'Imported' : f.sub.startsWith('Mix') ? 'Mixes' : 'Tracks'; } go('um'); } else render();
  try {
    await S.startAudio();
    UMV.buf = f.builtin != null ? (() => { const a = CZ.sampleAudio(CZ.SAMPLES[f.builtin][2], S.sr), b = S.ctx.createBuffer(1, a.length, S.sr); b.getChannelData(0).set(a); return b; })() : await S.ctx.decodeAudioData(await f.blob.arrayBuffer());
  } catch (e) { toast('That file could not be played.'); return; }
  if (UMV.ref !== ref) return;
  const chs = []; for (let k = 0; k < UMV.buf.numberOfChannels; k++) chs.push(UMV.buf.getChannelData(k));
  UMV.pk = CZ.peaks(chs, Math.max(1, Math.floor(UMV.buf.length / 700)));
  umPlay();
}
async function umPlaylist(i, from = 0) {
  await libRefresh();
  const p = LIBV.playlists[i]; if (!p || !p.items.length) { toast('The playlist is empty.'); return; }
  UMV.pl = i; UMV.queue = p.items.slice(); UMV.qi = from; umPlayRef(UMV.queue[from], true);
}
function umPlay() {
  if (!UMV.buf) return;
  if (UMV.pos >= UMV.buf.duration - 0.05) UMV.pos = 0;
  const src = S.ctx.createBufferSource(); src.buffer = UMV.buf; src.connect(S.ctx.destination);
  UMV.at = S.ctx.currentTime + 0.02; src.start(UMV.at, UMV.pos); UMV.src = src; UMV.playing = true;
  src.onended = () => {
    if (UMV.src !== src) return; UMV.playing = false; UMV.src = null; UMV.pos = UMV.buf.duration;
    if (UMV.queue && UMV.qi + 1 < UMV.queue.length) { UMV.qi++; umPlayRef(UMV.queue[UMV.qi], true); return; }
    if (ui.screen === 'um') render();
  };
  if (ui.screen === 'um') render();
}
function umPause() { if (UMV.playing) { UMV.pos = umNow(); UMV.playing = false; const s = UMV.src; UMV.src = null; try { s.stop(); } catch (e) {} } }
function umStop(quiet) { umPause(); UMV.pos = 0; if (!quiet && ui.screen === 'um') render(); }
async function umToggle() { if (!UMV.buf) { if (UMV.ref) umPlayRef(UMV.ref, !!UMV.queue); return; } await S.startAudio(); if (UMV.playing) { umPause(); render(); } else { if (S.playing) S.stop(); umPlay(); } }
function umSeek(t) { if (!UMV.buf) return; const was = UMV.playing; umPause(); UMV.pos = clamp(t, 0, UMV.buf.duration); if (was) umPlay(); else umDraw(); }
function umSkip(d) { umSeek(umNow() + d); }
function umDraw() {
  const c = $('umw'); if (!c) return; const g = c.getContext('2d'), W = c.width, H = c.height;
  g.fillStyle = '#121316'; g.fillRect(0, 0, W, H);
  const t = $('umc');
  if (!UMV.buf) { if (t) t.textContent = UMV.ref ? 'loading' : '0:00 / 0:00'; return; }
  const len = UMV.buf.duration, now = umNow(), cut = now / len * W, N = UMV.pk.length;
  for (let x = 0; x < W; x += 2) { const v = UMV.pk[Math.min(N - 1, Math.floor(x / W * N))] || 0, bh = Math.max(2, Math.min(1, v) * H * 0.9); g.fillStyle = x < cut ? '#E2BF6A' : '#4a4b52'; g.fillRect(x, (H - bh) / 2, 1.6, bh); }
  g.fillStyle = '#D9DADD'; g.fillRect(cut - 2, 0, 4, H);
  if (t) t.textContent = fmt(now) + ' / ' + fmt(len);
}
function umLive() { if (ui.screen === 'um' && UMV.playing) umDraw(); }
