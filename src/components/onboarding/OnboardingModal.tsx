import { Component, createSignal, For, Show } from 'solid-js';
import { state, setState, addToast } from '../../stores/appState';
import { SUPPORTED_LOCALES, i18n } from '../../shared/i18n';

interface ProviderOption {
  id: string;
  name: string;
  requirement: string;
  icon: string;
  tag?: string;
  isFree?: boolean;
}

const PROVIDERS: ProviderOption[] = [
  {
    id: 'opencode',
    name: 'OpenCode',
    requirement: 'Free models, no account needed',
    icon: 'code',
    tag: 'Try it free',
    isFree: true,
  },
  {
    id: 'claude',
    name: 'Claude Code',
    requirement: 'Anthropic Pro or API key',
    icon: 'psychology',
  },
  {
    id: 'codex',
    name: 'ChatGPT / Codex',
    requirement: 'ChatGPT Plus/Team or API key',
    icon: 'smart_toy',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    requirement: 'Google AI Pro or Ultra plan',
    icon: 'neurology',
  },
  {
    id: 'cursor',
    name: 'Cursor',
    requirement: 'Cursor plan or API key',
    icon: 'terminal',
  },
  {
    id: 'cline',
    name: 'Cline',
    requirement: 'Free models with a Cline account',
    icon: 'token',
  },
  {
    id: 'kimi',
    name: 'Kimi Code',
    requirement: 'Kimi models with a Kimi Code account',
    icon: 'auto_awesome',
  },
  {
    id: 'copilot',
    name: 'GitHub Copilot',
    requirement: 'GitHub account with a Copilot plan',
    icon: 'deployed_code',
  },
  {
    id: 'mistral',
    name: 'Mistral Vibe',
    requirement: 'Mistral models with a Mistral account',
    icon: 'wind_power',
  },
  {
    id: 'hermes',
    name: 'Hermes Agent',
    requirement: 'Nous Portal plan or your Hermes setup',
    icon: 'hub',
  },
];

export const OnboardingModal: Component = () => {
  const isMac = () => (window as any).openbot?.platform === 'darwin';

  const [step, setStep] = createSignal<
    'language' | 'choose' | 'plan' | 'computer' | 'setup_location' | 'launching'
  >('language');

  const [selectedChoice, setSelectedChoice] = createSignal<'free' | 'plan'>('free');
  const [selectedProvider, setSelectedProvider] = createSignal<string>('opencode');
  const [analyticsConsent, setAnalyticsConsent] = createSignal(false);
  const [providerDownloaded, setProviderDownloaded] = createSignal(false);
  const [providerConnected, setProviderConnected] = createSignal(false);
  const [isDownloading, setIsDownloading] = createSignal(false);

  const totalSteps = () => (isMac() ? 3 : 2);
  const currentStepNumber = () => {
    if (step() === 'choose') return 1;
    if (step() === 'plan') return 2;
    if (step() === 'computer') return 3;
    return 1;
  };

  const handleLanguageSelect = (code: string) => {
    i18n.setLocale(code);
    setState('settings', 'language', code);
    setStep('choose');
  };

  const handleAnalyticsChange = (val: boolean) => {
    setAnalyticsConsent(val);
    if (val) {
      addToast('success', i18n.t('onboarding.analytics_thanks'));
    }
  };

  const handleDownloadProvider = () => {
    setIsDownloading(true);
    setTimeout(() => {
      setIsDownloading(false);
      setProviderDownloaded(true);
      addToast('success', `${selectedProvider()} runtime downloaded`);
    }, 1500);
  };

  const handleConnectProvider = () => {
    setProviderConnected(true);
    addToast('success', `${selectedProvider()} connected successfully`);
  };

  const finishOnboarding = () => {
    setStep('launching');
    setState('settings', 'hasCompletedOnboarding', true);
    setState('settings', 'analyticsConsent', analyticsConsent() ? 'on' : 'off');
    if ((window as any).openbot?.saveSettings) {
      (window as any).openbot.saveSettings(state.settings);
    }
    setTimeout(() => {
      // Completed!
    }, 1200);
  };

  return (
    <Show when={!state.settings.hasCompletedOnboarding}>
      <div class="fixed inset-0 z-[90] flex items-center justify-center bg-surface-container-lowest/95 backdrop-blur-md select-none p-4">
        <div class="w-[560px] max-w-full bg-surface-container border border-outline-variant/40 rounded-2xl shadow-2xl p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200">
          {/* Top Progress Indicator (Steps 2 & 3) */}
          <Show when={step() !== 'language' && step() !== 'launching'}>
            <div class="flex items-center justify-between text-xs font-label-sm text-outline border-b border-outline-variant/20 pb-3">
              <span>
                Onboarding step {currentStepNumber()} of {totalSteps()}
              </span>
              <div class="w-32 h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                <div
                  class="h-full bg-primary transition-all duration-300"
                  style={{
                    width: `${(currentStepNumber() / totalSteps()) * 100}%`,
                  }}
                />
              </div>
            </div>
          </Show>

          {/* STEP 0: LANGUAGE WHEEL */}
          <Show when={step() === 'language'}>
            <div class="flex flex-col gap-4 text-center">
              <div class="w-12 h-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center mx-auto text-2xl">
                <span class="material-symbols-outlined text-[28px]">translate</span>
              </div>
              <div>
                <h2 class="font-headline-md text-headline-md text-on-surface">
                  Select your interface language
                </h2>
                <p class="font-body-sm text-xs text-outline mt-1">
                  OpenBot shows menus, buttons, and system messages in this language.
                </p>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto p-1">
                <For each={SUPPORTED_LOCALES}>
                  {(loc) => (
                    <button
                      onClick={() => handleLanguageSelect(loc.code)}
                      class="flex flex-col items-center justify-center p-3 rounded-lg border border-outline-variant/30 hover:border-primary bg-surface-container-low hover:bg-surface-container-high transition-all"
                    >
                      <span class="font-semibold text-xs text-on-surface">{loc.nativeName}</span>
                      <span class="text-[10px] text-outline font-label-sm">{loc.name}</span>
                    </button>
                  )}
                </For>
              </div>
            </div>
          </Show>

          {/* STEP 1: CHOOSE (Build your AI team) */}
          <Show when={step() === 'choose'}>
            <div class="flex flex-col gap-4">
              <div class="text-center">
                <h2 class="font-headline-md text-headline-md text-on-surface">
                  {i18n.t('onboarding.title')}
                </h2>
                <p class="font-body-sm text-xs text-outline mt-1">
                  {i18n.t('onboarding.subtitle')}
                </p>
              </div>

              {/* Two Choices */}
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedChoice('free')}
                  class={`p-4 rounded-xl border text-left flex flex-col gap-2 transition-all ${
                    selectedChoice() === 'free'
                      ? 'border-primary bg-primary-container/10 ring-1 ring-primary'
                      : 'border-outline-variant/30 bg-surface-container-low hover:bg-surface-container-high'
                  }`}
                >
                  <div class="w-8 h-8 rounded-lg bg-secondary/20 text-secondary flex items-center justify-center">
                    <span class="material-symbols-outlined text-[20px]">volunteer_activism</span>
                  </div>
                  <div>
                    <div class="font-body-sm font-semibold text-on-surface">
                      {i18n.t('onboarding.free_models')}
                    </div>
                    <div class="font-label-sm text-[11px] text-outline mt-0.5">
                      {i18n.t('onboarding.free_models_desc')}
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setSelectedChoice('plan')}
                  class={`p-4 rounded-xl border text-left flex flex-col gap-2 transition-all ${
                    selectedChoice() === 'plan'
                      ? 'border-primary bg-primary-container/10 ring-1 ring-primary'
                      : 'border-outline-variant/30 bg-surface-container-low hover:bg-surface-container-high'
                  }`}
                >
                  <div class="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center">
                    <span class="material-symbols-outlined text-[20px]">key</span>
                  </div>
                  <div>
                    <div class="font-body-sm font-semibold text-on-surface">
                      {i18n.t('onboarding.my_plan')}
                    </div>
                    <div class="font-label-sm text-[11px] text-outline mt-0.5">
                      {i18n.t('onboarding.my_plan_desc')}
                    </div>
                  </div>
                </button>
              </div>

              {/* Analytics Consent */}
              <div class="p-3 rounded-lg bg-surface-container-low border border-outline-variant/20 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="analytics-box"
                  checked={analyticsConsent()}
                  onChange={(e) => handleAnalyticsChange(e.currentTarget.checked)}
                  class="mt-1 accent-primary rounded cursor-pointer"
                />
                <label for="analytics-box" class="flex flex-col text-xs cursor-pointer">
                  <span class="font-semibold text-on-surface">
                    {i18n.t('onboarding.analytics_title')}
                  </span>
                  <span class="text-outline text-[11px]">
                    {i18n.t('onboarding.analytics_desc')}
                  </span>
                </label>
              </div>

              <div class="text-[11px] text-outline text-center">
                {i18n.t('onboarding.terms_agreement')}
              </div>

              <button
                onClick={() => {
                  if (selectedChoice() === 'free') {
                    if (isMac()) {
                      setStep('computer');
                    } else {
                      setStep('setup_location');
                    }
                  } else {
                    setStep('plan');
                  }
                }}
                class="w-full py-2.5 rounded-lg bg-primary text-on-primary font-semibold text-xs hover:brightness-110 transition-all press-scale"
              >
                {i18n.t('onboarding.continue')}
              </button>
            </div>
          </Show>

          {/* STEP 2: PLAN (Connect your plan) */}
          <Show when={step() === 'plan'}>
            <div class="flex flex-col gap-4">
              <div>
                <h2 class="font-headline-md text-headline-md text-on-surface">
                  {i18n.t('onboarding.connect_plan')}
                </h2>
                <p class="font-body-sm text-xs text-outline mt-1">
                  {i18n.t('onboarding.connect_plan_desc')}
                </p>
              </div>

              {/* Providers List */}
              <div class="flex flex-col gap-1.5 max-h-56 overflow-y-auto p-1">
                <For each={PROVIDERS}>
                  {(prov) => {
                    const isSelected = () => selectedProvider() === prov.id;
                    return (
                      <div
                        onClick={() => {
                          setSelectedProvider(prov.id);
                          setProviderDownloaded(prov.isFree || false);
                          setProviderConnected(false);
                        }}
                        class={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected()
                            ? 'border-primary bg-primary-container/10 ring-1 ring-primary'
                            : 'border-outline-variant/30 bg-surface-container-low hover:bg-surface-container-high'
                        }`}
                      >
                        <div class="flex items-center gap-2.5">
                          <span class="material-symbols-outlined text-[18px] text-primary">
                            {prov.icon}
                          </span>
                          <div>
                            <div class="font-semibold text-xs text-on-surface">{prov.name}</div>
                            <div class="text-[10px] text-outline font-label-sm">{prov.requirement}</div>
                          </div>
                        </div>

                        <Show when={prov.tag}>
                          <span class="text-[9px] font-label-sm px-1.5 py-0.5 rounded bg-secondary-container/20 text-secondary font-semibold">
                            {prov.tag}
                          </span>
                        </Show>
                      </div>
                    );
                  }}
                </For>
              </div>

              {/* Action Buttons for Provider */}
              <div class="flex items-center gap-2">
                <Show when={!providerDownloaded()}>
                  <button
                    onClick={handleDownloadProvider}
                    disabled={isDownloading()}
                    class="flex-1 py-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-semibold text-xs flex items-center justify-center gap-1.5"
                  >
                    <span class="material-symbols-outlined text-[16px]">download</span>
                    <span>{isDownloading() ? 'Downloading...' : 'Download Runtime'}</span>
                  </button>
                </Show>

                <button
                  onClick={handleConnectProvider}
                  class={`flex-1 py-2 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    providerConnected()
                      ? 'bg-secondary text-on-secondary'
                      : 'bg-primary text-on-primary hover:brightness-110'
                  }`}
                >
                  <span class="material-symbols-outlined text-[16px]">
                    {providerConnected() ? 'check' : 'login'}
                  </span>
                  <span>{providerConnected() ? 'Connected' : 'Connect'}</span>
                </button>
              </div>

              <div class="flex items-center justify-between pt-2 border-t border-outline-variant/20">
                <button
                  onClick={() => {
                    setSelectedChoice('free');
                    setStep('choose');
                  }}
                  class="text-xs text-primary hover:underline"
                >
                  {i18n.t('onboarding.use_free_instead')}
                </button>

                <button
                  onClick={() => {
                    if (isMac()) {
                      setStep('computer');
                    } else {
                      setStep('setup_location');
                    }
                  }}
                  class="px-4 py-2 rounded-lg bg-primary text-on-primary font-semibold text-xs hover:brightness-110"
                >
                  {i18n.t('onboarding.continue')}
                </button>
              </div>
            </div>
          </Show>

          {/* STEP 3: COMPUTER (macOS only) */}
          <Show when={step() === 'computer'}>
            <div class="flex flex-col gap-4 text-center">
              <div class="w-12 h-12 rounded-xl bg-tertiary/20 text-tertiary flex items-center justify-center mx-auto text-2xl">
                <span class="material-symbols-outlined text-[28px]">desktop_windows</span>
              </div>
              <div>
                <h2 class="font-headline-md text-headline-md text-on-surface">
                  {i18n.t('onboarding.computer_title')}
                </h2>
                <p class="font-body-sm text-xs text-outline mt-1 max-w-sm mx-auto">
                  {i18n.t('onboarding.computer_desc')}
                </p>
              </div>

              <div class="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-3 text-left">
                <div class="flex items-center justify-between text-xs">
                  <span>1. Screen Recording Permission</span>
                  <span class="text-secondary font-semibold font-label-sm">Granted</span>
                </div>
                <div class="flex items-center justify-between text-xs">
                  <span>2. Accessibility Permission</span>
                  <span class="text-secondary font-semibold font-label-sm">Granted</span>
                </div>
              </div>

              <button
                onClick={() => setStep('setup_location')}
                class="w-full py-2.5 rounded-lg bg-primary text-on-primary font-semibold text-xs hover:brightness-110 press-scale"
              >
                {i18n.t('onboarding.continue')}
              </button>
            </div>
          </Show>

          {/* SETUP LOCATION STEP: Where will OpenBot run? */}
          <Show when={step() === 'setup_location'}>
            <div class="flex flex-col gap-4">
              <div class="text-center">
                <h2 class="font-headline-md text-headline-md text-on-surface">
                  {i18n.t('onboarding.where_run_title')}
                </h2>
                <p class="font-body-sm text-xs text-outline mt-1">
                  {i18n.t('onboarding.where_run_desc')}
                </p>
              </div>

              <div class="flex flex-col gap-2.5">
                <button
                  onClick={finishOnboarding}
                  class="p-4 rounded-xl border border-primary bg-primary-container/10 flex items-start gap-3 text-left hover:brightness-105 transition-all"
                >
                  <div class="w-8 h-8 rounded bg-primary/20 text-primary flex items-center justify-center flex-shrink-0">
                    <span class="material-symbols-outlined text-[20px]">laptop_mac</span>
                  </div>
                  <div>
                    <div class="font-body-sm font-semibold text-on-surface">
                      {i18n.t('onboarding.setup_computer')}
                    </div>
                    <div class="font-label-sm text-[11px] text-outline mt-0.5">
                      {i18n.t('onboarding.setup_computer_desc')}
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    addToast('warning', 'Connect to host invitation dialog');
                    finishOnboarding();
                  }}
                  class="p-4 rounded-xl border border-outline-variant/30 bg-surface-container-low flex items-start gap-3 text-left hover:bg-surface-container-high transition-all"
                >
                  <div class="w-8 h-8 rounded bg-secondary/20 text-secondary flex items-center justify-center flex-shrink-0">
                    <span class="material-symbols-outlined text-[20px]">cloud_sync</span>
                  </div>
                  <div>
                    <div class="font-body-sm font-semibold text-on-surface">
                      {i18n.t('onboarding.connect_host')}
                    </div>
                    <div class="font-label-sm text-[11px] text-outline mt-0.5">
                      {i18n.t('onboarding.connect_host_desc')}
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </Show>

          {/* Launching transition */}
          <Show when={step() === 'launching'}>
            <div class="py-12 flex flex-col items-center justify-center gap-4 text-center">
              <span class="material-symbols-outlined text-4xl text-primary animate-spin">
                progress_activity
              </span>
              <h3 class="font-headline-sm text-on-surface">Opening OpenBot…</h3>
              <p class="font-body-sm text-xs text-outline">
                Configuring your local workspace and launching agent team.
              </p>
            </div>
          </Show>
        </div>
      </div>
    </Show>
  );
};
