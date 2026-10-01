/**
 * Regression tests for audit finding BB-011.
 *
 * Runs with plain `node` and no test framework:
 *     node lib/entitlements/book-access.test.mjs
 *
 * The repository has no frontend unit-test runner, and adding jest or vitest
 * inside a security patch would mean touching the lockfile. Rather than ship the
 * fix untested, the authorisation rules were extracted into the pure function
 * `decideBookAccess`, which this file exercises directly. Standing up a real
 * runner for the frontend is a follow-up.
 *
 * The rules under test are duplicated from decideBookAccess deliberately — this
 * file must not import the TypeScript module (node cannot execute .ts without a
 * loader), so it re-implements nothing and instead asserts against a compiled
 * copy generated at run time. See loadDecide() below.
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * Load `decideBookAccess` out of the .ts source by stripping the type
 * annotations that node cannot parse. Crude, but it means the test executes the
 * REAL function body rather than a copy that could drift from it — which is the
 * property that matters for a security test.
 */
function loadDecide() {
  // Normalise line endings before parsing. core.autocrlf=true on this repo, so a
  // checkout can hand us CRLF, and the end-of-function scan below is written
  // against LF. That mismatch broke this test silently after a rebase.
  const raw = readFileSync(join(HERE, 'book-access.ts'), 'utf8');
  const src = raw.split(String.fromCharCode(13) + String.fromCharCode(10)).join(String.fromCharCode(10));

  const start = src.indexOf('export function decideBookAccess');
  assert.ok(start > -1, 'decideBookAccess not found in book-access.ts');
  // Find the end of the function: the next top-level `}` followed by a blank line.
  const rest = src.slice(start);
  const end = rest.indexOf('\n}\n');
  assert.ok(end > -1, 'could not locate end of decideBookAccess');
  let body = rest.slice(0, end + 3);

  // Strip the parameter type annotation block and the return type.
  body = body.replace(/export function decideBookAccess\(input:[\s\S]*?\}\): AccessResult \{/, 'function decideBookAccess(input) {');

  const TIER_RANK_SRC = 'const TIER_RANK = { FREE: 0, BRONZE: 1, SILVER: 2, GOLD: 3, DIAMOND: 4 };';
  const SYSTEM_SRC = "const SYSTEM_TENANT = '__SYSTEM__';";

  const factory = new Function(`${TIER_RANK_SRC}\n${SYSTEM_SRC}\n${body}\nreturn decideBookAccess;`);
  return factory();
}

const decideBookAccess = loadDecide();

const BOOK = (over = {}) => ({
  id: 'b1', tenantId: null, accessTier: 'FREE', drmProtected: false, ...over,
});

let passed = 0;
let failed = 0;
function it(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.error(`  ✗ ${name}\n      ${e.message}`); failed++; }
}

console.log('BB-011 — book read authorisation\n');

console.log(' soft-deleted / missing books');
it('a missing (or soft-deleted) book is 404, never 403', () => {
  const r = decideBookAccess({ book: null, hasActiveMembership: false, user: null, enforceTier: false });
  assert.equal(r.ok, false);
  assert.equal(r.status, 404);
  assert.equal(r.reason, 'not-found');
});
it('404 rather than 403 so the response does not leak whether an id exists', () => {
  const r = decideBookAccess({ book: null, hasActiveMembership: true, user: null, enforceTier: false });
  assert.equal(r.status, 404);
});

console.log('\n tenant isolation — the control that actually matters today');
it('global catalogue (__SYSTEM__) is readable without membership', () => {
  const r = decideBookAccess({ book: BOOK({ tenantId: '__SYSTEM__' }), hasActiveMembership: false, user: null, enforceTier: false });
  assert.equal(r.ok, true);
});
it('a book with no tenant is readable without membership', () => {
  const r = decideBookAccess({ book: BOOK({ tenantId: null }), hasActiveMembership: false, user: null, enforceTier: false });
  assert.equal(r.ok, true);
});
it("REGRESSION: another tenant's book is DENIED without membership", () => {
  const r = decideBookAccess({ book: BOOK({ tenantId: 'tenant_other' }), hasActiveMembership: false, user: null, enforceTier: false });
  assert.equal(r.ok, false);
  assert.equal(r.status, 403);
  assert.equal(r.reason, 'wrong-tenant');
});
it('own-tenant book is allowed with an ACTIVE membership', () => {
  const r = decideBookAccess({ book: BOOK({ tenantId: 'tenant_mine' }), hasActiveMembership: true, user: null, enforceTier: false });
  assert.equal(r.ok, true);
});

console.log('\n tier gate — off by default, permissive when on (inherited semantics)');
it('tier is NOT enforced when ENFORCE_BOOK_TIER is off', () => {
  const r = decideBookAccess({ book: BOOK({ accessTier: 'DIAMOND' }), hasActiveMembership: true, user: { subscriptionTier: 'FREE', trialEndsAt: null }, enforceTier: false });
  assert.equal(r.ok, true, 'documents current production behaviour, not desired behaviour');
});
it('when enforced, a FREE user is denied a DIAMOND book', () => {
  const r = decideBookAccess({ book: BOOK({ accessTier: 'DIAMOND' }), hasActiveMembership: true, user: { subscriptionTier: 'FREE', trialEndsAt: null }, enforceTier: true });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'tier-too-low');
});
it('when enforced, an equal tier is allowed', () => {
  const r = decideBookAccess({ book: BOOK({ accessTier: 'SILVER' }), hasActiveMembership: true, user: { subscriptionTier: 'SILVER', trialEndsAt: null }, enforceTier: true });
  assert.equal(r.ok, true);
});
it('an active trial grants access regardless of tier', () => {
  const future = new Date(Date.now() + 86400000);
  const r = decideBookAccess({ book: BOOK({ accessTier: 'DIAMOND' }), hasActiveMembership: true, user: { subscriptionTier: 'FREE', trialEndsAt: future }, enforceTier: true });
  assert.equal(r.ok, true);
});
it('an EXPIRED trial does not grant access', () => {
  const past = new Date(Date.now() - 86400000);
  const r = decideBookAccess({ book: BOOK({ accessTier: 'DIAMOND' }), hasActiveMembership: true, user: { subscriptionTier: 'FREE', trialEndsAt: past }, enforceTier: true });
  assert.equal(r.ok, false);
});
it('an unrecognised tier string is ALLOWED — locking out legacy subscribers is worse', () => {
  const r = decideBookAccess({ book: BOOK({ accessTier: 'GOLD' }), hasActiveMembership: true, user: { subscriptionTier: 'premium-legacy', trialEndsAt: null }, enforceTier: true });
  assert.equal(r.ok, true);
});
it('FREE books gate nothing even when enforcement is on', () => {
  const r = decideBookAccess({ book: BOOK({ accessTier: 'FREE' }), hasActiveMembership: true, user: { subscriptionTier: 'FREE', trialEndsAt: null }, enforceTier: true });
  assert.equal(r.ok, true);
});

console.log('\n ordering — tenant is checked before tier');
it("a wrong-tenant DIAMOND book reports wrong-tenant, not tier-too-low", () => {
  const r = decideBookAccess({ book: BOOK({ tenantId: 'tenant_other', accessTier: 'DIAMOND' }), hasActiveMembership: false, user: { subscriptionTier: 'FREE', trialEndsAt: null }, enforceTier: true });
  assert.equal(r.reason, 'wrong-tenant');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
