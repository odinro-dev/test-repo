import { Task } from "./models/task";
import { User } from "./models/user";
import { encodeCursor, Cursor } from "./utils/cursor";

export interface TaskQuery {
  status?: string;
  priority?: string;
  assignee?: string;
  tag?: string;
  page: number;
  limit: number;
}

export interface TaskCursorQuery {
  status?: string;
  priority?: string;
  assignee?: string;
  tag?: string;
  limit: number;
  cursor?: Cursor;
}

/**
 * Stable, total ordering for tasks: chronological by `createdAt`, with `id` as
 * a deterministic tiebreaker for tasks created within the same millisecond.
 * Cursor pagination relies on this being a *total* order so a cursor splits the
 * collection unambiguously into "already seen" and "not yet seen".
 */
function compareByKey(
  a: { createdAt: string; id: string },
  b: { createdAt: string; id: string }
): number {
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
  if (a.id !== b.id) return a.id < b.id ? -1 : 1;
  return 0;
}

/**
 * Insert `task` into an ascending-sorted `window`, keeping at most `cap` of the
 * smallest items. This lets us page without materializing the whole match set:
 * memory stays at O(cap) regardless of collection size — preserving the
 * per-request memory ceiling from issue #34 even though the Map is unsorted.
 */
function insertCapped(window: Task[], task: Task, cap: number): void {
  if (cap <= 0) return;
  let lo = 0;
  let hi = window.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (compareByKey(window[mid], task) < 0) lo = mid + 1;
    else hi = mid;
  }
  window.splice(lo, 0, task);
  if (window.length > cap) window.pop();
}

/**
 * Simple in-memory database for development.
 * In production, replace with PostgreSQL or MongoDB.
 */
class Database {
  private tasks: Map<string, Task> = new Map();
  private users: Map<string, User> = new Map();

  // Task operations
  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  getTaskById(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  /**
   * Offset pagination over a *stable* (createdAt, id) ordering.
   *
   * The previous implementation paged in raw Map-insertion order with no sort,
   * so any concurrent insert/delete before the page boundary duplicated or
   * skipped rows across pages (issue #1). Sorting by a total key makes the
   * offset deterministic and removes the insert-duplicate case (new rows sort
   * to the end). Caveat: offset paging still cannot guarantee "exactly once"
   * when rows are *deleted* mid-traversal — clients that need that guarantee
   * should use the cursor path (`queryTasksByCursor`).
   *
   * Memory stays at O(end) via a bounded sorted window (see insertCapped),
   * keeping the per-request ceiling introduced for issue #34.
   */
  queryTasks(
    query: TaskQuery
  ): { data: Task[]; total: number; page: number; totalPages: number; nextCursor: string | null } {
    const { status, priority, assignee, tag, page, limit } = query;
    const start = (page - 1) * limit;
    const end = start + limit;
    const window: Task[] = [];
    let total = 0;
    for (const task of this.tasks.values()) {
      if (status && task.status !== status) continue;
      if (priority && task.priority !== priority) continue;
      if (assignee && task.assigneeId !== assignee) continue;
      if (tag && !task.tags.includes(tag)) continue;
      total++;
      // Retain only the smallest `end` matches needed to build this page.
      insertCapped(window, task, end);
    }
    const data = window.slice(start, end);
    const totalPages = Math.ceil(total / limit);
    const last = data[data.length - 1];
    const nextCursor =
      last && page < totalPages ? encodeCursor({ createdAt: last.createdAt, id: last.id }) : null;
    return { data, total, page, totalPages, nextCursor };
  }

  /**
   * Cursor (keyset) pagination — the stable fix for issue #1.
   *
   * Returns up to `limit` matching tasks that sort strictly after `cursor` in
   * (createdAt, id) order. Because the page is anchored to a row's key rather
   * than a numeric offset, inserts or deletes that happen *before* the cursor
   * between requests can't shift the window — every task is returned exactly
   * once across the traversal. Memory stays at O(limit) via insertCapped.
   */
  queryTasksByCursor(
    query: TaskCursorQuery
  ): { data: Task[]; total: number; nextCursor: string | null } {
    const { status, priority, assignee, tag, limit, cursor } = query;
    const window: Task[] = [];
    let total = 0;
    let afterCursor = 0;
    for (const task of this.tasks.values()) {
      if (status && task.status !== status) continue;
      if (priority && task.priority !== priority) continue;
      if (assignee && task.assigneeId !== assignee) continue;
      if (tag && !task.tags.includes(tag)) continue;
      total++;
      if (cursor && compareByKey(task, cursor) <= 0) continue; // already seen
      afterCursor++;
      insertCapped(window, task, limit);
    }
    const last = window[window.length - 1];
    const nextCursor =
      afterCursor > limit && last
        ? encodeCursor({ createdAt: last.createdAt, id: last.id })
        : null;
    return { data: window, total, nextCursor };
  }

  getTasksByStatus(status: string): Task[] {
    const result: Task[] = [];
    for (const task of this.tasks.values()) {
      if (task.status === status) result.push(task);
    }
    return result;
  }

  getTasksByAssignee(assigneeId: string): Task[] {
    const result: Task[] = [];
    for (const task of this.tasks.values()) {
      if (task.assigneeId === assigneeId) result.push(task);
    }
    return result;
  }

  createTask(task: Task): Task {
    this.tasks.set(task.id, task);
    return task;
  }

  updateTask(id: string, updates: Partial<Task>): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    const updated = { ...task, ...updates, updatedAt: new Date().toISOString() };
    this.tasks.set(id, updated);
    return updated;
  }

  deleteTask(id: string): boolean {
    return this.tasks.delete(id);
  }

  // User operations
  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  getUserById(id: string): User | undefined {
    return this.users.get(id);
  }

  getUserByEmail(email: string): User | undefined {
    return this.getAllUsers().find((u) => u.email === email);
  }

  createUser(user: User): User {
    this.users.set(user.id, user);
    return user;
  }

  deleteUser(id: string): boolean {
    return this.users.delete(id);
  }
}

export const db = new Database();
