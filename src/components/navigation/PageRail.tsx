import { Component, createSignal, For, Show } from 'solid-js';
import {
  state,
  selectPage,
  setState,
  addToast,
  openCreateAgentModal,
} from '../../stores/appState';
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
  { id: 'workflows', labelKey: 'rail.workflows', icon: 'account_tree' },
  { id: 'schedule', labelKey: 'rail.schedule', icon: 'calendar_month' },
  { id: 'tasks', labelKey: 'rail.tasks', icon: 'task_alt' },
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
      class="w-14 h-full bg-[#09090b] border-r border-zinc-800/60 flex flex-col items-center py-2.5 select-none z-30 flex-shrink-0"
      aria-label={i18n.t('rail.pages')}
    >
      {/* Top Branding / Squircle Logo with twin dashes */}
      <button
        onClick={() => selectPage('agents')}
        class="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center text-white font-mono font-bold text-xs shadow-md mb-3 hover:brightness-110 transition-all cursor-pointer"
        title="BissBot"
      >
        --
      </button>

      {/* Pages Navigation List */}
      <div class="flex-1 flex flex-col gap-1.5 items-center w-full px-1 overflow-y-auto">
        <For each={ALL_PAGES.filter((p) => state.pinnedPages.includes(p.id))}>
          {(page) => {
            const isActive = () => state.activePage === page.id;
            return (
              <button
                onClick={() => selectPage(page.id)}
                class={`w-9 h-9 rounded-xl flex items-center justify-center relative transition-all cursor-pointer ${
                  isActive()
                    ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                }`}
                title={i18n.t(page.labelKey)}
              >
                <Show when={isActive()}>
                  <div class="absolute -left-1 top-2 bottom-2 w-1 bg-purple-500 rounded-r-full" />
                </Show>
                <span class="material-symbols-outlined text-[19px]">{page.icon}</span>
              </button>
            );
          }}
        </For>

        {/* More Menu Trigger */}
        <div class="relative w-full flex justify-center mt-0.5">
          <button
            onClick={() => setIsMoreOpen(!isMoreOpen())}
            class={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              isMoreOpen()
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
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
            <div class="absolute left-12 top-0 w-52 bg-[#141418] border border-zinc-700/60 rounded-xl shadow-2xl p-1.5 z-50 flex flex-col gap-0.5 animate-in fade-in duration-150">
              <div class="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                Pages & Pins
              </div>
              <For each={ALL_PAGES}>
                {(page) => {
                  const isPinned = () => state.pinnedPages.includes(page.id);
                  return (
                    <div class="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors">
                      <button
                        onClick={() => {
                          selectPage(page.id);
                          setIsMoreOpen(false);
                        }}
                        class="flex items-center gap-2 flex-1 text-left cursor-pointer"
                      >
                        <span class="material-symbols-outlined text-[16px] text-zinc-400">
                          {page.icon}
                        </span>
                        <span class="text-xs font-medium">{i18n.t(page.labelKey)}</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePin(page.id);
                        }}
                        class={`p-1 rounded hover:bg-zinc-700 transition-colors cursor-pointer ${
                          isPinned() ? 'text-purple-400' : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                        title={isPinned() ? i18n.t('rail.unpin') : i18n.t('rail.pin')}
                      >
                        <span class="material-symbols-outlined text-[14px]">
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

      {/* Bottom Utility Items matching Screenshot 2026-11-05 131045.png */}
      <div class="flex flex-col gap-2 items-center w-full px-1 pt-2 border-t border-zinc-800/80">
        {/* Circular + button with emerald green border ring */}
        <button
          onClick={openCreateAgentModal}
          class="w-8 h-8 rounded-full border-2 border-emerald-500 hover:border-emerald-400 flex items-center justify-center text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-all shadow-sm cursor-pointer"
          title="New Agent"
        >
          <span class="material-symbols-outlined text-[18px]">add</span>
        </button>

        {/* Mobile Companion Quick Button */}
        <button
          onClick={() => setState('isMobileCompanionModalOpen', true)}
          class="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Mobile Companion"
        >
          <span class="material-symbols-outlined text-[18px]">smartphone</span>
        </button>

        {/* Help Menu Trigger */}
        <div class="relative w-full flex justify-center">
          <button
            onClick={() => setIsHelpOpen(!isHelpOpen())}
            class={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
              isHelpOpen()
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
            title={i18n.t('rail.help')}
          >
            <span class="material-symbols-outlined text-[18px]">help_outline</span>
          </button>

          {/* Help Popup Menu */}
          <Show when={isHelpOpen()}>
            <div
              class="fixed inset-0 z-40"
              onClick={() => setIsHelpOpen(false)}
            />
            <div class="absolute left-12 bottom-0 w-48 bg-[#141418] border border-zinc-700/60 rounded-xl shadow-2xl p-1.5 z-50 flex flex-col gap-0.5 animate-in fade-in duration-150">
              <button
                onClick={() => {
                  setIsHelpOpen(false);
                  addToast('success', "What's new in BissBot v0.1.0");
                }}
                class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs text-left cursor-pointer"
              >
                <span class="material-symbols-outlined text-[15px] text-purple-400">auto_awesome</span>
                <span>What's new</span>
              </button>
              <button
                onClick={() => {
                  setIsHelpOpen(false);
                  window.open('https://tiyandegital.com/changelog', '_blank');
                }}
                class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs text-left cursor-pointer"
              >
                <span class="material-symbols-outlined text-[15px] text-zinc-400">history</span>
                <span>Full changelog</span>
              </button>
              <button
                onClick={() => {
                  setIsHelpOpen(false);
                  window.open('https://tiyandegital.com/docs', '_blank');
                }}
                class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs text-left cursor-pointer"
              >
                <span class="material-symbols-outlined text-[15px] text-zinc-400">menu_book</span>
                <span>Guides</span>
              </button>
              <button
                onClick={() => {
                  setIsHelpOpen(false);
                  window.open('https://discord.gg/bissbot', '_blank');
                }}
                class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs text-left cursor-pointer"
              >
                <span class="material-symbols-outlined text-[15px] text-emerald-400">forum</span>
                <span>Join the Discord</span>
              </button>
              <div class="h-px bg-zinc-800 my-1" />
              <button
                onClick={() => {
                  setIsHelpOpen(false);
                  window.open('https://github.com/Tanjir-Mahmud/Mater_AI/issues', '_blank');
                }}
                class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 text-red-400 hover:text-red-300 text-xs text-left cursor-pointer"
              >
                <span class="material-symbols-outlined text-[15px] text-red-400">bug_report</span>
                <span>Report a problem</span>
              </button>
            </div>
          </Show>
        </div>

        {/* Settings Button */}
        <button
          onClick={() => setState('isSettingsOpen', true)}
          class="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
          title={i18n.t('rail.settings')}
        >
          <span class="material-symbols-outlined text-[18px]">settings</span>
        </button>

        {/* Update ready badge and Restart button matching Screenshot */}
        <div class="flex flex-col items-center gap-1 mt-1 pt-2 border-t border-zinc-800/80 w-full px-1">
          <span class="text-[9px] font-semibold text-sky-400 tracking-tight leading-tight text-center">
            Update ready
          </span>
          <button
            onClick={() => addToast('success', 'BissBot is up to date (v0.1.0-alpha)')}
            class="px-2 py-0.5 rounded bg-white hover:bg-zinc-200 text-black font-semibold text-[10px] flex items-center gap-0.5 shadow-sm transition-colors cursor-pointer"
            title="Restart to apply update"
          >
            <span>↻ Restart</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
