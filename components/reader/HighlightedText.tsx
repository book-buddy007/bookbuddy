import React,{ useState,useRef,useEffect } from 'react';
import { useAnnotationStore,Annotation } from '@/store/useAnnotationStore';
import { useReaderStore } from '@/store/useReaderStore';
import { AnnotationToolbar } from './AnnotationToolbar';
import { highlightColor,highlightLabel,HIGHLIGHT_INK } from './highlightPalette';

interface HighlightedTextProps {
  bookId: string;
  pageNumber: number;
  children: string;
  isDarkMode?: boolean;
  onDefine?: (text: string) => void;
  onCreateFlashcard?: (text: string) => void;
  onAskVarta?: (text: string) => void;
  onSaveToSanchika?: (text: string) => void;
  onReadAloud?: (text: string) => void;
  /* Three capabilities the reader already had but that a text selection
     could not reach — see the audit's feature-coverage table. */
  onSimplify?: (text: string) => void;
  onCite?: (text: string) => void;
}

export function HighlightedText({ bookId, pageNumber, children, isDarkMode = false, onDefine, onCreateFlashcard, onAskVarta, onSaveToSanchika, onReadAloud, onSimplify, onCite }: HighlightedTextProps) {
  const [selection, setSelection] = useState<{
    text: string;
    range: { startIndex: number; endIndex: number };
    position: { x: number; y: number };
  } | null>(null);

  const { getPageAnnotations } = useAnnotationStore();
  // `isSearchOpen` was destructured here and never read — the search
  // highlights are driven by searchQuery below, not by the panel being
  // open. It is gone with the rest of the panel booleans (audit fix 1).
  const { searchResults, activeResultIndex, searchQuery } = useReaderStore();
  const textRef = useRef<HTMLDivElement>(null);

  const pageAnnotations = getPageAnnotations(bookId, pageNumber);
  const highlights = pageAnnotations.filter(a => a.type === 'highlight' || a.type === 'note');

  // Transform search results into pseudo-annotations for the rendering engine
  const searchHighlights = (searchQuery.length > 0 ? searchResults : [])
    .filter(result => result.pageIndex === pageNumber)
    .map((result) => {
      // Find global index to check if active
      const globalIndex = searchResults.findIndex(r => r === result);
      const isActive = globalIndex === activeResultIndex;

      return {
        id: `search-${globalIndex}`,
        position: { startIndex: result.charStart, endIndex: result.charEnd },
        type: 'search-result',
        isActive
      };
    });

  // Combine real annotations and search highlights
  const allHighlights = [...highlights, ...searchHighlights];

  // Sort annotations by start index, in descending order to avoid index issues when processing
  const sortedHighlights = [...allHighlights].sort((a, b) =>
    b.position.startIndex - a.position.startIndex
  );

  const handleTextSelection = () => {
    // Need a small delay to let selection complete
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.toString().trim() === '') {
        return;
      }

      const range = selection.getRangeAt(0);
      const textNode = textRef.current;

      if (!textNode || !textNode.textContent) return;

      // Check if selection is within our component
      let container = range.commonAncestorContainer;
      while (container !== textNode && container.parentNode) {
        container = container.parentNode as Node;
      }

      if (container !== textNode) {
        // Selection is outside our component
        return;
      }

      // Get the selected text
      const selectedText = selection.toString();

      // Calculate the start and end index in the original text
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(textNode);
      preCaretRange.setEnd(range.startContainer, range.startOffset);

      // Get the text before selection point
      const beforeText = preCaretRange.toString();

      // Find the actual start index in the original text
      const startIndex = beforeText.length;

      // Get position for the toolbar - needs to account for scroll position
      const rect = range.getBoundingClientRect();
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

      setSelection({
        text: selectedText,
        range: {
          startIndex: startIndex,
          endIndex: startIndex + selectedText.length
        },
        position: {
          x: rect.left + rect.width / 2 + scrollLeft,
          y: rect.top + scrollTop - 10 // Position slightly above selection
        }
      });
    }, 10);
  };

  const clearSelection = () => {
    window.getSelection()?.removeAllRanges();
    setSelection(null);
  };

  // Apply highlights to text
  const renderHighlightedText = () => {
    if (!children) return <div ref={textRef}></div>;

    const text = children;
    let segments = [{ text, highlighted: false, annotation: null as Annotation | null, searchHighlight: null as any }];

    // Apply all highlights
    sortedHighlights.forEach(highlightObj => {
      const { startIndex, endIndex } = highlightObj.position;
      const isSearchResult = highlightObj.type === 'search-result';

      // Find the segment that contains this highlight
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        if (segment.highlighted && !isSearchResult) continue; // Skip already highlighted segments (unless it's a search result overlaying it, actually we just skip to keep it simple)
        if (segment.highlighted || segment.searchHighlight) continue; // Strict exclusion for simplicity

        const segmentStart = segments.slice(0, i).reduce((sum, s) => sum + s.text.length, 0);
        const segmentEnd = segmentStart + segment.text.length;

        // Check if the annotation is within this segment
        if (startIndex >= segmentStart && endIndex <= segmentEnd) {
          // Split the segment into three parts: before, highlighted, after
          const relativeStart = startIndex - segmentStart;
          const relativeEnd = endIndex - segmentStart;

          const before = segment.text.substring(0, relativeStart);
          const highlightedSection = segment.text.substring(relativeStart, relativeEnd);
          const after = segment.text.substring(relativeEnd);

          // Replace the current segment with the three new segments
          segments.splice(i, 1,
            { text: before, highlighted: false, annotation: null, searchHighlight: null },
            {
              text: highlightedSection,
              highlighted: true,
              annotation: isSearchResult ? null : highlightObj as Annotation,
              searchHighlight: isSearchResult ? highlightObj : null
            },
            { text: after, highlighted: false, annotation: null, searchHighlight: null }
          );

          break;
        }
      }
    });

    // Filter out empty segments
    segments = segments.filter(segment => segment.text.length > 0);

    return (
      <div ref={textRef} onMouseUp={handleTextSelection} className="text-reader">
        {segments.map((segment, index) => {
          if (segment.searchHighlight) {
            const isActive = segment.searchHighlight.isActive;
            const className = isActive
              ? 'bg-yellow-500 text-yellow-950 font-bold shadow-[0_0_0_2px_rgba(234,179,8,0.8)] rounded-sm active-search-result relative z-10 scale-105 inline-block'
              : 'bg-yellow-500/40 text-yellow-900 dark:text-yellow-100 rounded-sm';

            return (
              <span
                key={index}
                className={className}
                id={isActive ? 'active-search-result' : undefined}
              >
                {segment.text}
              </span>
            );
          }

          if (segment.highlighted && segment.annotation) {
            return (
              <span
                key={index}
                className="cursor-pointer rounded-[2px]"
                style={highlightStyle(segment.annotation.color, segment.annotation.isShared)}
                /* `title` was the only indication that a highlight
                   carried a note — invisible on touch. The note text is
                   announced instead, and the notes list is the place to
                   read it. */
                aria-label={segment.annotation.type === 'note'
                  ? `Note: ${segment.annotation.content}`
                  : `Highlighted, ${highlightLabel(segment.annotation.color)}`}
                data-annotation-id={segment.annotation.id}
              >
                {segment.text}
              </span>
            );
          }
          return <span key={index}>{segment.text}</span>;
        })}
      </div>
    );
  };

  /* Audit fix 7. This was the third of four separate definitions of the
     same five highlight colours — Tailwind yellow-200/-700 here, raw
     hexes in AnnotationToolbar, different raw hexes in PdfShell, and
     different Tailwind shades again in AnnotationSidebar. It now reads
     the one palette in highlightPalette.ts, so a highlight looks the
     same in the text, in the PDF and in the notes list.

     Returns a style object rather than a class string: the palette is
     data, and Tailwind cannot generate classes from values it has not
     seen at build time. */
  const highlightStyle = (color: string, isShared: boolean = false): React.CSSProperties => ({
    backgroundColor: highlightColor(color, isDarkMode),
    color: isDarkMode ? HIGHLIGHT_INK.dark : HIGHLIGHT_INK.light,
    // Shared annotations keep their dotted underline — it is the only
    // thing distinguishing "the class can see this" from a private
    // highlight, and it does not depend on colour to say so.
    ...(isShared
      ? { borderBottom: '2px dotted currentColor' }
      : {}),
  });

  // Close the selection toolbar when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      // Don't clear if clicking inside the toolbar
      const isClickInToolbar = document.querySelector('.annotation-toolbar')?.contains(target);

      if (selection && !isClickInToolbar && !e.defaultPrevented) {
        clearSelection();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selection]);

  // Scroll active search result into view
  useEffect(() => {
    if (activeResultIndex >= 0 && searchHighlights.some(h => h.isActive)) {
      const activeEl = document.getElementById('active-search-result');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeResultIndex, searchHighlights]);

  // Ensure styles are in place for highlighting
  useEffect(() => {
    // Add a style tag if it doesn't exist
    if (!document.getElementById('highlight-styles')) {
      const style = document.createElement('style');
      style.id = 'highlight-styles';
      style.innerHTML = `
        .text-reader {
          white-space: pre-wrap;
          word-break: break-word;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <>
      {renderHighlightedText()}

      {selection && (
        <AnnotationToolbar
          bookId={bookId}
          pageNumber={pageNumber}
          selectedText={selection.text}
          selectionRange={selection.range}
          onComplete={clearSelection}
          onDefine={(text) => { onDefine?.(text); clearSelection(); }}
          onCreateFlashcard={(text) => { onCreateFlashcard?.(text); clearSelection(); }}
          onAskVarta={(text) => { onAskVarta?.(text); clearSelection(); }}
          onSaveToSanchika={(text) => { onSaveToSanchika?.(text); clearSelection(); }}
          onReadAloud={(text) => { onReadAloud?.(text); clearSelection(); }}
          onSimplify={onSimplify ? (text) => { onSimplify(text); clearSelection(); } : undefined}
          onCite={onCite ? (text) => { onCite(text); clearSelection(); } : undefined}
          position={selection.position}
          isDarkMode={isDarkMode}
        />
      )}
    </>
  );
}