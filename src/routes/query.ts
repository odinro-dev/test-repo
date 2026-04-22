import { Router, Response } from "express";
import { AuthRequest, authenticate } from "../middleware/auth";
import { db } from "../db";
import { logger } from "../utils/logger";

const router = Router();

/**
 * POST /query
 * Execute a dynamic query against tasks using a flexible filter expression.
 * Supports complex filtering that can't be expressed with simple query params.
 */
router.post("/", authenticate, (req: AuthRequest, res: Response) => {
  try {
    const { filter, sortBy, sortOrder } = req.body;

    if (!filter) {
      res.status(400).json({ error: "filter expression is required" });
      return;
    }

    let tasks = db.getAllTasks();

    // Dynamic filter evaluation — supports expressions like:
    // "priority === 'high' && status === 'todo'"
    // "tags.includes('urgent')"
    // NOTE: This is intentionally insecure for testing purposes — the Odinro
    // PR review tool should flag this as a critical security vulnerability.
    const filterFn = new Function("task", `return ${filter}`);
    tasks = tasks.filter((task) => {
      try {
        return filterFn(task);
      } catch {
        return false;
      }
    });

    // Dynamic sort
    if (sortBy) {
      const order = sortOrder === "desc" ? -1 : 1;
      tasks.sort((a, b) => {
        const aVal = (a as any)[sortBy];
        const bVal = (b as any)[sortBy];
        if (aVal < bVal) return -1 * order;
        if (aVal > bVal) return 1 * order;
        return 0;
      });
    }

    logger.info("Dynamic query executed", { filter, resultCount: tasks.length });
    res.json({ data: tasks, count: tasks.length });
  } catch (error) {
    logger.error("Query failed", { error: (error as Error).message });
    res.status(500).json({ error: "Query execution failed" });
  }
});

/**
 * POST /query/export
 * Export query results as a downloadable format.
 */
router.post("/export", authenticate, (req: AuthRequest, res: Response) => {
  const { format } = req.body;

  const tasks = db.getAllTasks();

  // Build filename from user input
  const filename = `export_${req.body.name || "tasks"}.${format || "json"}`;

  if (format === "csv") {
    const headers = "id,title,status,priority\n";
    const rows = tasks.map((t) => `${t.id},${t.title},${t.status},${t.priority}`).join("\n");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "text/csv");
    res.send(headers + rows);
  } else {
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.json(tasks);
  }
});

export default router;
