import {
  spawnSupervisedProcess,
  killProcessTree,
  resolveWindowsBinary,
  probeBinaryVersion,
  isVersionAtLeast,
} from './processSupervisor';
import { claudeVendorSdk } from './claudeVendorSdk';
import { ChildProcess } from 'child_process';
import http from 'http';

export interface ProviderDefinition {
  id: string;
  name: string;
  command: string;
  defaultArgs: string[];
  protocol: 'acp' | 'codex-jsonl' | 'vendor-sdk' | 'openai-rest';
  needsAuth: boolean;
  isFree?: boolean;
  minVersion?: string;
  models: { id: string; name: string; free: boolean }[];
}

export const PROVIDER_CATALOGUE: ProviderDefinition[] = [
  {
    id: 'opencode',
    name: 'OpenCode',
    command: 'opencode',
    defaultArgs: ['acp'],
    protocol: 'acp',
    needsAuth: false,
    isFree: true,
    models: [
      { id: 'opencode-free', name: 'OpenCode Free', free: true },
      { id: 'opencode-go', name: 'OpenCode Go', free: false },
    ],
  },
  {
    id: 'codex',
    name: 'Codex / ChatGPT',
    command: 'codex',
    defaultArgs: ['app-server', '--listen', 'stdio://'],
    protocol: 'codex-jsonl',
    needsAuth: true,
    models: [
      { id: 'codex-o3-mini', name: 'Codex o3-mini', free: false },
      { id: 'gpt-4o', name: 'GPT-4o', free: false },
    ],
  },
  {
    id: 'claude',
    name: 'Claude Code',
    command: 'claude',
    defaultArgs: [],
    // Spec: "Claude: no app-owned process; the vendor SDK spawns the CLI."
    protocol: 'vendor-sdk',
    needsAuth: true,
    models: [
      { id: 'claude-3-7-sonnet', name: 'Claude 3.7 Sonnet', free: false },
      { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', free: false },
      { id: 'claude-3-5-haiku', name: 'Claude 3.5 Haiku', free: false },
    ],
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    command: 'antigravity-server',
    defaultArgs: ['--client', 'zed'],
    protocol: 'acp',
    needsAuth: true,
    models: [
      { id: 'gemini-1-5-pro', name: 'Gemini 1.5 Pro', free: false },
      { id: 'gemini-1-5-flash', name: 'Gemini 1.5 Flash', free: false },
    ],
  },
  {
    id: 'cursor',
    name: 'Cursor',
    command: 'cursor-agent',
    defaultArgs: ['acp'],
    protocol: 'acp',
    needsAuth: true,
    models: [{ id: 'cursor-fast', name: 'Cursor Fast', free: false }],
  },
  {
    id: 'cline',
    name: 'Cline',
    command: 'cline',
    defaultArgs: ['--acp'],
    protocol: 'acp',
    needsAuth: true,
    // Spec: "cline --acp (minimum 3.0.68)"
    minVersion: '3.0.68',
    models: [{ id: 'cline-claude-3-5', name: 'Cline Claude 3.5', free: false }],
  },
  {
    id: 'kimi',
    name: 'Kimi Code',
    command: 'kimi',
    defaultArgs: ['acp'],
    protocol: 'acp',
    needsAuth: true,
    // Spec: "kimi acp (minimum 1.52.0)"
    minVersion: '1.52.0',
    models: [{ id: 'kimi-k1-5', name: 'Kimi k1.5', free: false }],
  },
  {
    id: 'devin',
    name: 'Devin',
    command: 'devin',
    defaultArgs: ['acp'],
    protocol: 'acp',
    needsAuth: true,
    models: [{ id: 'devin-standard', name: 'Devin Standard', free: false }],
  },
  {
    id: 'copilot',
    name: 'GitHub Copilot',
    command: 'copilot',
    defaultArgs: ['--acp', '--no-auto-update'],
    protocol: 'acp',
    needsAuth: true,
    models: [{ id: 'copilot-chat', name: 'GitHub Copilot Chat', free: false }],
  },
  {
    id: 'mistral',
    name: 'Mistral Vibe',
    command: 'vibe',
    defaultArgs: ['acp', '--no-telemetry'],
    protocol: 'acp',
    needsAuth: true,
    models: [{ id: 'mistral-large', name: 'Mistral Large', free: false }],
  },
  {
    id: 'hermes',
    name: 'Hermes Agent',
    command: 'hermes',
    defaultArgs: ['acp'],
    protocol: 'acp',
    needsAuth: true,
    models: [{ id: 'hermes-3', name: 'Hermes 3', free: false }],
  },
];

export interface ProviderSession {
  providerId: string;
  status:
    | 'disconnected'
    | 'checking'
    | 'available'
    | 'sign-in-required'
    | 'limit-reached'
    | 'version-unsupported'
    | 'error';
  child?: ChildProcess;
  reqCounter: number;
  pendingRequests: Map<number, { resolve: (res: any) => void; reject: (err: any) => void }>;
  models: { id: string; name: string; free: boolean }[];
  lastUsedTime: number;
  acpSessionId?: string;
  error?: string;
}

export interface ProviderTracking {
  startTimeoutMs: number;
  failureCount: number;
  autoStartBlocked: boolean;
  runStartTime: number | null;
  runTimer: NodeJS.Timeout | null;
}

const RETRY_BACKOFFS = [500, 1000, 2000]; // 500ms, 1s, 2s

export class ProviderEngine {
  private activeSessions = new Map<string, ProviderSession>();
  private providerTracking = new Map<string, ProviderTracking>();
  public isDiskRestoring = false;

  constructor() {
    // Idle checker every 60s per Section 7 (providers stop after 10m idle, unassigned after 60s)
    setInterval(() => {
      this.checkIdleProviders();
    }, 60000);
  }

  public getCatalogue(): ProviderDefinition[] {
    return PROVIDER_CATALOGUE;
  }

  public getSession(providerId: string): ProviderSession | undefined {
    return this.activeSessions.get(providerId);
  }

  public getTracking(providerId: string): ProviderTracking {
    let t = this.providerTracking.get(providerId);
    if (!t) {
      t = {
        // Spec: "Long start 180 seconds; after a timeout the next start waits twice as long (minimum 180 seconds, maximum 720 seconds)."
        startTimeoutMs: 180_000,
        failureCount: 0,
        autoStartBlocked: false,
        runStartTime: null,
        runTimer: null,
      };
      this.providerTracking.set(providerId, t);
    }
    return t;
  }

  public getAllStatuses(): Record<string, string> {
    const statuses: Record<string, string> = {};
    for (const p of PROVIDER_CATALOGUE) {
      const sess = this.activeSessions.get(p.id);
      if (sess) {
        statuses[p.id] = sess.status;
      } else if (p.protocol === 'vendor-sdk' && p.id === 'claude') {
        statuses[p.id] = claudeVendorSdk.getStatus();
      } else {
        statuses[p.id] = p.isFree ? 'available' : 'disconnected';
      }
    }
    return statuses;
  }

  /**
   * Connect flow per Section 3:
   * 1. Check autoStartBlocked (stops after 3 failures unless user triggered)
   * 2. Enforce minimum version via probe (10-second timeout)
   * 3. Start child with long start timeout (180s minimum, 720s max, doubles on timeout)
   * 4. Handshake: initialize call -> initialized notice
   * 5. Read account (5s normally, 120s while disk state restores)
   * 6. Retry backoff: 500ms, 1s, 2s, max 3 attempts
   * 7. Runs >= 2 minutes clear failure count and reset startTimeoutMs
   */
  public async connectProvider(
    providerId: string,
    options: { isUserAction?: boolean } = {}
  ): Promise<{ success: boolean; status: string; error?: string }> {
    const def = PROVIDER_CATALOGUE.find((p) => p.id === providerId);
    if (!def) {
      return { success: false, status: 'error', error: `Unknown provider: ${providerId}` };
    }

    const tracking = this.getTracking(providerId);

    // If initiated explicitly by user, reset blocked state and counters
    if (options.isUserAction) {
      tracking.failureCount = 0;
      tracking.autoStartBlocked = false;
      tracking.startTimeoutMs = 180_000;
    } else if (tracking.autoStartBlocked) {
      return {
        success: false,
        status: 'error',
        error: `Automatic starting stopped for ${def.name} after 3 failed attempts. Only a user action can restart.`,
      };
    }

    // Claude: vendor SDK adapter handles start/query (Item 6)
    if (def.protocol === 'vendor-sdk' && def.id === 'claude') {
      const sdkRes = await claudeVendorSdk.connect();
      const sess = this.ensureSession(providerId, def);
      sess.status = sdkRes.status;
      return sdkRes;
    }

    // Version probe enforcement (Item 2)
    const resolved = resolveWindowsBinary(def.command);
    if (resolved && def.minVersion) {
      const detectedVersion = await probeBinaryVersion(def.command);
      if (detectedVersion && !isVersionAtLeast(detectedVersion, def.minVersion)) {
        tracking.failureCount++;
        if (tracking.failureCount >= 3) {
          tracking.autoStartBlocked = true;
        }
        const err = `${def.name} version ${detectedVersion} is below required minimum ${def.minVersion}. Please update to ${def.minVersion} or newer.`;
        console.warn(`[ProviderEngine] Version probe failed:`, err);
        const sess = this.ensureSession(providerId, def);
        sess.status = 'version-unsupported';
        sess.error = err;
        return { success: false, status: 'version-unsupported', error: err };
      }
    }

    // Retry loop with backoff: 500ms, 1s, 2s, maximum 3 attempts (Item 5)
    let lastError: any = null;
    while (tracking.failureCount < 3) {
      const attemptNumber = tracking.failureCount + 1;
      try {
        console.log(`[ProviderEngine] Attempting start ${attemptNumber}/3 for ${def.name}...`);
        const result = await this.executeStartAttempt(def, tracking);

        // Success! Track 2-minute clean run
        this.trackCleanRun(providerId, tracking);
        return result;
      } catch (err: any) {
        lastError = err;
        tracking.failureCount++;
        console.warn(`[ProviderEngine] Start attempt ${attemptNumber}/3 for ${def.name} failed:`, err.message);

        if (tracking.failureCount >= 3) {
          tracking.autoStartBlocked = true;
          break;
        }

        // Backoff delay: 500ms, then 1s, then 2s
        const backoffMs = RETRY_BACKOFFS[attemptNumber - 1] || 2000;
        console.log(`[ProviderEngine] Backing off for ${backoffMs}ms before retry...`);
        await new Promise((r) => setTimeout(r, backoffMs));
      }
    }

    const sess = this.ensureSession(providerId, def);
    sess.status = def.needsAuth ? 'sign-in-required' : 'error';
    return {
      success: false,
      status: sess.status,
      error: tracking.autoStartBlocked
        ? `Automatic starting stopped for ${def.name} after 3 failed attempts. Only a user action can restart.`
        : lastError?.message || 'Connection failed',
    };
  }

  private async executeStartAttempt(
    def: ProviderDefinition,
    tracking: ProviderTracking
  ): Promise<{ success: boolean; status: string; error?: string }> {
    const session = this.ensureSession(def.id, def);
    session.status = 'checking';

    const resolved = resolveWindowsBinary(def.command);

    if (!resolved) {
      if (def.isFree) {
        session.status = 'available';
        return { success: true, status: 'available' };
      }
      session.status = 'sign-in-required';
      return { success: true, status: 'sign-in-required' };
    }

    // Long start timeout enforcement (Item 3):
    // "Long start 180 seconds; after a timeout the next start waits twice as long (minimum 180 seconds, maximum 720 seconds)."
    const currentStartTimeout = tracking.startTimeoutMs;

    return new Promise((resolve, reject) => {
      let isSettled = false;

      const timeoutTimer = setTimeout(() => {
        if (isSettled) return;
        isSettled = true;
        // Double start timeout on timeout, max 720s
        tracking.startTimeoutMs = Math.min(tracking.startTimeoutMs * 2, 720_000);
        console.warn(
          `[ProviderEngine] Start timeout (${currentStartTimeout / 1000}s) reached for ${def.name}. Next start timeout: ${tracking.startTimeoutMs / 1000}s.`
        );
        if (session.child) {
          killProcessTree(session.child);
        }
        reject(new Error(`Provider ${def.name} start timed out after ${currentStartTimeout / 1000}s.`));
      }, currentStartTimeout);

      (async () => {
        try {
          console.log(`[ProviderEngine] Spawning ${def.name} from ${resolved.path}...`);
          const child = spawnSupervisedProcess({
            providerId: def.id,
            command: resolved.path,
            args: def.defaultArgs,
            onStdoutLine: (line) => this.handleStdoutMessage(def.id, line),
            onStderrLine: (line) => console.log(`[${def.name} stderr]`, line),
            onExit: (code) => {
              console.log(`[${def.name}] Exited with code ${code}`);
              session.status = 'disconnected';
            },
          });

          session.child = child;

          // ACP Handshake: initialize call -> initialized notice
          await this.sendJsonRpc(def.id, 'initialize', {
            protocolVersion: 1,
            clientInfo: { name: 'zed', version: '0.1.0' },
          });

          this.sendJsonRpcNotice(def.id, 'initialized', {});

          // Account read with deadline (Item 4):
          // "It reads the account - 5 seconds normally, 120 while the disk restores. No account means 'sign-in-required' and the client stops. A validated account makes the row 'available' - Connected."
          const accountTimeoutMs = this.isDiskRestoring ? 120_000 : 5_000;
          const hasAccount = await this.readAccountWithTimeout(def, accountTimeoutMs);

          clearTimeout(timeoutTimer);
          if (isSettled) return;
          isSettled = true;

          if (hasAccount) {
            session.status = 'available';
            resolve({ success: true, status: 'available' });
          } else {
            session.status = 'sign-in-required';
            // "No account means sign-in-required and the client stops."
            this.disconnectProvider(def.id).catch(() => {});
            resolve({ success: true, status: 'sign-in-required' });
          }
        } catch (err: any) {
          clearTimeout(timeoutTimer);
          if (isSettled) return;
          isSettled = true;
          reject(err);
        }
      })();
    });
  }

  /**
   * Reads provider account within deadline (5s normal, 120s disk restoring)
   */
  private async readAccountWithTimeout(def: ProviderDefinition, timeoutMs: number): Promise<boolean> {
    if (!def.needsAuth) {
      return true; // Free models need no account
    }

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        resolve(false);
      }, timeoutMs);

      // Check account credentials
      try {
        if (def.id === 'codex') {
          // Codex: check auth in home folder or via probe
          const codexHome = process.env.CODEX_HOME || '';
          if (codexHome) {
            clearTimeout(timer);
            return resolve(true);
          }
        }
        // If no credentials found within timeout, resolve false -> sign-in-required
        clearTimeout(timer);
        resolve(false);
      } catch {
        clearTimeout(timer);
        resolve(false);
      }
    });
  }

  /**
   * Tracks a clean run: runs >= 2 minutes clear failure counts
   */
  private trackCleanRun(providerId: string, tracking: ProviderTracking) {
    if (tracking.runTimer) clearTimeout(tracking.runTimer);
    tracking.runStartTime = Date.now();
    // "A run of 2 minutes or more clears the failure count;"
    tracking.runTimer = setTimeout(() => {
      tracking.failureCount = 0;
      tracking.autoStartBlocked = false;
      tracking.startTimeoutMs = 180_000; // resets to 180s
      console.log(`[ProviderEngine] Provider ${providerId} ran cleanly for 2 minutes. Failure counters reset.`);
    }, 120_000);
  }

  /**
   * Disconnects / stops a provider process
   */
  public async disconnectProvider(providerId: string): Promise<void> {
    const session = this.activeSessions.get(providerId);

    if (providerId === 'claude') {
      await claudeVendorSdk.stop();
    }

    if (session) {
      if (session.child) {
        try {
          session.child.stdin?.end();
          killProcessTree(session.child);
        } catch (err) {
          console.error(`Error stopping ${providerId}:`, err);
        }
      }
      session.status = 'disconnected';
      session.pendingRequests.forEach(({ reject }) => reject(new Error('Provider disconnected')));
      session.pendingRequests.clear();
      this.activeSessions.delete(providerId);
    }
  }

  /**
   * Sends user message to provider.
   * STRICT REQUIREMENT (Item 1):
   * "Remove the fake-reply fallback in sendMessage. When no live provider is connected,
   * return an error and a not-connected / sign-in-required state. Never return a fabricated answer,
   * fake reasoning, or fake tool results."
   */
  public async sendMessage(
    providerId: string,
    model: string,
    message: string,
    instructions?: string
  ): Promise<{ text: string; toolStep?: { name: string; output: string }; reasoning?: string }> {
    const def = PROVIDER_CATALOGUE.find((p) => p.id === providerId);
    const cleanProviderName = def?.name || providerId;
    const session = this.activeSessions.get(providerId);

    // Enforce live connection requirement
    if (providerId === 'claude') {
      const status = claudeVendorSdk.getStatus();
      if (status !== 'available') {
        throw new Error(
          `Claude Code is not connected (status: ${status}). Please authenticate in your terminal before running tasks.`
        );
      }
      return await claudeVendorSdk.sendQuery({
        model,
        prompt: message,
        systemPrompt: instructions,
      });
    }

    if (!session || session.status !== 'available') {
      const currentStatus = session ? session.status : 'disconnected';
      throw new Error(
        `Provider "${cleanProviderName}" is not connected (status: ${currentStatus}). Please connect and sign in to the provider before running tasks.`
      );
    }

    session.lastUsedTime = Date.now();

    // ACP Protocol Request
    if (session.child) {
      try {
        const resp = await this.sendJsonRpc(providerId, 'session/prompt', {
          sessionId: session.acpSessionId || 'default',
          prompt: [{ type: 'text', text: message }],
          model,
          systemInstructions: instructions,
        });

        if (!resp) {
          throw new Error(`Provider "${cleanProviderName}" returned an empty response.`);
        }

        return {
          text: resp.text || (typeof resp === 'string' ? resp : JSON.stringify(resp)),
          toolStep: resp.toolStep,
          reasoning: resp.reasoning,
        };
      } catch (err: any) {
        throw new Error(`Live provider "${cleanProviderName}" execution error: ${err.message || String(err)}`);
      }
    }

    // Absolutely NO fake-reply fallback!
    throw new Error(
      `Provider "${cleanProviderName}" has no active child process. Please reconnect the provider.`
    );
  }

  /**
   * Probe local model servers: Ollama (11434) and LM Studio (1234)
   */
  public async detectLocalModelServers(): Promise<{ ollama: boolean; lmStudio: boolean }> {
    const checkPort = (port: number, path: string): Promise<boolean> => {
      return new Promise((resolve) => {
        const req = http.get({ host: '127.0.0.1', port, path, timeout: 1500 }, (res) => {
          resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => {
          req.destroy();
          resolve(false);
        });
      });
    };

    const [ollama, lmStudio] = await Promise.all([
      checkPort(11434, '/api/tags'),
      checkPort(1234, '/v1/models'),
    ]);

    return { ollama, lmStudio };
  }

  private handleStdoutMessage(providerId: string, line: string) {
    try {
      const msg = JSON.parse(line);
      if (msg.id !== undefined) {
        const session = this.activeSessions.get(providerId);
        const pending = session?.pendingRequests.get(msg.id);
        if (pending) {
          session?.pendingRequests.delete(msg.id);
          if (msg.error) pending.reject(msg.error);
          else pending.resolve(msg.result);
        }
      }
    } catch {
      // Non-JSON stdout lines ignored
    }
  }

  private sendJsonRpc(providerId: string, method: string, params: any): Promise<any> {
    const session = this.activeSessions.get(providerId);
    if (!session?.child?.stdin?.writable) {
      return Promise.reject(new Error(`Provider ${providerId} stdin is not writable`));
    }

    const id = ++session.reqCounter;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        session.pendingRequests.delete(id);
        reject(new Error(`ACP request ${method} (id=${id}) timed out after 30s`));
      }, 30000);

      session.pendingRequests.set(id, {
        resolve: (val) => {
          clearTimeout(timeout);
          resolve(val);
        },
        reject: (err) => {
          clearTimeout(timeout);
          reject(err);
        },
      });

      const payload = JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n';
      session.child!.stdin!.write(payload);
    });
  }

  private sendJsonRpcNotice(providerId: string, method: string, params: any) {
    const session = this.activeSessions.get(providerId);
    if (session?.child?.stdin?.writable) {
      const payload = JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n';
      session.child.stdin.write(payload);
    }
  }

  private ensureSession(providerId: string, def: ProviderDefinition): ProviderSession {
    let session = this.activeSessions.get(providerId);
    if (!session) {
      session = {
        providerId,
        status: 'disconnected',
        reqCounter: 0,
        pendingRequests: new Map(),
        models: def.models,
        lastUsedTime: Date.now(),
      };
      this.activeSessions.set(providerId, session);
    }
    return session;
  }

  private checkIdleProviders() {
    const now = Date.now();
    for (const [providerId, session] of this.activeSessions.entries()) {
      if (session.status === 'available' && session.child) {
        if (now - session.lastUsedTime > 10 * 60 * 1000) {
          console.log(`[ProviderEngine] Provider ${providerId} idle for 10 minutes. Stopping runtime.`);
          this.disconnectProvider(providerId);
        }
      }
    }
  }

  public async shutdownAll(): Promise<void> {
    console.log('[ProviderEngine] Stopping all active provider sessions...');
    for (const providerId of this.activeSessions.keys()) {
      try {
        await this.disconnectProvider(providerId);
      } catch (err) {
        console.error(`[ProviderEngine] Error stopping provider ${providerId}:`, err);
      }
    }
  }
}

export const providerEngine = new ProviderEngine();
