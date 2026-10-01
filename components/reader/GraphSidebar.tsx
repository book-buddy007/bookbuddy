import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  X,
  Network,
  Search,
  Loader2,
  ArrowLeft,
  User as PersonIcon,
  MapPin,
  BookMarked,
  CalendarClock,
  Lightbulb,
  BookOpen,
  Waypoints,
  Maximize2,
  Minimize2,
} from "@/components/ui/icons";
import { useReaderStore } from "@/store/useReaderStore";
import { panelShellClass } from "./panelShell";
import type { GraphCanvasNode, GraphCanvasEdge } from "./GraphCanvas";

/* The force-layout canvas is client-only and pulls in d3-force; loading it
   through next/dynamic keeps it out of SSR and out of the reader's initial
   bundle, so it costs nothing until the student opens the Map tab. */
const GraphCanvas = dynamic(() => import("./GraphCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
    </div>
  ),
});

interface GraphSidebarProps {
  bookId: string;
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
  /** Rendered as the body of a Study drawer tab rather than as its own
      overlay — see components/reader/panelShell.ts. */
  embedded?: boolean;
}

interface EntityListItem {
  id: string;
  type: string;
  label: string;
  description: string;
  firstPage: number | null;
}

interface EntityRelation {
  edgeId: string;
  direction: "outgoing" | "incoming";
  relation: string;
  node: { id: string; label: string; type: string };
  citedPage: number | null;
}

interface EntityDetail extends EntityListItem {
  relations: EntityRelation[];
}

interface CommunitySummary {
  id: string;
  level: string;
  summary: string;
  members: { id: string; label: string; type: string }[];
}

interface SemanticHit {
  nodeId: string;
  label: string;
  type: string;
  description: string;
  firstPage: number | null;
  score: number; // cosine similarity to the query
}

const TYPE_ICON: Record<string, typeof PersonIcon> = {
  person: PersonIcon,
  place: MapPin,
  term: BookMarked,
  event: CalendarClock,
  concept: Lightbulb,
};

const TYPE_FILTERS = ["person", "place", "term", "event", "concept"] as const;

function EntityIcon({ type, className }: { type: string; className?: string }) {
  const Icon = TYPE_ICON[type] ?? BookMarked;
  return <Icon className={className} />;
}

export function GraphSidebar({ bookId, isOpen, onClose, isDarkMode = false, embedded = false }: GraphSidebarProps) {
  const { setCurrentPage } = useReaderStore();

  const [mainTab, setMainTab] = useState<"map" | "entities" | "summary">("map");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const [network, setNetwork] = useState<{ nodes: GraphCanvasNode[]; edges: GraphCanvasEdge[] } | null>(null);
  const [loadingNetwork, setLoadingNetwork] = useState(false);
  // The reader now VIEWS pre-generated per-chapter maps rather than building
  // them: the graph is generated chapter by chapter at ingest (Stage 2). The Map
  // tab is a chapter picker over those maps, defaulting to the first chapter.
  // `chapters` is the reading-ordered list of chapters that have a map;
  // `selectedChapter` is the one on screen; `loadedChapter` tracks which one the
  // current `network` holds, so switching tabs doesn't needlessly refetch.
  const [chapters, setChapters] = useState<{ chapter: string; nodeCount: number; firstPage: number | null }[]>([]);
  const [chaptersLoaded, setChaptersLoaded] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [loadedChapter, setLoadedChapter] = useState<string | null>(null);
  // Full-screen "presentation" view of the Map — the 420px drawer is too narrow
  // to read a node-link graph, so this pops it out to fill the whole viewport.
  const [fullscreen, setFullscreen] = useState(false);
  const fsRef = useRef<HTMLDivElement>(null);

  const [entities, setEntities] = useState<EntityListItem[]>([]);
  const [loadingEntities, setLoadingEntities] = useState(false);
  const [entitiesLoaded, setEntitiesLoaded] = useState(false);

  const [selectedEntity, setSelectedEntity] = useState<EntityDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SemanticHit[] | null>(null);
  const [searching, setSearching] = useState(false);

  const [summaryLevel, setSummaryLevel] = useState<"book" | "chapter">("book");
  const [summaries, setSummaries] = useState<CommunitySummary[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryLoadedLevel, setSummaryLoadedLevel] = useState<string | null>(null);

  const fetchEntities = useCallback(async () => {
    setLoadingEntities(true);
    try {
      const res = await fetch(`/api/books/${bookId}/graph/entities`);
      if (res.ok) setEntities(await res.json());
    } catch (e) {
      console.error("Failed to fetch graph entities", e);
    } finally {
      setLoadingEntities(false);
      setEntitiesLoaded(true);
    }
  }, [bookId]);

  useEffect(() => {
    if (isOpen && mainTab === "entities" && !entitiesLoaded) {
      fetchEntities();
    }
  }, [isOpen, mainTab, entitiesLoaded, fetchEntities]);

  // The chapters that have a pre-generated map, in reading order. Load once when
  // the panel opens and default to the first chapter, so the Map tab lands on
  // Chapter 1 with no interaction.
  const fetchChapters = useCallback(async () => {
    try {
      const res = await fetch(`/api/books/${bookId}/graph/chapters`);
      if (res.ok) {
        const data: { chapter: string; nodeCount: number; firstPage: number | null }[] = await res.json();
        setChapters(data);
        if (data.length > 0) setSelectedChapter((prev) => prev ?? data[0].chapter);
      }
    } catch (e) {
      console.error("Failed to fetch graph chapters", e);
    } finally {
      setChaptersLoaded(true);
    }
  }, [bookId]);

  useEffect(() => {
    if (isOpen && !chaptersLoaded) fetchChapters();
  }, [isOpen, chaptersLoaded, fetchChapters]);

  const fetchNetwork = useCallback(async (chapter: string) => {
    setLoadingNetwork(true);
    try {
      const res = await fetch(`/api/books/${bookId}/graph/network?chapter=${encodeURIComponent(chapter)}`);
      if (res.ok) setNetwork(await res.json());
    } catch (e) {
      console.error("Failed to fetch graph network", e);
    } finally {
      setLoadingNetwork(false);
    }
  }, [bookId]);

  // Fetch the selected chapter's map when the Map tab is showing and the
  // selection changed. `loadedChapter` prevents a refetch on every tab switch.
  useEffect(() => {
    if (isOpen && mainTab === "map" && selectedChapter && selectedChapter !== loadedChapter) {
      fetchNetwork(selectedChapter);
      setLoadedChapter(selectedChapter);
    }
  }, [isOpen, mainTab, selectedChapter, loadedChapter, fetchNetwork]);

  const exitFullscreen = useCallback(() => {
    setFullscreen(false);
    if (typeof document !== "undefined" && document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  const enterFullscreen = () => {
    setFullscreen(true);
    // Best-effort true browser fullscreen (hides the browser chrome, like a
    // slideshow); the fixed overlay already fills the viewport if it's denied.
    requestAnimationFrame(() => {
      fsRef.current?.requestFullscreen?.().catch(() => {});
    });
  };

  // While presenting: Esc exits (captured so it beats the drawer's own Esc),
  // and leaving browser fullscreen by any means keeps our state in sync.
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        exitFullscreen();
      }
    };
    const onFsChange = () => {
      if (typeof document !== "undefined" && !document.fullscreenElement) setFullscreen(false);
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("fullscreenchange", onFsChange);
    };
  }, [fullscreen, exitFullscreen]);

  useEffect(() => {
    if (!isOpen || mainTab !== "summary" || summaryLoadedLevel === summaryLevel) return;
    setLoadingSummary(true);
    fetch(`/api/books/${bookId}/graph/summary?level=${summaryLevel}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setSummaries(data);
        setSummaryLoadedLevel(summaryLevel);
      })
      .catch((e) => console.error("Failed to fetch graph summary", e))
      .finally(() => setLoadingSummary(false));
  }, [isOpen, mainTab, summaryLevel, summaryLoadedLevel, bookId]);

  const openEntity = async (entityId: string) => {
    setLoadingDetail(true);
    setSelectedEntity(null);
    try {
      const res = await fetch(`/api/books/${bookId}/graph/entities/${entityId}`);
      if (res.ok) setSelectedEntity(await res.json());
    } catch (e) {
      console.error("Failed to fetch entity detail", e);
    } finally {
      setLoadingDetail(false);
    }
  };

  const runSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/books/${bookId}/graph/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery.trim(), limit: 20 }),
      });
      setSearchResults(res.ok ? await res.json() : []);
    } catch (e) {
      console.error("Graph search failed", e);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const filteredEntities = typeFilter ? entities.filter((e) => e.type === typeFilter) : entities;

  return (
    <>
    <div className={panelShellClass({ isOpen, embedded, width: 'w-96' })}>
      <div className="p-4 border-b border-[var(--accent-primary)]/15 dark:border-[var(--gold)]/10 flex flex-col gap-3 shrink-0">
        {!embedded && (
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold tracking-tight text-[var(--accent-contrast)] dark:text-[var(--gold)] flex items-center gap-2">
              <Network className="h-5 w-5 text-[var(--accent-strong)] dark:text-[var(--accent-primary-dark)]" />
              Explore
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close Explore"
              className="rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
          Characters, places, and terms extracted from this book, with citations.
        </p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            placeholder="Search by meaning…"
            className="pl-8 h-9 text-sm bg-white/70 dark:bg-slate-900/50"
          />
        </div>
      </div>

      {/* A selected entity takes over even while a search is active, so
          clicking a result opens its detail; "Back to list" clears the
          selection and the results list is still here to return to. */}
      {searchResults !== null && !selectedEntity && !loadingDetail ? (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-4 py-2 flex items-center justify-between border-b border-indigo-50 dark:border-indigo-900/20">
            <span className="text-xs font-medium text-slate-500">
              {searching ? "Searching…" : `${searchResults.length} result${searchResults.length === 1 ? "" : "s"}`}
            </span>
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => { setSearchResults(null); setSearchQuery(""); }}>
              Clear
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {searchResults.map((hit) => (
                <button
                  key={hit.nodeId}
                  onClick={() => openEntity(hit.nodeId)}
                  className="w-full text-left p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-colors flex items-start gap-2"
                >
                  <EntityIcon type={hit.type} className="h-4 w-4 mt-0.5 text-indigo-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{hit.label}</span>
                      {/* Relevance as a percent — an honest, comparable signal
                          of how closely the entity matches the query's meaning. */}
                      <span className="text-[10px] font-semibold text-indigo-500/80 shrink-0">{Math.round(hit.score * 100)}%</span>
                    </div>
                    <div className="text-xs text-slate-500 line-clamp-2">{hit.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      ) : selectedEntity || loadingDetail ? (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-4 py-2 border-b border-indigo-50 dark:border-indigo-900/20">
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setSelectedEntity(null)}>
              <ArrowLeft className="h-3.5 w-3.5" /> Back to list
            </Button>
          </div>
          {loadingDetail ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            </div>
          ) : selectedEntity ? (
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <EntityIcon type={selectedEntity.type} className="h-4 w-4 text-indigo-500" />
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wide">{selectedEntity.type}</Badge>
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">{selectedEntity.label}</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{selectedEntity.description}</p>
                  {selectedEntity.firstPage != null && (
                    <button
                      onClick={() => setCurrentPage(selectedEntity.firstPage!)}
                      className="mt-2 inline-flex items-center text-xs font-semibold px-1.5 py-0.5 rounded-sm bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/40 dark:text-purple-300"
                    >
                      <BookOpen className="w-3 h-3 mr-1" /> First appears on page {selectedEntity.firstPage}
                    </button>
                  )}
                </div>

                {selectedEntity.relations.length > 0 && (
                  <div>
                    <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Connections</h5>
                    <div className="space-y-2">
                      {selectedEntity.relations.map((rel) => (
                        <div key={rel.edgeId} className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-sm">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {rel.direction === "outgoing" ? (
                              <>
                                <span className="text-slate-500 italic">{rel.relation}</span>
                                <button
                                  onClick={() => openEntity(rel.node.id)}
                                  className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                                >
                                  {rel.node.label}
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => openEntity(rel.node.id)}
                                  className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                                >
                                  {rel.node.label}
                                </button>
                                <span className="text-slate-500 italic">{rel.relation}</span>
                              </>
                            )}
                          </div>
                          {rel.citedPage != null && (
                            <button
                              onClick={() => setCurrentPage(rel.citedPage!)}
                              className="mt-1.5 inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-sm bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/40 dark:text-purple-300"
                            >
                              <BookOpen className="w-2.5 h-2.5 mr-1" /> Pg. {rel.citedPage}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          ) : null}
        </div>
      ) : (
        <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as "map" | "entities" | "summary")} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <TabsList className="grid grid-cols-3 mx-4 mt-4 mb-2 p-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50 shadow-sm min-h-[44px]">
            <TabsTrigger
              value="map"
              className="rounded-lg text-sm font-medium transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md flex items-center gap-1.5"
            >
              <Waypoints className="h-3.5 w-3.5" /> Map
            </TabsTrigger>
            <TabsTrigger
              value="entities"
              className="rounded-lg text-sm font-medium transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              Entities
            </TabsTrigger>
            <TabsTrigger
              value="summary"
              className="rounded-lg text-sm font-medium transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              Throughlines
            </TabsTrigger>
          </TabsList>

          <TabsContent value="map" forceMount className="flex-1 flex flex-col min-h-0 data-[state=inactive]:hidden m-0">
            {!chaptersLoaded ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
              </div>
            ) : chapters.length === 0 ? (
              /* No pre-generated map for this book yet. Students only view maps
                 (they aren't built on demand any more), so there is no build
                 action here — the graph is generated at ingest / by an admin. */
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center flex-1">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mb-4 shadow-sm border border-indigo-100/50 dark:border-indigo-800/50">
                  <Waypoints className="h-8 w-8 text-indigo-400 dark:text-indigo-500" />
                </div>
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">No map yet</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[240px]">
                  This book hasn’t been mapped yet. Its concept maps are generated per chapter and will appear here once ready.
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Chapter picker — the graph is generated and read chapter by
                    chapter, so the reader navigates chapters rather than pages.
                    Defaults to the first chapter (see fetchChapters). */}
                <div className="px-3 py-2 flex items-center gap-2 border-b border-indigo-50 dark:border-indigo-900/20 shrink-0">
                  <select
                    value={selectedChapter ?? ""}
                    onChange={(e) => setSelectedChapter(e.target.value)}
                    aria-label="Choose a chapter to view its map"
                    className="flex-1 min-w-0 h-8 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/50 px-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  >
                    {chapters.map((c) => (
                      <option key={c.chapter} value={c.chapter}>
                        {c.chapter} · {c.nodeCount}
                      </option>
                    ))}
                  </select>
                  {network && network.nodes.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs gap-1 shrink-0"
                      onClick={enterFullscreen}
                      aria-label="View the map full screen"
                      title="Full screen"
                    >
                      <Maximize2 className="h-3 w-3" /> Full screen
                    </Button>
                  )}
                </div>
                <div className="flex-1 min-h-0">
                  {loadingNetwork ? (
                    <div className="h-full flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                    </div>
                  ) : network && network.nodes.length > 0 ? (
                    <GraphCanvas
                      nodes={network.nodes}
                      edges={network.edges}
                      /* No selectedId here: selecting a node opens the detail
                         branch above, which replaces this whole Tabs view, so the
                         map is never on screen with an entity selected. Hover
                         highlighting inside the canvas is self-contained. */
                      selectedId={null}
                      onNodeClick={openEntity}
                      isDarkMode={isDarkMode}
                    />
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center py-16 px-4 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mb-3 shadow-sm border border-indigo-100/50 dark:border-indigo-800/50">
                        <Waypoints className="h-7 w-7 text-indigo-400 dark:text-indigo-500" />
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[240px]">
                        No map for this chapter. Try another chapter above.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="entities" forceMount className="flex-1 flex flex-col min-h-0 data-[state=inactive]:hidden m-0">
            <div className="px-4 py-2 flex gap-1.5 flex-wrap border-b border-indigo-50/50 dark:border-indigo-900/20">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTypeFilter(null)}
                className={`h-7 text-xs rounded-full ${!typeFilter ? "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300" : "bg-white/50 text-slate-500"}`}
              >
                All
              </Button>
              {TYPE_FILTERS.map((t) => (
                <Button
                  key={t}
                  variant="outline"
                  size="sm"
                  onClick={() => setTypeFilter(t)}
                  className={`h-7 text-xs rounded-full capitalize gap-1 ${typeFilter === t ? "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300" : "bg-white/50 text-slate-500"}`}
                >
                  <EntityIcon type={t} className="h-3 w-3" /> {t}
                </Button>
              ))}
            </div>
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-2">
                {loadingEntities ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                  </div>
                ) : filteredEntities.length > 0 ? (
                  filteredEntities.map((entity) => (
                    <button
                      key={entity.id}
                      onClick={() => openEntity(entity.id)}
                      className="w-full text-left p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-colors flex items-start gap-2"
                    >
                      <EntityIcon type={entity.type} className="h-4 w-4 mt-0.5 text-indigo-500 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{entity.label}</div>
                        <div className="text-xs text-slate-500 line-clamp-2">{entity.description}</div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mb-4 shadow-sm border border-indigo-100/50 dark:border-indigo-800/50">
                      <Network className="h-8 w-8 text-indigo-400 dark:text-indigo-500" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">
                      {entitiesLoaded ? "No entities yet" : "Loading…"}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[220px]">
                      {entitiesLoaded
                        ? "This book hasn't been indexed for entity extraction yet, or extraction found nothing meaningful."
                        : ""}
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="summary" forceMount className="flex-1 flex flex-col min-h-0 data-[state=inactive]:hidden m-0">
            <div className="px-4 py-2 flex gap-1.5 border-b border-indigo-50/50 dark:border-indigo-900/20">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSummaryLevel("book")}
                className={`h-7 text-xs rounded-full ${summaryLevel === "book" ? "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300" : "bg-white/50 text-slate-500"}`}
              >
                Whole book
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSummaryLevel("chapter")}
                className={`h-7 text-xs rounded-full ${summaryLevel === "chapter" ? "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300" : "bg-white/50 text-slate-500"}`}
              >
                By chapter
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-3">
                {loadingSummary ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                  </div>
                ) : summaries.length > 0 ? (
                  summaries.map((community) => (
                    <div key={community.id} className="p-3.5 rounded-lg border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/30 dark:bg-indigo-900/10">
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-2.5">{community.summary}</p>
                      <div className="flex flex-wrap gap-1">
                        {community.members.slice(0, 6).map((m) => (
                          <button
                            key={m.id}
                            onClick={() => openEntity(m.id)}
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                          >
                            {m.label}
                          </button>
                        ))}
                        {community.members.length > 6 && (
                          <span className="text-[10px] text-slate-400 px-1.5 py-0.5">+{community.members.length - 6} more</span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mb-4 shadow-sm border border-indigo-100/50 dark:border-indigo-800/50">
                      <Network className="h-8 w-8 text-indigo-400 dark:text-indigo-500" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">No throughlines yet</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[220px]">
                      Throughlines need at least a couple of connected entities to summarize.
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      )}
    </div>

    {/* ── Full-screen "presentation" view ──────────────────────────────
        A fixed overlay above the drawer (z-[47]) and the dictionary modal
        (z-50), so the graph gets the whole viewport. Same GraphCanvas, so
        pan/zoom/drag/fit all carry over; clicking a node drops back to the
        drawer showing that entity's detail. */}
    {fullscreen && network && network.nodes.length > 0 && (
      <div
        ref={fsRef}
        className="fixed inset-0 z-[60] flex flex-col bg-white dark:bg-[var(--night-ink)]"
        role="dialog"
        aria-label="Book map, full screen"
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--accent-primary)]/15 dark:border-[var(--gold)]/10 shrink-0">
          <span className="text-sm font-bold tracking-tight text-[var(--accent-contrast)] dark:text-[var(--gold)] flex items-center gap-2">
            <Network className="h-4 w-4 text-[var(--accent-strong)] dark:text-[var(--accent-primary-dark)]" />
            {selectedChapter ? `Map · ${selectedChapter}` : "Book map"}
          </span>
          <Button variant="ghost" size="sm" onClick={exitFullscreen} className="gap-1.5" aria-label="Exit full screen">
            <Minimize2 className="h-4 w-4" /> Exit full screen
          </Button>
        </div>
        <div className="flex-1 min-h-0">
          <GraphCanvas
            nodes={network.nodes}
            edges={network.edges}
            selectedId={null}
            onNodeClick={(id) => {
              exitFullscreen();
              openEntity(id);
            }}
            isDarkMode={isDarkMode}
          />
        </div>
      </div>
    )}
    </>
  );
}
