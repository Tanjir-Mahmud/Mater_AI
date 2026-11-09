import { Component, createSignal, For, Show } from 'solid-js';
import { state, setState, addToast } from '../../stores/appState';
import { RightSidePanel } from './RightSidePanel';
import { i18n } from '../../shared/i18n';

export const MainWorkspace: Component = () => {
  const [inputText, setInputText] = createSignal('');
  const [isThinkingOpen, setIsThinkingOpen] = createSignal(true);
  const [approvalHandled, setApprovalHandled] = createSignal<string | null>(null);

  const currentAgent = () =>
    state.agents.find((a) => a.id === state.selectedAgentId) || state.agents[0];

  const currentChannel = () =>
    state.channels.find((c) => c.id === state.selectedChannelId);

  const handleSend = () => {
    const text = inputText().trim();
    if (!text) return;
    addToast('success', 'Message queued for agent');
    setInputText('');
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
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="p-4 rounded-xl bg-surface-container border border-outline-variant/30">
                    <div class="flex items-center justify-between mb-2">
                      <span class="font-semibold text-sm">Automated Routines</span>
                      <span class="px-2 py-0.5 rounded text-[10px] font-label-sm bg-secondary-container/20 text-secondary">
                        3 Active
                      </span>
                    </div>
                    <p class="text-xs text-outline mb-4">
                      Routines run on schedule when the computer is awake.
                    </p>
                    <div class="space-y-2">
                      <div class="p-2.5 rounded bg-surface-container-low border border-outline-variant/20 flex items-center justify-between text-xs">
                        <div>
                          <div class="font-medium text-on-surface">Daily Dependency Audit</div>
                          <div class="text-[11px] text-outline font-mono">08:00 UTC · Kestrel</div>
                        </div>
                        <span class="text-secondary font-label-sm text-[11px]">Ready</span>
                      </div>
                      <div class="p-2.5 rounded bg-surface-container-low border border-outline-variant/20 flex items-center justify-between text-xs">
                        <div>
                          <div class="font-medium text-on-surface">Hourly Prod Health Check</div>
                          <div class="text-[11px] text-outline font-mono">Every 60m · Pulse</div>
                        </div>
                        <span class="text-secondary font-label-sm text-[11px]">Active</span>
                      </div>
                    </div>
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
                    <span class="text-xs text-outline font-label-sm">Quota Reset</span>
                    <span class="text-2xl font-bold font-mono text-tertiary">14:00 UTC</span>
                    <span class="text-[11px] text-outline">5-minute usage poll active</span>
                  </div>
                </div>
              </Show>

              <Show when={state.activePage === 'workflows'}>
                <div class="p-8 rounded-xl bg-surface-container border border-outline-variant/30 flex flex-col items-center justify-center text-center">
                  <span class="material-symbols-outlined text-5xl text-primary mb-3">
                    account_tree
                  </span>
                  <h3 class="font-headline-sm text-on-surface mb-1">Multi-Agent DAG Studio</h3>
                  <p class="text-xs text-outline max-w-md mb-4">
                    Orchestrate sequential and parallel agent workflows with condition, approval, and output nodes.
                  </p>
                  <button
                    onClick={() => addToast('success', 'New workflow template created')}
                    class="px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-semibold"
                  >
                    + Create Workflow Graph
                  </button>
                </div>
              </Show>

              <Show when={state.activePage === 'library' || state.activePage === 'marketplace'}>
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
                  class={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs ${
                    currentAgent()?.avatarColor || 'bg-primary-container text-on-primary-container'
                  }`}
                >
                  {currentAgent()?.avatar?.length === 1 ? (
                    currentAgent()?.avatar
                  ) : (
                    <span class="material-symbols-outlined text-[15px]">
                      {currentAgent()?.avatar}
                    </span>
                  )}
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="font-headline-sm text-[13px] text-on-surface font-semibold">
                    {currentChannel()?.name || currentAgent()?.name}
                  </span>
                  <span class="px-2 py-0.5 rounded font-label-sm text-[10px] bg-surface-container-high text-primary-fixed-dim font-medium">
                    {currentAgent()?.model || 'Claude 3.5 Sonnet (BYOK)'}
                  </span>
                </div>
              </div>

              {/* Telemetry pill */}
              <div class="hidden xl:flex items-center gap-3 text-label-sm text-[11px] text-outline pl-2 border-l border-outline-variant/20">
                <div class="flex items-center gap-1">
                  <span class="material-symbols-outlined text-[14px] text-secondary">speed</span>
                  <span>142ms</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-[14px]">data_usage</span>
                  <span>42.4K</span>
                  <div class="w-12 h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
                    <div class="w-1/4 h-full bg-primary" />
                  </div>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div class="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => addToast('success', 'Branched into isolated workspace tree')}
                class="flex items-center gap-1 px-2.5 py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface text-label-sm text-[11px] transition-colors"
                title="Branch into isolated work tree"
              >
                <span class="material-symbols-outlined text-[15px] text-primary">fork_right</span>
                <span class="hidden sm:inline">Branch Agent</span>
              </button>

              <button
                onClick={() => addToast('success', 'Exported session log as Markdown')}
                class="flex items-center gap-1 px-2 py-1 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface text-label-sm text-[11px] transition-colors"
                title="Export raw session markdown"
              >
                <span class="material-symbols-outlined text-[15px]">file_download</span>
                <span class="hidden md:inline">Export</span>
              </button>

              <button
                onClick={() => addToast('warning', 'Cleared current memory window')}
                class="p-1.5 rounded hover:bg-surface-container text-on-surface-variant hover:text-error transition-colors"
                title="Clear current memory window"
              >
                <span class="material-symbols-outlined text-[16px]">delete_sweep</span>
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

          {/* Conversation Feed */}
          <div class="flex-1 overflow-y-auto p-4 space-y-4 font-body-md text-body-md text-on-surface">
            {/* System Status Pill */}
            <div class="flex justify-center my-2">
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container text-outline text-label-sm text-[11px]">
                <span class="w-1.5 h-1.5 rounded-full bg-secondary" />
                <span>
                  Connected to repository branch{' '}
                  <span class="text-on-surface font-code-inline">main@9c2fa7b</span> via Model
                  Context Protocol
                </span>
              </div>
            </div>

            {/* User Message */}
            <div class="flex flex-col items-end gap-1 max-w-3xl ml-auto">
              <div class="flex items-center gap-2 text-label-sm text-[11px] text-outline">
                <span>You</span>
                <span>12:28 PM</span>
              </div>
              <div
                class="p-3.5 rounded-2xl rounded-tr-sm bg-surface-container-high border border-outline-variant/30 text-on-surface text-sm max-w-2xl leading-relaxed"
                style={state.settings.chatColor ? { 'background-color': state.settings.chatColor } : {}}
              >
                Please verify our AWS production infrastructure state, run the dry-run terraform plan, and prepare the security review summary.
              </div>
            </div>

            {/* Agent Response */}
            <div class="flex flex-col items-start gap-1 max-w-3xl mr-auto">
              <div class="flex items-center gap-2 text-label-sm text-[11px] text-outline">
                <span class="font-semibold text-primary">{currentAgent()?.name}</span>
                <span>12:29 PM</span>
              </div>

              {/* Agent Thinking Box */}
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
                  <div class="p-3 font-mono text-[11px] text-on-surface-variant bg-surface-container-lowest/60 border-t border-outline-variant/20 space-y-1">
                    <div>1. Querying AWS credential status from local keychain...</div>
                    <div class="text-secondary">✓ Profile `prod-us-east` authenticated</div>
                    <div>2. Reading Terraform configurations in `infra/prod/`</div>
                    <div class="text-tertiary">3. Generating plan execution graph for cluster...</div>
                  </div>
                </Show>
              </div>

              {/* Agent Tool Step Execution Bubble */}
              <div class="w-full bg-surface-container border border-outline-variant/30 rounded-xl p-3.5 space-y-2.5 text-sm">
                <div class="flex items-center justify-between text-xs font-label-sm text-outline border-b border-outline-variant/20 pb-1.5">
                  <div class="flex items-center gap-1.5 text-primary">
                    <span class="material-symbols-outlined text-[15px]">terminal</span>
                    <span class="font-semibold">Tool Execution: CLI Command</span>
                  </div>
                  <span class="text-secondary">Completed (1.4s)</span>
                </div>

                <div class="bg-surface-container-lowest p-2.5 rounded font-mono text-[12px] text-on-surface border border-outline-variant/20">
                  <div class="text-outline">$ terraform plan -detailed-exitcode</div>
                  <div class="text-secondary mt-1">Plan: 2 to add, 1 to change, 0 to destroy.</div>
                  <div class="text-outline text-[11px]">Outputs: cluster_endpoint = "k8s-prod.us-east.openbot.run"</div>
                </div>

                <p class="leading-relaxed text-xs">
                  The infrastructure changes have been validated against our security baseline. The plan modifies our ingress security group to allow TLS 1.3 traffic and spins up 2 supplementary container nodes.
                </p>

                {/* Approval Prompt Card */}
                <div class="p-3 rounded-lg bg-surface-container-high border border-tertiary/40 flex flex-col gap-2 mt-2">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2 text-tertiary font-label-sm text-xs font-semibold">
                      <span class="material-symbols-outlined text-[16px]">verified</span>
                      <span>Action Approval Required</span>
                    </div>
                    <span class="text-[10px] font-label-sm text-outline">Expires in 15m</span>
                  </div>

                  <div class="text-xs text-on-surface font-mono bg-surface-container-lowest p-2 rounded">
                    terraform apply -auto-approve prod-us-east
                  </div>

                  <div class="flex items-center justify-between text-[11px] text-outline pt-1">
                    <span>Permissions requested: Network, Write files, Execution</span>
                    <div class="flex items-center gap-2">
                      <Show
                        when={!approvalHandled()}
                        fallback={
                          <span class="text-xs font-semibold text-secondary">
                            {approvalHandled()}
                          </span>
                        }
                      >
                        <button
                          onClick={() => {
                            setApprovalHandled('Declined');
                            addToast('warning', 'Action declined');
                          }}
                          class="px-2.5 py-1 rounded bg-surface-container hover:bg-error/20 hover:text-error text-on-surface text-xs font-medium transition-colors"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => {
                            setApprovalHandled('Approved & Executed');
                            addToast('success', 'Action approved and executed');
                          }}
                          class="px-3 py-1 rounded bg-primary text-on-primary text-xs font-semibold hover:brightness-110 transition-all"
                        >
                          Approve
                        </button>
                      </Show>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Composer Box */}
          <div class="p-3 bg-surface-container-low border-t border-outline-variant/30 flex-shrink-0">
            <div class="flex flex-col rounded-xl bg-surface-container border border-outline-variant/30 focus-within:border-primary/60 transition-colors shadow-sm">
              {/* Steer-while-working banner */}
              <div class="px-3 py-1 bg-surface-container-lowest/60 border-b border-outline-variant/20 flex items-center justify-between text-[11px] font-label-sm text-outline">
                <div class="flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-[13px] text-primary">navigation</span>
                  <span>Steer agents while working (active)</span>
                </div>
                <span>Send with {state.settings.sendShortcut === 'enter' ? 'Enter' : '⌘Enter'}</span>
              </div>

              {/* Textarea */}
              <textarea
                value={inputText()}
                onInput={(e) => setInputText(e.currentTarget.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${currentAgent()?.name}...`}
                rows={2}
                class="w-full p-3 bg-transparent border-0 outline-none resize-none font-body-sm text-sm text-on-surface placeholder:text-outline"
              />

              {/* Composer Controls Bar */}
              <div class="px-3 py-2 flex items-center justify-between flex-shrink-0">
                <div class="flex items-center gap-1">
                  {/* Model Chip */}
                  <button
                    onClick={() => addToast('success', 'Model picker')}
                    class="flex items-center gap-1 px-2 py-1 rounded bg-surface-container-high hover:bg-surface-container-highest text-outline hover:text-on-surface font-label-sm text-[11px] transition-colors"
                    title="Change Model"
                  >
                    <span class="material-symbols-outlined text-[13px] text-primary">smart_toy</span>
                    <span>{currentAgent()?.model}</span>
                    <span class="material-symbols-outlined text-[11px]">expand_more</span>
                  </button>

                  {/* Attachment button */}
                  <button
                    onClick={() => addToast('success', 'Attach file (100MB max per file)')}
                    class="p-1.5 rounded hover:bg-surface-container-high text-outline hover:text-on-surface transition-colors"
                    title="Attach file (MP3, MOV, MP4, ZIP, SVG, code)"
                  >
                    <span class="material-symbols-outlined text-[16px]">attach_file</span>
                  </button>

                  {/* Voice dictation button */}
                  <button
                    onClick={() => addToast('success', 'Voice dictation started')}
                    class="p-1.5 rounded hover:bg-surface-container-high text-outline hover:text-on-surface transition-colors"
                    title="Dictation (2 min limit)"
                  >
                    <span class="material-symbols-outlined text-[16px]">mic</span>
                  </button>
                </div>

                <div class="flex items-center gap-2">
                  <span class="text-[10px] font-label-sm text-outline hidden sm:inline">
                    {inputText().length} chars
                  </span>
                  <button
                    onClick={handleSend}
                    disabled={!inputText().trim()}
                    class={`px-3 py-1.5 rounded-lg flex items-center gap-1 font-semibold text-xs transition-all ${
                      inputText().trim()
                        ? 'bg-primary text-on-primary hover:brightness-110 press-scale'
                        : 'bg-surface-container-high text-outline opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <span>Send</span>
                    <span class="material-symbols-outlined text-[14px]">send</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Show>
      </div>

      {/* Right Side Panel */}
      <RightSidePanel />
    </main>
  );
};
