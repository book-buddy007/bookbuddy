# Prompt for Claude Code: apply Book Buddy UI v3

Copy the `handoff/` folder into the repo root as `design-handoff/`, then paste everything below the line into Claude Code.

---

You are applying a finished, approved design refresh to the Book Buddy Next.js app (`book-buddy007/bookbuddy`). The design is final. **Match it exactly; don't redesign.** Keep all data fetching, routing, auth, stores, props and breakpoints as they are. This is a visual layer change.

## Read first (in `design-handoff/`)
1. `DESIGN_SYSTEM.md`: the rules and the per-component change list. It is the source of truth.
2. `reference/Design System.html`: every token and primitive, rendered in light and dark.
3. `reference/Landing A.html`: the approved landing page (sections below the hero).
4. `reference/Dashboard Shell.html`: sidebar (collapsible), tablet rail, header, phone tab bar, More sheet, mini player and page header. Use the role, device and theme switches at the top.
5. `reference/Dashboard Cards.html`: student and super-admin dashboard cards.
6. `reference/Icon Set.html`: the approved icon style is **2b**.
7. `source/*.dc.html`: readable source for the references. Inline styles carry the exact hex codes, radii, shadows, durations and easing.
8. `bb-tokens.v3.css`: an additive token patch. `icons/`: `bb-icons.json` and a drop-in `Icon.tsx`.

Open each reference in a browser before changing code, and re-open them to compare as you go.

## Ground rules
- Use the existing stack (Tailwind with `bb-*` tokens, cva, Radix, next-themes) and add no new UI libraries.
- Restyle components in place so every call site picks up the change. Don't fork components.
- Existing token names in `styles/bb-tokens.css` stay. Only append the v3 block.
- Every animation needs a reduced-motion path; `[data-reduce-motion]` and `prefers-reduced-motion` are already wired.
- Don't invent statistics. Wherever there is no live data, show "Sample data".
- Make one commit per numbered task below and run `lint`, `typecheck` and `build` after each. If a task breaks the build, fix it before moving on.

## Tasks

### 1. Tokens
- Append `design-handoff/bb-tokens.v3.css` to `styles/bb-tokens.css` (after the dark block and before the legacy shims).
- Add the Tailwind extensions listed at the bottom of that file to `tailwind.config.ts`.

### 2. Icons
- Copy `icons/bb-icons.json` to `shared/design/bb-icons.json`.
- Replace `components/ui/icon.tsx` with `icons/Icon.tsx`. It keeps `name`, `size`, `className` and `fillLayer`, and still exports `BBIconName`.
- Run the app and fix every `[Icon] unknown name` warning by mapping to the nearest glyph.
- Update `lib/nav.ts` to the v3 names: `read`→`book-open`, `audiobook`→`headphones`, `sanchika`→`flashcards`, `highlight`→`highlighter`, `goals`→`target`, `contents`→`list`, `streak` (Recommendations)→`sparkles`, `class`→`users`, `profile`→`user`, `subscription`→`card`, `branding`→`palette`, `overdue`→`clock`, `admin`→`shield`, `pdf`→`file`.
- Leave `components/ui/icons.tsx` (the lucide compat layer) for now.
- Call-site conventions:
  - Use `tone="onfill"` on any gradient or glossy surface.
  - Use `tone="line"` for chevrons, arrows and close buttons.
  - Leave the default `soft` everywhere else.

### 3. Brand mark
- Update `components/ui/brand-mark.tsx`: a cobalt circle `linear-gradient(160deg,#4C6FFF,#1E3A8A 60%)` overlapped by a blaze circle (`--bb-grad-primary`, opacity .95, soft blaze glow).
- The circles overlap by 46% of their diameter. Keep `BrandMark` and `BrandLockup` exports and props.

### 4. Primitives
Follow the component table in `DESIGN_SYSTEM.md`:
- **button:** new `cobalt` variant; `outline`→soft look; glow shadows.
- **card / enhanced-card:** radius 26; `interactive` hover; new `stage` and `ai` variants.
- **stat-card:** glossy icon tile, optional `sparkline`, trend pill.
- **tabs / segmented:** surface-pill active state, except the reader mode switch.
- **chip / badge:** gloss when selected; status dot; `ai` badge.
- **search-input:** surface pill with ⌘K.
- **dialog, alert-dialog, sheet, drawer:** scrim with blur, radius 28, `Icon` close.
- **empty-state:** halo.
- **data-table:** toolbar slot, header strip, status dots.
- **book-list-card:** format chips and progress bar.
- **toaster:** dark glass.
- **chart.tsx:** series colours.

Add the new variants without breaking the existing variant names. Legacy names must still compile and render sensibly.

### 5. App shell
Match `reference/Dashboard Shell.html`. Files:
- `components/shell/app-shell.tsx`
- `components/ui/sidebar-nav.tsx`
- `components/ui/bottom-tab-bar.tsx`
- `components/ui/mini-player.tsx`
- `components/shell/notification-bell.tsx`
- `components/shell/user-menu.tsx`
- `components/ui/page-header.tsx`

What to build:
- **Sidebar (lg+, 272px):**
  - Frosted surface (`--bb-glass-surface` plus `--bb-glass-filter`).
  - 44px rows with a 14px radius. Idle rows use a `soft` icon in `--bb-text-muted`.
  - The active row is a blaze gloss pill with white text and an `onfill` icon. **Varta and Sanchika use cobalt gloss when active.**
  - Headings are 11px uppercase in faint text.
  - "Switch dashboard" items carry an `arrow-up-right`.
  - A user card is pinned at the bottom: avatar with the `--bb-grad-ring` ring, name, role in blaze-ink, settings button.
- **Collapsible:**
  - A `panel-left-close` button in the logo row collapses to the 80px rail, and the rail shows `panel-left` to expand.
  - The `[` key toggles it unless focus is in a field.
  - Persist the state in `localStorage` under `bb-shell-collapsed`.
  - Animate the main column padding (272↔80) over 240ms with `--bb-ease`.
  - Collapsed items keep `title` tooltips. Tablet (md) always shows the rail.
- **Rail:** 50px squircle items; the active one is glossy at scale 1.04.
- **Header:**
  - Frosted.
  - Search is a surface pill with ⌘K keycaps (hidden on phones).
  - The bell's unread state is a 9px blaze dot with a glow; keep the count in its `aria-label`.
  - The avatar gets the gradient ring.
- **Phone:**
  - The tab bar becomes a floating frosted pill (inset 12px, radius 26).
  - The active tab rises 14px into a 50px gloss circle (cobalt for AI items) using `--bb-spring`.
  - The More sheet becomes a 3-column grid of icon tiles, followed by Settings and Sign out.
- **Mini player:** `--bb-glass-dark` card, cobalt gloss play button, and a small waveform that animates only while playing. Keep the existing props and handlers.
- **Page header:** pill eyebrow with a glowing blaze dot, h1 40/30, soft blaze-to-cobalt radial glow behind it, same props.
- Delete `components/dashboard-hero.tsx` after confirming nothing imports it.

### 6. Dashboards
Match `reference/Dashboard Cards.html` using real data from the existing hooks and endpoints:
- **Student (`app/dashboard/student/page.tsx`):** continue-reading stage card (spans 2), goal ring, streak week, Ask Varta AI card with typing placeholder (spans 2), Sanchika stack, now-listening, assigned reading, weekly bars, latest highlight.
  - Map the existing data: borrowed books and progress, `overviewStats`, `vartaActivity`, due dates.
  - Keep the waiting-room states and trial banners.
- **Super admin (`app/dashboard/super-admin/page.tsx`):** KPI StatCards with sparklines, institutions list with initial tiles and status badges, platform-health card, audit logs. Use `useOverviewStats` and the existing components.
- Put the reusable cards in `components/dashboard/cards/*`.
- Grid: `repeat(auto-fill,minmax(290px,1fr))` with `grid-auto-flow:dense`.
- Cards enter with a fade-up (18px, 800ms, staggered 60ms).
- Apply the same StatCard and card variants to the admin, librarian and teacher home pages. Their layouts can stay; only the primitives change.

### 7. Landing
- Keep the 3D hero exactly as it is and only re-tint it.
- Rebuild everything below it to match `reference/Landing A.html`, in this order:
  1. "A day with Book Buddy": scroll-driven timeline with six stops, sky interpolation, sticky clock and sun disc (≥960px), glowing spine and per-stop micro-animations.
  2. Teacher/admin control-room card.
  3. Security rings.
  4. Count-up stats.
  5. Testimonials and FAQ.
  6. CTA and footer.
- One component per section in `components/landing/`; replace the sections they supersede.
- Use one passive scroll listener with rAF, or IntersectionObserver.
- Below 768px the nav collapses to a menu button and a panel, and nothing scrolls sideways at 360px.

### 8. Feature surfaces
- **Varta** (`components/varta/*`, `components/reader/VartaSidebar.tsx`, `app/varta/page.tsx`):
  - Orb avatar.
  - User bubble on `--bb-grad-navy`; assistant bubble on info-soft.
  - Citation chips in cobalt gloss with spring pop.
  - "Strict · from this book" pill.
  - Composer pill with a cobalt send button.
- **Reader:** in `ReaderTopBar.tsx`, the "Ask Varta" pill becomes cobalt gloss. The sidebars (`SanchikaSidebar`, `QuizSidebar`, `GraphSidebar`, `StudyDrawer`) adopt card radius 22, the new tabs and empty states. Keep the reader themes (`--rd-*`) untouched.
- **Auth** (`auth-backdrop.tsx`, `/login`, `/register`, `/forgot-password`, `/onboarding`): stage gradient backdrop with blaze/cobalt corner glow and the new brand mark. The forms are unchanged.
- **Catalog** (`app/catalog`, `[id]`): book cards use the new book-list-card, filter chips use the selected gloss, and detail pages use the stage hero card for the cover and actions.

### 9. Accessibility
- Body text contrast is at least 4.5:1, including on frosted surfaces; check both themes.
- Focus is a 2px blaze outline with a 2px offset on links, tabs and icon buttons, and the existing focus ring elsewhere.
- Icon-only buttons have an `aria-label`, and decorative icons are `aria-hidden` (the `Icon` component does this when there is no `title`).
- Hit targets are at least 44px on touch.

## Finish with
- A summary of changed files, grouped by task.
- Any icon names you remapped beyond the list above.
- Anything you couldn't match exactly, and why.
- Screenshots at 1440px and 390px, light and dark, of: the landing page, the student dashboard, the super-admin dashboard (sidebar expanded and collapsed), Varta, the reader top bar, login, and a dialog.
