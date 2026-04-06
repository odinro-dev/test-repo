import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import { db } from "../db";
import { CreateUserInput, LoginInput, User, UserPublic, toPublicUser } from "../models/user";
import { generateToken } from "../middleware/auth";
import { isValidEmail, isNonEmptyString } from "../utils/validation";
import { logger } from "../utils/logger";

export class UserServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "UserServiceError";
  }
}

export interface AuthResult {
  user: UserPublic;
  token: string;
}

export class UserService {
  async register(input: CreateUserInput): Promise<AuthResult> {
    if (!isValidEmail(input.email)) {
      throw new UserServiceError("Invalid email address", 400);
    }
    if (!isNonEmptyString(input.password) || input.password.length < 8) {
      throw new UserServiceError("Password must be at least 8 characters", 400);
    }
    if (!isNonEmptyString(input.name)) {
      throw new UserServiceError("Name is required", 400);
    }

    const existing = db.getUserByEmail(input.email);
    if (existing) {
      throw new UserServiceError("Email already registered", 409);
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
    return { user: toPublicUser(user), token };
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = db.getUserByEmail(input.email);
    if (!user) {
      throw new UserServiceError("Invalid credentials", 401);
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new UserServiceError("Invalid credentials", 401);
    }

    const token = generateToken(user.id, user.role);
    logger.info("User logged in", { userId: user.id });
    return { user: toPublicUser(user), token };
  }

  getProfile(userId: string): UserPublic {
    const user = db.getUserById(userId);
    if (!user) {
      throw new UserServiceError("User not found", 404);
    }
    return toPublicUser(user);
  }

  listUsers(): UserPublic[] {
    return db.getAllUsers().map(toPublicUser);
  }

  deleteUser(id: string, deletedBy: string): void {
    const deleted = db.deleteUser(id);
    if (!deleted) {
      throw new UserServiceError("User not found", 404);
    }
    logger.info("User deleted", { userId: id, deletedBy });
  }
}

export const userService = new UserService();
