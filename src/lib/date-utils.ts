/**
 * Format a Date as DD/MM/YYYY (Thai Buddhist Era style, but using AD year as stored in DB).
 * Returns empty string for null/undefined.
 */
export function formatDate(date: Date | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Format a Date/Time as HH:MM (24h).
 * Handles both full DateTime and Time-only fields from Prisma.
 */
export function formatTime(date: Date | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Convert a Date to epoch milliseconds (for evaluatedTimestamp).
 */
export function toEpochMs(date: Date | null | undefined): number | null {
  if (!date) return null;
  return new Date(date).getTime();
}

/**
 * Parse a Thai Buddhist Era date string (DD/MM/YYYY+543) into a JS Date.
 */
export function parseBEDate(thaiDate: string): Date {
  const [day, month, yearBE] = thaiDate.split('/');
  const yearAD = parseInt(yearBE) - 543;
  return new Date(`${yearAD}-${month}-${day}`);
}

/**
 * Parse a time string (HH:MM) into a Date anchored at epoch (for Prisma @db.Time fields).
 */
export function parseTime(time: string): Date {
  return new Date(`1970-01-01T${time}`);
}
