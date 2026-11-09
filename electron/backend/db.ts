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
  kind: 'main' | 'side' | 'branch';
  parent_thread_id?: string;
  created_at: string;
  last_activity: string;
  state: string;
}

export interface DBMessage {
  id: string;
  thread_id: string;
  turn_id: string;
  author: 'user' | 'agent' | 'channel_member';
  kind: 'text' | 'question' | 'approval' | 'tool-step' | 'memory-change' | 'file';
  body: string;
  attachments?: string;
  reactions?: string;
  created_at: string;
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
      kind TEXT NOT NULL DEFAULT 'main',
      parent_thread_id TEXT,
      created_at TEXT NOT NULL,
      last_activity TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'active',
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
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
      state TEXT NOT NULL DEFAULT 'active',
      last_run TEXT,
      next_run TEXT,
      created_at TEXT NOT NULL
    );
  `);

  saveDatabase(db);
  dbInstance = db;
  return db;
}
