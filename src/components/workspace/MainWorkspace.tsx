import { Component, createSignal, For, Show } from 'solid-js';
import {
  state,
  setState,
  addToast,
  sendMessageToCurrentAgent,
  changeAgentModel,
  handleApproval,
  createThreadForAgent,
  switchAgentThread,
  renameAgentThread,
  closeAgentThread,
  branchFromMessage,
  compactActiveThread,
  addComposerAttachment,
  removeComposerAttachment,
  clearComposerAttachments,
  pauseAgentQueue,
  resumeAgentQueue,
  cancelQueueItem,
  downloadCalendarFeed,
  createRoutineAction,
  runWorkflowAction,
  deleteWorkflowAction,
  restoreDeletedWorkflowAction,
} from '../../stores/appState';
import { RightSidePanel } from './RightSidePanel';
import { MarketplaceView } from '../marketplace/MarketplaceView';
import { i18n } from '../../shared/i18n';

interface ModelOption {
  id: string;
  name: string;
  provider: string;
  badge: string;
  isFree?: boolean;
}

const AVAILABLE_MODELS: { group: string; models: ModelOption[] }[] = [
  {
    group: 'OpenCode',
    models: [
      { id: 'OpenCode Free', name: 'OpenCode Free', provider: 'opencode', badge: 'No sign-in', isFree: true },
      { id: 'OpenCode Go', name: 'OpenCode Go', provider: 'opencode', badge: 'Go Key' },
    ],
  },
  {
    group: 'Anthropic Claude',
    models: [
      { id: 'Claude 3.7 Sonnet', name: 'Claude 3.7 Sonnet', provider: 'claude', badge: 'Thinking' },
      { id: 'Claude 3.5 Sonnet', name: 'Claude 3.5 Sonnet', provider: 'claude', badge: 'Direct Bridge' },
      { id: 'Claude 3.5 Haiku', name: 'Claude 3.5 Haiku', provider: 'claude', badge: 'Fast' },
    ],
  },
  {
    group: 'Codex / OpenAI',
    models: [
      { id: 'Codex o3-mini', name: 'Codex o3-mini', provider: 'codex', badge: 'High Reasoning' },
      { id: 'GPT-4o', name: 'GPT-4o (Omni)', provider: 'codex', badge: 'Multimodal' },
    ],
  },
  {
    group: 'Google Gemini',
    models: [
      { id: 'Gemini 2.0 Flash', name: 'Gemini 2.0 Flash', provider: 'gemini', badge: '1M Context' },
      { id: 'Gemini 1.5 Pro', name: 'Gemini 1.5 Pro', provider: 'gemini', badge: 'Extended' },
    ],
  },
  {
    group: 'Local Model Servers',
    models: [
      { id: 'DeepSeek-R1 (Local)', name: 'DeepSeek-R1', provider: 'opencode', badge: 'Zero Cost', isFree: true },
      { id: 'Llama 3.3 70B (Ollama)', name: 'Llama 3.3 70B', provider: 'opencode', badge: 'Ollama', isFree: true },
    ],
  },
];

export const MainWorkspace: Component = () => {
  const [inputText, setInputText] = createSignal('');
  const [isThinkingOpen, setIsThinkingOpen] = createSignal(true);
  const [isModelPickerOpen, setIsModelPickerOpen] = createSignal(false);
  const [isThreadDropdownOpen, setIsThreadDropdownOpen] = createSignal(false);
  let fileInputRef: HTMLInputElement | undefined;

  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const currentAgent = () =>
    state.agents.find((a) => a.id === state.selectedAgentId) || state.agents[0];

  const currentChannel = () =>
    state.channels.find((c) => c.id === state.selectedChannelId);

  const currentThread = () => {
    const a = currentAgent();
    if (!a) return null;
    const threads = state.threads[a.id] || [];
    const activeId = state.activeThreadId[a.id];
    return threads.find((t) => t.id === activeId) || threads[0] || null;
  };

  const currentQueue = () => {
    const a = currentAgent();
    if (!a) return [];
    return state.agentQueues[a.id] || [];
  };

  const isQueuePaused = () => {
    const a = currentAgent();
    if (!a) return false;
    return state.queuePaused[a.id] === true;
  };

  const currentMessages = () => {
    const a = currentAgent();
    if (!a) return [];
    return state.agentMessages[a.id] || [];
  };

  const handleSend = async () => {
    const text = inputText().trim();
    if (!text && state.composerAttachments.length === 0) return;
    setInputText('');
    await sendMessageToCurrentAgent(text);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (state.settings.sendShortcut === 'enter') {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    } else {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSend();
      }
    }
  };

  const handleFileInputChange = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    for (let i = 0; i < input.files.length; i++) {
      const file = input.files[i];
      // Read data as base64
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = (reader.result as string)?.split(',')[1];
        addComposerAttachment({
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          base64Data,
        });
      };
      reader.readAsDataURL(file);
    }
    input.value = '';
  };

  return (
    <main class="flex-1 h-full flex flex-row overflow-hidden bg-surface-container-lowest relative">
      {/* Middle Pane: Chat or other page */}
      <div class="flex-1 flex flex-col h-full overflow-hidden">
        {/* Conditional rendering based on activePage */}
        <Show
          when={state.activePage === 'agents'}
          fallback={
            /* Non-agents views matching the Stitch designs */
            <div class="flex-1 flex flex-col p-6 overflow-y-auto">
              {/* Header */}
              <div class="flex items-center justify-between pb-4 border-b border-outline-variant/30 mb-6">
                <div>
                  <h1 class="font-headline-lg text-headline-lg text-on-surface capitalize">
                    {state.activePage}
                  </h1>
                  <p class="font-body-sm text-outline mt-1">
                    Manage and monitor your AI teammates across this workspace.
                  </p>
                </div>
                <button
                  onClick={() => addToast('success', `${state.activePage} refreshed`)}
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-xs border border-outline-variant/30"
                >
                  <span class="material-symbols-outlined text-[16px]">refresh</span>
                  <span>Refresh</span>
                </button>
              </div>

              {/* View specifics */}
              <Show when={state.activePage === 'schedule'}>
                <div class="space-y-4 max-w-5xl">
                  {/* Top limits bar */}
                  <div class="p-4 rounded-xl bg-surface-container border border-outline-variant/30 flex items-center justify-between">
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="font-semibold text-sm text-on-surface">Automated Agent Routines</span>
                        <span class="px-2 py-0.5 rounded text-[10px] font-label-sm bg-secondary-container/20 text-secondary font-semibold uppercase">
                          {state.routines.length} Active
                        </span>
                      </div>
                      <p class="text-xs text-outline mt-1">
                        Routines run only while computer is awake and BissBot is open. Overdue routines run once when network returns.
                      </p>
                      <div class="flex items-center gap-4 mt-2 text-[11px] font-mono text-outline">
                        <span>Webhook Routes: <strong class="text-primary">{state.routines.filter((r) => r.trigger_type === 'webhook').length}/64</strong></span>
                        <span>·</span>
                        <span>Filters Limit: <strong class="text-secondary">128 max / routine</strong></span>
                        <span>·</span>
                        <span>Closed Handling: <strong class="text-on-surface">Run once on open</strong></span>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <button
                        onClick={downloadCalendarFeed}
                        class="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/30 text-xs font-semibold text-on-surface flex items-center gap-1.5 transition-colors"
                        title="Download 30-day iCalendar feed"
                      >
                        <span class="material-symbols-outlined text-[15px] text-primary">calendar_month</span>
                        <span>Calendar Feed (.ics)</span>
                      </button>
                      <button
                        onClick={() => {
                          const inst = prompt('Routine instruction for agent:', 'Daily security audit and scan report');
                          if (inst) {
                            createRoutineAction({
                              instruction: inst,
                              trigger_type: 'schedule',
                              trigger_value: '08:00 UTC',
                              agent_id: 'agent-kestrel',
                              filters: ['audit', 'daily'],
                              on_closed_action: 'run_once_on_open',
                            });
                          }
                        }}
                        class="px-3.5 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:brightness-110 flex items-center gap-1"
                      >
                        <span class="material-symbols-outlined text-[15px]">add</span>
                        <span>New Routine</span>
                      </button>
                    </div>
                  </div>

                  {/* Routines Grid */}
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <For each={state.routines}>
                      {(r) => (
                        <div class="p-3.5 rounded-xl bg-surface-container border border-outline-variant/20 flex flex-col justify-between gap-3 hover:border-outline-variant/40 transition-colors">
                          <div>
                            <div class="flex items-center justify-between mb-1.5">
                              <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-surface-container-high text-primary font-semibold uppercase">
                                {r.trigger_type} · {r.trigger_value}
                              </span>
                              <span class="text-[11px] font-label-sm text-secondary flex items-center gap-1">
                                <span class="w-1.5 h-1.5 rounded-full bg-secondary" />
                                Active
                              </span>
                            </div>
                            <h4 class="font-medium text-xs text-on-surface leading-snug">{r.instruction}</h4>
                          </div>

                          <div class="pt-2 border-t border-outline-variant/20 flex items-center justify-between text-[11px] text-outline font-mono">
                            <span>Agent: {r.agent_id ? state.agents.find((a) => a.id === r.agent_id)?.name || r.agent_id : 'All Agents'}</span>
                            <span class="text-[10px] bg-surface-container-low px-1.5 py-0.5 rounded">
                              {r.on_closed_action === 'run_once_on_open' ? 'Run on open' : 'Skip'}
                            </span>
                          </div>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              </Show>

              <Show when={state.activePage === 'tasks'}>
                <div class="flex flex-col gap-3 max-w-4xl">
                  <div class="p-4 rounded-xl bg-surface-container border border-outline-variant/30 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded bg-tertiary-container/30 text-tertiary flex items-center justify-center font-bold">
                        <span class="material-symbols-outlined text-[18px]">verified_user</span>
                      </div>
                      <div>
                        <div class="font-semibold text-sm">Autonomous Execution Approval</div>
                        <div class="text-xs text-outline font-mono mt-0.5">
                          terraform apply -auto-approve prod-us-east
                        </div>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <button
                        onClick={() => addToast('warning', 'Task declined')}
                        class="px-3 py-1 rounded bg-surface-container-high hover:bg-error/20 hover:text-error text-xs font-semibold"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => addToast('success', 'Task approved and executed')}
                        class="px-3 py-1 rounded bg-primary text-on-primary text-xs font-semibold"
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                </div>
              </Show>

              <Show when={state.activePage === 'usage'}>
                <div class="space-y-4 max-w-5xl">
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="p-4 rounded-xl bg-surface-container border border-outline-variant/30 flex flex-col gap-1">
                      <span class="text-xs text-outline font-label-sm">Tokens Today</span>
                      <span class="text-2xl font-bold font-mono text-primary">124,892</span>
                      <span class="text-[11px] text-secondary">↑ 12% vs yesterday</span>
                    </div>
                    <div class="p-4 rounded-xl bg-surface-container border border-outline-variant/30 flex flex-col gap-1">
                      <span class="text-xs text-outline font-label-sm">Active Agents</span>
                      <span class="text-2xl font-bold font-mono text-on-surface">6</span>
                      <span class="text-[11px] text-outline">Across 2 servers</span>
                    </div>
                    <div class="p-4 rounded-xl bg-surface-container border border-outline-variant/30 flex flex-col gap-1">
                      <span class="text-xs text-outline font-label-sm">Quota Reset & Poller</span>
                      <span class="text-2xl font-bold font-mono text-tertiary">14:00 UTC</span>
                      <span class="text-[11px] text-outline">5-minute usage poll active (300,000ms)</span>
                    </div>
                  </div>

                  {/* Backup Models and Failover Rules */}
                  <div class="p-4 rounded-xl bg-surface-container border border-outline-variant/30 space-y-3">
                    <div class="flex items-center justify-between border-b border-outline-variant/20 pb-2">
                      <div>
                        <div class="font-semibold text-xs text-on-surface">Agent Quota Failover & Backup Models</div>
                        <p class="text-[11px] text-outline mt-0.5">
                          When a provider limit is reached, agents wait until the reset time ("Waits for limit" chip in sidebar) or switch to backup models (max 8 models).
                        </p>
                      </div>
                      <span class="text-[10px] font-mono text-secondary px-2 py-0.5 rounded bg-surface-container-high">
                        Max 8 Backup Models
                      </span>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <For each={state.agentBackupModels['agent-kestrel'] || []}>
                        {(bm) => (
                          <div class="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/20 flex items-center justify-between text-xs">
                            <div class="flex items-center gap-2">
                              <span class="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px]">
                                {bm.priority}
                              </span>
                              <div>
                                <div class="font-semibold text-on-surface">{bm.model_name}</div>
                                <div class="text-[10px] font-mono text-outline uppercase">{bm.provider_id}</div>
                              </div>
                            </div>
                            <span class="text-[10px] text-outline">Priority {bm.priority}</span>
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                </div>
              </Show>

              <Show when={state.activePage === 'workflows'}>
                <div class="space-y-4 max-w-5xl">
                  {/* Workflow Studio Header */}
                  <div class="p-4 rounded-xl bg-surface-container border border-outline-variant/30 flex items-center justify-between">
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-primary text-xl">account_tree</span>
                        <h3 class="font-headline-sm text-sm text-on-surface font-semibold">
                          {state.workflows[0]?.title || 'Multi-Agent DAG Studio'}
                        </h3>
                        <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-surface-container-high text-outline">
                          Version 1.0
                        </span>
                      </div>
                      <p class="text-xs text-outline mt-1 max-w-2xl">
                        {state.workflows[0]?.description || 'Multi-agent sequential and parallel orchestration with conditions, approvals, and outputs.'}
                      </p>
                    </div>
                    <div class="flex items-center gap-2">
                      <Show when={state.recentlyDeletedWorkflow}>
                        <button
                          onClick={restoreDeletedWorkflowAction}
                          class="px-3 py-1.5 rounded-lg bg-tertiary text-on-tertiary text-xs font-semibold hover:brightness-110 flex items-center gap-1 shadow-sm"
                        >
                          <span class="material-symbols-outlined text-[15px]">undo</span>
                          <span>Undo Delete</span>
                        </button>
                      </Show>
                      <button
                        onClick={() => {
                          if (state.workflows[0]) runWorkflowAction(state.workflows[0].id);
                        }}
                        class="px-3.5 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:brightness-110 flex items-center gap-1.5 shadow-sm"
                      >
                        <span class="material-symbols-outlined text-[15px]">play_arrow</span>
                        <span>Run Workflow</span>
                      </button>
                      <button
                        onClick={() => {
                          if (state.workflows[0]) deleteWorkflowAction(state.workflows[0].id);
                        }}
                        class="p-1.5 rounded-lg bg-surface-container-high hover:bg-error/20 hover:text-error text-outline border border-outline-variant/30 transition-colors"
                        title="Delete Workflow"
                      >
                        <span class="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>

                  {/* Multi-Agent DAG Visual Graph */}
                  <div class="p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 flex flex-col items-center justify-center relative overflow-hidden">
                    <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 w-full max-w-4xl z-10">
                      {/* Node 1 */}
                      <div class="p-3.5 rounded-xl bg-surface-container border border-secondary/40 shadow-xs flex flex-col gap-2">
                        <div class="flex items-center justify-between">
                          <span class="text-[10px] font-mono font-bold text-secondary uppercase">Node 1</span>
                          <span class="material-symbols-outlined text-secondary text-[16px]">check_circle</span>
                        </div>
                        <div class="font-semibold text-xs text-on-surface">Ingest Commit Diff</div>
                        <div class="text-[11px] text-outline font-mono">Agent: Kestrel</div>
                        <span class="text-[10px] text-secondary font-semibold">Completed</span>
                      </div>

                      {/* Node 2 */}
                      <div class="p-3.5 rounded-xl bg-surface-container border border-secondary/40 shadow-xs flex flex-col gap-2">
                        <div class="flex items-center justify-between">
                          <span class="text-[10px] font-mono font-bold text-secondary uppercase">Node 2</span>
                          <span class="material-symbols-outlined text-secondary text-[16px]">check_circle</span>
                        </div>
                        <div class="font-semibold text-xs text-on-surface">Deep Security Audit</div>
                        <div class="text-[11px] text-outline font-mono">Agent: Cipher</div>
                        <span class="text-[10px] text-secondary font-semibold">Completed</span>
                      </div>

                      {/* Node 3 */}
                      <div class="p-3.5 rounded-xl bg-surface-container border border-tertiary/60 shadow-xs flex flex-col gap-2">
                        <div class="flex items-center justify-between">
                          <span class="text-[10px] font-mono font-bold text-tertiary uppercase">Node 3</span>
                          <span class="material-symbols-outlined text-tertiary text-[16px]">pending</span>
                        </div>
                        <div class="font-semibold text-xs text-on-surface">Human Approval Gate</div>
                        <div class="text-[11px] text-outline font-mono">Agent: User Confirm</div>
                        <span class="text-[10px] text-tertiary font-semibold animate-pulse">Waiting approval</span>
                      </div>

                      {/* Node 4 */}
                      <div class="p-3.5 rounded-xl bg-surface-container border border-outline-variant/30 shadow-xs flex flex-col gap-2 opacity-70">
                        <div class="flex items-center justify-between">
                          <span class="text-[10px] font-mono font-bold text-outline uppercase">Node 4</span>
                          <span class="material-symbols-outlined text-outline text-[16px]">hourglass_empty</span>
                        </div>
                        <div class="font-semibold text-xs text-on-surface">Deploy Artifacts</div>
                        <div class="text-[11px] text-outline font-mono">Agent: Vanguard</div>
                        <span class="text-[10px] text-outline">Pending</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Show>

              <Show when={state.activePage === 'marketplace'}>
                <MarketplaceView />
              </Show>

              <Show when={state.activePage === 'library'}>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div class="p-4 rounded-xl bg-surface-container border border-outline-variant/30 flex flex-col gap-2">
                    <div class="flex items-center justify-between">
                      <span class="font-semibold text-sm">GitHub PR Reviewer</span>
                      <span class="text-[10px] font-label-sm px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                        Skill
                      </span>
                    </div>
                    <p class="text-xs text-outline">
                      Audits pull request diffs, checks test coverage, and enforces code standards.
                    </p>
                    <button
                      onClick={() => addToast('success', 'Installed skill to local library')}
                      class="self-start mt-2 px-3 py-1 rounded bg-surface-container-high hover:bg-primary hover:text-on-primary text-xs font-semibold transition-colors"
                    >
                      Install
                    </button>
                  </div>
                </div>
              </Show>
            </div>
          }
        >
          {/* Agent Chat View */}
          {/* Top Bar for Selected Agent/Channel */}
          <div class="h-11 px-4 bg-surface-container-low flex items-center justify-between flex-shrink-0 select-none shadow-xs border-b border-outline-variant/20">
            <div class="flex items-center gap-3 min-w-0">
              <div class="flex items-center gap-2">
                <div
                  class={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-[10px] tracking-widest ${
                    currentAgent()?.id === 'agent-research-desk'
                      ? 'bg-emerald-500 text-white'
                      : currentAgent()?.id === 'agent-ceo'
                      ? 'bg-purple-600 text-white'
                      : currentAgent()?.avatarColor || 'bg-primary-container text-on-primary-container'
                  }`}
                >
                  {currentAgent()?.avatar === '--' || currentAgent()?.id === 'agent-research-desk' || currentAgent()?.id === 'agent-ceo' ? (
                    '--'
                  ) : currentAgent()?.avatar?.length === 1 ? (
                    currentAgent()?.avatar
                  ) : (
                    <span class="material-symbols-outlined text-[13px]">
                      {currentAgent()?.avatar}
                    </span>
                  )}
                </div>
                <div class="flex items-center gap-2">
                  <span class="font-headline-sm text-xs text-on-surface font-semibold truncate max-w-[140px]">
                    {currentChannel()?.name || currentAgent()?.name}
                  </span>
                  <button
                    onClick={() => setIsModelPickerOpen(!isModelPickerOpen())}
                    class="px-2 py-0.5 rounded font-label-sm text-[10px] bg-surface-container-high hover:bg-surface-container-highest text-zinc-300 font-medium flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap flex-shrink-0"
                    title="Switch Model (Preserves Chat)"
                  >
                    <span>{currentAgent()?.model || 'Gemini 3.8 Flash'}</span>
                    <span class="material-symbols-outlined text-[10px]">expand_more</span>
                  </button>
                </div>
              </div>

              {/* Thread Selector Chip with Dropdown */}
              <div class="relative ml-2">
                <button
                  onClick={() => setIsThreadDropdownOpen(!isThreadDropdownOpen())}
                  class="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-on-surface font-label-sm text-[11px] transition-colors cursor-pointer shadow-2xs"
                  title="Switch or manage threads (max 50)"
                >
                  <span class="material-symbols-outlined text-[13px] text-primary">
                    {currentThread()?.kind === 'branch' ? 'alt_route' : 'chat_bubble_outline'}
                  </span>
                  <span class="max-w-[140px] truncate">{currentThread()?.title || 'Main Thread'}</span>
                  <span class="material-symbols-outlined text-[11px] text-outline">expand_more</span>
                </button>

                <Show when={isThreadDropdownOpen()}>
                  <div class="fixed inset-0 z-40" onClick={() => setIsThreadDropdownOpen(false)} />
                  <div class="absolute left-0 top-full mt-1 w-64 bg-surface-container border border-outline-variant/40 rounded-xl shadow-xl p-1.5 z-50 flex flex-col gap-1 animate-in fade-in duration-150">
                    <div class="flex items-center justify-between px-2 py-1 text-[10px] font-label-sm text-outline border-b border-outline-variant/20">
                      <span>THREADS ({(state.threads[currentAgent()?.id]?.length || 0)}/50)</span>
                      <button
                        onClick={async () => {
                          setIsThreadDropdownOpen(false);
                          if (currentAgent()) await createThreadForAgent(currentAgent()!.id);
                        }}
                        class="text-primary hover:underline flex items-center gap-0.5"
                      >
                        <span class="material-symbols-outlined text-[12px]">add</span>
                        <span>New</span>
                      </button>
                    </div>
                    <div class="max-h-48 overflow-y-auto flex flex-col gap-0.5">
                      <For each={state.threads[currentAgent()?.id] || []}>
                        {(thread) => (
                          <div
                            onClick={() => {
                              switchAgentThread(currentAgent()!.id, thread.id);
                              setIsThreadDropdownOpen(false);
                            }}
                            class={`flex items-center justify-between px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
                              thread.id === currentThread()?.id
                                ? 'bg-primary/20 text-primary font-semibold'
                                : 'hover:bg-surface-container-high text-on-surface'
                            }`}
                          >
                            <div class="flex items-center gap-1.5 truncate">
                              <span class="material-symbols-outlined text-[13px] text-outline">
                                {thread.kind === 'branch' ? 'alt_route' : 'chat_bubble_outline'}
                              </span>
                              <span class="truncate">{thread.title}</span>
                            </div>
                            <Show when={thread.kind === 'branch'}>
                              <span class="text-[9px] px-1 rounded bg-secondary/10 text-secondary">branch</span>
                            </Show>
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                </Show>
              </div>
            </div>

            {/* Action buttons */}
            <div class="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={async () => {
                  if (currentAgent()) await createThreadForAgent(currentAgent()!.id);
                }}
                class="flex items-center gap-1 px-2 py-1 rounded hover:bg-surface-container text-outline hover:text-on-surface text-xs font-label-sm transition-colors border border-transparent hover:border-outline-variant/30"
                title="Create New Thread (Max 50)"
              >
                <span class="material-symbols-outlined text-[15px]">add_comment</span>
                <span class="hidden sm:inline">New Thread</span>
              </button>

              <button
                onClick={() => compactActiveThread()}
                class="flex items-center gap-1 px-2 py-1 rounded hover:bg-surface-container text-outline hover:text-on-surface text-xs font-label-sm transition-colors border border-transparent hover:border-outline-variant/30"
                title="Compact context (summarizes older turns)"
              >
                <span class="material-symbols-outlined text-[15px] text-secondary">compress</span>
                <span class="hidden sm:inline">Compact</span>
              </button>

              <button
                onClick={() => setState('sidePanelOpen', !state.sidePanelOpen)}
                class={`p-1.5 rounded transition-colors ${
                  state.sidePanelOpen
                    ? 'bg-primary-container text-on-primary-container'
                    : 'text-outline hover:text-on-surface hover:bg-surface-container'
                }`}
                title="Toggle side inspector"
              >
                <span class="material-symbols-outlined text-[16px]">view_sidebar</span>
              </button>
            </div>
          </div>

          {/* Queue Banner */}
          <Show when={currentQueue().length > 0 || isQueuePaused()}>
            <div class="px-4 py-1.5 bg-surface-container border-b border-outline-variant/20 flex items-center justify-between text-xs font-label-sm flex-shrink-0 animate-in fade-in duration-150">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-[16px] text-tertiary">
                  {isQueuePaused() ? 'pause_circle' : 'playlist_play'}
                </span>
                <span class="text-on-surface">
                  <strong>{currentQueue().length}</strong> message(s) queued (FIFO)
                </span>
                <span class={`px-1.5 py-0.2 rounded font-mono text-[9px] font-bold ${
                  isQueuePaused() ? 'bg-tertiary/20 text-tertiary' : 'bg-primary/20 text-primary'
                }`}>
                  {isQueuePaused() ? 'PAUSED' : 'ACTIVE'}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <Show when={!isQueuePaused()}>
                  <button
                    onClick={() => pauseAgentQueue(currentAgent()!.id)}
                    class="px-2 py-0.5 rounded bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-[11px] transition-colors"
                  >
                    Pause Queue
                  </button>
                </Show>
                <Show when={isQueuePaused()}>
                  <button
                    onClick={() => resumeAgentQueue(currentAgent()!.id)}
                    class="px-2 py-0.5 rounded bg-secondary/20 hover:bg-secondary/30 text-secondary font-semibold text-[11px] transition-colors"
                  >
                    Resume Queue
                  </button>
                </Show>
                <Show when={currentQueue().length > 0}>
                  <button
                    onClick={() => cancelQueueItem(currentAgent()!.id, currentQueue()[0].id)}
                    class="px-2 py-0.5 rounded hover:bg-error/20 text-error text-[11px] transition-colors"
                  >
                    Cancel Next
                  </button>
                </Show>
              </div>
            </div>
          </Show>

          {/* Conversation Feed */}
          <div class="flex-1 overflow-y-auto p-4 space-y-4 font-body-md text-body-md text-on-surface">
            {/* System Status Pill */}
            <div class="flex justify-center my-2">
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container text-outline text-label-sm text-[11px]">
                <span class="w-1.5 h-1.5 rounded-full bg-secondary" />
                <span>
                  Connected to repository branch{' '}
                  <span class="text-on-surface font-code-inline">main@9c2fa7b</span> via Model Context Protocol
                </span>
              </div>
            </div>

            {/* Empty State when no messages - matching Screenshot 2026-11-05 131045.png */}
            <Show when={currentMessages().length === 0}>
              <div class="flex-1 flex flex-col items-center justify-center p-8 text-center my-auto animate-in fade-in duration-200">
                {/* Emerald circular avatar with -- eyes */}
                <div class="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center font-mono font-bold text-2xl tracking-widest shadow-lg shadow-emerald-500/20 mb-4 select-none">
                  --
                </div>
                {/* Headline: Research Desk is ready. */}
                <h2 class="text-2xl font-bold tracking-tight text-white mb-1.5">
                  {currentAgent()?.name || 'Research Desk'} is ready.
                </h2>
                {/* Subheadline: Ask, then watch it work. */}
                <p class="text-lg font-medium text-zinc-200 mb-4">
                  Ask, then watch <span class="text-sky-400 font-semibold">it work.</span>
                </p>
                {/* Persona description block */}
                <p class="text-xs text-zinc-400 max-w-md leading-relaxed mb-6 font-normal">
                  {currentAgent()?.id === 'agent-research-desk'
                    ? 'Research and fact check before answering. Deep dive and summarize sources.'
                    : currentAgent()?.role || 'Operating in workspace ' + currentAgent()?.workspacePath}
                </p>
              </div>
            </Show>

            {/* Dynamic Conversation Messages */}
            <For each={currentMessages()}>
              {(msg) => (
                <Show
                  when={msg.kind === 'compaction-summary' || msg.body.startsWith('[Compaction Summary')}
                  fallback={
                    <Show
                      when={msg.author === 'user'}
                      fallback={
                        /* Agent Response */
                        <div class="group relative flex flex-col items-start gap-1 max-w-3xl mr-auto">
                          <div class="flex items-center gap-2 text-label-sm text-[11px] text-outline">
                            <span class="font-semibold text-primary">{currentAgent()?.name}</span>
                            <span>{msg.createdAt}</span>
                          </div>

                          {/* Agent Thinking Box */}
                          <Show when={msg.reasoning}>
                            <div class="w-full bg-surface-container/60 border border-outline-variant/30 rounded-xl overflow-hidden text-xs">
                              <button
                                onClick={() => setIsThinkingOpen(!isThinkingOpen())}
                                class="w-full px-3 py-2 bg-surface-container flex items-center justify-between text-outline hover:text-on-surface transition-colors"
                              >
                                <div class="flex items-center gap-2 font-label-sm text-[11px]">
                                  <span class="material-symbols-outlined text-[15px] text-primary">psychology</span>
                                  <span>Reasoning & Context Plan</span>
                                </div>
                                <span class="material-symbols-outlined text-[15px]">
                                  {isThinkingOpen() ? 'expand_less' : 'expand_more'}
                                </span>
                              </button>

                              <Show when={isThinkingOpen()}>
                                <div class="p-3 font-mono text-[11px] text-on-surface-variant bg-surface-container-lowest/60 border-t border-outline-variant/20 whitespace-pre-wrap space-y-1">
                                  {msg.reasoning}
                                </div>
                              </Show>
                            </div>
                          </Show>

                          {/* Agent Tool Step Execution Bubble */}
                          <Show when={msg.toolStep}>
                            <div class="w-full bg-surface-container border border-outline-variant/30 rounded-xl p-3.5 space-y-2 text-sm">
                              <div class="flex items-center justify-between text-xs font-label-sm text-outline border-b border-outline-variant/20 pb-1.5">
                                <div class="flex items-center gap-1.5 text-primary">
                                  <span class="material-symbols-outlined text-[15px]">terminal</span>
                                  <span class="font-semibold">{msg.toolStep!.name}</span>
                                </div>
                                <span class="text-secondary">Completed</span>
                              </div>

                              <div class="bg-surface-container-lowest p-2.5 rounded font-mono text-[12px] text-on-surface border border-outline-variant/20 whitespace-pre-wrap">
                                {msg.toolStep!.output}
                              </div>
                            </div>
                          </Show>

                          {/* Message Body */}
                          <div class="p-3.5 rounded-2xl rounded-tl-sm bg-surface-container border border-outline-variant/30 text-on-surface text-sm leading-relaxed max-w-2xl">
                            {msg.body}

                            {/* Attachments inside Agent message */}
                            <Show when={msg.attachments && msg.attachments.length > 0}>
                              <div class="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-outline-variant/20">
                                <For each={msg.attachments}>
                                  {(att) => (
                                    <div class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-container-lowest border border-outline-variant/30 text-[11px] font-mono text-on-surface">
                                      <span class="material-symbols-outlined text-[13px] text-primary">attach_file</span>
                                      <span class="max-w-[120px] truncate">{att.name}</span>
                                      <span class="text-[10px] text-outline">({formatBytes(att.size)})</span>
                                    </div>
                                  )}
                                </For>
                              </div>
                            </Show>
                          </div>

                          {/* Message Hover Actions */}
                          <div class="opacity-0 group-hover:opacity-100 flex items-center gap-1 bg-surface-container-high border border-outline-variant/30 rounded-lg px-1 py-0.5 shadow-sm transition-opacity text-[10px] text-outline">
                            <button
                              onClick={() => {
                                if (currentAgent() && currentThread()) {
                                  branchFromMessage(currentAgent()!.id, currentThread()!.id, msg.id);
                                }
                              }}
                              class="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-surface-container-highest hover:text-primary transition-colors"
                              title="Branch a new thread from this turn"
                            >
                              <span class="material-symbols-outlined text-[13px]">alt_route</span>
                              <span>Branch thread</span>
                            </button>
                            <button
                              onClick={() => {
                                setState('activeSideThread', currentThread());
                                setState('sidePanelOpen', true);
                                setState('activeSidePanelTab', 'tab-side-thread');
                              }}
                              class="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-surface-container-highest hover:text-secondary transition-colors"
                              title="Open in side thread inspector"
                            >
                              <span class="material-symbols-outlined text-[13px]">vertical_split</span>
                              <span>Side thread</span>
                            </button>
                          </div>

                          {/* Approval Prompt Card */}
                          <Show when={msg.approval}>
                            <div class="p-3 rounded-lg bg-surface-container-high border border-tertiary/40 flex flex-col gap-2 mt-2 w-full max-w-xl">
                              <div class="flex items-center justify-between">
                                <div class="flex items-center gap-2 text-tertiary font-label-sm text-xs font-semibold">
                                  <span class="material-symbols-outlined text-[16px]">verified</span>
                                  <span>Action Approval Required</span>
                                </div>
                                <span class="text-[10px] font-label-sm text-outline">
                                  {msg.approval!.status === 'pending' ? 'Expires in 15m' : msg.approval!.status.toUpperCase()}
                                </span>
                              </div>

                              <div class="text-xs text-on-surface font-mono bg-surface-container-lowest p-2 rounded border border-outline-variant/20">
                                {msg.approval!.command}
                              </div>

                              <div class="flex items-center justify-between text-[11px] text-outline pt-1">
                                <span>Permissions requested: Network, Write files, Execution</span>
                                <div class="flex items-center gap-2">
                                  <Show
                                    when={msg.approval!.status === 'pending'}
                                    fallback={
                                      <span class={`text-xs font-semibold ${msg.approval!.status === 'approved' ? 'text-secondary' : 'text-error'}`}>
                                        {msg.approval!.status === 'approved' ? 'Approved & Executed' : 'Declined'}
                                      </span>
                                    }
                                  >
                                    <button
                                      onClick={() => handleApproval(currentAgent()!.id, msg.id, false)}
                                      class="px-2.5 py-1 rounded bg-surface-container hover:bg-error/20 hover:text-error text-on-surface text-xs font-medium transition-colors"
                                    >
                                      Decline
                                    </button>
                                    <button
                                      onClick={() => handleApproval(currentAgent()!.id, msg.id, true)}
                                      class="px-3 py-1 rounded bg-primary text-on-primary text-xs font-semibold hover:brightness-110 transition-all"
                                    >
                                      Approve
                                    </button>
                                  </Show>
                                </div>
                              </div>
                            </div>
                          </Show>
                        </div>
                      }
                    >
                      {/* User Message */}
                      <div class="group relative flex flex-col items-end gap-1 max-w-3xl ml-auto">
                        <div class="flex items-center gap-2 text-label-sm text-[11px] text-outline">
                          <span>You</span>
                          <span>{msg.createdAt}</span>
                        </div>
                        <div
                          class="p-3.5 rounded-2xl rounded-tr-sm bg-surface-container-high border border-outline-variant/30 text-on-surface text-sm max-w-2xl leading-relaxed"
                          style={state.settings.chatColor ? { 'background-color': state.settings.chatColor } : {}}
                        >
                          {msg.body}

                          {/* Attachments inside User message */}
                          <Show when={msg.attachments && msg.attachments.length > 0}>
                            <div class="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-outline-variant/20">
                              <For each={msg.attachments}>
                                {(att) => (
                                  <div class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-container-lowest border border-outline-variant/30 text-[11px] font-mono text-on-surface">
                                    <span class="material-symbols-outlined text-[13px] text-primary">attach_file</span>
                                    <span class="max-w-[120px] truncate">{att.name}</span>
                                    <span class="text-[10px] text-outline">({formatBytes(att.size)})</span>
                                  </div>
                                )}
                              </For>
                            </div>
                          </Show>
                        </div>

                        {/* Message Hover Actions */}
                        <div class="opacity-0 group-hover:opacity-100 flex items-center gap-1 bg-surface-container-high border border-outline-variant/30 rounded-lg px-1 py-0.5 shadow-sm transition-opacity text-[10px] text-outline">
                          <button
                            onClick={() => {
                              if (currentAgent() && currentThread()) {
                                branchFromMessage(currentAgent()!.id, currentThread()!.id, msg.id);
                              }
                            }}
                            class="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-surface-container-highest hover:text-primary transition-colors"
                            title="Branch a new thread from this message"
                          >
                            <span class="material-symbols-outlined text-[13px]">alt_route</span>
                            <span>Branch</span>
                          </button>
                        </div>
                      </div>
                    </Show>
                  }
                >
                  {/* Compaction Summary Card */}
                  <div class="my-2 p-3.5 rounded-xl bg-surface-container/70 border border-secondary/40 text-xs text-on-surface max-w-2xl mx-auto flex flex-col gap-1.5 shadow-xs">
                    <div class="flex items-center justify-between text-secondary font-label-sm text-[11px] font-semibold border-b border-outline-variant/20 pb-1">
                      <div class="flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-[15px]">compress</span>
                        <span>Thread Context Compacted</span>
                      </div>
                      <span class="text-[10px] text-outline font-mono">Retained Invariant Memory</span>
                    </div>
                    <p class="whitespace-pre-wrap leading-relaxed text-on-surface-variant font-mono text-[11px]">
                      {msg.body}
                    </p>
                  </div>
                </Show>
              )}
            </For>
          </div>

          {/* Composer Box matching New folder design */}
          <div class="p-4 bg-transparent max-w-3xl mx-auto w-full flex flex-col gap-2 flex-shrink-0 relative">
            {/* Model Picker Popover */}
            <Show when={isModelPickerOpen()}>
              <div class="fixed inset-0 z-40" onClick={() => setIsModelPickerOpen(false)} />
              <div class="absolute left-4 bottom-14 w-80 bg-surface-container border border-outline-variant/40 rounded-xl shadow-2xl p-2 z-50 flex flex-col gap-1.5 animate-in fade-in zoom-in-95 duration-150">
                <div class="flex items-center justify-between px-2 py-1 border-b border-outline-variant/20">
                  <span class="font-label-sm text-[11px] font-semibold text-outline uppercase tracking-wider">
                    Switch Model
                  </span>
                  <span class="text-[10px] text-secondary font-mono">Preserves Conversation</span>
                </div>
                <div class="max-h-72 overflow-y-auto flex flex-col gap-1 pr-1">
                  <For each={AVAILABLE_MODELS}>
                    {(group) => {
                      const groupProvider = () => group.models[0]?.provider;
                      const groupStatus = () => state.providerLiveStatuses[groupProvider()]?.status || 'not-installed';
                      return (
                        <div class="flex flex-col gap-0.5">
                          <div class="flex items-center justify-between px-2 pt-1.5 pb-0.5">
                            <span class="text-[10px] font-bold text-outline uppercase tracking-wider">
                              {group.group}
                            </span>
                            {/* Live Provider Status Indicator */}
                            <Show when={groupStatus() === 'connected'}>
                              <span class="text-[9px] font-semibold text-emerald-400 flex items-center gap-0.5">
                                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                Connected
                              </span>
                            </Show>
                            <Show when={groupStatus() === 'installed-not-signed-in'}>
                              <span class="text-[9px] font-semibold text-amber-400 flex items-center gap-0.5">
                                <span class="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                Sign in
                              </span>
                            </Show>
                            <Show when={groupStatus() === 'not-installed'}>
                              <span class="text-[9px] font-semibold text-outline flex items-center gap-0.5">
                                <span class="w-1.5 h-1.5 rounded-full bg-outline" />
                                Not installed
                              </span>
                            </Show>
                          </div>
                          <For each={group.models}>
                            {(m) => {
                              const provStatus = () => state.providerLiveStatuses[m.provider]?.status || 'not-installed';
                              return (
                                <button
                                  onClick={() => {
                                    changeAgentModel(currentAgent()!.id, m.provider, m.name);
                                    setIsModelPickerOpen(false);
                                  }}
                                  class={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-all ${
                                    currentAgent()?.model === m.name
                                      ? 'bg-primary-container text-on-primary-container font-semibold'
                                      : 'hover:bg-surface-container-high text-on-surface'
                                  }`}
                                >
                                  <div class="flex items-center gap-2">
                                    <span class="material-symbols-outlined text-[14px] text-primary">smart_toy</span>
                                    <span>{m.name}</span>
                                  </div>
                                  <div class="flex items-center gap-1.5">
                                    <Show when={provStatus() === 'connected'}>
                                      <span class="material-symbols-outlined text-[12px] text-emerald-400" title="Connected">check</span>
                                    </Show>
                                    <span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface-container-highest text-outline">
                                      {m.badge}
                                    </span>
                                  </div>
                                </button>
                              );
                            }}
                          </For>
                        </div>
                      );
                    }}
                  </For>
                </div>
                {/* Manage Providers shortcut */}
                <div class="p-1.5 border-t border-outline-variant/20 mt-1">
                  <button
                    onClick={() => {
                      setIsModelPickerOpen(false);
                      setState('activeSettingsTab', 'providers');
                      setState('isSettingsOpen', true);
                    }}
                    class="w-full py-1.5 px-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-primary text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span class="material-symbols-outlined text-[14px]">tune</span>
                    <span>Configure Providers in Settings...</span>
                  </button>
                </div>
              </div>
            </Show>

            <div class="flex flex-col rounded-2xl bg-[#16161a] border border-zinc-700/60 focus-within:border-zinc-500 transition-all shadow-2xl p-2.5">
              {/* Inline Provider Warning Banner */}
              <Show when={currentAgent()}>
                {() => {
                  const agentProv = () => currentAgent()?.provider || 'opencode';
                  const live = () => state.providerLiveStatuses[agentProv()];
                  return (
                    <Show when={live() && live()?.status !== 'connected'}>
                      <div class={`px-3 py-1.5 rounded-xl text-xs flex items-center justify-between border mb-2 ${
                        live()?.status === 'not-installed'
                          ? 'bg-error-container/20 border-error/20 text-error'
                          : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                      }`}>
                        <div class="flex items-center gap-1.5 truncate">
                          <span class="material-symbols-outlined text-[14px]">
                            {live()?.status === 'not-installed' ? 'cancel' : 'key'}
                          </span>
                          <span class="font-medium truncate">
                            {live()?.status === 'not-installed'
                              ? `${live()?.name} CLI is not installed on this computer.`
                              : `${live()?.name} is installed but you are not signed in.`}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setState('activeSettingsTab', 'providers');
                            setState('isSettingsOpen', true);
                          }}
                          class="px-2 py-0.5 rounded bg-surface-container-high hover:bg-surface-container-highest text-[11px] font-semibold text-on-surface underline ml-2 flex-shrink-0 cursor-pointer"
                        >
                          {live()?.status === 'not-installed' ? 'Install Command' : 'Sign In Now'}
                        </button>
                      </div>
                    </Show>
                  );
                }}
              </Show>
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                multiple
                onChange={handleFileInputChange}
                class="hidden"
              />

              {/* Attachment Preview Strip */}
              <Show when={state.composerAttachments.length > 0}>
                <div class="px-2 pb-2 mb-1 border-b border-zinc-800 flex flex-wrap items-center gap-1.5">
                  <div class="text-[10px] font-label-sm text-zinc-400 mr-1 flex items-center gap-1">
                    <span class="material-symbols-outlined text-[13px] text-purple-400">attach_file</span>
                    <span>
                      {state.composerAttachments.length}/10 files · {formatBytes(state.composerAttachments.reduce((acc, f) => acc + f.size, 0))} / 250 MB
                    </span>
                  </div>
                  <For each={state.composerAttachments}>
                    {(att) => (
                      <div class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-zinc-800/80 border border-zinc-700/50 text-[11px] font-mono text-zinc-200">
                        <span class="material-symbols-outlined text-[13px] text-purple-400">draft</span>
                        <span class="max-w-[120px] truncate">{att.name}</span>
                        <span class="text-[10px] text-zinc-400">({formatBytes(att.size)})</span>
                        <button
                          onClick={() => removeComposerAttachment(att.id)}
                          class="w-3.5 h-3.5 rounded hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-red-400 transition-colors"
                          title="Remove file"
                        >
                          <span class="material-symbols-outlined text-[11px]">close</span>
                        </button>
                      </div>
                    )}
                  </For>
                </div>
              </Show>

              {/* Main Input Row matching Screenshot 2026-11-05 131045.png */}
              <div class="flex items-center gap-2.5 px-1">
                {/* Plus button on the left: circular dark button */}
                <button
                  onClick={() => fileInputRef?.click()}
                  class="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300 transition-colors flex-shrink-0 cursor-pointer"
                  title="Attach file (100MB max per file, 250MB total, max 10 files)"
                >
                  <span class="material-symbols-outlined text-[18px]">add</span>
                </button>

                {/* Textarea */}
                <textarea
                  value={inputText()}
                  onInput={(e) => setInputText(e.currentTarget.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message ${currentAgent()?.name || 'Research Desk'}...`}
                  rows={1}
                  class="flex-1 bg-transparent border-0 outline-none resize-none font-body-sm text-sm text-zinc-100 placeholder:text-zinc-500 py-1"
                />

                {/* Right controls: Mic voice dictation + Send circle */}
                <div class="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => addToast('success', 'Voice dictation started')}
                    class="w-8 h-8 rounded-full hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                    title="Dictation (2 min limit)"
                  >
                    <span class="material-symbols-outlined text-[18px]">mic</span>
                  </button>

                  <button
                    onClick={handleSend}
                    disabled={!inputText().trim() && state.composerAttachments.length === 0}
                    class={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      inputText().trim() || state.composerAttachments.length > 0
                        ? 'bg-white hover:bg-zinc-200 text-black font-bold shadow-md cursor-pointer'
                        : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    }`}
                    title="Send message"
                  >
                    <span class="text-base font-bold leading-none">↑</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Disclaimer subtitle under composer */}
            <div class="text-[11px] text-zinc-500 text-center font-normal">
              BissBot can make mistakes. Verify important info.
            </div>
          </div>
        </Show>
      </div>

      {/* Right Side Panel */}
      <RightSidePanel />
    </main>
  );
};
