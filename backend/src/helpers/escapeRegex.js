// Екранує спецсимволи, щоб пошуковий рядок користувача не працював як regex.
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = escapeRegex;
