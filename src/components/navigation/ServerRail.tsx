import { Component, createSignal, For, Show } from 'solid-js';
import { state, setState, addToast } from '../../stores/appState';
import { ServerInfo } from '../../types';
import { i18n } from '../../shared/i18n';

export const ServerRail: Component = () => {
  const [activeMenuServerId, setActiveMenuServerId] = createSignal<string | null>(null);
  const [isAddServerOpen, setIsAddServerOpen] = createSignal(false);
  const [isMuteSubmenuOpen, setIsMuteSubmenuOpen] = createSignal(false);

  const selectServer = (serverId: string) => {
    setState('selectedServerId', serverId);
  };

  const handleMute = (duration: string) => {
    addToast('success', `Muted notifications for ${duration}`);
    setActiveMenuServerId(null);
    setIsMuteSubmenuOpen(false);
  };

  return (
    <aside
      class="w-12 h-full bg-surface-container-lowest border-r border-outline-variant/30 flex flex-col items-center py-2 select-none z-20 flex-shrink-0"
      aria-label="Server Rail"
    >
      {/* Servers list */}
      <div class="flex-1 flex flex-col gap-2 items-center w-full px-1 overflow-y-auto">
        <For each={state.servers}>
          {(server) => {
            const isSelected = () => state.selectedServerId === server.id;
            const isMenuOpen = () => activeMenuServerId() === server.id;

            return (
              <div class="relative group">
                <button
                  onClick={() => selectServer(server.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setActiveMenuServerId(server.id);
                  }}
                  class={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs relative transition-all ${
                    isSelected()
                      ? 'bg-primary text-on-primary ring-2 ring-primary/40'
                      : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                  }`}
                  title={`${server.name} (${server.status})`}
                >
                  <Show when={isSelected()}>
                    <div class="absolute -left-1.5 top-2.5 bottom-2.5 w-1 bg-primary rounded-r-full" />
                  </Show>

                  {/* Icon or Initials */}
                  {server.isLocal ? (
                    <span class="material-symbols-outlined text-[18px]">dns</span>
                  ) : (
                    <span>{server.name.substring(0, 2).toUpperCase()}</span>
                  )}

                  {/* Status dot */}
                  <span
                    class={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-surface-container-lowest ${
                      server.status === 'online'
                        ? 'bg-secondary'
                        : server.status === 'loading' || server.status === 'updating'
                        ? 'bg-tertiary animate-pulse'
                        : 'bg-outline'
                    }`}
                  />
                </button>

                {/* Server Menu Button on Hover */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuServerId(isMenuOpen() ? null : server.id);
                  }}
                  class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-surface-container-highest text-outline hover:text-on-surface opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] shadow transition-opacity"
                  title="Server actions"
                >
                  <span class="material-symbols-outlined text-[11px]">more_vert</span>
                </button>

                {/* Server Context Menu */}
                <Show when={isMenuOpen()}>
                  <div
                    class="fixed inset-0 z-40"
                    onClick={() => {
                      setActiveMenuServerId(null);
                      setIsMuteSubmenuOpen(false);
                    }}
                  />
                  <div class="absolute left-11 top-0 w-52 bg-surface-container border border-outline-variant/40 rounded-lg shadow-2xl p-1 z-50 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-150">
                    <div class="px-2.5 py-1 text-[11px] font-label-sm text-outline border-b border-outline-variant/20 mb-1 flex items-center justify-between">
                      <span class="truncate">{server.name}</span>
                      <span class="text-[9px] uppercase px-1 rounded bg-surface-container-highest">
                        {server.isLocal ? 'Local' : 'Cloud'}
                      </span>
                    </div>

                    {/* Mute option with submenu */}
                    <div class="relative">
                      <button
                        onClick={() => setIsMuteSubmenuOpen(!isMuteSubmenuOpen())}
                        class="w-full flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface text-[12px] font-body-sm text-left"
                      >
                        <div class="flex items-center gap-2">
                          <span class="material-symbols-outlined text-[15px] text-outline">
                            notifications_off
                          </span>
                          <span>{i18n.t('server.mute')}</span>
                        </div>
                        <span class="material-symbols-outlined text-[13px] text-outline">
                          chevron_right
                        </span>
                      </button>

                      <Show when={isMuteSubmenuOpen()}>
                        <div class="absolute left-full top-0 w-44 bg-surface-container-high border border-outline-variant/40 rounded-lg shadow-2xl p-1 flex flex-col gap-0.5">
                          <button
                            onClick={() => handleMute('15 minutes')}
                            class="px-2 py-1 rounded hover:bg-surface-container-highest text-left text-[11px]"
                          >
                            15 minutes
                          </button>
                          <button
                            onClick={() => handleMute('1 hour')}
                            class="px-2 py-1 rounded hover:bg-surface-container-highest text-left text-[11px]"
                          >
                            1 hour
                          </button>
                          <button
                            onClick={() => handleMute('3 hours')}
                            class="px-2 py-1 rounded hover:bg-surface-container-highest text-left text-[11px]"
                          >
                            3 hours
                          </button>
                          <button
                            onClick={() => handleMute('8 hours')}
                            class="px-2 py-1 rounded hover:bg-surface-container-highest text-left text-[11px]"
                          >
                            8 hours
                          </button>
                          <button
                            onClick={() => handleMute('24 hours')}
                            class="px-2 py-1 rounded hover:bg-surface-container-highest text-left text-[11px]"
                          >
                            24 hours
                          </button>
                          <button
                            onClick={() => handleMute('Until turned back on')}
                            class="px-2 py-1 rounded hover:bg-surface-container-highest text-left text-[11px] text-tertiary"
                          >
                            Until I turn it back on
                          </button>
                        </div>
                      </Show>
                    </div>

                    <button
                      onClick={() => {
                        setActiveMenuServerId(null);
                        setState('activeSettingsTab', 'notifications');
                        setState('isSettingsOpen', true);
                      }}
                      class="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface text-[12px] font-body-sm text-left"
                    >
                      <span class="material-symbols-outlined text-[15px] text-outline">tune</span>
                      <span>{i18n.t('server.notification_settings')}</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveMenuServerId(null);
                        setState('activePage', 'usage');
                      }}
                      class="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface text-[12px] font-body-sm text-left"
                    >
                      <span class="material-symbols-outlined text-[15px] text-outline">
                        monitoring
                      </span>
                      <span>{i18n.t('server.usage')}</span>
                    </button>

                    <div class="h-px bg-outline-variant/30 my-0.5" />

                    <button
                      onClick={() => {
                        setActiveMenuServerId(null);
                        setState('activeSettingsTab', 'general');
                        setState('isSettingsOpen', true);
                      }}
                      class="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface text-[12px] font-body-sm text-left"
                    >
                      <span class="material-symbols-outlined text-[15px] text-outline">
                        settings
                      </span>
                      <span>{i18n.t('server.settings')}</span>
                    </button>
                  </div>
                </Show>
              </div>
            );
          }}
        </For>

        {/* Add Server Button */}
        <button
          onClick={() => setIsAddServerOpen(true)}
          class="w-9 h-9 rounded-lg border border-dashed border-outline-variant hover:border-primary text-outline hover:text-primary flex items-center justify-center transition-colors"
          title={i18n.t('server.add_server')}
        >
          <span class="material-symbols-outlined text-[18px]">add</span>
        </button>
      </div>

      {/* Add Server Modal */}
      <Show when={isAddServerOpen()}>
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div class="w-[460px] bg-surface-container border border-outline-variant/40 rounded-xl shadow-2xl p-5 flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <h2 class="font-headline-sm text-headline-sm text-on-surface">Add Server</h2>
              <button
                onClick={() => setIsAddServerOpen(false)}
                class="p-1 rounded text-outline hover:text-on-surface hover:bg-surface-container-high"
              >
                <span class="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <p class="font-body-sm text-body-sm text-outline">
              Connect to a hosted cloud server, spin up another instance on this computer, or join an existing server with an invitation.
            </p>

            <div class="flex flex-col gap-2">
              <button
                onClick={() => {
                  setIsAddServerOpen(false);
                  addToast('success', 'Hosted server plans opened in Billing');
                  setState('activeSettingsTab', 'hosted_servers');
                  setState('isSettingsOpen', true);
                }}
                class="flex items-center gap-3 p-3 rounded-lg border border-outline-variant/30 hover:border-primary bg-surface-container-low hover:bg-surface-container-high transition-all text-left"
              >
                <div class="w-8 h-8 rounded bg-primary/20 text-primary flex items-center justify-center flex-shrink-0">
                  <span class="material-symbols-outlined text-[18px]">cloud</span>
                </div>
                <div>
                  <div class="font-body-sm font-semibold text-on-surface">Create Hosted Server</div>
                  <div class="font-label-sm text-[11px] text-outline">Runs 24/7 in the cloud without needing your computer on.</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsAddServerOpen(false);
                  addToast('success', 'New local node configured');
                }}
                class="flex items-center gap-3 p-3 rounded-lg border border-outline-variant/30 hover:border-primary bg-surface-container-low hover:bg-surface-container-high transition-all text-left"
              >
                <div class="w-8 h-8 rounded bg-secondary/20 text-secondary flex items-center justify-center flex-shrink-0">
                  <span class="material-symbols-outlined text-[18px]">computer</span>
                </div>
                <div>
                  <div class="font-body-sm font-semibold text-on-surface">New Server on This Computer</div>
                  <div class="font-label-sm text-[11px] text-outline">Isolate workspaces, port bindings, and environments.</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsAddServerOpen(false);
                  addToast('warning', 'Paste invitation link to join');
                }}
                class="flex items-center gap-3 p-3 rounded-lg border border-outline-variant/30 hover:border-primary bg-surface-container-low hover:bg-surface-container-high transition-all text-left"
              >
                <div class="w-8 h-8 rounded bg-tertiary/20 text-tertiary flex items-center justify-center flex-shrink-0">
                  <span class="material-symbols-outlined text-[18px]">group_add</span>
                </div>
                <div>
                  <div class="font-body-sm font-semibold text-on-surface">Join by Invitation Link</div>
                  <div class="font-label-sm text-[11px] text-outline">Connect to your team's existing BissBot server.</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </Show>
    </aside>
  );
};
