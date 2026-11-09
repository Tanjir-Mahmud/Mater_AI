# OpenBot — AI Teammate Desktop App

A local-first desktop workspace app where one person runs a team of AI agents. Clean-room rebuild adhering strictly to the OpenBot Feature Specification (`openbot-complete-feature-spec-2026-11-09.md`) and the Synthetic Precision design system (`design/`).

---

## Architecture & Technology Stack

- **Desktop Framework:** Electron v33 with secure process separation:
  - **Main Process:** TypeScript compiled with esbuild, owns app lifecycle, window security, window bounds persistence & screen clamping, native menus, system tray, IPC registration, and live theme palette tracking.
  - **Preload Script:** Context-isolated typed app bridge (`window.openbot`) with zero direct Node.js exposure to the renderer.
  - **Renderer:** SolidJS v1.9 + Vite v6 + TypeScript + Tailwind CSS v3 configured with Synthetic Precision design tokens (dark default `#0b0e13`, light palette `#ffffff`, Inter & JetBrains Mono typography, Material Symbols).
- **Internationalization (i18n):** 15 languages (System default, English, Arabic, German, Spanish, French, Hebrew, Italian, Japanese, Korean, Dutch, Polish, Brazilian Portuguese, Russian, Turkish, Simplified Chinese). RTL mirroring for Arabic and Hebrew. Locale-aware number, date, and file size formatting.
- **Persistence:** Local SQLite event log and projections schema (Node.js/Electron embedded SQLite engine), `window-bounds.json`, `settings.json`, and dynamic themes directory.

---

## Milestone Status

### Milestone 1 — App Shell and Onboarding: **COMPLETED**
- [x] **Main Window:** Default 1200x820, min 960x640, bounds saved to disk and restored on launch, clamped to visible display work areas.
- [x] **Process Supervision:** Crash supervisor in main process auto-reloads up to 3 times within 60s for abnormal exits.
- [x] **Page Rail:** 48px fixed rail with Pages tooltip, navigation icons (Agents, Schedule, Tasks, Workflows, Usage, Library, Marketplace, Settings, Help, Website), "More" flyout menu with page pins (Usage pinned by default), and Help menu ("What's new", "Full changelog", "Guides", "Join the Discord", "Report a problem").
- [x] **Server Rail:** Displays joined servers with real statuses (online, connecting, loading, updating), local server labelled "This computer", server context menu (Mute durations, Notification settings, Usage, Settings), loading steps with elapsed time & Retry, and Add Server dialog (hosted plans, local node, invitation link).
- [x] **Sidebar:** Resizable width (~260px), back/forward buttons, Agents/Routines view switcher, search input with keyboard shortcut hint (`⌘O`), "New agent or folder" menu (+ button), "Mark all as read" button.
- [x] **Sections & Folder Tree:** Collapsible sections for Pinned chats, Needs You (approval / wait chips), Channels, Unassigned agents, People / DMs (online/offline status & unread counts), and Hidden agents. Folder management: move up/down, duplicate, rename (unique names required), move to, nested folders.
- [x] **Agent Rows & Badges:** Avatars with status dots (secondary green, tertiary orange, etc.), role subtitle, unread notification count badge, status messages ("Waiting for your answer", "Waiting for your approval"), Limit chip with reset time, and right-click context menu (Edit, Duplicate, Delete with undo, Hide, Restore).
- [x] **Sidebar Notification Cards:** Storage card (warns when free disk <10% / 5GB; non-dismissible red card when <2% / 1GB), Machine metrics card, Community promo card, and Mobile app card.
- [x] **Main Workspace:** Center conversation with agent header bar, telemetry indicators (latency, token count, memory bar), Branch Agent, Export, and Clear memory actions. Interactive chat with user bubble, agent reasoning/thinking accordion, tool step CLI execution bubble, approval prompt card with Approve/Decline actions, and composer with send shortcut (Enter vs ⌘Enter), model chip, file attachments, voice dictation button, and steer-while-working banner.
- [x] **Right Side Panel:** Tabs for Terminal & Logs, Embedded Browser, Session Files, Inspector, Subagents. Controls to collapse, expand, maximize, restore, and close tabs with release actions.
- [x] **Loading Screen:** "Loading OpenBot" with 7 agents jumping animation with staggered bouncing, mounting while screen fades.
- [x] **Tray & Menus:** Native application menu (Stop all agents, Check for Updates, Settings, Actual Size, Zoom In/Out, Copy Link, Quit) and System Tray (Open OpenBot, Stop all remote control, Quit).
- [x] **Quit Dialog:** Quit confirmation modal: "Quit OpenBot? Agents and routines stop until you open OpenBot again." with "Hold ⌘Q or press it twice to quit" hint.
- [x] **Global Search:** `Cmd/Ctrl+K` modal to search across agents, channels, pages, and settings with keyboard navigation and Esc to dismiss.
- [x] **Theming:** Synthetic Precision Dark (default), Light, and System modes. Live watcher for custom palette files from `<userData>/themes/<name>.json`. Semantic CSS design tokens (`--canvas`, `--frame`, `--sidebar`, `--surface`, `--text`, `--text-muted`, `--border`, `--accent`, `--accent-foreground`, `--success`, `--warning`, `--danger`).
- [x] **Onboarding Flow:**
  - Pre-sign-in Language wheel (15 languages with native labels and RTL support).
  - Step 1 (Choose): "Build your AI team." ("Use free models" vs "Use my AI subscription", Terms & Privacy links, Analytics consent checkbox with "Thank you! The team owes you one." toast).
  - Step 2 (Plan): "Connect your plan" with 10 supported providers and requirements, Download and Connect buttons, blocked state validation.
  - Step 3 (Computer): macOS Computer Use permissions check.
  - Initial setup: "Where will OpenBot run?" ("Set up this computer" vs "Connect to a host").
- [x] **Settings Modal:** 12 tabs (General, Agents, Profile, Notifications, Voice, Dynamic Island, Agent Dock, Computer Use, Billing, Mobile Connect, Updates, Hosted servers), settings search filter, language switcher, appearance toggles, send shortcut toggle, keep awake, restore workspace, and hold ⌘Q mode.

---

## Milestones Roadmap (Next)

- **Milestone 2:** Providers and agents (ACP provider engine, Windows launch, Codex, Claude, Gemini, Cursor, Cline, Kimi, Devin, Copilot, Mistral, Hermes, local Ollama/LM Studio detection, agent create/edit prompting, deletion, templates).
- **Milestone 3:** Chat and sessions (threads, turns, questions, approvals, tool steps, attachments, FIFO queue persistence, compaction).
- **Milestone 4:** Agent runtime (MCP servers, skills, routines schedule/webhook triggers, workflows DAG, memory review, embedded browser, Computer Use).
- **Milestone 5:** Teams and collaboration (WebRTC team protocol, server roles, audit log, remote desktop).
- **Milestone 6:** Integrations and voice (Slack/Discord/Telegram, WhatsApp via Baileys, voice dictation local & cloud).
- **Milestone 7:** Auth and billing (Cloudflare Workers auth, email code login, commercial licence, Stripe plans).
- **Milestone 8:** Mobile and web clients (Web `/app`, React Native Expo mobile app, PIN lock, Live Activity).
- **Milestone 9:** Marketplace, data, diagnostics, release.

---

## How to Run the App

### Prerequisites
- Node.js >= 20 (tested on v24.13.1)
- npm >= 10

### Installation
```bash
npm install
```

### Build Main & Renderer
```bash
npm run build
```

### Launch Desktop Application
```bash
npm start
```

### Run Automated Tests
```bash
npm test
```

---

## `TODO (unverified)` Items Tracking

Where the specification marked items as unverified from the original repository survey, sensible defaults are implemented with explicit TODO markers in code:
1. `// TODO (unverified): Profile display-name and server-name exact length limits` — Defaulted to 2-32 characters.
2. `// TODO (unverified): Server-plan decrease floor ("cannot go below 5 users")` — Documented in billing rules.
3. `// TODO (unverified): Codex compaction 80%, memory review after 20 turns, essential budget 8,192 bytes` — Configured as default parameters in agent settings.
4. `// TODO (unverified): Webhook routes limit 64, filters limit 128` — Enforced in scheduling constants.
5. `// TODO (unverified): Usage polling 5 min, backup models max 8, max 50 open threads/agent, 4 concurrent turns` — Enforced in queue constants.
6. `// TODO (unverified): Mercury, DeepSeek, OpenRouter setup adapters` — Picker listings wired, provider adapter execution pending Milestone 2.
