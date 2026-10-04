"use client"

import * as React from "react"
import Link from "next/link"
import type { useBookChat, Citation, DialogueMode } from "@/hooks/useBookChat"
import { cn } from "@/lib/utils"
import { Icon } from "@/components/ui/icon"
import { Button } from "@/components/ui/button"
import { Segmented } from "@/components/ui/segmented"
import { Chip } from "@/components/ui/chip"
import { CitationChip, VartaMessage, VartaOrb } from "@/components/ui/varta"
import { StartTrialButton } from "@/components/subscription/StartTrialButton"
import { ChapterQuizContent } from "@/components/reader/QuizSidebar"
import { VartaMarkdown } from "@/components/varta/varta-markdown"
import { VartaSourcePanel, citationLabel } from "@/components/varta/varta-source-panel"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { VartaBook } from "@/components/varta/use-varta-data"

export interface ActiveCitation {
  messageId: string
  index: number
}

const MODES: { value: DialogueMode; label: string }[] = [
  { value: "explain", label: "Explain" },
  { value: "socratic", label: "Socratic" },
  { value: "debate", label: "Debate" },
  { value: "quiz_me", label: "Quiz me" },
]

const SUGGESTIONS: { label: string; text: string; mode?: DialogueMode }[] = [
  { label: "Explain simpler", text: "Explain that again in simpler words." },
  { label: "Explain in Hindi", text: "Explain this in Hindi." },
  { label: "Make flashcards", text: "Make 5 flashcards from what we just discussed." },
  { label: "Next question", text: "Quiz me on what I just read.", mode: "quiz_me" },
]

export type BookChat = ReturnType<typeof useBookChat>

interface VartaChatProps {
  chat: BookChat
  mode: DialogueMode
  onModeChange: (m: DialogueMode) => void
  bookId: string
  book: VartaBook | undefined
  books: VartaBook[]
  onSelectBook: (id: string) => void
  onOpenHistory: () => void
  backHref: string
  active: ActiveCitation | null
  onActiveChange: (a: ActiveCitation | null) => void
}

/** The conversation column: header (scope + textbook-only badge), thread, suggestions, composer. */
export function VartaChat({ chat, mode, onModeChange, bookId, book, books, onSelectBook, onOpenHistory, backHref, active, onActiveChange }: VartaChatProps) {
  const { messages, input, setInput, isLoading, error, trialRequired, sendMessage, stopGeneration, newSession } = chat
  const [showQuiz, setShowQuiz] = React.useState(false)
  const [listening, setListening] = React.useState(false)
  const formRef = React.useRef<HTMLFormElement>(null)
  const endRef = React.useRef<HTMLDivElement>(null)
  const pendingSend = React.useRef(false)
  const recognitionRef = React.useRef<any>(null)

  // Auto-scroll as the answer streams in.
  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages])

  // Suggestion chips set the input and then submit once React has applied it.
  React.useEffect(() => {
    if (pendingSend.current && input) {
      pendingSend.current = false
      formRef.current?.requestSubmit()
    }
  }, [input, mode])

  const send = (text: string, nextMode?: DialogueMode) => {
    if (isLoading) return
    pendingSend.current = true
    if (nextMode && nextMode !== mode) onModeChange(nextMode)
    setInput(text)
  }

  const speechSupported =
    typeof window !== "undefined" && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)

  const toggleMic = () => {
    if (listening) {
      recognitionRef.current?.stop()
      return
    }
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!Ctor) return
    const rec = new Ctor()
    rec.lang = "en-IN"
    rec.interimResults = false
    rec.onresult = (e: any) => setInput((prev: string) => `${prev}${prev ? " " : ""}${e.results[0][0].transcript}`.trim())
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recognitionRef.current = rec
    setListening(true)
    rec.start()
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-bb-bg">
      {/* Header */}
      <header className="shrink-0 border-b border-bb-border bg-bb-surface px-4 pb-3 pt-[calc(0.75rem+var(--bb-safe-top))] sm:px-6">
        <div className="flex items-center gap-2">
          <Link
            href={backHref}
            aria-label="Back"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-bb-surface-2 focus-visible:outline-none focus-visible:shadow-focus"
          >
            <Icon name="chevron-left" size={22} fillLayer={false} />
          </Link>
          <VartaOrb size={32} />
          <h1 className="font-display text-xl font-extrabold tracking-[-0.03em]">Varta</h1>
          <div className="ml-auto flex items-center gap-1 lg:hidden">
            <button
              type="button"
              onClick={onOpenHistory}
              aria-label="Chat history"
              className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-bb-surface-2 focus-visible:outline-none focus-visible:shadow-focus"
            >
              <Icon name="contents" size={22} />
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex h-9 max-w-full items-center gap-2 rounded-full bg-bb-surface-2 px-3.5 text-sm font-semibold focus-visible:outline-none focus-visible:shadow-focus"
              >
                <Icon name="read" size={16} />
                <span className="truncate">{book?.title ?? "Choose a book"}</span>
                <Icon name="chevron-down" size={14} fillLayer={false} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-80 w-72 overflow-y-auto">
              {books.map((b) => (
                <DropdownMenuItem key={b.id} onSelect={() => onSelectBook(b.id)} className={cn(b.id === bookId && "font-semibold text-bb-accent-ink")}>
                  <span className="truncate">{b.title}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <span className="inline-flex h-9 items-center rounded-full bg-bb-info-soft px-3 text-xs font-bold text-bb-info-ink">
            Strict · from this book
          </span>
        </div>
      </header>

      {/* Thread */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-5">
          {messages.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <VartaOrb size={56} />
              <h2 className="font-display text-2xl font-extrabold tracking-[-0.03em]">Ask anything about {book?.title ?? "your book"}</h2>
              <p className="max-w-md text-sm text-bb-muted">
                Varta answers from the pages of your textbook and shows you the passage it used.
              </p>
            </div>
          )}

          {messages.map((m) => {
            if (m.role === "USER") return <VartaMessage key={m.id} role="user">{m.content}</VartaMessage>
            const cites = (m.citations ?? []).filter((c): c is Citation & { index: number } => typeof c.index === "number" && c.pageNumber != null)
            const activeHere = active?.messageId === m.id ? cites.find((c) => c.index === active.index) : undefined
            return (
              <VartaMessage
                key={m.id}
                citations={
                  cites.length > 0
                    ? cites.map((c) => (
                        <CitationChip
                          key={c.chunkId}
                          label={citationLabel(c)}
                          active={active?.messageId === m.id && active.index === c.index}
                          onClick={() =>
                            onActiveChange(active?.messageId === m.id && active.index === c.index ? null : { messageId: m.id, index: c.index })
                          }
                        />
                      ))
                    : undefined
                }
              >
                {m.content ? (
                  <VartaMarkdown
                    content={m.content}
                    citations={m.citations}
                    activeIndex={active?.messageId === m.id ? active.index : null}
                    onCite={(index) => onActiveChange({ messageId: m.id, index })}
                  />
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-bb-muted" role="status">
                    <Icon name="loader" size={16} className="animate-spin" fillLayer={false} /> Thinking…
                  </span>
                )}
                {/* tablet/phone: the excerpt sits inline in the answer; the desktop panel handles xl+ */}
                {activeHere && (
                  <div className="xl:hidden">
                    <VartaSourcePanel
                      variant="inline"
                      citation={activeHere}
                      others={cites.filter((c) => c.index !== activeHere.index)}
                      bookId={bookId}
                      onSelect={(index) => onActiveChange({ messageId: m.id, index })}
                    />
                  </div>
                )}
              </VartaMessage>
            )
          })}

          {mode === "quiz_me" && showQuiz && (
            <section className="rounded-bb-lg bg-bb-surface p-5 shadow-e1">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.1em] text-bb-accent-ink">Quick check</p>
              <ChapterQuizContent bookId={bookId} />
            </section>
          )}

          {trialRequired ? (
            <div className="rounded-2xl bg-bb-accent-soft p-4">
              <StartTrialButton variant="inline" />
            </div>
          ) : (
            error && (
              <p role="alert" className="rounded-2xl bg-bb-danger-soft p-3 text-center text-sm text-bb-danger-ink">
                {error}
              </p>
            )
          )}
          <div ref={endRef} />
        </div>
      </div>

      {/* Suggestions + composer */}
      <div className="shrink-0 border-t border-bb-border bg-bb-surface px-4 pb-[calc(0.75rem+var(--bb-safe-bottom))] pt-3 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-3">
          <div className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
            {SUGGESTIONS.map((s) => (
              <Chip
                key={s.label}
                className="h-9 shrink-0 px-4 text-sm"
                onClick={() => {
                  if (s.mode === "quiz_me") setShowQuiz(true)
                  send(s.text, s.mode)
                }}
                disabled={isLoading}
              >
                {s.label}
              </Chip>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3">
            <Segmented size="sm" aria-label="Varta mode" value={mode} onValueChange={onModeChange} options={MODES} className="max-w-full overflow-x-auto" />
            {messages.length > 0 && (
              <button type="button" onClick={newSession} className="hidden shrink-0 text-[13px] font-semibold text-bb-accent-ink hover:underline sm:block">
                New chat
              </button>
            )}
          </div>
          <form ref={formRef} onSubmit={sendMessage} className="flex items-end gap-2 rounded-[26px] border-[1.5px] border-transparent bg-bb-surface-2 p-1.5 pl-4 transition-[border-color,box-shadow] focus-within:border-bb-cobalt-light focus-within:shadow-focus">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  formRef.current?.requestSubmit()
                }
              }}
              rows={1}
              aria-label="Ask Varta"
              placeholder="Ask about this chapter…"
              className="max-h-32 min-h-11 flex-1 resize-none bg-transparent py-2.5 text-[15px] placeholder:text-bb-faint focus:outline-none focus-visible:shadow-none"
            />
            {speechSupported && (
              <button
                type="button"
                onClick={toggleMic}
                aria-label={listening ? "Stop dictation" : "Dictate"}
                aria-pressed={listening}
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-bb-surface-2 focus-visible:outline-none focus-visible:shadow-focus",
                  listening && "bg-bb-accent-soft"
                )}
              >
                <Icon name="mic" size={22} />
              </button>
            )}
            {isLoading ? (
              <Button type="button" size="icon-md" variant="secondary" onClick={stopGeneration} aria-label="Stop">
                <Icon name="square" size={18} fillLayer={false} />
              </Button>
            ) : (
              <Button type="submit" variant="cobalt" size="icon-md" disabled={!input.trim()} aria-label="Send">
                <Icon name="arrow-right" size={18} />
              </Button>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
