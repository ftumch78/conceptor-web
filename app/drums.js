// Conceptor 0.4.3 drum programmer "Gillian and Stephen". Landscape: the pattern cards and the Pattern Compile row across the top,
// the grid with all 4 bars below. Each drum row: name, Import, M, S, then the squares.
'use strict';

const DP = { selBlk: -1, selSnd: 0, drag: null };
const SLOT = 55;   // width of one block in the row
const LC = () => CZ.LANECOL;

function miniGrid(cv, p, w, h) {
  const dpr = 2; cv.width = w * dpr; cv.height = h * dpr; const g = cv.getContext('2d'); g.scale(dpr, dpr);
  g.fillStyle = '#1C1D21'; g.fillRect(0, 0, w, h);
  const n = CZ.patSteps(p), cw = w / n, chh = h / CZ.NDRUMS, sc = LC();
  for (let r = 0; r < CZ.NDRUMS; r++) for (let c = 0; c < n; c++) { g.fillStyle = p.steps[r][c] ? sc[r] + 'BF' : ((c >> 2) % 2 ? '#202226' : '#2b2d32'); g.fillRect(c * cw + 0.4, r * chh + 0.4, cw - 0.8, chh - 0.8); }
}
const mmss = (s) => Math.floor(s / 60) + ':' + String(Math.round(s % 60)).padStart(2, '0');

screens.drums = () => {
  const s = song(), d = s.drums, p = CZ.selPattern(s), n = CZ.patSteps(p), ph = CZ.placeholder(s), sc = LC();
  if (DP.selBlk >= d.comp.length) DP.selBlk = -1;
  const anySolo = d.ms.some((x) => x.s), prev = S.previewPat === p.id, smp = d.samples[DP.selSnd];
  let h = `<div class="scroll" data-keep="drums">
    <div class="lab">PATTERN EDIT ${ii('patternedit')}<span class="sp"></span><span style="letter-spacing:0">Tap to edit. Drag down to add. Tap ⋯ to rename, duplicate or delete.</span></div>
    <div class="cards" id="cards" data-keep="cards">${d.patterns.map((x) => `<div class="card ${x.id === p.id ? 'sel' : ''}" data-p="${x.id}" style="border-color:${x.color};color:${x.color}">
      <div class="ch"><span>${esc(x.name)}</span><span class="row" style="gap:2px"><span style="color:var(--dim);font-weight:normal">${x.bars}b</span><button class="b s r" data-pmenu="${x.id}" data-n="Pattern options: rename, duplicate, delete">&#8943;</button></span></div><canvas></canvas>
      <div class="phk ${x.ph ? 'on' : ''}" data-ph="${x.id}" data-n="Placeholder: fill the whole song row with this pattern"><i>${x.ph ? '&#10003;' : ''}</i>Placeholder${x.id === p.id ? ii('ph') : ''}</div>
      ${x.ph ? `<div class="dim" style="font-size:9px;margin-top:2px">Song length <input id="phm" class="text" style="width:30px;padding:1px 3px;font-size:10px;display:inline" value="${Math.floor(d.phLen / 60)}" inputmode="numeric" aria-label="Minutes">:<input id="phs" class="text" style="width:30px;padding:1px 3px;font-size:10px;display:inline" value="${String(d.phLen % 60).padStart(2, '0')}" inputmode="numeric" aria-label="Seconds"></div>` : ''}</div>`).join('')}
      <div class="card add" onclick="dpNew()" data-n="New pattern"><b style="font-size:16px">+</b>New pattern</div></div>
    <div class="lab">PATTERN COMPILE ${ii('comp')}<span class="sp"></span><span style="letter-spacing:0">${plural(d.comp.length, 'block')} · ${mmss(CZ.rowSec(s))}${ph ? ` · fills to ${mmss(d.phLen)}` : ''}</span>${B('Repeat', 'dpRepeat()', 's', DP.selBlk < 0 ? 'disabled' : 'data-n="Repeat the selected block"')}${B('Remove', 'dpRemove()', 's', DP.selBlk < 0 ? 'disabled' : 'data-n="Remove the selected block"')}${B('Clear row', 'dpClearRow()', 's', 'data-n="Remove every block from the row"')}</div>
    <div class="comp" id="comp" data-keep="comp"><div class="trk" id="ctrack">${d.comp.map((b, i) => { const q = CZ.pat(d, b.p) || p; return `<div class="blk ${b.ph ? 'ph' : ''} ${i === DP.selBlk ? 'sel' : ''} ${S.playing && !S.previewPat && S.drumBlock === i ? 'play' : ''}" data-i="${i}" style="border-color:${q.color}"><canvas></canvas><div class="bn" style="color:${q.color}">${b.ph ? 'Placeholder' : esc(q.name.replace(/^Pattern /, 'Pat '))}</div></div>`; }).join('')}${d.comp.length ? '' : '<span class="dim" style="padding:14px">Empty. Drag patterns here, or use Add to row.</span>'}</div><div class="marker" id="marker"></div></div>
    <div class="row" style="margin:2px 0 5px;flex-wrap:wrap"><b style="color:${p.color};font-size:12px;cursor:pointer" onclick="renamePattern(${p.id})" data-n="Pattern name: tap to rename">${esc(p.name)}</b>${B(prev ? STOPI : PLAYI, 'dpPlay()', 's r gplay ' + (prev ? 'on' : ''), 'data-n="Play this pattern again and again"')}${B('Add to row', 'dpAddRow()', 's', 'data-n="Add this pattern to the end of the row"')}${B('Clear pattern', 'dpClearPat()', 's', 'data-n="Remove every hit from this pattern"')}
      <span class="dim">Number of bars</span>${B('2', 'dpBars(2)', 's r ' + (p.bars === 2 ? 'yel' : ''), 'data-n="2 bars"')}${B('4', 'dpBars(4)', 's r ' + (p.bars !== 2 ? 'yel' : ''), 'data-n="4 bars"')}${ii('bars')}<span class="dim">All bars showing</span>${ii('drumms')}</div>
    <div class="dgrid" style="grid-template-columns:76px 22px 22px 22px repeat(${n},1fr)"><span></span><span class="dim" style="font-size:8px;text-align:center">Imp</span><span class="dim" style="font-size:8px;text-align:center">M</span><span class="dim" style="font-size:8px;text-align:center">S</span>${Array.from({ length: n / 4 }, (_, b) => `<span class="bh" style="grid-column:span 4">Bar ${b + 1}</span>`).join('')}`;
  CZ.DRUMS.forEach((nm, r) => {
    const silent = d.ms[r].m || (anySolo && !d.ms[r].s), sm = d.samples[r];
    h += `<div class="snd ${r === DP.selSnd ? 'sel' : ''}" onclick="DP.selSnd=${r};render()" data-n="${nm}: ${esc(sm ? sm.name : 'Built-in')}">${nm}</div>${B(IMPI, `openSamples(${r})`, 's r', `data-n="Import a sound for ${nm} from the drum samples library"`)}${B('M', `dpMS(${r},'m')`, 's r ' + (d.ms[r].m ? 'on' : ''), `data-n="Mute ${nm}"`)}${B('S', `dpMS(${r},'s')`, 's r ' + (d.ms[r].s ? 'yel' : ''), `data-n="Solo ${nm}"`)}`;
    for (let c = 0; c < n; c++) h += `<div class="c ${(c >> 2) % 2 ? 'alt' : ''} ${silent ? 'mut' : ''}" data-step="${c}" style="${p.steps[r][c] ? `background:${sc[r]}BF;border-color:${sc[r]}` : ''}" onclick="dpCell(${r},${c})" role="checkbox" aria-checked="${p.steps[r][c]}" aria-label="${nm} bar ${(c >> 2) + 1} square ${(c % 4) + 1}"></div>`;
  });
  h += `</div><div class="row" style="margin-top:6px;gap:12px;flex-wrap:wrap"><span style="width:130px;font-size:11px">${CZ.DRUMS[DP.selSnd]}<br><small class="dim">${esc(smp ? smp.name : 'Built-in')}</small></span>
    ${CZ.KNOBS.map((k, j) => knob(`dk${DP.selSnd}_${j}`, k, () => d.knobs[DP.selSnd][j], (v) => { d.knobs[DP.selSnd][j] = v; S.changed('knob'); }, 30)).join('')}${ii('knobs')}
    ${B(PLAYI + ' Listen', 'dpListen()', 's', 'data-n="Listen to this drum sound"')}${B('Reset Sound', 'dpReset()', 's', (smp ? '' : 'disabled ') + 'data-n="Back to the built-in sound"')}</div></div>`;
  return h;
};
after.drums = () => {
  const d = song().drums;
  document.querySelectorAll('#cards .card[data-p]').forEach((el) => { miniGrid(el.querySelector('canvas'), CZ.pat(d, +el.dataset.p), 100, 38); attachCardDrag(el); });
  document.querySelectorAll('#ctrack .blk').forEach((el) => { const b = d.comp[+el.dataset.i]; miniGrid(el.querySelector('canvas'), CZ.pat(d, b.p) || d.patterns[0], 44, 26); attachBlockDrag(el); });
  wireControls();
  ['phm', 'phs'].forEach((q) => { const e = $(q); if (e) { e.onchange = setPhLen; e.onpointerdown = (ev) => ev.stopPropagation(); } });
};
function drumLive() {
  if (ui.screen !== 'drums') return;
  const previewing = !!S.previewPat;
  document.querySelectorAll('.dgrid .c').forEach((c) => c.classList.toggle('now', previewing && +c.dataset.step === S.drumStep));
  document.querySelectorAll('#ctrack .blk').forEach((b) => b.classList.toggle('play', S.playing && !previewing && +b.dataset.i === S.drumBlock));
}
S.on((what) => { if (what === 'block' && ui.screen === 'drums' && S.drumBlock >= 0 && !S.previewPat) { const c = $('comp'); if (c) c.scrollLeft = Math.max(0, S.drumBlock * SLOT - 120); } });

// ------------------------------------------------------------------ actions
const dch = () => { S.changed('drums'); render(); };
function dpCell(r, c) { const p = CZ.selPattern(song()); p.steps[r][c] = !p.steps[r][c]; dch(); }
function dpMS(r, k) { const x = song().drums.ms[r]; x[k] = !x[k]; dch(); }
function dpNew() { const d = song().drums, n = CZ.newPattern(d); d.sel = n.id; KEEP.cards = [99999, 0]; dch(); toast(n.name + ' added.'); }
async function dpPlay() { const p = CZ.selPattern(song()); if (S.previewPat) S.stop(); else await S.previewPattern(p.id); render(); }
function firstPh() { const i = song().drums.comp.findIndex((b) => b.ph); return i < 0 ? song().drums.comp.length : i; }
function dpAddRow() { const s = song(), p = CZ.selPattern(s); s.drums.comp.splice(firstPh(), 0, { p: p.id }); CZ.trimPh(s); dch(); toast(p.name + ' added to the row.'); }
function dpClearPat() { CZ.selPattern(song()).steps = CZ.emptySteps(); dch(); }
function dpBars(b) { const s = song(), p = CZ.selPattern(s); p.bars = b; CZ.fillPh(s); dch(); toast(`${p.name}: ${b} bars.`); }
async function dpListen() { await S.startAudio(); S.stopListen(); S.playDrum(DP.selSnd, S.ctx.currentTime + 0.02, S.ctx.destination); }
function dpReset() { S.resetDrumSample(DP.selSnd); render(); toast('Built-in sound restored.'); }
function dpRepeat() { const s = song(), d = s.drums; if (DP.selBlk < 0) return; d.comp.splice(DP.selBlk + 1, 0, { p: d.comp[DP.selBlk].p }); DP.selBlk++; CZ.trimPh(s); dch(); toast('Repeated.'); }
function dpRemove() { const s = song(), d = s.drums; if (DP.selBlk < 0) return; d.comp.splice(DP.selBlk, 1); DP.selBlk = -1; CZ.fillPh(s); dch(); toast('Removed.'); }
function dpClearRow() { const d = song().drums; step({ title: 'Clear the row?', text: 'Removes every block from the song row. The patterns stay.', opts: [['Clear row', () => { d.comp = []; DP.selBlk = -1; d.patterns.forEach((x) => { x.ph = false; }); closeBox(); dch(); }, 'red']] }); }
function setPhLen() {
  const s = song(), m = clamp(parseInt($('phm').value, 10) || 0, 0, 20), sec = clamp(parseInt($('phs').value, 10) || 0, 0, 59);
  s.drums.phLen = Math.max(10, m * 60 + sec); CZ.fillPh(s); DP.selBlk = -1; dch();
}
function togglePh(id) {
  const s = song(), p = CZ.pat(s.drums, id);
  if (p.ph) { p.ph = false; CZ.fillPh(s); DP.selBlk = -1; dch(); toast('Placeholder removed from the row.'); return; }
  s.drums.patterns.forEach((x) => { x.ph = false; });
  p.ph = true; CZ.fillPh(s); DP.selBlk = -1; dch();
  toast(`${p.name} fills the row: ${mmss(s.drums.phLen)}, ${CZ.phBars(s)} blocks.`);
}
function patMenu(id) {
  const s = song(), d = s.drums, p = CZ.pat(d, id); d.sel = id;
  step({ title: p.name, tip: 'patternedit', opts: [
    ['Rename', () => renamePattern(id)],
    ['Duplicate', () => { const n = CZ.newPattern(d, p.steps.map((r) => r.slice())); n.bars = p.bars; n.name = CZ.uniqueName(p.name + ' copy', d.patterns.map((x) => x.name)); d.sel = n.id; closeBox(); dch(); toast('Duplicated.'); }],
    ['Delete', () => {
      if (d.patterns.length === 1) { message('Delete', 'One pattern must stay.'); return; }
      const used = d.comp.filter((b) => b.p === id).length;
      step({ title: 'Delete ' + p.name + '?', text: used ? `It is used ${used} times in the song row. Those blocks are removed too.` : 'This cannot be undone.',
        opts: [['Delete', () => { d.comp = d.comp.filter((b) => b.p !== id); d.patterns.splice(d.patterns.indexOf(p), 1); d.sel = d.patterns[0].id; DP.selBlk = -1; closeBox(); dch(); toast('Pattern deleted.'); }, 'red']] });
    }, 'red']] });
}
function renamePattern(id) {
  const p = CZ.pat(song().drums, id);
  step({ title: 'Rename pattern', html: `<input id="rn" class="text" value="${esc(p.name)}">`, opts: [['Save', () => { p.name = $('rn').value.trim() || 'Pattern ' + p.id; closeBox(); dch(); }]] });
  setTimeout(() => $('rn') && $('rn').select(), 30);
}

// ------------------------------------------------------------------ J5: drum samples from the library
let SAMP = { r: 0, cat: 'Kicks' };
function openSamples(r) {
  SAMP = { r, cat: CZ.SAMPLE_FOLDER[r] };
  libRefresh().then(() => openPop(`DRUM SAMPLES · ${CZ.DRUMS[r].toUpperCase()}`, samplesBody, { tip: 'samples', onClose: () => S.stopListen() }));
}
function samplesBody() {
  const r = SAMP.r, list = drumSampleList(SAMP.cat), cur = song().drums.samples[r];
  return `<div class="row" style="margin-bottom:6px">${BOOK(18)}<span class="dim">From Lt. Joe Bookman · Drum samples</span><span class="sp"></span>${B('From device…', `sampFromDevice(${r})`, 's', 'data-n="Pick a file on this device. It is added to the library first."')}${B('Reset Sound', `S.resetDrumSample(${r});drawPop();toast('Built-in sound restored.')`, 's', (cur ? '' : 'disabled ') + 'data-n="Back to the built-in sound"')}</div>
    <div class="split" style="min-height:220px;border:1px solid var(--line);border-radius:8px;overflow:hidden"><div class="cats" data-keep="sampcats">${CZ.SAMPLE_CATS.map((c) => `<div class="cat ${c === SAMP.cat ? 'sel' : ''}" onclick="SAMP.cat='${c}';drawPop()">${c}<small>${drumSampleList(c).length}</small></div>`).join('')}</div>
    <div class="files" data-keep="sampfiles">${list.map((f, k) => `<div class="file ${cur && cur.name === f.name ? 'sel' : ''}"><span class="fn">${esc(f.name)}<small>${SAMP.cat}${f.len ? ' · ' + f.len.toFixed(2) + ' s' : ''}</small></span>${B(PLAYI + ' Listen', `sampListen(${k})`, 's gplay', 'data-n="Listen to this sample"')}${B('Use', `sampUse(${k})`, 's on', `data-n="Use this sample for ${CZ.DRUMS[r]}"`)}</div>`).join('') || '<p class="dim">Nothing here yet. Use From device… to add a file.</p>'}</div></div>`;
}
async function sampAudio(f) { await S.startAudio(); return f.builtin != null ? CZ.sampleAudio(CZ.SAMPLES[f.builtin][2], S.sr) : await S.decodeFile(f.blob, 4); }
async function sampListen(k) { const f = drumSampleList(SAMP.cat)[k], a = await sampAudio(f); if (a) S.listen([a]); else toast('That file could not be read.'); }
async function sampUse(k) {
  const f = drumSampleList(SAMP.cat)[k], a = await sampAudio(f); if (!a) { toast('That file could not be read.'); return; }
  S.stopListen(); S.setDrumSample(SAMP.r, a.slice(), f.name); closePop(); toast(`${f.name} is now the ${CZ.DRUMS[SAMP.r]} sound.`);
}
function sampFromDevice(r) {
  pickFile(async (files) => {
    let last = null;
    for (const file of files) { const a = await S.decodeFile(file, 4); if (!a) { toast(file.name + ' could not be read.'); continue; } last = await S.addFile('drum', file.name, file, a.length / S.sr); }
    await libRefresh(); SAMP.cat = 'Imported'; drawPop(); if (last) toast(last.name + ' added to the library. Tap Use.');
  }, true);
}

// ------------------------------------------------------------------ dragging: cards down into the row, blocks along it or out of it
function makeGhost(p) {
  const g = document.createElement('div'); g.className = 'ghost';
  g.style.borderColor = p.color; g.innerHTML = '<canvas></canvas>';
  miniGrid(g.querySelector('canvas'), p, 100, 38);
  $('dev').appendChild(g); return g;
}
function moveGhost(e) {
  const drag = DP.drag, comp = $('comp'), cr = comp.getBoundingClientRect(), dr = $('dev').getBoundingClientRect();
  drag.g.style.left = (e.clientX - dr.left - 50) + 'px'; drag.g.style.top = (e.clientY - dr.top - 25) + 'px';
  const over = e.clientY > cr.top - 30 && e.clientY < cr.bottom + 30;
  drag.g.style.transform = `scale(${over ? 0.55 : 0.85})`; drag.g.style.opacity = drag.kind === 'blk' && !over ? 0.5 : 1;
  const m = $('marker'); drag.target = null;
  if (!over) { m.style.display = 'none'; drag.auto = 0; return; }
  const c2 = song().drums.comp, raw = (e.clientX - cr.left + comp.scrollLeft - 6) / SLOT, on = Math.floor(raw);
  if (drag.kind === 'card' && c2[on] && c2[on].ph && raw - on > 0.2 && raw - on < 0.8) { drag.target = { replace: on }; m.style.display = 'block'; m.style.left = (6 + on * SLOT + SLOT / 2 - 2) + 'px'; return; }
  const idx = clamp(Math.round(raw), 0, c2.length);
  drag.target = { insert: idx }; m.style.display = 'block'; m.style.left = (6 + idx * SLOT - 2) + 'px';
  drag.auto = e.clientX < cr.left + 36 ? -8 : e.clientX > cr.right - 36 ? 8 : 0;
}
function autoScroll() { if (!DP.drag) return; if (DP.drag.auto) $('comp').scrollLeft += DP.drag.auto; requestAnimationFrame(autoScroll); }
function endDrag() {
  const dg = DP.drag; DP.drag = null; if (!dg) return; dg.g.remove(); const m = $('marker'); if (m) m.style.display = 'none';
  const s = song(), comp = s.drums.comp; DP.selBlk = -1;
  if (dg.kind === 'card') {
    if (!dg.target) { render(); return; }
    if (dg.target.replace !== undefined) { comp[dg.target.replace] = { p: dg.p }; toast('Placeholder block replaced.'); }
    else { comp.splice(dg.target.insert, 0, { p: dg.p }); CZ.trimPh(s); toast(CZ.pat(s.drums, dg.p).name + ' added.'); }
  } else {
    const b = comp[dg.i];
    if (!dg.target) { comp.splice(dg.i, 1); CZ.fillPh(s); toast('Removed.'); }
    else if (dg.target.insert !== undefined) { let to = dg.target.insert; comp.splice(dg.i, 1); if (to > dg.i) to--; comp.splice(to, 0, b); }
  }
  dch();
}
function attachCardDrag(el) {
  el.addEventListener('pointerdown', (e) => {
    const t = e.target.closest('[data-pmenu],[data-ph],input,.info');
    if (t) { if (t.dataset.pmenu) { e.preventDefault(); patMenu(+t.dataset.pmenu); } else if (t.dataset.ph) { e.preventDefault(); togglePh(+t.dataset.ph); } return; }
    const id = +el.dataset.p, x0 = e.clientX, y0 = e.clientY, strip = $('cards'), sl0 = strip.scrollLeft; let mode = null;
    try { el.setPointerCapture(e.pointerId); } catch (x) {}
    const start = (ev) => { DP.drag = { kind: 'card', p: id, g: makeGhost(CZ.pat(song().drums, id)), auto: 0 }; moveGhost(ev); autoScroll(); };
    const hold = setTimeout(() => { if (!mode) { mode = 'drag'; start(e); } }, 320);
    const mv = (ev) => {
      const dx = ev.clientX - x0, dy = ev.clientY - y0;
      if (!mode && Math.hypot(dx, dy) > 8) { clearTimeout(hold); mode = Math.abs(dy) > Math.abs(dx) ? 'drag' : 'scroll'; if (mode === 'drag') start(ev); }
      if (mode === 'scroll') strip.scrollLeft = sl0 - dx;
      if (mode === 'drag' && DP.drag) moveGhost(ev);
    };
    const up = () => { clearTimeout(hold); el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
      if (!mode) { song().drums.sel = id; render(); } else if (mode === 'drag') endDrag(); };
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  });
}
function attachBlockDrag(el) {
  el.addEventListener('pointerdown', (e) => {
    const i = +el.dataset.i, x0 = e.clientX, y0 = e.clientY, comp = $('comp'), sl0 = comp.scrollLeft; let mode = null; try { el.setPointerCapture(e.pointerId); } catch (x) {}
    const start = (ev) => { const b = song().drums.comp[i]; DP.drag = { kind: 'blk', i, p: b.p, g: makeGhost(CZ.pat(song().drums, b.p)), auto: 0 }; moveGhost(ev); autoScroll(); };
    const hold = setTimeout(() => { if (!mode) { mode = 'drag'; start(e); } }, 300);
    const mv = (ev) => {
      if (!mode && Math.hypot(ev.clientX - x0, ev.clientY - y0) > 8) { clearTimeout(hold); mode = Math.abs(ev.clientY - y0) > Math.abs(ev.clientX - x0) ? 'drag' : 'scroll'; if (mode === 'drag') start(ev); }
      if (mode === 'scroll') comp.scrollLeft = sl0 - (ev.clientX - x0);
      if (mode === 'drag' && DP.drag) moveGhost(ev);
    };
    const up = () => { clearTimeout(hold); el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
      if (!mode) { DP.selBlk = DP.selBlk === i ? -1 : i; render(); } else if (mode === 'drag') endDrag(); };
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  });
}
