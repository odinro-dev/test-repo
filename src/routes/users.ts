import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import { db } from "../db";
import { CreateUserInput, LoginInput, toPublicUser } from "../models/user";
import { AuthRequest, authenticate, requireAdmin, generateToken } from "../middleware/auth";
import { isValidEmail, isNonEmptyString } from "../utils/validation";
import { logger } from "../utils/logger";

const router = Router();

/**
 * POST /users/register
 * Register a new user account.
 */
router.post("/register", async (req: Request, res: Response) => {
  const input: CreateUserInput = req.body;

  if (!isValidEmail(input.email)) {
    res.status(400).json({ error: "Invalid email address" });
    return;
  }

  if (!isNonEmptyString(input.password) || input.password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  if (!isNonEmptyString(input.name)) {
    res.status(400).json({ error: "Name is required" });
    return;
  }

  const existing = db.getUserByEmail(input.email);
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = db.createUser({
    id: uuidv4(),
    email: input.email,
    name: input.name,
    passwordHash,
    role: input.role || "member",
    createdAt: new Date().toISOString(),
  });

  const token = generateToken(user.id, user.role);
  logger.info("User registered", { userId: user.id, email: user.email });
  res.status(201).json({ user: toPublicUser(user), token });
});

/**
 * POST /users/login
 * Authenticate and receive a JWT token.
 */
router.post("/login", async (req: Request, res: Response) => {
  const input: LoginInput = req.body;

  const user = db.getUserByEmail(input.email);
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = generateToken(user.id, user.role);
  logger.info("User logged in", { userId: user.id });
  res.json({ user: toPublicUser(user), token });
});

/**
 * GET /users/me
 * Get the current authenticated user's profile.
 */
router.get("/me", authenticate, (req: AuthRequest, res: Response) => {
  const user = db.getUserById(req.userId!);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(toPublicUser(user));
});

/**
 * GET /users
 * List all users (admin only).
 */
router.get("/", authenticate, requireAdmin, (_req: AuthRequest, res: Response) => {
  const users = db.getAllUsers().map(toPublicUser);
  res.json(users);
});

/**
 * DELETE /users/:id
 * Delete a user (admin only).
 */
router.delete("/:id", authenticate, requireAdmin, (req: AuthRequest, res: Response) => {
  const deleted = db.deleteUser(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  logger.info("User deleted", { userId: req.params.id, deletedBy: req.userId });
  res.status(204).send();
});

export default router;
