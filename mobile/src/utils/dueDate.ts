/**
 * Due-date helpers for the borrowing shelf.
 *
 * Comparison is done on calendar days, not elapsed milliseconds: a book due
 * "tomorrow" should read as 1 day left all through today, not flip to 0 once
 * 24 hours have passed since the borrow timestamp.
 */

export type DueState = 'overdue' | 'due-today' | 'due-soon' | 'ok';

/** Days between today and the due date. Negative when overdue. */
export function daysUntilDue(dueDate: string | Date): number {
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((due.getTime() - today.getTime()) / msPerDay);
}

export function dueState(dueDate: string | Date): DueState {
  const days = daysUntilDue(dueDate);
  if (days < 0) return 'overdue';
  if (days === 0) return 'due-today';
  if (days <= 3) return 'due-soon';
  return 'ok';
}

/** Short human label for a due chip. */
export function dueLabel(dueDate: string | Date): string {
  const days = daysUntilDue(dueDate);

  if (days < -1) return `${Math.abs(days)} days overdue`;
  if (days === -1) return 'A day overdue';
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days <= 30) return `${days} days left`;

  return `Due ${new Date(dueDate).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  })}`;
}
