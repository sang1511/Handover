function formatVNDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('vi-VN');
}

module.exports = { formatVNDate }; 