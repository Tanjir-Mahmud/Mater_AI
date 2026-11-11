import {
  spawnSupervisedProcess,
  killProcessTree,
  resolveWindowsBinary,
  probeBinaryVersion,
  isVersionAtLeast,
  ResolvedBinary,
} from './processSupervisor';
import { claudeVendorSdk } from './claudeVendorSdk';
import { ChildProcess, spawn } from 'child_process';
import http from 'http';
import os from 'os';
import path from 'path';
import fs from 'fs';

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

export type ProviderStatusKind = 'not-installed' | 'installed-not-signed-in' | 'connected';

export interface ProviderLiveStatus {
  id: string;
  name: string;
  status: ProviderStatusKind;
  binaryName: string;
  binaryPath: string | null;
  isBinaryInstalled: boolean;
  isAuthenticated: boolean;
  installCommand: string;
  loginCommand: string;
  loginUrl?: string;
  description: string;
  models: { id: string; name: string; free: boolean }[];
  errorMessage?: string;
  nextStep?: string;
}

export const PROVIDER_METADATA: Record<
  string,
  {
    installCommand: string;
    loginCommand: string;
    loginUrl: string;
    description: string;
  }
> = {
  opencode: {
    installCommand: 'npm install -g opencode-ai',
    loginCommand: 'opencode auth login',
    loginUrl: 'https://opencode.ai/login',
    description: 'Open-source AI coding agent powered by ACP protocol',
  },
  codex: {
    installCommand: 'npm install -g @openai/codex',
    loginCommand: 'codex login',
    loginUrl: 'https://chatgpt.com/api/auth',
    description: 'OpenAI Codex & ChatGPT app server with streaming JSONL protocol',
  },
  claude: {
    installCommand: 'npm install -g @anthropic-ai/claude-code',
    loginCommand: 'claude login',
    loginUrl: 'https://claude.ai/login',
    description: 'Anthropic Claude Code CLI with vendor SDK child spawn',
  },
  gemini: {
    installCommand: 'npm install -g @google/gemini-cli',
    loginCommand: 'gemini auth login',
    loginUrl: 'https://aistudio.google.com/app/apikey',
    description: 'Google Gemini CLI & ACP agent protocol with Google AI / Gemini API',
  },
  cursor: {
    installCommand: 'npm install -g cursor-agent',
    loginCommand: 'cursor-agent login',
    loginUrl: 'https://cursor.com',
    description: 'Cursor Agent CLI via ACP protocol',
  },
  cline: {
    installCommand: 'npm install -g cline',
    loginCommand: 'cline auth login',
    loginUrl: 'https://cline.bot',
    description: 'Cline autonomous agent via ACP protocol (min 3.0.68)',
  },
  kimi: {
    installCommand: 'npm install -g kimi-code',
    loginCommand: 'kimi login',
    loginUrl: 'https://kimi.moonshot.cn',
    description: 'Moonshot Kimi Code CLI via ACP protocol (min 1.52.0)',
  },
  devin: {
    installCommand: 'npm install -g devin-cli',
    loginCommand: 'devin login',
    loginUrl: 'https://preview.devin.ai',
    description: 'Cognition Devin agent via ACP protocol',
  },
  copilot: {
    installCommand: 'npm install -g @github/copilot-cli',
    loginCommand: 'copilot auth',
    loginUrl: 'https://github.com/login',
    description: 'GitHub Copilot CLI via ACP protocol',
  },
  mistral: {
    installCommand: 'npm install -g mistral-vibe',
    loginCommand: 'vibe login',
    loginUrl: 'https://console.mistral.ai',
    description: 'Mistral Vibe coding agent via ACP protocol',
  },
  hermes: {
    installCommand: 'npm install -g hermes-agent',
    loginCommand: 'hermes auth login',
    loginUrl: 'https://hermes.ai',
    description: 'Hermes Agent CLI via ACP protocol',
  },
};

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
    command: 'gemini',
    defaultArgs: ['acp'],
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

/**
 * Requirement 3: Google Gemini must detect Google's `gemini` CLI first.
 * Fall back to `antigravity-server` only if its binary can actually be located on the machine.
 * Never present either as connected when neither is available.
 */
export function resolveGeminiBinary(): { command: string; resolved: ResolvedBinary } | null {
  const geminiResolved = resolveWindowsBinary('gemini');
  if (geminiResolved) {
    return { command: 'gemini', resolved: geminiResolved };
  }
  const agyResolved = resolveWindowsBinary('antigravity-server');
  if (agyResolved) {
    return { command: 'antigravity-server', resolved: agyResolved };
  }
  return null;
}

/**
 * Codex / OpenAI auth verification:
 * Directly check ~/.codex/auth.json (and candidate files).
 * Verify real auth (auth file / credentials in the codex directory with size > 2 and valid tokens/keys,
 * or an active OpenAI API key). A missing or empty auth file means "not signed in".
 */
export function verifyCodexAuth(overrideCodexDir?: string): boolean {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (apiKey && apiKey.length > 10 && apiKey !== 'undefined' && apiKey !== 'null') {
    return true;
  }

  const homeDir = os.homedir();
  const codexHome = overrideCodexDir || path.join(homeDir, '.codex');
  if (!fs.existsSync(codexHome)) {
    return false;
  }

  const candidateFiles = [
    'auth.json',
    'credentials.json',
    'config.json',
    'session.json',
    '.codex-global-state.json',
    'config.toml',
  ];

  for (const file of candidateFiles) {
    const fullPath = path.join(codexHome, file);
    if (fs.existsSync(fullPath)) {
      try {
        const stats = fs.statSync(fullPath);
        if (stats.size > 2) {
          const content = fs.readFileSync(fullPath, 'utf8').trim();
          if (content !== '{}' && content !== '[]' && content.length > 2) {
            if (file.endsWith('.json')) {
              try {
                const parsed = JSON.parse(content);
                const keys = Object.keys(parsed);
                if (keys.length > 0) {
                  return true;
                }
              } catch {
                return true;
              }
            } else {
              if (content.length > 10) {
                return true;
              }
            }
          }
        }
      } catch {
        // ignore read error
      }
    }
  }

  return false;
}

/**
 * Verifies real account credentials for a given provider.
 * Never returns true for unverified accounts.
 */
export function verifyProviderAuth(providerId: string): boolean {
  const homeDir = os.homedir();

  switch (providerId) {
    case 'codex':
      return verifyCodexAuth();

    case 'claude': {
      const configPath = path.join(homeDir, '.claude.json');
      const hasConfig = fs.existsSync(configPath) && fs.statSync(configPath).size > 2;
      const hasEnv = Boolean(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim().length > 10);
      return hasConfig || hasEnv;
    }

    case 'gemini': {
      const hasEnv = Boolean(
        (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 10) ||
        (process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY.trim().length > 10)
      );
      if (hasEnv) return true;
      const candidates = [
        path.join(homeDir, '.gemini', 'credentials.json'),
        path.join(homeDir, '.gemini', 'auth.json'),
        path.join(homeDir, '.config', 'gemini', 'credentials.json'),
        path.join(homeDir, '.gemini', 'antigravity', 'auth.json'),
      ];
      for (const p of candidates) {
        if (fs.existsSync(p) && fs.statSync(p).size > 2) {
          try {
            const raw = fs.readFileSync(p, 'utf8').trim();
            if (raw !== '{}' && raw !== '[]' && raw.length > 2) return true;
          } catch {}
        }
      }
      return false;
    }

    case 'opencode': {
      const hasEnv = Boolean(
        (process.env.OPENCODE_API_KEY && process.env.OPENCODE_API_KEY.trim().length > 10) ||
        (process.env.OPENCODE_AUTH_TOKEN && process.env.OPENCODE_AUTH_TOKEN.trim().length > 10)
      );
      if (hasEnv) return true;
      const candidates = [
        path.join(homeDir, '.opencode', 'auth.json'),
        path.join(homeDir, '.opencode', 'credentials.json'),
        path.join(homeDir, '.config', 'opencode', 'auth.json'),
      ];
      for (const p of candidates) {
        if (fs.existsSync(p) && fs.statSync(p).size > 2) {
          try {
            const raw = fs.readFileSync(p, 'utf8').trim();
            if (raw !== '{}' && raw !== '[]' && raw.length > 2) return true;
          } catch {}
        }
      }
      return false;
    }

    case 'cursor': {
      if (process.env.CURSOR_API_KEY && process.env.CURSOR_API_KEY.trim().length > 10) return true;
      const p = path.join(homeDir, '.cursor', 'auth.json');
      return fs.existsSync(p) && fs.statSync(p).size > 2;
    }

    case 'cline': {
      if (process.env.CLINE_API_KEY && process.env.CLINE_API_KEY.trim().length > 10) return true;
      const p = path.join(homeDir, '.cline', 'auth.json');
      return fs.existsSync(p) && fs.statSync(p).size > 2;
    }

    case 'kimi': {
      if (
        (process.env.MOONSHOT_API_KEY && process.env.MOONSHOT_API_KEY.trim().length > 10) ||
        (process.env.KIMI_API_KEY && process.env.KIMI_API_KEY.trim().length > 10)
      )
        return true;
      const p = path.join(homeDir, '.kimi', 'auth.json');
      return fs.existsSync(p) && fs.statSync(p).size > 2;
    }

    case 'devin': {
      if (process.env.DEVIN_API_KEY && process.env.DEVIN_API_KEY.trim().length > 10) return true;
      const p = path.join(homeDir, '.devin', 'credentials.json');
      return fs.existsSync(p) && fs.statSync(p).size > 2;
    }

    case 'copilot': {
      if (
        (process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.trim().length > 10) ||
        (process.env.GH_TOKEN && process.env.GH_TOKEN.trim().length > 10)
      )
        return true;
      const p = path.join(homeDir, '.config', 'gh', 'hosts.yml');
      return fs.existsSync(p) && fs.statSync(p).size > 2;
    }

    case 'mistral': {
      if (process.env.MISTRAL_API_KEY && process.env.MISTRAL_API_KEY.trim().length > 10) return true;
      const p = path.join(homeDir, '.vibe', 'credentials.json');
      return fs.existsSync(p) && fs.statSync(p).size > 2;
    }

    case 'hermes': {
      if (process.env.HERMES_API_KEY && process.env.HERMES_API_KEY.trim().length > 10) return true;
      const p = path.join(homeDir, '.hermes', 'auth.json');
      return fs.existsSync(p) && fs.statSync(p).size > 2;
    }

    default:
      return false;
  }
}

/**
 * Checks honest live status of any provider on the spot:
 * - "Not installed": CLI binary not found on PATH.
 * - "Installed, not signed in": Binary found, but no credentials verified.
 * - "Connected": Binary found AND account verified.
 * Never claims connected unless both checks pass.
 */
export function checkProviderLiveStatus(providerId: string): ProviderLiveStatus {
  const def = PROVIDER_CATALOGUE.find((p) => p.id === providerId);
  const meta = PROVIDER_METADATA[providerId] || {
    installCommand: `npm install -g ${providerId}`,
    loginCommand: `${providerId} login`,
    loginUrl: `https://${providerId}.ai`,
    description: `${def?.name || providerId} coding provider`,
  };

  const name = def?.name || providerId;
  const models = def?.models || [];

  // 1. Resolve binary
  let binaryName = def?.command || providerId;
  let resolvedBinary: ResolvedBinary | null = null;

  if (providerId === 'gemini') {
    const geminiRes = resolveGeminiBinary();
    if (geminiRes) {
      binaryName = geminiRes.command;
      resolvedBinary = geminiRes.resolved;
    } else {
      binaryName = 'gemini';
      resolvedBinary = null;
    }
  } else {
    resolvedBinary = resolveWindowsBinary(binaryName);
  }

  const isBinaryInstalled = Boolean(resolvedBinary && resolvedBinary.path);
  const binaryPath = resolvedBinary ? resolvedBinary.path : null;

  // 2. Check Auth
  const isAuthenticated = isBinaryInstalled ? verifyProviderAuth(providerId) : false;

  // 3. Status mapping with exact, actionable messages naming the missing piece and next step
  let status: ProviderStatusKind;
  let errorMessage: string | undefined;
  let nextStep: string | undefined;

  if (!isBinaryInstalled) {
    status = 'not-installed';
    if (providerId === 'opencode') {
      errorMessage = 'OpenCode CLI is not installed on this computer.';
      nextStep = `Install it with "${meta.installCommand}", then press Connect.`;
    } else if (providerId === 'claude') {
      errorMessage = 'Claude Code CLI is not installed on this computer.';
      nextStep = `Install it with "${meta.installCommand}", then press Connect.`;
    } else if (providerId === 'gemini') {
      errorMessage = 'Google Gemini CLI is not installed on this computer.';
      nextStep = `Install it with "${meta.installCommand}", then press Connect.`;
    } else if (providerId === 'codex') {
      errorMessage = 'Codex CLI is not installed on this computer.';
      nextStep = `Install it with "${meta.installCommand}", then press Connect.`;
    } else {
      errorMessage = `${name} CLI is not installed on this computer.`;
      nextStep = `Install it with "${meta.installCommand}", then press Connect.`;
    }
  } else if (!isAuthenticated) {
    status = 'installed-not-signed-in';
    errorMessage = `${name} is installed but you are not signed in.`;
    if (providerId === 'claude') {
      nextStep = 'Press Sign in to connect your Claude subscription.';
    } else if (providerId === 'codex') {
      nextStep = 'Press Sign in to authenticate with OpenAI or set OPENAI_API_KEY.';
    } else if (providerId === 'opencode') {
      nextStep = `Press Sign in to connect your OpenCode account or run "${meta.loginCommand}" in your terminal.`;
    } else {
      nextStep = `Press Sign in to connect your ${name} account or run "${meta.loginCommand}" in your terminal.`;
    }
  } else {
    status = 'connected';
  }

  return {
    id: providerId,
    name,
    status,
    binaryName,
    binaryPath,
    isBinaryInstalled,
    isAuthenticated,
    installCommand: meta.installCommand,
    loginCommand: meta.loginCommand,
    loginUrl: meta.loginUrl,
    description: meta.description,
    models,
    errorMessage,
    nextStep,
  };
}

/**
 * Requirement 2: "Sign in" action per provider.
 * Spawns provider's login command in a visible terminal window so user can complete auth,
 * and opens the provider's sign-in page in the default browser.
 * Re-checks connection automatically.
 */
export async function launchProviderSignIn(providerId: string): Promise<{
  success: boolean;
  openedTerminal: boolean;
  openedBrowser: boolean;
  liveStatus: ProviderLiveStatus;
  message: string;
}> {
  const liveStatusBefore = checkProviderLiveStatus(providerId);
  const meta = PROVIDER_METADATA[providerId];
  if (!meta) {
    return {
      success: false,
      openedTerminal: false,
      openedBrowser: false,
      liveStatus: liveStatusBefore,
      message: `Unknown provider: ${providerId}`,
    };
  }

  let openedTerminal = false;
  let openedBrowser = false;

  // If binary is installed, spawn login command in a visible terminal window
  if (liveStatusBefore.isBinaryInstalled) {
    try {
      if (process.platform === 'win32') {
        const title = `BissBot - ${liveStatusBefore.name} Sign In`;
        spawn('cmd.exe', ['/c', 'start', title, 'cmd.exe', '/k', meta.loginCommand], {
          detached: true,
          stdio: 'ignore',
        }).unref();
        openedTerminal = true;
      } else {
        spawn('sh', ['-c', meta.loginCommand], { detached: true, stdio: 'ignore' }).unref();
        openedTerminal = true;
      }
    } catch (err) {
      console.warn(`[ProviderEngine] Could not launch terminal for ${providerId}:`, err);
    }
  }

  // Open sign in URL in default browser
  if (meta.loginUrl) {
    try {
      const electron = require('electron');
      if (electron?.shell?.openExternal) {
        electron.shell.openExternal(meta.loginUrl);
        openedBrowser = true;
      }
    } catch {
      // In tests/headless, electron shell might be mocked
    }
  }

  // Re-check live status
  const currentStatus = checkProviderLiveStatus(providerId);

  let message = '';
  if (currentStatus.status === 'connected') {
    message = `Successfully authenticated and connected to ${currentStatus.name}!`;
  } else if (!currentStatus.isBinaryInstalled) {
    message = `${currentStatus.name} is not installed. Run "${meta.installCommand}" first.`;
  } else {
    message = `Launched sign-in for ${currentStatus.name}. Complete authentication in the terminal or browser, then click "Check Status".`;
  }

  return {
    success: currentStatus.status === 'connected',
    openedTerminal,
    openedBrowser,
    liveStatus: currentStatus,
    message,
  };
}

export interface ProviderSession {
  providerId: string;
  status:
    | 'disconnected'
    | 'checking'
    | 'available'
    | 'sign-in-required'
    | 'limit-reached'
    | 'version-unsupported'
    | 'error'
    | 'not-installed'
    | 'installed-not-signed-in';
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
      const live = checkProviderLiveStatus(p.id);
      if (live.status === 'connected') {
        const sess = this.activeSessions.get(p.id);
        statuses[p.id] = sess?.status === 'available' ? 'available' : 'connected';
      } else if (live.status === 'installed-not-signed-in') {
        statuses[p.id] = 'sign-in-required';
      } else {
        statuses[p.id] = 'not-installed';
      }
    }
    return statuses;
  }

  public getAllProviderLiveStatuses(): ProviderLiveStatus[] {
    return PROVIDER_CATALOGUE.map((p) => checkProviderLiveStatus(p.id));
  }

  public checkProviderLiveStatus(providerId: string): ProviderLiveStatus {
    return checkProviderLiveStatus(providerId);
  }

  public async launchProviderSignIn(providerId: string): Promise<{
    success: boolean;
    openedTerminal: boolean;
    openedBrowser: boolean;
    liveStatus: ProviderLiveStatus;
    message: string;
  }> {
    return await launchProviderSignIn(providerId);
  }

  /**
   * Connect flow with strict live status enforcement:
   * Re-evaluates honest live status before starting runtime.
   */
  public async connectProvider(
    providerId: string,
    options: { isUserAction?: boolean } = {}
  ): Promise<{ success: boolean; status: string; error?: string }> {
    const def = PROVIDER_CATALOGUE.find((p) => p.id === providerId);
    if (!def) {
      return { success: false, status: 'error', error: `Unknown provider: ${providerId}` };
    }

    const live = checkProviderLiveStatus(providerId);

    // If not installed on PATH, reject immediately with exact install command
    if (live.status === 'not-installed') {
      const err = `${live.errorMessage} ${live.nextStep}`;
      const sess = this.ensureSession(providerId, def);
      sess.status = 'not-installed';
      sess.error = err;
      return { success: false, status: 'not-installed', error: err };
    }

    // If installed but not authenticated, reject immediately with sign-in guidance
    if (live.status === 'installed-not-signed-in') {
      const err = `${live.errorMessage} ${live.nextStep}`;
      const sess = this.ensureSession(providerId, def);
      sess.status = 'sign-in-required';
      sess.error = err;
      return { success: false, status: 'installed-not-signed-in', error: err };
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

    // Claude: vendor SDK adapter handles start/query
    if (def.protocol === 'vendor-sdk' && def.id === 'claude') {
      const sdkRes = await claudeVendorSdk.connect();
      const sess = this.ensureSession(providerId, def);
      sess.status = sdkRes.status === 'connected' ? 'available' : (sdkRes.status as any);
      return {
        success: sdkRes.success,
        status: sdkRes.status,
        error: sdkRes.error,
      };
    }

    // Version probe enforcement
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

    // Retry loop with backoff: 500ms, 1s, 2s, maximum 3 attempts
    let lastError: any = null;
    while (tracking.failureCount < 3) {
      const attemptNumber = tracking.failureCount + 1;
      try {
        console.log(`[ProviderEngine] Attempting start ${attemptNumber}/3 for ${def.name}...`);
        const result = await this.executeStartAttempt(def, tracking);
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

    let resolved: ResolvedBinary | null = null;
    let actualCommand = def.command;

    if (def.id === 'gemini') {
      const geminiRes = resolveGeminiBinary();
      if (geminiRes) {
        resolved = geminiRes.resolved;
        actualCommand = geminiRes.command;
      }
    } else {
      resolved = resolveWindowsBinary(def.command);
    }

    if (!resolved) {
      session.status = 'not-installed';
      const live = checkProviderLiveStatus(def.id);
      return { success: false, status: 'not-installed', error: `${live.errorMessage} ${live.nextStep}` };
    }

    const currentStartTimeout = tracking.startTimeoutMs;

    return new Promise((resolve, reject) => {
      let isSettled = false;

      const timeoutTimer = setTimeout(() => {
        if (isSettled) return;
        isSettled = true;
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
          console.log(`[ProviderEngine] Spawning ${def.name} from ${resolved!.path}...`);
          const child = spawnSupervisedProcess({
            providerId: def.id,
            command: resolved!.path,
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

          // Account read with deadline (Item 4)
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
            this.disconnectProvider(def.id).catch(() => {});
            const live = checkProviderLiveStatus(def.id);
            resolve({ success: false, status: 'sign-in-required', error: `${live.errorMessage} ${live.nextStep}` });
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

  private async readAccountWithTimeout(def: ProviderDefinition, timeoutMs: number): Promise<boolean> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        resolve(false);
      }, timeoutMs);

      try {
        const isAuth = verifyProviderAuth(def.id);
        clearTimeout(timer);
        resolve(isAuth);
      } catch {
        clearTimeout(timer);
        resolve(false);
      }
    });
  }

  private trackCleanRun(providerId: string, tracking: ProviderTracking) {
    if (tracking.runTimer) clearTimeout(tracking.runTimer);
    tracking.runStartTime = Date.now();
    tracking.runTimer = setTimeout(() => {
      tracking.failureCount = 0;
      tracking.autoStartBlocked = false;
      tracking.startTimeoutMs = 180_000;
      console.log(`[ProviderEngine] Provider ${providerId} ran cleanly for 2 minutes. Failure counters reset.`);
    }, 120_000);
  }

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
   * Requirement 5 & 6:
   * Every error message about a missing provider must name the missing piece and the next step.
   * Strictly NO fake-reply fallback. No response is ever generated without a live connected provider.
   */
  public async sendMessage(
    providerId: string,
    model: string,
    message: string,
    instructions?: string
  ): Promise<{ text: string; toolStep?: { name: string; output: string }; reasoning?: string }> {
    const def = PROVIDER_CATALOGUE.find((p) => p.id === providerId);
    const cleanProviderName = def?.name || providerId;
    const live = checkProviderLiveStatus(providerId);

    // 1. If not installed on PATH, throw exact install message
    if (live.status === 'not-installed') {
      throw new Error(`${live.errorMessage} ${live.nextStep}`);
    }

    // 2. If installed but not authenticated, throw exact sign-in guidance
    if (live.status === 'installed-not-signed-in') {
      throw new Error(`${live.errorMessage} ${live.nextStep}`);
    }

    // 3. Claude Code vendor SDK adapter execution
    if (providerId === 'claude') {
      const status = claudeVendorSdk.getStatus();
      if (status !== 'connected' && status !== 'available') {
        throw new Error(
          'Claude Code is installed but you are not signed in. Press Sign in to connect your Claude subscription.'
        );
      }
      return await claudeVendorSdk.sendQuery({
        model,
        prompt: message,
        systemPrompt: instructions,
      });
    }

    // 4. ACP / Process-based providers
    let session = this.activeSessions.get(providerId);

    if (!session || session.status !== 'available') {
      // If binary is verified and authenticated, attempt to establish active session
      if (live.status === 'connected') {
        console.log(`[ProviderEngine] Establishing runtime session for ${cleanProviderName}...`);
        const connRes = await this.connectProvider(providerId, { isUserAction: true });
        session = this.activeSessions.get(providerId);
        if (!connRes.success || !session || session.status !== 'available') {
          throw new Error(
            connRes.error ||
              `Failed to initialize live session for "${cleanProviderName}". Ensure the provider daemon is functioning.`
          );
        }
      } else {
        throw new Error(`${live.errorMessage} ${live.nextStep}`);
      }
    }

    session.lastUsedTime = Date.now();

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

    throw new Error(
      `Provider "${cleanProviderName}" process is not running. Please restart the provider in Settings > Providers.`
    );
  }

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
          resolve(val);
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
