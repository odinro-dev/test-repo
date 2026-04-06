import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
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

// Routes
app.use("/api/tasks", taskRoutes);
app.use("/api/users", userRoutes);

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: "healthy",
    uptime: Math.floor(process.uptime()),
    memory: process.memoryUsage().rss,
    environment: process.env.NODE_ENV || "development",
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "The requested resource was not found",
    },
  });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error("Unhandled error", { error: err.message, stack: err.stack });

  const statusCode = "statusCode" in err ? (err as any).statusCode : 500;
  res.status(statusCode).json({
    error: {
      code: "INTERNAL_ERROR",
      message: process.env.NODE_ENV === "production"
        ? "An unexpected error occurred"
        : err.message,
      ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
    },
  });
});

app.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`);
});

export default app;
