/** The slice of a BullMQ job this needs; kept structural so it is testable without a queue. */
export interface JobLike {
  getState(): Promise<string>;
  progress?: unknown;
  timestamp?: number;
  finishedOn?: number;
}

const IN_FLIGHT = ['active', 'waiting', 'delayed', 'prioritized', 'waiting-children'];

/**
 * A book can have two kinds of job: embedding it (`embed-<id>`) and linking it to a work already in
 * the shared library (`link-<id>`). The progress dialog should follow whichever is happening, or
 * else whichever happened last, so a link never looks like "nothing running".
 *
 * Returns the state and 0-100 progress of the chosen job, or nulls when there is none.
 */
export async function pickRelevantJob(
  jobs: Array<JobLike | null | undefined>,
): Promise<{ state: string | null; progress: number | null }> {
  const present = jobs.filter((j): j is JobLike => !!j);
  if (present.length === 0) return { state: null, progress: null };

  const withState = await Promise.all(
    present.map(async (job) => ({ job, state: await job.getState() })),
  );
  const recency = (j: JobLike) => j.finishedOn ?? j.timestamp ?? 0;

  const running = withState.filter((x) => IN_FLIGHT.includes(x.state));
  const pool = running.length > 0 ? running : withState;
  const chosen = pool.reduce((best, cur) => (recency(cur.job) > recency(best.job) ? cur : best));

  const raw = chosen.job.progress;
  return { state: chosen.state, progress: typeof raw === 'number' ? raw : null };
}
