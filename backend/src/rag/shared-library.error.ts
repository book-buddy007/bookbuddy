/**
 * A failure talking to the shared library, whichever app currently owns it (the library hub in
 * PDLMS, or DigiClassroom's older internal endpoints). Kept in its own file so the two clients and
 * the service that chooses between them do not import each other in a circle.
 */
export class SharedLibraryError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'SharedLibraryError';
  }

  /** A refusal (4xx) will be refused again; only a network or server failure is worth retrying. */
  get retryable(): boolean {
    return this.status === 0 || this.status >= 500;
  }
}
