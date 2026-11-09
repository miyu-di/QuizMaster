// Для кожного тесту лишає лише останній результат (за date; при рівності — той, що пізніше
// записаний у масиві) і повертає їх від найновішого до найстарішого.
function toTime(result) {
  return new Date(result.date).getTime() || 0;
}

function latestResults(results) {
  const byQuiz = new Map();

  results.forEach((result, index) => {
    const key = String(result.quiz);
    const time = toTime(result);
    const current = byQuiz.get(key);
    if (!current || time >= current.time) {
      byQuiz.set(key, { result, time, index });
    }
  });

  return [...byQuiz.values()]
    .sort((a, b) => b.time - a.time || b.index - a.index)
    .map((entry) => entry.result);
}

module.exports = latestResults;
