import { Component, createSignal, For, Show } from 'solid-js';
import {
  state,
  setState,
  addToast,
  openEditAgentModal,
  exportAgentTemplate,
} from '../../stores/appState';
import { i18n } from '../../shared/i18n';

export const RightSidePanel: Component = () => {
  const [panelWidth, setPanelWidth] = createSignal(380);

  const currentAgent = () =>
    state.agents.find((a) => a.id === state.selectedAgentId) || state.agents[0];

  const activeTab = () =>
    state.sidePanelTabs.find((t) => t.id === state.activeSidePanelTab) ||
    state.sidePanelTabs[0];

  const handleCloseTab = (tabId: string) => {
    const tabToClose = state.sidePanelTabs.find((t) => t.id === tabId);
    
    // Release action per spec
    if (tabToClose?.type === 'question') {
      addToast('warning', 'Question dismissed and cleaned up');
    } else if (tabToClose?.type === 'voice_conversation') {
      addToast('warning', 'Voice conversation ended');
    }

    const currentIndex = state.sidePanelTabs.findIndex((t) => t.id === tabId);
    const remainingTabs = state.sidePanelTabs.filter((t) => t.id !== tabId);
    setState('sidePanelTabs', remainingTabs);

    // Show pane next to closed tab, then first side thread, then last file tab, then first available
    if (state.activeSidePanelTab === tabId && remainingTabs.length > 0) {
      const nextTab =
        remainingTabs[currentIndex] ||
        remainingTabs[currentIndex - 1] ||
        remainingTabs.find((t) => t.type === 'side_thread') ||
        remainingTabs.slice().reverse().find((t) => t.type === 'files') ||
        remainingTabs[0];
      setState('activeSidePanelTab', nextTab.id);
    }
  };

  return (
    <Show when={state.sidePanelOpen}>
      <aside
        class={`h-full bg-surface-container-low border-l border-outline-variant/30 flex flex-col select-none transition-all duration-200 z-10 flex-shrink-0 ${
          state.sidePanelMaximized ? 'w-full' : ''
        }`}
        style={state.sidePanelMaximized ? {} : { width: `${panelWidth()}px` }}
        aria-label="Right Side Panel"
      >
        {/* Header with Tabs and Actions */}
        <div class="h-10 bg-surface-container border-b border-outline-variant/30 flex items-center justify-between px-2 flex-shrink-0">
          {/* Scrollable Tabs */}
          <div class="flex items-center gap-1 overflow-x-auto flex-1 h-full py-1">
            <For each={state.sidePanelTabs}>
              {(tab) => {
                const isActive = () => state.activeSidePanelTab === tab.id;
                return (
                  <div
                    onClick={() => setState('activeSidePanelTab', tab.id)}
                    class={`h-full px-2.5 rounded-md flex items-center gap-1.5 cursor-pointer text-xs font-body-sm transition-colors group ${
                      isActive()
                        ? 'bg-surface-container-high text-on-surface font-semibold shadow-xs'
                        : 'text-outline hover:text-on-surface hover:bg-surface-container-high/40'
                    }`}
                  >
                    <span class="material-symbols-outlined text-[15px]">{tab.icon}</span>
                    <span class="truncate max-w-[110px]">{tab.title}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCloseTab(tab.id);
                      }}
                      class="w-3.5 h-3.5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-surface-container-highest transition-opacity"
                      title={i18n.t('panel.close')}
                    >
                      <span class="material-symbols-outlined text-[11px]">close</span>
                    </button>
                  </div>
                );
              }}
            </For>
          </div>

          {/* Action buttons: Maximize / Collapse / Close */}
          <div class="flex items-center gap-1 pl-1 border-l border-outline-variant/20">
            <button
              onClick={() => setState('sidePanelMaximized', !state.sidePanelMaximized)}
              class="w-6 h-6 rounded flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors"
              title={state.sidePanelMaximized ? 'Restore width' : 'Maximize panel'}
            >
              <span class="material-symbols-outlined text-[14px]">
                {state.sidePanelMaximized ? 'collapse_content' : 'expand_content'}
              </span>
            </button>

            <button
              onClick={() => setState('sidePanelOpen', false)}
              class="w-6 h-6 rounded flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors"
              title={i18n.t('panel.collapse')}
            >
              <span class="material-symbols-outlined text-[15px]">vertical_split</span>
            </button>
          </div>
        </div>

        {/* Tab Content Display */}
        <div class="flex-1 overflow-y-auto p-3 flex flex-col font-body-sm text-on-surface">
          {/* PANE 1: AGENT SETTINGS */}
          <Show when={activeTab()?.type === 'agent_settings'}>
            <div class="flex flex-col gap-3">
              <div class="flex items-center justify-between pb-1.5 border-b border-outline-variant/20">
                <span class="font-headline-sm text-xs font-semibold text-on-surface">
                  Agent Settings: {currentAgent()?.name}
                </span>
                <span class="text-[10px] font-label-sm text-secondary flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-secondary" />
                  Active
                </span>
              </div>

              {/* Action buttons */}
              <div class="flex items-center gap-2">
                <button
                  onClick={() => openEditAgentModal(currentAgent()!.id)}
                  type="button"
                  class="flex-1 py-1.5 px-3 rounded-lg bg-primary text-on-primary text-xs font-semibold flex items-center justify-center gap-1.5 hover:brightness-110 shadow-xs transition-all"
                >
                  <span class="material-symbols-outlined text-[15px]">edit</span>
                  <span>Edit Configuration</span>
                </button>
                <button
                  onClick={() => exportAgentTemplate(currentAgent()!.id)}
                  type="button"
                  class="py-1.5 px-3 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-outline hover:text-on-surface text-xs font-label-sm flex items-center gap-1 transition-colors"
                  title="Export Public Template"
                >
                  <span class="material-symbols-outlined text-[15px]">bookmark_add</span>
                  <span>Template</span>
                </button>
              </div>

              <div class="space-y-2.5 text-xs">
                <div>
                  <label class="text-outline font-label-sm text-[11px] block mb-1">Model & Provider</label>
                  <div class="p-2 rounded bg-surface-container border border-outline-variant/30 font-mono text-[11px] text-primary flex items-center justify-between">
                    <span>{currentAgent()?.model}</span>
                    <span class="text-[10px] text-outline uppercase">{currentAgent()?.provider}</span>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="text-outline font-label-sm text-[11px] block mb-1">Reasoning Level</label>
                    <div class="p-2 rounded bg-surface-container border border-outline-variant/30 text-[11px] capitalize">
                      {currentAgent()?.reasoningLevel}
                    </div>
                  </div>
                  <div>
                    <label class="text-outline font-label-sm text-[11px] block mb-1">Notification Level</label>
                    <div class="p-2 rounded bg-surface-container border border-outline-variant/30 text-[11px] capitalize">
                      {currentAgent()?.notificationLevel}
                    </div>
                  </div>
                </div>

                <div>
                  <label class="text-outline font-label-sm text-[11px] block mb-1">Browser Profile</label>
                  <div class="p-2 rounded bg-surface-container border border-outline-variant/30 text-[11px]">
                    {currentAgent()?.browserProfile === 'shared' ? 'Shared' : 'Only this agent'}
                  </div>
                </div>

                <div>
                  <label class="text-outline font-label-sm text-[11px] block mb-1">Workspace Path</label>
                  <div class="p-2 rounded bg-surface-container-lowest border border-outline-variant/30 font-mono text-[10px] text-outline truncate">
                    {currentAgent()?.workspacePath}
                  </div>
                </div>

                {/* 4 Generated Sections Review */}
                <div class="pt-2 border-t border-outline-variant/20 flex flex-col gap-2">
                  <span class="font-label-sm text-[10px] text-outline uppercase tracking-wider font-semibold">
                    Synthesized Sections
                  </span>

                  <div class="p-2 rounded bg-surface-container border border-outline-variant/20 flex flex-col gap-1">
                    <span class="text-primary font-semibold text-[11px]">1. System Directive</span>
                    <p class="text-[11px] text-on-surface-variant leading-relaxed line-clamp-3">
                      {currentAgent()?.sections?.systemDirective || 'Operate autonomously as an AI teammate.'}
                    </p>
                  </div>

                  <div class="p-2 rounded bg-surface-container border border-outline-variant/20 flex flex-col gap-1">
                    <span class="text-secondary font-semibold text-[11px]">2. Execution Boundaries</span>
                    <p class="text-[11px] text-on-surface-variant leading-relaxed line-clamp-3">
                      {currentAgent()?.sections?.executionBoundaries || 'Confined to agent workspace directory.'}
                    </p>
                  </div>

                  <div class="p-2 rounded bg-surface-container border border-outline-variant/20 flex flex-col gap-1">
                    <span class="text-tertiary font-semibold text-[11px]">3. Memory Policy</span>
                    <p class="text-[11px] text-on-surface-variant leading-relaxed line-clamp-3">
                      {currentAgent()?.sections?.memoryPolicy || 'Persist essential invariants; review every 20 turns.'}
                    </p>
                  </div>

                  <div class="p-2 rounded bg-surface-container border border-outline-variant/20 flex flex-col gap-1">
                    <span class="text-outline font-semibold text-[11px]">4. Fallback Strategies</span>
                    <p class="text-[11px] text-on-surface-variant leading-relaxed line-clamp-3">
                      {currentAgent()?.sections?.fallbackStrategies || 'On execution failure, log diagnostics and retry.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Show>

          {/* PANE 2: FILES */}
          <Show when={activeTab()?.type === 'files'}>
            <div class="flex flex-col gap-1.5 font-label-sm text-[12px]">
              <div class="text-outline text-[11px] uppercase tracking-wider font-semibold mb-1">
                Workspace & Transfer Files
              </div>
              <div class="flex items-center justify-between p-2 rounded bg-surface-container hover:bg-surface-container-high cursor-pointer transition-colors">
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined text-[16px] text-primary">description</span>
                  <span>feature-spec.md</span>
                </div>
                <span class="text-[10px] text-outline">14.2 KB</span>
              </div>
              <div class="flex items-center justify-between p-2 rounded bg-surface-container hover:bg-surface-container-high cursor-pointer transition-colors">
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined text-[16px] text-secondary">folder_zip</span>
                  <span>build-snapshot.zip</span>
                </div>
                <span class="text-[10px] text-outline">2.8 MB</span>
              </div>
              <div class="flex items-center justify-between p-2 rounded bg-surface-container hover:bg-surface-container-high cursor-pointer transition-colors">
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined text-[16px] text-tertiary">image</span>
                  <span>diagram-workflow.svg</span>
                </div>
                <span class="text-[10px] text-outline">48 KB</span>
              </div>
            </div>
          </Show>

          {/* PANE 3: FILE PREVIEW */}
          <Show when={activeTab()?.type === 'file_preview'}>
            <div class="flex flex-col h-full gap-2 text-xs">
              <div class="flex items-center justify-between p-2 rounded bg-surface-container border border-outline-variant/20">
                <div class="flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-primary text-[16px]">description</span>
                  <span class="font-semibold text-on-surface">feature-spec.md</span>
                </div>
                <span class="text-[10px] font-mono text-outline">SHA-256: 9c2fa7...</span>
              </div>
              <div class="flex-1 p-3 rounded bg-surface-container-lowest border border-outline-variant/20 font-mono text-[11px] text-on-surface-variant overflow-y-auto space-y-1">
                <div class="text-primary"># OpenBot Feature Specification</div>
                <div class="text-outline">Clean-room rebuild from behavior spec.</div>
                <div>- All agents persist in local workspaces</div>
                <div>- SQLite canonical store with migrations</div>
                <div>- Translatable UI across 15 languages</div>
              </div>
            </div>
          </Show>

          {/* PANE 4: SIDE THREAD */}
          <Show when={activeTab()?.type === 'side_thread'}>
            <div class="flex flex-col h-full gap-2">
              <div class="flex items-center justify-between pb-1.5 border-b border-outline-variant/20 text-xs">
                <span class="font-semibold text-on-surface">Side Thread #1</span>
                <span class="text-[10px] text-outline">Branch of main thread</span>
              </div>
              <div class="flex-1 p-3 rounded bg-surface-container-lowest border border-outline-variant/20 text-xs text-outline space-y-2 overflow-y-auto">
                <div class="p-2 rounded bg-surface-container text-on-surface">
                  <span class="font-semibold text-primary">User:</span> Verify isolated edge test case.
                </div>
                <div class="p-2 rounded bg-surface-container-high text-on-surface">
                  <span class="font-semibold text-secondary">Kestrel:</span> Test completed in isolated work tree without affecting main branch.
                </div>
              </div>
            </div>
          </Show>

          {/* PANE 5: VOICE CONVERSATION */}
          <Show when={activeTab()?.type === 'voice_conversation'}>
            <div class="flex flex-col items-center justify-center h-full p-6 text-center gap-3">
              <div class="w-14 h-14 rounded-full bg-primary/20 text-primary flex items-center justify-center animate-pulse">
                <span class="material-symbols-outlined text-3xl">mic</span>
              </div>
              <div class="font-semibold text-sm text-on-surface">Voice Conversation</div>
              <p class="text-xs text-outline max-w-xs">
                Local on-device transcription with Parakeet STT. Speak clearly into your microphone.
              </p>
              <button
                onClick={() => handleCloseTab(activeTab()!.id)}
                class="px-3.5 py-1.5 rounded-lg bg-surface-container-high hover:bg-error/20 hover:text-error text-xs font-semibold transition-colors mt-2"
              >
                End Voice Session
              </button>
            </div>
          </Show>

          {/* PANE 6: QUESTION PANE */}
          <Show when={activeTab()?.type === 'question'}>
            <div class="flex flex-col gap-3 p-2">
              <div class="flex items-center gap-2 text-tertiary font-semibold text-xs">
                <span class="material-symbols-outlined text-[16px]">help</span>
                <span>Agent Question</span>
              </div>
              <div class="p-3 rounded-lg bg-surface-container border border-tertiary/30 text-xs leading-relaxed">
                Should I apply the updated CORS headers to the staging environment before publishing?
              </div>
              <div class="flex flex-col gap-1.5 pt-1">
                <button
                  onClick={() => handleCloseTab(activeTab()!.id)}
                  class="p-2 rounded bg-surface-container-high hover:bg-primary hover:text-on-primary text-xs font-medium text-left transition-colors"
                >
                  Yes, deploy to staging first
                </button>
                <button
                  onClick={() => handleCloseTab(activeTab()!.id)}
                  class="p-2 rounded bg-surface-container-high hover:bg-primary hover:text-on-primary text-xs font-medium text-left transition-colors"
                >
                  No, proceed directly to production
                </button>
              </div>
            </div>
          </Show>

          {/* PANE 7: SUBAGENTS */}
          <Show when={activeTab()?.type === 'subagent'}>
            <div class="flex flex-col gap-2">
              <div class="font-semibold text-xs text-outline uppercase tracking-wider mb-1">
                Delegated Subagent Tasks
              </div>
              <div class="p-2.5 rounded bg-surface-container border border-outline-variant/20 flex flex-col gap-1 text-xs">
                <div class="flex items-center justify-between">
                  <span class="font-semibold text-on-surface">Security Scanner Subagent</span>
                  <span class="text-secondary font-label-sm text-[10px]">Complete</span>
                </div>
                <p class="text-[11px] text-outline">
                  Scanned 14 files for OWASP Top 10 vulnerabilities. No critical issues detected.
                </p>
              </div>
            </div>
          </Show>
        </div>
      </aside>
    </Show>
  );
};
