'use client';

import React, { useRef, useState, useCallback } from 'react';
import { getStroke } from 'perfect-freehand';
import type { StrokeOptions } from 'perfect-freehand';
import { useAnnotationStore } from '@/store/useAnnotationStore';

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

interface Point {
  x: number;
  y: number;
  pressure: number;
}

interface Stroke {
  id: string;
  points: Point[];
  color: string;
  width: number;
  tool: 'pen' | 'highlighter';
  opacity: number;
}

interface InkOverlayProps {
  pageNumber: number;
  bookId: string;
  scale: number;
  width: number;
  height: number;
}

// ─────────────────────────────────────────────────────────────────────
// SVG Path Generation — Midpoint quadratic Bézier for smooth outlines
// ─────────────────────────────────────────────────────────────────────

function getSvgPathFromStroke(outline: number[][]): string {
  if (!outline.length) return '';

  const d: (string | number)[] = [];
  d.push('M', outline[0][0], outline[0][1]);

  for (let i = 0; i < outline.length; i++) {
    const [x0, y0] = outline[i];
    const [x1, y1] = outline[(i + 1) % outline.length];
    d.push('Q', x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
  }

  d.push('Z');
  return d.join(' ');
}

// ─────────────────────────────────────────────────────────────────────
// Pressure Mapping — Compressed range for ball-pen feel
// ─────────────────────────────────────────────────────────────────────
//
// Real ballpens produce a tight, mostly-uniform line with only subtle
// thickness under heavy pressure. We compress 0→1 into 0.40→0.80
// with ease-out so the "sweet spot" is wide and forgiving.

function mapPenPressure(raw: number): number {
  const base = raw > 0 ? raw : 0.5;
  const eased = 1 - (1 - base) * (1 - base); // ease-out quadratic
  const MIN_P = 0.40;
  const MAX_P = 0.80;
  return MIN_P + eased * (MAX_P - MIN_P);
}

// ─────────────────────────────────────────────────────────────────────
// Pointer-type pressure resolver
// ─────────────────────────────────────────────────────────────────────
//
// Different input devices need different handling:
//   - Stylus ('pen'): use real hardware pressure through mapPenPressure
//   - Mouse: no pressure sensor → use 0.5 (mid-range pen baseline)
//   - Touch: no useful pressure for inking → use 0.5
//
// For the highlighter, we always use raw pressure or 0.5 default since
// thinning is 0 and pressure doesn't affect its width anyway.

interface RawPointerSample {
  clientX: number;
  clientY: number;
  pressure: number;
  pointerType: string;
}

function resolvePressure(
  e: RawPointerSample,
  tool: 'pen' | 'highlighter' | string,
): number {
  if (tool !== 'pen') {
    // Highlighter: raw or default — thinning:0 makes it irrelevant
    return e.pressure > 0 ? e.pressure : 0.5;
  }

  // Pen tool
  if (e.pointerType === 'pen') {
    // Real stylus: use hardware pressure through our compression curve
    return mapPenPressure(e.pressure);
  }

  // Mouse or touch: no real pressure, use a comfortable midpoint
  // that sits in the sweet zone of our compressed range
  return mapPenPressure(0.5);
}

// ─────────────────────────────────────────────────────────────────────
// Adaptive Smoothing — Time + distance based velocity
// ─────────────────────────────────────────────────────────────────────
//
// Uses both spatial distance AND elapsed time for accurate velocity:
//   - Slow writing (small letters, dots) → more smoothing → hides tremor
//   - Fast strokes (long lines)          → less smoothing → stays responsive
//
// This matches how Figma/tldraw handle ink input.

const POS_ALPHA_BASE = 0.45;
const PRESS_ALPHA = 0.30;

function computeAdaptiveAlpha(
  dx: number,
  dy: number,
  dtMs: number,
): number {
  const dist = Math.sqrt(dx * dx + dy * dy);
  // velocity in px/ms (typical range: 0.05 slow → 2.0 fast flick)
  const velocity = dist / Math.max(dtMs, 1);

  // Slow (< 0.15 px/ms): alpha 0.25 → heavy smoothing, control on small letters
  // Mid  (~0.4 px/ms):    alpha 0.45 → balanced
  // Fast (> 0.8 px/ms):   alpha 0.65 → responsive, stroke keeps up
  const speedFactor = Math.min(1.6, Math.max(0.55, velocity / 0.35));
  return Math.min(0.75, POS_ALPHA_BASE * speedFactor);
}

// ─────────────────────────────────────────────────────────────────────
// Minimum distance filter — Deduplication
// ─────────────────────────────────────────────────────────────────────
// Skip points < 1.5px apart. Prevents blob buildup at dots and pauses.

const MIN_DIST_SQ = 1.5 * 1.5;

// ─────────────────────────────────────────────────────────────────────
// Stroke Presets — Ball-pen vs Highlighter physics
// ─────────────────────────────────────────────────────────────────────

const PEN_PRESET = (baseSize: number): StrokeOptions => ({
  size: baseSize,
  thinning: 0.25,              // subtle pressure→width (pen, not brush)
  smoothing: 0.4,              // crisp but smooth edges
  streamline: 0.4,             // jitter removal without lag
  simulatePressure: true,      // velocity→width on mouse/trackpad
  easing: (t: number) => t * t, // ease-in: light touch = uniform width
  start: {
    // perfect-freehand's `taper` is a DISTANCE along the stroke (same units
    // as the input points, i.e. unscaled page-space here), not a fraction
    // of stroke width — `baseSize * 0.15` on an 1-8px pen was a 0.15-1.2
    // unit taper zone, imperceptible against strokes spanning tens to
    // hundreds of units. That's what made every stroke read as flat-capped
    // instead of tapered. Floor + modest size-scaling gives a real,
    // visible taper regardless of how thin the pen is.
    taper: Math.max(12, baseSize * 3),
    cap: true,
    easing: (t: number) => t * (2 - t),    // ease-out: smooth entry
  },
  end: {
    taper: Math.max(20, baseSize * 5),     // natural lift-off tail — same fix, slightly longer
    cap: true,
    easing: (t: number) => t * (2 - t),    // ease-out: smooth exit
  },
});

const HIGHLIGHTER_PRESET = (baseSize: number): StrokeOptions => ({
  size: baseSize,
  thinning: 0.0,       // constant width — no pressure response
  smoothing: 0.7,      // soft, paint-like
  streamline: 0.6,     // heavy smoothing for broad strokes
  simulatePressure: false,
  easing: (t: number) => t,
  start: { taper: 0, cap: true },
  end: { taper: 0, cap: true },
});

// ─────────────────────────────────────────────────────────────────────
// Render function — static, outside component tree
// ─────────────────────────────────────────────────────────────────────

const renderStrokeToSvg = (stroke: Stroke, isLive = false) => {
  const rawPoints = stroke.points.map(p => ({
    x: p.x,
    y: p.y,
    pressure: p.pressure,
  }));

  const options =
    stroke.tool === 'pen'
      ? PEN_PRESET(stroke.width)
      : HIGHLIGHTER_PRESET(stroke.width);

  // During live drawing, suppress end-taper so it doesn't flicker
  if (isLive) {
    (options as any).last = false;
  }

  const outlinePoints = getStroke(rawPoints, options);
  const pathData = getSvgPathFromStroke(outlinePoints);

  return (
    <path
      key={stroke.id}
      d={pathData}
      fill={stroke.color}
      opacity={stroke.opacity}
      style={{
        mixBlendMode: stroke.tool === 'highlighter' ? 'multiply' : 'normal',
      }}
    />
  );
};

// ═════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════

export function InkOverlay({ pageNumber, bookId, scale, width, height }: InkOverlayProps) {
  const {
    activeTool,
    inkColor,
    inkWidth,
    getPageAnnotations,
    addAnnotation,
    updateAnnotation,
  } = useAnnotationStore();

  const containerRef = useRef<HTMLDivElement>(null);

  // ── Smoothing state (refs for zero-cost updates) ──
  const lastSmoothedRef = useRef<Point | null>(null);
  const lastTimeRef = useRef<number>(0);

  // ── Cursor dot position (ref → no re-render on hover) ──
  const cursorDotRef = useRef<HTMLDivElement>(null);

  // ── Live stroke ──
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);

  // ── Stored strokes from annotation store ──
  const pageAnnotations = getPageAnnotations(bookId, pageNumber);
  const inkAnnotation = pageAnnotations.find(a => a.type === 'ink');
  const existingStrokes: Stroke[] = inkAnnotation?.data?.strokes || [];

  // ── Coordinate helper — takes clientX/clientY so it works for both the
  // top-level React pointer event and raw native events pulled from
  // getCoalescedEvents() below ──
  const getXY = useCallback(
    (e: { clientX: number; clientY: number }) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return null;
      return {
        x: (e.clientX - rect.left) / scale,
        y: (e.clientY - rect.top) / scale,
      };
    },
    [scale],
  );

  // ── Cursor dot updater (direct DOM, no React state) ──
  const updateCursorDot = useCallback(
    (e: React.PointerEvent, isVisible: boolean) => {
      const dot = cursorDotRef.current;
      if (!dot) return;

      if (!isVisible || activeTool === 'text' || activeTool === 'hand') {
        dot.style.opacity = '0';
        return;
      }

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Position relative to container
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      // Size: match pen width at current zoom
      const dotSize = activeTool === 'pen'
        ? Math.max(3, inkWidth * scale * 0.6)
        : activeTool === 'highlighter'
          ? Math.max(6, inkWidth * 2 * scale * 0.4)
          : Math.max(8, 30); // eraser

      dot.style.opacity = '1';
      dot.style.width = `${dotSize}px`;
      dot.style.height = `${dotSize}px`;
      dot.style.left = `${cx - dotSize / 2}px`;
      dot.style.top = `${cy - dotSize / 2}px`;
      dot.style.backgroundColor =
        activeTool === 'eraser'
          ? 'transparent'
          : activeTool === 'highlighter'
            ? inkColor
            : inkColor;
      dot.style.borderColor =
        activeTool === 'eraser' ? 'rgba(239,68,68,0.5)' : 'transparent';
      dot.style.borderWidth = activeTool === 'eraser' ? '2px' : '0';
      dot.style.borderStyle = activeTool === 'eraser' ? 'dashed' : 'none';
      dot.style.mixBlendMode =
        activeTool === 'highlighter' ? 'multiply' : 'normal';
      dot.style.opacity = activeTool === 'highlighter' ? '0.3' : '0.6';
    },
    [activeTool, inkColor, inkWidth, scale],
  );

  // ── Batched point buffer — points accepted between animation frames.
  // pointermove can fire far more often than the display refreshes,
  // especially once getCoalescedEvents() below starts handing us several
  // samples per callback on fast strokes. Recomputing the whole
  // perfect-freehand outline (an O(n) pass over every point so far) once
  // per RAW event was doing that work multiple times per visible frame for
  // no benefit — buffering into one state update per animation frame keeps
  // the point density high without the redundant recompute. ──
  const pendingPointsRef = useRef<Point[]>([]);
  const rafIdRef = useRef<number | null>(null);

  const flushPendingPoints = useCallback(() => {
    rafIdRef.current = null;
    if (pendingPointsRef.current.length === 0) return;
    const newPoints = pendingPointsRef.current;
    pendingPointsRef.current = [];
    setCurrentStroke(prev => (prev ? { ...prev, points: [...prev.points, ...newPoints] } : prev));
  }, []);

  const scheduleFlush = useCallback(() => {
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(flushPendingPoints);
    }
  }, [flushPendingPoints]);

  // ── One raw pointer sample → an accepted, smoothed Point (or nothing, if
  // it fell inside the dead-zone). Pulled out so both the top-level event
  // and each of its coalesced sub-samples run through identical handling. ──
  const acceptRawSample = useCallback(
    (sample: RawPointerSample, timeStamp: number, activeTool: string) => {
      const pos = getXY(sample);
      if (!pos) return;

      const pressure = resolvePressure(sample, activeTool);
      const last = lastSmoothedRef.current;
      if (!last) return;

      const dt = timeStamp - lastTimeRef.current;
      const dx = pos.x - last.x;
      const dy = pos.y - last.y;

      // ── Distance dead-zone: skip micro-jitter ──
      if (dx * dx + dy * dy < MIN_DIST_SQ) return;

      // ── Time + distance adaptive smoothing ──
      const posAlpha = computeAdaptiveAlpha(dx, dy, dt);
      const smoothed: Point = {
        x: last.x + dx * posAlpha,
        y: last.y + dy * posAlpha,
        pressure: last.pressure + (pressure - last.pressure) * PRESS_ALPHA,
      };

      lastSmoothedRef.current = smoothed;
      lastTimeRef.current = timeStamp;
      pendingPointsRef.current.push(smoothed);
    },
    [getXY],
  );

  // ─────────────────────────────────────────────────────────────────
  // POINTER DOWN
  // ─────────────────────────────────────────────────────────────────
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (activeTool === 'text' || activeTool === 'hand') return;

      (e.target as Element).setPointerCapture(e.pointerId);

      const pos = getXY(e);
      if (!pos) return;

      // ── Eraser ──
      if (activeTool === 'eraser') {
        const radius = 30 / scale;
        const rSq = radius * radius;
        const updatedStrokes = existingStrokes.filter(
          stroke => !stroke.points.some(
            p => (p.x - pos.x) ** 2 + (p.y - pos.y) ** 2 < rSq,
          ),
        );
        if (updatedStrokes.length !== existingStrokes.length && inkAnnotation) {
          updateAnnotation(inkAnnotation.id, { data: { strokes: updatedStrokes } });
        }
        return;
      }

      // ── Pen / Highlighter ──
      const pressure = resolvePressure(e, activeTool);
      const firstPoint: Point = { x: pos.x, y: pos.y, pressure };

      lastSmoothedRef.current = firstPoint;
      lastTimeRef.current = e.timeStamp;
      pendingPointsRef.current = [];

      setCurrentStroke({
        id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 11),
        points: [firstPoint],
        color: inkColor,
        width: activeTool === 'highlighter' ? inkWidth * 2.5 : inkWidth,
        tool: activeTool as 'pen' | 'highlighter',
        opacity: activeTool === 'highlighter' ? 0.28 : 1,
      });
    },
    [activeTool, inkColor, inkWidth, scale, existingStrokes, inkAnnotation, updateAnnotation, getXY],
  );

  // ─────────────────────────────────────────────────────────────────
  // POINTER MOVE
  // ─────────────────────────────────────────────────────────────────
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      // Always update cursor dot (direct DOM, cheap)
      updateCursorDot(e, true);

      if (activeTool === 'text' || activeTool === 'hand') return;

      // ── Drawing ──
      if (currentStroke && (activeTool === 'pen' || activeTool === 'highlighter')) {
        // getCoalescedEvents() recovers the sub-frame samples the browser
        // already captured but would otherwise collapse into this single
        // callback — without it, fast strokes are sampled at whatever rate
        // React's event loop gets scheduled at, not the hardware's actual
        // input rate, which is what produced visible faceting on quick
        // strokes even though the outline itself is curve-fit. Falls back
        // to the single event on browsers that don't support it.
        const native = e.nativeEvent as PointerEvent;
        const samples: PointerEvent[] = native.getCoalescedEvents?.() ?? [native];

        for (const sample of samples) {
          acceptRawSample(sample, sample.timeStamp, activeTool);
        }
        scheduleFlush();
      }

      // ── Eraser drag ──
      else if (activeTool === 'eraser' && e.buttons === 1) {
        const pos = getXY(e);
        if (!pos) return;
        const radius = 30 / scale;
        const rSq = radius * radius;
        const updatedStrokes = existingStrokes.filter(
          stroke => !stroke.points.some(
            p => (p.x - pos.x) ** 2 + (p.y - pos.y) ** 2 < rSq,
          ),
        );
        if (updatedStrokes.length !== existingStrokes.length && inkAnnotation) {
          updateAnnotation(inkAnnotation.id, { data: { strokes: updatedStrokes } });
        }
      }
    },
    [activeTool, currentStroke, existingStrokes, inkAnnotation, scale, updateAnnotation, getXY, updateCursorDot, acceptRawSample, scheduleFlush],
  );

  // ─────────────────────────────────────────────────────────────────
  // POINTER UP — Commit stroke
  // ─────────────────────────────────────────────────────────────────
  const handlePointerUp = useCallback(
    () => {
      if (!currentStroke) return;

      // Flush whatever's still buffered — otherwise the last few samples
      // captured between the previous animation frame and lift-off are
      // silently dropped.
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      const flushed = pendingPointsRef.current;
      pendingPointsRef.current = [];
      const committedStroke: Stroke = flushed.length
        ? { ...currentStroke, points: [...currentStroke.points, ...flushed] }
        : currentStroke;

      // Reset smoothing state
      lastSmoothedRef.current = null;
      lastTimeRef.current = 0;

      const finalStrokes = [...existingStrokes, committedStroke];

      if (inkAnnotation) {
        updateAnnotation(inkAnnotation.id, { data: { strokes: finalStrokes } });
      } else {
        addAnnotation({
          bookId,
          pageNumber,
          type: 'ink',
          color: 'blue',
          content: 'Freehand ink',
          selectedText: '',
          position: { startIndex: 0, endIndex: 0 },
          isShared: false,
          data: { strokes: finalStrokes },
        });
      }

      setCurrentStroke(null);
    },
    [currentStroke, existingStrokes, inkAnnotation, updateAnnotation, addAnnotation, bookId, pageNumber],
  );

  // ── Hide cursor dot on leave ──
  const handlePointerLeave = useCallback(
    (e: React.PointerEvent) => {
      updateCursorDot(e, false);
    },
    [updateCursorDot],
  );

  // ── Memoize completed strokes ──
  const renderedExistingStrokes = React.useMemo(
    () => existingStrokes.map(s => renderStrokeToSvg(s, false)),
    [existingStrokes],
  );

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────
  const isActive = activeTool !== 'text' && activeTool !== 'hand';

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: `${width}px`,
        height: `${height}px`,
        pointerEvents: isActive ? 'auto' : 'none',
        zIndex: 15,
        touchAction: 'none',
        userSelect: 'none',
        cursor: isActive ? 'none' : undefined, // hide native cursor when drawing
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerLeave}
    >
      {/* Custom cursor dot — positioned via direct DOM for zero React overhead */}
      <div
        ref={cursorDotRef}
        style={{
          position: 'absolute',
          borderRadius: '50%',
          pointerEvents: 'none',
          opacity: 0,
          transition: 'width 80ms ease, height 80ms ease, opacity 150ms ease',
          zIndex: 100,
          willChange: 'left, top',
        }}
      />

      <svg
        style={{ width: '100%', height: '100%' }}
        viewBox={`0 0 ${width / scale} ${height / scale}`}
      >
        {renderedExistingStrokes}
        {currentStroke && renderStrokeToSvg(currentStroke, true)}
      </svg>
    </div>
  );
}
