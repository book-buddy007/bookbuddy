'use client';
import { useState, useCallback, useMemo, useRef, useEffect, useLayoutEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Worker, Viewer, SpecialZoomLevel, RenderPageProps, LoadError } from '@react-pdf-viewer/core';
import { zoomPlugin } from '@react-pdf-viewer/zoom';
import { searchPlugin, OnHighlightKeyword } from '@react-pdf-viewer/search';
import { pageNavigationPlugin } from '@react-pdf-viewer/page-navigation';
import { scrollModePlugin } from '@react-pdf-viewer/scroll-mode';
import { selectionModePlugin, SelectionMode } from '@react-pdf-viewer/selection-mode';
import { thumbnailPlugin, ThumbnailDirection } from '@react-pdf-viewer/thumbnail';
import { bookmarkPlugin } from '@react-pdf-viewer/bookmark';
import {
  highlightPlugin,
  RenderHighlightTargetProps,
  RenderHighlightContentProps,
  RenderHighlightsProps,
  HighlightArea,
  Trigger,
} from '@react-pdf-viewer/highlight';
import { useAnnotationStore } from '@/store/useAnnotationStore';
import { useDictionaryStore } from '@/store/useDictionaryStore';
import { DictionaryModal } from './DictionaryModal';
import { HIGHLIGHT_SWATCHES, highlightLabel } from './highlightPalette';
import dynamic from 'next/dynamic';

import { InkOverlay } from './pdf/InkOverlay';
import { DrawingToolbar } from './pdf/DrawingToolbar';
import { FileSearch, CirclePlus, CircleMinus, X, ChevronDown, ChevronUp, Highlighter, FileText, Palette, TriangleAlert, Volume2, BookA, WandSparkles, NotebookPen, Copy, CopyCheck, TextSelect } from '@/components/ui/icons';

import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/zoom/lib/styles/index.css';
import '@react-pdf-viewer/search/lib/styles/index.css';
import '@react-pdf-viewer/thumbnail/lib/styles/index.css';
import '@react-pdf-viewer/bookmark/lib/styles/index.css';
import '@react-pdf-viewer/highlight/lib/styles/index.css';

interface PdfShellProps {
  url: string;
  bookId: string;
  initialPage?: number;
  onPageChange?: (page: number) => void;
  onDocumentLoad?: (totalPages: number) => void;
  onSpeakText?: (text: string) => void;
  onAskVarta?: (text: string) => void;
  onSaveToSanchika?: (text: string) => void;
}

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];

// ── InnerSearchUI Fragment (Implements Debounced Search) ──
function InnerSearchUI({ searchProps, toggleSearch }: { searchProps: any, toggleSearch: () => void }) {
  const { keyword, setKeyword, search, currentMatch, numberOfMatches, jumpToNextMatch, jumpToPreviousMatch } = searchProps;
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Debounce search on keyword change
  useEffect(() => {
    if (!keyword) return;
    const timeoutId = setTimeout(() => {
      search();
    }, 400); // 400ms debounce
    return () => clearTimeout(timeoutId);
  }, [keyword, search]);

  useEffect(() => {
    // Focus search input internally on mount. preventScroll: focusing it must
    // never scroll the reader shell sideways to bring it into view.
    searchInputRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        background: 'rgba(255, 248, 240, 0.95)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255, 215, 0, 0.25)',
        borderRadius: 14,
        padding: '6px 10px',
        boxShadow: '0 12px 40px rgba(217, 119, 6, 0.12), inset 0 1px 0 rgba(255,255,255,0.7)',
      }}
    >
      <FileSearch style={{ width: 14, height: 14, color: '#92400E', flexShrink: 0 }} />
      <input
        ref={searchInputRef}
        type="text"
        placeholder="Search in PDF..."
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            if (e.shiftKey) {
              search().then(() => jumpToPreviousMatch());
            } else {
              search().then(() => jumpToNextMatch());
            }
          } else if (e.key === 'Escape') {
            toggleSearch();
          }
        }}
        style={{
          background: 'rgba(255, 153, 51, 0.06)',
          border: '1.5px solid rgba(255, 153, 51, 0.2)',
          borderRadius: 8,
          padding: '6px 10px',
          fontSize: 13,
          color: '#1A1A2E',
          outline: 'none',
          width: 200,
          transition: 'border-color 0.2s ease',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = '#FF9933';
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255, 153, 51, 0.15)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255, 153, 51, 0.2)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      />
      {(keyword || numberOfMatches > 0) && (
        <span 
          style={{ 
            fontSize: 12, 
            color: '#92400E',
            fontWeight: 600,
            backgroundColor: 'rgba(255, 153, 51, 0.1)',
            padding: '4px 8px',
            borderRadius: 6,
            minWidth: 46,
            textAlign: 'center'
          }}
        >
          {numberOfMatches > 0 ? `${currentMatch}/${numberOfMatches}` : '0/0'}
        </span>
      )}
      <div style={{ width: 1, height: 16, background: 'rgba(217, 119, 6, 0.2)', margin: '0 2px' }} />
      <button onClick={() => search().then(() => jumpToPreviousMatch())} title="Previous Match (Shift+Enter)">
        <ChevronUp style={{ width: 14, height: 14 }} />
      </button>
      <button onClick={() => search().then(() => jumpToNextMatch())} title="Next Match (Enter)">
        <ChevronDown style={{ width: 14, height: 14 }} />
      </button>
      <div style={{ width: 1, height: 16, background: 'rgba(217, 119, 6, 0.2)', margin: '0 2px' }} />
      <button onClick={toggleSearch} title="Close Search (Esc)">
        <X style={{ width: 14, height: 14 }} />
      </button>
    </div>
  );
}

function getToolCursor(tool: string, color: string) {
  const enc = (svg: string) => `url('data:image/svg+xml;utf8,${encodeURIComponent(svg)}')`;

  if (tool === 'hand') return 'grab';
  if (tool === 'text') return 'text';

  if (tool === 'pen') {
    // Beautiful pencil icon with tip exactly at 2, 22
    const pencil = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>`;
    return `${enc(pencil)} 2 22, crosshair`;
  }
  
  if (tool === 'highlighter') {
    // Solid chisel marker
    const marker = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l-6 6v3h9l3-3"></path><path d="M22 12l-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"></path></svg>`;
    return `${enc(marker)} 3 20, crosshair`;
  }
  
  if (tool === 'eraser') {
    const eraser = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="#db2777" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20H7L3 16C2.5 15.5 2.5 14.5 3 14L13 4C13.5 3.5 14.5 3.5 15 4L20 9C20.5 9.5 20.5 10.5 20 11L11 20"></path><path d="M17 14L7 24"></path></svg>`;
    return `${enc(eraser)} 7 20, crosshair`;
  }

  return 'auto';
}

function NoteInputPopup({
  selectedText = '',
  selectionRegion,
  highlightAreas,
  handleAddNote,
  cancel,
}: {
  selectedText?: string;
  selectionRegion: any;
  highlightAreas: any;
  handleAddNote: (txt: string, pg: number, note: string, areas: any, cb: () => void) => void;
  cancel: () => void;
}) {
  const [noteText, setNoteText] = useState('');

  return (
    <div
      style={{
        position: 'absolute',
        left: `${selectionRegion.left}%`,
        top: `${selectionRegion.top + selectionRegion.height}%`,
        zIndex: 100,
        marginTop: 4,
        animation: 'popupFadeIn 0.15s ease-out',
      }}
    >
      <div
        style={{
          background: 'rgba(255,248,240,0.98)',
          backdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(255,215,0,0.3)',
          borderRadius: 14,
          padding: '12px 14px',
          boxShadow: '0 12px 40px rgba(217,119,6,0.15), inset 0 1px 0 rgba(255,255,255,0.7)',
          width: 260,
        }}
      >
        <div style={{ fontSize: 11, color: '#92400E', fontWeight: 600, marginBottom: 6, opacity: 0.7 }}>ADD NOTE</div>
        <div
          style={{
            fontSize: 12,
            color: '#5A4E3C',
            background: 'rgba(255,153,51,0.06)',
            borderRadius: 8,
            padding: '6px 8px',
            marginBottom: 8,
            borderLeft: '3px solid #FF9933',
            maxHeight: 60,
            overflow: 'auto',
            lineHeight: 1.4,
          }}
        >
          "{selectedText.length > 120 ? selectedText.slice(0, 120) + '...' : selectedText}"
        </div>
        <textarea
          autoFocus
          placeholder="Write your note..."
          value={noteText}
          onChange={e => setNoteText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (noteText.trim()) handleAddNote(selectedText, selectionRegion.pageIndex ?? 0, noteText, highlightAreas, cancel);
            }
          }}
          style={{
            width: '100%',
            minHeight: 60,
            resize: 'vertical',
            border: '1.5px solid rgba(255,153,51,0.2)',
            borderRadius: 8,
            padding: '8px 10px',
            fontSize: 13,
            color: '#1A1A2E',
            background: 'rgba(255,153,51,0.04)',
            outline: 'none',
            fontFamily: 'inherit',
            transition: 'border-color 0.2s ease',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = '#FF9933'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,153,51,0.12)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,153,51,0.2)'; e.currentTarget.style.boxShadow = 'none'; }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 8 }}>
          <button
            onClick={cancel}
            style={{
              padding: '5px 14px',
              borderRadius: 8,
              border: '1px solid rgba(0,0,0,0.08)',
              background: 'transparent',
              color: '#5A4E3C',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (noteText.trim()) handleAddNote(selectedText, selectionRegion.pageIndex ?? 0, noteText, highlightAreas, cancel);
            }}
            style={{
              padding: '5px 14px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg, #FF9933, #FF6B35)',
              color: 'white',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(255,107,53,0.3)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,107,53,0.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(255,107,53,0.3)'; }}
          >
            Save Note
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Quick-action toolbar that appears right after a text selection ──
 * Keeps the highlight plugin's own percentage-based anchor (left/top
 * relative to the page), then measures its real on-screen position after
 * mount and nudges it with a pixel transform so it's never cut off by the
 * viewport edge — clamped horizontally, flipped above the selection when
 * there's no room below, same technique AnnotationToolbar.tsx already used
 * for the EPUB-format popup, applied here to the PDF one. */
function SelectionQuickToolbar({
  selectedText,
  selectionRegion,
  highlightAreas,
  toggle,
  cancel,
  handleHighlight,
  onSpeakText,
  onAskVarta,
  onSaveToSanchika,
  bookId,
  HIGHLIGHT_COLORS,
}: {
  selectedText: string;
  selectionRegion: any;
  highlightAreas: HighlightArea[];
  toggle: () => void;
  cancel: () => void;
  handleHighlight: (text: string, pageIndex: number, color: string, areas: HighlightArea[], cancel: () => void) => void;
  onSpeakText?: (text: string) => void;
  onAskVarta?: (text: string) => void;
  onSaveToSanchika?: (text: string) => void;
  bookId: string;
  HIGHLIGHT_COLORS: readonly { name: string; hex: string }[];
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [nudge, setNudge] = useState({ dx: 0, dy: 0 });
  const [justCopied, setJustCopied] = useState(false);

  /* Tracks the pointer-relevant breakpoint rather than being read once,
     so rotating a tablet swaps the popover for the sheet instead of
     leaving a desktop popover on a narrow screen. */
  const [isCompact, setIsCompact] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const apply = () => setIsCompact(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el || isCompact) return;
    const margin = 8;
    const rect = el.getBoundingClientRect();

    let dx = 0;
    if (rect.right > window.innerWidth - margin) {
      dx = window.innerWidth - margin - rect.right;
    }
    if (rect.left + dx < margin) {
      dx = margin - rect.left;
    }

    let dy = 0;
    if (rect.bottom > window.innerHeight - margin) {
      // No room below the selection — flip to sit just above it instead of
      // clamping into (and covering) the text the user just selected.
      const parentRect = (el.offsetParent as HTMLElement | null)?.getBoundingClientRect();
      const selectionHeightPx = parentRect ? (selectionRegion.height / 100) * parentRect.height : 24;
      dy = -(rect.height + selectionHeightPx + 8);
    }
    if (rect.top + dy < margin) {
      dy = margin - rect.top;
    }

    setNudge({ dx, dy });
  }, [selectionRegion.left, selectionRegion.top, selectionRegion.height, selectionRegion.pageIndex, isCompact]);

  const handleCopy = () => {
    // Read the live selection, not the selectedText prop — if the user just
    // hit "Select all", the prop still holds the original word/sentence.
    const text = window.getSelection()?.toString() || selectedText;
    navigator.clipboard?.writeText(text).then(() => {
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 1200);
    }).catch(() => {});
  };

  const handleSelectAll = () => {
    const textLayers = document.querySelectorAll('.rpv-core__text-layer');
    const pageLayer = textLayers[selectionRegion.pageIndex ?? 0];
    const selection = window.getSelection();
    if (pageLayer && selection) {
      selection.selectAllChildren(pageLayer);
    }
  };

  /* Audit fix 4. Below `md` this stops being a popover anchored to the
     selection and becomes a sheet pinned to the bottom edge.

     The popover form is positioned as a percentage *inside the PDF page*
     and then nudged in pixels to stay on screen. On a 390px viewport a
     toolbar this wide has nowhere to go: whichever way it is nudged it
     lands on the sentence the student just selected, because the
     selection is what it is anchored to. Pinning it to the bottom is the
     only placement that cannot cover the selection.

     `position: fixed` also takes it out of the PDF page's transformed
     coordinate space, so the percentage anchor and the nudge are both
     skipped in this form. */
  const sheetShell: React.CSSProperties = isCompact
    ? {
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
        animation: 'popupFadeIn 0.15s ease-out',
      }
    : {
        position: 'absolute',
        left: `${selectionRegion.left}%`,
        top: `${selectionRegion.top + selectionRegion.height}%`,
        zIndex: 100,
        transform: `translate(${nudge.dx}px, ${nudge.dy}px)`,
        animation: 'popupFadeIn 0.15s ease-out',
      };

  return (
    <div ref={wrapperRef} style={sheetShell} role="dialog" aria-label="Selection actions">
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: isCompact ? 8 : 4,
          background: 'rgba(var(--ivory-cream-rgb, 255 248 240) / 0.97)',
          backdropFilter: 'blur(16px) saturate(180%)',
          border: '1px solid rgba(var(--deep-saffron-rgb, 255 153 51) / 0.28)',
          borderRadius: isCompact ? '16px 16px 0 0' : 12,
          padding: isCompact ? '12px 12px' : '4px 8px',
          paddingBottom: isCompact ? 'max(12px, env(safe-area-inset-bottom))' : 4,
          boxShadow: '0 -8px 28px rgba(0,0,0,0.12)',
          marginTop: isCompact ? 0 : 4,
        }}
      >
        {/* The selected text, shown back. On a phone the sheet is nowhere
            near the selection any more, so without this the student is
            acting on something they cannot see. */}
        {isCompact && (
          <p
            style={{
              margin: 0,
              fontSize: 13,
              lineHeight: 1.4,
              color: 'var(--accent-contrast, #7C2D12)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {selectedText}
          </p>
        )}

        {/* Row 1: highlight colors + the existing actions.
            Wraps on a phone — a single non-wrapping row of ten controls
            at 44px each is 440px wide on a 390px screen. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: isCompact ? 'wrap' : 'nowrap' }}>
          {HIGHLIGHT_COLORS.map(c => (
            <button
              key={c.name}
              aria-label={`Highlight in ${highlightLabel(c.name)}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleHighlight(selectedText, selectionRegion.pageIndex ?? 0, c.name, highlightAreas, cancel);
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleHighlight(selectedText, selectionRegion.pageIndex ?? 0, c.name, highlightAreas, cancel);
              }}
              /* Audit fix 3: was a bare 22px disc — the smallest target in
                 the reader, and the one most often aimed at with a thumb.
                 The disc is unchanged; --hit-min (40px pointer / 44px
                 touch) gives it a real hit area around it. */
              style={{
                display: 'grid',
                placeItems: 'center',
                minWidth: 'var(--hit-min, 40px)',
                minHeight: 'var(--hit-min, 40px)',
                padding: 0,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  display: 'block',
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  border: '1px solid rgba(0,0,0,0.18)',
                  background: c.hex,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                }}
              />
            </button>
          ))}

          <div style={{ width: 1, height: 18, background: 'rgba(255,153,51,0.2)', margin: '0 2px', flexShrink: 0 }} />

          <button
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(); }}
            title="Add Note"
            style={quickBtnStyle('#92400E', 'rgba(255,153,51,0.1)', 'rgba(255,107,53,0.06)')}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(var(--deep-saffron-rgb, 255 153 51) / 0.20)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(var(--deep-saffron-rgb, 255 153 51) / 0.08)'; }}
          >
            <FileText size={13} />
            Note
          </button>

          {onSpeakText && (
            <>
              <div style={{ width: 1, height: 18, background: 'rgba(255,153,51,0.2)', margin: '0 2px', flexShrink: 0 }} />
              <button
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSpeakText(selectedText); }}
                title="Listen to selected text"
                style={quickBtnStyle('#1E40AF', 'rgba(59,130,246,0.1)', 'rgba(99,102,241,0.06)')}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(var(--deep-saffron-rgb, 255 153 51) / 0.20)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(var(--deep-saffron-rgb, 255 153 51) / 0.08)'; }}
              >
                <Volume2 size={13} />
                Listen
              </button>
            </>
          )}

          <div style={{ width: 1, height: 18, background: 'rgba(255,153,51,0.2)', margin: '0 2px', flexShrink: 0 }} />
          <button
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              let context = undefined;
              try {
                const selection = window.getSelection();
                if (selection && selection.rangeCount > 0) {
                  const node = selection.anchorNode;
                  if (node && node.textContent) {
                    context = node.textContent;
                  }
                }
              } catch (e) {}
              if (context && context.length > 200) {
                context = context.substring(0, 200) + '...';
              }
              const trimmedWord = selectedText.trim();
              useDictionaryStore.getState().openDictionary(trimmedWord, context, bookId);
              cancel();
            }}
            title="Define Word"
            style={quickBtnStyle('#7E22CE', 'rgba(168,85,247,0.1)', 'rgba(192,132,252,0.06)')}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(var(--deep-saffron-rgb, 255 153 51) / 0.20)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(var(--deep-saffron-rgb, 255 153 51) / 0.08)'; }}
          >
            <BookA size={13} />
            Define
          </button>

          {onAskVarta && (
            <>
              <div style={{ width: 1, height: 18, background: 'rgba(255,153,51,0.2)', margin: '0 2px', flexShrink: 0 }} />
              <button
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAskVarta(selectedText); cancel(); }}
                title="Ask Varta"
                style={quickBtnStyle('#C2185B', 'rgba(233,30,99,0.1)', 'rgba(255,105,180,0.06)')}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(var(--deep-saffron-rgb, 255 153 51) / 0.20)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(var(--deep-saffron-rgb, 255 153 51) / 0.08)'; }}
              >
                <WandSparkles size={13} />
                Varta
              </button>
            </>
          )}

          {onSaveToSanchika && (
            <>
              <div style={{ width: 1, height: 18, background: 'rgba(255,153,51,0.2)', margin: '0 2px', flexShrink: 0 }} />
              <button
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSaveToSanchika(selectedText); cancel(); }}
                title="Save to Sanchika"
                style={quickBtnStyle('#E65100', 'rgba(255,183,77,0.1)', 'rgba(255,152,0,0.06)')}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(var(--deep-saffron-rgb, 255 153 51) / 0.20)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(var(--deep-saffron-rgb, 255 153 51) / 0.08)'; }}
              >
                <NotebookPen size={13} />
                Extract
              </button>
            </>
          )}
        </div>

        {/* Row 2: plain-text actions. Read-only content — copy and select-all
            only, deliberately no paste/cut (there's nothing to paste into or
            cut from in a rendered PDF page). */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingTop: 4, borderTop: '1px solid rgba(255,153,51,0.15)' }}>
          <button
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCopy(); }}
            title="Copy"
            style={quickBtnStyle('#166534', 'rgba(34,197,94,0.1)', 'rgba(74,222,128,0.06)')}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(var(--deep-saffron-rgb, 255 153 51) / 0.20)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(var(--deep-saffron-rgb, 255 153 51) / 0.08)'; }}
          >
            {justCopied ? <CopyCheck size={13} /> : <Copy size={13} />}
            {justCopied ? 'Copied' : 'Copy'}
          </button>

          <button
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSelectAll(); }}
            title="Select all text on this page"
            style={quickBtnStyle('#334155', 'rgba(100,116,139,0.1)', 'rgba(148,163,184,0.06)')}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(var(--deep-saffron-rgb, 255 153 51) / 0.20)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(var(--deep-saffron-rgb, 255 153 51) / 0.08)'; }}
          >
            <TextSelect size={13} />
            Select all
          </button>
        </div>
      </div>
    </div>
  );
}

/* Audit fixes 3 and 16. Was `padding: '4px 10px'` on a 12px label — about
   28px tall, well under the 44px touch minimum — and each caller passed
   its own colour family (#1E40AF blue for Listen, #7E22CE purple for
   Define, #C2185B pink for Varta), so one small toolbar carried four
   palettes none of which were the app's.

   One neutral treatment now, sized from --hit-min. The parameters are
   kept so the ~10 call sites do not all have to change in the same
   commit, but they are ignored — the colour a button is drawn in was
   never carrying meaning. */
function quickBtnStyle(_color?: string, _bgFrom?: string, _bgTo?: string): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: 'var(--hit-min, 40px)',
    padding: '4px 12px',
    borderRadius: 10,
    border: '1px solid rgba(var(--deep-saffron-rgb, 255 153 51) / 0.28)',
    background: 'rgba(var(--deep-saffron-rgb, 255 153 51) / 0.08)',
    color: 'var(--accent-contrast, #7C2D12)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s ease',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  };
}

export function PdfShell({ url, bookId, initialPage = 0, onPageChange, onDocumentLoad, onSpeakText, onAskVarta, onSaveToSanchika }: PdfShellProps) {
  const { addAnnotation, activeTool, inkColor } = useAnnotationStore();

  // --- Global safeguard for DOM Range IndexSizeError ---
  useEffect(() => {
    const originalSetStart = Range.prototype.setStart;
    const originalSetEnd = Range.prototype.setEnd;

    const safeSet = (originalFunc: Function, ctx: Range, refNode: Node, offset: number) => {
      try {
        originalFunc.call(ctx, refNode, offset);
      } catch (e: any) {
        if (e.name === 'IndexSizeError') {
          try {
            if (refNode.nodeType === Node.ELEMENT_NODE) {
              originalFunc.call(ctx, refNode, Math.min(offset, refNode.childNodes.length));
            } else if (refNode.nodeType === Node.TEXT_NODE && refNode.nodeValue) {
              originalFunc.call(ctx, refNode, Math.min(offset, refNode.nodeValue.length));
            } else {
              originalFunc.call(ctx, refNode, 0);
            }
          } catch (e2) {
            // Ignore
          }
        } else {
          throw e;
        }
      }
    };

    Range.prototype.setStart = function(refNode, offset) { safeSet(originalSetStart, this, refNode, offset); };
    Range.prototype.setEnd = function(refNode, offset) { safeSet(originalSetEnd, this, refNode, offset); };

    return () => {
      Range.prototype.setStart = originalSetStart;
      Range.prototype.setEnd = originalSetEnd;
    };
  }, []);

  // --- Touch-selection bridge for the word/highlight popup ---
  // @react-pdf-viewer/highlight only ever binds a `mouseup` listener to detect
  // a finished selection (its onMouseUpHandler reads document.getSelection()
  // directly — it never looks at the event object). On Android/tablet, native
  // long-press-and-drag-handle text selection does not reliably dispatch a
  // real `mouseup` on the page, so the popup (highlight colors, Note, Define,
  // Varta, Sanchika) never opens even though the selection itself works fine.
  // `selectionchange` DOES fire for handle-drag adjustments and `touchend`
  // fires when the finger lifts, so bridge both to a synthetic `mouseup`
  // dispatched on the selection's own anchor node — a descendant of the
  // plugin's listener target, so it bubbles up and runs the exact same code
  // path a desktop mouseup would. Gated to touch-primary devices so desktop
  // mouse behavior (which already works) is untouched.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isTouchPrimary = window.matchMedia?.('(pointer: coarse)').matches;
    if (!isTouchPrimary) return;

    let debounceId: ReturnType<typeof setTimeout> | null = null;

    const fireSyntheticMouseUp = () => {
      const selection = document.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) return;
      const anchorNode = selection.anchorNode;
      const target = (anchorNode instanceof Element ? anchorNode : anchorNode?.parentElement) ?? null;
      if (!target) return;
      target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
    };

    const handleSelectionChange = () => {
      if (debounceId) clearTimeout(debounceId);
      // Debounce past handle-drag adjustments — only fire once selection settles.
      debounceId = setTimeout(fireSyntheticMouseUp, 250);
    };

    const handleTouchEnd = () => {
      // A short delay: on some Android WebViews the Selection API updates
      // a tick after touchend, so reading it synchronously can miss the
      // final range.
      setTimeout(fireSyntheticMouseUp, 50);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('touchend', handleTouchEnd);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('touchend', handleTouchEnd);
      if (debounceId) clearTimeout(debounceId);
    };
  }, []);

  /* Audit fix 7. These five saturated hexes were a palette of their own —
     a highlight made on a PDF came out a visibly different colour from
     the same highlight made on an EPUB, and different again in the notes
     list. All four now read highlightPalette.ts. */
  const HIGHLIGHT_COLORS = useMemo(
    () => HIGHLIGHT_SWATCHES.map(s => ({ name: s.value, hex: s.light })),
    []
  );

  const handleHighlight = useCallback(
    (selectedText: string, pageIndex: number, color: string, highlightAreas: HighlightArea[], cancel: () => void) => {
      addAnnotation({
        bookId,
        pageNumber: pageIndex + 1,
        type: 'highlight',
        color: color as any,
        content: '',
        selectedText,
        position: { startIndex: 0, endIndex: selectedText.length, highlightAreas },
        isShared: false,
      });
      cancel();
    },
    [addAnnotation, bookId]
  );

  const handleAddNote = useCallback(
    (selectedText: string, pageIndex: number, note: string, highlightAreas: HighlightArea[], cancel: () => void) => {
      addAnnotation({
        bookId,
        pageNumber: pageIndex + 1,
        type: 'note',
        color: 'yellow',
        content: note,
        selectedText,
        position: { startIndex: 0, endIndex: selectedText.length, highlightAreas },
        isShared: false,
      });
      cancel();
    },
    [addAnnotation, bookId]
  );

  // ── Render actual highlights natively on the page ──
  const renderHighlights = useCallback(
    (props: RenderHighlightsProps) => {
      // Find all highlights/notes for this page
      const pageAnnotations = useAnnotationStore.getState().annotations.filter(
        a => a.bookId === bookId && a.pageNumber === props.pageIndex + 1 && (a.type === 'highlight' || a.type === 'note')
      );

      return (
        <div>
          {pageAnnotations.map((annotation) => {
            if (!annotation.position.highlightAreas) return null;
            return (
              <div key={annotation.id}>
                {annotation.position.highlightAreas.map((area, idx) => {
                  const colorHex = HIGHLIGHT_COLORS.find(c => c.name === annotation.color)?.hex || '#eab308';
                  return (
                    <div
                      key={idx}
                      style={Object.assign(
                        {},
                        {
                          background: colorHex,
                          opacity: 0.4,
                          mixBlendMode: 'multiply',
                          cursor: 'pointer',
                          borderRadius: '3px',
                        },
                        props.getCssProperties(area, props.rotation)
                      )}
                      title={annotation.type === 'note' ? `${annotation.content} (${annotation.userName})` : 'Highlight'}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      );
    },
    [bookId, HIGHLIGHT_COLORS]
  );

  // ── Selection target: appears right after text is selected ──
  const renderHighlightTarget = useCallback(
    (props: RenderHighlightTargetProps) => (
      <SelectionQuickToolbar
        selectedText={props.selectedText || ''}
        selectionRegion={props.selectionRegion}
        highlightAreas={props.highlightAreas}
        toggle={props.toggle}
        cancel={props.cancel}
        handleHighlight={handleHighlight}
        onSpeakText={onSpeakText}
        onAskVarta={onAskVarta}
        onSaveToSanchika={onSaveToSanchika}
        bookId={bookId}
        HIGHLIGHT_COLORS={HIGHLIGHT_COLORS}
      />
    ),
    [handleHighlight, HIGHLIGHT_COLORS, onSpeakText, onAskVarta, onSaveToSanchika, bookId]
  );

  // ── Selection content: note input form ──
  const renderHighlightContent = useCallback(
    (props: RenderHighlightContentProps) => {
      return (
        <NoteInputPopup
          selectedText={props.selectedText}
          selectionRegion={props.selectionRegion}
          highlightAreas={props.highlightAreas}
          cancel={props.cancel}
          handleAddNote={handleAddNote}
        />
      );
    },
    [handleAddNote]
  );

  // ── Plugins ──
  // MUST execute unconditionally on every render to preserve React Hook order!
  const currentZoomPlugin = zoomPlugin();
  const currentSearchPlugin = searchPlugin();
  const currentPageNavigationPlugin = pageNavigationPlugin();
  const currentScrollModePlugin = scrollModePlugin();
  const currentThumbnailPlugin = thumbnailPlugin();
  const currentBookmarkPlugin = bookmarkPlugin();
  const currentHighlightPlugin = highlightPlugin({
    renderHighlightTarget,
    renderHighlightContent,
    renderHighlights,
    trigger: Trigger.TextSelection,
  });
  const currentSelectionModePlugin = selectionModePlugin();

  // BUT we must CACHE the initial instances in an array for the <Viewer>
  // and extract components from that cached array so they remain stable!
  const firstRenderPlugins = useMemo(() => [
    currentZoomPlugin,
    currentSearchPlugin,
    currentPageNavigationPlugin,
    currentScrollModePlugin,
    currentThumbnailPlugin,
    currentBookmarkPlugin,
    currentHighlightPlugin,
    currentSelectionModePlugin,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  const [
    zoomPluginInstance,
    searchPluginInstance,
    pageNavigationPluginInstance,
    scrollModePluginInstance,
    thumbnailPluginInstance,
    bookmarkPluginInstance,
    highlightPluginInstance,
    selectionModePluginInstance,
  ] = firstRenderPlugins;

  const { zoomTo } = zoomPluginInstance;
  const { highlight, clearHighlights, Search } = searchPluginInstance;
  const { jumpToPage } = pageNavigationPluginInstance;
  const { Thumbnails } = thumbnailPluginInstance;
  const { Bookmarks } = bookmarkPluginInstance;
  const { SwitchSelectionMode } = selectionModePluginInstance;

  // Mount TOC Portal dynamically
  const [tocContainer, setTocContainer] = useState<HTMLElement | null>(null);
  const [thumbContainer, setThumbContainer] = useState<HTMLElement | null>(null);
  useEffect(() => {
    // Look for the portal containers set up in the main page.tsx
    const tocEl = document.getElementById('pdf-toc-container');
    if (tocEl) setTocContainer(tocEl);
    const thumbEl = document.getElementById('pdf-thumbnails-container');
    if (thumbEl) setThumbContainer(thumbEl);
  }, []);

  // Sync external page changes (e.g. from footer buttons) into the PDF
  const [lastJumpedPage, setLastJumpedPage] = useState(initialPage);
  useEffect(() => {
    if (initialPage > 0 && initialPage !== lastJumpedPage) {
      jumpToPage(initialPage - 1);
      setLastJumpedPage(initialPage);
    }
  }, [initialPage, lastJumpedPage, jumpToPage]);

  // --- Custom Zoom State ---
  const [currentScale, setCurrentScale] = useState(1);

  const handleZoomIn = useCallback(() => {
    const nextLevel = ZOOM_LEVELS.find((z) => z > currentScale) ?? ZOOM_LEVELS[ZOOM_LEVELS.length - 1];
    zoomTo(nextLevel);
    setCurrentScale(nextLevel);
  }, [currentScale, zoomTo]);

  const handleZoomOut = useCallback(() => {
    const prevLevel = [...ZOOM_LEVELS].reverse().find((z) => z < currentScale) ?? ZOOM_LEVELS[0];
    zoomTo(prevLevel);
    setCurrentScale(prevLevel);
  }, [currentScale, zoomTo]);

  const handleFitWidth = useCallback(() => {
    zoomTo(SpecialZoomLevel.PageFit);
    setCurrentScale(1); // approximate
  }, [zoomTo]);

  // --- Custom Search State ---
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const toggleSearch = useCallback(() => {
    if (!isSearchOpen) {
      // Opening — focus the input after render
      setTimeout(() => searchInputRef.current?.focus({ preventScroll: true }), 100);
      setIsSearchOpen(true);
    } else {
      // Closing — clear highlights
      clearHighlights();
      setIsSearchOpen(false);
    }
  }, [isSearchOpen, clearHighlights]);

  // Handle page change to sync with outer shell
  const handlePageChange = (e: any) => {
    const newPage = e.currentPage + 1;
    setLastJumpedPage(newPage);
    onPageChange?.(newPage);
  };

  const proxyUrl = useMemo(
    () => `/api/proxy-media?url=${encodeURIComponent(url)}`,
    [url]
  );

  // ── IDM / Download Manager error detection ──
  const renderError = useCallback((error: LoadError) => {
    const is204 = error.message?.includes('204');
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '40px 24px',
          textAlign: 'center',
          color: '#5A4E3C',
          fontFamily: 'inherit',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: is204
              ? 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.1))'
              : 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(185,28,28,0.1))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}
        >
          <TriangleAlert
            size={28}
            style={{ color: is204 ? '#D97706' : '#DC2626' }}
          />
        </div>

        <h3
          style={{
            fontSize: 18,
            fontWeight: 700,
            margin: '0 0 8px 0',
            color: '#1A1A2E',
          }}
        >
          {is204 ? 'Download Manager Detected' : 'Failed to Load PDF'}
        </h3>

        <p
          style={{
            fontSize: 14,
            lineHeight: 1.6,
            maxWidth: 480,
            margin: '0 0 16px 0',
            color: '#6B7280',
          }}
        >
          {is204 ? (
            <>
              The PDF could not be loaded because a download manager
              (such as <strong>Internet Download Manager</strong>) intercepted
              the request. This is a known issue with IDM&apos;s &ldquo;Advanced
              Browser Integration&rdquo; feature.
            </>
          ) : (
            <>
              An unexpected error occurred while loading the PDF.
              Please try refreshing the page.
            </>
          )}
        </p>

        {is204 && (
          <div
            style={{
              background: 'rgba(255,248,240,0.95)',
              border: '1px solid rgba(255,215,0,0.3)',
              borderRadius: 12,
              padding: '16px 20px',
              maxWidth: 480,
              textAlign: 'left',
              fontSize: 13,
              lineHeight: 1.6,
              color: '#5A4E3C',
              marginBottom: 16,
            }}
          >
            <strong style={{ color: '#92400E' }}>How to fix this:</strong>
            <ol style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
              <li>Open <strong>Internet Download Manager</strong>.</li>
              <li>
                Go to <strong>Downloads → Options → General</strong>.
              </li>
              <li>
                Under &ldquo;Use advanced browser integration&rdquo;, click
                {' '}<strong>Add exception</strong> and add{' '}
                <code
                  style={{
                    background: 'rgba(255,153,51,0.1)',
                    padding: '1px 6px',
                    borderRadius: 4,
                  }}
                >
                  {typeof window !== 'undefined' ? window.location.hostname : 'this domain'}
                </code>
              </li>
              <li>
                Alternatively, <strong>disable IDM browser integration</strong>
                {' '}entirely for this browser.
              </li>
              <li>Reload this page.</li>
            </ol>
          </div>
        )}

        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 24px',
            borderRadius: 10,
            border: 'none',
            background: 'linear-gradient(135deg, #FF9933, #FF6B35)',
            color: 'white',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(255,107,53,0.3)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(255,107,53,0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,107,53,0.3)';
          }}
        >
          Reload Page
        </button>
      </div>
    );
  }, []);

  const zoomPercent = Math.round(currentScale * 100);

  // NOTE: Custom renderPage with AnnotationCanvas disabled — see comment at top of file.

  return (
    <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
      {/* touchAction: pinch-zoom is disabled across the whole reader surface
          (PDF content + floating toolbars) on touch devices — the PDF has
          its own dedicated zoom control (below), and letting a browser-level
          pinch zoom run on top of it was what scaled the pen/eraser toolbar
          and other floating UI along with the page. pan-x/pan-y keeps normal
          scroll/pan gestures working; only the zoom gesture is blocked.
          There's no equivalent for desktop Ctrl/Cmd+scroll browser zoom —
          that's a true OS/browser-level render scale nothing in CSS can
          exempt an element from. */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', minWidth: 0, touchAction: 'pan-x pan-y' }}>

        {/* ── TOC Portal ── */}
        {tocContainer && createPortal((
          <div className="pdf-bookmarks-container" onMouseUp={e => e.stopPropagation()}>
            <Bookmarks />
          </div>
        ), tocContainer)}

        {/* ── Thumbnails Portal (into sidebar) ── */}
        {thumbContainer && createPortal((
          <div className="pdf-thumbnails-sidebar" onMouseUp={e => e.stopPropagation()}>
            <Thumbnails thumbnailDirection={ThumbnailDirection.Vertical} />
          </div>
        ), thumbContainer)}

        {/* ── Custom Floating Toolbar ── */}
        <div
          onMouseUp={e => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 8,
          }}
        >
          {/* Toolbar Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              background: 'rgba(255, 248, 240, 0.88)',
              backdropFilter: 'blur(16px) saturate(180%)',
              WebkitBackdropFilter: 'blur(16px) saturate(180%)',
              border: '1px solid rgba(255, 215, 0, 0.25)',
              borderRadius: 14,
              padding: '4px 6px',
              boxShadow: '0 8px 32px rgba(217, 119, 6, 0.10), 0 0 40px rgba(255, 153, 51, 0.04), inset 0 1px 0 rgba(255,255,255,0.7)',
            }}
          >
            {/* Search Toggle */}
            <ToolbarButton
              onClick={toggleSearch}
              active={isSearchOpen}
              title="Search in PDF"
            >
              <FileSearch style={{ width: 16, height: 16 }} />
            </ToolbarButton>

            <ToolbarDivider />

            {/* Zoom Out */}
            <ToolbarButton onClick={handleZoomOut} title="Zoom Out">
              <CircleMinus style={{ width: 16, height: 16 }} />
            </ToolbarButton>

            {/* Zoom Level Display */}
            <button
              onClick={handleFitWidth}
              title="Fit to Width"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                color: '#92400E',
                letterSpacing: '0.02em',
                minWidth: 48,
                textAlign: 'center',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 153, 51, 0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'none';
              }}
            >
              {zoomPercent}%
            </button>

            {/* Zoom In */}
            <ToolbarButton onClick={handleZoomIn} title="Zoom In">
              <CirclePlus style={{ width: 16, height: 16 }} />
            </ToolbarButton>
          </div>

          {/* ── Search Panel ── */}
          {isSearchOpen && (
            <Search>
              {(searchProps) => (
                <InnerSearchUI searchProps={searchProps} toggleSearch={toggleSearch} />
              )}
            </Search>
          )}
        </div>

        {/* ── Inline keyframes ── */}
        <style>{`
          @keyframes searchSlideIn {
            from { opacity: 0; transform: translateY(-8px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes popupFadeIn {
            from { opacity: 0; transform: translateY(-4px) scale(0.96); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>
        
        {/* ── PDF Viewer Main Area ── */}
        <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
          
          {/* Synchronize activeTool state with SelectionMode Plugin */}
          <SwitchSelectionMode mode={SelectionMode.Hand}>
            {({ onClick, isSelected }) => {
              if (activeTool === 'hand' && !isSelected) setTimeout(onClick, 0);
              return <></>;
            }}
          </SwitchSelectionMode>
          <SwitchSelectionMode mode={SelectionMode.Text}>
            {({ onClick, isSelected }) => {
              if (activeTool !== 'hand' && !isSelected) setTimeout(onClick, 0);
              return <></>;
            }}
          </SwitchSelectionMode>

          <div
            style={{
              position: 'absolute',
              inset: 0,
              overflow: 'auto',
              cursor: getToolCursor(activeTool, inkColor),
            }}
          >
            <Viewer
              fileUrl={proxyUrl}
              plugins={firstRenderPlugins}
              renderError={renderError}
              renderPage={(props: RenderPageProps) => (
                <CustomPageRenderer renderPageProps={props} bookId={bookId} />
              )}
              initialPage={initialPage > 0 ? initialPage - 1 : 0}
              defaultScale={SpecialZoomLevel.PageFit}
              onPageChange={handlePageChange}
              onDocumentLoad={(e) => onDocumentLoad?.(e.doc.numPages)}
              onZoom={(e) => setCurrentScale(e.scale)}
            />
          </div>
        </div>

        {/* Floating Drawing Toolbar */}
        <DrawingToolbar />

        {/* Dictionary Modal */}
        <DictionaryModal />

        {/* Thumbnails moved to sidebar via portal */}
      </div>
    </Worker>
  );
}

/* ── Reusable Toolbar Button (matches toolbarBtn from reader.module.css) ── */
function ToolbarButton({
  onClick,
  title,
  active,
  children,
}: {
  onClick: () => void;
  title: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        borderRadius: 10,
        border: active
          ? '1px solid #FF9933'
          : '1px solid transparent',
        background: active
          ? 'linear-gradient(135deg, rgba(255, 153, 51, 0.18), rgba(255, 107, 53, 0.12))'
          : 'transparent',
        color: active ? '#D97706' : '#5A4E3C',
        cursor: 'pointer',
        transition: 'all 0.25s ease',
        padding: 0,
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'rgba(255, 153, 51, 0.12)';
          e.currentTarget.style.borderColor = 'rgba(255, 153, 51, 0.5)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.borderColor = 'transparent';
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
    >
      {children}
    </button>
  );
}

/* ── Toolbar Divider ── */
function ToolbarDivider() {
  return (
    <div
      style={{
        width: 1,
        height: 20,
        background: 'linear-gradient(180deg, transparent, rgba(255, 153, 51, 0.3), transparent)',
        margin: '0 2px',
      }}
    />
  );
}

/* ── Custom Page Renderer — calls markRendered so plugins (highlight, text select) work ── */
function CustomPageRenderer({
  renderPageProps,
  bookId,
}: {
  renderPageProps: RenderPageProps;
  bookId: string;
}) {
  useEffect(() => {
    if (renderPageProps.canvasLayerRendered && renderPageProps.textLayerRendered) {
      renderPageProps.markRendered(renderPageProps.pageIndex);
    }
  }, [renderPageProps.canvasLayerRendered, renderPageProps.textLayerRendered]);

  return (
    <>
      {renderPageProps.canvasLayer.children}
      {renderPageProps.textLayer.children}
      {renderPageProps.annotationLayer.children}
      <InkOverlay
        pageNumber={renderPageProps.pageIndex + 1}
        bookId={bookId}
        scale={renderPageProps.scale}
        width={renderPageProps.width}
        height={renderPageProps.height}
      />
    </>
  );
}
