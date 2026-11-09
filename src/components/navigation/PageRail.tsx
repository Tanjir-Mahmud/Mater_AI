import { Component, createSignal, For, Show } from 'solid-js';
import { state, selectPage, setState } from '../../stores/appState';
import { PageId } from '../../types';
import { i18n } from '../../shared/i18n';

interface PageItem {
  id: PageId;
  labelKey: string;
  icon: string;
  isExternal?: boolean;
}

const ALL_PAGES: PageItem[] = [
  { id: 'agents', labelKey: 'rail.agents', icon: 'smart_toy' },
  { id: 'schedule', labelKey: 'rail.schedule', icon: 'calendar_month' },
  { id: 'tasks', labelKey: 'rail.tasks', icon: 'task_alt' },
  { id: 'workflows', labelKey: 'rail.workflows', icon: 'account_tree' },
  { id: 'usage', labelKey: 'rail.usage', icon: 'data_usage' },
  { id: 'library', labelKey: 'rail.library', icon: 'inventory_2' },
  { id: 'marketplace', labelKey: 'rail.marketplace', icon: 'storefront' },
  { id: 'settings', labelKey: 'rail.settings', icon: 'settings' },
  { id: 'website', labelKey: 'rail.website', icon: 'open_in_new', isExternal: true },
];

export const PageRail: Component = () => {
  const [isMoreOpen, setIsMoreOpen] = createSignal(false);
  const [isHelpOpen, setIsHelpOpen] = createSignal(false);

  const togglePin = (pageId: PageId) => {
    if (state.pinnedPages.includes(pageId)) {
      setState('pinnedPages', (prev) => prev.filter((p) => p !== pageId));
    } else {
      setState('pinnedPages', (prev) => [...prev, pageId]);
    }
  };

  return (
    <aside
      class="w-12 h-full bg-surface-container-low border-r border-outline-variant/30 flex flex-col items-center py-2 select-none z-30 flex-shrink-0"
      aria-label={i18n.t('rail.pages')}
    >
      {/* Top Branding / Logo */}
      <button
        onClick={() => selectPage('agents')}
        class="w-8 h-8 rounded-md flex items-center justify-center bg-primary-container/20 text-primary mb-3 hover:bg-primary-container/30 transition-colors"
        title="OpenBot"
      >
        <span class="material-symbols-outlined text-[18px]">terminal</span>
      </button>

      {/* Pages Navigation List */}
      <div class="flex-1 flex flex-col gap-1 items-center w-full px-1 overflow-y-auto">
        <For each={ALL_PAGES.filter((p) => state.pinnedPages.includes(p.id))}>
          {(page) => {
            const isActive = () => state.activePage === page.id;
            return (
              <button
                onClick={() => selectPage(page.id)}
                class={`w-9 h-9 rounded-md flex items-center justify-center relative transition-colors ${
                  isActive()
                    ? 'bg-primary-container text-on-primary-container shadow-sm'
                    : 'text-outline hover:text-on-surface hover:bg-surface-container'
                }`}
                title={i18n.t(page.labelKey)}
              >
                <Show when={isActive()}>
                  <div class="absolute -left-1 top-2 bottom-2 w-0.5 bg-primary rounded-r" />
                </Show>
                <span class="material-symbols-outlined text-[20px]">{page.icon}</span>
              </button>
            );
          }}
        </For>

        {/* More Menu Trigger */}
        <div class="relative w-full flex justify-center mt-1">
          <button
            onClick={() => setIsMoreOpen(!isMoreOpen())}
            class={`w-9 h-9 rounded-md flex items-center justify-center transition-colors ${
              isMoreOpen()
                ? 'bg-surface-container-high text-on-surface'
                : 'text-outline hover:text-on-surface hover:bg-surface-container'
            }`}
            title={i18n.t('rail.more')}
          >
            <span class="material-symbols-outlined text-[18px]">more_horiz</span>
          </button>

          {/* More Flyout Menu with Page Pins */}
          <Show when={isMoreOpen()}>
            <div
              class="fixed inset-0 z-40"
              onClick={() => setIsMoreOpen(false)}
            />
            <div class="absolute left-11 top-0 w-52 bg-surface-container border border-outline-variant/40 rounded-lg shadow-xl p-1 z-50 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-150">
              <div class="px-2.5 py-1 text-[11px] font-label-sm text-outline uppercase tracking-wider font-semibold">
                Pages & Pins
              </div>
              <For each={ALL_PAGES}>
                {(page) => {
                  const isPinned = () => state.pinnedPages.includes(page.id);
                  return (
                    <div class="flex items-center justify-between px-2 py-1.5 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors">
                      <button
                        onClick={() => {
                          selectPage(page.id);
                          setIsMoreOpen(false);
                        }}
                        class="flex items-center gap-2 flex-1 text-left"
                      >
                        <span class="material-symbols-outlined text-[17px] text-outline">
                          {page.icon}
                        </span>
                        <span class="font-body-sm text-[12px]">{i18n.t(page.labelKey)}</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePin(page.id);
                        }}
                        class={`p-1 rounded hover:bg-surface-container-highest transition-colors ${
                          isPinned() ? 'text-primary' : 'text-outline hover:text-on-surface'
                        }`}
                        title={isPinned() ? i18n.t('rail.unpin') : i18n.t('rail.pin')}
                      >
                        <span class="material-symbols-outlined text-[15px]">
                          {isPinned() ? 'push_pin' : 'keep_off'}
                        </span>
                      </button>
                    </div>
                  );
                }}
              </For>
            </div>
          </Show>
        </div>
      </div>

      {/* Bottom Utility Items: Help & Settings */}
      <div class="flex flex-col gap-1 items-center w-full px-1 pt-2 border-t border-outline-variant/30">
        {/* Help Menu Trigger */}
        <div class="relative w-full flex justify-center">
          <button
            onClick={() => setIsHelpOpen(!isHelpOpen())}
            class={`w-9 h-9 rounded-md flex items-center justify-center transition-colors ${
              isHelpOpen()
                ? 'bg-surface-container-high text-on-surface'
                : 'text-outline hover:text-on-surface hover:bg-surface-container'
            }`}
            title={i18n.t('rail.help')}
          >
            <span class="material-symbols-outlined text-[19px]">help_outline</span>
          </button>

          {/* Help Popup Menu */}
          <Show when={isHelpOpen()}>
            <div
              class="fixed inset-0 z-40"
              onClick={() => setIsHelpOpen(false)}
            />
            <div class="absolute left-11 bottom-0 w-48 bg-surface-container border border-outline-variant/40 rounded-lg shadow-xl p-1 z-50 flex flex-col gap-0.5 animate-in fade-in duration-150">
              <button
                onClick={() => {
                  setIsHelpOpen(false);
                  addToast('success', 'What\'s new in OpenBot v0.1.0');
                }}
                class="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface text-[12px] font-body-sm text-left"
              >
                <span class="material-symbols-outlined text-[16px] text-primary">auto_awesome</span>
                <span>What's new</span>
              </button>
              <button
                onClick={() => {
                  setIsHelpOpen(false);
                  window.open('https://openbot.run/changelog', '_blank');
                }}
                class="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface text-[12px] font-body-sm text-left"
              >
                <span class="material-symbols-outlined text-[16px] text-outline">history</span>
                <span>Full changelog</span>
              </button>
              <button
                onClick={() => {
                  setIsHelpOpen(false);
                  window.open('https://openbot.run/docs', '_blank');
                }}
                class="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface text-[12px] font-body-sm text-left"
              >
                <span class="material-symbols-outlined text-[16px] text-outline">menu_book</span>
                <span>Guides</span>
              </button>
              <button
                onClick={() => {
                  setIsHelpOpen(false);
                  window.open('https://discord.gg/openbot', '_blank');
                }}
                class="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface text-[12px] font-body-sm text-left"
              >
                <span class="material-symbols-outlined text-[16px] text-secondary">forum</span>
                <span>Join the Discord</span>
              </button>
              <div class="h-px bg-outline-variant/30 my-0.5" />
              <button
                onClick={() => {
                  setIsHelpOpen(false);
                  window.open('https://github.com/nightly-labs/openbot/issues', '_blank');
                }}
                class="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface text-[12px] font-body-sm text-left"
              >
                <span class="material-symbols-outlined text-[16px] text-error">bug_report</span>
                <span>Report a problem</span>
              </button>
            </div>
          </Show>
        </div>

        {/* Settings Button */}
        <button
          onClick={() => setState('isSettingsOpen', true)}
          class="w-9 h-9 rounded-md flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
          title={i18n.t('rail.settings')}
        >
          <span class="material-symbols-outlined text-[19px]">settings</span>
        </button>
      </div>
    </aside>
  );
};
