const $ = id => document.getElementById(id);
const N = $('notch'), panel = $('panel');
let state = { history: [], pouch: [], current: null }, open = false, filter = 'all', freshId = null;
let settings = { theme: 'dark', accent: '#ff4d5e', style: 'notch', mascot: 'mo', trail: true, ttl: 30, login: false };
let view = 'grid';
try { view = localStorage.getItem('rouge.view') || 'grid'; } catch {}

const FILTERS = [
  { key: 'all', label: 'All', test: () => true },
  { key: 'text', label: 'Text', test: i => i.kind === 'text', dot: '#b9bcc4' },
  { key: 'link', label: 'Links', test: i => i.kind === 'link' || i.kind === 'email', dot: '#6aa8ff' },
  { key: 'image', label: 'Images', test: i => i.kind === 'image', dot: '#ffd166' },
  { key: 'color', label: 'Colors', test: i => i.kind === 'color', dot: 'conic-gradient(#ff4d5e,#ffd166,#4ade80,#6aa8ff,#c084fc,#ff4d5e)' },
  { key: 'code', label: 'Code', test: i => i.kind === 'code', dot: '#ff6b7a' },
];

const TIPS = [
  { keys: ['Alt', 'V'], t: 'Open the paste menu anywhere, then pick with ↑↓ or 1–9' },
  { keys: ['Alt', 'Scroll'], t: 'Choose what Ctrl V pastes, without leaving your text' },
  { keys: ['Shake'], t: 'Wiggle the mouse fast to fling the trail off' },
  { keys: ['Hover'], t: 'Bring your trail up here and the pouch swallows it' },
  { keys: ['Poke'], t: 'Poke the mascot. Right-click her to change form' },
  { keys: ['Source'], t: 'Browser copies remember the site they came from' },
  { keys: ['#hex'], t: 'Colours, links and images get cards of their own' },
  { keys: ['⚙'], t: 'Themes, accent colour and a floating notch live in settings' },
];
const ACCENTS = ['#ff4d5e', '#ff7a45', '#f5a524', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899'];

const ago = ts => {
  const s = (Date.now() - ts) / 1000;
  if (s < 45) return 'now';
  if (s < 3600) return Math.round(s / 60) + 'm';
  if (s < 86400) return Math.round(s / 3600) + 'h';
  return Math.round(s / 86400) + 'd';
};
const miniTile = (item, i = 0) => `<div class="t" style="--i:${i}">${Rouge.tile(item)}</div>`;
const luminance = color => {
  const c = document.createElement('canvas').getContext('2d');
  c.fillStyle = color; const v = c.fillStyle;
  const m = v.startsWith('#') ? [1, 3, 5].map(i => parseInt(v.slice(i, i + 2), 16)) : (v.match(/\d+/g) || [0, 0, 0]).map(Number);
  return (0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2]) / 255;
};
const kbd = keys => keys.map(k => `<kbd>${k}</kbd>`).join('');

const mascot = Mascot.mount($('mascot'), settings.mascot, (settings.custom || {})[settings.mascot]);
mascot.pause();
const formName = () => Mascot.FORMS[mascot.form].name;

function formOptions(el, cls = 'form-opt') {
  el.innerHTML = Object.entries(Mascot.FORMS).map(([k, f]) =>
    `<div class="${cls}${k === settings.mascot ? ' on' : ''}" data-form="${k}"><div class="pv">${Mascot.svg(k)}</div>${f.name}</div>`).join('');
}
function pickForm(k) {
  if (k === settings.mascot) return;
  rouge.send('settings-set', { mascot: k });
}
$('forms').addEventListener('click', e => { const o = e.target.closest('[data-form]'); if (o) pickForm(o.dataset.form); });

const cust = $('cust');
let custTab = 'Hair', custSaveT;
const myCustom = () => ({ ...((settings.custom || {})[mascot.form] || {}) });
function saveCustom(c) {
  settings.custom = { ...(settings.custom || {}), [mascot.form]: c };
  mascot.setCustom(c);
  renderCustom();
  clearTimeout(custSaveT);
  custSaveT = setTimeout(() => rouge.send('settings-set', { custom: settings.custom }), 250);
}
function renderCustom() {
  const f = mascot.form, c = myCustom();
  $('custTitle').textContent = `Customize ${Mascot.FORMS[f].name}`;
  const tabs = [...Mascot.CUSTOM.map(s => s.section), 'Outfit', 'Colours'];
  $('custTabs').innerHTML = tabs.map(t => `<div class="${t === custTab ? 'on' : ''}" data-tab="${t}">${t}</div>`).join('');
  let html = '';
  const sec = Mascot.CUSTOM.find(s => s.section === custTab);
  if (sec) {
    html = sec.items.map(item => {
      const v = Mascot.valueOf(f, c, item);
      return `<div class="c-row"><div class="c-lbl">${item.label}</div><div class="c-opts">${item.options.map(([val, lbl]) =>
        `<div class="c-opt${val === v ? ' on' : ''}" data-k="${item.key}" data-v="${val}">${lbl}</div>`).join('')}</div></div>`;
    }).join('');
  } else if (custTab === 'Outfit') {
    const cur = Mascot.look(f, c, 'outfit');
    html = `<div class="c-row"><div class="c-lbl">Outfit</div><div class="c-opts">${Object.entries(Mascot.OUTFITS).map(([k, o]) => {
      const skirt = o.skirt ? `rgb(${o.skirt.map(x => Math.round(x * 255)).join(',')})` : '#9a9aa6';
      return `<div class="c-fit${k === cur ? ' on' : ''}" data-k="outfit" data-v="${k}"><i style="background:${o.swatch};--skirt:${skirt}"></i>${o.label}</div>`;
    }).join('')}</div></div>`;
  } else {
    const sw = (key, label, set) => {
      const cur = Mascot.look(f, c, key);
      return `<div class="c-row"><div class="c-lbl">${label}</div><div class="c-opts">${Object.entries(set).map(([k, o]) =>
        `<div class="c-sw${k === cur ? ' on' : ''}" data-k="${key}" data-v="${k}"><i style="background:${o.swatch}"></i>${o.label}</div>`).join('')}</div></div>`;
    };
    html = sw('hair', 'Hair colour', Mascot.HAIR_COLORS) + sw('eye', 'Eye colour', Mascot.EYE_COLORS) + sw('skin', 'Skin', Mascot.SKIN_TONES);
  }
  $('custBody').innerHTML = html;
}
$('mascot').addEventListener('contextmenu', e => {
  e.preventDefault();
  renderCustom();
  cust.classList.add('on');
});
$('custTabs').addEventListener('click', e => { const t = e.target.closest('[data-tab]'); if (t) { custTab = t.dataset.tab; renderCustom(); } });
$('custBody').addEventListener('click', e => {
  const o = e.target.closest('[data-k]');
  if (!o) return;
  const v = o.dataset.v, c = myCustom();
  c[o.dataset.k] = /^-?\d+$/.test(v) ? +v : v;
  saveCustom(c);
});
$('custReset').onclick = () => saveCustom({});
$('custClose').onclick = () => cust.classList.remove('on');

function renderMini() {
  const h = state.history;
  $('miniStack').innerHTML = h.length ? h.slice(0, 4).map(i => miniTile(i)).join('') : '<span class="empty">copy something</span>';
  $('miniCount').textContent = state.pouch.length ? state.pouch.length + ' in pouch' : h.length || '';
  $('total').textContent = h.length + (h.length === 1 ? ' clip' : ' clips');
}

const CAP = 12;
function renderPouch(gulp) {
  const p = state.pouch, who = formName();
  $('carry').disabled = $('empty').disabled = !p.length;
  $('meter').innerHTML = Array.from({ length: CAP }, (_, i) => `<i class="${i < p.length ? 'full' : ''}"></i>`).join('') + `<span>${p.length}/${CAP}</span>`;
  let title, tag = '', sub;
  if (!p.length) {
    title = `${who}'s pouch`; tag = '<span class="tag empty">EMPTY</span>';
    sub = 'Hover up here with a trail and it gets caught.';
  } else if (p.length <= 3) {
    title = `${who} is holding ${p.length}`; tag = '<span class="tag few">ROOM FOR MORE</span>';
    sub = 'Caught from your cursor trail.';
  } else {
    title = `${who} is holding ${p.length}`;
    if (p.length >= CAP) tag = '<span class="tag full">FULL</span>';
    sub = p.length >= CAP ? 'Stuffed. Oldest fall out first.' : 'Caught from your cursor trail.';
  }
  $('pouchTitle').textContent = title;
  $('pouchTag').innerHTML = tag;
  $('pouchSub').textContent = sub;
  if (gulp) mascot.gulp();
}

const X = `<svg width="8" height="8" viewBox="0 0 10 10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M2 2l6 6M8 2l-6 6"/></svg>`;
function srcLabel(item, fallback) {
  const name = Rouge.srcName(item);
  return name ? `<span class="src">${Rouge.srcIcon(item)}<span>${Rouge.esc(name)}</span></span>` : `<span>${fallback}</span>`;
}
function card(item, i) {
  const x = `<div class="x" data-x="${item.id}">${X}</div>`;
  const meta = label => `<div class="meta">${srcLabel(item, label)}<span>${ago(item.ts)}</span></div>`;
  const done = `<div class="done">Copied</div>`;
  const cv = item.id === state.current ? `<div class="cv" title="This is what Ctrl V pastes">CTRL V</div>` : '';
  const cls = `card c-${item.kind === 'image' ? 'img' : item.kind}${item.id === freshId ? ' fresh' : ''}`;
  const head = `<div class="${cls}" data-id="${item.id}" style="--i:${i}" title="${Rouge.esc(item.src?.title || '')}">${cv}`;
  const t = item.text ?? '';
  switch (item.kind) {
    case 'image':
      return `${head}<img src="${item.thumb}" draggable="false">${meta(item.w + '×' + item.h)}${x}${done}</div>`;
    case 'color': {
      const light = luminance(t.trim()) > .6;
      return `${head}<div class="sw" style="background:${Rouge.esc(t.trim())}"></div><div class="hex" style="color:${light ? 'rgba(0,0,0,.75)' : 'rgba(255,255,255,.92)'}">${Rouge.esc(t.trim())}</div>${x}${done}</div>`;
    }
    case 'link': {
      let u; try { u = new URL(t.trim()); } catch {}
      return `${head}<div class="body"><div class="fav">${Rouge.tile(item)}</div><div class="dom">${Rouge.esc(Rouge.domain(t.trim()))}</div><div class="path">${Rouge.esc(u ? (u.pathname + u.search).replace(/^\/$/, '') || '/' : t)}</div></div>${meta('link')}${x}${done}</div>`;
    }
    case 'email': {
      const [user, host] = t.trim().split('@');
      return `${head}<div class="body"><div class="fav">${Rouge.tile(item)}</div><div class="dom">${Rouge.esc(user)}</div><div class="path">@${Rouge.esc(host)}</div></div>${meta('email')}${x}${done}</div>`;
    }
    case 'code':
      return `${head}<div class="body">${Rouge.esc(t.slice(0, 400))}</div>${meta('code')}${x}${done}</div>`;
    default:
      return `${head}<div class="body">${Rouge.esc(t.slice(0, 300))}</div>${meta(t.length + ' ch')}${x}${done}</div>`;
  }
}
const ghostCard = (tip, i) => `<div class="ghost-card" style="--i:${i}"><div class="gk">${kbd(tip.keys)}</div><div>${tip.t}</div></div>`;

function row(item, i) {
  const t = item.text ?? '';
  const body = item.kind === 'image' ? `Image · ${item.w}×${item.h}` : item.kind === 'color'
    ? `<span style="display:inline-block;width:10px;height:10px;border-radius:3px;vertical-align:-1px;margin-right:6px;background:${Rouge.esc(t.trim())}"></span>${Rouge.esc(t.trim())}`
    : Rouge.esc(t.slice(0, 1200));
  const name = Rouge.srcName(item);
  const title = item.src?.title && item.src.title !== name ? `<span>·</span><span class="ttl">${Rouge.esc(item.src.title)}</span>` : '';
  return `<div class="row c-${item.kind}" data-id="${item.id}" style="--i:${Math.min(i, 14)}">
    <div class="rf${item.kind === 'image' ? ' big' : ''}">${Rouge.tile(item)}</div>
    <div class="rb"><div class="rt">${body}</div>
      <div class="rm">${item.id === state.current ? '<span class="cvi">CTRL V</span>' : ''}${Rouge.srcIcon(item)}<span>${Rouge.esc(name || item.kind)}</span>${title}<span>·</span><span>${ago(item.ts)}</span></div></div>
    <div class="x" data-x="${item.id}">${X}</div><div class="done">Copied</div></div>`;
}
const tipRow = (tip, i) => `<div class="tip-row" style="--i:${i}">${kbd(tip.keys)}<span>${tip.t}</span></div>`;

function renderChips() {
  $('chips').innerHTML = FILTERS.map(f => {
    const n = state.history.filter(f.test).length;
    if (f.key !== 'all' && !n) return '';
    return `<div class="chip${filter === f.key ? ' on' : ''}" data-f="${f.key}">${f.dot ? `<span class="dot" style="background:${f.dot}"></span>` : ''}${f.label}<span class="n">${n}</span></div>`;
  }).join('');
  document.querySelectorAll('#view div').forEach(d => d.classList.toggle('on', d.dataset.v === view));
}

function renderGrid(animate) {
  renderChips();
  const f = FILTERS.find(f => f.key === filter) || FILTERS[0];
  const list = state.history.filter(f.test);
  const g = $('grid');
  g.classList.toggle('static', !animate);
  g.classList.toggle('list', view === 'list');
  const pad = view === 'list' ? Math.max(0, 5 - list.length) : Math.max(0, 12 - list.length);
  const tips = TIPS.slice(0, pad);
  g.innerHTML = view === 'list'
    ? list.map(row).join('') + tips.map((t, i) => tipRow(t, list.length + i)).join('')
    : list.map(card).join('') + tips.map((t, i) => ghostCard(t, list.length + i)).join('');
  if (animate) g.scrollTop = 0;
}

function renderSettings() {
  document.querySelectorAll('[data-set]').forEach(seg => {
    seg.querySelectorAll('[data-val]').forEach(d => d.classList.toggle('on', String(settings[seg.dataset.set]) === d.dataset.val));
  });
  document.querySelectorAll('[data-toggle]').forEach(t => t.classList.toggle('on', !!settings[t.dataset.toggle]));
  $('swatches').innerHTML = ACCENTS.map(c => `<div class="sw-dot${c === settings.accent ? ' on' : ''}" data-c="${c}" style="background:${c}"></div>`).join('');
  document.querySelectorAll('.style-opt').forEach(o => o.classList.toggle('on', o.dataset.style === settings.style));
  formOptions($('forms'));
}
function applySettings(s) {
  if (!Mascot.FORMS[s.mascot]) { s = { ...s, mascot: 'mo' }; rouge.send('settings-set', { mascot: 'mo' }); }
  const prevForm = settings.mascot;
  settings = s;
  const root = document.documentElement;
  root.dataset.theme = s.dark ? 'dark' : 'light';
  root.style.setProperty('--rouge', s.accent);
  const c = (s.custom || {})[s.mascot];
  if (mascot.form !== s.mascot) { mascot.setForm(s.mascot, c, open); cust.classList.remove('on'); }
  else if (!cust.classList.contains('on')) mascot.setForm(s.mascot, c, false);
  $('brandName').textContent = 'Rouge';
  renderSettings();
  renderPouch(false);
}
document.querySelectorAll('[data-set]').forEach(seg => seg.addEventListener('click', e => {
  const d = e.target.closest('[data-val]');
  if (!d) return;
  const v = seg.dataset.set === 'ttl' ? +d.dataset.val : d.dataset.val;
  rouge.send('settings-set', { [seg.dataset.set]: v });
}));
document.querySelectorAll('[data-toggle]').forEach(t => t.addEventListener('click', () => rouge.send('settings-set', { [t.dataset.toggle]: !settings[t.dataset.toggle] })));
$('swatches').addEventListener('click', e => { const d = e.target.closest('[data-c]'); if (d) rouge.send('settings-set', { accent: d.dataset.c }); });
let hueT;
$('hue').addEventListener('input', e => {
  const c = `hsl(${e.target.value} 85% 60%)`;
  document.documentElement.style.setProperty('--rouge', c);
  clearTimeout(hueT); hueT = setTimeout(() => rouge.send('settings-set', { accent: c }), 120);
});
$('styles').addEventListener('click', e => { const o = e.target.closest('[data-style]'); if (o) rouge.send('settings-set', { style: o.dataset.style }); });
$('gear').addEventListener('click', () => {
  const on = !panel.classList.contains('set');
  panel.classList.toggle('set', on); $('gear').classList.toggle('on', on);
});

rouge.on('layout', l => {
  document.body.classList.toggle('float', l.float);
  document.body.classList.toggle('up', l.dir === 'up');
  N.style.setProperty('--pcx', l.pcx + 'px');
});

const grip = $('grip');
grip.addEventListener('pointerdown', e => {
  if (e.button !== 0) return;
  grip.setPointerCapture(e.pointerId);
  document.body.classList.add('dragging');
  rouge.send('drag-start');
});
const endDrag = () => { if (!document.body.classList.contains('dragging')) return; document.body.classList.remove('dragging'); rouge.send('drag-end'); };
grip.addEventListener('pointerup', endDrag);
grip.addEventListener('lostpointercapture', endDrag);

rouge.on('settings', applySettings);
rouge.on('hover', v => {
  open = v;
  N.classList.toggle('open', v);
  if (v) { renderGrid(true); mascot.resume?.(); }
  else {
    panel.classList.remove('set'); $('gear').classList.remove('on'); cust.classList.remove('on');
    setTimeout(() => { if (!open) mascot.pause?.(); }, 700);
  }
});

let bumpT;
rouge.on('state', s => {
  state = s;
  if (s.fresh) {
    freshId = s.fresh;
    N.classList.add('bump'); clearTimeout(bumpT);
    bumpT = setTimeout(() => N.classList.remove('bump'), 520);
  }
  renderMini();
  renderPouch(s.gulp);
  if (open) renderGrid(false); else renderChips();
});

$('grid').addEventListener('click', e => {
  const x = e.target.closest('[data-x]');
  if (x) { rouge.send('remove', x.dataset.x); return; }
  const c = e.target.closest('.card, .row');
  if (!c) return;
  rouge.send('copy', c.dataset.id);
  setTimeout(() => {
    const el = document.querySelector(`[data-id="${c.dataset.id}"]`);
    if (el) { el.classList.add('copied'); setTimeout(() => el.classList.remove('copied'), 700); }
  }, 40);
});
$('chips').addEventListener('click', e => {
  const c = e.target.closest('.chip');
  if (c) { filter = c.dataset.f; renderGrid(true); }
});
$('view').addEventListener('click', e => {
  const d = e.target.closest('[data-v]');
  if (!d || d.dataset.v === view) return;
  view = d.dataset.v;
  try { localStorage.setItem('rouge.view', view); } catch {}
  renderGrid(true);
});
$('carry').onclick = () => { mascot.cheer(); rouge.send('carry'); };
$('empty').onclick = () => {
  mascot.toss();
  setTimeout(() => rouge.send('empty-pouch'), 420);
};
let armed = false;
$('clearAll').onclick = () => {
  if (!armed) { armed = true; $('total').textContent = 'click again to clear'; setTimeout(() => { armed = false; renderMini(); }, 1800); return; }
  armed = false; rouge.send('clear');
};

document.addEventListener('mousemove', e => {
  const r = $('mascot').getBoundingClientRect();
  mascot.look(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height * .65));
});

setInterval(() => { if (open) renderGrid(false); }, 30000);
renderMini(); renderPouch(false); renderChips(); renderSettings();
