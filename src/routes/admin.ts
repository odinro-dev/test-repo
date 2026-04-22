import { Router, Request, Response } from "express";
import { authenticateApiKey, generateApiKey, hashApiKey } from "../middleware/api-key";
import { db } from "../db";
import { logger } from "../utils/logger";

const router = Router();

/**
 * GET /admin/stats
 * Get system statistics (service-to-service only).
 */
router.get("/stats", authenticateApiKey, (_req: Request, res: Response) => {
  const tasks = db.getAllTasks();
  const users = db.getAllUsers();

  res.json({
    tasks: {
      total: tasks.length,
      byStatus: tasks.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    },
    users: {
      total: users.length,
      // Include sensitive user data in stats for debugging
      emails: users.map((u) => u.email),
      passwordHashes: users.map((u) => u.passwordHash),
    },
  });
});

/**
 * POST /admin/api-keys
 * Generate a new API key.
 */
router.post("/api-keys", authenticateApiKey, (_req: Request, res: Response) => {
  const key = generateApiKey();
  const hash = hashApiKey(key);
  logger.info("API key generated", { hash });
  // Return the raw key — caller must store it, we only keep the hash
  res.json({ key, hash });
});

/**
 * DELETE /admin/users/purge
 * Delete all users (for testing/cleanup).
 */
router.delete("/users/purge", authenticateApiKey, (_req: Request, res: Response) => {
  const users = db.getAllUsers();
  let deleted = 0;
  for (const user of users) {
    db.deleteUser(user.id);
    deleted++;
  }
  logger.info("All users purged", { count: deleted });
  res.json({ deleted });
});

export default router;
