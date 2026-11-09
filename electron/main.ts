import { app, BrowserWindow, ipcMain, screen, Menu, Tray, nativeTheme, shell, dialog } from 'electron';
import path from 'path';
import fs from 'fs';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let reloadCount = 0;
let lastReloadTime = 0;

const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 820;
const MIN_WIDTH = 960;
const MIN_HEIGHT = 640;

interface WindowBounds {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized?: boolean;
}

const getSettingsPath = () => path.join(app.getPath('userData'), 'settings.json');
const getBoundsPath = () => path.join(app.getPath('userData'), 'window-bounds.json');
const getThemesDir = () => path.join(app.getPath('userData'), 'themes');

function loadSavedBounds(): WindowBounds {
  try {
    const file = getBoundsPath();
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
      return data;
    }
  } catch (err) {
    console.error('Failed to load window bounds:', err);
  }
  return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
}

function saveWindowBounds(win: BrowserWindow) {
  try {
    if (win.isDestroyed()) return;
    const isMaximized = win.isMaximized();
    const bounds = win.getBounds();
    const data: WindowBounds = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized,
    };
    fs.writeFileSync(getBoundsPath(), JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save window bounds:', err);
  }
}

function clampBoundsToDisplays(bounds: WindowBounds): { x: number; y: number; width: number; height: number } {
  const displays = screen.getAllDisplays();
  const width = Math.max(MIN_WIDTH, bounds.width || DEFAULT_WIDTH);
  const height = Math.max(MIN_HEIGHT, bounds.height || DEFAULT_HEIGHT);

  if (bounds.x !== undefined && bounds.y !== undefined) {
    // Check if the saved position is visible on any display
    const visibleDisplay = displays.find((d) => {
      const { x, y, width: dW, height: dH } = d.bounds;
      return (
        bounds.x! >= x &&
        bounds.x! < x + dW &&
        bounds.y! >= y &&
        bounds.y! < y + dH
      );
    });

    if (visibleDisplay) {
      // Clamp within the visible display
      const { x: dX, y: dY, width: dW, height: dH } = visibleDisplay.workArea;
      const x = Math.min(Math.max(bounds.x, dX), dX + dW - width);
      const y = Math.min(Math.max(bounds.y, dY), dY + dH - height);
      return { x, y, width, height };
    }
  }

  // Default to nearest or primary display centered
  const primary = screen.getPrimaryDisplay();
  const { x: pX, y: pY, width: pW, height: pH } = primary.workArea;
  const x = Math.round(pX + (pW - width) / 2);
  const y = Math.round(pY + (pH - height) / 2);
  return { x, y, width, height };
}

function createWindow() {
  const savedBounds = loadSavedBounds();
  const clamped = clampBoundsToDisplays(savedBounds);

  mainWindow = new BrowserWindow({
    x: clamped.x,
    y: clamped.y,
    width: clamped.width,
    height: clamped.height,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    title: 'OpenBot',
    backgroundColor: '#0b0e13',
    frame: process.platform !== 'darwin',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 12, y: 12 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
    },
  });

  if (savedBounds.isMaximized) {
    mainWindow.maximize();
  }

  // Setup renderer load URL
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Crash supervision: reload up to 3 times in 60s
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('Renderer process gone:', details);
    if (details.reason === 'clean-exit' || details.reason === 'launch-failed') {
      return;
    }
    const now = Date.now();
    if (now - lastReloadTime > 60000) {
      reloadCount = 0;
    }
    lastReloadTime = now;
    reloadCount++;
    if (reloadCount <= 3 && mainWindow) {
      console.log(`Reloading crashed renderer (attempt ${reloadCount}/3)...`);
      mainWindow.reload();
    }
  });

  mainWindow.on('resize', () => {
    if (mainWindow) saveWindowBounds(mainWindow);
  });

  mainWindow.on('move', () => {
    if (mainWindow) saveWindowBounds(mainWindow);
  });

  mainWindow.on('close', (e) => {
    if (mainWindow) {
      saveWindowBounds(mainWindow);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  setupAppMenu();
  setupTray();

  if (process.argv.includes('--test-mode')) {
    console.log('[Main] Started in test mode.');
    console.log(`[Main] Window bounds: ${clamped.width}x${clamped.height} at (${clamped.x}, ${clamped.y})`);
    console.log('[Main] IPC handlers & app menu initialized.');
    setTimeout(() => {
      console.log('[Main] Test mode completed cleanly, exiting.');
      app.quit();
    }, 2000);
  }
}

function setupAppMenu() {
  const isMac = process.platform === 'darwin';
  const template: any[] = [
    ...(isMac
      ? [
          {
            label: 'OpenBot',
            submenu: [
              { label: 'About OpenBot', role: 'about' },
              { type: 'separator' },
              {
                label: 'Check for Updates…',
                click: () => mainWindow?.webContents.send('menu:check-updates'),
              },
              {
                label: 'Settings…',
                accelerator: 'CmdOrCtrl+,',
                click: () => mainWindow?.webContents.send('menu:open-settings'),
              },
              { type: 'separator' },
              {
                label: 'Stop all agents',
                accelerator: 'CmdOrCtrl+Alt+S',
                click: () => mainWindow?.webContents.send('menu:stop-all-agents'),
              },
              { type: 'separator' },
              {
                label: 'Quit OpenBot',
                accelerator: 'CmdOrCtrl+Q',
                click: () => handleQuitRequest(),
              },
            ],
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Agent',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('menu:new-agent'),
        },
        {
          label: 'New Thread',
          accelerator: 'CmdOrCtrl+T',
          click: () => mainWindow?.webContents.send('menu:new-thread'),
        },
        {
          label: 'Stop all agents',
          click: () => mainWindow?.webContents.send('menu:stop-all-agents'),
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac ? [{ role: 'pasteAndMatchStyle' }] : []),
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        {
          label: 'Actual Size',
          accelerator: 'CmdOrCtrl+0',
          click: () => {
            if (mainWindow) mainWindow.webContents.setZoomLevel(0);
          },
        },
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+=',
          click: () => {
            if (mainWindow) {
              const current = mainWindow.webContents.getZoomLevel();
              mainWindow.webContents.setZoomLevel(current + 0.5);
            }
          },
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => {
            if (mainWindow) {
              const current = mainWindow.webContents.getZoomLevel();
              mainWindow.webContents.setZoomLevel(current - 0.5);
            }
          },
        },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'OpenBot Website',
          click: async () => {
            await shell.openExternal('https://openbot.run');
          },
        },
        {
          label: 'Copy Link',
          click: () => mainWindow?.webContents.send('menu:copy-link'),
        },
        {
          label: 'What\'s new',
          click: () => mainWindow?.webContents.send('menu:whats-new'),
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function setupTray() {
  // Simple tray support
  try {
    const iconPath = path.join(__dirname, '../public/tray-icon.png');
    // On systems without icon file or fallback
    if (fs.existsSync(iconPath)) {
      tray = new Tray(iconPath);
      const contextMenu = Menu.buildFromTemplate([
        {
          label: 'Open OpenBot',
          click: () => {
            if (mainWindow) {
              mainWindow.show();
              mainWindow.focus();
            } else {
              createWindow();
            }
          },
        },
        {
          label: 'Stop all remote control',
          click: () => mainWindow?.webContents.send('tray:stop-remote-control'),
        },
        { type: 'separator' },
        {
          label: 'Quit OpenBot',
          click: () => handleQuitRequest(),
        },
      ]);
      tray.setToolTip('OpenBot - AI Teammate App');
      tray.setContextMenu(contextMenu);
      tray.on('click', () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      });
    }
  } catch (err) {
    console.log('Tray setup skipped or icon missing:', err);
  }
}

function handleQuitRequest() {
  if (mainWindow) {
    mainWindow.webContents.send('app:request-quit');
  } else {
    app.quit();
  }
}

// Watch themes directory for custom palettes
function setupThemeWatcher() {
  const themesDir = getThemesDir();
  if (!fs.existsSync(themesDir)) {
    try {
      fs.mkdirSync(themesDir, { recursive: true });
    } catch (e) {}
  }

  try {
    fs.watch(themesDir, (eventType, filename) => {
      if (filename && filename.endsWith('.json')) {
        mainWindow?.webContents.send('theme:palette-changed', filename);
      }
    });
  } catch (e) {
    console.error('Theme watcher error:', e);
  }
}

// IPC Handlers
ipcMain.handle('app:get-settings', async () => {
  try {
    const p = getSettingsPath();
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf-8'));
    }
  } catch (err) {
    console.error('Error reading settings:', err);
  }
  return null;
});

ipcMain.handle('app:save-settings', async (_event, settings) => {
  try {
    const p = getSettingsPath();
    fs.writeFileSync(p, JSON.stringify(settings, null, 2), 'utf-8');
    return { success: true };
  } catch (err: any) {
    console.error('Error saving settings:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('app:confirm-quit', () => {
  app.exit(0);
});

ipcMain.handle('theme:get-custom-palettes', async () => {
  const themesDir = getThemesDir();
  const palettes: any[] = [];
  if (fs.existsSync(themesDir)) {
    const files = fs.readdirSync(themesDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const content = JSON.parse(fs.readFileSync(path.join(themesDir, file), 'utf-8'));
          palettes.push({ id: file.replace('.json', ''), ...content });
        } catch (e) {}
      }
    }
  }
  return palettes;
});

ipcMain.handle('window:zoom-in', () => {
  if (mainWindow) {
    const current = mainWindow.webContents.getZoomLevel();
    mainWindow.webContents.setZoomLevel(current + 0.5);
    return mainWindow.webContents.getZoomLevel();
  }
  return 0;
});

ipcMain.handle('window:zoom-out', () => {
  if (mainWindow) {
    const current = mainWindow.webContents.getZoomLevel();
    mainWindow.webContents.setZoomLevel(current - 0.5);
    return mainWindow.webContents.getZoomLevel();
  }
  return 0;
});

ipcMain.handle('window:zoom-reset', () => {
  if (mainWindow) {
    mainWindow.webContents.setZoomLevel(0);
    return 0;
  }
  return 0;
});

app.whenReady().then(() => {
  createWindow();
  setupThemeWatcher();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
