import { Component, onMount, onCleanup, For, Show } from 'solid-js';
import {
  state,
  setState,
  toggleTheme,
  openCreateAgentModal,
  loadProviderLiveStatusesAction,
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
  const isMac = () => (window as any).openbot?.platform === 'darwin';

  onMount(() => {
    // Load detected live provider statuses on start
    loadProviderLiveStatusesAction();

    // Listen to IPC events from main process
    if ((window as any).openbot?.onQuitRequest) {
      const unsub = (window as any).openbot.onQuitRequest(() => {
        setState('isQuitDialogOpen', true);
      });
      onCleanup(unsub);
    }

    if ((window as any).openbot?.onMenuEvent) {
      const unsubSettings = (window as any).openbot.onMenuEvent(
        'menu:open-settings',
        () => {
          setState('isSettingsOpen', true);
        }
      );
      const unsubNewAgent = (window as any).openbot.onMenuEvent(
        'menu:new-agent',
        () => {
          openCreateAgentModal();
        }
      );
      onCleanup(() => {
        unsubSettings();
        unsubNewAgent();
      });
    }
  });

  return (
    <div class="h-screen w-screen flex flex-col overflow-hidden bg-surface-container-lowest text-on-surface select-none">
      {/* Native-style Top Bar */}
      <header
        class="h-9 bg-surface-container-low z-40 flex items-center justify-between px-3 border-b border-outline-variant/30 flex-shrink-0"
        style={{ '-webkit-app-region': 'drag' } as any}
      >
        {/* Left side: traffic light padding on macOS or logo */}
        <div class="flex items-center gap-2" style={{ '-webkit-app-region': 'no-drag' } as any}>
          <Show when={isMac()}>
            <div class="flex items-center gap-1.5 px-1 mr-2">
              <div class="w-3 h-3 rounded-full bg-error-container/80 hover:bg-error-container" />
              <div class="w-3 h-3 rounded-full bg-tertiary-container/80 hover:bg-tertiary-container" />
              <div class="w-3 h-3 rounded-full bg-secondary-container/80 hover:bg-secondary-container" />
            </div>
          </Show>

          <div class="flex items-center gap-1.5 font-label-sm text-xs text-on-surface">
            <span class="material-symbols-outlined text-[16px] text-primary">terminal</span>
            <span class="font-bold tracking-tight">OpenBot</span>
            <span class="text-[10px] text-outline font-mono px-1 rounded bg-surface-container-high ml-1">
              v0.1.0-alpha
            </span>
          </div>
        </div>

        {/* Center: Window Title or Quick Search */}
        <button
          onClick={() => setState('isGlobalSearchOpen', true)}
          class="flex items-center gap-2 px-3 py-1 rounded-md bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 text-outline hover:text-on-surface text-xs font-body-sm transition-colors cursor-pointer"
          style={{ '-webkit-app-region': 'no-drag' } as any}
        >
          <span class="material-symbols-outlined text-[14px]">search</span>
          <span class="text-[11px]">Search agents, files, settings...</span>
          <span class="text-[9px] font-label-sm px-1 rounded bg-surface-container-highest">
            ⌘K
          </span>
        </button>

        {/* Right side controls: Theme quick-toggle & System items */}
        <div class="flex items-center gap-1" style={{ '-webkit-app-region': 'no-drag' } as any}>
          {/* Theme Quick Toggle */}
          <button
            onClick={() => toggleTheme()}
            class="w-7 h-7 rounded flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
            title="Toggle theme (Dark / Light)"
          >
            <span class="material-symbols-outlined text-[16px]">
              {state.settings.theme === 'light' ? 'dark_mode' : 'light_mode'}
            </span>
          </button>

          {/* Mobile Companion Quick Button */}
          <button
            onClick={() => setState('isMobileCompanionModalOpen', true)}
            class="w-7 h-7 rounded flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
            title="Mobile Companion (PIN & Live Activity)"
          >
            <span class="material-symbols-outlined text-[16px]">smartphone</span>
          </button>

          {/* Web Client Quick Button */}
          <button
            onClick={() => setState('isWebClientModalOpen', true)}
            class="w-7 h-7 rounded flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
            title="Web Client /app (Session Lock & Sandboxed Viewer)"
          >
            <span class="material-symbols-outlined text-[16px]">language</span>
          </button>

          {/* Settings Button */}
          <button
            onClick={() => setState('isSettingsOpen', true)}
            class="w-7 h-7 rounded flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
            title="Preferences"
          >
            <span class="material-symbols-outlined text-[16px]">settings</span>
          </button>
        </div>
      </header>

      {/* Main Multi-Pane Shell Workstation */}
      <div class="flex-1 flex flex-row overflow-hidden relative">
        {/* Leftmost Page Rail */}
        <PageRail />

        {/* Server Rail */}
        <ServerRail />

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
