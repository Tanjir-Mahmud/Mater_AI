import { Component, createSignal, onMount, For, Show } from 'solid-js';
import { state, setState } from '../../stores/appState';

interface JumpingAgent {
  id: string;
  name: string;
  initial: string;
  color: string;
  delay: string;
}

const SEVEN_AGENTS: JumpingAgent[] = [
  { id: '1', name: 'Kestrel', initial: 'K', color: 'bg-primary-container text-on-primary-container', delay: '0ms' },
  { id: '2', name: 'Cipher', initial: 'C', color: 'bg-secondary-container text-on-secondary-container', delay: '120ms' },
  { id: '3', name: 'Vanguard', initial: 'V', color: 'bg-tertiary-container text-on-tertiary-container', delay: '240ms' },
  { id: '4', name: 'Pulse', initial: 'P', color: 'bg-primary-container text-on-primary-container', delay: '360ms' },
  { id: '5', name: 'Echo', initial: 'E', color: 'bg-secondary-container text-on-secondary-container', delay: '480ms' },
  { id: '6', name: 'Nova', initial: 'N', color: 'bg-tertiary-container text-on-tertiary-container', delay: '600ms' },
  { id: '7', name: 'Atlas', initial: 'A', color: 'bg-primary-container text-on-primary-container', delay: '720ms' },
];

export const LoadingScreen: Component = () => {
  const [fading, setFading] = createSignal(false);

  onMount(() => {
    // Simulate initial loading sequence
    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(() => {
        setState('isLoading', false);
      }, 400);
    }, 1800);

    return () => clearTimeout(timer);
  });

  return (
    <Show when={state.isLoading}>
      <div
        class={`fixed inset-0 z-[100] bg-surface-container-lowest flex flex-col items-center justify-center select-none transition-opacity duration-400 ${
          fading() ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <div class="flex flex-col items-center gap-6">
          {/* Jumping 7 Agents Animation */}
          <div class="flex items-center gap-2.5 h-16">
            <For each={SEVEN_AGENTS}>
              {(agent) => (
                <div
                  class={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shadow-lg animate-bounce ${agent.color}`}
                  style={{
                    'animation-delay': agent.delay,
                    'animation-duration': '900ms',
                  }}
                >
                  {agent.initial}
                </div>
              )}
            </For>
          </div>

          {/* Loading Label & Progress */}
          <div class="flex flex-col items-center gap-2">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-primary text-xl animate-spin">
                sync
              </span>
              <h2 class="font-headline-sm text-headline-sm text-on-surface tracking-wide">
                Loading BissBot
              </h2>
            </div>
            <p class="font-label-sm text-xs text-outline">
              Initializing local database & agent runtimes...
            </p>
          </div>
        </div>
      </div>
    </Show>
  );
};
