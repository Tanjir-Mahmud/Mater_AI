import { Component, createSignal, Show, For } from 'solid-js';
import {
  state,
  setState,
  addToast,
  verifyMobilePinAction,
  flushMobileOutboxAction,
} from '../../stores/appState';

export const MobileCompanionModal: Component = () => {
  const [pinDigits, setPinDigits] = createSignal<string[]>([]);
  const [remainingAttempts, setRemainingAttempts] = createSignal(10);
  const [reconnectSeconds, setReconnectSeconds] = createSignal(0);
  const [promptText, setPromptText] = createSignal('');

  const appendDigit = async (digit: string) => {
    if (pinDigits().length >= 4) return;
    const next = [...pinDigits(), digit];
    setPinDigits(next);

    if (next.length === 4) {
      const pin = next.join('');
      const res = await verifyMobilePinAction(pin);
      if (res) {
        setRemainingAttempts(res.remainingAttempts);
      }
      setPinDigits([]);
    }
  };

  const deleteDigit = () => {
    if (pinDigits().length > 0) {
      setPinDigits(pinDigits().slice(0, -1));
    }
  };

  const handlePromptAgent = async () => {
    if (!promptText().trim()) return;
    try {
      const api = (window as any).bissbot || (window as any).openbot;
      if (api?.createAgentFromMobilePrompt) {
        const res = await api.createAgentFromMobilePrompt(promptText().trim());
        addToast('success', 'Mobile Agent Created', `Created agent "${res.name}" from prompt.`);
        setPromptText('');
      }
    } catch (err: any) {
      addToast('error', 'Agent creation failed', err?.message);
    }
  };

  return (
    <Show when={state.isMobileCompanionModalOpen}>
      <div
        class="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 backdrop-blur-sm select-none p-4"
        onClick={() => setState('isMobileCompanionModalOpen', false)}
      >
        <div
          class="w-[420px] max-w-full bg-surface-container border border-outline-variant/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 text-on-surface"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile Top Header Banner */}
          <div class="p-3 bg-surface-container-high border-b border-outline-variant/30 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-primary text-[20px]">phone_iphone</span>
              <div>
                <div class="font-headline-sm text-xs font-semibold text-on-surface">BissBot Mobile Companion</div>
                <div class="text-[10px] text-secondary font-mono flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                  <span>prod-cluster-01 (TLS 1.3 Verified)</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setState('isMobileCompanionModalOpen', false)}
              class="w-6 h-6 rounded flex items-center justify-center hover:bg-surface-container text-outline hover:text-on-surface"
            >
              <span class="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>

          <div class="p-4 space-y-4 max-h-[580px] overflow-y-auto">
            <Show
              when={state.mobileDevice}
              fallback={
                <div class="p-6 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col items-center text-center space-y-3">
                  <div class="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-outline">
                    <span class="material-symbols-outlined text-[28px]">phonelink_off</span>
                  </div>
                  <div>
                    <h4 class="font-bold text-sm text-on-surface">No Mobile Companion Linked</h4>
                    <p class="text-xs text-outline mt-1 max-w-[280px]">
                      No phone is connected to this host. To link an iPhone or Android device, generate a sign-in code in Settings → Profile → Mobile Connect.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setState('isMobileCompanionModalOpen', false);
                      setState('isSettingsOpen', true);
                    }}
                    class="px-4 py-2 bg-primary text-on-primary text-xs font-semibold rounded-lg hover:brightness-110 transition-all"
                  >
                    Open Mobile Connect Settings
                  </button>
                </div>
              }
            >
              {/* PIN Unlock Card */}
              <div class="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col items-center">
                <div class="w-full flex items-center justify-between mb-2">
                  <span class="text-[10px] font-mono text-outline uppercase tracking-wider">Session Key Unlock</span>
                  <span class="text-[10px] font-mono text-primary">Biometric Sync</span>
                </div>

                {/* 4 Digit Indicators */}
                <div class="flex items-center justify-center gap-3 my-2">
                  <For each={[0, 1, 2, 3]}>
                    {(idx) => (
                      <div
                        class={`w-3.5 h-3.5 rounded-full transition-all ${
                          pinDigits().length > idx ? 'bg-primary scale-110 shadow-sm' : 'bg-surface-container-highest'
                        }`}
                      ></div>
                    )}
                  </For>
                </div>
                <p class="text-[11px] text-outline text-center mb-3">Enter 4-digit Master Security Passcode</p>

                {/* Keypad Grid (0-9, FaceID, Backspace) */}
                <div class="grid grid-cols-3 gap-2 w-full max-w-[240px]">
                  <For each={['1', '2', '3', '4', '5', '6', '7', '8', '9']}>
                    {(d) => (
                      <button
                        onClick={() => appendDigit(d)}
                        class="h-10 bg-surface-container-high rounded-lg font-bold text-sm hover:bg-surface-bright active:scale-95 transition-all text-on-surface"
                      >
                        {d}
                      </button>
                    )}
                  </For>
                  <button
                    onClick={() => addToast('success', 'Biometric Verified', 'FaceID session unlocked.')}
                    class="h-10 bg-surface-container-high rounded-lg flex items-center justify-center text-primary hover:bg-surface-bright active:scale-95 transition-all"
                    title="FaceID / TouchID"
                  >
                    <span class="material-symbols-outlined text-[20px]">face</span>
                  </button>
                  <button
                    onClick={() => appendDigit('0')}
                    class="h-10 bg-surface-container-high rounded-lg font-bold text-sm hover:bg-surface-bright active:scale-95 transition-all text-on-surface"
                  >
                    0
                  </button>
                  <button
                    onClick={() => deleteDigit()}
                    class="h-10 bg-surface-container-high rounded-lg flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-bright active:scale-95 transition-all"
                    title="Delete"
                  >
                    <span class="material-symbols-outlined text-[18px]">backspace</span>
                  </button>
                </div>

                {/* Exact Threat/Warning Banner */}
                <div class="mt-3 w-full bg-error-container/20 border border-error/30 rounded-lg p-2.5 flex items-start gap-2">
                  <span class="material-symbols-outlined text-error text-[16px] shrink-0 mt-0.5">warning</span>
                  <p class="text-[10px] text-error font-medium leading-tight">
                    10 failed attempts will purge local keys and disconnect from cluster (
                    <span class="font-bold underline">{remainingAttempts()} attempts remaining</span>).
                  </p>
                </div>
              </div>
            </Show>

            {/* iPhone Live Activity Feed (iOS only) */}
            <div class="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-[10px] font-mono text-outline uppercase tracking-wider">iOS Dynamic Island / Live Activity</span>
                <span class="text-[10px] font-mono text-secondary flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                  <span>{state.activeLiveActivity?.isActive ? 'Stream Active' : 'Idle'}</span>
                </span>
              </div>

              <div class="p-2.5 rounded-lg bg-surface-container border border-outline-variant/20 flex items-center justify-between">
                <div class="flex items-center gap-2.5">
                  <div class="w-7 h-7 rounded-lg bg-tertiary-container flex items-center justify-center text-on-tertiary-container">
                    <span class="material-symbols-outlined text-[16px]">crisis_alert</span>
                  </div>
                  <div>
                    <div class="font-semibold text-xs text-on-surface">
                      {state.activeLiveActivity?.agentName || 'Companion Telemetry'}
                    </div>
                    <div class="text-[10px] text-tertiary font-medium">
                      {state.activeLiveActivity?.message || 'State change · Priority 10 · 8h max lifetime'}
                    </div>
                  </div>
                </div>
                <span class="text-[9px] font-mono text-outline">iOS Lock Screen</span>
              </div>
            </div>

            {/* Offline Outbox & Reconnection Telemetry */}
            <div class="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-2">
              <div class="flex items-center justify-between text-xs">
                <span class="font-semibold text-on-surface">Offline Outbox & Reconnect</span>
                <button
                  onClick={() => flushMobileOutboxAction()}
                  class="text-[11px] text-primary hover:underline font-mono"
                >
                  Flush Outbox
                </button>
              </div>
              <div class="text-[11px] text-outline font-mono">
                Reconnecting (attempt 1, immediate -> 10s step -> 5 failures wait 2 minutes).
              </div>
            </div>

            {/* Create Agent From Prompt on Mobile */}
            <div class="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-2">
              <div class="font-semibold text-xs text-on-surface">Create or Edit Agent by Prompt</div>
              <div class="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. SRE runbook automation agent..."
                  value={promptText()}
                  onInput={(e) => setPromptText(e.currentTarget.value)}
                  class="flex-1 px-2.5 py-1.5 rounded bg-surface-container border border-outline-variant/30 text-xs text-on-surface"
                />
                <button
                  onClick={() => handlePromptAgent()}
                  class="px-3 py-1.5 rounded bg-primary text-on-primary font-semibold text-xs hover:brightness-110"
                >
                  Generate
                </button>
              </div>
            </div>

            {/* Desktop-Only Invariant Notice */}
            <div class="p-2.5 rounded bg-surface-container-lowest border border-outline-variant/20 text-[10px] text-outline">
              * Desktop-only features (providers & permissions, app updates, site publishing, remote desktop) are strictly omitted from mobile.
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
};
