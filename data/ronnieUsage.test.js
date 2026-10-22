import {
  RONNIE_WEEKLY_LIMIT,
  addQuestion,
  isoWeekKey,
  mergeUsage,
  nextWeekStart,
  questionsThisWeek,
  remainingNotice,
  remainingQuestions,
  ronnieWeekOffMessage,
} from './ronnieUsage';

describe('isoWeekKey', () => {
  test('giver ISO-ugen i dansk tid', () => {
    expect(isoWeekKey(new Date('2026-10-22T12:00:00Z'))).toBe('2026-W43');
  });

  test('ugen skifter mandag kl. 00 dansk tid, ikke UTC', () => {
    // Søndag kl. 23:30 UTC er mandag kl. 00:30 i Danmark (vintertid).
    expect(isoWeekKey(new Date('2026-11-01T22:59:00Z'))).toBe('2026-W44');
    expect(isoWeekKey(new Date('2026-11-01T23:30:00Z'))).toBe('2026-W45');
    // Sommertid: mandag kl. 00 i Danmark er søndag kl. 22 UTC.
    expect(isoWeekKey(new Date('2026-06-14T21:59:00Z'))).toBe('2026-W24');
    expect(isoWeekKey(new Date('2026-06-14T22:00:00Z'))).toBe('2026-W25');
  });

  test('årsskiftet hører til den uge, der har torsdagen', () => {
    // 1. januar 2027 er en fredag og hører til uge 53 i 2026.
    expect(isoWeekKey(new Date('2027-01-01T12:00:00Z'))).toBe('2026-W53');
    // 29. december 2025 er en mandag i uge 1 i 2026.
    expect(isoWeekKey(new Date('2025-12-29T12:00:00Z'))).toBe('2026-W01');
  });
});

test('nextWeekStart er den kommende mandag', () => {
  expect(nextWeekStart(new Date('2026-10-22T12:00:00Z')).toISOString()).toBe(
    '2026-10-26T00:00:00.000Z',
  );
  // Fra en mandag er det mandagen ugen efter.
  expect(nextWeekStart(new Date('2026-10-26T08:00:00Z')).toISOString()).toBe(
    '2026-11-02T00:00:00.000Z',
  );
});

describe('tælleren', () => {
  const WEEK = '2026-W43';

  test('tæller kun spørgsmål fra denne uge', () => {
    expect(questionsThisWeek({ week: WEEK, count: 4 }, WEEK)).toBe(4);
    expect(questionsThisWeek({ week: '2026-W42', count: 29 }, WEEK)).toBe(0);
    expect(questionsThisWeek(null, WEEK)).toBe(0);
    expect(questionsThisWeek({ week: WEEK, count: 'x' }, WEEK)).toBe(0);
  });

  test('et spørgsmål lægger én til, og en ny uge starter forfra', () => {
    expect(addQuestion({ week: WEEK, count: 4 }, WEEK)).toEqual({ week: WEEK, count: 5 });
    expect(addQuestion({ week: '2026-W42', count: 30 }, WEEK)).toEqual({ week: WEEK, count: 1 });
  });

  test('databasen og telefonen lægges sammen, og det højeste tal vinder', () => {
    expect(mergeUsage({ week: WEEK, count: 3 }, { week: WEEK, count: 7 }, WEEK)).toEqual({
      week: WEEK,
      count: 7,
    });
    expect(mergeUsage(null, { week: '2026-W42', count: 7 }, WEEK)).toEqual({
      week: WEEK,
      count: 0,
    });
  });

  test('tilbage-tallet går aldrig under 0', () => {
    expect(remainingQuestions(null, WEEK)).toBe(RONNIE_WEEKLY_LIMIT);
    expect(remainingQuestions({ week: WEEK, count: 28 }, WEEK)).toBe(2);
    expect(remainingQuestions({ week: WEEK, count: 45 }, WEEK)).toBe(0);
  });
});

test('tilbage-tallet vises kun ved 5 eller færre', () => {
  expect(remainingNotice(6)).toBeNull();
  expect(remainingNotice(5)).toBe('Du har 5 spørgsmål tilbage til Ronnie i denne uge.');
  expect(remainingNotice(1)).toBe('Du har 1 spørgsmål tilbage til Ronnie i denne uge.');
  expect(remainingNotice(0)).toBeNull();
});

test('Ronnie holder fri og siger, hvornår han er tilbage', () => {
  const message = ronnieWeekOffMessage(new Date('2026-10-22T12:00:00Z'));
  expect(message).toContain('holder fri resten af ugen');
  expect(message).toContain('mandag den 26. oktober');
  expect(message).toContain(`${RONNIE_WEEKLY_LIMIT} spørgsmål`);
});
