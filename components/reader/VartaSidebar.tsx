import { X,Send,Bot,User,StopCircle,WandSparkles,Download,BookOpen,Lightbulb,HelpCircle,AudioLines,Wand2,SquarePen } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs,TabsList,TabsTrigger,TabsContent } from "@/components/ui/tabs";
import { useBookChat,type DialogueMode,type Citation } from "@/hooks/useBookChat";
import { StartTrialButton } from "@/components/subscription/StartTrialButton";
import { useReaderStore } from "@/store/useReaderStore";
import { useAuthStore } from "@/store/useAuthStore";
import { VartaModeSelector } from "./VartaModeSelector";
import { VartaLanguageSelector } from "./VartaLanguageSelector";
import { useSanchikaStore } from "@/store/useSanchikaStore";
import { RecapContent } from "./DigestSidebar";
import { SimplifyContent } from "./SimplifySidebar";
import { panelShellClass } from "./panelShell";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { useEffect,useRef,useState } from "react";

type PanelTab = 'ask' | 'recap' | 'simplify';

/* The mode list now lives in VartaModeSelector, which owns both the switcher
   and the advisory suggestion. It used to be four pills rendered here.

   Openers for the empty state. Deliberately book-shaped rather than
   chapter-specific: Varta has no suggested-questions endpoint, so anything
   more specific would mean guessing at content. These work on any book, cost
   nothing to produce, and each one demonstrates a different capability —
   summarising, locating, and being tested. */
const CONVERSATION_STARTERS: { text: string; hint: string; icon: typeof BookOpen }[] = [
  {
    text: 'Summarise this chapter for me',
    hint: 'A short recap of the main ideas, with pages',
    icon: BookOpen,
  },
  {
    text: 'Explain the key idea on this page simply',
    hint: 'Plain language, grounded in the text',
    icon: Lightbulb,
  },
  {
    text: 'Quiz me on what I just read',
    hint: 'Switch to Quiz Me and Varta asks first',
    icon: HelpCircle,
  },
];

interface VartaSidebarProps {
  bookId: string;
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
  initialQuery?: string;
  onQueryCleared?: () => void;
  /** Rendered as the body of a Study drawer tab rather than as its own
      overlay — see components/reader/panelShell.ts. When embedded, the
      Recap and Simplify tabs are hoisted into the drawer's own tab bar
      (Digest) and the selection sheet (Simplify), so this renders the
      Ask panel alone rather than a tab bar inside a tab bar. */
  embedded?: boolean;
}

export function VartaSidebar({ bookId, isOpen, onClose, isDarkMode = false, initialQuery = '', onQueryCleared, embedded = false }: VartaSidebarProps) {
  const [mode, setMode] = useState<DialogueMode>('explain');
  const [panelTab, setPanelTab] = useState<PanelTab>('ask');
  const { messages, input, setInput, isLoading, error, trialRequired, sendMessage, stopGeneration, newSession } = useBookChat(bookId, mode);
  const { setCurrentPage } = useReaderStore();
  const { addNote } = useSanchikaStore();
  /* First name only. "Namaste, Deepak" reads like a person talking; the full
     legal name on the account does not. Falls back to an unnamed greeting
     rather than showing "Namaste, null" or an email local-part. */
  const { user } = useAuthStore();
  const greetingName = user?.name?.trim().split(/\s+/)[0] || '';
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen && initialQuery) {
      setInput(`Explain this context:\n"${initialQuery}"\n\n`);
      if (onQueryCleared) onQueryCleared();
    }
  }, [isOpen, initialQuery, setInput, onQueryCleared]);

  const handleCitationClick = (pageStr: string) => {
    const pageNum = parseInt(pageStr, 10);
    if (!isNaN(pageNum)) {
      setCurrentPage(pageNum);
    }
  };

  const handleExtractToSanchika = (content: string) => {
    addNote(bookId, content, `Varta Summary`);
  };

  /* The citation contract, client side.

     This used to match markdown links to `#page-N` — a format the backend
     never emitted. The prompt asked the model for `[cite:CHUNK_ID]`, so the
     pills never rendered and the raw markers showed up as prose. Both sides
     now speak numbered markers (see dialogue-policy.service.ts).

     A marker is rewritten into a link only when it resolves to a citation we
     were actually served, so a hallucinated `[9]` — or any `[n]` in a message
     rehydrated from history, which carries no page numbers — degrades to
     plain text rather than becoming a control that jumps nowhere. */
  const linkifyCitations = (
    content: string,
    byIndex: Map<number, Citation>,
    byChunkId: Map<string, Citation>,
  ) => {
    const pill = (cite: Citation | undefined) =>
      cite && cite.pageNumber != null && typeof cite.index === 'number'
        ? `[Pg. ${cite.pageNumber}](#varta-cite-${cite.index})`
        : null;

    return (
      content
        /* The retired `[cite:<citationId>]` format. Two populations emit it:
           conversations stored before the marker change, and any future model
           that reverts to the habit. Where the id resolves to a served
           citation we can still turn it into a real page pill — the id IS the
           chunkId — which is strictly better than discarding it. Where it does
           not resolve (all rehydrated history, which stores chunk ids without
           page numbers) it is dropped, because a bare uuid in the middle of a
           sentence is noise the reader cannot act on. */
        .replace(/\[cite:([^\]]+)\]/g, (_whole, id: string) => {
          return pill(byChunkId.get(id.trim())) ?? '';
        })
        /* The current format. Unresolvable numbers are left as written rather
           than linked, so a hallucinated [9] reads as text instead of becoming
           a control that jumps nowhere. */
        .replace(/\[(\d+)\]/g, (whole, n: string) => {
          return pill(byIndex.get(parseInt(n, 10))) ?? whole;
        })
        /* Stripping a marker can strand the space in front of it before
           punctuation ("intervention ."). Only touches gaps a removal made. */
        .replace(/ +([.,;:!?])/g, '$1')
    );
  };

  const renderMessageContent = (message: { content: string; citations?: Citation[] }) => {
    const cites = message.citations ?? [];
    const byIndex = new Map<number, Citation>(
      cites.filter((c) => typeof c.index === 'number').map((c) => [c.index as number, c]),
    );
    const byChunkId = new Map<string, Citation>(
      cites.filter((c) => c.chunkId).map((c) => [c.chunkId, c]),
    );

    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          a: ({ node, ...props }) => {
            const match = props.href?.match(/#varta-cite-(\d+)/);
            if (match) {
              const cite = byIndex.get(parseInt(match[1], 10));
              if (cite?.pageNumber != null) {
                return (
                  <button
                    onClick={() => handleCitationClick(String(cite.pageNumber))}
                    title={cite.textPreview ? `Page ${cite.pageNumber} — ${cite.textPreview}` : `Jump to page ${cite.pageNumber}`}
                    className="inline-flex items-center text-xs font-semibold px-1.5 py-0.5 mx-0.5 rounded-full bg-bb-grad-cobalt text-white shadow-[inset_0_1px_0_rgba(255,255,255,.4)] hover:brightness-110 transition-colors"
                  >
                    <BookOpen className="w-3 h-3 mr-1 inline" />
                    Pg. {cite.pageNumber}
                  </button>
                );
              }
            }
            return <a {...props} className="text-[#3B5BDB] dark:text-[#7D97FF] hover:underline" />;
          }
        }}
      >
        {linkifyCitations(message.content, byIndex, byChunkId)}
      </ReactMarkdown>
    );
  };

  /* The Ask panel is the whole of Varta when it is embedded in the
     Study drawer, and one of three tabs when it stands alone. Building
     it once as a value keeps the two callers from drifting. */
  const askPanel = (
    <div className="flex-1 flex flex-col min-h-0">
          {/* Top bar: start a fresh conversation (so a new question isn't buried
              under every previous one), and reach the dedicated activity hub. */}
          <div className="flex items-center justify-between px-3 pt-2 shrink-0">
            {messages.length > 0 ? (
              <button
                type="button"
                onClick={newSession}
                className="text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 flex items-center gap-1"
              >
                <SquarePen className="h-3 w-3" /> New chat
              </button>
            ) : (
              <span />
            )}
            <a
              href={`/varta?bookId=${bookId}`}
              className="text-[11px] font-medium text-indigo-600 dark:text-indigo-300 hover:underline flex items-center gap-1"
            >
              <WandSparkles className="h-3 w-3" /> My Varta activity
            </a>
          </div>

          {/* The formal chapter quiz used to mount HERE as well as in the Study
              drawer's own Quiz tab, so picking "Quiz Me" produced a second copy
              of a panel already one tab away — the same generated question bank
              under two different labels — and it claimed up to 45% of the
              panel height, which is what pushed the conversation out of view.

              Quiz Me is the CONVERSATIONAL mode: Varta asks a question in the
              thread and marks the reply, which is a different thing from the
              graded multi-question bank. Keeping the bank in the Quiz tab and
              the dialogue in the thread gives each one surface and gives the
              chat its full height back. */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6" ref={scrollRef}>
            {messages.length === 0 ? (
              /* Greeted, then given something to tap.
                 Ported from DigiClassroom's tutor, which opens with
                 "Namaste {name} 🙏" and a stack of quick-reply cards rather
                 than an empty composer. Feature adoption for in-app AI is
                 decided at the empty state: a blank textbox asks the student
                 to invent a question and phrase it well, and most will simply
                 close the panel. A named greeting plus three concrete openers
                 turns that into one tap.

                 The openers are deliberately book-shaped rather than
                 subject-specific — Varta has no suggested-questions endpoint,
                 and inventing chapter-specific prompts client-side would mean
                 guessing at content we would have to fetch. These work on any
                 book and cost nothing. */
              <div className="flex flex-col justify-center h-full px-1 py-8">
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--bb-info-soft)] dark:bg-[#7D97FF]/10 flex items-center justify-center mb-3 shadow-sm border border-[#3B5BDB]/25 dark:border-[#7D97FF]/20">
                    <Bot className="h-7 w-7 text-[#3B5BDB] dark:text-[#7D97FF]" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                    {greetingName ? `Namaste, ${greetingName}!` : 'Namaste!'}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-[19rem]">
                    I&apos;m <span className="font-semibold text-[var(--bb-info-ink)] dark:text-[#7D97FF]">Varta</span>.
                    I&apos;ve read this whole book — ask me anything about it, and I&apos;ll point you to the page.
                  </p>
                </div>

                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 mb-2">
                  Try asking
                </p>
                <div className="flex flex-col gap-2">
                  {CONVERSATION_STARTERS.map((s) => {
                    const Icon = s.icon;
                    return (
                      <button
                        key={s.text}
                        type="button"
                        onClick={() => setInput(s.text)}
                        className="flex items-start gap-3 w-full text-left px-3 py-2.5 rounded-xl border border-[#3B5BDB]/20 bg-[var(--bb-info-soft)]/40 hover:bg-[var(--bb-info-soft)] hover:border-[#3B5BDB]/40 active:scale-[0.99] transition-all duration-150 dark:border-[#7D97FF]/15 dark:bg-[#7D97FF]/[0.04] dark:hover:bg-[#7D97FF]/10"
                      >
                        <span className="mt-0.5 shrink-0 text-[#3B5BDB] dark:text-[#7D97FF]">
                          <Icon className="w-4 h-4" />
                        </span>
                        {/* min-w-0 + flex-1 is what lets these wrap inside a
                            flex row; without it the container grows and the
                            text clips instead. Same note DigiClassroom's
                            QuickReplyCard carries. */}
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200 whitespace-normal break-words">
                            {s.text}
                          </span>
                          <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed whitespace-normal break-words">
                            {s.hint}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`flex gap-3 ${m.role === 'USER' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-8 h-8 rounded-full flex shrink-0 items-center justify-center ${m.role === 'USER' ? 'bg-slate-200 dark:bg-slate-800' : 'bg-bb-orb shadow-[0_0_14px_rgba(91,124,255,.55)]'}`}>
                    {m.role === 'USER' ? <User className="w-4 h-4 text-slate-600 dark:text-slate-300" /> : null}
                  </div>
                  <div className={`flex flex-col gap-1 ${m.role === 'USER' ? 'max-w-[80%]' : 'max-w-[88%]'}`}>
                    <div className={`px-3.5 py-3 rounded-2xl text-sm ${
                      m.role === 'USER'
                        ? 'bg-bb-navy text-white rounded-tr-sm whitespace-pre-wrap break-words'
                        : 'bg-[var(--bb-info-soft)] dark:bg-[#7D97FF]/[0.07] border border-[#3B5BDB]/20 dark:border-[#7D97FF]/15 text-slate-800 dark:text-slate-200 rounded-tl-sm break-words prose prose-sm max-w-none dark:prose-invert prose-p:my-2.5 prose-p:leading-relaxed prose-headings:mt-4 prose-headings:mb-2 prose-headings:font-semibold prose-h1:text-base prose-h2:text-[15px] prose-h3:text-sm prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-li:marker:text-[#3B5BDB] dark:prose-li:marker:text-[#7D97FF] prose-strong:font-semibold prose-strong:text-slate-900 dark:prose-strong:text-white prose-code:text-[var(--bb-info-ink)] dark:prose-code:text-[#7D97FF] prose-code:bg-black/[0.06] dark:prose-code:bg-white/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:font-normal prose-code:before:content-[""] prose-code:after:content-[""] prose-pre:bg-slate-800 prose-pre:text-white prose-pre:rounded-lg prose-pre:p-3 prose-pre:overflow-x-auto prose-table:text-xs prose-table:my-2 prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1 prose-blockquote:border-l-[#3B5BDB] prose-blockquote:not-italic prose-hr:my-3 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden [&_.katex-display]:py-1'
                    }`}>
                      {m.role === 'ASSISTANT' ? renderMessageContent(m) : m.content}
                    </div>
                    {m.role === 'ASSISTANT' && m.weakConceptLabels && m.weakConceptLabels.length > 0 && (
                      <div
                        className="flex items-center gap-1.5 text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-full px-2.5 py-1 w-fit"
                        title="This answer was scaffolded because you haven't yet mastered these concepts"
                      >
                        <Lightbulb className="w-3 h-3 shrink-0" />
                        <span>Scaffolded for: {m.weakConceptLabels.join(', ')}</span>
                      </div>
                    )}
                    {m.role === 'ASSISTANT' && !isLoading && (
                      <div className="flex justify-end mt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExtractToSanchika(m.content)}
                          className="h-6 text-[10px] bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 border border-amber-200 dark:bg-slate-800 dark:text-amber-400 dark:border-slate-700"
                        >
                          <Download className="w-3 h-3 mr-1" /> Extract to Sanchika
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {trialRequired ? (
              <div className="p-4 rounded-xl border border-[#3B5BDB]/25 bg-[var(--bb-info-soft)] dark:bg-[#7D97FF]/[0.06]">
                <StartTrialButton variant="inline" />
              </div>
            ) : error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-200 text-center">
                {error}
              </div>
            )}
          </div>

          <div className="p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 shrink-0">
            {/* The mode pill belongs with the composer, not at the top of the
                panel. It describes what will happen to the message you are
                about to send, so it reads best immediately above the field —
                and moving it out of the header leaves nothing between the tab
                row and the conversation.

                Left-aligned deliberately: the right end of this stack is the
                send button, and a second control there competes with the one
                action the student is reaching for. The suggestion chip also
                grows leftward from here without ever colliding with send. */}
            <div className="flex items-center justify-start gap-2 mb-2 flex-wrap">
              <VartaModeSelector
                value={mode}
                onChange={setMode}
                disabled={isLoading}
                draftMessage={input}
              />
              {/* Saved answer-language preference (Phase 2). Sits beside the
                  mode pill because both describe how the next answer comes back;
                  it manages its own load/save. */}
              <VartaLanguageSelector disabled={isLoading} />
            </div>
            <form onSubmit={sendMessage} className="relative flex items-center">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Varta about the text..."
                className="pr-12 bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800 focus-visible:ring-[#3B5BDB] rounded-full h-11"
                disabled={isLoading}
              />
              <div className="absolute right-1">
                {isLoading ? (
                  <Button type="button" size="icon" variant="ghost" className="h-9 w-9 rounded-full text-red-500 hover:bg-red-50" onClick={stopGeneration}>
                    <StopCircle className="h-5 w-5" />
                  </Button>
                ) : (
                  <Button type="submit" size="icon" variant="cobalt" disabled={!input.trim()} className="h-9 w-9 rounded-full transition-all hover:scale-105 active:scale-95 disabled:opacity-50">
                    <Send className="h-4 w-4 ml-0.5" />
                  </Button>
                )}
              </div>
            </form>
          </div>
    </div>
  );

  /* Embedded: the Study drawer already provides the title, the close
     button and a tab bar. Recap is the drawer's Digest tab — under Notes,
     not here — and Simplify moved to the selection sheet (audit fix 1 and
     its feature table), so a second tab bar here would be a tab bar inside
     a tab bar naming two things that are elsewhere. */
  if (embedded) {
    return <div className={panelShellClass({ isOpen: true, embedded: true })}>{askPanel}</div>;
  }

  return (
    <div className={panelShellClass({ isOpen, width: 'w-96' })}>
      <div className="p-4 border-b border-[#3B5BDB]/15 dark:border-[#7D97FF]/10 flex flex-col gap-3 shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold tracking-tight text-[var(--bb-info-ink)] dark:text-[#7D97FF] flex items-center gap-2">
            <WandSparkles className="h-5 w-5 text-[#3B5BDB] dark:text-[#7D97FF]" />
            Varta
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close Varta" className="rounded-full">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
          Ask questions, get summaries, and extract notes instantly.
        </p>
      </div>

      <Tabs value={panelTab} onValueChange={(v) => setPanelTab(v as PanelTab)} className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid grid-cols-3 mx-4 mt-3 mb-0 p-1 rounded-xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50 shadow-sm shrink-0 h-10">
          <TabsTrigger value="ask" className="rounded-lg text-xs font-semibold data-[state=active]:bg-[#3B5BDB] data-[state=active]:text-white">Ask</TabsTrigger>
          <TabsTrigger value="recap" className="rounded-lg text-xs font-semibold flex items-center gap-1 data-[state=active]:bg-[#3B5BDB] data-[state=active]:text-white">
            <AudioLines className="w-3 h-3" /> Recap
          </TabsTrigger>
          <TabsTrigger value="simplify" className="rounded-lg text-xs font-semibold flex items-center gap-1 data-[state=active]:bg-[#3B5BDB] data-[state=active]:text-white">
            <Wand2 className="w-3 h-3" /> Simplify
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ask" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden">
          {askPanel}
        </TabsContent>

        <TabsContent value="recap" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
          <RecapContent bookId={bookId} isDarkMode={isDarkMode} />
        </TabsContent>

        <TabsContent value="simplify" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
          <SimplifyContent bookId={bookId} isDarkMode={isDarkMode} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
