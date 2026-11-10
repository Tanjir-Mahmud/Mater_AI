import { spawn, execSync, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';

export interface LaunchOptions {
  providerId: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  cwd?: string;
  lineLengthLimit?: number;
  onStdoutLine?: (line: string) => void;
  onStderrLine?: (line: string) => void;
  onExit?: (code: number | null, signal: string | null) => void;
}

export interface ResolvedBinary {
  path: string;
  isCmdWrapper: boolean;
}

/**
 * Resolves a binary on Windows using system `where` lookup with 5s timeout & 64KB cap.
 * Follows strict extension precedence: .exe before .cmd/.bat
 */
export function resolveWindowsBinary(bareName: string): ResolvedBinary | null {
  // If already an existing path
  if (fs.existsSync(bareName)) {
    const isCmd = bareName.toLowerCase().endsWith('.cmd') || bareName.toLowerCase().endsWith('.bat');
    return { path: bareName, isCmdWrapper: isCmd };
  }

  // Check explicit override first
  const overrideKey = `OPENBOT_${bareName.toUpperCase()}_PATH`;
  if (process.env[overrideKey] && fs.existsSync(process.env[overrideKey]!)) {
    const p = process.env[overrideKey]!;
    return { path: p, isCmdWrapper: p.endsWith('.cmd') || p.endsWith('.bat') };
  }

  if (process.platform !== 'win32') {
    try {
      const output = execSync(`which ${bareName}`, { timeout: 5000, encoding: 'utf-8', maxBuffer: 64 * 1024 });
      const firstLine = output.trim().split('\n')[0];
      if (firstLine && fs.existsSync(firstLine)) {
        return { path: firstLine, isCmdWrapper: false };
      }
    } catch {
      return null;
    }
  }

  try {
    const output = execSync(`where.exe ${bareName}`, {
      timeout: 5000,
      encoding: 'utf-8',
      maxBuffer: 64 * 1024,
    });
    const lines = output.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);

    // .exe before .cmd/.bat
    const exeMatch = lines.find((l) => l.toLowerCase().endsWith('.exe'));
    if (exeMatch && fs.existsSync(exeMatch)) {
      return { path: exeMatch, isCmdWrapper: false };
    }

    const cmdMatch = lines.find((l) => l.toLowerCase().endsWith('.cmd') || l.toLowerCase().endsWith('.bat'));
    if (cmdMatch && fs.existsSync(cmdMatch)) {
      return { path: cmdMatch, isCmdWrapper: true };
    }

    if (lines[0] && fs.existsSync(lines[0])) {
      return { path: lines[0], isCmdWrapper: lines[0].endsWith('.cmd') || lines[0].endsWith('.bat') };
    }
  } catch {
    // If where lookup fails, check PATH directories manually
  }

  return null;
}

/**
 * Spawns child process without shell, handling Windows .cmd wrappers safely
 */
export function spawnSupervisedProcess(options: LaunchOptions): ChildProcess {
  const isWin = process.platform === 'win32';
  const resolved = resolveWindowsBinary(options.command);

  let binaryPath = resolved ? resolved.path : options.command;
  let spawnArgs = options.args;
  let useShell = false;

  // Windows wrapper handling per Section 7
  if (isWin && resolved?.isCmdWrapper) {
    binaryPath = process.env.COMSPEC || 'cmd.exe';
    // Run through Windows command processor as one quoted command line
    const fullCmd = `"${resolved.path}" ${options.args.map((a) => (a.includes(' ') ? `"${a}"` : a)).join(' ')}`;
    spawnArgs = ['/d', '/s', '/c', fullCmd];
    useShell = false;
  }

  const childEnv: Record<string, string> = {
    ...process.env,
    ...(options.env || {}),
  };

  const child = spawn(binaryPath, spawnArgs, {
    cwd: options.cwd || process.cwd(),
    env: childEnv,
    shell: useShell,
    windowsVerbatimArguments: isWin && !!resolved?.isCmdWrapper,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const lineLimit = options.lineLengthLimit || 1024 * 1024; // 1MB line limit default
  let stdoutBuffer = '';

  child.stdout?.on('data', (chunk: Buffer) => {
    stdoutBuffer += chunk.toString('utf-8');
    if (stdoutBuffer.length > lineLimit) {
      console.warn(`[ProcessSupervisor] Line-length limit (${lineLimit}) exceeded for ${options.providerId}. Ending process.`);
      killProcessTree(child);
      return;
    }

    let newlineIndex: number;
    while ((newlineIndex = stdoutBuffer.indexOf('\n')) !== -1) {
      const line = stdoutBuffer.substring(0, newlineIndex).trim();
      stdoutBuffer = stdoutBuffer.substring(newlineIndex + 1);
      if (line && options.onStdoutLine) {
        options.onStdoutLine(line);
      }
    }
  });

  child.stderr?.on('data', (chunk: Buffer) => {
    const raw = chunk.toString('utf-8');
    // Redacted diagnostic stream
    const redacted = raw.replace(/(bearer\s+[a-zA-Z0-9_\-\.]+)|(key=[a-zA-Z0-9_\-]+)/gi, '[REDACTED]');
    if (options.onStderrLine) {
      options.onStderrLine(redacted);
    }
  });

  child.on('close', (code, signal) => {
    if (options.onExit) {
      options.onExit(code, signal);
    }
  });

  return child;
}

/**
 * Process tree termination:
 * On Windows, calls taskkill /PID <pid> /T /F to forcibly kill the tree.
 */
export function killProcessTree(child: ChildProcess): void {
  if (!child.pid) return;

  if (process.platform === 'win32') {
    try {
      execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: 'ignore' });
    } catch {
      try {
        child.kill('SIGKILL');
      } catch {}
    }
  } else {
    try {
      process.kill(-child.pid, 'SIGTERM');
      setTimeout(() => {
        try {
          process.kill(-child.pid, 'SIGKILL');
        } catch {}
      }, 2000);
    } catch {
      child.kill('SIGTERM');
    }
  }
}

/**
 * Probes the installed version of a binary with 10-second timeout and 64KB cap per Section 3
 */
export function probeBinaryVersion(command: string): Promise<string | null> {
  return new Promise((resolve) => {
    const resolved = resolveWindowsBinary(command);
    if (!resolved) {
      return resolve(null);
    }

    const isWin = process.platform === 'win32';
    let execCmd = resolved.path;
    let args = ['--version'];

    if (isWin && resolved.isCmdWrapper) {
      execCmd = process.env.COMSPEC || 'cmd.exe';
      args = ['/d', '/s', '/c', `"${resolved.path}" --version`];
    }

    let child: ChildProcess;
    try {
      child = spawn(execCmd, args, {
        windowsVerbatimArguments: isWin && resolved.isCmdWrapper,
        shell: false,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch {
      return resolve(null);
    }

    let stdout = '';
    const timeout = setTimeout(() => {
      try {
        killProcessTree(child);
      } catch {}
      resolve(null);
    }, 10_000); // 10s version probe timeout per Section 3

    child.stdout?.on('data', (d: Buffer) => {
      stdout += d.toString('utf-8');
      if (stdout.length > 64 * 1024) {
        killProcessTree(child);
      }
    });

    child.on('close', () => {
      clearTimeout(timeout);
      const match = stdout.match(/(\d+\.\d+\.\d+)/);
      resolve(match ? match[1] : null);
    });

    child.on('error', () => {
      clearTimeout(timeout);
      resolve(null);
    });
  });
}

/**
 * Compares two semantic version strings (e.g. "3.0.68" vs "3.0.60").
 * Returns true if detected >= minimum.
 */
export function isVersionAtLeast(detected: string, minimum: string): boolean {
  const parse = (v: string) => {
    const m = v.match(/(\d+)\.(\d+)\.(\d+)/);
    if (!m) return [0, 0, 0];
    return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
  };
  const [dMaj, dMin, dPatch] = parse(detected);
  const [mMaj, mMin, mPatch] = parse(minimum);

  if (dMaj > mMaj) return true;
  if (dMaj < mMaj) return false;
  if (dMin > mMin) return true;
  if (dMin < mMin) return false;
  return dPatch >= mPatch;
}
