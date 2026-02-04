/**
 * PostgREST can return either an object or an array depending on the Accept header.
 * This helper normalizes the result to a single row (or null).
 */
export function firstRow<T>(data: T | T[] | null | undefined): T | null {
  if (!data) return null;
  return Array.isArray(data) ? (data[0] ?? null) : data;
}
