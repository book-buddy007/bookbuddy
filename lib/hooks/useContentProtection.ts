'use client';
import { useEffect, useRef, useCallback } from 'react';

/**
 * useContentProtection — Anti-piracy event listeners for the reader.
 *
 * Attaches document-level listeners that:
 *  1. Block the right-click context menu inside the reader container.
 *  2. Intercept common developer-tools / screenshot keyboard shortcuts.
 *  3. Apply `user-select: none` to the reader container (with override
 *     support for child inputs via CSS `user-select: text`).
 *
 * Returns a `containerRef` to attach to the outermost reader <div>.
 *
 * All listeners are cleaned up on unmount.
 *
 * NOTE: These are *friction* measures, not impenetrable security.
 * A determined attacker can always bypass client-side protections.
 * The goal is to raise the bar for casual screen recording and copying.
 */
export function useContentProtection() {
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Block right-click ─────────────────────────────────────────────────
  const handleContextMenu = useCallback((e: MouseEvent) => {
    // Only block inside our reader container
    if (containerRef.current?.contains(e.target as Node)) {
      e.preventDefault();
    }
  }, []);

  // ── Block developer tools & screenshot shortcuts ─────────────────────
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Skip if user is typing in an input or textarea
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    // F12 — DevTools
    if (e.key === 'F12') {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Ctrl/Cmd + Shift + I/J/C — DevTools panels
    if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
      if (['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    }

    // Ctrl/Cmd + U — View Source
    if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U')) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Ctrl/Cmd + S — Save Page
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Ctrl/Cmd + P — Print
    if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // PrintScreen
    if (e.key === 'PrintScreen') {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
  }, []);

  // ── Block Copy and Cut events to maintain DRM while allowing visual selection ─────────
  const handleCopyCut = useCallback((e: ClipboardEvent) => {
    // Only block if the selection is inside our reader container
    if (containerRef.current?.contains(document.getSelection()?.anchorNode || null)) {
      e.preventDefault();
      // Optional: Inform the user
      // alert('Copying is disabled for this protected content.');
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    
    document.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('copy', handleCopyCut, true);
    document.addEventListener('cut', handleCopyCut, true);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('copy', handleCopyCut, true);
      document.removeEventListener('cut', handleCopyCut, true);
    };
  }, [handleContextMenu, handleKeyDown, handleCopyCut]);

  return { containerRef };
}
