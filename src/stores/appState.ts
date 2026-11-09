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
  ChatMessage,
  AgentSections,
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
    model: 'Claude 3.5 Sonnet',
    provider: 'claude',
    reasoningLevel: 'high',
    notificationLevel: 'all',
    browserProfile: 'shared',
    workspacePath: 'Agents/agent-kestrel',
    sections: {
      systemDirective: 'Architect scalable distributed systems and oversee cross-agent technical integrity.',
      executionBoundaries: 'Confined to agent-kestrel workspace; read-only access to team repositories.',
      memoryPolicy: 'Persist architectural decisions and API contracts. Review every 20 turns.',
      fallbackStrategies: 'On network partition, cache messages locally and retry with exponential backoff.',
    },
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
    model: 'Codex o3-mini',
    provider: 'codex',
    reasoningLevel: 'high',
    notificationLevel: 'needs_me',
    browserProfile: 'shared',
    workspacePath: 'Agents/agent-cipher',
    sections: {
      systemDirective: 'Audit codebase for OWASP vulnerabilities, token leaks, and improper input sanitation.',
      executionBoundaries: 'Static analysis only; destructive penetration testing requires explicit human authorization.',
      memoryPolicy: 'Maintain CVE lookup cache; flag recurring anti-patterns.',
      fallbackStrategies: 'Report unverified findings with severity low; alert on zero-day patterns.',
    },
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
    model: 'Claude 3.5 Sonnet',
    provider: 'claude',
    reasoningLevel: 'medium',
    notificationLevel: 'all',
    browserProfile: 'shared',
    workspacePath: 'Agents/agent-vanguard',
    sections: {
      systemDirective: 'Manage Kubernetes infrastructure, dry-run Terraform plans, and coordinate production deployments.',
      executionBoundaries: 'Cannot execute destructive cloud operations without human interactive confirmation.',
      memoryPolicy: 'Retain infrastructure cluster topology; review memory after 20 turns.',
      fallbackStrategies: 'Automatic rollback on failed health check probes; notify owner immediately.',
    },
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
    model: 'OpenCode Free',
    provider: 'opencode',
    reasoningLevel: 'low',
    notificationLevel: 'needs_me',
    browserProfile: 'only_this_agent',
    workspacePath: 'Agents/agent-pulse',
    sections: {
      systemDirective: 'Track p99 API latencies and inspect OTel trace spans for regressions.',
      executionBoundaries: 'Read-only queries to Jaeger and Prometheus metrics endpoints.',
      memoryPolicy: 'Store baseline response times per service endpoint.',
      fallbackStrategies: 'If Prometheus is unreachable, query secondary cluster proxy.',
    },
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
    model: 'OpenCode Free',
    provider: 'opencode',
    reasoningLevel: 'low',
    notificationLevel: 'nothing',
    browserProfile: 'shared',
    workspacePath: 'Agents/agent-docubot',
    sections: {
      systemDirective: 'Generate API references, changelogs, and maintain markdown documentation.',
      executionBoundaries: 'Confined to docs/ folder and workspace files.',
      memoryPolicy: 'Retain style guide rules and terminologies.',
      fallbackStrategies: 'Flag ambiguous technical definitions for user clarification.',
    },
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
    model: 'Gemini 1.5 Pro',
    provider: 'gemini',
    reasoningLevel: 'medium',
    notificationLevel: 'all',
    browserProfile: 'only_this_agent',
    workspacePath: 'Agents/agent-triage',
    sections: {
      systemDirective: 'Classify incoming user bug reports and assign appropriate severity tags.',
      executionBoundaries: 'Issue tracker read and label operations only.',
      memoryPolicy: 'Cache active bug categories and component owners.',
      fallbackStrategies: 'On quota limit, wait until reset time before processing queued reports.',
    },
    createdAt: '2026-11-06T12:00:00Z',
    updatedAt: '2026-11-09T09:00:00Z',
  },
];

const initialAgentMessages: Record<string, ChatMessage[]> = {
  'agent-vanguard': [
    {
      id: 'vanguard-1',
      agentId: 'agent-vanguard',
      author: 'user',
      body: 'Please verify our AWS production infrastructure state, run the dry-run terraform plan, and prepare the security review summary.',
      createdAt: '12:28 PM',
    },
    {
      id: 'vanguard-2',
      agentId: 'agent-vanguard',
      author: 'agent',
      body: 'The infrastructure changes have been validated against our security baseline. The plan modifies our ingress security group to allow TLS 1.3 traffic and spins up 2 supplementary container nodes.',
      createdAt: '12:29 PM',
      reasoning: '1. Querying AWS credential status from local keychain...\n Profile `prod-us-east` authenticated\n2. Reading Terraform configurations in `infra/prod/`\n3. Generating plan execution graph for cluster...',
      toolStep: {
        name: 'Tool Execution: CLI Command',
        output: '$ terraform plan -detailed-exitcode\nPlan: 2 to add, 1 to change, 0 to destroy.\nOutputs: cluster_endpoint = "k8s-prod.us-east.openbot.run"',
      },
      approval: {
        command: 'terraform apply -auto-approve prod-us-east',
        status: 'pending',
      },
    },
  ],
  'agent-kestrel': [
    {
      id: 'kestrel-1',
      agentId: 'agent-kestrel',
      author: 'user',
      body: 'Kestrel, can you review our microservice communication topology?',
      createdAt: '10:15 AM',
    },
    {
      id: 'kestrel-2',
      agentId: 'agent-kestrel',
      author: 'agent',
      body: 'I reviewed the topology. The gRPC latency is optimal, and all services are correctly discovering via local DNS.',
      createdAt: '10:16 AM',
      reasoning: '1. Reading network graph\n2. Verifying latency SLA\n3. Completed analysis.',
    },
  ],
};

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
  activeSidePanelTab: 'tab-settings' as string,
  sidePanelTabs: [
    { id: 'tab-settings', type: 'agent_settings', title: 'Agent settings', icon: 'settings' },
    { id: 'tab-files', type: 'files', title: 'Files', icon: 'folder_open' },
    { id: 'tab-preview', type: 'file_preview', title: 'File preview', icon: 'visibility' },
    { id: 'tab-side-thread', type: 'side_thread', title: 'Side thread', icon: 'alt_route' },
    { id: 'tab-voice', type: 'voice_conversation', title: 'Voice conversation', icon: 'mic' },
    { id: 'tab-question', type: 'question', title: 'Question', icon: 'help_outline' },
    { id: 'tab-subagent', type: 'subagent', title: 'Subagents', icon: 'account_tree' },
  ] as SidePanelTab[],
  isGlobalSearchOpen: false,
  isSettingsOpen: false,
  isAgentSetupModalOpen: false,
  agentSetupModalMode: 'create' as 'create' | 'edit',
  editingAgentId: null as string | null,
  agentMessages: initialAgentMessages as Record<string, ChatMessage[]>,
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

// Milestone 2 Agent & Provider Actions
export function openCreateAgentModal() {
  setState('agentSetupModalMode', 'create');
  setState('editingAgentId', null);
  setState('isAgentSetupModalOpen', true);
}

export function openEditAgentModal(agentId: string) {
  setState('agentSetupModalMode', 'edit');
  setState('editingAgentId', agentId);
  setState('isAgentSetupModalOpen', true);
}

export function closeAgentSetupModal() {
  setState('isAgentSetupModalOpen', false);
}

export async function saveAgentFromSetup(agentData: Partial<Agent>): Promise<Agent> {
  const isEdit = state.agentSetupModalMode === 'edit' && state.editingAgentId;
  if (isEdit) {
    const existing = state.agents.find((a) => a.id === state.editingAgentId);
    if (!existing) throw new Error('Agent not found');
    const updated: Agent = {
      ...existing,
      ...agentData,
      updatedAt: new Date().toISOString(),
    };
    setState('agents', (a) => a.id === existing.id, updated);
    addToast('success', `Agent "${updated.name}" updated`);
    closeAgentSetupModal();
    return updated;
  } else {
    const id = `agent-${Date.now()}`;
    const newAgent: Agent = {
      id,
      name: agentData.name || 'Sentinel',
      role: agentData.role || 'Autonomous Teammate',
      avatar: agentData.avatar || 'smart_toy',
      avatarColor: agentData.avatarColor || 'bg-primary-container text-on-primary-container',
      status: 'idle',
      unreadCount: 0,
      section: 'unassigned',
      model: agentData.model || 'OpenCode Free',
      provider: agentData.provider || 'opencode',
      reasoningLevel: agentData.reasoningLevel || 'high',
      notificationLevel: agentData.notificationLevel || 'all',
      browserProfile: agentData.browserProfile || 'shared',
      workspacePath: `Agents/${id}`,
      sections: agentData.sections || {
        systemDirective: 'Operate autonomously as an AI teammate.',
        executionBoundaries: 'Confined to agent workspace directory.',
        memoryPolicy: 'Persist essential invariants; review every 20 turns.',
        fallbackStrategies: 'On failure, report diagnostics and retry.',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if ((window as any).openbot?.createAgent) {
      await (window as any).openbot.createAgent(newAgent);
    }

    setState('agents', (prev) => [newAgent, ...prev]);
    setState('selectedAgentId', newAgent.id);
    addToast('success', `Agent "${newAgent.name}" created`, `Workspace initialized at ${newAgent.workspacePath}`);
    closeAgentSetupModal();
    return newAgent;
  }
}

export async function deleteAgent(agentId: string) {
  const agent = state.agents.find((a) => a.id === agentId);
  if (!agent) return;

  if ((window as any).openbot?.deleteAgent) {
    await (window as any).openbot.deleteAgent(agentId);
  }

  const remaining = state.agents.filter((a) => a.id !== agentId);
  setState('agents', remaining);

  if (state.selectedAgentId === agentId) {
    if (remaining.length > 0) {
      setState('selectedAgentId', remaining[0].id);
    } else {
      setState('selectedAgentId', '');
    }
  }

  addToast('success', `Agent "${agent.name}" deleted`, 'Workspace directory cleaned up');
}

export async function exportAgentTemplate(agentId: string) {
  const agent = state.agents.find((a) => a.id === agentId);
  if (!agent) return;

  if ((window as any).openbot?.exportAgentTemplate) {
    const res = await (window as any).openbot.exportAgentTemplate(agentId);
    if (res?.template?.publicUrl) {
      addToast('success', 'Agent template exported', res.template.publicUrl);
      return res.template;
    }
  }
  addToast('success', 'Agent template exported', `https://openbot.run/template/${agentId}`);
}

export function changeAgentModel(agentId: string, provider: string, model: string) {
  setState('agents', (a) => a.id === agentId, { provider, model, updatedAt: new Date().toISOString() });
  addToast('success', `Model switched to ${model}`, 'Conversation history preserved across providers');
}

export async function sendMessageToCurrentAgent(messageText: string) {
  const agent = state.agents.find((a) => a.id === state.selectedAgentId);
  if (!agent) return;

  const userMsg: ChatMessage = {
    id: `msg-${Date.now()}-user`,
    agentId: agent.id,
    author: 'user',
    body: messageText,
    createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  const prev = state.agentMessages[agent.id] || [];
  setState('agentMessages', agent.id, [...prev, userMsg]);
  setState('agents', (a) => a.id === agent.id, 'status', 'thinking');

  try {
    let reply: any = null;
    if ((window as any).openbot?.sendMessage) {
      reply = await (window as any).openbot.sendMessage({
        agentId: agent.id,
        providerId: agent.provider,
        model: agent.model,
        message: messageText,
      });
    }

    const agentMsg: ChatMessage = {
      id: `msg-${Date.now()}-agent`,
      agentId: agent.id,
      author: 'agent',
      body: reply?.text || `Task completed under ${agent.provider} (${agent.model}). Workspace state updated.`,
      reasoning: reply?.reasoning,
      toolStep: reply?.toolStep,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setState('agentMessages', agent.id, (msgs = []) => [...msgs, agentMsg]);
    setState('agents', (a) => a.id === agent.id, 'status', 'responded');
  } catch (err: any) {
    setState('agents', (a) => a.id === agent.id, 'status', 'error');
    addToast('error', 'Execution error', err.message);
  }
}

export function handleApproval(agentId: string, messageId: string, approved: boolean) {
  const msgs = state.agentMessages[agentId] || [];
  const updated = msgs.map((m) => {
    if (m.id === messageId && m.approval) {
      return {
        ...m,
        approval: {
          ...m.approval,
          status: approved ? ('approved' as const) : ('declined' as const),
        },
      };
    }
    return m;
  });
  setState('agentMessages', agentId, updated);
  addToast(
    approved ? 'success' : 'warning',
    approved ? 'Action approved and executed' : 'Action declined'
  );
}
