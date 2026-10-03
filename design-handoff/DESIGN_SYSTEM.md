# Book Buddy Design System v3

Navy, cobalt and blaze. One rule carries the system: **blaze means action, cobalt means AI, navy holds the stage.** Gloss goes only on things you can press or that are selected.

Open `reference/Design System.html` to see every item below rendered in light and dark.

## 1. Colour
Your existing `styles/bb-tokens.css` already holds the palette and the semantic tokens; keep it. v3 adds gradients, glows and glass only (`bb-tokens.v3.css`).

| Role | Token | Use for |
|---|---|---|
| Action | `--bb-grad-primary` (blaze gloss) | Primary button, active nav item, play, progress, selected chip |
| AI | `--bb-grad-cobalt` (new) | Varta, Sanchika, sparkles, citation chips, AI buttons |
| Stage | `--bb-grad-stage` (new), `--bb-grad-navy` | Featured card (one per row), hero bands, auth backdrop |
| Surfaces | `--bb-bg`, `--bb-surface`, `--bb-surface-2`, `--bb-border` | Page, cards, wells, dividers |
| Text | `--bb-text`, `--bb-text-muted`, `--bb-text-faint` | 4.5:1 minimum for body text (faint is for labels ≥12px bold only) |
| Status | success / warning / danger / info: `-soft` background + `-ink` text | Badges, banners, table status |

Never use blaze for AI, or cobalt for a non-AI action. Show at most one glossy primary button per view.

## 2. Type
Bricolage Grotesque (display) · Familjen Grotesk (UI) · Newsreader (reading). Already loaded via `next/font`.

- **display-xl:** 80 / 0.96 / 800 / -0.045em. Landing only.
- **h1:** 40 / 1.05 / 800 / -0.03em. Page header title (30 on phones).
- **h2:** 28 / 1.1 / 800. Card group titles.
- **h3:** 20 / 1.25 / 600, Familjen. Card titles.
- **body:** 15 / 1.55.
- **label:** 13 / 600.
- **eyebrow:** 12 / 700 / 0.14em, uppercase, blaze-ink. Lives in a pill with a glowing dot.
- **reading:** Newsreader 19 / 1.75.

## 3. Depth, radius and motion
- **Shadows:**
  - `e0` for dividers and `e1` for cards (default); the hover state uses `--bb-shadow-card-hover` (new).
  - `e2` for dialogs and sheets.
  - Glows (new) are for gradient controls only: `--bb-shadow-glow-blaze`, `--bb-shadow-glow-cobalt`.
- **Radius:** xs 6 · sm 10 · md 14 (fields) · tile 16 (icon chips) · lg 22 · **card 26** (new default for dashboard cards) · xl 28 (dialogs, auth card) · pill 999.
- **Glass:** app chrome only (sidebar, header, tab bar): `--bb-glass-surface` plus `--bb-glass-filter`. The mini player and toasts use `--bb-glass-dark`.
- **Motion:**
  - micro 120ms (hover, press)
  - UI 240ms (tabs, sheets)
  - enter 800ms (cards fade up 18px, staggered 60ms)
  - spring `cubic-bezier(.3,1.5,.5,1)` for the active tab rise and the citation pop
  - ease `cubic-bezier(.2,.8,.2,1)`
- **Reduced motion:** respect `prefers-reduced-motion` and `[data-reduce-motion]`; both are already wired in your token file.

## 4. Icons: set 2b
- `shared/design/bb-icons.json` holds 112 glyphs. `Icon.tsx` is a drop-in replacement for `components/ui/icon.tsx`: same `name / size / className / fillLayer` API, plus `tone` and `hue`.
- **Tones:**
  - `soft` (default) is a 1.5 stroke plus a 16% accent fill on the key shape.
  - `line` is the stroke only, for chevrons, arrows and dense tables.
  - `onfill` is the white glyph, for use on any gradient.
  - `active` uses the accent stroke.
- AI glyphs (varta, sparkles, brain, lightbulb) default to cobalt.
- **Sizes:** 16 (inline and table), 20 (nav), 22–24 (buttons and tabs), 32–40 (empty states). The stroke steps to 1.7 at 18px and below.
- Old v2 names still resolve through the `LEGACY` map. Migrate call sites, then delete the map.

## 5. Components (what changes)
| Component | Change |
|---|---|
| `button.tsx` | Add `cobalt` variant (AI). `outline` → `soft`: surface + e1 + 1px inset border, no 1.5px ink border. `secondary` keeps navy and gains `--bb-shadow-navy`. Primary glow → `--bb-shadow-glow-blaze`. Keep sizes. |
| `card.tsx` / `enhanced-card.tsx` | Radius 26. Add `interactive` hover: `--bb-shadow-card-hover` + `translateY(-2px)` (replace the 10px/6° tilt). Add `variant="stage"` (navy stage + corner glow) and `variant="ai"` (cobalt card + sheen). |
| `stat-card.tsx` | Icon chip becomes a 44px glossy gradient tile (blaze by default, cobalt with `hue="ai"`) with an `onfill` icon. Optional `sparkline?: number[]`, drawn as a 36px area chart. Trend in a success/danger soft pill. `featured` = stage gradient with corner glow. |
| `tabs.tsx` / `segmented.tsx` | Active = surface pill + small shadow on a surface-2 track (not navy). Navy active stays only on the reader mode switch. |
| `chip.tsx` | Selected = blaze gloss + `onfill` icon (filters). Default stays surface-2. |
| `badge.tsx` | Status badges get a 6px dot in `currentColor`. Add `ai` variant (info-soft + sparkles). |
| `input.tsx`, `search-input.tsx` | Fields unchanged. Search pill sits on the surface with e1 and shows ⌘K keycaps (desktop). |
| `dialog.tsx`, `alert-dialog.tsx`, `sheet.tsx`, `drawer.tsx` | Overlay `bg-black/80` → `--bb-scrim` + `backdrop-blur-[4px]`. Radius 28. Close button uses `<Icon name="close">` (drop the lucide `X`). Optional 48px tone tile above the title. |
| `empty-state.tsx` | Replace the dashed box with a halo: radial blaze glow + dashed ring + 52px surface tile holding a `soft` icon. Keep the API. |
| `data-table.tsx` | Card radius 26. Toolbar slot (title, count pill, filter pill). Header strip on `--bb-bg`, 12px caps faint. Optional avatar tile and status-dot badges. Row hover = `--bb-bg`. |
| `skeleton.tsx` | Unchanged (already correct). |
| `book-cover.tsx`, `book-list-card.tsx` | Covers are fine. The list card gets format chips (Varta chip in info-soft) and a 6px blaze progress bar. Hover = card-hover. |
| `mini-player.tsx`, `bottom-tab-bar.tsx`, `sidebar-nav.tsx`, `page-header.tsx`, app shell | See `reference/Dashboard Shell.html` and the prompt. |
| Toasts (sonner or the existing toaster) | Dark glass (`--bb-glass-dark`), 32px tone tile, blaze action text. |
| Varta (`components/varta/*`, `components/reader/VartaSidebar.tsx`) | Cobalt identity: the orb (`--bb-varta-orb`), user bubble on the navy stage, assistant bubble on info-soft, citation chips in cobalt gloss with spring pop, "Strict · from this book" mode pill. |
| `ReaderTopBar.tsx` | "Ask Varta" pill: blaze → cobalt gloss (AI rule). |
| Auth (`auth-backdrop.tsx`, `auth-card.tsx`) | Backdrop = stage gradient + blaze/cobalt corner glow (same as the landing hero). Card unchanged apart from the `--bb-shadow-stage` option. |
| Charts (`chart.tsx`) | Series: cobalt 600, cobalt 300, navy 700; highlight = blaze. Bars get a 1px inset top highlight and rounded tops (9px). |

## 6. Rules
1. Blaze means action and cobalt means AI. Don't mix them.
2. Gloss only when pressable or selected. Cards stay flat (`e1`).
3. One featured card (stage or AI) per row.
4. Icons are 2b `soft` by default, `onfill` on gradients and `line` for pure strokes.
5. Anything without live data is labelled "Sample data".
6. Every animation needs a reduced-motion path.
