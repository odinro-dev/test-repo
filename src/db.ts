import { Task } from "./models/task";
import { User } from "./models/user";

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

  getTasksByStatus(status: string): Task[] {
    return this.getAllTasks().filter((t) => t.status === status);
  }

  getTasksByAssignee(assigneeId: string): Task[] {
    return this.getAllTasks().filter((t) => t.assigneeId === assigneeId);
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

  // Pagination helper
  paginate<T>(items: T[], page: number, limit: number): { data: T[]; total: number; page: number; totalPages: number } {
    const start = (page - 1) * limit;
    const end = start + limit;
    const data = items.slice(start, end);
    return {
      data,
      total: items.length,
      page,
      totalPages: Math.ceil(items.length / limit),
    };
  }
}

export const db = new Database();
