import { contextBridge, ipcRenderer } from 'electron';

export interface OpenBotBridge {
  platform: string;
  getSettings: () => Promise<any>;
  saveSettings: (settings: any) => Promise<{ success: boolean; error?: string }>;
  confirmQuit: () => Promise<void>;
  onQuitRequest: (callback: () => void) => () => void;
  zoomIn: () => Promise<number>;
  zoomOut: () => Promise<number>;
  zoomReset: () => Promise<number>;
  getCustomPalettes: () => Promise<any[]>;
  onPaletteChanged: (callback: (filename: string) => void) => () => void;
  onMenuEvent: (channel: string, callback: (...args: any[]) => void) => () => void;

  // Milestone 2 IPC
  getProviderCatalogue: () => Promise<any[]>;
  getProviderStatuses: () => Promise<Record<string, string>>;
  connectProvider: (providerId: string) => Promise<{ success: boolean; status: string; error?: string }>;
  disconnectProvider: (providerId: string) => Promise<void>;
  detectLocalModelServers: () => Promise<{ ollama: boolean; lmStudio: boolean }>;

  generateAgentDraft: (prompt: string) => Promise<any>;
  createAgent: (agentData: any) => Promise<{ success: boolean; agent: any }>;
  deleteAgent: (agentId: string) => Promise<{ success: boolean; workspaceDeleted: boolean }>;
  exportAgentTemplate: (agentId: string) => Promise<{ success: boolean; template: any }>;

  sendMessage: (payload: { agentId: string; providerId: string; model: string; message: string }) => Promise<any>;
  captureScreenshot: (savePath?: string) => Promise<string>;

  // Milestone 3 IPC
  getThreads: (agentId: string) => Promise<any[]>;
  createThread: (agentId: string, title?: string, kind?: string, parentThreadId?: string, sourceMessageId?: string) => Promise<any>;
  renameThread: (threadId: string, newTitle: string) => Promise<boolean>;
  closeThread: (threadId: string) => Promise<boolean>;
  deleteThread: (threadId: string) => Promise<boolean>;
  getMessages: (threadId: string) => Promise<any[]>;
  branchThreadFromMessage: (threadId: string, messageId: string, branchTitle?: string) => Promise<any>;
  compactThread: (threadId: string, turnsToPreserve?: number) => Promise<{ success: boolean; summary: string; compactedTurns: number }>;
  getQueue: (agentId: string) => Promise<any[]>;
  pauseQueue: (agentId: string) => Promise<boolean>;
  resumeQueue: (agentId: string) => Promise<boolean>;
  cancelQueuedMessage: (queueId: string) => Promise<boolean>;
  submitTurnMessage: (payload: {
    agentId: string;
    threadId: string;
    providerId: string;
    model: string;
    messageText: string;
    attachments?: any[];
  }) => Promise<{ queued: boolean; turnId?: string; reply?: any; error?: string }>;
  getActiveTurnCount: () => Promise<number>;

  // Milestone 4 IPC
  getBackgroundProcesses: () => Promise<any[]>;
  startBackgroundProcess: (command: string, agentId?: string, ports?: number[]) => Promise<any>;
  stopBackgroundProcess: (id: string) => Promise<boolean>;

  getMCPServers: () => Promise<any[]>;
  addMCPServer: (server: any) => Promise<any>;
  updateMCPServer: (id: string, updates: any) => Promise<boolean>;
  removeMCPServer: (id: string) => Promise<boolean>;
  testMCPServer: (id: string) => Promise<{ success: boolean; latencyMs: number; error?: string }>;
  isMCPDirty: () => Promise<boolean>;
  markMCPSaved: () => Promise<void>;

  getSkills: () => Promise<any[]>;
  createSkill: (skill: any) => Promise<any>;
  getAgentSkills: (agentId: string) => Promise<any[]>;
  attachSkillToAgent: (agentId: string, skillId: string) => Promise<boolean>;
  detachSkillFromAgent: (agentId: string, skillId: string) => Promise<boolean>;

  getRoutines: () => Promise<any[]>;
  createRoutine: (routine: any) => Promise<any>;
  triggerWebhook: (routeId: string, deliveryId: string) => Promise<any>;
  getCalendarFeed: () => Promise<string>;

  getWorkflows: () => Promise<any[]>;
  createWorkflow: (workflow: any) => Promise<any>;
  runWorkflow: (workflowId: string) => Promise<any>;
  deleteWorkflow: (id: string) => Promise<{ success: boolean; deletedWorkflow: any }>;
  restoreWorkflow: (workflow: any) => Promise<boolean>;

  getMemories: (agentId: string) => Promise<any[]>;
  addMemory: (agentId: string, factText: string, isEssential?: boolean) => Promise<any>;
  deleteMemory: (memoryId: string) => Promise<boolean>;
  getMemoryUsage: (agentId: string) => Promise<{ totalBytes: number; essentialBytes: number; budgetBytes: number }>;

  toggleBrowserPiP: () => Promise<boolean>;
  getComputerUseStatus: () => Promise<{ enabled: boolean; driverRunning: boolean; permissions: any; platform: string }>;
  setComputerUseEnabled: (enabled: boolean) => Promise<boolean>;

  getBackupModels: (agentId: string) => Promise<any[]>;
  setBackupModels: (agentId: string, models: any[]) => Promise<boolean>;
  pollUsage: () => Promise<{ polled: boolean; tokens: number; resetTime: string }>;

  // Milestone 5 IPC
  getTeamServers: () => Promise<any[]>;
  createTeamServer: (server: any) => Promise<any>;
  joinTeamServer: (token: string, userEmail: string) => Promise<any>;
  setPublishState: (serverId: string, state: 'reachable' | 'not-reachable') => Promise<boolean>;
  rotateServerKey: (serverId: string) => Promise<any>;
  restartServer: (serverId: string) => Promise<any>;
  updateServerSettings: (serverId: string, updates: any) => Promise<boolean>;
  deleteTeamServer: (serverId: string, confirmationName: string) => Promise<boolean>;

  getServerMembers: (serverId: string) => Promise<any[]>;
  inviteServerMember: (serverId: string, email: string, name: string, role?: string) => Promise<any>;
  removeServerMember: (serverId: string, memberId: string) => Promise<boolean>;
  getMemberAgentAccess: (memberId: string) => Promise<any[]>;
  setMemberAgentAccess: (memberId: string, agentId: string, accessLevel: string) => Promise<boolean>;

  getTeamChannels: (serverId: string) => Promise<any[]>;
  createTeamChannel: (channel: any) => Promise<any>;
  deleteTeamChannel: (channelId: string) => Promise<boolean>;
  restoreTeamChannel: (channelId: string) => Promise<boolean>;
  assignChannelTask: (channelId: string, agentIds: string[]) => Promise<any>;

  getSharedTables: () => Promise<any[]>;
  createSharedTable: (name: string, creatorAgentId: string, columns: string[]) => Promise<any>;
  alterSharedTable: (name: string, requestingAgentId: string, columns: string[]) => Promise<boolean>;
  dropSharedTable: (name: string, requestingAgentId: string, isUser?: boolean) => Promise<boolean>;
  insertSharedTableRow: (name: string, row: any) => Promise<boolean>;
  readSharedTableRows: (name: string) => Promise<any[]>;

  getAuditLogs: (serverId: string) => Promise<any[]>;
  createRemoteDesktopTest: (serverId: string, targetName: string) => Promise<any>;
  verifyRemoteDesktopTest: (sessionId: string, code: string) => Promise<any>;
  stopAllRemoteControl: () => Promise<boolean>;

  // Milestone 6: Integrations & Voice
  getConnectors: () => Promise<any[]>;
  connectConnector: (service: string, accountIdentifier: string, authPayload?: string) => Promise<any>;
  disconnectConnector: (service: string) => Promise<boolean>;
  getMessagingConnections: () => Promise<any[]>;
  updateMessagingConnection: (id: string, updates: any) => Promise<boolean>;
  connectWhatsAppBaileys: () => Promise<any>;
  disconnectWhatsAppBaileys: () => Promise<any>;
  getDictationModels: () => Promise<any[]>;
  getTTSModels: () => Promise<any[]>;
  getVoiceSettings: () => Promise<any>;
  updateVoiceSettings: (updates: any) => Promise<any>;
  saveVoiceApiKey: (provider: string, apiKey: string) => Promise<boolean>;
  removeVoiceApiKey: (provider: string) => Promise<boolean>;
  checkLiveVoiceEligibility: (isCodexConnected: boolean) => Promise<any>;
  configureVoiceServer: (params: any) => Promise<any>;
  formatWebhookPayload: (format: string, eventType: string, data: any, secretKey?: string) => Promise<any>;
  getHostedSites: () => Promise<any[]>;
  publishHostedSite: (params: any) => Promise<any>;
  deleteHostedSite: (siteId: string) => Promise<any>;
  getEnterpriseSSOConfigs: () => Promise<any[]>;
  configureEnterpriseSSO: (params: any) => Promise<any>;
}

const bridge: OpenBotBridge = {
  platform: process.platform,
  getSettings: () => ipcRenderer.invoke('app:get-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('app:save-settings', settings),
  confirmQuit: () => ipcRenderer.invoke('app:confirm-quit'),
  onQuitRequest: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('app:request-quit', handler);
    return () => ipcRenderer.removeListener('app:request-quit', handler);
  },
  zoomIn: () => ipcRenderer.invoke('window:zoom-in'),
  zoomOut: () => ipcRenderer.invoke('window:zoom-out'),
  zoomReset: () => ipcRenderer.invoke('window:zoom-reset'),
  getCustomPalettes: () => ipcRenderer.invoke('theme:get-custom-palettes'),
  onPaletteChanged: (callback: (filename: string) => void) => {
    const handler = (_: any, filename: string) => callback(filename);
    ipcRenderer.on('theme:palette-changed', handler);
    return () => ipcRenderer.removeListener('theme:palette-changed', handler);
  },
  onMenuEvent: (channel: string, callback: (...args: any[]) => void) => {
    const handler = (_: any, ...args: any[]) => callback(...args);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },

  // Milestone 2 IPC
  getProviderCatalogue: () => ipcRenderer.invoke('providers:get-catalogue'),
  getProviderStatuses: () => ipcRenderer.invoke('providers:get-statuses'),
  connectProvider: (providerId: string) => ipcRenderer.invoke('providers:connect', providerId),
  disconnectProvider: (providerId: string) => ipcRenderer.invoke('providers:disconnect', providerId),
  detectLocalModelServers: () => ipcRenderer.invoke('providers:detect-local-servers'),

  generateAgentDraft: (prompt: string) => ipcRenderer.invoke('agent:generate-draft', prompt),
  createAgent: (agentData: any) => ipcRenderer.invoke('agent:create', agentData),
  deleteAgent: (agentId: string) => ipcRenderer.invoke('agent:delete', agentId),
  exportAgentTemplate: (agentId: string) => ipcRenderer.invoke('agent:export-template', agentId),

  sendMessage: (payload) => ipcRenderer.invoke('chat:send-message', payload),
  captureScreenshot: (savePath) => ipcRenderer.invoke('window:capture-screenshot', savePath),

  // Milestone 3 IPC
  getThreads: (agentId) => ipcRenderer.invoke('chat:get-threads', agentId),
  createThread: (agentId, title, kind, parentThreadId, sourceMessageId) =>
    ipcRenderer.invoke('chat:create-thread', { agentId, title, kind, parentThreadId, sourceMessageId }),
  renameThread: (threadId, newTitle) => ipcRenderer.invoke('chat:rename-thread', { threadId, newTitle }),
  closeThread: (threadId) => ipcRenderer.invoke('chat:close-thread', threadId),
  deleteThread: (threadId) => ipcRenderer.invoke('chat:delete-thread', threadId),
  getMessages: (threadId) => ipcRenderer.invoke('chat:get-messages', threadId),
  branchThreadFromMessage: (threadId, messageId, branchTitle) =>
    ipcRenderer.invoke('chat:branch-thread', { threadId, messageId, branchTitle }),
  compactThread: (threadId, turnsToPreserve) =>
    ipcRenderer.invoke('chat:compact-thread', { threadId, turnsToPreserve }),
  getQueue: (agentId) => ipcRenderer.invoke('chat:get-queue', agentId),
  pauseQueue: (agentId) => ipcRenderer.invoke('chat:pause-queue', agentId),
  resumeQueue: (agentId) => ipcRenderer.invoke('chat:resume-queue', agentId),
  cancelQueuedMessage: (queueId) => ipcRenderer.invoke('chat:cancel-queued', queueId),
  submitTurnMessage: (payload) => ipcRenderer.invoke('chat:submit-turn', payload),
  getActiveTurnCount: () => ipcRenderer.invoke('chat:get-active-turn-count'),

  // Milestone 4 IPC
  getBackgroundProcesses: () => ipcRenderer.invoke('runtime:get-bg-processes'),
  startBackgroundProcess: (command, agentId, ports) =>
    ipcRenderer.invoke('runtime:start-bg-process', { command, agentId, ports }),
  stopBackgroundProcess: (id) => ipcRenderer.invoke('runtime:stop-bg-process', id),

  getMCPServers: () => ipcRenderer.invoke('runtime:get-mcp-servers'),
  addMCPServer: (server) => ipcRenderer.invoke('runtime:add-mcp-server', server),
  updateMCPServer: (id, updates) => ipcRenderer.invoke('runtime:update-mcp-server', { id, updates }),
  removeMCPServer: (id) => ipcRenderer.invoke('runtime:remove-mcp-server', id),
  testMCPServer: (id) => ipcRenderer.invoke('runtime:test-mcp-server', id),
  isMCPDirty: () => ipcRenderer.invoke('runtime:is-mcp-dirty'),
  markMCPSaved: () => ipcRenderer.invoke('runtime:mark-mcp-saved'),

  getSkills: () => ipcRenderer.invoke('runtime:get-skills'),
  createSkill: (skill) => ipcRenderer.invoke('runtime:create-skill', skill),
  getAgentSkills: (agentId) => ipcRenderer.invoke('runtime:get-agent-skills', agentId),
  attachSkillToAgent: (agentId, skillId) => ipcRenderer.invoke('runtime:attach-skill', { agentId, skillId }),
  detachSkillFromAgent: (agentId, skillId) => ipcRenderer.invoke('runtime:detach-skill', { agentId, skillId }),

  getRoutines: () => ipcRenderer.invoke('runtime:get-routines'),
  createRoutine: (routine) => ipcRenderer.invoke('runtime:create-routine', routine),
  triggerWebhook: (routeId, deliveryId) => ipcRenderer.invoke('runtime:trigger-webhook', { routeId, deliveryId }),
  getCalendarFeed: () => ipcRenderer.invoke('runtime:get-calendar-feed'),

  getWorkflows: () => ipcRenderer.invoke('runtime:get-workflows'),
  createWorkflow: (workflow) => ipcRenderer.invoke('runtime:create-workflow', workflow),
  runWorkflow: (workflowId) => ipcRenderer.invoke('runtime:run-workflow', workflowId),
  deleteWorkflow: (id) => ipcRenderer.invoke('runtime:delete-workflow', id),
  restoreWorkflow: (workflow) => ipcRenderer.invoke('runtime:restore-workflow', workflow),

  getMemories: (agentId) => ipcRenderer.invoke('runtime:get-memories', agentId),
  addMemory: (agentId, factText, isEssential) =>
    ipcRenderer.invoke('runtime:add-memory', { agentId, factText, isEssential }),
  deleteMemory: (memoryId) => ipcRenderer.invoke('runtime:delete-memory', memoryId),
  getMemoryUsage: (agentId) => ipcRenderer.invoke('runtime:get-memory-usage', agentId),

  toggleBrowserPiP: () => ipcRenderer.invoke('runtime:toggle-browser-pip'),
  getComputerUseStatus: () => ipcRenderer.invoke('runtime:get-computer-use-status'),
  setComputerUseEnabled: (enabled) => ipcRenderer.invoke('runtime:set-computer-use-enabled', enabled),

  getBackupModels: (agentId) => ipcRenderer.invoke('runtime:get-backup-models', agentId),
  setBackupModels: (agentId, models) => ipcRenderer.invoke('runtime:set-backup-models', { agentId, models }),
  pollUsage: () => ipcRenderer.invoke('runtime:poll-usage'),

  // Milestone 5 IPC
  getTeamServers: () => ipcRenderer.invoke('team:get-servers'),
  createTeamServer: (server) => ipcRenderer.invoke('team:create-server', server),
  joinTeamServer: (token, userEmail) => ipcRenderer.invoke('team:join-server', { token, userEmail }),
  setPublishState: (serverId, state) => ipcRenderer.invoke('team:set-publish-state', { serverId, state }),
  rotateServerKey: (serverId) => ipcRenderer.invoke('team:rotate-server-key', serverId),
  restartServer: (serverId) => ipcRenderer.invoke('team:restart-server', serverId),
  updateServerSettings: (serverId, updates) => ipcRenderer.invoke('team:update-server-settings', { serverId, updates }),
  deleteTeamServer: (serverId, confirmationName) => ipcRenderer.invoke('team:delete-server', { serverId, confirmationName }),

  getServerMembers: (serverId) => ipcRenderer.invoke('team:get-members', serverId),
  inviteServerMember: (serverId, email, name, role) => ipcRenderer.invoke('team:invite-member', { serverId, email, name, role }),
  removeServerMember: (serverId, memberId) => ipcRenderer.invoke('team:remove-member', { serverId, memberId }),
  getMemberAgentAccess: (memberId) => ipcRenderer.invoke('team:get-member-agent-access', memberId),
  setMemberAgentAccess: (memberId, agentId, accessLevel) => ipcRenderer.invoke('team:set-member-agent-access', { memberId, agentId, accessLevel }),

  getTeamChannels: (serverId) => ipcRenderer.invoke('team:get-channels', serverId),
  createTeamChannel: (channel) => ipcRenderer.invoke('team:create-channel', channel),
  deleteTeamChannel: (channelId) => ipcRenderer.invoke('team:delete-channel', channelId),
  restoreTeamChannel: (channelId) => ipcRenderer.invoke('team:restore-channel', channelId),
  assignChannelTask: (channelId, agentIds) => ipcRenderer.invoke('team:assign-channel-task', { channelId, agentIds }),

  getSharedTables: () => ipcRenderer.invoke('team:get-shared-tables'),
  createSharedTable: (name, creatorAgentId, columns) => ipcRenderer.invoke('team:create-shared-table', { name, creatorAgentId, columns }),
  alterSharedTable: (name, requestingAgentId, columns) => ipcRenderer.invoke('team:alter-shared-table', { name, requestingAgentId, columns }),
  dropSharedTable: (name, requestingAgentId, isUser) => ipcRenderer.invoke('team:drop-shared-table', { name, requestingAgentId, isUser }),
  insertSharedTableRow: (name, row) => ipcRenderer.invoke('team:insert-shared-table-row', { name, row }),
  readSharedTableRows: (name) => ipcRenderer.invoke('team:read-shared-table-rows', name),

  getAuditLogs: (serverId) => ipcRenderer.invoke('team:get-audit-logs', serverId),
  createRemoteDesktopTest: (serverId, targetName) => ipcRenderer.invoke('team:create-remote-desktop-test', { serverId, targetName }),
  verifyRemoteDesktopTest: (sessionId, code) => ipcRenderer.invoke('team:verify-remote-desktop-test', { sessionId, code }),
  stopAllRemoteControl: () => ipcRenderer.invoke('team:stop-all-remote-control'),

  // Milestone 6 IPC
  getConnectors: () => ipcRenderer.invoke('integrations:get-connectors'),
  connectConnector: (service, accountIdentifier, authPayload) => ipcRenderer.invoke('integrations:connect-connector', { service, accountIdentifier, authPayload }),
  disconnectConnector: (service) => ipcRenderer.invoke('integrations:disconnect-connector', service),
  getMessagingConnections: () => ipcRenderer.invoke('integrations:get-messaging-connections'),
  updateMessagingConnection: (id, updates) => ipcRenderer.invoke('integrations:update-messaging-connection', { id, updates }),
  connectWhatsAppBaileys: () => ipcRenderer.invoke('integrations:connect-whatsapp-baileys'),
  disconnectWhatsAppBaileys: () => ipcRenderer.invoke('integrations:disconnect-whatsapp-baileys'),
  getDictationModels: () => ipcRenderer.invoke('voice:get-dictation-models'),
  getTTSModels: () => ipcRenderer.invoke('voice:get-tts-models'),
  getVoiceSettings: () => ipcRenderer.invoke('voice:get-settings'),
  updateVoiceSettings: (updates) => ipcRenderer.invoke('voice:update-settings', updates),
  saveVoiceApiKey: (provider, apiKey) => ipcRenderer.invoke('voice:save-api-key', { provider, apiKey }),
  removeVoiceApiKey: (provider) => ipcRenderer.invoke('voice:remove-api-key', provider),
  checkLiveVoiceEligibility: (isCodexConnected) => ipcRenderer.invoke('voice:check-live-voice', isCodexConnected),
  configureVoiceServer: (params) => ipcRenderer.invoke('voice:configure-server', params),
  formatWebhookPayload: (format, eventType, data, secretKey) => ipcRenderer.invoke('webhooks:format-payload', { format, eventType, data, secretKey }),
  getHostedSites: () => ipcRenderer.invoke('sites:get-hosted-sites'),
  publishHostedSite: (params) => ipcRenderer.invoke('sites:publish', params),
  deleteHostedSite: (siteId) => ipcRenderer.invoke('sites:delete', siteId),
  getEnterpriseSSOConfigs: () => ipcRenderer.invoke('sso:get-configs'),
  configureEnterpriseSSO: (params) => ipcRenderer.invoke('sso:configure', params),

  // Milestone 7: Auth and Billing
  requestEmailCode: (email: string) => ipcRenderer.invoke('auth:request-email-code', email),
  verifyEmailCode: (email: string, code: string) => ipcRenderer.invoke('auth:verify-email-code', { email, code }),
  runDailyAuthMaintenance: () => ipcRenderer.invoke('auth:run-daily-maintenance'),
  getUserProfile: () => ipcRenderer.invoke('account:get-profile'),
  getAccountSessions: () => ipcRenderer.invoke('account:get-sessions'),
  disconnectSession: (sessionId: string) => ipcRenderer.invoke('account:disconnect-session', sessionId),
  getExtendedSSOConfig: () => ipcRenderer.invoke('sso:get-extended-config'),
  verifySSODNS: (domain: string) => ipcRenderer.invoke('sso:verify-dns', domain),
  generateSCIMToken: () => ipcRenderer.invoke('sso:generate-scim-token'),
  revokeSCIMToken: () => ipcRenderer.invoke('sso:revoke-scim-token'),
  testBrowserSSO: (provider: string) => ipcRenderer.invoke('sso:test-browser', provider),
  getMobileConnect: () => ipcRenderer.invoke('mobile:get-connect'),
  generateMobileOneTimeCode: () => ipcRenderer.invoke('mobile:generate-code'),
  replaceMobilePermanentLink: () => ipcRenderer.invoke('mobile:replace-link'),
  revokeMobilePermanentLink: () => ipcRenderer.invoke('mobile:revoke-link'),
  calculateLicencePrice: (params: any) => ipcRenderer.invoke('billing:calc-licence-price', params),
  getCommercialLicence: () => ipcRenderer.invoke('billing:get-licence'),
  recordLicenceAcceptance: (params: any) => ipcRenderer.invoke('billing:accept-licence', params),
  getHostedServerPlans: () => ipcRenderer.invoke('billing:get-hosted-plans'),
  getHostedServerSubscriptions: () => ipcRenderer.invoke('billing:get-hosted-subscriptions'),
  createHostedServerSubscription: (params: any) => ipcRenderer.invoke('billing:create-hosted-subscription', params),
  cancelHostedServerSubscription: (subId: string) => ipcRenderer.invoke('billing:cancel-hosted-subscription', subId),
  openStripeCustomerPortal: (subId?: string) => ipcRenderer.invoke('billing:open-portal', subId),
  openStripeCheckout: (planType: string, planId: string) => ipcRenderer.invoke('billing:open-checkout', { planType, planId }),
  checkOfflineGrace: () => ipcRenderer.invoke('billing:check-offline-grace'),
  simulateServerValidation: (outcome: string, elapsedHours?: number) => ipcRenderer.invoke('billing:simulate-server-validation', { outcome, elapsedHours }),
};

contextBridge.exposeInMainWorld('openbot', bridge);
