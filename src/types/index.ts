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
  externalLinks: 'default' | 'openbot' | 'other' | 'command';
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

export interface ChatMessage {
  id: string;
  agentId: string;
  author: 'user' | 'agent';
  body: string;
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
