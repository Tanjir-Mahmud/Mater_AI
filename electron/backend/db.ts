import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

export interface DBAgent {
  id: string;
  name: string;
  role: string;
  avatar: string;
  avatar_color?: string;
  status: string;
  status_message?: string;
  unread_count: number;
  section: string;
  is_pinned: number;
  is_hidden: number;
  model: string;
  provider: string;
  reasoning_level: string;
  notification_level: string;
  browser_profile: string;
  workspace_path: string;
  created_at: string;
  updated_at: string;
}

export interface DBThread {
  id: string;
  agent_id: string;
  title: string;
  kind: 'main' | 'side' | 'branch';
  parent_thread_id?: string;
  created_at: string;
  last_activity: string;
  state: 'active' | 'closed';
}

export interface DBTurn {
  id: string;
  thread_id: string;
  agent_id: string;
  sequence: number;
  status: 'queued' | 'running' | 'waiting-input' | 'waiting-approval' | 'waiting-browser' | 'done' | 'failed' | 'cancelled';
  started_at: string;
  finished_at?: string;
  error?: string;
}

export interface DBMessageQueueEntry {
  id: string;
  agent_id: string;
  thread_id: string;
  turn_id?: string;
  message_payload: string; // JSON { text, attachments }
  position: number;
  state: 'queued' | 'paused' | 'running' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface DBAttachment {
  id: string;
  message_id: string;
  file_name: string;
  size: number;
  type: string;
  storage_path: string;
  sha256: string;
  created_at: string;
}

export interface DBMessage {
  id: string;
  thread_id: string;
  turn_id: string;
  author: 'user' | 'agent' | 'channel_member';
  kind: 'text' | 'question' | 'approval' | 'tool-step' | 'memory-change' | 'file' | 'compaction-summary';
  body: string;
  attachments?: string;
  reactions?: string;
  created_at: string;
}

export interface DBBackgroundProcess {
  id: string;
  command: string;
  pid: number;
  started_at: string;
  ports: string; // JSON array of numbers e.g. [3000, 8080]
  agent_id?: string;
  state: 'running' | 'stopped';
}

export interface DBMCPServer {
  id: string;
  name: string;
  type: 'stdio' | 'sse' | 'http';
  command?: string;
  args?: string;
  url?: string;
  headers?: string;
  enabled: number;
  status: 'connected' | 'disconnected' | 'testing';
  created_at: string;
}

export interface DBSkill {
  id: string;
  name: string;
  instructions: string;
  description?: string;
  icon?: string;
  enabled: number;
}

export interface DBMetaMemory {
  id: string;
  agent_id: string;
  fact_text: string;
  is_essential: number;
  byte_size: number;
  created_at: string;
}

export interface DBRoutine {
  id: string;
  agent_id?: string;
  channel_id?: string;
  instruction: string;
  trigger_type: 'schedule' | 'webhook';
  trigger_value: string;
  filters: string; // JSON array (max 128)
  webhook_route_id?: string; // (max 64 routes system-wide)
  on_closed_action: 'skip' | 'run_once_on_open';
  is_quiet: number;
  state: 'active' | 'paused';
  last_run?: string;
  next_run?: string;
  created_at: string;
}

export interface DBWorkflow {
  id: string;
  title: string;
  description?: string;
  graph_json: string;
  created_at: string;
  updated_at: string;
}

export interface DBWorkflowRun {
  id: string;
  workflow_id: string;
  status: 'running' | 'waiting_approval' | 'completed' | 'failed';
  started_at: string;
  finished_at?: string;
  result?: string;
}

export interface DBBackupModel {
  agent_id: string;
  model_name: string;
  provider_id: string;
  priority: number; // 1 to 8 (max 8)
}

let SQL: SqlJsStatic | null = null;
let dbInstance: Database | null = null;

export function getAppBaseDir(): string {
  const dir = path.join(app.getPath('userData'), 'OpenBotData');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function getAgentWorkspaceDir(agentId: string): string {
  const base = getAppBaseDir();
  const dir = path.join(base, 'Agents', agentId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function getSharedTransfersDir(): string {
  const base = getAppBaseDir();
  const dir = path.join(base, 'Shared', 'Transfers');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function getDownloadsDir(): string {
  const base = getAppBaseDir();
  const dir = path.join(base, 'Downloads');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function deleteAgentWorkspace(agentId: string): boolean {
  try {
    const base = getAppBaseDir();
    const dir = path.join(base, 'Agents', agentId);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    if (dbInstance) {
      dbInstance.run('DELETE FROM agents WHERE id = ?;', [agentId]);
      saveDatabase();
    }
    return true;
  } catch (err) {
    console.error(`Failed to delete workspace for agent ${agentId}:`, err);
  }
  return false;
}

export function saveDatabase(db?: Database) {
  const target = db || dbInstance;
  if (!target) return;
  try {
    const dbPath = path.join(getAppBaseDir(), 'openbot.sqlite');
    const data = target.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (err) {
    console.error('Error saving SQLite database to disk:', err);
  }
}

export async function initDatabase(): Promise<Database> {
  if (dbInstance) return dbInstance;

  if (!SQL) {
    SQL = await initSqlJs();
  }

  const dbPath = path.join(getAppBaseDir(), 'openbot.sqlite');
  let db: Database;
  if (fs.existsSync(dbPath)) {
    try {
      const fileBuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
    } catch {
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  // Schema migrations v1
  db.run(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      avatar TEXT NOT NULL,
      avatar_color TEXT,
      status TEXT NOT NULL DEFAULT 'idle',
      status_message TEXT,
      unread_count INTEGER NOT NULL DEFAULT 0,
      section TEXT NOT NULL DEFAULT 'unassigned',
      is_pinned INTEGER NOT NULL DEFAULT 0,
      is_hidden INTEGER NOT NULL DEFAULT 0,
      model TEXT NOT NULL,
      provider TEXT NOT NULL,
      reasoning_level TEXT NOT NULL DEFAULT 'high',
      notification_level TEXT NOT NULL DEFAULT 'all',
      browser_profile TEXT NOT NULL DEFAULT 'shared',
      workspace_path TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS threads (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT 'Main Thread',
      kind TEXT NOT NULL DEFAULT 'main',
      parent_thread_id TEXT,
      created_at TEXT NOT NULL,
      last_activity TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'active',
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS turns (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      sequence INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      started_at TEXT NOT NULL,
      finished_at TEXT,
      error TEXT,
      FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS message_queue (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      thread_id TEXT NOT NULL,
      turn_id TEXT,
      message_payload TEXT NOT NULL,
      position INTEGER NOT NULL,
      state TEXT NOT NULL DEFAULT 'queued',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      size INTEGER NOT NULL,
      type TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      sha256 TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      turn_id TEXT NOT NULL,
      author TEXT NOT NULL,
      kind TEXT NOT NULL,
      body TEXT NOT NULL,
      attachments TEXT,
      reactions TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      fact_text TEXT NOT NULL,
      is_essential INTEGER NOT NULL DEFAULT 0,
      byte_size INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS routines (
      id TEXT PRIMARY KEY,
      agent_id TEXT,
      channel_id TEXT,
      instruction TEXT NOT NULL,
      trigger_type TEXT NOT NULL,
      trigger_value TEXT NOT NULL,
      filters TEXT NOT NULL DEFAULT '[]',
      webhook_route_id TEXT,
      on_closed_action TEXT NOT NULL DEFAULT 'skip',
      is_quiet INTEGER NOT NULL DEFAULT 0,
      state TEXT NOT NULL DEFAULT 'active',
      last_run TEXT,
      next_run TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS background_processes (
      id TEXT PRIMARY KEY,
      command TEXT NOT NULL,
      pid INTEGER NOT NULL,
      started_at TEXT NOT NULL,
      ports TEXT NOT NULL DEFAULT '[]',
      agent_id TEXT,
      state TEXT NOT NULL DEFAULT 'running'
    );

    CREATE TABLE IF NOT EXISTS mcp_servers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'stdio',
      command TEXT,
      args TEXT,
      url TEXT,
      headers TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'connected',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      instructions TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      enabled INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS agent_skills (
      agent_id TEXT NOT NULL,
      skill_id TEXT NOT NULL,
      PRIMARY KEY (agent_id, skill_id),
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
      FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS webhook_receipts (
      delivery_id TEXT PRIMARY KEY,
      route_id TEXT NOT NULL,
      received_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workflows (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      graph_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workflow_runs (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'running',
      started_at TEXT NOT NULL,
      finished_at TEXT,
      result TEXT,
      FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS workflow_steps (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      node_id TEXT NOT NULL,
      agent_id TEXT,
      status TEXT NOT NULL DEFAULT 'running',
      output TEXT,
      attempt INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (run_id) REFERENCES workflow_runs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS workflow_versions (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      graph_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS backup_models (
      agent_id TEXT NOT NULL,
      model_name TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      priority INTEGER NOT NULL,
      PRIMARY KEY (agent_id, priority),
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );
  `);

  try {
    db.run(`ALTER TABLE threads ADD COLUMN title TEXT NOT NULL DEFAULT 'Main Thread';`);
  } catch {}

  try {
    db.run(`ALTER TABLE memories ADD COLUMN byte_size INTEGER NOT NULL DEFAULT 0;`);
  } catch {}

  try {
    db.run(`ALTER TABLE routines ADD COLUMN filters TEXT NOT NULL DEFAULT '[]';`);
  } catch {}

  try {
    db.run(`ALTER TABLE routines ADD COLUMN webhook_route_id TEXT;`);
  } catch {}

  try {
    db.run(`ALTER TABLE routines ADD COLUMN on_closed_action TEXT NOT NULL DEFAULT 'skip';`);
  } catch {}

  try {
    db.run(`ALTER TABLE routines ADD COLUMN is_quiet INTEGER NOT NULL DEFAULT 0;`);
  } catch {}

  saveDatabase(db);
  dbInstance = db;
  return db;
}
