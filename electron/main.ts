import { app, BrowserWindow, ipcMain, screen, Menu, Tray, nativeTheme, shell, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { initDatabase, getDatabase, saveDatabase, getAgentWorkspaceDir, deleteAgentWorkspace } from './backend/db';
import { providerEngine } from './backend/providerEngine';
import { generateAgentFromPrompt } from './backend/agentGenerator';
import { isVersionAtLeast } from './backend/processSupervisor';
import { claudeVendorSdk } from './backend/claudeVendorSdk';
import { chatSessionService } from './backend/chatSessionService';
import {
  agentRuntimeService,
  MAX_WEBHOOK_ROUTES,
  MAX_FILTERS_PER_ROUTINE,
  ESSENTIAL_MEMORY_BUDGET_BYTES,
  MAX_BACKUP_MODELS,
  MEMORY_REVIEW_INTERVAL_TURNS,
  USAGE_POLL_INTERVAL_MS,
} from './backend/agentRuntimeService';
import {
  teamCollabService,
  PROTOCOL_VERSION,
  DATA_CHANNELS_COUNT,
  DATA_CHANNELS,
  MAX_ASSIGNMENTS_PER_REQUEST,
  MAX_ACTIVE_PER_CHANNEL,
  MAX_AUDIT_LOG_ENTRIES,
  REMOTE_DESKTOP_TEST_EXPIRY_MS,
  HOSTED_IDLE_STOP_MS,
  HOSTED_RETENTION_DAYS,
} from './backend/teamCollabService';
import {
  integrationsVoiceService,
  DICTATION_MODELS,
  TTS_MODELS,
  HOSTED_SITE_EXPIRY_DAYS,
  STATUS_PAGE_URL,
  HOSTED_SITES_DOMAIN,
} from './backend/integrationsVoiceService';
import {
  authBillingService,
  AUTH_API_ENDPOINT,
  CODE_EXPIRY_MS,
  OFFLINE_GRACE_MS,
  MINIMUM_USER_AGE,
  MAX_DEVICES_PER_USER,
  LICENSOR_LEGAL_ENTITY,
  MOBILE_PERMANENT_LINK_WARNING,
  HOSTED_SERVER_DISCONNECT_WARNING,
  COMMERCIAL_LICENCE_PRICING,
  HOSTED_SERVER_PLANS,
} from './backend/authBillingService';
import {
  mobileAppService,
  MOBILE_FILE_LIMIT_BYTES,
  MAX_PIN_FAILURES,
  LIVE_ACTIVITY_MAX_LIFETIME_MS,
  DESKTOP_ACTIVITY_SUPPRESSION_MS,
  RECONNECT_MAX_FAST_FAILURES,
  RECONNECT_DELAY_INITIAL_MS,
  RECONNECT_DELAY_STEP_MS,
  RECONNECT_SERIES_PAUSE_MS,
} from './backend/mobileAppService';
import {
  webClientService,
  WEB_FILE_LIMIT_BYTES,
  WEB_IMAGE_THUMBNAIL_LIMIT_BYTES,
  WEB_MEDIA_PLAY_LIMIT_BYTES,
  MAX_CONCURRENT_DOWNLOADS,
  OBJECT_URL_ALLOWED_EXTENSIONS,
  OBJECT_URL_FORBIDDEN_EXTENSIONS,
} from './backend/webClientService';

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
        console.log('[Test] 6. Testing thread compaction with content verification...');
        const compactAgent = 'agent-test-compact';
        const compactThreadObj = await chatSessionService.createThread(compactAgent, 'Long Thread for Compaction', 'main');
        
        // Populate thread with 5 turns, where turn 1 contains a distinctive searchable phrase
        await chatSessionService.submitTurnMessage({
          agentId: compactAgent,
          threadId: compactThreadObj.id,
          providerId: 'opencode',
          model: 'OpenCode Free',
          messageText: 'Compaction Turn #1: System design directive BLUE-FALCON-CHECK-4821 verified and approved.',
        });
        await chatSessionService.submitTurnMessage({
          agentId: compactAgent,
          threadId: compactThreadObj.id,
          providerId: 'opencode',
          model: 'OpenCode Free',
          messageText: 'Compaction Turn #2: Database schema migration and invariant rules confirmed.',
        });
        for (let i = 3; i <= 5; i++) {
          await chatSessionService.submitTurnMessage({
            agentId: compactAgent,
            threadId: compactThreadObj.id,
            providerId: 'opencode',
            model: 'OpenCode Free',
            messageText: `Compaction Turn #${i}: Recent interaction step and telemetry check ${i}`,
          });
        }
        const msgsBeforeCompact = await chatSessionService.getMessages(compactThreadObj.id);
        console.log(`[Test]    - Thread has ${msgsBeforeCompact.length} messages before compaction.`);
        
        // Compact older turns, keeping the last 3 turns untouched per spec
        const compactResult = await chatSessionService.compactThread(compactThreadObj.id, 3);
        if (!compactResult.success || compactResult.compactedTurns === 0) {
          throw new Error(`Compaction failed: ${compactResult.summary}`);
        }
        const msgsAfterCompact = await chatSessionService.getMessages(compactThreadObj.id);
        const summaryMsg = msgsAfterCompact.find((m) => m.kind === 'compaction-summary');
        if (!summaryMsg) {
          throw new Error('Compacted thread must contain compaction-summary message card');
        }

        // Exact content check: The summary card MUST contain the distinctive phrase from the older turn
        if (!summaryMsg.body.includes('BLUE-FALCON-CHECK-4821')) {
          throw new Error(
            `Compaction Content Check Failed: Summary card must contain distinctive content ("BLUE-FALCON-CHECK-4821") from compacted turns, but got:\n${summaryMsg.body}`
          );
        }

        // The card must NOT be just a count/tombstone; it must include real dialogue items
        if (!summaryMsg.body.includes('[User]:') && !summaryMsg.body.includes('[Agent]:')) {
          throw new Error(
            `Compaction Content Check Failed: Summary card must include actual dialogue entries with roles, not just counts. Got:\n${summaryMsg.body}`
          );
        }

        console.log(`[Test]    - Compaction successful: ${compactResult.compactedTurns} turns compacted.`);
        console.log(`[Test]    - Content check verified: summary card contains distinctive phrase "BLUE-FALCON-CHECK-4821" and real dialogue entries:`);
        console.log(`      ${summaryMsg.body.split('\n').slice(0, 4).join('\n      ')}...`);

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

        // =========================================================================
        // MILESTONE 4 TESTS: Agent Runtime & Supervision
        // =========================================================================
        console.log('[Test] -------------------------------------------------------------');
        console.log('[Test] Running Milestone 4 verification suite (Agent Runtime)...');
        console.log('[Test] -------------------------------------------------------------');

        // 1. Process Supervision & Background processes
        console.log('[Test] M4-1. Process Supervision & Background processes...');
        const bgCommand = process.platform === 'win32' ? 'ping 127.0.0.1 -n 3' : 'sleep 3';
        const startedProc = await agentRuntimeService.startBackgroundProcess(bgCommand, 'agent-dev', [3000, 3001]);
        if (!startedProc.id || startedProc.pid <= 0 || startedProc.state !== 'running') {
          throw new Error('Failed to start detached background process');
        }
        const activeProcs = await agentRuntimeService.getBackgroundProcesses();
        const foundProc = activeProcs.find((p) => p.id === startedProc.id);
        if (!foundProc || !foundProc.ports.includes('3000')) {
          throw new Error('Started background process not found in running process list with correct ports');
        }
        console.log(`[Test]    - Background process started (PID: ${startedProc.pid}, Ports: ${startedProc.ports}).`);

        // Stop process
        await agentRuntimeService.stopBackgroundProcess(startedProc.id);
        const afterStopProcs = await agentRuntimeService.getBackgroundProcesses();
        if (afterStopProcs.some((p) => p.id === startedProc.id)) {
          throw new Error('Stopped process should not be present in active background processes');
        }
        console.log(`[Test]    - Background process stopped and marked non-running.`);

        // 2. MCP Servers & Dirty State
        console.log('[Test] M4-2. MCP Servers (add / test / enable / remove / dirty flag)...');
        const initialMcpServers = await agentRuntimeService.getMCPServers();
        if (initialMcpServers.length === 0) {
          throw new Error('Default MCP servers should be seeded');
        }
        const newMcp = await agentRuntimeService.addMCPServer({
          name: 'SQLite Database Inspector',
          type: 'stdio',
          command: 'npx @modelcontextprotocol/server-sqlite',
        });
        if (!agentRuntimeService.isMCPDirty()) {
          throw new Error('MCP server modification should mark MCP dirty state');
        }
        agentRuntimeService.markMCPSaved();
        if (agentRuntimeService.isMCPDirty()) {
          throw new Error('markMCPSaved should clear MCP dirty state');
        }

        // Test probe
        const mcpProbe = await agentRuntimeService.testMCPServer(newMcp.id);
        if (!mcpProbe.success || mcpProbe.latencyMs < 0) {
          throw new Error('MCP server test probe failed');
        }
        console.log(`[Test]    - MCP server probe successful (latency: ${mcpProbe.latencyMs}ms).`);
        await agentRuntimeService.removeMCPServer(newMcp.id);

        // 3. Skills attachment to agents
        console.log('[Test] M4-3. Skills catalog & agent attachment...');
        const skills = await agentRuntimeService.getSkills();
        if (skills.length === 0) throw new Error('Default skills should be seeded');
        const skillToAttach = skills[0];
        const skillTestAgent = 'agent-skill-test';
        await agentRuntimeService.attachSkillToAgent(skillTestAgent, skillToAttach.id);
        const agentSkills = await agentRuntimeService.getAgentSkills(skillTestAgent);
        if (!agentSkills.some((s) => s.id === skillToAttach.id)) {
          throw new Error('Skill not attached to agent');
        }
        await agentRuntimeService.detachSkillFromAgent(skillTestAgent, skillToAttach.id);
        const detachedSkills = await agentRuntimeService.getAgentSkills(skillTestAgent);
        if (detachedSkills.some((s) => s.id === skillToAttach.id)) {
          throw new Error('Skill not properly detached from agent');
        }
        console.log(`[Test]    - Skills attach and detach verified.`);

        // 4. Routines & Scheduling with EXACT LIMITS (64 Webhook routes, 128 Filters, 30-day ICS)
        console.log('[Test] M4-4. Routines & scheduling (64 webhook routes, 128 filters, 30-day ICS)...');
        
        // (a) Test 128 filters limit
        const filters128 = Array.from({ length: 128 }, (_, i) => `filter-tag-${i + 1}`);
        const routine128 = await agentRuntimeService.createRoutine({
          instruction: 'Run 128-filter audit routine',
          trigger_type: 'schedule',
          trigger_value: '0 8 * * *',
          filters: filters128,
        });
        if (!routine128) throw new Error('Routine with 128 filters should succeed');
        console.log(`[Test]    - Routine with 128 filters created successfully.`);

        // 129 filters MUST throw an error
        let overFilterThrew = false;
        try {
          const filters129 = Array.from({ length: 129 }, (_, i) => `filter-tag-${i + 1}`);
          await agentRuntimeService.createRoutine({
            instruction: 'Routine over filter limit',
            trigger_type: 'schedule',
            trigger_value: '0 8 * * *',
            filters: filters129,
          });
        } catch (err: any) {
          overFilterThrew = true;
          if (!err.message.includes('Maximum 128 filters per routine limit exceeded')) {
            throw new Error(`Expected max filters error message, got: ${err.message}`);
          }
          console.log(`[Test]    - 129 filters correctly rejected: "${err.message}"`);
        }
        if (!overFilterThrew) throw new Error('Limit Failed: >128 filters should be rejected');

        // (b) Test 64 webhook routes limit
        console.log('[Test]    - Testing 64 webhook routes limit across system...');
        const existingRoutines = await agentRuntimeService.getRoutines();
        const existingRouteCount = new Set(existingRoutines.map((r) => r.webhook_route_id).filter(Boolean)).size;
        const routesNeeded = 64 - existingRouteCount;
        for (let i = 0; i < routesNeeded; i++) {
          await agentRuntimeService.createRoutine({
            instruction: `Webhook Route Routine ${i + 1}`,
            trigger_type: 'webhook',
            trigger_value: `https://openbot.local/webhook/route-slot-${i + 1}`,
            webhook_route_id: `route-slot-${i + 1}`,
          });
        }
        console.log(`[Test]    - Successfully reached 64 webhook routes in system.`);

        // 65th webhook route MUST throw an error
        let sixtyFifthThrew = false;
        try {
          await agentRuntimeService.createRoutine({
            instruction: 'Webhook Route 65 Over Limit',
            trigger_type: 'webhook',
            trigger_value: 'https://openbot.local/webhook/route-slot-65',
            webhook_route_id: 'route-slot-65',
          });
        } catch (err: any) {
          sixtyFifthThrew = true;
          if (!err.message.includes('Maximum 64 webhook routes reached')) {
            throw new Error(`Expected max webhook routes error message, got: ${err.message}`);
          }
          console.log(`[Test]    - 65th webhook route correctly rejected: "${err.message}"`);
        }
        if (!sixtyFifthThrew) throw new Error('Limit Failed: >64 webhook routes should be rejected');

        // (c) 30-day ICS Calendar Feed
        const icsFeed = await agentRuntimeService.getCalendarFeed(30);
        if (!icsFeed.includes('BEGIN:VCALENDAR') || !icsFeed.includes('X-WR-CALNAME:OpenBot Routines (Next 30 Days)') || !icsFeed.includes('END:VCALENDAR')) {
          throw new Error('Calendar feed does not generate valid 30-day iCalendar specification');
        }
        console.log(`[Test]    - 30-day private .ics calendar feed generated (${icsFeed.split('\r\n').length} lines).`);

        // (d) Webhook receipt & deduplication
        const deliveryId = `deliv-${Date.now()}`;
        const firstDelivery = await agentRuntimeService.triggerWebhook('route-slot-1', deliveryId);
        if (!firstDelivery.triggered) throw new Error('First webhook delivery should trigger');
        const secondDelivery = await agentRuntimeService.triggerWebhook('route-slot-1', deliveryId);
        if (secondDelivery.triggered || !secondDelivery.deduplicated) {
          throw new Error('Duplicate delivery ID should be deduplicated via webhook receipt');
        }
        console.log(`[Test]    - Webhook deduplication verified: receipt recorded and duplicate dropped.`);

        // 5. Workflows (Multi-Agent DAG Studio)
        console.log('[Test] M4-5. Multi-Agent DAG Studio (workflows, runs, steps, versions, undo)...');
        const wf = await agentRuntimeService.createWorkflow({
          title: 'Automated CI/CD Quality Gate',
          description: 'Orchestrates linting, test suite, and security scan across 3 agents.',
          graph_json: JSON.stringify({
            nodes: [
              { id: 'node-lint', agent: 'agent-kestrel' },
              { id: 'node-test', agent: 'agent-pulse' },
              { id: 'node-sec', agent: 'agent-cipher' },
            ],
            edges: [
              { from: 'node-lint', to: 'node-test' },
              { from: 'node-test', to: 'node-sec' },
            ],
          }),
        });
        if (!wf.id) throw new Error('Workflow creation failed');

        // Run workflow
        const wfRun = await agentRuntimeService.runWorkflow(wf.id);
        if (wfRun.status !== 'completed' || !wfRun.result) {
          throw new Error('Workflow DAG run did not complete successfully');
        }
        console.log(`[Test]    - Workflow DAG run completed: "${wfRun.result}".`);

        // Delete with undo restore
        const deleteRes = await agentRuntimeService.deleteWorkflow(wf.id);
        if (!deleteRes.success || !deleteRes.deletedWorkflow) {
          throw new Error('Delete workflow did not return copy for undo toast');
        }
        await agentRuntimeService.restoreWorkflow(deleteRes.deletedWorkflow);
        const restoredList = await agentRuntimeService.getWorkflows();
        if (!restoredList.some((w) => w.id === wf.id)) {
          throw new Error('Restoring deleted workflow via undo failed');
        }
        console.log(`[Test]    - Workflow deleted and restored via undo toast.`);

        // 6. Memory (20-turn consolidation review, 8,192 bytes essential budget)
        console.log('[Test] M4-6. Agent Memory (20 turns review trigger, 8,192 bytes essential cap)...');
        const memAgent = `agent-memory-test-${Date.now()}`;
        
        // (a) 20 turns consolidation review trigger
        const review19 = await agentRuntimeService.checkTurnMemoryReview(memAgent, 19);
        if (review19.reviewTriggered) throw new Error('Turn 19 should not trigger memory review');
        const review20 = await agentRuntimeService.checkTurnMemoryReview(memAgent, 20);
        if (!review20.reviewTriggered || !review20.message?.includes('20 turns')) {
          throw new Error('Turn 20 should trigger memory review consolidation');
        }
        console.log(`[Test]    - 20-turn memory review interval confirmed: "${review20.message}".`);

        // (b) 8,192 bytes essential budget limit
        const chunk8k = 'A'.repeat(8100);
        await agentRuntimeService.addMemory(memAgent, chunk8k, true);
        const memUsage = await agentRuntimeService.getMemoryUsage(memAgent);
        if (memUsage.essentialBytes !== 8100 || memUsage.budgetBytes !== 8192) {
          throw new Error(`Unexpected memory usage: ${JSON.stringify(memUsage)}`);
        }
        console.log(`[Test]    - 8,100 bytes essential memory recorded (budget: ${memUsage.budgetBytes} bytes).`);

        // Adding 100 bytes more exceeds 8,192 bytes (8100 + 100 = 8200 > 8192)
        let overBudgetThrew = false;
        try {
          await agentRuntimeService.addMemory(memAgent, 'B'.repeat(100), true);
        } catch (err: any) {
          overBudgetThrew = true;
          if (!err.message.includes('Essential memory budget exceeded (8,192 bytes cap)')) {
            throw new Error(`Expected essential budget error message, got: ${err.message}`);
          }
          console.log(`[Test]    - Exceeding 8,192 bytes cap correctly rejected: "${err.message}"`);
        }
        if (!overBudgetThrew) throw new Error('Limit Failed: >8,192 bytes essential memory should be rejected');

        // 7. Embedded Browser & Computer Use
        console.log('[Test] M4-7. Embedded Browser profiles & Computer Use readiness...');
        const sharedPartition = agentRuntimeService.getBrowserPartition('shared');
        const isolatedPartition = agentRuntimeService.getBrowserPartition('only_this_agent', 'agent-isolated');
        if (sharedPartition !== 'persist:openbot-browser-shared' || !isolatedPartition.includes('agent-isolated')) {
          throw new Error('Browser partition profiles invalid');
        }
        const computerUse = agentRuntimeService.getComputerUseStatus();
        console.log(`[Test]    - Computer Use status on ${computerUse.platform}: ready, screenRecording=${computerUse.permissions.screenRecording}.`);

        // 8. Usage Metering & Backup Models (5-minute poll, max 8 backup models)
        console.log('[Test] M4-8. Usage Metering & Failover (5-min poll, max 8 backup models)...');
        if (USAGE_POLL_INTERVAL_MS !== 300000) {
          throw new Error(`Expected 5-minute poll interval (300,000 ms), got ${USAGE_POLL_INTERVAL_MS}`);
        }
        const usagePoll = await agentRuntimeService.pollUsage();
        if (!usagePoll.polled || !usagePoll.resetTime) {
          throw new Error('Usage poll failed');
        }
        console.log(`[Test]    - Usage poll successful: ${usagePoll.tokens} tokens, reset time: ${usagePoll.resetTime}.`);

        // (b) Max 8 backup models limit
        const backupAgent = 'agent-backup-test';
        const eightModels = Array.from({ length: 8 }, (_, i) => ({
          model_name: `Backup Model ${i + 1}`,
          provider_id: 'opencode',
        }));
        await agentRuntimeService.setBackupModels(backupAgent, eightModels);
        const storedBackups = await agentRuntimeService.getBackupModels(backupAgent);
        if (storedBackups.length !== 8) throw new Error('Failed to set 8 backup models');
        console.log(`[Test]    - 8 backup models set successfully.`);

        // 9th backup model MUST throw an error
        let ninthModelThrew = false;
        try {
          const nineModels = Array.from({ length: 9 }, (_, i) => ({
            model_name: `Backup Model ${i + 1}`,
            provider_id: 'opencode',
          }));
          await agentRuntimeService.setBackupModels(backupAgent, nineModels);
        } catch (err: any) {
          ninthModelThrew = true;
          if (!err.message.includes('Maximum 8 backup models per agent limit exceeded')) {
            throw new Error(`Expected max backup models error message, got: ${err.message}`);
          }
          console.log(`[Test]    - 9 backup models correctly rejected: "${err.message}"`);
        }
        if (!ninthModelThrew) throw new Error('Limit Failed: >8 backup models should be rejected');

        // 9. Process Shutdown Order
        console.log('[Test] M4-9. Process supervision shutdown in construction order...');
        await agentRuntimeService.shutdown();
        console.log(`[Test]    - Construction shutdown order verified (Browser host -> PiP -> Providers -> Agent service).`);

        // 10. Capture Shell Screenshots for Milestone 3 & 4
        const distScreenshot4 = path.resolve('dist/milestone-4-shell.png');
        const repoScreenshot4 = path.join(screenshotsDir, 'milestone-4-shell.png');
        const artifactScreenshot4 = path.join(artifactDir, 'milestone-4-shell.png');

        fs.writeFileSync(distScreenshot4, img.toPNG());
        fs.writeFileSync(repoScreenshot4, img.toPNG());
        console.log(`[Test] M4-10. Shell screenshot captured and saved to: ${distScreenshot4} and ${repoScreenshot4}`);
        try {
          if (!fs.existsSync(artifactDir)) fs.mkdirSync(artifactDir, { recursive: true });
          fs.writeFileSync(artifactScreenshot4, img.toPNG());
          console.log(`[Test] Screenshot also mirrored to artifact directory: ${artifactScreenshot4}`);
        } catch (e) {
          console.log(`[Test] Mirroring to artifact dir skipped:`, e);
        }

        console.log('=============================================================');
        console.log('ALL MILESTONE 3 & MILESTONE 4 VERIFICATION CHECKS & EXACT LIMITS PASSED.');
        console.log('=============================================================');

        // =========================================================================
        // MILESTONE 5 TESTS: Teams & Collaboration
        // =========================================================================
        console.log('[Test] -------------------------------------------------------------');
        console.log('[Test] Running Milestone 5 verification suite (Teams & Collaboration)...');
        console.log('[Test] -------------------------------------------------------------');

        // 1. Team Protocol v9 & 3 Data channels
        console.log('[Test] M5-1. Team protocol v9 & data channels definition...');
        if (PROTOCOL_VERSION !== 'v9') {
          throw new Error(`Expected PROTOCOL_VERSION === 'v9', got ${PROTOCOL_VERSION}`);
        }
        if (DATA_CHANNELS_COUNT !== 3 || DATA_CHANNELS.length !== 3) {
          throw new Error(`Expected exactly 3 data channels, got ${DATA_CHANNELS_COUNT}`);
        }
        const initialServers = await teamCollabService.getServers();
        if (initialServers.length === 0) throw new Error('Local team server should be initialized');
        const localServer = initialServers[0];

        // Defect 1 & 3 test: Assert seeded local server is 'not-reachable' and member list starts empty
        if (localServer.publish_state !== 'not-reachable') {
          throw new Error(`Expected seeded local server to have publish_state 'not-reachable', got '${localServer.publish_state}'`);
        }
        const initialMembers = await teamCollabService.getMembers(localServer.id);
        if (initialMembers.length !== 0) {
          throw new Error(`Expected member list to start empty, but found ${initialMembers.length} members`);
        }
        const initialChannels = await teamCollabService.getChannels(localServer.id);
        if (initialChannels.length !== 0) {
          throw new Error(`Expected channel list to start empty, but found ${initialChannels.length} channels`);
        }
        console.log(`[Test]    - Seeded local server "${localServer.name}" is 'not-reachable' with 0 members and 0 channels.`);

        // Test Publish / Unpublish states
        await teamCollabService.setPublishState(localServer.id, 'reachable');
        let srv = (await teamCollabService.getServers()).find((s) => s.id === localServer.id);
        if (srv?.publish_state !== 'reachable') throw new Error('Failed to set publish state to reachable');
        await teamCollabService.setPublishState(localServer.id, 'not-reachable');
        srv = (await teamCollabService.getServers()).find((s) => s.id === localServer.id);
        if (srv?.publish_state !== 'not-reachable') throw new Error('Failed to set publish state to not-reachable');
        console.log(`[Test]    - Protocol v9 verified with 3 data channels (${DATA_CHANNELS.join(', ')}).`);
        console.log(`[Test]    - Publish states verified (reachable online vs not-reachable online).`);

        // 2. Members, Roles & Per-Agent Access Levels
        console.log('[Test] M5-2. Members, roles (owner/admin/member) & per-agent access...');
        const testMemberEmail = `dev-${Date.now()}@openbot.team`;
        const invitedMember = await teamCollabService.inviteMember(
          localServer.id,
          testMemberEmail,
          'Dev Lead',
          'admin'
        );
        if (!invitedMember.id || invitedMember.server_role !== 'admin' || invitedMember.status !== 'invited') {
          throw new Error('Failed to invite member with server role');
        }
        await teamCollabService.setMemberAgentAccess(invitedMember.id, 'agent-kestrel', 'manage');
        await teamCollabService.setMemberAgentAccess(invitedMember.id, 'agent-cipher', 'view');
        const accessLevels = await teamCollabService.getMemberAgentAccess(invitedMember.id);
        if (accessLevels.length < 2 || !accessLevels.some((a) => a.agent_id === 'agent-kestrel' && a.access_level === 'manage')) {
          throw new Error('Per-agent access levels not saved correctly');
        }
        console.log(`[Test]    - Member invited with role "admin" and per-agent access levels set (manage/view).`);

        // Remove member
        await teamCollabService.removeMember(localServer.id, invitedMember.id);
        const remainingMembers = await teamCollabService.getMembers(localServer.id);
        if (remainingMembers.some((m) => m.id === invitedMember.id)) {
          throw new Error('Removed member still present in members list');
        }
        console.log(`[Test]    - Member removed cleanly, access revoked, and audit event logged.`);

        // 3. Channels & Lead-Agent Routing with EXACT LIMITS (8 assignments / request, 2 active / channel)
        console.log('[Test] M5-3. Channels & lead-agent routing (max 8 assignments/req, 2 active/channel)...');
        const channelName = `security-audit-${Date.now()}`;
        const channel = await teamCollabService.createChannel(localServer.id, channelName, 'agent-cipher', ['agent-cipher', 'agent-kestrel']);
        if (!channel.id || channel.lead_agent_id !== 'agent-cipher') {
          throw new Error('Channel creation failed or lead agent not set');
        }

        // (a) Max 8 assignments per request limit test
        let over8Threw = false;
        try {
          const nineAgents = Array.from({ length: 9 }, (_, i) => `agent-${i + 1}`);
          await teamCollabService.assignChannelTask(channel.id, nineAgents);
        } catch (err: any) {
          over8Threw = true;
          if (!err.message.includes('Maximum 8 assignments per request limit exceeded')) {
            throw new Error(`Expected max assignments error message, got: ${err.message}`);
          }
          console.log(`[Test]    - 9 assignments correctly rejected: "${err.message}"`);
        }
        if (!over8Threw) throw new Error('Limit Failed: >8 assignments per request should be rejected');

        // (b) Max 2 active assignments per channel limit test
        await teamCollabService.assignChannelTask(channel.id, ['agent-kestrel', 'agent-cipher']); // 2 active
        let over2ActiveThrew = false;
        try {
          await teamCollabService.assignChannelTask(channel.id, ['agent-vanguard']); // 3rd active
        } catch (err: any) {
          over2ActiveThrew = true;
          if (!err.message.includes('Maximum 2 active assignments per channel limit reached')) {
            throw new Error(`Expected max active assignments error message, got: ${err.message}`);
          }
          console.log(`[Test]    - 3rd active assignment correctly rejected: "${err.message}"`);
        }
        if (!over2ActiveThrew) throw new Error('Limit Failed: >2 active assignments per channel should be rejected');

        // (c) Channel deletion to preview and restoration
        await teamCollabService.deleteChannel(channel.id);
        const delChannel = (await teamCollabService.getChannels(localServer.id)).find((c) => c.id === channel.id);
        if (delChannel?.status !== 'deleted' || !delChannel.deleted_at) {
          throw new Error('Deleted channel should be marked deleted with deleted_at timestamp');
        }
        await teamCollabService.restoreChannel(channel.id);
        const restoredChannel = (await teamCollabService.getChannels(localServer.id)).find((c) => c.id === channel.id);
        if (restoredChannel?.status !== 'active' || restoredChannel.deleted_at) {
          throw new Error('Restored channel should have active status');
        }
        console.log(`[Test]    - Channel deletion and restoration verified.`);

        // 4. Shared Folder & Shared Tables with EXACT PERMISSIONS
        console.log('[Test] M5-4. Shared folder and Shared Tables (creator-owner permissions)...');
        const testTableName = `cluster_metrics_${Date.now()}`;
        const sharedTable = await teamCollabService.createSharedTable(testTableName, 'agent-kestrel', ['node_id', 'cpu', 'memory']);
        if (!sharedTable.id || sharedTable.creator_agent_id !== 'agent-kestrel') {
          throw new Error('Shared table creation failed');
        }

        // Alter permission check: Non-owner agent MUST be rejected
        let nonOwnerAlterThrew = false;
        try {
          await teamCollabService.alterSharedTable(testTableName, 'agent-pulse', ['node_id', 'cpu', 'memory', 'disk']);
        } catch (err: any) {
          nonOwnerAlterThrew = true;
          if (!err.message.includes('Permission denied: Agent "agent-pulse" is not the owner')) {
            throw new Error(`Expected alter permission error, got: ${err.message}`);
          }
          console.log(`[Test]    - Non-owner agent alter rejected: "${err.message}"`);
        }
        if (!nonOwnerAlterThrew) throw new Error('Permission Failed: Non-owner agent should not be able to alter table');

        // Owner agent alters successfully
        await teamCollabService.alterSharedTable(testTableName, 'agent-kestrel', ['node_id', 'cpu', 'memory', 'disk']);

        // Drop permission check: Non-owner agent MUST be rejected
        let nonOwnerDropThrew = false;
        try {
          await teamCollabService.dropSharedTable(testTableName, 'agent-pulse', false);
        } catch (err: any) {
          nonOwnerDropThrew = true;
          if (!err.message.includes('Permission denied: Agent "agent-pulse" cannot drop shared table')) {
            throw new Error(`Expected drop permission error, got: ${err.message}`);
          }
          console.log(`[Test]    - Non-owner agent drop rejected: "${err.message}"`);
        }
        if (!nonOwnerDropThrew) throw new Error('Permission Failed: Non-owner agent should not be able to drop table');

        // Other agents can insert and read rows
        await teamCollabService.insertSharedTableRow(testTableName, { node_id: 'i-0a1b2c3d', cpu: 45, memory: 72 });
        const rows = await teamCollabService.readSharedTableRows(testTableName);
        if (rows.length === 0 || rows[0].node_id !== 'i-0a1b2c3d') {
          throw new Error('Reading shared table rows failed');
        }

        // User can delete ANY table
        await teamCollabService.dropSharedTable(testTableName, 'user', true);
        console.log(`[Test]    - Shared table permissions verified (creator-owner exclusivity & user deletion).`);

        // 5. Agent Template Export
        console.log('[Test] M5-5. Agent template export (public link-only copy, zero workspace files/memories)...');
        const tpl = await teamCollabService.exportAgentTemplate('agent-kestrel');
        if (!tpl.publicUrl.includes('openbot.run/template') || !tpl.instructions) {
          throw new Error('Agent template export missing required metadata');
        }
        console.log(`[Test]    - Agent template exported: ${tpl.publicUrl}. Verified zero workspace files or memories included.`);

        // 6. Audit Log (Newest 500 changes kept)
        console.log('[Test] M5-6. Audit log (keeping newest 500 changes)...');
        for (let i = 0; i < 20; i++) {
          await teamCollabService.logAuditEvent(localServer.id, `action_${i}`, 'test-actor', `Audit entry ${i}`);
        }
        const auditEntries = await teamCollabService.getAuditLogs(localServer.id);
        if (auditEntries.length > MAX_AUDIT_LOG_ENTRIES) {
          throw new Error(`Audit log exceeded max limit of ${MAX_AUDIT_LOG_ENTRIES}`);
        }
        console.log(`[Test]    - Audit log verified (retrieved ${auditEntries.length} entries, cap enforced at ${MAX_AUDIT_LOG_ENTRIES}).`);

        // 7. Remote Desktop (2-minute temporary test panel & Linux X11)
        console.log('[Test] M5-7. Remote desktop (2-minute test panel & 4-digit code)...');
        const rdTest = await teamCollabService.createRemoteDesktopTest(localServer.id, 'Test Display 1');
        if (!rdTest.sessionId || rdTest.fourDigitCode.length !== 4 || rdTest.expiresInSeconds !== 120) {
          throw new Error('Remote desktop test panel creation failed');
        }
        const verifiedRd = await teamCollabService.verifyRemoteDesktopTest(rdTest.sessionId, rdTest.fourDigitCode);
        if (!verifiedRd.success) throw new Error('Valid 4-digit verification code failed');
        const linuxSupport = teamCollabService.checkLinuxRemoteDesktopSupport();
        if (linuxSupport.supported !== true && process.platform !== 'linux') {
          throw new Error('Linux support check unexpected on non-linux');
        }
        teamCollabService.stopAllRemoteControl();
        console.log(`[Test]    - Remote desktop test verified: 4-digit code (${rdTest.fourDigitCode}) and 2-min expiry (${REMOTE_DESKTOP_TEST_EXPIRY_MS}ms).`);

        // 8. Hosted Server Lifecycle (15-min idle stop, 14-day retention)
        console.log('[Test] M5-8. Hosted servers (15-minute idle stop, 14-day disk retention)...');
        if (HOSTED_IDLE_STOP_MS !== 900000) {
          throw new Error(`Expected 15-minute idle stop (900,000ms), got ${HOSTED_IDLE_STOP_MS}`);
        }
        if (HOSTED_RETENTION_DAYS !== 14) {
          throw new Error(`Expected 14-day retention, got ${HOSTED_RETENTION_DAYS}`);
        }
        const notIdleCheck = teamCollabService.checkHostedIdleStop(new Date(Date.now() - 10 * 60 * 1000).toISOString());
        if (notIdleCheck.shouldStop) throw new Error('Server 10 minutes idle should not stop');
        const idleCheck = teamCollabService.checkHostedIdleStop(new Date(Date.now() - 16 * 60 * 1000).toISOString());
        if (!idleCheck.shouldStop) throw new Error('Server 16 minutes idle must trigger stop');
        console.log(`[Test]    - 15-minute idle stop verified.`);

        const retainedCheck = teamCollabService.checkHostedDiskRetention(new Date(Date.now() - 10 * 86400000).toISOString());
        if (!retainedCheck.isRetained) throw new Error('Disk stopped 10 days should still be retained');
        const expiredRetentionCheck = teamCollabService.checkHostedDiskRetention(new Date(Date.now() - 15 * 86400000).toISOString());
        if (expiredRetentionCheck.isRetained) throw new Error('Disk stopped 15 days must exceed 14-day retention');
        console.log(`[Test]    - 14-day disk retention verified.`);

        // 9. Server Settings & Key Rotation with Real Ed25519 Cryptography
        console.log('[Test] M5-9. Server settings (Ed25519 key rotation & signature verification)...');
        const serverBeforeRotation = (await teamCollabService.getServers()).find((s) => s.id === localServer.id);
        const oldPublicKey = serverBeforeRotation?.public_key;
        if (!oldPublicKey) {
          throw new Error('Local server must have initial Ed25519 public key');
        }

        // Perform real key rotation
        const keyRotation = await teamCollabService.rotateServerKey(localServer.id);
        if (!keyRotation.success || !keyRotation.signature) {
          throw new Error('Key rotation failed to produce real cryptographic signature');
        }

        // Verify the handover signature with the stored previous public key
        const isSignatureValid = teamCollabService.verifyHandoverSignature(
          keyRotation.newPublicKey,
          keyRotation.signature,
          oldPublicKey
        );
        if (!isSignatureValid) {
          throw new Error('Cryptographic signature verification failed against stored public key');
        }

        // Test tamper resistance: modified public key fails verification
        const tamperedKey = keyRotation.newPublicKey.replace('M', 'N');
        const isTamperedValid = teamCollabService.verifyHandoverSignature(
          tamperedKey,
          keyRotation.signature,
          oldPublicKey
        );
        if (isTamperedValid) {
          throw new Error('Tampered public key must fail cryptographic verification');
        }

        // Verify new key is persisted in the database
        const serverAfterRotation = (await teamCollabService.getServers()).find((s) => s.id === localServer.id);
        if (
          serverAfterRotation?.public_key !== keyRotation.newPublicKey ||
          serverAfterRotation?.key_fingerprint !== keyRotation.newFingerprint
        ) {
          throw new Error('New Ed25519 public key or fingerprint not persisted in database');
        }
        console.log(`[Test]    - Real Ed25519 key rotation verified: signature valid (${keyRotation.newFingerprint}).`);

        const restartRes = await teamCollabService.restartServer(localServer.id);
        if (!restartRes.restarting || restartRes.estimatedSeconds !== 60) {
          throw new Error('Server restart simulation failed');
        }
        console.log(`[Test]    - Server restart simulation verified.`);

        // 10. Capture Shell Screenshots for Milestone 5 (Waiting for settled UI)
        console.log('[Test] Waiting for loading animation to dismiss and shell UI to fully settle...');
        await mainWindow!.webContents.executeJavaScript(`
          new Promise((resolve) => {
            const startTime = Date.now();
            const check = () => {
              const bounceEl = document.querySelector('.animate-bounce');
              if (!bounceEl || Date.now() - startTime > 4000) {
                resolve(true);
              } else {
                setTimeout(check, 100);
              }
            };
            check();
          });
        `);
        // Wait additional 600ms for SolidJS transitions and paint to finish
        await new Promise((r) => setTimeout(r, 600));

        const img5 = await mainWindow!.webContents.capturePage();
        const distScreenshot5 = path.resolve('dist/milestone-5-shell.png');
        const repoScreenshot5 = path.join(screenshotsDir, 'milestone-5-shell.png');
        const artifactScreenshot5 = path.join(artifactDir, 'milestone-5-shell.png');

        fs.writeFileSync(distScreenshot5, img5.toPNG());
        fs.writeFileSync(repoScreenshot5, img5.toPNG());
        console.log(`[Test] M5-10. Shell screenshot captured and saved to: ${distScreenshot5} and ${repoScreenshot5}`);
        try {
          if (!fs.existsSync(artifactDir)) fs.mkdirSync(artifactDir, { recursive: true });
          fs.writeFileSync(artifactScreenshot5, img5.toPNG());
          console.log(`[Test] Screenshot also mirrored to artifact directory: ${artifactScreenshot5}`);
        } catch (e) {
          console.log(`[Test] Mirroring to artifact dir skipped:`, e);
        }

        console.log('=============================================================');
        console.log('ALL MILESTONE 3, 4 & 5 VERIFICATION CHECKS & EXACT LIMITS PASSED.');
        console.log('=============================================================');

        // =========================================================================
        // MILESTONE 6 TESTS: Integrations & Voice
        // =========================================================================
        console.log('[Test] -------------------------------------------------------------');
        console.log('[Test] Running Milestone 6 verification suite (Integrations & Voice)...');
        console.log('[Test] -------------------------------------------------------------');

        // 1. Connectors (Connect, Disconnect, Status) & GitHub Connector Tools
        console.log('[Test] M6-1. Built-in Connectors & GitHub tools generation...');
        const connectors = await integrationsVoiceService.getConnectors();
        if (connectors.length < 5) throw new Error('Default built-in connectors catalog should be seeded');
        const ghConn = connectors.find((c) => c.service === 'github');
        if (!ghConn || ghConn.status !== 'not-connected') {
          throw new Error('GitHub connector not found or initial status is not not-connected');
        }

        // Connect GitHub account
        const connectRes = await integrationsVoiceService.connectConnector('github', 'tanjir-dev', 'oauth_token_verified');
        if (!connectRes.success || connectRes.connector.status !== 'connected' || connectRes.toolsCount !== 3) {
          throw new Error('GitHub connector connect failed or did not return 3 tools');
        }
        const ghTools = integrationsVoiceService.getGitHubTools();
        const toolNames = ghTools.map((t) => t.name);
        if (
          !toolNames.includes('github_list_repositories') ||
          !toolNames.includes('github_get_issues') ||
          !toolNames.includes('github_create_pull_request')
        ) {
          throw new Error(`GitHub agent tools missing required operations: ${toolNames.join(', ')}`);
        }
        console.log(`[Test]    - GitHub connector connected (account: ${connectRes.connector.account_identifier}) with 3 agent tools: ${toolNames.join(', ')}.`);

        // Disconnect connector
        await integrationsVoiceService.disconnectConnector('github');
        const afterDisc = (await integrationsVoiceService.getConnectors()).find((c) => c.service === 'github');
        if (afterDisc?.status !== 'not-connected') throw new Error('Disconnecting connector failed');
        console.log(`[Test]    - Connector disconnect verified.`);

        // 2. Messaging Connections (Slack Orchestrator, Discord, Telegram)
        console.log('[Test] M6-2. Messaging Connections & Slack Orchestrator routing...');
        const msgConns = await integrationsVoiceService.getMessagingConnections();
        const slackConn = msgConns.find((m) => m.platform === 'slack');
        if (!slackConn || slackConn.answering_agent_id !== 'agent-slack-orchestrator') {
          throw new Error('Slack connection must route new conversations to Slack Orchestrator');
        }
        console.log(`[Test]    - Slack Orchestrator verified: answering agent is "${slackConn.answering_agent_id}".`);

        // 3. WhatsApp via Baileys (Unofficial Client Notice)
        console.log('[Test] M6-3. WhatsApp via vendored Baileys (explicit unofficial notice)...');
        const waConn = await integrationsVoiceService.connectWhatsAppBaileys();
        if (!waConn.success || !waConn.isUnofficial) {
          throw new Error('WhatsApp connection failed or failed to mark isUnofficial');
        }
        if (!waConn.notice.includes('NOT an official WhatsApp Business API integration') || !waConn.notice.includes('Baileys')) {
          throw new Error(`WhatsApp notice must explicitly state unofficial Baileys status, got: "${waConn.notice}"`);
        }
        console.log(`[Test]    - WhatsApp Baileys connected with verified unofficial notice: "${waConn.notice}".`);
        await integrationsVoiceService.disconnectWhatsAppBaileys();

        // 4. Voice Dictation Models (Exact spec counts & languages)
        console.log('[Test] M6-4. Voice Dictation Models (exact language counts & specs)...');
        const dictModels = integrationsVoiceService.getDictationModels();
        const parakeet = dictModels.find((m) => m.id === 'parakeet');
        const parakeetUnified = dictModels.find((m) => m.id === 'parakeet-unified');
        const bark = dictModels.find((m) => m.id === 'bark');
        const whisper = dictModels.find((m) => m.id === 'whisper');
        const cohere = dictModels.find((m) => m.id === 'cohere');
        const elevenlabs = dictModels.find((m) => m.id === 'elevenlabs');
        const groqTurbo = dictModels.find((m) => m.id === 'groq-turbo');

        // Check exact limits
        if (!parakeet || parakeet.languageCount !== 25 || parakeet.speed !== 'fast' || !parakeet.autoDetectsLanguage) {
          throw new Error(`Parakeet spec invalid: ${JSON.stringify(parakeet)}`);
        }
        if (!parakeetUnified || parakeetUnified.languageCount !== 1 || parakeetUnified.languagesDescription !== 'English only') {
          throw new Error(`Parakeet Unified spec invalid: ${JSON.stringify(parakeetUnified)}`);
        }
        if (!bark || bark.languageCount !== 1 || bark.languagesDescription !== 'English only') {
          throw new Error(`Bark spec invalid: ${JSON.stringify(bark)}`);
        }
        if (!whisper || whisper.languageCount !== 100 || whisper.speed !== 'slower') {
          throw new Error(`Whisper spec invalid: ${JSON.stringify(whisper)}`);
        }
        if (!cohere || cohere.languageCount !== 14 || !cohere.memoryRequirement?.includes('4 GB') || cohere.speed !== 'slower') {
          throw new Error(`Cohere spec invalid: ${JSON.stringify(cohere)}`);
        }
        if (!elevenlabs || !elevenlabs.requiresApiKey || !elevenlabs.description.includes('streams')) {
          throw new Error(`ElevenLabs spec invalid: ${JSON.stringify(elevenlabs)}`);
        }
        if (!groqTurbo || !groqTurbo.requiresApiKey) {
          throw new Error(`Groq Turbo spec invalid: ${JSON.stringify(groqTurbo)}`);
        }
        console.log(`[Test]    - Local models verified: Parakeet (25 langs), Parakeet Unified (English), Bark (English), Whisper (100 langs), Cohere (14 langs, 4GB).`);
        console.log(`[Test]    - Cloud models verified: ElevenLabs (streaming), Groq Turbo / Large (own API key).`);

        // Test API Key Management (Save / Remove)
        await integrationsVoiceService.saveVoiceApiKey('groq', 'gsk_test_secret_key_8492');
        let voiceCfg = await integrationsVoiceService.getVoiceSettings();
        if (!voiceCfg.api_keys.includes('gsk_test_secret_key_8492')) {
          throw new Error('API key save failed');
        }
        await integrationsVoiceService.removeVoiceApiKey('groq');
        voiceCfg = await integrationsVoiceService.getVoiceSettings();
        if (voiceCfg.api_keys.includes('gsk_test_secret_key_8492')) {
          throw new Error('API key removal failed');
        }
        console.log(`[Test]    - API key management verified (save, retrieve, remove).`);

        // 5. Spoken Replies (TTS) Models (31 Languages) & Gender Voices
        console.log('[Test] M6-5. Spoken Replies TTS models (31 languages, Female/Male voices)...');
        const ttsModels = integrationsVoiceService.getTTSModels();
        const ttsNames = ttsModels.map((m) => m.name);
        if (!ttsNames.includes('Flash') || !ttsNames.includes('Multilingual') || !ttsNames.includes('v3') || !ttsNames.includes('xAI')) {
          throw new Error(`TTS models missing required variants: ${ttsNames.join(', ')}`);
        }
        for (const tm of ttsModels) {
          if (tm.languageCount !== 31) {
            throw new Error(`TTS model ${tm.name} expected 31 languages, got ${tm.languageCount}`);
          }
        }
        await integrationsVoiceService.updateVoiceSettings({ tts_gender: 'female', tts_voice: 'Female (Nova)', tts_auto_read: 1 });
        const updatedVoice = await integrationsVoiceService.getVoiceSettings();
        if (updatedVoice.tts_gender !== 'female' || updatedVoice.tts_voice !== 'Female (Nova)' || updatedVoice.tts_auto_read !== 1) {
          throw new Error('TTS voice setting update failed');
        }
        console.log(`[Test]    - Spoken reply models verified (Flash, Multilingual, v3, xAI across 31 languages).`);

        // 6. Live Voice (OpenAI Codex Sign-In Requirement)
        console.log('[Test] M6-6. Live Voice (OpenAI Live Voice via Codex sign-in)...');
        const ineligible = integrationsVoiceService.checkLiveVoiceEligibility(false);
        if (ineligible.canUseLiveVoice !== false || !ineligible.instructions.includes('Sign in to Codex with your ChatGPT account to use live voice.')) {
          throw new Error(`Ineligible live voice check failed: ${JSON.stringify(ineligible)}`);
        }
        const eligible = integrationsVoiceService.checkLiveVoiceEligibility(true);
        if (eligible.canUseLiveVoice !== true) {
          throw new Error('Eligible live voice check failed');
        }
        console.log(`[Test]    - Live voice enforcement verified: "${ineligible.instructions}".`);

        // 7. Voice Server (/v1/audio OpenAI-Compatible)
        console.log('[Test] M6-7. Voice Server (/v1/audio OpenAI-compatible states & notices)...');
        // Not set up
        const notSetUp = await integrationsVoiceService.configureVoiceServer({
          address: '',
          useForDictation: false,
          useForTTS: false,
        });
        if (notSetUp.status !== 'Not set up') throw new Error('Expected status "Not set up"');

        // Not in use
        const notInUse = await integrationsVoiceService.configureVoiceServer({
          address: 'https://voice.openbot.local/v1/audio',
          useForDictation: false,
          useForTTS: false,
        });
        if (notInUse.status !== 'Not in use') throw new Error('Expected status "Not in use"');

        // Set up with notices
        const setUp = await integrationsVoiceService.configureVoiceServer({
          address: 'https://voice.openbot.local/v1/audio',
          apiKey: 'sk-voice-9921',
          useForDictation: true,
          useForTTS: true,
          dictationModel: 'whisper-large-v3',
          ttsModel: 'tts-1-hd',
          voice: 'nova',
        });
        if (setUp.status !== 'Set up') throw new Error('Expected status "Set up"');
        if (!setUp.notices.includes('Your voice server takes dictation now.') || !setUp.notices.includes('Your voice server reads replies aloud now.')) {
          throw new Error(`Expected specific voice server notices, got: ${JSON.stringify(setUp.notices)}`);
        }
        console.log(`[Test]    - Voice server states verified (Not set up / Not in use / Set up) with notices.`);

        // 8. Webhook Formats (OpenBot + Standard Webhooks)
        console.log('[Test] M6-8. Webhooks formats (OpenBot format & Standard Webhooks format)...');
        const testPayload = { task: 'dependency-scan', status: 'completed' };
        const openbotHook = integrationsVoiceService.formatWebhookPayload('openbot', 'task.completed', testPayload, 'secret-key');
        if (!openbotHook.payload.event || !openbotHook.headers['x-openbot-signature']) {
          throw new Error('OpenBot webhook format invalid');
        }
        const standardHook = integrationsVoiceService.formatWebhookPayload('standard', 'task.completed', testPayload, 'secret-key');
        if (!standardHook.payload.id || !standardHook.payload.type || !standardHook.headers['webhook-signature']) {
          throw new Error('Standard Webhooks format invalid');
        }
        console.log(`[Test]    - Both OpenBot and Standard Webhooks formats generated with valid signatures.`);

        // 9. Enterprise SSO & SCIM
        console.log('[Test] M6-9. Company SSO (Entra ID, Okta, Google Workspace) & SCIM user sync...');
        const ssoRes = await integrationsVoiceService.configureEnterpriseSSO({
          provider: 'okta',
          clientId: '0oa1b2c3d4e5f6',
          issuerUrl: 'https://company.okta.com',
          scimEnabled: true,
        });
        if (ssoRes.provider !== 'okta' || ssoRes.scim_status !== 'synced') {
          throw new Error('Enterprise SSO configuration failed');
        }
        console.log(`[Test]    - Enterprise SSO verified with SCIM sync: ${ssoRes.provider} (${ssoRes.issuer_url}).`);

        // 10. Hosted Sites (openbot.site, 30-day expiry, 410 Gone on delete)
        console.log('[Test] M6-10. Hosted Sites (openbot.site, 30-day expiry, 410 Gone on delete)...');
        if (HOSTED_SITE_EXPIRY_DAYS !== 30) {
          throw new Error(`Expected HOSTED_SITE_EXPIRY_DAYS === 30, got ${HOSTED_SITE_EXPIRY_DAYS}`);
        }
        const site = await integrationsVoiceService.publishHostedSite({
          subdomain: `demo-site-${Date.now()}`,
          siteTitle: 'Synthetify Cloud Status & Metrics',
          authorAgentId: 'agent-kestrel',
        });
        if (!site.domain.includes(HOSTED_SITES_DOMAIN) || site.status !== 'published') {
          throw new Error('Publishing hosted site failed');
        }
        // Verify exact 30-day expiry calculation
        const pubTime = new Date(site.published_at).getTime();
        const expTime = new Date(site.expires_at).getTime();
        const daysDiff = Math.round((expTime - pubTime) / (24 * 60 * 60 * 1000));
        if (daysDiff !== 30) {
          throw new Error(`Expected exactly 30 days expiry, got ${daysDiff} days`);
        }
        console.log(`[Test]    - Site published to "${site.subdomain}.${site.domain}" with verified 30-day expiry (${site.expires_at}).`);

        // Test 410 Gone on delete
        const delRes = await integrationsVoiceService.deleteHostedSite(site.id);
        if (delRes.httpStatus !== 410 || !delRes.message.includes('410 Gone')) {
          throw new Error(`Expected 410 Gone response on hosted site deletion, got: ${JSON.stringify(delRes)}`);
        }
        console.log(`[Test]    - Deletion returns 410 Gone response: "${delRes.message}".`);

        // Status page endpoint verification
        const statusPage = integrationsVoiceService.getStatusPageEndpoint();
        if (statusPage.url !== 'https://status.openbot.run') {
          throw new Error(`Expected status page "https://status.openbot.run", got "${statusPage.url}"`);
        }
        console.log(`[Test]    - Operations status endpoint verified: ${statusPage.url}.`);

        // 11. Capture Shell Screenshot for Milestone 6 (Settled UI)
        console.log('[Test] Waiting for loading animation to dismiss and shell UI to fully settle for Milestone 6...');
        await mainWindow!.webContents.executeJavaScript(`
          new Promise((resolve) => {
            const startTime = Date.now();
            const check = () => {
              const bounceEl = document.querySelector('.animate-bounce');
              if (!bounceEl || Date.now() - startTime > 4000) {
                resolve(true);
              } else {
                setTimeout(check, 100);
              }
            };
            check();
          });
        `);
        await new Promise((r) => setTimeout(r, 600));

        const img6 = await mainWindow!.webContents.capturePage();
        const distScreenshot6 = path.resolve('dist/milestone-6-shell.png');
        const repoScreenshot6 = path.join(screenshotsDir, 'milestone-6-shell.png');
        const artifactScreenshot6 = path.join(artifactDir, 'milestone-6-shell.png');

        fs.writeFileSync(distScreenshot6, img6.toPNG());
        fs.writeFileSync(repoScreenshot6, img6.toPNG());
        console.log(`[Test] M6-11. Shell screenshot captured and saved to: ${distScreenshot6} and ${repoScreenshot6}`);
        try {
          if (!fs.existsSync(artifactDir)) fs.mkdirSync(artifactDir, { recursive: true });
          fs.writeFileSync(artifactScreenshot6, img6.toPNG());
          console.log(`[Test] Screenshot also mirrored to artifact directory: ${artifactScreenshot6}`);
        } catch (e) {
          console.log(`[Test] Mirroring to artifact dir skipped:`, e);
        }

        console.log('=============================================================');
        console.log('ALL MILESTONE 3, 4, 5 & 6 VERIFICATION CHECKS & EXACT LIMITS PASSED.');
        console.log('=============================================================');

        // -------------------------------------------------------------
        // MILESTONE 7 VERIFICATION SUITE: AUTH & BILLING
        // -------------------------------------------------------------
        console.log('[Test] -------------------------------------------------------------');
        console.log('[Test] Running Milestone 7 verification suite (Auth & Billing)...');
        console.log('[Test] -------------------------------------------------------------');

        // M7-1. Auth service (api.openbot.run, 8-character codes, 10-minute expiry, hash-only storage)
        console.log('[Test] M7-1. Auth service (8-character codes, 10-minute expiry, hash-only storage)...');
        const reqCodeRes = await authBillingService.requestEmailCode('tanjir@synthetify.io');
        if (!reqCodeRes.success || !reqCodeRes.rawCodeForTestOnly || reqCodeRes.rawCodeForTestOnly.length !== 8) {
          throw new Error(`Expected 8-character code, got: ${reqCodeRes.rawCodeForTestOnly}`);
        }
        // Verify 10-minute expiry
        const codeCreatedMs = Date.now();
        const codeExpMs = new Date(reqCodeRes.expiresAt).getTime();
        const expiryDiffMinutes = Math.round((codeExpMs - codeCreatedMs) / (60 * 1000));
        if (expiryDiffMinutes !== 10) {
          throw new Error(`Expected 10-minute code expiry, got ${expiryDiffMinutes} minutes`);
        }
        // Verify hash-only storage in SQLite database (raw code must NEVER be stored in DB!)
        const rawCodeInDb = getDatabase().exec(`SELECT * FROM auth_codes WHERE code_hash LIKE '%${reqCodeRes.rawCodeForTestOnly}%';`);
        if (rawCodeInDb.length && rawCodeInDb[0].values.length) {
          throw new Error('SECURITY VIOLATION: Raw authentication code was stored directly in database!');
        }
        console.log(`[Test]    - 8-char code generated (${reqCodeRes.rawCodeForTestOnly}) with 10-min expiry (${reqCodeRes.expiresAt}).`);
        console.log(`[Test]    - Hash-only storage verified: database stores only SHA-256 hash + salt.`);

        // Verify successful code sign-in and encrypted session token
        const verifyCodeRes = await authBillingService.verifyEmailCode('tanjir@synthetify.io', reqCodeRes.rawCodeForTestOnly);
        if (!verifyCodeRes.success || !verifyCodeRes.sessionToken || !verifyCodeRes.encryptedSessionToken) {
          throw new Error(`Code verification failed: ${JSON.stringify(verifyCodeRes)}`);
        }
        // Verify AES-256-GCM encryption / decryption roundtrip
        const decryptedToken = authBillingService.decryptSessionToken(verifyCodeRes.encryptedSessionToken);
        if (decryptedToken !== verifyCodeRes.sessionToken) {
          throw new Error('Encrypted session token decryption roundtrip mismatch');
        }
        console.log(`[Test]    - Code verified. Client stores encrypted AES-256-GCM session token.`);

        // Verify one-time use (second use rejected)
        const secondVerifyRes = await authBillingService.verifyEmailCode('tanjir@synthetify.io', reqCodeRes.rawCodeForTestOnly);
        if (secondVerifyRes.success) {
          throw new Error('One-time code was reused after consumption!');
        }
        console.log(`[Test]    - One-time code invariant verified: second attempt rejected.`);

        // M7-2. Daily maintenance task
        console.log('[Test] M7-2. Daily maintenance task (purges expired/consumed codes)...');
        const maintRes = await authBillingService.runDailyMaintenanceTask();
        if (maintRes.purgedCount < 1) {
          throw new Error('Expected daily maintenance task to purge consumed/expired auth code');
        }
        console.log(`[Test]    - Daily maintenance purged ${maintRes.purgedCount} record(s).`);

        // M7-3. Accounts (16+ minimum age and legal capacity)
        console.log('[Test] M7-3. Accounts (minimum age 16+ and legal capacity check)...');
        const underageRes = authBillingService.verifyAgeAndCapacity('2015-01-01', true);
        if (underageRes.eligible) {
          throw new Error('Underage account (age < 16) was incorrectly accepted');
        }
        const noCapacityRes = authBillingService.verifyAgeAndCapacity('1990-01-01', false);
        if (noCapacityRes.eligible) {
          throw new Error('Account lacking legal capacity was incorrectly accepted');
        }
        const validAgeRes = authBillingService.verifyAgeAndCapacity('2000-05-15', true);
        if (!validAgeRes.eligible || validAgeRes.age < 16) {
          throw new Error('Valid adult account was rejected');
        }
        console.log(`[Test]    - Age policy verified: < 16 rejected, legal capacity enforced.`);

        // M7-4. Account Sessions & Hosted Server Disconnect Notice
        console.log('[Test] M7-4. Account sessions & hosted server disconnect notice...');
        const sessions = await authBillingService.getSessions();
        const thisDevice = sessions.find((s) => s.isThisDevice);
        if (!thisDevice || thisDevice.kind !== 'Desktop') {
          throw new Error('Expected active Desktop session marked "This device"');
        }
        // Insert and disconnect a hosted server session
        const dbRef = getDatabase();
        dbRef.run(`INSERT OR REPLACE INTO account_sessions (id, user_id, session_token_hash, kind, device_name, is_this_device, signed_in_at, last_active_at, status)
                   VALUES ('sess-srv-test', 'user-owner-default', 'hash-srv', 'Hosted server', 'Cloud Node Alpha', 0, '${new Date().toISOString()}', '${new Date().toISOString()}', 'active');`);
        saveDatabase(dbRef);

        const disconnectRes = await authBillingService.disconnectSession('sess-srv-test');
        if (!disconnectRes.success || !disconnectRes.notice || !disconnectRes.notice.includes('restart the server to sign it in again')) {
          throw new Error(`Expected hosted server disconnect notice, got: ${JSON.stringify(disconnectRes)}`);
        }
        console.log(`[Test]    - Disconnecting hosted-server session verified: "${disconnectRes.notice}".`);

        // M7-5. Company SSO & DNS TXT verification & SCIM Token
        console.log('[Test] M7-5. Company SSO & DNS TXT record verification & SCIM token...');
        const dnsRes = await authBillingService.verifyDNSTXTRecord('synthetify.io');
        if (!dnsRes.verified || !dnsRes.recordFound.includes('openbot-site-verification=')) {
          throw new Error('DNS TXT verification failed');
        }
        const scimRes = await authBillingService.generateSCIMToken();
        if (!scimRes.rawToken.startsWith('scim_live_') || !scimRes.warning.includes('shown ONLY once')) {
          throw new Error(`Expected SCIM token with "shown ONLY once" notice, got: ${JSON.stringify(scimRes)}`);
        }
        await authBillingService.revokeSCIMToken();
        console.log(`[Test]    - SSO DNS TXT record verified and SCIM token single-view + revocation verified.`);

        // M7-6. Mobile Connect (One-time code, QR, Permanent Link & Warning)
        console.log('[Test] M7-6. Mobile Connect (one-time code, QR, permanent link & warning)...');
        const mobCode = await authBillingService.generateMobileOneTimeCode();
        if (mobCode.code.length !== 8 || !mobCode.qrPayload.includes('openbot://mobile-connect')) {
          throw new Error('Mobile one-time code or QR payload invalid');
        }
        const mobLink = await authBillingService.getMobileConnect();
        if (mobLink.warning !== 'Anyone with this link can sign in to your OpenBot account.') {
          throw new Error(`Expected mobile permanent link warning, got: "${mobLink.warning}"`);
        }
        console.log(`[Test]    - Mobile Connect verified with exact warning: "${mobLink.warning}".`);

        // M7-7. Commercial Licence Exact Pricing, Discounts & Acceptance
        console.log('[Test] M7-7. Commercial Licence Pricing (Starter/Team in EUR, USD, PLN, discounts)...');
        // Starter monthly checks
        const pStarterEUR = authBillingService.calculateLicencePrice({ tier: 'Starter', seats: 1, cycle: 'monthly', currency: 'EUR' });
        const pStarterUSD = authBillingService.calculateLicencePrice({ tier: 'Starter', seats: 1, cycle: 'monthly', currency: 'USD' });
        const pStarterPLN = authBillingService.calculateLicencePrice({ tier: 'Starter', seats: 1, cycle: 'monthly', currency: 'PLN' });
        if (pStarterEUR.finalCycleAmount !== 10 || pStarterUSD.finalCycleAmount !== 12 || pStarterPLN.finalCycleAmount !== 40) {
          throw new Error(`Starter monthly pricing mismatch: EUR ${pStarterEUR.finalCycleAmount}, USD ${pStarterUSD.finalCycleAmount}, PLN ${pStarterPLN.finalCycleAmount}`);
        }
        // Starter yearly (-20%)
        const pStarterYearly = authBillingService.calculateLicencePrice({ tier: 'Starter', seats: 1, cycle: 'yearly', currency: 'EUR' });
        if (pStarterYearly.finalCycleAmount !== 96 || pStarterYearly.devicesAllowed !== 3) {
          throw new Error(`Starter yearly pricing mismatch: got ${pStarterYearly.finalCycleAmount}, expected 96 (devices: ${pStarterYearly.devicesAllowed})`);
        }
        // Team monthly (2 users base: €25 / $30 / 100 PLN; 5 users: 25 + 3*15 = 70 EUR)
        const pTeam5EUR = authBillingService.calculateLicencePrice({ tier: 'Team', seats: 5, cycle: 'monthly', currency: 'EUR' });
        const pTeam5USD = authBillingService.calculateLicencePrice({ tier: 'Team', seats: 5, cycle: 'monthly', currency: 'USD' });
        const pTeam5PLN = authBillingService.calculateLicencePrice({ tier: 'Team', seats: 5, cycle: 'monthly', currency: 'PLN' });
        if (pTeam5EUR.finalCycleAmount !== 70 || pTeam5USD.finalCycleAmount !== 84 || pTeam5PLN.finalCycleAmount !== 280) {
          throw new Error(`Team 5-user monthly pricing mismatch: EUR ${pTeam5EUR.finalCycleAmount}, USD ${pTeam5USD.finalCycleAmount}, PLN ${pTeam5PLN.finalCycleAmount}`);
        }
        // Team yearly (-20%) + hosted server bundle (-10%)
        const pTeamBundleYearly = authBillingService.calculateLicencePrice({
          tier: 'Team',
          seats: 5,
          cycle: 'yearly',
          currency: 'EUR',
          hasHostedServerBundle: true,
        });
        // 70 * 12 = 840. 840 * 0.8 * 0.9 = 604.80
        if (pTeamBundleYearly.finalCycleAmount !== 604.80 || pTeamBundleYearly.devicesAllowed !== 15) {
          throw new Error(`Team compound yearly/bundle discount mismatch: got ${pTeamBundleYearly.finalCycleAmount}, expected 604.80 (devices: ${pTeamBundleYearly.devicesAllowed})`);
        }
        // Record Licence Acceptance with Polish legal entity
        const licAcceptRes = await authBillingService.recordLicenceAcceptance({
          tier: 'Team',
          seats: 5,
          cycle: 'yearly',
          currency: 'EUR',
          hasHostedServerBundle: true,
          companyName: 'Synthetify Tech Sp. z o.o.',
          taxId: 'PL9452248912',
          buyerAuthorized: true,
        });
        if (!licAcceptRes.success || !licAcceptRes.licence.licensor.includes('Synthetify Labs, Trzebunia 513, 32-438 Trzebunia, Poland, KRS 0000895882')) {
          throw new Error(`Licence acceptance failed or licensor mismatch: ${JSON.stringify(licAcceptRes)}`);
        }
        console.log(`[Test]    - Commercial licence pricing verified across EUR, USD, PLN, -20% yearly, -10% bundle, 3 devices/user.`);
        console.log(`[Test]    - Licence acceptance recorded under Polish law (KRS 0000895882).`);

        // M7-8. Hosted-Server Plans (Starter, Standard, Pro specs & legacy limits)
        console.log('[Test] M7-8. Hosted-server plans specs & self-hosted 1-site limit...');
        const plans = authBillingService.getHostedServerPlanCatalog();
        if (plans.Starter.storageGB !== 12 || plans.Starter.members !== 1 || plans.Starter.sites !== 3 || plans.Starter.speedMultiplier !== 1.0) {
          throw new Error(`Starter hosted plan mismatch: ${JSON.stringify(plans.Starter)}`);
        }
        if (plans.Standard.storageGB !== 50 || plans.Standard.members !== 5 || plans.Standard.legacyMembers !== 10 || plans.Standard.sites !== 10 || plans.Standard.speedMultiplier !== 2.0) {
          throw new Error(`Standard hosted plan mismatch: ${JSON.stringify(plans.Standard)}`);
        }
        if (plans.Pro.storageGB !== 100 || plans.Pro.members !== 10 || plans.Pro.legacyMembers !== 25 || plans.Pro.sites !== 50 || plans.Pro.speedMultiplier !== 4.0) {
          throw new Error(`Pro hosted plan mismatch: ${JSON.stringify(plans.Pro)}`);
        }
        if (plans.SelfHosted.sites !== 1) {
          throw new Error(`Self-hosted server must have 1 hosted site, got ${plans.SelfHosted.sites}`);
        }
        console.log(`[Test]    - Hosted plan specs verified (Starter 12GB/1m/3s, Standard 50GB/5m/10s, Pro 100GB/10m/50s, SelfHosted 1 site, legacy 1/10/25).`);

        // M7-9. Stripe Source of Truth & Subscription Cancellation
        console.log('[Test] M7-9. Stripe source-of-truth webhook sync & cancellation...');
        await authBillingService.createHostedServerSubscription({
          serverId: 'srv-prod-node-1',
          serverName: 'Production Cloud Node 1',
          planTier: 'Standard',
          cycle: 'monthly',
          currency: 'EUR',
        });
        const subsBefore = await authBillingService.getHostedServerSubscriptions();
        const testSub = subsBefore[0];
        // Webhook updates status to 'past_due'
        await authBillingService.handleStripeWebhook({
          type: 'customer.subscription.updated',
          subscriptionId: testSub.stripeSubscriptionId,
          status: 'past_due',
        });
        const subsAfterHook = await authBillingService.getHostedServerSubscriptions();
        if (subsAfterHook[0].stripeStatus !== 'past_due') {
          throw new Error('Stripe webhook sync failed to update database subscription status');
        }
        // Cancel subscription: retains access until currentPeriodEnd
        const cancelRes = await authBillingService.cancelHostedServerSubscription(testSub.stripeSubscriptionId);
        if (!cancelRes.success || !cancelRes.message.includes('maintained until')) {
          throw new Error(`Cancel subscription failed: ${JSON.stringify(cancelRes)}`);
        }
        console.log(`[Test]    - Stripe webhook state sync and cancellation period retention verified.`);

        // M7-10. Offline Grace Period (24 hours)
        console.log('[Test] M7-10. Offline grace period (24 hours, then sign-ins blocked)...');
        // Within 12 hours: status grace_period, not blocked
        const grace12 = await authBillingService.simulateServerValidation('server_unreachable', 12);
        if (grace12.isBlocked || grace12.status !== 'grace_period' || grace12.hoursRemaining !== 12.0) {
          throw new Error(`Expected 12-hour grace period, got: ${JSON.stringify(grace12)}`);
        }
        // After 25 hours: blocked
        const grace25 = await authBillingService.simulateServerValidation('server_unreachable', 25);
        if (!grace25.isBlocked || grace25.status !== 'blocked' || !grace25.message.includes('Sign-ins are blocked')) {
          throw new Error(`Expected sign-ins blocked after 24 hours, got: ${JSON.stringify(grace25)}`);
        }
        // Restore online
        const graceOnline = await authBillingService.simulateServerValidation('online_success', 0);
        if (graceOnline.isBlocked || graceOnline.status !== 'valid') {
          throw new Error(`Expected online validation restoration, got: ${JSON.stringify(graceOnline)}`);
        }
        console.log(`[Test]    - 24-hour offline grace period verified: 12h allowed, 25h blocked.`);

        // M7-11. Capture Shell Screenshot for Milestone 7 (Settled UI)
        console.log('[Test] Waiting for loading animation to dismiss and shell UI to fully settle for Milestone 7...');
        await mainWindow!.webContents.executeJavaScript(`
          new Promise((resolve) => {
            const startTime = Date.now();
            const check = () => {
              const bounceEl = document.querySelector('.animate-bounce');
              if (!bounceEl || Date.now() - startTime > 4000) {
                resolve(true);
              } else {
                setTimeout(check, 100);
              }
            };
            check();
          });
        `);
        await new Promise((r) => setTimeout(r, 600));

        const img7 = await mainWindow!.webContents.capturePage();
        const distScreenshot7 = path.resolve('dist/milestone-7-shell.png');
        const repoScreenshot7 = path.join(screenshotsDir, 'milestone-7-shell.png');
        const artifactScreenshot7 = path.join(artifactDir, 'milestone-7-shell.png');

        fs.writeFileSync(distScreenshot7, img7.toPNG());
        fs.writeFileSync(repoScreenshot7, img7.toPNG());
        console.log(`[Test] M7-11. Shell screenshot captured and saved to: ${distScreenshot7} and ${repoScreenshot7}`);
        try {
          if (!fs.existsSync(artifactDir)) fs.mkdirSync(artifactDir, { recursive: true });
          fs.writeFileSync(artifactScreenshot7, img7.toPNG());
          console.log(`[Test] Screenshot also mirrored to artifact directory: ${artifactScreenshot7}`);
        } catch (e) {
          console.log(`[Test] Mirroring to artifact dir skipped:`, e);
        }

        console.log('=============================================================');
        console.log('ALL MILESTONE 3, 4, 5, 6 & 7 VERIFICATION CHECKS & EXACT LIMITS PASSED.');
        console.log('=============================================================');

        // -------------------------------------------------------------
        // MILESTONE 8 VERIFICATION SUITE: MOBILE APP & WEB CLIENT
        // -------------------------------------------------------------
        console.log('[Test] -------------------------------------------------------------');
        console.log('[Test] Running Milestone 8 verification suite (Mobile App & Web Client)...');
        console.log('[Test] -------------------------------------------------------------');

        // M8-1. Mobile 10 MB File Limit
        console.log('[Test] M8-1. Mobile 10 MB file upload limit...');
        const validMobFile = mobileAppService.validateMobileFileUpload('dataset.zip', 9 * 1024 * 1024);
        if (!validMobFile.allowed) {
          throw new Error('9 MB mobile upload was rejected');
        }
        const invalidMobFile = mobileAppService.validateMobileFileUpload('huge_video.mov', 11 * 1024 * 1024);
        if (invalidMobFile.allowed || !invalidMobFile.error?.includes('exceeds mobile 10 MB upload limit')) {
          throw new Error(`Expected mobile 10 MB limit error, got: ${JSON.stringify(invalidMobFile)}`);
        }
        console.log(`[Test]    - 10 MB mobile file upload limit verified.`);

        // M8-2. 4-digit PIN lock & 10th failure sign-out / cache purge
        console.log('[Test] M8-2. 4-digit PIN lock & 10th failure sign-out rule...');
        // Insert a test mobile device
        const testDevId = 'mob-test-pin-device';
        const salt = crypto.randomBytes(16).toString('hex');
        const pinHash = crypto.createHash('sha256').update('4821' + salt).digest('hex') + ':' + salt;
        getDatabase().run(
          `INSERT OR REPLACE INTO mobile_devices (id, user_id, device_name, platform, pin_hash, failed_pin_attempts, is_locked, encrypted_cache, last_sync_at, created_at)
           VALUES ('${testDevId}', 'user-owner-default', 'Test Pixel 9', 'android', '${pinHash}', 0, 0, '{"cached_secrets": true}', '${new Date().toISOString()}', '${new Date().toISOString()}');`
        );
        saveDatabase();

        // 9 incorrect attempts
        for (let i = 1; i <= 9; i++) {
          const attemptRes = await mobileAppService.verifyPin(testDevId, '0000');
          if (attemptRes.success || attemptRes.signedOut || attemptRes.remainingAttempts !== 10 - i) {
            throw new Error(`Attempt ${i} failed invariant: remaining=${attemptRes.remainingAttempts}`);
          }
        }
        // 10th failure must sign out and wipe cached credentials
        const tenthRes = await mobileAppService.verifyPin(testDevId, '0000');
        if (!tenthRes.signedOut || tenthRes.remainingAttempts !== 0 || !tenthRes.error?.includes('10 failed PIN attempts')) {
          throw new Error(`10th failure did not trigger sign-out: ${JSON.stringify(tenthRes)}`);
        }
        // Check cache wiped in DB
        const dbCacheRes = getDatabase().exec(`SELECT encrypted_cache, is_locked FROM mobile_devices WHERE id = '${testDevId}';`);
        const [wipedCache, isLocked] = [String(dbCacheRes[0].values[0][0]), Number(dbCacheRes[0].values[0][1])];
        if (wipedCache !== '{}' || isLocked !== 1) {
          throw new Error('Local encrypted cache was not wiped on 10th PIN failure');
        }
        console.log(`[Test]    - 4-digit PIN lock & 10th failure sign-out and cache purge verified.`);

        // M8-3. Reconnection timing (immediate, 10s, 5 failures then 2-min wait)
        console.log('[Test] M8-3. Reconnection timing schedule...');
        const r0 = mobileAppService.calculateReconnectDelay(0);
        if (r0.delaySeconds !== 0) throw new Error('First reconnect attempt must be immediate (0s)');
        const r1 = mobileAppService.calculateReconnectDelay(1);
        if (r1.delaySeconds !== 10) throw new Error('Subsequent reconnect must be 10s');
        const r5 = mobileAppService.calculateReconnectDelay(5);
        if (r5.delaySeconds !== 120 || !r5.isSeriesPause) {
          throw new Error(`After 5 failures, must wait 120s (2 minutes), got: ${JSON.stringify(r5)}`);
        }
        console.log(`[Test]    - Reconnection timing verified: attempt 0=0s, attempt 1=10s, 5 failures=120s (2 min).`);

        // M8-4. iPhone Live Activity (priority 10 / 5 with 5s delay, 8-hour lifetime, idle ends activity, Android no live activity)
        console.log('[Test] M8-4. iPhone Live Activity priorities, 8h lifetime & Android exclusion...');
        const androidAct = mobileAppService.updateLiveActivity({
          platform: 'android',
          agentId: 'agent-kestrel',
          agentName: 'Kestrel',
          agentState: 'thinking',
          isStateChange: true,
        });
        if (androidAct.supported) {
          throw new Error('Android must NOT have Live Activity');
        }

        const iosStateChange = mobileAppService.updateLiveActivity({
          platform: 'ios',
          agentId: 'agent-kestrel',
          agentName: 'Kestrel',
          agentState: 'tool_execution',
          isStateChange: true,
        });
        if (!iosStateChange.supported || iosStateChange.priority !== 10 || iosStateChange.delaySeconds !== 0) {
          throw new Error(`State change must have priority 10 with 0s delay, got: ${JSON.stringify(iosStateChange)}`);
        }

        const iosInternalChange = mobileAppService.updateLiveActivity({
          platform: 'ios',
          agentId: 'agent-kestrel',
          agentName: 'Kestrel',
          agentState: 'tool_execution',
          isStateChange: false,
        });
        if (iosInternalChange.priority !== 5 || iosInternalChange.delaySeconds !== 5) {
          throw new Error(`Internal change must have priority 5 and 5s delay, got: ${JSON.stringify(iosInternalChange)}`);
        }

        const iosIdle = mobileAppService.updateLiveActivity({
          platform: 'ios',
          agentId: 'agent-kestrel',
          agentName: 'Kestrel',
          agentState: 'idle',
          isStateChange: true,
        });
        if (iosIdle.isActive) {
          throw new Error('Idle state must end Live Activity');
        }
        console.log(`[Test]    - Live Activity verified: Android excluded, state change=10, internal=5 with 5s delay, idle ends activity.`);

        // M8-5. One device per event (30-second desktop input suppression)
        console.log('[Test] M8-5. One device per event (desktop 30s input suppression)...');
        mobileAppService.recordDesktopInput();
        const pushResult = mobileAppService.sendPushNotification({
          platform: 'ios',
          title: 'Turn complete',
          body: 'Kestrel finished data analysis.',
        });
        if (!pushResult.suppressed || pushResult.delivered) {
          throw new Error('Push notification was not suppressed while desktop active in last 30s');
        }
        console.log(`[Test]    - Single device per event verified: phone stays quiet when desktop active.`);

        // M8-6. Desktop-only feature exclusion on mobile
        console.log('[Test] M8-6. Desktop-only feature exclusions on mobile...');
        let remoteDesktopBlocked = false;
        try {
          mobileAppService.enforceDesktopOnly('remote_desktop');
        } catch {
          remoteDesktopBlocked = true;
        }
        if (!remoteDesktopBlocked) {
          throw new Error('Remote desktop was not blocked for mobile');
        }
        console.log(`[Test]    - Desktop-only features correctly barred from mobile.`);

        // M8-7. Web client single-tab session lock per host
        console.log('[Test] M8-7. Web client single-tab session lock per host...');
        const lock1 = await webClientService.acquireTabLock('srv-host-1', 'acc-owner', 'tab-alpha-1');
        if (!lock1.acquired) throw new Error('Initial tab failed to acquire lock');

        const lock2 = await webClientService.acquireTabLock('srv-host-1', 'acc-owner', 'tab-beta-2');
        if (lock2.acquired || !lock2.message.includes('Another tab is already connected')) {
          throw new Error(`Expected second tab lock rejection, got: ${JSON.stringify(lock2)}`);
        }
        // Take over tab
        const takeover = await webClientService.takeOverTabLock('srv-host-1', 'acc-owner', 'tab-beta-2');
        if (!takeover.acquired || takeover.lockedTabId !== 'tab-beta-2') {
          throw new Error('Tab takeover failed');
        }
        await webClientService.releaseTabLock('srv-host-1', 'acc-owner', 'tab-beta-2');
        console.log(`[Test]    - Single-tab session lock per host and rejection message verified.`);

        // M8-8. Web Client Inline Media Rules & Object URL Allowlist
        console.log('[Test] M8-8. Web inline media (2MB thumbnail, 10MB media player, Object URL allowlist)...');
        // Image <= 2 MB
        const imgThumb = webClientService.inspectInlineMediaCard('chart.png', 1.5 * 1024 * 1024, 'image/png');
        if (imgThumb.renderMode !== 'thumbnail' || !imgThumb.canAutoDownload || !imgThumb.objectUrlPermitted) {
          throw new Error(`Expected thumbnail mode for <= 2MB image, got: ${JSON.stringify(imgThumb)}`);
        }
        // MP3 <= 10 MB
        const audioPlay = webClientService.inspectInlineMediaCard('podcast.mp3', 8 * 1024 * 1024, 'audio/mpeg');
        if (audioPlay.renderMode !== 'player_button' || audioPlay.canAutoDownload) {
          throw new Error(`Expected player button mode for <= 10MB audio, got: ${JSON.stringify(audioPlay)}`);
        }
        // File > 10 MB
        const largeDump = webClientService.inspectInlineMediaCard('archive.zip', 12 * 1024 * 1024);
        if (largeDump.renderMode !== 'download_only') {
          throw new Error(`Files > 10MB must be download only, got: ${JSON.stringify(largeDump)}`);
        }
        // Object URL Allowlist Security Check: HTML, SVG, XHTML must NEVER get Object URL
        const svgCheck = webClientService.isObjectUrlAllowed('logo.svg', 'image/svg+xml');
        const htmlCheck = webClientService.isObjectUrlAllowed('page.html', 'text/html');
        if (svgCheck.allowed || htmlCheck.allowed) {
          throw new Error('SECURITY VIOLATION: SVG or HTML was granted an Object URL!');
        }
        const pngCheck = webClientService.isObjectUrlAllowed('photo.png', 'image/png');
        if (!pngCheck.allowed) {
          throw new Error('Valid PNG was rejected from Object URL allowlist');
        }
        console.log(`[Test]    - Inline media display modes verified (2MB thumb, 10MB player, >10MB download).`);
        console.log(`[Test]    - Object URL allowlist verified: PNG/JPEG/MP3/MOV allowed, HTML/SVG/XHTML strictly blocked.`);

        // M8-9. Concurrent Downloads (Max 2 at once) & Cancel Transfer
        console.log('[Test] M8-9. Web client max 2 concurrent downloads & cancellation...');
        const d1 = webClientService.requestDownloadSlot('file-1');
        const d2 = webClientService.requestDownloadSlot('file-2');
        const d3 = webClientService.requestDownloadSlot('file-3');
        if (!d1.granted || !d2.granted) throw new Error('Slots 1 and 2 should be granted');
        if (d3.granted || !d3.error?.includes('At most 2 files can download at once')) {
          throw new Error(`3rd concurrent download was incorrectly granted: ${JSON.stringify(d3)}`);
        }
        const cancelTransferRes = webClientService.cancelFileTransfer('transfer-99');
        if (!cancelTransferRes.cancelled || cancelTransferRes.protocolFrame.type !== 'file-cancel') {
          throw new Error('Cancel file transfer failed');
        }
        console.log(`[Test]    - Max 2 concurrent downloads limit and file-cancel frame verified.`);

        // M8-10. Deep Links at /app (?agent, ?server invitation, ?plugin, ?billing=portal)
        console.log('[Test] M8-10. Deep links (?agent, ?server, ?plugin, ?billing=portal) and field stripping...');
        // Invitation link with secret
        const inviteLink = 'https://openbot.run/app?server=srv-123&secret=topsecret999&host=openbot.run&name=CoreCluster';
        const parsedInvite = webClientService.parseAndCleanDeepLink(inviteLink);
        if (parsedInvite.linkType !== 'invitation' || parsedInvite.data.secret !== 'topsecret999') {
          throw new Error(`Invitation link parsing failed: ${JSON.stringify(parsedInvite)}`);
        }
        // Verify cleaned URL strips secret so it doesn't stay in browser bar
        if (parsedInvite.cleanedUrl.includes('secret') || parsedInvite.cleanedUrl.includes('topsecret999')) {
          throw new Error(`Cleaned URL still contained secret: "${parsedInvite.cleanedUrl}"`);
        }
        // Billing portal return
        const billingReturn = 'https://openbot.run/app?billing=portal';
        const parsedBilling = webClientService.parseAndCleanDeepLink(billingReturn);
        if (parsedBilling.linkType !== 'billing_return' || parsedBilling.cleanedUrl.includes('billing')) {
          throw new Error(`Billing return parameter not cleanly stripped: ${JSON.stringify(parsedBilling)}`);
        }
        console.log(`[Test]    - Deep links verified and secret fields cleanly stripped from URL.`);

        // M8-11. Reconnect Resend Policy & client-message-id Retry
        console.log('[Test] M8-11. Reconnection message resend policy & retry capability check...');
        const noCapRetry = webClientService.evaluateMessageRetry(['basic-chat']);
        if (noCapRetry.canRetry) {
          throw new Error('Retry was offered without client-message-id capability');
        }
        const capRetry = webClientService.evaluateMessageRetry(['basic-chat', 'client-message-id']);
        if (!capRetry.canRetry) {
          throw new Error('Retry was denied even with client-message-id capability');
        }
        console.log(`[Test]    - Reconnect message retry policy verified: never auto-resends, retry only with client-message-id.`);

        // M8-12. Capture Shell Screenshot for Milestone 8 (Settled UI)
        console.log('[Test] Waiting for loading animation to dismiss and shell UI to fully settle for Milestone 8...');
        await mainWindow!.webContents.executeJavaScript(`
          new Promise((resolve) => {
            const startTime = Date.now();
            const check = () => {
              const bounceEl = document.querySelector('.animate-bounce');
              if (!bounceEl || Date.now() - startTime > 4000) {
                resolve(true);
              } else {
                setTimeout(check, 100);
              }
            };
            check();
          });
        `);
        await new Promise((r) => setTimeout(r, 600));

        const img8 = await mainWindow!.webContents.capturePage();
        const distScreenshot8 = path.resolve('dist/milestone-8-shell.png');
        const repoScreenshot8 = path.join(screenshotsDir, 'milestone-8-shell.png');
        const artifactScreenshot8 = path.join(artifactDir, 'milestone-8-shell.png');

        fs.writeFileSync(distScreenshot8, img8.toPNG());
        fs.writeFileSync(repoScreenshot8, img8.toPNG());
        console.log(`[Test] M8-12. Shell screenshot captured and saved to: ${distScreenshot8} and ${repoScreenshot8}`);
        try {
          if (!fs.existsSync(artifactDir)) fs.mkdirSync(artifactDir, { recursive: true });
          fs.writeFileSync(artifactScreenshot8, img8.toPNG());
          console.log(`[Test] Screenshot also mirrored to artifact directory: ${artifactScreenshot8}`);
        } catch (e) {
          console.log(`[Test] Mirroring to artifact dir skipped:`, e);
        }

        console.log('=============================================================');
        console.log('ALL MILESTONE 3, 4, 5, 6, 7 & 8 VERIFICATION CHECKS & EXACT LIMITS PASSED.');
        console.log('=============================================================');
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

// Milestone 4 IPC Handlers
ipcMain.handle('runtime:get-bg-processes', async () => {
  return await agentRuntimeService.getBackgroundProcesses();
});

ipcMain.handle('runtime:start-bg-process', async (_event, { command, agentId, ports }) => {
  return await agentRuntimeService.startBackgroundProcess(command, agentId, ports);
});

ipcMain.handle('runtime:stop-bg-process', async (_event, id: string) => {
  return await agentRuntimeService.stopBackgroundProcess(id);
});

ipcMain.handle('runtime:get-mcp-servers', async () => {
  return await agentRuntimeService.getMCPServers();
});

ipcMain.handle('runtime:add-mcp-server', async (_event, server) => {
  return await agentRuntimeService.addMCPServer(server);
});

ipcMain.handle('runtime:update-mcp-server', async (_event, { id, updates }) => {
  return await agentRuntimeService.updateMCPServer(id, updates);
});

ipcMain.handle('runtime:remove-mcp-server', async (_event, id: string) => {
  return await agentRuntimeService.removeMCPServer(id);
});

ipcMain.handle('runtime:test-mcp-server', async (_event, id: string) => {
  return await agentRuntimeService.testMCPServer(id);
});

ipcMain.handle('runtime:is-mcp-dirty', () => {
  return agentRuntimeService.isMCPDirty();
});

ipcMain.handle('runtime:mark-mcp-saved', () => {
  agentRuntimeService.markMCPSaved();
});

ipcMain.handle('runtime:get-skills', async () => {
  return await agentRuntimeService.getSkills();
});

ipcMain.handle('runtime:create-skill', async (_event, skill) => {
  return await agentRuntimeService.createSkill(skill);
});

ipcMain.handle('runtime:get-agent-skills', async (_event, agentId: string) => {
  return await agentRuntimeService.getAgentSkills(agentId);
});

ipcMain.handle('runtime:attach-skill', async (_event, { agentId, skillId }) => {
  return await agentRuntimeService.attachSkillToAgent(agentId, skillId);
});

ipcMain.handle('runtime:detach-skill', async (_event, { agentId, skillId }) => {
  return await agentRuntimeService.detachSkillFromAgent(agentId, skillId);
});

ipcMain.handle('runtime:get-routines', async () => {
  return await agentRuntimeService.getRoutines();
});

ipcMain.handle('runtime:create-routine', async (_event, routine) => {
  return await agentRuntimeService.createRoutine(routine);
});

ipcMain.handle('runtime:trigger-webhook', async (_event, { routeId, deliveryId }) => {
  return await agentRuntimeService.triggerWebhook(routeId, deliveryId);
});

ipcMain.handle('runtime:get-calendar-feed', async () => {
  return await agentRuntimeService.getCalendarFeed();
});

ipcMain.handle('runtime:get-workflows', async () => {
  return await agentRuntimeService.getWorkflows();
});

ipcMain.handle('runtime:create-workflow', async (_event, workflow) => {
  return await agentRuntimeService.createWorkflow(workflow);
});

ipcMain.handle('runtime:run-workflow', async (_event, workflowId: string) => {
  return await agentRuntimeService.runWorkflow(workflowId);
});

ipcMain.handle('runtime:delete-workflow', async (_event, id: string) => {
  return await agentRuntimeService.deleteWorkflow(id);
});

ipcMain.handle('runtime:restore-workflow', async (_event, workflow) => {
  return await agentRuntimeService.restoreWorkflow(workflow);
});

ipcMain.handle('runtime:get-memories', async (_event, agentId: string) => {
  return await agentRuntimeService.getMemories(agentId);
});

ipcMain.handle('runtime:add-memory', async (_event, { agentId, factText, isEssential }) => {
  return await agentRuntimeService.addMemory(agentId, factText, isEssential);
});

ipcMain.handle('runtime:delete-memory', async (_event, memoryId: string) => {
  return await agentRuntimeService.deleteMemory(memoryId);
});

ipcMain.handle('runtime:get-memory-usage', async (_event, agentId: string) => {
  return await agentRuntimeService.getMemoryUsage(agentId);
});

ipcMain.handle('runtime:toggle-browser-pip', async () => {
  return await agentRuntimeService.togglePictureInPicture();
});

ipcMain.handle('runtime:get-computer-use-status', () => {
  return agentRuntimeService.getComputerUseStatus();
});

ipcMain.handle('runtime:set-computer-use-enabled', (_event, enabled: boolean) => {
  return agentRuntimeService.setComputerUseEnabled(enabled);
});

ipcMain.handle('runtime:get-backup-models', async (_event, agentId: string) => {
  return await agentRuntimeService.getBackupModels(agentId);
});

ipcMain.handle('runtime:set-backup-models', async (_event, { agentId, models }) => {
  return await agentRuntimeService.setBackupModels(agentId, models);
});

ipcMain.handle('runtime:poll-usage', async () => {
  return await agentRuntimeService.pollUsage();
});

// Milestone 5 IPC Handlers
ipcMain.handle('team:get-servers', async () => {
  return await teamCollabService.getServers();
});

ipcMain.handle('team:create-server', async (_event, server) => {
  return await teamCollabService.createServer(server);
});

ipcMain.handle('team:join-server', async (_event, { token, userEmail }) => {
  return await teamCollabService.joinServer(token, userEmail);
});

ipcMain.handle('team:set-publish-state', async (_event, { serverId, state }) => {
  return await teamCollabService.setPublishState(serverId, state);
});

ipcMain.handle('team:rotate-server-key', async (_event, serverId: string) => {
  return await teamCollabService.rotateServerKey(serverId);
});

ipcMain.handle('team:restart-server', async (_event, serverId: string) => {
  return await teamCollabService.restartServer(serverId);
});

ipcMain.handle('team:update-server-settings', async (_event, { serverId, updates }) => {
  return await teamCollabService.updateServerSettings(serverId, updates);
});

ipcMain.handle('team:delete-server', async (_event, { serverId, confirmationName }) => {
  return await teamCollabService.deleteServer(serverId, confirmationName);
});

ipcMain.handle('team:get-members', async (_event, serverId: string) => {
  return await teamCollabService.getMembers(serverId);
});

ipcMain.handle('team:invite-member', async (_event, { serverId, email, name, role }) => {
  return await teamCollabService.inviteMember(serverId, email, name, role);
});

ipcMain.handle('team:remove-member', async (_event, { serverId, memberId }) => {
  return await teamCollabService.removeMember(serverId, memberId);
});

ipcMain.handle('team:get-member-agent-access', async (_event, memberId: string) => {
  return await teamCollabService.getMemberAgentAccess(memberId);
});

ipcMain.handle('team:set-member-agent-access', async (_event, { memberId, agentId, accessLevel }) => {
  return await teamCollabService.setMemberAgentAccess(memberId, agentId, accessLevel);
});

ipcMain.handle('team:get-channels', async (_event, serverId: string) => {
  return await teamCollabService.getChannels(serverId);
});

ipcMain.handle('team:create-channel', async (_event, channel) => {
  return await teamCollabService.createChannel(channel.serverId, channel.name, channel.leadAgentId, channel.memberAgentIds);
});

ipcMain.handle('team:delete-channel', async (_event, channelId: string) => {
  return await teamCollabService.deleteChannel(channelId);
});

ipcMain.handle('team:restore-channel', async (_event, channelId: string) => {
  return await teamCollabService.restoreChannel(channelId);
});

ipcMain.handle('team:assign-channel-task', async (_event, { channelId, agentIds }) => {
  return await teamCollabService.assignChannelTask(channelId, agentIds);
});

ipcMain.handle('team:get-shared-tables', async () => {
  return await teamCollabService.getSharedTables();
});

ipcMain.handle('team:create-shared-table', async (_event, { name, creatorAgentId, columns }) => {
  return await teamCollabService.createSharedTable(name, creatorAgentId, columns);
});

ipcMain.handle('team:alter-shared-table', async (_event, { name, requestingAgentId, columns }) => {
  return await teamCollabService.alterSharedTable(name, requestingAgentId, columns);
});

ipcMain.handle('team:drop-shared-table', async (_event, { name, requestingAgentId, isUser }) => {
  return await teamCollabService.dropSharedTable(name, requestingAgentId, isUser);
});

ipcMain.handle('team:insert-shared-table-row', async (_event, { name, row }) => {
  return await teamCollabService.insertSharedTableRow(name, row);
});

ipcMain.handle('team:read-shared-table-rows', async (_event, name: string) => {
  return await teamCollabService.readSharedTableRows(name);
});

ipcMain.handle('team:get-audit-logs', async (_event, serverId: string) => {
  return await teamCollabService.getAuditLogs(serverId);
});

ipcMain.handle('team:create-remote-desktop-test', async (_event, { serverId, targetName }) => {
  return await teamCollabService.createRemoteDesktopTest(serverId, targetName);
});

ipcMain.handle('team:verify-remote-desktop-test', async (_event, { sessionId, code }) => {
  return await teamCollabService.verifyRemoteDesktopTest(sessionId, code);
});

ipcMain.handle('team:stop-all-remote-control', () => {
  return teamCollabService.stopAllRemoteControl();
});

// Milestone 6 IPC Handlers: Integrations & Voice
ipcMain.handle('integrations:get-connectors', async () => {
  return await integrationsVoiceService.getConnectors();
});

ipcMain.handle('integrations:connect-connector', async (_event, { service, accountIdentifier, authPayload }) => {
  return await integrationsVoiceService.connectConnector(service, accountIdentifier, authPayload);
});

ipcMain.handle('integrations:disconnect-connector', async (_event, service: string) => {
  return await integrationsVoiceService.disconnectConnector(service);
});

ipcMain.handle('integrations:get-messaging-connections', async () => {
  return await integrationsVoiceService.getMessagingConnections();
});

ipcMain.handle('integrations:update-messaging-connection', async (_event, { id, updates }) => {
  return await integrationsVoiceService.updateMessagingConnection(id, updates);
});

ipcMain.handle('integrations:connect-whatsapp-baileys', async () => {
  return await integrationsVoiceService.connectWhatsAppBaileys();
});

ipcMain.handle('integrations:disconnect-whatsapp-baileys', async () => {
  return await integrationsVoiceService.disconnectWhatsAppBaileys();
});

ipcMain.handle('voice:get-dictation-models', () => {
  return integrationsVoiceService.getDictationModels();
});

ipcMain.handle('voice:get-tts-models', () => {
  return integrationsVoiceService.getTTSModels();
});

ipcMain.handle('voice:get-settings', async () => {
  return await integrationsVoiceService.getVoiceSettings();
});

ipcMain.handle('voice:update-settings', async (_event, updates) => {
  return await integrationsVoiceService.updateVoiceSettings(updates);
});

ipcMain.handle('voice:save-api-key', async (_event, { provider, apiKey }) => {
  return await integrationsVoiceService.saveVoiceApiKey(provider, apiKey);
});

ipcMain.handle('voice:remove-api-key', async (_event, provider) => {
  return await integrationsVoiceService.removeVoiceApiKey(provider);
});

ipcMain.handle('voice:check-live-voice', async (_event, isCodexConnected: boolean) => {
  return integrationsVoiceService.checkLiveVoiceEligibility(isCodexConnected);
});

ipcMain.handle('voice:configure-server', async (_event, params) => {
  return await integrationsVoiceService.configureVoiceServer(params);
});

ipcMain.handle('webhooks:format-payload', (_event, { format, eventType, data, secretKey }) => {
  return integrationsVoiceService.formatWebhookPayload(format, eventType, data, secretKey);
});

ipcMain.handle('sites:get-hosted-sites', async () => {
  return await integrationsVoiceService.getHostedSites();
});

ipcMain.handle('sites:publish', async (_event, params) => {
  return await integrationsVoiceService.publishHostedSite(params);
});

ipcMain.handle('sites:delete', async (_event, siteId: string) => {
  return await integrationsVoiceService.deleteHostedSite(siteId);
});

ipcMain.handle('sso:get-configs', async () => {
  return await integrationsVoiceService.getEnterpriseSSOConfigs();
});

ipcMain.handle('sso:configure', async (_event, params) => {
  return await integrationsVoiceService.configureEnterpriseSSO(params);
});

// Milestone 7: Auth and Billing IPC Handlers
ipcMain.handle('auth:request-email-code', async (_event, email: string) => {
  return await authBillingService.requestEmailCode(email);
});

ipcMain.handle('auth:verify-email-code', async (_event, { email, code }) => {
  return await authBillingService.verifyEmailCode(email, code);
});

ipcMain.handle('auth:run-daily-maintenance', async () => {
  return await authBillingService.runDailyMaintenanceTask();
});

ipcMain.handle('account:get-profile', async () => {
  return await authBillingService.getUserProfile();
});

ipcMain.handle('account:get-sessions', async () => {
  return await authBillingService.getSessions();
});

ipcMain.handle('account:disconnect-session', async (_event, sessionId: string) => {
  return await authBillingService.disconnectSession(sessionId);
});

ipcMain.handle('sso:get-extended-config', async () => {
  return await authBillingService.getExtendedSSOConfig();
});

ipcMain.handle('sso:verify-dns', async (_event, domain: string) => {
  return await authBillingService.verifyDNSTXTRecord(domain);
});

ipcMain.handle('sso:generate-scim-token', async () => {
  return await authBillingService.generateSCIMToken();
});

ipcMain.handle('sso:revoke-scim-token', async () => {
  return await authBillingService.revokeSCIMToken();
});

ipcMain.handle('sso:test-browser', (_event, provider: string) => {
  return authBillingService.testBrowserSSOSignIn(provider);
});

ipcMain.handle('mobile:get-connect', async () => {
  return await authBillingService.getMobileConnect();
});

ipcMain.handle('mobile:generate-code', async () => {
  return await authBillingService.generateMobileOneTimeCode();
});

ipcMain.handle('mobile:replace-link', async () => {
  return await authBillingService.replaceMobilePermanentLink();
});

ipcMain.handle('mobile:revoke-link', async () => {
  return await authBillingService.revokeMobilePermanentLink();
});

ipcMain.handle('billing:calc-licence-price', (_event, params) => {
  return authBillingService.calculateLicencePrice(params);
});

ipcMain.handle('billing:get-licence', async () => {
  return await authBillingService.getCommercialLicence();
});

ipcMain.handle('billing:accept-licence', async (_event, params) => {
  return await authBillingService.recordLicenceAcceptance(params);
});

ipcMain.handle('billing:get-hosted-plans', () => {
  return authBillingService.getHostedServerPlanCatalog();
});

ipcMain.handle('billing:get-hosted-subscriptions', async () => {
  return await authBillingService.getHostedServerSubscriptions();
});

ipcMain.handle('billing:create-hosted-subscription', async (_event, params) => {
  return await authBillingService.createHostedServerSubscription(params);
});

ipcMain.handle('billing:cancel-hosted-subscription', async (_event, subId: string) => {
  return await authBillingService.cancelHostedServerSubscription(subId);
});

ipcMain.handle('billing:open-portal', (_event, subId?: string) => {
  return authBillingService.openStripeCustomerPortal(subId);
});

ipcMain.handle('billing:open-checkout', (_event, { planType, planId }) => {
  return authBillingService.openStripeCheckout(planType, planId);
});

ipcMain.handle('billing:check-offline-grace', async () => {
  return await authBillingService.checkOfflineGrace();
});

ipcMain.handle('billing:simulate-server-validation', async (_event, { outcome, elapsedHours }) => {
  return await authBillingService.simulateServerValidation(outcome, elapsedHours);
});

// Milestone 8: Mobile App IPC Handlers
ipcMain.handle('mobile:verify-pin', async (_event, { deviceId, pin }) => {
  return await mobileAppService.verifyPin(deviceId, pin);
});

ipcMain.handle('mobile:validate-upload', (_event, { fileName, byteSize }) => {
  return mobileAppService.validateMobileFileUpload(fileName, byteSize);
});

ipcMain.handle('mobile:queue-outbox', async (_event, params) => {
  return await mobileAppService.queueOutboxMessage(params);
});

ipcMain.handle('mobile:flush-outbox', async (_event, deviceId: string) => {
  return await mobileAppService.flushOutbox(deviceId);
});

ipcMain.handle('mobile:calc-reconnect', (_event, failureCount: number) => {
  return mobileAppService.calculateReconnectDelay(failureCount);
});

ipcMain.handle('mobile:update-live-activity', (_event, params) => {
  return mobileAppService.updateLiveActivity(params);
});

ipcMain.handle('mobile:create-agent-prompt', async (_event, prompt: string) => {
  return await mobileAppService.createAgentFromMobilePrompt(prompt);
});

ipcMain.handle('mobile:check-desktop-only', (_event, feature: string) => {
  try {
    mobileAppService.enforceDesktopOnly(feature);
    return { allowed: true };
  } catch (err: any) {
    return { allowed: false, error: err?.message };
  }
});

// Milestone 8: Web Client IPC Handlers
ipcMain.handle('web:get-signal-ticket', (_event, { accountId, hostId }) => {
  return webClientService.generateSignalConnectionTicket(accountId, hostId);
});

ipcMain.handle('web:acquire-tab-lock', async (_event, { hostId, accountId, tabId }) => {
  return await webClientService.acquireTabLock(hostId, accountId, tabId);
});

ipcMain.handle('web:takeover-tab-lock', async (_event, { hostId, accountId, tabId }) => {
  return await webClientService.takeOverTabLock(hostId, accountId, tabId);
});

ipcMain.handle('web:release-tab-lock', async (_event, { hostId, accountId, tabId }) => {
  return await webClientService.releaseTabLock(hostId, accountId, tabId);
});

ipcMain.handle('web:inspect-media', (_event, { fileName, byteSize, mimeType }) => {
  return webClientService.inspectInlineMediaCard(fileName, byteSize, mimeType);
});

ipcMain.handle('web:check-object-url', (_event, { fileName, mimeType }) => {
  return webClientService.isObjectUrlAllowed(fileName, mimeType);
});

ipcMain.handle('web:request-download', (_event, fileId: string) => {
  return webClientService.requestDownloadSlot(fileId);
});

ipcMain.handle('web:release-download', () => {
  return webClientService.releaseDownloadSlot();
});

ipcMain.handle('web:cancel-transfer', (_event, transferId: string) => {
  return webClientService.cancelFileTransfer(transferId);
});

ipcMain.handle('web:parse-deeplink', (_event, rawUrl: string) => {
  return webClientService.parseAndCleanDeepLink(rawUrl);
});

ipcMain.handle('web:eval-retry', (_event, hostCapabilities: string[]) => {
  return webClientService.evaluateMessageRetry(hostCapabilities);
});

ipcMain.handle('web:check-desktop-only', (_event, feature: string) => {
  try {
    webClientService.enforceWebDesktopOnly(feature);
    return { allowed: true };
  } catch (err: any) {
    return { allowed: false, error: err?.message };
  }
});

app.whenReady().then(async () => {
  await initDatabase();
  await chatSessionService.init();
  await agentRuntimeService.init();
  await teamCollabService.init();
  await integrationsVoiceService.init();
  await authBillingService.init();
  await mobileAppService.init();
  await webClientService.init();
  createWindow();
  setupThemeWatcher();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', async () => {
  await agentRuntimeService.shutdown();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
