/**
 * Generates `indic-tokens.css` and the three per-app `indic-app.<key>.css`
 * files from `indic.tokens.mjs` — the single source of truth.
 *
 *   node shared/design/indic/build-indic-css.mjs
 *
 * Fails loudly if any app's accent ramp misses WCAG AA, so a bad palette can
 * never reach review. Emits every colour in three forms (hex / RGB triplet /
 * HSL triplet) because the CSS layer needs all three — see indic.tokens.mjs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  pigments,
  surfaces,
  apps,
  shape,
  rgbTriplet,
  hslTriplet,
  assertContrast,
} from './indic.tokens.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const kebab = (s) => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());

const HEADER = `/* ============================================================
   GENERATED FILE — DO NOT EDIT.
   Source:     shared/design/indic/indic.tokens.mjs
   Regenerate: node shared/design/indic/build-indic-css.mjs
   ============================================================ */\n\n`;

function emitTokens() {
  const line = (name, hex) =>
    `  --${name}: ${hex};\n` +
    `  --${name}-rgb: ${rgbTriplet(hex)};\n` +
    `  --${name}-hsl: ${hslTriplet(hex)};\n`;

  let css = HEADER + ':root {\n  /* ── pigments ─────────────────────────────── */\n';
  for (const [k, hex] of Object.entries(pigments)) css += line(kebab(k), hex);
  css += '\n  /* ── surfaces & inks ──────────────────────── */\n';
  for (const [k, hex] of Object.entries(surfaces)) css += line(kebab(k), hex);
  css += `\n  /* ── shape ────────────────────────────────── */\n  --radius: ${shape.radius};\n`;
  return css + '}\n';
}

/** hex -> canonical token name, so accents can reference pigments not literals. */
const BY_HEX = Object.fromEntries(
  [...Object.entries(pigments), ...Object.entries(surfaces)].map(([k, hex]) => [
    hex.toUpperCase(),
    kebab(k),
  ])
);

function emitApp(key) {
  const a = apps[key];

  /**
   * When an accent IS one of the pigments, emit `var(--pigment)` rather than the
   * literal hex. That keeps the existing re-theming convention working: a scope
   * that shadows `--saffron` (e.g. `.homepageWrapper`'s light theme in
   * app/home.module.css) then re-themes the accent — and everything painted with
   * it, including the masked mandala watermarks — automatically. Emitting a
   * literal here would leave those motifs stranded at the base pigment while the
   * rest of the scope shifted.
   */
  const trio = (name, hex) => {
    const token = BY_HEX[hex.toUpperCase()];
    const v = token ? `var(--${token})` : hex;
    const rgb = token ? `var(--${token}-rgb)` : rgbTriplet(hex);
    const hsl = token ? `var(--${token}-hsl)` : hslTriplet(hex);
    return `  --${name}: ${v};\n  --${name}-rgb: ${rgb};\n  --${name}-hsl: ${hsl};\n`;
  };

  return (
    HEADER +
    `/* Accent layer for ${a.label} — the only file that differs per app.\n` +
    `   --accent-strong is the ONLY token permitted under white text. */\n\n` +
    ':root {\n' +
    trio('accent-primary', a.primary) +
    '\n' +
    trio('accent-strong', a.strong) +
    '\n' +
    trio('accent-soft', a.soft) +
    '\n' +
    trio('accent-contrast', a.contrast) +
    '\n' +
    '  /* used only inside .dark — the base accent goes muddy on night-ink */\n' +
    trio('accent-primary-dark', a.primaryDark) +
    '}\n'
  );
}

/**
 * Favicon: the same mandala as the in-app brand mark, but with colours BAKED IN.
 * A favicon is rendered outside the page, so it cannot see any CSS custom
 * property — every colour has to be a literal, which is why this is generated
 * per app from the tokens rather than shared as one file.
 * Kept deliberately simple: at 16px, fine petal detail turns to mud.
 */
function emitFavicon(key) {
  const a = apps[key];
  const petals = Array.from({ length: 12 }, (_, i) => (i * 360) / 12)
    .map(
      (deg) =>
        `<path d="M32,30 C26,22 26,12 32,5 C38,12 38,22 32,30 Z" fill="#fff" fill-opacity=".38" transform="rotate(${deg} 32 32)"/>`
    )
    .join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<defs><radialGradient id="g" cx="50%" cy="50%" r="50%">` +
    `<stop offset="0%" stop-color="${pigments.gold}"/>` +
    `<stop offset="70%" stop-color="${a.primary}"/>` +
    `<stop offset="100%" stop-color="${a.strong}"/>` +
    `</radialGradient></defs>` +
    `<circle cx="32" cy="32" r="31" fill="url(#g)"/>` +
    petals +
    `<circle cx="32" cy="32" r="7.5" fill="#fff" fill-opacity=".92"/>` +
    `<circle cx="32" cy="32" r="3.4" fill="${a.strong}"/>` +
    `</svg>\n`
  );
}

// Contrast gate first — never emit a palette that fails AA.
const results = assertContrast();

fs.writeFileSync(path.join(HERE, 'indic-tokens.css'), emitTokens());
for (const key of Object.keys(apps)) {
  fs.writeFileSync(path.join(HERE, `indic-app.${key}.css`), emitApp(key));
  fs.writeFileSync(path.join(HERE, `indic-favicon.${key}.svg`), emitFavicon(key));
}

console.log(`Generated indic-tokens.css + ${Object.keys(apps).length} app accent files\n`);
console.log('Contrast gate (WCAG AA = 4.5:1):');
for (const r of results) {
  console.log(
    `  ${r.ratio >= 4.5 ? 'PASS' : 'FAIL'}  ${r.app.padEnd(14)} ${r.check.padEnd(18)} ${r.ratio}:1`
  );
}
