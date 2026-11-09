import { Component, createSignal, For, Show } from 'solid-js';
import { state, setState, closeSidePanelTab } from '../../stores/appState';
import { i18n } from '../../shared/i18n';

export const RightSidePanel: Component = () => {
  const [panelWidth, setPanelWidth] = createSignal(380);

  const activeTab = () =>
    state.sidePanelTabs.find((t) => t.id === state.activeSidePanelTab) ||
    state.sidePanelTabs[0];

  const handleCloseTab = (tabId: string) => {
    closeSidePanelTab(tabId);
  };

  return (
    <Show when={state.sidePanelOpen}>
      <aside
        class={`h-full bg-surface-container-low border-l border-outline-variant/30 flex flex-col select-none transition-all duration-200 z-10 flex-shrink-0 ${
          state.sidePanelMaximized ? 'w-full' : ''
        }`}
        style={state.sidePanelMaximized ? {} : { width: `${panelWidth()}px` }}
        aria-label="Side Inspector Panel"
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
                    <span class="truncate max-w-[100px]">{tab.title}</span>
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
          <Show when={activeTab()?.type === 'terminal'}>
            <div class="flex flex-col h-full gap-2 font-mono text-[11px]">
              <div class="flex items-center justify-between text-outline border-b border-outline-variant/20 pb-1.5 font-label-sm">
                <span>Process: zsh (PID 48921)</span>
                <span class="text-secondary flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                  Active
                </span>
              </div>
              <div class="flex-1 bg-surface-container-lowest p-2.5 rounded border border-outline-variant/20 overflow-y-auto space-y-1 text-on-surface-variant">
                <div class="text-outline"># Connected to workspace sandbox</div>
                <div>$ git status --short</div>
                <div class="text-secondary">M src/app.tsx</div>
                <div class="text-secondary">?? config/agent.json</div>
                <div class="text-primary">$ pnpm test:run</div>
                <div>[OpenBot] Running test suites...</div>
                <div class="text-secondary">✓ 42 tests passed (380ms)</div>
                <div class="text-tertiary">➜ Local dev server ready on http://127.0.0.1:3000</div>
              </div>
            </div>
          </Show>

          <Show when={activeTab()?.type === 'browser'}>
            <div class="flex flex-col h-full gap-2">
              <div class="flex items-center gap-1.5 bg-surface-container p-1.5 rounded border border-outline-variant/20 text-xs">
                <span class="material-symbols-outlined text-[15px] text-outline">language</span>
                <input
                  type="text"
                  value="https://status.openbot.run"
                  class="bg-transparent border-0 outline-none w-full text-on-surface font-mono text-[11px]"
                  readonly
                />
                <button class="p-1 rounded text-outline hover:text-on-surface">
                  <span class="material-symbols-outlined text-[14px]">refresh</span>
                </button>
              </div>
              <div class="flex-1 rounded border border-outline-variant/30 bg-surface-container-lowest flex flex-col items-center justify-center p-6 text-center text-outline">
                <span class="material-symbols-outlined text-4xl mb-2 text-primary">public</span>
                <div class="font-semibold text-on-surface">Sandboxed Browser Session</div>
                <p class="text-[11px] max-w-xs mt-1">
                  Isolated session profile `Shared`. Agents can inspect DOM, navigate, and download safely to Downloads folder.
                </p>
              </div>
            </div>
          </Show>

          <Show when={activeTab()?.type === 'files'}>
            <div class="flex flex-col gap-1.5 font-label-sm text-[12px]">
              <div class="text-outline text-[11px] uppercase tracking-wider font-semibold mb-1">
                Session Artifacts & Transfers
              </div>
              <div class="flex items-center justify-between p-2 rounded bg-surface-container hover:bg-surface-container-high cursor-pointer transition-colors">
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined text-[16px] text-primary">description</span>
                  <span>feature-architecture.md</span>
                </div>
                <span class="text-[10px] text-outline">14.2 KB</span>
              </div>
              <div class="flex items-center justify-between p-2 rounded bg-surface-container hover:bg-surface-container-high cursor-pointer transition-colors">
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined text-[16px] text-secondary">folder_zip</span>
                  <span>build-snapshot-v1.zip</span>
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

          <Show when={activeTab()?.type === 'subagent' || activeTab()?.type === 'inspect'}>
            <div class="flex flex-col gap-3">
              <div class="font-semibold text-xs text-outline uppercase tracking-wider">
                Agent Context & Parameters
              </div>
              <div class="p-3 rounded bg-surface-container border border-outline-variant/20 flex flex-col gap-2 text-xs">
                <div class="flex justify-between">
                  <span class="text-outline">Active Provider</span>
                  <span class="font-mono text-primary font-semibold">Anthropic (Claude 3.5)</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-outline">Reasoning Level</span>
                  <span>High</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-outline">Context Window</span>
                  <span>42.4K / 200K (21%)</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-outline">Memory Review Cadence</span>
                  <span>Every 20 turns</span>
                </div>
              </div>
            </div>
          </Show>
        </div>
      </aside>
    </Show>
  );
};
