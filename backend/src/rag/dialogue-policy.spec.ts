import { countSessionTurns } from './dialogue-policy.service';

/**
 * The behaviour these pin is the one the previous implementation got wrong:
 * it counted every Socratic assistant turn a student had ever taken on a book,
 * so once three existed the turn number could only ever exceed the maximum and
 * the mode degraded to a direct explanation permanently. "resets after a real
 * break" is the assertion that would have failed before this change.
 */
describe('countSessionTurns', () => {
  const GAP = 30 * 60_000;
  const at = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000);

  // getRecentModeMessages returns newest-first; these fixtures match that.
  const turn = (minutesAgo: number) => [
    { role: 'ASSISTANT', createdAt: at(minutesAgo) },
    { role: 'USER', createdAt: at(minutesAgo) },
  ];

  it('counts nothing for an empty history', () => {
    expect(countSessionTurns([], GAP)).toBe(0);
  });

  it('counts assistant turns within one continuous session', () => {
    const msgs = [...turn(1), ...turn(5), ...turn(9)];
    expect(countSessionTurns(msgs, GAP)).toBe(3);
  });

  it('ignores user messages when counting turns', () => {
    const msgs = [
      { role: 'ASSISTANT', createdAt: at(1) },
      { role: 'USER', createdAt: at(2) },
      { role: 'USER', createdAt: at(3) },
    ];
    expect(countSessionTurns(msgs, GAP)).toBe(1);
  });

  it('resets after a real break — the permanent-degradation bug', () => {
    // Three turns yesterday, then one just now. The student came back with a
    // new question; that is turn one of a new line, not turn four of an old.
    const msgs = [...turn(1), ...turn(1500), ...turn(1505), ...turn(1510)];
    expect(countSessionTurns(msgs, GAP)).toBe(1);
  });

  it('stops at the FIRST break, not the largest', () => {
    const msgs = [...turn(1), ...turn(5), ...turn(600), ...turn(605)];
    expect(countSessionTurns(msgs, GAP)).toBe(2);
  });

  it('treats a gap exactly at the threshold as still the same session', () => {
    const msgs = [
      { role: 'ASSISTANT', createdAt: new Date(1_000_000) },
      { role: 'ASSISTANT', createdAt: new Date(1_000_000 - GAP) },
    ];
    expect(countSessionTurns(msgs, GAP)).toBe(2);
  });

  it('ends the session one millisecond past the threshold', () => {
    const msgs = [
      { role: 'ASSISTANT', createdAt: new Date(1_000_000) },
      { role: 'ASSISTANT', createdAt: new Date(1_000_000 - GAP - 1) },
    ];
    expect(countSessionTurns(msgs, GAP)).toBe(1);
  });

  it('never exceeds the budget within a session, so the fallback still fires', () => {
    const msgs = [...turn(1), ...turn(3), ...turn(5), ...turn(7), ...turn(9)];
    expect(countSessionTurns(msgs, GAP)).toBe(5); // > SOCRATIC_MAX_TURNS (3)
  });
});
