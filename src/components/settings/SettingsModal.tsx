import { Component, createSignal, For, Show } from 'solid-js';
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
  { id: 'voice', name: 'Voice', icon: 'mic', description: 'Dictation in the message box. Local models run on this computer; ElevenLabs and Groq run in the cloud.' },
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
              <Show when={!['general', 'server_general', 'members', 'roles', 'audit_log', 'remote_desktop', 'agents', 'mcp', 'computer_use', 'billing', 'updates', 'hosted_servers'].includes(state.activeSettingsTab)}>
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
