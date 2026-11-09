---
name: Synthetic Precision Light
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#464554'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#767586'
  outline-variant: '#c7c4d7'
  surface-tint: '#494bd6'
  primary: '#4648d4'
  on-primary: '#ffffff'
  primary-container: '#6063ee'
  on-primary-container: '#fffbff'
  inverse-primary: '#c0c1ff'
  secondary: '#563fdb'
  on-secondary: '#ffffff'
  secondary-container: '#6f5bf5'
  on-secondary-container: '#fffbff'
  tertiary: '#006c49'
  on-tertiary: '#ffffff'
  tertiary-container: '#00885d'
  on-tertiary-container: '#000703'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#e4dfff'
  secondary-fixed-dim: '#c7bfff'
  on-secondary-fixed: '#170065'
  on-secondary-fixed-variant: '#4021c6'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  title-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0em
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: -0.01em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.02em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 0.75rem
  gutter-desktop: 1rem
  margin: 0.75rem
  margin-desktop: 1.5rem
  space-xxs: 0.125rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system embodies the calculated precision, focus, and rapid legibility required by high-stakes Site Reliability Engineers (SREs), DevOps architects, and systems developers. Rejecting visual bloat, the aesthetic merges technical rigor with modern workplace clarity. 

The aesthetic philosophy is **Technical Minimalism**:
- **High-Density Utility:** Prioritizes screen real estate, information hierarchy, and data scannability over decorative whitespace.
- **Cool Optical Calibrations:** Replaces harsh pure-white canvases with clinical cool-slate foundations, reducing glare while maintaining maximum visual contrast for dense telemetry, metrics, and incident control interfaces.
- **Micro-Engineered Feedback:** State shifts are precise, snappy, and clear—employing sharp 1px hairline dividers, crisp borders, and purposeful terminal-grade status indicators to signal system health instantly.

## Colors

The palette is engineered for precision telemetry and immediate status parsing under intensive monitoring conditions.

### Surface and Canvas Architecture
- **Root Canvas:** `#f8fafc` (Slate-50) creates an anti-glare, cool-tinted substrate.
- **Secondary Canvas & Recessed Panes:** `#f1f5f9` (Slate-100) separates sidebars, rail navigation, and structural trays.
- **Card & Component Surfaces:** `#ffffff` (Pure White) punches forward, bordered by clean hairline edges.
- **Hairline Dividers & Borders:** `#e2e8f0` (Slate-200) for structural framing; `#cbd5e1` (Slate-300) for interactive control edges and active focus cues.

### Typography & Content Levels
- **Text Primary:** `#0f172a` (Slate-900) for critical metrics, active values, and primary headings.
- **Text Secondary:** `#334155` (Slate-700) for balanced label structures, body readouts, and metadata.
- **Text Muted:** `#64748b` (Slate-500) for passive axis labels, timestamps, and contextual keys.

### Brand Accents & Terminal System Status
- **Primary Brand Indigo:** `#6366f1` / **Lavender:** `#705cf6` drive active interactive actions, selection pills, and focused states.
- **Healthy / Optimal (Emerald):** `#10b981` denotes active clusters, nominal latency, and operational health.
- **Warning / Throttled (Amber):** `#f59e0b` signals degraded nodes, approaching rate limits, and threshold anomalies.
- **Critical / Incident (Rose):** `#f43f5e` flags failed builds, downed endpoints, and unhandled trace errors.

## Typography

Typography balances clinical legibility with space-efficient compactness.

- **Primary Typeface (Inter):** Leverages tabular figures and standardized glyph shapes for zero horizontal jitter when telemetry metrics stream live. Headers remain tight, neutral, and devoid of stylistic flourish.
- **Technical Monospace (JetBrains Mono):** Dedicated to machine data, commit hashes, Kubernetes pod names, terminal strings, ports, IP matrices, and status badges.
- **Vertical Metric Tightening:** Standard body line heights are restricted to 18px and 16px to support compact lists and split pane layouts where vertical real estate is paramount.

## Layout & Spacing

The system enforces a dense, fluid grid paired with modular dock panels.

### Structural Framework
- **Grid Structure:** 12-column fluid grid system configured with compact gutters (`0.75rem` on mobile/tablet, expanding to `1rem` on widescreen workstations).
- **Workspace Canvas Margins:** Anchored at `1.5rem` for expansive multi-monitor terminal boards, scaling down to `0.75rem` on handheld diagnostic views.
- **Rhythm Base:** Built around a tight 4px baseline matrix (`space-xxs`: 2px, `space-xs`: 4px, `space-sm`: 8px, `space-md`: 12px, `space-lg`: 16px, `space-xl`: 24px) that prevents loose padding and preserves high data density across dashboards.

### Responsive Behaviors
- **Desktop (>= 1280px):** Multi-pane split configurations, persistent collapsible side rails (56px collapsed, 240px expanded), and quad-column metric grids.
- **Tablet (768px – 1279px):** Side panels convert to slide-over drawers; grid collapses into two-column dashboards.
- **Mobile (< 768px):** Telemetry cards flow into single-column vertical stacks; horizontal scroll trays manage log filters and breadcrumbs.

## Elevation & Depth

Visual hierarchy is maintained via structural line work and soft, diffused atmospheric elevation rather than heavy drop shadows.

- **Surface Tiers:**
  - *Tier 0 (Root Base):* `#f8fafc` provides non-interactive canvas grounding.
  - *Tier 1 (Panels & Trays):* `#f1f5f9` with right/bottom borders (`1px solid #e2e8f0`).
  - *Tier 2 (Actionable Cards & Widgets):* `#ffffff` with a crisp `1px solid #e2e8f0` border and `box-shadow: 0 1px 2px 0 rgba(15, 23, 42, 0.05)`.
  - *Tier 3 (Floating Popovers & Flyouts):* `#ffffff` with `1px solid #cbd5e1` and `box-shadow: 0 4px 12px -2px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.04)`.
  - *Tier 4 (Modals & Command Palettes):* `#ffffff` with `box-shadow: 0 12px 24px -4px rgba(15, 23, 42, 0.12), 0 4px 8px -2px rgba(15, 23, 42, 0.04)`.
- **State Changes:** Hover states on interactive cards do not drastically change elevation; they subtly darken the border to `#cbd5e1` and introduce a fine glow (`box-shadow: 0 2px 6px 0 rgba(99, 102, 241, 0.08)`).

## Shapes

The geometric framework balances human software refinement with mechanical precision.

- **Base Corner Radius (`roundedness: 2`):** Cards, modal sheets, and primary panels utilize `rounded-lg` (1rem / 16px) for an intentional, structured container feel.
- **Micro-Controls:** Input fields, filter buttons, status chips, and tab items utilize smaller radii (0.375rem to 0.5rem) to keep data-heavy grids crisp and prevent rounded edge clipping.
- **Status Indicators & Avatars:** Terminal pulse dots and ping indicators are fully circular (`rounded-full`).

## Components

### Buttons
- **Primary:** Solid `#6366f1` background, `#ffffff` text, 0.5rem radius, height of 32px (compact) or 36px (standard). Hover: `#4f46e5`. Active: `#4338ca`.
- **Secondary / Outline:** Background `#ffffff`, border `1px solid #e2e8f0`, text `#334155`. Hover: background `#f8fafc`, border `#cbd5e1`.
- **Ghost / Icon:** Transparent background, text `#64748b`. Hover: background `#f1f5f9`, text `#0f172a`.
- **Destructive:** Background `#ffffff`, border `1px solid #fecdd3`, text `#f43f5e`. Hover: background `#fff1f2`.

### Chips & Badges
- **Status Badges:** JetBrains Mono font (`label-sm`), 20px fixed height, uppercase tracking.
  - *Operational:* Background `#ecfdf5`, text `#065f46`, border `1px solid #a7f3d0`. Includes a 6px `#10b981` indicator dot.
  - *Warning:* Background `#fffbeb`, text `#92400e`, border `1px solid #fde68a`.
  - *Critical:* Background `#fff1f2`, text `#9f1239`, border `1px solid #fecdd3`.
  - *Neutral / Tag:* Background `#f1f5f9`, text `#475569`, border `1px solid #e2e8f0`.

### Input Fields & Controls
- **Text Inputs:** Height 32px, background `#ffffff`, border `1px solid #e2e8f0`, text `#0f172a`, font size 13px. Focus ring: `0 0 0 2px rgba(99, 102, 241, 0.2)` with border `#6366f1`.
- **Checkboxes & Radios:** 14px × 14px square/circle with `1px solid #cbd5e1`. Checked: `#6366f1` fill with sharp white check/dot.

### Cards & Panels
- **Telemetry Card:** `#ffffff` surface, `1px solid #e2e8f0` outer border, `rounded-lg` corners, internal padding of `space-md` (12px). Header zones feature hairline bottom rules (`#f1f5f9`) separating control titles from charts.

### Tables & Log Streams
- **Data Rows:** Alternating rows optional; standard background `#ffffff` with hover state `#f8fafc`. Row height 32px (condensed) to 40px (regular). Monospace data cells aligned right for numeric values and left for string identifiers.
- **Code Snippet / Terminal Inset:** Background `#0f172a` (slate dark contrast), text `#f8fafc`, `rounded-md`, hairline border `#1e293b`.