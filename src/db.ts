import { Task } from "./models/task";
import { User } from "./models/user";

export interface TaskQuery {
  status?: string;
  priority?: string;
  assignee?: string;
  tag?: string;
  page: number;
  limit: number;
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
   * Filter and paginate tasks in a single pass over the task map.
   *
   * Unlike getAllTasks().filter(...).slice(...), this never materializes the
   * full collection per request — it only collects the requested page window
   * (<= limit items) plus a running match count. That keeps per-request
   * allocation at O(page_size) instead of O(total_tasks), which is what was
   * exhausting the heap under sustained list traffic (issue #34).
   */
  queryTasks(query: TaskQuery): { data: Task[]; total: number; page: number; totalPages: number } {
    const { status, priority, assignee, tag, page, limit } = query;
    const start = (page - 1) * limit;
    const end = start + limit;
    const data: Task[] = [];
    let total = 0;
    for (const task of this.tasks.values()) {
      if (status && task.status !== status) continue;
      if (priority && task.priority !== priority) continue;
      if (assignee && task.assigneeId !== assignee) continue;
      if (tag && !task.tags.includes(tag)) continue;
      // Only the rows on the requested page are retained in memory.
      if (total >= start && total < end) data.push(task);
      total++;
    }
    return { data, total, page, totalPages: Math.ceil(total / limit) };
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

  // Pagination helper — uses stable sort by createdAt+id to prevent
  // duplicates when items are inserted between page fetches.
  paginate<T extends { createdAt: string; id: string }>(
    items: T[],
    page: number,
    limit: number
  ): { data: T[]; total: number; page: number; totalPages: number } {
    const sorted = [...items].sort((a, b) => {
      const cmp = a.createdAt.localeCompare(b.createdAt);
      return cmp !== 0 ? cmp : a.id.localeCompare(b.id);
    });
    const start = (page - 1) * limit;
    const end = start + limit;
    const data = sorted.slice(start, end);
    return {
      data,
      total: sorted.length,
      page,
      totalPages: Math.ceil(sorted.length / limit),
    };
  }
}

export const db = new Database();
