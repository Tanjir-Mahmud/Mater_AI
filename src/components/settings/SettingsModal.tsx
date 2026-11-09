import { Component, createSignal, For, Show } from 'solid-js';
import { state, setState, toggleTheme, addToast } from '../../stores/appState';
import { SUPPORTED_LOCALES, i18n } from '../../shared/i18n';
import { AppTheme, SendShortcut, HoldCmdQMode, LogoColor } from '../../types';

interface SettingsTabItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  macOnly?: boolean;
}

const SETTINGS_TABS: SettingsTabItem[] = [
  { id: 'general', name: 'General', icon: 'tune', description: 'Control how OpenBot behaves on this computer.' },
  { id: 'agents', name: 'Agents', icon: 'smart_toy', description: 'Choose what the agents on this computer can do when you do not set it for an agent.' },
  { id: 'profile', name: 'Profile', icon: 'account_circle', description: 'Manage how you appear in OpenBot.' },
  { id: 'notifications', name: 'Notifications', icon: 'notifications', description: 'Choose how OpenBot alerts you.' },
  { id: 'voice', name: 'Voice', icon: 'mic', description: 'Dictation in the message box. Local models run on this computer; ElevenLabs and Groq run in the cloud.' },
  { id: 'dynamic_island', name: 'Dynamic Island', icon: 'dock_to_bottom', description: 'Show agent activity in the MacBook notch.', macOnly: true },
  { id: 'agent_dock', name: 'Agent Dock', icon: 'dock', description: 'Show agents at the screen edge, ready for a quick chat.', macOnly: true },
  { id: 'computer_use', name: 'Computer Use', icon: 'desktop_windows', description: "Let agents on this computer's OpenBot see and use its apps." },
  { id: 'billing', name: 'Billing', icon: 'credit_card', description: 'License, server plans, payment method and invoices.' },
  { id: 'mobile_connect', name: 'Mobile Connect', icon: 'smartphone', description: 'Sign in securely on your phone.' },
  { id: 'updates', name: 'Updates', icon: 'system_update_alt', description: 'Keep OpenBot current on this computer.' },
  { id: 'hosted_servers', name: 'Hosted servers', icon: 'cloud', description: 'Create OpenBot servers that run when this computer is off.' },
];

export const SettingsModal: Component = () => {
  const [searchQuery, setSearchQuery] = createSignal('');
  const isMac = () => (window as any).openbot?.platform === 'darwin';

  const visibleTabs = () => {
    return SETTINGS_TABS.filter((t) => !t.macOnly || isMac());
  };

  const currentTab = () => {
    return SETTINGS_TABS.find((t) => t.id === state.activeSettingsTab) || SETTINGS_TABS[0];
  };

  const updateSetting = <K extends keyof typeof state.settings>(
    key: K,
    value: typeof state.settings[K]
  ) => {
    setState('settings', key, value);
    if ((window as any).openbot?.saveSettings) {
      (window as any).openbot.saveSettings(state.settings);
    }
  };

  return (
    <Show when={state.isSettingsOpen}>
      <div
        class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs select-none p-4"
        onClick={() => setState('isSettingsOpen', false)}
      >
        <div
          class="w-[860px] h-[640px] max-w-full max-h-full bg-surface-container border border-outline-variant/40 rounded-2xl shadow-2xl flex overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Vertical Tabs Sidebar */}
          <div class="w-56 bg-surface-container-low border-r border-outline-variant/30 flex flex-col p-3 flex-shrink-0">
            {/* Header & Search */}
            <div class="flex items-center justify-between pb-3 border-b border-outline-variant/20 mb-2">
              <span class="font-headline-sm text-sm text-on-surface font-semibold">Settings</span>
              <button
                onClick={() => setState('isSettingsOpen', false)}
                class="p-1 rounded text-outline hover:text-on-surface hover:bg-surface-container"
              >
                <span class="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            <div class="flex items-center gap-1.5 px-2 py-1 rounded bg-surface-container border border-outline-variant/20 mb-2">
              <span class="material-symbols-outlined text-[14px] text-outline">search</span>
              <input
                type="text"
                placeholder="Search settings…"
                value={searchQuery()}
                onInput={(e) => setSearchQuery(e.currentTarget.value)}
                class="bg-transparent border-0 outline-none w-full font-body-sm text-xs text-on-surface placeholder:text-outline"
              />
            </div>

            {/* Tab items */}
            <div class="flex-1 overflow-y-auto space-y-0.5">
              <For each={visibleTabs()}>
                {(tab) => {
                  const isActive = () => state.activeSettingsTab === tab.id;
                  return (
                    <button
                      onClick={() => setState('activeSettingsTab', tab.id)}
                      class={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors font-body-sm text-xs ${
                        isActive()
                          ? 'bg-primary-container text-on-primary-container font-semibold shadow-xs'
                          : 'text-outline hover:text-on-surface hover:bg-surface-container'
                      }`}
                    >
                      <span class="material-symbols-outlined text-[16px]">{tab.icon}</span>
                      <span>{tab.name}</span>
                    </button>
                  );
                }}
              </For>
            </div>
          </div>

          {/* Settings Tab Content View */}
          <div class="flex-1 flex flex-col h-full overflow-hidden bg-surface-container">
            {/* Content Top Bar */}
            <div class="p-5 border-b border-outline-variant/20 flex-shrink-0">
              <h2 class="font-headline-sm text-base text-on-surface font-semibold">
                {currentTab().name}
              </h2>
              <p class="font-body-sm text-xs text-outline mt-0.5">
                {currentTab().description}
              </p>
            </div>

            {/* Scrollable Settings Rows */}
            <div class="flex-1 overflow-y-auto p-5 space-y-6">
              {/* TAB 1: GENERAL */}
              <Show when={state.activeSettingsTab === 'general'}>
                {/* Language */}
                <div class="flex items-center justify-between pb-4 border-b border-outline-variant/20">
                  <div>
                    <div class="font-medium text-xs text-on-surface">Language</div>
                    <div class="text-[11px] text-outline">OpenBot shows menus, buttons and messages in this language.</div>
                  </div>
                  <select
                    value={state.settings.language}
                    onChange={(e) => {
                      const l = e.currentTarget.value;
                      i18n.setLocale(l);
                      updateSetting('language', l);
                    }}
                    class="bg-surface-container-low border border-outline-variant/40 rounded px-2.5 py-1 text-xs text-on-surface outline-none"
                  >
                    <For each={SUPPORTED_LOCALES}>
                      {(loc) => <option value={loc.code}>{loc.nativeName} ({loc.name})</option>}
                    </For>
                  </select>
                </div>

                {/* Appearance / Theme */}
                <div class="flex items-center justify-between pb-4 border-b border-outline-variant/20">
                  <div>
                    <div class="font-medium text-xs text-on-surface">Appearance</div>
                    <div class="text-[11px] text-outline">Light or dark colours; System follows the device. Dark is default.</div>
                  </div>
                  <div class="flex items-center gap-1 bg-surface-container-low p-1 rounded-lg border border-outline-variant/30">
                    <button
                      onClick={() => toggleTheme('dark')}
                      class={`px-2.5 py-1 rounded text-xs transition-colors ${
                        state.settings.theme === 'dark' ? 'bg-primary text-on-primary font-semibold' : 'text-outline hover:text-on-surface'
                      }`}
                    >
                      Dark
                    </button>
                    <button
                      onClick={() => toggleTheme('light')}
                      class={`px-2.5 py-1 rounded text-xs transition-colors ${
                        state.settings.theme === 'light' ? 'bg-primary text-on-primary font-semibold' : 'text-outline hover:text-on-surface'
                      }`}
                    >
                      Light
                    </button>
                    <button
                      onClick={() => toggleTheme('system')}
                      class={`px-2.5 py-1 rounded text-xs transition-colors ${
                        state.settings.theme === 'system' ? 'bg-primary text-on-primary font-semibold' : 'text-outline hover:text-on-surface'
                      }`}
                    >
                      System
                    </button>
                  </div>
                </div>

                {/* Send Shortcut */}
                <div class="flex items-center justify-between pb-4 border-b border-outline-variant/20">
                  <div>
                    <div class="font-medium text-xs text-on-surface">Send shortcut</div>
                    <div class="text-[11px] text-outline">Key combination to send messages in the composer.</div>
                  </div>
                  <select
                    value={state.settings.sendShortcut}
                    onChange={(e) => updateSetting('sendShortcut', e.currentTarget.value as SendShortcut)}
                    class="bg-surface-container-low border border-outline-variant/40 rounded px-2.5 py-1 text-xs text-on-surface outline-none"
                  >
                    <option value="enter">Enter to send</option>
                    <option value="cmd-enter">⌘Enter / Ctrl+Enter to send</option>
                  </select>
                </div>

                {/* Show Agent Steps */}
                <div class="flex items-center justify-between pb-4 border-b border-outline-variant/20">
                  <div>
                    <div class="font-medium text-xs text-on-surface">Show agent steps</div>
                    <div class="text-[11px] text-outline">Open thinking, tool steps, and memory changes of each turn by default.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={state.settings.showAgentSteps}
                    onChange={(e) => updateSetting('showAgentSteps', e.currentTarget.checked)}
                    class="accent-primary cursor-pointer w-4 h-4"
                  />
                </div>

                {/* Keep this computer awake */}
                <div class="flex items-center justify-between pb-4 border-b border-outline-variant/20">
                  <div>
                    <div class="font-medium text-xs text-on-surface">Keep this computer awake</div>
                    <div class="text-[11px] text-outline">Routines run on time while connected to power; display can still turn off.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={state.settings.keepComputerAwake}
                    onChange={(e) => updateSetting('keepComputerAwake', e.currentTarget.checked)}
                    class="accent-primary cursor-pointer w-4 h-4"
                  />
                </div>

                {/* Also on battery */}
                <div class="flex items-center justify-between pb-4 border-b border-outline-variant/20">
                  <div>
                    <div class="font-medium text-xs text-on-surface">Also on battery</div>
                    <div class="text-[11px] text-outline">Keep awake while on battery power (runs down battery faster).</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={state.settings.keepAwakeOnBattery}
                    onChange={(e) => updateSetting('keepAwakeOnBattery', e.currentTarget.checked)}
                    class="accent-primary cursor-pointer w-4 h-4"
                  />
                </div>

                {/* Restore last workspace */}
                <div class="flex items-center justify-between pb-4 border-b border-outline-variant/20">
                  <div>
                    <div class="font-medium text-xs text-on-surface">Restore the last workspace on launch</div>
                    <div class="text-[11px] text-outline">Open the workspace and tasks from the previous session automatically.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={state.settings.restoreLastWorkspace}
                    onChange={(e) => updateSetting('restoreLastWorkspace', e.currentTarget.checked)}
                    class="accent-primary cursor-pointer w-4 h-4"
                  />
                </div>

                {/* Analytics */}
                <div class="flex items-center justify-between pb-4">
                  <div>
                    <div class="font-medium text-xs text-on-surface">Link analytics to my account</div>
                    <div class="text-[11px] text-outline">Share reliability metadata with your account. Never chats or files.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={state.settings.analyticsConsent === 'on'}
                    onChange={(e) => updateSetting('analyticsConsent', e.currentTarget.checked ? 'on' : 'off')}
                    class="accent-primary cursor-pointer w-4 h-4"
                  />
                </div>
              </Show>

              {/* TAB 2: AGENTS */}
              <Show when={state.activeSettingsTab === 'agents'}>
                <div class="space-y-4">
                  <div class="p-3.5 rounded-lg bg-surface-container-low border border-outline-variant/20">
                    <div class="font-semibold text-xs text-on-surface mb-1">Steer agents while they work</div>
                    <p class="text-[11px] text-outline mb-2">
                      New messages join the agent's current work instead of waiting in the queue.
                    </p>
                    <span class="text-xs font-semibold text-secondary">Default: On</span>
                  </div>

                  <div class="p-3.5 rounded-lg bg-surface-container-low border border-outline-variant/20">
                    <div class="font-semibold text-xs text-on-surface mb-1">Background processes</div>
                    <p class="text-[11px] text-outline mb-3">
                      Programs agents started and left running, such as dev servers. They keep running after chat ends and after quitting OpenBot.
                    </p>
                    <div class="p-3 rounded bg-surface-container text-xs text-outline text-center">
                      No programs from agents are running.
                    </div>
                  </div>
                </div>
              </Show>

              {/* TAB 9: BILLING */}
              <Show when={state.activeSettingsTab === 'billing'}>
                <div class="space-y-4">
                  <div class="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between">
                    <div>
                      <span class="px-2 py-0.5 rounded text-[10px] font-label-sm bg-primary/20 text-primary font-semibold uppercase">
                        Starter Plan
                      </span>
                      <h4 class="font-headline-sm text-sm text-on-surface mt-1">1 User Commercial Licence</h4>
                      <div class="text-[11px] text-outline">€10 / $12 / 40 zł per month</div>
                    </div>
                    <button
                      onClick={() => addToast('success', 'Stripe customer portal redirect')}
                      class="px-3.5 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-xs font-semibold"
                    >
                      Manage in Stripe
                    </button>
                  </div>
                </div>
              </Show>

              {/* TAB 11: UPDATES */}
              <Show when={state.activeSettingsTab === 'updates'}>
                <div class="space-y-4">
                  <div class="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between">
                    <div>
                      <div class="font-semibold text-xs text-on-surface">Update track: Stable</div>
                      <div class="text-[11px] text-outline mt-0.5">Version 0.1.0-alpha · OpenBot is up to date on the Stable track.</div>
                    </div>
                    <button
                      onClick={() => addToast('success', 'Checking Stable track for updates…')}
                      class="px-3.5 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:brightness-110"
                    >
                      Check for updates
                    </button>
                  </div>
                </div>
              </Show>

              {/* OTHER TABS PLACEHOLDER / REALISTIC DETAILS */}
              <Show when={!['general', 'agents', 'billing', 'updates'].includes(state.activeSettingsTab)}>
                <div class="p-6 rounded-xl bg-surface-container-low border border-outline-variant/20 text-center flex flex-col items-center justify-center gap-2">
                  <span class="material-symbols-outlined text-3xl text-outline">{currentTab().icon}</span>
                  <div class="font-semibold text-xs text-on-surface">{currentTab().name} Settings</div>
                  <p class="text-[11px] text-outline max-w-sm">{currentTab().description}</p>
                </div>
              </Show>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
};
