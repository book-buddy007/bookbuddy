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


---

# Session 2 addendum: all five role dashboards rebuilt

Supersedes the "Status vs the 14-step plan" rows 7-13 above. Commits are local only (nothing pushed); none carry Claude attribution (repo CLAUDE.md). Same working rules as session 1: code-editor workflow, no screenshot loop, verify with `npx tsc --noEmit` (filter to touched files) and `next build`. **Nothing behind login has been viewed in a browser.** `next build` exited 0 after the super-admin work (all role routes compile).

## What was done (commit order)
| Role | Commits | Notes |
|------|---------|-------|
| Student (10 pages) | 6d0d778, ce726fb, 2feb2ec | Home, library, borrow, review, recommendations, goals, reading-list, requests, profile, personal-library |
| Admin (8 routes) | 23193d6 | Fixed a render crash on `/dashboard/admin/borrowing` (policy defaults added in `hooks/use-admin-state.tsx`). Deleted dead legacy `components/admin/*` and the fake "System health" panel |
| Librarian (7 routes) | 237e031 | New `components/librarian/analytics-charts.tsx` |
| Teacher (4 routes) | 84a790b | |
| Super-admin | 6e781a9, abd7f1b, 0fc7c53 | See depth table below |

## Super-admin depth (important)
- **Rebuilt** on PageHeader/StatCard/DataTable/StatusBadge: overview, branding hub, logo, users, institutions, subscriptions, media (storage analytics + 5 storage cards), audit (now on the real `getAuditLogs` API with real CSV/JSON export), plus `stats`, `institutions-list`, `audit-logs` widgets.
- **Chrome only:** branding/homepage editor (form body and field editors untouched) and the catalog page (hero/stats/tabs/badges replaced; table and card bodies unchanged).
- **Codemod pass only (not rebuilt):** AddBookWizard, AddFormatDialog, EditBookDialog, BookDetailDrawer, delete/purge/embedding dialogs, audiobook builder, user/institution sheets, SubscriptionForm. Gradients removed, `--deep-saffron/--peacock-teal/--night-ink` mapped to bb tokens; the old slate/indigo/red classes still render correctly only through the Tailwind palette shim.
- Codemod scripts live in the session scratchpad, not the repo. Heredocs with quotes break in the bash tool: write scripts with the file tool.

## Data honesty rules adopted (keep following)
Many pages have no backend yet. Rather than fake it:
- Mock/in-memory pages carry a **"Sample data"** chip (admin home/users/analytics/reports/overdue, librarian home/circulation/inventory/analytics, all 4 teacher pages) or "Not available yet" (bulk upload, label printing, borrowing policies "not saved to server").
- Buttons with no backend show a **"coming soon" toast** instead of console.log/alert or a fake success.
- Removed fabricated numbers (fake CPU/uptime, "+456 from last month", hardcoded 4.6 rating, random trending rank, fake AI recommendations).
- Working in-memory only (lost on refresh): admin users delete/activate, circulation renew/return/approve, inventory status, teacher resource linker and reservation cancel.
- Real API-backed: student pages, admin join-requests and catalog, librarian cataloging (POST /api/v1/books), all super-admin pages.

## Known pre-existing issues / stubs not fixed
- Student: borrow requests are hardcoded 2023 sample rows; Recommendations category/format selects and "Explore" do nothing (catalog ignores `?q=`); library "Return" uses `alert()`, "Renew" inert; reading-list has no remove endpoint (bulk/remove UI was removed); goals "Create goal" only logs; achievements are hardcoded demo data; personal-library "Recent" tab loads the same list as All files.
- `/varta` chat cannot scope to a personal file, so personal-library "Ask Varta" opens `/reader?personalFileId=..&tab=varta` instead.
- Remaining tsc errors outside the role dashboards: `app/catalog/[id]/page.tsx` (nullable `book`) and `.next/types/.../catalog/builder/[bookId]/page.ts` (PageProps). Super-admin and student `profile` errors from session 1 are now fixed.

## Next steps
1. Rerun `npx next build` (stop `next dev` first) after any further changes; the last run exited 0.
2. Dead `animate-vg-*` / `hover-vg-*` / transparenttextures classes remain in: `app/catalog/*`, `app/login`, `register`, `forgot-password`, `reset-password`, `onboarding`, `settings`, `institutions/join-request`, `reader/ReaderLanding`, `components/TrialExpirationBanner.tsx`, `components/ui/stat-pill.tsx` (StatPill is now unused by role pages; delete once those are clean). Mechanical cleanup.
3. Public/auth pages (plan steps 7-8), catalog detail `app/catalog/[id]` (also fix its nullable `book` errors), subscription compare, legal pages, onboarding stepper, institutions browse/join: not rebuilt.
4. Real rebuild (not codemod) of super-admin catalog dialogs/wizard/builder and homepage-editor field editors if desired.
5. Reader gaps from session 1 (contents rail, bottom bar, `?page=` support, PDF themes), player swipe-down mini player.
6. Mobile app tokens/icons (`mobile/` still imports `shared/design/tokens.ts`); remove unused deps (lucide-react, fontsource Indic fonts) when safe.
7. ESLint, unit tests, Lighthouse; dark mode and 1280/834/390 checks on every route once a login exists.
8. Consider building real backends for the sample-data pages (admin users/analytics/reports/overdue, librarian circulation/inventory/analytics, teacher assignments/resources, student borrow requests), then drop the Sample data chips.


---

# Session 3 addendum: public, auth and catalogue pages

Handoff items 1 and 2 from session 2 are done. Same rules as before (local commits only, no Claude attribution, verify with filtered `npx tsc --noEmit` + `next build`). `next build` exited 0 after this session (96 pages). Remaining tsc errors are all outside the redesigned pages: `components/reader/PdfShell.tsx`, `components/reader/pdf/AnnotationCanvas.tsx`, `lib/auth.ts`, `scripts/setup-r2-cors.ts`, and the `.next/types` PageProps one for the catalog builder.

## Commits (in order)
| Commit | What |
|--------|------|
| 0e84ba9 | `animate-vg-*` classes replaced with tailwindcss-animate (`animate-in fade-in-0 …`); `vg-*` keyframes removed from tailwind config; `StatPill` deleted (InstitutionDetailSheet now uses StatCard) |
| d1fa2c9 | Auth: new `components/auth/auth-card.tsx` (AuthCard, AuthCardSkeleton, AuthDivider, PasswordInput, AuthButton, GoogleMark). login, register, forgot/reset password, verify-email, logout, delete-account rebuilt. `Alert` gained `success`/`warning`/`info` variants (destructive is now the soft danger tint, app-wide). `/delete-account` added to middleware public routes |
| b7d6907 | Legal shell (`components/legal/legal-page.tsx`): slim header with policy switcher, navy footer, `DraftNotice`, token `Fill` |
| 82f0976 | **Token fix:** `bb` colours defined as bare `var(--x)` emitted NO CSS for opacity modifiers (`bg-bb-surface/80`, `ring-bb-accent/30`, `border-bb-accent/40` … ~50 uses, incl. focus rings). They now go through `a()` in `tailwind.config.ts` → `color-mix(in srgb, var(--x) calc(<alpha-value> * 100%), transparent)`. Compare-plans page rebuilt |
| ae7cfe3 | Onboarding in the auth frame (`AuthBackdrop` gained `wide` + `actions`), 2-step stepper |
| 1b9d232 | Catalog detail `app/catalog/[id]` rebuilt; nullable-`book` tsc errors gone |
| f92a68b | Institutions browse + join-request rebuilt |
| 35926b9 | Catalog list rebuilt; shared filter definitions in `lib/catalog-filters.ts`; `FilterBottomSheet` now sits on `Modal` |

## Bugs found and fixed on the way
- Onboarding institution search read `data.data` but `/api/institutions/browse` returns a plain array, so search never showed a result.
- `/delete-account` (the Play Store deletion URL) redirected signed-out users to login, and its form called a backend route that doesn't exist (`/auth/request-account-deletion`) then showed "confirmation link sent" anyway. Now public, and on failure it says so and offers a prefilled email to support@bookbuddyvpd.com. **A real deletion-request endpoint still needs building.**
- Join request "supporting document" never uploaded; it sent `placeholder-url/<file>` as the proof URL. Now shown as "Not available yet" and nothing fake is sent.
- Institutions browse: cards linked to `/institutions/:id` (no such route); type labels/icons used lowercase keys against uppercase enum values.
- Catalog detail: `router.push` during render on 401; a book with no free copies said "Requires X tier"; a book with no formats showed a fake "PDF" badge.
- Catalog list: Featured/New/Trending/Resources tabs and the whole advanced-search panel (title, author, ISBN, publisher, year, pages) did nothing; "Rating" sort sorted by createdAt; multi-select formats sent only the first; "Physical" format isn't a real format. Filters are now only what `GET /books` honours (search, one category, one format, sort by title/author/createdAt/publishYear). The infinite-scroll observer fired on mount and skipped to page 2 before page 1 loaded.
- My own slip, fixed: an interim codemod wrote `text-danger-ink` (not a class); correct name is `text-bb-danger-ink`.

## Verified in the browser (no login needed)
login (incl. validation errors, dark mode, 375px), register, reset-password (missing token), verify-email (no token), delete-account, privacy, compare plans, catalog list (error state; API is 401 without a session). Onboarding, catalog detail, institutions and the populated catalog grid need a session and are tsc/build-verified only.

## Dev server note
A preview config `bookbuddy-web` (port 3010, frontend only) is in `H:\.claude\launch.json`. If the Tailwind config is edited in two quick steps while it runs, webpack can cache a failed `globals.css` compile ("a is not defined"); restart the dev server.

## Still to do
1. Reader gaps (contents rail, `ReaderBottomBar`, `?page=`, PDF themes) and the player's swipe-down mini player.
2. `app/catalog/AudioPlayerDashboard.tsx` and `app/reader/ReaderLanding.tsx` (the ?format=AUDIOBOOK and reader landing demos) still use hex colours and the old look; `app/settings/page.tsx` only had its animation class swapped.
3. Super-admin codemod-only pieces (wizard, dialogs, builder, homepage field editors) if a real rebuild is wanted.
4. Backend: a public account-deletion request endpoint; proof-document upload for join requests; real backends for the sample-data pages.
5. Privacy policy says accounts can be deleted "from your profile"; there is no in-app delete UI (only `DELETE /user/account` in the backend). Either build the UI or fix the wording before publishing.
6. Mobile app tokens, ESLint, tests, Lighthouse; dark mode and 1280/834/390 checks behind login.


---

# Session 4 addendum: reader gaps and the mini player

`next build` exited 0 (96 pages). tsc errors are unchanged and all pre-existing (PdfShell, AnnotationCanvas, lib/auth, scripts/setup-r2-cors). If a build dies instantly with `uncaughtException TypeError ... 'length'` right after stopping `next dev`, just run it again (shutdown race on `.next`).

## Commits
| Commit | What |
|--------|------|
| 796bd2b | Reader gaps |
| fc6a144 | Player minimise + mini player |

## Reader (`app/reader/page.tsx` and components)
- **Contents rail:** the TOC drawer is a permanent 260px rail from `xl` (between top and bottom bars, under both); still a drawer below `xl`. It stays ONE element because PdfShell portals the PDF outline/thumbnails into `#pdf-toc-container` / `#pdf-thumbnails-container`. EPUB chapters show orange number + dot for the current chapter, blue dot for earlier ones. Highlights summary card (counts from `useAnnotationStore`) at the bottom with "Open notes".
- **Bottom bar (`ReaderBottomBar`)**, by breakpoint: phone = progress line + 5 labelled actions; tablet (md–xl) = floating pill (Contents, Display, Notes, Sanchika, Varta, Listen) above a scrubber strip; desktop = page x of y · scrubber · time left · Notes/Sanchika/Listen icons. Colours come from `--rd-*` so it follows Paper/Sepia/Night. Still publishes its measured height to the store.
- **`?page=N`** (Varta "Open in reader") is applied once after `initFromServer` resolves, so the citation beats the saved position. PDF only; EPUBs paginate by location.
- **EPUB pagination:** epub.js `locations.generate(1600)` after load; the bar shows "Location x of y" and the scrubber seeks via `cfiFromLocation`. Before that, EPUB total was 0 ("Page 3 of 0", infinite %).
- **PDF themes:** `styles/bb-tokens.css` filters `.rpv-core__canvas-layer` (Sepia warms, Night inverts + hue-rotates) and sets the page background to `--rd-bg`. PdfShell's hard-coded cream toolbar/popup colours now use `--rd-*`.
- Warmth/contrast filter moved from the reader root (it tinted the toolbars) to the reading area only.
- Removed: the floating "Page View / Scroll View" switch (toggled `viewMode`, which nothing reads) and the words/min stat (it divided the absolute page number by session minutes). Focus-mode exit is now always visible (was hover-only, unreachable on touch).
- ReaderProgressSheet, StudyDrawer, TTSControlBar re-tokenised. Preview: `/design-system/reader` now includes the bottom bar and a mock PDF page.

## Player
- **Bug found:** the only `<audio>` lived inside `AudiobookPlayerV2`, so leaving `/player` stopped playback while the mini player kept showing "playing" and its button only flipped a store flag.
- `lib/audio-engine.ts`: one app-wide `HTMLAudioElement`; `dataset.sectionKey` marks the loaded `${sectionId}:${gender}` so a remounted player doesn't restart the track. The player also skips `loadBook` when that book is already loaded.
- `components/player/audio-session-bridge.tsx` (mounted in `app/layout.tsx`): when not on `/player`, mirrors play/pause/position into the store, advances sections (prefetched URL or a fresh presign), honours sleep-at-section-end and the sleep timer, syncs progress every 30 s, and handles media keys.
- Phone "Now playing": grabber + swipe down from the top half (follows the finger, dismisses past 140px or a flick) or the chevron → `router.back()` (dashboard if no history). Sliders/menus/`[data-no-swipe]` are excluded.
- Mini player drives the shared element; it floats bottom-right from `md` up (`MiniPlayerDock skips`), since playback now continues on wide screens too. Preview: `/design-system/shell?role=student&audio=1`.
- Not verified in a browser (needs a session + audio): the swipe gesture and real playback across navigation. Worth a manual test on a phone.

## Still to do
1. `AudioPlayerDashboard` / `ReaderLanding` demos and the settings page restyle; the player's own CSS module (`playerV2.module.css`) was not touched this session.
2. Super-admin codemod-only dialogs/wizard/builder.
3. Backend gaps from session 3 (deletion endpoint, proof upload, sample-data pages); privacy-policy wording about in-app deletion.
4. Mobile app tokens, ESLint, tests, Lighthouse; logged-in checks of reader/player on phone, tablet and desktop.
