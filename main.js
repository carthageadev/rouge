const { app, BrowserWindow, screen, clipboard, ClipboardItem, ipcMain, Tray, Menu, nativeImage, globalShortcut, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { spawn } = require('child_process');

if (!app.requestSingleInstanceLock()) app.quit();

const MAX_HISTORY = 120;
const MAX_TRAIL = 6;
const MAX_POUCH = 12;
const NOTCH_W = 540, NOTCH_H = 540;
const PILL_W = 190, PILL_H = 32, OPEN_W = 520, OPEN_H = 510, PAD = 12;
const MENU_W = 360;
const BROWSERS = /^(chrome|msedge|brave|vivaldi|opera|firefox|arc|thorium|chromium|zen|librewolf|waterfox)$/i;

let STORE, IMG_DIR;
let overlay, notch, menu, tray;
let history = [], trail = [], pouch = [], icons = {};
const trailAt = new Map();
let currentId = null;
let lastSig = null, hover = false, leaveT = null;
let settings = {
  theme: 'dark', accent: '#ff4d5e', style: 'notch', mascot: 'mo',
  trail: true, ttl: 30, login: false, floatPos: null, custom: {},
};
let layout = null, drag = null, interactive = false;
let overlayDisplay = null, quitting = false;

const byId = id => history.find(h => h.id === id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const withIcon = i => i && ({ ...i, icon: icons[i.src?.exe] || null });

function load() {
  try {
    const d = JSON.parse(fs.readFileSync(STORE, 'utf8'));
    history = d.history || [];
    icons = d.icons || {};
    settings = { ...settings, ...(d.settings || {}) };
    pouch = (d.pouch || []).filter(id => byId(id));
  } catch {}
}
let saveT;
function save() {
  clearTimeout(saveT);
  saveT = setTimeout(() => fs.writeFile(STORE, JSON.stringify({ history, pouch, icons, settings }), () => {}), 400);
}

function classify(text) {
  const t = text.trim();
  if (/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(t) || /^(rgb|hsl)a?\([^)]*\)$/i.test(t)) return 'color';
  if (/^https?:\/\/\S+$/i.test(t)) return 'link';
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return 'email';
  if (t.includes('\n') && /[{};]|=>|\bfunction\b|\bconst\b|\bdef\b|\bimport\b|<\/?\w+>/.test(t)) return 'code';
  return 'text';
}

async function readClip() {
  const [entry] = await clipboard.read();
  if (!entry) return null;
  if (entry.types.includes('text/plain')) {
    const text = await (await entry.getType('text/plain')).text();
    if (text.trim()) return { sig: 't:' + text, kind: classify(text), text: text.slice(0, 20000) };
  }
  const type = entry.types.find(t => t.startsWith('image/'));
  if (type) {
    const buf = Buffer.from(await (await entry.getType(type)).arrayBuffer());
    const sig = 'i:' + crypto.createHash('md5').update(buf).digest('hex');
    if (sig === lastSig) return { sig };
    const img = nativeImage.createFromBuffer(buf);
    if (!img.isEmpty()) return { sig, kind: 'image', img };
  }
  return null;
}

async function captureSource() { return null; }

function addItem(clip) {
  let item = history.find(h => h.sig === clip.sig);
  if (item) {
    history = history.filter(h => h !== item);
    item.ts = Date.now();
  } else {
    item = { id: crypto.randomUUID(), sig: clip.sig, kind: clip.kind, ts: Date.now() };
    if (clip.kind === 'image') {
      const { width, height } = clip.img.getSize();
      item.w = width; item.h = height;
      item.thumb = clip.img.resize({ width: Math.min(320, width) }).toDataURL();
      fs.writeFile(path.join(IMG_DIR, item.id + '.png'), clip.img.toPNG(), () => {});
    } else item.text = clip.text;
  }
  history.unshift(item);
  for (const old of history.splice(MAX_HISTORY)) {
    if (old.kind === 'image') fs.unlink(path.join(IMG_DIR, old.id + '.png'), () => {});
    pouch = pouch.filter(id => id !== old.id);
  }
  currentId = item.id;
  if (settings.trail) pushTrail(item.id);
  save();
  broadcast({ fresh: item.id });

  captureSource().then(src => {
    if (!src) return;
    item.src = src;
    save();
    broadcast();
  });
}

let polling = false;
async function pollClipboard() {
  if (polling) return;
  polling = true;
  try {
    const clip = await readClip();
    if (clip && clip.sig !== lastSig) { lastSig = clip.sig; addItem(clip); }
  } catch {} finally { polling = false; }
}

function overlayRect(d) {
  return { x: d.bounds.x, y: d.bounds.y, width: d.bounds.width, height: d.bounds.height };
}

function makeWindow(opts, file, show = true) {
  const w = new BrowserWindow({
    frame: false, transparent: true, resizable: false, movable: false, skipTaskbar: true,
    alwaysOnTop: true, focusable: false, hasShadow: false, show: false, backgroundColor: '#00000000',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), backgroundThrottling: false },
    ...opts,
  });
  w.setAlwaysOnTop(true, 'screen-saver');
  w.loadFile(path.join(__dirname, 'ui', file));
  if (show) w.once('ready-to-show', () => w.showInactive());
  return w;
}

function createWindows() {
  const primary = screen.getPrimaryDisplay();
  overlayDisplay = primary;
  overlay = makeWindow(overlayRect(primary), 'overlay.html');
  overlay.setIgnoreMouseEvents(true);

  notch = makeWindow({ width: NOTCH_W, height: NOTCH_H, x: 0, y: 0 }, 'notch.html');
  notch.setIgnoreMouseEvents(true, { forward: true });
  computeLayout();

  menu = makeWindow({ width: MENU_W, height: 460 }, 'paste.html', false);

  for (const w of [notch, overlay, menu]) w.webContents.on('did-finish-load', () => { sendSettings(); broadcast(); });
  notch.webContents.on('did-finish-load', () => computeLayout());
}

ipcMain.on('copy', (_e, id) => { const it = byId(id); if (it) writeItem(it); });
ipcMain.on('menu-pick', (_e, id) => pasteItem(byId(id)));
ipcMain.on('menu-height', (_e, h) => {
  if (!menu) return;
  const b = menu.getBounds();
  menu.setBounds({ ...b, height: Math.round(clamp(h, 80, 460)) });
});
ipcMain.on('remove', (_e, id) => {
  const it = byId(id);
  if (it?.kind === 'image') fs.unlink(path.join(IMG_DIR, id + '.png'), () => {});
  history = history.filter(h => h.id !== id);
  pouch = pouch.filter(p => p !== id);
  trail = trail.filter(t => t !== id);
  save(); broadcast();
});
ipcMain.on('clear', () => {
  for (const h of history) if (h.kind === 'image') fs.unlink(path.join(IMG_DIR, h.id + '.png'), () => {});
  history = []; pouch = []; trail = []; save(); broadcast();
});

app.whenReady().then(async () => {
  STORE = path.join(app.getPath('userData'), 'rouge-history.json');
  IMG_DIR = path.join(app.getPath('userData'), 'images');
  fs.mkdirSync(IMG_DIR, { recursive: true });
  load();
  createWindows();
});

app.on('window-all-closed', e => e.preventDefault());
