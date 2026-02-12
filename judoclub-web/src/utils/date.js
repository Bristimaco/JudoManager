export function formatDateBE(ymd) {
  if (!ymd) return "-";
  const [y, m, d] = String(ymd).split("T")[0].split("-");
  if (!y || !m || !d) return "-";
  return `${d}-${m}-${y}`;
}
