// Частка правильних відповідей; тест без питань (total = 0) вважаємо нульовим результатом.
function toScore({ correctAnswers, totalQuestions }) {
  return totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
}

// Новий результат кращий, лише якщо його частка правильних строго більша за поточну.
// Порівнюємо частки, а не абсолютні числа, бо кількість питань у тесті могла змінитися.
function isBetterResult(candidate, current) {
  return toScore(candidate) > toScore(current);
}

module.exports = isBetterResult;
