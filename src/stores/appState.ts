import { createStore } from 'solid-js/store';
import { createSignal } from 'solid-js';
import {
  AppSettings,
  ServerInfo,
  Agent,
  Channel,
  Person,
  Folder,
  PageId,
  SidePanelTab,
  OnboardingState,
} from '../types';
import { i18n } from '../shared/i18n';

// Initial default settings
export const defaultSettings: AppSettings = {
  language: 'en',
  theme: 'dark',
  transparentWindow: false,
  interfaceSize: 'standard',
  logoColor: 'lavender',
  chatColor: null,
  chatBackground: 'default',
  sendShortcut: 'enter',
  showAgentSteps: true,
  compactMessageActions: false,
  externalLinks: 'default',
  launchAtLogin: false,
  fastConnectionToServers: true,
  keepRunningInBackground: true,
  showMenuBarIcon: true,
  keepComputerAwake: true,
  keepAwakeOnBattery: false,
  restoreLastWorkspace: true,
  holdCmdQ: 'while-working',
  analyticsConsent: 'off',
  hasCompletedOnboarding: false,
};

// Seed servers
const initialServers: ServerInfo[] = [
  {
    id: 'server-local',
    name: 'This computer',
    isLocal: true,
    publishState: 'reachable',
    status: 'online',
    storage: {
      totalBytes: 512 * 1024 * 1024 * 1024,
      usedBytes: 420 * 1024 * 1024 * 1024,
      freeBytes: 92 * 1024 * 1024 * 1024,
      percentUsed: 82,
    },
    machineMetrics: {
      cpuPercent: 34,
      memoryPercent: 68,
      diskPercent: 82,
      alertRecipient: 'owner',
    },
    timezone: 'UTC+0',
  },
  {
    id: 'server-cloud-us',
    name: 'Prod Cluster US-East',
    isLocal: false,
    publishState: 'reachable',
    status: 'online',
    storage: {
      totalBytes: 100 * 1024 * 1024 * 1024,
      usedBytes: 96 * 1024 * 1024 * 1024,
      freeBytes: 4 * 1024 * 1024 * 1024,
      percentUsed: 96, // Under 5GB free -> Storage almost full alert
    },
    machineMetrics: {
      cpuPercent: 91, // Machine metric alert
      memoryPercent: 74,
      diskPercent: 96,
    },
    timezone: 'America/New_York',
  },
];

// Seed agents matching design
const initialAgents: Agent[] = [
  {
    id: 'agent-kestrel',
    name: 'Kestrel',
    role: 'Senior Architect',
    avatar: 'K',
    avatarColor: 'bg-primary-container text-on-primary-container',
    status: 'idle',
    unreadCount: 2,
    section: 'pinned',
    isPinned: true,
    model: 'claude-3-5-sonnet',
    provider: 'claude',
    reasoningLevel: 'high',
    notificationLevel: 'all',
    browserProfile: 'shared',
    workspacePath: 'Agents/agent-kestrel',
    createdAt: '2026-11-01T10:00:00Z',
    updatedAt: '2026-11-09T12:30:00Z',
  },
  {
    id: 'agent-cipher',
    name: 'Cipher',
    role: 'Security Auditor',
    avatar: 'security',
    status: 'routine_waiting',
    unreadCount: 0,
    section: 'pinned',
    isPinned: true,
    statusMessage: 'Wait',
    model: 'codex-o3-mini',
    provider: 'codex',
    reasoningLevel: 'high',
    notificationLevel: 'needs_me',
    browserProfile: 'shared',
    workspacePath: 'Agents/agent-cipher',
    createdAt: '2026-11-02T11:00:00Z',
    updatedAt: '2026-11-09T11:20:00Z',
  },
  {
    id: 'agent-vanguard',
    name: 'Vanguard',
    role: 'DevOps & SRE',
    avatar: 'deployed_code',
    status: 'waiting_approval',
    statusMessage: 'APPROVAL',
    approvalCommand: 'terraform apply -auto-approve prod-us-east',
    unreadCount: 1,
    section: 'needs_you',
    model: 'claude-3-5-sonnet',
    provider: 'claude',
    reasoningLevel: 'medium',
    notificationLevel: 'all',
    browserProfile: 'shared',
    workspacePath: 'Agents/agent-vanguard',
    createdAt: '2026-11-03T09:00:00Z',
    updatedAt: '2026-11-09T13:00:00Z',
  },
  {
    id: 'agent-pulse',
    name: 'Pulse',
    role: 'API SRE',
    avatar: 'query_stats',
    status: 'waiting_input',
    statusMessage: 'Waiting for answer',
    unreadCount: 1,
    section: 'needs_you',
    model: 'opencode-free',
    provider: 'opencode',
    reasoningLevel: 'low',
    notificationLevel: 'needs_me',
    browserProfile: 'only_this_agent',
    workspacePath: 'Agents/agent-pulse',
    createdAt: '2026-11-04T14:00:00Z',
    updatedAt: '2026-11-09T13:10:00Z',
  },
  {
    id: 'agent-docubot',
    name: 'DocuBot',
    role: 'Technical Writer',
    avatar: 'description',
    status: 'idle',
    unreadCount: 0,
    section: 'unassigned',
    model: 'opencode-free',
    provider: 'opencode',
    reasoningLevel: 'low',
    notificationLevel: 'nothing',
    browserProfile: 'shared',
    workspacePath: 'Agents/agent-docubot',
    createdAt: '2026-11-05T08:00:00Z',
    updatedAt: '2026-11-08T17:00:00Z',
  },
  {
    id: 'agent-triage',
    name: 'Triage-04',
    role: 'Issue Classifier',
    avatar: 'inbox',
    status: 'waits_for_limit',
    statusMessage: 'Waits for limit',
    hasLimitChip: true,
    limitResetTime: '14:00 UTC',
    unreadCount: 0,
    section: 'unassigned',
    model: 'gemini-1-5-pro',
    provider: 'gemini',
    reasoningLevel: 'medium',
    notificationLevel: 'all',
    browserProfile: 'only_this_agent',
    workspacePath: 'Agents/agent-triage',
    createdAt: '2026-11-06T12:00:00Z',
    updatedAt: '2026-11-09T09:00:00Z',
  },
];

const initialChannels: Channel[] = [
  {
    id: 'channel-dev',
    name: 'Dev Team Channel',
    memberAgentIds: ['agent-kestrel', 'agent-cipher', 'agent-vanguard'],
    taskOwnerId: 'agent-kestrel',
    status: 'active',
    unreadCount: 3,
    lastPreview: 'Branch verification and test run completed successfully.',
    isWorking: true,
  },
];

const initialPeople: Person[] = [
  {
    id: 'person-sarah',
    name: 'Sarah Chen',
    email: 'sarah@synthetify.io',
    status: 'online',
    unreadCount: 1,
  },
  {
    id: 'person-marcus',
    name: 'Marcus Brody',
    email: 'marcus@synthetify.io',
    status: 'offline',
    unreadCount: 0,
  },
];

const initialFolders: Folder[] = [
  {
    id: 'folder-infra',
    name: 'Infrastructure & Cloud',
    order: 0,
  },
  {
    id: 'folder-research',
    name: 'Research & Modeling',
    order: 1,
  },
];

export const [state, setState] = createStore({
  settings: defaultSettings,
  activePage: 'agents' as PageId,
  pinnedPages: ['agents', 'schedule', 'tasks', 'workflows', 'usage'] as PageId[],
  selectedServerId: 'server-local',
  servers: initialServers,
  selectedAgentId: 'agent-kestrel',
  selectedChannelId: null as string | null,
  selectedPersonId: null as string | null,
  agents: initialAgents,
  channels: initialChannels,
  people: initialPeople,
  folders: initialFolders,
  sidebarView: 'agents' as 'agents' | 'routines',
  sidebarWidth: 260,
  sidebarSearchQuery: '',
  isSidebarCollapsed: false,
  storageCardDismissed: false,
  machineCardDismissed: false,
  communityCardDismissed: false,
  mobileAppCardDismissed: false,
  sidePanelOpen: true,
  sidePanelMaximized: false,
  activeSidePanelTab: 'terminal' as string,
  sidePanelTabs: [
    { id: 'tab-term', type: 'terminal', title: 'Terminal & Logs', icon: 'terminal' },
    { id: 'tab-browser', type: 'browser', title: 'Embedded Browser', icon: 'language' },
    { id: 'tab-files', type: 'files', title: 'Session Files', icon: 'folder_open' },
    { id: 'tab-subagent', type: 'subagent', title: 'Subagents', icon: 'account_tree' },
    { id: 'tab-inspect', type: 'inspect', title: 'Inspector', icon: 'tune' },
  ] as SidePanelTab[],
  isGlobalSearchOpen: false,
  isSettingsOpen: false,
  activeSettingsTab: 'general',
  isQuitDialogOpen: false,
  isLoading: true,
  loadingProgress: 0,
  toasts: [] as { id: string; type: 'success' | 'warning' | 'error'; title: string; message?: string }[],
  onboarding: {
    currentStep: 'language',
    selectedOption: null,
    selectedProvider: null,
    selectedLocation: null,
    analyticsConsent: false,
    providerDownloading: false,
    providerConnected: false,
  } as OnboardingState,
});

export function selectPage(page: PageId) {
  if (page === 'settings') {
    setState('isSettingsOpen', true);
    return;
  }
  if (page === 'website') {
    if (typeof window !== 'undefined') {
      window.open('https://openbot.run', '_blank');
    }
    return;
  }
  setState('activePage', page);
}

export function selectAgent(agentId: string) {
  setState('selectedAgentId', agentId);
  setState('selectedChannelId', null);
  setState('selectedPersonId', null);
  setState('activePage', 'agents');
}

export function selectChannel(channelId: string) {
  setState('selectedChannelId', channelId);
  setState('selectedAgentId', '');
  setState('selectedPersonId', null);
  setState('activePage', 'agents');
}

export function selectPerson(personId: string) {
  setState('selectedPersonId', personId);
  setState('selectedAgentId', '');
  setState('selectedChannelId', null);
  setState('activePage', 'agents');
}

export function toggleTheme(theme?: 'dark' | 'light' | 'system') {
  const nextTheme = theme || (state.settings.theme === 'dark' ? 'light' : 'dark');
  setState('settings', 'theme', nextTheme);

  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    if (nextTheme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
  }

  if ((window as any).openbot?.saveSettings) {
    (window as any).openbot.saveSettings(state.settings);
  }
}

export function addToast(type: 'success' | 'warning' | 'error', title: string, message?: string) {
  const id = `toast-${Date.now()}-${Math.random()}`;
  setState('toasts', (prev) => [...prev, { id, type, title, message }]);
  setTimeout(() => {
    setState('toasts', (prev) => prev.filter((t) => t.id !== id));
  }, 4000);
}

export function markAllAsRead() {
  setState('agents', (a) => true, 'unreadCount', 0);
  setState('channels', (c) => true, 'unreadCount', 0);
  setState('people', (p) => true, 'unreadCount', 0);
  addToast('success', 'Marked all as read');
}

export function closeSidePanelTab(tabId: string) {
  const remainingTabs = state.sidePanelTabs.filter((t) => t.id !== tabId);
  setState('sidePanelTabs', remainingTabs);
  if (state.activeSidePanelTab === tabId && remainingTabs.length > 0) {
    setState('activeSidePanelTab', remainingTabs[0].id);
  }
}
