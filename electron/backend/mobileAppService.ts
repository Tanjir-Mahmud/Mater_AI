import crypto from 'crypto';
import { getDatabase, saveDatabase } from './db';

// Milestone 8 Mobile Constants & Invariants
export const MOBILE_FILE_LIMIT_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_PIN_FAILURES = 10;
export const LIVE_ACTIVITY_MAX_LIFETIME_MS = 8 * 3600 * 1000; // 8 hours
export const DESKTOP_ACTIVITY_SUPPRESSION_MS = 30 * 1000; // 30 seconds
export const LIVE_ACTIVITY_HEARTBEAT_MS = 10 * 60 * 1000; // 10 minutes
export const LIVE_ACTIVITY_INTERNAL_DELAY_MS = 5 * 1000; // 5 seconds
export const RECONNECT_MAX_FAST_FAILURES = 5;
export const RECONNECT_DELAY_INITIAL_MS = 0; // immediate
export const RECONNECT_DELAY_STEP_MS = 10 * 1000; // 10s
export const RECONNECT_SERIES_PAUSE_MS = 120 * 1000; // 2 minutes (120s)

export const DESKTOP_ONLY_FEATURES = [
  'providers_and_permissions',
  'app_updates',
  'permissions_review',
  'hosted_site_publishing',
  'remote_desktop',
];

export interface LiveActivityState {
  activityId: string;
  agentId: string;
  agentName: string;
  agentState: 'idle' | 'thinking' | 'tool_execution' | 'waiting_approval' | 'completed';
  statePriority: number; // 10 for state change, 5 for internal change
  startedAt: number;
  lastUpdated: number;
  isActive: boolean;
  message: string;
}

export class MobileAppService {
  private initialised = false;
  private lastDesktopInputTime = 0;
  private activeLiveActivities = new Map<string, LiveActivityState>();

  public async init(): Promise<void> {
    if (this.initialised) return;
    const db = getDatabase();

    // Clean up any legacy fake seed devices or mock tokens (Milestone 8 cleanup migration)
    try {
      db.run(`DELETE FROM mobile_devices WHERE id = 'mob-dev-primary' OR push_token LIKE '%mock%' OR id LIKE 'mob-test-%';`);
      db.run(`DELETE FROM mobile_outbox WHERE device_id = 'mob-dev-primary' OR device_id LIKE 'mob-test-%';`);
      saveDatabase(db);
    } catch (e) {
      console.warn('Mobile database cleanup warning:', e);
    }

    // Spec rule: The device list starts EMPTY until the user links a real phone via Mobile Connect.
    // Do NOT seed any device, fake agents, fake channels, or mock tokens.
    this.initialised = true;
  }

  // -------------------------------------------------------------
  // DEVICE LINKING & MANAGEMENT
  // -------------------------------------------------------------

  public async linkDevice(params: {
    id?: string;
    userId: string;
    deviceName: string;
    platform: 'ios' | 'android';
    pin: string;
    pushToken?: string;
  }): Promise<{ success: boolean; deviceId: string; error?: string }> {
    if (!/^\d{4}$/.test(params.pin)) {
      return { success: false, deviceId: '', error: 'PIN must be exactly 4 digits.' };
    }
    const db = getDatabase();
    const deviceId = params.id || `mob-dev-${crypto.randomUUID()}`;
    const salt = crypto.randomBytes(16).toString('hex');
    const pinHash = crypto.createHash('sha256').update(params.pin + salt).digest('hex') + ':' + salt;
    const now = new Date().toISOString();

    db.run(
      `INSERT OR REPLACE INTO mobile_devices (id, user_id, device_name, platform, pin_hash, failed_pin_attempts, is_locked, encrypted_cache, push_token, last_sync_at, created_at)
       VALUES (?, ?, ?, ?, ?, 0, 0, '{}', ?, ?, ?);`,
      [
        deviceId,
        params.userId,
        params.deviceName,
        params.platform,
        pinHash,
        params.pushToken || null,
        now,
        now,
      ]
    );
    saveDatabase(db);
    return { success: true, deviceId };
  }

  public async listDevices(): Promise<any[]> {
    const db = getDatabase();
    const res = db.exec(
      `SELECT id, user_id, device_name, platform, failed_pin_attempts, is_locked, push_token, last_sync_at, created_at FROM mobile_devices;`
    );
    if (!res.length || !res[0].values.length) return [];
    return res[0].values.map((v) => ({
      id: String(v[0]),
      userId: String(v[1]),
      deviceName: String(v[2]),
      platform: String(v[3]),
      failedPinAttempts: Number(v[4]),
      isLocked: Boolean(v[5]),
      pushToken: v[6] ? String(v[6]) : null,
      lastSyncAt: String(v[7]),
      createdAt: String(v[8]),
    }));
  }

  // Record desktop user activity for single-device suppression
  public recordDesktopInput(): void {
    this.lastDesktopInputTime = Date.now();
  }

  public shouldSuppressMobileNotification(): boolean {
    return Date.now() - this.lastDesktopInputTime < DESKTOP_ACTIVITY_SUPPRESSION_MS;
  }

  // -------------------------------------------------------------
  // 1. PIN VERIFICATION & 10TH FAILURE LOCKOUT
  // -------------------------------------------------------------

  public async verifyPin(deviceId: string, pin: string): Promise<{
    success: boolean;
    remainingAttempts: number;
    signedOut: boolean;
    error?: string;
  }> {
    if (!/^\d{4}$/.test(pin)) {
      return {
        success: false,
        remainingAttempts: MAX_PIN_FAILURES,
        signedOut: false,
        error: 'PIN must be exactly 4 digits.',
      };
    }

    const db = getDatabase();
    const res = db.exec(
      `SELECT pin_hash, failed_pin_attempts, is_locked FROM mobile_devices WHERE id = '${deviceId.replace(/'/g, "''")}';`
    );
    if (!res.length || !res[0].values.length) {
      return { success: false, remainingAttempts: 0, signedOut: true, error: 'Mobile device session not found.' };
    }

    const [storedPinPayload, failedAttempts, isLocked] = [
      String(res[0].values[0][0] || ''),
      Number(res[0].values[0][1]),
      Number(res[0].values[0][2]),
    ];

    if (!storedPinPayload || !storedPinPayload.includes(':')) {
      return {
        success: false,
        remainingAttempts: 0,
        signedOut: true,
        error: 'No PIN configured for this device. A PIN must be set by the user.',
      };
    }

    if (isLocked || failedAttempts >= MAX_PIN_FAILURES) {
      return {
        success: false,
        remainingAttempts: 0,
        signedOut: true,
        error: '10 failed PIN attempts. Signed out and local cached keys purged.',
      };
    }

    const [storedHash, salt] = storedPinPayload.split(':');
    const computedHash = crypto.createHash('sha256').update(pin + salt).digest('hex');

    if (computedHash === storedHash) {
      // Success: reset failed attempts
      db.run(`UPDATE mobile_devices SET failed_pin_attempts = 0, is_locked = 0 WHERE id = ?;`, [deviceId]);
      saveDatabase(db);
      return { success: true, remainingAttempts: MAX_PIN_FAILURES, signedOut: false };
    }

    // Failure: increment attempt counter
    const newFailures = failedAttempts + 1;
    if (newFailures >= MAX_PIN_FAILURES) {
      // 10th failure: wipe local cache and lock out / sign out
      db.run(
        `UPDATE mobile_devices SET failed_pin_attempts = ?, is_locked = 1, encrypted_cache = '{}' WHERE id = ?;`,
        [newFailures, deviceId]
      );
      saveDatabase(db);
      return {
        success: false,
        remainingAttempts: 0,
        signedOut: true,
        error: '10 failed PIN attempts. Signed out and local cached keys purged.',
      };
    }

    db.run(`UPDATE mobile_devices SET failed_pin_attempts = ? WHERE id = ?;`, [newFailures, deviceId]);
    saveDatabase(db);
    return {
      success: false,
      remainingAttempts: MAX_PIN_FAILURES - newFailures,
      signedOut: false,
      error: `Incorrect PIN (${MAX_PIN_FAILURES - newFailures} attempts remaining).`,
    };
  }

  // -------------------------------------------------------------
  // 2. FILE UPLOADS & 10 MB LIMIT
  // -------------------------------------------------------------

  public validateMobileFileUpload(fileName: string, byteSize: number): {
    allowed: boolean;
    error?: string;
  } {
    if (byteSize > MOBILE_FILE_LIMIT_BYTES) {
      const mbSize = (byteSize / (1024 * 1024)).toFixed(1);
      return {
        allowed: false,
        error: `File "${fileName}" (${mbSize} MB) exceeds mobile 10 MB upload limit.`,
      };
    }
    return { allowed: true };
  }

  // -------------------------------------------------------------
  // 3. OFFLINE OUTBOX
  // -------------------------------------------------------------

  public async queueOutboxMessage(params: {
    deviceId: string;
    threadId: string;
    agentId: string;
    body: string;
    attachments?: any[];
  }): Promise<any> {
    const db = getDatabase();
    const id = `outbox-${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO mobile_outbox (id, device_id, thread_id, agent_id, body, attachments, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'queued', ?);`,
      [id, params.deviceId, params.threadId, params.agentId, params.body, JSON.stringify(params.attachments || []), now]
    );
    saveDatabase(db);

    return { id, status: 'queued', createdAt: now };
  }

  public async flushOutbox(deviceId: string): Promise<{ syncedCount: number; messageIds: string[] }> {
    const db = getDatabase();
    const res = db.exec(
      `SELECT id FROM mobile_outbox WHERE device_id = '${deviceId.replace(/'/g, "''")}' AND status = 'queued';`
    );
    if (!res.length || !res[0].values.length) {
      return { syncedCount: 0, messageIds: [] };
    }

    const ids = res[0].values.map((v) => String(v[0]));
    db.run(
      `UPDATE mobile_outbox SET status = 'synced' WHERE device_id = '${deviceId.replace(/'/g, "''")}' AND status = 'queued';`
    );
    saveDatabase(db);

    return { syncedCount: ids.length, messageIds: ids };
  }

  // -------------------------------------------------------------
  // 4. PUSH NOTIFICATIONS (APNs / FCM) - NO BUTTONS INVARIANT
  // -------------------------------------------------------------

  public sendPushNotification(params: {
    platform: 'ios' | 'android';
    title: string;
    body: string;
    data?: any;
  }): {
    delivered: boolean;
    suppressed: boolean;
    service: 'APNs' | 'FCM';
    hasButtons: false;
    payload: any;
  } {
    // Check one device per event (suppress if desktop was active in last 30s)
    if (this.shouldSuppressMobileNotification()) {
      return {
        delivered: false,
        suppressed: true,
        service: params.platform === 'ios' ? 'APNs' : 'FCM',
        hasButtons: false,
        payload: null,
      };
    }

    // Notifications have NO buttons on either platform
    const payload = {
      notification: {
        title: params.title,
        body: params.body,
      },
      data: params.data || {},
      buttons: [], // Invariant: no action buttons on either platform
    };

    return {
      delivered: true,
      suppressed: false,
      service: params.platform === 'ios' ? 'APNs' : 'FCM',
      hasButtons: false,
      payload,
    };
  }

  // -------------------------------------------------------------
  // 5. RECONNECTION TIMING SCHEDULE
  // -------------------------------------------------------------

  public calculateReconnectDelay(failureCount: number): {
    attemptCount: number;
    delaySeconds: number;
    isSeriesPause: boolean;
    indicatorText: string;
  } {
    if (failureCount <= 0) {
      return {
        attemptCount: 1,
        delaySeconds: RECONNECT_DELAY_INITIAL_MS / 1000,
        isSeriesPause: false,
        indicatorText: 'Connecting immediately...',
      };
    }

    if (failureCount < RECONNECT_MAX_FAST_FAILURES) {
      // 10s step after each failure
      const delay = RECONNECT_DELAY_STEP_MS / 1000;
      return {
        attemptCount: failureCount + 1,
        delaySeconds: delay,
        isSeriesPause: false,
        indicatorText: `Reconnecting (attempt ${failureCount + 1}, waiting ${delay}s)...`,
      };
    }

    // After 5 failures: wait 2 minutes (120s) before starting a new series
    const delay = RECONNECT_SERIES_PAUSE_MS / 1000;
    return {
      attemptCount: failureCount + 1,
      delaySeconds: delay,
      isSeriesPause: true,
      indicatorText: `Reconnecting (5 failures reached. Waiting 2 minutes before retrying)...`,
    };
  }

  // -------------------------------------------------------------
  // 6. IPHONE LIVE ACTIVITY (iOS ONLY)
  // -------------------------------------------------------------

  public updateLiveActivity(params: {
    platform: 'ios' | 'android';
    agentId: string;
    agentName: string;
    agentState: 'idle' | 'thinking' | 'tool_execution' | 'waiting_approval' | 'completed';
    isStateChange: boolean;
    details?: string;
  }): {
    supported: boolean;
    activityId?: string;
    priority?: number;
    delaySeconds?: number;
    isActive: boolean;
    message: string;
  } {
    // Android has NO Live Activity
    if (params.platform === 'android') {
      return {
        supported: false,
        isActive: false,
        message: 'Live Activity is supported only on iOS (Dynamic Island & Lock Screen).',
      };
    }

    const now = Date.now();
    let current = this.activeLiveActivities.get(params.agentId);

    // Idle state ends the activity
    if (params.agentState === 'idle') {
      if (current) {
        current.isActive = false;
        this.activeLiveActivities.delete(params.agentId);
      }
      return {
        supported: true,
        isActive: false,
        message: 'Agent returned to idle. Live Activity ended.',
      };
    }

    // Check 8-hour lifetime
    if (current && now - current.startedAt > LIVE_ACTIVITY_MAX_LIFETIME_MS) {
      current.isActive = false;
      this.activeLiveActivities.delete(params.agentId);
      return {
        supported: true,
        isActive: false,
        message: 'Live Activity expired after 8 hours lifetime.',
      };
    }

    // Event priorities:
    // State change: priority 10
    // Change inside state: waits 5 seconds, priority 5
    const priority = params.isStateChange ? 10 : 5;
    const delaySeconds = params.isStateChange ? 0 : LIVE_ACTIVITY_INTERNAL_DELAY_MS / 1000;

    if (!current) {
      current = {
        activityId: `live-act-${crypto.randomUUID()}`,
        agentId: params.agentId,
        agentName: params.agentName,
        agentState: params.agentState,
        statePriority: priority,
        startedAt: now,
        lastUpdated: now,
        isActive: true,
        message: params.details || `${params.agentName} is ${params.agentState}`,
      };
    } else {
      current.agentState = params.agentState;
      current.statePriority = priority;
      current.lastUpdated = now;
      current.message = params.details || `${params.agentName} is ${params.agentState}`;
    }

    this.activeLiveActivities.set(params.agentId, current);

    return {
      supported: true,
      activityId: current.activityId,
      priority,
      delaySeconds,
      isActive: true,
      message: current.message,
    };
  }

  // -------------------------------------------------------------
  // 7. DESKTOP-ONLY FEATURE ENFORCEMENT
  // -------------------------------------------------------------

  public enforceDesktopOnly(feature: string): void {
    if (DESKTOP_ONLY_FEATURES.includes(feature)) {
      throw new Error(`"${feature}" is desktop-only and cannot be managed from mobile.`);
    }
  }

  // -------------------------------------------------------------
  // 8. MOBILE PROMPTING AGENT CREATION
  // -------------------------------------------------------------

  public async createAgentFromMobilePrompt(prompt: string): Promise<any> {
    const db = getDatabase();
    const id = `agent-mob-${Date.now().toString(36)}`;
    const now = new Date().toISOString();

    const name = prompt.split(' ')[0] ? `${prompt.split(' ')[0]} (Mobile)` : 'Mobile Agent';
    db.run(
      `INSERT INTO agents (id, name, role, avatar, status, unread_count, section, is_pinned, is_hidden, model, provider, reasoning_level, notification_level, browser_profile, workspace_path, created_at, updated_at)
       VALUES (?, ?, ?, 'smart_toy', 'idle', 0, 'unassigned', 0, 0, 'Claude 3.7 Sonnet', 'claude', 'medium', 'all', 'shared', ?, ?, ?);`,
      [id, name, prompt, `/workspaces/${id}`, now, now]
    );
    saveDatabase(db);

    return { id, name, role: prompt, status: 'idle' };
  }
}

export const mobileAppService = new MobileAppService();
