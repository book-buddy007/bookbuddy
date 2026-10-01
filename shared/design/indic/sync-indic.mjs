/**
 * Syncs the canonical Indic design system into the sibling repos.
 *
 *   node shared/design/indic/sync-indic.mjs           # copy + stamp
 *   node shared/design/indic/sync-indic.mjs --check    # verify, exit 1 on drift
 *
 * ── Why vendoring rather than a shared package ────────────────────────────
 * A workspace package would break BOTH sibling production builds:
 *   • Vidyaverse's frontend/Dockerfile copies only `packages/shared-validation`
 *     and `frontend` — a new `packages/*` is never copied, and pnpm-workspace
 *     globs `packages/*` so the install fails too.
 *   • DigiClassroom's apps/web/Dockerfile enumerates each workspace
 *     package.json before `npm ci` — a new one breaks the install.
 * There is also no private registry, and a git push here is an immediate
 * production deploy. Copying files into paths the Dockerfiles already carry
 * requires zero Dockerfile edits and keeps each repo independently buildable.
 *
 * The cost of vendoring is drift, so every copied file carries a sha256 of its
 * canonical content and `--check` fails when they diverge. Run --check before
 * pushing any of the three repos.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CHECK = process.argv.includes('--check');

/** Files copied verbatim to every target. The per-app accent file is chosen
 *  separately, because that is the one file that legitimately differs. */
const SHARED = [
  'indic.tokens.mjs',
  'indic-tokens.css',
  'indic-design-system.css',
  'indic-fonts.css',
];

/** Motif components. Contract: no hooks, no framer-motion, no next/*, no
 *  'use client' — Vidyaverse is React 18 while Book Buddy and DCP are React 19, and
 *  these must render identically in a Vite SPA and two Next apps. */
const MOTIFS = [
  { from: '../../../components/auth/lotus-mandala.tsx', to: 'motifs/lotus-mandala.tsx' },
  { from: '../../../components/auth/mandala-mark.tsx', to: 'motifs/mandala-mark.tsx' },
  { from: '../../../components/auth/auth-backdrop.tsx', to: 'motifs/auth-backdrop.tsx' },
  { from: '../../../components/auth/auth-backdrop.module.css', to: 'motifs/auth-backdrop.module.css' },
  { from: '../../../components/landing/mandala-svgs.tsx', to: 'motifs/mandala-svgs.tsx' },
  { from: '../../../components/landing/chakra-divider.tsx', to: 'motifs/chakra-divider.tsx' },
];

/**
 * Target repos. Destinations sit INSIDE the paths each Dockerfile already
 * copies — deliberately not `packages/`, which is the trap described above.
 */
const TARGETS = [
  {
    name: 'vidyaverse',
    root: 'J:/Apps/Vidyaverse Pro',
    dest: 'frontend/src/design/indic',
    accent: 'indic-app.vidyaverse.css',
    favicon: { from: 'indic-favicon.vidyaverse.svg', to: 'frontend/public/favicon.svg' },
  },
  {
    name: 'digiclassroom',
    root: 'J:/Apps/DigiClassroomPro',
    dest: 'apps/web/src/design/indic',
    accent: 'indic-app.digiclassroom.css',
    favicon: { from: 'indic-favicon.digiclassroom.svg', to: 'apps/web/public/favicon.svg' },
  },
];

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);

/** Comment syntax differs between .css/.tsx/.mjs — all support /* *​/. */
function stamp(content, canonicalName) {
  return (
    `/* GENERATED — canonical: Book_Buddy_VPD/shared/design/indic/${canonicalName}\n` +
    `   DO NOT EDIT HERE. Edit the canonical file and re-run sync-indic.mjs.\n` +
    `   sha256:${sha(content)} */\n` +
    content
  );
}

/** Strip a previously written stamp so we compare like with like.
 *
 * `\r?\n` is load-bearing, not defensive. We write the stamp with `\n`, but the
 * vendored copies are COMMITTED, and every repo here has core.autocrlf=true — so
 * the moment a copy round-trips through a git checkout on Windows the stamp's
 * closing delimiter comes back followed by CRLF instead of LF. An `\n`-only
 * pattern then fails to strip it, the comparison includes the header, and
 * --check reports DRIFT on all 12 files at once when nothing has actually
 * changed. A whole-set drift report is the tell for this bug; real drift shows
 * up in one or two files. */
function unstamp(text) {
  return text.replace(/^\/\* GENERATED[\s\S]*?\*\/\r?\n/, '');
}

/** Compare content, not line endings.
 *
 * Same root cause as unstamp's `\r?\n`, one layer up. We write the canonical
 * bytes verbatim, but the vendored copies are committed and checked back out
 * under core.autocrlf=true, so a file that left here as LF returns as CRLF.
 * A raw string equality then flags every file, every time — which is worse
 * than no gate at all, because a permanently red check trains people to
 * ignore it. Normalising ONLY for the comparison keeps --check honest about
 * the thing it exists to catch: somebody hand-editing a vendored copy.
 *
 * Deliberately not normalising on write: the copies should stay byte-identical
 * to canonical when freshly synced. */
function sameContent(a, b) {
  return a.replace(/\r\n/g, '\n') === b.replace(/\r\n/g, '\n');
}

let drift = 0;
let copied = 0;
const missing = [];

for (const target of TARGETS) {
  if (!fs.existsSync(target.root)) {
    missing.push(`${target.name}: repo not found at ${target.root}`);
    continue;
  }
  const destDir = path.join(target.root, target.dest);

  const files = [
    ...SHARED.map((f) => ({ src: path.join(HERE, f), rel: f, canon: f })),
    { src: path.join(HERE, target.accent), rel: 'indic-app.css', canon: target.accent },
    ...MOTIFS.map((m) => ({ src: path.resolve(HERE, m.from), rel: m.to, canon: path.basename(m.from) })),
  ];

  for (const f of files) {
    if (!fs.existsSync(f.src)) {
      missing.push(`${target.name}: missing source ${f.src}`);
      continue;
    }
    const content = fs.readFileSync(f.src, 'utf8');
    const outPath = path.join(destDir, f.rel);

    if (CHECK) {
      if (!fs.existsSync(outPath)) {
        console.log(`  MISSING  ${target.name}/${f.rel}`);
        drift++;
        continue;
      }
      const have = unstamp(fs.readFileSync(outPath, 'utf8'));
      if (!sameContent(have, content)) {
        console.log(`  DRIFT    ${target.name}/${f.rel}`);
        drift++;
      }
    } else {
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, stamp(content, f.canon));
      copied++;
    }
  }
}

/* Favicons live in each app's public/ rather than the vendored design folder,
   and ship unstamped: an SVG served as a favicon must be valid on its own and
   some parsers choke on a leading comment before the root element. */
for (const target of TARGETS) {
  if (!target.favicon || !fs.existsSync(target.root)) continue;
  const src = path.join(HERE, target.favicon.from);
  const out = path.join(target.root, target.favicon.to);
  if (!fs.existsSync(src)) {
    missing.push(`${target.name}: missing favicon source (run build-indic-css.mjs first)`);
    continue;
  }
  const content = fs.readFileSync(src, 'utf8');
  if (CHECK) {
    if (!fs.existsSync(out) || !sameContent(fs.readFileSync(out, 'utf8'), content)) {
      console.log(`  DRIFT    ${target.name}/${target.favicon.to}`);
      drift++;
    }
  } else {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, content);
    copied++;
  }
}

for (const m of missing) console.log(`  WARN     ${m}`);

if (CHECK) {
  console.log(drift ? `\nDRIFT DETECTED in ${drift} file(s).` : '\nIn sync — no drift.');
  process.exit(drift ? 1 : 0);
}
console.log(`\nSynced ${copied} files to ${TARGETS.filter((t) => fs.existsSync(t.root)).length} repo(s).`);
