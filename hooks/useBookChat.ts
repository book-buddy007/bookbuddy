import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/useAuthStore';

export interface Citation {
  /** 1-based, matching the `[n]` marker the model was shown and asked to cite.
      Absent on messages rehydrated from history, which store only chunk ids —
      the renderer treats an unresolvable marker as plain text. */
  index?: number;
  chunkId: string;
  qdrantPointId?: string;
  pageNumber?: number;
  chapterTitle?: string;
  textPreview?: string;
}

export interface ChatMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  citations?: Citation[];
  /** §2 mastery-aware retrieval — concepts this response was scaffolded for, if any. */
  weakConceptLabels?: string[];
  createdAt: string;
}

export type DialogueMode = 'explain' | 'quiz_me' | 'socratic' | 'debate';

export function useBookChat(bookId: string, mode: DialogueMode = 'explain') {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set when the backend refuses because the user has no active trial/subscription
  // (403 with reason 'TRIAL_REQUIRED'). Lets the panel show the "Start free trial"
  // CTA instead of a dead-end error.
  const [trialRequired, setTrialRequired] = useState(false);
  const { isAuthenticated } = useAuthStore();

  const abortControllerRef = useRef<AbortController | null>(null);

  // Load history on mount
  useEffect(() => {
    if (!bookId || !isAuthenticated) return;
    
    fetch(`/api/books/${bookId}/chat-history`, {
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          return res.json();
        }
        throw new Error("Response is not JSON");
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setMessages(
            data.map((m) => ({
              ...m,
              citations: m.citedChunkIds?.map((id: string) => ({ chunkId: id })),
            }))
          );
        }
      })
      .catch((err) => console.error('Failed to load chat history:', err));
  }, [bookId, isAuthenticated]);

  const sendMessage = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isLoading) return;

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'USER',
        content: input,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setIsLoading(true);
      setError(null);
      setTrialRequired(false);

      // Create abort controller for this stream
      abortControllerRef.current = new AbortController();

      const assistantMessageId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: 'ASSISTANT',
          content: '',
          createdAt: new Date().toISOString(),
        },
      ]);

      try {
        const url = new URL(`/api/books/${bookId}/chat`, window.location.origin);
        url.searchParams.append('q', userMessage.content);
        url.searchParams.append('mode', mode);

        const response = await fetch(url.toString(), {
          credentials: 'include',
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          // The AiFeatureGuard refuses an unentitled user with this code before
          // the stream starts — surface it as a CTA, not a generic error.
          if (errData.reason === 'TRIAL_REQUIRED') setTrialRequired(true);
          throw new Error(errData.message || errData.error || `HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let doneReading = false;

        if (!reader) throw new Error('No stream available');

        while (!doneReading) {
          const { value, done } = await reader.read();
          if (done) {
            doneReading = true;
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.replace('data: ', '').trim();
              if (!dataStr) continue;

              try {
                const data = JSON.parse(dataStr);
                
                if (data.error) {
                  // Render the failure INSIDE the assistant bubble instead of
                  // throwing — throwing left the pre-created empty bubble blank
                  // (the "blank answer" symptom) with the error only in a
                  // separate banner the user easily misses.
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId && !msg.content
                        ? { ...msg, content: 'Something went wrong answering that. Please try again.' }
                        : msg,
                    ),
                  );
                  doneReading = true;
                  break;
                }

                if (data.content !== undefined) {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? { ...msg, content: msg.content + data.content }
                        : msg
                    )
                  );
                }

                if (data.citations) {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? { ...msg, citations: data.citations }
                        : msg
                    )
                  );
                }

                if (data.weakConceptLabels?.length) {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? { ...msg, weakConceptLabels: data.weakConceptLabels }
                        : msg
                    )
                  );
                }

                if (data.done) {
                  doneReading = true;
                }
              } catch (e) {
                console.warn('Failed to parse SSE line:', line, e);
              }
            }
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.log('Chat stream aborted');
        } else {
          console.error('Chat stream error:', err);
          setError(err.message || 'An error occurred while communicating with AI.');
        }
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, bookId, mode]
  );

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  };

  /**
   * Start a fresh conversation: clear the visible thread and any in-flight
   * state. The server history is left intact (it's still in the activity hub
   * and reloads on a full page refresh) — this only resets the current view so
   * a new question isn't buried under every previous one. The history-load
   * effect keys on [bookId, isAuthenticated], so clearing here isn't undone
   * while the panel stays mounted.
   */
  const newSession = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
    setMessages([]);
    setInput('');
    setError(null);
    setTrialRequired(false);
  }, []);

  return {
    messages,
    input,
    setInput,
    isLoading,
    error,
    trialRequired,
    sendMessage,
    stopGeneration,
    newSession,
  };
}
