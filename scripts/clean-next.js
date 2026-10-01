#!/usr/bin/env node
/**
 * Remove `.next` before building.
 *
 * Two consecutive `next build` runs corrupt the directory — the second dies
 * with `TypeError: Cannot read properties of undefined (reading 'length')` —
 * and building while `next dev` holds the same directory produces a build that
 * succeeds but renders completely unstyled, which reads as a CSS bug and
 * costs an afternoon.
 *
 * A plain script rather than `rimraf` so `pnpm build` needs no extra
 * dependency, and rather than an inline `node -e` so there is no shell-quoting
 * difference between Windows and CI.
 */
const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', '.next');
try {
  fs.rmSync(target, { recursive: true, force: true });
  console.log('clean-next: removed .next');
} catch (err) {
  // force:true already swallows ENOENT; anything else is worth surfacing but
  // must not fail the build on a locked file the OS will release shortly.
  console.warn(`clean-next: could not fully remove .next — ${err.message}`);
}
