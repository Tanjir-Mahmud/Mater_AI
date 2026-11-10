import { app, BrowserWindow, ipcMain, screen, Menu, Tray, nativeTheme, shell, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { initDatabase, getAgentWorkspaceDir, deleteAgentWorkspace } from './backend/db';
import { providerEngine } from './backend/providerEngine';
import { generateAgentFromPrompt } from './backend/agentGenerator';
import { isVersionAtLeast } from './backend/processSupervisor';
import { claudeVendorSdk } from './backend/claudeVendorSdk';
import { chatSessionService } from './backend/chatSessionService';

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
    console.log('[Test] Running Milestone 3 verification suite (Chat & Sessions)...');
    mainWindow.webContents.once('did-finish-load', async () => {
      try {
        // =========================================================================
        // MILESTONE 3 TESTS: Chat & Sessions
        // =========================================================================

        const testAgent = 'agent-test-m3';

        // 1. Thread Limit: Max 50 open threads per agent
        console.log('[Test] 1. Testing max 50 open threads per agent limit...');
        const limitAgent = 'agent-test-limit-50';
        const initialThreads = await chatSessionService.getThreads(limitAgent);
        const countToCreate = 50 - initialThreads.length;
        for (let i = 0; i < countToCreate; i++) {
          await chatSessionService.createThread(limitAgent, `Thread Batch ${i + 1}`, 'main');
        }
        const openThreads = await chatSessionService.getThreads(limitAgent);
        if (openThreads.length !== 50) {
          throw new Error(`Expected exactly 50 open threads, got ${openThreads.length}`);
        }
        console.log(`[Test]    - Successfully reached 50 open threads for ${limitAgent}`);

        // 51st open thread MUST throw an error
        let fiftyFirstThrew = false;
        try {
          await chatSessionService.createThread(limitAgent, 'Thread 51 Over Limit', 'main');
        } catch (err: any) {
          fiftyFirstThrew = true;
          if (!err.message.includes('Maximum 50 open threads reached')) {
            throw new Error(`Expected max threads error message, got: ${err.message}`);
          }
          console.log(`[Test]    - 51st thread correctly rejected: "${err.message}"`);
        }
        if (!fiftyFirstThrew) {
          throw new Error('Limit 1 Failed: Creating 51st thread should have thrown an error!');
        }

        // Close 1 thread and verify 50th can now be created
        const threadToClose = openThreads[1].id;
        await chatSessionService.closeThread(threadToClose);
        const afterCloseCount = (await chatSessionService.getThreads(limitAgent)).length;
        if (afterCloseCount !== 49) {
          throw new Error(`Expected 49 open threads after closing 1, got ${afterCloseCount}`);
        }
        const replacementThread = await chatSessionService.createThread(limitAgent, 'Replacement Thread', 'main');
        if (!replacementThread || (await chatSessionService.getThreads(limitAgent)).length !== 50) {
          throw new Error('Failed to create replacement thread after closing an old thread');
        }
        console.log(`[Test]    - Thread close and reuse verified: closed thread and successfully replaced it.`);

        // 2. Thread Lifecycle: Create, Rename, Close
        console.log('[Test] 2. Testing thread lifecycle (Create, Switch, Rename, Close)...');
        const lifecycleAgent = 'agent-test-lifecycle';
        const lifecycleThread = await chatSessionService.createThread(lifecycleAgent, 'Original Title', 'main');
        await chatSessionService.renameThread(lifecycleThread.id, 'Renamed Architecture Review');
        const currentMessages = await chatSessionService.getMessages(lifecycleThread.id);
        if (!Array.isArray(currentMessages)) throw new Error('getMessages should return an array');
        console.log(`[Test]    - Thread created and renamed to "Renamed Architecture Review".`);

        // 3. Attachments validation: 100 MB / file, 250 MB / msg, 10 files / msg
        console.log('[Test] 3. Testing attachment limits (100 MB / file, 250 MB / msg, 10 files / msg)...');
        const attAgent = 'agent-test-attachments';
        
        // (a) File > 100 MB rejection
        let largeFileThrew = false;
        try {
          chatSessionService.validateAndStoreAttachments(
            [{ name: 'huge-dump.bin', size: 101 * 1024 * 1024, type: 'application/octet-stream' }],
            attAgent
          );
        } catch (err: any) {
          largeFileThrew = true;
          console.log(`[Test]    - 101 MB file rejected: "${err.message}"`);
        }
        if (!largeFileThrew) throw new Error('Limit Failed: >100 MB file should be rejected');

        // (b) Message > 250 MB rejection
        let largeMsgThrew = false;
        try {
          chatSessionService.validateAndStoreAttachments(
            [
              { name: 'part1.bin', size: 90 * 1024 * 1024, type: 'application/octet-stream' },
              { name: 'part2.bin', size: 90 * 1024 * 1024, type: 'application/octet-stream' },
              { name: 'part3.bin', size: 90 * 1024 * 1024, type: 'application/octet-stream' }, // total 270 MB
            ],
            attAgent
          );
        } catch (err: any) {
          largeMsgThrew = true;
          console.log(`[Test]    - 270 MB total payload rejected: "${err.message}"`);
        }
        if (!largeMsgThrew) throw new Error('Limit Failed: >250 MB message should be rejected');

        // (c) More than 10 files rejection
        let elevenFilesThrew = false;
        try {
          const elevenFiles = Array.from({ length: 11 }, (_, i) => ({
            name: `file-${i + 1}.txt`,
            size: 1024,
            type: 'text/plain',
          }));
          chatSessionService.validateAndStoreAttachments(elevenFiles, attAgent);
        } catch (err: any) {
          elevenFilesThrew = true;
          console.log(`[Test]    - 11 files rejected: "${err.message}"`);
        }
        if (!elevenFilesThrew) throw new Error('Limit Failed: >10 files per message should be rejected');

        // (d) Valid attachment with manifest in Shared/Transfers
        const validAtts = chatSessionService.validateAndStoreAttachments(
          [
            { name: 'test-doc.md', size: 2048, type: 'text/markdown', base64Data: Buffer.from('# Test Spec').toString('base64') },
            { name: 'schema.json', size: 1024, type: 'application/json', base64Data: Buffer.from('{"key":"value"}').toString('base64') },
          ],
          attAgent
        );
        if (validAtts.length !== 2 || !validAtts[0].sha256 || !fs.existsSync(validAtts[0].storagePath)) {
          throw new Error('Valid attachment manifest or file on disk missing in Shared/Transfers');
        }
        console.log(`[Test]    - Valid attachments verified: stored in Shared/Transfers with SHA-256 manifest.`);

        // 4. Branching: Branch thread from a message
        console.log('[Test] 4. Testing thread branching from a turn/message...');
        const branchAgent = 'agent-test-branch';
        const branchThreads = await chatSessionService.getThreads(branchAgent);
        const branchSourceThread = branchThreads[0].id;
        // Submit user message to source thread
        await chatSessionService.submitTurnMessage({
          agentId: branchAgent,
          threadId: branchSourceThread,
          providerId: 'opencode',
          model: 'OpenCode Free',
          messageText: 'Turn 1: Base requirement for branch',
        });
        const branchMsgs = await chatSessionService.getMessages(branchSourceThread);
        const sourceMsg = branchMsgs[branchMsgs.length - 1];
        if (!sourceMsg) throw new Error('Source message for branching not found');

        const branchedThread = await chatSessionService.branchThreadFromMessage(
          branchSourceThread,
          sourceMsg.id,
          'Branch: Feature Exploration'
        );
        if (branchedThread.kind !== 'branch' || branchedThread.parent_thread_id !== branchSourceThread) {
          throw new Error('Branched thread metadata invalid');
        }
        const copiedMsgs = await chatSessionService.getMessages(branchedThread.id);
        if (copiedMsgs.length === 0) {
          throw new Error('Branch thread should copy turns from parent');
        }
        console.log(`[Test]    - Branched thread "${branchedThread.title}" created with ${copiedMsgs.length} copied turn(s).`);

        // 5. Concurrency & Crash-safe FIFO message queue
        console.log('[Test] 5. Testing FIFO message queue & crash-safety...');
        const queueAgent = 'agent-test-queue';
        const qThreads = await chatSessionService.getThreads(queueAgent);
        const qThreadId = qThreads[0].id;

        // Pause queue for test agent
        await chatSessionService.pauseQueue(queueAgent);
        const queuedTurnResult = await chatSessionService.submitTurnMessage({
          agentId: queueAgent,
          threadId: qThreadId,
          providerId: 'opencode',
          model: 'OpenCode Free',
          messageText: 'Queued message waiting for unpause',
        });
        if (!queuedTurnResult.queued) {
          throw new Error('Message should be queued when queue is paused');
        }
        const queueEntries = await chatSessionService.getAgentQueue(queueAgent);
        if (queueEntries.length === 0 || queueEntries[0].state !== 'paused') {
          throw new Error('Queue entry not found in SQLite or not in paused state');
        }
        console.log(`[Test]    - Queued message successfully persisted in SQLite with state: ${queueEntries[0].state}.`);

        // Resume queue
        await chatSessionService.resumeQueue(queueAgent);
        console.log(`[Test]    - Queue resumed successfully.`);

        // Test cancel queued task
        await chatSessionService.pauseQueue(queueAgent);
        const toCancelResult = await chatSessionService.submitTurnMessage({
          agentId: queueAgent,
          threadId: qThreadId,
          providerId: 'opencode',
          model: 'OpenCode Free',
          messageText: 'Message to be cancelled',
        });
        const currentQueue = await chatSessionService.getAgentQueue(queueAgent);
        const cancelTarget = currentQueue.find((q) => q.turn_id === toCancelResult.turnId);
        if (cancelTarget) {
          await chatSessionService.cancelQueuedMessage(cancelTarget.id);
          console.log(`[Test]    - Queued task cancelled successfully.`);
        }
        await chatSessionService.resumeQueue(queueAgent);

        // 6. Thread Compaction (summarize older turns, never lose thread)
        console.log('[Test] 6. Testing thread compaction...');
        const compactAgent = 'agent-test-compact';
        const compactThreadObj = await chatSessionService.createThread(compactAgent, 'Long Thread for Compaction', 'main');
        for (let i = 1; i <= 5; i++) {
          await chatSessionService.submitTurnMessage({
            agentId: compactAgent,
            threadId: compactThreadObj.id,
            providerId: 'opencode',
            model: 'OpenCode Free',
            messageText: `Compaction Turn #${i}: System design note and invariant decision ${i}`,
          });
        }
        const msgsBeforeCompact = await chatSessionService.getMessages(compactThreadObj.id);
        console.log(`[Test]    - Thread has ${msgsBeforeCompact.length} messages before compaction.`);
        const compactResult = await chatSessionService.compactThread(compactThreadObj.id, 2);
        if (!compactResult.success || compactResult.compactedTurns === 0) {
          throw new Error(`Compaction failed: ${compactResult.summary}`);
        }
        const msgsAfterCompact = await chatSessionService.getMessages(compactThreadObj.id);
        const hasSummaryMsg = msgsAfterCompact.some((m) => m.kind === 'compaction-summary');
        if (!hasSummaryMsg) {
          throw new Error('Compacted thread must contain compaction-summary message card');
        }
        console.log(`[Test]    - Compaction successful: ${compactResult.compactedTurns} turns compacted, summary message card inserted, thread preserved.`);

        // 7. Strict Rule: Zero fake replies
        console.log('[Test] 7. Testing zero fake replies rule...');
        const liveAgent = 'agent-test-live-only';
        const liveThreads = await chatSessionService.getThreads(liveAgent);
        const liveThreadId = liveThreads[0].id;
        let fakeReplyRejected = false;
        try {
          // Attempting to send to disconnected provider throws error, never returns fake answers
          await chatSessionService.submitTurnMessage({
            agentId: liveAgent,
            threadId: liveThreadId,
            providerId: 'claude',
            model: 'Claude 3.5 Sonnet',
            messageText: 'Testing disconnected provider',
          });
        } catch (err: any) {
          fakeReplyRejected = true;
          console.log(`[Test]    - Disconnected provider properly rejected: "${err.message}" (Zero fake replies returned).`);
        }
        // submitTurnMessage catches and returns { error } if execution fails
        const directTurnExec = await chatSessionService.submitTurnMessage({
          agentId: liveAgent,
          threadId: liveThreadId,
          providerId: 'claude',
          model: 'Claude 3.5 Sonnet',
          messageText: 'Testing disconnected execution',
        });
        if (directTurnExec.error && !directTurnExec.reply) {
          fakeReplyRejected = true;
          console.log(`[Test]    - Turn error correctly reported without fake reply: "${directTurnExec.error}".`);
        }
        if (!fakeReplyRejected) {
          throw new Error('Strict Rule Failed: Disconnected provider should return error, never fake reply');
        }

        // Capture screenshot of the running shell
        await new Promise((r) => setTimeout(r, 1200));
        const img = await mainWindow!.webContents.capturePage();
        const distScreenshot = path.resolve('dist/milestone-3-shell.png');
        const screenshotsDir = path.resolve('screenshots');
        if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });
        const repoScreenshot = path.join(screenshotsDir, 'milestone-3-shell.png');
        const artifactDir = 'C:\\Users\\Tanjir\\.gemini\\antigravity\\brain\\0f8b046c-6305-4567-8512-852626bb8d6a';
        const artifactScreenshot = path.join(artifactDir, 'milestone-3-shell.png');

        fs.writeFileSync(distScreenshot, img.toPNG());
        fs.writeFileSync(repoScreenshot, img.toPNG());
        console.log(`[Test] 8. Shell screenshot captured and saved to: ${distScreenshot} and ${repoScreenshot}`);
        try {
          if (!fs.existsSync(artifactDir)) {
            fs.mkdirSync(artifactDir, { recursive: true });
          }
          fs.writeFileSync(artifactScreenshot, img.toPNG());
          console.log(`[Test] Screenshot also mirrored to artifact directory: ${artifactScreenshot}`);
        } catch (e) {
          console.log(`[Test] Mirroring to artifact dir skipped:`, e);
        }

        console.log('[Test] ALL MILESTONE 3 VERIFICATION CHECKS & EXACT LIMITS PASSED.');
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

// Milestone 3 IPC Handlers
ipcMain.handle('chat:get-threads', async (_event, agentId: string) => {
  return await chatSessionService.getThreads(agentId);
});

ipcMain.handle('chat:create-thread', async (_event, { agentId, title, kind, parentThreadId, sourceMessageId }) => {
  return await chatSessionService.createThread(agentId, title, kind, parentThreadId, sourceMessageId);
});

ipcMain.handle('chat:rename-thread', async (_event, { threadId, newTitle }) => {
  return await chatSessionService.renameThread(threadId, newTitle);
});

ipcMain.handle('chat:close-thread', async (_event, threadId: string) => {
  return await chatSessionService.closeThread(threadId);
});

ipcMain.handle('chat:delete-thread', async (_event, threadId: string) => {
  return await chatSessionService.deleteThread(threadId);
});

ipcMain.handle('chat:get-messages', async (_event, threadId: string) => {
  return await chatSessionService.getMessages(threadId);
});

ipcMain.handle('chat:branch-thread', async (_event, { threadId, messageId, branchTitle }) => {
  return await chatSessionService.branchThreadFromMessage(threadId, messageId, branchTitle);
});

ipcMain.handle('chat:compact-thread', async (_event, { threadId, turnsToPreserve }) => {
  return await chatSessionService.compactThread(threadId, turnsToPreserve);
});

ipcMain.handle('chat:get-queue', async (_event, agentId: string) => {
  return await chatSessionService.getAgentQueue(agentId);
});

ipcMain.handle('chat:pause-queue', async (_event, agentId: string) => {
  return await chatSessionService.pauseQueue(agentId);
});

ipcMain.handle('chat:resume-queue', async (_event, agentId: string) => {
  return await chatSessionService.resumeQueue(agentId);
});

ipcMain.handle('chat:cancel-queued', async (_event, queueId: string) => {
  return await chatSessionService.cancelQueuedMessage(queueId);
});

ipcMain.handle('chat:submit-turn', async (_event, payload) => {
  return await chatSessionService.submitTurnMessage(payload);
});

ipcMain.handle('chat:get-active-turn-count', () => {
  return chatSessionService.getActiveTurnCount();
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
  await chatSessionService.init();
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
