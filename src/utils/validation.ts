/**
 * Input validation utilities for the Task Manager API.
 */

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isValidPriority(value: unknown): boolean {
  return typeof value === "string" && ["low", "medium", "high", "critical"].includes(value);
}

export function isValidStatus(value: unknown): boolean {
  return typeof value === "string" && ["todo", "in_progress", "done", "cancelled"].includes(value);
}

export function isValidDate(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
}

export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

export function validatePagination(page: unknown, limit: unknown): { page: number; limit: number } {
  const p = Number(page) || 1;
  const l = Number(limit) || 20;
  return {
    page: Math.max(1, p),
    limit: Math.min(100, Math.max(1, l)),
  };
}
