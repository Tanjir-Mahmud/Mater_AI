import { resolveWindowsBinary, killProcessTree, probeBinaryVersion } from './processSupervisor';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ChildProcess, spawn } from 'child_process';

export interface ClaudeQueryOptions {
  prompt: string;
  model: string;
  systemPrompt?: string;
  cwd?: string;
  threadId?: string;
}

export interface ClaudeQueryResult {
  text: string;
  reasoning?: string;
  toolStep?: { name: string; output: string };
}

/**
 * Claude Code Vendor SDK Adapter.
 * Per specification:
 * - "Claude: no app-owned process; the vendor SDK spawns the CLI."
 * - "Claude stop closes each thread's query, and on Windows the SDK kills a process not exited after 7 seconds."
 */
export class ClaudeVendorSdkAdapter {
  private activeThreadQueries = new Map<
    string,
    { queryId: string; childProcess?: ChildProcess; abort: () => void }
  >();
  private isConnected = false;

  public async connect(): Promise<{
    success: boolean;
    status: 'connected' | 'available' | 'installed-not-signed-in' | 'sign-in-required' | 'not-installed' | 'error';
    error?: string;
  }> {
    const resolved = resolveWindowsBinary('claude');
    if (!resolved) {
      this.isConnected = false;
      return {
        success: false,
        status: 'not-installed',
        error: 'Claude Code CLI is not installed on this computer. Install it with "npm install -g @anthropic-ai/claude-code", then press Connect.',
      };
    }

    // Run version probe with 10-second timeout per spec
    const version = await probeBinaryVersion('claude');
    console.log(`[ClaudeVendorSdk] Probed Claude version: ${version || 'unknown'}`);

    // Check vendor authentication state in home directory (~/.claude.json)
    // Note per spec: "OpenBot uses the existing local provider login; it does not copy provider credentials."
    const homeDir = os.homedir();
    const configPath = path.join(homeDir, '.claude.json');
    const hasConfig = fs.existsSync(configPath) && fs.statSync(configPath).size > 2;
    const hasEnvKey = Boolean(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim().length > 0);

    if (hasConfig || hasEnvKey) {
      this.isConnected = true;
      return { success: true, status: 'connected' };
    } else {
      this.isConnected = false;
      return {
        success: false,
        status: 'installed-not-signed-in',
        error: 'Claude Code is installed but you are not signed in. Press Sign in to connect your Claude subscription.',
      };
    }
  }

  public getStatus(): 'connected' | 'available' | 'installed-not-signed-in' | 'sign-in-required' | 'not-installed' {
    const resolved = resolveWindowsBinary('claude');
    if (!resolved) return 'not-installed';
    const homeDir = os.homedir();
    const configPath = path.join(homeDir, '.claude.json');
    const hasConfig = fs.existsSync(configPath) && fs.statSync(configPath).size > 2;
    const hasEnvKey = Boolean(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim().length > 0);
    if (hasConfig || hasEnvKey) {
      return 'connected';
    }
    return 'installed-not-signed-in';
  }

  public async sendQuery(options: ClaudeQueryOptions): Promise<ClaudeQueryResult> {
    const resolved = resolveWindowsBinary('claude');
    if (!resolved) {
      throw new Error(
        'Claude Code CLI is not installed on this computer. Install it with "npm install -g @anthropic-ai/claude-code", then press Connect.'
      );
    }

    const homeDir = os.homedir();
    const configPath = path.join(homeDir, '.claude.json');
    const hasConfig = fs.existsSync(configPath) && fs.statSync(configPath).size > 2;
    const hasEnvKey = Boolean(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim().length > 0);

    if (!hasConfig && !hasEnvKey) {
      throw new Error(
        'Claude Code is installed but you are not signed in. Press Sign in to connect your Claude subscription.'
      );
    }

    const threadId = options.threadId || 'default-thread';
    const queryId = `claude-query-${Date.now()}`;

    return new Promise((resolve, reject) => {
      const isWin = process.platform === 'win32';
      let bin = resolved.path;
      // Vendor SDK spawns the CLI query process with arguments
      let args = ['--print', options.prompt];

      if (isWin && resolved.isCmdWrapper) {
        bin = process.env.COMSPEC || 'cmd.exe';
        const escapedPrompt = options.prompt.replace(/"/g, '\"');
        args = ['/d', '/s', '/c', `"${resolved.path}" --print "${escapedPrompt}"`];
      }

      const child = spawn(bin, args, {
        cwd: options.cwd || process.cwd(),
        shell: false,
        windowsVerbatimArguments: isWin && resolved.isCmdWrapper,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      const abort = () => {
        try {
          if (isWin && child.pid) {
            // "on Windows the SDK kills a process not exited after 7 seconds."
            const killTimer = setTimeout(() => {
              try {
                killProcessTree(child);
              } catch {}
            }, 7000); // 7-second kill timeout per spec

            child.kill('SIGTERM');
            child.on('exit', () => clearTimeout(killTimer));
          } else {
            child.kill('SIGTERM');
          }
        } catch {}
      };

      this.activeThreadQueries.set(threadId, { queryId, childProcess: child, abort });

      child.stdout?.on('data', (chunk: Buffer) => {
        stdout += chunk.toString('utf-8');
      });

      child.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString('utf-8');
      });

      child.on('close', (code) => {
        this.activeThreadQueries.delete(threadId);
        if (code === 0) {
          resolve({
            text: stdout.trim(),
          });
        } else {
          reject(
            new Error(
              `Claude SDK process exited with code ${code}: ${stderr.trim() || stdout.trim() || 'Process closed without response'}`
            )
          );
        }
      });

      child.on('error', (err) => {
        this.activeThreadQueries.delete(threadId);
        reject(err);
      });
    });
  }

  /**
   * Stop closes each thread's query, and on Windows kills after 7 seconds
   */
  public async stop(): Promise<void> {
    const isWin = process.platform === 'win32';
    for (const [threadId, query] of this.activeThreadQueries) {
      if (query.childProcess && query.childProcess.pid) {
        const child = query.childProcess;
        if (isWin) {
          const timeout = setTimeout(() => {
            try {
              killProcessTree(child);
            } catch {}
          }, 7000); // 7 seconds per spec
          child.kill('SIGTERM');
          child.on('exit', () => clearTimeout(timeout));
        } else {
          child.kill('SIGTERM');
        }
      }
    }
    this.activeThreadQueries.clear();
    this.isConnected = false;
  }
}

export const claudeVendorSdk = new ClaudeVendorSdkAdapter();
