const {
  calculateUserStats,
  isSuccessfulResult,
  bestResultPerQuiz,
  SUCCESS_THRESHOLD
} = require('../src/helpers/userStats');

const result = (quiz, correctAnswers, totalQuestions) => ({ quiz, correctAnswers, totalQuestions });

describe('isSuccessfulResult', () => {
  it('treats the threshold itself as a success', () => {
    expect(SUCCESS_THRESHOLD).toBe(0.5);
    expect(isSuccessfulResult(result('a', 5, 10))).toBe(true);
    expect(isSuccessfulResult(result('a', 1, 2))).toBe(true);
  });

  it('is false below the threshold', () => {
    expect(isSuccessfulResult(result('a', 4, 10))).toBe(false);
    expect(isSuccessfulResult(result('a', 0, 10))).toBe(false);
  });

  it('is true for a perfect result and false for a quiz without questions', () => {
    expect(isSuccessfulResult(result('a', 10, 10))).toBe(true);
    expect(isSuccessfulResult(result('a', 0, 0))).toBe(false);
  });
});

describe('bestResultPerQuiz', () => {
  it('keeps one result per quiz: the best one regardless of order', () => {
    const best = bestResultPerQuiz([result('a', 2, 10), result('a', 8, 10), result('a', 5, 10), result('b', 1, 2)]);

    expect(best).toEqual([result('a', 8, 10), result('b', 1, 2)]);
  });

  it('compares shares, not absolute numbers', () => {
    const best = bestResultPerQuiz([result('a', 9, 20), result('a', 2, 3)]);

    expect(best).toEqual([result('a', 2, 3)]);
  });
});

describe('calculateUserStats', () => {
  it('returns zeros without results', () => {
    expect(calculateUserStats([])).toEqual({ passedCount: 0, successRate: 0 });
  });

  it('counts different quizzes and the share of successful ones', () => {
    const stats = calculateUserStats([result('a', 9, 10), result('b', 2, 10), result('c', 5, 10), result('d', 0, 4)]);

    expect(stats).toEqual({ passedCount: 4, successRate: 50 });
  });

  it('rounds the percentage to an integer', () => {
    const stats = calculateUserStats([result('a', 9, 10), result('b', 9, 10), result('c', 1, 10)]);

    expect(stats).toEqual({ passedCount: 3, successRate: 67 });
  });

  it('does not count a quiz twice when the profile has duplicate entries', () => {
    const stats = calculateUserStats([result('a', 1, 10), result('a', 9, 10)]);

    expect(stats).toEqual({ passedCount: 1, successRate: 100 });
  });

  it('gives 100 when every quiz is passed successfully', () => {
    expect(calculateUserStats([result('a', 10, 10), result('b', 6, 10)])).toEqual({ passedCount: 2, successRate: 100 });
  });
});
