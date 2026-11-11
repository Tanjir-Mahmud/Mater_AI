import { Component, createSignal, Show, For } from 'solid-js';
import {
  state,
  setState,
  addToast,
  takeOverTabLockAction,
  requestDownloadSlotAction,
  cancelFileTransferAction,
  parseAndCleanDeepLinkAction,
} from '../../stores/appState';

export const WebClientModal: Component = () => {
  const [downloadSlotCount, setDownloadSlotCount] = createSignal(1);
  const [simulatedDeepLink, setSimulatedDeepLink] = createSignal(
    'https://openbot.run/app?server=srv-cluster-01&secret=secret_token_alpha&host=openbot.run&name=ProdCluster'
  );

  const handleTestDownload = async (fileId: string) => {
    const res = await requestDownloadSlotAction(fileId);
    if (res?.granted) {
      setDownloadSlotCount(res.activeDownloads);
      addToast('success', 'Download Started', `Acquired slot for "${fileId}" (${res.activeDownloads} / 2 active).`);
    }
  };

  const handleParseDeepLink = async () => {
    const res = await parseAndCleanDeepLinkAction(simulatedDeepLink());
    if (res) {
      addToast('success', 'Deep Link Processed', `Type: ${res.linkType}. Cleaned URL: ${res.cleanedUrl}`);
    }
  };

  return (
    <Show when={state.isWebClientModalOpen}>
      <div
        class="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 backdrop-blur-sm select-none p-4"
        onClick={() => setState('isWebClientModalOpen', false)}
      >
        <div
          class="w-[880px] max-w-full max-h-[90vh] bg-surface-container border border-outline-variant/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 text-on-surface"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div class="p-3 bg-surface-container-high border-b border-outline-variant/30 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-primary text-[20px]">language</span>
              <div>
                <div class="font-headline-sm text-xs font-semibold text-on-surface">OpenBot Web Client (/app)</div>
                <div class="text-[10px] text-outline font-mono">openbot.run/app · Cookie-only email sign-in</div>
              </div>
            </div>
            <button
              onClick={() => setState('isWebClientModalOpen', false)}
              class="w-6 h-6 rounded flex items-center justify-center hover:bg-surface-container text-outline hover:text-on-surface"
            >
              <span class="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>

          <div class="p-4 space-y-4 overflow-y-auto">
            {/* Multi-Tab Single-Session Lock Warning Banner */}
            <div class="w-full bg-error-container text-on-error-container rounded-xl p-3 shadow-md flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-7 h-7 rounded bg-error text-on-error flex items-center justify-center shrink-0">
                  <span class="material-symbols-outlined text-base">lock_clock</span>
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-xs text-on-error-container">Single Active Session Lock</span>
                    <span class="px-1.5 py-0.2 rounded bg-surface/30 text-[10px] font-mono uppercase text-on-error-container">
                      Read-Only Safety
                    </span>
                  </div>
                  <p class="text-[11px] text-on-error-container/90 truncate mt-0.5">
                    Another tab or workstation opened OpenBot at <span class="font-bold">14:26:10 UTC</span> (Hash: 0x9f8c..41a).
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => takeOverTabLockAction('server-local', 'user-owner-default', 'tab-web-active')}
                  class="h-7 px-3 bg-on-error-container text-error-container font-semibold text-xs rounded hover:opacity-90 active:scale-95 transition-all"
                >
                  Take Over This Tab
                </button>
                <button
                  onClick={() => setState('isWebClientModalOpen', false)}
                  class="h-7 px-3 bg-surface/30 text-on-error-container font-semibold text-xs rounded hover:bg-surface/50 transition-all"
                >
                  Close Tab
                </button>
              </div>
            </div>

            {/* Inline Media Rules & Object URL Allowlist */}
            <div class="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <h4 class="font-semibold text-xs text-on-surface">Inline Media & Object URL Security Allowlist</h4>
                  <p class="text-[11px] text-outline mt-0.5">
                    Images &le; 2 MB display thumbnail; MP3/MOV &le; 10 MB gets player button; larger files keep only Download.
                  </p>
                </div>
                <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-secondary/15 text-secondary">
                  Concurrent Downloads: {downloadSlotCount()} / 2 Max
                </span>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {/* 1. Image <= 2 MB */}
                <div class="p-3 rounded-lg bg-surface-container border border-outline-variant/20 flex flex-col justify-between">
                  <div>
                    <span class="font-semibold text-on-surface">chart-spec.png (1.2 MB)</span>
                    <div class="text-[10px] text-secondary font-mono mt-0.5">Mode: Thumbnail & Auto-download</div>
                    <div class="text-[10px] text-outline mt-1">Object URL allowed (image/png)</div>
                  </div>
                  <div class="mt-2 h-16 rounded bg-surface-container-highest flex items-center justify-center text-outline">
                    <span class="material-symbols-outlined text-2xl text-secondary">image</span>
                  </div>
                </div>

                {/* 2. Media <= 10 MB */}
                <div class="p-3 rounded-lg bg-surface-container border border-outline-variant/20 flex flex-col justify-between">
                  <div>
                    <span class="font-semibold text-on-surface">voice-memo.mp3 (7.4 MB)</span>
                    <div class="text-[10px] text-primary font-mono mt-0.5">Mode: Player Button</div>
                    <div class="text-[10px] text-outline mt-1">Click downloads whole file, then plays</div>
                  </div>
                  <button
                    onClick={() => handleTestDownload('voice-memo.mp3')}
                    class="mt-2 py-1.5 rounded bg-surface-container-high hover:bg-surface-bright flex items-center justify-center gap-1.5 font-semibold text-on-surface"
                  >
                    <span class="material-symbols-outlined text-[16px] text-primary">play_circle</span>
                    <span>Download & Play</span>
                  </button>
                </div>

                {/* 3. Disallowed SVG / HTML */}
                <div class="p-3 rounded-lg bg-surface-container border border-error/30 flex flex-col justify-between">
                  <div>
                    <span class="font-semibold text-on-surface">exploit-test.svg / page.html</span>
                    <div class="text-[10px] text-error font-mono mt-0.5">Mode: Object URL Strictly Denied</div>
                    <div class="text-[10px] text-outline mt-1">HTML, SVG, XHTML never get Object URLs</div>
                  </div>
                  <div class="mt-2 py-1.5 px-2 rounded bg-error-container/20 text-error text-[10px] font-mono text-center">
                    BLOCKED FOR XSS SAFETY
                  </div>
                </div>
              </div>
            </div>

            {/* Deep Links Parsing & Secret Stripping */}
            <div class="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <h4 class="font-semibold text-xs text-on-surface">Deep Links at /app & URL Parameter Stripping</h4>
                  <p class="text-[11px] text-outline mt-0.5">
                    Accepts ?agent=&lt;id&gt;, ?server=&lt;id&gt;&amp;secret=..., ?plugin=&lt;slug&gt;, ?billing=portal. Removes secret parameters immediately.
                  </p>
                </div>
                <button
                  onClick={() => handleParseDeepLink()}
                  class="px-2.5 py-1 rounded bg-primary text-on-primary font-semibold text-xs hover:brightness-110"
                >
                  Test Parse & Strip
                </button>
              </div>

              <div class="p-2.5 rounded bg-surface-container font-mono text-[11px] text-on-surface break-all border border-outline-variant/20">
                {simulatedDeepLink()}
              </div>

              <Show when={state.pendingDeepLink}>
                <div class="p-2.5 rounded bg-surface-container-lowest border border-outline-variant/20 text-xs space-y-1">
                  <div class="text-secondary font-bold font-mono">
                    Parsed Link Type: {state.pendingDeepLink?.linkType} (Never auto-joins without user press)
                  </div>
                  <div class="text-outline font-mono">
                    Cleaned URL (Secrets Stripped): <span class="text-on-surface font-semibold">{state.pendingDeepLink?.cleanedUrl}</span>
                  </div>
                </div>
              </Show>
            </div>

            {/* What Web Cannot Do vs Desktop */}
            <div class="p-3 rounded-lg bg-surface-container-lowest border border-outline-variant/20 text-[11px] text-outline space-y-1">
              <div class="font-semibold text-on-surface">Desktop-Only Capabilities (Excluded from Web):</div>
              <ul class="list-disc pl-4 space-y-0.5">
                <li>No remote desktop control or viewer.</li>
                <li>No hosted-site publishing to openbot.site.</li>
                <li>Providers & permissions and app updates stay desktop-only.</li>
                <li>No web dashboard, welcome screen, separate conversation toolbar, or always-visible invitation form.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
};
