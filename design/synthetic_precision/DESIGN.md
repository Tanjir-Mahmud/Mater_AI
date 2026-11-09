---
name: Synthetic Precision
colors:
  surface: '#111319'
  surface-dim: '#111319'
  surface-bright: '#36393f'
  surface-container-lowest: '#0b0e13'
  surface-container-low: '#191c21'
  surface-container: '#1d2025'
  surface-container-high: '#272a30'
  surface-container-highest: '#32353a'
  on-surface: '#e1e2e9'
  on-surface-variant: '#c8c4d6'
  inverse-surface: '#e1e2e9'
  inverse-on-surface: '#2e3036'
  outline: '#928f9f'
  outline-variant: '#474554'
  surface-tint: '#c7bfff'
  primary: '#c7bfff'
  on-primary: '#2a039d'
  primary-container: '#8e7fff'
  on-primary-container: '#24008c'
  inverse-primary: '#5a49cb'
  secondary: '#66dc9f'
  on-secondary: '#003921'
  secondary-container: '#22a46c'
  on-secondary-container: '#00311c'
  tertiary: '#ffb955'
  on-tertiary: '#452b00'
  tertiary-container: '#c3841e'
  on-tertiary-container: '#3c2500'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e4dfff'
  primary-fixed-dim: '#c7bfff'
  on-primary-fixed: '#170065'
  on-primary-fixed-variant: '#422db2'
  secondary-fixed: '#83f9ba'
  secondary-fixed-dim: '#66dc9f'
  on-secondary-fixed: '#002111'
  on-secondary-fixed-variant: '#005232'
  tertiary-fixed: '#ffddb5'
  tertiary-fixed-dim: '#ffb955'
  on-tertiary-fixed: '#2a1800'
  on-tertiary-fixed-variant: '#633f00'
  background: '#111319'
  on-background: '#e1e2e9'
  surface-variant: '#32353a'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 1.875rem
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.625rem
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: '600'
    lineHeight: 1.375rem
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 0.9375rem
    fontWeight: '400'
    lineHeight: 1.375rem
  body-md:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.25rem
  body-sm:
    fontFamily: Inter
    fontSize: 0.8125rem
    fontWeight: '400'
    lineHeight: 1.125rem
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 0.8125rem
    fontWeight: '500'
    lineHeight: 1.125rem
    letterSpacing: -0.01em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 0.75rem
    fontWeight: '500'
    lineHeight: 1rem
    letterSpacing: 0em
  code-inline:
    fontFamily: JetBrains Mono
    fontSize: 0.8125rem
    fontWeight: '400'
    lineHeight: 1.125rem
  code-block:
    fontFamily: JetBrains Mono
    fontSize: 0.8125rem
    fontWeight: '400'
    lineHeight: 1.25rem
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 0.5rem
  margin: 0.75rem
  space-xs: 0.25rem
  space-sm: 0.375rem
  space-md: 0.5rem
  space-lg: 0.75rem
  space-xl: 1rem
---

## Brand & Style

This design system defines an ultra-focused, local-first pro AI workspace built for engineers, researchers, and technical power users. The aesthetic fuses **Technical Minimalism** with **Tactile Precision**—evoking the speed, reliability, and calm isolation of native desktop software. 

The emotional posture is quiet competence: zero visual noise, extreme structural clarity, and surgical responsiveness. Interactions must feel instantaneous and local, discarding soft, decorative web metaphors in favor of dense data displays, clean boundaries, and disciplined contrast. The UI operates as an instrument panel rather than an editorial feed—prioritizing spatial predictability, micro-information density, and fatigue-reducing low-glare dark surfaces.

## Colors

The palette leverages a stepped dark canvas hierarchy paired with a focused electric lavender accent.

### Color Tokens & Assignments
- **Canvas Base (`#0E1116`)**: The primary desktop viewport background and core terminal canvas.
- **Structural Frame & Sidebars (`#12151D`)**: Slightly elevated structural dividers, navigation rails, and utility panels.
- **Surfaces & Cards (`#181C26`)**: Elevated panels, active workspace cards, input containers, and modal layers.
- **Subtle Borders (`#262C38`)**: Single-pixel structural seams delineating windows, data columns, and control states.
- **Primary Text (`#E8EAF0`)**: High-contrast foreground for active metrics, critical copy, and primary code views.
- **Muted Text (`#8A93A6`)**: Secondary metadata, timestamps, keyboard shortcut hints, and inactive states.
- **Accent - Electric Lavender (`#8B7CFF`)**: Primary action signals, active selections, focus rings, and AI agent execution states.
- **Success (`#3FB97F`)**: Git branch syncs, local model runtime availability, and test passes.
- **Warning (`#E5A13B`)**: Context-window pressure alerts, uncommitted state warnings, and fallback thresholds.
- **Danger (`#E5534B`)**: Execution errors, process terminations, and destructive actions.

Color should be applied with surgical constraint: status indicators use monochromatic dots with glowing dot fills, while interactive states rely on luminosity adjustments rather than noisy hues.

## Typography

The type system pairs **Inter** for dense UI ergonomics with **JetBrains Mono** for technical telemetry, IDs, keyboard shortcuts, and code blocks.

- **Inter**: Tuned for maximum legibility at small scale (12px–14px). Tight letter spacing across headings prevents large empty silhouettes.
- **JetBrains Mono**: Used for all contextual system states (token counters, process IDs, memory usage, git SHAs, and keybindings). Tabular figures are enabled by default across all numerical displays.
- **Proportional Restraint**: No body copy exceeds 15px. Hierarchy is established through weight shifts (400 vs 600) and color tiers (`#E8EAF0` vs `#8A93A6`) rather than excessive size jumps, preserving visual stability across multi-pane splits.

## Layout & Spacing

The layout follows a strict multi-pane desktop model configured for rapid window splitting, collapsible docking, and minimal chrome overhead.

- **Grid & Panes**: A dynamic flex/pane split architecture. The screen is segmented into a primary navigation rail (48px fixed), a collapsible context/sessions sidebar (240px–320px), and an infinite modular workspace area supporting vertical and horizontal splits.
- **Micro Spacing Scale**: Spacing is engineered for high information density. Component gutters default to `0.5rem` (8px), maintaining tight adjacency between controls and associated data streams.
- **Padding Rhythms**: Internal control padding adheres strictly to `4px` vertical by `8px` horizontal for compact buttons and inputs. Cards and content panels utilize `8px` to `12px` internal padding to maximize data area.
- **Responsive Adaptations**: Designed desktop-first. Under 1024px, the multi-pane layout shifts to an active pane overlay with slide-out utility drawers; desktop viewports (1280px+) lock to side-by-side persistent tiles.

## Elevation & Depth

This design system avoids blurry ambient drop shadows, relying instead on **Tonal Layering** and **Crisp Structural Borders**.

1. **Layer 0 (Canvas Base - `#0E1116`)**: The deepest foundation, visible in canvas margins, background gutter gaps, and terminal surfaces.
2. **Layer 1 (Recessed/Framed - `#12151D`)**: Toolbars, status bars, and navigation sidebars, bounded by a 1px border of `#262C38`.
3. **Layer 2 (Surfaces - `#181C26`)**: Active working panels, code blocks, chat message bubbles, and inspector drawers.
4. **Layer 3 (Overlays & Menus - `#181C26` + `#262C38` border)**: Floating command palettes, context menus, and tooltips. Elevated overlays receive a sharp shadow: `0 4px 16px rgba(0, 0, 0, 0.45)`.
5. **Focus & Selection**: Outlines use a crisp, unblurred `1px` or `2px` ring in `#8B7CFF` with an optional `0 0 0 2px rgba(139, 124, 255, 0.2)` halo for accessibility.

## Shapes

The shape system is defined by disciplined, compact geometry using **Soft (Level 1)** rounding:

- **Base Radius (6px / 0.375rem)**: Standard for inputs, buttons, chips, list-item hover targets, and segmented controls.
- **Container Radius (8px / 0.5rem)**: Standard for cards, floating modals, docked panels, and context flyouts.
- **Inner Nesting Rule**: When elements are nested inside containers (e.g., an action button within an 8px card), the child element uses a 6px or 4px radius to prevent corner tension and maintain optical concentricity.
- **Strict Prohibition**: Completely circular "pill" shapes are forbidden, maintaining the structured, non-casual feel of professional desktop software.

## Components

### Buttons
- **Primary**: Background `#8B7CFF`, foreground `#0E1116`, font `Inter` 600 (0.8125rem). Height: 28px. Padding: 0 10px. Hover: background brightness +10%. Active: scale(0.98).
- **Secondary / Ghost**: Background `#181C26`, border `1px solid #262C38`, foreground `#E8EAF0`. Hover: border `#8B7CFF`, background `#1F2432`.
- **Icon Actions**: 28px × 28px square, borderless, foreground `#8A93A6`. Hover: foreground `#E8EAF0`, background `#181C26`.

### Chips & Badges
- **Status Badges**: Monospace `JetBrains Mono` (0.75rem), height: 20px, padding: 0 6px, radius: 4px.
- **Style**: Semi-transparent backgrounds (e.g., `#3FB97F` at 12% opacity) paired with solid text (`#3FB97F`) and an inline 4px status dot.

### Lists & Trees
- **Tree Views & File Rows**: Height: 26px. Full-width hover highlight in `#181C26`. Active/Selected row receives a 2px left border accent in `#8B7CFF` with a subtle `#8B7CFF` 8% background tint.
- **Keyboard Targets**: Active focus is indicated by an inner 1px border of `#8B7CFF`.

### Form Controls (Inputs, Checkboxes, Radios)
- **Input Fields**: Height: 30px, background `#12151D`, border `1px solid #262C38`, text `#E8EAF0`, placeholder `#8A93A6`. Focus: border `#8B7CFF`, box-shadow `0 0 0 1px #8B7CFF`.
- **Checkboxes & Radios**: 14px × 14px, background `#12151D`, border `1px solid #262C38`, radius: 3px (checkbox) or circle (radio). Checked: background `#8B7CFF`, border `#8B7CFF`, glyph `#0E1116`.

### Cards & Panels
- Background `#181C26`, border `1px solid #262C38`, radius: 8px. Header bars within panels are visually split by a bottom border of `1px solid #262C38` with 28px–32px height.

### Specialized Workspace Components
- **Command Palette (Cmd+K)**: Centered fixed container, width 580px, background `#181C26`, elevated border `1px solid #8B7CFF`, containing quick-filter search, hotkey indicators (`JetBrains Mono` label badges), and categorized execution actions.
- **Model Inference Stream Card**: Low-density divider lines, real-time token/sec telemetry displayed in `label-sm` muted text, and a blinking cursor indicator (`#8B7CFF`, 2px width).