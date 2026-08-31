import { db } from "../src/db";
import tasks from "./fixtures/tasks.json";
import users from "./fixtures/users.json";

export function seedDatabase(): void {
  for (const task of tasks) {
    db.createTask(task as any);
  }
  for (const user of users) {
    db.createUser({
      ...user,
      passwordHash: "$2b$10$placeholder-hash-for-testing",
    } as any);
  }
}

export function clearDatabase(): void {
  // Reset by creating a fresh instance
  // TODO: Add a clear() method to the Database class
}

export function createTestToken(userId: string, role: string = "member"): string {
  // Generate a valid JWT for testing
  const jwt = require("jsonwebtoken");
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET || "test-secret-for-jest",
    { expiresIn: "1h" }
  );
}
