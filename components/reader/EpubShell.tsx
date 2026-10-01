'use client';
import { ReactReader } from 'react-reader';
import { useState, useRef, useCallback } from 'react';
import type { Contents, Rendition } from 'epubjs';

interface EpubShellProps {
  url: string;
  initialCfi?: string;
  onLocationChange?: (cfi: string, page: number) => void;
  onTocLoad?: (toc: { label: string; href: string }[]) => void;
  onReady?: (rendition: Rendition) => void;
  onDocumentLoad?: (pages: number) => void;
  onSpeakText?: (text: string) => void;
  onAskVarta?: (text: string) => void;
  onSaveToSanchika?: (text: string) => void;
  bookId?: string;
}

export function EpubShell({ url, initialCfi, onLocationChange, onTocLoad, onReady, onDocumentLoad, onSpeakText, onAskVarta, onSaveToSanchika, bookId }: EpubShellProps) {
  const [location, setLocation] = useState<string | number>(initialCfi || 0);
  const renditionRef = useRef<Rendition | null>(null);

  const locationChanged = useCallback((epubcfi: string) => {
    setLocation(epubcfi);
    if (renditionRef.current) {
      const displayed = renditionRef.current.currentLocation() as any;
      const page = displayed?.start?.displayed?.page ?? 0;
      onLocationChange?.(epubcfi, page);
    }
  }, [onLocationChange]);

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <ReactReader
        url={url}
        location={location}
        locationChanged={locationChanged}
        tocChanged={(toc) => onTocLoad?.(toc.map(t => ({ label: t.label, href: t.href })))}
        getRendition={(rendition) => {
          renditionRef.current = rendition;
          onReady?.(rendition);
        }}
        epubOptions={{ flow: 'paginated', manager: 'default' }}
      />
    </div>
  );
}
