const { app, BrowserWindow, ipcMain, Menu, Tray, screen, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

const FAST = process.argv.includes('--fast');
const SIZES = [
  { w: 180, h: 240, label: '아주 작게' },
  { w: 240, h: 320, label: '작게' },
  { w: 300, h: 400, label: '보통' },
  { w: 390, h: 520, label: '크게' },
];

let win = null;
let tray = null;
let settings = { sound: true, bgm: false, size: 1, top: true, autoLaunch: false, x: null, y: null };
let settingsFile = null;

if (!app.requestSingleInstanceLock()) {
  app.quit();
}
app.on('second-instance', () => {
  if (win) { win.show(); }
});

function loadSettings() {
  try {
    settingsFile = path.join(app.getPath('userData'), 'settings.json');
    const saved = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
    settings = Object.assign(settings, saved);
  } catch (_) { /* first run */ }
}
function saveSettings() {
  try { fs.writeFileSync(settingsFile, JSON.stringify(settings)); } catch (_) { /* ignore */ }
}

function defaultPosition(size) {
  const wa = screen.getPrimaryDisplay().workArea;
  return { x: wa.x + wa.width - size.w - 24, y: wa.y + wa.height - size.h - 8 };
}
function clampToDisplays(x, y, size) {
  const d = screen.getDisplayNearestPoint({ x: x + size.w / 2, y: y + size.h / 2 });
  const wa = d.workArea;
  const cx = Math.min(Math.max(x, wa.x - size.w / 3), wa.x + wa.width - size.w * 2 / 3);
  const cy = Math.min(Math.max(y, wa.y - size.h / 4), wa.y + wa.height - size.h * 3 / 4);
  return { x: Math.round(cx), y: Math.round(cy) };
}

function pushSettings() {
  if (win && !win.isDestroyed()) win.webContents.send('settings', publicSettings());
}
function publicSettings() {
  return { sound: settings.sound, bgm: settings.bgm, size: settings.size, fast: FAST };
}

function applyAutoLaunch() {
  try {
    app.setLoginItemSettings({
      openAtLogin: !!settings.autoLaunch,
      path: process.env.PORTABLE_EXECUTABLE_FILE || process.execPath,
    });
  } catch (_) { /* ignore */ }
}

function setSize(i) {
  settings.size = i;
  const s = SIZES[i];
  if (win) {
    const b = win.getBounds();
    // keep the bottom-center anchored so the tree stays put
    const nx = Math.round(b.x + b.width / 2 - s.w / 2);
    const ny = Math.round(b.y + b.height - s.h);
    win.setBounds({ x: nx, y: ny, width: s.w, height: s.h });
  }
  saveSettings();
  pushSettings();
}

function buildMenu() {
  return Menu.buildFromTemplate([
    { label: '🌟 소원 달기', click: () => win && win.webContents.send('cmd', 'wish') },
    { type: 'separator' },
    {
      label: '효과음', type: 'checkbox', checked: settings.sound,
      click: (mi) => { settings.sound = mi.checked; saveSettings(); pushSettings(); },
    },
    {
      label: '오르골 음악', type: 'checkbox', checked: settings.bgm,
      click: (mi) => { settings.bgm = mi.checked; saveSettings(); pushSettings(); },
    },
    {
      label: '크기',
      submenu: SIZES.map((s, i) => ({
        label: s.label, type: 'radio', checked: settings.size === i, click: () => setSize(i),
      })),
    },
    {
      label: '항상 위에 표시', type: 'checkbox', checked: settings.top,
      click: (mi) => {
        settings.top = mi.checked;
        if (win) win.setAlwaysOnTop(settings.top, 'floating');
        saveSettings();
      },
    },
    {
      label: '윈도우 시작 시 실행', type: 'checkbox', checked: settings.autoLaunch,
      click: (mi) => { settings.autoLaunch = mi.checked; applyAutoLaunch(); saveSettings(); },
    },
    { type: 'separator' },
    {
      label: '위치 초기화',
      click: () => {
        const s = SIZES[settings.size];
        const p = defaultPosition(s);
        if (win) win.setBounds({ x: p.x, y: p.y, width: s.w, height: s.h });
        settings.x = p.x; settings.y = p.y; saveSettings();
      },
    },
    { label: '트리 비우기 (장식·선물 초기화)', click: () => win && win.webContents.send('cmd', 'reset') },
    { type: 'separator' },
    { label: '종료', click: () => app.quit() },
  ]);
}

function createWindow() {
  const size = SIZES[settings.size] || SIZES[1];
  let pos = (settings.x != null && settings.y != null)
    ? clampToDisplays(settings.x, settings.y, size)
    : defaultPosition(size);

  win = new BrowserWindow({
    x: pos.x, y: pos.y, width: size.w, height: size.h,
    frame: false, transparent: true, resizable: false, maximizable: false, minimizable: false,
    hasShadow: false, skipTaskbar: true, alwaysOnTop: !!settings.top, focusable: false,
    backgroundColor: '#00000000', show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, backgroundThrottling: false,
    },
  });
  if (settings.top) win.setAlwaysOnTop(true, 'floating');
  win.setMenu(null);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.once('ready-to-show', () => win.showInactive());

  let moveTimer = null;
  win.on('moved', () => {
    clearTimeout(moveTimer);
    moveTimer = setTimeout(() => {
      const b = win.getBounds();
      settings.x = b.x; settings.y = b.y; saveSettings();
    }, 400);
  });
  win.on('closed', () => { win = null; });
}

// ---- IPC ----
let drag = null;
ipcMain.on('ignore-mouse', (_e, ignore) => {
  if (win) win.setIgnoreMouseEvents(!!ignore, { forward: true });
});
ipcMain.on('focusable', (_e, on) => {
  if (!win) return;
  win.setFocusable(!!on);
  if (on) win.focus();
});
ipcMain.on('drag-start', () => {
  if (!win) return;
  drag = { cursor: screen.getCursorScreenPoint(), bounds: win.getBounds() };
});
ipcMain.on('drag-move', () => {
  if (!win || !drag) return;
  const c = screen.getCursorScreenPoint();
  win.setBounds({
    x: drag.bounds.x + (c.x - drag.cursor.x),
    y: drag.bounds.y + (c.y - drag.cursor.y),
    width: drag.bounds.width, height: drag.bounds.height,
  });
});
ipcMain.on('drag-end', () => { drag = null; });
ipcMain.on('menu', () => { if (win) buildMenu().popup({ window: win }); });
ipcMain.handle('get-settings', () => publicSettings());

app.whenReady().then(() => {
  loadSettings();
  createWindow();
  applyAutoLaunch();

  try {
    const img = nativeImage.createFromPath(path.join(__dirname, 'assets', 'icon.png')).resize({ width: 16, height: 16 });
    tray = new Tray(img);
    tray.setToolTip('크리스마스 트리');
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: '트리 보이기/숨기기', click: () => { if (win) { win.isVisible() ? win.hide() : win.showInactive(); } } },
      { label: '소원 달기', click: () => { if (win) { win.showInactive(); win.webContents.send('cmd', 'wish'); } } },
      { type: 'separator' },
      { label: '종료', click: () => app.quit() },
    ]));
    tray.on('click', () => { if (win) { win.isVisible() ? win.hide() : win.showInactive(); } });
  } catch (_) { /* tray optional */ }
});

app.on('window-all-closed', () => app.quit());
