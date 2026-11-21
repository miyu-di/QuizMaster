const isBetterResult = require('../src/helpers/isBetterResult');

const result = (correctAnswers, totalQuestions) => ({ correctAnswers, totalQuestions });

describe('isBetterResult', () => {
  it('is true when the share of correct answers is higher', () => {
    expect(isBetterResult(result(8, 10), result(7, 10))).toBe(true);
  });

  it('is false for an equal or a lower result', () => {
    expect(isBetterResult(result(7, 10), result(7, 10))).toBe(false);
    expect(isBetterResult(result(6, 10), result(7, 10))).toBe(false);
  });

  it('compares shares, not absolute numbers, when the number of questions differs', () => {
    expect(isBetterResult(result(2, 3), result(5, 10))).toBe(true);
    expect(isBetterResult(result(6, 20), result(5, 10))).toBe(false);
  });

  it('treats a stored result without questions as zero', () => {
    expect(isBetterResult(result(1, 5), result(0, 0))).toBe(true);
    expect(isBetterResult(result(0, 5), result(0, 0))).toBe(false);
  });
});
