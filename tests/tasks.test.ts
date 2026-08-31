import { describe, it, expect, beforeAll } from "@jest/globals";
import request from "supertest";
import app from "../src/index";
import { seedDatabase, createTestToken } from "./setup";

describe("Tasks API", () => {
  let token: string;

  beforeAll(() => {
    seedDatabase();
    token = createTestToken("test-user-1", "admin");
  });

  describe("GET /api/tasks", () => {
    it("should return paginated tasks", async () => {
      const res = await request(app)
        .get("/api/tasks")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.total).toBeGreaterThan(0);
      expect(res.body.page).toBe(1);
    });

    it("should filter by status", async () => {
      const res = await request(app)
        .get("/api/tasks?status=todo")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((t: any) => t.status === "todo")).toBe(true);
    });

    it("should filter by priority", async () => {
      const res = await request(app)
        .get("/api/tasks?priority=high")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((t: any) => t.priority === "high")).toBe(true);
    });

    it("should paginate correctly", async () => {
      const page1 = await request(app)
        .get("/api/tasks?page=1&limit=5")
        .set("Authorization", `Bearer ${token}`);
      const page2 = await request(app)
        .get("/api/tasks?page=2&limit=5")
        .set("Authorization", `Bearer ${token}`);

      expect(page1.body.data).toHaveLength(5);
      expect(page2.body.data).toHaveLength(5);
      expect(page1.body.data[0].id).not.toBe(page2.body.data[0].id);
    });

    it("should return 401 without auth", async () => {
      const res = await request(app).get("/api/tasks");
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/tasks", () => {
    it("should create a task", async () => {
      const res = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "New test task", priority: "high" });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe("New test task");
      expect(res.body.priority).toBe("high");
      expect(res.body.id).toBeDefined();
    });

    it("should reject missing title", async () => {
      const res = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${token}`)
        .send({ priority: "low" });

      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /api/tasks/:id", () => {
    it("should update task status", async () => {
      const create = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Task to update" });

      const res = await request(app)
        .patch(`/api/tasks/${create.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "done" });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("done");
    });

    it("should return 404 for nonexistent task", async () => {
      const res = await request(app)
        .patch("/api/tasks/nonexistent-id")
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "done" });

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/tasks/:id", () => {
    it("should delete a task", async () => {
      const create = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Task to delete" });

      const res = await request(app)
        .delete(`/api/tasks/${create.body.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(204);
    });
  });
});
