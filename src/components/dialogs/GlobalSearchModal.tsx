import { Component, createSignal, For, Show, onMount, onCleanup } from 'solid-js';
import { state, setState, selectAgent, selectPage } from '../../stores/appState';
import { i18n } from '../../shared/i18n';

export const GlobalSearchModal: Component = () => {
  const [query, setQuery] = createSignal('');
  let inputRef: HTMLInputElement | undefined;

  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      setState('isGlobalSearchOpen', !state.isGlobalSearchOpen);
      if (state.isGlobalSearchOpen) {
        setTimeout(() => inputRef?.focus(), 50);
      }
    } else if (e.key === 'Escape' && state.isGlobalSearchOpen) {
      setState('isGlobalSearchOpen', false);
    }
  };

  onMount(() => {
    window.addEventListener('keydown', handleKeyDown);
    onCleanup(() => window.removeEventListener('keydown', handleKeyDown));
  });

  const searchResults = () => {
    const q = query().trim().toLowerCase();
    if (!q) return [];

    const results: { id: string; title: string; category: string; icon: string; action: () => void }[] = [];

    // Search agents
    state.agents.forEach((agent) => {
      if (agent.name.toLowerCase().includes(q) || agent.role.toLowerCase().includes(q)) {
        results.push({
          id: agent.id,
          title: `${agent.name} (${agent.role})`,
          category: 'Agents',
          icon: 'smart_toy',
          action: () => {
            selectAgent(agent.id);
            setState('isGlobalSearchOpen', false);
          },
        });
      }
    });

    // Search pages
    const pages = [
      { id: 'agents', name: 'Agents Workstation', icon: 'smart_toy' },
      { id: 'schedule', name: 'Routines Schedule', icon: 'calendar_month' },
      { id: 'tasks', name: 'Autonomous Tasks', icon: 'task_alt' },
      { id: 'workflows', name: 'Workflow Studio', icon: 'account_tree' },
      { id: 'usage', name: 'Usage & Quotas', icon: 'data_usage' },
      { id: 'library', name: 'Artifacts Library', icon: 'inventory_2' },
      { id: 'marketplace', name: 'Marketplace Plugins', icon: 'storefront' },
      { id: 'settings', name: 'Preferences & Settings', icon: 'settings' },
    ];

    pages.forEach((page) => {
      if (page.name.toLowerCase().includes(q)) {
        results.push({
          id: page.id,
          title: page.name,
          category: 'Pages',
          icon: page.icon,
          action: () => {
            selectPage(page.id as any);
            setState('isGlobalSearchOpen', false);
          },
        });
      }
    });

    return results;
  };

  return (
    <Show when={state.isGlobalSearchOpen}>
      <div
        class="fixed inset-0 z-[110] flex items-start justify-center pt-24 bg-black/60 backdrop-blur-xs animate-in fade-in select-none"
        onClick={() => setState('isGlobalSearchOpen', false)}
      >
        <div
          class="w-[540px] bg-surface-container border border-outline-variant/40 rounded-xl shadow-2xl overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Header */}
          <div class="p-3 border-b border-outline-variant/30 flex items-center gap-2.5">
            <span class="material-symbols-outlined text-outline text-[20px]">search</span>
            <input
              ref={inputRef}
              type="text"
              value={query()}
              onInput={(e) => setQuery(e.currentTarget.value)}
              placeholder={i18n.t('search.placeholder')}
              class="w-full bg-transparent border-0 outline-none font-body-sm text-sm text-on-surface placeholder:text-outline"
            />
            <span class="text-[10px] font-label-sm text-outline px-1.5 py-0.5 rounded bg-surface-container-high">
              ESC
            </span>
          </div>

          {/* Results List */}
          <div class="max-h-80 overflow-y-auto p-2 flex flex-col gap-0.5">
            <Show
              when={searchResults().length > 0}
              fallback={
                <div class="py-8 text-center text-xs text-outline">
                  {query() ? i18n.t('search.no_results') : i18n.t('search.hint')}
                </div>
              }
            >
              <For each={searchResults()}>
                {(item) => (
                  <button
                    onClick={item.action}
                    class="w-full flex items-center justify-between p-2 rounded hover:bg-surface-container-high text-left transition-colors group"
                  >
                    <div class="flex items-center gap-2.5">
                      <span class="material-symbols-outlined text-[17px] text-outline group-hover:text-primary">
                        {item.icon}
                      </span>
                      <span class="text-xs text-on-surface font-medium">{item.title}</span>
                    </div>
                    <span class="text-[10px] font-label-sm text-outline uppercase px-1.5 py-0.5 rounded bg-surface-container-lowest">
                      {item.category}
                    </span>
                  </button>
                )}
              </For>
            </Show>
          </div>
        </div>
      </div>
    </Show>
  );
};
