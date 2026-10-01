import { redirect } from 'next/navigation';

/* ── /player is now /player/v2 (audit fix 8) ───────────────────────────
   Four surfaces played audio and none of them looked related: this page,
   /player/v2, FloatingAudioPlayer and TTSControlBar. This one — 814
   lines and its own 957-line stylesheet — was also the only one running
   on `@/data/mockAudiobooks`: the sidebar's "Audiobook Player" link
   opened a fully functional player for a book that does not exist in the
   catalogue, The Great Gatsby, complete with fake chapters.

   v2 is the real one. It reads the audiobook structure from
   /audiobooks/:id/structure, presigns each section, and syncs progress.
   So this route redirects rather than being maintained in parallel, and
   the query string is carried across so an existing /player?bookId=…
   link keeps working.

   The v1 component and player.module.css are deleted in the same change;
   git history is where to find them if the waveform styling is ever
   wanted back. */
export default async function PlayerRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') qs.set(key, value);
    else if (Array.isArray(value) && value[0]) qs.set(key, value[0]);
  }
  const query = qs.toString();
  redirect(query ? `/player/v2?${query}` : '/player/v2');
}
