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
  Thread,
  Turn,
  QueueEntry,
  MessageAttachment,
  BackgroundProcess,
  MCPServer,
  Skill,
  Routine,
  Workflow,
  WorkflowRun,
  BackupModel,
  MemoryUsage,
  MetaMemory,
  ServerMember,
  MemberAgentAccess,
  SharedTable,
  AuditLogEntry,
  RemoteDesktopSession,
  ServerRole,
  AgentAccessLevel,
  Connector,
  MessagingConnection,
  VoiceSettingsState,
  HostedSite,
  EnterpriseSSOConfig,
  AccountSession,
  UserProfile,
  ExtendedSSOConfig,
  MobileConnectState,
  CommercialLicence,
  HostedServerSubscription,
  OfflineGraceState,
  MobileDeviceState,
  LiveActivityTelemetry,
  WebSessionLockState,
  InlineMediaInspection,
  DeepLinkPayload,
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
    publishState: 'not-reachable',
    status: 'online',
    storage: {
      totalBytes: 512 * 1024 * 1024 * 1024,
      usedBytes: 420 * 1024 * 1024 * 1024,
      freeBytes: 92 * 1024 * 1024 * 1024,
      percentUsed: 82,
    },
    timezone: 'Automatic',
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

const initialChannels: Channel[] = [];

const initialPeople: Person[] = [];

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

const initialThreads: Record<string, Thread[]> = {
  'agent-kestrel': [
    {
      id: 'thread-kestrel-main',
      agentId: 'agent-kestrel',
      title: 'Latency Spikes Investigation',
      kind: 'main',
      state: 'active',
      createdAt: '2026-11-09T10:00:00Z',
      lastActivity: '2026-11-09T14:02:22Z',
    },
    {
      id: 'thread-kestrel-canary',
      agentId: 'agent-kestrel',
      title: 'Branch: Canary Rollout Patch',
      kind: 'branch',
      parentThreadId: 'thread-kestrel-main',
      state: 'active',
      createdAt: '2026-11-09T14:15:00Z',
      lastActivity: '2026-11-09T14:20:00Z',
    },
  ],
  'agent-cipher': [
    {
      id: 'thread-cipher-main',
      agentId: 'agent-cipher',
      title: 'Security CVE Audit',
      kind: 'main',
      state: 'active',
      createdAt: '2026-11-09T11:00:00Z',
      lastActivity: '2026-11-09T11:20:00Z',
    },
  ],
  'agent-vanguard': [
    {
      id: 'thread-vanguard-main',
      agentId: 'agent-vanguard',
      title: 'Terraform Dry-Run & Plan',
      kind: 'main',
      state: 'active',
      createdAt: '2026-11-09T12:00:00Z',
      lastActivity: '2026-11-09T12:29:00Z',
    },
  ],
};

const initialActiveThreadId: Record<string, string> = {
  'agent-kestrel': 'thread-kestrel-main',
  'agent-cipher': 'thread-cipher-main',
  'agent-vanguard': 'thread-vanguard-main',
};

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
  threads: initialThreads as Record<string, Thread[]>,
  activeThreadId: initialActiveThreadId as Record<string, string>,
  activeSideThread: null as Thread | null,
  agentQueues: {} as Record<string, QueueEntry[]>,
  queuePaused: {} as Record<string, boolean>,
  composerAttachments: [] as MessageAttachment[],
  isThreadListExpanded: { 'agent-kestrel': true, 'agent-cipher': true, 'agent-vanguard': true } as Record<string, boolean>,
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

  // Milestone 4 states
  backgroundProcesses: [] as BackgroundProcess[],
  mcpServers: [
    { id: 'mcp-pg', name: 'PostgreSQL MCP Bridge', type: 'stdio', command: 'npx @modelcontextprotocol/server-postgres', enabled: 1, status: 'connected', created_at: '2026-11-09T10:00:00Z' },
    { id: 'mcp-git', name: 'Git Repository Context', type: 'stdio', command: 'npx @modelcontextprotocol/server-git', enabled: 1, status: 'connected', created_at: '2026-11-09T10:05:00Z' },
    { id: 'mcp-fetch', name: 'HTTP Fetcher & DOM Inspector', type: 'http', url: 'http://127.0.0.1:8080/sse', enabled: 1, status: 'connected', created_at: '2026-11-09T10:10:00Z' },
    { id: 'mcp-fs', name: 'Local Workspace Filesystem', type: 'stdio', command: 'npx @modelcontextprotocol/server-filesystem', enabled: 1, status: 'connected', created_at: '2026-11-09T10:15:00Z' },
  ] as MCPServer[],
  isMCPDirty: false,
  skills: [
    { id: 'skill-pr-review', name: 'GitHub PR Reviewer', instructions: 'Analyze git diffs against security standards, coverage benchmarks, and style conventions.', description: 'Audits pull request diffs, checks test coverage, and enforces code standards.', icon: 'checklist', enabled: 1 },
    { id: 'skill-docker', name: 'Docker Compose Orchestrator', instructions: 'Generate and validate multi-container docker-compose files with volume isolation.', description: 'Configures multi-container environments and networks.', icon: 'deployed_code', enabled: 1 },
    { id: 'skill-api-tester', name: 'REST API Tester', instructions: 'Probe REST endpoints with varied status codes and payload validations.', description: 'Generates integration test suites for HTTP endpoints.', icon: 'api', enabled: 1 },
    { id: 'skill-refactor', name: 'Code Refactoring Expert', instructions: 'Identify code smells, duplicate logic, and simplify cyclomatic complexity.', description: 'Suggests idiomatic architecture refactorings.', icon: 'auto_fix_high', enabled: 1 },
  ] as Skill[],
  agentSkills: {
    'agent-kestrel': [
      { id: 'skill-pr-review', name: 'GitHub PR Reviewer', instructions: 'Analyze git diffs against security standards.', icon: 'checklist', enabled: 1 },
      { id: 'skill-docker', name: 'Docker Compose Orchestrator', instructions: 'Generate docker-compose files.', icon: 'deployed_code', enabled: 1 },
    ],
    'agent-cipher': [
      { id: 'skill-api-tester', name: 'REST API Tester', instructions: 'Probe REST endpoints.', icon: 'api', enabled: 1 },
    ],
    'agent-vanguard': [
      { id: 'skill-refactor', name: 'Code Refactoring Expert', instructions: 'Identify code smells.', icon: 'auto_fix_high', enabled: 1 },
    ],
  } as Record<string, Skill[]>,
  routines: [
    {
      id: 'routine-audit',
      agent_id: 'agent-kestrel',
      instruction: 'Run daily dependency audit and verify invariant constraints across submodules.',
      trigger_type: 'schedule',
      trigger_value: '08:00 UTC',
      filters: '["dependencies", "cve"]',
      on_closed_action: 'run_once_on_open',
      is_quiet: 0,
      state: 'active',
      next_run: 'Tomorrow, 08:00 UTC',
      created_at: '2026-11-09T08:00:00Z',
    },
    {
      id: 'routine-health',
      agent_id: 'agent-pulse',
      instruction: 'Probe staging health check endpoints every hour; trigger alert on p99 > 250ms.',
      trigger_type: 'schedule',
      trigger_value: 'Every 60m',
      filters: '["otel", "latency"]',
      on_closed_action: 'skip',
      is_quiet: 1,
      state: 'active',
      next_run: 'In 42 minutes',
      created_at: '2026-11-09T09:00:00Z',
    },
    {
      id: 'routine-webhook-deploy',
      agent_id: 'agent-vanguard',
      instruction: 'Triggered on GitHub deployment webhook: dry-run terraform plan and post summary.',
      trigger_type: 'webhook',
      trigger_value: 'https://openbot.local/webhook/route-gh-deploy',
      webhook_route_id: 'route-gh-deploy',
      filters: '["production", "terraform"]',
      on_closed_action: 'skip',
      is_quiet: 0,
      state: 'active',
      created_at: '2026-11-09T10:00:00Z',
    },
  ] as Routine[],
  workflows: [
    {
      id: 'wf-ci-cd-dag',
      title: 'Production Deployment & Security Gate',
      description: 'Multi-agent sequential and parallel orchestration: Ingest -> Lint & Scan -> Human Approval -> Publish.',
      graph_json: JSON.stringify({
        nodes: [
          { id: 'node-ingest', name: '1. Ingest Commit Diff', agent: 'Kestrel', status: 'completed' },
          { id: 'node-analysis', name: '2. Deep Security Audit', agent: 'Cipher', status: 'completed' },
          { id: 'node-gate', name: '3. Human Approval Gate', agent: 'User', status: 'waiting_approval' },
          { id: 'node-output', name: '4. Deploy Artifacts', agent: 'Vanguard', status: 'pending' },
        ],
      }),
      created_at: '2026-11-09T10:00:00Z',
      updated_at: '2026-11-09T12:00:00Z',
    },
  ] as Workflow[],
  workflowRuns: [] as WorkflowRun[],
  agentMemories: {
    'agent-kestrel': [
      { id: 'mem-1', agent_id: 'agent-kestrel', fact_text: 'Strict clean-room requirement: All specifications are drawn from openbot-complete-feature-spec-2026-11-09.md.', is_essential: 1, byte_size: 118, created_at: '2026-11-09T10:00:00Z' },
      { id: 'mem-2', agent_id: 'agent-kestrel', fact_text: 'Core invariant: Provider runtimes must stop before agent service on shutdown.', is_essential: 1, byte_size: 82, created_at: '2026-11-09T10:05:00Z' },
      { id: 'mem-3', agent_id: 'agent-kestrel', fact_text: 'Target production cluster uses AWS EKS us-east-1 VPC with strict CIDR masks.', is_essential: 0, byte_size: 79, created_at: '2026-11-09T11:00:00Z' },
    ],
    'agent-vanguard': [
      { id: 'mem-4', agent_id: 'agent-vanguard', fact_text: 'Terraform apply commands require interactive human approval confirmation.', is_essential: 1, byte_size: 78, created_at: '2026-11-09T12:00:00Z' },
    ],
  } as Record<string, MetaMemory[]>,
  agentMemoryUsage: {
    'agent-kestrel': { totalBytes: 279, essentialBytes: 200, budgetBytes: 8192 },
    'agent-vanguard': { totalBytes: 78, essentialBytes: 78, budgetBytes: 8192 },
  } as Record<string, MemoryUsage>,
  agentBackupModels: {
    'agent-kestrel': [
      { agent_id: 'agent-kestrel', model_name: 'Claude 3.7 Sonnet', provider_id: 'claude', priority: 1 },
      { agent_id: 'agent-kestrel', model_name: 'Codex o3-mini', provider_id: 'codex', priority: 2 },
      { agent_id: 'agent-kestrel', model_name: 'OpenCode Free', provider_id: 'opencode', priority: 3 },
    ],
  } as Record<string, BackupModel[]>,
  computerUseStatus: {
    enabled: false,
    driverRunning: false,
    permissions: { screenRecording: true, accessibility: true },
    platform: 'win32',
  },
  isPiPActive: false,
  recentlyDeletedWorkflow: null as Workflow | null,

  // Milestone 5: Teams and Collaboration states
  serverMembers: [] as ServerMember[],
  memberAgentAccess: {} as Record<string, MemberAgentAccess[]>,
  sharedTables: [] as SharedTable[],
  auditLogs: [
    {
      id: 'audit-init',
      serverId: 'server-local',
      action: 'server_created',
      actor: 'system',
      details: 'Local team server created.',
      timestamp: new Date().toISOString(),
    },
  ] as AuditLogEntry[],
  activeRemoteDesktopSession: null as RemoteDesktopSession | null,
  isRemoteDesktopActive: false,

  // Milestone 6: Integrations and Voice
  connectors: [] as Connector[],
  messagingConnections: [] as MessagingConnection[],
  voiceSettings: {
    dictationEngine: 'parakeet',
    dictationModel: 'Parakeet',
    dictationLanguage: 'Automatic',
    ttsVoice: 'Female (Nova)',
    ttsModel: 'Flash',
    ttsGender: 'female',
    ttsLanguage: 'en',
    ttsAutoRead: true,
    apiKeys: {},
    voiceServerStatus: 'Not set up',
    voiceServerUseForDictation: false,
    voiceServerUseForTTS: false,
  } as VoiceSettingsState,
  hostedSites: [] as HostedSite[],
  enterpriseSSO: [] as EnterpriseSSOConfig[],

  // Milestone 7 state properties
  userProfile: null as UserProfile | null,
  accountSessions: [] as AccountSession[],
  extendedSSO: null as ExtendedSSOConfig | null,
  mobileConnect: null as MobileConnectState | null,
  commercialLicence: null as CommercialLicence | null,
  hostedServerSubscriptions: [] as HostedServerSubscription[],
  offlineGrace: {
    status: 'valid',
    hoursRemaining: 24,
    isBlocked: false,
    lastValidatedAt: new Date().toISOString(),
    message: 'Licence is valid and verified online.',
  } as OfflineGraceState,

  // Milestone 8 state properties
  mobileDevice: {
    id: 'mob-dev-primary',
    deviceName: 'iPhone 16 Pro (Mobile Companion)',
    platform: 'ios',
    failedPinAttempts: 0,
    isLocked: false,
    cachedAgentsCount: 3,
    lastSyncAt: new Date().toISOString(),
  } as MobileDeviceState | null,
  webSessionLock: null as WebSessionLockState | null,
  activeLiveActivity: null as LiveActivityTelemetry | null,
  isWebClientModalOpen: false,
  isMobileCompanionModalOpen: false,
  pendingDeepLink: null as DeepLinkPayload | null,
  reconnectAttempt: 0,
  reconnectElapsedSeconds: 0,
  reconnectText: '',
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

// Milestone 3: Chat, Threads, Queue & Attachments Actions
export async function createThreadForAgent(agentId: string, title?: string): Promise<Thread | null> {
  const currentThreads = state.threads[agentId] || [];
  if (currentThreads.length >= 50) {
    addToast('error', 'Thread limit reached', 'Maximum 50 open threads allowed per agent. Please close an existing thread.');
    return null;
  }

  const threadTitle = title || `Thread ${currentThreads.length + 1}`;
  let newThread: Thread;

  if ((window as any).openbot?.createThread) {
    try {
      newThread = await (window as any).openbot.createThread(agentId, threadTitle, 'main');
    } catch (err: any) {
      addToast('error', 'Failed to create thread', err.message);
      return null;
    }
  } else {
    newThread = {
      id: `thread-${Date.now()}`,
      agentId,
      title: threadTitle,
      kind: 'main',
      state: 'active',
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
    };
  }

  setState('threads', agentId, (prev = []) => [newThread, ...prev]);
  setState('activeThreadId', agentId, newThread.id);
  addToast('success', 'New thread created', `Switched to "${newThread.title}"`);
  return newThread;
}

export async function switchAgentThread(agentId: string, threadId: string) {
  setState('activeThreadId', agentId, threadId);
  if ((window as any).openbot?.getMessages) {
    try {
      const msgs = await (window as any).openbot.getMessages(threadId);
      if (msgs && msgs.length > 0) {
        setState('agentMessages', agentId, msgs);
      }
    } catch (err) {
      console.error('Error fetching thread messages:', err);
    }
  }
}

export async function renameAgentThread(agentId: string, threadId: string, newTitle: string) {
  if (!newTitle.trim()) return;
  if ((window as any).openbot?.renameThread) {
    await (window as any).openbot.renameThread(threadId, newTitle.trim());
  }
  setState('threads', agentId, (threads = []) =>
    threads.map((t) => (t.id === threadId ? { ...t, title: newTitle.trim() } : t))
  );
  addToast('success', 'Thread renamed', `Thread updated to "${newTitle.trim()}"`);
}

export async function closeAgentThread(agentId: string, threadId: string) {
  if ((window as any).openbot?.closeThread) {
    await (window as any).openbot.closeThread(threadId);
  }
  const remaining = (state.threads[agentId] || []).filter((t) => t.id !== threadId);
  setState('threads', agentId, remaining);

  if (state.activeThreadId[agentId] === threadId) {
    if (remaining.length > 0) {
      setState('activeThreadId', agentId, remaining[0].id);
    } else {
      await createThreadForAgent(agentId, 'Main Conversation');
    }
  }
  addToast('success', 'Thread closed');
}

export async function branchFromMessage(agentId: string, threadId: string, messageId: string) {
  const currentThreads = state.threads[agentId] || [];
  if (currentThreads.length >= 50) {
    addToast('error', 'Thread limit reached', 'Maximum 50 open threads reached. Please close a thread to branch.');
    return;
  }

  let branchThread: Thread;
  if ((window as any).openbot?.branchThreadFromMessage) {
    try {
      branchThread = await (window as any).openbot.branchThreadFromMessage(
        threadId,
        messageId,
        `Branch: Exploration`
      );
    } catch (err: any) {
      addToast('error', 'Branching error', err.message);
      return;
    }
  } else {
    branchThread = {
      id: `branch-${Date.now()}`,
      agentId,
      title: `Branch: Exploration`,
      kind: 'branch',
      parentThreadId: threadId,
      sourceMessageId: messageId,
      state: 'active',
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
    };
  }

  setState('threads', agentId, (prev = []) => [branchThread, ...prev]);
  setState('activeSideThread', branchThread);
  setState('activeSidePanelTab', 'tab-side-thread');
  setState('sidePanelOpen', true);
  addToast('success', 'Branch thread created', `Exploration branched into side panel`);
}

export async function compactActiveThread() {
  const agentId = state.selectedAgentId;
  const threadId = state.activeThreadId[agentId];
  if (!threadId) return;

  if ((window as any).openbot?.compactThread) {
    try {
      const res = await (window as any).openbot.compactThread(threadId, 2);
      if (res?.success) {
        addToast('success', 'Thread compacted', `Context window condensed (${res.compactedTurns} turns summarized)`);
        await switchAgentThread(agentId, threadId);
      } else {
        addToast('warning', 'Compaction not required', res.summary || 'Thread context already optimal');
      }
    } catch (err: any) {
      addToast('error', 'Compaction failed', err.message);
    }
  } else {
    addToast('success', 'Thread compacted', 'Context condensed to conserve model window');
  }
}

export function toggleThreadListExpanded(agentId: string) {
  const current = state.isThreadListExpanded[agentId] !== false;
  setState('isThreadListExpanded', agentId, !current);
}

// Attachment management enforcing exact spec limits:
// 100 MB per file, 250 MB per message, 10 files per message
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB
export const MAX_TOTAL_SIZE = 250 * 1024 * 1024; // 250 MB
export const MAX_FILES_COUNT = 10;

export function addComposerAttachment(file: {
  name: string;
  size: number;
  type: string;
  base64Data?: string;
}): boolean {
  if (state.composerAttachments.length >= MAX_FILES_COUNT) {
    addToast('error', 'Attachment limit exceeded', `Cannot attach more than ${MAX_FILES_COUNT} files to a single message.`);
    return false;
  }

  if (file.size > MAX_FILE_SIZE) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    addToast('error', 'File too large', `File "${file.name}" (${mb} MB) exceeds the 100 MB per-file limit.`);
    return false;
  }

  const currentTotal = state.composerAttachments.reduce((acc, f) => acc + f.size, 0);
  if (currentTotal + file.size > MAX_TOTAL_SIZE) {
    const totalMb = ((currentTotal + file.size) / (1024 * 1024)).toFixed(1);
    addToast('error', 'Total payload exceeded', `Total attachments (${totalMb} MB) exceed the 250 MB per-message limit.`);
    return false;
  }

  const attachment: MessageAttachment = {
    id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: file.name,
    size: file.size,
    type: file.type,
    base64Data: file.base64Data,
  };

  setState('composerAttachments', (prev) => [...prev, attachment]);
  return true;
}

export function removeComposerAttachment(id: string) {
  setState('composerAttachments', (prev) => prev.filter((a) => a.id !== id));
}

export function clearComposerAttachments() {
  setState('composerAttachments', []);
}

export async function pauseAgentQueue(agentId: string) {
  if ((window as any).openbot?.pauseQueue) {
    await (window as any).openbot.pauseQueue(agentId);
  }
  setState('queuePaused', agentId, true);
  addToast('warning', 'Message queue paused', 'Subsequent messages will wait in queue');
}

export async function resumeAgentQueue(agentId: string) {
  if ((window as any).openbot?.resumeQueue) {
    await (window as any).openbot.resumeQueue(agentId);
  }
  setState('queuePaused', agentId, false);
  addToast('success', 'Message queue resumed', 'Processing pending turns FIFO');
}

export async function cancelQueueItem(agentId: string, queueId: string) {
  if ((window as any).openbot?.cancelQueuedMessage) {
    await (window as any).openbot.cancelQueuedMessage(queueId);
  }
  setState('agentQueues', agentId, (q = []) => q.filter((item) => item.id !== queueId));
  addToast('success', 'Queued task cancelled');
}

export async function sendMessageToCurrentAgent(messageText: string) {
  const agent = state.agents.find((a) => a.id === state.selectedAgentId);
  if (!agent) return;

  const text = messageText.trim();
  const attachments = [...state.composerAttachments];

  if (!text && attachments.length === 0) return;

  const currentThreadId = state.activeThreadId[agent.id] || `thread-${agent.id}-main`;

  const userMsg: ChatMessage = {
    id: `msg-${Date.now()}-user`,
    agentId: agent.id,
    threadId: currentThreadId,
    author: 'user',
    body: text || `[Attached ${attachments.length} file(s)]`,
    attachments,
    createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  const prev = state.agentMessages[agent.id] || [];
  setState('agentMessages', agent.id, [...prev, userMsg]);
  setState('agents', (a) => a.id === agent.id, 'status', 'thinking');
  clearComposerAttachments();

  try {
    let result: any = null;
    if ((window as any).openbot?.submitTurnMessage) {
      result = await (window as any).openbot.submitTurnMessage({
        agentId: agent.id,
        threadId: currentThreadId,
        providerId: agent.provider,
        model: agent.model,
        messageText: text,
        attachments,
      });
    } else if ((window as any).openbot?.sendMessage) {
      const reply = await (window as any).openbot.sendMessage({
        agentId: agent.id,
        providerId: agent.provider,
        model: agent.model,
        message: text,
      });
      result = { queued: false, reply };
    }

    if (result?.queued) {
      setState('agents', (a) => a.id === agent.id, 'status', 'idle');
      const queueItem: QueueEntry = {
        id: `q-${Date.now()}`,
        agentId: agent.id,
        threadId: currentThreadId,
        turnId: result.turnId,
        messageText: text,
        attachments,
        position: (state.agentQueues[agent.id]?.length || 0) + 1,
        state: 'queued',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setState('agentQueues', agent.id, (q = []) => [...q, queueItem]);
      addToast('warning', 'Task queued (FIFO)', `Turn queued: concurrency limit (4) reached or queue paused.`);
      return;
    }

    if (!result?.reply || !result.reply.text) {
      throw new Error(`Provider "${agent.provider}" is not connected or requires sign-in. No response generated.`);
    }

    const agentMsg: ChatMessage = {
      id: `msg-${Date.now()}-agent`,
      agentId: agent.id,
      threadId: currentThreadId,
      turnId: result.turnId,
      author: 'agent',
      body: result.reply.text,
      reasoning: result.reply.reasoning,
      toolStep: result.reply.toolStep,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setState('agentMessages', agent.id, (msgs = []) => [...msgs, agentMsg]);
    setState('agents', (a) => a.id === agent.id, 'status', 'responded');
  } catch (err: any) {
    setState('agents', (a) => a.id === agent.id, 'status', 'error');
    addToast('error', 'Provider error', err?.message || 'Provider execution failed');
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

// =========================================================================
// Milestone 4: Agent Runtime Actions
// =========================================================================

export async function loadBackgroundProcesses() {
  try {
    if ((window as any).openbot?.getBackgroundProcesses) {
      const procs = await (window as any).openbot.getBackgroundProcesses();
      setState('backgroundProcesses', procs || []);
    }
  } catch (err) {
    console.error('Failed to load background processes:', err);
  }
}

export async function startBackgroundProcessAction(command: string, agentId?: string, ports: number[] = [3000]) {
  try {
    if ((window as any).openbot?.startBackgroundProcess) {
      const proc = await (window as any).openbot.startBackgroundProcess(command, agentId, ports);
      setState('backgroundProcesses', (prev) => [proc, ...prev]);
      addToast('success', 'Background process started', `${command} (PID: ${proc.pid})`);
      return proc;
    }
  } catch (err: any) {
    addToast('error', 'Failed to start process', err?.message);
  }
}

export async function stopBackgroundProcessAction(id: string) {
  try {
    if ((window as any).openbot?.stopBackgroundProcess) {
      await (window as any).openbot.stopBackgroundProcess(id);
      setState('backgroundProcesses', (prev) => prev.filter((p) => p.id !== id));
      addToast('warning', 'Process stopped', 'Process was terminated cleanly');
    }
  } catch (err: any) {
    addToast('error', 'Failed to stop process', err?.message);
  }
}

export async function loadMCPServers() {
  try {
    if ((window as any).openbot?.getMCPServers) {
      const servers = await (window as any).openbot.getMCPServers();
      if (servers && servers.length) {
        setState('mcpServers', servers);
      }
    }
  } catch (err) {
    console.error('Failed to load MCP servers:', err);
  }
}

export async function addMCPServerAction(server: { name: string; type?: 'stdio' | 'sse' | 'http'; command?: string; url?: string }) {
  try {
    if ((window as any).openbot?.addMCPServer) {
      const created = await (window as any).openbot.addMCPServer(server);
      setState('mcpServers', (prev) => [...prev, created]);
      setState('isMCPDirty', true);
      addToast('success', `MCP server "${created.name}" added`, 'Server available to agents on this computer');
      return created;
    }
  } catch (err: any) {
    addToast('error', 'Failed to add MCP server', err?.message);
  }
}

export async function testMCPServerAction(id: string) {
  try {
    if ((window as any).openbot?.testMCPServer) {
      const res = await (window as any).openbot.testMCPServer(id);
      if (res.success) {
        addToast('success', 'MCP Probe Successful', `Handshake responded in ${res.latencyMs}ms`);
      } else {
        addToast('error', 'MCP Probe Failed', res.error || 'Endpoint unreachable');
      }
      return res;
    }
  } catch (err: any) {
    addToast('error', 'Test probe error', err?.message);
  }
}

export async function removeMCPServerAction(id: string) {
  try {
    if ((window as any).openbot?.removeMCPServer) {
      await (window as any).openbot.removeMCPServer(id);
      setState('mcpServers', (prev) => prev.filter((s) => s.id !== id));
      setState('isMCPDirty', true);
      addToast('warning', 'MCP server removed', 'Server disconnected from workspace');
    }
  } catch (err: any) {
    addToast('error', 'Failed to remove MCP server', err?.message);
  }
}

export async function saveMCPServersAction() {
  try {
    if ((window as any).openbot?.markMCPSaved) {
      await (window as any).openbot.markMCPSaved();
      setState('isMCPDirty', false);
      addToast('success', 'MCP configuration saved', 'All tool bridges synced');
    }
  } catch (err: any) {
    addToast('error', 'Failed to save MCP configuration', err?.message);
  }
}

export async function loadSkills() {
  try {
    if ((window as any).openbot?.getSkills) {
      const skills = await (window as any).openbot.getSkills();
      if (skills && skills.length) {
        setState('skills', skills);
      }
    }
  } catch (err) {
    console.error('Failed to load skills:', err);
  }
}

export async function loadAgentSkills(agentId: string) {
  try {
    if ((window as any).openbot?.getAgentSkills) {
      const skills = await (window as any).openbot.getAgentSkills(agentId);
      setState('agentSkills', agentId, skills || []);
    }
  } catch (err) {
    console.error(`Failed to load skills for agent ${agentId}:`, err);
  }
}

export async function attachSkillAction(agentId: string, skill: Skill) {
  try {
    if ((window as any).openbot?.attachSkillToAgent) {
      await (window as any).openbot.attachSkillToAgent(agentId, skill.id);
    }
    const current = state.agentSkills[agentId] || [];
    if (!current.some((s) => s.id === skill.id)) {
      setState('agentSkills', agentId, [...current, skill]);
    }
    addToast('success', `Skill attached`, `Attached "${skill.name}" to agent`);
  } catch (err: any) {
    addToast('error', 'Failed to attach skill', err?.message);
  }
}

export async function detachSkillAction(agentId: string, skillId: string) {
  try {
    if ((window as any).openbot?.detachSkillFromAgent) {
      await (window as any).openbot.detachSkillFromAgent(agentId, skillId);
    }
    const current = state.agentSkills[agentId] || [];
    setState('agentSkills', agentId, current.filter((s) => s.id !== skillId));
    addToast('warning', `Skill detached`, 'Skill removed from agent workspace');
  } catch (err: any) {
    addToast('error', 'Failed to detach skill', err?.message);
  }
}

export async function loadRoutines() {
  try {
    if ((window as any).openbot?.getRoutines) {
      const routines = await (window as any).openbot.getRoutines();
      if (routines && routines.length) {
        setState('routines', routines);
      }
    }
  } catch (err) {
    console.error('Failed to load routines:', err);
  }
}

export async function createRoutineAction(routine: any) {
  try {
    if ((window as any).openbot?.createRoutine) {
      const created = await (window as any).openbot.createRoutine(routine);
      setState('routines', (prev) => [created, ...prev]);
      addToast('success', 'Automated routine created', routine.instruction?.substring(0, 50));
      return created;
    }
  } catch (err: any) {
    addToast('error', 'Routine creation failed', err?.message);
  }
}

export async function downloadCalendarFeed() {
  try {
    let icsContent = '';
    if ((window as any).openbot?.getCalendarFeed) {
      icsContent = await (window as any).openbot.getCalendarFeed();
    } else {
      icsContent = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//OpenBot//Automated Routines//EN\r\nEND:VCALENDAR';
    }
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'openbot-routines-next-30-days.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('success', 'Calendar feed exported', 'Exported next 30 days of scheduled routines (.ics)');
  } catch (err: any) {
    addToast('error', 'Failed to export calendar feed', err?.message);
  }
}

export async function loadWorkflows() {
  try {
    if ((window as any).openbot?.getWorkflows) {
      const wfs = await (window as any).openbot.getWorkflows();
      if (wfs && wfs.length) {
        setState('workflows', wfs);
      }
    }
  } catch (err) {
    console.error('Failed to load workflows:', err);
  }
}

export async function runWorkflowAction(workflowId: string) {
  try {
    addToast('success', 'Workflow Run Started', 'Executing DAG node dependencies across agents...');
    if ((window as any).openbot?.runWorkflow) {
      const run = await (window as any).openbot.runWorkflow(workflowId);
      setState('workflowRuns', (prev) => [run, ...prev]);
      addToast('success', 'Workflow Run Completed', run.result);
      return run;
    }
  } catch (err: any) {
    addToast('error', 'Workflow execution error', err?.message);
  }
}

export async function deleteWorkflowAction(id: string) {
  try {
    const target = state.workflows.find((w) => w.id === id);
    if (!target) return;

    if ((window as any).openbot?.deleteWorkflow) {
      const res = await (window as any).openbot.deleteWorkflow(id);
      setState('recentlyDeletedWorkflow', res.deletedWorkflow || target);
    } else {
      setState('recentlyDeletedWorkflow', target);
    }

    setState('workflows', (prev) => prev.filter((w) => w.id !== id));
    addToast('warning', `Workflow "${target.title}" deleted`, 'Click "Undo" in the next 10 seconds to restore');
  } catch (err: any) {
    addToast('error', 'Failed to delete workflow', err?.message);
  }
}

export async function restoreDeletedWorkflowAction() {
  const target = state.recentlyDeletedWorkflow;
  if (!target) return;

  try {
    if ((window as any).openbot?.restoreWorkflow) {
      await (window as any).openbot.restoreWorkflow(target);
    }
    setState('workflows', (prev) => [target, ...prev]);
    setState('recentlyDeletedWorkflow', null);
    addToast('success', 'Workflow restored', `"${target.title}" restored successfully`);
  } catch (err: any) {
    addToast('error', 'Failed to restore workflow', err?.message);
  }
}

export async function loadMemories(agentId: string) {
  try {
    if ((window as any).openbot?.getMemories) {
      const mems = await (window as any).openbot.getMemories(agentId);
      setState('agentMemories', agentId, mems || []);
    }
    if ((window as any).openbot?.getMemoryUsage) {
      const usage = await (window as any).openbot.getMemoryUsage(agentId);
      setState('agentMemoryUsage', agentId, usage);
    }
  } catch (err) {
    console.error(`Failed to load memory for agent ${agentId}:`, err);
  }
}

export async function addMemoryAction(agentId: string, factText: string, isEssential: boolean = false) {
  try {
    if ((window as any).openbot?.addMemory) {
      const created = await (window as any).openbot.addMemory(agentId, factText, isEssential);
      const prev = state.agentMemories[agentId] || [];
      setState('agentMemories', agentId, [created, ...prev]);
      await loadMemories(agentId);
      addToast('success', isEssential ? 'Essential memory added' : 'Memory fact recorded', factText.substring(0, 40));
      return created;
    }
  } catch (err: any) {
    addToast('error', 'Memory limit error', err?.message);
  }
}

export async function deleteMemoryAction(agentId: string, memoryId: string) {
  try {
    if ((window as any).openbot?.deleteMemory) {
      await (window as any).openbot.deleteMemory(memoryId);
    }
    const prev = state.agentMemories[agentId] || [];
    setState('agentMemories', agentId, prev.filter((m) => m.id !== memoryId));
    await loadMemories(agentId);
    addToast('warning', 'Memory deleted', 'Invariant memory cleared');
  } catch (err: any) {
    addToast('error', 'Failed to delete memory', err?.message);
  }
}

export async function toggleBrowserPiPAction() {
  try {
    if ((window as any).openbot?.toggleBrowserPiP) {
      const active = await (window as any).openbot.toggleBrowserPiP();
      setState('isPiPActive', active);
      addToast(active ? 'success' : 'warning', active ? 'Browser Picture-in-Picture opened' : 'Picture-in-Picture closed');
    }
  } catch (err: any) {
    addToast('error', 'PiP error', err?.message);
  }
}

export async function toggleComputerUseAction(enabled: boolean) {
  try {
    if ((window as any).openbot?.setComputerUseEnabled) {
      const res = await (window as any).openbot.setComputerUseEnabled(enabled);
      setState('computerUseStatus', 'enabled', res);
      setState('computerUseStatus', 'driverRunning', res);
      addToast(res ? 'success' : 'warning', res ? 'Computer Use driver active' : 'Computer Use disabled');
    }
  } catch (err: any) {
    addToast('error', 'Computer Use error', err?.message);
  }
}

// =========================================================================
// Milestone 5: Teams and Collaboration Actions
// =========================================================================

export async function loadTeamServers() {
  try {
    if ((window as any).openbot?.getTeamServers) {
      const servers = await (window as any).openbot.getTeamServers();
      if (servers && servers.length) {
        setState('servers', servers.map((s: any) => ({
          ...s,
          isLocal: s.is_local === 1,
          publishState: s.publish_state,
          storage: {
            totalBytes: 512 * 1024 * 1024 * 1024,
            usedBytes: 420 * 1024 * 1024 * 1024,
            freeBytes: 92 * 1024 * 1024 * 1024,
            percentUsed: 82,
          },
        })));
      }
    }
  } catch (err) {
    console.error('Failed to load team servers:', err);
  }
}

export async function createTeamServerAction(server: { name: string; logo?: string; plan?: string; is_local?: boolean; timezone?: string }) {
  try {
    if ((window as any).openbot?.createTeamServer) {
      const created = await (window as any).openbot.createTeamServer(server);
      const serverInfo: ServerInfo = {
        id: created.id,
        name: created.name,
        logo: created.logo,
        isLocal: created.is_local === 1,
        publishState: created.publish_state,
        status: 'online',
        storage: { totalBytes: 100 * 1024 * 1024 * 1024, usedBytes: 10 * 1024 * 1024 * 1024, freeBytes: 90 * 1024 * 1024 * 1024, percentUsed: 10 },
        timezone: created.timezone || 'UTC+0',
      };
      setState('servers', (prev) => [...prev, serverInfo]);
      addToast('success', `Team server "${created.name}" created`, `Protocol v9 active with 3 data channels`);
      return created;
    }
  } catch (err: any) {
    addToast('error', 'Failed to create server', err?.message);
  }
}

export async function joinTeamServerAction(token: string, userEmail: string) {
  try {
    if ((window as any).openbot?.joinTeamServer) {
      const res = await (window as any).openbot.joinTeamServer(token, userEmail);
      if (res.success && res.member) {
        setState('serverMembers', (prev) => [...prev, res.member]);
        addToast('success', 'Joined team server', `Signed in as ${userEmail}. Email invitation verified.`);
      } else {
        addToast('error', 'Join failed', res.error || 'Invalid or expired invitation token');
      }
      return res;
    }
  } catch (err: any) {
    addToast('error', 'Join server error', err?.message);
  }
}

export async function setPublishStateAction(serverId: string, publishState: 'reachable' | 'not-reachable') {
  try {
    if ((window as any).openbot?.setPublishState) {
      await (window as any).openbot.setPublishState(serverId, publishState);
      setState('servers', (s) => s.id === serverId, 'publishState', publishState);
      addToast(
        'success',
        publishState === 'reachable' ? 'Server published online' : 'Server unpublished',
        publishState === 'reachable'
          ? 'Reachable online: Only invited people can sign in.'
          : 'Not reachable online: Existing members and invitations remain.'
      );
    }
  } catch (err: any) {
    addToast('error', 'Publish state update error', err?.message);
  }
}

export async function rotateServerKeyAction(serverId: string) {
  try {
    if ((window as any).openbot?.rotateServerKey) {
      const res = await (window as any).openbot.rotateServerKey(serverId);
      if (res.success) {
        addToast('success', 'Server key rotated', 'Dual-signed handover token generated. Paired computers, phones, and webhook routes remain connected.');
      }
      return res;
    }
  } catch (err: any) {
    addToast('error', 'Key rotation failed', err?.message);
  }
}

export async function restartServerAction(serverId: string) {
  try {
    if ((window as any).openbot?.restartServer) {
      const res = await (window as any).openbot.restartServer(serverId);
      addToast('warning', 'Server restarting', 'Takes about 1 minute. Running turns stopped; members temporarily disconnected; files and chats preserved.');
      return res;
    }
  } catch (err: any) {
    addToast('error', 'Restart failed', err?.message);
  }
}

export async function loadServerMembers(serverId: string) {
  try {
    if ((window as any).openbot?.getServerMembers) {
      const members = await (window as any).openbot.getServerMembers(serverId);
      if (members && members.length) {
        setState('serverMembers', members);
      }
    }
  } catch (err) {
    console.error('Failed to load members:', err);
  }
}

export async function inviteServerMemberAction(serverId: string, email: string, name: string, role: ServerRole = 'member') {
  try {
    if ((window as any).openbot?.inviteServerMember) {
      const created = await (window as any).openbot.inviteServerMember(serverId, email, name, role);
      setState('serverMembers', (prev) => [...prev, created]);
      addToast('success', `Invited ${name}`, `Invitation sent to ${email} (Role: ${role})`);
      return created;
    }
  } catch (err: any) {
    addToast('error', 'Invitation failed', err?.message);
  }
}

export async function removeServerMemberAction(serverId: string, memberId: string) {
  try {
    if ((window as any).openbot?.removeServerMember) {
      await (window as any).openbot.removeServerMember(serverId, memberId);
      setState('serverMembers', (prev) => prev.filter((m) => m.id !== memberId));
      addToast('warning', 'Member removed', 'Access to server and shared conversations revoked.');
    }
  } catch (err: any) {
    addToast('error', 'Failed to remove member', err?.message);
  }
}

export async function loadSharedTables() {
  try {
    if ((window as any).openbot?.getSharedTables) {
      const tables = await (window as any).openbot.getSharedTables();
      if (tables && tables.length) {
        setState('sharedTables', tables.map((t: any) => ({
          ...t,
          columns: JSON.parse(t.columns_json || '[]'),
          rows: JSON.parse(t.rows_json || '[]'),
        })));
      }
    }
  } catch (err) {
    console.error('Failed to load shared tables:', err);
  }
}

export async function createSharedTableAction(name: string, creatorAgentId: string, columns: string[]) {
  try {
    if ((window as any).openbot?.createSharedTable) {
      const created = await (window as any).openbot.createSharedTable(name, creatorAgentId, columns);
      setState('sharedTables', (prev) => [...prev, {
        id: created.id,
        name: created.name,
        creatorAgentId: created.creator_agent_id,
        columns,
        rows: [],
        createdAt: created.created_at,
        updatedAt: created.updated_at,
      }]);
      addToast('success', `Shared table "${name}" created`, `Owned by ${creatorAgentId}. Every other agent can read/write rows.`);
      return created;
    }
  } catch (err: any) {
    addToast('error', 'Failed to create shared table', err?.message);
  }
}

export async function alterSharedTableAction(name: string, requestingAgentId: string, columns: string[]) {
  try {
    if ((window as any).openbot?.alterSharedTable) {
      await (window as any).openbot.alterSharedTable(name, requestingAgentId, columns);
      setState('sharedTables', (t) => t.name === name, 'columns', columns);
      addToast('success', `Shared table "${name}" updated`, 'Columns modified by creator');
    }
  } catch (err: any) {
    addToast('error', 'Permission denied', err?.message);
  }
}

export async function dropSharedTableAction(name: string, requestingAgentId: string, isUser: boolean = false) {
  try {
    if ((window as any).openbot?.dropSharedTable) {
      await (window as any).openbot.dropSharedTable(name, requestingAgentId, isUser);
      setState('sharedTables', (prev) => prev.filter((t) => t.name !== name));
      addToast('warning', `Shared table "${name}" dropped`, isUser ? 'Deleted by user' : 'Dropped by creator agent');
    }
  } catch (err: any) {
    addToast('error', 'Permission denied', err?.message);
  }
}

export async function loadAuditLogs(serverId: string) {
  try {
    if ((window as any).openbot?.getAuditLogs) {
      const logs = await (window as any).openbot.getAuditLogs(serverId);
      if (logs && logs.length) {
        setState('auditLogs', logs);
      }
    }
  } catch (err) {
    console.error('Failed to load audit logs:', err);
  }
}

export async function createRemoteDesktopTestAction(serverId: string, targetName: string) {
  try {
    if ((window as any).openbot?.createRemoteDesktopTest) {
      const session = await (window as any).openbot.createRemoteDesktopTest(serverId, targetName);
      setState('activeRemoteDesktopSession', session);
      setState('isRemoteDesktopActive', true);
      addToast('success', 'Remote Desktop Test Panel', `Code: ${session.fourDigitCode}. Panel expires in 2 minutes.`);
      return session;
    }
  } catch (err: any) {
    addToast('error', 'Remote desktop error', err?.message);
  }
}

export async function verifyRemoteDesktopTestAction(sessionId: string, code: string) {
  try {
    if ((window as any).openbot?.verifyRemoteDesktopTest) {
      const res = await (window as any).openbot.verifyRemoteDesktopTest(sessionId, code);
      if (res.success) {
        addToast('success', 'Remote Desktop Connected', 'Verified with 4-digit code. Sunshine/Moonlight stream active.');
      } else {
        addToast('error', 'Verification failed', res.error);
      }
      return res;
    }
  } catch (err: any) {
    addToast('error', 'Remote desktop verification error', err?.message);
  }
}

export async function stopAllRemoteControlAction() {
  try {
    if ((window as any).openbot?.stopAllRemoteControl) {
      await (window as any).openbot.stopAllRemoteControl();
      setState('isRemoteDesktopActive', false);
      setState('activeRemoteDesktopSession', null);
      addToast('warning', 'Remote control stopped', 'All active remote desktop sessions terminated.');
    }
  } catch (err: any) {
    console.error('Failed to stop remote control:', err);
  }
}

// Milestone 6 Actions: Integrations & Voice

export async function loadConnectors() {
  try {
    if ((window as any).openbot?.getConnectors) {
      const data = await (window as any).openbot.getConnectors();
      setState('connectors', data);
      return data;
    }
  } catch (err: any) {
    console.error('Failed to load connectors:', err);
  }
}

export async function connectConnectorAction(service: string, accountIdentifier: string, authPayload?: string) {
  try {
    if ((window as any).openbot?.connectConnector) {
      const res = await (window as any).openbot.connectConnector(service, accountIdentifier, authPayload);
      if (res.success) {
        addToast('success', `${res.connector.name} connected`, `Configured as agent tools (${res.toolsCount || 0} tools added).`);
        await loadConnectors();
      }
      return res;
    }
  } catch (err: any) {
    addToast('error', 'Connection failed', err?.message);
  }
}

export async function disconnectConnectorAction(service: string) {
  try {
    if ((window as any).openbot?.disconnectConnector) {
      await (window as any).openbot.disconnectConnector(service);
      addToast('warning', 'Connector disconnected', `Service "${service}" disconnected.`);
      await loadConnectors();
    }
  } catch (err: any) {
    console.error('Failed to disconnect connector:', err);
  }
}

export async function loadMessagingConnections() {
  try {
    if ((window as any).openbot?.getMessagingConnections) {
      const data = await (window as any).openbot.getMessagingConnections();
      setState('messagingConnections', data);
      return data;
    }
  } catch (err: any) {
    console.error('Failed to load messaging connections:', err);
  }
}

export async function updateMessagingConnectionAction(id: string, updates: any) {
  try {
    if ((window as any).openbot?.updateMessagingConnection) {
      await (window as any).openbot.updateMessagingConnection(id, updates);
      await loadMessagingConnections();
    }
  } catch (err: any) {
    console.error('Failed to update messaging connection:', err);
  }
}

export async function connectWhatsAppBaileysAction() {
  try {
    if ((window as any).openbot?.connectWhatsAppBaileys) {
      const res = await (window as any).openbot.connectWhatsAppBaileys();
      addToast('success', 'WhatsApp Connected', res.notice);
      await loadMessagingConnections();
      return res;
    }
  } catch (err: any) {
    addToast('error', 'WhatsApp Baileys error', err?.message);
  }
}

export async function disconnectWhatsAppBaileysAction() {
  try {
    if ((window as any).openbot?.disconnectWhatsAppBaileys) {
      await (window as any).openbot.disconnectWhatsAppBaileys();
      addToast('warning', 'WhatsApp Disconnected', 'Baileys client session stopped.');
      await loadMessagingConnections();
    }
  } catch (err: any) {
    console.error('Failed to disconnect WhatsApp:', err);
  }
}

export async function loadVoiceSettings() {
  try {
    if ((window as any).openbot?.getVoiceSettings) {
      const data = await (window as any).openbot.getVoiceSettings();
      setState('voiceSettings', {
        dictationEngine: data.dictation_engine,
        dictationModel: data.dictation_model,
        dictationLanguage: data.dictation_language,
        ttsVoice: data.tts_voice,
        ttsModel: data.tts_model,
        ttsGender: data.tts_gender,
        ttsLanguage: data.tts_language,
        ttsAutoRead: Boolean(data.tts_auto_read),
        apiKeys: JSON.parse(data.api_keys || '{}'),
        voiceServerAddress: data.voice_server_address,
        voiceServerApiKey: data.voice_server_api_key,
        voiceServerStatus: data.voice_server_status,
        voiceServerUseForDictation: Boolean(data.voice_server_use_for_dictation),
        voiceServerUseForTTS: Boolean(data.voice_server_use_for_tts),
        voiceServerDictationModel: data.voice_server_dictation_model,
        voiceServerTTSModel: data.voice_server_tts_model,
        voiceServerVoice: data.voice_server_voice,
      });
      return data;
    }
  } catch (err: any) {
    console.error('Failed to load voice settings:', err);
  }
}

export async function updateVoiceSettingsAction(updates: any) {
  try {
    if ((window as any).openbot?.updateVoiceSettings) {
      await (window as any).openbot.updateVoiceSettings(updates);
      await loadVoiceSettings();
      addToast('success', 'Voice settings updated', 'Audio DSP and synthesis configuration saved.');
    }
  } catch (err: any) {
    addToast('error', 'Voice settings update error', err?.message);
  }
}

export async function saveVoiceApiKeyAction(provider: string, apiKey: string) {
  try {
    if ((window as any).openbot?.saveVoiceApiKey) {
      await (window as any).openbot.saveVoiceApiKey(provider, apiKey);
      addToast('success', 'API Key saved', `Saved key for ${provider}.`);
      await loadVoiceSettings();
    }
  } catch (err: any) {
    addToast('error', 'Save API key error', err?.message);
  }
}

export async function removeVoiceApiKeyAction(provider: string) {
  try {
    if ((window as any).openbot?.removeVoiceApiKey) {
      await (window as any).openbot.removeVoiceApiKey(provider);
      addToast('warning', 'API Key removed', `Removed key for ${provider}.`);
      await loadVoiceSettings();
    }
  } catch (err: any) {
    addToast('error', 'Remove API key error', err?.message);
  }
}

export async function configureVoiceServerAction(params: any) {
  try {
    if ((window as any).openbot?.configureVoiceServer) {
      const res = await (window as any).openbot.configureVoiceServer(params);
      for (const notice of res.notices) {
        addToast('success', 'Voice Server', notice);
      }
      await loadVoiceSettings();
      return res;
    }
  } catch (err: any) {
    addToast('error', 'Voice server configuration error', err?.message);
  }
}

export async function loadHostedSites() {
  try {
    if ((window as any).openbot?.getHostedSites) {
      const data = await (window as any).openbot.getHostedSites();
      setState('hostedSites', data);
      return data;
    }
  } catch (err: any) {
    console.error('Failed to load hosted sites:', err);
  }
}

export async function publishHostedSiteAction(params: { subdomain: string; siteTitle: string; authorAgentId?: string }) {
  try {
    if ((window as any).openbot?.publishHostedSite) {
      const res = await (window as any).openbot.publishHostedSite(params);
      addToast('success', 'Site Published', `Live at ${res.subdomain}.${res.domain} (expires in 30 days).`);
      await loadHostedSites();
      return res;
    }
  } catch (err: any) {
    addToast('error', 'Publish site error', err?.message);
  }
}

export async function deleteHostedSiteAction(siteId: string) {
  try {
    if ((window as any).openbot?.deleteHostedSite) {
      const res = await (window as any).openbot.deleteHostedSite(siteId);
      addToast('warning', 'Site Deleted', res.message);
      await loadHostedSites();
      return res;
    }
  } catch (err: any) {
    addToast('error', 'Delete site error', err?.message);
  }
}

// -------------------------------------------------------------
// Milestone 7: Auth, Profile, Sessions, SSO, Mobile & Billing Actions
// -------------------------------------------------------------

export async function loadUserProfile() {
  try {
    if ((window as any).openbot?.getUserProfile) {
      const profile = await (window as any).openbot.getUserProfile();
      if (profile) setState('userProfile', profile);
      return profile;
    }
  } catch (err: any) {
    console.error('Failed to load user profile:', err);
  }
}

export async function loadAccountSessions() {
  try {
    if ((window as any).openbot?.getAccountSessions) {
      const sessions = await (window as any).openbot.getAccountSessions();
      setState('accountSessions', sessions || []);
      return sessions;
    }
  } catch (err: any) {
    console.error('Failed to load account sessions:', err);
  }
}

export async function disconnectSessionAction(sessionId: string) {
  try {
    if ((window as any).openbot?.disconnectSession) {
      const res = await (window as any).openbot.disconnectSession(sessionId);
      if (res.notice) {
        addToast('warning', 'Session Disconnected', res.notice);
      } else {
        addToast('success', 'Session Disconnected', res.message);
      }
      await loadAccountSessions();
      return res;
    }
  } catch (err: any) {
    addToast('error', 'Disconnect session error', err?.message);
  }
}

export async function loadExtendedSSO() {
  try {
    if ((window as any).openbot?.getExtendedSSOConfig) {
      const sso = await (window as any).openbot.getExtendedSSOConfig();
      if (sso) setState('extendedSSO', sso);
      return sso;
    }
  } catch (err: any) {
    console.error('Failed to load extended SSO:', err);
  }
}

export async function verifySSODNSAction(domain: string) {
  try {
    if ((window as any).openbot?.verifySSODNS) {
      const res = await (window as any).openbot.verifySSODNS(domain);
      addToast('success', 'DNS Verified', res.message);
      await loadExtendedSSO();
      return res;
    }
  } catch (err: any) {
    addToast('error', 'DNS Verification Failed', err?.message);
  }
}

export async function generateSCIMTokenAction() {
  try {
    if ((window as any).openbot?.generateSCIMToken) {
      const res = await (window as any).openbot.generateSCIMToken();
      addToast('warning', 'SCIM Token Generated', res.warning);
      await loadExtendedSSO();
      return res;
    }
  } catch (err: any) {
    addToast('error', 'Generate SCIM Token error', err?.message);
  }
}

export async function revokeSCIMTokenAction() {
  try {
    if ((window as any).openbot?.revokeSCIMToken) {
      await (window as any).openbot.revokeSCIMToken();
      addToast('warning', 'SCIM Token Revoked', 'Directory provisioning synchronization halted.');
      await loadExtendedSSO();
    }
  } catch (err: any) {
    addToast('error', 'Revoke SCIM Token error', err?.message);
  }
}

export async function testBrowserSSOAction(provider: string) {
  try {
    if ((window as any).openbot?.testBrowserSSO) {
      const res = await (window as any).openbot.testBrowserSSO(provider);
      addToast('success', 'SSO Test Sign-in', `Redirecting to identity provider (${provider})…`);
      return res;
    }
  } catch (err: any) {
    addToast('error', 'Browser SSO error', err?.message);
  }
}

export async function loadMobileConnect() {
  try {
    if ((window as any).openbot?.getMobileConnect) {
      const data = await (window as any).openbot.getMobileConnect();
      if (data) setState('mobileConnect', data);
      return data;
    }
  } catch (err: any) {
    console.error('Failed to load mobile connect:', err);
  }
}

export async function generateMobileCodeAction() {
  try {
    if ((window as any).openbot?.generateMobileOneTimeCode) {
      const res = await (window as any).openbot.generateMobileOneTimeCode();
      setState('mobileConnect', {
        ...state.mobileConnect,
        activeCode: res.code,
        qrPayload: res.qrPayload,
      } as any);
      addToast('success', 'Mobile Code Generated', `Code ${res.code} valid for 10 minutes.`);
      return res;
    }
  } catch (err: any) {
    addToast('error', 'Generate mobile code error', err?.message);
  }
}

export async function replaceMobileLinkAction() {
  try {
    if ((window as any).openbot?.replaceMobilePermanentLink) {
      const res = await (window as any).openbot.replaceMobilePermanentLink();
      addToast('warning', 'Permanent Link Replaced', res.warning);
      await loadMobileConnect();
      return res;
    }
  } catch (err: any) {
    addToast('error', 'Replace link error', err?.message);
  }
}

export async function revokeMobileLinkAction() {
  try {
    if ((window as any).openbot?.revokeMobilePermanentLink) {
      const res = await (window as any).openbot.revokeMobilePermanentLink();
      addToast('warning', 'Permanent Link Revoked', res.message);
      await loadMobileConnect();
      return res;
    }
  } catch (err: any) {
    addToast('error', 'Revoke link error', err?.message);
  }
}

export async function loadBillingState() {
  try {
    if ((window as any).openbot?.getCommercialLicence) {
      const lic = await (window as any).openbot.getCommercialLicence();
      setState('commercialLicence', lic);
    }
    if ((window as any).openbot?.getHostedServerSubscriptions) {
      const subs = await (window as any).openbot.getHostedServerSubscriptions();
      setState('hostedServerSubscriptions', subs || []);
    }
    if ((window as any).openbot?.checkOfflineGrace) {
      const grace = await (window as any).openbot.checkOfflineGrace();
      setState('offlineGrace', grace);
    }
  } catch (err: any) {
    console.error('Failed to load billing state:', err);
  }
}

export async function recordLicenceAcceptanceAction(params: any) {
  try {
    if ((window as any).openbot?.recordLicenceAcceptance) {
      const res = await (window as any).openbot.recordLicenceAcceptance(params);
      addToast('success', 'Licence Activated', res.message);
      await loadBillingState();
      return res;
    }
  } catch (err: any) {
    addToast('error', 'Licence Acceptance Error', err?.message);
  }
}

export async function cancelHostedSubscriptionAction(subId: string) {
  try {
    if ((window as any).openbot?.cancelHostedServerSubscription) {
      const res = await (window as any).openbot.cancelHostedServerSubscription(subId);
      addToast('warning', 'Subscription Cancelled', res.message);
      await loadBillingState();
      return res;
    }
  } catch (err: any) {
    addToast('error', 'Cancel subscription error', err?.message);
  }
}

export async function openStripePortalAction(subId?: string) {
  try {
    if ((window as any).openbot?.openStripeCustomerPortal) {
      const res = await (window as any).openbot.openStripeCustomerPortal(subId);
      addToast('success', 'Stripe Customer Portal', `Opening customer portal: ${res.portalUrl}`);
      return res;
    }
  } catch (err: any) {
    addToast('error', 'Portal error', err?.message);
  }
}

export async function openStripeCheckoutAction(planType: string, planId: string) {
  try {
    if ((window as any).openbot?.openStripeCheckout) {
      const res = await (window as any).openbot.openStripeCheckout(planType, planId);
      addToast('success', 'Stripe Checkout', `Opening secure checkout: ${res.checkoutUrl}`);
      return res;
    }
  } catch (err: any) {
    addToast('error', 'Checkout error', err?.message);
  }
}

export async function checkOfflineGraceAction() {
  try {
    if ((window as any).openbot?.checkOfflineGrace) {
      const res = await (window as any).openbot.checkOfflineGrace();
      setState('offlineGrace', res);
      if (res.isBlocked) {
        addToast('error', 'Sign-ins Blocked', res.message);
      } else if (res.status === 'grace_period') {
        addToast('warning', 'Offline Grace Period', res.message);
      }
      return res;
    }
  } catch (err: any) {
    console.error('Offline grace check error:', err);
  }
}

// -------------------------------------------------------------
// Milestone 8: Mobile App & Web Client Actions
// -------------------------------------------------------------

export async function verifyMobilePinAction(pin: string) {
  try {
    if ((window as any).openbot?.verifyMobilePin) {
      const res = await (window as any).openbot.verifyMobilePin('mob-dev-primary', pin);
      if (res.signedOut) {
        addToast('error', 'Device Signed Out', res.error || '10 failed PIN attempts.');
        setState('mobileDevice', 'isLocked', true);
      } else if (!res.success) {
        addToast('warning', 'Incorrect PIN', res.error);
      } else {
        addToast('success', 'Mobile Unlocked', 'Session key active.');
        setState('mobileDevice', 'isLocked', false);
      }
      return res;
    }
  } catch (err: any) {
    addToast('error', 'PIN Verification Error', err?.message);
  }
}

export async function validateMobileUploadAction(fileName: string, byteSize: number) {
  try {
    if ((window as any).openbot?.validateMobileUpload) {
      return await (window as any).openbot.validateMobileUpload(fileName, byteSize);
    }
  } catch (err: any) {
    return { allowed: false, error: err?.message };
  }
}

export async function queueMobileOutboxAction(params: any) {
  try {
    if ((window as any).openbot?.queueMobileOutbox) {
      const res = await (window as any).openbot.queueMobileOutbox(params);
      addToast('success', 'Outbox Queued', 'Message stored locally. Will flush on host reconnect.');
      return res;
    }
  } catch (err: any) {
    addToast('error', 'Outbox Error', err?.message);
  }
}

export async function flushMobileOutboxAction() {
  try {
    if ((window as any).openbot?.flushMobileOutbox) {
      const res = await (window as any).openbot.flushMobileOutbox('mob-dev-primary');
      if (res.syncedCount > 0) {
        addToast('success', 'Outbox Synced', `Flushed ${res.syncedCount} queued messages to host.`);
      }
      return res;
    }
  } catch (err: any) {
    addToast('error', 'Outbox Flush Error', err?.message);
  }
}

export async function updateLiveActivityAction(params: any) {
  try {
    if ((window as any).openbot?.updateLiveActivity) {
      const res = await (window as any).openbot.updateLiveActivity(params);
      setState('activeLiveActivity', res);
      return res;
    }
  } catch (err: any) {
    console.error('Live activity update error:', err);
  }
}

export async function acquireTabLockAction(hostId: string, accountId: string, tabId: string) {
  try {
    if ((window as any).openbot?.acquireTabLock) {
      const res = await (window as any).openbot.acquireTabLock(hostId, accountId, tabId);
      setState('webSessionLock', res);
      if (!res.acquired) {
        addToast('warning', 'Session Lock Active', res.message);
      }
      return res;
    }
  } catch (err: any) {
    console.error('Tab lock acquire error:', err);
  }
}

export async function takeOverTabLockAction(hostId: string, accountId: string, tabId: string) {
  try {
    if ((window as any).openbot?.takeOverTabLock) {
      const res = await (window as any).openbot.takeOverTabLock(hostId, accountId, tabId);
      setState('webSessionLock', res);
      addToast('success', 'Session Taken Over', 'This tab now holds the active host session.');
      return res;
    }
  } catch (err: any) {
    addToast('error', 'Takeover error', err?.message);
  }
}

export async function releaseTabLockAction(hostId: string, accountId: string, tabId: string) {
  try {
    if ((window as any).openbot?.releaseTabLock) {
      return await (window as any).openbot.releaseTabLock(hostId, accountId, tabId);
    }
  } catch (err: any) {
    console.error('Release tab lock error:', err);
  }
}

export async function inspectInlineMediaAction(fileName: string, byteSize: number, mimeType?: string) {
  try {
    if ((window as any).openbot?.inspectInlineMedia) {
      return await (window as any).openbot.inspectInlineMedia(fileName, byteSize, mimeType);
    }
  } catch (err: any) {
    return { renderMode: 'download_only', objectUrlPermitted: false, canAutoDownload: false };
  }
}

export async function requestDownloadSlotAction(fileId: string) {
  try {
    if ((window as any).openbot?.requestDownloadSlot) {
      const res = await (window as any).openbot.requestDownloadSlot(fileId);
      if (!res.granted) {
        addToast('warning', 'Download Queued', res.error || 'At most 2 files can download at once.');
      }
      return res;
    }
  } catch (err: any) {
    return { granted: false, activeDownloads: 2, error: err?.message };
  }
}

export async function cancelFileTransferAction(transferId: string) {
  try {
    if ((window as any).openbot?.cancelFileTransfer) {
      const res = await (window as any).openbot.cancelFileTransfer(transferId);
      addToast('warning', 'Transfer Cancelled', `File transfer ${transferId} cancelled via protocol frame.`);
      return res;
    }
  } catch (err: any) {
    addToast('error', 'Cancel transfer error', err?.message);
  }
}

export async function parseAndCleanDeepLinkAction(rawUrl: string) {
  try {
    if ((window as any).openbot?.parseAndCleanDeepLink) {
      const res = await (window as any).openbot.parseAndCleanDeepLink(rawUrl);
      setState('pendingDeepLink', res);
      return res;
    }
  } catch (err: any) {
    console.error('Deep link parse error:', err);
  }
}




