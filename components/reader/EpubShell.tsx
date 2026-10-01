'use client';
import { ReactReader, ReactReaderStyle } from 'react-reader';
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { Contents, Rendition } from 'epubjs';
import { READER_FONT_CSS, READER_PALETTES, readerFontStack, type ReaderThemeKey } from '@/lib/reader-themes';
import { highlightLabel } from './highlightPalette';
import { EpubSelectionPopover, type SelectionPopoverState } from './EpubSelectionPopover';

export interface EpubTocItem { label: string; href: string }

interface EpubShellProps {
  url: string;
  initialCfi?: string;
  /** href is the spine document of the current location (used to mark the active chapter). */
  onLocationChange?: (cfi: string, page: number, href?: string) => void;
  onTocLoad?: (toc: EpubTocItem[]) => void;
  onReady?: (rendition: Rendition) => void;
  onDocumentLoad?: (pages: number) => void;
  onSpeakText?: (text: string) => void;
  onAskVarta?: (text: string) => void;
  onSaveToSanchika?: (text: string) => void;
  bookId?: string;
  /** Reader theme (Paper / Sepia / Night), text size in px (desktop value), font name and line height. */
  theme?: ReaderThemeKey;
  fontSize?: number;
  fontFamily?: string;
  lineHeight?: number;
}

/** Tablet reads 2px larger and phones 2px smaller than the desktop size the student picked. */
const sizeForViewport = (px: number) => {
  if (typeof window === 'undefined') return px;
  const w = window.innerWidth;
  return w < 768 ? px - 2 : w < 1280 ? px + 2 : px;
};

export function EpubShell({
  url, initialCfi, onLocationChange, onTocLoad, onReady, onSpeakText, onAskVarta, onSaveToSanchika,
  theme = 'paper', fontSize = 19, fontFamily = 'Newsreader', lineHeight = 1.75,
}: EpubShellProps) {
  const [location, setLocation] = useState<string | number>(initialCfi || 0);
  const renditionRef = useRef<Rendition | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [popover, setPopover] = useState<SelectionPopoverState | null>(null);
  const palette = READER_PALETTES[theme];

  const locationChanged = useCallback((epubcfi: string) => {
    setLocation(epubcfi);
    const rendition = renditionRef.current;
    if (rendition) {
      const displayed = rendition.currentLocation() as any;
      const page = displayed?.start?.displayed?.page ?? 0;
      onLocationChange?.(epubcfi, page, displayed?.start?.href);
    }
  }, [onLocationChange]);

  /* Apply the reader theme to the chapter iframe. epub.js renders each chapter in its own
     document, so the colours/typeface have to be pushed in as a stylesheet; they cannot be
     inherited. Re-runs whenever the student changes theme, size, face or spacing. */
  const applyTheme = useCallback((rendition: Rendition) => {
    const stack = readerFontStack(fontFamily);
    rendition.themes.default({
      html: { background: `${palette.bg} !important` },
      body: {
        background: `${palette.bg} !important`,
        color: `${palette.ink} !important`,
        'font-family': `${stack} !important`,
        'line-height': `${lineHeight} !important`,
        'font-weight': '400',
        'text-rendering': 'optimizeLegibility',
        '-webkit-font-smoothing': 'antialiased',
        transition: 'background-color 300ms, color 300ms',
      },
      'p, li, blockquote, div, span, h1, h2, h3, h4, h5, h6': { 'font-family': 'inherit' },
      'h1, h2, h3': { 'font-weight': '500', 'letter-spacing': '-0.015em' },
      a: { color: `${palette.ink} !important`, 'text-decoration-color': '#FF4D00' },
      img: { 'max-width': '100%', height: 'auto' },
      '::selection': { background: palette.highlight },
    });
    rendition.themes.fontSize(`${sizeForViewport(fontSize)}px`);
  }, [palette, fontFamily, fontSize, lineHeight]);

  useEffect(() => {
    if (renditionRef.current) applyTheme(renditionRef.current);
  }, [applyTheme]);

  const handleRendition = useCallback((rendition: Rendition) => {
    renditionRef.current = rendition;
    // Load the reading faces inside every chapter document.
    rendition.hooks.content.register((contents: Contents) => {
      contents.addStylesheet(READER_FONT_CSS);
    });
    applyTheme(rendition);

    // Text selection → floating popover (highlight colours, Note, Listen, Ask Varta).
    rendition.on('selected', (cfiRange: string, contents: Contents) => {
      const sel = contents.window.getSelection();
      const text = sel?.toString().trim();
      if (!sel || !text || sel.rangeCount === 0) return;
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      const frame = (contents.document.defaultView?.frameElement as HTMLElement | null)?.getBoundingClientRect();
      const host = hostRef.current?.getBoundingClientRect();
      if (!frame || !host) return;
      setPopover({
        text,
        cfiRange,
        x: frame.left - host.left + rect.left + rect.width / 2,
        y: frame.top - host.top + rect.top,
        bottom: frame.top - host.top + rect.bottom,
      });
    });
    rendition.on('click', () => setPopover(null));
    rendition.on('relocated', () => setPopover(null));
    onReady?.(rendition);
  }, [applyTheme, onReady]);

  const highlight = useCallback((color: string, hex: string) => {
    const r = renditionRef.current;
    if (!r || !popover) return;
    // Session highlight in the chosen colour; the note itself is saved via Sanchika.
    r.annotations.highlight(popover.cfiRange, { color: highlightLabel(color) }, undefined, 'bb-hl', {
      fill: hex, 'fill-opacity': '0.5', 'mix-blend-mode': 'multiply',
    });
    (r.getContents() as unknown as any[]).forEach((c: any) => c.window?.getSelection()?.removeAllRanges());
    setPopover(null);
  }, [popover]);

  const readerStyles = useMemo(() => ({
    ...ReactReaderStyle,
    container: { ...ReactReaderStyle.container, background: palette.bg },
    readerArea: { ...ReactReaderStyle.readerArea, background: palette.bg, transition: 'background-color 300ms' },
    titleArea: { ...ReactReaderStyle.titleArea, color: palette.sub },
    arrow: { ...ReactReaderStyle.arrow, color: palette.sub },
    arrowHover: { ...ReactReaderStyle.arrowHover, color: palette.ink },
    tocBackground: { ...ReactReaderStyle.tocBackground, background: 'rgba(10,15,36,.5)' },
    toc: { ...ReactReaderStyle.toc, background: palette.panel, color: palette.ink },
    tocButtonBar: { ...ReactReaderStyle.tocButtonBar, background: palette.sub },
    loadingView: { ...ReactReaderStyle.loadingView, color: palette.sub },
  }), [palette]);

  return (
    <div ref={hostRef} style={{ position: 'absolute', inset: 0 }}>
      <ReactReader
        url={url}
        location={location}
        locationChanged={locationChanged}
        tocChanged={(toc) => onTocLoad?.(toc.map(t => ({ label: t.label.trim(), href: t.href })))}
        getRendition={handleRendition}
        readerStyles={readerStyles}
        showToc={false}
        epubOptions={{ flow: 'paginated', manager: 'default' }}
      />
      {popover && (
        <EpubSelectionPopover
          state={popover}
          container={hostRef.current}
          onHighlight={highlight}
          onNote={() => { onSaveToSanchika?.(popover.text); setPopover(null); }}
          onListen={() => { onSpeakText?.(popover.text); setPopover(null); }}
          onAskVarta={() => { onAskVarta?.(popover.text); setPopover(null); }}
          onClose={() => setPopover(null)}
        />
      )}
    </div>
  );
}
