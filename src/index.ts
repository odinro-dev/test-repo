import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import taskRoutes from "./routes/tasks";
import userRoutes from "./routes/users";
import queryRoutes from "./routes/query";
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
app.use("/api/query", queryRoutes);

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const isProduction = process.env.NODE_ENV === "production";
  logger.error("Unhandled error", { error: err.message, stack: err.stack });
  res.status(500).json({
    error: isProduction ? "Internal server error" : err.message,
  });
});

app.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`);
});

export default app;
