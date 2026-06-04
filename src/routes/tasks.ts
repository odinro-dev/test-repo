import { Router, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db";
import { CreateTaskInput, UpdateTaskInput, Task } from "../models/task";
import { AuthRequest, authenticate } from "../middleware/auth";
import { isNonEmptyString, isValidPriority, isValidStatus, validatePagination, sanitizeString } from "../utils/validation";
import { logger } from "../utils/logger";

const router = Router();

/**
 * GET /tasks
 * List all tasks with optional filters and pagination.
 */
router.get("/", authenticate, (req: AuthRequest, res: Response) => {
  try {
    const status = req.query.status as string;
    const priority = req.query.priority as string;
    const assignee = req.query.assignee as string;
    const tag = req.query.tag as string;
    const { page, limit } = validatePagination(req.query.page, req.query.limit);

    // Filter + paginate inside the data layer so a request only materializes the
    // page it returns, instead of copying the whole task collection per request
    // (the O(N)-per-request allocation behind issue #34).
    const result = db.queryTasks({ status, priority, assignee, tag, page, limit });

    logger.info("Tasks listed", { count: result.data.length, page, filters: { status, priority, assignee, tag } });
    res.json(result);
  } catch (error) {
    logger.error("Failed to list tasks", { error: (error as Error).message });
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /tasks/:id
 * Get a single task by ID.
 */
router.get("/:id", authenticate, (req: AuthRequest, res: Response) => {
  const task = db.getTaskById(req.params.id);
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json(task);
});

/**
 * POST /tasks
 * Create a new task.
 */
router.post("/", authenticate, (req: AuthRequest, res: Response) => {
  const input: CreateTaskInput = req.body;

  if (!isNonEmptyString(input.title)) {
    res.status(400).json({ error: "Title is required" });
    return;
  }

  if (input.priority && !isValidPriority(input.priority)) {
    res.status(400).json({ error: "Invalid priority value" });
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
  res.status(201).json(task);
});

/**
 * PATCH /tasks/:id
 * Update an existing task.
 */
router.patch("/:id", authenticate, (req: AuthRequest, res: Response) => {
  const existing = db.getTaskById(req.params.id);
  if (!existing) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const input: UpdateTaskInput = req.body;

  if (input.status && !isValidStatus(input.status)) {
    res.status(400).json({ error: "Invalid status value" });
    return;
  }

  if (input.priority && !isValidPriority(input.priority)) {
    res.status(400).json({ error: "Invalid priority value" });
    return;
  }

  const updated = db.updateTask(req.params.id, input);
  logger.info("Task updated", { taskId: req.params.id });
  res.json(updated);
});

/**
 * DELETE /tasks/:id
 * Delete a task.
 */
router.delete("/:id", authenticate, (req: AuthRequest, res: Response) => {
  const deleted = db.deleteTask(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  logger.info("Task deleted", { taskId: req.params.id });
  res.status(204).send();
});

export default router;
