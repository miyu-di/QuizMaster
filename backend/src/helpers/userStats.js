const isBetterResult = require('./isBetterResult');

// Проходження вважаємо успішним, якщо правильних відповідей не менше половини.
// ТЗ не уточнює, що таке «успішне проходження», тому поріг винесено в константу.
const SUCCESS_THRESHOLD = 0.5;

function isSuccessfulResult({ correctAnswers, totalQuestions }) {
  return totalQuestions > 0 && correctAnswers / totalQuestions >= SUCCESS_THRESHOLD;
}

// У профілі зберігається один (найкращий) результат на тест, але через старі дані записів
// для одного тесту може бути кілька — залишаємо найкращий, щоб тест не рахувався двічі.
function bestResultPerQuiz(results) {
  const byQuiz = new Map();

  results.forEach((result) => {
    const key = String(result.quiz);
    const current = byQuiz.get(key);
    if (!current || isBetterResult(result, current)) {
      byQuiz.set(key, result);
    }
  });

  return [...byQuiz.values()];
}

// passedCount — кількість різних пройдених тестів;
// successRate — відсоток із них, де результат успішний (ціле число 0–100; 0, якщо тестів немає).
function calculateUserStats(results) {
  const best = bestResultPerQuiz(results);
  const passedCount = best.length;
  const successful = best.filter(isSuccessfulResult).length;

  return {
    passedCount,
    successRate: passedCount > 0 ? Math.round((successful / passedCount) * 100) : 0
  };
}

module.exports = { calculateUserStats, isSuccessfulResult, bestResultPerQuiz, SUCCESS_THRESHOLD };
