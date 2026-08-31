/**
 * Standalone reproduction / regression check for issue #1:
 * pagination must return every task exactly once even when tasks are
 * created or deleted partway through a traversal.
 *
 * Run with:  npx ts-node scripts/verify-pagination.ts
 * Exits non-zero if the invariant is violated.
 */
import { db } from "../src/db";
import { decodeCursor } from "../src/utils/cursor";
import { Task } from "../src/models/task";

function makeTask(seq: number): Task {
  // Strictly increasing createdAt so the (createdAt, id) order is well defined.
  const ts = new Date(1_700_000_000_000 + seq * 1000).toISOString();
  return {
    id: `t-${String(seq).padStart(3, "0")}`,
    title: `Task ${seq}`,
    description: "",
    status: "todo",
    priority: "medium",
    assigneeId: null,
    tags: [],
    dueDate: null,
    createdAt: ts,
    updatedAt: ts,
  };
}

const failures: string[] = [];
function check(cond: boolean, msg: string): void {
  if (!cond) failures.push(msg);
}

const LIMIT = 10;

// 1. Seed 25 tasks (t-001 .. t-025).
for (let i = 1; i <= 25; i++) db.createTask(makeTask(i));

// 2. Read page 1 in cursor mode.
const page1 = db.queryTasksByCursor({ limit: LIMIT });
const seen: string[] = page1.data.map((t) => t.id);
check(page1.data.length === LIMIT, `page 1 should have ${LIMIT} items, got ${page1.data.length}`);

// 3. Concurrent modifications between page 1 and page 2 — the exact hazard
//    from issue #1, made deliberately adversarial for OFFSET pagination:
//      a) insert a task that sorts to the FRONT (earliest createdAt). Under
//         offset paging this shifts every later row down by one -> the last
//         row of page 1 would reappear on page 2 (duplicate).
//      b) delete a task we already returned on page 1. Under offset paging
//         this shifts later rows up by one -> a row gets skipped.
db.createTask(makeTask(0)); // t-000, sorts before everything (before the cursor)
db.deleteTask(page1.data[3].id); // remove the 4th already-seen row (t-004)

// 4. Walk the remaining pages strictly after the cursor.
let cursor = page1.nextCursor;
let guard = 0;
while (cursor && guard++ < 1000) {
  const decoded = decodeCursor(cursor);
  check(decoded !== null, `nextCursor should decode, got ${cursor}`);
  const pageRes = db.queryTasksByCursor({ limit: LIMIT, cursor: decoded ?? undefined });
  seen.push(...pageRes.data.map((t) => t.id));
  cursor = pageRes.nextCursor;
}

// 5. Invariants.
const unique = new Set(seen);
const duplicates = seen.filter((id, i) => seen.indexOf(id) !== i);

check(duplicates.length === 0, `no task should appear twice; duplicates: ${[...new Set(duplicates)].join(", ")}`);

// Every task that existed at the moment we read its page must be covered exactly
// once: t-001..t-025 (t-004 was returned on page 1 before deletion). The
// front-inserted t-000 sorts before the cursor, so it is correctly NOT revisited.
const expected = Array.from({ length: 25 }, (_, i) => `t-${String(i + 1).padStart(3, "0")}`);
const missing = expected.filter((id) => !unique.has(id));
check(missing.length === 0, `no task should be skipped; missing: ${missing.join(", ")}`);
check(!unique.has("t-000"), "t-000 was inserted behind the cursor and must not be revisited");
check(seen.length === 25, `expected 25 total reads, got ${seen.length}`);

if (failures.length > 0) {
  console.error("FAIL — pagination invariant violated:");
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}
console.log("PASS — 25 tasks traversed exactly once across pages despite a mid-traversal insert + delete.");
