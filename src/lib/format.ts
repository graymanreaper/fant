// Display formatting helpers shared by pages, the print view and exports.

/** Format a date as MM/DD/YYYY, matching the Access ##/##/#### mask. */
export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

/** Format a number as US currency with cents. */
export function formatCurrency(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : value ?? 0;
  if (n === null || n === undefined || Number.isNaN(n)) return "";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/** Format a share quantity with thousands separators (no decimals). */
export function formatQuantity(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return value.toLocaleString("en-US");
}
