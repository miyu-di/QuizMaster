function getSkip({ page, limit }) {
  return (page - 1) * limit;
}

// hasMore — чи є ще елементи після поточної порції. На останній порції (і за її межами) false.
function hasMorePages({ page, limit, total }) {
  return page * limit < total;
}

module.exports = { getSkip, hasMorePages };
