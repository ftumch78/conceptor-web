// Conceptor 0.4 drum programmer "Gillian and Stephen": Pattern Edit on top, Pattern Compile below.
// Dark grey throughout; a pattern's colour shows only on its borders and its name. Hits use one colour per sound.
'use strict';

const DP = { selBlk: -1, selSnd: 0, stripScroll: 0, compScroll: 0, drag: null };
const SLOT = 61;   // width of one block in the row, in pixels
const SC = () => CZ.COLOURS.slice(0, CZ.NDRUMS);

function miniGrid(cv, p, w, h) {
  const dpr = 2; cv.width = w * dpr; cv.height = h * dpr; const g = cv.getContext('2d'); g.scale(dpr, dpr);
  g.fillStyle = '#1C1D21'; g.fillRect(0, 0, w, h);
  const cw = w / 16, ch = h / CZ.NDRUMS, sc = SC();
  for (let r = 0; r < CZ.NDRUMS; r++) for (let c = 0; c < 16; c++) {
    g.fillStyle = p.steps[r][c] ? sc[r] : ((c >> 2) % 2 ? '#3a3b42' : '#2c2d33');
    g.fillRect(c * cw + 0.4, r * ch + 0.4, cw - 0.8, ch - 0.8);
  }
}
function knobSVG(v) {
  const a = (-135 + v * 2.7) * Math.PI / 180, x = 16 + 10 * Math.sin(a), y = 16 - 10 * Math.cos(a);
  return `<svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="13" fill="#FF8C1A" stroke="#c4600a" stroke-width="2"/><line x1="16" y1="16" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#111" stroke-width="3" stroke-linecap="round"/></svg>`;
}
const mmss = (s) => Math.floor(s / 60) + ':' + String(Math.round(s % 60)).padStart(2, '0');

function drumScreen() {
  const s = S.song, d = s.drums, p = CZ.selPattern(s), ph = CZ.placeholder(s), sc = SC();
  if (DP.selBlk >= d.comp.length) DP.selBlk = -1;
  const smp = d.samples[DP.selSnd];
  const prev = S.previewPat === p.id;
  let h = topBack('GILLIAN AND STEPHEN', 'drums') + `<div class="scroll dp">
    <div class="section">PATTERN EDIT ${ii('patternedit')}<span class="hint">Tap to edit. Drag down to add.</span></div>
    <div class="strip2" id="strip">${d.patterns.map((x) => `<div class="pcard ${x.id === p.id ? 'sel' : ''}" data-p="${x.id}" style="border-color:${x.color};color:${x.color}">
        <div class="ch"><span>${esc(x.name)}</span><button class="dots" data-pmenu="${x.id}" aria-label="Pattern options">&#8943;</button></div><canvas></canvas>
        <div class="phk ${x.ph ? 'on' : ''}" data-ph="${x.id}" role="checkbox" aria-checked="${x.ph}"><i>${x.ph ? '&#10003;' : ''}</i>Placeholder${x.id === CZ.selPattern(s).id ? ii('ph') : ''}</div>
        ${x.ph ? `<div class="sl2">Song length<br><input id="phm" value="${Math.floor(d.phLen / 60)}" inputmode="numeric" aria-label="Minutes">:<input id="phs" value="${String(d.phLen % 60).padStart(2, '0')}" inputmode="numeric" aria-label="Seconds"> = ${CZ.phBars(s)} bars</div>` : ''}</div>`).join('')}
      <button class="pcard add" data-act="dp-new"><b>+</b>New pattern</button></div>
    <div class="epanel"><div class="prow"><span class="pname" data-act="dp-rename" style="color:${p.color}">${esc(p.name)}</span>
      ${hx(prev ? '&#9632;' : '&#9654;', 'dp-play', 'r ' + (prev ? 'on' : ''), 'aria-label="Play pattern"')}${hx('Add to row', 'dp-addrow')}${hx('Clear pattern', 'dp-clearpat')}</div>
    <div class="dgrid8">`;
  for (let r = 0; r < CZ.NDRUMS; r++) {
    h += `<button class="snd ${r === DP.selSnd ? 'sel' : ''}" data-act="dp-snd-${r}">${CZ.DRUMS[r]}</button>`;
    for (let c = 0; c < 16; c++) h += `<span class="c ${(c >> 2) % 2 ? 'alt' : ''}" data-step="${c}" data-act="dp-cell-${r}-${c}" style="${p.steps[r][c] ? 'background:' + sc[r] : ''}" role="checkbox" aria-checked="${p.steps[r][c]}" aria-label="${CZ.DRUMS[r]} step ${c + 1}"></span>`;
  }
  h += `</div>
    <div class="knobs"><span class="kl">${CZ.DRUMS[DP.selSnd]}<small>${smp ? esc(smp.name) : 'Built-in'}</small></span>${CZ.KNOBS.map((k, i) => `<div class="kn" data-k="${i}" role="slider" aria-label="${k}" aria-valuenow="${d.knobs[DP.selSnd][i]}">${knobSVG(d.knobs[DP.selSnd][i])}${k}</div>`).join('')}${ii('knobs')}</div>
    <div class="sndb">${hx('&#9654; Listen', 'dp-listen')}${hx('Import Audio', 'dp-import')}${hx('Edit Sound', 'dp-editsnd', '', smp ? '' : 'disabled')}${hx('Reset Sound', 'dp-resetsnd', '', smp ? '' : 'disabled')}${ii('drumsound')}</div></div>
    <div class="section" style="margin-top:12px">PATTERN COMPILE ${ii('comp')}</div>
    <div class="chead">${hx('Repeat', 'dp-repeat', '', DP.selBlk < 0 ? 'disabled' : '')}${hx('Remove', 'dp-remove', '', DP.selBlk < 0 ? 'disabled' : '')}${hx('Clear row', 'dp-clearrow')}
      <span class="ln">Length: ${d.comp.length} bars · ${mmss(CZ.rowSec(s))}${ph ? `<br>Placeholder fills to ${CZ.phBars(s)} bars` : ''}</span></div>
    <div class="comp" id="comp"><div class="ruler" style="width:${d.comp.length * SLOT + 12}px">${d.comp.map((b, i) => `<span style="left:${i * SLOT}px">${i + 1}</span>`).join('')}</div>
      <div class="track" id="ctrack">${d.comp.map((b, i) => { const q = CZ.pat(d, b.p) || p; return `<div class="blk ${b.ph ? 'ph' : ''} ${i === DP.selBlk ? 'sel' : ''} ${S.playing && S.drumBlock === i ? 'play' : ''}" data-i="${i}" style="border-color:${q.color}"><canvas></canvas><div class="bn" style="color:${q.color}">${b.ph ? 'Placeholder' : esc(q.name.replace(/^Pattern /, 'Pat '))}</div></div>`; }).join('')}</div>
      <div class="marker" id="marker"></div>${d.comp.length ? '' : '<div class="empty">Empty. Drag patterns here, or use Add to row.</div>'}</div>
  </div>`;
  return h + transport();
}

function drumsAfter() {
  const d = S.song.drums;
  document.querySelectorAll('#strip .pcard[data-p]').forEach((el) => { miniGrid(el.querySelector('canvas'), CZ.pat(d, +el.dataset.p), 108, 52); attachCardDrag(el); });
  document.querySelectorAll('#ctrack .blk').forEach((el) => { const b = d.comp[+el.dataset.i]; miniGrid(el.querySelector('canvas'), CZ.pat(d, b.p) || d.patterns[0], 49, 30); attachBlockDrag(el); });
  document.querySelectorAll('.kn').forEach(attachKnob);
  const strip = $('#strip'), comp = $('#comp');
  strip.scrollLeft = DP.stripScroll; comp.scrollLeft = DP.compScroll;
  strip.onscroll = () => { DP.stripScroll = strip.scrollLeft; };
  comp.onscroll = () => { DP.compScroll = comp.scrollLeft; };
  ['#phm', '#phs'].forEach((q) => { const e = $(q); if (e) e.onchange = setPhLen; });
}
function drumLive() {
  if (ui.screen !== 3) return;
  const previewing = !!S.previewPat;
  document.querySelectorAll('.dgrid8 .c').forEach((c) => c.classList.toggle('now', previewing && +c.dataset.step === S.drumStep));
  document.querySelectorAll('#ctrack .blk').forEach((b) => b.classList.toggle('play', S.playing && !previewing && +b.dataset.i === S.drumBlock));
}
S.on((what) => { if (what === 'block' && ui.screen === 3 && S.drumBlock >= 0) { const c = $('#comp'); if (c) { c.scrollLeft = Math.max(0, S.drumBlock * SLOT - 120); } } });

// ------------------------------------------------------------------ actions
function setPhLen() {
  const s = S.song, m = Math.max(0, Math.min(20, parseInt($('#phm').value, 10) || 0)), sec = Math.max(0, Math.min(59, parseInt($('#phs').value, 10) || 0));
  s.drums.phLen = Math.max(10, m * 60 + sec); CZ.fillPh(s); DP.selBlk = -1; S.changed('drums'); render();
}
function togglePh(id) {
  const s = S.song, p = CZ.pat(s.drums, id);
  if (p.ph) { p.ph = false; CZ.fillPh(s); DP.selBlk = -1; S.changed('drums'); render(); say('Placeholder removed from the row.'); return; }
  s.drums.patterns.forEach((x) => { x.ph = false; });
  p.ph = true; CZ.fillPh(s); DP.selBlk = -1; S.changed('drums'); render();
  say(`${p.name} fills the row: ${mmss(s.drums.phLen)}, ${CZ.phBars(s)} bars.`);
}
function firstPh() { const i = S.song.drums.comp.findIndex((b) => b.ph); return i < 0 ? S.song.drums.comp.length : i; }
function patMenu(id) {
  const s = S.song, d = s.drums, p = CZ.pat(d, id); d.sel = id;
  step({ title: p.name, opts: [
    ['Rename', () => renamePattern(id)],
    ['Duplicate', () => { const n = CZ.newPattern(d, p.steps.map((r) => r.slice())); n.name = CZ.uniqueName(p.name + ' copy', d.patterns.map((x) => x.name)); d.sel = n.id; closeBox(); S.changed('drums'); render(); say('Duplicated.'); }],
    ['Delete', () => {
      if (d.patterns.length === 1) { message('Delete', 'One pattern must stay.'); return; }
      const used = d.comp.filter((b) => b.p === id).length;
      step({ title: 'Delete ' + p.name + '?', text: used ? `It is used ${used} times in the song row. Those blocks are removed too.` : 'This cannot be undone.',
        opts: [['Delete', () => { d.comp = d.comp.filter((b) => b.p !== id); d.patterns.splice(d.patterns.indexOf(p), 1); d.sel = d.patterns[0].id; DP.selBlk = -1; closeBox(); S.changed('drums'); render(); say('Pattern deleted.'); }, 'red']] });
    }, 'red']] });
}
function renamePattern(id) {
  const p = CZ.pat(S.song.drums, id);
  step({ title: 'Rename pattern', html: `<input id="rn" class="text" value="${esc(p.name)}">`, opts: [['Save', () => { p.name = $('#rn').value.trim() || 'Pattern ' + p.id; closeBox(); S.changed('drums'); render(); }]] });
  setTimeout(() => $('#rn') && $('#rn').select(), 30);
}
async function drumAct(a) {
  const s = S.song, d = s.drums, p = CZ.selPattern(s);
  let r;
  if (a === 'dp-new') { const n = CZ.newPattern(d); d.sel = n.id; DP.stripScroll = 99999; S.changed('drums'); render(); say(n.name + ' added.'); }
  else if (a === 'dp-rename') renamePattern(p.id);
  else if (a === 'dp-play') { if (S.previewPat) S.stop(); else await S.previewPattern(p.id); render(); }
  else if (a === 'dp-addrow') { d.comp.splice(firstPh(), 0, { p: p.id }); CZ.trimPh(s); S.changed('drums'); render(); say(p.name + ' added to the row.'); }
  else if (a === 'dp-clearpat') { p.steps = CZ.emptySteps(); S.changed('drums'); render(); }
  else if ((r = a.match(/^dp-snd-(\d+)$/))) { DP.selSnd = +r[1]; render(); }
  else if ((r = a.match(/^dp-cell-(\d+)-(\d+)$/))) { p.steps[+r[1]][+r[2]] = !p.steps[+r[1]][+r[2]]; S.changed('drums'); render(); }
  else if (a === 'dp-listen') { await S.startAudio(); S.stopListen(); S.playDrum(DP.selSnd, S.ctx.currentTime + 0.02, S.ctx.destination); }
  else if (a === 'dp-import') drumImport(DP.selSnd, null, false);
  else if (a === 'dp-editsnd') openDed(DP.selSnd);
  else if (a === 'dp-resetsnd') { S.resetDrumSample(DP.selSnd); render(); say('Built-in sound restored.'); }
  else if (a === 'dp-repeat') { if (DP.selBlk < 0) return; d.comp.splice(DP.selBlk + 1, 0, { p: d.comp[DP.selBlk].p }); DP.selBlk++; CZ.trimPh(s); S.changed('drums'); render(); say('Repeated.'); }
  else if (a === 'dp-remove') { if (DP.selBlk < 0) return; d.comp.splice(DP.selBlk, 1); DP.selBlk = -1; CZ.fillPh(s); S.changed('drums'); render(); say('Removed.'); }
  else if (a === 'dp-clearrow') step({ title: 'Clear the row?', text: 'Removes every block from the song row. The patterns stay.', opts: [['Clear row', () => { d.comp = []; DP.selBlk = -1; d.patterns.forEach((x) => { x.ph = false; }); closeBox(); S.changed('drums'); render(); }, 'red']] });
}

// ------------------------------------------------------------------ knobs: drag up or down
function attachKnob(el) {
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (x) {}
    const k = +el.dataset.k, v = DP.selSnd, kn = S.song.drums.knobs[v], y0 = e.clientY, v0 = kn[k];
    const mv = (ev) => { kn[k] = Math.max(0, Math.min(100, Math.round(v0 + (y0 - ev.clientY) * 0.8))); el.querySelector('svg').outerHTML = knobSVG(kn[k]); el.setAttribute('aria-valuenow', kn[k]); };
    const up = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); S.changed('knob'); say(`${CZ.DRUMS[v]} ${CZ.KNOBS[k]}: ${kn[k]}`); };
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  });
  el.addEventListener('keydown', (e) => { const kn = S.song.drums.knobs[DP.selSnd], k = +el.dataset.k; if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { kn[k] = Math.max(0, Math.min(100, kn[k] + (e.key === 'ArrowUp' ? 2 : -2))); S.changed('knob'); render(); } });
  el.tabIndex = 0;
}

// ------------------------------------------------------------------ dragging: cards down into the row, blocks along it or out of it
function makeGhost(p) {
  const g = document.createElement('div'); g.className = 'ghost';
  g.style.borderColor = p.color; g.innerHTML = `<canvas></canvas><div class="gn" style="color:${p.color}">${esc(p.name)}</div>`;
  miniGrid(g.querySelector('canvas'), p, 108, 52);
  document.body.appendChild(g); return g;
}
function moveGhost(e) {
  const drag = DP.drag, comp = $('#comp'), cr = comp.getBoundingClientRect();
  const t = Math.max(0, Math.min(1, (e.clientY - drag.y0) / Math.max(40, cr.top - drag.y0))), sc = drag.kind === 'card' ? 1 - 0.37 * t : 0.63;   // the card shrinks as it moves down
  drag.g.style.left = (e.clientX - 58) + 'px'; drag.g.style.top = (e.clientY - 34) + 'px'; drag.g.style.transform = `scale(${sc})`;
  const over = e.clientY > cr.top - 30 && e.clientY < cr.bottom + 30;
  drag.g.classList.toggle('out', drag.kind === 'blk' && !over);
  const m = $('#marker'); document.querySelectorAll('.blk.repl').forEach((b) => b.classList.remove('repl')); drag.target = null;
  if (!over) { m.style.display = 'none'; drag.auto = 0; return; }
  const comp2 = S.song.drums.comp, raw = (e.clientX - cr.left + comp.scrollLeft - 6) / SLOT, on = Math.floor(raw);
  if (drag.kind === 'card' && comp2[on] && comp2[on].ph && raw - on > 0.2 && raw - on < 0.8) {
    drag.target = { replace: on }; m.style.display = 'none';
    const el = document.querySelector(`.blk[data-i="${on}"]`); if (el) el.classList.add('repl'); return;
  }
  const idx = Math.max(0, Math.min(comp2.length, Math.round(raw)));
  drag.target = { insert: idx }; m.style.display = 'block'; m.style.left = (6 + idx * SLOT - 2) + 'px';
  drag.auto = e.clientX < cr.left + 36 ? -8 : e.clientX > cr.right - 36 ? 8 : 0;
}
function autoScroll() { if (!DP.drag) return; if (DP.drag.auto) $('#comp').scrollLeft += DP.drag.auto; requestAnimationFrame(autoScroll); }
function endDrag() {
  const dg = DP.drag; DP.drag = null; if (!dg) return; dg.g.remove(); const m = $('#marker'); if (m) m.style.display = 'none';
  const s = S.song, comp = s.drums.comp; DP.selBlk = -1;
  if (dg.kind === 'card') {
    if (!dg.target) return;
    if (dg.target.replace !== undefined) { comp[dg.target.replace] = { p: dg.p }; say('Placeholder block replaced.'); }
    else { comp.splice(dg.target.insert, 0, { p: dg.p }); CZ.trimPh(s); say(CZ.pat(s.drums, dg.p).name + ' added.'); }
  } else {
    const b = comp[dg.i];
    if (!dg.target) { comp.splice(dg.i, 1); CZ.fillPh(s); say('Removed.'); }
    else if (dg.target.insert !== undefined) { let to = dg.target.insert; comp.splice(dg.i, 1); if (to > dg.i) to--; comp.splice(to, 0, b); }
  }
  S.changed('drums'); render();
}
function attachCardDrag(el) {
  el.addEventListener('pointerdown', (e) => {
    const t = e.target.closest('[data-pmenu],[data-ph],input');
    if (t) { if (t.dataset.pmenu) { e.preventDefault(); patMenu(+t.dataset.pmenu); } else if (t.dataset.ph) { e.preventDefault(); togglePh(+t.dataset.ph); } return; }
    const id = +el.dataset.p, x0 = e.clientX, y0 = e.clientY, sl0 = $('#strip').scrollLeft; let mode = null;
    try { el.setPointerCapture(e.pointerId); } catch (x) {}
    const start = (ev) => { DP.drag = { kind: 'card', p: id, g: makeGhost(CZ.pat(S.song.drums, id)), y0: ev.clientY, auto: 0 }; moveGhost(ev); autoScroll(); };
    const hold = setTimeout(() => { if (!mode) { mode = 'drag'; start(e); } }, 320);
    const mv = (ev) => {
      const dx = ev.clientX - x0, dy = ev.clientY - y0;
      if (!mode && Math.hypot(dx, dy) > 8) { clearTimeout(hold); mode = Math.abs(dy) > Math.abs(dx) ? 'drag' : 'scroll'; if (mode === 'drag') start(ev); }
      if (mode === 'scroll') $('#strip').scrollLeft = sl0 - dx;
      if (mode === 'drag' && DP.drag) moveGhost(ev);
    };
    const up = () => { clearTimeout(hold); el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
      if (!mode) { S.song.drums.sel = id; render(); } else if (mode === 'drag') endDrag(); };
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  });
}
function attachBlockDrag(el) {
  el.addEventListener('pointerdown', (e) => {
    const i = +el.dataset.i, x0 = e.clientX, y0 = e.clientY, sl0 = $('#comp').scrollLeft; let mode = null; try { el.setPointerCapture(e.pointerId); } catch (x) {}
    const start = (ev) => { el.classList.add('lift'); DP.drag = { kind: 'blk', i, p: S.song.drums.comp[i].p, g: makeGhost(CZ.pat(S.song.drums, S.song.drums.comp[i].p)), y0: ev.clientY - 200, auto: 0 }; moveGhost(ev); autoScroll(); };
    const hold = setTimeout(() => { if (!mode) { mode = 'drag'; start(e); } }, 300);
    const mv = (ev) => {
      if (!mode && Math.hypot(ev.clientX - x0, ev.clientY - y0) > 8) { clearTimeout(hold); mode = Math.abs(ev.clientY - y0) > Math.abs(ev.clientX - x0) ? 'drag' : 'scroll'; if (mode === 'drag') start(ev); }
      if (mode === 'scroll') $('#comp').scrollLeft = sl0 - (ev.clientX - x0);
      if (mode === 'drag' && DP.drag) moveGhost(ev);
    };
    const up = () => { clearTimeout(hold); el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
      if (!mode) { DP.selBlk = DP.selBlk === i ? -1 : i; render(); } else if (mode === 'drag') endDrag(); };
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  });
}
