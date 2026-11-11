import { Component, createSignal, createEffect, For, Show } from 'solid-js';
import {
  state,
  setState,
  toggleTheme,
  addToast,
  stopBackgroundProcessAction,
  addMCPServerAction,
  testMCPServerAction,
  removeMCPServerAction,
  saveMCPServersAction,
  toggleComputerUseAction,
  setPublishStateAction,
  rotateServerKeyAction,
  restartServerAction,
  inviteServerMemberAction,
  removeServerMemberAction,
  createRemoteDesktopTestAction,
  verifyRemoteDesktopTestAction,
  stopAllRemoteControlAction,
  connectConnectorAction,
  disconnectConnectorAction,
  updateMessagingConnectionAction,
  connectWhatsAppBaileysAction,
  disconnectWhatsAppBaileysAction,
  updateVoiceSettingsAction,
  saveVoiceApiKeyAction,
  removeVoiceApiKeyAction,
  configureVoiceServerAction,
  publishHostedSiteAction,
  deleteHostedSiteAction,
  loadUserProfile,
  loadAccountSessions,
  disconnectSessionAction,
  loadExtendedSSO,
  verifySSODNSAction,
  generateSCIMTokenAction,
  revokeSCIMTokenAction,
  testBrowserSSOAction,
  loadMobileConnect,
  generateMobileCodeAction,
  replaceMobileLinkAction,
  revokeMobileLinkAction,
  loadBillingState,
  recordLicenceAcceptanceAction,
  cancelHostedSubscriptionAction,
  openStripePortalAction,
  openStripeCheckoutAction,
  checkOfflineGraceAction,
} from '../../stores/appState';
import { SUPPORTED_LOCALES, i18n } from '../../shared/i18n';
import { AppTheme, SendShortcut, HoldCmdQMode, LogoColor, ServerRole } from '../../types';

interface SettingsTabItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  macOnly?: boolean;
}

const SETTINGS_TABS: SettingsTabItem[] = [
  { id: 'general', name: 'General', icon: 'tune', description: 'Control how OpenBot behaves on this computer.' },
  { id: 'server_general', name: 'Server General', icon: 'dns', description: 'Server identity, logo, timezone and key rotation.' },
  { id: 'members', name: 'Members', icon: 'group', description: 'Publish server, invite teammates, and manage server roles.' },
  { id: 'roles', name: 'Roles & Access', icon: 'admin_panel_settings', description: 'Configure per-agent access levels (none/view/chat/manage).' },
  { id: 'audit_log', name: 'Audit Log', icon: 'history', description: 'Changes to members, roles, and agent access (host keeps newest 500 changes).' },
  { id: 'remote_desktop', name: 'Remote Desktop', icon: 'desktop_access_disabled', description: 'Connect or test remote desktop with temporary 4-digit code.' },
  { id: 'agents', name: 'Agents', icon: 'smart_toy', description: 'Choose what the agents on this computer can do when you do not set it for an agent.' },
  { id: 'mcp', name: 'MCP Servers', icon: 'hub', description: 'Model Context Protocol servers that give agents tools on this computer.' },
  { id: 'profile', name: 'Profile', icon: 'account_circle', description: 'Manage how you appear in OpenBot.' },
  { id: 'notifications', name: 'Notifications', icon: 'notifications', description: 'Choose how OpenBot alerts you.' },
  { id: 'voice', name: 'Voice & Dictation', icon: 'mic', description: 'Dictation in the message box (Parakeet, Bark, Whisper, Cohere, ElevenLabs, Groq) and OpenAI-compatible voice server.' },
  { id: 'connectors', name: 'Connectors & Messaging', icon: 'cable', description: 'Built-in sign-ins to outside services (GitHub, Slack Orchestrator, Discord, Telegram, WhatsApp Baileys).' },
  { id: 'hosted_sites', name: 'Hosted Sites & SSO', icon: 'public', description: 'Websites published to openbot.site (30-day expiry) and company OpenID Connect / SCIM sign-in.' },
  { id: 'dynamic_island', name: 'Dynamic Island', icon: 'dock_to_bottom', description: 'Show agent activity in the MacBook notch.', macOnly: true },
  { id: 'agent_dock', name: 'Agent Dock', icon: 'dock', description: 'Show agents at the screen edge, ready for a quick chat.', macOnly: true },
  { id: 'computer_use', name: 'Computer Use', icon: 'desktop_windows', description: "Let agents on this computer's OpenBot see and use its apps." },
  { id: 'billing', name: 'Billing', icon: 'credit_card', description: 'License, server plans, payment method and invoices.' },
  { id: 'mobile_connect', name: 'Mobile Connect', icon: 'smartphone', description: 'Sign in securely on your phone.' },
  { id: 'updates', name: 'Updates', icon: 'system_update_alt', description: 'Keep OpenBot current on this computer.' },
  { id: 'hosted_servers', name: 'Hosted servers', icon: 'cloud', description: 'Create OpenBot servers that run when this computer is off (15-min idle stop, 14-day disk retention).' },
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

  // Milestone 7 local signals & effect
  const [licenceTier, setLicenceTier] = createSignal<'Starter' | 'Team'>('Team');
  const [licenceSeats, setLicenceSeats] = createSignal(5);
  const [licenceCycle, setLicenceCycle] = createSignal<'monthly' | 'yearly'>('yearly');
  const [licenceCurrency, setLicenceCurrency] = createSignal<'EUR' | 'USD' | 'PLN'>('EUR');
  const [licenceBundle, setLicenceBundle] = createSignal(true);
  const [companyName, setCompanyName] = createSignal('Synthetify Tech Sp. z o.o.');
  const [taxId, setTaxId] = createSignal('PL9452248912');
  const [buyerAuthorized, setBuyerAuthorized] = createSignal(true);
  const [activeScimToken, setActiveScimToken] = createSignal<{ rawToken: string; warning: string } | null>(null);

  createEffect(() => {
    if (state.isSettingsOpen) {
      if (state.activeSettingsTab === 'billing') {
        loadBillingState();
      } else if (state.activeSettingsTab === 'profile') {
        loadUserProfile();
        loadAccountSessions();
      } else if (state.activeSettingsTab === 'mobile_connect') {
        loadMobileConnect();
      } else if (state.activeSettingsTab === 'hosted_sites') {
        loadExtendedSSO();
      }
    }
  });

  const computedLicencePrice = () => {
    const tier = licenceTier();
    const seats = tier === 'Starter' ? 1 : Math.max(2, Math.min(10, licenceSeats()));
    const cycle = licenceCycle();
    const curr = licenceCurrency();
    const bundle = licenceBundle();

    let baseMonthly = 0;
    if (tier === 'Starter') {
      baseMonthly = curr === 'EUR' ? 10 : curr === 'USD' ? 12 : 40;
    } else {
      const baseFor2 = curr === 'EUR' ? 25 : curr === 'USD' ? 30 : 100;
      const extraPerSeat = curr === 'EUR' ? 15 : curr === 'USD' ? 18 : 60;
      baseMonthly = baseFor2 + (seats - 2) * extraPerSeat;
    }

    let discountFactor = 1.0;
    if (cycle === 'yearly') discountFactor *= 0.80; // -20%
    if (bundle) discountFactor *= 0.90; // -10%

    const months = cycle === 'yearly' ? 12 : 1;
    const finalCycleAmount = Math.round(baseMonthly * months * discountFactor * 100) / 100;
    const effectiveMonthly = Math.round((finalCycleAmount / months) * 100) / 100;

    return {
      tier,
      seats,
      cycle,
      currency: curr,
      symbol: curr === 'EUR' ? '€' : curr === 'USD' ? '$' : 'PLN ',
      baseMonthly,
      finalCycleAmount,
      effectiveMonthly,
      devicesAllowed: seats * 3,
    };
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
                    <div class="flex items-center justify-between mb-1">
                      <div class="font-semibold text-xs text-on-surface">Background processes</div>
                      <span class="text-[10px] font-mono text-outline">{state.backgroundProcesses.length} running</span>
                    </div>
                    <p class="text-[11px] text-outline mb-3">
                      Programs agents started and left running, such as dev servers. They keep running after chat ends and after quitting OpenBot.
                    </p>

                    <Show
                      when={state.backgroundProcesses.length > 0}
                      fallback={
                        <div class="p-3 rounded bg-surface-container text-xs text-outline text-center">
                          No programs from agents are running.
                        </div>
                      }
                    >
                      <div class="space-y-2">
                        <For each={state.backgroundProcesses}>
                          {(proc) => (
                            <div class="p-2.5 rounded bg-surface-container border border-outline-variant/30 flex items-center justify-between text-xs font-mono">
                              <div>
                                <div class="font-semibold text-on-surface flex items-center gap-1.5">
                                  <span class="w-2 h-2 rounded-full bg-secondary" />
                                  <span>{proc.command}</span>
                                </div>
                                <div class="text-[10px] text-outline mt-0.5">
                                  PID: {proc.pid} · Ports: {proc.ports} · Started: {new Date(proc.started_at).toLocaleTimeString()}
                                </div>
                              </div>
                              <button
                                onClick={() => stopBackgroundProcessAction(proc.id)}
                                class="px-2.5 py-1 rounded bg-error/20 hover:bg-error/30 text-error text-[11px] font-semibold transition-colors"
                              >
                                Stop
                              </button>
                            </div>
                          )}
                        </For>
                      </div>
                    </Show>
                  </div>
                </div>
              </Show>

              {/* TAB 3: MCP SERVERS */}
              <Show when={state.activeSettingsTab === 'mcp'}>
                <div class="space-y-4">
                  <div class="flex items-center justify-between p-3.5 rounded-lg bg-surface-container-low border border-outline-variant/20">
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="font-semibold text-xs text-on-surface">MCP Tool Servers</span>
                        <span
                          class={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            state.isMCPDirty ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-surface-container text-outline'
                          }`}
                        >
                          {state.isMCPDirty ? 'Unsaved changes' : 'Synced'}
                        </span>
                      </div>
                      <p class="text-[11px] text-outline mt-0.5">
                        Servers belong to this machine and provide native tool steps for all agents.
                      </p>
                    </div>
                    <div class="flex items-center gap-2">
                      <Show when={state.isMCPDirty}>
                        <button
                          onClick={saveMCPServersAction}
                          class="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:brightness-110"
                        >
                          Save Changes
                        </button>
                      </Show>
                      <button
                        onClick={() => {
                          const name = prompt('MCP Server Name:', 'PostgreSQL Database');
                          if (name) {
                            addMCPServerAction({ name, type: 'stdio', command: 'npx -y @modelcontextprotocol/server-postgres' });
                          }
                        }}
                        class="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-xs font-semibold text-on-surface border border-outline-variant/30 flex items-center gap-1"
                      >
                        <span class="material-symbols-outlined text-[14px]">add</span>
                        <span>Add Server</span>
                      </button>
                    </div>
                  </div>

                  <div class="space-y-2">
                    <For each={state.mcpServers}>
                      {(server) => (
                        <div class="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20 flex items-center justify-between">
                          <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                              <span class="material-symbols-outlined text-[18px]">hub</span>
                            </div>
                            <div>
                              <div class="flex items-center gap-2">
                                <span class="font-semibold text-xs text-on-surface">{server.name}</span>
                                <span class="px-1.5 py-0.2 rounded text-[9px] font-mono bg-surface-container text-outline uppercase">
                                  {server.type}
                                </span>
                              </div>
                              <div class="text-[11px] font-mono text-outline mt-0.5 truncate max-w-md">
                                {server.command || server.url || 'stdio process'}
                              </div>
                            </div>
                          </div>
                          <div class="flex items-center gap-2">
                            <button
                              onClick={() => testMCPServerAction(server.id)}
                              class="px-2.5 py-1 rounded bg-surface-container hover:bg-surface-container-high text-xs text-on-surface border border-outline-variant/30 transition-colors"
                            >
                              Test Probe
                            </button>
                            <button
                              onClick={() => removeMCPServerAction(server.id)}
                              class="p-1 rounded text-outline hover:text-error hover:bg-surface-container transition-colors"
                              title="Remove MCP server"
                            >
                              <span class="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              </Show>

              {/* TAB 8: COMPUTER USE */}
              <Show when={state.activeSettingsTab === 'computer_use'}>
                <div class="space-y-4">
                  <div class="p-4 rounded-xl bg-surface-container-low border border-outline-variant/20 flex items-center justify-between">
                    <div>
                      <div class="font-semibold text-xs text-on-surface">Enable Computer Use driver</div>
                      <p class="text-[11px] text-outline mt-0.5">
                        Agents with Computer Use tools can see desktop displays, move the cursor, and click controls.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={state.computerUseStatus.enabled}
                      onChange={(e) => toggleComputerUseAction(e.currentTarget.checked)}
                      class="accent-primary cursor-pointer w-4 h-4"
                    />
                  </div>

                  <div class="p-4 rounded-xl bg-surface-container-low border border-outline-variant/20 space-y-3">
                    <span class="font-semibold text-xs text-on-surface block">Driver Permissions & Platform Readiness</span>
                    <div class="grid grid-cols-2 gap-3 text-xs">
                      <div class="p-3 rounded bg-surface-container border border-outline-variant/20 flex items-center justify-between">
                        <span class="text-outline">Screen Capture</span>
                        <span class="text-secondary font-semibold flex items-center gap-1">
                          <span class="w-1.5 h-1.5 rounded-full bg-secondary" />
                          Ready
                        </span>
                      </div>
                      <div class="p-3 rounded bg-surface-container border border-outline-variant/20 flex items-center justify-between">
                        <span class="text-outline">System Automation</span>
                        <span class="text-secondary font-semibold flex items-center gap-1">
                          <span class="w-1.5 h-1.5 rounded-full bg-secondary" />
                          Ready
                        </span>
                      </div>
                    </div>
                    <div class="text-[11px] text-outline font-mono">
                      Platform: {state.computerUseStatus.platform} · Windows/Linux driver answers ready without extra prompt.
                    </div>
                  </div>
                </div>
              </Show>

              {/* TAB: SERVER GENERAL */}
              <Show when={state.activeSettingsTab === 'server_general'}>
                <div class="space-y-4">
                  <div class="p-4 rounded-xl bg-surface-container-low border border-outline-variant/20 flex items-center justify-between">
                    <div>
                      <div class="font-semibold text-xs text-on-surface">Server Name & Identity</div>
                      <div class="text-[11px] text-outline mt-0.5">Owner only: Change name or avatar on this host.</div>
                    </div>
                    <span class="font-mono text-xs font-semibold text-primary">{state.servers[0]?.name || 'This computer'}</span>
                  </div>

                  <div class="p-4 rounded-xl bg-surface-container-low border border-outline-variant/20 flex items-center justify-between">
                    <div>
                      <div class="font-semibold text-xs text-on-surface">Timezone</div>
                      <div class="text-[11px] text-outline mt-0.5">Routines use this timezone when the sender does not specify one. Automatic follows the host.</div>
                    </div>
                    <select class="bg-surface-container border border-outline-variant/40 rounded px-2.5 py-1 text-xs text-on-surface outline-none">
                      <option value="Automatic">Automatic (Device)</option>
                      <option value="UTC+0">UTC+0</option>
                      <option value="America/New_York">America/New_York (EST)</option>
                      <option value="Europe/Warsaw">Europe/Warsaw (CET)</option>
                    </select>
                  </div>

                  <div class="p-4 rounded-xl bg-surface-container-low border border-outline-variant/20 flex items-center justify-between">
                    <div>
                      <div class="font-semibold text-xs text-on-surface">Server Key Rotation</div>
                      <div class="text-[11px] text-outline mt-0.5">
                        Rotates identity key. Paired devices and webhook routes stay connected via dual-signed handover.
                      </div>
                    </div>
                    <button
                      onClick={() => rotateServerKeyAction(state.servers[0]?.id || 'server-local')}
                      class="px-3.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-xs font-semibold text-on-surface"
                    >
                      Rotate Key
                    </button>
                  </div>

                  <div class="p-4 rounded-xl bg-surface-container-low border border-outline-variant/20 flex items-center justify-between">
                    <div>
                      <div class="font-semibold text-xs text-on-surface">Restart Server</div>
                      <div class="text-[11px] text-outline mt-0.5">
                        Takes about 1 minute. Running turns stop; members temporarily disconnect; chats and files stay intact.
                      </div>
                    </div>
                    <button
                      onClick={() => restartServerAction(state.servers[0]?.id || 'server-local')}
                      class="px-3.5 py-1.5 rounded-lg bg-error/20 hover:bg-error/30 text-error text-xs font-semibold"
                    >
                      Restart Server
                    </button>
                  </div>
                </div>
              </Show>

              {/* TAB: MEMBERS */}
              <Show when={state.activeSettingsTab === 'members'}>
                <div class="space-y-4">
                  {/* Publish State */}
                  <div class="p-4 rounded-xl bg-surface-container-low border border-outline-variant/20 flex items-center justify-between">
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="font-semibold text-xs text-on-surface">Publish State</span>
                        <span class={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          state.servers[0]?.publishState === 'reachable' ? 'bg-secondary/20 text-secondary' : 'bg-surface-container text-outline'
                        }`}>
                          {state.servers[0]?.publishState === 'reachable' ? 'Reachable online' : 'Not reachable online'}
                        </span>
                      </div>
                      <p class="text-[11px] text-outline mt-0.5">
                        {state.servers[0]?.publishState === 'reachable'
                          ? 'Reachable online: Only invited people can sign in.'
                          : 'Not reachable online: Existing members and invitations remain.'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const current = state.servers[0]?.publishState;
                        const next = current === 'reachable' ? 'not-reachable' : 'reachable';
                        setPublishStateAction(state.servers[0]?.id || 'server-local', next);
                      }}
                      class="px-3.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-xs font-semibold text-on-surface"
                    >
                      {state.servers[0]?.publishState === 'reachable' ? 'Unpublish' : 'Publish'}
                    </button>
                  </div>

                  {/* Invite Member */}
                  <div class="p-4 rounded-xl bg-surface-container-low border border-outline-variant/20 flex items-center justify-between">
                    <div>
                      <span class="font-semibold text-xs text-on-surface">Invite New Member</span>
                      <p class="text-[11px] text-outline mt-0.5">
                        Email invitations only work for the address that received them. (Cap: 25 users).
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const email = prompt('Member Email:');
                        if (email) {
                          inviteServerMemberAction(state.servers[0]?.id || 'server-local', email, email.split('@')[0], 'member');
                        }
                      }}
                      class="px-3.5 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:brightness-110 flex items-center gap-1"
                    >
                      <span class="material-symbols-outlined text-[15px]">person_add</span>
                      <span>Invite Member</span>
                    </button>
                  </div>

                  {/* Member List */}
                  <div class="space-y-2">
                    <Show
                      when={state.serverMembers.length > 0}
                      fallback={
                        <div class="p-6 rounded-xl bg-surface-container-low border border-outline-variant/20 text-center text-xs text-outline">
                          No team members yet. Invite a teammate above to begin collaboration.
                        </div>
                      }
                    >
                      <For each={state.serverMembers}>
                        {(member) => (
                          <div class="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20 flex items-center justify-between text-xs">
                            <div class="flex items-center gap-3">
                              <div class="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold">
                                {member.name.charAt(0)}
                              </div>
                              <div>
                                <div class="font-semibold text-on-surface flex items-center gap-2">
                                  <span>{member.name}</span>
                                  <span class="px-1.5 py-0.2 rounded text-[10px] font-label-sm bg-surface-container uppercase text-outline">
                                    {member.serverRole}
                                  </span>
                                </div>
                                <div class="text-[11px] text-outline">{member.email} · {member.status}</div>
                              </div>
                            </div>
                            <Show when={member.serverRole !== 'owner'}>
                              <button
                                onClick={() => removeServerMemberAction(member.serverId, member.id)}
                                class="text-outline hover:text-error text-xs p-1"
                                title="Remove member"
                              >
                                <span class="material-symbols-outlined text-[16px]">person_remove</span>
                              </button>
                            </Show>
                          </div>
                        )}
                      </For>
                    </Show>
                  </div>
                </div>
              </Show>

              {/* TAB: ROLES & AGENT ACCESS */}
              <Show when={state.activeSettingsTab === 'roles'}>
                <div class="space-y-4">
                  <div class="p-3.5 rounded-lg bg-surface-container-low border border-outline-variant/20">
                    <span class="font-semibold text-xs text-on-surface">Per-Agent Access Levels</span>
                    <p class="text-[11px] text-outline mt-0.5">
                      Choose the agents members can use. Levels: none / view / chat / manage. Owners and admins can use all agents.
                    </p>
                  </div>

                  <div class="space-y-2 text-xs">
                    <Show
                      when={state.serverMembers.length > 0}
                      fallback={
                        <div class="p-6 rounded-xl bg-surface-container-low border border-outline-variant/20 text-center text-xs text-outline">
                          No team members to configure. Invite members in the Members tab first.
                        </div>
                      }
                    >
                      <For each={state.serverMembers}>
                        {(member) => (
                          <div class="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20 flex items-center justify-between">
                            <div>
                              <span class="font-semibold text-on-surface">{member.name}</span>
                              <span class="text-[10px] text-outline uppercase ml-2 font-mono">({member.serverRole})</span>
                            </div>
                            <div class="flex items-center gap-2">
                              <span class="text-[11px] text-outline">All agents access:</span>
                              <span class="font-mono text-secondary font-semibold">
                                {member.serverRole === 'owner' || member.serverRole === 'admin' ? 'Manage (Full)' : 'Chat (Standard)'}
                              </span>
                            </div>
                          </div>
                        )}
                      </For>
                    </Show>
                  </div>
                </div>
              </Show>

              {/* TAB: AUDIT LOG */}
              <Show when={state.activeSettingsTab === 'audit_log'}>
                <div class="space-y-4">
                  <div class="p-3.5 rounded-lg bg-surface-container-low border border-outline-variant/20 flex items-center justify-between">
                    <div>
                      <span class="font-semibold text-xs text-on-surface">Server Audit Log</span>
                      <p class="text-[11px] text-outline mt-0.5">
                        Records changes to members, roles, and agent access, newest first. The host keeps the newest 500 changes.
                      </p>
                    </div>
                    <span class="text-[10px] font-mono text-secondary px-2 py-0.5 rounded bg-surface-container">
                      Max 500 Entries
                    </span>
                  </div>

                  <div class="space-y-2 max-h-80 overflow-y-auto pr-1">
                    <For each={state.auditLogs}>
                      {(entry) => (
                        <div class="p-2.5 rounded bg-surface-container-low border border-outline-variant/20 flex flex-col gap-1 text-xs font-mono">
                          <div class="flex items-center justify-between text-[11px]">
                            <span class="text-primary font-bold uppercase">{entry.action}</span>
                            <span class="text-outline text-[10px]">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <p class="text-on-surface text-[11px]">{entry.details}</p>
                          <span class="text-[10px] text-outline">Actor: {entry.actor}</span>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              </Show>

              {/* TAB: REMOTE DESKTOP */}
              <Show when={state.activeSettingsTab === 'remote_desktop'}>
                <div class="space-y-4">
                  <div class="p-4 rounded-xl bg-surface-container-low border border-outline-variant/20 flex items-center justify-between">
                    <div>
                      <span class="font-semibold text-xs text-on-surface">Remote Desktop Stream (Sunshine / Moonlight)</span>
                      <p class="text-[11px] text-outline mt-0.5">
                        Configure or connect to this server's desktop. Linux requires x64 in an X11 session.
                      </p>
                    </div>
                    <div class="flex items-center gap-2">
                      <Show when={state.isRemoteDesktopActive}>
                        <button
                          onClick={stopAllRemoteControlAction}
                          class="px-3 py-1.5 rounded-lg bg-error text-on-error text-xs font-semibold"
                        >
                          Stop all remote control
                        </button>
                      </Show>
                      <button
                        onClick={() => createRemoteDesktopTestAction(state.servers[0]?.id || 'server-local', 'Display 1')}
                        class="px-3.5 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:brightness-110"
                      >
                        Test Remote Desktop
                      </button>
                    </div>
                  </div>

                  {/* Temporary 4-digit code test panel */}
                  <Show when={state.activeRemoteDesktopSession}>
                    <div class="p-4 rounded-xl bg-surface-container border border-secondary/40 shadow-xs flex flex-col gap-3">
                      <div class="flex items-center justify-between border-b border-outline-variant/20 pb-2">
                        <span class="font-semibold text-xs text-secondary flex items-center gap-1.5">
                          <span class="material-symbols-outlined text-[16px]">timer</span>
                          <span>Temporary Host Verification Panel (Expires in 2 Minutes)</span>
                        </span>
                        <span class="font-mono text-xs font-bold text-outline">
                          Target: {state.activeRemoteDesktopSession?.targetName}
                        </span>
                      </div>
                      <div class="flex items-center justify-between">
                        <div>
                          <div class="text-xs text-on-surface">Enter this 4-digit verification code:</div>
                          <div class="text-3xl font-mono font-bold text-primary tracking-widest mt-1">
                            {state.activeRemoteDesktopSession?.fourDigitCode}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            if (state.activeRemoteDesktopSession) {
                              verifyRemoteDesktopTestAction(
                                state.activeRemoteDesktopSession.sessionId,
                                state.activeRemoteDesktopSession.fourDigitCode
                              );
                            }
                          }}
                          class="px-4 py-2 rounded-lg bg-secondary text-on-secondary text-xs font-semibold"
                        >
                          Confirm & Connect
                        </button>
                      </div>
                    </div>
                  </Show>
                </div>
              </Show>

              {/* TAB: HOSTED SERVERS */}
              <Show when={state.activeSettingsTab === 'hosted_servers'}>
                <div class="space-y-4">
                  <div class="p-4 rounded-xl bg-surface-container-low border border-outline-variant/20 flex items-center justify-between">
                    <div>
                      <span class="font-semibold text-xs text-on-surface">Hosted Server Lifecycle</span>
                      <p class="text-[11px] text-outline mt-0.5">
                        15-minute idle stop (stops ~15m after last change); 14-day disk retention. Wake on user activity.
                      </p>
                    </div>
                    <span class="px-2.5 py-1 rounded text-xs font-mono font-semibold bg-secondary/20 text-secondary uppercase">
                      Running · 14-Day Retention
                    </span>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div class="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/20 flex flex-col gap-2">
                      <div class="font-semibold text-on-surface">Prod Cluster US-East (Hosted)</div>
                      <div class="text-[11px] text-outline font-mono">Plan: Standard · Storage: 50 GB</div>
                      <div class="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => addToast('success', 'Server wake signal sent')}
                          class="px-2.5 py-1 rounded bg-surface-container text-xs font-semibold text-on-surface border border-outline-variant/30"
                        >
                          Start / Wake
                        </button>
                        <button
                          onClick={() => addToast('success', 'Stripe customer portal subscription renewal')}
                          class="px-2.5 py-1 rounded bg-primary text-on-primary text-xs font-semibold"
                        >
                          Renew Plan
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Show>

              {/* TAB: PROFILE */}
              <Show when={state.activeSettingsTab === 'profile'}>
                <div class="space-y-4">
                  {/* Account Identity Card */}
                  <div class="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div class="w-12 h-12 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center overflow-hidden">
                        <Show
                          when={state.userProfile?.avatarUrl}
                          fallback={<span class="material-symbols-outlined text-primary text-2xl">account_circle</span>}
                        >
                          <img src={state.userProfile?.avatarUrl} alt="Avatar" class="w-full h-full object-cover" />
                        </Show>
                      </div>
                      <div>
                        <div class="flex items-center gap-2">
                          <h4 class="font-semibold text-sm text-on-surface">{state.userProfile?.name || 'Workspace Owner'}</h4>
                          <span class="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-secondary/15 text-secondary">
                            16+ Verified Adult
                          </span>
                        </div>
                        <div class="text-[11px] text-outline font-mono mt-0.5">{state.userProfile?.email || 'owner@synthetify.io'}</div>
                        <div class="text-[10px] text-outline mt-0.5">Avatars held securely in object storage (cdn.openbot.run) · Legal capacity confirmed</div>
                      </div>
                    </div>
                    <button
                      onClick={() => addToast('success', 'Profile Synced', 'User profile and credentials refreshed.')}
                      class="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-bright text-xs font-semibold text-on-surface"
                    >
                      Refresh
                    </button>
                  </div>

                  {/* Active Account Sessions */}
                  <div class="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-3">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-primary text-[18px]">devices</span>
                        <h4 class="font-semibold text-xs text-on-surface">Active Account Sessions</h4>
                      </div>
                      <span class="text-[11px] text-outline">Desktop / Mobile / Hosted server</span>
                    </div>

                    <div class="space-y-2">
                      <For
                        each={state.accountSessions.length > 0 ? state.accountSessions : [
                          {
                            id: 'session-desktop-local',
                            userId: 'user-owner-default',
                            kind: 'Desktop' as const,
                            deviceName: 'This Mac / Primary Desktop',
                            isThisDevice: true,
                            signedInAt: new Date().toISOString(),
                            lastActiveAt: new Date().toISOString(),
                            status: 'active' as const,
                          },
                          {
                            id: 'session-mobile-1',
                            userId: 'user-owner-default',
                            kind: 'Mobile' as const,
                            deviceName: 'iPhone 16 Pro (Mobile Companion)',
                            isThisDevice: false,
                            signedInAt: new Date(Date.now() - 3600000).toISOString(),
                            lastActiveAt: new Date().toISOString(),
                            status: 'active' as const,
                          },
                          {
                            id: 'session-server-node-1',
                            userId: 'user-owner-default',
                            kind: 'Hosted server' as const,
                            deviceName: 'Prod Cluster US-East Node',
                            isThisDevice: false,
                            signedInAt: new Date(Date.now() - 86400000).toISOString(),
                            lastActiveAt: new Date().toISOString(),
                            status: 'active' as const,
                          },
                        ]}
                      >
                        {(sess) => (
                          <div class="p-3 rounded-lg bg-surface-container border border-outline-variant/20 flex items-center justify-between text-xs">
                            <div class="flex items-center gap-3">
                              <span class="material-symbols-outlined text-outline text-[20px]">
                                {sess.kind === 'Desktop' ? 'computer' : sess.kind === 'Mobile' ? 'smartphone' : 'dns'}
                              </span>
                              <div>
                                <div class="flex items-center gap-2">
                                  <span class="font-semibold text-on-surface">{sess.deviceName}</span>
                                  <span class="px-1.5 py-0.2 rounded text-[10px] font-mono bg-surface-container-high text-on-surface-variant">
                                    {sess.kind}
                                  </span>
                                  <Show when={sess.isThisDevice}>
                                    <span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-primary text-on-primary">
                                      THIS DEVICE
                                    </span>
                                  </Show>
                                </div>
                                <div class="text-[10px] text-outline font-mono mt-0.5">
                                  Signed in: {new Date(sess.signedInAt).toLocaleDateString()} · Status: {sess.status}
                                </div>
                              </div>
                            </div>

                            <Show when={!sess.isThisDevice}>
                              <button
                                onClick={() => disconnectSessionAction(sess.id)}
                                class="px-2.5 py-1 rounded bg-surface-container-high hover:bg-error/20 hover:text-error text-[11px] font-medium text-on-surface-variant transition-colors"
                              >
                                Disconnect
                              </button>
                            </Show>
                          </div>
                        )}
                      </For>
                    </div>

                    <div class="p-2.5 rounded bg-surface-container-lowest/60 border border-outline-variant/20 text-[11px] text-outline flex items-start gap-2">
                      <span class="material-symbols-outlined text-outline text-[16px] shrink-0 mt-0.5">info</span>
                      <span>
                        Disconnecting a hosted-server session signs the server out (restart the server to sign it in again).
                      </span>
                    </div>
                  </div>
                </div>
              </Show>

              {/* TAB: MOBILE CONNECT */}
              <Show when={state.activeSettingsTab === 'mobile_connect'}>
                <div class="space-y-4">
                  {/* One-Time Code & QR Section */}
                  <div class="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-3">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-primary text-[20px]">qr_code_scanner</span>
                        <h4 class="font-semibold text-xs text-on-surface">Sign in on Mobile</h4>
                      </div>
                      <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-secondary/15 text-secondary">
                        10-Minute One-Time Code
                      </span>
                    </div>

                    <p class="text-[11px] text-outline">
                      Scan the QR code with the OpenBot companion app or enter the 8-character single-use code.
                    </p>

                    <div class="flex flex-col sm:flex-row items-center gap-4 p-3 rounded-lg bg-surface-container border border-outline-variant/20">
                      {/* Stylized QR Matrix */}
                      <div class="w-32 h-32 rounded-lg bg-surface-container-lowest border border-outline-variant/30 p-2 flex flex-col items-center justify-center gap-1 shrink-0">
                        <div class="grid grid-cols-4 gap-1 p-1 bg-white rounded">
                          <div class="w-5 h-5 bg-black rounded-xs"></div>
                          <div class="w-5 h-5 bg-transparent"></div>
                          <div class="w-5 h-5 bg-transparent"></div>
                          <div class="w-5 h-5 bg-black rounded-xs"></div>
                          <div class="w-5 h-5 bg-transparent"></div>
                          <div class="w-5 h-5 bg-black rounded-xs"></div>
                          <div class="w-5 h-5 bg-black rounded-xs"></div>
                          <div class="w-5 h-5 bg-transparent"></div>
                          <div class="w-5 h-5 bg-black rounded-xs"></div>
                          <div class="w-5 h-5 bg-transparent"></div>
                          <div class="w-5 h-5 bg-transparent"></div>
                          <div class="w-5 h-5 bg-black rounded-xs"></div>
                        </div>
                        <span class="text-[9px] font-mono text-outline">openbot://mobile-connect</span>
                      </div>

                      <div class="space-y-2 flex-1 w-full">
                        <div class="text-[11px] text-outline">One-time 8-character Code:</div>
                        <div class="flex items-center gap-2">
                          <div class="px-3 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant/30 font-mono text-base font-bold tracking-widest text-primary">
                            {state.mobileConnect?.activeCode || 'OB-8X42Q'}
                          </div>
                          <button
                            onClick={() => generateMobileCodeAction()}
                            class="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:brightness-110"
                          >
                            Generate New Code
                          </button>
                        </div>
                        <div class="text-[10px] text-outline">
                          Codes expire in exactly 10 minutes and are stored only as hashes.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Permanent Link Option */}
                  <div class="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-3">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-tertiary text-[20px]">link</span>
                        <h4 class="font-semibold text-xs text-on-surface">Permanent Companion Link</h4>
                      </div>
                      <span class="text-[10px] font-mono text-outline">Reusable across companion devices</span>
                    </div>

                    <div class="p-3 rounded-lg bg-surface-container border border-outline-variant/20 flex items-center justify-between gap-2">
                      <div class="font-mono text-xs text-on-surface truncate flex-1">
                        {state.mobileConnect?.permanentLink || 'openbot://auth-link/7f4b8291a0c4e12d88f6'}
                      </div>
                      <div class="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => replaceMobileLinkAction()}
                          class="px-2.5 py-1 rounded bg-surface-container-high hover:bg-surface-bright text-xs text-on-surface font-medium"
                        >
                          Replace Link
                        </button>
                        <button
                          onClick={() => revokeMobileLinkAction()}
                          class="px-2.5 py-1 rounded bg-surface-container-high hover:bg-error/20 hover:text-error text-xs text-on-surface-variant font-medium"
                        >
                          Revoke
                        </button>
                      </div>
                    </div>

                    {/* Mandatory Exact Warning */}
                    <div class="p-3 rounded-lg bg-error-container/20 border border-error/30 flex items-start gap-2">
                      <span class="material-symbols-outlined text-error text-[18px] shrink-0 mt-0.5">warning</span>
                      <div class="text-xs text-on-surface font-semibold">
                        Anyone with this link can sign in to your OpenBot account.
                      </div>
                    </div>
                  </div>
                </div>
              </Show>

              {/* TAB 9: BILLING */}
              <Show when={state.activeSettingsTab === 'billing'}>
                <div class="space-y-4">
                  {/* Offline Grace Period Telemetry Banner */}
                  <div class="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between text-xs">
                    <div class="flex items-center gap-2.5">
                      <span
                        class={`material-symbols-outlined text-[18px] ${
                          state.offlineGrace?.isBlocked
                            ? 'text-error'
                            : state.offlineGrace?.status === 'grace_period'
                            ? 'text-tertiary'
                            : 'text-secondary'
                        }`}
                      >
                        {state.offlineGrace?.isBlocked ? 'block' : state.offlineGrace?.status === 'grace_period' ? 'schedule' : 'verified'}
                      </span>
                      <div>
                        <div class="font-semibold text-on-surface">
                          {state.offlineGrace?.isBlocked
                            ? 'Sign-ins Blocked (Offline Grace Expired)'
                            : state.offlineGrace?.status === 'grace_period'
                            ? `Offline Grace Period Active (${state.offlineGrace?.hoursRemaining}h remaining)`
                            : 'Licence Valid & Online'}
                        </div>
                        <div class="text-[11px] text-outline">{state.offlineGrace?.message}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => checkOfflineGraceAction()}
                      class="px-2.5 py-1 rounded bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface border border-outline-variant/30"
                    >
                      Revalidate
                    </button>
                  </div>

                  {/* SECTION 1: COMMERCIAL LICENCE & PRICING CALCULATOR */}
                  <div class="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-3">
                    <div class="flex items-center justify-between">
                      <div>
                        <div class="flex items-center gap-2">
                          <span class="material-symbols-outlined text-primary text-[20px]">workspace_premium</span>
                          <h4 class="font-semibold text-sm text-on-surface">Commercial Licence</h4>
                          <span class="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-primary/20 text-primary uppercase">
                            {state.commercialLicence ? `${state.commercialLicence.planTier} Active` : 'OpenBot Commercial'}
                          </span>
                        </div>
                        <p class="text-[11px] text-outline mt-0.5">
                          Licence allows 3 devices per user. Users counted are people, not servers/computers; AI agents do not count.
                        </p>
                      </div>
                      <button
                        onClick={() => openStripePortalAction(state.commercialLicence?.stripeSubscriptionId)}
                        class="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-bright text-xs font-semibold text-on-surface flex items-center gap-1.5"
                      >
                        <span class="material-symbols-outlined text-[15px]">credit_card</span>
                        <span>Stripe Customer Portal</span>
                      </button>
                    </div>

                    {/* Active Licence Details if present */}
                    <Show when={state.commercialLicence}>
                      <div class="p-3 rounded-lg bg-surface-container border border-outline-variant/20 space-y-1.5 text-xs font-mono">
                        <div class="flex justify-between items-center text-on-surface">
                          <span>Order: {state.commercialLicence?.orderRef}</span>
                          <span class="text-secondary font-semibold uppercase">● Active ({state.commercialLicence?.seats} seats)</span>
                        </div>
                        <div class="text-[11px] text-outline">
                          Licensee: {state.commercialLicence?.companyName} (Tax ID: {state.commercialLicence?.taxId})
                        </div>
                        <div class="text-[10px] text-outline">
                          Licensor: {state.commercialLicence?.licensor}
                        </div>
                      </div>
                    </Show>

                    {/* Interactive Licence Selector & Pricing Calculator */}
                    <div class="p-3.5 rounded-lg bg-surface-container border border-outline-variant/20 space-y-3 text-xs">
                      <div class="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        {/* Tier */}
                        <div>
                          <label class="text-[10px] uppercase font-mono text-outline block mb-1">Tier</label>
                          <div class="flex rounded-lg overflow-hidden border border-outline-variant/30">
                            <button
                              onClick={() => setLicenceTier('Starter')}
                              class={`flex-1 py-1 text-center font-medium ${
                                licenceTier() === 'Starter' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container-high text-on-surface-variant'
                              }`}
                            >
                              Starter (1u)
                            </button>
                            <button
                              onClick={() => setLicenceTier('Team')}
                              class={`flex-1 py-1 text-center font-medium ${
                                licenceTier() === 'Team' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container-high text-on-surface-variant'
                              }`}
                            >
                              Team (2-10u)
                            </button>
                          </div>
                        </div>

                        {/* Currency */}
                        <div>
                          <label class="text-[10px] uppercase font-mono text-outline block mb-1">Currency</label>
                          <div class="flex rounded-lg overflow-hidden border border-outline-variant/30">
                            <button
                              onClick={() => setLicenceCurrency('EUR')}
                              class={`flex-1 py-1 text-center font-medium ${
                                licenceCurrency() === 'EUR' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container-high text-on-surface-variant'
                              }`}
                            >
                              € EUR
                            </button>
                            <button
                              onClick={() => setLicenceCurrency('USD')}
                              class={`flex-1 py-1 text-center font-medium ${
                                licenceCurrency() === 'USD' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container-high text-on-surface-variant'
                              }`}
                            >
                              $ USD
                            </button>
                            <button
                              onClick={() => setLicenceCurrency('PLN')}
                              class={`flex-1 py-1 text-center font-medium ${
                                licenceCurrency() === 'PLN' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container-high text-on-surface-variant'
                              }`}
                            >
                              zł PLN
                            </button>
                          </div>
                        </div>

                        {/* Cycle */}
                        <div>
                          <label class="text-[10px] uppercase font-mono text-outline block mb-1">Cycle</label>
                          <div class="flex rounded-lg overflow-hidden border border-outline-variant/30">
                            <button
                              onClick={() => setLicenceCycle('monthly')}
                              class={`flex-1 py-1 text-center font-medium ${
                                licenceCycle() === 'monthly' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container-high text-on-surface-variant'
                              }`}
                            >
                              Monthly
                            </button>
                            <button
                              onClick={() => setLicenceCycle('yearly')}
                              class={`flex-1 py-1 text-center font-medium ${
                                licenceCycle() === 'yearly' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container-high text-on-surface-variant'
                              }`}
                            >
                              Yearly (−20%)
                            </button>
                          </div>
                        </div>

                        {/* Team Seats Stepper (if Team) */}
                        <Show
                          when={licenceTier() === 'Team'}
                          fallback={
                            <div>
                              <label class="text-[10px] uppercase font-mono text-outline block mb-1">Users</label>
                              <div class="py-1 px-2 rounded-lg bg-surface-container-high text-on-surface font-mono font-bold">1 user</div>
                            </div>
                          }
                        >
                          <div>
                            <label class="text-[10px] uppercase font-mono text-outline block mb-1">Users (2–10)</label>
                            <div class="flex items-center gap-1.5">
                              <button
                                onClick={() => setLicenceSeats(Math.max(2, licenceSeats() - 1))}
                                class="w-7 h-7 rounded bg-surface-container-high hover:bg-surface-bright flex items-center justify-center font-bold"
                              >
                                −
                              </button>
                              <span class="font-mono font-bold px-2 text-on-surface">{licenceSeats()} users</span>
                              <button
                                onClick={() => setLicenceSeats(Math.min(10, licenceSeats() + 1))}
                                class="w-7 h-7 rounded bg-surface-container-high hover:bg-surface-bright flex items-center justify-center font-bold"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </Show>
                      </div>

                      {/* Bundle toggle & Price telemetry */}
                      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-outline-variant/20">
                        <label class="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={licenceBundle()}
                            onChange={(e) => setLicenceBundle(e.currentTarget.checked)}
                            class="rounded accent-primary"
                          />
                          <span class="text-on-surface font-medium">Bundle with hosted server (−10% discount)</span>
                        </label>

                        <div class="text-right">
                          <div class="font-mono text-lg font-bold text-primary">
                            {computedLicencePrice().symbol}{computedLicencePrice().finalCycleAmount.toFixed(2)}
                            <span class="text-[11px] font-normal text-outline"> / {computedLicencePrice().cycle}</span>
                          </div>
                          <div class="text-[10px] text-outline font-mono">
                            Effective: {computedLicencePrice().symbol}{computedLicencePrice().effectiveMonthly.toFixed(2)} / mo · Allows {computedLicencePrice().devicesAllowed} devices
                          </div>
                        </div>
                      </div>

                      {/* Electronic Acceptance Form */}
                      <div class="p-3 rounded-lg bg-surface-container-lowest/70 border border-outline-variant/20 space-y-2 mt-2">
                        <div class="font-semibold text-on-surface text-[11px] uppercase tracking-wider">
                          Electronic Licence Acceptance (Polish Law Governs)
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Company Name (Licensee)"
                            value={companyName()}
                            onInput={(e) => setCompanyName(e.currentTarget.value)}
                            class="px-2.5 py-1.5 rounded bg-surface-container border border-outline-variant/30 text-on-surface font-body-sm text-xs"
                          />
                          <input
                            type="text"
                            placeholder="Tax Identification Number (NIP/VAT/EIN)"
                            value={taxId()}
                            onInput={(e) => setTaxId(e.currentTarget.value)}
                            class="px-2.5 py-1.5 rounded bg-surface-container border border-outline-variant/30 text-on-surface font-body-sm text-xs"
                          />
                        </div>

                        <label class="flex items-start gap-2 cursor-pointer select-none pt-1">
                          <input
                            type="checkbox"
                            checked={buyerAuthorized()}
                            onChange={(e) => setBuyerAuthorized(e.currentTarget.checked)}
                            class="rounded accent-primary mt-0.5"
                          />
                          <span class="text-[11px] text-outline">
                            I confirm that I am authorised to bind the Licensee to these terms. Licensor: Synthetify Labs, Trzebunia 513, 32-438 Trzebunia, Poland, KRS 0000895882.
                          </span>
                        </label>

                        <div class="flex items-center justify-end gap-2 pt-2">
                          <button
                            onClick={() =>
                              recordLicenceAcceptanceAction({
                                tier: licenceTier(),
                                seats: computedLicencePrice().seats,
                                cycle: licenceCycle(),
                                currency: licenceCurrency(),
                                hasHostedServerBundle: licenceBundle(),
                                companyName: companyName(),
                                taxId: taxId(),
                                buyerAuthorized: buyerAuthorized(),
                              })
                            }
                            class="px-3.5 py-1.5 rounded-lg bg-primary text-on-primary font-semibold text-xs hover:brightness-110"
                          >
                            Accept & Complete Purchase in Stripe
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: HOSTED-SERVER PLANS (12/50/100 GB, 1/5/10 members, 3/10/50 sites) */}
                  <div class="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-3">
                    <div class="flex items-center justify-between">
                      <div>
                        <div class="flex items-center gap-2">
                          <span class="material-symbols-outlined text-secondary text-[20px]">cloud_sync</span>
                          <h4 class="font-semibold text-sm text-on-surface">Hosted-Server Plans</h4>
                        </div>
                        <p class="text-[11px] text-outline mt-0.5">
                          Per server, each with its own Stripe subscription. Stripe is the source of truth.
                        </p>
                      </div>
                      <span class="text-[11px] font-mono text-outline">Yearly: −20% discount</span>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      {/* Starter */}
                      <div class="p-3.5 rounded-xl bg-surface-container border border-outline-variant/20 flex flex-col justify-between">
                        <div>
                          <div class="flex justify-between items-center">
                            <span class="font-bold text-on-surface">Starter</span>
                            <span class="font-mono text-primary font-bold">€20 / $25 / 80 zł</span>
                          </div>
                          <div class="text-[11px] text-outline mt-1">12 GB storage · 1 member · 3 sites · Speed 1×</div>
                          <div class="text-[10px] text-outline mt-1 font-mono">Legacy limit: 1 member</div>
                        </div>
                        <button
                          onClick={() => openStripeCheckoutAction('hosted_server', 'plan_starter')}
                          class="mt-3 w-full py-1.5 rounded bg-surface-container-high hover:bg-surface-bright text-on-surface font-semibold text-center"
                        >
                          Checkout Starter
                        </button>
                      </div>

                      {/* Standard */}
                      <div class="p-3.5 rounded-xl bg-surface-container border border-outline-variant/20 flex flex-col justify-between">
                        <div>
                          <div class="flex justify-between items-center">
                            <span class="font-bold text-on-surface">Standard</span>
                            <span class="font-mono text-primary font-bold">€50 / $60 / 200 zł</span>
                          </div>
                          <div class="text-[11px] text-outline mt-1">50 GB storage · 5 members · 10 sites · Speed 2×</div>
                          <div class="text-[10px] text-outline mt-1 font-mono">Legacy limit: 10 members</div>
                        </div>
                        <button
                          onClick={() => openStripeCheckoutAction('hosted_server', 'plan_standard')}
                          class="mt-3 w-full py-1.5 rounded bg-primary text-on-primary font-semibold text-center hover:brightness-110"
                        >
                          Checkout Standard
                        </button>
                      </div>

                      {/* Pro */}
                      <div class="p-3.5 rounded-xl bg-surface-container border border-outline-variant/20 flex flex-col justify-between">
                        <div>
                          <div class="flex justify-between items-center">
                            <span class="font-bold text-on-surface">Pro</span>
                            <span class="font-mono text-primary font-bold">€100 / $120 / 400 zł</span>
                          </div>
                          <div class="text-[11px] text-outline mt-1">100 GB storage · 10 members · 50 sites · Speed 4×</div>
                          <div class="text-[10px] text-outline mt-1 font-mono">Legacy limit: 25 members</div>
                        </div>
                        <button
                          onClick={() => openStripeCheckoutAction('hosted_server', 'plan_pro')}
                          class="mt-3 w-full py-1.5 rounded bg-surface-container-high hover:bg-surface-bright text-on-surface font-semibold text-center"
                        >
                          Checkout Pro
                        </button>
                      </div>
                    </div>

                    <div class="text-[11px] text-outline font-mono">
                      * Self-hosted servers have no plan and receive 1 hosted site.
                    </div>
                  </div>

                  {/* SECTION 3: OPEN SUBSCRIPTIONS & STRIPE SYNC */}
                  <div class="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-3">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-outline text-[18px]">receipt_long</span>
                        <h4 class="font-semibold text-xs text-on-surface">Open Plans & Server Subscriptions</h4>
                      </div>
                      <button
                        onClick={() => openStripePortalAction()}
                        class="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <span>Manage Invoices in Stripe</span>
                        <span class="material-symbols-outlined text-[13px]">open_in_new</span>
                      </button>
                    </div>

                    <div class="space-y-2 text-xs">
                      <For
                        each={state.hostedServerSubscriptions.length > 0 ? state.hostedServerSubscriptions : [
                          {
                            id: 'srv-sub-1',
                            serverId: 'srv-node-east',
                            serverName: 'Production Cloud Node (US-East)',
                            planTier: 'Standard' as const,
                            storageGB: 50,
                            membersLimit: 5,
                            sitesLimit: 10,
                            speedMultiplier: 2.0,
                            billingCycle: 'monthly' as const,
                            currency: 'EUR' as const,
                            monthlyPrice: 50,
                            stripeSubscriptionId: 'sub_live_9041280a91f',
                            stripeStatus: 'active' as const,
                            serverRemoved: false,
                            currentPeriodEnd: '2026-12-10T00:00:00Z',
                          },
                        ]}
                      >
                        {(sub) => (
                          <div class="p-3 rounded-lg bg-surface-container border border-outline-variant/20 flex items-center justify-between">
                            <div>
                              <div class="flex items-center gap-2">
                                <span class="font-semibold text-on-surface">{sub.serverName}</span>
                                <span class="px-1.5 py-0.2 rounded text-[10px] font-mono bg-primary/20 text-primary font-bold">
                                  {sub.planTier}
                                </span>
                                <span class="text-[10px] text-secondary font-mono">● {sub.stripeStatus}</span>
                                <Show when={sub.serverRemoved}>
                                  <span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-error/20 text-error">
                                    SERVER REMOVED (BILLED UNTIL CANCELLED)
                                  </span>
                                </Show>
                              </div>
                              <div class="text-[11px] text-outline font-mono mt-0.5">
                                {sub.storageGB} GB storage · {sub.membersLimit} members · {sub.sitesLimit} sites · Renews {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                              </div>
                            </div>

                            <button
                              onClick={() => cancelHostedSubscriptionAction(sub.stripeSubscriptionId)}
                              class="px-2.5 py-1 rounded bg-surface-container-high hover:bg-error/20 hover:text-error text-[11px] text-on-surface-variant font-medium"
                            >
                              Cancel Renewal
                            </button>
                          </div>
                        )}
                      </For>
                    </div>

                    <div class="p-2.5 rounded bg-surface-container-lowest/60 border border-outline-variant/20 text-[11px] text-outline flex items-start gap-2">
                      <span class="material-symbols-outlined text-outline text-[16px] shrink-0 mt-0.5">info</span>
                      <span>
                        A plan whose server was removed stays listed because Stripe bills it until cancelled. Cancelling renewal keeps data until the end of the paid period.
                      </span>
                    </div>
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

              {/* TAB: VOICE & DICTATION */}
              <Show when={state.activeSettingsTab === 'voice'}>
                <div class="space-y-4">
                  {/* Local & Cloud Dictation STT */}
                  <div class="p-4 rounded-xl bg-surface-container-low border border-outline-variant/20 space-y-3">
                    <div class="flex items-center justify-between">
                      <div>
                        <span class="font-semibold text-xs text-on-surface">Speech-to-Text Dictation (Message Box)</span>
                        <p class="text-[11px] text-outline mt-0.5">
                          Local models run offline on this computer. Cloud models require your own provider API key.
                        </p>
                      </div>
                      <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-secondary/20 text-secondary font-semibold uppercase">
                        {state.voiceSettings.dictationModel}
                      </span>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      {/* Local Models */}
                      <div
                        onClick={() => updateVoiceSettingsAction({ dictation_engine: 'parakeet', dictation_model: 'Parakeet' })}
                        class={`p-3 rounded-lg border cursor-pointer transition-all ${
                          state.voiceSettings.dictationModel === 'Parakeet'
                            ? 'bg-primary-container/20 border-primary text-on-surface font-semibold'
                            : 'bg-surface-container border-outline-variant/20 text-outline hover:text-on-surface'
                        }`}
                      >
                        <div class="flex items-center justify-between">
                          <span class="font-bold">Parakeet</span>
                          <span class="text-[10px] bg-surface-container-high px-1.5 py-0.5 rounded text-secondary font-mono">Fast · 25 Langs</span>
                        </div>
                        <p class="text-[11px] text-outline mt-1 font-normal">
                          Fast, finds the spoken language itself, 25 European languages. Runs on this computer.
                        </p>
                      </div>

                      <div
                        onClick={() => updateVoiceSettingsAction({ dictation_engine: 'parakeet-unified', dictation_model: 'Parakeet Unified' })}
                        class={`p-3 rounded-lg border cursor-pointer transition-all ${
                          state.voiceSettings.dictationModel === 'Parakeet Unified'
                            ? 'bg-primary-container/20 border-primary text-on-surface font-semibold'
                            : 'bg-surface-container border-outline-variant/20 text-outline hover:text-on-surface'
                        }`}
                      >
                        <div class="flex items-center justify-between">
                          <span class="font-bold">Parakeet Unified</span>
                          <span class="text-[10px] bg-surface-container-high px-1.5 py-0.5 rounded text-outline font-mono">Fast · English</span>
                        </div>
                        <p class="text-[11px] text-outline mt-1 font-normal">Fast, English only. Local execution.</p>
                      </div>

                      <div
                        onClick={() => updateVoiceSettingsAction({ dictation_engine: 'bark', dictation_model: 'Bark' })}
                        class={`p-3 rounded-lg border cursor-pointer transition-all ${
                          state.voiceSettings.dictationModel === 'Bark'
                            ? 'bg-primary-container/20 border-primary text-on-surface font-semibold'
                            : 'bg-surface-container border-outline-variant/20 text-outline hover:text-on-surface'
                        }`}
                      >
                        <div class="flex items-center justify-between">
                          <span class="font-bold">Bark</span>
                          <span class="text-[10px] bg-surface-container-high px-1.5 py-0.5 rounded text-outline font-mono">Fast · English</span>
                        </div>
                        <p class="text-[11px] text-outline mt-1 font-normal">Fast, English only. Lightweight local model.</p>
                      </div>

                      <div
                        onClick={() => updateVoiceSettingsAction({ dictation_engine: 'whisper', dictation_model: 'Whisper' })}
                        class={`p-3 rounded-lg border cursor-pointer transition-all ${
                          state.voiceSettings.dictationModel === 'Whisper'
                            ? 'bg-primary-container/20 border-primary text-on-surface font-semibold'
                            : 'bg-surface-container border-outline-variant/20 text-outline hover:text-on-surface'
                        }`}
                      >
                        <div class="flex items-center justify-between">
                          <span class="font-bold">Whisper</span>
                          <span class="text-[10px] bg-surface-container-high px-1.5 py-0.5 rounded text-tertiary font-mono">Slower · ~100 Langs</span>
                        </div>
                        <p class="text-[11px] text-outline mt-1 font-normal">Slower, about 100 languages. Maximum accuracy.</p>
                      </div>

                      <div
                        onClick={() => updateVoiceSettingsAction({ dictation_engine: 'cohere', dictation_model: 'Cohere' })}
                        class={`p-3 rounded-lg border cursor-pointer transition-all ${
                          state.voiceSettings.dictationModel === 'Cohere'
                            ? 'bg-primary-container/20 border-primary text-on-surface font-semibold'
                            : 'bg-surface-container border-outline-variant/20 text-outline hover:text-on-surface'
                        }`}
                      >
                        <div class="flex items-center justify-between">
                          <span class="font-bold">Cohere</span>
                          <span class="text-[10px] bg-surface-container-high px-1.5 py-0.5 rounded text-tertiary font-mono">Slower · 14 Langs · 4 GB</span>
                        </div>
                        <p class="text-[11px] text-outline mt-1 font-normal">Slower, 14 languages, about 4 GB memory.</p>
                      </div>

                      <div
                        onClick={() => updateVoiceSettingsAction({ dictation_engine: 'elevenlabs', dictation_model: 'ElevenLabs' })}
                        class={`p-3 rounded-lg border cursor-pointer transition-all ${
                          state.voiceSettings.dictationModel === 'ElevenLabs'
                            ? 'bg-primary-container/20 border-primary text-on-surface font-semibold'
                            : 'bg-surface-container border-outline-variant/20 text-outline hover:text-on-surface'
                        }`}
                      >
                        <div class="flex items-center justify-between">
                          <span class="font-bold">ElevenLabs (Cloud)</span>
                          <span class="text-[10px] bg-surface-container-high px-1.5 py-0.5 rounded text-primary font-mono">Streaming STT</span>
                        </div>
                        <p class="text-[11px] text-outline mt-1 font-normal">Streams, text shows while speaking. Billed by provider.</p>
                      </div>
                    </div>

                    {/* Language Picker & API Key Management */}
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-outline-variant/10 text-xs">
                      <div>
                        <label class="font-semibold text-outline">Spoken Language</label>
                        <select
                          value={state.voiceSettings.dictationLanguage}
                          onChange={(e) => updateVoiceSettingsAction({ dictation_language: e.currentTarget.value })}
                          class="w-full mt-1 bg-surface-container text-on-surface p-2 rounded-lg border border-outline-variant/30"
                        >
                          <option value="Automatic">Automatic (Detects from recording)</option>
                          <option value="English">English</option>
                          <option value="Spanish">Spanish</option>
                          <option value="French">French</option>
                          <option value="German">German</option>
                          <option value="Japanese">Japanese</option>
                        </select>
                      </div>

                      <div>
                        <label class="font-semibold text-outline">Cloud Provider API Key (ElevenLabs / Groq)</label>
                        <div class="flex gap-1.5 mt-1">
                          <button
                            onClick={() => {
                              const key = prompt('Paste API Key:');
                              if (key) saveVoiceApiKeyAction('groq', key);
                            }}
                            class="px-2.5 py-1.5 bg-surface-container hover:bg-surface-container-high text-xs rounded border border-outline-variant/30 text-on-surface"
                          >
                            Paste Key
                          </button>
                          <button
                            onClick={() => removeVoiceApiKeyAction('groq')}
                            class="px-2.5 py-1.5 bg-surface-container hover:bg-surface-container-high text-xs rounded border border-outline-variant/30 text-error"
                          >
                            Remove Key
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Spoken Replies (TTS) */}
                  <div class="p-4 rounded-xl bg-surface-container-low border border-outline-variant/20 space-y-3">
                    <div class="flex items-center justify-between">
                      <div>
                        <span class="font-semibold text-xs text-on-surface">Spoken Replies (TTS)</span>
                        <p class="text-[11px] text-outline mt-0.5">Read agent replies aloud with high-fidelity speech synthesis.</p>
                      </div>
                      <label class="flex items-center gap-2 cursor-pointer text-xs">
                        <span class="text-outline">Read aloud:</span>
                        <input
                          type="checkbox"
                          checked={state.voiceSettings.ttsAutoRead}
                          onChange={(e) => updateVoiceSettingsAction({ tts_auto_read: e.currentTarget.checked ? 1 : 0 })}
                          class="accent-primary w-4 h-4"
                        />
                      </label>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label class="font-semibold text-outline">Voice Persona</label>
                        <select
                          value={state.voiceSettings.ttsVoice}
                          onChange={(e) => updateVoiceSettingsAction({ tts_voice: e.currentTarget.value })}
                          class="w-full mt-1 bg-surface-container text-on-surface p-2 rounded-lg border border-outline-variant/30"
                        >
                          <option value="Female (Nova)">Female (Nova)</option>
                          <option value="Male (Echo)">Male (Echo)</option>
                          <option value="Female (Shimmer)">Female (Shimmer)</option>
                          <option value="Male (Onyx)">Male (Onyx)</option>
                        </select>
                      </div>

                      <div>
                        <label class="font-semibold text-outline">Synthesis Model (31 Languages)</label>
                        <select
                          value={state.voiceSettings.ttsModel}
                          onChange={(e) => updateVoiceSettingsAction({ tts_model: e.currentTarget.value })}
                          class="w-full mt-1 bg-surface-container text-on-surface p-2 rounded-lg border border-outline-variant/30"
                        >
                          <option value="Flash">Flash (31 Languages)</option>
                          <option value="Multilingual">Multilingual (31 Languages)</option>
                          <option value="v3">Neural v3 (31 Languages)</option>
                          <option value="xAI">xAI Voice (31 Languages)</option>
                        </select>
                      </div>

                      <div>
                        <label class="font-semibold text-outline">Voice Gender</label>
                        <div class="flex gap-2 mt-1">
                          <button
                            onClick={() => updateVoiceSettingsAction({ tts_gender: 'female', tts_voice: 'Female (Nova)' })}
                            class={`flex-1 py-1.5 rounded text-xs font-semibold border ${
                              state.voiceSettings.ttsGender === 'female'
                                ? 'bg-primary-container text-on-primary-container border-primary'
                                : 'bg-surface-container text-outline border-outline-variant/20'
                            }`}
                          >
                            Female
                          </button>
                          <button
                            onClick={() => updateVoiceSettingsAction({ tts_gender: 'male', tts_voice: 'Male (Echo)' })}
                            class={`flex-1 py-1.5 rounded text-xs font-semibold border ${
                              state.voiceSettings.ttsGender === 'male'
                                ? 'bg-primary-container text-on-primary-container border-primary'
                                : 'bg-surface-container text-outline border-outline-variant/20'
                            }`}
                          >
                            Male
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Live Voice & Voice Server */}
                  <div class="p-4 rounded-xl bg-surface-container-low border border-outline-variant/20 space-y-3">
                    <span class="font-semibold text-xs text-on-surface">OpenAI-Compatible Voice Server (/v1/audio)</span>
                    <p class="text-[11px] text-outline">
                      Use a custom endpoint for dictation or spoken replies. Status: {state.voiceSettings.voiceServerStatus}.
                    </p>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label class="text-outline font-semibold">Server Address</label>
                        <input
                          type="text"
                          placeholder="https://voice.local/v1/audio"
                          value={state.voiceSettings.voiceServerAddress || ''}
                          onChange={(e) => updateVoiceSettingsAction({ voice_server_address: e.currentTarget.value })}
                          class="w-full mt-1 bg-surface-container text-on-surface p-2 rounded-lg border border-outline-variant/30 font-mono text-[11px]"
                        />
                      </div>
                      <div>
                        <label class="text-outline font-semibold">API Key (Optional)</label>
                        <input
                          type="password"
                          placeholder="Saved"
                          value={state.voiceSettings.voiceServerApiKey || ''}
                          onChange={(e) => updateVoiceSettingsAction({ voice_server_api_key: e.currentTarget.value })}
                          class="w-full mt-1 bg-surface-container text-on-surface p-2 rounded-lg border border-outline-variant/30 font-mono text-[11px]"
                        />
                      </div>
                    </div>

                    <div class="flex items-center gap-4 text-xs pt-1">
                      <label class="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={state.voiceSettings.voiceServerUseForDictation}
                          onChange={(e) =>
                            configureVoiceServerAction({
                              address: state.voiceSettings.voiceServerAddress || 'https://voice.openbot.local/v1/audio',
                              useForDictation: e.currentTarget.checked,
                              useForTTS: state.voiceSettings.voiceServerUseForTTS,
                            })
                          }
                          class="accent-primary"
                        />
                        <span>Use for Dictation</span>
                      </label>
                      <label class="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={state.voiceSettings.voiceServerUseForTTS}
                          onChange={(e) =>
                            configureVoiceServerAction({
                              address: state.voiceSettings.voiceServerAddress || 'https://voice.openbot.local/v1/audio',
                              useForDictation: state.voiceSettings.voiceServerUseForDictation,
                              useForTTS: e.currentTarget.checked,
                            })
                          }
                          class="accent-primary"
                        />
                        <span>Use for Spoken replies</span>
                      </label>
                    </div>

                    {/* Codex Live Voice notice */}
                    <div class="p-3 rounded-lg bg-surface-container-high/40 border border-outline-variant/20 text-xs flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-secondary text-[18px]">graphic_eq</span>
                        <div>
                          <div class="font-semibold text-on-surface">Live Voice Duplex Conversation</div>
                          <div class="text-[11px] text-outline">Sign in to Codex with your ChatGPT account to use live voice. Requests go directly to OpenAI.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Show>

              {/* TAB: CONNECTORS & MESSAGING */}
              <Show when={state.activeSettingsTab === 'connectors'}>
                <div class="space-y-4">
                  {/* Built-in Outside Connectors */}
                  <div class="p-4 rounded-xl bg-surface-container-low border border-outline-variant/20 space-y-3">
                    <div>
                      <span class="font-semibold text-xs text-on-surface">Built-in Outside Service Connectors</span>
                      <p class="text-[11px] text-outline mt-0.5">
                        A connector is a built-in sign-in to an outside service that OpenBot turns into agent tools, one per OpenBot computer. A user-added MCP server or marketplace plugin is NOT a connector.
                      </p>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div class="p-3 rounded-lg bg-surface-container border border-outline-variant/20 flex items-center justify-between">
                        <div class="flex items-center gap-2.5">
                          <span class="material-symbols-outlined text-[20px] text-primary">code</span>
                          <div>
                            <div class="font-semibold text-on-surface">GitHub</div>
                            <div class="text-[11px] text-outline">Provides repos, issues, pull requests tools.</div>
                          </div>
                        </div>
                        <button
                          onClick={() => connectConnectorAction('github', 'tanjir-user')}
                          class="px-2.5 py-1 rounded bg-primary text-on-primary font-semibold text-[11px]"
                        >
                          Connect
                        </button>
                      </div>

                      <div class="p-3 rounded-lg bg-surface-container border border-outline-variant/20 flex items-center justify-between">
                        <div class="flex items-center gap-2.5">
                          <span class="material-symbols-outlined text-[20px] text-secondary">cloud</span>
                          <div>
                            <div class="font-semibold text-on-surface">Google Drive</div>
                            <div class="text-[11px] text-outline">Docs, sheets, and workspace file access.</div>
                          </div>
                        </div>
                        <button
                          onClick={() => connectConnectorAction('google', 'user@gmail.com')}
                          class="px-2.5 py-1 rounded bg-surface-container-high text-on-surface font-semibold text-[11px]"
                        >
                          Connect
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Messaging Connections */}
                  <div class="p-4 rounded-xl bg-surface-container-low border border-outline-variant/20 space-y-3">
                    <div>
                      <span class="font-semibold text-xs text-on-surface">Messaging Platforms (Signal Relay)</span>
                      <p class="text-[11px] text-outline mt-0.5">
                        External chat platforms where this computer's agents answer via the Signal relay service.
                      </p>
                    </div>

                    <div class="space-y-2 text-xs">
                      {/* Slack with Slack Orchestrator */}
                      <div class="p-3 rounded-lg bg-surface-container border border-outline-variant/20 flex items-center justify-between">
                        <div>
                          <div class="font-semibold text-on-surface flex items-center gap-2">
                            <span>Slack Workspace</span>
                            <span class="px-1.5 py-0.2 bg-primary/20 text-primary text-[10px] font-mono rounded">
                              Slack Orchestrator
                            </span>
                          </div>
                          <div class="text-[11px] text-outline mt-0.5">
                            The Slack Orchestrator is the agent that receives each new conversation and asks its teammates.
                          </div>
                        </div>
                        <button
                          onClick={() => updateMessagingConnectionAction('msg-slack', { status: 'connected' })}
                          class="px-2.5 py-1 rounded bg-surface-container-high hover:bg-surface-bright font-semibold text-[11px]"
                        >
                          Configure
                        </button>
                      </div>

                      {/* WhatsApp via Baileys (Unofficial Notice) */}
                      <div class="p-3 rounded-lg bg-surface-container border border-tertiary/40 flex items-center justify-between">
                        <div>
                          <div class="font-semibold text-on-surface flex items-center gap-2">
                            <span>WhatsApp</span>
                            <span class="px-1.5 py-0.2 bg-tertiary/20 text-tertiary text-[10px] font-mono rounded uppercase font-bold">
                              Unofficial Client
                            </span>
                          </div>
                          <div class="text-[11px] text-tertiary/90 mt-0.5">
                            Connected via vendored Baileys (an unofficial client, NOT an official WhatsApp Business API integration).
                          </div>
                        </div>
                        <button
                          onClick={() => connectWhatsAppBaileysAction()}
                          class="px-2.5 py-1 rounded bg-tertiary text-on-tertiary font-semibold text-[11px]"
                        >
                          Connect Baileys
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Show>

              {/* TAB: HOSTED SITES & SSO */}
              <Show when={state.activeSettingsTab === 'hosted_sites'}>
                <div class="space-y-4">
                  {/* Hosted Sites on openbot.site */}
                  <div class="p-4 rounded-xl bg-surface-container-low border border-outline-variant/20 space-y-3">
                    <div class="flex items-center justify-between">
                      <div>
                        <span class="font-semibold text-xs text-on-surface">Hosted Sites (openbot.site)</span>
                        <p class="text-[11px] text-outline mt-0.5">
                          Sites published to openbot.site have a strict 30-day expiry. Deleting a site returns HTTP 410 Gone.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          const sub = prompt('Subdomain name:');
                          const title = prompt('Site title:');
                          if (sub && title) publishHostedSiteAction({ subdomain: sub, siteTitle: title });
                        }}
                        class="px-3 py-1.5 bg-primary text-on-primary text-xs font-semibold rounded-lg hover:brightness-110 flex items-center gap-1"
                      >
                        <span class="material-symbols-outlined text-[15px]">publish</span>
                        <span>Publish Site</span>
                      </button>
                    </div>

                    <div class="space-y-2 text-xs">
                      <div class="p-3 rounded-lg bg-surface-container border border-outline-variant/20 flex items-center justify-between">
                        <div>
                          <div class="font-semibold text-on-surface">demo.openbot.site</div>
                          <div class="text-[11px] text-outline">Clean Room Workstation Artifacts · Expires in 30 days</div>
                        </div>
                        <button
                          onClick={() => deleteHostedSiteAction('site-demo')}
                          class="text-error hover:underline text-xs"
                        >
                          Delete (410 Gone)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Status Page Endpoint */}
                  <div class="p-4 rounded-xl bg-surface-container-low border border-outline-variant/20 flex items-center justify-between text-xs">
                    <div>
                      <div class="font-semibold text-on-surface">System Status Page</div>
                      <div class="text-[11px] text-outline">Global service reachability and Signal relay uptime.</div>
                    </div>
                    <a
                      href="https://status.openbot.run"
                      target="_blank"
                      class="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high rounded text-primary font-mono text-[11px] border border-outline-variant/30 flex items-center gap-1"
                    >
                      <span>status.openbot.run</span>
                      <span class="material-symbols-outlined text-[14px]">open_in_new</span>
                    </a>
                  </div>

                  {/* Enterprise SSO & SCIM */}
                  <div class="p-4 rounded-xl bg-surface-container-low border border-outline-variant/20 space-y-3 text-xs">
                    <div class="flex items-center justify-between">
                      <span class="font-semibold text-on-surface">Company Sign-In (OpenID Connect) & SCIM</span>
                      <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-secondary/15 text-secondary">
                        Desktop Setup Only
                      </span>
                    </div>
                    <p class="text-[11px] text-outline">
                      Authenticate team members via Microsoft Entra ID, Okta, or Google Workspace with automated SCIM user provisioning. When off, people sign in with email 8-character codes.
                    </p>

                    <div class="flex flex-wrap gap-2 pt-1">
                      <button
                        onClick={() => testBrowserSSOAction('entra')}
                        class="px-2.5 py-1 rounded bg-surface-container hover:bg-surface-bright border border-outline-variant/20 text-on-surface flex items-center gap-1.5"
                      >
                        <span class="material-symbols-outlined text-[14px]">login</span>
                        <span>Test Entra ID</span>
                      </button>
                      <button
                        onClick={() => testBrowserSSOAction('okta')}
                        class="px-2.5 py-1 rounded bg-surface-container hover:bg-surface-bright border border-outline-variant/20 text-on-surface flex items-center gap-1.5"
                      >
                        <span class="material-symbols-outlined text-[14px]">login</span>
                        <span>Test Okta</span>
                      </button>
                      <button
                        onClick={() => testBrowserSSOAction('google_workspace')}
                        class="px-2.5 py-1 rounded bg-surface-container hover:bg-surface-bright border border-outline-variant/20 text-on-surface flex items-center gap-1.5"
                      >
                        <span class="material-symbols-outlined text-[14px]">login</span>
                        <span>Test Google Workspace</span>
                      </button>
                    </div>

                    {/* DNS TXT Verification */}
                    <div class="p-3 rounded-lg bg-surface-container border border-outline-variant/20 space-y-2">
                      <div class="flex justify-between items-center">
                        <span class="font-semibold text-[11px] text-on-surface">DNS TXT Domain Ownership Verification</span>
                        <span class="text-[10px] font-mono text-secondary">
                          {state.extendedSSO?.dnsVerified ? '● DNS TXT Verified' : '○ Pending Verification'}
                        </span>
                      </div>
                      <div class="font-mono text-[11px] text-outline bg-surface-container-lowest px-2 py-1 rounded border border-outline-variant/20">
                        {state.extendedSSO?.dnsTxtRecord || 'openbot-site-verification=37a1e0b51294fdc89a0'}
                      </div>
                      <button
                        onClick={() => verifySSODNSAction('synthetify.io')}
                        class="px-2.5 py-1 rounded bg-surface-container-high hover:bg-surface-bright text-[11px] text-on-surface font-semibold"
                      >
                        Verify DNS Record
                      </button>
                    </div>

                    {/* SCIM User Sync */}
                    <div class="p-3 rounded-lg bg-surface-container border border-outline-variant/20 space-y-2">
                      <div class="flex justify-between items-center">
                        <span class="font-semibold text-[11px] text-on-surface">SCIM 2.0 User Provisioning</span>
                        <span class="text-[10px] font-mono text-outline">Status: {state.extendedSSO?.scimStatus || 'disabled'}</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <button
                          onClick={async () => {
                            const res = await generateSCIMTokenAction();
                            if (res) setActiveScimToken(res);
                          }}
                          class="px-2.5 py-1 rounded bg-primary text-on-primary font-semibold text-[11px] hover:brightness-110"
                        >
                          Generate SCIM Token
                        </button>
                        <button
                          onClick={() => {
                            revokeSCIMTokenAction();
                            setActiveScimToken(null);
                          }}
                          class="px-2.5 py-1 rounded bg-surface-container-high hover:bg-error/20 hover:text-error font-medium text-[11px]"
                        >
                          Revoke SCIM Token
                        </button>
                      </div>

                      <Show when={activeScimToken()}>
                        <div class="p-2.5 rounded bg-error-container/20 border border-error/30 space-y-1">
                          <div class="text-[10px] font-bold text-error uppercase">Shown Only Once</div>
                          <div class="font-mono text-[11px] text-on-surface break-all bg-surface-container-lowest p-1.5 rounded">
                            {activeScimToken()?.rawToken}
                          </div>
                          <div class="text-[10px] text-outline">{activeScimToken()?.warning}</div>
                        </div>
                      </Show>
                    </div>
                  </div>
                </div>
              </Show>

              {/* OTHER TABS PLACEHOLDER / REALISTIC DETAILS */}
              <Show when={!['general', 'server_general', 'members', 'roles', 'audit_log', 'remote_desktop', 'agents', 'mcp', 'computer_use', 'billing', 'profile', 'mobile_connect', 'updates', 'hosted_servers', 'voice', 'connectors', 'hosted_sites'].includes(state.activeSettingsTab)}>
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
