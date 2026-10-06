/**
 * What may be put into the index shared with DigiClassroom and PDLMS.
 *
 * Nothing in that index can keep a book private. Its entries are written `public` when no
 * organisation is attached, DigiClassroom's own search does not filter on visibility, and
 * every app that reads it can see every passage. So the only safe rule is: a book goes in
 * only if it was meant for everyone.
 *
 *   - global catalogue only: an institution's own book (INSTITUTIONAL) belongs to that
 *     institution and must stay in Book Buddy's own index;
 *   - the publisher licence must permit AI use: a book shared across three apps is read and
 *     answered from by all of them.
 *
 * Returns null when the book may be shared, otherwise the reason, in words an admin can act on.
 */
export function sharedIndexBlocker(book: {
  title?: string | null;
  catalogScope?: string | null;
  licenseType?: string | null;
}): string | null {
  const name = book.title ? `"${book.title}"` : 'This book';
  if (book.catalogScope !== 'GLOBAL') {
    return (
      `${name} belongs to an institution (not the global catalogue), so it cannot go into the ` +
      `index shared with DigiClassroom and PDLMS: everything there is readable by every app. ` +
      `Index it in Book Buddy's own index instead (INGESTION_MODE=local), or publish it to the ` +
      `global catalogue first.`
    );
  }
  if (book.licenseType !== 'AI_PERMITTED') {
    return (
      `${name} is not licensed for AI use (licence: ${book.licenseType ?? 'unknown'}), so it ` +
      `cannot go into the shared index. Set the licence to AI_PERMITTED only after verifying the ` +
      `publisher agreement covers use by all three apps.`
    );
  }
  return null;
}
