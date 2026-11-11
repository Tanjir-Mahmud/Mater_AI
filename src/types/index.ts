export type AppTheme = 'dark' | 'light' | 'system';

export type SendShortcut = 'enter' | 'cmd-enter';

export type HoldCmdQMode = 'while-working' | 'always' | 'never';

export type LogoColor =
  | 'lavender'
  | 'green'
  | 'gold'
  | 'terracotta'
  | 'blue'
  | 'rose'
  | 'pink'
  | 'beige'
  | 'gray'
  | 'white';

export interface AppSettings {
  language: string;
  theme: AppTheme;
  transparentWindow: boolean;
  interfaceSize: 'compact' | 'standard' | 'comfortable';
  logoColor: LogoColor;
  chatColor: string | null;
  chatBackground: 'default' | string;
  sendShortcut: SendShortcut;
  showAgentSteps: boolean;
  compactMessageActions: boolean;
  externalLinks: 'default' | 'bissbot' | 'other' | 'command';
  externalLinksCommand?: string;
  launchAtLogin: boolean;
  fastConnectionToServers: boolean;
  keepRunningInBackground: boolean;
  showMenuBarIcon: boolean;
  keepComputerAwake: boolean;
  keepAwakeOnBattery: boolean;
  restoreLastWorkspace: boolean;
  holdCmdQ: HoldCmdQMode;
  analyticsConsent: 'on' | 'off';
  hasCompletedOnboarding: boolean;
}

export type PageId =
  | 'agents'
  | 'schedule'
  | 'tasks'
  | 'workflows'
  | 'usage'
  | 'library'
  | 'marketplace'
  | 'settings'
  | 'help'
  | 'website';

export type ServerPublishState = 'reachable' | 'not-reachable';

export interface ServerInfo {
  id: string;
  name: string;
  logo?: string;
  isLocal: boolean;
  publishState: ServerPublishState;
  status: 'online' | 'connecting' | 'loading' | 'offline' | 'updating' | 'error';
  statusDetails?: {
    step: 'install_update' | 'start_server' | 'connect' | 'load_workspace';
    stepName: string;
    elapsedSeconds: number;
  };
  storage: {
    totalBytes: number;
    usedBytes: number;
    freeBytes: number;
    percentUsed: number;
  };
  machineMetrics?: {
    cpuPercent: number;
    memoryPercent: number;
    diskPercent: number;
    alertRecipient?: string;
  };
  timezone: string;
}

export type AgentStatus =
  | 'idle'
  | 'thinking'
  | 'responded'
  | 'waiting_input'
  | 'waiting_approval'
  | 'waiting_browser'
  | 'routine_running'
  | 'routine_waiting'
  | 'routine_failed'
  | 'waits_for_limit'
  | 'error';

export interface AgentSections {
  systemDirective: string;
  executionBoundaries: string;
  memoryPolicy: string;
  fallbackStrategies: string;
}

export interface MessageAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  storagePath?: string;
  sha256?: string;
  base64Data?: string;
}

export interface Thread {
  id: string;
  agentId: string;
  title: string;
  kind: 'main' | 'side' | 'branch';
  parentThreadId?: string;
  sourceMessageId?: string;
  state: 'active' | 'closed';
  createdAt: string;
  lastActivity: string;
}

export type TurnStatus =
  | 'queued'
  | 'running'
  | 'waiting-input'
  | 'waiting-approval'
  | 'waiting-browser'
  | 'done'
  | 'failed'
  | 'cancelled';

export interface Turn {
  id: string;
  threadId: string;
  agentId: string;
  sequence: number;
  status: TurnStatus;
  startedAt: string;
  finishedAt?: string;
  error?: string;
}

export interface QueueEntry {
  id: string;
  agentId: string;
  threadId: string;
  turnId?: string;
  messageText: string;
  attachments?: MessageAttachment[];
  position: number;
  state: 'queued' | 'paused' | 'running' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  agentId: string;
  threadId?: string;
  turnId?: string;
  author: 'user' | 'agent' | 'channel_member';
  kind?: 'text' | 'question' | 'approval' | 'tool-step' | 'memory-change' | 'file' | 'compaction-summary';
  body: string;
  attachments?: MessageAttachment[];
  reactions?: string[];
  replyToId?: string;
  createdAt: string;
  reasoning?: string;
  toolStep?: {
    name: string;
    output: string;
  };
  approval?: {
    command: string;
    status: 'pending' | 'approved' | 'declined';
  };
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  avatar: string;
  avatarColor?: string;
  status: AgentStatus;
  statusMessage?: string;
  unreadCount: number;
  limitResetTime?: string;
  hasLimitChip?: boolean;
  approvalCommand?: string;
  folderId?: string;
  isPinned?: boolean;
  isHidden?: boolean;
  section: 'pinned' | 'needs_you' | 'folder' | 'unassigned' | 'hidden';
  model: string;
  provider: string;
  reasoningLevel: 'low' | 'medium' | 'high';
  notificationLevel: 'all' | 'needs_me' | 'nothing';
  browserProfile: 'shared' | 'only_this_agent';
  workspacePath: string;
  sections?: AgentSections;
  createdAt: string;
  updatedAt: string;
}

export interface Channel {
  id: string;
  name: string;
  memberAgentIds: string[];
  taskOwnerId?: string;
  status: 'active' | 'stopped' | 'archived';
  unreadCount: number;
  lastPreview?: string;
  isWorking?: boolean;
}

export interface Person {
  id: string;
  name: string;
  email: string;
  status: 'online' | 'offline';
  unreadCount: number;
  avatar?: string;
}

export interface Folder {
  id: string;
  name: string;
  parentFolderId?: string;
  order: number;
}

export type SidePanelTabId =
  | 'agent_settings'
  | 'files'
  | 'file_preview'
  | 'side_thread'
  | 'voice_conversation'
  | 'question'
  | 'subagent';

export interface SidePanelTab {
  id: string;
  type: SidePanelTabId;
  title: string;
  icon: string;
  data?: any;
}

export interface OnboardingState {
  currentStep: 'language' | 'choose' | 'plan' | 'computer' | 'setup_location' | 'complete';
  selectedOption: 'free' | 'plan' | null;
  selectedProvider: string | null;
  selectedLocation: 'local' | 'remote' | null;
  analyticsConsent: boolean;
  providerDownloading: boolean;
  providerConnected: boolean;
  downloadProgress?: number;
  error?: string | null;
}

// Milestone 4 Types
export interface BackgroundProcess {
  id: string;
  command: string;
  pid: number;
  started_at: string;
  ports: string;
  agent_id?: string;
  state: 'running' | 'stopped';
}

export interface MCPServer {
  id: string;
  name: string;
  type: 'stdio' | 'sse' | 'http';
  command?: string;
  args?: string;
  url?: string;
  headers?: string;
  enabled: number;
  status: 'connected' | 'error' | 'connecting';
  created_at: string;
}

export interface Skill {
  id: string;
  name: string;
  instructions: string;
  description?: string;
  icon?: string;
  enabled: number;
}

export interface Routine {
  id: string;
  agent_id?: string;
  channel_id?: string;
  instruction: string;
  trigger_type: 'schedule' | 'webhook';
  trigger_value: string;
  filters: string;
  webhook_route_id?: string;
  on_closed_action: 'skip' | 'run_once_on_open';
  is_quiet: number;
  state: 'active' | 'paused';
  last_run?: string;
  next_run?: string;
  created_at: string;
}

export interface Workflow {
  id: string;
  title: string;
  description?: string;
  graph_json: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowRun {
  id: string;
  workflow_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'waiting_approval';
  started_at: string;
  finished_at?: string;
  result?: string;
}

export interface WorkflowStep {
  id: string;
  run_id: string;
  node_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'waiting_approval';
  attempt: number;
  error?: string;
}

export interface BackupModel {
  agent_id: string;
  model_name: string;
  provider_id: string;
  priority: number;
}

export interface MemoryUsage {
  totalBytes: number;
  essentialBytes: number;
  budgetBytes: number;
}

export interface MetaMemory {
  id: string;
  agent_id: string;
  fact_text: string;
  is_essential: number;
  byte_size: number;
  created_at: string;
}

// Milestone 5: Teams and Collaboration Types
export type ServerRole = 'owner' | 'admin' | 'member';
export type AgentAccessLevel = 'none' | 'view' | 'chat' | 'manage';

export interface ServerMember {
  id: string;
  serverId: string;
  name: string;
  email: string;
  serverRole: ServerRole;
  status: 'online' | 'offline' | 'invited';
  createdAt: string;
}

export interface MemberAgentAccess {
  memberId: string;
  agentId: string;
  accessLevel: AgentAccessLevel;
}

export interface ChannelAssignment {
  id: string;
  channelId: string;
  agentId: string;
  status: 'active' | 'completed' | 'cancelled';
  assignedAt: string;
}

export interface SharedTable {
  id: string;
  name: string;
  creatorAgentId: string;
  columns: string[];
  rows: any[];
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  serverId: string;
  action: string;
  actor: string;
  details: string;
  timestamp: string;
}

export interface RemoteDesktopSession {
  sessionId: string;
  serverId: string;
  targetName: string;
  fourDigitCode: string;
  status: 'active' | 'expired' | 'connected';
  expiresAt: string;
  expiresInSeconds: number;
}

// Milestone 6: Integrations and Voice Types
export interface Connector {
  id: string;
  service: string;
  name: string;
  status: 'connected' | 'not-connected' | 'connecting' | 'error';
  accountIdentifier?: string;
  authPayload?: string;
  config?: string;
}

export interface MessagingConnection {
  id: string;
  platform: 'slack' | 'discord' | 'telegram' | 'whatsapp';
  workspaceName: string;
  answeringAgentId: string;
  status: 'connected' | 'not-connected' | 'connecting' | 'error';
  signalRelayConnected: boolean;
  isUnofficial: boolean;
  details?: string;
}

export interface VoiceSettingsState {
  dictationEngine: string;
  dictationModel: string;
  dictationLanguage: string;
  ttsVoice: string;
  ttsModel: string;
  ttsGender: 'female' | 'male';
  ttsLanguage: string;
  ttsAutoRead: boolean;
  apiKeys: Record<string, string>;
  voiceServerAddress?: string;
  voiceServerApiKey?: string;
  voiceServerStatus: 'Not set up' | 'Not in use' | 'Set up';
  voiceServerUseForDictation: boolean;
  voiceServerUseForTTS: boolean;
  voiceServerDictationModel?: string;
  voiceServerTTSModel?: string;
  voiceServerVoice?: string;
}

export interface HostedSite {
  id: string;
  subdomain: string;
  domain: string;
  siteTitle: string;
  authorAgentId?: string;
  sourceFiles: Record<string, string>;
  status: 'published' | 'expired' | 'deleted';
  publishedAt: string;
  expiresAt: string;
  deletedAt?: string;
}

export interface EnterpriseSSOConfig {
  id: string;
  provider: 'entra' | 'okta' | 'google_workspace';
  clientId?: string;
  issuerUrl?: string;
  scimEnabled: boolean;
  scimStatus: string;
  createdAt: string;
}

// Milestone 7: Auth and Billing Types
export interface AccountSession {
  id: string;
  userId: string;
  kind: 'Desktop' | 'Mobile' | 'Hosted server';
  deviceName: string;
  ipAddress?: string;
  isThisDevice: boolean;
  signedInAt: string;
  lastActiveAt: string;
  status: 'active' | 'revoked';
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  birthDate: string;
  hasLegalCapacity: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExtendedSSOConfig {
  id: string;
  provider: 'entra' | 'okta' | 'google_workspace';
  issuerUrl: string;
  clientId: string;
  emailDomains: string[];
  dnsTxtRecord: string;
  dnsVerified: boolean;
  scimStatus: string;
  isActive: boolean;
  isDesktopOnly: boolean;
}

export interface MobileConnectState {
  id: string;
  permanentLink?: string;
  warning: string;
  status: string;
  activeCode?: string;
  qrPayload?: string;
}

export interface CommercialLicence {
  id: string;
  userId: string;
  planTier: 'Starter' | 'Team';
  seats: number;
  billingCycle: 'monthly' | 'yearly';
  currency: 'EUR' | 'USD' | 'PLN';
  hasHostedServerBundle: boolean;
  amountPerCycle: number;
  stripeSubscriptionId: string;
  status: 'active' | 'cancelled' | 'past_due';
  companyName: string;
  taxId: string;
  buyerAuthorized: boolean;
  acceptedAt: string;
  termsVersion: string;
  orderRef: string;
  licensor: string;
  maxDevicesPerUser: number;
}

export interface HostedServerSubscription {
  id: string;
  serverId: string;
  serverName: string;
  planTier: 'Starter' | 'Standard' | 'Pro' | 'self-hosted';
  storageGB: number;
  membersLimit: number;
  sitesLimit: number;
  speedMultiplier: number;
  billingCycle: 'monthly' | 'yearly';
  currency: 'EUR' | 'USD' | 'PLN';
  monthlyPrice: number;
  stripeSubscriptionId: string;
  stripeStatus: 'active' | 'cancelled' | 'past_due';
  serverRemoved: boolean;
  currentPeriodEnd: string;
}

export interface OfflineGraceState {
  status: 'valid' | 'grace_period' | 'blocked';
  hoursRemaining: number;
  isBlocked: boolean;
  lastValidatedAt: string;
  message: string;
}

export interface LicencePriceCalculation {
  tier: 'Starter' | 'Team';
  seats: number;
  cycle: 'monthly' | 'yearly';
  currency: 'EUR' | 'USD' | 'PLN';
  baseMonthlyAmount: number;
  yearlyDiscountAmount: number;
  bundleDiscountAmount: number;
  finalCycleAmount: number;
  effectiveMonthlyEquivalent: number;
  devicesAllowed: number;
}

// Milestone 8: Mobile App & Web Client Types
export interface MobileDeviceState {
  id: string;
  deviceName: string;
  platform: 'ios' | 'android';
  failedPinAttempts: number;
  isLocked: boolean;
  cachedAgentsCount: number;
  lastSyncAt: string;
}

export interface LiveActivityTelemetry {
  supported: boolean;
  activityId?: string;
  priority?: number;
  delaySeconds?: number;
  isActive: boolean;
  message: string;
}

export interface WebSessionLockState {
  acquired: boolean;
  lockedTabId?: string;
  message: string;
}

export interface InlineMediaInspection {
  renderMode: 'thumbnail' | 'player_button' | 'download_only';
  objectUrlPermitted: boolean;
  canAutoDownload: boolean;
}

export interface DeepLinkPayload {
  linkType: 'agent' | 'invitation' | 'plugin' | 'billing_return' | 'none';
  data: any;
  cleanedUrl: string;
  requiresUserConfirmation: boolean;
}

// Milestone 9: Marketplace, Data & Release Types
export interface MarketplaceExtension {
  id: string;
  type: 'skill' | 'agent' | 'plugin' | 'bundle';
  name: string;
  slug: string;
  description: string;
  author: string;
  license?: string;
  installsCount: number;
  version: string;
  price: null;
  isBundle?: boolean;
  bundleItemsCount?: number;
  metadata?: Record<string, any>;
}

export interface StorageTelemetryState {
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  utilizationPct: number;
  alertLevel: 'normal' | 'warning' | 'critical';
  triggerSource: 'start' | 'interval_5m' | 'settings_close';
  recordedAt: string;
}

export interface DiagnosticsExportResult {
  filePath?: string;
  sanitized: boolean;
  chatContentIncluded: false;
  exportedAt: string;
}

// Post-Milestone Provider Flow Types
export type ProviderStatusKind = 'not-installed' | 'installed-not-signed-in' | 'connected';

export interface ProviderLiveStatus {
  id: string;
  name: string;
  status: ProviderStatusKind;
  binaryName: string;
  binaryPath: string | null;
  isBinaryInstalled: boolean;
  isAuthenticated: boolean;
  installCommand: string;
  loginCommand: string;
  loginUrl?: string;
  description: string;
  models: { id: string; name: string; free: boolean }[];
  errorMessage?: string;
  nextStep?: string;
}





