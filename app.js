// GardenPress – vegetable garden planner. Offline: everything stays in this browser profile (IndexedDB).
'use strict';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = (p) => (p || 'x') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const pad = (n) => String(n).padStart(2, '0');
const DAY = 86400000;
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayStr = () => ymd(new Date());
const parseD = (s) => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + Math.round(n));
const fmtD = (d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const fmtDY = (d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

// ---------- storage ----------
let dbp = null;
function db() {
  if (!dbp) dbp = new Promise((res, rej) => { const r = indexedDB.open('gardenpress', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  return dbp;
}
async function dbGet(k) { const d = await db(); return new Promise((res, rej) => { const q = d.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); }
async function dbSet(k, v) { const d = await db(); return new Promise((res, rej) => { const t = d.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = () => res(); t.onerror = () => rej(t.error); }); }
async function dbDel(k) { const d = await db(); return new Promise((res, rej) => { const t = d.transaction('kv', 'readwrite'); t.objectStore('kv').delete(k); t.oncomplete = () => res(); t.onerror = () => rej(t.error); }); }

// ---------- Pro (Microsoft Store add-on via Digital Goods API) + one-time trial ----------
const STORE_BILLING = 'https://store.microsoft.com/billing';
const PRO_SKU = 'gardenpress_pro';
const PRO_IDS = [PRO_SKU];
let STORE_URL = 'https://apps.microsoft.com/search?query=GardenPress';
let proAvailable = false, proSku = PRO_SKU, isPro = false;
try { isPro = localStorage.getItem('gardenpress-pro') === '1'; } catch (_) {}
const TRIAL_DAYS = 7;
let trialStart = 0;
try { trialStart = Number(localStorage.getItem('gardenpress-trial')) || 0; } catch (_) {}
const trialLeft = () => (trialStart ? Math.max(0, Math.ceil((trialStart + TRIAL_DAYS * DAY - Date.now()) / DAY)) : 0);
const trialActive = () => trialLeft() > 0;
const unlocked = () => isPro || !proAvailable || trialActive();
const FREE_DOCS = 1;
async function loadTrial() {
  const t = await dbGet('trial').catch(() => 0);
  trialStart = Math.max(trialStart, Number(t) || 0);
  if (trialStart) { try { localStorage.setItem('gardenpress-trial', String(trialStart)); } catch (_) {} dbSet('trial', trialStart).catch(() => {}); }
}
async function startTrial() {
  if (trialStart) return;
  trialStart = Date.now();
  try { localStorage.setItem('gardenpress-trial', String(trialStart)); } catch (_) {}
  await dbSet('trial', trialStart).catch(() => {});
  setPro(isPro); $('proDialog').close(); toast(`★ Every Pro feature is unlocked for ${TRIAL_DAYS} days. Happy planting!`);
}
function proLabel() { return isPro ? '★ Pro' : trialActive() ? `★ Pro trial · ${trialLeft()} day${trialLeft() === 1 ? '' : 's'} left` : '★ Get Pro'; }
async function billing() {
  if (!('getDigitalGoodsService' in window)) return null;
  try { return await window.getDigitalGoodsService(STORE_BILLING); } catch (_) { return null; }
}
function setPro(v) {
  isPro = v;
  try { localStorage.setItem('gardenpress-pro', v ? '1' : '0'); } catch (_) {}
  const b = $('proBtn');
  b.textContent = proLabel();
  b.classList.toggle('is-pro', v || trialActive());
  b.hidden = !proAvailable && !v;
  if (G) renderAll();
}
async function checkPro() {
  const svc = await billing();
  if (!svc) return false;
  try {
    const details = await svc.getDetails(PRO_IDS).catch(() => []);
    proAvailable = details.length > 0;
    if (details[0]) { proSku = details[0].itemId; if (!PRO_IDS.includes(proSku)) PRO_IDS.push(proSku); }
    const list = await svc.listPurchases();
    const owned = list.some((p) => PRO_IDS.includes(p.itemId));
    setPro(owned);
    return owned;
  } catch (_) { return isPro; }
}
function proMessage(text) { const m = $('proMsg'); m.hidden = !text; m.textContent = text || ''; }
async function openPro(reason) {
  if (!reason && !isPro && trialStart && !trialActive()) reason = 'Your free Pro trial has ended. Your gardens stay here – unlock Pro to keep using the Pro tools.';
  proMessage(reason || '');
  $('trialBtn').hidden = isPro || !!trialStart;
  $('trialInfo').hidden = !trialActive() || isPro; $('trialInfo').textContent = trialActive() ? `You are trying Pro: ${trialLeft()} day${trialLeft() === 1 ? '' : 's'} left.` : '';
  const svc = await billing();
  if (!svc) { $('buyBtn').textContent = 'Get GardenPress on Microsoft Store'; $('restoreBtn').hidden = true; }
  else {
    $('restoreBtn').hidden = false;
    try {
      const [d] = await svc.getDetails([proSku]);
      const price = d && d.price ? new Intl.NumberFormat(undefined, { style: 'currency', currency: d.price.currency }).format(Number(d.price.value)) : '';
      $('buyBtn').textContent = price ? `Unlock Pro – ${price}` : 'Unlock Pro';
    } catch (_) { $('buyBtn').textContent = 'Unlock Pro'; }
  }
  if (!$('proDialog').open) $('proDialog').showModal();
}
async function buyPro() {
  const svc = await billing();
  if (!svc) { window.open(STORE_URL, '_blank'); return; }
  const methods = [{ supportedMethods: STORE_BILLING, data: { sku: proSku } }];
  try {
    let req;
    try { req = new PaymentRequest(methods); } catch (_) { req = new PaymentRequest(methods, { total: { label: 'Total', amount: { currency: 'USD', value: '0' } } }); }
    const res = await req.show();
    await res.complete('success');
  } catch (e) {
    if (e && e.name === 'AbortError') return;
    proMessage('Purchase could not be completed: ' + (e.message || e));
    return;
  }
  if (await checkPro()) { proMessage('Thank you! Pro is unlocked. ★'); setTimeout(() => $('proDialog').close(), 1500); }
}
const needsPro = (why) => { if (unlocked()) return false; openPro(why); return true; };

// ---------- toast ----------
let toastT = 0;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 3800); }

// ---------- plants (built-in + your own) ----------
let custom = [];
function applyCustom() {
  for (const k of Object.keys(PLANT)) if (PLANT[k].custom) delete PLANT[k];
  for (const c of custom) { const b = PLANT[c.base] || PLANT.tomato; PLANT[c.id] = { ...b, id: c.id, name: c.name, ic: c.ic || b.ic, sq: c.sq || b.sq, dtm: c.dtm || b.dtm, custom: true, base: c.base }; }
}
const allPlants = () => [...PLANTS, ...custom.map((c) => PLANT[c.id]).filter(Boolean)];
const P = (id) => PLANT[id] || { id, name: 'Unknown plant', ic: '❔', col: '#999', cat: 'veg', fam: 'other', sq: 1, size: 1, dtm: 60, hw: 4, comp: [], avoid: [], tip: '' };
const plantCount = (pl) => (pl.s > 1 ? 1 : P(pl.p).sq);
const nameList = (ids) => ids.filter((i) => PLANT[i]).map((i) => PLANT[i].name);

// ---------- garden model ----------
const BED_TYPES = { raised: 'Raised bed', ground: 'In-ground bed', pot: 'Container', path: 'Path' };
function blankGarden(name, year) {
  if (!year) { const n = new Date(); year = n.getFullYear() + (n.getMonth() >= 9 ? 1 : 0); }
  return { id: uid('g'), name: name || 'My garden', year, units: 'ft', w: 24, h: 16, zone: '6', last: `${year}-04-20`, first: `${year}-10-20`, beds: [], journal: [], prev: null, created: Date.now(), updated: Date.now() };
}
function normalize(g) {
  const b = blankGarden(g.name, g.year);
  const o = Object.assign(b, g);
  o.beds = (o.beds || []).map((x) => ({ id: x.id || uid('b'), type: x.type || 'raised', name: x.name || '', x: x.x | 0, y: x.y | 0, w: Math.max(1, x.w | 0), h: Math.max(1, x.h | 0), pl: (x.pl || []).map((p) => ({ id: p.id || uid('p'), p: p.p, x: p.x | 0, y: p.y | 0, s: Math.max(1, p.s | 0) })) }));
  o.journal = o.journal || [];
  return o;
}

let docs = [], cur = '', G = null, tab = 'layout';
let tool = 'select', plantSel = '', selBed = '', selPl = '', cat = '', zoom = 34;
let prevG = null;
let undoStack = [];
let saveT = 0;
function save() { if (!G) return; G.updated = Date.now(); clearTimeout(saveT); saveT = setTimeout(() => dbSet('g:' + cur, G).catch(() => toast('Could not save – storage may be full')), 250); }
function saveNow() { clearTimeout(saveT); return dbSet('g:' + cur, G); }
function saveDocs() { return dbSet('docs', docs); }
function pushUndo() { undoStack.push(JSON.stringify(G.beds)); if (undoStack.length > 40) undoStack.shift(); }
function undo() {
  if (!undoStack.length) return toast('Nothing to undo');
  G.beds = JSON.parse(undoStack.pop()); selPl = ''; if (!bedById(selBed)) selBed = '';
  save(); renderLayout();
}
const bedById = (id) => G.beds.find((b) => b.id === id);
const sqLabel = () => (G.units === 'm' ? '30 cm square' : 'square foot');
const dimText = (n) => (G.units === 'm' ? `${(n * 0.3).toFixed(1).replace(/\.0$/, '')} m` : `${n} ft`);

// ---------- frost dates & schedule ----------
const LF = () => parseD(G.last);
const FF = () => parseD(G.first);
const seasonDays = () => Math.round((FF() - LF()) / DAY);
function schedule(p) {
  // returns { ev: [{k, d, d2, label}], method }
  const lf = LF(), ff = FF(), ev = [];
  const warm = (p.tp != null ? p.tp : p.ds != null ? p.ds : 0) > 0;
  let out = null;
  if (p.ff != null) {
    out = addDays(ff, -p.ff * 7);
    ev.push({ k: 'out', d: out, d2: addDays(out, 7), label: `Plant ${p.name.toLowerCase()} for next year` });
    const h = addDays(out, p.dtm);
    ev.push({ k: 'har', d: h, d2: addDays(h, p.hw * 7), label: `Harvest ${p.name.toLowerCase()} (next year)` });
    return { ev, out };
  }
  if (p.si != null && p.tp != null) {
    const ind = addDays(lf, -p.si * 7);
    out = addDays(lf, p.tp * 7);
    ev.push({ k: 'ind', d: ind, d2: out, label: `Start ${p.name.toLowerCase()} seeds indoors` });
    ev.push({ k: 'out', d: out, d2: addDays(out, 7), label: `Plant out ${p.name.toLowerCase()}${p.ds != null ? ' (or sow outside)' : ''}` });
  } else if (p.ds != null) {
    out = addDays(lf, p.ds * 7);
    ev.push({ k: 'out', d: out, d2: addDays(out, 7), label: `${p.verb || 'Sow'} ${p.name.toLowerCase()} outside` });
  } else if (p.tp != null) {
    out = addDays(lf, p.tp * 7);
    ev.push({ k: 'out', d: out, d2: addDays(out, 7), label: `Plant ${p.name.toLowerCase()}` });
  }
  if (!out) return { ev, out };
  let hs = addDays(out, p.dtm), he = addDays(hs, p.hw * 7);
  if (warm && he > ff) he = ff;
  if (hs < he || !warm) ev.push({ k: 'har', d: hs, d2: he > hs ? he : addDays(hs, 7), label: `Harvest ${p.name.toLowerCase()} begins` });
  // succession sowings
  if (p.sc) {
    const stop = warm ? addDays(ff, -(p.dtm + 7)) : addDays(lf, 7 * 7);
    let n = 0;
    for (let d = addDays(out, p.sc * 7); d <= stop && n < 6; d = addDays(d, p.sc * 7), n++) ev.push({ k: 'suc', d, d2: addDays(d, 5), label: `Sow more ${p.name.toLowerCase()}` });
  }
  // fall crop
  if (p.fall) {
    const fs = addDays(ff, -(p.dtm + 21));
    if (fs > addDays(out, 8 * 7)) {
      ev.push({ k: 'suc', d: fs, d2: addDays(fs, 7), label: `${p.si != null && p.tp != null ? 'Plant' : 'Sow'} ${p.name.toLowerCase()} for a fall crop` });
      ev.push({ k: 'har', d: addDays(fs, p.dtm), d2: addDays(ff, 21), label: `Fall harvest of ${p.name.toLowerCase()}` });
    }
  }
  return { ev, out };
}
function timingText(p) {
  const s = schedule(p);
  const parts = [];
  for (const e of s.ev) {
    if (e.k === 'ind') parts.push(`Start indoors ${fmtD(e.d)}`);
    if (e.k === 'out' && parts.length < 2) parts.push(`${p.ff != null ? 'Plant' : p.si != null && p.tp != null ? 'Plant out' : p.ds != null ? (p.verb || 'Sow') + ' outside' : 'Plant'} ${fmtD(e.d)}`);
  }
  const h = s.ev.find((e) => e.k === 'har');
  if (h) parts.push(`Harvest from ${fmtD(h.d)}`);
  return parts.join(' · ');
}
const relWeeks = (w, what) => (w === 0 ? `at ${what}` : `${Math.abs(w)} week${Math.abs(w) === 1 ? '' : 's'} ${w < 0 ? 'before' : 'after'} ${what}`);
function timingRule(p) {
  const r = [];
  if (p.ff != null) return `Plant ${p.ff} weeks before the first fall frost; harvest about ${Math.round(p.dtm / 30)} months later.`;
  if (p.si != null) r.push(`start seeds indoors ${p.si} weeks before the last frost`);
  if (p.tp != null) r.push(`plant out ${relWeeks(p.tp, 'the last frost')}`);
  if (p.ds != null) r.push(`${p.si != null ? 'or ' : ''}sow outside ${relWeeks(p.ds, 'the last frost')}`);
  const t = r.join(', ');
  return (t ? t[0].toUpperCase() + t.slice(1) : '') + `. Ready in about ${p.dtm} days.` + (p.sc ? ` Sow again every ${p.sc} weeks.` : '') + (p.fall ? ' Good for a fall crop too.' : '');
}

// ---------- garden check ----------
function touching(a, b) { return a.x <= b.x + b.s && b.x <= a.x + a.s && a.y <= b.y + b.s && b.y <= a.y + a.s; }
let conflicts = new Set();
function checkGarden() {
  const out = []; conflicts = new Set();
  const goods = new Set();
  for (const bed of G.beds) {
    const bn = bed.name || BED_TYPES[bed.type];
    for (let i = 0; i < bed.pl.length; i++) for (let j = i + 1; j < bed.pl.length; j++) {
      const a = bed.pl[i], b = bed.pl[j];
      if (a.p === b.p || !touching(a, b)) continue;
      const pa = P(a.p), pb = P(b.p);
      if ((pa.avoid || []).includes(pb.id) || (pb.avoid || []).includes(pa.id) || (pa.base && (PLANT[pa.base].avoid || []).includes(pb.id))) {
        conflicts.add(a.id); conflicts.add(b.id);
        const key = [pa.name, pb.name].sort().join('|') + bn;
        if (!out.some((o) => o.key === key)) out.push({ key, level: 'bad', text: `${pa.ic} ${pa.name} and ${pb.ic} ${pb.name} are next to each other in “${bn}” – they don't grow well together.` });
      } else if ((pa.comp || []).includes(pb.id) || (pb.comp || []).includes(pa.id)) goods.add([pa.name, pb.name].sort().join(' + '));
    }
  }
  // rotation
  if (G.prev) {
    if (!unlocked()) out.push({ level: 'warn', text: '★ Pro checks crop rotation against last season.' });
    else if (prevG) {
      for (const bed of G.beds) {
        const old = prevG.beds.find((b) => b.id === bed.id); if (!old) continue;
        const oldFam = new Set(old.pl.map((x) => P(x.p).fam).filter((f) => FAMILIES[f] && FAMILIES[f].rot));
        const hit = new Set();
        for (const x of bed.pl) { const f = P(x.p).fam; if (oldFam.has(f) && !hit.has(f)) { hit.add(f); conflicts.add(x.id); out.push({ level: 'warn', text: `↻ “${bed.name || BED_TYPES[bed.type]}” grew ${FAMILIES[f].name.split(' (')[0].toLowerCase()} crops last season (${prevG.year}). Rotate ${P(x.p).name.toLowerCase()} to another bed to avoid pests and diseases.` }); } }
      }
    }
  }
  // corn block
  const cornSq = G.beds.reduce((n, b) => n + b.pl.filter((x) => x.p === 'corn').length, 0);
  if (cornSq > 0 && cornSq < 4) out.push({ level: 'warn', text: '🌽 Sweet corn is wind-pollinated – plant at least a 4 × 4 block of squares for full ears.' });
  // season length
  const used = new Set(G.beds.flatMap((b) => b.pl.map((x) => x.p)));
  for (const id of used) {
    const p = P(id); if (p.ff != null) continue;
    const s = schedule(p); if (!s.out) continue;
    const warm = (p.tp != null ? p.tp : p.ds != null ? p.ds : 0) > 0;
    if (warm && addDays(s.out, p.dtm) > FF()) out.push({ level: 'warn', text: `${p.ic} ${p.name} needs about ${p.dtm} days after planting out – your season may be too short. Choose a fast variety or start it earlier under cover.` });
  }
  for (const g of goods) out.push({ level: 'good', text: `Good neighbours: ${g}` });
  return out;
}

// ---------- rendering: layout ----------
function bedHtml(bed, z, opts) {
  const cls = `bed t-${bed.type}${bed.id === selBed && !opts.print ? ' sel' : ''}`;
  let h = `<div class="${cls}" data-bed="${bed.id}" style="left:${bed.x * z}px;top:${bed.y * z}px;width:${bed.w * z}px;height:${bed.h * z}px;--z:${z}px">`;
  if (bed.type !== 'path') {
    for (const x of bed.pl) {
      const p = P(x.p), n = plantCount(x);
      const fs = Math.max(10, Math.round(z * x.s * (x.s > 1 ? 0.42 : 0.5)));
      h += `<div class="pl${x.id === selPl && !opts.print ? ' sel' : ''}${conflicts.has(x.id) && !opts.print ? ' bad' : ''}" data-pl="${x.id}" style="left:${x.x * z}px;top:${x.y * z}px;width:${x.s * z}px;height:${x.s * z}px;background:${p.col}33;border-color:${p.col}" title="${esc(p.name)}${n > 1 ? ' × ' + n : ''}"><span style="font-size:${fs}px">${p.ic}</span>${n > 1 && z >= 26 ? `<i>${n}</i>` : ''}</div>`;
    }
  }
  const label = bed.name || (bed.type === 'path' ? '' : BED_TYPES[bed.type]);
  if (label && z >= 20) h += `<div class="bed-name">${esc(label)} <small>${dimText(bed.w)} × ${dimText(bed.h)}</small></div>`;
  if (bed.id === selBed && !opts.print) h += '<div class="handle" data-handle="1" title="Drag to resize"></div>';
  return h + '</div>';
}
function groundHtml(z, opts) {
  return `<div class="ground-in" style="width:${G.w * z}px;height:${G.h * z}px;background-size:${z}px ${z}px">${G.beds.map((b) => bedHtml(b, z, opts)).join('')}</div>`;
}
function totals() {
  const m = new Map();
  for (const b of G.beds) for (const x of b.pl) { const t = m.get(x.p) || { sq: 0, n: 0 }; t.sq += x.s * x.s; t.n += plantCount(x); m.set(x.p, t); }
  return [...m.entries()].map(([id, t]) => ({ p: P(id), ...t })).sort((a, b) => a.p.name.localeCompare(b.p.name));
}
let warnings = [];
function renderLayout() {
  warnings = checkGarden();
  $('ground').innerHTML = groundHtml(zoom, {});
  $('gName').textContent = G.name;
  const free = G.beds.filter((b) => b.type !== 'path').reduce((n, b) => n + b.w * b.h, 0);
  const used = G.beds.reduce((n, b) => n + b.pl.reduce((m, x) => m + x.s * x.s, 0), 0);
  $('gInfo').textContent = `${G.year} · ${dimText(G.w)} × ${dimText(G.h)} · ${used} of ${free} squares planted · last frost ${fmtD(LF())}`;
  const bad = warnings.filter((w) => w.level !== 'good').length, good = warnings.length - bad;
  $('warnBtn').hidden = !warnings.length;
  $('warnBtn').className = 'warn-chip' + (bad ? '' : ' ok');
  $('warnBtn').textContent = bad ? `⚠ ${bad} to check` : `✓ ${good} good pairing${good === 1 ? '' : 's'}`;
  const t = totals();
  $('legend').innerHTML = t.length ? t.map((x) => `<span class="lg"><b style="background:${x.p.col}33;border-color:${x.p.col}">${x.p.ic}</b>${esc(x.p.name)} <small>× ${x.n}</small></span>`).join('') : '<span class="muted">Pick a plant on the left, then click squares in a bed to plant it.</span>';
  document.querySelectorAll('#tools button').forEach((b) => b.classList.toggle('on', b.dataset.tool === tool));
  $('ground').classList.toggle('planting', tool === 'plant'); $('ground').classList.toggle('erasing', tool === 'erase');
  renderSel();
}
function plantCard(p, extra) {
  const comp = nameList(p.comp || []), avoid = nameList(p.avoid || []);
  return `<div class="pcard">
    <div class="pc-h"><span class="pc-ic" style="background:${p.col}33;border-color:${p.col}">${p.ic}</span><div><b>${esc(p.name)}</b><small>${FAMILIES[p.fam] ? FAMILIES[p.fam].name : ''}</small></div></div>
    <div class="pc-row"><span>Spacing</span><b>${p.size > 1 ? `1 plant per ${p.size} × ${p.size} squares` : `${p.sq} per ${sqLabel()}`}</b></div>
    <div class="pc-row"><span>This season</span><b>${esc(timingText(p)) || '–'}</b></div>
    ${comp.length ? `<div class="pc-row"><span>Good next to</span><b class="okc">${esc(comp.join(', '))}</b></div>` : ''}
    ${avoid.length ? `<div class="pc-row"><span>Keep away from</span><b class="badc">${esc(avoid.join(', '))}</b></div>` : ''}
    ${p.tip ? `<p class="tip">💡 ${esc(p.tip)}</p>` : ''}${extra || ''}</div>`;
}
function renderSel() {
  const box = $('selBox');
  const bed = bedById(selBed);
  if (tool === 'plant' && plantSel) { box.innerHTML = `<h2>Planting</h2>${plantCard(P(plantSel), '<p class="hint">Click or drag across squares in a bed. Press Esc when done.</p>')}`; return; }
  if (bed && selPl) {
    const x = bed.pl.find((q) => q.id === selPl);
    if (x) { box.innerHTML = `<h2>Selected plant</h2>${plantCard(P(x.p), `<div class="row-btns"><button class="ghost mini" id="rmPl">Remove from bed</button><button class="ghost mini" id="morePl">Plant more of this</button></div>`)}`; $('rmPl').onclick = () => { pushUndo(); bed.pl = bed.pl.filter((q) => q.id !== selPl); selPl = ''; save(); renderLayout(); }; $('morePl').onclick = () => pickPlant(x.p); return; }
  }
  if (bed) {
    const cnt = {}; bed.pl.forEach((x) => { cnt[x.p] = (cnt[x.p] || 0) + plantCount(x); });
    box.innerHTML = `<h2>Selected ${BED_TYPES[bed.type].toLowerCase()}</h2><div class="pcard">
      <label class="field">Name<input id="bName" value="${esc(bed.name)}" placeholder="${BED_TYPES[bed.type]}"></label>
      <div class="three"><label class="field">Type<select id="bType">${Object.entries(BED_TYPES).map(([k, v]) => `<option value="${k}"${k === bed.type ? ' selected' : ''}>${v}</option>`).join('')}</select></label>
      <label class="field">Width<input id="bW" type="number" min="1" max="${G.w}" value="${bed.w}"></label><label class="field">Length<input id="bH" type="number" min="1" max="${G.h}" value="${bed.h}"></label></div>
      <p class="hint">${dimText(bed.w)} × ${dimText(bed.h)} · ${bed.w * bed.h} squares${Object.keys(cnt).length ? ' · ' + Object.entries(cnt).map(([k, n]) => `${P(k).ic} ${n}`).join(' ') : ''}</p>
      <div class="row-btns"><button class="ghost mini" id="bDup">⧉ Duplicate</button><button class="ghost mini" id="bClear">Clear plants</button><button class="ghost mini danger" id="bDel">🗑 Delete</button></div></div>`;
    $('bName').oninput = (e) => { bed.name = e.target.value; save(); $('ground').innerHTML = groundHtml(zoom, {}); };
    $('bType').onchange = (e) => { pushUndo(); bed.type = e.target.value; if (bed.type === 'path') bed.pl = []; save(); renderLayout(); };
    const resize = () => { pushUndo(); bed.w = clamp(+$('bW').value || 1, 1, G.w - bed.x); bed.h = clamp(+$('bH').value || 1, 1, G.h - bed.y); trimBed(bed); save(); renderLayout(); };
    $('bW').onchange = resize; $('bH').onchange = resize;
    $('bDup').onclick = () => duplicateBed(bed);
    $('bClear').onclick = () => { pushUndo(); bed.pl = []; save(); renderLayout(); };
    $('bDel').onclick = () => deleteBed(bed);
    return;
  }
  const t = totals();
  box.innerHTML = `<h2>Your garden</h2><div class="pcard"><p class="hint" style="margin-top:0">${G.beds.length ? 'Click a bed to select it, drag it to move it and pull the corner to resize. ' : 'Start by adding a bed below, then drag it where it goes. '}Each grid square is one ${sqLabel()}.</p>${t.length ? `<div class="sum">${t.map((x) => `<span>${x.p.ic} ${esc(x.p.name)} <b>${x.n}</b></span>`).join('')}</div>` : ''}</div>`;
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function trimBed(bed) { bed.pl = bed.pl.filter((x) => x.x + x.s <= bed.w && x.y + x.s <= bed.h); }
function renderPalette() {
  const q = $('plantSearch').value.trim().toLowerCase();
  $('catChips').innerHTML = [['', 'All'], ...Object.entries(CATS)].map(([k, v]) => `<button data-c="${k}" class="${cat === k ? 'on' : ''}">${v}</button>`).join('');
  const list = allPlants().filter((p) => (!cat || p.cat === cat) && (!q || p.name.toLowerCase().includes(q)));
  $('palette').innerHTML = list.map((p) => `<button data-p="${p.id}" class="${plantSel === p.id && tool === 'plant' ? 'on' : ''}" title="${esc(p.name)}"><span class="pi" style="background:${p.col}33;border-color:${p.col}">${p.ic}</span><span class="pn">${esc(p.name)}</span><small>${p.size > 1 ? p.size + '×' + p.size : p.sq + '/sq'}</small></button>`).join('') || '<p class="hint">No plants found.</p>';
}
function pickPlant(id) { plantSel = id; tool = 'plant'; selPl = ''; renderPalette(); renderLayout(); }
function setTool(t) { tool = t; if (t !== 'plant') plantSel = ''; renderPalette(); renderLayout(); }

// ---------- beds ----------
function freeSpot(w, h) {
  for (let y = 0; y + h <= G.h; y++) for (let x = 0; x + w <= G.w; x++) {
    if (!G.beds.some((b) => x < b.x + b.w + 1 && b.x < x + w + 1 && y < b.y + b.h + 1 && b.y < y + h + 1)) return { x, y };
  }
  return { x: 0, y: 0 };
}
function addBed(type) {
  const [w, h] = type === 'pot' ? [2, 2] : type === 'path' ? [G.w > 12 ? 12 : G.w, 2] : type === 'ground' ? [3, 10] : [4, 8];
  const s = freeSpot(Math.min(w, G.w), Math.min(h, G.h));
  pushUndo();
  const n = G.beds.filter((b) => b.type === type).length + 1;
  const bed = { id: uid('b'), type, name: type === 'path' ? '' : `${type === 'pot' ? 'Pot' : 'Bed'} ${n}`, x: s.x, y: s.y, w: Math.min(w, G.w), h: Math.min(h, G.h), pl: [] };
  G.beds.push(bed); selBed = bed.id; selPl = ''; setTool('select'); save();
}
function duplicateBed(bed) {
  pushUndo();
  const s = freeSpot(bed.w, bed.h);
  const nb = JSON.parse(JSON.stringify(bed)); nb.id = uid('b'); nb.x = s.x; nb.y = s.y; nb.name = bed.name ? bed.name + ' copy' : ''; nb.pl.forEach((x) => (x.id = uid('p')));
  G.beds.push(nb); selBed = nb.id; save(); renderLayout();
}
function deleteBed(bed) {
  if (bed.pl.length && !confirm(`Delete “${bed.name || BED_TYPES[bed.type]}” and its ${bed.pl.length} planted square${bed.pl.length === 1 ? '' : 's'}? (Ctrl+Z undoes it)`)) return;
  pushUndo(); G.beds = G.beds.filter((b) => b !== bed); selBed = ''; selPl = ''; save(); renderLayout();
}
function placeAt(bed, cx, cy, id) {
  if (bed.type === 'path') return false;
  const p = P(id), s = p.size || 1;
  if (s > bed.w || s > bed.h) { toast(`${p.name} needs ${s} × ${s} squares – make the bed bigger.`); return false; }
  cx = clamp(cx, 0, bed.w - s); cy = clamp(cy, 0, bed.h - s);
  const exist = bed.pl.find((x) => x.x === cx && x.y === cy && x.s === s && x.p === id);
  if (exist) return false;
  bed.pl = bed.pl.filter((x) => !(cx < x.x + x.s && x.x < cx + s && cy < x.y + x.s && x.y < cy + s));
  bed.pl.push({ id: uid('p'), p: id, x: cx, y: cy, s });
  return true;
}
function eraseAt(bed, cx, cy) {
  const n = bed.pl.length;
  bed.pl = bed.pl.filter((x) => !(cx >= x.x && cx < x.x + x.s && cy >= x.y && cy < x.y + x.s));
  return bed.pl.length !== n;
}

// ---------- pointer interaction on the ground ----------
let drag = null;
function cellFromEvent(e) {
  const r = $('ground').firstElementChild.getBoundingClientRect();
  return { gx: Math.floor((e.clientX - r.left) / zoom), gy: Math.floor((e.clientY - r.top) / zoom), px: e.clientX, py: e.clientY };
}
function bedAt(gx, gy) { for (let i = G.beds.length - 1; i >= 0; i--) { const b = G.beds[i]; if (gx >= b.x && gx < b.x + b.w && gy >= b.y && gy < b.y + b.h) return b; } return null; }
function onDown(e) {
  if (e.button !== 0 || !G) return;
  const c = cellFromEvent(e);
  if (e.target.dataset.handle) { const bed = bedById(selBed); pushUndo(); drag = { kind: 'resize', bed, sx: c.px, sy: c.py, w: bed.w, h: bed.h }; e.preventDefault(); return; }
  const bed = bedAt(c.gx, c.gy);
  if (tool === 'plant' && plantSel) {
    if (!bed) return;
    pushUndo(); drag = { kind: 'paint', changed: false, last: '' };
    paint(c); e.preventDefault(); return;
  }
  if (tool === 'erase') {
    if (!bed) return;
    pushUndo(); drag = { kind: 'erase', changed: false };
    if (eraseAt(bed, c.gx - bed.x, c.gy - bed.y)) { drag.changed = true; save(); renderLayout(); }
    e.preventDefault(); return;
  }
  if (!bed) { selBed = ''; selPl = ''; renderLayout(); return; }
  const pl = e.target.closest('.pl');
  selBed = bed.id; selPl = pl ? pl.dataset.pl : '';
  drag = { kind: 'move', bed, sx: c.px, sy: c.py, x: bed.x, y: bed.y, moved: false };
  renderLayout(); e.preventDefault();
}
function paint(c) {
  const bed = bedAt(c.gx, c.gy); if (!bed) return;
  const key = c.gx + ',' + c.gy; if (drag.last === key) return; drag.last = key;
  if (placeAt(bed, c.gx - bed.x, c.gy - bed.y, plantSel)) { drag.changed = true; save(); renderLayout(); }
}
function onMove(e) {
  if (!drag) return;
  const c = cellFromEvent(e);
  if (drag.kind === 'paint') return paint(c);
  if (drag.kind === 'erase') { const bed = bedAt(c.gx, c.gy); if (bed && eraseAt(bed, c.gx - bed.x, c.gy - bed.y)) { drag.changed = true; save(); renderLayout(); } return; }
  const dx = Math.round((c.px - drag.sx) / zoom), dy = Math.round((c.py - drag.sy) / zoom);
  if (drag.kind === 'move') {
    if (!drag.moved && Math.abs(c.px - drag.sx) + Math.abs(c.py - drag.sy) < 5) return;
    if (!drag.moved) { pushUndo(); drag.moved = true; }
    const nx = clamp(drag.x + dx, 0, G.w - drag.bed.w), ny = clamp(drag.y + dy, 0, G.h - drag.bed.h);
    if (nx !== drag.bed.x || ny !== drag.bed.y) { drag.bed.x = nx; drag.bed.y = ny; $('ground').innerHTML = groundHtml(zoom, {}); }
  } else if (drag.kind === 'resize') {
    const nw = clamp(drag.w + dx, 1, G.w - drag.bed.x), nh = clamp(drag.h + dy, 1, G.h - drag.bed.y);
    if (nw !== drag.bed.w || nh !== drag.bed.h) { drag.bed.w = nw; drag.bed.h = nh; $('ground').innerHTML = groundHtml(zoom, {}); }
  }
}
function onUp() {
  if (!drag) return;
  const d = drag; drag = null;
  if ((d.kind === 'paint' || d.kind === 'erase') && !d.changed) undoStack.pop();
  if (d.kind === 'move' && !d.moved) return;
  if (d.kind === 'resize') { const n = d.bed.pl.length; trimBed(d.bed); if (d.bed.pl.length < n) toast('Plants outside the new size were removed (Ctrl+Z to undo).'); }
  save(); renderLayout();
}

// ---------- calendar ----------
function usedPlants() { return [...new Set(G.beds.flatMap((b) => b.pl.map((x) => x.p)))].map(P).sort((a, b) => { const sa = schedule(a), sb = schedule(b); return (sa.ev[0] ? sa.ev[0].d : 0) - (sb.ev[0] ? sb.ev[0].d : 0); }); }
function ganttHtml(print) {
  const list = usedPlants();
  if (!list.length) return '<p class="hint" style="padding:14px">Add plants to your layout and their sowing, planting and harvest dates appear here.</p>';
  const y = G.year, start = new Date(y, 0, 1), end = new Date(y + 1, 0, 1), span = end - start;
  const pct = (d) => clamp(((d - start) / span) * 100, 0, 100);
  const months = Array.from({ length: 12 }, (_, i) => new Date(y, i, 1).toLocaleDateString(undefined, { month: 'short' }));
  const tot = Object.fromEntries(totals().map((t) => [t.p.id, t.n]));
  let h = `<div class="g-row g-head"><div class="g-name">Plant</div><div class="g-track">${months.map((m) => `<span>${m}</span>`).join('')}</div></div>`;
  const lfp = pct(LF()), ffp = pct(FF()), tp = pct(new Date());
  for (const p of list) {
    const s = schedule(p);
    const bars = s.ev.map((e) => { const a = pct(e.d), b = Math.max(pct(e.d2), a + 0.8); return a >= 100 ? '' : `<i class="b ${e.k}" style="left:${a}%;width:${b - a}%" title="${esc(e.label)}: ${fmtD(e.d)}${e.d2 ? ' – ' + fmtD(e.d2) : ''}"></i>`; }).join('');
    const first = s.ev.find((e) => e.k === 'ind' || e.k === 'out');
    h += `<div class="g-row"><div class="g-name"><span>${p.ic}</span> ${esc(p.name)} <small>× ${tot[p.id] || 0}${first ? ' · ' + fmtD(first.d) : ''}</small></div><div class="g-track">${bars}<b class="frost" style="left:${lfp}%" title="Last frost ${fmtD(LF())}"></b><b class="frost" style="left:${ffp}%" title="First frost ${fmtD(FF())}"></b>${!print && new Date().getFullYear() === y ? `<b class="today" style="left:${tp}%"></b>` : ''}</div></div>`;
  }
  return h;
}
function renderCalendar() {
  $('calHint').innerHTML = `Season ${G.year} · last spring frost <b>${fmtDY(LF())}</b> · first fall frost <b>${fmtDY(FF())}</b> · about ${seasonDays()} frost-free days. Blue lines mark the frost dates.`;
  $('gantt').innerHTML = ganttHtml(false);
  const now = new Date(), from = addDays(now, -7), to = addDays(now, 21);
  const evs = usedPlants().flatMap((p) => schedule(p).ev.filter((e) => e.k !== 'har' || true).map((e) => ({ ...e, p })));
  let list = evs.filter((e) => e.d >= from && e.d <= to);
  let title = 'To do in the next 3 weeks';
  if (!list.length) { list = evs.filter((e) => e.d >= now).sort((a, b) => a.d - b.d).slice(0, 5); title = 'Coming up next'; }
  list.sort((a, b) => a.d - b.d);
  $('todo').innerHTML = evs.length ? `<h3>${title}</h3>${list.length ? list.map((e) => `<div class="td ${e.k}${e.d < now ? ' past' : ''}"><b>${fmtD(e.d)}</b> ${e.p.ic} ${esc(e.label)}</div>`).join('') : '<p class="hint">Nothing left this season – time to plan next year!</p>'}` : '';
}

// ---------- plant guide ----------
function renderLib() {
  const q = $('libSearch').value.trim().toLowerCase();
  const list = allPlants().filter((p) => !q || p.name.toLowerCase().includes(q));
  $('lib').innerHTML = Object.entries(CATS).map(([k, v]) => {
    const ps = list.filter((p) => p.cat === k); if (!ps.length) return '';
    return `<h2 class="lib-h">${v}</h2><div class="lib-grid">${ps.map((p) => `<div class="lib-c">${plantCard(p, `<p class="hint rule">${esc(timingRule(p))}</p>${p.custom ? `<button class="ghost mini danger" data-delcp="${p.id}">Delete this plant</button>` : ''}<button class="ghost mini" data-use="${p.id}">Plant it in my layout →</button>`)}</div>`).join('')}</div>`;
  }).join('') || '<p class="hint">No plants found.</p>';
}

// ---------- journal ----------
let editJ = null;
function renderJournal() {
  const j = [...G.journal].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const hv = {};
  for (const e of j) if (e.kind === 'harvest' && e.qty) { const k = e.plant + '|' + e.unit; hv[k] = (hv[k] || 0) + Number(e.qty); }
  $('harvestStats').innerHTML = Object.keys(hv).length ? Object.entries(hv).map(([k, v]) => { const [pid, u] = k.split('|'); return `<div><b>${Math.round(v * 10) / 10} ${esc(u)}</b><span>${P(pid).ic} ${esc(P(pid).name)}</span></div>`; }).join('') : '';
  $('jTable').innerHTML = j.length ? `<thead><tr><th>Date</th><th>Plant</th><th>What</th><th>Notes</th></tr></thead><tbody>${j.map((e) => `<tr data-j="${e.id}" class="clickable"><td>${e.date ? fmtDY(parseD(e.date)) : ''}</td><td>${e.plant ? P(e.plant).ic + ' ' + esc(P(e.plant).name) : '–'}</td><td>${e.kind === 'harvest' ? `🧺 ${e.qty || ''} ${esc(e.unit || '')}` : '📝 Note'}</td><td>${esc(e.text || '')}</td></tr>`).join('')}</tbody>` : '';
  $('jHint').textContent = j.length ? 'Click an entry to edit it.' : 'Keep notes on what you sowed, pests you saw and how much you harvested. Next year you will know what worked.';
}
function openJ(kind, e) {
  if (needsPro('The garden journal and harvest log are part of Pro.')) return;
  editJ = e || { id: uid('j'), kind, date: todayStr(), plant: '', qty: '', unit: 'lb', text: '' };
  $('jDlgTitle').textContent = editJ.kind === 'harvest' ? '🧺 Harvest' : '📝 Note';
  const ps = usedPlants().length ? usedPlants() : allPlants();
  $('jPlant').innerHTML = '<option value="">– none –</option>' + ps.map((p) => `<option value="${p.id}">${p.ic} ${esc(p.name)}</option>`).join('');
  $('jDate').value = editJ.date; $('jPlant').value = editJ.plant || ''; $('jQty').value = editJ.qty || ''; $('jUnit').value = editJ.unit || 'lb'; $('jText').value = editJ.text || '';
  $('jQtyRow').hidden = editJ.kind !== 'harvest'; $('jDel').hidden = !e;
  $('jDlg').showModal();
}

// ---------- tabs & general render ----------
function setTab(t) {
  tab = t;
  document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.t === t));
  $('layoutPane').hidden = t !== 'layout'; $('calendarPane').hidden = t !== 'calendar'; $('plantsPane').hidden = t !== 'plants'; $('journalPane').hidden = t !== 'journal';
  renderAll();
}
function renderDocPick() { $('docPick').innerHTML = docs.map((d) => `<option value="${d.id}"${d.id === cur ? ' selected' : ''}>${esc(d.name)} (${d.year})</option>`).join(''); }
function renderAll() {
  if (!G) return;
  renderDocPick();
  if (tab === 'layout') { renderPalette(); renderLayout(); }
  if (tab === 'calendar') renderCalendar();
  if (tab === 'plants') renderLib();
  if (tab === 'journal') renderJournal();
  $('customPlantBtn').textContent = '＋ Add your own plant' + (unlocked() ? '' : ' ★');
}

// ---------- plans ----------
async function loadDoc(id) {
  const g = await dbGet('g:' + id);
  if (!g) return false;
  cur = id; G = normalize(g); undoStack = []; selBed = ''; selPl = ''; prevG = null;
  if (G.prev) { const pg = await dbGet('g:' + G.prev).catch(() => null); prevG = pg ? normalize(pg) : null; }
  await dbSet('cur', id);
  renderAll(); return true;
}
async function newDoc(g) {
  if (G) await saveNow();
  docs.push({ id: g.id, name: g.name, year: g.year });
  await dbSet('g:' + g.id, g); await saveDocs();
  return loadDoc(g.id);
}
function syncDoc() { const d = docs.find((x) => x.id === cur); if (d) { d.name = G.name; d.year = G.year; saveDocs(); } }
function shiftYear(s, y) { return `${y}-${String(s).slice(5)}`; }
async function nextSeason() {
  if (needsPro('Next season and crop rotation checks are part of Pro.')) return;
  const g = blankGarden(G.name.replace(/\s*\d{4}$/, ''), G.year + 1);
  Object.assign(g, { units: G.units, w: G.w, h: G.h, zone: G.zone, last: shiftYear(G.last, G.year + 1), first: shiftYear(G.first, G.year + 1), prev: G.id, beds: G.beds.map((b) => ({ ...b, pl: [] })) });
  g.name = `${g.name} ${g.year}`;
  await newDoc(g); toast(`Started ${g.year}. Beds are kept and empty – plant them and GardenPress warns you if a crop family is in the same bed as last year.`);
}

// ---------- printing ----------
function printHtml(html, landscape) {
  $('printArea').innerHTML = html;
  let st = $('pageRule'); if (!st) { st = document.createElement('style'); st.id = 'pageRule'; document.head.appendChild(st); }
  st.textContent = `@page { size: ${landscape ? 'landscape' : 'auto'}; margin: 0.45in; }`;
  setTimeout(() => window.print(), 60);
}
const printHead = (title) => `<div class="pr-head"><b>${esc(G.name)}</b> – ${title}<span>Season ${G.year} · last frost ${fmtD(LF())} · first frost ${fmtD(FF())}</span></div>`;
function printLayout() {
  const land = G.w > G.h * 1.15;
  const maxW = land ? 960 : 700, maxH = land ? 560 : 640;
  const z = Math.max(8, Math.min(44, Math.floor(Math.min(maxW / G.w, maxH / G.h))));
  const prevSel = [selBed, selPl]; selBed = ''; selPl = '';
  const t = totals();
  const html = `<div class="pr">${printHead('garden plan')}<div class="pr-ground">${groundHtml(z, { print: true })}</div>
    <p class="pr-scale">1 grid square = 1 ${sqLabel()} · garden ${dimText(G.w)} × ${dimText(G.h)}</p>
    <table class="pr-t"><thead><tr><th>Plant</th><th>Squares</th><th>Plants</th><th>When</th></tr></thead><tbody>${t.map((x) => `<tr><td>${x.p.ic} ${esc(x.p.name)}</td><td>${x.sq}</td><td>${x.n}</td><td>${esc(timingText(x.p))}</td></tr>`).join('')}</tbody></table></div>`;
  [selBed, selPl] = prevSel;
  printHtml(html, land);
}
function printCalendar() {
  if (needsPro('Printing the planting calendar is part of Pro.')) return;
  if (!usedPlants().length) return toast('Add plants to your layout first.');
  printHtml(`<div class="pr">${printHead('planting calendar')}<div class="cal-legend"><span class="k ind"></span> Start indoors <span class="k out"></span> Plant out / sow <span class="k suc"></span> Sow again <span class="k har"></span> Harvest</div><div class="gantt pr-gantt">${ganttHtml(true)}</div></div>`, true);
}
function printLabels() {
  if (needsPro('Printing plant labels is part of Pro.')) return;
  const ps = usedPlants(); if (!ps.length) return toast('Add plants to your layout first.');
  printHtml(`<div class="labels">${ps.map((p) => { const s = schedule(p); const o = s.ev.find((e) => e.k === 'out'); const h = s.ev.find((e) => e.k === 'har'); return `<div class="lab" style="border-color:${p.col}"><span class="li">${p.ic}</span><div><b>${esc(p.name)}</b><small>${o ? (p.ds != null && p.si == null && !p.verb ? 'Sown' : 'Planted') + ' ' + fmtD(o.d) + ' ' + G.year : ''}</small><small>${p.size > 1 ? `${p.size}×${p.size} squares` : `${p.sq} per ${sqLabel()}`}${h ? ' · harvest ~' + fmtD(h.d) : ''}</small></div></div>`; }).join('')}</div>`, false);
}
function printShopping() {
  if (needsPro('The seed and plant shopping list is part of Pro.')) return;
  const t = totals(); if (!t.length) return toast('Add plants to your layout first.');
  const rows = t.map((x) => { const p = x.p; const trans = p.si != null && p.tp != null; const succ = p.sc ? Math.max(1, schedule(p).ev.filter((e) => e.k === 'suc').length) : 0; const need = trans ? `${x.n} seedlings (or a packet of seed to start ${Math.ceil(x.n * 1.5)})` : p.ff != null ? `${x.n} cloves / bulbs` : `seed for about ${Math.ceil(x.n * 1.5 * (1 + succ))} plants${succ ? ` (incl. ${succ} later sowing${succ > 1 ? 's' : ''})` : ''}`; return `<tr><td class="cb">☐</td><td>${p.ic} ${esc(p.name)}</td><td>${need}</td><td>${esc(timingText(p))}</td></tr>`; }).join('');
  printHtml(`<div class="pr">${printHead('seed & plant shopping list')}<table class="pr-t"><thead><tr><th></th><th>Plant</th><th>Buy</th><th>When</th></tr></thead><tbody>${rows}</tbody></table><p class="pr-scale">Seed amounts include about 50% extra for germination losses.</p></div>`, false);
}

// ---------- backup ----------
function download(name, data, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }
async function backup() {
  await saveNow();
  const plans = {}; for (const d of docs) plans[d.id] = await dbGet('g:' + d.id);
  download(`GardenPress backup ${todayStr()}.json`, JSON.stringify({ app: 'gardenpress', v: 1, docs, plans, custom }), 'application/json');
}
async function restoreBackup(file) {
  try {
    const o = JSON.parse(await file.text());
    if (o.app !== 'gardenpress' || !o.plans) throw new Error('not a GardenPress backup');
    if (!confirm('Restore this backup? Plans with the same name are replaced; other plans are kept.')) return;
    for (const d of o.docs || []) { if (!o.plans[d.id]) continue; await dbSet('g:' + d.id, o.plans[d.id]); if (!docs.some((x) => x.id === d.id)) docs.push(d); }
    if (Array.isArray(o.custom)) { for (const c of o.custom) if (!custom.some((x) => x.id === c.id)) custom.push(c); await dbSet('custom', custom); applyCustom(); }
    await saveDocs(); await loadDoc((o.docs && o.docs[0] && o.docs[0].id) || cur); toast('Backup restored.');
  } catch (e) { toast('Could not read that file: ' + e.message); }
}

// ---------- sample ----------
function sampleGarden() {
  const g = blankGarden('Sample kitchen garden');
  const P1 = (p, x, yy, s) => ({ id: uid('p'), p, x, y: yy, s: s || 1 });
  g.w = 22; g.h = 15;
  g.beds = [
    { id: uid('b'), type: 'raised', name: 'Tomato bed', x: 1, y: 1, w: 4, h: 8, pl: [P1('tomato', 0, 0), P1('basil', 1, 0), P1('tomato', 2, 0), P1('marigold', 3, 0), P1('pepper', 0, 1), P1('basil', 1, 1), P1('cherrytom', 2, 1), P1('pepper', 3, 1), P1('chili', 0, 2), P1('onion', 1, 2), P1('onion', 2, 2), P1('eggplant', 3, 2), P1('carrot', 0, 3), P1('carrot', 1, 3), P1('parsley', 2, 3), P1('chives', 3, 3), P1('marigold', 0, 7), P1('nasturtium', 3, 7)] },
    { id: uid('b'), type: 'raised', name: 'Salad bed', x: 7, y: 1, w: 4, h: 8, pl: [P1('lettuce', 0, 0), P1('lettuce', 1, 0), P1('spinach', 2, 0), P1('spinach', 3, 0), P1('radish', 0, 1), P1('radish', 1, 1), P1('arugula', 2, 1), P1('leaflettuce', 3, 1), P1('peas', 0, 2), P1('peas', 1, 2), P1('peas', 2, 2), P1('peas', 3, 2), P1('beet', 0, 3), P1('beet', 1, 3), P1('chard', 2, 3), P1('kale', 3, 3), P1('scallion', 0, 4), P1('cilantro', 1, 4), P1('dill', 2, 4), P1('broccoli', 3, 4)] },
    { id: uid('b'), type: 'raised', name: 'Vine bed', x: 13, y: 1, w: 4, h: 8, pl: [P1('cucumber', 0, 0), P1('cucumber', 1, 0), P1('beanpole', 2, 0), P1('beanpole', 3, 0), P1('zucchini', 0, 2, 2), P1('beanbush', 2, 2), P1('beanbush', 3, 2), P1('nasturtium', 2, 3), P1('marigold', 3, 3), P1('corn', 0, 5), P1('corn', 1, 5), P1('corn', 2, 5), P1('corn', 3, 5), P1('corn', 0, 6), P1('corn', 1, 6), P1('corn', 2, 6), P1('corn', 3, 6)] },
    { id: uid('b'), type: 'path', name: '', x: 0, y: 10, w: 22, h: 2, pl: [] },
    { id: uid('b'), type: 'pot', name: 'Herb pot', x: 19, y: 1, w: 2, h: 2, pl: [P1('rosemary', 0, 0), P1('thyme', 1, 0), P1('sage', 0, 1), P1('oregano', 1, 1)] },
    { id: uid('b'), type: 'pot', name: 'Mint pot', x: 19, y: 4, w: 2, h: 2, pl: [P1('mint', 0, 0), P1('mint', 1, 0), P1('mint', 0, 1), P1('mint', 1, 1)] },
    { id: uid('b'), type: 'ground', name: 'Strawberry patch', x: 1, y: 12, w: 8, h: 2, pl: Array.from({ length: 8 }, (_, i) => P1('strawberry', i, 0)).concat(Array.from({ length: 8 }, (_, i) => P1('strawberry', i, 1))) },
  ];
  return g;
}

// ---------- settings dialog ----------
function openSettings() {
  $('sName').value = G.name; $('sYear').value = G.year; $('sUnits').value = G.units; $('sW').value = G.w; $('sH').value = G.h;
  $('sZone').value = G.zone || ''; $('sLast').value = G.last; $('sFirst').value = G.first;
  $('setDlg').showModal();
}

// ---------- events ----------
function bind() {
  document.querySelectorAll('#tabs button').forEach((b) => (b.onclick = () => setTab(b.dataset.t)));
  $('moreBtn').onclick = (e) => { e.stopPropagation(); $('menu').hidden = !$('menu').hidden; };
  document.addEventListener('click', (e) => { if (!$('menu').hidden && !$('menu').contains(e.target)) $('menu').hidden = true; });
  $('menu').addEventListener('click', (e) => { if (e.target.closest('button,a')) $('menu').hidden = true; });
  $('proBtn').onclick = () => { if (!isPro) openPro(); };
  $('buyBtn').onclick = buyPro; $('restoreBtn').onclick = async () => { proMessage((await checkPro()) ? 'Pro restored. ★' : 'No Pro purchase found on this Microsoft account.'); };
  $('closePro').onclick = () => $('proDialog').close(); $('trialBtn').onclick = startTrial;

  $('docPick').onchange = async (e) => { await saveNow(); loadDoc(e.target.value); };
  $('newDocBtn').onclick = () => {
    if (docs.length >= FREE_DOCS && needsPro('More than one garden plan is part of Pro.')) return;
    const n = prompt('Name of the new garden plan:', 'My garden'); if (n == null) return;
    const g = blankGarden(n.trim() || 'My garden'); Object.assign(g, { units: G.units, zone: G.zone, last: shiftYear(G.last, g.year), first: shiftYear(G.first, g.year) }); newDoc(g);
  };
  $('nextSeasonBtn').onclick = nextSeason;
  $('renameDocBtn').onclick = () => { const n = prompt('Rename this plan:', G.name); if (n && n.trim()) { G.name = n.trim(); save(); syncDoc(); renderAll(); } };
  $('delDocBtn').onclick = async () => {
    if (!confirm(`Delete “${G.name}” for good? Make a backup first if you might need it.`)) return;
    await dbDel('g:' + cur); docs = docs.filter((d) => d.id !== cur);
    if (!docs.length) { const g = blankGarden(); docs.push({ id: g.id, name: g.name, year: g.year }); await dbSet('g:' + g.id, g); }
    await saveDocs(); G = null; loadDoc(docs[0].id);
  };
  $('printBtn').onclick = printLayout; $('printBtn2').onclick = printLayout;
  $('printCalBtn').onclick = printCalendar; $('printCal').onclick = printCalendar;
  $('printLabelsBtn').onclick = printLabels; $('printShopBtn').onclick = printShopping;
  $('backupBtn').onclick = backup;
  $('restoreFileBtn').onclick = () => { const f = $('fileIn'); f.value = ''; f.accept = '.json'; f.onchange = () => f.files[0] && restoreBackup(f.files[0]); f.click(); };
  $('sampleBtn').onclick = async () => {
    const g = sampleGarden();
    if (docs.length >= FREE_DOCS && !unlocked()) {
      if (!confirm('The free version keeps one garden plan. Replace your current plan with the sample? (Unlock Pro to keep both.)')) return;
      await saveNow(); undoStack.push(JSON.stringify(G.beds));
      Object.assign(G, { name: g.name, w: g.w, h: g.h, beds: g.beds }); save(); syncDoc(); selBed = ''; renderAll(); toast('Sample loaded – Ctrl+Z brings your beds back.'); return;
    }
    g.zone = G.zone; g.last = shiftYear(G.last, g.year); g.first = shiftYear(G.first, g.year);
    newDoc(g);
  };

  // layout
  $('tools').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setTool(b.dataset.tool); });
  $('addBed').onclick = () => addBed('raised'); $('addRow').onclick = () => addBed('ground'); $('addPot').onclick = () => addBed('pot'); $('addPath').onclick = () => addBed('path');
  $('plantSearch').oninput = renderPalette;
  $('catChips').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { cat = b.dataset.c; renderPalette(); } });
  $('palette').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { if (plantSel === b.dataset.p && tool === 'plant') setTool('select'); else pickPlant(b.dataset.p); } });
  $('ground').addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
  $('ground').addEventListener('contextmenu', (e) => { e.preventDefault(); const c = cellFromEvent(e); const bed = bedAt(c.gx, c.gy); if (bed) { pushUndo(); if (eraseAt(bed, c.gx - bed.x, c.gy - bed.y)) { save(); renderLayout(); } else undoStack.pop(); } });
  $('zoomIn').onclick = () => { zoom = Math.min(64, zoom + 6); renderLayout(); }; $('zoomOut').onclick = () => { zoom = Math.max(16, zoom - 6); renderLayout(); };
  $('undoBtn').onclick = undo;
  $('warnBtn').onclick = () => { $('warnList').innerHTML = warnings.map((w) => `<li class="${w.level}">${esc(w.text)}</li>`).join(''); $('warnDlg').showModal(); };
  $('warnClose').onclick = () => $('warnDlg').close();
  $('gSettingsBtn').onclick = openSettings; $('frostBtn').onclick = openSettings;
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input,textarea,select') || document.querySelector('dialog[open]')) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
    else if (e.key === 'Escape') { setTool('select'); }
    else if ((e.key === 'Delete' || e.key === 'Backspace') && tab === 'layout') {
      const bed = bedById(selBed); if (!bed) return;
      if (selPl) { pushUndo(); bed.pl = bed.pl.filter((x) => x.id !== selPl); selPl = ''; save(); renderLayout(); } else deleteBed(bed);
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') { e.preventDefault(); if (tab === 'calendar') printCalendar(); else printLayout(); }
  });

  // settings
  $('sZone').innerHTML = '<option value="">– choose –</option>' + Object.keys(ZONES).map((z) => `<option value="${z}">Zone ${z} (≈ ${fmtD(parseD('2000-' + ZONES[z][0]))} – ${fmtD(parseD('2000-' + ZONES[z][1]))})</option>`).join('');
  $('sZone').onchange = (e) => { const z = ZONES[e.target.value]; if (z) { const y = +$('sYear').value || G.year; $('sLast').value = `${y}-${z[0]}`; $('sFirst').value = `${y}-${z[1]}`; } };
  $('sYear').onchange = (e) => { const y = +e.target.value; if (y > 1999) { if ($('sLast').value) $('sLast').value = shiftYear($('sLast').value, y); if ($('sFirst').value) $('sFirst').value = shiftYear($('sFirst').value, y); } };
  $('sCancel').onclick = () => $('setDlg').close();
  $('sSave').onclick = () => {
    const w = clamp(+$('sW').value || G.w, 4, 120), h = clamp(+$('sH').value || G.h, 4, 120);
    const last = $('sLast').value, first = $('sFirst').value;
    if (!last || !first || parseD(first) <= parseD(last)) return toast('The first fall frost must come after the last spring frost.');
    pushUndo();
    Object.assign(G, { name: $('sName').value.trim() || G.name, year: +$('sYear').value || G.year, units: $('sUnits').value, zone: $('sZone').value, last, first, w, h });
    for (const b of G.beds) { b.w = Math.min(b.w, w); b.h = Math.min(b.h, h); b.x = clamp(b.x, 0, w - b.w); b.y = clamp(b.y, 0, h - b.h); trimBed(b); }
    save(); syncDoc(); $('setDlg').close(); renderAll();
  };

  // plants & custom
  $('libSearch').oninput = renderLib;
  $('lib').addEventListener('click', async (e) => {
    const u = e.target.closest('[data-use]'); if (u) { setTab('layout'); pickPlant(u.dataset.use); return; }
    const d = e.target.closest('[data-delcp]'); if (d && confirm('Delete this plant? Squares already planted with it stay but show as unknown.')) { custom = custom.filter((c) => c.id !== d.dataset.delcp); await dbSet('custom', custom); applyCustom(); renderAll(); }
  });
  $('customPlantBtn').onclick = () => {
    if (needsPro('Adding your own plants and varieties is part of Pro.')) return;
    $('cpBase').innerHTML = PLANTS.map((p) => `<option value="${p.id}">${p.ic} ${esc(p.name)}</option>`).join('');
    $('cpName').value = ''; $('cpBase').value = 'tomato'; $('cpSq').value = 1; $('cpDtm').value = 70; $('cpIc').value = '';
    $('cpDlg').showModal();
  };
  $('cpBase').onchange = (e) => { const b = PLANT[e.target.value]; $('cpSq').value = b.sq; $('cpDtm').value = b.dtm; };
  $('cpCancel').onclick = () => $('cpDlg').close();
  $('cpSave').onclick = async () => {
    const name = $('cpName').value.trim(); if (!name) return toast('Give the plant a name.');
    const c = { id: uid('c'), name, base: $('cpBase').value, sq: clamp(+$('cpSq').value || 1, 1, 16), dtm: clamp(+$('cpDtm').value || 60, 10, 400), ic: $('cpIc').value.trim() };
    custom.push(c); await dbSet('custom', custom); applyCustom(); $('cpDlg').close(); renderAll(); toast(`${name} added to your plants.`);
  };

  // journal
  $('addNoteBtn').onclick = () => openJ('note'); $('addHarvestBtn').onclick = () => openJ('harvest');
  $('jTable').addEventListener('click', (e) => { const r = e.target.closest('[data-j]'); if (r) openJ(null, G.journal.find((x) => x.id === r.dataset.j)); });
  $('jCancel').onclick = () => $('jDlg').close();
  $('jSave').onclick = () => {
    Object.assign(editJ, { date: $('jDate').value || todayStr(), plant: $('jPlant').value, qty: $('jQty').value, unit: $('jUnit').value, text: $('jText').value.trim() });
    if (!G.journal.includes(editJ)) G.journal.push(editJ);
    save(); $('jDlg').close(); renderJournal();
  };
  $('jDel').onclick = () => { G.journal = G.journal.filter((x) => x !== editJ); save(); $('jDlg').close(); renderJournal(); };
  window.addEventListener('afterprint', () => { $('printArea').innerHTML = ''; });
}

// ---------- start ----------
async function init() {
  bind();
  await loadTrial();
  custom = (await dbGet('custom').catch(() => null)) || []; applyCustom();
  docs = (await dbGet('docs').catch(() => null)) || [];
  let id = await dbGet('cur').catch(() => null);
  if (!docs.length) {
    const g = blankGarden('My garden');
    g.beds = [{ id: uid('b'), type: 'raised', name: 'Bed 1', x: 2, y: 2, w: 4, h: 8, pl: [] }, { id: uid('b'), type: 'raised', name: 'Bed 2', x: 8, y: 2, w: 4, h: 8, pl: [] }];
    docs = [{ id: g.id, name: g.name, year: g.year }]; await dbSet('g:' + g.id, g); await saveDocs(); id = g.id;
    setTimeout(() => toast('Welcome! Pick a plant on the left and click squares in a bed. Set your frost dates in ⚙ Garden settings.'), 600);
  }
  if (!docs.some((d) => d.id === id)) id = docs[0].id;
  await loadDoc(id);
  setPro(isPro);
  checkPro();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
}
init();
