import DOMPurify from 'dompurify';

/**
 * Sanitiser for note bodies that arrive from DigiClassroom.
 *
 * `user_notes.content` is Tiptap output — rich HTML, authored by a user, stored
 * by a *different application*, and rendered here with `dangerouslySetInnerHTML`.
 * Book Buddy did not validate what DCP accepted on the way in and cannot assume DCP
 * did, so this is the boundary where it gets checked. Without it, a note body is
 * stored XSS with a cross-app delivery route.
 *
 * The allowlist is what Tiptap actually emits and nothing more. `script`,
 * `iframe`, `object`, `embed`, `form` and every `on*` handler are absent by
 * construction rather than blocked by a denylist, because a denylist has to be
 * right about every attack and an allowlist only has to be right about the
 * editor's own output.
 */

const ALLOWED_TAGS = [
  'p', 'br', 'hr', 'div', 'span',
  'strong', 'b', 'em', 'i', 'u', 's', 'del', 'mark', 'sub', 'sup',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'blockquote', 'pre', 'code',
  'a', 'img',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
];

const ALLOWED_ATTR = [
  'href', 'title', 'alt', 'src', 'width', 'height',
  'colspan', 'rowspan',
  // Tiptap marks task lists and code blocks with classes/data attributes;
  // dropping them turns a checklist into an unstyled bullet list.
  'class', 'data-type', 'data-checked', 'start',
];

/**
 * Only https and inline images. `http:` is excluded so a note cannot downgrade
 * the page, and everything else — `javascript:`, `vbscript:`, `data:text/html`,
 * and the rest — has no legitimate use in a note body.
 */
const ALLOWED_URI_REGEXP = /^(?:https:|mailto:|data:image\/(?:png|jpe?g|gif|webp|svg\+xml);base64,)/i;

let hookInstalled = false;

function installHook() {
  if (hookInstalled) return;
  hookInstalled = true;
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    // A note can link out, but it opens in a new tab and gets no handle on the
    // reader's window object (`rel=noopener` is what stops `window.opener`
    // navigation from the linked page).
    if (node.tagName === 'A' && node.hasAttribute('href')) {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer nofollow');
    }
  });
}

export function sanitizeNoteHtml(html: string): string {
  // No DOM, nothing to purify with. Notes only exist after a client-side fetch,
  // so this path is the server pre-render of an empty panel, not a note being
  // silently dropped.
  if (typeof window === 'undefined') return '';
  if (!html) return '';
  installHook();
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP,
    // Belt and braces: even if a `style` attribute slipped through the
    // allowlist, this keeps a note from repainting the reader around it.
    FORBID_ATTR: ['style'],
    USE_PROFILES: { html: true },
  });
}
