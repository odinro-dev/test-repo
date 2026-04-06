import { Router, Response } from "express";
import { AuthRequest, authenticate } from "../middleware/auth";
import { validatePagination } from "../utils/validation";
import { taskService, TaskServiceError } from "../services/task-service";

const router = Router();

router.get("/", authenticate, (req: AuthRequest, res: Response) => {
  try {
    const filters = {
      status: req.query.status as string,
      priority: req.query.priority as string,
      assignee: req.query.assignee as string,
      tag: req.query.tag as string,
    };
    const { page, limit } = validatePagination(req.query.page, req.query.limit);
    const result = taskService.listTasks(filters, page, limit);
    res.json(result);
  } catch (error) {
    if (error instanceof TaskServiceError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

router.get("/stats", authenticate, (_req: AuthRequest, res: Response) => {
  const stats = taskService.getTaskStats();
  res.json(stats);
});

router.get("/:id", authenticate, (req: AuthRequest, res: Response) => {
  try {
    const task = taskService.getTask(req.params.id);
    res.json(task);
  } catch (error) {
    if (error instanceof TaskServiceError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

router.post("/", authenticate, (req: AuthRequest, res: Response) => {
  try {
    const task = taskService.createTask(req.body);
    res.status(201).json(task);
  } catch (error) {
    if (error instanceof TaskServiceError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

router.patch("/:id", authenticate, (req: AuthRequest, res: Response) => {
  try {
    const updated = taskService.updateTask(req.params.id, req.body);
    res.json(updated);
  } catch (error) {
    if (error instanceof TaskServiceError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

router.delete("/:id", authenticate, (req: AuthRequest, res: Response) => {
  try {
    taskService.deleteTask(req.params.id);
    res.status(204).send();
  } catch (error) {
    if (error instanceof TaskServiceError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

export default router;
