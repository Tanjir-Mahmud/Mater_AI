import { Component, createSignal, For, Show } from 'solid-js';
import {
  state,
  setState,
  selectAgent,
  selectChannel,
  selectPerson,
  markAllAsRead,
  addToast,
  openCreateAgentModal,
  openEditAgentModal,
  deleteAgent,
  exportAgentTemplate,
  createThreadForAgent,
  switchAgentThread,
  renameAgentThread,
  closeAgentThread,
  toggleThreadListExpanded,
} from '../../stores/appState';
import { Agent, Channel, Person, Folder } from '../../types';
import { i18n } from '../../shared/i18n';

export const Sidebar: Component = () => {
  const [isNewMenuOpen, setIsNewMenuOpen] = createSignal(false);
  const [activeContextMenu, setActiveContextMenu] = createSignal<{
    type: 'agent' | 'channel';
    id: string;
    x: number;
    y: number;
  } | null>(null);

  const [collapsedSections, setCollapsedSections] = createSignal<Record<string, boolean>>({
    pinned: false,
    needs_you: false,
    unassigned: false,
    people: false,
    hidden: true,
  });

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const currentServer = () =>
    state.servers.find((s) => s.id === state.selectedServerId) || state.servers[0];

  const filteredAgents = () => {
    const q = state.sidebarSearchQuery.trim().toLowerCase();
    if (!q) return state.agents;
    return state.agents.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q) ||
        a.status.toLowerCase().includes(q)
    );
  };

  const pinnedAgents = () => filteredAgents().filter((a) => a.section === 'pinned');
  const needsYouAgents = () => filteredAgents().filter((a) => a.section === 'needs_you');
  const unassignedAgents = () => filteredAgents().filter((a) => a.section === 'unassigned');
  const hiddenAgents = () => filteredAgents().filter((a) => a.section === 'hidden');

  const handleAgentContextMenu = (e: MouseEvent, agentId: string) => {
    e.preventDefault();
    setActiveContextMenu({
      type: 'agent',
      id: agentId,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleChannelContextMenu = (e: MouseEvent, channelId: string) => {
    e.preventDefault();
    setActiveContextMenu({
      type: 'channel',
      id: channelId,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleDeleteAgent = async (agentId: string) => {
    setActiveContextMenu(null);
    await deleteAgent(agentId);
  };

  const duplicateAgent = (agentId: string) => {
    const agent = state.agents.find((a) => a.id === agentId);
    if (!agent) return;
    const newAgent: Agent = {
      ...agent,
      id: `agent-${Date.now()}`,
      name: `${agent.name} (Copy)`,
      unreadCount: 0,
    };
    setState('agents', (prev) => [...prev, newAgent]);
    addToast('success', `Duplicated ${agent.name}`);
    setActiveContextMenu(null);
  };

  const hideAgent = (agentId: string) => {
    setState('agents', (a) => a.id === agentId, 'section', 'hidden');
    addToast('success', 'Agent hidden');
    setActiveContextMenu(null);
  };

  const restoreAgent = (agentId: string) => {
    setState('agents', (a) => a.id === agentId, 'section', 'unassigned');
    addToast('success', 'Agent restored to Unassigned');
    setActiveContextMenu(null);
  };

  return (
    <nav
      class="h-full bg-surface-container-low border-r border-outline-variant/30 flex flex-col select-none relative z-10 flex-shrink-0"
      style={{ width: `${state.sidebarWidth}px` }}
      aria-label="Agent Navigation"
    >
      {/* Sidebar Header */}
      <div class="h-10 px-3 flex items-center justify-between border-b border-outline-variant/30 flex-shrink-0">
        <div class="flex items-center gap-1 text-outline">
          <button
            class="w-6 h-6 rounded flex items-center justify-center hover:bg-surface-container hover:text-on-surface transition-colors"
            title="Back"
          >
            <span class="material-symbols-outlined text-[15px]">arrow_back</span>
          </button>
          <button
            class="w-6 h-6 rounded flex items-center justify-center hover:bg-surface-container hover:text-on-surface transition-colors"
            title="Forward"
          >
            <span class="material-symbols-outlined text-[15px]">arrow_forward</span>
          </button>
        </div>

        <div class="flex items-center gap-1">
          <button
            onClick={() => markAllAsRead()}
            class="w-6 h-6 rounded flex items-center justify-center text-outline hover:text-primary hover:bg-surface-container transition-colors"
            title={i18n.t('sidebar.mark_all_read')}
          >
            <span class="material-symbols-outlined text-[16px]">done_all</span>
          </button>

          <button
            onClick={() => setState('activePage', 'marketplace')}
            class="w-6 h-6 rounded flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
            title="Marketplace"
          >
            <span class="material-symbols-outlined text-[16px]">storefront</span>
          </button>

          <button
            onClick={() => {
              setState('activeSettingsTab', 'general');
              setState('isSettingsOpen', true);
            }}
            class="w-6 h-6 rounded flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
            title="Server settings"
          >
            <span class="material-symbols-outlined text-[16px]">settings</span>
          </button>
        </div>
      </div>

      {/* Switcher & Search Bar */}
      <div class="p-2 flex flex-col gap-1.5 border-b border-outline-variant/20 flex-shrink-0">
        <div class="flex items-center justify-between gap-1">
          {/* Agents / Routines segmented control */}
          <div class="flex-1 flex rounded bg-surface-container p-0.5 text-xs font-label-sm">
            <button
              onClick={() => setState('sidebarView', 'agents')}
              class={`flex-1 py-1 rounded text-center transition-all ${
                state.sidebarView === 'agents'
                  ? 'bg-surface-container-high text-on-surface font-semibold shadow-xs'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              {i18n.t('sidebar.agents')}
            </button>
            <button
              onClick={() => setState('sidebarView', 'routines')}
              class={`flex-1 py-1 rounded text-center transition-all ${
                state.sidebarView === 'routines'
                  ? 'bg-surface-container-high text-on-surface font-semibold shadow-xs'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              {i18n.t('sidebar.routines')}
            </button>
          </div>

          {/* New Button with Dropdown */}
          <div class="relative">
            <button
              onClick={() => setIsNewMenuOpen(!isNewMenuOpen())}
              class="w-7 h-7 rounded bg-primary text-on-primary hover:brightness-110 flex items-center justify-center transition-all"
              title="New agent or folder"
            >
              <span class="material-symbols-outlined text-[16px]">add</span>
            </button>

            <Show when={isNewMenuOpen()}>
              <div
                class="fixed inset-0 z-40"
                onClick={() => setIsNewMenuOpen(false)}
              />
              <div class="absolute right-0 top-8 w-44 bg-surface-container border border-outline-variant/40 rounded-lg shadow-xl p-1 z-50 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={() => {
                    setIsNewMenuOpen(false);
                    openCreateAgentModal();
                  }}
                  class="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface text-[12px] font-body-sm text-left"
                >
                  <span class="material-symbols-outlined text-[15px] text-primary">smart_toy</span>
                  <span>{i18n.t('sidebar.new_agent')}</span>
                </button>
                <button
                  onClick={() => {
                    setIsNewMenuOpen(false);
                    addToast('success', 'Create new channel');
                  }}
                  class="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface text-[12px] font-body-sm text-left"
                >
                  <span class="material-symbols-outlined text-[15px] text-secondary">tag</span>
                  <span>{i18n.t('sidebar.new_channel')}</span>
                </button>
                <div class="h-px bg-outline-variant/30 my-0.5" />
                <button
                  onClick={() => {
                    setIsNewMenuOpen(false);
                    addToast('success', 'Create new folder');
                  }}
                  class="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface text-[12px] font-body-sm text-left"
                >
                  <span class="material-symbols-outlined text-[15px] text-outline">create_new_folder</span>
                  <span>{i18n.t('sidebar.new_folder')}</span>
                </button>
              </div>
            </Show>
          </div>
        </div>

        {/* Filter Input */}
        <div class="flex items-center gap-1.5 px-2 py-1 rounded bg-surface-container-lowest text-on-surface-variant border border-outline-variant/20 focus-within:border-primary/60 transition-colors">
          <span class="material-symbols-outlined text-[15px] text-outline">tune</span>
          <input
            type="text"
            placeholder={i18n.t('sidebar.search_placeholder')}
            value={state.sidebarSearchQuery}
            onInput={(e) => setState('sidebarSearchQuery', e.currentTarget.value)}
            class="bg-transparent border-0 outline-none font-body-sm text-[12px] text-on-surface placeholder:text-outline w-full"
          />
        </div>
      </div>

      {/* Navigation Tree Items */}
      <div class="flex-1 overflow-y-auto px-1.5 py-2 flex flex-col gap-3">
        {/* Empty state check */}
        <Show when={state.agents.length === 0}>
          <div class="p-4 text-center flex flex-col items-center justify-center gap-2 my-auto">
            <span class="material-symbols-outlined text-3xl text-outline">smart_toy</span>
            <div class="font-body-sm font-semibold text-on-surface">{i18n.t('sidebar.no_agents')}</div>
            <p class="font-body-sm text-[11px] text-outline">{i18n.t('sidebar.create_first_agent')}</p>
            <button
              onClick={() => addToast('success', 'Create agent prompt dialog')}
              class="px-3 py-1 rounded bg-primary text-on-primary text-xs font-semibold mt-2"
            >
              + Create Agent
            </button>
          </div>
        </Show>

        {/* Pinned Section */}
        <Show when={pinnedAgents().length > 0}>
          <div class="flex flex-col gap-0.5">
            <div
              onClick={() => toggleSection('pinned')}
              class="flex items-center justify-between px-2 py-1 text-on-surface-variant cursor-pointer group"
            >
              <div class="flex items-center gap-1 font-label-sm text-[11px] uppercase tracking-wider text-outline group-hover:text-on-surface">
                <span class="material-symbols-outlined text-[13px]">push_pin</span>
                <span>{i18n.t('sidebar.pinned')}</span>
              </div>
              <span class="font-label-sm text-[10px] text-outline px-1 rounded bg-surface-container">
                {pinnedAgents().length}
              </span>
            </div>

            <Show when={!collapsedSections().pinned}>
              <For each={pinnedAgents()}>
                {(agent) => {
                  const isSelected = () => state.selectedAgentId === agent.id;
                  return (
                    <div class="flex flex-col">
                      <div
                        onClick={() => selectAgent(agent.id)}
                        onContextMenu={(e) => handleAgentContextMenu(e, agent.id)}
                        class={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-colors relative group ${
                          isSelected()
                            ? 'bg-surface-container text-on-surface shadow-xs'
                            : 'hover:bg-surface-container/60 text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                      <Show when={isSelected()}>
                        <div class="absolute left-0 top-1 bottom-1 w-0.5 bg-primary rounded-full" />
                      </Show>

                      <div class="flex items-center gap-2 min-w-0 pl-1">
                        <div
                          class={`relative w-6 h-6 rounded flex items-center justify-center flex-shrink-0 font-label-sm text-[11px] font-semibold ${
                            agent.avatarColor || 'bg-surface-container-high text-primary'
                          }`}
                        >
                          {agent.avatar.length === 1 ? (
                            agent.avatar
                          ) : (
                            <span class="material-symbols-outlined text-[15px]">
                              {agent.avatar}
                            </span>
                          )}
                          <span
                            class={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-surface-container-low ${
                              agent.status === 'idle'
                                ? 'bg-secondary'
                                : agent.status === 'waiting_approval' || agent.status === 'waiting_input'
                                ? 'bg-tertiary'
                                : 'bg-outline'
                            }`}
                          />
                        </div>

                        <div class="flex flex-col min-w-0">
                          <span class="font-body-sm text-[12px] font-semibold truncate leading-tight">
                            {agent.name}
                          </span>
                          <span class="text-[10px] text-outline truncate leading-tight">
                            {agent.role}
                          </span>
                        </div>
                      </div>

                      <div class="flex items-center gap-1.5 flex-shrink-0">
                        <Show when={agent.statusMessage}>
                          <span class="px-1.5 py-0.2 rounded font-label-sm text-[9px] bg-tertiary-container/30 text-tertiary font-semibold flex items-center gap-1">
                            <span class="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
                            {agent.statusMessage}
                          </span>
                        </Show>

                        <Show when={agent.unreadCount > 0}>
                          <span class="w-4 h-4 rounded-full bg-primary text-on-primary text-[9px] font-label-sm font-semibold flex items-center justify-center">
                            {agent.unreadCount}
                          </span>
                        </Show>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleThreadListExpanded(agent.id);
                          }}
                          class="p-0.5 text-outline hover:text-on-surface rounded"
                          title="Toggle thread list"
                        >
                          <span class="material-symbols-outlined text-[13px]">
                            {state.isThreadListExpanded[agent.id] !== false ? 'expand_less' : 'expand_more'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Agent Open Threads List (Max 50) */}
                    <Show when={state.isThreadListExpanded[agent.id] !== false && (state.threads[agent.id]?.length || 0) > 0}>
                      <div class="ml-5 pl-2.5 border-l border-outline-variant/30 flex flex-col gap-0.5 my-1">
                        <div class="flex items-center justify-between pr-2 py-0.5 text-[10px] font-label-sm text-outline">
                          <span>THREADS ({(state.threads[agent.id] || []).length}/50)</span>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              await createThreadForAgent(agent.id);
                            }}
                            class="hover:text-primary transition-colors flex items-center gap-0.5"
                            title="New Thread (Max 50)"
                          >
                            <span class="material-symbols-outlined text-[12px]">add</span>
                            <span>New</span>
                          </button>
                        </div>
                        <For each={state.threads[agent.id] || []}>
                          {(thread) => {
                            const isThreadActive = () => state.activeThreadId[agent.id] === thread.id;
                            return (
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  selectAgent(agent.id);
                                  switchAgentThread(agent.id, thread.id);
                                }}
                                class={`flex items-center justify-between px-2 py-1 rounded text-xs cursor-pointer group transition-colors ${
                                  isThreadActive()
                                    ? 'bg-primary/10 text-primary font-semibold'
                                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/50'
                                }`}
                              >
                                <div class="flex items-center gap-1.5 min-w-0">
                                  <span class="material-symbols-outlined text-[13px] text-outline group-hover:text-primary">
                                    {thread.kind === 'branch'
                                      ? 'alt_route'
                                      : thread.kind === 'side'
                                      ? 'side_navigation'
                                      : 'chat_bubble_outline'}
                                  </span>
                                  <span class="truncate text-[11px]">{thread.title}</span>
                                </div>
                                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const newT = prompt('Rename thread:', thread.title);
                                      if (newT && newT.trim()) {
                                        renameAgentThread(agent.id, thread.id, newT.trim());
                                      }
                                    }}
                                    class="p-0.5 hover:text-primary"
                                    title="Rename"
                                  >
                                    <span class="material-symbols-outlined text-[11px]">edit</span>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      closeAgentThread(agent.id, thread.id);
                                    }}
                                    class="p-0.5 hover:text-error"
                                    title="Close thread"
                                  >
                                    <span class="material-symbols-outlined text-[11px]">close</span>
                                  </button>
                                </div>
                              </div>
                            );
                          }}
                        </For>
                      </div>
                    </Show>
                  </div>
                  );
                }}
              </For>
            </Show>
          </div>
        </Show>

        {/* Needs You Section */}
        <Show when={needsYouAgents().length > 0}>
          <div class="flex flex-col gap-1">
            <div
              onClick={() => toggleSection('needs_you')}
              class="flex items-center justify-between px-2 py-1 text-on-surface-variant cursor-pointer group"
            >
              <div class="flex items-center gap-1 font-label-sm text-[11px] uppercase tracking-wider text-tertiary group-hover:brightness-110">
                <span class="material-symbols-outlined text-[14px]">notifications_active</span>
                <span>{i18n.t('sidebar.needs_you')}</span>
              </div>
              <span class="px-1.5 rounded-full bg-tertiary-container/40 text-tertiary font-label-sm text-[10px] font-semibold">
                {needsYouAgents().length}
              </span>
            </div>

            <Show when={!collapsedSections().needs_you}>
              <For each={needsYouAgents()}>
                {(agent) => (
                  <div
                    onClick={() => selectAgent(agent.id)}
                    onContextMenu={(e) => handleAgentContextMenu(e, agent.id)}
                    class="flex flex-col gap-1 p-2 rounded bg-surface-container/60 hover:bg-surface-container cursor-pointer transition-all border border-tertiary/20"
                  >
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-1.5 min-w-0">
                        <span class="material-symbols-outlined text-[15px] text-tertiary">
                          {agent.avatar}
                        </span>
                        <span class="font-body-sm text-[12px] text-on-surface font-medium truncate">
                          {agent.name}
                        </span>
                      </div>
                      <span class="px-1 py-0.2 rounded font-label-sm text-[9px] bg-tertiary-container/30 text-tertiary font-semibold uppercase">
                        {agent.status === 'waiting_approval' ? 'APPROVAL' : 'WAIT'}
                      </span>
                    </div>

                    <Show when={agent.approvalCommand}>
                      <span class="font-label-sm text-[10px] text-on-surface-variant line-clamp-1 bg-surface-container-lowest p-1 rounded font-mono">
                        {agent.approvalCommand}
                      </span>
                    </Show>
                  </div>
                )}
              </For>
            </Show>
          </div>
        </Show>

        {/* Channels Section */}
        <Show when={state.channels.length > 0}>
          <div class="flex flex-col gap-0.5">
            <div class="flex items-center justify-between px-2 py-1 text-on-surface-variant">
              <div class="flex items-center gap-1 font-label-sm text-[11px] uppercase tracking-wider text-outline">
                <span class="material-symbols-outlined text-[13px]">forum</span>
                <span>Channels</span>
              </div>
              <span class="font-label-sm text-[10px] text-outline">{state.channels.length}</span>
            </div>

            <For each={state.channels}>
              {(channel) => {
                const isSelected = () => state.selectedChannelId === channel.id;
                return (
                  <div
                    onClick={() => selectChannel(channel.id)}
                    onContextMenu={(e) => handleChannelContextMenu(e, channel.id)}
                    class={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-colors ${
                      isSelected()
                        ? 'bg-surface-container text-on-surface'
                        : 'hover:bg-surface-container/60 text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <div class="flex items-center gap-2 min-w-0">
                      <span class="material-symbols-outlined text-[15px] text-outline">tag</span>
                      <span class="font-body-sm text-[12px] truncate">{channel.name}</span>
                    </div>

                    <div class="flex items-center gap-1">
                      <Show when={channel.isWorking}>
                        <span class="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                      </Show>
                      <Show when={channel.unreadCount > 0}>
                        <span class="w-4 h-4 rounded-full bg-primary text-on-primary text-[9px] font-label-sm font-semibold flex items-center justify-center">
                          {channel.unreadCount}
                        </span>
                      </Show>
                    </div>
                  </div>
                );
              }}
            </For>
          </div>
        </Show>

        {/* Unassigned Agents */}
        <Show when={unassignedAgents().length > 0}>
          <div class="flex flex-col gap-0.5">
            <div
              onClick={() => toggleSection('unassigned')}
              class="flex items-center justify-between px-2 py-1 text-on-surface-variant cursor-pointer group"
            >
              <div class="flex items-center gap-1 font-label-sm text-[11px] uppercase tracking-wider text-outline group-hover:text-on-surface">
                <span class="material-symbols-outlined text-[13px]">inbox</span>
                <span>{i18n.t('sidebar.unassigned')}</span>
              </div>
              <span class="font-label-sm text-[10px] text-outline">
                {unassignedAgents().length}
              </span>
            </div>

            <Show when={!collapsedSections().unassigned}>
              <For each={unassignedAgents()}>
                {(agent) => {
                  const isSelected = () => state.selectedAgentId === agent.id;
                  return (
                    <div class="flex flex-col">
                      <div
                        onClick={() => selectAgent(agent.id)}
                        onContextMenu={(e) => handleAgentContextMenu(e, agent.id)}
                        class={`flex items-center justify-between px-2 py-1 rounded cursor-pointer text-body-sm transition-colors ${
                          isSelected()
                            ? 'bg-surface-container text-on-surface font-semibold'
                            : 'hover:bg-surface-container text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        <div class="flex items-center gap-2 min-w-0">
                          <span class="material-symbols-outlined text-[15px] text-outline">
                            {agent.avatar}
                          </span>
                          <span class="truncate text-[12px]">{agent.name}</span>
                        </div>

                        <div class="flex items-center gap-1">
                          <Show when={agent.hasLimitChip}>
                            <span
                              class="px-1 rounded font-label-sm text-[9px] bg-error-container/40 text-error font-semibold"
                              title={`Limit reached. Resets at ${agent.limitResetTime}`}
                            >
                              LIMIT
                            </span>
                          </Show>
                          <span class="font-label-sm text-[10px] text-outline">
                            {agent.statusMessage || agent.status}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleThreadListExpanded(agent.id);
                            }}
                            class="p-0.5 text-outline hover:text-on-surface rounded"
                            title="Toggle thread list"
                          >
                            <span class="material-symbols-outlined text-[13px]">
                              {state.isThreadListExpanded[agent.id] !== false ? 'expand_less' : 'expand_more'}
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Unassigned Agent Threads */}
                      <Show when={state.isThreadListExpanded[agent.id] !== false && (state.threads[agent.id]?.length || 0) > 0}>
                        <div class="ml-5 pl-2.5 border-l border-outline-variant/30 flex flex-col gap-0.5 my-1">
                          <div class="flex items-center justify-between pr-2 py-0.5 text-[10px] font-label-sm text-outline">
                            <span>THREADS ({(state.threads[agent.id] || []).length}/50)</span>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                await createThreadForAgent(agent.id);
                              }}
                              class="hover:text-primary transition-colors flex items-center gap-0.5"
                            >
                              <span class="material-symbols-outlined text-[12px]">add</span>
                              <span>New</span>
                            </button>
                          </div>
                          <For each={state.threads[agent.id] || []}>
                            {(thread) => {
                              const isThreadActive = () => state.activeThreadId[agent.id] === thread.id;
                              return (
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    selectAgent(agent.id);
                                    switchAgentThread(agent.id, thread.id);
                                  }}
                                  class={`flex items-center justify-between px-2 py-0.5 rounded text-xs cursor-pointer group transition-colors ${
                                    isThreadActive()
                                      ? 'bg-primary/10 text-primary font-semibold'
                                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/50'
                                  }`}
                                >
                                  <div class="flex items-center gap-1.5 min-w-0">
                                    <span class="material-symbols-outlined text-[13px] text-outline group-hover:text-primary">
                                      {thread.kind === 'branch' ? 'alt_route' : 'chat_bubble_outline'}
                                    </span>
                                    <span class="truncate text-[11px]">{thread.title}</span>
                                  </div>
                                  <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const newT = prompt('Rename thread:', thread.title);
                                        if (newT && newT.trim()) renameAgentThread(agent.id, thread.id, newT.trim());
                                      }}
                                      class="p-0.5 hover:text-primary"
                                    >
                                      <span class="material-symbols-outlined text-[11px]">edit</span>
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        closeAgentThread(agent.id, thread.id);
                                      }}
                                      class="p-0.5 hover:text-error"
                                    >
                                      <span class="material-symbols-outlined text-[11px]">close</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            }}
                          </For>
                        </div>
                      </Show>
                    </div>
                  );
                }}
              </For>
            </Show>
          </div>
        </Show>

        {/* People / Direct Messages */}
        <Show when={state.people.length > 0}>
          <div class="flex flex-col gap-0.5">
            <div
              onClick={() => toggleSection('people')}
              class="flex items-center justify-between px-2 py-1 text-on-surface-variant cursor-pointer group"
            >
              <div class="flex items-center gap-1 font-label-sm text-[11px] uppercase tracking-wider text-outline group-hover:text-on-surface">
                <span class="material-symbols-outlined text-[13px]">group</span>
                <span>{i18n.t('sidebar.people')}</span>
              </div>
              <span class="font-label-sm text-[10px] text-outline">{state.people.length}</span>
            </div>

            <Show when={!collapsedSections().people}>
              <For each={state.people}>
                {(person) => {
                  const isSelected = () => state.selectedPersonId === person.id;
                  return (
                    <div
                      onClick={() => selectPerson(person.id)}
                      class={`flex items-center justify-between px-2 py-1 rounded cursor-pointer transition-colors ${
                        isSelected()
                          ? 'bg-surface-container text-on-surface'
                          : 'hover:bg-surface-container text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      <div class="flex items-center gap-2 min-w-0">
                        <div class="relative w-5 h-5 rounded-full bg-surface-container-high flex items-center justify-center font-bold text-[10px]">
                          {person.name[0]}
                          <span
                            class={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${
                              person.status === 'online' ? 'bg-secondary' : 'bg-outline'
                            }`}
                          />
                        </div>
                        <span class="text-[12px] truncate">{person.name}</span>
                      </div>

                      <Show when={person.unreadCount > 0}>
                        <span class="w-4 h-4 rounded-full bg-primary text-on-primary text-[9px] font-label-sm font-semibold flex items-center justify-center">
                          {person.unreadCount}
                        </span>
                      </Show>
                    </div>
                  );
                }}
              </For>
            </Show>
          </div>
        </Show>

        {/* Hidden Section (if any) */}
        <Show when={hiddenAgents().length > 0}>
          <div class="flex flex-col gap-0.5 mt-2 pt-2 border-t border-outline-variant/20">
            <div
              onClick={() => toggleSection('hidden')}
              class="flex items-center justify-between px-2 py-1 text-outline hover:text-on-surface cursor-pointer text-label-sm"
            >
              <div class="flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[13px]">visibility_off</span>
                <span>{i18n.t('sidebar.hidden')}</span>
              </div>
              <span class="text-[10px] font-label-sm">{hiddenAgents().length}</span>
            </div>

            <Show when={!collapsedSections().hidden}>
              <For each={hiddenAgents()}>
                {(agent) => (
                  <div class="flex items-center justify-between px-2 py-1 text-outline hover:text-on-surface text-[12px]">
                    <span class="truncate">{agent.name}</span>
                    <button
                      onClick={() => restoreAgent(agent.id)}
                      class="text-[10px] text-primary hover:underline"
                    >
                      Restore
                    </button>
                  </div>
                )}
              </For>
            </Show>
          </div>
        </Show>
      </div>

      {/* Sidebar Notification Cards (Storage, Machine, Community, Mobile) */}
      <div class="p-2 flex flex-col gap-2 border-t border-outline-variant/30 flex-shrink-0 bg-surface-container-lowest/50">
        {/* Storage Alert Card */}
        <Show
          when={
            !state.storageCardDismissed &&
            currentServer() &&
            currentServer().storage.percentUsed >= 90
          }
        >
          <div
            class={`p-2.5 rounded-lg border text-xs flex flex-col gap-1.5 ${
              currentServer().storage.percentUsed >= 98
                ? 'bg-error-container/20 border-error/40 text-on-error-container'
                : 'bg-tertiary-container/20 border-tertiary/30 text-on-surface'
            }`}
          >
            <div class="flex items-center justify-between font-semibold">
              <div class="flex items-center gap-1.5 text-tertiary">
                <span class="material-symbols-outlined text-[15px]">hard_drive</span>
                <span>{i18n.t('sidebar.storage_almost_full')}</span>
              </div>
              <Show when={currentServer().storage.percentUsed < 98}>
                <button
                  onClick={() => setState('storageCardDismissed', true)}
                  class="text-outline hover:text-on-surface"
                  title="Dismiss"
                >
                  <span class="material-symbols-outlined text-[14px]">close</span>
                </button>
              </Show>
            </div>
            <p class="text-[11px] text-outline">
              Server disk is {currentServer().storage.percentUsed}% full.
            </p>
            <button
              onClick={() => {
                setState('activeSettingsTab', 'general');
                setState('isSettingsOpen', true);
              }}
              class="self-start text-[11px] font-semibold text-primary hover:underline"
            >
              {i18n.t('sidebar.free_up_space')}
            </button>
          </div>
        </Show>

        {/* Community Card */}
        <Show when={!state.communityCardDismissed}>
          <div class="p-2.5 rounded-lg bg-surface-container border border-outline-variant/20 text-xs flex flex-col gap-1 relative group">
            <button
              onClick={() => setState('communityCardDismissed', true)}
              class="absolute top-1.5 right-1.5 text-outline hover:text-on-surface opacity-0 group-hover:opacity-100 transition-opacity"
              title="Dismiss"
            >
              <span class="material-symbols-outlined text-[13px]">close</span>
            </button>
            <div class="font-semibold text-on-surface text-[11px]">Join the Community</div>
            <p class="text-[10px] text-outline leading-relaxed">
              Pull up a chair. There's a place for you in the AI future. Join on Discord and X.
            </p>
          </div>
        </Show>

        {/* Drag to pin hint */}
        <div class="text-center text-[10px] font-label-sm text-outline/60 py-0.5">
          {i18n.t('sidebar.drag_to_pin')}
        </div>
      </div>

      {/* Context Menu Flyout */}
      <Show when={activeContextMenu()}>
        <div
          class="fixed inset-0 z-50"
          onClick={() => setActiveContextMenu(null)}
        />
        <div
          class="fixed w-48 bg-surface-container border border-outline-variant/40 rounded-lg shadow-2xl p-1 z-50 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100 text-[12px]"
          style={{
            left: `${activeContextMenu()!.x}px`,
            top: `${activeContextMenu()!.y}px`,
          }}
        >
          <Show when={activeContextMenu()!.type === 'agent'}>
            <button
              onClick={() => {
                const id = activeContextMenu()!.id;
                setActiveContextMenu(null);
                openEditAgentModal(id);
              }}
              class="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface text-left"
            >
              <span class="material-symbols-outlined text-[15px]">edit</span>
              <span>Edit agent</span>
            </button>

            <button
              onClick={() => {
                const id = activeContextMenu()!.id;
                setActiveContextMenu(null);
                exportAgentTemplate(id);
              }}
              class="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface text-left"
            >
              <span class="material-symbols-outlined text-[15px]">bookmark_add</span>
              <span>Save as Template</span>
            </button>

            <button
              onClick={() => duplicateAgent(activeContextMenu()!.id)}
              class="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface text-left"
            >
              <span class="material-symbols-outlined text-[15px]">content_copy</span>
              <span>Duplicate agent</span>
            </button>

            <button
              onClick={() => hideAgent(activeContextMenu()!.id)}
              class="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface text-left"
            >
              <span class="material-symbols-outlined text-[15px]">visibility_off</span>
              <span>Hide agent</span>
            </button>

            <div class="h-px bg-outline-variant/30 my-0.5" />

            <button
              onClick={() => handleDeleteAgent(activeContextMenu()!.id)}
              class="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-error-container/20 text-error text-left"
            >
              <span class="material-symbols-outlined text-[15px]">delete</span>
              <span>Delete agent</span>
            </button>
          </Show>

          <Show when={activeContextMenu()!.type === 'channel'}>
            <button
              onClick={() => {
                addToast('success', 'Edit channel');
                setActiveContextMenu(null);
              }}
              class="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-surface-container-high text-on-surface-variant text-left"
            >
              <span class="material-symbols-outlined text-[15px]">edit</span>
              <span>Edit channel</span>
            </button>
            <button
              onClick={() => {
                addToast('warning', 'Channel stopped and moved to Deleted');
                setActiveContextMenu(null);
              }}
              class="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-error-container/20 text-error text-left"
            >
              <span class="material-symbols-outlined text-[15px]">delete</span>
              <span>Delete channel</span>
            </button>
          </Show>
        </div>
      </Show>
    </nav>
  );
};
