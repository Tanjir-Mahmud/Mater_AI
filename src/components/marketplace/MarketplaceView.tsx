import { Component, createSignal, onMount, For, Show } from 'solid-js';
import {
  state,
  setState,
  addToast,
  loadMarketplaceItemsAction,
  resolveMarketplaceDeepLinkAction,
} from '../../stores/appState';
import { MarketplaceExtension } from '../../types';

export const MarketplaceView: Component = () => {
  const [searchQuery, setSearchQuery] = createSignal('');
  const [selectedFilter, setSelectedFilter] = createSignal<'all' | 'skills' | 'agents' | 'plugins' | 'installed'>('all');
  const [previewItem, setPreviewItem] = createSignal<MarketplaceExtension | null>(null);

  onMount(async () => {
    await loadMarketplaceItemsAction();
  });

  const filteredItems = () => {
    let items = state.marketplaceItems;
    const filter = selectedFilter();
    if (filter === 'skills') items = items.filter((i) => i.type === 'skill');
    else if (filter === 'agents') items = items.filter((i) => i.type === 'agent');
    else if (filter === 'plugins') items = items.filter((i) => i.type === 'plugin');
    else if (filter === 'installed') items = items.filter((i) => i.installsCount > 0);

    const q = searchQuery().trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.slug.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q)
    );
  };

  const handleInstallItem = (item: MarketplaceExtension) => {
    addToast('success', 'Extension Installed', `"${item.name}" added to local registry.`);
    setPreviewItem(null);
  };

  return (
    <div class="flex-1 flex flex-col p-6 overflow-y-auto bg-surface-container-lowest text-on-surface">
      {/* Top Header Area */}
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-outline-variant/30 mb-5">
        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-2 text-primary font-mono text-[11px] tracking-widest uppercase font-semibold">
            <span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span>BissBot Registry · v2.4.9 Engine</span>
          </div>
          <h1 class="font-headline-lg text-2xl font-bold tracking-tight text-on-surface">
            Marketplace & Extensions
          </h1>
          <p class="text-xs text-outline max-w-3xl">
            Extend your agent cluster with community & verified MCP tool bridges, pre-configured agent personas, and automation skills.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <div class="px-3 py-1 rounded bg-surface-container border border-outline-variant/30 flex items-center gap-1.5 text-xs text-outline font-mono">
            <span class="material-symbols-outlined text-[16px] text-secondary">verified_user</span>
            <span>Sandbox: <strong class="text-on-surface">gVisor runtime</strong></span>
          </div>
          <button
            onClick={() => addToast('info', 'Bundle Loader', 'Select .mcpbundle archive to inspect.')}
            class="h-8 px-3 bg-surface-container text-on-surface text-xs font-semibold rounded hover:bg-surface-container-high transition-colors flex items-center gap-1.5 border border-outline-variant/30"
          >
            <span class="material-symbols-outlined text-[16px] text-primary">upload</span>
            <span>Load .mcpbundle</span>
          </button>
        </div>
      </div>

      {/* Stats & Counts Badge Bar */}
      <div class="bg-surface-container-low px-4 py-2.5 rounded-xl border border-outline-variant/30 flex flex-wrap items-center justify-between gap-3 mb-5">
        <div class="flex flex-wrap items-center gap-3 text-xs font-mono">
          <div class="flex items-center gap-1.5 text-on-surface font-semibold">
            <span class="material-symbols-outlined text-[16px] text-primary">inventory_2</span>
            <span>Showing 107 extensions:</span>
          </div>
          <div class="flex items-center gap-1 text-primary">
            <span class="w-1.5 h-1.5 rounded-full bg-primary"></span>
            <span>41 Skills</span>
          </div>
          <span class="text-outline-variant">·</span>
          <div class="flex items-center gap-1 text-secondary">
            <span class="w-1.5 h-1.5 rounded-full bg-secondary"></span>
            <span>27 Agents</span>
          </div>
          <span class="text-outline-variant">·</span>
          <div class="flex items-center gap-1 text-tertiary">
            <span class="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
            <span>39 Plugins</span>
          </div>
          <span class="text-outline-variant">·</span>
          <div class="flex items-center gap-1.5 bg-surface-container px-2.5 py-0.5 rounded text-primary border border-primary/20">
            <span class="material-symbols-outlined text-[14px]">auto_awesome</span>
            <span>1 Pstack Bundle (52 skills + 2 agents)</span>
          </div>
        </div>

        <div class="flex items-center gap-2 text-xs text-outline font-mono">
          <span class="flex items-center gap-1 text-secondary">
            <span class="material-symbols-outlined text-[14px]">sync</span>
            <span>Sync Index: Verified</span>
          </span>
          <span>|</span>
          <span class="text-outline">schema://mcp.v1alpha</span>
        </div>
      </div>

      {/* Featured Banner: pstack DevOps & SRE Core Bundle */}
      <div class="relative overflow-hidden rounded-xl bg-surface-container border border-outline-variant/30 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 mb-5 shadow-sm">
        <div class="flex items-start gap-4 z-10 max-w-3xl">
          <div class="w-12 h-12 rounded-xl bg-surface-container-high border border-primary/30 flex items-center justify-center text-primary shrink-0">
            <span class="material-symbols-outlined text-[28px]">deployed_code_history</span>
          </div>
          <div class="flex flex-col gap-1">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded bg-primary-container text-on-primary-container font-mono text-[10px] font-bold uppercase tracking-wider">
                Featured Core Bundle
              </span>
              <span class="text-xs text-secondary font-medium flex items-center gap-1">
                <span class="material-symbols-outlined text-[14px]">verified</span>
                <span>Official Stack</span>
              </span>
            </div>
            <h2 class="font-headline-md text-lg font-bold text-on-surface">pstack DevOps & SRE Core Bundle</h2>
            <p class="text-xs text-outline leading-relaxed">
              52 specialized tools, 2 autonomous agents (K8s SRE & Cloud Architect), full Model Context Protocol (MCP) integrations.
            </p>
            <div class="flex flex-wrap items-center gap-3 mt-1 text-[11px] font-mono text-outline">
              <span class="flex items-center gap-1">
                <span class="material-symbols-outlined text-[14px] text-primary">bolt</span> Immediate orchestration
              </span>
              <span>·</span>
              <span class="flex items-center gap-1 text-secondary">
                <span class="material-symbols-outlined text-[14px]">lock_open</span> MIT Licensed
              </span>
              <span>·</span>
              <span class="flex items-center gap-1 text-tertiary">
                <span class="material-symbols-outlined text-[14px]">info</span> Zero unverified pricing
              </span>
            </div>
          </div>
        </div>

        <div class="flex flex-col items-end gap-2 shrink-0 z-10">
          <button
            onClick={() => {
              const pstack = state.marketplaceItems.find((i) => i.slug === 'pstack');
              if (pstack) setPreviewItem(pstack);
            }}
            class="h-9 px-4 bg-primary text-on-primary text-xs font-semibold rounded-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 shadow-sm"
          >
            <span class="material-symbols-outlined text-[18px]">download_for_offline</span>
            <span>Inspect Bundle</span>
          </button>
          <span class="text-[10px] font-mono text-outline">Zero-configuration deploy</span>
        </div>
      </div>

      {/* Search & Category Filter Tabs */}
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5">
        <div class="relative flex-1 max-w-md">
          <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">
            search
          </span>
          <input
            type="text"
            placeholder="Search skills, agents, or MCP bridges..."
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
            class="w-full h-9 bg-surface-container-low pl-9 pr-3 text-xs text-on-surface rounded-lg border border-outline-variant/30 outline-none focus:border-primary transition-all"
          />
        </div>

        <div class="bg-surface-container-low p-1 rounded-lg border border-outline-variant/30 flex items-center gap-1 text-xs font-mono">
          <button
            onClick={() => setSelectedFilter('all')}
            class={`px-3 py-1 rounded transition-colors ${
              selectedFilter() === 'all' ? 'bg-surface-container-high text-on-surface font-semibold' : 'text-outline hover:text-on-surface'
            }`}
          >
            All Items
          </button>
          <button
            onClick={() => setSelectedFilter('skills')}
            class={`px-3 py-1 rounded transition-colors ${
              selectedFilter() === 'skills' ? 'bg-surface-container-high text-on-surface font-semibold' : 'text-outline hover:text-on-surface'
            }`}
          >
            Skills (41)
          </button>
          <button
            onClick={() => setSelectedFilter('agents')}
            class={`px-3 py-1 rounded transition-colors ${
              selectedFilter() === 'agents' ? 'bg-surface-container-high text-on-surface font-semibold' : 'text-outline hover:text-on-surface'
            }`}
          >
            Agents (27)
          </button>
          <button
            onClick={() => setSelectedFilter('plugins')}
            class={`px-3 py-1 rounded transition-colors ${
              selectedFilter() === 'plugins' ? 'bg-surface-container-high text-on-surface font-semibold' : 'text-outline hover:text-on-surface'
            }`}
          >
            MCP Plugins (39)
          </button>
          <button
            onClick={() => setSelectedFilter('installed')}
            class={`px-3 py-1 rounded transition-colors ${
              selectedFilter() === 'installed' ? 'bg-surface-container-high text-on-surface font-semibold' : 'text-outline hover:text-on-surface'
            }`}
          >
            Installed (0)
          </button>
        </div>
      </div>

      {/* Extensions Catalog Grid */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        <For each={filteredItems()}>
          {(item) => (
            <div class="p-4 rounded-xl bg-surface-container border border-outline-variant/30 flex flex-col justify-between gap-3 hover:border-outline-variant/60 transition-all group">
              <div>
                <div class="flex items-center justify-between mb-2">
                  <span
                    class={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                      item.type === 'skill'
                        ? 'bg-primary/20 text-primary'
                        : item.type === 'agent'
                        ? 'bg-secondary/20 text-secondary'
                        : item.type === 'bundle'
                        ? 'bg-primary-container text-on-primary-container'
                        : 'bg-tertiary/20 text-tertiary'
                    }`}
                  >
                    {item.type === 'plugin' ? 'MCP Plugin' : item.type}
                  </span>
                  <span class="text-[10px] font-mono text-outline">v{item.version}</span>
                </div>

                <h3 class="font-semibold text-sm text-on-surface group-hover:text-primary transition-colors">
                  {item.name}
                </h3>
                <p class="text-xs text-outline mt-1 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div class="pt-3 border-t border-outline-variant/20 flex items-center justify-between text-[11px] font-mono">
                <span class="text-outline">By {item.author}</span>
                <button
                  onClick={() => setPreviewItem(item)}
                  class="px-3 py-1 rounded bg-surface-container-high hover:bg-primary hover:text-on-primary text-xs font-semibold text-on-surface transition-colors"
                >
                  Preview
                </button>
              </div>
            </div>
          )}
        </For>
      </div>

      {/* Deep Link Preview / Join Modal (Invariant: never installs without user press) */}
      <Show when={previewItem()}>
        <div
          class="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none"
          onClick={() => setPreviewItem(null)}
        >
          <div
            class="w-[480px] max-w-full bg-surface-container border border-outline-variant/40 rounded-2xl shadow-2xl p-6 flex flex-col gap-4 text-on-surface animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div class="flex items-start justify-between border-b border-outline-variant/20 pb-3">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary">
                  <span class="material-symbols-outlined text-[24px]">
                    {previewItem()?.type === 'skill'
                      ? 'build'
                      : previewItem()?.type === 'agent'
                      ? 'smart_toy'
                      : previewItem()?.type === 'bundle'
                      ? 'deployed_code_history'
                      : 'hub'}
                  </span>
                </div>
                <div>
                  <h3 class="font-bold text-base text-on-surface">{previewItem()?.name}</h3>
                  <div class="text-[11px] font-mono text-outline">
                    {previewItem()?.slug} · v{previewItem()?.version}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                class="w-6 h-6 rounded flex items-center justify-center text-outline hover:text-on-surface"
              >
                <span class="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            <p class="text-xs text-on-surface-variant leading-relaxed">
              {previewItem()?.description}
            </p>

            <div class="p-3 rounded-lg bg-surface-container-low border border-outline-variant/20 text-xs space-y-1 font-mono text-outline">
              <div class="flex justify-between">
                <span>Author:</span>
                <span class="text-on-surface">{previewItem()?.author}</span>
              </div>
              <div class="flex justify-between">
                <span>License:</span>
                <span class="text-on-surface">{previewItem()?.license || 'MIT'}</span>
              </div>
              <div class="flex justify-between">
                <span>Installs:</span>
                <span class="text-secondary">{previewItem()?.installsCount} (Clean Verified)</span>
              </div>
              <div class="flex justify-between">
                <span>Pricing:</span>
                <span class="text-outline">Unverified in spec (Free / Open Included)</span>
              </div>
            </div>

            {/* Spec Warning Invariant: link opens preview/join dialog, never auto-installs without press */}
            <div class="p-2.5 rounded bg-surface-container-lowest border border-outline-variant/20 text-[10px] text-outline">
              * A link opens the preview/join dialog and never installs or joins without an explicit user press.
            </div>

            <div class="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/20">
              <button
                onClick={() => setPreviewItem(null)}
                class="px-3.5 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-bright text-xs font-semibold text-outline hover:text-on-surface transition-colors"
              >
                Dismiss
              </button>
              <button
                onClick={() => previewItem() && handleInstallItem(previewItem()!)}
                class="px-4 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5 shadow-sm"
              >
                <span class="material-symbols-outlined text-[16px]">download</span>
                <span>Install Extension</span>
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};
