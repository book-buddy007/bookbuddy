import { useEffect,useState,useCallback,useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tabs,TabsList,TabsTrigger,TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { X,StickyNote,Highlighter,CircleUserRound,Trash2,FileDown,Loader2,BookA,BookOpen } from "@/components/ui/icons";
import { useAnnotationStore } from "@/store/useAnnotationStore";
import { formatDistanceToNow } from 'date-fns';
import { panelShellClass } from "./panelShell";
import { highlightColor,HIGHLIGHT_INK } from "./highlightPalette";

interface AnnotationSidebarProps {
  bookId: string;
  currentPage: number;
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
  /** Rendered as the body of a Study drawer tab rather than as its own
      overlay — see components/reader/panelShell.ts. */
  embedded?: boolean;
  /** Controlled Notes/Vocabulary selection. The Study drawer hoists these
      two into its own tab row (see StudyDrawer.tsx), so when it passes a
      value this component follows it and draws no top tab row of its own
      — two rows naming the same two things is what the drawer's IA exists
      to avoid. Standalone (no prop), it keeps its own row and state. */
  mainTab?: "notes" | "vocab";
}

export function AnnotationSidebar({ bookId, currentPage, isOpen, onClose, isDarkMode = false, embedded = false, mainTab: controlledMainTab }: AnnotationSidebarProps) {
  const {
    selectedAnnotation,
    visibleTypes,
    getBookAnnotations,
    getPageAnnotations,
    selectAnnotation,
    toggleAnnotationType,
    addReply,
    toggleShareAnnotation,
    deleteAnnotation
  } = useAnnotationStore();

  const [uncontrolledMainTab, setMainTab] = useState<"notes" | "vocab">("notes");
  const mainTab = controlledMainTab ?? uncontrolledMainTab;
  const [activeTab, setActiveTab] = useState<"page" | "all">("page");
  const [replyText, setReplyText] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const [vocabTab, setVocabTab] = useState<"book" | "all">("book");

  const [vocabEntries, setVocabEntries] = useState<any[]>([]);
  const [allVocabEntries, setAllVocabEntries] = useState<any[]>([]);
  const [isLoadingVocab, setIsLoadingVocab] = useState(false);

  const fetchVocab = useCallback(async () => {
    setIsLoadingVocab(true);
    try {
        // Fetch book-specific vocab
        const resBook = await fetch(`/api/dictionary/vocabulary?bookId=${bookId}`);
        if(resBook.ok) {
            try {
                const data = await resBook.json();
                setVocabEntries(data);
            } catch (jsonErr) {
                console.error("Book vocab JSON parse error", jsonErr);
            }
        }
        
        // Fetch all vocab for the user
        const resAll = await fetch(`/api/dictionary/vocabulary`);
        if(resAll.ok) {
            try {
                const data = await resAll.json();
                setAllVocabEntries(data);
            } catch (jsonErr) {
                console.error("All vocab JSON parse error", jsonErr);
            }
        }
    } catch (e) {
        console.error("Failed to fetch vocabulary", e);
    } finally {
        setIsLoadingVocab(false);
    }
  }, [bookId]);

  useEffect(() => {
    if (isOpen && mainTab === "vocab") {
         fetchVocab();
    }
  }, [isOpen, mainTab, fetchVocab]);

  // When page changes, switch to page tab
  useEffect(() => {
    setActiveTab("page");
  }, [currentPage]);

  // Book-wide and current page annotations
  const bookAnnotations = getBookAnnotations(bookId);
  const pageAnnotations = getPageAnnotations(bookId, currentPage);

  // Filter by visible types
  const filteredBookAnnotations = bookAnnotations.filter(a => visibleTypes.includes(a.type));
  const filteredPageAnnotations = pageAnnotations.filter(a => visibleTypes.includes(a.type));

  // Count by type for tab badges
  const typeCount = {
    highlight: bookAnnotations.filter(a => a.type === 'highlight').length,
    note: bookAnnotations.filter(a => a.type === 'note').length
  };

  /* Audit fix 7. Was the fourth definition of the same five highlight
     colours (Tailwind yellow-100/-900 here, three other palettes
     elsewhere), so a highlight in this list did not match the highlight
     in the text it came from. Reads highlightPalette.ts now, as a style
     rather than a class, because the palette is data Tailwind cannot
     see at build time. */
  const colorStyle = (color: string): React.CSSProperties => ({
    backgroundColor: highlightColor(color, isDarkMode),
    color: isDarkMode ? HIGHLIGHT_INK.dark : HIGHLIGHT_INK.light,
    borderColor: isDarkMode ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)',
  });

  // Handle reply submission
  const handleAddReply = () => {
    if (!selectedAnnotation || !replyText.trim()) return;

    addReply(selectedAnnotation.id, replyText);
    setReplyText(""); // Clear input after submission
  };

  // Handle annotation deletion with confirmation
  const handleDeleteAnnotation = (id: string) => {
    if (window.confirm("Are you sure you want to delete this annotation?")) {
      deleteAnnotation(id);
    }
  };

  // Get annotations to show based on active tab
  const displayedAnnotations = activeTab === "page"
    ? filteredPageAnnotations
    : filteredBookAnnotations;

  // Order annotations chronologically, most recent first
  const sortedAnnotations = [...displayedAnnotations].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const handleExportNotes = async () => {
    setIsExporting(true);
    try {
      if (bookAnnotations.length === 0) return;

      let markdown = `# Study Notes\n\n`;
      markdown += `*Exported on ${new Date().toLocaleDateString()}*\n\n---\n\n`;

      const sorted = [...bookAnnotations].sort((a, b) => {
        if (a.pageNumber !== b.pageNumber) return a.pageNumber - b.pageNumber;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

      let currentPage = -1;

      sorted.forEach((ann) => {
        if (ann.pageNumber !== currentPage) {
          markdown += `\n## Page ${ann.pageNumber}\n\n`;
          currentPage = ann.pageNumber;
        }

        let typeLabel = "📝 Note";
        if (ann.type === 'highlight') typeLabel = "🖍️ Highlight";
        else if (ann.type === 'bookmark') typeLabel = "🔖 Bookmark";

        markdown += `### ${typeLabel}\n\n`;

        if (ann.selectedText) {
          markdown += `> ${ann.selectedText.replace(/\n/g, '\n> ')}\n\n`;
        }

        if (ann.content) {
          markdown += `**Comment:** ${ann.content}\n\n`;
        }

        if (ann.replies && ann.replies.length > 0) {
          markdown += `**Replies:**\n`;
          ann.replies.forEach((reply) => {
            markdown += `- *${reply.userName}*: ${reply.content}\n`;
          });
          markdown += `\n`;
        }
        
        markdown += `---\n\n`;
      });

      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Study_Notes_${bookId}.md`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to generate export file. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const displayedVocab = vocabTab === "book" ? vocabEntries : allVocabEntries;

  // Group allVocabEntries by book title for the "All Words" view
  const groupedByBook = useMemo(() => {
    const groups: Record<string, { bookTitle: string; bookId: string | null; entries: any[] }> = {};
    for (const entry of allVocabEntries) {
      const bookTitle = entry.sourceBook?.title || 'Uncategorized';
      const bId = entry.bookId || '__uncategorized__';
      if (!groups[bId]) {
        groups[bId] = { bookTitle, bookId: entry.bookId, entries: [] };
      }
      groups[bId].entries.push(entry);
    }
    // Sort groups: categorized first (alphabetically), uncategorized last
    return Object.values(groups).sort((a, b) => {
      if (!a.bookId) return 1;
      if (!b.bookId) return -1;
      return a.bookTitle.localeCompare(b.bookTitle);
    });
  }, [allVocabEntries]);

  return (
    <div className={panelShellClass({ isOpen, embedded })}>
      {/* Embedded in the Study drawer, the drawer draws the title and the
          close button — a second header inside a tab is just noise. The
          export action is not chrome though, so it moves inline. */}
      {!embedded ? (
        <div className="p-4 border-b border-[var(--accent-primary)]/15 dark:border-[var(--bb-amber)]/10 flex flex-col gap-3 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold tracking-tight text-[var(--accent-contrast)] dark:text-[var(--bb-amber)] flex items-center gap-2">
              <Highlighter className="h-5 w-5 text-[var(--accent-strong)] dark:text-[var(--accent-primary-dark)]" />
              Annotations
            </h3>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleExportNotes}
                disabled={isExporting || bookAnnotations.length === 0}
                aria-label="Export notes as Markdown"
                className="rounded-full"
              >
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label="Close annotations"
                className="rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex justify-end px-4 pt-3 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExportNotes}
            disabled={isExporting || bookAnnotations.length === 0}
            className="h-8 text-xs gap-1.5"
          >
            {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
            Export
          </Button>
        </div>
      )}

      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as "notes" | "vocab")} className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Suppressed when the drawer drives the selection — see the
            `mainTab` prop. Radix still needs the Tabs root itself for the
            value plumbing, so only the trigger row goes. */}
        {!controlledMainTab && (
        <TabsList className="grid grid-cols-2 mx-4 mt-4 mb-2 p-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50 shadow-sm min-h-[44px]">
            <TabsTrigger
              value="notes"
              className="rounded-lg text-sm font-medium transition-all duration-300 data-[state=active]:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50 dark:data-[state=inactive]:text-slate-400"
            >Notes</TabsTrigger>
            <TabsTrigger
              value="vocab"
              className="rounded-lg text-sm font-medium transition-all duration-300 data-[state=active]:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50 dark:data-[state=inactive]:text-slate-400"
            >Vocabulary</TabsTrigger>
        </TabsList>
        )}

        <TabsContent value="notes" forceMount className="flex-1 flex flex-col min-h-0 data-[state=inactive]:hidden m-0">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "page" | "all")} className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <TabsList className="grid grid-cols-2 mx-4 my-2 p-1 rounded-lg bg-slate-100/50 dark:bg-slate-900/40">
              <TabsTrigger 
                value="page"
                className="rounded-md text-xs font-medium transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm data-[state=active]:text-indigo-700 dark:data-[state=active]:text-indigo-400"
              >Current Page</TabsTrigger>
              <TabsTrigger 
                value="all"
                className="rounded-md text-xs font-medium transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm data-[state=active]:text-indigo-700 dark:data-[state=active]:text-indigo-400"
              >All Pages</TabsTrigger>
            </TabsList>

            <div className="px-4 py-3 flex gap-2 border-b border-indigo-50/50 dark:border-indigo-900/20">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleAnnotationType('highlight')}
                className={`flex gap-1.5 items-center rounded-lg transition-all duration-300 font-medium ${
                  visibleTypes.includes('highlight') 
                  ? 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-800 shadow-sm' 
                  : 'bg-white/50 text-slate-500 border-slate-200 hover:bg-slate-50 dark:bg-slate-900/30 dark:border-slate-800 dark:hover:bg-slate-800'
                }`}
              >
                <Highlighter className="h-3.5 w-3.5" />
                <span>{typeCount.highlight}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleAnnotationType('note')}
                className={`flex gap-1.5 items-center rounded-lg transition-all duration-300 font-medium ${
                  visibleTypes.includes('note') 
                  ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800 shadow-sm' 
                  : 'bg-white/50 text-slate-500 border-slate-200 hover:bg-slate-50 dark:bg-slate-900/30 dark:border-slate-800 dark:hover:bg-slate-800'
                }`}
              >
                <StickyNote className="h-3.5 w-3.5" />
                <span>{typeCount.note}</span>
              </Button>
            </div>

            <TabsContent value="page" forceMount className="flex-1 min-h-0 data-[state=inactive]:hidden">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  {sortedAnnotations.length > 0 ? (
                    sortedAnnotations.map(annotation => (
                      <div
                        key={annotation.id}
                        style={colorStyle(annotation.color)}
                        className={`p-3 rounded-md border cursor-pointer transition-colors ${selectedAnnotation?.id === annotation.id ? 'ring-2 ring-[var(--accent-strong)]' : ''
                          }`}
                        onClick={() => selectAnnotation(annotation.id)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1">
                            {annotation.type === 'highlight' && <Highlighter className="h-3.5 w-3.5" />}
                            {annotation.type === 'note' && <StickyNote className="h-3.5 w-3.5" />}
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(annotation.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge
                              variant={annotation.isShared ? "default" : "outline"}
                              className="text-xs"
                            >
                              {annotation.isShared ? "Shared" : "Private"}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAnnotation(annotation.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </div>

                        {annotation.selectedText && (
                          <div className="text-sm mb-2 italic border-l-2 pl-2 line-clamp-2 border-primary/20">
                            &quot;{annotation.selectedText}&quot;
                          </div>
                        )}

                        {annotation.content && (
                          <div className="text-sm mb-1">
                            {annotation.content}
                          </div>
                        )}

                        <div className="text-xs text-muted-foreground flex items-center">
                          <CircleUserRound className="h-3 w-3 mr-1" />
                          {annotation.userName}
                        </div>

                        {/* Show toggle for sharing */}
                        {selectedAnnotation?.id === annotation.id && (
                          <div className="mt-2 pt-2 border-t flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Label htmlFor={`share-${annotation.id}`} className="text-xs">Share</Label>
                              <Switch
                                id={`share-${annotation.id}`}
                                checked={annotation.isShared}
                                onCheckedChange={() => toggleShareAnnotation(annotation.id)}
                              />
                            </div>
                          </div>
                        )}

                        {/* Show replies if any */}
                        {annotation.replies && annotation.replies.length > 0 && (
                          <div className="mt-2 pt-2 border-t">
                            <h4 className="text-xs font-medium mb-1">Replies</h4>
                            <div className="space-y-2">
                              {annotation.replies.map(reply => (
                                <div key={reply.id} className="text-xs p-2 bg-accent/40 rounded">
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium">{reply.userName}</span>
                                    <span className="text-muted-foreground">
                                      {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                                    </span>
                                  </div>
                                  <p>{reply.content}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Add reply option */}
                        {selectedAnnotation?.id === annotation.id && (
                          <div className="mt-2 pt-2 border-t">
                            <Textarea
                              placeholder="Add a reply..."
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              className="min-h-16 text-xs mb-1"
                            />
                            <Button
                              variant="default"
                              size="sm"
                              className="w-full"
                              disabled={!replyText.trim()}
                              onClick={handleAddReply}
                            >
                              Reply
                            </Button>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center h-full">
                      <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mb-4 shadow-sm border border-indigo-100/50 dark:border-indigo-800/50">
                        <Highlighter className="h-8 w-8 text-indigo-400 dark:text-indigo-500" />
                      </div>
                      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">
                        {activeTab === "page" ? "No annotations on this page" : "No annotations yet"}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[200px]">
                        Select text while reading to add highlights and notes.
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="all" forceMount className="flex-1 min-h-0 data-[state=inactive]:hidden">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  {sortedAnnotations.length > 0 ? (
                    sortedAnnotations.map(annotation => (
                      <div
                        key={annotation.id}
                        style={colorStyle(annotation.color)}
                        className={`p-3 rounded-md border cursor-pointer transition-colors ${selectedAnnotation?.id === annotation.id ? 'ring-2 ring-[var(--accent-strong)]' : ''
                          }`}
                        onClick={() => selectAnnotation(annotation.id)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1">
                            {annotation.type === 'highlight' && <Highlighter className="h-3.5 w-3.5" />}
                            {annotation.type === 'note' && <StickyNote className="h-3.5 w-3.5" />}
                            <span className="text-xs text-muted-foreground">
                              Page {annotation.pageNumber} - {formatDistanceToNow(new Date(annotation.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge
                              variant={annotation.isShared ? "default" : "outline"}
                              className="text-xs"
                            >
                              {annotation.isShared ? "Shared" : "Private"}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAnnotation(annotation.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </div>

                        {annotation.selectedText && (
                          <div className="text-sm mb-2 italic border-l-2 pl-2 line-clamp-2 border-primary/20">
                            &quot;{annotation.selectedText}&quot;
                          </div>
                        )}

                        {annotation.content && (
                          <div className="text-sm mb-1">
                            {annotation.content}
                          </div>
                        )}

                        <div className="text-xs text-muted-foreground flex items-center">
                          <CircleUserRound className="h-3 w-3 mr-1" />
                          {annotation.userName}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center h-full">
                      <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mb-4 shadow-sm border border-indigo-100/50 dark:border-indigo-800/50">
                        <Highlighter className="h-8 w-8 text-indigo-400 dark:text-indigo-500" />
                      </div>
                      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">
                        No annotations for this book
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[200px]">
                        Select text while reading to add highlights and notes.
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </TabsContent>
        
        {/* Vocabulary Content */}
        <TabsContent value="vocab" forceMount className="flex-1 flex flex-col min-h-0 data-[state=inactive]:hidden m-0">
          <Tabs value={vocabTab} onValueChange={(v) => setVocabTab(v as "book" | "all")} className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <TabsList className="grid grid-cols-2 mx-4 my-2">
              <TabsTrigger value="book">This Book</TabsTrigger>
              <TabsTrigger value="all">All Words</TabsTrigger>
            </TabsList>
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {isLoadingVocab ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : vocabTab === "book" ? (
                  /* ── "This Book" flat list ── */
                  displayedVocab.length > 0 ? (
                    displayedVocab.map(entry => (
                        <div key={entry.id} className="p-4 rounded-md border bg-card text-card-foreground shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-display font-bold text-lg text-primary capitalize flex items-center gap-2">
                                    <BookA className="w-4 h-4 text-primary/70" />
                                    {entry.word}
                                </h4>
                            </div>
                            <p className="text-sm border-l-2 border-muted pl-2 mb-3 text-foreground/90">
                                {entry.definition}
                            </p>
                            {entry.context && (
                                <div className="text-xs italic bg-muted/30 p-2 rounded text-muted-foreground">
                                    &ldquo;{entry.context}&rdquo;
                                </div>
                            )}
                        </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center h-full">
                      <div className="w-16 h-16 rounded-2xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center mb-4 shadow-sm border border-purple-100/50 dark:border-purple-800/50">
                        <BookA className="h-8 w-8 text-purple-400 dark:text-purple-500" />
                      </div>
                      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">
                        No Vocabulary Saved
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[200px] mt-1">
                        You haven&apos;t saved any vocabulary for this book yet. Highlight any word in the PDF and click the Define button.
                      </p>
                    </div>
                  )
                ) : (
                  /* ── "All Words" grouped by book title ── */
                  groupedByBook.length > 0 ? (
                    groupedByBook.map(group => (
                      <div key={group.bookId || '__uncategorized__'} className="space-y-2">
                        {/* Book Title Header */}
                        <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-primary/5 border border-primary/10 sticky top-0 z-10">
                          <BookOpen className="w-4 h-4 text-primary/60 shrink-0" />
                          <h3 className="font-semibold text-sm text-primary truncate flex-1">
                            {group.bookTitle}
                          </h3>
                          <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                            {group.entries.length}
                          </span>
                        </div>
                        {/* Words under this book */}
                        <div className="space-y-2 pl-2">
                          {group.entries.map(entry => (
                            <div key={entry.id} className="p-3 rounded-md border bg-card text-card-foreground shadow-sm">
                                <h4 className="font-display font-bold text-base text-primary capitalize flex items-center gap-2 mb-1">
                                    <BookA className="w-3.5 h-3.5 text-primary/70" />
                                    {entry.word}
                                </h4>
                                <p className="text-sm border-l-2 border-muted pl-2 mb-2 text-foreground/90">
                                    {entry.definition}
                                </p>
                                {entry.context && (
                                    <div className="text-xs italic bg-muted/30 p-2 rounded text-muted-foreground">
                                        &ldquo;{entry.context}&rdquo;
                                    </div>
                                )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center h-full">
                      <div className="w-16 h-16 rounded-2xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center mb-4 shadow-sm border border-purple-100/50 dark:border-purple-800/50">
                        <BookA className="h-8 w-8 text-purple-400 dark:text-purple-500" />
                      </div>
                      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">
                        No Vocabulary Saved
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[200px] mt-1">
                        You haven&apos;t saved any vocabulary across any books yet. Highlight words to start learning!
                      </p>
                    </div>
                  )
                )}
              </div>
            </ScrollArea>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
} 