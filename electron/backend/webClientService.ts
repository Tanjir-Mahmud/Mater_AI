import crypto from 'crypto';
import { getDatabase, saveDatabase } from './db';

// Milestone 8 Web Client Constants & Invariants
export const WEB_FILE_LIMIT_BYTES = 10 * 1024 * 1024; // 10 MB
export const WEB_IMAGE_THUMBNAIL_LIMIT_BYTES = 2 * 1024 * 1024; // 2 MB
export const WEB_MEDIA_PLAY_LIMIT_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_CONCURRENT_DOWNLOADS = 2;
export const TAB_LOCK_HEARTBEAT_TIMEOUT_MS = 15 * 1000; // 15 seconds

export const OBJECT_URL_ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/avif',
  'audio/mpeg',
  'video/quicktime',
];

export const OBJECT_URL_ALLOWED_EXTENSIONS = [
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'avif',
  'mp3',
  'mov',
];

// Strictly disallowed from object URL generation (XSS / execution safety)
export const OBJECT_URL_FORBIDDEN_EXTENSIONS = ['html', 'htm', 'svg', 'xhtml', 'xml', 'js'];

export const WEB_DESKTOP_ONLY_FEATURES = [
  'remote_desktop',
  'hosted_site_publishing',
  'providers_and_permissions',
  'app_updates',
  'permissions_review',
  'web_dashboard',
  'welcome_screen',
  'separate_conversation_toolbar',
  'always_visible_invitation_form',
];

export class WebClientService {
  private initialised = false;
  private activeDownloadsCount = 0;

  public async init(): Promise<void> {
    if (this.initialised) return;
    this.initialised = true;
  }

  // -------------------------------------------------------------
  // 1. COOKIE-ONLY AUTH & SIGNAL HANDSHAKE TICKET
  // -------------------------------------------------------------

  public generateSignalConnectionTicket(accountId: string, hostId: string): {
    ticket: string;
    expiresAt: string;
    handshakeEndpoint: string;
  } {
    const ticket = `ticket_sig_${crypto.randomBytes(16).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    return {
      ticket,
      expiresAt,
      handshakeEndpoint: `wss://signal.openbot.run/v1/peer?ticket=${ticket}&host=${hostId}&acc=${accountId}`,
    };
  }

  // -------------------------------------------------------------
  // 2. SINGLE-TAB LOCK PER HOST & ACCOUNT
  // -------------------------------------------------------------

  /**
   * One tab can connect to a given host with an account; other accounts/hosts have separate locks.
   * If another tab holds the lock, returns explicit rejection message.
   */
  public async acquireTabLock(
    hostId: string,
    accountId: string,
    tabId: string
  ): Promise<{
    acquired: boolean;
    lockedTabId?: string;
    message: string;
  }> {
    const db = getDatabase();
    const nowIso = new Date().toISOString();
    const lockKey = `${hostId}:${accountId}`;

    // Clean up stale locks older than heartbeat timeout
    const staleThreshold = new Date(Date.now() - TAB_LOCK_HEARTBEAT_TIMEOUT_MS).toISOString();
    db.run(`DELETE FROM web_session_locks WHERE last_heartbeat_at < ?;`, [staleThreshold]);

    const res = db.exec(
      `SELECT tab_id, last_heartbeat_at FROM web_session_locks WHERE id = '${lockKey.replace(/'/g, "''")}';`
    );

    if (res.length && res[0].values.length) {
      const currentTab = String(res[0].values[0][0]);
      if (currentTab === tabId) {
        // Refresh heartbeat
        db.run(`UPDATE web_session_locks SET last_heartbeat_at = ? WHERE id = ?;`, [nowIso, lockKey]);
        saveDatabase(db);
        return { acquired: true, lockedTabId: tabId, message: 'Session lock active for this tab.' };
      }

      // Another tab holds the lock
      return {
        acquired: false,
        lockedTabId: currentTab,
        message: 'Another tab is already connected to this host with your account. Close the other tab to connect here.',
      };
    }

    // No lock exists: acquire it
    db.run(
      `INSERT INTO web_session_locks (id, host_id, account_id, tab_id, locked_at, last_heartbeat_at)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [lockKey, hostId, accountId, tabId, nowIso, nowIso]
    );
    saveDatabase(db);

    return { acquired: true, lockedTabId: tabId, message: 'Session lock acquired for this tab.' };
  }

  public async takeOverTabLock(hostId: string, accountId: string, tabId: string): Promise<{
    acquired: boolean;
    lockedTabId: string;
    message: string;
  }> {
    const db = getDatabase();
    const nowIso = new Date().toISOString();
    const lockKey = `${hostId}:${accountId}`;

    db.run(
      `INSERT OR REPLACE INTO web_session_locks (id, host_id, account_id, tab_id, locked_at, last_heartbeat_at)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [lockKey, hostId, accountId, tabId, nowIso, nowIso]
    );
    saveDatabase(db);

    return { acquired: true, lockedTabId: tabId, message: 'Session lock taken over by this tab.' };
  }

  public async releaseTabLock(hostId: string, accountId: string, tabId: string): Promise<boolean> {
    const db = getDatabase();
    const lockKey = `${hostId}:${accountId}`;
    db.run(`DELETE FROM web_session_locks WHERE id = ? AND tab_id = ?;`, [lockKey, tabId]);
    saveDatabase(db);
    return true;
  }

  // -------------------------------------------------------------
  // 3. OBJECT URL ALLOWLIST & INLINE MEDIA RULES
  // -------------------------------------------------------------

  /**
   * Only PNG, JPEG, GIF, WebP, AVIF, MP3, and MOV get an object URL.
   * HTML, SVG, and XHTML NEVER get an object URL.
   */
  public isObjectUrlAllowed(fileName: string, mimeType?: string): {
    allowed: boolean;
    reason?: string;
  } {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';

    if (OBJECT_URL_FORBIDDEN_EXTENSIONS.includes(ext) || (mimeType && (mimeType.includes('html') || mimeType.includes('svg')))) {
      return {
        allowed: false,
        reason: 'HTML, SVG and XHTML documents are strictly prohibited from Object URL allocation.',
      };
    }

    const extAllowed = OBJECT_URL_ALLOWED_EXTENSIONS.includes(ext);
    const mimeAllowed = mimeType ? OBJECT_URL_ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase()) : false;

    if (extAllowed || mimeAllowed) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: 'Only PNG, JPEG, GIF, WebP, AVIF, MP3, and MOV are permitted for Object URL rendering.',
    };
  }

  /**
   * Inline Media Display Mode:
   * <= 2 MB images: download & thumbnail
   * <= 10 MB audio/video (MP3/MOV): play button (click downloads then plays)
   * Larger files: only Download
   */
  public inspectInlineMediaCard(fileName: string, byteSize: number, mimeType?: string): {
    renderMode: 'thumbnail' | 'player_button' | 'download_only';
    objectUrlPermitted: boolean;
    canAutoDownload: boolean;
  } {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif'].includes(ext);
    const isAudioVideo = ['mp3', 'mov'].includes(ext);
    const urlCheck = this.isObjectUrlAllowed(fileName, mimeType);

    if (isImage && byteSize <= WEB_IMAGE_THUMBNAIL_LIMIT_BYTES && urlCheck.allowed) {
      return {
        renderMode: 'thumbnail',
        objectUrlPermitted: true,
        canAutoDownload: true,
      };
    }

    if (isAudioVideo && byteSize <= WEB_MEDIA_PLAY_LIMIT_BYTES && urlCheck.allowed) {
      return {
        renderMode: 'player_button',
        objectUrlPermitted: true,
        canAutoDownload: false, // Click downloads whole file, then starts player
      };
    }

    return {
      renderMode: 'download_only',
      objectUrlPermitted: false,
      canAutoDownload: false,
    };
  }

  // -------------------------------------------------------------
  // 4. CONCURRENT DOWNLOADS (MAX 2 AT ONCE)
  // -------------------------------------------------------------

  public requestDownloadSlot(fileId: string): {
    granted: boolean;
    activeDownloads: number;
    error?: string;
  } {
    if (this.activeDownloadsCount >= MAX_CONCURRENT_DOWNLOADS) {
      return {
        granted: false,
        activeDownloads: this.activeDownloadsCount,
        error: `At most 2 files can download at once. Download for "${fileId}" is queued.`,
      };
    }

    this.activeDownloadsCount += 1;
    return { granted: true, activeDownloads: this.activeDownloadsCount };
  }

  public releaseDownloadSlot(): { activeDownloads: number } {
    this.activeDownloadsCount = Math.max(0, this.activeDownloadsCount - 1);
    return { activeDownloads: this.activeDownloadsCount };
  }

  public cancelFileTransfer(transferId: string): {
    cancelled: boolean;
    protocolFrame: { type: 'file-cancel'; transferId: string };
  } {
    this.releaseDownloadSlot();
    return {
      cancelled: true,
      protocolFrame: { type: 'file-cancel', transferId },
    };
  }

  // -------------------------------------------------------------
  // 5. DEEP LINKS AT /app & IMMEDIATE FIELD REMOVAL
  // -------------------------------------------------------------

  /**
   * Accepts:
   * 1. ?agent=<id>
   * 2. ?server=<id>&secret=<secret>&host=<host>&name=<name>
   * 3. ?plugin=<slug>
   * 4. ?billing=portal
   * Strips fields from URL so secrets do NOT stay in address bar or history.
   * Opens dialog/listing and NEVER installs/joins without user click.
   */
  public parseAndCleanDeepLink(rawUrl: string): {
    linkType: 'agent' | 'invitation' | 'plugin' | 'billing_return' | 'none';
    data: any;
    cleanedUrl: string;
    requiresUserConfirmation: boolean;
  } {
    try {
      const url = new URL(rawUrl, 'https://openbot.run');
      const params = url.searchParams;

      let linkType: 'agent' | 'invitation' | 'plugin' | 'billing_return' | 'none' = 'none';
      let data: any = {};

      if (params.has('billing') && params.get('billing') === 'portal') {
        linkType = 'billing_return';
        data = { portalReturn: true };
        params.delete('billing');
      } else if (params.has('agent')) {
        linkType = 'agent';
        data = { agentId: params.get('agent') };
        params.delete('agent');
      } else if (params.has('server') && params.has('secret')) {
        linkType = 'invitation';
        data = {
          serverId: params.get('server'),
          secret: params.get('secret'),
          host: params.get('host'),
          serverName: params.get('name'),
        };
        params.delete('server');
        params.delete('secret');
        params.delete('host');
        params.delete('name');
      } else if (params.has('plugin')) {
        linkType = 'plugin';
        data = { pluginSlug: params.get('plugin') };
        params.delete('plugin');
      }

      // Reconstruct cleaned URL without secrets
      const queryStr = params.toString();
      const cleanedUrl = `${url.pathname}${queryStr ? '?' + queryStr : ''}`;

      return {
        linkType,
        data,
        cleanedUrl,
        requiresUserConfirmation: true, // Never installs or joins without user pressing button
      };
    } catch {
      return {
        linkType: 'none',
        data: {},
        cleanedUrl: rawUrl,
        requiresUserConfirmation: true,
      };
    }
  }

  // -------------------------------------------------------------
  // 6. RECONNECT & RETRY RULES
  // -------------------------------------------------------------

  public evaluateMessageRetry(hostCapabilities: string[]): {
    canRetry: boolean;
    reason: string;
  } {
    if (hostCapabilities.includes('client-message-id')) {
      return {
        canRetry: true,
        reason: 'Host supports client-message-id deduplication. Safe to retry.',
      };
    }
    return {
      canRetry: false,
      reason: 'Retry is offered only when the host supports the client-message-id capability. Edit or Dismiss only.',
    };
  }

  // -------------------------------------------------------------
  // 7. DESKTOP-ONLY WEB RESTRICTIONS
  // -------------------------------------------------------------

  public enforceWebDesktopOnly(feature: string): void {
    if (WEB_DESKTOP_ONLY_FEATURES.includes(feature)) {
      throw new Error(`"${feature}" is desktop-only and cannot be accessed from the web client.`);
    }
  }
}

export const webClientService = new WebClientService();
