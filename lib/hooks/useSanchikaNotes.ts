import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The reader's Sanchika notes, read from DigiClassroom through the backend
 * bridge (`backend/src/sanchika/`).
 *
 * Note what this hook does NOT send: any identity. `bookId` and `scope` are the
 * only inputs, and the backend derives whose notes to return from the session
 * cookie. A `subject` or `email` parameter here would be an open door.
 */

export interface SanchikaNote {
  id: string;
  title: string;
  content: string;
  contentFormat: string;
  subject: string | null;
  chapter: string | null;
  tags: string[];
  sourceType: string | null;
  sourceQuery: string | null;
  isFavorite: boolean;
  isPinned: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export type SanchikaScope = 'book' | 'all';

/**
 * `unconfigured` and `unlinked` are separate states on purpose. Both show zero
 * notes, but one means "this deployment has no bridge" and the other means
 * "you have no DigiClassroom account we can match you to" — and a student
 * seeing the wrong one of those two would go looking in the wrong place.
 */
export type SanchikaStatus = 'loading' | 'ready' | 'error' | 'unconfigured' | 'unlinked';

interface NotesResponse {
  notes: SanchikaNote[];
  linked: boolean;
  configured: boolean;
}

const POLL_MS = 30_000;

export function useSanchikaNotes({
  bookId,
  scope,
  enabled,
}: {
  bookId: string;
  scope: SanchikaScope;
  /** The panel is open. Closed panels neither fetch nor poll. */
  enabled: boolean;
}) {
  const [notes, setNotes] = useState<SanchikaNote[]>([]);
  const [status, setStatus] = useState<SanchikaStatus>('loading');

  // Guards against a slow response for the previous scope landing after a fast
  // response for the current one and overwriting it.
  const requestSeq = useRef(0);

  const fetchNotes = useCallback(async () => {
    const seq = ++requestSeq.current;
    const params = new URLSearchParams();
    if (scope === 'book' && bookId) params.set('bookId', bookId);

    try {
      const res = await fetch(`/api/proxy/sanchika/notes?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      if (seq !== requestSeq.current) return;

      if (!res.ok) {
        setStatus('error');
        return;
      }
      const data: NotesResponse = await res.json();
      if (seq !== requestSeq.current) return;

      setNotes(Array.isArray(data.notes) ? data.notes : []);
      if (!data.configured) setStatus('unconfigured');
      else if (!data.linked) setStatus('unlinked');
      else setStatus('ready');
    } catch {
      if (seq !== requestSeq.current) return;
      setStatus('error');
    }
  }, [bookId, scope]);

  // Refetch whenever the panel opens or the scope changes — a student who
  // switches to DCP, writes a note and switches back expects to see it, and
  // waiting out a poll interval reads as the feature being broken.
  useEffect(() => {
    if (!enabled) return;
    setStatus((s) => (s === 'ready' ? s : 'loading'));
    void fetchNotes();
  }, [enabled, fetchNotes]);

  // Poll only while open AND only while the tab is actually being looked at.
  // A reader left open in a background tab overnight would otherwise be 2,880
  // pointless queries against another app's database.
  useEffect(() => {
    if (!enabled) return;
    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      void fetchNotes();
    };
    const id = setInterval(tick, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void fetchNotes();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, fetchNotes]);

  return { notes, status, refresh: fetchNotes };
}
