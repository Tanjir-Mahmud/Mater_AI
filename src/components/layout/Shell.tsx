import { Component, onMount, onCleanup, For, Show, createSignal } from 'solid-js';
import {
  state,
  setState,
  toggleTheme,
  openCreateAgentModal,
  loadProviderLiveStatusesAction,
  addToast,
} from '../../stores/appState';
import { PageRail } from '../navigation/PageRail';
import { ServerRail } from '../navigation/ServerRail';
import { Sidebar } from '../sidebar/Sidebar';
import { MainWorkspace } from '../workspace/MainWorkspace';
import { LoadingScreen } from '../loading/LoadingScreen';
import { OnboardingModal } from '../onboarding/OnboardingModal';
import { SettingsModal } from '../settings/SettingsModal';
import { GlobalSearchModal } from '../dialogs/GlobalSearchModal';
import { QuitConfirmDialog } from '../dialogs/QuitConfirmDialog';
import { AgentSetupModal } from '../modals/AgentSetupModal';
import { MobileCompanionModal } from '../mobile/MobileCompanionModal';
import { WebClientModal } from '../web/WebClientModal';

export const Shell: Component = () => {
  const [isServerDropdownOpen, setIsServerDropdownOpen] = createSignal(false);
  const getApi = () => (window as any).bissbot;
  const isMac = () => getApi()?.platform === 'darwin';

  const currentServer = () =>
    state.servers.find((s) => s.id === state.selectedServerId) || state.servers[0];

  const currentAgent = () =>
    state.agents.find((a) => a.id === state.selectedAgentId) || state.agents[0];

  onMount(() => {
    // Load detected live provider statuses on start
    loadProviderLiveStatusesAction();

    // Listen to IPC events from main process
    const api = getApi();
    if (api?.onQuitRequest) {
      const unsub = api.onQuitRequest(() => {
        setState('isQuitDialogOpen', true);
      });
      onCleanup(unsub);
    }

    if (api?.onMenuEvent) {
      const unsubSettings = api.onMenuEvent('menu:open-settings', () => {
        setState('isSettingsOpen', true);
      });
      const unsubNewAgent = api.onMenuEvent('menu:new-agent', () => {
        openCreateAgentModal();
      });
      onCleanup(() => {
        unsubSettings();
        unsubNewAgent();
      });
    }
  });

  return (
    <div class="h-screen w-screen flex flex-col overflow-hidden bg-surface-container-lowest text-on-surface select-none">
      {/* Native-style Top Bar matching New folder design */}
      <header
        class="h-10 bg-[#09090b] z-40 flex items-center justify-between px-3 border-b border-zinc-800/60 flex-shrink-0"
        style={{ '-webkit-app-region': 'drag' } as any}
      >
        {/* Left side: Logo, Server Selector Dropdown, Nav Arrows, and Active Tab Pill */}
        <div class="flex items-center gap-2" style={{ '-webkit-app-region': 'no-drag' } as any}>
          <Show when={isMac()}>
            <div class="flex items-center gap-1.5 px-1 mr-2">
              <div class="w-3 h-3 rounded-full bg-error-container/80 hover:bg-error-container" />
              <div class="w-3 h-3 rounded-full bg-tertiary-container/80 hover:bg-tertiary-container" />
              <div class="w-3 h-3 rounded-full bg-secondary-container/80 hover:bg-secondary-container" />
            </div>
          </Show>

          {/* BissBot Purple Squircle Logo with Twin Dashes */}
          <div
            onClick={() => setState('activePage', 'agents')}
            class="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center text-white font-mono font-bold text-xs shadow-sm cursor-pointer hover:brightness-110 transition-all select-none"
            title="BissBot"
          >
            --
          </div>

          {/* Server Selector Dropdown */}
          <div class="relative">
            <button
              onClick={() => setIsServerDropdownOpen(!isServerDropdownOpen())}
              class="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#141418] hover:bg-[#18181d] text-xs text-zinc-200 border border-zinc-700/50 transition-colors cursor-pointer"
              title="Select server"
            >
              <span class="w-2 h-2 rounded-full bg-emerald-400" />
              <span class="font-medium text-xs">
                {currentServer()?.isLocal ? 'Local' : currentServer()?.name}
              </span>
              <span class="text-[10px] text-zinc-400 font-mono">⬍</span>
            </button>

            <Show when={isServerDropdownOpen()}>
              <div
                class="fixed inset-0 z-40"
                onClick={() => setIsServerDropdownOpen(false)}
              />
              <div class="absolute left-0 top-full mt-1 w-48 bg-[#141418] border border-zinc-700/60 rounded-xl shadow-2xl p-1 z-50 flex flex-col gap-0.5 animate-in fade-in duration-100">
                <div class="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                  Servers
                </div>
                <For each={state.servers}>
                  {(server) => (
                    <button
                      onClick={() => {
                        setState('selectedServerId', server.id);
                        setIsServerDropdownOpen(false);
                      }}
                      class={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors ${
                        server.id === state.selectedServerId
                          ? 'bg-purple-600/20 text-purple-300 font-semibold'
                          : 'hover:bg-zinc-800 text-zinc-200'
                      }`}
                    >
                      <div class="flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>{server.isLocal ? 'Local' : server.name}</span>
                      </div>
                      <span class="text-[10px] font-mono text-zinc-500 uppercase">
                        {server.isLocal ? 'HOST' : 'REMOTE'}
                      </span>
                    </button>
                  )}
                </For>
              </div>
            </Show>
          </div>

          {/* Browser Navigation Controls */}
          <div class="flex items-center gap-0.5 text-zinc-400 ml-1">
            <button
              onClick={() => addToast('info', 'History back')}
              class="w-6 h-6 rounded flex items-center justify-center hover:bg-zinc-800 hover:text-zinc-200 text-xs transition-colors cursor-pointer"
              title="Back"
            >
              ←
            </button>
            <button
              onClick={() => addToast('info', 'History forward')}
              class="w-6 h-6 rounded flex items-center justify-center hover:bg-zinc-800 hover:text-zinc-200 text-xs transition-colors cursor-pointer"
              title="Forward"
            >
              →
            </button>
            <button
              onClick={openCreateAgentModal}
              class="w-6 h-6 rounded flex items-center justify-center hover:bg-zinc-800 hover:text-zinc-200 text-xs transition-colors cursor-pointer"
              title="New tab / agent"
            >
              +
            </button>
          </div>

          {/* Active Tab Pill */}
          <div class="flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#18181d] border border-zinc-700/60 text-xs text-zinc-200 font-medium shadow-xs ml-1">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span class="truncate max-w-[140px]">{currentAgent()?.name || 'Research Desk'}</span>
            <button
              onClick={() => addToast('info', 'Tab preserved in sidebar')}
              class="text-zinc-500 hover:text-zinc-300 text-[10px] ml-1 cursor-pointer"
              title="Close tab"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Center: Dual-Rate Network Speed Monitor */}
        <div
          class="flex items-center gap-3 px-3 py-1 rounded-full bg-[#101013] border border-zinc-800/80 text-[11px] font-mono select-none"
          style={{ '-webkit-app-region': 'no-drag' } as any}
        >
          <span class="text-zinc-400 flex items-center gap-1">
            <span class="text-amber-400 font-bold">↑</span> 0.0 KBps
          </span>
          <span class="text-emerald-400 flex items-center gap-1 font-medium">
            <span class="text-emerald-400 font-bold">↓</span> 0.1 KBps
          </span>
        </div>

        {/* Right side controls: Model Pill, Side Inspector Toggle, Search, Settings */}
        <div class="flex items-center gap-1.5" style={{ '-webkit-app-region': 'no-drag' } as any}>
          {/* Active Model Pill */}
          <button
            onClick={() => {
              setState('activeSettingsTab', 'models');
              setState('isSettingsOpen', true);
            }}
            class="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#141418] hover:bg-[#18181d] text-xs text-zinc-200 border border-zinc-700/50 transition-colors cursor-pointer"
            title="Active Model (Gemini 3.8 Flash)"
          >
            <span class="text-purple-400 text-xs">✦</span>
            <span class="font-medium text-xs">{currentAgent()?.model || 'Gemini 3.8 Flash'} · Medium</span>
            <span class="text-[10px] text-zinc-400">⌄</span>
          </button>

          {/* Side Inspector Split Toggle Button */}
          <button
            onClick={() => setState('sidePanelOpen', !state.sidePanelOpen)}
            class={`w-7 h-7 rounded flex items-center justify-center transition-colors cursor-pointer ${
              state.sidePanelOpen
                ? 'bg-purple-600/30 text-purple-300'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
            title="Toggle side inspector"
          >
            <span class="text-sm font-mono leading-none">◨</span>
          </button>

          {/* Quick Search */}
          <button
            onClick={() => setState('isGlobalSearchOpen', true)}
            class="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#141418] hover:bg-[#18181d] border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs transition-colors cursor-pointer"
            title="Search (⌘K)"
          >
            <span class="material-symbols-outlined text-[14px]">search</span>
            <span class="text-[9px] font-mono px-1 rounded bg-zinc-800 text-zinc-400">⌘K</span>
          </button>

          {/* Theme Quick Toggle */}
          <button
            onClick={() => toggleTheme()}
            class="w-7 h-7 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Toggle theme (Dark / Light)"
          >
            <span class="material-symbols-outlined text-[16px]">
              {state.settings.theme === 'light' ? 'dark_mode' : 'light_mode'}
            </span>
          </button>

          {/* Settings Button */}
          <button
            onClick={() => setState('isSettingsOpen', true)}
            class="w-7 h-7 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Preferences"
          >
            <span class="material-symbols-outlined text-[16px]">settings</span>
          </button>
        </div>
      </header>

      {/* Main Multi-Pane Shell Workstation */}
      <div class="flex-1 flex flex-row overflow-hidden relative">
        {/* Single Leftmost Page Rail matching New folder layout */}
        <PageRail />

        {/* Optional Server Rail (shown when enabled or toggled) */}
        <Show when={state.isServerRailVisible}>
          <ServerRail />
        </Show>

        {/* Agent Navigation Sidebar */}
        <Sidebar />

        {/* Main Center Workspace (Chat + Inspector) */}
        <MainWorkspace />
      </div>

      {/* Floating Action Toasts */}
      <div class="fixed bottom-4 right-4 z-[150] flex flex-col gap-2 pointer-events-none">
        <For each={state.toasts}>
          {(toast) => (
            <div
              class={`pointer-events-auto p-3 rounded-lg border shadow-2xl flex items-center gap-2.5 text-xs font-body-sm animate-in slide-in-from-bottom-2 duration-150 ${
                toast.type === 'success'
                  ? 'bg-surface-container border-secondary/40 text-on-surface'
                  : toast.type === 'warning'
                  ? 'bg-surface-container border-tertiary/40 text-on-surface'
                  : 'bg-surface-container border-error/40 text-on-surface'
              }`}
            >
              <span
                class={`material-symbols-outlined text-[16px] ${
                  toast.type === 'success'
                    ? 'text-secondary'
                    : toast.type === 'warning'
                    ? 'text-tertiary'
                    : 'text-error'
                }`}
              >
                {toast.type === 'success'
                  ? 'check_circle'
                  : toast.type === 'warning'
                  ? 'warning'
                  : 'error'}
              </span>
              <div class="flex flex-col">
                <span class="font-semibold">{toast.title}</span>
                <Show when={toast.message}>
                  <span class="text-[11px] text-outline">{toast.message}</span>
                </Show>
              </div>
            </div>
          )}
        </For>
      </div>

      {/* Overlays */}
      <LoadingScreen />
      <OnboardingModal />
      <SettingsModal />
      <GlobalSearchModal />
      <QuitConfirmDialog />
      <MobileCompanionModal />
      <WebClientModal />
      <Show when={state.isAgentSetupModalOpen}>
        <AgentSetupModal />
      </Show>
    </div>
  );
};
