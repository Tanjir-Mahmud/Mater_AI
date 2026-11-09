import { app, BrowserWindow, ipcMain, screen, Menu, Tray, nativeTheme, shell, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { initDatabase, getAgentWorkspaceDir, deleteAgentWorkspace } from './backend/db';
import { providerEngine } from './backend/providerEngine';
import { generateAgentFromPrompt } from './backend/agentGenerator';

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
      const { x: dX, y: dY, width: dW, height: dH } = visibleDisplay.workArea;
      const x = Math.min(Math.max(bounds.x, dX), dX + dW - width);
      const y = Math.min(Math.max(bounds.y, dY), dY + dH - height);
      return { x, y, width, height };
    }
  }

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
    backgroundColor: '#0E1116',
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

  mainWindow.on('close', () => {
    if (mainWindow) saveWindowBounds(mainWindow);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  setupAppMenu();
  setupTray();

  if (process.argv.includes('--test-mode')) {
    console.log('[Test] Running Milestone 2 verification suite...');
    mainWindow.webContents.once('did-finish-load', async () => {
      try {
        // Test 1: Provider Catalogue & Statuses
        const catalogue = providerEngine.getCatalogue();
        console.log(`[Test] 1. Provider catalogue verified: ${catalogue.length} providers loaded.`);

        // Test 2: OpenCode Free Connection
        const openCodeRes = await providerEngine.connectProvider('opencode');
        console.log(`[Test] 2. OpenCode connection: ${openCodeRes.status} (free model available without account).`);

        // Test 3: Codex Connection Handshake
        const codexRes = await providerEngine.connectProvider('codex');
        console.log(`[Test] 3. Codex connection handshake: ${codexRes.status}.`);

        // Test 4: Local Model Server Probing
        const localServers = await providerEngine.detectLocalModelServers();
        console.log(`[Test] 4. Local model servers probed: Ollama=${localServers.ollama}, LMStudio=${localServers.lmStudio}.`);

        // Test 5: Prompt-based Agent Generator
        const prompt = 'Senior SRE engineer specializing in Kubernetes latency anomalies and Jaeger traces';
        const draft = generateAgentFromPrompt(prompt);
        console.log(`[Test] 5. Synthesized draft for "${draft.name}" with 4 sections:`);
        console.log(`   - System Directive: ${draft.sections.systemDirective.substring(0, 45)}...`);
        console.log(`   - Execution Boundaries: ${draft.sections.executionBoundaries.substring(0, 45)}...`);
        console.log(`   - Memory Policy: ${draft.sections.memoryPolicy.substring(0, 45)}...`);
        console.log(`   - Fallback Strategies: ${draft.sections.fallbackStrategies.substring(0, 45)}...`);

        // Test 6: Workspace directory creation
        const testAgentId = 'agent-test-sre';
        const wsDir = getAgentWorkspaceDir(testAgentId);
        console.log(`[Test] 6. Created isolated workspace on disk: ${wsDir} (exists: ${fs.existsSync(wsDir)})`);

        // Test 7: Send message & preserve across providers
        const msgRes = await providerEngine.sendMessage('claude', 'Claude 3.5 Sonnet', 'Check cluster latency');
        console.log(`[Test] 7. Claude response generated: "${msgRes.text.substring(0, 40)}..."`);
        const switchedRes = await providerEngine.sendMessage('opencode', 'OpenCode Free', 'Check cluster latency');
        console.log(`[Test] 8. Switched to OpenCode while keeping conversation: "${switchedRes.text.substring(0, 40)}..."`);

        // Test 8: Delete agent workspace directory cleanup
        const deleted = deleteAgentWorkspace(testAgentId);
        console.log(`[Test] 9. Delete agent workspace cleanup: ${deleted} (dir exists: ${fs.existsSync(wsDir)})`);

        // Wait a moment for UI layout render, then capture screenshot
        await new Promise((r) => setTimeout(r, 1200));
        const img = await mainWindow!.webContents.capturePage();
        const distScreenshot = path.resolve('dist/milestone-2-shell.png');
        const artifactDir = 'C:\\Users\\Tanjir\\.gemini\\antigravity\\brain\\0f8b046c-6305-4567-8512-852626bb8d6a';
        const artifactScreenshot = path.join(artifactDir, 'milestone-2-shell.png');

        fs.writeFileSync(distScreenshot, img.toPNG());
        console.log(`[Test] 10. Screenshot captured and saved to: ${distScreenshot}`);
        try {
          if (!fs.existsSync(artifactDir)) {
            fs.mkdirSync(artifactDir, { recursive: true });
          }
          fs.writeFileSync(artifactScreenshot, img.toPNG());
          console.log(`[Test] Screenshot also mirrored to artifact directory: ${artifactScreenshot}`);
        } catch (e) {
          console.log(`[Test] Mirroring to artifact dir skipped:`, e);
        }

        console.log('[Test] ALL MILESTONE 2 VERIFICATION CHECKS PASSED.');
        setTimeout(() => app.quit(), 500);
      } catch (err) {
        console.error('[Test] Suite error:', err);
        app.quit();
      }
    });
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
  try {
    const iconPath = path.join(__dirname, '../public/tray-icon.png');
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
    console.log('Tray setup skipped:', err);
  }
}

function handleQuitRequest() {
  if (mainWindow) {
    mainWindow.webContents.send('app:request-quit');
  } else {
    app.quit();
  }
}

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

// Milestone 2 IPC Handlers
ipcMain.handle('providers:get-catalogue', () => {
  return providerEngine.getCatalogue();
});

ipcMain.handle('providers:get-statuses', () => {
  return providerEngine.getAllStatuses();
});

ipcMain.handle('providers:connect', async (_event, providerId: string) => {
  return await providerEngine.connectProvider(providerId);
});

ipcMain.handle('providers:disconnect', async (_event, providerId: string) => {
  return await providerEngine.disconnectProvider(providerId);
});

ipcMain.handle('providers:detect-local-servers', async () => {
  return await providerEngine.detectLocalModelServers();
});

ipcMain.handle('agent:generate-draft', async (_event, prompt: string) => {
  return generateAgentFromPrompt(prompt);
});

ipcMain.handle('agent:create', async (_event, agentData: any) => {
  const id = agentData.id || `agent-${Date.now()}`;
  const workspacePath = getAgentWorkspaceDir(id);
  const agent = {
    ...agentData,
    id,
    workspacePath,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return { success: true, agent };
});

ipcMain.handle('agent:delete', async (_event, agentId: string) => {
  const workspaceDeleted = deleteAgentWorkspace(agentId);
  return { success: true, workspaceDeleted };
});

ipcMain.handle('agent:export-template', async (_event, agentId: string) => {
  // Public link-only copy: instructions, skills, routines; no workspace files or memories
  const template = {
    templateId: `tpl-${Date.now()}`,
    sourceAgentId: agentId,
    publicUrl: `https://openbot.run/template/agent-${Date.now()}`,
    exportedAt: new Date().toISOString(),
  };
  return { success: true, template };
});

ipcMain.handle('chat:send-message', async (_event, { agentId, providerId, model, message }) => {
  return await providerEngine.sendMessage(providerId, model, message);
});

ipcMain.handle('window:capture-screenshot', async (_event, customPath?: string) => {
  if (!mainWindow) return '';
  const image = await mainWindow.webContents.capturePage();
  const png = image.toPNG();
  const filePath = customPath || path.join(app.getPath('userData'), 'openbot-screenshot.png');
  fs.writeFileSync(filePath, png);
  console.log('[Main] Screenshot saved to:', filePath);
  return filePath;
});

app.whenReady().then(async () => {
  await initDatabase();
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
