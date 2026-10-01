/**
 * Token contract test.
 *
 *   node shared/design/indic/check-tokens.mjs
 *
 * Asserts that every `var(--x)` referenced by the Indic CSS layer is actually
 * defined by it. This matters more than it looks: CSS fails SILENTLY. A typo'd
 * custom property makes the browser drop the whole declaration — no error, no
 * build failure, just a subtly wrong colour that can survive review for weeks.
 * During a mass de-hexing that is exactly the failure mode to guard against.
 *
 * Exits non-zero on any undefined reference or any self-referential definition
 * (`--x: var(--x)`), which is what a naive find-and-replace produces.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** Vars supplied by the host app rather than this layer. */
const EXTERNAL = new Set([
  'font-display', 'font-body', 'font-deva', // indic-fonts.css or next/font
  'radius',                                  // may be overridden by the app shell
]);

const APP_FILES = fs.readdirSync(HERE).filter((f) => /^indic-app\..*\.css$/.test(f));
const SHARED = ['indic-tokens.css', 'indic-design-system.css'];

let failed = 0;

for (const appFile of APP_FILES) {
  const files = [...SHARED.slice(0, 1), appFile, ...SHARED.slice(1)];
  const defined = new Set(EXTERNAL);
  const used = [];
  const selfRefs = [];

  for (const f of files) {
    const css = fs.readFileSync(path.join(HERE, f), 'utf8');

    // definitions:  --name: value;
    for (const m of css.matchAll(/^\s*(--[\w-]+)\s*:\s*([^;]+);/gm)) {
      const name = m[1].slice(2);
      if (m[2].includes(`var(--${name})`)) selfRefs.push({ f, name });
      defined.add(name);
    }
    // references:  var(--name)
    for (const m of css.matchAll(/var\(\s*(--[\w-]+)/g)) {
      used.push({ f, name: m[1].slice(2) });
    }
  }

  const missing = used.filter((u) => !defined.has(u.name));
  const app = appFile.replace(/^indic-app\.|\.css$/g, '');

  if (missing.length === 0 && selfRefs.length === 0) {
    console.log(`  PASS  ${app.padEnd(14)} ${defined.size - EXTERNAL.size} defined, ${used.length} references resolved`);
  } else {
    failed++;
    console.log(`  FAIL  ${app}`);
    const uniqMissing = [...new Set(missing.map((m) => `${m.name}  (in ${m.f})`))];
    uniqMissing.forEach((m) => console.log(`          undefined: --${m}`));
    selfRefs.forEach((s) => console.log(`          self-referential: --${s.name} in ${s.f}`));
  }
}

console.log('');
if (failed) {
  console.error(`Token contract FAILED for ${failed} app(s).`);
  process.exit(1);
}
console.log('Token contract OK for all apps.');
