'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAnnotationStore } from '@/store/useAnnotationStore';
import { useReaderStore } from '@/store/useReaderStore';
import {
  TextSelect,
  Grab,
  PenLine,
  Highlighter,
  Eraser,
  Trash2,
  RotateCcw,
  RotateCw,
  SlidersHorizontal,
  Check,
  ChevronDown,
} from '@/components/ui/icons';

/* ── Color Palette ── */
const COLORS = [
  { name: 'Black',  hex: '#1e1e1e' },
  { name: 'Red',    hex: '#ef4444' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Yellow', hex: '#eab308' },
  { name: 'Green',  hex: '#22c55e' },
  { name: 'Blue',   hex: '#3b82f6' },
  { name: 'Purple', hex: '#a855f7' },
  { name: 'Pink',   hex: '#ec4899' },
  { name: 'White',  hex: '#ffffff' },
];

/* ── Stroke Width Presets ── */
const PEN_WIDTHS = [1, 2, 3, 5, 8];
const HIGHLIGHTER_WIDTHS = [8, 14, 20, 28, 40];

type ToolType = 'text' | 'hand' | 'pen' | 'highlighter' | 'eraser';

/* ════════════════════════════════════════════════════════════════════
 *  MAIN TOOLBAR
 * ════════════════════════════════════════════════════════════════════ */
export function DrawingToolbar() {
  const {
    activeTool,
    setActiveTool,
    inkColor,
    setInkColor,
    inkWidth,
    setInkWidth,
    past,
    future,
    undo,
    redo,
  } = useAnnotationStore();

  const [showOptions, setShowOptions] = useState(false);
  /* Collapsed by default. The full rail used to render unconditionally at
     the bottom-centre of the reading area, floating over the last lines of
     every page — a permanent obstruction for a tool a reader reaches for
     only occasionally. It now hides behind a single "Annotate" pill and
     expands to the rail on demand. */
  const [collapsed, setCollapsed] = useState(true);
  const optionsRef = useRef<HTMLDivElement>(null);
  /* When the bottom action bar is collapsed it drops its own pill onto the
     same bottom-5 baseline. Dock this one just left of centre so the two
     sit side by side as a pair; otherwise keep it centred. */
  const isBottomBarCollapsed = useReaderStore((s) => s.isBottomBarCollapsed);

  // Close options panel on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target as Node)) {
        setShowOptions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isDrawing = activeTool === 'pen' || activeTool === 'highlighter';
  const isInkTool = isDrawing || activeTool === 'eraser';

  const widthPresets = activeTool === 'highlighter' ? HIGHLIGHTER_WIDTHS : PEN_WIDTHS;

  /* Collapsing means "done annotating": drop any ink tool back to plain
     text selection so the cursor and tap behaviour return to reading, and
     shut the colour/size flyout. */
  const collapse = () => {
    setActiveTool('text');
    setShowOptions(false);
    setCollapsed(true);
  };

  // ── Collapsed: a single unobtrusive pill, clear of the reading text ──
  if (collapsed) {
    return (
      <div className={`absolute bottom-5 z-50 pointer-events-none ${isBottomBarCollapsed ? 'right-1/2 mr-1' : 'left-1/2 -translate-x-1/2'}`}>
        <button
          onClick={() => setCollapsed(false)}
          title="Annotate"
          aria-label="Show annotation tools"
          className="pointer-events-auto flex items-center gap-1.5 pl-3 pr-3.5 py-2 rounded-full bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/50 shadow-[0_8px_28px_-8px_rgba(0,0,0,0.18)] text-slate-600 dark:text-slate-300 hover:text-primary hover:border-primary/40 transition-colors"
        >
          <PenLine className="w-4 h-4" />
          <span className="text-xs font-semibold">Annotate</span>
        </button>
      </div>
    );
  }

  return (
    /* inset-x-0 + px-2 + flex-centre (instead of left-1/2/-translate-x-1/2) keeps
       the rail inside the viewport on narrow phones. Centring by translate let the
       full rail — ~370px with a draw tool active — overflow BOTH edges on a ≤375px
       screen, clipping the end icons (Select, Hide) off-screen. Now it is capped to
       the viewport and scrolls internally instead of hiding tools. */
    <div className="absolute bottom-5 inset-x-0 z-50 flex flex-col items-center gap-2 px-2 pointer-events-none">

      {/* ── Options flyout (color + width) ── */}
      {showOptions && isDrawing && (
        <div
          ref={optionsRef}
          className="pointer-events-auto animate-in slide-in-from-bottom-2 fade-in duration-200"
        >
          <div className="flex flex-col gap-3 p-3.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/60 dark:border-slate-700/50 shadow-[0_16px_48px_-8px_rgba(0,0,0,0.12),_0_4px_12px_-4px_rgba(0,0,0,0.06)]">

            {/* Color row */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1 select-none">Color</span>
              {COLORS.map((c) => (
                <button
                  key={c.name}
                  onClick={() => setInkColor(c.hex)}
                  title={c.name}
                  className="group relative w-7 h-7 rounded-full flex items-center justify-center transition-all duration-150 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-1"
                  style={{ backgroundColor: c.hex, border: c.hex === '#ffffff' ? '1.5px solid #d1d5db' : '1.5px solid transparent' }}
                >
                  {inkColor === c.hex && (
                    <Check className="w-3.5 h-3.5" style={{ color: ['#ffffff', '#eab308', '#f97316'].includes(c.hex) ? '#1e1e1e' : '#ffffff' }} />
                  )}
                </button>
              ))}
            </div>

            {/* Width row */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1 select-none">Size</span>
              {widthPresets.map((w) => (
                <button
                  key={w}
                  onClick={() => setInkWidth(w)}
                  title={`${w}px`}
                  className={`flex items-center justify-center rounded-lg transition-all duration-150 w-9 h-9 ${
                    inkWidth === w
                      ? 'bg-primary/10 ring-1 ring-primary/30 shadow-sm'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div
                    className="rounded-full"
                    style={{
                      width: Math.min(w * (activeTool === 'highlighter' ? 0.6 : 1.8), 24),
                      height: Math.min(w * (activeTool === 'highlighter' ? 0.6 : 1.8), 24),
                      backgroundColor: inkColor,
                      opacity: activeTool === 'highlighter' ? 0.35 : 1,
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Main tool rail ── */}
      <div className="pointer-events-auto max-w-full">
        <div className="flex items-center gap-0.5 p-1.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/60 dark:border-slate-700/50 shadow-[0_12px_40px_-6px_rgba(0,0,0,0.1),_0_4px_12px_-4px_rgba(0,0,0,0.05)] overflow-x-auto scrollbar-hide">

          {/* ── Selection tools ── */}
          <ToolGroup label="Navigate">
            <ToolBtn
              icon={<TextSelect className="w-4 h-4" />}
              label="Select Text"
              isActive={activeTool === 'text'}
              onClick={() => { setActiveTool('text'); setShowOptions(false); }}
            />
            <ToolBtn
              icon={<Grab className="w-4 h-4" />}
              label="Hand (Pan)"
              isActive={activeTool === 'hand'}
              onClick={() => { setActiveTool('hand'); setShowOptions(false); }}
            />
          </ToolGroup>

          <Divider />

          {/* ── Drawing tools ── */}
          <ToolGroup label="Draw">
            <ToolBtn
              icon={<PenLine className="w-4 h-4" />}
              label="Pen"
              isActive={activeTool === 'pen'}
              onClick={() => {
                setActiveTool('pen');
                setShowOptions(activeTool !== 'pen' ? true : !showOptions);
              }}
              badge={activeTool === 'pen' ? (
                <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900" style={{ backgroundColor: inkColor }} />
              ) : undefined}
            />
            <ToolBtn
              icon={<Highlighter className="w-4 h-4" />}
              label="Highlighter"
              isActive={activeTool === 'highlighter'}
              onClick={() => {
                setActiveTool('highlighter');
                setShowOptions(activeTool !== 'highlighter' ? true : !showOptions);
              }}
              badge={activeTool === 'highlighter' ? (
                <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900" style={{ backgroundColor: inkColor, opacity: 0.5 }} />
              ) : undefined}
            />
            <ToolBtn
              icon={<Eraser className="w-4 h-4" />}
              label="Eraser"
              isActive={activeTool === 'eraser'}
              onClick={() => { setActiveTool('eraser'); setShowOptions(false); }}
            />
          </ToolGroup>

          <Divider />

          {/* ── Options toggle (only when drawing tools active) ── */}
          {isDrawing && (
            <>
              <button
                onClick={() => setShowOptions(!showOptions)}
                title="Color & Size"
                className={`shrink-0 p-2 rounded-xl transition-all duration-150 ${
                  showOptions
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <SlidersHorizontal className={`w-4 h-4 transition-transform duration-200 ${showOptions ? 'rotate-90' : ''}`} />
              </button>
              <Divider />
            </>
          )}

          {/* ── Undo / Redo ── */}
          <ToolGroup label="Edit">
            <ToolBtn
              icon={<RotateCcw className="w-4 h-4" />}
              label="Undo"
              isActive={false}
              onClick={() => undo()}
              muted={past.length === 0}
            />
            <ToolBtn
              icon={<RotateCw className="w-4 h-4" />}
              label="Redo"
              isActive={false}
              onClick={() => redo()}
              muted={future.length === 0}
            />
          </ToolGroup>

          <Divider />

          {/* ── Collapse: tuck the rail away so it stops covering the page ── */}
          <ToolBtn
            icon={<ChevronDown className="w-4 h-4" />}
            label="Hide tools"
            isActive={false}
            onClick={collapse}
          />
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
 *  SUB‑COMPONENTS
 * ════════════════════════════════════════════════════════════════════ */

function ToolGroup({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-0.5 shrink-0" role="group" aria-label={label}>
      {children}
    </div>
  );
}

function Divider() {
  return <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-700/70 mx-1 flex-shrink-0" />;
}

interface ToolBtnProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  badge?: React.ReactNode;
  muted?: boolean;
}

function ToolBtn({ icon, label, isActive, onClick, badge, muted }: ToolBtnProps) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`relative shrink-0 p-2.5 rounded-xl flex items-center justify-center transition-all duration-150 ${
        isActive
          ? 'bg-primary/10 text-primary shadow-sm'
          : muted
            ? 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
      }`}
    >
      {icon}
      {badge}
    </button>
  );
}
