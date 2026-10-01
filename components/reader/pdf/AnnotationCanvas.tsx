'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { fabric } from 'fabric';
import { useAnnotationStore } from '@/store/useAnnotationStore';
import {
  Pencil,
  Highlighter,
  Eraser,
  MousePointer2,
  Trash2,
  Undo2,
  Redo2,
  Circle,
  Square,
  Minus,
} from '@/components/ui/icons';

interface AnnotationCanvasProps {
  pageNumber: number;
  bookId: string;
  width: number;
  height: number;
  scale: number;
}

type DrawingTool = 'select' | 'pen' | 'highlighter' | 'eraser' | 'line' | 'rect' | 'circle';

const TOOL_COLORS: Record<string, string> = {
  red: '#ef4444',
  orange: '#f97316',
  yellow: '#eab308',
  green: '#22c55e',
  blue: '#3b82f6',
  purple: '#a855f7',
  black: '#1e1e1e',
};

const DEFAULT_COLOR = '#3b82f6';

export function AnnotationCanvas({ pageNumber, bookId, width, height, scale }: AnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const isDrawingShapeRef = useRef(false);
  const shapeStartRef = useRef<{ x: number; y: number } | null>(null);
  const activeShapeRef = useRef<fabric.Object | null>(null);

  const { addAnnotation, updateAnnotation, getPageAnnotations } = useAnnotationStore();

  const [activeTool, setActiveTool] = useState<DrawingTool>('select');
  const [activeColor, setActiveColor] = useState(DEFAULT_COLOR);
  const [brushWidth, setBrushWidth] = useState(3);
  const [isToolbarExpanded, setIsToolbarExpanded] = useState(false);

  // ── Save history snapshot ──
  const saveHistory = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const json = JSON.stringify(canvas.toJSON());
    // trim forward history if we're in the middle
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(json);
    historyIndexRef.current = historyRef.current.length - 1;
  }, []);

  // ── Undo / Redo ──
  const handleUndo = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas || historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    canvas.loadFromJSON(historyRef.current[historyIndexRef.current], () => {
      canvas.renderAll();
    });
  }, []);

  const handleRedo = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas || historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    canvas.loadFromJSON(historyRef.current[historyIndexRef.current], () => {
      canvas.renderAll();
    });
  }, []);

  // ── Clear all objects ──
  const handleClearAll = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.clear();
    canvas.backgroundColor = 'transparent';
    canvas.renderAll();
    saveHistory();
  }, [saveHistory]);

  // ── Fabric.js setup ──
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      isDrawingMode: false,
      width,
      height,
      selection: false,
      backgroundColor: 'transparent',
    });

    fabricRef.current = canvas;

    // Load existing ink annotation
    const pageAnnotations = getPageAnnotations(bookId, pageNumber);
    const inkAnnotation = pageAnnotations.find(a => a.type === 'ink');
    const inkAnnotationId = inkAnnotation?.id;

    if (inkAnnotation && inkAnnotation.data?.canvasJson) {
      canvas.loadFromJSON(inkAnnotation.data.canvasJson, () => {
        canvas.renderAll();
        saveHistory();
      });
    } else {
      saveHistory();
    }

    // Save on every path/object completion
    canvas.on('object:added', () => saveHistory());
    canvas.on('object:modified', () => saveHistory());

    // Auto-save to store every 5s
    const saveInterval = setInterval(() => {
      if (!fabricRef.current) return;
      const objects = fabricRef.current.getObjects();
      if (objects.length === 0 && !inkAnnotationId) return;

      if (inkAnnotationId) {
        updateAnnotation(inkAnnotationId, {
          data: { canvasJson: fabricRef.current.toJSON() },
        });
      } else if (objects.length > 0) {
        addAnnotation({
          bookId,
          pageNumber,
          type: 'ink',
          color: 'blue',
          content: 'Drawn Ink',
          selectedText: '',
          position: { startIndex: 0, endIndex: 0 },
          isShared: false,
          data: { canvasJson: fabricRef.current.toJSON() },
        });
      }
    }, 5000);

    return () => {
      clearInterval(saveInterval);
      canvas.dispose();
      fabricRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNumber, bookId, width, height]);

  // ── Apply tool changes ──
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    // Remove shape drawing listeners
    canvas.off('mouse:down');
    canvas.off('mouse:move');
    canvas.off('mouse:up');

    if (activeTool === 'select') {
      canvas.isDrawingMode = false;
      canvas.selection = true;
      canvas.forEachObject(o => { o.selectable = true; o.evented = true; });
      canvas.defaultCursor = 'default';
    } else if (activeTool === 'pen') {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush.color = activeColor;
      canvas.freeDrawingBrush.width = brushWidth * scale;
      canvas.selection = false;
      canvas.forEachObject(o => { o.selectable = false; o.evented = false; });
    } else if (activeTool === 'highlighter') {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      // Semi-transparent highlight effect
      const hex = activeColor;
      canvas.freeDrawingBrush.color = hex + '55'; // 33% opacity
      canvas.freeDrawingBrush.width = 18 * scale;
      canvas.selection = false;
      canvas.forEachObject(o => { o.selectable = false; o.evented = false; });
    } else if (activeTool === 'eraser') {
      canvas.isDrawingMode = false;
      canvas.selection = false;
      canvas.defaultCursor = 'crosshair';
      canvas.forEachObject(o => { o.selectable = true; o.evented = true; });
      // Click to delete
      canvas.on('mouse:down', (opt) => {
        const target = canvas.findTarget(opt.e, false);
        if (target) {
          canvas.remove(target);
          canvas.renderAll();
          saveHistory();
        }
      });
    } else if (activeTool === 'line' || activeTool === 'rect' || activeTool === 'circle') {
      canvas.isDrawingMode = false;
      canvas.selection = false;
      canvas.defaultCursor = 'crosshair';
      canvas.forEachObject(o => { o.selectable = false; o.evented = false; });

      canvas.on('mouse:down', (opt) => {
        const pointer = canvas.getPointer(opt.e);
        shapeStartRef.current = { x: pointer.x, y: pointer.y };
        isDrawingShapeRef.current = true;

        let shape: fabric.Object;
        if (activeTool === 'line') {
          shape = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
            stroke: activeColor,
            strokeWidth: brushWidth * scale,
            selectable: false,
            evented: false,
          });
        } else if (activeTool === 'rect') {
          shape = new fabric.Rect({
            left: pointer.x,
            top: pointer.y,
            width: 0,
            height: 0,
            fill: 'transparent',
            stroke: activeColor,
            strokeWidth: brushWidth * scale,
            selectable: false,
            evented: false,
          });
        } else {
          shape = new fabric.Circle({
            left: pointer.x,
            top: pointer.y,
            radius: 0,
            fill: 'transparent',
            stroke: activeColor,
            strokeWidth: brushWidth * scale,
            selectable: false,
            evented: false,
          });
        }
        activeShapeRef.current = shape;
        canvas.add(shape);
      });

      canvas.on('mouse:move', (opt) => {
        if (!isDrawingShapeRef.current || !shapeStartRef.current || !activeShapeRef.current) return;
        const pointer = canvas.getPointer(opt.e);
        const sx = shapeStartRef.current.x;
        const sy = shapeStartRef.current.y;

        if (activeTool === 'line') {
          (activeShapeRef.current as fabric.Line).set({ x2: pointer.x, y2: pointer.y });
        } else if (activeTool === 'rect') {
          const w = Math.abs(pointer.x - sx);
          const h = Math.abs(pointer.y - sy);
          (activeShapeRef.current as fabric.Rect).set({
            left: Math.min(sx, pointer.x),
            top: Math.min(sy, pointer.y),
            width: w,
            height: h,
          });
        } else {
          const radius = Math.sqrt((pointer.x - sx) ** 2 + (pointer.y - sy) ** 2) / 2;
          (activeShapeRef.current as fabric.Circle).set({
            radius,
            left: Math.min(sx, pointer.x),
            top: Math.min(sy, pointer.y),
          });
        }
        canvas.renderAll();
      });

      canvas.on('mouse:up', () => {
        isDrawingShapeRef.current = false;
        shapeStartRef.current = null;
        activeShapeRef.current = null;
      });
    }
  }, [activeTool, activeColor, brushWidth, scale, saveHistory]);

  // ── Resize on zoom ──
  useEffect(() => {
    if (fabricRef.current) {
      fabricRef.current.setDimensions({ width, height });
      fabricRef.current.setZoom(scale);
    }
  }, [width, height, scale]);

  // When the toolbar is collapsed, pass pointer events through to the text layer below
  const containerPointerEvents = isToolbarExpanded || activeTool !== 'select' ? 'auto' : 'none';

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: containerPointerEvents }}>
      {/* Canvas */}
      <canvas ref={canvasRef} style={{ pointerEvents: isToolbarExpanded || activeTool !== 'select' ? 'auto' : 'none' }} />

      {/* ── Drawing Toolbar ── */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 20,
          pointerEvents: 'auto',
        }}
      >
        {/* Collapsed: just a pencil FAB */}
        {!isToolbarExpanded ? (
          <button
            onClick={() => setIsToolbarExpanded(true)}
            title="Open Drawing Tools"
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              border: '1px solid rgba(255,215,0,0.3)',
              background: 'rgba(255,248,240,0.92)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 4px 20px rgba(217,119,6,0.15)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#92400E',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <Pencil size={18} />
          </button>
        ) : (
          /* Expanded toolbar */
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'rgba(255, 248, 240, 0.92)',
              backdropFilter: 'blur(16px) saturate(180%)',
              border: '1px solid rgba(255,215,0,0.25)',
              borderRadius: 16,
              padding: '6px 10px',
              boxShadow: '0 8px 32px rgba(217,119,6,0.12), inset 0 1px 0 rgba(255,255,255,0.7)',
              animation: 'toolbarSlideUp 0.2s ease-out',
            }}
          >
            {/* Tools */}
            <CanvasToolBtn icon={<MousePointer2 size={15} />} label="Select" active={activeTool === 'select'} onClick={() => setActiveTool('select')} />
            <CanvasToolBtn icon={<Pencil size={15} />} label="Pen" active={activeTool === 'pen'} onClick={() => setActiveTool('pen')} />
            <CanvasToolBtn icon={<Highlighter size={15} />} label="Highlight" active={activeTool === 'highlighter'} onClick={() => setActiveTool('highlighter')} />
            <CanvasToolBtn icon={<Eraser size={15} />} label="Eraser" active={activeTool === 'eraser'} onClick={() => setActiveTool('eraser')} />

            <ToolbarDivider />

            {/* Shapes */}
            <CanvasToolBtn icon={<Minus size={15} />} label="Line" active={activeTool === 'line'} onClick={() => setActiveTool('line')} />
            <CanvasToolBtn icon={<Square size={15} />} label="Rectangle" active={activeTool === 'rect'} onClick={() => setActiveTool('rect')} />
            <CanvasToolBtn icon={<Circle size={15} />} label="Circle" active={activeTool === 'circle'} onClick={() => setActiveTool('circle')} />

            <ToolbarDivider />

            {/* Color palette */}
            <div style={{ display: 'flex', gap: 3 }}>
              {Object.entries(TOOL_COLORS).map(([name, hex]) => (
                <button
                  key={name}
                  title={name}
                  onClick={() => setActiveColor(hex)}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    border: activeColor === hex ? '2px solid #92400E' : '2px solid transparent',
                    background: hex,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    transform: activeColor === hex ? 'scale(1.2)' : 'scale(1)',
                  }}
                />
              ))}
            </div>

            <ToolbarDivider />

            {/* Brush width */}
            <input
              type="range"
              min={1}
              max={12}
              value={brushWidth}
              onChange={e => setBrushWidth(Number(e.target.value))}
              title={`Brush width: ${brushWidth}px`}
              style={{ width: 60, accentColor: '#D97706' }}
            />

            <ToolbarDivider />

            {/* Undo / Redo / Clear */}
            <CanvasToolBtn icon={<Undo2 size={15} />} label="Undo" onClick={handleUndo} />
            <CanvasToolBtn icon={<Redo2 size={15} />} label="Redo" onClick={handleRedo} />
            <CanvasToolBtn icon={<Trash2 size={15} />} label="Clear All" onClick={handleClearAll} />

            {/* Close toolbar */}
            <button
              onClick={() => { setActiveTool('select'); setIsToolbarExpanded(false); }}
              title="Close Drawing Tools"
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                border: 'none',
                background: 'rgba(239,68,68,0.1)',
                color: '#ef4444',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: 4,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes toolbarSlideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(12px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* ── Toolbar Button ── */
function CanvasToolBtn({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        width: 30,
        height: 30,
        borderRadius: 8,
        border: active ? '1px solid #FF9933' : '1px solid transparent',
        background: active
          ? 'linear-gradient(135deg, rgba(255,153,51,0.18), rgba(255,107,53,0.12))'
          : 'transparent',
        color: active ? '#D97706' : '#5A4E3C',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.background = 'rgba(255,153,51,0.1)';
          e.currentTarget.style.borderColor = 'rgba(255,153,51,0.4)';
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.borderColor = 'transparent';
        }
      }}
    >
      {icon}
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
        background: 'linear-gradient(180deg, transparent, rgba(255,153,51,0.3), transparent)',
        margin: '0 3px',
      }}
    />
  );
}
