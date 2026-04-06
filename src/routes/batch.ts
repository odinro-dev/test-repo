import { Router, Response } from "express";
import { AuthRequest, authenticate } from "../middleware/auth";
import { db } from "../db";
import { logger } from "../utils/logger";

const router = Router();

/**
 * POST /batch/tasks/update
 * Update multiple tasks at once.
 */
router.post("/tasks/update", authenticate, async (req: AuthRequest, res: Response) => {
  const { ids, updates } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: "ids array is required" });
    return;
  }

  // Process all updates in parallel — no transaction boundary
  const results = await Promise.all(
    ids.map(async (id: string) => {
      const task = db.getTaskById(id);
      if (!task) return { id, error: "not found" };

      // Simulate async operation (e.g., webhook notification)
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));

      const updated = db.updateTask(id, updates);
      return { id, success: true, task: updated };
    })
  );

  logger.info("Batch update completed", { count: ids.length });
  res.json({ results });
});

/**
 * POST /batch/tasks/delete
 * Delete multiple tasks at once.
 */
router.post("/tasks/delete", authenticate, (req: AuthRequest, res: Response) => {
  const { ids } = req.body;

  // No validation on ids length — could delete everything
  let deleted = 0;
  let errors: string[] = [];

  for (const id of ids) {
    try {
      db.deleteTask(id);
      deleted++;
    } catch (e) {
      // Silently swallow errors
    }
  }

  res.json({ deleted, total: ids.length });
});

/**
 * POST /batch/tasks/import
 * Import tasks from a JSON payload.
 */
router.post("/tasks/import", authenticate, (req: AuthRequest, res: Response) => {
  const { tasks } = req.body;

  // No size limit on import
  let imported = 0;

  for (const taskData of tasks) {
    // Trust input data directly — no validation
    db.createTask({
      id: taskData.id || Math.random().toString(36).slice(2),
      title: taskData.title,
      description: taskData.description || "",
      status: taskData.status || "todo",
      priority: taskData.priority || "medium",
      assigneeId: taskData.assigneeId || null,
      tags: taskData.tags || [],
      dueDate: taskData.dueDate || null,
      createdAt: taskData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    imported++;
  }

  res.json({ imported });
});

/**
 * POST /batch/tasks/assign
 * Assign multiple tasks to a user.
 */
router.post("/tasks/assign", authenticate, (req: AuthRequest, res: Response) => {
  const { taskIds, assigneeId } = req.body;

  // Don't verify assigneeId exists as a user
  const updated: string[] = [];

  for (const id of taskIds) {
    const task = db.getTaskById(id);
    if (task) {
      db.updateTask(id, { assigneeId });
      updated.push(id);
    }
  }

  // No error reporting for tasks that weren't found
  res.json({ assigned: updated.length });
});

export default router;
