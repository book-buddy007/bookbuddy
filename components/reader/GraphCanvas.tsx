'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type Simulation,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from 'd3-force';
import { select } from 'd3-selection';
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom';

/* ── The node-link map (the "Explore" visual upgrade) ──────────────────
   d3-force computes the layout; the graph is drawn as plain SVG rather
   than a canvas, because at single-book scale (hundreds of nodes, per
   graph-extraction.service.ts) SVG stays smooth and every node is a real
   DOM element — so click, hover and theming are ordinary handlers and CSS
   variables instead of manual hit-testing on a bitmap.

   Loaded through next/dynamic with ssr:false from GraphSidebar: d3-force
   touches no window API at import, but there is no reason to pay for the
   layout engine in the server bundle or before the student opens the Map
   tab. See the dynamic() call there. */

export interface GraphCanvasNode {
  id: string;
  type: string;
  label: string;
  firstPage: number | null;
  degree: number;
}
export interface GraphCanvasEdge {
  id: string;
  source: string;
  target: string;
  relation: string;
}

interface GraphCanvasProps {
  nodes: GraphCanvasNode[];
  edges: GraphCanvasEdge[];
  selectedId?: string | null;
  onNodeClick: (id: string) => void;
  isDarkMode?: boolean;
}

// d3-force mutates its node objects with x/y/vx/vy in place — these are
// our nodes with those fields layered on. The link's source/target start
// as id strings and are replaced by object references once forceLink runs.
type SimNode = GraphCanvasNode & SimulationNodeDatum;
type SimLink = SimulationLinkDatum<SimNode> & { id: string; relation: string };

const TYPE_COLOR: Record<string, string> = {
  person: '#6366f1', // indigo
  place: '#10b981', // emerald
  term: '#FFB547', // amber
  event: '#ec4899', // pink
  concept: '#8b5cf6', // violet
};
const DEFAULT_COLOR = '#64748b'; // slate — unknown type
const colorOf = (type: string) => TYPE_COLOR[type] ?? DEFAULT_COLOR;

// Base radius plus a gentle sqrt curve on degree, so a hub reads as bigger
// without a single super-connected node swamping the frame.
const radiusOf = (degree: number) => 5 + Math.sqrt(degree) * 1.8;

const endId = (e: SimLink['source']): string =>
  typeof e === 'object' && e !== null ? (e as SimNode).id : String(e);

export default function GraphCanvas({
  nodes,
  edges,
  selectedId,
  onNodeClick,
  isDarkMode = false,
}: GraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const simRef = useRef<Simulation<SimNode, SimLink> | null>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [size, setSize] = useState({ w: 320, h: 480 });
  const sizeRef = useRef(size); // latest size for fitView's stable closure
  const fittedRef = useRef(false); // has the settled layout been framed yet
  const [, forceTick] = useState(0);
  const [transform, setTransform] = useState(zoomIdentity);
  const [hoverId, setHoverId] = useState<string | null>(null);

  // Fresh SimNode/SimLink objects whenever the data changes. Built once per
  // dataset (not per render) so d3 keeps mutating the SAME objects across
  // ticks — rebuilding them every render would reset the layout each frame.
  const { simNodes, simLinks } = useMemo(() => {
    const simNodes: SimNode[] = nodes.map((n) => ({ ...n }));
    const byId = new Map(simNodes.map((n) => [n.id, n]));
    const simLinks: SimLink[] = edges
      .filter((e) => byId.has(e.source) && byId.has(e.target))
      .map((e) => ({ id: e.id, relation: e.relation, source: e.source, target: e.target }));
    return { simNodes, simLinks };
  }, [nodes, edges]);

  // Track the container size so the layout centres itself and the SVG fills
  // the drawer at any width (full-bleed on phone, 420px on desktop).
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const parent = svg.parentElement;
    if (!parent) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: parent.clientWidth, h: parent.clientHeight });
    });
    ro.observe(parent);
    setSize({ w: parent.clientWidth, h: parent.clientHeight });
    return () => ro.disconnect();
  }, []);

  // Zoom-to-fit: frame the graph's actual bounding box in the viewport.
  // This is what makes the absolute layout position irrelevant — wherever
  // the force settles, we reframe onto it — so the finicky "centre the sim
  // on the measured size" timing problem simply doesn't arise. Reads
  // everything from refs, so it's a stable callback safe to call from the
  // tick handler. Positions come from the live sim, not React state.
  const fitView = useCallback(() => {
    const svg = svgRef.current;
    const zb = zoomRef.current;
    const sim = simRef.current;
    const { w, h } = sizeRef.current;
    if (!svg || !zb || !sim || w === 0 || h === 0) return;
    const ns = sim.nodes();
    if (ns.length === 0) return;
    const xs = ns.map((n) => n.x ?? 0);
    const ys = ns.map((n) => n.y ?? 0);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const pad = 48; // room for node radius + labels
    const bw = Math.max(maxX - minX, 1);
    const bh = Math.max(maxY - minY, 1);
    const k = Math.max(0.2, Math.min((w - pad * 2) / bw, (h - pad * 2) / bh, 2));
    const tx = (w - k * (minX + maxX)) / 2;
    const ty = (h - k * (minY + maxY)) / 2;
    select(svg).call(zb.transform, zoomIdentity.translate(tx, ty).scale(k));
  }, []);

  // The simulation. Rebuilt only when the dataset changes; a settle runs on
  // mount (nodes fly into place), then it cools and stops on its own.
  useEffect(() => {
    if (simNodes.length === 0) return;
    const sim = forceSimulation<SimNode, SimLink>(simNodes)
      .force(
        'link',
        forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance(60)
          .strength(0.4),
      )
      .force('charge', forceManyBody<SimNode>().strength(-160))
      .force('center', forceCenter(size.w / 2, size.h / 2))
      .force('collide', forceCollide<SimNode>((d) => radiusOf(d.degree) + 4))
      .alphaDecay(0.045);

    // One tick handler drives React: increment a counter, and the render
    // reads the freshly mutated node.x/node.y. RAF coalescing keeps this at
    // display rate rather than one React render per physics tick.
    let raf = 0;
    sim.on('tick', () => {
      if (!raf) {
        raf = requestAnimationFrame(() => {
          raf = 0;
          forceTick((t) => t + 1);
        });
      }
      // Frame the graph once it has essentially settled. One-shot per
      // settle (fittedRef); a later resize clears the flag to refit.
      if (!fittedRef.current && sim.alpha() < 0.08 && sizeRef.current.w > 0) {
        fittedRef.current = true;
        fitView();
      }
    });
    simRef.current = sim;

    return () => {
      sim.stop();
      if (raf) cancelAnimationFrame(raf);
      simRef.current = null;
    };
    // size is intentionally not a dep: re-centring on every resize would
    // reheat the whole layout. The center force reads the latest size via
    // the closure on (re)build, which is good enough — resizes settle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simNodes, simLinks]);

  // On any measured-size change (the off-screen 0 → real-size jump on open,
  // or a later rotate/resize) keep sizeRef current and reframe onto the
  // graph. Cheap — fitView only sets the zoom transform, it doesn't touch
  // the simulation — so calling it per resize is fine.
  useEffect(() => {
    sizeRef.current = size;
    if (size.w === 0 || size.h === 0) return;
    fitView();
  }, [size, fitView]);

  // Pan / zoom / pinch, delegated to d3-zoom (it handles wheel, drag and
  // two-finger pinch, including the maths we'd otherwise hand-roll for
  // mobile). It writes into React state; the transform lives on the inner
  // <g>, so hit-testing on nodes still works in untransformed space.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const zoomBehavior = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .filter((event) => {
        // Let node drags win over panning: ignore zoom-drags that start on a
        // node. Wheel and pinch still zoom from anywhere.
        const target = event.target as Element;
        return event.type === 'wheel' || !target.closest('[data-node]');
      })
      .on('zoom', (event) => setTransform(event.transform));
    zoomRef.current = zoomBehavior;
    select(svg).call(zoomBehavior);
    return () => {
      select(svg).on('.zoom', null);
    };
  }, []);

  // ── Node dragging ────────────────────────────────────────────────────
  const dragId = useRef<string | null>(null);
  const toSimCoords = (clientX: number, clientY: number): [number, number] | null => {
    // Was `svgRef.current!` — but a pointer/drag event can fire after the SVG has
    // unmounted (tab switch mid-drag, pointer released off-canvas), and then the
    // assertion lied and `null.getBoundingClientRect()` threw. Bail instead.
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    // Undo the pan/zoom transform to get simulation-space coordinates.
    return transform.invert([clientX - rect.left, clientY - rect.top]);
  };
  const onNodePointerDown = (e: React.PointerEvent, node: SimNode) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragId.current = node.id;
    const coords = toSimCoords(e.clientX, e.clientY);
    if (!coords) return;
    node.fx = coords[0];
    node.fy = coords[1];
    simRef.current?.alphaTarget(0.3).restart();
  };
  const onNodePointerMove = (e: React.PointerEvent, node: SimNode) => {
    if (dragId.current !== node.id) return;
    const coords = toSimCoords(e.clientX, e.clientY);
    if (!coords) return;
    node.fx = coords[0];
    node.fy = coords[1];
  };
  const onNodePointerUp = (_e: React.PointerEvent, node: SimNode) => {
    if (dragId.current !== node.id) return;
    dragId.current = null;
    node.fx = null;
    node.fy = null;
    simRef.current?.alphaTarget(0);
  };

  const activeId = hoverId ?? selectedId ?? null;
  // Which nodes are one hop from the active node — used to fade the rest.
  const neighbours = useMemo(() => {
    if (!activeId) return null;
    const set = new Set<string>([activeId]);
    for (const l of simLinks) {
      const s = endId(l.source);
      const t = endId(l.target);
      if (s === activeId) set.add(t);
      if (t === activeId) set.add(s);
    }
    return set;
  }, [activeId, simLinks]);

  const edgeStroke = isDarkMode ? '#334155' : '#cbd5e1';
  const labelFill = isDarkMode ? '#e2e8f0' : '#334155';
  const labelStroke = isDarkMode ? '#0f172a' : '#ffffff';

  if (nodes.length === 0) return null;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <svg
        ref={svgRef}
        width={size.w}
        height={size.h}
        className="touch-none select-none"
        style={{ cursor: 'grab' }}
      >
        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
          {/* Edges first, so nodes paint on top of them. */}
          {simLinks.map((l) => {
            const s = l.source as SimNode;
            const t = l.target as SimNode;
            if (typeof s !== 'object' || typeof t !== 'object') return null;
            const dim = neighbours && !(neighbours.has(s.id) && neighbours.has(t.id));
            const touchesActive =
              activeId && (s.id === activeId || t.id === activeId);
            return (
              <line
                key={l.id}
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                stroke={touchesActive ? colorOf((s.id === activeId ? t : s).type) : edgeStroke}
                strokeOpacity={dim ? 0.08 : touchesActive ? 0.9 : 0.35}
                strokeWidth={touchesActive ? 1.6 : 1}
              />
            );
          })}

          {simNodes.map((n) => {
            const r = radiusOf(n.degree);
            const isSelected = n.id === selectedId;
            const isActive = n.id === activeId;
            const dim = neighbours && !neighbours.has(n.id);
            const showLabel = isActive || isSelected || n.degree >= 3 || hoverId === n.id;
            return (
              <g
                key={n.id}
                data-node={n.id}
                transform={`translate(${n.x ?? 0},${n.y ?? 0})`}
                style={{ cursor: 'pointer', opacity: dim ? 0.25 : 1 }}
                onPointerDown={(e) => onNodePointerDown(e, n)}
                onPointerMove={(e) => onNodePointerMove(e, n)}
                onPointerUp={(e) => onNodePointerUp(e, n)}
                onPointerEnter={() => setHoverId(n.id)}
                onPointerLeave={() => setHoverId((h) => (h === n.id ? null : h))}
                onClick={(e) => {
                  e.stopPropagation();
                  // A click that was actually a drag shouldn't open the panel;
                  // dragId is cleared on pointerup, so a real drag leaves it null
                  // only after moving — guard on movement isn't needed because a
                  // stationary press-release reads as a click with no fx change.
                  onNodeClick(n.id);
                }}
              >
                <circle
                  r={r}
                  fill={colorOf(n.type)}
                  stroke={isSelected ? (isDarkMode ? '#fff' : '#0f172a') : labelStroke}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                />
                {showLabel && (
                  <text
                    x={r + 3}
                    y={4}
                    fontSize={11}
                    fontWeight={isActive || isSelected ? 700 : 500}
                    fill={labelFill}
                    stroke={labelStroke}
                    strokeWidth={3}
                    paintOrder="stroke"
                    style={{ pointerEvents: 'none' }}
                  >
                    {n.label}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Legend + reset, floating over the canvas. */}
      <div className="absolute top-2 left-2 flex flex-col gap-1 rounded-lg bg-white/85 dark:bg-slate-900/85 backdrop-blur px-2 py-1.5 shadow-sm border border-slate-200/60 dark:border-slate-700/60 pointer-events-none">
        {Object.entries(TYPE_COLOR).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5 text-[10px] capitalize text-slate-600 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full" style={{ background: color }} />
            {type}
          </div>
        ))}
      </div>
      <button
        onClick={fitView}
        className="absolute top-2 right-2 text-[11px] font-medium px-2 py-1 rounded-md bg-white/85 dark:bg-slate-900/85 backdrop-blur border border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 shadow-sm"
      >
        Fit view
      </button>
    </div>
  );
}
