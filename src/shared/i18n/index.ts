export interface LocaleInfo {
  code: string;
  name: string;
  nativeName: string;
  dir: 'ltr' | 'rtl';
}

export const SUPPORTED_LOCALES: LocaleInfo[] = [
  { code: 'system', name: 'System Default', nativeName: 'System default', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', dir: 'ltr' },
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', dir: 'ltr' },
  { code: 'fr', name: 'French', nativeName: 'Français', dir: 'ltr' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', dir: 'rtl' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', dir: 'ltr' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', dir: 'ltr' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', dir: 'ltr' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', dir: 'ltr' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', dir: 'ltr' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Português (Brasil)', dir: 'ltr' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', dir: 'ltr' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', dir: 'ltr' },
  { code: 'zh-CN', name: 'Simplified Chinese', nativeName: '简体中文', dir: 'ltr' },
];

export const DICTIONARY: Record<string, Record<string, string>> = {
  en: {
    // Shell & Navigation
    'app.name': 'BissBot',
    'app.tagline': 'AI Teammate App',
    'rail.pages': 'Pages',
    'rail.agents': 'Agents',
    'rail.schedule': 'Schedule',
    'rail.tasks': 'Tasks',
    'rail.workflows': 'Workflows',
    'rail.usage': 'Usage',
    'rail.library': 'Library',
    'rail.marketplace': 'Marketplace',
    'rail.settings': 'Settings',
    'rail.help': 'Help',
    'rail.website': 'Website',
    'rail.more': 'More',
    'rail.pin': 'Pin to rail',
    'rail.unpin': 'Unpin from rail',

    // Server Rail
    'server.this_computer': 'This computer',
    'server.mute': 'Mute',
    'server.notification_settings': 'Notification settings',
    'server.usage': 'Usage',
    'server.settings': 'Settings',
    'server.add_server': 'Add server',
    'server.retry': 'Retry',
    'server.step.install_update': 'Install the update',
    'server.step.start_server': 'Start the server',
    'server.step.connect': 'Connect',
    'server.step.load_workspace': 'Load the workspace',

    // Sidebar
    'sidebar.agents': 'Agents',
    'sidebar.routines': 'Routines',
    'sidebar.search_placeholder': 'Filter agents, runs, alerts...',
    'sidebar.new_agent': 'New agent',
    'sidebar.new_channel': 'New channel',
    'sidebar.new_folder': 'New folder',
    'sidebar.mark_all_read': 'Mark all as read',
    'sidebar.pinned': 'Pinned',
    'sidebar.needs_you': 'Needs You',
    'sidebar.people': 'People',
    'sidebar.unassigned': 'Unassigned',
    'sidebar.hidden': 'Hidden',
    'sidebar.no_agents': 'No agents yet',
    'sidebar.create_first_agent': 'Create your first agent',
    'sidebar.drag_to_pin': 'Drag here to pin',
    'sidebar.storage_almost_full': 'Storage almost full',
    'sidebar.free_up_space': 'Free up space',
    'sidebar.online_now': 'Online now',
    'sidebar.offline': 'Offline',

    // Agent States & Chips
    'agent.state.thinking': 'Thinking...',
    'agent.state.responded': 'Responded',
    'agent.state.waiting_answer': 'Waiting for your answer',
    'agent.state.waiting_approval': 'Waiting for your approval',
    'agent.state.waiting_browser': 'Waiting for you in the browser',
    'agent.state.waits_for_limit': 'Waits for limit',
    'agent.chip.limit': 'LIMIT',
    'agent.chip.approval': 'APPROVAL',
    'agent.chip.wait': 'Wait',

    // Right Side Panel
    'panel.collapse': 'Collapse panel',
    'panel.expand': 'Expand panel',
    'panel.close': 'Close tab',
    'panel.terminal': 'Terminal & Logs',
    'panel.browser': 'Embedded Browser',
    'panel.files': 'Session Files',
    'panel.inspect': 'Inspector',
    'panel.subagents': 'Subagents',

    // Global Search
    'search.title': 'Search',
    'search.placeholder': 'Search agents, messages, files, settings...',
    'search.hint': 'Type to search or press Esc to close',
    'search.no_results': 'No results found',

    // Onboarding
    'onboarding.title': 'Build your AI team.',
    'onboarding.subtitle': 'BissBot is free for personal use. Choose the AI for your agents.',
    'onboarding.free_models': 'Use free models',
    'onboarding.free_models_desc': 'No AI subscription needed.',
    'onboarding.my_plan': 'Use my AI subscription',
    'onboarding.my_plan_desc': 'ChatGPT, Claude, or Grok',
    'onboarding.connect_plan': 'Connect your plan',
    'onboarding.connect_plan_desc': 'Sign in once. Your agents use your plan.',
    'onboarding.connecting_provider': 'Connecting {provider}. Finish the sign-in if a browser window opens.',
    'onboarding.provider_downloading': '{provider} is still downloading.',
    'onboarding.download_to_continue': 'Download {provider} to continue.',
    'onboarding.connect_to_continue': 'Connect {provider} to continue.',
    'onboarding.use_free_instead': 'Use free models instead',
    'onboarding.computer_title': 'BissBot might control your computer',
    'onboarding.computer_desc': 'Grant Screen Recording and Accessibility to enable Computer Use.',
    'onboarding.where_run_title': 'Where will BissBot run?',
    'onboarding.where_run_desc': 'Use this computer, or connect to a BissBot host that runs somewhere else.',
    'onboarding.setup_computer': 'Set up this computer',
    'onboarding.setup_computer_desc': 'Agents, conversations, and files stay on this computer.',
    'onboarding.connect_host': 'Connect to a host',
    'onboarding.connect_host_desc': 'Use an invitation from the person who runs the BissBot host.',
    'onboarding.join_note': 'You will join as {email}. Email invitations only work for the address that received them.',
    'onboarding.analytics_title': 'Help make BissBot better',
    'onboarding.analytics_desc': 'Share usage with your account. Never chats or files.',
    'onboarding.analytics_thanks': 'Thank you! The team owes you one.',
    'onboarding.terms_agreement': 'Continuing accepts the Terms of Service and acknowledges the Privacy Policy.',
    'onboarding.continue': 'Continue',
    'onboarding.open_openbot': 'Open BissBot',

    // Settings
    'settings.title': 'Settings',
    'settings.general': 'General',
    'settings.agents': 'Agents',
    'settings.profile': 'Profile',
    'settings.notifications': 'Notifications',
    'settings.voice': 'Voice',
    'settings.dynamic_island': 'Dynamic Island',
    'settings.agent_dock': 'Agent Dock',
    'settings.computer_use': 'Computer Use',
    'settings.billing': 'Billing',
    'settings.mobile_connect': 'Mobile Connect',
    'settings.updates': 'Updates',
    'settings.hosted_servers': 'Hosted Servers',
    'settings.theme': 'Theme',
    'settings.theme_dark': 'Dark',
    'settings.theme_light': 'Light',
    'settings.theme_system': 'System default',
    'settings.transparent_window': 'Transparent window (macOS)',
    'settings.language': 'Language',
    'settings.send_shortcut': 'Send shortcut',
    'settings.launch_at_login': 'Launch BissBot at login',
    'settings.keep_running': 'Keep BissBot running in the background',
    'settings.keep_awake': 'Keep this computer awake',
    'settings.keep_awake_battery': 'Also on battery',
    'settings.restore_workspace': 'Restore the last workspace on launch',
    'settings.hold_cmd_q': 'Hold ⌘Q to quit',

    // Quit Dialog
    'quit.title': 'Quit BissBot?',
    'quit.message': 'Agents and routines stop until you open BissBot again.',
    'quit.hint': 'Hold ⌘Q or press it twice to quit',
    'quit.confirm': 'Quit',
    'quit.cancel': 'Cancel',
  },
  de: {
    'app.name': 'BissBot',
    'app.tagline': 'KI-Teamkollegen-App',
    'rail.pages': 'Seiten',
    'rail.agents': 'Agenten',
    'rail.schedule': 'Zeitplan',
    'rail.tasks': 'Aufgaben',
    'rail.workflows': 'Arbeitsabläufe',
    'rail.usage': 'Nutzung',
    'rail.marketplace': 'Marktplatz',
    'rail.settings': 'Einstellungen',
    'server.this_computer': 'Dieser Computer',
    'sidebar.pinned': 'Angeheftet',
    'sidebar.needs_you': 'Braucht dich',
    'sidebar.no_agents': 'Noch keine Agenten',
    'onboarding.title': 'Erstelle dein KI-Team.',
    'quit.title': 'BissBot beenden?',
    'quit.message': 'Agenten und Routinen halten an, bis du BissBot wieder öffnest.',
    'quit.confirm': 'Beenden',
    'quit.cancel': 'Abbrechen',
  },
  fr: {
    'app.name': 'BissBot',
    'app.tagline': 'Application de coéquipiers IA',
    'rail.pages': 'Pages',
    'rail.agents': 'Agents',
    'rail.schedule': 'Calendrier',
    'rail.tasks': 'Tâches',
    'rail.workflows': 'Flux de travail',
    'rail.usage': 'Utilisation',
    'rail.marketplace': 'Marché',
    'rail.settings': 'Paramètres',
    'server.this_computer': 'Cet ordinateur',
    'sidebar.pinned': 'Épinglé',
    'sidebar.needs_you': 'A besoin de vous',
    'sidebar.no_agents': 'Aucun agent pour le moment',
    'onboarding.title': 'Créez votre équipe IA.',
    'quit.title': 'Quitter BissBot ?',
    'quit.message': 'Les agents et routines s\'arrêtent jusqu\'à la réouverture d\'BissBot.',
    'quit.confirm': 'Quitter',
    'quit.cancel': 'Annuler',
  },
  es: {
    'app.name': 'BissBot',
    'app.tagline': 'App de compañeros de IA',
    'rail.pages': 'Páginas',
    'rail.agents': 'Agentes',
    'rail.schedule': 'Horario',
    'rail.tasks': 'Tareas',
    'rail.workflows': 'Flujos de trabajo',
    'rail.usage': 'Uso',
    'rail.marketplace': 'Mercado',
    'rail.settings': 'Configuración',
    'server.this_computer': 'Este equipo',
    'sidebar.pinned': 'Fijados',
    'sidebar.needs_you': 'Te necesita',
    'sidebar.no_agents': 'Aún no hay agentes',
    'onboarding.title': 'Crea tu equipo de IA.',
    'quit.title': '¿Salir de BissBot?',
    'quit.message': 'Los agentes y las rutinas se detendrán hasta que vuelvas a abrir BissBot.',
    'quit.confirm': 'Salir',
    'quit.cancel': 'Cancelar',
  },
  'zh-CN': {
    'app.name': 'BissBot',
    'app.tagline': 'AI 队友应用',
    'rail.pages': '页面',
    'rail.agents': '智能体',
    'rail.schedule': '日程',
    'rail.tasks': '任务',
    'rail.workflows': '工作流',
    'rail.usage': '使用量',
    'rail.marketplace': '市场',
    'rail.settings': '设置',
    'server.this_computer': '这台电脑',
    'sidebar.pinned': '已置顶',
    'sidebar.needs_you': '需要你',
    'sidebar.no_agents': '暂无智能体',
    'onboarding.title': '构建你的 AI 团队。',
    'quit.title': '退出 BissBot？',
    'quit.message': '在重新打开 BissBot 前，智能体和例程将暂停。',
    'quit.confirm': '退出',
    'quit.cancel': '取消',
  },
};

export class I18nManager {
  private currentLocale: string = 'en';

  constructor(initialLocale: string = 'en') {
    this.setLocale(initialLocale);
  }

  public setLocale(locale: string) {
    if (locale === 'system') {
      const sysLang = typeof navigator !== 'undefined' ? navigator.language : 'en';
      const match = SUPPORTED_LOCALES.find(
        (l) => l.code === sysLang || sysLang.startsWith(l.code)
      );
      this.currentLocale = match ? match.code : 'en';
    } else {
      this.currentLocale = locale;
    }
  }

  public getLocale(): string {
    return this.currentLocale;
  }

  public getLocaleInfo(): LocaleInfo {
    return (
      SUPPORTED_LOCALES.find((l) => l.code === this.currentLocale) ||
      SUPPORTED_LOCALES[3] // English default
    );
  }

  public t(key: string, params?: Record<string, string | number>): string {
    const localeDict = DICTIONARY[this.currentLocale] || DICTIONARY.en;
    let text = localeDict[key] || DICTIONARY.en[key] || key;

    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return text;
  }

  public formatNumber(num: number): string {
    return new Intl.NumberFormat(this.currentLocale).format(num);
  }

  public formatCompactNumber(num: number): string {
    return new Intl.NumberFormat(this.currentLocale, { notation: 'compact' }).format(num);
  }

  public formatPercent(val: number): string {
    return new Intl.NumberFormat(this.currentLocale, {
      style: 'percent',
      maximumFractionDigits: 1,
    }).format(val);
  }

  public formatDate(date: Date | string | number): string {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    return new Intl.DateTimeFormat(this.currentLocale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d);
  }

  public formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    const gb = mb / 1024;
    return `${gb.toFixed(1)} GB`;
  }
}

export const i18n = new I18nManager('en');
