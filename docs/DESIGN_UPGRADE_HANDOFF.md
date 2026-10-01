# Book Buddy design upgrade: handoff (end of session 1)

Spec: `C:\Users\thevi\Downloads\design_handoff_book_buddy_design_system.zip` (README.md, CLAUDE_CODE_PROMPT.md, tokens.css, tailwind.tokens.js, icons.ts, three .dc.html prototypes).
Repo: `H:\Apps2\Book_Buddy_1.0` (git, branch main, **local commits only, nothing pushed**). Commits carry no Claude attribution (see CLAUDE.md).
User preferences: no screenshot-driven workflow, work as a code editor, be token-efficient. Verify via `npx tsc --noEmit`, computed-style/DOM checks in the browser pane, and `next build`.

## Status vs the 14-step plan
| # | Step | State |
|---|------|-------|
| 1 | Foundation | Done. `styles/bb-tokens.css` (imported in `app/layout.tsx` AFTER globals.css, otherwise legacy :root wins), next/font, next-themes (`class` + `data-theme`, key `bb-theme`), Tailwind merge, `components/ui/icon.tsx` + `lib/bb-icons.ts` (113 duotone glyphs), `components/ui/icons.tsx` lucide-compat |
| 2 | Primitives | Done. Shadcn components restyled in place; new: Segmented, Chip, StatusBadge, SearchInput, BookCover, BookListCard, DataTable, SidebarNav, BottomTabBar, Modal, PageHeader, FormField, VartaOrb/Message/CitationChip, MiniPlayer, BrandMark, ThemeToggle. Style guide at `/design-system` (dev-only public) |
| 3 | App shells | Done. `components/shell/*`, `lib/nav.ts`; used by dashboard/catalog/settings/institutions layouts. Preview: `/design-system/shell?role=student|teacher|librarian|admin|super-admin` |
| 4 | PWA | Done. `app/manifest.ts`, `/pwa-icon/[size]`, `public/sw.js`, install card, splash, `/offline`. Lighthouse not run |
| 5 | Reading surfaces | Varta chat page done (`components/varta/*`, `/varta`), audiobook player re-skinned (`app/player/v2`), reader chrome done (top bar, Display panel, EPUB theming, selection popover). Reader gaps: no permanent contents rail, bottom bar only recoloured, PDF can't take Paper/Sepia/Night |
| 6 | Landing | Done (3D hero in `components/landing/hero-3d.tsx`, lime accents replaced) |
| 7-13 | Public/auth, student, teacher, librarian, admin, super-admin, settings | PARTIAL. Recoloured via palette shim + codemods and use new Button/Card/Tabs/Badge; auth frame rebuilt. NOT rebuilt on StatCard/DataTable/StatusBadge/PageHeader/BookCover. Settings already has Light/Dark/System |
| 14 | `mobile/` Expo app | Not started (mobile still imports `shared/design/tokens.ts`, `content.ts`) |

## Legacy-compat layers (shrink as pages are rebuilt)
- Tailwind default palettes remapped in `tailwind.config.ts` (`BB_PALETTE`: slate/indigo/amber/teal/red... map to navy/cobalt/blaze scales).
- Legacy Indic/VG variables aliased in `styles/bb-tokens.css` ("Legacy palette shim", "VG utility aliases").
- `EnhancedButton`, `EnhancedCard`, `LoadingButton` are thin wrappers over the new Button/Card.
- Deleted: all legacy CSS sheets, `shared/design/indic/`, mandala/chakra components, `reader.module.css`, home navbar.

## Decisions / things to know
- `/varta` was an activity dashboard; it is now the chat, dashboard moved to `?view=activity`.
- `next.config.mjs` Permissions-Policy now `microphone=(self)` (Varta dictation).
- White text on blaze button is ~3.5:1, below the 4.5:1 target; spec was followed.
- Footer newsletter form was already inert and still is.
- Hover variants are `hoverOnlyWhenSupported`. Named durations: `duration-bb-micro` / `duration-bb-ui` (arbitrary `duration-[..ms]` is ambiguous with tailwindcss-animate).
- Codemods used (scratchpad, not in repo): lucide import rewrite, hex→token, gradient-text→accent, `!` override removal, tabs override cleanup. Heredocs with quotes break in the bash tool; write scripts with the file tool.
- Bash tool: avoid recursive grep on `node_modules`/`mobile`; use the Grep tool.
- Browser pane is hidden, so rAF/CSS transitions don't advance there (animations can't be verified live); a fake session via fetch patching did not work, use the `/design-system/*` preview pages instead.

## Verification so far
`next build` exit 0 (all routes built). `tsc`: only pre-existing errors (role casing in admin user forms, nullable `book` in catalog/[id], PdfShell/AnnotationCanvas, lib/auth, forgot-password variant `vg-outline`, onboarding/profile nullables, super-admin institution). ESLint, unit tests, Lighthouse not run. Nothing behind login viewed in a browser.

## Suggested next steps
1. Rebuild role pages on primitives, one role per commit: student (home, library, personal-library, reading-list, goals, recommendations, borrow, requests, review, profile), teacher, librarian, admin (DataTable + StatusBadge), super-admin (branding pages should preview the new system). Use PageHeader + StatCard row + cards radius 22 + empty/loading/error states.
2. Catalog detail `app/catalog/[id]`, subscription compare, legal pages (light content pages), onboarding stepper, institutions browse/join.
3. Reader: permanent contents rail on xl, restyle `ReaderBottomBar`, tablet floating toolbar; add `?page=` support (Varta "Open in reader" links use it).
4. Player: phone swipe-down to mini player; MiniPlayerDock already reads `useAudioPlayerStore`.
5. Mobile app tokens/icons; remove unused deps (lucide-react, fontsource Indic fonts) when safe; run ESLint, tests, Lighthouse; check dark mode and 1280/834/390 on every route once a login is available.
