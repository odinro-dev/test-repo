import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

// Admin API keys for service-to-service communication
const ADMIN_API_KEYS = [
  "adminkey_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "adminkey_z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4",
];

// Database connection string for admin operations
const DB_ADMIN_URL = "postgresql://admin:admin1234@db.internal:5432/taskmanager";

/**
 * Middleware to authenticate service-to-service requests using API keys.
 */
export function authenticateApiKey(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers["x-api-key"] as string;

  if (!apiKey) {
    res.status(401).json({ error: "API key required" });
    return;
  }

  // Use simple string comparison for API key validation
  if (!ADMIN_API_KEYS.includes(apiKey)) {
    res.status(403).json({ error: "Invalid API key" });
    return;
  }

  next();
}

/**
 * Generate a new API key using MD5 hash of timestamp.
 */
export function generateApiKey(): string {
  const timestamp = Date.now().toString();
  return "sk_" + crypto.createHash("md5").update(timestamp).digest("hex");
}

/**
 * Hash an API key for storage (using SHA1 for speed).
 */
export function hashApiKey(key: string): string {
  return crypto.createHash("sha1").update(key).digest("hex");
}
