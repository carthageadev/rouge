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

function renderMini() {
  const h = state.history;
  $('miniStack').innerHTML = h.length ? h.slice(0, 4).map(i => miniTile(i)).join('') : '<span class="empty">copy something</span>';
  $('miniCount').textContent = state.pouch.length ? state.pouch.length + ' in pouch' : h.length || '';
  $('total').textContent = h.length + (h.length === 1 ? ' clip' : ' clips');
}

rouge.on('state', s => { state = s; renderMini(); });
rouge.on('open', v => { open = v; document.body.classList.toggle('open', v); renderMini(); });
