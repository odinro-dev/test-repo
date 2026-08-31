/**
 * Opaque cursor encoding for keyset (cursor-based) pagination.
 *
 * A cursor captures the stable sort key of the last item a client has already
 * seen: `(createdAt, id)`. The next page returns rows strictly greater than
 * that key in `(createdAt, id)` order, which is immune to inserts and deletes
 * happening *before* the cursor between requests — the root cause of issue #1.
 *
 * The wire format is an opaque base64url string so clients treat it as a blob
 * and don't build dependencies on its internal shape.
 */

export interface Cursor {
  createdAt: string;
  id: string;
}

const SEPARATOR = "|";

export function encodeCursor(cursor: Cursor): string {
  const raw = `${cursor.createdAt}${SEPARATOR}${cursor.id}`;
  return Buffer.from(raw, "utf8").toString("base64url");
}

/**
 * Decode an opaque cursor. Returns null for any malformed input so callers can
 * reject it with a 400 rather than silently paginate from a garbage anchor.
 */
export function decodeCursor(raw: string): Cursor | null {
  try {
    const decoded = Buffer.from(raw, "base64url").toString("utf8");
    const sep = decoded.indexOf(SEPARATOR);
    if (sep === -1) return null;
    const createdAt = decoded.slice(0, sep);
    const id = decoded.slice(sep + 1);
    if (!createdAt || !id) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}
