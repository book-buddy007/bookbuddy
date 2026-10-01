'use client';

import * as React from 'react';
import { Icon } from '@/components/ui/icon';
import { HIGHLIGHT_PICKER } from './highlightPalette';

export interface SelectionPopoverState {
  text: string;
  cfiRange: string;
  /** Centre-x and top/bottom of the selection, relative to the reader host element. */
  x: number;
  y: number;
  bottom: number;
}

interface Props {
  state: SelectionPopoverState;
  container: HTMLElement | null;
  onHighlight: (colorValue: string, hex: string) => void;
  onNote: () => void;
  onListen: () => void;
  onAskVarta: () => void;
  onClose: () => void;
}

const POP_W = 330;
const POP_H = 52;

/**
 * Navy selection popover: four highlight colours, Note, Listen from here, and Ask Varta in
 * blaze. Sits above the selection (below it when there is no room) and is clamped into the
 * reader so it never clips at the edges.
 */
export function EpubSelectionPopover({ state, container, onHighlight, onNote, onListen, onAskVarta, onClose }: Props) {
  const width = container?.clientWidth ?? 0;
  const above = state.y - POP_H - 10 > 8;
  const top = above ? state.y - POP_H - 10 : state.bottom + 10;
  const left = Math.max(8, Math.min(state.x - POP_W / 2, Math.max(8, width - POP_W - 8)));

  return (
    <div
      role="toolbar"
      aria-label="Text selection actions"
      className="absolute z-[48] flex items-center gap-1 rounded-full bg-bb-navy px-2 py-1.5 text-white shadow-e2"
      style={{ top, left, minHeight: POP_H }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="flex items-center gap-1.5 pl-1 pr-2">
        {HIGHLIGHT_PICKER.map((s) => (
          <button
            key={s.value}
            type="button"
            aria-label={`Highlight ${s.label}`}
            onClick={() => onHighlight(s.value, s.light)}
            className="h-6 w-6 rounded-full border-2 border-white/30 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:shadow-focus"
            style={{ background: s.light }}
          />
        ))}
      </div>
      <span aria-hidden className="mx-0.5 h-5 w-px bg-white/20" />
      <button type="button" onClick={onNote} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold hover:bg-white/10 focus-visible:outline-none focus-visible:shadow-focus">
        <Icon name="sanchika" size={16} /> Note
      </button>
      <button type="button" onClick={onListen} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold hover:bg-white/10 focus-visible:outline-none focus-visible:shadow-focus">
        <Icon name="audiobook" size={16} /> Listen
      </button>
      <button type="button" onClick={onAskVarta} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-bb-primary px-3.5 text-[13px] font-semibold text-white shadow-gloss focus-visible:outline-none focus-visible:shadow-focus">
        <Icon name="varta" size={16} fillLayer={false} /> Ask Varta
      </button>
      <button type="button" onClick={onClose} aria-label="Dismiss" className="ml-0.5 flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10 focus-visible:outline-none focus-visible:shadow-focus">
        <Icon name="close" size={14} fillLayer={false} />
      </button>
    </div>
  );
}
