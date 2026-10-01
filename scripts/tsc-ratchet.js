#!/usr/bin/env node
/**
 * Type-error ratchet for the Next.js app.
 *
 * `next.config.mjs` sets `typescript.ignoreBuildErrors`, so `next build` exits 0
 * no matter how many type errors exist. Removing that flag outright is not
 * possible today — there is a backlog — and a cleanup branch big enough to clear
 * it in one go would never land.
 *
 * So this ratchets instead: it runs `tsc --noEmit`, counts the errors, and fails
 * only if the count went UP against the committed baseline. Fixing errors lowers
 * the baseline; introducing them fails CI. The number can only go down.
 *
 *   node scripts/tsc-ratchet.js            # check against the baseline
 *   node scripts/tsc-ratchet.js --update   # write the current count as baseline
 *
 * The backend is deliberately NOT ratcheted — it sits at zero and is gated at
 * zero directly in CI.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASELINE_FILE = path.join(__dirname, 'tsc-baseline.json');

function countErrors() {
  let output = '';
  try {
    output = execSync('npx tsc --noEmit', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch (err) {
    // tsc exits non-zero when there are errors; the report is still on stdout.
    output = `${err.stdout || ''}${err.stderr || ''}`;
  }
  const lines = output.split('\n').filter((l) => /error TS\d+/.test(l));
  return { count: lines.length, lines };
}

function readBaseline() {
  if (!fs.existsSync(BASELINE_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
  } catch {
    return null;
  }
}

const { count, lines } = countErrors();
const update = process.argv.includes('--update');

if (update) {
  fs.writeFileSync(
    BASELINE_FILE,
    `${JSON.stringify({ maxErrors: count, updated: new Date().toISOString().slice(0, 10) }, null, 2)}\n`,
    'utf8',
  );
  console.log(`tsc-ratchet: baseline set to ${count}`);
  process.exit(0);
}

const baseline = readBaseline();
if (!baseline) {
  console.error(
    'tsc-ratchet: no baseline found. Run `node scripts/tsc-ratchet.js --update` and commit scripts/tsc-baseline.json.',
  );
  process.exit(1);
}

if (count > baseline.maxErrors) {
  console.error(
    `tsc-ratchet: FAIL — ${count} type errors, baseline is ${baseline.maxErrors} (+${count - baseline.maxErrors}).`,
  );
  console.error('\nNew or changed errors (full list):');
  lines.slice(0, 60).forEach((l) => console.error(`  ${l}`));
  if (lines.length > 60) console.error(`  …and ${lines.length - 60} more`);
  console.error(
    '\nFix the errors you introduced, or if you deliberately raised the count, run with --update and explain why in the commit.',
  );
  process.exit(1);
}

if (count < baseline.maxErrors) {
  console.log(
    `tsc-ratchet: ${count} errors, baseline ${baseline.maxErrors} — ${baseline.maxErrors - count} fixed. ` +
      'Run `node scripts/tsc-ratchet.js --update` to lock the improvement in.',
  );
  process.exit(0);
}

console.log(`tsc-ratchet: OK — ${count} errors, at baseline.`);
