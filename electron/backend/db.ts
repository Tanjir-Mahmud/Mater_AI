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

export interface DBTeamServer {
  id: string;
  name: string;
  logo?: string;
  is_local: number;
  publish_state: 'reachable' | 'not-reachable';
  status: string;
  plan?: string;
  timezone: string;
  public_key?: string;
  private_key?: string;
  key_fingerprint?: string;
  key_rotated_at?: string;
  last_active_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DBServerMember {
  id: string;
  server_id: string;
  name: string;
  email: string;
  server_role: 'owner' | 'admin' | 'member';
  status: 'online' | 'offline' | 'invited';
  created_at: string;
}

export interface DBMemberAgentAccess {
  member_id: string;
  agent_id: string;
  access_level: 'none' | 'view' | 'chat' | 'manage';
}

export interface DBChannel {
  id: string;
  server_id: string;
  name: string;
  lead_agent_id?: string;
  member_agent_ids: string; // JSON array
  task_owner_id?: string;
  status: 'active' | 'deleted' | 'archived';
  active_assignments_count: number;
  deleted_at?: string;
  created_at: string;
}

export interface DBSharedTable {
  id: string;
  name: string;
  creator_agent_id: string;
  columns_json: string;
  rows_json: string;
  created_at: string;
  updated_at: string;
}

export interface DBAuditLog {
  id: string;
  server_id: string;
  action: string;
  actor: string;
  details: string;
  timestamp: string;
}

export interface DBRemoteDesktopSession {
  id: string;
  server_id: string;
  target_name: string;
  four_digit_code: string;
  status: 'active' | 'expired' | 'connected';
  expires_at: string;
  created_at: string;
}

// Milestone 6: Integrations and Voice Interfaces
export interface DBConnector {
  id: string;
  service: string;
  name: string;
  status: 'connected' | 'not-connected' | 'connecting' | 'error';
  account_identifier?: string;
  auth_payload?: string;
  config?: string;
  created_at: string;
  updated_at: string;
}

export interface DBMessagingConnection {
  id: string;
  platform: 'slack' | 'discord' | 'telegram' | 'whatsapp';
  workspace_name: string;
  answering_agent_id: string;
  status: 'connected' | 'not-connected' | 'connecting' | 'error';
  signal_relay_connected: number;
  is_unofficial: number;
  details?: string;
  created_at: string;
  updated_at: string;
}

export interface DBVoiceSettings {
  id: string;
  dictation_engine: string;
  dictation_model: string;
  dictation_language: string;
  tts_voice: string;
  tts_model: string;
  tts_gender: 'female' | 'male';
  tts_language: string;
  tts_auto_read: number;
  api_keys: string; // JSON { elevenlabs, groq, xai }
  voice_server_address?: string;
  voice_server_api_key?: string;
  voice_server_status: 'Not set up' | 'Not in use' | 'Set up';
  voice_server_use_for_dictation: number;
  voice_server_use_for_tts: number;
  voice_server_dictation_model?: string;
  voice_server_tts_model?: string;
  voice_server_voice?: string;
  created_at: string;
  updated_at: string;
}

export interface DBHostedSite {
  id: string;
  subdomain: string;
  domain: string;
  site_title: string;
  author_agent_id?: string;
  source_files: string;
  status: 'published' | 'expired' | 'deleted';
  published_at: string;
  expires_at: string;
  deleted_at?: string;
}

export interface DBEnterpriseSSO {
  id: string;
  provider: 'entra' | 'okta' | 'google_workspace';
  client_id?: string;
  issuer_url?: string;
  scim_enabled: number;
  scim_status: string;
  created_at: string;
}

// Milestone 7: Auth and Billing Interfaces
export interface DBAuthCode {
  id: string;
  email: string;
  code_hash: string;
  salt: string;
  expires_at: string;
  consumed: number;
  created_at: string;
}

export interface DBAccountSession {
  id: string;
  user_id: string;
  session_token_hash: string;
  kind: 'Desktop' | 'Mobile' | 'Hosted server';
  device_name: string;
  ip_address?: string;
  is_this_device: number;
  signed_in_at: string;
  last_active_at: string;
  status: 'active' | 'revoked';
}

export interface DBUserProfile {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
  birth_date: string;
  has_legal_capacity: number;
  encrypted_session_token: string;
  created_at: string;
  updated_at: string;
}

export interface DBExtendedSSOConfig {
  id: string;
  provider: 'entra' | 'okta' | 'google_workspace';
  issuer_url: string;
  client_id: string;
  client_secret?: string;
  email_domains: string; // JSON array of strings
  dns_txt_record: string;
  dns_verified: number;
  scim_token_hash?: string;
  scim_status: string;
  is_active: number;
  is_desktop_only: number;
  created_at: string;
}

export interface DBMobileConnect {
  id: string;
  user_id: string;
  one_time_code_hash?: string;
  one_time_code_expires_at?: string;
  permanent_link_token?: string;
  permanent_link_warning: string;
  status: string;
  created_at: string;
}

export interface DBCommercialLicence {
  id: string;
  user_id: string;
  plan_tier: 'Starter' | 'Team';
  seats: number;
  billing_cycle: 'monthly' | 'yearly';
  currency: 'EUR' | 'USD' | 'PLN';
  has_hosted_server_bundle: number;
  amount_per_cycle: number;
  stripe_subscription_id: string;
  status: 'active' | 'cancelled' | 'past_due';
  company_name: string;
  tax_id: string;
  buyer_authorized: number;
  accepted_at: string;
  terms_version: string;
  order_ref: string;
  licensor: string;
  max_devices_per_user: number;
  created_at: string;
  updated_at: string;
}

export interface DBHostedServerSubscription {
  id: string;
  server_id: string;
  server_name: string;
  plan_tier: 'Starter' | 'Standard' | 'Pro' | 'self-hosted';
  storage_gb: number;
  members_limit: number;
  sites_limit: number;
  speed_multiplier: number;
  billing_cycle: 'monthly' | 'yearly';
  currency: 'EUR' | 'USD' | 'PLN';
  monthly_price: number;
  stripe_subscription_id: string;
  stripe_status: 'active' | 'cancelled' | 'past_due';
  server_removed: number;
  current_period_end: string;
  created_at: string;
  updated_at: string;
}

export interface DBLicenceOfflineState {
  id: string;
  last_validated_at: string;
  offline_grace_hours: number;
  is_blocked: number;
  last_validation_error?: string;
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

export function getSharedDir(): string {
  const base = getAppBaseDir();
  const dir = path.join(base, 'Shared');
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

export function getDatabase(): Database {
  if (!dbInstance) {
    throw new Error('Database not initialised yet. Call initDatabase() first.');
  }
  return dbInstance;
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

    CREATE TABLE IF NOT EXISTS team_servers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      logo TEXT,
      is_local INTEGER NOT NULL DEFAULT 1,
      publish_state TEXT NOT NULL DEFAULT 'not-reachable',
      status TEXT NOT NULL DEFAULT 'online',
      plan TEXT DEFAULT 'Starter',
      timezone TEXT NOT NULL DEFAULT 'Automatic',
      public_key TEXT,
      private_key TEXT,
      key_fingerprint TEXT,
      key_rotated_at TEXT,
      last_active_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS server_members (
      id TEXT PRIMARY KEY,
      server_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      server_role TEXT NOT NULL DEFAULT 'member',
      status TEXT NOT NULL DEFAULT 'online',
      created_at TEXT NOT NULL,
      FOREIGN KEY (server_id) REFERENCES team_servers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS member_agent_access (
      member_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      access_level TEXT NOT NULL DEFAULT 'chat',
      PRIMARY KEY (member_id, agent_id),
      FOREIGN KEY (member_id) REFERENCES server_members(id) ON DELETE CASCADE,
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY,
      server_id TEXT NOT NULL,
      name TEXT NOT NULL,
      lead_agent_id TEXT,
      member_agent_ids TEXT NOT NULL DEFAULT '[]',
      task_owner_id TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      active_assignments_count INTEGER NOT NULL DEFAULT 0,
      deleted_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (server_id) REFERENCES team_servers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS channel_assignments (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      assigned_at TEXT NOT NULL,
      FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS shared_tables (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      creator_agent_id TEXT NOT NULL,
      columns_json TEXT NOT NULL,
      rows_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      server_id TEXT NOT NULL,
      action TEXT NOT NULL,
      actor TEXT NOT NULL,
      details TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS remote_desktop_sessions (
      id TEXT PRIMARY KEY,
      server_id TEXT NOT NULL,
      target_name TEXT NOT NULL,
      four_digit_code TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS connectors (
      id TEXT PRIMARY KEY,
      service TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'not-connected',
      account_identifier TEXT,
      auth_payload TEXT,
      config TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messaging_connections (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      workspace_name TEXT NOT NULL,
      answering_agent_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'not-connected',
      signal_relay_connected INTEGER NOT NULL DEFAULT 0,
      is_unofficial INTEGER NOT NULL DEFAULT 0,
      details TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS voice_settings (
      id TEXT PRIMARY KEY,
      dictation_engine TEXT NOT NULL DEFAULT 'parakeet',
      dictation_model TEXT NOT NULL DEFAULT 'Parakeet',
      dictation_language TEXT NOT NULL DEFAULT 'Automatic',
      tts_voice TEXT NOT NULL DEFAULT 'Female (Nova)',
      tts_model TEXT NOT NULL DEFAULT 'Flash',
      tts_gender TEXT NOT NULL DEFAULT 'female',
      tts_language TEXT NOT NULL DEFAULT 'en',
      tts_auto_read INTEGER NOT NULL DEFAULT 1,
      api_keys TEXT NOT NULL DEFAULT '{}',
      voice_server_address TEXT,
      voice_server_api_key TEXT,
      voice_server_status TEXT NOT NULL DEFAULT 'Not set up',
      voice_server_use_for_dictation INTEGER NOT NULL DEFAULT 0,
      voice_server_use_for_tts INTEGER NOT NULL DEFAULT 0,
      voice_server_dictation_model TEXT,
      voice_server_tts_model TEXT,
      voice_server_voice TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS hosted_sites (
      id TEXT PRIMARY KEY,
      subdomain TEXT NOT NULL UNIQUE,
      domain TEXT NOT NULL DEFAULT 'openbot.site',
      site_title TEXT NOT NULL,
      author_agent_id TEXT,
      source_files TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'published',
      published_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS enterprise_sso (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      client_id TEXT,
      issuer_url TEXT,
      scim_enabled INTEGER NOT NULL DEFAULT 1,
      scim_status TEXT NOT NULL DEFAULT 'synced',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS auth_codes (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      consumed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS account_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      session_token_hash TEXT NOT NULL,
      kind TEXT NOT NULL,
      device_name TEXT NOT NULL,
      ip_address TEXT,
      is_this_device INTEGER NOT NULL DEFAULT 0,
      signed_in_at TEXT NOT NULL,
      last_active_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS user_profiles (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      avatar_url TEXT NOT NULL,
      birth_date TEXT NOT NULL,
      has_legal_capacity INTEGER NOT NULL DEFAULT 1,
      encrypted_session_token TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sso_configs (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      issuer_url TEXT NOT NULL,
      client_id TEXT NOT NULL,
      client_secret TEXT,
      email_domains TEXT NOT NULL DEFAULT '[]',
      dns_txt_record TEXT NOT NULL,
      dns_verified INTEGER NOT NULL DEFAULT 0,
      scim_token_hash TEXT,
      scim_status TEXT NOT NULL DEFAULT 'disabled',
      is_active INTEGER NOT NULL DEFAULT 0,
      is_desktop_only INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mobile_connect_links (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      one_time_code_hash TEXT,
      one_time_code_expires_at TEXT,
      permanent_link_token TEXT,
      permanent_link_warning TEXT NOT NULL DEFAULT 'Anyone with this link can sign in to your OpenBot account.',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS commercial_licences (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      plan_tier TEXT NOT NULL,
      seats INTEGER NOT NULL,
      billing_cycle TEXT NOT NULL,
      currency TEXT NOT NULL,
      has_hosted_server_bundle INTEGER NOT NULL DEFAULT 0,
      amount_per_cycle REAL NOT NULL,
      stripe_subscription_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      company_name TEXT NOT NULL,
      tax_id TEXT NOT NULL,
      buyer_authorized INTEGER NOT NULL DEFAULT 1,
      accepted_at TEXT NOT NULL,
      terms_version TEXT NOT NULL DEFAULT 'v1.0',
      order_ref TEXT NOT NULL,
      licensor TEXT NOT NULL DEFAULT 'Synthetify Labs, Trzebunia 513, 32-438 Trzebunia, Poland, KRS 0000895882; Polish law governs.',
      max_devices_per_user INTEGER NOT NULL DEFAULT 3,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS hosted_server_subscriptions (
      id TEXT PRIMARY KEY,
      server_id TEXT NOT NULL,
      server_name TEXT NOT NULL,
      plan_tier TEXT NOT NULL,
      storage_gb INTEGER NOT NULL,
      members_limit INTEGER NOT NULL,
      sites_limit INTEGER NOT NULL,
      speed_multiplier REAL NOT NULL,
      billing_cycle TEXT NOT NULL,
      currency TEXT NOT NULL,
      monthly_price REAL NOT NULL,
      stripe_subscription_id TEXT NOT NULL,
      stripe_status TEXT NOT NULL DEFAULT 'active',
      server_removed INTEGER NOT NULL DEFAULT 0,
      current_period_end TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS licence_offline_state (
      id TEXT PRIMARY KEY,
      last_validated_at TEXT NOT NULL,
      offline_grace_hours INTEGER NOT NULL DEFAULT 24,
      is_blocked INTEGER NOT NULL DEFAULT 0,
      last_validation_error TEXT
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

  try {
    db.run(`ALTER TABLE team_servers ADD COLUMN public_key TEXT;`);
  } catch {}

  try {
    db.run(`ALTER TABLE team_servers ADD COLUMN private_key TEXT;`);
  } catch {}

  try {
    db.run(`ALTER TABLE team_servers ADD COLUMN key_fingerprint TEXT;`);
  } catch {}

  saveDatabase(db);
  dbInstance = db;
  return db;
}
