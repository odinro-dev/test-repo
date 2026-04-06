import { v4 as uuidv4 } from "uuid";
import { db } from "../db";
import { Task, CreateTaskInput, UpdateTaskInput } from "../models/task";
import { isNonEmptyString, isValidPriority, isValidStatus, sanitizeString } from "../utils/validation";
import { logger } from "../utils/logger";

export class TaskServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "TaskServiceError";
  }
}

export interface TaskFilters {
  status?: string;
  priority?: string;
  assignee?: string;
  tag?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export class TaskService {
  listTasks(filters: TaskFilters, page: number, limit: number): PaginatedResult<Task> {
    let tasks = db.getAllTasks();

    if (filters.status) {
      tasks = tasks.filter((t) => t.status === filters.status);
    }
    if (filters.priority) {
      tasks = tasks.filter((t) => t.priority === filters.priority);
    }
    if (filters.assignee) {
      tasks = tasks.filter((t) => t.assigneeId === filters.assignee);
    }
    if (filters.tag) {
      tasks = tasks.filter((t) => t.tags.includes(filters.tag!));
    }

    const result = db.paginate(tasks, page, limit);
    logger.info("Tasks listed", { count: result.data.length, page, filters });
    return result;
  }

  getTask(id: string): Task {
    const task = db.getTaskById(id);
    if (!task) {
      throw new TaskServiceError("Task not found", 404);
    }
    return task;
  }

  createTask(input: CreateTaskInput): Task {
    if (!isNonEmptyString(input.title)) {
      throw new TaskServiceError("Title is required", 400);
    }
    if (input.priority && !isValidPriority(input.priority)) {
      throw new TaskServiceError("Invalid priority value", 400);
    }

    const now = new Date().toISOString();
    const task: Task = {
      id: uuidv4(),
      title: sanitizeString(input.title),
      description: input.description ? sanitizeString(input.description) : "",
      status: "todo",
      priority: input.priority || "medium",
      assigneeId: input.assigneeId || null,
      tags: input.tags || [],
      dueDate: input.dueDate || null,
      createdAt: now,
      updatedAt: now,
    };

    db.createTask(task);
    logger.info("Task created", { taskId: task.id, title: task.title });
    return task;
  }

  updateTask(id: string, input: UpdateTaskInput): Task {
    const existing = db.getTaskById(id);
    if (!existing) {
      throw new TaskServiceError("Task not found", 404);
    }

    if (input.status && !isValidStatus(input.status)) {
      throw new TaskServiceError("Invalid status value", 400);
    }
    if (input.priority && !isValidPriority(input.priority)) {
      throw new TaskServiceError("Invalid priority value", 400);
    }

    const updated = db.updateTask(id, input);
    logger.info("Task updated", { taskId: id });
    return updated!;
  }

  deleteTask(id: string): void {
    const deleted = db.deleteTask(id);
    if (!deleted) {
      throw new TaskServiceError("Task not found", 404);
    }
    logger.info("Task deleted", { taskId: id });
  }

  getTaskStats(): { total: number; byStatus: Record<string, number>; byPriority: Record<string, number> } {
    const tasks = db.getAllTasks();
    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    for (const task of tasks) {
      byStatus[task.status] = (byStatus[task.status] || 0) + 1;
      byPriority[task.priority] = (byPriority[task.priority] || 0) + 1;
    }

    return { total: tasks.length, byStatus, byPriority };
  }
}

export const taskService = new TaskService();
