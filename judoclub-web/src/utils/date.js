export function formatDateBE(ymd) {
  if (!ymd) return "-";

  try {
    const dateStr = String(ymd).split("T")[0];
    const [y, m, d] = dateStr.split("-");

    // Validate that we have all 3 parts and they're numeric
    if (!y || !m || !d || y.length !== 4 || m.length !== 2 || d.length !== 2) {
      return "-";
    }

    return `${d}-${m}-${y}`;
  } catch (error) {
    return "-";
  }
}
