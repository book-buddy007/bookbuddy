/**
 * Which books may be removed from Book Buddy at all.
 *
 * A book that lives in the shared library (DigiClassroom's) is not Book Buddy's to delete: its
 * files and its embeddings are read by PDLMS and DigiClassroom too, and Book Buddy's purge removes
 * a book's files from storage by key. So Book Buddy has no way to move such a book to the Bin,
 * purge it, or delete one of its files. Removing a shared book is done in DigiClassroom, the only
 * app that owns it.
 *
 * "Shared" means the book records a work in the shared library (`spineContentItemId`). A book that
 * lives only in Book Buddy's own index and bucket is unaffected.
 */
export type BookRemovalAction = 'bin' | 'purge' | 'delete-file' | 'replace-file';

const REFUSAL: Record<BookRemovalAction, string> = {
  bin: 'be moved to the Bin',
  purge: 'be permanently deleted',
  'delete-file': 'have its files deleted',
  // Replacing a file deletes the old one, so it is held to the same rule.
  'replace-file': 'have its files replaced',
};

/**
 * Null when the action is allowed, otherwise the reason, in words an admin can act on.
 */
export function bookRemovalBlocker(
  book: { title?: string | null; spineContentItemId?: string | null },
  action: BookRemovalAction,
): string | null {
  if (!book.spineContentItemId) return null;
  const name = book.title ? `"${book.title}"` : 'This book';
  return (
    `${name} belongs to the shared library, which DigiClassroom owns, so it cannot ${REFUSAL[action]} ` +
    `from Book Buddy: its files and embeddings are used by the other apps too. ` +
    `Remove it in DigiClassroom. To stop showing it here, make it unavailable instead.`
  );
}
