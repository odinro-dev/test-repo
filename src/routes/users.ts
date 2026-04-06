import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import { db } from "../db";
import { CreateUserInput, LoginInput, toPublicUser } from "../models/user";
import { AuthRequest, authenticate, requireAdmin, generateToken } from "../middleware/auth";
import { isValidEmail, isNonEmptyString } from "../utils/validation";
import { sendSuccess, sendError } from "../utils/response";
import { logger } from "../utils/logger";

const router = Router();

/**
 * POST /users/register
 * Register a new user account.
 *
 * Response format changed in v2:
 * { success: true, data: { user: {...}, token: "..." }, meta: {...} }
 */
router.post("/register", async (req: Request, res: Response) => {
  const input: CreateUserInput = req.body;

  if (!isValidEmail(input.email)) {
    sendError(res, "Invalid email address", 400);
    return;
  }

  if (!isNonEmptyString(input.password) || input.password.length < 8) {
    sendError(res, "Password must be at least 8 characters", 400);
    return;
  }

  if (!isNonEmptyString(input.name)) {
    sendError(res, "Name is required", 400);
    return;
  }

  const existing = db.getUserByEmail(input.email);
  if (existing) {
    sendError(res, "Email already registered", 409);
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
  sendSuccess(res, { user: toPublicUser(user), token }, 201);
});

/**
 * POST /users/login
 * Authenticate and receive a JWT token.
 */
router.post("/login", async (req: Request, res: Response) => {
  const input: LoginInput = req.body;

  const user = db.getUserByEmail(input.email);
  if (!user) {
    sendError(res, "Invalid credentials", 401);
    return;
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    sendError(res, "Invalid credentials", 401);
    return;
  }

  const token = generateToken(user.id, user.role);
  logger.info("User logged in", { userId: user.id });
  sendSuccess(res, { user: toPublicUser(user), token });
});

/**
 * GET /users/profile
 * Get the current authenticated user's profile.
 * (Renamed from /users/me → /users/profile in v2)
 */
router.get("/profile", authenticate, (req: AuthRequest, res: Response) => {
  const user = db.getUserById(req.userId!);
  if (!user) {
    sendError(res, "User not found", 404);
    return;
  }
  sendSuccess(res, toPublicUser(user));
});

/**
 * GET /users
 * List all users (admin only).
 */
router.get("/", authenticate, requireAdmin, (_req: AuthRequest, res: Response) => {
  const users = db.getAllUsers().map(toPublicUser);
  sendSuccess(res, users);
});

/**
 * DELETE /users/:id
 * Delete a user (admin only). Now returns the deleted user instead of 204.
 */
router.delete("/:id", authenticate, requireAdmin, (req: AuthRequest, res: Response) => {
  const user = db.getUserById(req.params.id);
  if (!user) {
    sendError(res, "User not found", 404);
    return;
  }
  db.deleteUser(req.params.id);
  logger.info("User deleted", { userId: req.params.id, deletedBy: req.userId });
  sendSuccess(res, toPublicUser(user));
});

export default router;
