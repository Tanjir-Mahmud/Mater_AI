import { Component, Show } from 'solid-js';
import { state, setState } from '../../stores/appState';
import { i18n } from '../../shared/i18n';

export const QuitConfirmDialog: Component = () => {
  const handleConfirm = () => {
    setState('isQuitDialogOpen', false);
    const api = (window as any).bissbot;
    if (api?.confirmQuit) {
      api.confirmQuit();
    } else {
      window.close();
    }
  };

  const handleCancel = () => {
    setState('isQuitDialogOpen', false);
  };

  return (
    <Show when={state.isQuitDialogOpen}>
      <div class="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-xs animate-in fade-in select-none">
        <div class="w-[420px] bg-surface-container border border-outline-variant/40 rounded-xl shadow-2xl p-5 flex flex-col gap-4">
          <div class="flex items-start gap-3.5">
            <div class="w-10 h-10 rounded-full bg-error-container/30 text-error flex items-center justify-center flex-shrink-0">
              <span class="material-symbols-outlined text-[22px]">power_settings_new</span>
            </div>
            <div class="flex flex-col gap-1">
              <h3 class="font-headline-sm text-headline-sm text-on-surface">
                {i18n.t('quit.title')}
              </h3>
              <p class="font-body-sm text-xs text-outline leading-relaxed">
                {i18n.t('quit.message')}
              </p>
            </div>
          </div>

          <div class="p-2.5 rounded bg-surface-container-lowest text-[11px] font-label-sm text-outline border border-outline-variant/20 flex items-center gap-2">
            <span class="material-symbols-outlined text-[15px] text-tertiary">info</span>
            <span>{i18n.t('quit.hint')}</span>
          </div>

          <div class="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/20">
            <button
              onClick={handleCancel}
              class="px-3.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-medium transition-colors"
            >
              {i18n.t('quit.cancel')}
            </button>
            <button
              onClick={handleConfirm}
              class="px-4 py-1.5 rounded-lg bg-error text-on-error hover:brightness-110 text-xs font-semibold shadow transition-all press-scale"
            >
              {i18n.t('quit.confirm')}
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
};
