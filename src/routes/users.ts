import { Router, Request, Response } from "express";
import { AuthRequest, authenticate, requireAdmin } from "../middleware/auth";
import { userService, UserServiceError } from "../services/user-service";

const router = Router();

router.post("/register", async (req: Request, res: Response) => {
  try {
    const result = await userService.register(req.body);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof UserServiceError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const result = await userService.login(req.body);
    res.json(result);
  } catch (error) {
    if (error instanceof UserServiceError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

router.get("/me", authenticate, (req: AuthRequest, res: Response) => {
  try {
    const user = userService.getProfile(req.userId!);
    res.json(user);
  } catch (error) {
    if (error instanceof UserServiceError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

router.get("/", authenticate, requireAdmin, (_req: AuthRequest, res: Response) => {
  const users = userService.listUsers();
  res.json(users);
});

router.delete("/:id", authenticate, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    userService.deleteUser(req.params.id, req.userId!);
    res.status(204).send();
  } catch (error) {
    if (error instanceof UserServiceError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

export default router;
