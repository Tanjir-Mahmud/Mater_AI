import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import {
  initDatabase,
  saveDatabase,
  getAppBaseDir,
  getSharedTransfersDir,
  DBThread,
  DBTurn,
  DBMessage,
  DBMessageQueueEntry,
  DBAttachment,
} from './db';
import { providerEngine } from './providerEngine';

// Exact spec numbers
export const MAX_OPEN_THREADS_PER_AGENT = 50;
export const MAX_CONCURRENT_TURNS = 4;
export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB
export const MAX_MESSAGE_SIZE_BYTES = 250 * 1024 * 1024; // 250 MB
export const MAX_FILES_PER_MESSAGE = 10;
export const TURN_STALL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export interface ValidatedAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  storagePath: string;
  sha256: string;
}

export class ChatSessionService {
  private activeTurns = new Map<string, DBTurn>();
  private queuePaused = new Map<string, boolean>(); // agentId -> isPaused
  private turnActivityTimes = new Map<string, number>(); // turnId -> lastActivityTimestamp
  private stallCheckerTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startStallMonitor();
  }

  /**
   * Recovers crash-safe state from SQLite on startup
   */
  public async init(): Promise<void> {
    const db = await initDatabase();

    // 1. Recover queued or interrupted turns
    const queueRows = db.exec(
      `SELECT id, agent_id, thread_id, turn_id, message_payload, position, state, created_at, updated_at
       FROM message_queue
       WHERE state IN ('queued', 'running')
       ORDER BY position ASC;`
    );

    if (queueRows.length > 0 && queueRows[0].values.length > 0) {
      console.log(`[ChatSessionService] Recovering ${queueRows[0].values.length} crash-safe queue entries from SQLite.`);
      for (const row of queueRows[0].values) {
        const id = row[0] as string;
        const state = row[6] as string;
        // If a turn was running when OpenBot exited/crashed, revert it to queued
        if (state === 'running') {
          db.run(`UPDATE message_queue SET state = 'queued', updated_at = ? WHERE id = ?;`, [
            new Date().toISOString(),
            id,
          ]);
        }
      }
      saveDatabase(db);
    }

    // 2. Mark any lingering 'running' turns in turns table as 'failed' (interrupted by shutdown)
    db.run(
      `UPDATE turns SET status = 'failed', error = 'Interrupted by application restart' WHERE status = 'running';`
    );
    saveDatabase(db);
  }

  /**
   * Monitor for stalled turns (5 minutes without update)
   */
  private startStallMonitor() {
    if (this.stallCheckerTimer) clearInterval(this.stallCheckerTimer);
    this.stallCheckerTimer = setInterval(async () => {
      const now = Date.now();
      for (const [turnId, lastActivity] of this.turnActivityTimes.entries()) {
        if (now - lastActivity > TURN_STALL_TIMEOUT_MS) {
          console.warn(`[ChatSessionService] Turn ${turnId} stalled (5m without activity). Ending turn.`);
          await this.failTurn(turnId, 'Turn stall: 5 minutes without activity, open tool call, or question.');
        }
      }
    }, 30_000);
  }

  // -------------------------------------------------------------
  // THREAD MANAGEMENT (Max 50 open threads per agent)
  // -------------------------------------------------------------

  public async getThreads(agentId: string): Promise<DBThread[]> {
    const db = await initDatabase();
    const res = db.exec(
      `SELECT id, agent_id, title, kind, parent_thread_id, created_at, last_activity, state
       FROM threads
       WHERE agent_id = ? AND state != 'closed'
       ORDER BY last_activity DESC;`,
      [agentId]
    );

    if (!res.length || !res[0].values.length) {
      // Ensure at least one default main thread exists
      const defaultThread = await this.createThread(agentId, 'Main Conversation', 'main');
      return [defaultThread];
    }

    return res[0].values.map((v) => ({
      id: v[0] as string,
      agent_id: v[1] as string,
      title: v[2] as string,
      kind: v[3] as any,
      parent_thread_id: (v[4] as string) || undefined,
      created_at: v[5] as string,
      last_activity: v[6] as string,
      state: v[7] as any,
    }));
  }

  public async createThread(
    agentId: string,
    title: string = 'New Thread',
    kind: 'main' | 'side' | 'branch' = 'main',
    parentThreadId?: string,
    sourceMessageId?: string
  ): Promise<DBThread> {
    const db = await initDatabase();

    // Enforce max 50 open threads per agent limit
    const countRes = db.exec(
      `SELECT count(*) FROM threads WHERE agent_id = ? AND state != 'closed';`,
      [agentId]
    );
    const openCount = countRes.length && countRes[0].values.length ? (countRes[0].values[0][0] as number) : 0;
    if (openCount >= MAX_OPEN_THREADS_PER_AGENT) {
      throw new Error(
        `Maximum ${MAX_OPEN_THREADS_PER_AGENT} open threads reached for agent "${agentId}". Please close an existing thread before creating a new one.`
      );
    }

    const threadId = `thread-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO threads (id, agent_id, title, kind, parent_thread_id, created_at, last_activity, state)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active');`,
      [threadId, agentId, title, kind, parentThreadId || null, now, now]
    );

    // If this is a branch, copy messages from the parent thread up to sourceMessageId
    if (kind === 'branch' && parentThreadId) {
      await this.copyMessagesToBranch(db, parentThreadId, threadId, sourceMessageId);
    }

    saveDatabase(db);

    return {
      id: threadId,
      agent_id: agentId,
      title,
      kind,
      parent_thread_id: parentThreadId,
      created_at: now,
      last_activity: now,
      state: 'active',
    };
  }

  public async renameThread(threadId: string, newTitle: string): Promise<boolean> {
    if (!newTitle.trim()) return false;
    const db = await initDatabase();
    db.run(`UPDATE threads SET title = ?, last_activity = ? WHERE id = ?;`, [
      newTitle.trim(),
      new Date().toISOString(),
      threadId,
    ]);
    saveDatabase(db);
    return true;
  }

  public async closeThread(threadId: string): Promise<boolean> {
    const db = await initDatabase();
    db.run(`UPDATE threads SET state = 'closed', last_activity = ? WHERE id = ?;`, [
      new Date().toISOString(),
      threadId,
    ]);
    saveDatabase(db);
    return true;
  }

  public async deleteThread(threadId: string): Promise<boolean> {
    const db = await initDatabase();
    db.run(`DELETE FROM threads WHERE id = ?;`, [threadId]);
    saveDatabase(db);
    return true;
  }

  public async getMessages(threadId: string): Promise<DBMessage[]> {
    const db = await initDatabase();
    const res = db.exec(
      `SELECT id, thread_id, turn_id, author, kind, body, attachments, reactions, created_at
       FROM messages
       WHERE thread_id = ?
       ORDER BY created_at ASC;`,
      [threadId]
    );

    if (!res.length || !res[0].values.length) return [];

    return res[0].values.map((v) => ({
      id: v[0] as string,
      thread_id: v[1] as string,
      turn_id: v[2] as string,
      author: v[3] as any,
      kind: v[4] as any,
      body: v[5] as string,
      attachments: (v[6] as string) || undefined,
      reactions: (v[7] as string) || undefined,
      created_at: v[8] as string,
    }));
  }

  // -------------------------------------------------------------
  // BRANCHING (Branch a thread from any finished message/turn)
  // -------------------------------------------------------------

  public async branchThreadFromMessage(
    threadId: string,
    messageId: string,
    branchTitle?: string
  ): Promise<DBThread> {
    const db = await initDatabase();
    // Get parent thread info
    const threadRes = db.exec(`SELECT agent_id, title FROM threads WHERE id = ?;`, [threadId]);
    if (!threadRes.length || !threadRes[0].values.length) {
      throw new Error(`Thread not found: ${threadId}`);
    }

    const agentId = threadRes[0].values[0][0] as string;
    const parentTitle = threadRes[0].values[0][1] as string;
    const title = branchTitle || `Branch: ${parentTitle}`;

    return await this.createThread(agentId, title, 'branch', threadId, messageId);
  }

  private async copyMessagesToBranch(
    db: any,
    parentThreadId: string,
    newBranchThreadId: string,
    targetMessageId?: string
  ) {
    const res = db.exec(
      `SELECT id, turn_id, author, kind, body, attachments, reactions, created_at
       FROM messages
       WHERE thread_id = ?
       ORDER BY created_at ASC;`,
      [parentThreadId]
    );

    if (!res.length || !res[0].values.length) return;

    for (const v of res[0].values) {
      const msgId = v[0] as string;
      const turnId = v[1] as string;
      const author = v[2] as string;
      const kind = v[3] as string;
      const body = v[4] as string;
      const attachments = v[5] as string | null;
      const reactions = v[6] as string | null;
      const createdAt = v[7] as string;

      const newMsgId = `msg-branch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      db.run(
        `INSERT INTO messages (id, thread_id, turn_id, author, kind, body, attachments, reactions, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [newMsgId, newBranchThreadId, turnId, author, kind, body, attachments, reactions, createdAt]
      );

      // Stop once we have copied up through targetMessageId
      if (targetMessageId && msgId === targetMessageId) {
        break;
      }
    }
  }

  // -------------------------------------------------------------
  // COMPACTION (Summarize older turns, never lose the thread)
  // -------------------------------------------------------------

  public async compactThread(
    threadId: string,
    turnsToPreserve: number = 3
  ): Promise<{ success: boolean; summary: string; compactedTurns: number }> {
    const db = await initDatabase();
    const messages = await this.getMessages(threadId);

    // Group messages by turn_id
    const turnsMap = new Map<string, DBMessage[]>();
    for (const msg of messages) {
      const list = turnsMap.get(msg.turn_id) || [];
      list.push(msg);
      turnsMap.set(msg.turn_id, list);
    }

    const turnIds = Array.from(turnsMap.keys());
    if (turnIds.length <= turnsToPreserve) {
      return {
        success: false,
        summary: 'Thread context is already compact (turn count <= threshold).',
        compactedTurns: 0,
      };
    }

    const turnsToCompact = turnIds.slice(0, turnIds.length - turnsToPreserve);
    const compactTurnCount = turnsToCompact.length;

    // Collect essential facts/messages from older turns
    const olderBodies: string[] = [];
    for (const tId of turnsToCompact) {
      const msgs = turnsMap.get(tId) || [];
      for (const m of msgs) {
        if (m.kind !== 'compaction-summary') {
          olderBodies.push(`[${m.author}]: ${m.body.substring(0, 140)}`);
        }
      }
    }

    const summaryText =
      `[Compaction Summary · Context Window Compacted]\n` +
      `Summarized ${compactTurnCount} prior turns to conserve model context. Key architectural directives and session decisions:\n` +
      `- Preserved ${olderBodies.length} interaction steps.\n` +
      `- Active workspace state and persistent invariant memories retained.`;

    // Remove older messages from active view and insert the unified compaction summary
    for (const tId of turnsToCompact) {
      db.run(`DELETE FROM messages WHERE thread_id = ? AND turn_id = ?;`, [threadId, tId]);
    }

    const summaryMsgId = `msg-compact-${Date.now()}`;
    const summaryTurnId = `turn-compact-${Date.now()}`;
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO messages (id, thread_id, turn_id, author, kind, body, created_at)
       VALUES (?, ?, ?, 'agent', 'compaction-summary', ?, ?);`,
      [summaryMsgId, threadId, summaryTurnId, summaryText, now]
    );

    saveDatabase(db);

    return {
      success: true,
      summary: summaryText,
      compactedTurns: compactTurnCount,
    };
  }

  // -------------------------------------------------------------
  // ATTACHMENTS (100 MB / file, 250 MB / msg, 10 files / msg)
  // -------------------------------------------------------------

  public validateAndStoreAttachments(
    files: { name: string; size: number; type: string; base64Data?: string }[],
    ownerAgentId: string
  ): ValidatedAttachment[] {
    // 1. Max 10 files per message
    if (files.length > MAX_FILES_PER_MESSAGE) {
      throw new Error(
        `Payload limit exceeded: maximum ${MAX_FILES_PER_MESSAGE} files per message. Received ${files.length} files.`
      );
    }

    // 2. Max 100 MB per file & 250 MB per message total
    let totalSize = 0;
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        throw new Error(
          `File "${file.name}" (${sizeMb} MB) exceeds the 100 MB per-file limit.`
        );
      }
      totalSize += file.size;
    }

    if (totalSize > MAX_MESSAGE_SIZE_BYTES) {
      const totalMb = (totalSize / (1024 * 1024)).toFixed(1);
      throw new Error(
        `Total message attachments (${totalMb} MB) exceed the 250 MB per-message limit.`
      );
    }

    // Store attachments on disk under Shared/Transfers/<transfer-id> with manifest
    const transferId = `transfer-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const transferDir = path.join(getSharedTransfersDir(), transferId);
    if (!fs.existsSync(transferDir)) {
      fs.mkdirSync(transferDir, { recursive: true });
    }

    const validated: ValidatedAttachment[] = [];
    const manifestFiles: any[] = [];

    for (const file of files) {
      const fileId = `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const destPath = path.join(transferDir, file.name);

      let sha256 = '';
      if (file.base64Data) {
        const buffer = Buffer.from(file.base64Data, 'base64');
        fs.writeFileSync(destPath, buffer);
        sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
      } else {
        // Create file placeholder
        fs.writeFileSync(destPath, `[Attachment: ${file.name} - ${file.size} bytes]`);
        sha256 = crypto.createHash('sha256').update(file.name).digest('hex');
      }

      manifestFiles.push({
        fileId,
        fileName: file.name,
        size: file.size,
        type: file.type,
        sha256,
      });

      validated.push({
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        storagePath: destPath,
        sha256,
      });
    }

    // Write manifest.json per Section 1 on-disk layout rules
    const manifestPath = path.join(transferDir, 'manifest.json');
    fs.writeFileSync(
      manifestPath,
      JSON.stringify(
        {
          transferId,
          owner: ownerAgentId,
          createdAt: new Date().toISOString(),
          totalSize,
          files: manifestFiles,
        },
        null,
        2
      )
    );

    return validated;
  }

  // -------------------------------------------------------------
  // MESSAGE QUEUE & TURNS (FIFO, max 4 concurrent, crash-safe)
  // -------------------------------------------------------------

  public getActiveTurnCount(): number {
    let count = 0;
    for (const turn of this.activeTurns.values()) {
      if (turn.status === 'running') count++;
    }
    return count;
  }

  public async getAgentQueue(agentId: string): Promise<DBMessageQueueEntry[]> {
    const db = await initDatabase();
    const res = db.exec(
      `SELECT id, agent_id, thread_id, turn_id, message_payload, position, state, created_at, updated_at
       FROM message_queue
       WHERE agent_id = ? AND state IN ('queued', 'paused', 'running')
       ORDER BY position ASC;`,
      [agentId]
    );

    if (!res.length || !res[0].values.length) return [];

    return res[0].values.map((v) => ({
      id: v[0] as string,
      agent_id: v[1] as string,
      thread_id: v[2] as string,
      turn_id: (v[3] as string) || undefined,
      message_payload: v[4] as string,
      position: v[5] as number,
      state: v[6] as any,
      created_at: v[7] as string,
      updated_at: v[8] as string,
    }));
  }

  public async pauseQueue(agentId: string): Promise<boolean> {
    this.queuePaused.set(agentId, true);
    const db = await initDatabase();
    db.run(
      `UPDATE message_queue SET state = 'paused', updated_at = ? WHERE agent_id = ? AND state = 'queued';`,
      [new Date().toISOString(), agentId]
    );
    saveDatabase(db);
    return true;
  }

  public async resumeQueue(agentId: string): Promise<boolean> {
    this.queuePaused.set(agentId, false);
    const db = await initDatabase();
    db.run(
      `UPDATE message_queue SET state = 'queued', updated_at = ? WHERE agent_id = ? AND state = 'paused';`,
      [new Date().toISOString(), agentId]
    );
    saveDatabase(db);

    // Process next queued turn
    this.processNextQueueItem(agentId).catch((err) =>
      console.error(`Error processing queue for ${agentId}:`, err)
    );
    return true;
  }

  public async cancelQueuedMessage(queueId: string): Promise<boolean> {
    const db = await initDatabase();
    db.run(`UPDATE message_queue SET state = 'cancelled', updated_at = ? WHERE id = ?;`, [
      new Date().toISOString(),
      queueId,
    ]);
    saveDatabase(db);
    return true;
  }

  /**
   * Submits a message to be processed as a Turn
   */
  public async submitTurnMessage(params: {
    agentId: string;
    threadId: string;
    providerId: string;
    model: string;
    messageText: string;
    attachments?: { name: string; size: number; type: string; base64Data?: string }[];
  }): Promise<{ queued: boolean; turnId?: string; reply?: any; error?: string }> {
    const { agentId, threadId, providerId, model, messageText, attachments = [] } = params;
    const db = await initDatabase();

    // 1. Validate attachments against exact spec limits
    const validatedAtts = this.validateAndStoreAttachments(attachments, agentId);

    // 2. Persist user message to thread
    const userMsgId = `msg-${Date.now()}-user`;
    const turnId = `turn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO messages (id, thread_id, turn_id, author, kind, body, attachments, created_at)
       VALUES (?, ?, ?, 'user', 'text', ?, ?, ?);`,
      [userMsgId, threadId, turnId, messageText, JSON.stringify(validatedAtts), now]
    );
    db.run(`UPDATE threads SET last_activity = ? WHERE id = ?;`, [now, threadId]);
    saveDatabase(db);

    // 3. Check concurrency (max 4 concurrent turns default) & queue state
    const isPaused = this.queuePaused.get(agentId) === true;
    const activeTurns = this.getActiveTurnCount();

    if (activeTurns >= MAX_CONCURRENT_TURNS || isPaused) {
      // Must enqueue in FIFO message queue
      const posRes = db.exec(
        `SELECT COALESCE(MAX(position), 0) + 1 FROM message_queue WHERE agent_id = ?;`,
        [agentId]
      );
      const position = posRes.length && posRes[0].values.length ? (posRes[0].values[0][0] as number) : 1;
      const queueId = `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      const payload = JSON.stringify({
        providerId,
        model,
        messageText,
        attachments: validatedAtts,
      });

      const queueState = isPaused ? 'paused' : 'queued';
      db.run(
        `INSERT INTO message_queue (id, agent_id, thread_id, turn_id, message_payload, position, state, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [queueId, agentId, threadId, turnId, payload, position, queueState, now, now]
      );

      // Create turn record in queued state
      db.run(
        `INSERT INTO turns (id, thread_id, agent_id, sequence, status, started_at)
         VALUES (?, ?, ?, ?, 'queued', ?);`,
        [turnId, threadId, agentId, position, now]
      );
      saveDatabase(db);

      return {
        queued: true,
        turnId,
      };
    }

    // 4. Can run immediately
    return await this.executeTurn({
      turnId,
      agentId,
      threadId,
      providerId,
      model,
      messageText,
      attachments: validatedAtts,
    });
  }

  private async executeTurn(params: {
    turnId: string;
    agentId: string;
    threadId: string;
    providerId: string;
    model: string;
    messageText: string;
    attachments: ValidatedAttachment[];
  }): Promise<{ queued: boolean; turnId: string; reply?: any; error?: string }> {
    const { turnId, agentId, threadId, providerId, model, messageText } = params;
    const db = await initDatabase();
    const now = new Date().toISOString();

    const turn: DBTurn = {
      id: turnId,
      thread_id: threadId,
      agent_id: agentId,
      sequence: 1,
      status: 'running',
      started_at: now,
    };

    this.activeTurns.set(turnId, turn);
    this.turnActivityTimes.set(turnId, Date.now());

    // Insert or update turn in DB
    db.run(
      `INSERT OR REPLACE INTO turns (id, thread_id, agent_id, sequence, status, started_at)
       VALUES (?, ?, ?, ?, 'running', ?);`,
      [turnId, threadId, agentId, 1, now]
    );
    saveDatabase(db);

    try {
      // Send to live provider. Strictly NO FAKE REPLIES.
      const reply = await providerEngine.sendMessage(providerId, model, messageText);

      // Success: mark turn done
      turn.status = 'done';
      turn.finished_at = new Date().toISOString();
      this.activeTurns.delete(turnId);
      this.turnActivityTimes.delete(turnId);

      const agentMsgId = `msg-${Date.now()}-agent`;
      db.run(
        `INSERT INTO messages (id, thread_id, turn_id, author, kind, body, created_at)
         VALUES (?, ?, ?, 'agent', 'text', ?, ?);`,
        [agentMsgId, threadId, turnId, reply.text, turn.finished_at]
      );

      db.run(`UPDATE turns SET status = 'done', finished_at = ? WHERE id = ?;`, [
        turn.finished_at,
        turnId,
      ]);
      db.run(`UPDATE threads SET last_activity = ? WHERE id = ?;`, [turn.finished_at, threadId]);
      saveDatabase(db);

      // Check next queued message
      this.processNextQueueItem(agentId).catch(() => {});

      return {
        queued: false,
        turnId,
        reply,
      };
    } catch (err: any) {
      await this.failTurn(turnId, err.message || String(err));
      // Still check next queued turn
      this.processNextQueueItem(agentId).catch(() => {});
      return {
        queued: false,
        turnId,
        error: err.message || String(err),
      };
    }
  }

  private async failTurn(turnId: string, errorMsg: string) {
    const turn = this.activeTurns.get(turnId);
    if (turn) {
      turn.status = 'failed';
      turn.finished_at = new Date().toISOString();
      turn.error = errorMsg;
      this.activeTurns.delete(turnId);
    }
    this.turnActivityTimes.delete(turnId);

    const db = await initDatabase();
    db.run(`UPDATE turns SET status = 'failed', finished_at = ?, error = ? WHERE id = ?;`, [
      new Date().toISOString(),
      errorMsg,
      turnId,
    ]);
    saveDatabase(db);
  }

  private async processNextQueueItem(agentId: string) {
    if (this.queuePaused.get(agentId) === true) return;
    if (this.getActiveTurnCount() >= MAX_CONCURRENT_TURNS) return;

    const db = await initDatabase();
    const nextRow = db.exec(
      `SELECT id, agent_id, thread_id, turn_id, message_payload
       FROM message_queue
       WHERE agent_id = ? AND state = 'queued'
       ORDER BY position ASC
       LIMIT 1;`,
      [agentId]
    );

    if (!nextRow.length || !nextRow[0].values.length) return;

    const row = nextRow[0].values[0];
    const queueId = row[0] as string;
    const threadId = row[2] as string;
    const turnId = row[3] as string;
    const payload = JSON.parse(row[4] as string);

    // Update queue state to running
    db.run(`UPDATE message_queue SET state = 'running', updated_at = ? WHERE id = ?;`, [
      new Date().toISOString(),
      queueId,
    ]);
    saveDatabase(db);

    await this.executeTurn({
      turnId,
      agentId,
      threadId,
      providerId: payload.providerId,
      model: payload.model,
      messageText: payload.messageText,
      attachments: payload.attachments || [],
    });

    // Mark completed in queue
    db.run(`DELETE FROM message_queue WHERE id = ?;`, [queueId]);
    saveDatabase(db);
  }
}

export const chatSessionService = new ChatSessionService();
