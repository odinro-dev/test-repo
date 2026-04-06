import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { v4 as uuidv4 } from "uuid";
import taskRoutes from "./routes/tasks";
import userRoutes from "./routes/users";
import { logger } from "./utils/logger";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("combined"));

// Request ID middleware
app.use((req, _res, next) => {
  (req as any).requestId = req.headers["x-request-id"] || uuidv4();
  next();
});

// Routes
app.use("/api/tasks", taskRoutes);
app.use("/api/users", userRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    requestId: (req as any).requestId,
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const requestId = (req as any).requestId;
  logger.error("Unhandled error", { requestId, error: err.message, stack: err.stack });
  res.status(500).json({ error: "Internal server error", requestId });
});

app.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`);
});

export default app;
