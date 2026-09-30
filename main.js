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
const TASKBAR_GAP = 4;
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

let helper = null, helperBuf = '', reqId = 0;

const clog = (...a) => { try { console.error(...a); } catch {} };
const pending = new Map();
function startHelper() {
  helper = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'native', 'helper.ps1')], { windowsHide: true });
  for (const s of [helper.stdin, helper.stdout, helper.stderr]) s.on('error', () => {});
  helper.stdout.setEncoding('utf8');
  helper.stdout.on('data', d => {
    helperBuf += d;
    let i;
    while ((i = helperBuf.indexOf('\n')) >= 0) {
      const line = helperBuf.slice(0, i).trim();
      helperBuf = helperBuf.slice(i + 1);
      if (line) onHelper(line);
    }
  });
  helper.stderr.on('data', d => clog('[helper]', String(d)));
  helper.on('exit', () => { helper = null; if (!quitting) setTimeout(startHelper, 2000); });
}
const hsend = cmd => helper?.stdin.write(cmd + '\n');
function foreground() {
  return new Promise(res => {
    if (!helper) return res(null);
    const id = ++reqId;
    pending.set(id, res);
    hsend('fg ' + id);
    setTimeout(() => { if (pending.delete(id)) res(null); }, 1500);
  });
}
function onHelper(line) {
  let m;
  try { m = JSON.parse(line); } catch { return; }
  if (m.type === 'fg') { const r = pending.get(m.id); if (r) { pending.delete(m.id); r(m.info); } }
  else if (m.type === 'wheel') onAltWheel(m.delta);
  else if (m.type === 'key') onMenuKey(m.vk);
  else if (m.type === 'click') onGlobalClick(m.x, m.y);
  else if (m.type === 'error') clog('[helper]', m.msg);
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

async function captureSource() {
  const fg = await foreground();
  if (!fg || !fg.exe) return null;
  if (fg.exe.toLowerCase() === process.execPath.toLowerCase()) return null;
  const base = path.basename(fg.exe, path.extname(fg.exe));
  const src = { app: fg.name || base, exe: fg.exe };
  if (BROWSERS.test(base)) {
    src.browser = true;
    let u = (fg.url || '').trim();
    if (u && !/\s/.test(u)) {
      if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(u)) u = 'https://' + u;
      try { const U = new URL(u); src.url = U.href; src.site = U.hostname.replace(/^www\./, ''); } catch {}
    }
    src.title = fg.title.replace(/\s[-\u2014\u2013]\s[^-\u2014\u2013]*$/, '').trim();
  } else {
    src.title = fg.title;
  }
  if (!icons[fg.exe]) {
    try { icons[fg.exe] = (await app.getFileIcon(fg.exe, { size: 'normal' })).toDataURL(); } catch {}
  }
  return src;
}

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

async function writeItem(item, promote = true) {
  polling = true;
  try {
    if (item.kind === 'image') {
      const png = fs.readFileSync(path.join(IMG_DIR, item.id + '.png'));
      await clipboard.write([new ClipboardItem({ 'image/png': new Blob([png], { type: 'image/png' }) })]);
    } else await clipboard.writeText(item.text);
    lastSig = (await readClip())?.sig ?? lastSig;
  } catch { return false; } finally { polling = false; }
  currentId = item.id;
  if (promote) {
    history = [item, ...history.filter(h => h !== item)];
    item.ts = Date.now();
    save();
  }
  broadcast();
  return true;
}

function sendTrail() {
  overlay?.webContents.send('trail', trail.map(byId).filter(Boolean).map(withIcon));
}
function broadcast(extra = {}) {
  notch?.webContents.send('state', {
    history: history.map(withIcon), pouch: pouch.map(byId).filter(Boolean).map(withIcon), current: currentId, ...extra,
  });
  sendTrail();
}

function pushTrail(id) {
  trail = [id, ...trail.filter(x => x !== id)].slice(0, MAX_TRAIL);
  trailAt.set(id, Date.now());
}
function expireTrail() {
  const now = Date.now();
  const kept = trail.filter(id => now - (trailAt.get(id) || 0) < settings.ttl * 1000);
  if (kept.length !== trail.length) { trail = kept; sendTrail(); }
}

function shakeOff() {
  if (!trail.length) return;
  overlay.webContents.send('shake');
  trail = [];
  sendTrail();
}

const shake = { x: { dir: 0, seg: 0, rev: [] }, y: { dir: 0, seg: 0, rev: [] } };
let prevP = null, lastShake = 0;
function detectShake(p) {
  const now = Date.now();
  let hit = false;
  if (prevP) for (const ax of ['x', 'y']) {
    const s = shake[ax], d = p[ax] - prevP[ax], sg = Math.sign(d);
    if (sg && sg !== s.dir) {
      if (s.seg > 45) s.rev.push(now);
      s.dir = sg; s.seg = 0;
    }
    s.seg += Math.abs(d);
    s.rev = s.rev.filter(t => now - t < 750);
    if (s.rev.length >= 4) hit = true;
  }
  prevP = p;
  if (hit && now - lastShake > 900) {
    lastShake = now;
    shake.x.rev = []; shake.y.rev = [];
    return true;
  }
  return false;
}

const scrub = { active: false, sel: 0, wT: null, endT: null };
function onAltWheel(delta) {
  if (!history.length || menuOpen) return;
  if (!scrub.active) { scrub.active = true; scrub.sel = Math.max(0, history.findIndex(h => h.id === currentId)); }
  scrub.sel = clamp(scrub.sel + (delta < 0 ? 1 : -1), 0, history.length - 1);
  const sel = scrub.sel, item = history[sel];
  const from = Math.max(0, sel - 4);
  overlay.webContents.send('scrub', {
    sel, total: history.length,
    items: history.slice(from, sel + 5).map((it, k) => ({ ...withIcon(it), idx: from + k })),
  });
  clearTimeout(scrub.wT);
  scrub.wT = setTimeout(() => writeItem(item, false), 90);
  clearTimeout(scrub.endT);
  scrub.endT = setTimeout(() => {
    scrub.active = false;
    overlay.webContents.send('scrub', null);
    if (settings.trail) { pushTrail(item.id); sendTrail(); }
  }, 1100);
}

let menuOpen = false;
function openMenu() {
  if (menuOpen) return closeMenu();
  if (!history.length) return;
  const p = screen.getCursorScreenPoint();
  const wa = screen.getDisplayNearestPoint(p).workArea;
  const h = 460;
  menu.setBounds({
    x: Math.round(clamp(p.x + 10, wa.x + 8, wa.x + wa.width - MENU_W - 8)),
    y: Math.round(clamp(p.y + 10, wa.y + 8, wa.y + wa.height - h - 8)),
    width: MENU_W, height: h,
  });
  menu.webContents.send('open', { items: history.slice(0, 40).map(withIcon), current: currentId });
  menu.showInactive();
  menuOpen = true;
  hsend('keys 1');
}
function closeMenu() {
  if (!menuOpen) return;
  menuOpen = false;
  hsend('keys 0');
  menu.webContents.send('close');
  setTimeout(() => { if (!menuOpen) menu.hide(); }, 170);
}
async function pasteItem(item) {
  closeMenu();
  if (!item) return;
  if (await writeItem(item)) setTimeout(() => hsend('paste'), 60);
}
function onMenuKey(vk) {
  if (!menuOpen) return;
  if (vk === 0x26) menu.webContents.send('move', -1);
  else if (vk === 0x28) menu.webContents.send('move', 1);
  else if (vk === 0x0D) menu.webContents.send('enter');
  else if (vk === 0x1B) closeMenu();
  else if (vk >= 0x31 && vk <= 0x39) pasteItem(history[vk - 0x31]);
}
function onGlobalClick(x, y) {
  if (!menuOpen) return;
  const d = screen.screenToDipPoint({ x, y }), b = menu.getBounds();
  if (d.x < b.x || d.x > b.x + b.width || d.y < b.y || d.y > b.y + b.height) closeMenu();
}

function overlayRect(d) {
  const wa = d.workArea;
  return { x: wa.x, y: wa.y, width: wa.width, height: Math.max(1, wa.height - TASKBAR_GAP) };
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

  overlay.setBounds(overlayRect(primary));
  overlay.setIgnoreMouseEvents(true);

  notch = makeWindow({ width: NOTCH_W, height: NOTCH_H, x: 0, y: 0 }, 'notch.html');
  notch.setIgnoreMouseEvents(true, { forward: true });
  computeLayout();

  menu = makeWindow({ width: MENU_W, height: 460 }, 'paste.html', false);

  for (const w of [notch, overlay, menu]) w.webContents.on('did-finish-load', () => { sendSettings(); broadcast(); });
  notch.webContents.on('did-finish-load', () => computeLayout());
}

function clampPill(x, y) {
  const wa = screen.getDisplayNearestPoint({ x: Math.round(x), y: Math.round(y) }).workArea;
  return {
    wa,
    x: clamp(x, wa.x + PILL_W / 2 + 6, wa.x + wa.width - PILL_W / 2 - 6),
    y: clamp(y, wa.y + 6, wa.y + wa.height - PILL_H - 6),
  };
}

function computeLayout() {
  if (!notch) return;
  const float = settings.style === 'float';
  const primary = screen.getPrimaryDisplay();
  let wx, wy, dir = 'down', pillTop, pcx;
  if (!float) {
    wx = primary.bounds.x + (primary.bounds.width - NOTCH_W) / 2;
    wy = primary.bounds.y;
    pillTop = 0; pcx = NOTCH_W / 2;
  } else {
    const start = settings.floatPos || { x: primary.workArea.x + primary.workArea.width / 2, y: primary.workArea.y + 18 };
    const c = clampPill(start.x, start.y);
    const wa = c.wa, p = { x: c.x, y: c.y };
    settings.floatPos = p;
    dir = p.y > wa.y + wa.height / 2 ? 'up' : 'down';
    const slack = (NOTCH_W - OPEN_W) / 2;
    wx = clamp(p.x - NOTCH_W / 2, wa.x - slack, wa.x + wa.width - NOTCH_W + slack);
    wy = dir === 'down' ? p.y - PAD : p.y + PILL_H + PAD - NOTCH_H;
    pillTop = dir === 'down' ? PAD : NOTCH_H - PAD - PILL_H;
    pcx = p.x - wx;
  }
  const openTop = dir === 'down' ? pillTop : pillTop + PILL_H - OPEN_H;
  const ox = (NOTCH_W - OPEN_W) / 2;
  layout = {
    float, dir, pcx, pillTop, x: Math.round(wx), y: Math.round(wy),
    body: float ? { x: pcx - PILL_W / 2, y: pillTop, w: PILL_W - 36, h: PILL_H } : { x: (NOTCH_W - 214) / 2, y: 0, w: 214, h: 40 },
    handle: float ? { x: pcx + PILL_W / 2 - 36, y: pillTop, w: 36, h: PILL_H } : null,
    open: { x: ox, y: openTop, w: OPEN_W, h: OPEN_H + (float ? 0 : 12) },
    bag: { x: ox + 72, y: openTop + 100 },
  };
  notch.setBounds({ x: layout.x, y: layout.y, width: NOTCH_W, height: NOTCH_H });
  notch.webContents.send('layout', { float, dir, pcx, pillTop });
}

const isDark = () => settings.theme === 'system' ? nativeTheme.shouldUseDarkColors : settings.theme !== 'light';
function sendSettings() {
  const payload = { ...settings, dark: isDark() };
  for (const w of [notch, overlay, menu]) w?.webContents.send('settings', payload);
}
function applySettings(patch) {
  const prev = settings;
  settings = { ...settings, ...patch };
  if (patch.style !== undefined && patch.style !== prev.style) computeLayout();
  if (patch.trail === false) shakeOff();
  if (patch.login !== undefined) {
    try { app.setLoginItemSettings({ openAtLogin: !!settings.login, path: process.execPath, args: app.isPackaged ? [] : [app.getAppPath()] }); } catch {}
  }
  save();
  sendSettings();
  buildTrayMenu?.();
}

function setHover(v) {
  hover = v;
  notch.webContents.send('hover', v);
  if (v && trail.length) absorb();
}

function absorb() {
  const nb = notch.getBounds(), ob = overlay.getBounds();
  overlay.webContents.send('absorb', { x: nb.x + layout.bag.x - ob.x, y: nb.y + layout.bag.y - ob.y });
  pouch = [...trail, ...pouch.filter(id => !trail.includes(id))].slice(0, MAX_POUCH);
  trail = [];
  sendTrail();
  save();
  setTimeout(() => broadcast({ gulp: true }), 420);
}

let tickN = 0;
function tick() {
  if (!overlay || !notch) return;
  const p = screen.getCursorScreenPoint();

  const d = screen.getDisplayNearestPoint(p);
  let jump = false;
  if (d.id !== overlayDisplay.id) {
    overlayDisplay = d;
    overlay.setBounds(overlayRect(d));
    jump = true;
  }
  const ob = overlayRect(overlayDisplay);
  overlay.webContents.send('cursor', { x: p.x - ob.x, y: p.y - ob.y, jump });

  if (detectShake(p)) shakeOff();
  if (++tickN % 15 === 0) expireTrail();

  if (!layout) return;

  if (drag) {
    const c = clampPill(p.x - drag.dx + layout.pcx, p.y - drag.dy + layout.pillTop);
    notch.setPosition(Math.round(c.x - layout.pcx), Math.round(c.y - layout.pillTop));
    setInteractive(true);
    return;
  }

  const nb = notch.getBounds();
  const inRect = r => r && p.x >= nb.x + r.x && p.x <= nb.x + r.x + r.w && p.y >= nb.y + r.y && p.y <= nb.y + r.y + r.h;
  const inside = inRect(hover ? layout.open : layout.body);
  if (inside) {
    clearTimeout(leaveT); leaveT = null;
    if (!hover) setHover(true);
  } else if (hover && !leaveT) {
    leaveT = setTimeout(() => { leaveT = null; setHover(false); }, 220);
  }
  setInteractive(hover || !!inRect(layout.handle));
}

function setInteractive(v) {
  if (v === interactive) return;
  interactive = v;
  notch.setIgnoreMouseEvents(!v, { forward: true });
}

function trayIcon() {
  const s = 16, buf = Buffer.alloc(s * s * 4);
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const d = Math.hypot(x - 7.5, y - 7.5), a = Math.max(0, Math.min(1, 6.8 - d));
    const i = (y * s + x) * 4;
    buf[i] = 0x5e; buf[i + 1] = 0x4d; buf[i + 2] = 0xff; buf[i + 3] = Math.round(a * 255);
  }
  return nativeImage.createFromBitmap(buf, { width: s, height: s });
}

let buildTrayMenu = null;
function buildTray() {
  tray = new Tray(trayIcon());
  tray.setToolTip('Rouge - clipboard');
  const menuTpl = () => Menu.buildFromTemplate([
    { label: 'Trail follows cursor', type: 'checkbox', checked: settings.trail, click: m => applySettings({ trail: m.checked }) },
    { label: 'Floating pill', type: 'checkbox', checked: settings.style === 'float', click: m => applySettings({ style: m.checked ? 'float' : 'notch' }) },
    { label: 'Shake off trail   Ctrl+Shift+X', click: shakeOff },
    { label: 'Paste menu   Alt+V', click: openMenu },
    { type: 'separator' },
    { label: 'Clear history', click: () => { history = []; pouch = []; trail = []; save(); broadcast(); } },
    { label: 'Quit Rouge', click: () => app.exit(0) },
  ]);
  tray.setContextMenu(menuTpl());
  buildTrayMenu = () => tray.setContextMenu(menuTpl());
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
ipcMain.on('settings-set', (_e, patch) => applySettings(patch));
ipcMain.on('drag-start', () => {
  if (!layout?.float) return;
  const p = screen.getCursorScreenPoint(), nb = notch.getBounds();
  drag = { dx: p.x - nb.x, dy: p.y - nb.y };
});
ipcMain.on('drag-end', () => {
  if (!drag) return;
  drag = null;
  const nb = notch.getBounds();
  settings.floatPos = { x: nb.x + layout.pcx, y: nb.y + layout.pillTop };
  computeLayout();
  save();
});
ipcMain.on('empty-pouch', () => { pouch = []; save(); broadcast(); });
ipcMain.on('carry', () => {
  for (const id of [...pouch].reverse()) pushTrail(id);
  pouch = [];
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
  const now = await readClip().catch(() => null);
  lastSig = now?.sig ?? null;
  currentId = history.find(h => h.sig === lastSig)?.id ?? null;
  startHelper();
  createWindows();
  buildTray();
  globalShortcut.register('CommandOrControl+Shift+X', shakeOff);
  globalShortcut.register('Alt+V', openMenu);
  setInterval(pollClipboard, 350);
  setInterval(tick, 16);
  screen.on('display-metrics-changed', () => { computeLayout(); overlayDisplay = { id: -1 }; });
  nativeTheme.on('updated', sendSettings);
});

app.on('window-all-closed', e => e.preventDefault());
app.on('will-quit', () => { quitting = true; globalShortcut.unregisterAll(); helper?.kill(); });
