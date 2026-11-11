import { Component, createSignal, createEffect, For, Show } from 'solid-js';
import {
  state,
  closeAgentSetupModal,
  saveAgentFromSetup,
  exportAgentTemplate,
  addToast,
} from '../../stores/appState';
import { AgentSections } from '../../types';

interface PresetAvatar {
  id: string;
  name: string;
  badge: string;
  icon: string;
  avatarColor: string;
}

const PRESET_AVATARS: PresetAvatar[] = [
  { id: 'kestrel', name: 'Kestrel', badge: 'Active', icon: 'K', avatarColor: 'bg-primary-container text-on-primary-container' },
  { id: 'cipher', name: 'Cipher', badge: 'Crypto', icon: 'security', avatarColor: 'bg-secondary-container text-on-secondary-container' },
  { id: 'vector', name: 'Vector', badge: 'Routing', icon: 'alt_route', avatarColor: 'bg-tertiary-container text-on-tertiary-container' },
  { id: 'apex', name: 'Apex', badge: 'Executive', icon: 'diamond', avatarColor: 'bg-surface-container-highest text-primary' },
];

export const AgentSetupModal: Component = () => {
  const isEdit = () => state.agentSetupModalMode === 'edit';
  const editingAgent = () =>
    isEdit() ? state.agents.find((a) => a.id === state.editingAgentId) : null;

  // Form states
  const [promptInput, setPromptInput] = createSignal('');
  const [isGenerating, setIsGenerating] = createSignal(false);
  const [synthesisNotice, setSynthesisNotice] = createSignal<string | null>(null);

  const [agentName, setAgentName] = createSignal('Sentinel');
  const [agentRole, setAgentRole] = createSignal('Autonomous Systems Operator');
  const [selectedAvatarId, setSelectedAvatarId] = createSignal('kestrel');
  const [avatarColor, setAvatarColor] = createSignal('bg-primary-container text-on-primary-container');
  const [selectedModel, setSelectedModel] = createSignal('Claude 3.7 Sonnet');
  const [selectedProvider, setSelectedProvider] = createSignal('claude');

  // Rules & Sliders
  const [temperature, setTemperature] = createSignal(0.2);
  const [contextTokens, setContextTokens] = createSignal(128);
  const [steerWhileWorking, setSteerWhileWorking] = createSignal(true);
  const [reasoningEffort, setReasoningEffort] = createSignal<'medium' | 'high'>('high');
  const [browserProfile, setBrowserProfile] = createSignal<'shared' | 'only_this_agent'>('shared');

  // The 4 spec-mandated sections
  const [systemDirective, setSystemDirective] = createSignal(
    '### ROLE IDENTIFICATION\nYou are Sentinel, an autonomous operator in an isolated workspace.\nYour core objectives:\n1. Execute tasks systematically.\n2. Verify state before running destructive tools.\n\n### REASONING PROTOCOL\nThink step-by-step in <scratchpad> tags before emitting tool commands.'
  );
  const [executionBoundaries, setExecutionBoundaries] = createSignal(
    'Confined to agent workspace directory. Operations outside require human interactive confirmation.'
  );
  const [memoryPolicy, setMemoryPolicy] = createSignal(
    'Persist key architectural decisions and invariants. Review memory buffer every 20 turns.'
  );
  const [fallbackStrategies, setFallbackStrategies] = createSignal(
    'On execution error, inspect stderr stream and retry up to 2 times with backoff. Report diagnostics cleanly.'
  );

  // Sync on open/edit
  createEffect(() => {
    const existing = editingAgent();
    if (existing) {
      setAgentName(existing.name);
      setAgentRole(existing.role);
      setSelectedModel(existing.model);
      setSelectedProvider(existing.provider);
      setBrowserProfile(existing.browserProfile);
      setReasoningEffort(existing.reasoningLevel === 'low' ? 'medium' : (existing.reasoningLevel as 'medium' | 'high'));
      if (existing.sections) {
        setSystemDirective(existing.sections.systemDirective);
        setExecutionBoundaries(existing.sections.executionBoundaries);
        setMemoryPolicy(existing.sections.memoryPolicy);
        setFallbackStrategies(existing.sections.fallbackStrategies);
      }
    }
  });

  const handleGenerateDraft = async () => {
    const prompt = promptInput().trim();
    if (!prompt) {
      addToast('warning', 'Please enter an intent prompt first');
      return;
    }

    setIsGenerating(true);
    setSynthesisNotice(null);

    try {
      let draft: any = null;
      const api = (window as any).bissbot;
      if (api?.generateAgentDraft) {
        draft = await api.generateAgentDraft(prompt);
      }

      if (draft) {
        setAgentName(draft.name);
        setAgentRole(draft.role);
        setSelectedModel(draft.model);
        setSelectedProvider(draft.provider);
        setBrowserProfile(draft.browserProfile);
        setReasoningEffort(draft.reasoningLevel === 'low' ? 'medium' : draft.reasoningLevel);

        if (draft.sections) {
          setSystemDirective(draft.sections.systemDirective);
          setExecutionBoundaries(draft.sections.executionBoundaries);
          setMemoryPolicy(draft.sections.memoryPolicy);
          setFallbackStrategies(draft.sections.fallbackStrategies);
        }

        const matchAvatar = PRESET_AVATARS.find((p) => p.name.toLowerCase() === draft.name.toLowerCase());
        if (matchAvatar) {
          setSelectedAvatarId(matchAvatar.id);
          setAvatarColor(matchAvatar.avatarColor);
        }

        setSynthesisNotice('4 sections synthesized in 1.2s');
        addToast('success', 'Agent draft synthesized', `${draft.name} (${draft.role}) ready for review`);
      }
    } catch (err: any) {
      addToast('error', 'Generation error', err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    const sections: AgentSections = {
      systemDirective: systemDirective(),
      executionBoundaries: executionBoundaries(),
      memoryPolicy: memoryPolicy(),
      fallbackStrategies: fallbackStrategies(),
    };

    const currentPreset = PRESET_AVATARS.find((p) => p.id === selectedAvatarId());

    await saveAgentFromSetup({
      name: agentName(),
      role: agentRole(),
      avatar: currentPreset ? currentPreset.icon : 'smart_toy',
      avatarColor: currentPreset ? currentPreset.avatarColor : avatarColor(),
      model: selectedModel(),
      provider: selectedProvider(),
      reasoningLevel: reasoningEffort(),
      browserProfile: browserProfile(),
      sections,
    });
  };

  const handleExportTemplate = async () => {
    if (isEdit() && state.editingAgentId) {
      await exportAgentTemplate(state.editingAgentId);
    } else {
      addToast('success', 'Draft template exported', 'https://tiyandegital.com/template/draft-sentinel');
    }
  };

  return (
    <div class="fixed inset-0 z-[100] flex flex-col bg-surface-container-lowest text-on-surface select-none overflow-hidden animate-in fade-in duration-150">
      {/* Top Action Bar */}
      <header class="h-12 bg-surface-container-low border-b border-outline-variant/30 flex items-center justify-between px-6 flex-shrink-0">
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-1.5 text-xs text-outline">
            <span class="material-symbols-outlined text-[16px] text-primary">smart_toy</span>
            <span class="hover:text-on-surface cursor-pointer" onClick={closeAgentSetupModal}>
              Agents
            </span>
            <span>/</span>
            <span class="text-on-surface font-semibold">
              {isEdit() ? 'Configure Agent' : 'Create Agent'}
            </span>
          </div>
          <div class="h-4 w-px bg-outline-variant/30" />
          <h1 class="font-headline-sm text-sm font-semibold tracking-tight text-on-surface">
            {isEdit() ? `Edit: ${agentName()}` : 'Configure AI Teammate'}
          </h1>
          <span class="px-2 py-0.5 rounded bg-surface-container-highest text-primary font-mono text-[10px]">
            Draft #041
          </span>
        </div>

        <div class="flex items-center gap-2">
          <button
            onClick={handleExportTemplate}
            type="button"
            class="px-3 py-1 rounded-md bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-on-surface text-xs font-label-sm flex items-center gap-1.5 transition-all shadow-xs"
          >
            <span class="material-symbols-outlined text-[15px] text-outline">bookmark_add</span>
            <span>Save as Template</span>
          </button>
          <button
            onClick={closeAgentSetupModal}
            type="button"
            class="px-3 py-1 rounded-md bg-surface-container hover:bg-surface-container-high text-outline hover:text-on-surface text-xs font-label-sm transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            type="button"
            class="px-4 py-1 rounded-md bg-primary text-on-primary text-xs font-semibold shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <span class="material-symbols-outlined text-[16px]">save</span>
            <span>Save Agent</span>
          </button>
        </div>
      </header>

      {/* Main Builder Canvas (Two-Column Asymmetric View) */}
      <div class="flex-1 overflow-y-auto p-6 grid grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Prompt-Driven Synthesis & Model Baseline (5 Columns) */}
        <div class="col-span-12 xl:col-span-5 flex flex-col gap-5">
          {/* AI Prompt Synthesizer Card */}
          <div class="bg-surface-container p-5 rounded-xl border border-outline-variant/30 shadow-md flex flex-col gap-4 relative overflow-hidden">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-primary text-[20px]">auto_fix_high</span>
                <span class="font-headline-sm text-sm font-semibold text-on-surface">
                  Agent Intent Generator
                </span>
              </div>
              <span class="font-mono text-[11px] text-secondary bg-surface-container-lowest px-2 py-0.5 rounded border border-outline-variant/20 flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                Zero-Shot Ready
              </span>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="font-label-sm text-xs text-outline">
                Describe role, privileges, and behavior in plain language
              </label>
              <div class="rounded-lg bg-surface-container-lowest p-3 border border-outline-variant/30 focus-within:border-primary/50 transition-colors">
                <textarea
                  value={promptInput()}
                  onInput={(e) => setPromptInput(e.currentTarget.value)}
                  class="w-full bg-transparent resize-none outline-none font-body-sm text-xs text-on-surface placeholder:text-outline/60 leading-relaxed"
                  placeholder="e.g., Senior SRE engineer specialized in Kubernetes latency anomalies, capable of running kubectl, analyzing Jaeger traces, and drafting incident post-mortems with actionable remediation timelines..."
                  rows={4}
                />
                <div class="flex items-center justify-between pt-2 border-t border-outline-variant/15 mt-2">
                  <span class="font-label-sm text-[10px] text-outline">
                    {promptInput().length} chars
                  </span>
                  <button
                    onClick={() =>
                      setPromptInput(
                        'Senior Site Reliability Engineer specializing in Kubernetes latency anomalies, tracing Jaeger spans and drafting post-mortems.'
                      )
                    }
                    type="button"
                    class="text-primary hover:text-primary-fixed-dim font-label-sm text-[11px] flex items-center gap-1"
                  >
                    <span class="material-symbols-outlined text-[14px]">history</span>
                    Load Preset Prompt
                  </button>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <button
                onClick={handleGenerateDraft}
                disabled={isGenerating()}
                type="button"
                class="flex-1 py-2 px-4 rounded-lg bg-primary-container hover:bg-primary text-on-primary-container hover:text-on-primary text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                <span class="material-symbols-outlined text-[16px]">
                  {isGenerating() ? 'sync' : 'temp_preferences_custom'}
                </span>
                <span>{isGenerating() ? 'Synthesizing 4 Sections...' : 'Generate Draft'}</span>
              </button>
            </div>

            {/* Telemetry Notice */}
            <Show when={synthesisNotice()}>
              <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-low border border-secondary/30 text-secondary font-label-sm text-xs animate-in fade-in">
                <span class="material-symbols-outlined text-[15px] text-secondary">check_circle</span>
                <span class="text-on-surface font-semibold">Draft ready</span>
                <span class="text-outline">•</span>
                <span class="text-on-surface-variant font-mono text-[11px]">{synthesisNotice()}</span>
              </div>
            </Show>
          </div>

          {/* Persona & Visual Identity */}
          <div class="bg-surface-container p-5 rounded-xl border border-outline-variant/30 shadow-md flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <span class="font-headline-sm text-sm font-semibold text-on-surface">
                Visual Identity & Persona
              </span>
              <span class="font-label-sm text-[10px] text-outline uppercase tracking-wider">
                Cluster-wide badge
              </span>
            </div>

            <div class="flex items-start gap-4">
              {/* Active Avatar Preview */}
              <div class="w-14 h-14 rounded-xl bg-surface-container-highest border border-outline-variant/30 flex items-center justify-center relative shadow-lg">
                <span class="text-xl font-bold text-primary font-mono">
                  {PRESET_AVATARS.find((p) => p.id === selectedAvatarId())?.icon || 'smart_toy'}
                </span>
                <span class="absolute bottom-1 right-1 font-mono text-[9px] text-primary bg-surface-container-lowest/90 px-1 rounded">
                  LIVE
                </span>
              </div>

              <div class="flex flex-col gap-1.5 flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <input
                    type="text"
                    value={agentName()}
                    onInput={(e) => setAgentName(e.currentTarget.value)}
                    placeholder="Agent Name"
                    class="flex-1 bg-surface-container-lowest border border-outline-variant/30 rounded px-2.5 py-1 text-xs font-semibold text-on-surface outline-none focus:border-primary/60"
                  />
                  <input
                    type="text"
                    value={agentRole()}
                    onInput={(e) => setAgentRole(e.currentTarget.value)}
                    placeholder="Role"
                    class="flex-1 bg-surface-container-lowest border border-outline-variant/30 rounded px-2.5 py-1 text-xs text-on-surface outline-none focus:border-primary/60"
                  />
                </div>
                <span class="font-label-sm text-[11px] text-outline">
                  Select a generated persona preset:
                </span>
              </div>
            </div>

            {/* 4 Generated AI Avatars Switcher */}
            <div class="grid grid-cols-4 gap-2">
              <For each={PRESET_AVATARS}>
                {(preset) => (
                  <button
                    onClick={() => {
                      setSelectedAvatarId(preset.id);
                      setAvatarColor(preset.avatarColor);
                    }}
                    type="button"
                    class={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                      selectedAvatarId() === preset.id
                        ? 'bg-surface-container-highest border-primary text-primary shadow-sm'
                        : 'bg-surface-container-low border-outline-variant/20 hover:bg-surface-container-high text-on-surface-variant'
                    }`}
                  >
                    <div
                      class={`w-8 h-8 rounded-lg flex items-center justify-center font-bold font-mono text-sm ${preset.avatarColor}`}
                    >
                      {preset.icon}
                    </div>
                    <span class="font-label-sm text-xs font-semibold text-on-surface">
                      {preset.name}
                    </span>
                    <span class="text-[9px] text-outline font-label-sm">{preset.badge}</span>
                  </button>
                )}
              </For>
            </div>
          </div>

          {/* Foundation Model Architecture Picker */}
          <div class="bg-surface-container p-5 rounded-xl border border-outline-variant/30 shadow-md flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-primary text-[20px]">psychology</span>
                <span class="font-headline-sm text-sm font-semibold text-on-surface">
                  Underlying Intelligence
                </span>
              </div>
              <span class="font-mono text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                Public Protocol v2
              </span>
            </div>

            {/* Model Selection List */}
            <div class="flex flex-col gap-2 text-xs">
              {/* Anthropic Section */}
              <div class="flex flex-col gap-1">
                <span class="font-label-sm text-[10px] text-outline font-semibold uppercase tracking-wider px-1">
                  Anthropic Claude
                </span>
                <label
                  onClick={() => {
                    setSelectedProvider('claude');
                    setSelectedModel('Claude 3.7 Sonnet');
                  }}
                  class={`p-2.5 rounded-lg border cursor-pointer flex items-center justify-between transition-all ${
                    selectedModel() === 'Claude 3.7 Sonnet'
                      ? 'bg-surface-container-highest border-primary/60'
                      : 'bg-surface-container-low border-outline-variant/20 hover:bg-surface-container-high'
                  }`}
                >
                  <div class="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="model_choice"
                      checked={selectedModel() === 'Claude 3.7 Sonnet'}
                      class="accent-primary"
                    />
                    <div class="flex flex-col">
                      <div class="flex items-center gap-1.5">
                        <span class="font-semibold text-on-surface">Claude 3.7 Sonnet</span>
                        <span class="px-1.5 py-0.2 rounded bg-primary-container text-on-primary-container font-mono text-[9px]">
                          Thinking
                        </span>
                      </div>
                      <span class="text-[10px] text-outline">200k Context • 64k Output Tokens</span>
                    </div>
                  </div>
                  <span class="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-mono text-[10px]">
                    Direct Bridge
                  </span>
                </label>
              </div>

              {/* OpenCode Section */}
              <div class="flex flex-col gap-1 pt-1">
                <span class="font-label-sm text-[10px] text-outline font-semibold uppercase tracking-wider px-1">
                  OpenCode (Zero Account)
                </span>
                <label
                  onClick={() => {
                    setSelectedProvider('opencode');
                    setSelectedModel('OpenCode Free');
                  }}
                  class={`p-2.5 rounded-lg border cursor-pointer flex items-center justify-between transition-all ${
                    selectedModel() === 'OpenCode Free'
                      ? 'bg-surface-container-highest border-primary/60'
                      : 'bg-surface-container-low border-outline-variant/20 hover:bg-surface-container-high'
                  }`}
                >
                  <div class="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="model_choice"
                      checked={selectedModel() === 'OpenCode Free'}
                      class="accent-primary"
                    />
                    <div class="flex flex-col">
                      <span class="font-semibold text-on-surface">OpenCode Free</span>
                      <span class="text-[10px] text-outline">No sign-in or account needed</span>
                    </div>
                  </div>
                  <span class="px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container font-mono text-[10px]">
                    Free Model
                  </span>
                </label>
              </div>

              {/* OpenAI / Codex Section */}
              <div class="flex flex-col gap-1 pt-1">
                <span class="font-label-sm text-[10px] text-outline font-semibold uppercase tracking-wider px-1">
                  OpenAI & Codex
                </span>
                <label
                  onClick={() => {
                    setSelectedProvider('codex');
                    setSelectedModel('Codex o3-mini');
                  }}
                  class={`p-2.5 rounded-lg border cursor-pointer flex items-center justify-between transition-all ${
                    selectedModel() === 'Codex o3-mini'
                      ? 'bg-surface-container-highest border-primary/60'
                      : 'bg-surface-container-low border-outline-variant/20 hover:bg-surface-container-high'
                  }`}
                >
                  <div class="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="model_choice"
                      checked={selectedModel() === 'Codex o3-mini'}
                      class="accent-primary"
                    />
                    <div class="flex flex-col">
                      <span class="font-semibold text-on-surface">Codex o3-mini</span>
                      <span class="text-[10px] text-outline">High-reasoning co-pilot</span>
                    </div>
                  </div>
                  <span class="px-2 py-0.5 rounded bg-surface-container text-outline font-mono text-[10px]">
                    Direct Bridge
                  </span>
                </label>
              </div>

              {/* Google Gemini Section */}
              <div class="flex flex-col gap-1 pt-1">
                <span class="font-label-sm text-[10px] text-outline font-semibold uppercase tracking-wider px-1">
                  Google Gemini & Local
                </span>
                <div class="grid grid-cols-2 gap-2">
                  <label
                    onClick={() => {
                      setSelectedProvider('gemini');
                      setSelectedModel('Gemini 2.0 Flash');
                    }}
                    class={`p-2.5 rounded-lg border cursor-pointer flex flex-col gap-1 transition-all ${
                      selectedModel() === 'Gemini 2.0 Flash'
                        ? 'bg-surface-container-highest border-primary/60'
                        : 'bg-surface-container-low border-outline-variant/20 hover:bg-surface-container-high'
                    }`}
                  >
                    <span class="font-semibold text-on-surface">Gemini 2.0 Flash</span>
                    <span class="text-[9px] text-outline font-mono">1M Token Window</span>
                  </label>
                  <label
                    onClick={() => {
                      setSelectedProvider('opencode');
                      setSelectedModel('DeepSeek-R1 (Local)');
                    }}
                    class={`p-2.5 rounded-lg border cursor-pointer flex flex-col gap-1 transition-all ${
                      selectedModel() === 'DeepSeek-R1 (Local)'
                        ? 'bg-surface-container-highest border-primary/60'
                        : 'bg-surface-container-low border-outline-variant/20 hover:bg-surface-container-high'
                    }`}
                  >
                    <span class="font-semibold text-on-surface">DeepSeek-R1</span>
                    <span class="text-[9px] text-secondary font-mono">Zero Token Cost (Local)</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Structured Generated Sections (7 Columns) */}
        <div class="col-span-12 xl:col-span-7 flex flex-col gap-5">
          {/* SECTION 1: System Instructions / Role & Persona */}
          <div class="bg-surface-container rounded-xl border border-outline-variant/30 shadow-md overflow-hidden flex flex-col">
            <div class="px-5 py-2.5 bg-surface-container-high border-b border-outline-variant/20 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-primary text-[18px]">terminal</span>
                <span class="font-headline-sm text-xs font-semibold text-on-surface">
                  1. System Prompt & Persona
                </span>
              </div>
              <div class="flex items-center gap-2 font-mono text-[10px]">
                <span class="text-outline">Markdown Enabled</span>
                <span class="text-outline">•</span>
                <span class="text-secondary font-semibold">1,420 / 8,000 tokens</span>
              </div>
            </div>

            <div class="p-5 flex flex-col gap-2.5">
              <textarea
                value={systemDirective()}
                onInput={(e) => setSystemDirective(e.currentTarget.value)}
                class="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-3 font-mono text-xs leading-relaxed text-on-surface outline-none focus:border-primary/50 min-h-[140px]"
                rows={6}
              />
              <div class="flex items-center justify-between text-outline font-label-sm text-[11px]">
                <span>Editable instructions synthesize on save</span>
                <span>Auto-saved to local memory store</span>
              </div>
            </div>
          </div>

          {/* SECTION 2: Model & Context Rules */}
          <div class="bg-surface-container rounded-xl border border-outline-variant/30 shadow-md overflow-hidden flex flex-col">
            <div class="px-5 py-2.5 bg-surface-container-high border-b border-outline-variant/20 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-primary text-[18px]">tune</span>
                <span class="font-headline-sm text-xs font-semibold text-on-surface">
                  2. Model & Context Rules
                </span>
              </div>
              <span class="font-mono text-[10px] text-outline">Execution Parameters</span>
            </div>

            <div class="p-5 grid grid-cols-2 gap-5 text-xs">
              {/* Temperature Slider */}
              <div class="flex flex-col gap-1.5">
                <div class="flex items-center justify-between">
                  <span class="text-outline font-label-sm text-[11px]">Sampling Temperature</span>
                  <span class="font-mono text-primary font-bold">{temperature().toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={temperature()}
                  onInput={(e) => setTemperature(parseFloat(e.currentTarget.value))}
                  class="w-full accent-primary h-1.5 bg-surface-container-lowest rounded-full cursor-pointer"
                />
                <div class="flex justify-between text-[10px] text-outline">
                  <span>0.0 Deterministic</span>
                  <span>1.0 Creative</span>
                </div>
              </div>

              {/* Context Window Slider */}
              <div class="flex flex-col gap-1.5">
                <div class="flex items-center justify-between">
                  <span class="text-outline font-label-sm text-[11px]">Context Allocator</span>
                  <span class="font-mono text-secondary font-bold">{contextTokens()}k Tokens</span>
                </div>
                <input
                  type="range"
                  min="16"
                  max="200"
                  step="16"
                  value={contextTokens()}
                  onInput={(e) => setContextTokens(parseInt(e.currentTarget.value))}
                  class="w-full accent-secondary h-1.5 bg-surface-container-lowest rounded-full cursor-pointer"
                />
                <div class="flex justify-between text-[10px] text-outline">
                  <span>32k Base</span>
                  <span>200k Extended</span>
                </div>
              </div>

              {/* Steer-While-Working Switch */}
              <div class="flex items-center justify-between p-3 rounded-lg bg-surface-container-low border border-outline-variant/20">
                <div class="flex flex-col">
                  <span class="font-semibold text-on-surface">Steer-While-Working</span>
                  <span class="text-[10px] text-outline">Inject prompts during active bash execution</span>
                </div>
                <input
                  type="checkbox"
                  checked={steerWhileWorking()}
                  onChange={(e) => setSteerWhileWorking(e.currentTarget.checked)}
                  class="w-4 h-4 accent-primary"
                />
              </div>

              {/* Reasoning Effort Toggle */}
              <div class="flex items-center justify-between p-3 rounded-lg bg-surface-container-low border border-outline-variant/20">
                <div class="flex flex-col">
                  <span class="font-semibold text-on-surface">Reasoning Effort</span>
                  <span class="text-[10px] text-outline">Chain-of-thought depth</span>
                </div>
                <div class="flex items-center bg-surface-container-highest p-0.5 rounded-md border border-outline-variant/30">
                  <button
                    onClick={() => setReasoningEffort('medium')}
                    type="button"
                    class={`px-2.5 py-0.5 rounded text-[11px] font-label-sm transition-all ${
                      reasoningEffort() === 'medium'
                        ? 'bg-primary text-on-primary font-bold'
                        : 'text-outline hover:text-on-surface'
                    }`}
                  >
                    Med
                  </button>
                  <button
                    onClick={() => setReasoningEffort('high')}
                    type="button"
                    class={`px-2.5 py-0.5 rounded text-[11px] font-label-sm transition-all ${
                      reasoningEffort() === 'high'
                        ? 'bg-primary text-on-primary font-bold'
                        : 'text-outline hover:text-on-surface'
                    }`}
                  >
                    High
                  </button>
                </div>
              </div>

              {/* Browser Profile */}
              <div class="col-span-2 flex items-center justify-between p-3 rounded-lg bg-surface-container-low border border-outline-variant/20">
                <div class="flex flex-col">
                  <span class="font-semibold text-on-surface">Embedded Browser Profile</span>
                  <span class="text-[10px] text-outline">
                    Persistent sandboxed browser session
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    onClick={() => setBrowserProfile('shared')}
                    type="button"
                    class={`px-2.5 py-1 rounded text-xs transition-all ${
                      browserProfile() === 'shared'
                        ? 'bg-primary text-on-primary font-semibold'
                        : 'bg-surface-container text-outline hover:text-on-surface'
                    }`}
                  >
                    Shared
                  </button>
                  <button
                    onClick={() => setBrowserProfile('only_this_agent')}
                    type="button"
                    class={`px-2.5 py-1 rounded text-xs transition-all ${
                      browserProfile() === 'only_this_agent'
                        ? 'bg-primary text-on-primary font-semibold'
                        : 'bg-surface-container text-outline hover:text-on-surface'
                    }`}
                  >
                    Only this agent
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: Enabled Skills & MCP Tool Bridges */}
          <div class="bg-surface-container rounded-xl border border-outline-variant/30 shadow-md overflow-hidden flex flex-col">
            <div class="px-5 py-2.5 bg-surface-container-high border-b border-outline-variant/20 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-primary text-[18px]">build</span>
                <span class="font-headline-sm text-xs font-semibold text-on-surface">
                  3. Enabled Skills & MCP Tool Bridges
                </span>
              </div>
              <span class="px-2 py-0.5 rounded bg-surface-container-highest font-mono text-[10px] text-secondary">
                5 Active Bridges
              </span>
            </div>

            <div class="p-5 grid grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
              <label class="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/20 hover:bg-surface-container-high cursor-pointer flex items-start gap-2.5 transition-all">
                <input type="checkbox" checked class="mt-0.5 w-3.5 h-3.5 accent-primary" />
                <div class="flex flex-col">
                  <span class="font-semibold text-on-surface">MCP Terminal</span>
                  <span class="text-[10px] text-outline">Sandboxed shell run</span>
                </div>
              </label>

              <label class="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/20 hover:bg-surface-container-high cursor-pointer flex items-start gap-2.5 transition-all">
                <input type="checkbox" checked class="mt-0.5 w-3.5 h-3.5 accent-primary" />
                <div class="flex flex-col">
                  <span class="font-semibold text-on-surface">Git Workspace</span>
                  <span class="text-[10px] text-outline">Branch & diff reader</span>
                </div>
              </label>

              <label class="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/20 hover:bg-surface-container-high cursor-pointer flex items-start gap-2.5 transition-all">
                <input type="checkbox" checked class="mt-0.5 w-3.5 h-3.5 accent-primary" />
                <div class="flex flex-col">
                  <span class="font-semibold text-on-surface">Browser Engine</span>
                  <span class="text-[10px] text-outline">Chromium automation</span>
                </div>
              </label>

              <label class="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/20 hover:bg-surface-container-high cursor-pointer flex items-start gap-2.5 transition-all">
                <input type="checkbox" checked class="mt-0.5 w-3.5 h-3.5 accent-primary" />
                <div class="flex flex-col">
                  <span class="font-semibold text-on-surface">Postgres Query</span>
                  <span class="text-[10px] text-outline">Read-only connection</span>
                </div>
              </label>

              <label class="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/20 hover:bg-surface-container-high cursor-pointer flex items-start gap-2.5 transition-all">
                <input type="checkbox" checked class="mt-0.5 w-3.5 h-3.5 accent-primary" />
                <div class="flex flex-col">
                  <span class="font-semibold text-on-surface">Docker Daemon</span>
                  <span class="text-[10px] text-outline">Inspect containers</span>
                </div>
              </label>

              <button
                type="button"
                onClick={() => addToast('success', 'MCP Bridge Manager')}
                class="p-2.5 rounded-lg bg-surface-container-lowest border border-dashed border-outline-variant/40 hover:bg-surface-container-high text-outline hover:text-on-surface flex items-center justify-center gap-1.5 transition-all"
              >
                <span class="material-symbols-outlined text-[16px]">add_circle</span>
                <span class="font-label-sm text-[11px]">Attach MCP Bridge</span>
              </button>
            </div>
          </div>

          {/* SECTION 4: Scheduled Routines */}
          <div class="bg-surface-container rounded-xl border border-outline-variant/30 shadow-md overflow-hidden flex flex-col">
            <div class="px-5 py-2.5 bg-surface-container-high border-b border-outline-variant/20 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-primary text-[18px]">schedule</span>
                <span class="font-headline-sm text-xs font-semibold text-on-surface">
                  4. Linked Orchestration Routines
                </span>
              </div>
              <button
                type="button"
                onClick={() => addToast('success', 'Add routine schedule')}
                class="text-primary hover:text-primary-fixed-dim font-label-sm text-xs flex items-center gap-1"
              >
                <span class="material-symbols-outlined text-[15px]">add</span>
                <span>Add Schedule</span>
              </button>
            </div>

            <div class="p-5 flex flex-col gap-2.5">
              <div class="p-3 rounded-lg bg-surface-container-low border border-outline-variant/20 flex items-center justify-between shadow-xs">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold">
                    <span class="material-symbols-outlined text-[18px]">alarm_on</span>
                  </div>
                  <div class="flex flex-col">
                    <div class="flex items-center gap-2">
                      <span class="font-semibold text-xs text-on-surface">Daily p99 latency audit</span>
                      <span class="px-1.5 py-0.2 rounded bg-surface-container-highest text-secondary font-mono text-[9px]">
                        CRON active
                      </span>
                    </div>
                    <span class="text-[10px] text-outline font-mono">0 9 * * * (Everyday @ 09:00 UTC)</span>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-[11px] text-outline">Target: #sre-alerts</span>
                  <button
                    type="button"
                    onClick={() => addToast('success', 'Edit routine')}
                    class="p-1 text-outline hover:text-on-surface rounded hover:bg-surface-container-high"
                  >
                    <span class="material-symbols-outlined text-[15px]">edit</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
