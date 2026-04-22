import { Router, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db";
import { CreateTaskInput, UpdateTaskInput, Task } from "../models/task";
import { AuthRequest, authenticate } from "../middleware/auth";
import { isNonEmptyString, isValidPriority, isValidStatus, validatePagination, sanitizeString } from "../utils/validation";
import { sendSuccess, sendError, sendPaginated } from "../utils/response";
import { logger } from "../utils/logger";

const router = Router();

/**
 * GET /tasks
 * List all tasks with optional filters and pagination.
 *
 * Response format (v2):
 * { success: true, data: [...], pagination: {...}, meta: {...} }
 */
router.get("/", authenticate, (req: AuthRequest, res: Response) => {
  try {
    let tasks = db.getAllTasks();

    // Filter by status
    const status = req.query.status as string;
    if (status) {
      tasks = tasks.filter((t) => t.status === status);
    }

    // Filter by priority
    const priority = req.query.priority as string;
    if (priority) {
      tasks = tasks.filter((t) => t.priority === priority);
    }

    // Filter by assignee
    const assigneeId = req.query.assigneeId as string;
    if (assigneeId) {
      tasks = tasks.filter((t) => t.assigneeId === assigneeId);
    }

    // Filter by tag
    const tag = req.query.tag as string;
    if (tag) {
      tasks = tasks.filter((t) => t.tags.includes(tag));
    }

    // Pagination
    const { page, limit } = validatePagination(req.query.page, req.query.limit);
    const result = db.paginate(tasks, page, limit);

    logger.info("Tasks listed", { count: result.data.length, page });
    sendPaginated(res, result.data, {
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
      limit,
    });
  } catch (error) {
    logger.error("Failed to list tasks", { error: (error as Error).message });
    sendError(res, "Internal server error");
  }
});

/**
 * GET /tasks/:id
 * Get a single task by ID.
 */
router.get("/:id", authenticate, (req: AuthRequest, res: Response) => {
  const task = db.getTaskById(req.params.id);
  if (!task) {
    sendError(res, "Task not found", 404);
    return;
  }
  sendSuccess(res, task);
});

/**
 * POST /tasks
 * Create a new task.
 */
router.post("/", authenticate, (req: AuthRequest, res: Response) => {
  const input: CreateTaskInput = req.body;

  if (!isNonEmptyString(input.title)) {
    sendError(res, "Title is required", 400);
    return;
  }

  if (input.priority && !isValidPriority(input.priority)) {
    sendError(res, "Invalid priority. Must be one of: low, medium, high, critical", 400);
    return;
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
  sendSuccess(res, task, 201);
});

/**
 * PUT /tasks/:id
 * Full update of an existing task (replaces PATCH).
 */
router.put("/:id", authenticate, (req: AuthRequest, res: Response) => {
  const existing = db.getTaskById(req.params.id);
  if (!existing) {
    sendError(res, "Task not found", 404);
    return;
  }

  const input: UpdateTaskInput = req.body;

  if (input.status && !isValidStatus(input.status)) {
    sendError(res, "Invalid status. Must be one of: todo, in_progress, done, cancelled", 400);
    return;
  }

  if (input.priority && !isValidPriority(input.priority)) {
    sendError(res, "Invalid priority. Must be one of: low, medium, high, critical", 400);
    return;
  }

  const updated = db.updateTask(req.params.id, input);
  logger.info("Task updated", { taskId: req.params.id });
  sendSuccess(res, updated);
});

/**
 * DELETE /tasks/:id
 * Delete a task. Returns the deleted task in the response.
 */
router.delete("/:id", authenticate, (req: AuthRequest, res: Response) => {
  const task = db.getTaskById(req.params.id);
  if (!task) {
    sendError(res, "Task not found", 404);
    return;
  }
  db.deleteTask(req.params.id);
  logger.info("Task deleted", { taskId: req.params.id });
  sendSuccess(res, task);
});

export default router;
