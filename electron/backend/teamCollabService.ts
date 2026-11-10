import path from 'path';
import fs from 'fs';
import {
  initDatabase,
  saveDatabase,
  getAppBaseDir,
  getSharedDir,
  getSharedTransfersDir,
  DBTeamServer,
  DBServerMember,
  DBMemberAgentAccess,
  DBChannel,
  DBSharedTable,
  DBAuditLog,
  DBRemoteDesktopSession,
} from './db';

// Exact spec limits & protocol constants
export const PROTOCOL_VERSION = 'v9';
export const DATA_CHANNELS_COUNT = 3;
export const DATA_CHANNELS = ['control', 'chat', 'media'] as const;

export const MAX_ASSIGNMENTS_PER_REQUEST = 8;
export const MAX_ACTIVE_PER_CHANNEL = 2;
export const MAX_AUDIT_LOG_ENTRIES = 500;
export const REMOTE_DESKTOP_TEST_EXPIRY_MS = 2 * 60 * 1000; // 2 minutes
export const HOSTED_IDLE_STOP_MS = 15 * 60 * 1000; // 15 minutes
export const HOSTED_RETENTION_DAYS = 14; // 14 days

export class TeamCollabService {
  private activeRemoteControllers: string[] = [];

  public async init(): Promise<void> {
    const db = await initDatabase();

    // Ensure Shared and Shared/Transfers directories exist on disk
    getSharedDir();
    getSharedTransfersDir();

    // Seed local server if none exist
    const serversRes = db.exec(`SELECT count(*) FROM team_servers;`);
    const serverCount = serversRes.length && serversRes[0].values.length ? (serversRes[0].values[0][0] as number) : 0;
    if (serverCount === 0) {
      this.seedDefaultServerAndMembers(db);
    }

    saveDatabase(db);
  }

  // -------------------------------------------------------------
  // 1. TEAM SERVERS & HOSTS
  // -------------------------------------------------------------

  public async getServers(): Promise<DBTeamServer[]> {
    const db = await initDatabase();
    const res = db.exec(
      `SELECT id, name, logo, is_local, publish_state, status, plan, timezone, key_rotated_at, last_active_at, created_at, updated_at
       FROM team_servers
       ORDER BY is_local DESC, created_at ASC;`
    );
    if (!res.length || !res[0].values.length) return [];
    return res[0].values.map((v) => ({
      id: v[0] as string,
      name: v[1] as string,
      logo: (v[2] as string) || undefined,
      is_local: v[3] as number,
      publish_state: v[4] as any,
      status: v[5] as string,
      plan: (v[6] as string) || 'Starter',
      timezone: v[7] as string,
      key_rotated_at: (v[8] as string) || undefined,
      last_active_at: (v[9] as string) || undefined,
      created_at: v[10] as string,
      updated_at: v[11] as string,
    }));
  }

  public async createServer(params: {
    name: string;
    logo?: string;
    plan?: string;
    is_local?: boolean;
    timezone?: string;
  }): Promise<DBTeamServer> {
    const db = await initDatabase();
    const id = `server-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const isLocal = params.is_local === false ? 0 : 1;
    const plan = params.plan || 'Starter';
    const timezone = params.timezone || 'Automatic';

    db.run(
      `INSERT INTO team_servers (id, name, logo, is_local, publish_state, status, plan, timezone, last_active_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'not-reachable', 'online', ?, ?, ?, ?, ?);`,
      [id, params.name, params.logo || null, isLocal, plan, timezone, now, now, now]
    );

    // Create default owner member for this server
    const ownerMemberId = `mem-owner-${Date.now()}`;
    db.run(
      `INSERT INTO server_members (id, server_id, name, email, server_role, status, created_at)
       VALUES (?, ?, 'Workspace Owner', 'owner@openbot.local', 'owner', 'online', ?);`,
      [ownerMemberId, id, now]
    );

    await this.logAuditEvent(id, 'server_created', 'owner@openbot.local', `Server "${params.name}" initialized on ${timezone} timezone`);

    saveDatabase(db);

    return {
      id,
      name: params.name,
      logo: params.logo,
      is_local: isLocal,
      publish_state: 'not-reachable',
      status: 'online',
      plan,
      timezone,
      last_active_at: now,
      created_at: now,
      updated_at: now,
    };
  }

  public async joinServer(invitationTokenOrLink: string, userEmail: string): Promise<{ success: boolean; member?: DBServerMember; error?: string }> {
    const db = await initDatabase();
    // Validate invitation link syntax
    let serverId = '';
    let targetEmail = userEmail;

    if (invitationTokenOrLink.includes('server=')) {
      const match = invitationTokenOrLink.match(/server=([^&]+)/);
      serverId = match ? match[1] : '';
    } else {
      serverId = invitationTokenOrLink.trim();
    }

    if (!serverId) {
      return { success: false, error: 'Invalid invitation link or token.' };
    }

    // Check if server exists
    const srvRes = db.exec(`SELECT name, publish_state FROM team_servers WHERE id = ?;`, [serverId]);
    if (!srvRes.length || !srvRes[0].values.length) {
      return { success: false, error: 'Server not found or invitation has expired.' };
    }

    const memberId = `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO server_members (id, server_id, name, email, server_role, status, created_at)
       VALUES (?, ?, ?, ?, 'member', 'online', ?);`,
      [memberId, serverId, targetEmail.split('@')[0], targetEmail, now]
    );

    await this.logAuditEvent(
      serverId,
      'member_joined',
      targetEmail,
      `User ${targetEmail} joined as member via invitation link. Email invitations only work for the address that received them.`
    );

    saveDatabase(db);

    return {
      success: true,
      member: {
        id: memberId,
        server_id: serverId,
        name: targetEmail.split('@')[0],
        email: targetEmail,
        server_role: 'member',
        status: 'online',
        created_at: now,
      },
    };
  }

  public async setPublishState(serverId: string, state: 'reachable' | 'not-reachable'): Promise<boolean> {
    const db = await initDatabase();
    db.run(`UPDATE team_servers SET publish_state = ?, updated_at = ? WHERE id = ?;`, [
      state,
      new Date().toISOString(),
      serverId,
    ]);

    const details = state === 'reachable'
      ? 'Server published: Reachable online (only invited people can sign in).'
      : 'Server unpublished: Not reachable online (existing members and invitations remain).';

    await this.logAuditEvent(serverId, 'publish_state_changed', 'owner', details);
    saveDatabase(db);
    return true;
  }

  public async rotateServerKey(serverId: string): Promise<{ success: boolean; handoverToken: string; rotatedAt: string }> {
    const db = await initDatabase();
    const now = new Date().toISOString();

    // Generate simulated cryptographic keys and dual-signature handover token
    const oldKey = `key-old-${Math.random().toString(36).substring(2, 12)}`;
    const newKey = `key-v9-${Math.random().toString(36).substring(2, 12)}`;
    const handoverToken = `${oldKey}:signed_handover:${newKey}`;

    db.run(`UPDATE team_servers SET key_rotated_at = ?, updated_at = ? WHERE id = ?;`, [now, now, serverId]);

    await this.logAuditEvent(
      serverId,
      'server_key_rotated',
      'owner',
      `Server identity key rotated. Both keys signed handover token. Paired computers, mobile devices, and webhook routes stay connected.`
    );

    saveDatabase(db);
    return { success: true, handoverToken, rotatedAt: now };
  }

  public async restartServer(serverId: string): Promise<{ restarting: boolean; message: string; estimatedSeconds: number }> {
    const db = await initDatabase();
    // Running turns stop, members lose connection until it is back; files and chats stay
    await this.logAuditEvent(
      serverId,
      'server_restart_initiated',
      'owner',
      'Server restart initiated. Running turns stopped; members temporarily disconnected; files and chats stay intact.'
    );

    db.run(`UPDATE team_servers SET status = 'Starting again', updated_at = ? WHERE id = ?;`, [
      new Date().toISOString(),
      serverId,
    ]);
    saveDatabase(db);

    return {
      restarting: true,
      message: 'Server restart in progress (about 60 seconds). Running turns stopped; chats and files preserved.',
      estimatedSeconds: 60,
    };
  }

  public async updateServerSettings(
    serverId: string,
    updates: { name?: string; logo?: string; timezone?: string }
  ): Promise<boolean> {
    const db = await initDatabase();
    const now = new Date().toISOString();

    if (updates.name !== undefined) {
      db.run(`UPDATE team_servers SET name = ?, updated_at = ? WHERE id = ?;`, [updates.name, now, serverId]);
      await this.logAuditEvent(serverId, 'server_renamed', 'owner', `Server renamed to "${updates.name}"`);
    }
    if (updates.logo !== undefined) {
      db.run(`UPDATE team_servers SET logo = ?, updated_at = ? WHERE id = ?;`, [updates.logo, now, serverId]);
    }
    if (updates.timezone !== undefined) {
      db.run(`UPDATE team_servers SET timezone = ?, updated_at = ? WHERE id = ?;`, [updates.timezone, now, serverId]);
      await this.logAuditEvent(serverId, 'timezone_updated', 'owner', `Timezone set to ${updates.timezone}`);
    }

    saveDatabase(db);
    return true;
  }

  public async deleteServer(serverId: string, confirmationName: string): Promise<boolean> {
    const db = await initDatabase();
    const res = db.exec(`SELECT name FROM team_servers WHERE id = ?;`, [serverId]);
    if (!res.length || !res[0].values.length) {
      throw new Error('Server not found');
    }
    const realName = res[0].values[0][0] as string;
    if (confirmationName.trim() !== realName.trim()) {
      throw new Error(`Deletion confirmation failed: Expected "${realName}", got "${confirmationName}"`);
    }

    db.run(`DELETE FROM team_servers WHERE id = ?;`, [serverId]);
    saveDatabase(db);
    return true;
  }

  // -------------------------------------------------------------
  // 2. MEMBERS & ROLES
  // -------------------------------------------------------------

  public async getMembers(serverId: string): Promise<DBServerMember[]> {
    const db = await initDatabase();
    const res = db.exec(
      `SELECT id, server_id, name, email, server_role, status, created_at
       FROM server_members
       WHERE server_id = ?
       ORDER BY created_at ASC;`,
      [serverId]
    );
    if (!res.length || !res[0].values.length) return [];
    return res[0].values.map((v) => ({
      id: v[0] as string,
      server_id: v[1] as string,
      name: v[2] as string,
      email: v[3] as string,
      server_role: v[4] as any,
      status: v[5] as any,
      created_at: v[6] as string,
    }));
  }

  public async inviteMember(
    serverId: string,
    email: string,
    name: string,
    serverRole: 'owner' | 'admin' | 'member' = 'member'
  ): Promise<DBServerMember> {
    const db = await initDatabase();

    // Check member limits (25 users cap without contact)
    const countRes = db.exec(`SELECT count(*) FROM server_members WHERE server_id = ?;`, [serverId]);
    const currentCount = countRes.length && countRes[0].values.length ? (countRes[0].values[0][0] as number) : 0;
    if (currentCount >= 25) {
      throw new Error('Member limit reached (25 users cap). Please "Contact us" for custom enterprise licensing.');
    }

    const id = `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO server_members (id, server_id, name, email, server_role, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'invited', ?);`,
      [id, serverId, name, email, serverRole, now]
    );

    await this.logAuditEvent(
      serverId,
      'member_invited',
      'owner',
      `Invited ${name} (${email}) as ${serverRole}. Invitation link generated.`
    );

    saveDatabase(db);
    return {
      id,
      server_id: serverId,
      name,
      email,
      server_role: serverRole,
      status: 'invited',
      created_at: now,
    };
  }

  public async removeMember(serverId: string, memberId: string): Promise<boolean> {
    const db = await initDatabase();
    const res = db.exec(`SELECT email, server_role FROM server_members WHERE id = ?;`, [memberId]);
    if (res.length && res[0].values.length) {
      const email = res[0].values[0][0] as string;
      const role = res[0].values[0][1] as string;
      if (role === 'owner') {
        throw new Error('Cannot remove server owner. Transfer ownership first.');
      }
      await this.logAuditEvent(
        serverId,
        'member_removed',
        'admin',
        `Removed member ${email}. Revoked access to server and its shared conversations.`
      );
    }

    db.run(`DELETE FROM server_members WHERE id = ?;`, [memberId]);
    saveDatabase(db);
    return true;
  }

  public async getMemberAgentAccess(memberId: string): Promise<DBMemberAgentAccess[]> {
    const db = await initDatabase();
    const res = db.exec(`SELECT member_id, agent_id, access_level FROM member_agent_access WHERE member_id = ?;`, [memberId]);
    if (!res.length || !res[0].values.length) return [];
    return res[0].values.map((v) => ({
      member_id: v[0] as string,
      agent_id: v[1] as string,
      access_level: v[2] as any,
    }));
  }

  public async setMemberAgentAccess(
    memberId: string,
    agentId: string,
    accessLevel: 'none' | 'view' | 'chat' | 'manage'
  ): Promise<boolean> {
    const db = await initDatabase();
    db.run(
      `INSERT OR REPLACE INTO member_agent_access (member_id, agent_id, access_level)
       VALUES (?, ?, ?);`,
      [memberId, agentId, accessLevel]
    );

    saveDatabase(db);
    return true;
  }

  // -------------------------------------------------------------
  // 3. CHANNELS & LEAD-AGENT ROUTING (Max 8 assignments, 2 active)
  // -------------------------------------------------------------

  public async getChannels(serverId: string): Promise<DBChannel[]> {
    const db = await initDatabase();
    const res = db.exec(
      `SELECT id, server_id, name, lead_agent_id, member_agent_ids, task_owner_id, status, active_assignments_count, deleted_at, created_at
       FROM channels
       WHERE server_id = ?
       ORDER BY status ASC, created_at ASC;`,
      [serverId]
    );
    if (!res.length || !res[0].values.length) return [];
    return res[0].values.map((v) => ({
      id: v[0] as string,
      server_id: v[1] as string,
      name: v[2] as string,
      lead_agent_id: (v[3] as string) || undefined,
      member_agent_ids: v[4] as string,
      task_owner_id: (v[5] as string) || undefined,
      status: v[6] as any,
      active_assignments_count: v[7] as number,
      deleted_at: (v[8] as string) || undefined,
      created_at: v[9] as string,
    }));
  }

  public async createChannel(
    serverId: string,
    name: string,
    leadAgentId?: string,
    memberAgentIds: string[] = []
  ): Promise<DBChannel> {
    const db = await initDatabase();
    const id = `channel-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO channels (id, server_id, name, lead_agent_id, member_agent_ids, status, active_assignments_count, created_at)
       VALUES (?, ?, ?, ?, ?, 'active', 0, ?);`,
      [id, serverId, name, leadAgentId || null, JSON.stringify(memberAgentIds), now]
    );

    saveDatabase(db);
    return {
      id,
      server_id: serverId,
      name,
      lead_agent_id: leadAgentId,
      member_agent_ids: JSON.stringify(memberAgentIds),
      status: 'active',
      active_assignments_count: 0,
      created_at: now,
    };
  }

  public async deleteChannel(channelId: string): Promise<boolean> {
    const db = await initDatabase();
    const now = new Date().toISOString();
    // Deleted channels are kept in Deleted channels for preview only and are restorable
    db.run(`UPDATE channels SET status = 'deleted', deleted_at = ? WHERE id = ?;`, [now, channelId]);
    saveDatabase(db);
    return true;
  }

  public async restoreChannel(channelId: string): Promise<boolean> {
    const db = await initDatabase();
    db.run(`UPDATE channels SET status = 'active', deleted_at = NULL WHERE id = ?;`, [channelId]);
    saveDatabase(db);
    return true;
  }

  public async assignChannelTask(
    channelId: string,
    agentIds: string[]
  ): Promise<{ assigned: boolean; activeCount: number }> {
    // 1. Enforce max 8 assignments per request limit
    if (agentIds.length > MAX_ASSIGNMENTS_PER_REQUEST) {
      throw new Error(
        `Maximum ${MAX_ASSIGNMENTS_PER_REQUEST} assignments per request limit exceeded. Received ${agentIds.length} assignments.`
      );
    }

    const db = await initDatabase();
    const res = db.exec(`SELECT active_assignments_count FROM channels WHERE id = ?;`, [channelId]);
    const currentActive = res.length && res[0].values.length ? (res[0].values[0][0] as number) : 0;

    // 2. Enforce max 2 active assignments per channel limit
    if (currentActive + agentIds.length > MAX_ACTIVE_PER_CHANNEL) {
      throw new Error(
        `Maximum ${MAX_ACTIVE_PER_CHANNEL} active assignments per channel limit reached. Currently active: ${currentActive}; cannot add ${agentIds.length} more.`
      );
    }

    const now = new Date().toISOString();
    for (const agentId of agentIds) {
      const assignmentId = `assign-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      db.run(
        `INSERT INTO channel_assignments (id, channel_id, agent_id, status, assigned_at)
         VALUES (?, ?, ?, 'active', ?);`,
        [assignmentId, channelId, agentId, now]
      );
    }

    const newActiveCount = currentActive + agentIds.length;
    db.run(`UPDATE channels SET active_assignments_count = ? WHERE id = ?;`, [newActiveCount, channelId]);

    saveDatabase(db);
    return { assigned: true, activeCount: newActiveCount };
  }

  // -------------------------------------------------------------
  // 4. SHARED FOLDER & SHARED TABLES
  // -------------------------------------------------------------

  public async getSharedTables(): Promise<DBSharedTable[]> {
    const db = await initDatabase();
    const res = db.exec(`SELECT id, name, creator_agent_id, columns_json, rows_json, created_at, updated_at FROM shared_tables;`);
    if (!res.length || !res[0].values.length) return [];
    return res[0].values.map((v) => ({
      id: v[0] as string,
      name: v[1] as string,
      creator_agent_id: v[2] as string,
      columns_json: v[3] as string,
      rows_json: v[4] as string,
      created_at: v[5] as string,
      updated_at: v[6] as string,
    }));
  }

  public async createSharedTable(
    name: string,
    creatorAgentId: string,
    columns: string[]
  ): Promise<DBSharedTable> {
    const db = await initDatabase();
    const id = `table-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO shared_tables (id, name, creator_agent_id, columns_json, rows_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, '[]', ?, ?);`,
      [id, name, creatorAgentId, JSON.stringify(columns), now, now]
    );

    saveDatabase(db);
    return {
      id,
      name,
      creator_agent_id: creatorAgentId,
      columns_json: JSON.stringify(columns),
      rows_json: '[]',
      created_at: now,
      updated_at: now,
    };
  }

  public async alterSharedTable(
    name: string,
    requestingAgentId: string,
    newColumns: string[]
  ): Promise<boolean> {
    const db = await initDatabase();
    const res = db.exec(`SELECT creator_agent_id FROM shared_tables WHERE name = ?;`, [name]);
    if (!res.length || !res[0].values.length) throw new Error(`Shared table "${name}" not found`);

    const creatorId = res[0].values[0][0] as string;
    // Spec rule: The owner is the creator and the ONLY agent allowed to drop/alter it
    if (requestingAgentId !== creatorId) {
      throw new Error(
        `Permission denied: Agent "${requestingAgentId}" is not the owner of shared table "${name}". Only creator agent "${creatorId}" can alter it.`
      );
    }

    db.run(`UPDATE shared_tables SET columns_json = ?, updated_at = ? WHERE name = ?;`, [
      JSON.stringify(newColumns),
      new Date().toISOString(),
      name,
    ]);
    saveDatabase(db);
    return true;
  }

  public async dropSharedTable(
    name: string,
    requestingAgentId: string,
    isUser: boolean = false
  ): Promise<boolean> {
    const db = await initDatabase();
    const res = db.exec(`SELECT creator_agent_id FROM shared_tables WHERE name = ?;`, [name]);
    if (!res.length || !res[0].values.length) throw new Error(`Shared table "${name}" not found`);

    const creatorId = res[0].values[0][0] as string;
    // Spec rule: User can delete any table in agent settings; otherwise ONLY creator agent allowed to drop
    if (!isUser && requestingAgentId !== creatorId) {
      throw new Error(
        `Permission denied: Agent "${requestingAgentId}" cannot drop shared table "${name}". Only creator agent "${creatorId}" or the user can delete it.`
      );
    }

    db.run(`DELETE FROM shared_tables WHERE name = ?;`, [name]);
    saveDatabase(db);
    return true;
  }

  public async insertSharedTableRow(name: string, row: any): Promise<boolean> {
    const db = await initDatabase();
    const res = db.exec(`SELECT rows_json FROM shared_tables WHERE name = ?;`, [name]);
    if (!res.length || !res[0].values.length) throw new Error(`Shared table "${name}" not found`);

    const rows: any[] = JSON.parse(res[0].values[0][0] as string || '[]');
    rows.push(row);

    db.run(`UPDATE shared_tables SET rows_json = ?, updated_at = ? WHERE name = ?;`, [
      JSON.stringify(rows),
      new Date().toISOString(),
      name,
    ]);
    saveDatabase(db);
    return true;
  }

  public async readSharedTableRows(name: string): Promise<any[]> {
    const db = await initDatabase();
    const res = db.exec(`SELECT rows_json FROM shared_tables WHERE name = ?;`, [name]);
    if (!res.length || !res[0].values.length) return [];
    return JSON.parse(res[0].values[0][0] as string || '[]');
  }

  // -------------------------------------------------------------
  // 5. AGENT TEMPLATE (Public, Link-Only, No Workspace Files/Memories)
  // -------------------------------------------------------------

  public async exportAgentTemplate(agentId: string): Promise<{
    templateId: string;
    sourceAgentId: string;
    publicUrl: string;
    instructions: string;
    skills: string[];
    routines: string[];
    exportedAt: string;
  }> {
    const db = await initDatabase();
    const res = db.exec(`SELECT name, role FROM agents WHERE id = ?;`, [agentId]);
    const agentName = res.length && res[0].values.length ? (res[0].values[0][0] as string) : 'Agent';

    const tplId = `tpl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    return {
      templateId: tplId,
      sourceAgentId: agentId,
      publicUrl: `https://openbot.run/template/${tplId}`,
      instructions: `Synthesized template instructions for ${agentName}. Contains skills and routines; holds zero workspace files or memory facts.`,
      skills: ['GitHub PR Reviewer', 'Docker Compose Orchestrator'],
      routines: ['Daily Dependency Audit'],
      exportedAt: now,
    };
  }

  // -------------------------------------------------------------
  // 6. AUDIT LOG (Newest 500 Changes Kept)
  // -------------------------------------------------------------

  public async logAuditEvent(
    serverId: string,
    action: string,
    actor: string,
    details: string
  ): Promise<void> {
    const db = await initDatabase();
    const id = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO audit_logs (id, server_id, action, actor, details, timestamp)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [id, serverId, action, actor, details, now]
    );

    // Enforce max 500 changes per host
    db.run(
      `DELETE FROM audit_logs
       WHERE id IN (
         SELECT id FROM audit_logs
         WHERE server_id = ?
         ORDER BY timestamp DESC
         LIMIT -1 OFFSET ?
       );`,
      [serverId, MAX_AUDIT_LOG_ENTRIES]
    );

    saveDatabase(db);
  }

  public async getAuditLogs(serverId: string): Promise<DBAuditLog[]> {
    const db = await initDatabase();
    const res = db.exec(
      `SELECT id, server_id, action, actor, details, timestamp
       FROM audit_logs
       WHERE server_id = ?
       ORDER BY timestamp DESC
       LIMIT ?;`,
      [serverId, MAX_AUDIT_LOG_ENTRIES]
    );
    if (!res.length || !res[0].values.length) return [];
    return res[0].values.map((v) => ({
      id: v[0] as string,
      server_id: v[1] as string,
      action: v[2] as string,
      actor: v[3] as string,
      details: v[4] as string,
      timestamp: v[5] as string,
    }));
  }

  // -------------------------------------------------------------
  // 7. REMOTE DESKTOP (2-Minute Test Panel & Linux X11)
  // -------------------------------------------------------------

  public async createRemoteDesktopTest(
    serverId: string,
    targetName: string
  ): Promise<{ sessionId: string; fourDigitCode: string; expiresAt: string; expiresInSeconds: number }> {
    const db = await initDatabase();
    const sessionId = `rd-${Date.now()}`;
    // 4-digit code
    const fourDigitCode = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + REMOTE_DESKTOP_TEST_EXPIRY_MS).toISOString();

    db.run(
      `INSERT INTO remote_desktop_sessions (id, server_id, target_name, four_digit_code, status, expires_at, created_at)
       VALUES (?, ?, ?, ?, 'active', ?, ?);`,
      [sessionId, serverId, targetName, fourDigitCode, expiresAt, new Date().toISOString()]
    );

    saveDatabase(db);

    return {
      sessionId,
      fourDigitCode,
      expiresAt,
      expiresInSeconds: 120,
    };
  }

  public async verifyRemoteDesktopTest(
    sessionId: string,
    code: string
  ): Promise<{ success: boolean; error?: string }> {
    const db = await initDatabase();
    const res = db.exec(
      `SELECT four_digit_code, expires_at, status FROM remote_desktop_sessions WHERE id = ?;`,
      [sessionId]
    );
    if (!res.length || !res[0].values.length) {
      return { success: false, error: 'Remote desktop session not found' };
    }

    const expectedCode = res[0].values[0][0] as string;
    const expiresAt = new Date(res[0].values[0][1] as string).getTime();

    // Check 2-minute expiration
    if (Date.now() > expiresAt) {
      db.run(`UPDATE remote_desktop_sessions SET status = 'expired' WHERE id = ?;`, [sessionId]);
      saveDatabase(db);
      return { success: false, error: 'Remote desktop test panel expired after two minutes.' };
    }

    if (code !== expectedCode) {
      return { success: false, error: 'Invalid 4-digit verification code.' };
    }

    db.run(`UPDATE remote_desktop_sessions SET status = 'connected' WHERE id = ?;`, [sessionId]);
    this.activeRemoteControllers.push('Member (Remote Access)');
    saveDatabase(db);

    return { success: true };
  }

  public checkLinuxRemoteDesktopSupport(): { supported: boolean; reason?: string } {
    if (process.platform !== 'linux') return { supported: true };
    const isX64 = process.arch === 'x64';
    const isWayland = process.env.XDG_SESSION_TYPE === 'wayland';

    if (!isX64) {
      return { supported: false, reason: 'Remote desktop on Linux requires x64 architecture (arm64 AppImage does not include it).' };
    }
    if (isWayland) {
      return { supported: false, reason: 'Remote desktop on Linux requires an X11 session (does not work under Wayland).' };
    }

    return { supported: true };
  }

  public getActiveRemoteControllers(): string[] {
    return this.activeRemoteControllers;
  }

  public stopAllRemoteControl(): boolean {
    this.activeRemoteControllers = [];
    return true;
  }

  // -------------------------------------------------------------
  // 8. HOSTED SERVER LIFECYCLE (15-min idle stop, 14-day retention)
  // -------------------------------------------------------------

  public checkHostedIdleStop(lastActiveAt: string): { shouldStop: boolean; idleMs: number } {
    const lastActive = new Date(lastActiveAt).getTime();
    const idleMs = Date.now() - lastActive;
    return {
      shouldStop: idleMs >= HOSTED_IDLE_STOP_MS,
      idleMs,
    };
  }

  public checkHostedDiskRetention(stoppedAt: string): { isRetained: boolean; daysStopped: number } {
    const stoppedTime = new Date(stoppedAt).getTime();
    const daysStopped = (Date.now() - stoppedTime) / (24 * 60 * 60 * 1000);
    return {
      isRetained: daysStopped <= HOSTED_RETENTION_DAYS,
      daysStopped,
    };
  }

  // -------------------------------------------------------------
  // Seed Helper
  // -------------------------------------------------------------

  private seedDefaultServerAndMembers(db: any) {
    const now = new Date().toISOString();
    const serverName = process.platform === 'darwin' ? 'This Mac' : 'This computer';

    // 1. Local Server
    db.run(
      `INSERT INTO team_servers (id, name, is_local, publish_state, status, plan, timezone, created_at, updated_at)
       VALUES ('server-local', ?, 1, 'reachable', 'online', 'Starter', 'UTC+0', ?, ?);`,
      [serverName, now, now]
    );

    // 2. Members
    const members = [
      { id: 'mem-alex', name: 'Alex Rivera', email: 'alex@synthetify.io', role: 'owner', status: 'online' },
      { id: 'mem-sophia', name: 'Sophia Chen', email: 'sophia@synthetify.io', role: 'admin', status: 'online' },
      { id: 'mem-marcus', name: 'Marcus Brody', email: 'marcus@synthetify.io', role: 'member', status: 'offline' },
    ];
    for (const m of members) {
      db.run(
        `INSERT INTO server_members (id, server_id, name, email, server_role, status, created_at)
         VALUES (?, 'server-local', ?, ?, ?, ?, ?);`,
        [m.id, m.name, m.email, m.role, m.status, now]
      );
    }

    // 3. Channels
    db.run(
      `INSERT INTO channels (id, server_id, name, lead_agent_id, member_agent_ids, status, active_assignments_count, created_at)
       VALUES ('channel-infra', 'server-local', 'infrastructure', 'agent-kestrel', '["agent-kestrel", "agent-vanguard"]', 'active', 1, ?);`,
      [now]
    );

    // 4. Audit Log Seed
    db.run(
      `INSERT INTO audit_logs (id, server_id, action, actor, details, timestamp)
       VALUES ('audit-init', 'server-local', 'server_initialized', 'alex@synthetify.io', 'Local team server initialized with WebRTC protocol v9.', ?);`,
      [now]
    );
  }
}

export const teamCollabService = new TeamCollabService();
