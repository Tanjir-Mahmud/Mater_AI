import {
  initDatabase,
  saveDatabase,
  DBConnector,
  DBMessagingConnection,
  DBVoiceSettings,
  DBHostedSite,
  DBEnterpriseSSO,
} from './db';
import crypto from 'crypto';

// Exact spec limits & constants
export const HOSTED_SITE_EXPIRY_DAYS = 30;
export const STATUS_PAGE_URL = 'https://status.tiyandegital.com';
export const HOSTED_SITES_DOMAIN = 'hosted.tiyandegital.com';

export interface DictationModelInfo {
  id: string;
  name: string;
  provider: 'local' | 'cloud';
  speed: 'fast' | 'slower';
  languageCount: number;
  languagesDescription: string;
  autoDetectsLanguage: boolean;
  memoryRequirement?: string;
  requiresApiKey: boolean;
  apiKeyProvider?: 'elevenlabs' | 'groq';
  description: string;
}

export const DICTATION_MODELS: DictationModelInfo[] = [
  {
    id: 'parakeet',
    name: 'Parakeet',
    provider: 'local',
    speed: 'fast',
    languageCount: 25,
    languagesDescription: '25 European languages',
    autoDetectsLanguage: true,
    requiresApiKey: false,
    description: 'Fast, finds the spoken language itself, 25 European languages.',
  },
  {
    id: 'parakeet-unified',
    name: 'Parakeet Unified',
    provider: 'local',
    speed: 'fast',
    languageCount: 1,
    languagesDescription: 'English only',
    autoDetectsLanguage: false,
    requiresApiKey: false,
    description: 'Fast, English only.',
  },
  {
    id: 'bark',
    name: 'Bark',
    provider: 'local',
    speed: 'fast',
    languageCount: 1,
    languagesDescription: 'English only',
    autoDetectsLanguage: false,
    requiresApiKey: false,
    description: 'Fast, English only.',
  },
  {
    id: 'whisper',
    name: 'Whisper',
    provider: 'local',
    speed: 'slower',
    languageCount: 100,
    languagesDescription: 'about 100 languages',
    autoDetectsLanguage: true,
    requiresApiKey: false,
    description: 'Slower, about 100 languages.',
  },
  {
    id: 'cohere',
    name: 'Cohere',
    provider: 'local',
    speed: 'slower',
    languageCount: 14,
    languagesDescription: '14 languages',
    memoryRequirement: 'about 4 GB memory',
    autoDetectsLanguage: false,
    requiresApiKey: false,
    description: 'Slower, 14 languages, about 4 GB memory.',
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    provider: 'cloud',
    speed: 'fast',
    languageCount: 32,
    languagesDescription: '32 languages (streaming)',
    autoDetectsLanguage: true,
    requiresApiKey: true,
    apiKeyProvider: 'elevenlabs',
    description: 'Cloud dictation (streams, text shows while speaking).',
  },
  {
    id: 'groq-turbo',
    name: 'Groq Turbo',
    provider: 'cloud',
    speed: 'fast',
    languageCount: 100,
    languagesDescription: 'about 100 languages',
    autoDetectsLanguage: true,
    requiresApiKey: true,
    apiKeyProvider: 'groq',
    description: 'Cloud dictation with high throughput and low latency.',
  },
  {
    id: 'groq-large',
    name: 'Groq Large',
    provider: 'cloud',
    speed: 'fast',
    languageCount: 100,
    languagesDescription: 'about 100 languages',
    autoDetectsLanguage: true,
    requiresApiKey: true,
    apiKeyProvider: 'groq',
    description: 'Cloud dictation with maximum accuracy.',
  },
];

export interface TTSModelInfo {
  id: string;
  name: string;
  languageCount: number;
  description: string;
}

export const TTS_MODELS: TTSModelInfo[] = [
  { id: 'flash', name: 'Flash', languageCount: 31, description: 'Flash low-latency neural model, 31 languages.' },
  { id: 'multilingual', name: 'Multilingual', languageCount: 31, description: 'Multilingual expressive model, 31 languages.' },
  { id: 'v3', name: 'v3', languageCount: 31, description: 'Neural V3 high-fidelity speech synthesis, 31 languages.' },
  { id: 'xai', name: 'xAI', languageCount: 31, description: 'xAI voice synthesis model, 31 languages.' },
];

export interface GitHubTool {
  name: string;
  description: string;
  parameters: any;
}

export class IntegrationsVoiceService {
  public async init(): Promise<void> {
    const db = await initDatabase();

    // 1. Seed built-in connectors catalog if empty
    const connRes = db.exec(`SELECT count(*) FROM connectors;`);
    const connCount = connRes.length && connRes[0].values.length ? (connRes[0].values[0][0] as number) : 0;
    if (connCount === 0) {
      this.seedConnectors(db);
    }

    // 2. Seed messaging connections if empty
    const msgRes = db.exec(`SELECT count(*) FROM messaging_connections;`);
    const msgCount = msgRes.length && msgRes[0].values.length ? (msgRes[0].values[0][0] as number) : 0;
    if (msgCount === 0) {
      this.seedMessagingConnections(db);
    }

    // 3. Seed default voice settings if empty
    const voiceRes = db.exec(`SELECT count(*) FROM voice_settings;`);
    const voiceCount = voiceRes.length && voiceRes[0].values.length ? (voiceRes[0].values[0][0] as number) : 0;
    if (voiceCount === 0) {
      this.seedVoiceSettings(db);
    }

    saveDatabase(db);
  }

  // =============================================================
  // 1. CONNECTORS & GITHUB
  // =============================================================

  public async getConnectors(): Promise<DBConnector[]> {
    const db = await initDatabase();
    const res = db.exec(`SELECT id, service, name, status, account_identifier, auth_payload, config, created_at, updated_at FROM connectors ORDER BY name ASC;`);
    if (!res.length || !res[0].values.length) return [];
    return res[0].values.map((v) => ({
      id: v[0] as string,
      service: v[1] as string,
      name: v[2] as string,
      status: v[3] as any,
      account_identifier: (v[4] as string) || undefined,
      auth_payload: (v[5] as string) || undefined,
      config: (v[6] as string) || undefined,
      created_at: v[7] as string,
      updated_at: v[8] as string,
    }));
  }

  public async connectConnector(
    service: string,
    accountIdentifier: string,
    authPayload?: string
  ): Promise<{ success: boolean; connector: DBConnector; toolsCount?: number }> {
    const db = await initDatabase();
    const now = new Date().toISOString();

    db.run(
      `UPDATE connectors
       SET status = 'connected', account_identifier = ?, auth_payload = ?, updated_at = ?
       WHERE service = ?;`,
      [accountIdentifier, authPayload || '', now, service]
    );

    saveDatabase(db);

    const connectors = await this.getConnectors();
    const updated = connectors.find((c) => c.service === service);
    if (!updated) {
      throw new Error(`Connector for service "${service}" not found.`);
    }

    // Return agent tools count for connected services (e.g. GitHub provides repos, issues, pull requests)
    let toolsCount = 0;
    if (service === 'github') {
      toolsCount = this.getGitHubTools().length;
    }

    return {
      success: true,
      connector: updated,
      toolsCount,
    };
  }

  public async disconnectConnector(service: string): Promise<boolean> {
    const db = await initDatabase();
    const now = new Date().toISOString();
    db.run(
      `UPDATE connectors
       SET status = 'not-connected', account_identifier = NULL, auth_payload = NULL, updated_at = ?
       WHERE service = ?;`,
      [now, service]
    );
    saveDatabase(db);
    return true;
  }

  public getGitHubTools(): GitHubTool[] {
    return [
      {
        name: 'github_list_repositories',
        description: 'Lists GitHub repositories accessible by the connected GitHub user.',
        parameters: { type: 'object', properties: { visibility: { type: 'string', enum: ['all', 'public', 'private'] } } },
      },
      {
        name: 'github_get_issues',
        description: 'Retrieves issues for a specified repository with state filters.',
        parameters: { type: 'object', properties: { repo: { type: 'string' }, state: { type: 'string', enum: ['open', 'closed', 'all'] } }, required: ['repo'] },
      },
      {
        name: 'github_create_pull_request',
        description: 'Creates a new pull request in a GitHub repository from head to base branch.',
        parameters: { type: 'object', properties: { repo: { type: 'string' }, title: { type: 'string' }, head: { type: 'string' }, base: { type: 'string' }, body: { type: 'string' } }, required: ['repo', 'title', 'head', 'base'] },
      },
    ];
  }

  // =============================================================
  // 2. MESSAGING CONNECTIONS (Slack Orchestrator, Discord, Telegram)
  // =============================================================

  public async getMessagingConnections(): Promise<DBMessagingConnection[]> {
    const db = await initDatabase();
    const res = db.exec(
      `SELECT id, platform, workspace_name, answering_agent_id, status, signal_relay_connected, is_unofficial, details, created_at, updated_at
       FROM messaging_connections
       ORDER BY platform ASC;`
    );
    if (!res.length || !res[0].values.length) return [];
    return res[0].values.map((v) => ({
      id: v[0] as string,
      platform: v[1] as any,
      workspace_name: v[2] as string,
      answering_agent_id: v[3] as string,
      status: v[4] as any,
      signal_relay_connected: v[5] as number,
      is_unofficial: v[6] as number,
      details: (v[7] as string) || undefined,
      created_at: v[8] as string,
      updated_at: v[9] as string,
    }));
  }

  public async updateMessagingConnection(
    id: string,
    updates: { answeringAgentId?: string; status?: 'connected' | 'not-connected' | 'connecting' | 'error'; workspaceName?: string }
  ): Promise<boolean> {
    const db = await initDatabase();
    const now = new Date().toISOString();
    if (updates.answeringAgentId) {
      db.run(`UPDATE messaging_connections SET answering_agent_id = ?, updated_at = ? WHERE id = ?;`, [updates.answeringAgentId, now, id]);
    }
    if (updates.status) {
      const relayConnected = updates.status === 'connected' ? 1 : 0;
      db.run(`UPDATE messaging_connections SET status = ?, signal_relay_connected = ?, updated_at = ? WHERE id = ?;`, [updates.status, relayConnected, now, id]);
    }
    if (updates.workspaceName) {
      db.run(`UPDATE messaging_connections SET workspace_name = ?, updated_at = ? WHERE id = ?;`, [updates.workspaceName, now, id]);
    }
    saveDatabase(db);
    return true;
  }

  // =============================================================
  // 3. WHATSAPP VIA BAILEYS (Unofficial Client)
  // =============================================================

  public async connectWhatsAppBaileys(): Promise<{ success: boolean; isUnofficial: boolean; notice: string; status: string }> {
    const db = await initDatabase();
    const now = new Date().toISOString();
    const notice = 'Unofficial WhatsApp client via vendored Baileys (NOT an official WhatsApp Business API integration).';

    db.run(
      `UPDATE messaging_connections
       SET status = 'connected', is_unofficial = 1, signal_relay_connected = 1, details = ?, updated_at = ?
       WHERE platform = 'whatsapp';`,
      [notice, now]
    );

    saveDatabase(db);

    return {
      success: true,
      isUnofficial: true,
      notice,
      status: 'connected',
    };
  }

  public async disconnectWhatsAppBaileys(): Promise<{ success: boolean; status: string }> {
    const db = await initDatabase();
    const now = new Date().toISOString();
    db.run(
      `UPDATE messaging_connections
       SET status = 'not-connected', signal_relay_connected = 0, updated_at = ?
       WHERE platform = 'whatsapp';`,
      [now]
    );
    saveDatabase(db);
    return { success: true, status: 'not-connected' };
  }

  // =============================================================
  // 4. VOICE: DICTATION & STT MODELS
  // =============================================================

  public getDictationModels(): DictationModelInfo[] {
    return DICTATION_MODELS;
  }

  public getTTSModels(): TTSModelInfo[] {
    return TTS_MODELS;
  }

  public async getVoiceSettings(): Promise<DBVoiceSettings> {
    const db = await initDatabase();
    const res = db.exec(
      `SELECT id, dictation_engine, dictation_model, dictation_language, tts_voice, tts_model, tts_gender, tts_language, tts_auto_read, api_keys,
              voice_server_address, voice_server_api_key, voice_server_status, voice_server_use_for_dictation, voice_server_use_for_tts,
              voice_server_dictation_model, voice_server_tts_model, voice_server_voice, created_at, updated_at
       FROM voice_settings WHERE id = 'default';`
    );
    if (!res.length || !res[0].values.length) {
      this.seedVoiceSettings(db);
      return this.getVoiceSettings();
    }
    const v = res[0].values[0];
    return {
      id: v[0] as string,
      dictation_engine: v[1] as string,
      dictation_model: v[2] as string,
      dictation_language: v[3] as string,
      tts_voice: v[4] as string,
      tts_model: v[5] as string,
      tts_gender: v[6] as any,
      tts_language: v[7] as string,
      tts_auto_read: v[8] as number,
      api_keys: v[9] as string,
      voice_server_address: (v[10] as string) || undefined,
      voice_server_api_key: (v[11] as string) || undefined,
      voice_server_status: v[12] as any,
      voice_server_use_for_dictation: v[13] as number,
      voice_server_use_for_tts: v[14] as number,
      voice_server_dictation_model: (v[15] as string) || undefined,
      voice_server_tts_model: (v[16] as string) || undefined,
      voice_server_voice: (v[17] as string) || undefined,
      created_at: v[18] as string,
      updated_at: v[19] as string,
    };
  }

  public async updateVoiceSettings(updates: Partial<DBVoiceSettings>): Promise<DBVoiceSettings> {
    const db = await initDatabase();
    const now = new Date().toISOString();
    const current = await this.getVoiceSettings();

    const updated: DBVoiceSettings = {
      ...current,
      ...updates,
      updated_at: now,
    };

    db.run(
      `UPDATE voice_settings
       SET dictation_engine = ?, dictation_model = ?, dictation_language = ?, tts_voice = ?, tts_model = ?, tts_gender = ?,
           tts_language = ?, tts_auto_read = ?, api_keys = ?, voice_server_address = ?, voice_server_api_key = ?,
           voice_server_status = ?, voice_server_use_for_dictation = ?, voice_server_use_for_tts = ?,
           voice_server_dictation_model = ?, voice_server_tts_model = ?, voice_server_voice = ?, updated_at = ?
       WHERE id = 'default';`,
      [
        updated.dictation_engine,
        updated.dictation_model,
        updated.dictation_language,
        updated.tts_voice,
        updated.tts_model,
        updated.tts_gender,
        updated.tts_language,
        updated.tts_auto_read,
        updated.api_keys,
        updated.voice_server_address || null,
        updated.voice_server_api_key || null,
        updated.voice_server_status,
        updated.voice_server_use_for_dictation,
        updated.voice_server_use_for_tts,
        updated.voice_server_dictation_model || null,
        updated.voice_server_tts_model || null,
        updated.voice_server_voice || null,
        now,
      ]
    );

    saveDatabase(db);
    return updated;
  }

  public async saveVoiceApiKey(provider: 'elevenlabs' | 'groq' | 'xai', apiKey: string): Promise<boolean> {
    const current = await this.getVoiceSettings();
    let keysObj: Record<string, string> = {};
    try {
      keysObj = JSON.parse(current.api_keys || '{}');
    } catch {}
    keysObj[provider] = apiKey.trim();
    await this.updateVoiceSettings({ api_keys: JSON.stringify(keysObj) });
    return true;
  }

  public async removeVoiceApiKey(provider: 'elevenlabs' | 'groq' | 'xai'): Promise<boolean> {
    const current = await this.getVoiceSettings();
    let keysObj: Record<string, string> = {};
    try {
      keysObj = JSON.parse(current.api_keys || '{}');
    } catch {}
    delete keysObj[provider];
    await this.updateVoiceSettings({ api_keys: JSON.stringify(keysObj) });
    return true;
  }

  // =============================================================
  // 5. LIVE VOICE (Codex Sign-In Requirement)
  // =============================================================

  public checkLiveVoiceEligibility(isCodexConnected: boolean): {
    canUseLiveVoice: boolean;
    provider: string;
    instructions: string;
  } {
    if (!isCodexConnected) {
      return {
        canUseLiveVoice: false,
        provider: 'OpenAI Live Voice (Codex)',
        instructions: 'Sign in to Codex with your ChatGPT account to use live voice.',
      };
    }
    return {
      canUseLiveVoice: true,
      provider: 'OpenAI Live Voice (Codex)',
      instructions: 'Live voice stream ready. Voice, requests and replies route directly to OpenAI Codex.',
    };
  }

  // =============================================================
  // 6. VOICE SERVER (/v1/audio OpenAI-Compatible)
  // =============================================================

  public async configureVoiceServer(params: {
    address: string;
    apiKey?: string;
    useForDictation: boolean;
    useForTTS: boolean;
    dictationModel?: string;
    ttsModel?: string;
    voice?: string;
  }): Promise<{ status: 'Set up' | 'Not in use' | 'Not set up'; notices: string[] }> {
    const notices: string[] = [];
    let status: 'Set up' | 'Not in use' | 'Not set up' = 'Not set up';

    if (!params.address) {
      status = 'Not set up';
    } else if (!params.useForDictation && !params.useForTTS) {
      status = 'Not in use';
    } else {
      status = 'Set up';
      if (params.useForDictation) {
        notices.push('Your voice server takes dictation now.');
      }
      if (params.useForTTS) {
        notices.push('Your voice server reads replies aloud now.');
      }
    }

    await this.updateVoiceSettings({
      voice_server_address: params.address,
      voice_server_api_key: params.apiKey || undefined,
      voice_server_status: status,
      voice_server_use_for_dictation: params.useForDictation ? 1 : 0,
      voice_server_use_for_tts: params.useForTTS ? 1 : 0,
      voice_server_dictation_model: params.dictationModel,
      voice_server_tts_model: params.ttsModel,
      voice_server_voice: params.voice,
    });

    return { status, notices };
  }

  // =============================================================
  // 7. WEBHOOKS (OpenBot & Standard Webhooks Formats)
  // =============================================================

  public formatWebhookPayload(
    format: 'bissbot' | 'standard' | 'openbot',
    eventType: string,
    data: any,
    secretKey?: string
  ): { payload: any; headers: Record<string, string> } {
    const timestamp = Math.floor(Date.now() / 1000);
    const id = `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    if (format === 'standard') {
      // Standard Webhooks format
      const payload = {
        id,
        type: eventType,
        timestamp,
        data,
      };
      const rawPayload = JSON.stringify(payload);
      const signature = secretKey
        ? crypto.createHmac('sha256', secretKey).update(`v1,${timestamp}.${rawPayload}`).digest('base64')
        : 'v1,unsigned';

      return {
        payload,
        headers: {
          'webhook-id': id,
          'webhook-timestamp': timestamp.toString(),
          'webhook-signature': signature,
          'content-type': 'application/json',
        },
      };
    } else {
      // BissBot format
      const payload = {
        event: eventType,
        timestamp: new Date().toISOString(),
        payload: data,
      };
      const rawPayload = JSON.stringify(payload);
      const signature = secretKey
        ? crypto.createHmac('sha256', secretKey).update(rawPayload).digest('hex')
        : 'unsigned';

      return {
        payload,
        headers: {
          'x-bissbot-event': eventType,
          'x-bissbot-signature': signature,
          'x-openbot-event': eventType,
          'x-openbot-signature': signature,
          'content-type': 'application/json',
        },
      };
    }
  }

  // =============================================================
  // 8. ENTERPRISE SSO & ACCOUNT SERVICE
  // =============================================================

  public async getEnterpriseSSOConfigs(): Promise<DBEnterpriseSSO[]> {
    const db = await initDatabase();
    const res = db.exec(`SELECT id, provider, client_id, issuer_url, scim_enabled, scim_status, created_at FROM enterprise_sso;`);
    if (!res.length || !res[0].values.length) return [];
    return res[0].values.map((v) => ({
      id: v[0] as string,
      provider: v[1] as any,
      client_id: (v[2] as string) || undefined,
      issuer_url: (v[3] as string) || undefined,
      scim_enabled: v[4] as number,
      scim_status: v[5] as string,
      created_at: v[6] as string,
    }));
  }

  public async configureEnterpriseSSO(params: {
    provider: 'entra' | 'okta' | 'google_workspace';
    clientId: string;
    issuerUrl: string;
    scimEnabled?: boolean;
  }): Promise<DBEnterpriseSSO> {
    const db = await initDatabase();
    const id = `sso-${params.provider}`;
    const now = new Date().toISOString();
    const scim = params.scimEnabled !== false ? 1 : 0;

    db.run(
      `INSERT OR REPLACE INTO enterprise_sso (id, provider, client_id, issuer_url, scim_enabled, scim_status, created_at)
       VALUES (?, ?, ?, ?, ?, 'synced', ?);`,
      [id, params.provider, params.clientId, params.issuerUrl, scim, now]
    );

    saveDatabase(db);
    return {
      id,
      provider: params.provider,
      client_id: params.clientId,
      issuer_url: params.issuerUrl,
      scim_enabled: scim,
      scim_status: 'synced',
      created_at: now,
    };
  }

  // =============================================================
  // 9. HOSTED SITES (hosted.tiyandegital.com, 30-day expiry, 410 Gone)
  // =============================================================

  public async getHostedSites(): Promise<DBHostedSite[]> {
    const db = await initDatabase();
    const res = db.exec(
      `SELECT id, subdomain, domain, site_title, author_agent_id, source_files, status, published_at, expires_at, deleted_at
       FROM hosted_sites
       ORDER BY published_at DESC;`
    );
    if (!res.length || !res[0].values.length) return [];
    return res[0].values.map((v) => ({
      id: v[0] as string,
      subdomain: v[1] as string,
      domain: v[2] as string,
      site_title: v[3] as string,
      author_agent_id: (v[4] as string) || undefined,
      source_files: v[5] as string,
      status: v[6] as any,
      published_at: v[7] as string,
      expires_at: v[8] as string,
      deleted_at: (v[9] as string) || undefined,
    }));
  }

  public async publishHostedSite(params: {
    subdomain: string;
    siteTitle: string;
    authorAgentId?: string;
    sourceFiles?: Record<string, string>;
  }): Promise<DBHostedSite> {
    const db = await initDatabase();
    const cleanSubdomain = params.subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');
    const id = `site-${cleanSubdomain}`;
    const now = new Date();
    const publishedAt = now.toISOString();
    // Exact 30-day expiry per spec
    const expiresAt = new Date(now.getTime() + HOSTED_SITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const filesJson = JSON.stringify(params.sourceFiles || { 'index.html': `<h1>${params.siteTitle}</h1>` });

    db.run(
      `INSERT OR REPLACE INTO hosted_sites (id, subdomain, domain, site_title, author_agent_id, source_files, status, published_at, expires_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, 'published', ?, ?, NULL);`,
      [id, cleanSubdomain, HOSTED_SITES_DOMAIN, params.siteTitle, params.authorAgentId || null, filesJson, publishedAt, expiresAt]
    );

    saveDatabase(db);

    return {
      id,
      subdomain: cleanSubdomain,
      domain: HOSTED_SITES_DOMAIN,
      site_title: params.siteTitle,
      author_agent_id: params.authorAgentId,
      source_files: filesJson,
      status: 'published',
      published_at: publishedAt,
      expires_at: expiresAt,
    };
  }

  public async deleteHostedSite(siteId: string): Promise<{ success: boolean; httpStatus: number; message: string }> {
    const db = await initDatabase();
    const now = new Date().toISOString();

    // Mark as deleted - returns 410 Gone on lookup
    db.run(`UPDATE hosted_sites SET status = 'deleted', deleted_at = ? WHERE id = ?;`, [now, siteId]);
    saveDatabase(db);

    return {
      success: true,
      httpStatus: 410,
      message: '410 Gone: Hosted site has been permanently deleted.',
    };
  }

  public getStatusPageEndpoint(): { url: string; service: string } {
    return {
      url: STATUS_PAGE_URL,
      service: 'BissBot Operations & Infrastructure Telemetry',
    };
  }

  // =============================================================
  // SEED HELPERS
  // =============================================================

  private seedConnectors(db: any) {
    const now = new Date().toISOString();
    const defaultConnectors = [
      { id: 'conn-github', service: 'github', name: 'GitHub' },
      { id: 'conn-slack', service: 'slack', name: 'Slack' },
      { id: 'conn-discord', service: 'discord', name: 'Discord' },
      { id: 'conn-telegram', service: 'telegram', name: 'Telegram' },
      { id: 'conn-whatsapp', service: 'whatsapp', name: 'WhatsApp (Baileys)' },
      { id: 'conn-google', service: 'google', name: 'Google Drive / Workspace' },
      { id: 'conn-linear', service: 'linear', name: 'Linear' },
      { id: 'conn-notion', service: 'notion', name: 'Notion' },
    ];

    for (const c of defaultConnectors) {
      db.run(
        `INSERT INTO connectors (id, service, name, status, created_at, updated_at)
         VALUES (?, ?, ?, 'not-connected', ?, ?);`,
        [c.id, c.service, c.name, now, now]
      );
    }
  }

  private seedMessagingConnections(db: any) {
    const now = new Date().toISOString();
    const connections = [
      {
        id: 'msg-slack',
        platform: 'slack',
        workspace_name: 'Slack Workspace',
        answering_agent_id: 'agent-slack-orchestrator',
        is_unofficial: 0,
        details: 'Incoming messages route to Slack Orchestrator to coordinate responses with teammates.',
      },
      {
        id: 'msg-discord',
        platform: 'discord',
        workspace_name: 'Discord Guild',
        answering_agent_id: 'agent-kestrel',
        is_unofficial: 0,
        details: 'Connected via Signal relay.',
      },
      {
        id: 'msg-telegram',
        platform: 'telegram',
        workspace_name: 'Telegram Group',
        answering_agent_id: 'agent-cipher',
        is_unofficial: 0,
        details: 'Connected via Signal relay.',
      },
      {
        id: 'msg-whatsapp',
        platform: 'whatsapp',
        workspace_name: 'WhatsApp Business',
        answering_agent_id: 'agent-vanguard',
        is_unofficial: 1,
        details: 'Unofficial WhatsApp client via vendored Baileys (NOT an official WhatsApp Business API integration).',
      },
    ];

    for (const m of connections) {
      db.run(
        `INSERT INTO messaging_connections (id, platform, workspace_name, answering_agent_id, status, signal_relay_connected, is_unofficial, details, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'not-connected', 0, ?, ?, ?, ?);`,
        [m.id, m.platform, m.workspace_name, m.answering_agent_id, m.is_unofficial, m.details, now, now]
      );
    }
  }

  private seedVoiceSettings(db: any) {
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO voice_settings (id, dictation_engine, dictation_model, dictation_language, tts_voice, tts_model, tts_gender, tts_language, tts_auto_read, api_keys, voice_server_status, voice_server_use_for_dictation, voice_server_use_for_tts, created_at, updated_at)
       VALUES ('default', 'parakeet', 'Parakeet', 'Automatic', 'Female (Nova)', 'Flash', 'female', 'en', 1, '{}', 'Not set up', 0, 0, ?, ?);`,
      [now, now]
    );
  }
}

export const integrationsVoiceService = new IntegrationsVoiceService();
