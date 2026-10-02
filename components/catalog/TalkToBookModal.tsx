'use client';

import { useEffect,useRef } from 'react';
import { useBookChat } from '@/hooks/useBookChat';
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send,StopCircle,BookOpen } from '@/components/ui/icons';
import clsx from 'clsx';
import ReactMarkdown from 'react-markdown';

interface TalkToBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookId: string;
  bookTitle: string;
}

export function TalkToBookModal({ isOpen, onClose, bookId, bookTitle }: TalkToBookModalProps) {
  const { messages, input, setInput, isLoading, error, sendMessage, stopGeneration } = useBookChat(bookId);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b bg-muted/30">
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            Talk to Book: <span className="text-muted-foreground font-normal ml-1 truncate max-w-[300px]">{bookTitle}</span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            AI-powered chat interface allowing you to ask questions directly about the contents of the book.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="flex flex-col gap-4 pb-4">
            {messages.length === 0 && !error && (
              <div className="text-center text-muted-foreground mt-10">
                <p>Hello! I am ready to answer questions about <strong>{bookTitle}</strong>.</p>
                <p className="text-sm mt-2">Ask me anything about the contents, themes, or specific details.</p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={clsx(
                  'flex w-max max-w-[85%] flex-col gap-2 rounded-lg px-4 py-3 text-sm',
                  msg.role === 'USER'
                    ? 'ml-auto bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {msg.role === 'USER' ? (
                    <p className="whitespace-pre-wrap m-0">{msg.content}</p>
                  ) : (
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  )}
                </div>

                {/* Citations Badges */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-border/50">
                    {msg.citations.map((cite, idx) => (
                      <div
                        key={idx}
                        className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold font-mono transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 cursor-help"
                        title={cite.textPreview || "Citation reference"}
                      >
                        [cite:{cite.chunkId.substring(0, 6)}]
                        {cite.pageNumber ? ` pg.${cite.pageNumber}` : ''}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md text-center">
                {error}
              </div>
            )}
            
            {isLoading && messages[messages.length - 1]?.role !== 'ASSISTANT' && (
               <div className="flex w-max max-w-[75%] flex-col gap-2 rounded-lg px-4 py-3 text-sm bg-muted animate-pulse">
                 Scanning book contents...
               </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t bg-background">
          <form
            onSubmit={sendMessage}
            className="flex w-full items-center space-x-2"
          >
            <Input
              type="text"
              placeholder="Ask anything about this book..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              className="flex-1"
            />
            {isLoading ? (
              <Button type="button" size="icon" variant="destructive" onClick={stopGeneration} disabled={!isLoading}>
                <StopCircle className="h-4 w-4" />
                <span className="sr-only">Stop generation</span>
              </Button>
            ) : (
              <Button type="submit" size="icon" disabled={!input.trim() || isLoading}>
                <Send className="h-4 w-4" />
                <span className="sr-only">Send message</span>
              </Button>
            )}
          </form>
          <div className="text-xs text-center text-muted-foreground mt-2">
            Talk-to-Book AI relies strictly on context extracted from the document.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
