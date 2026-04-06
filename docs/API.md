# Task Manager API Documentation

## Authentication

All endpoints (except register and login) require a JWT token in the `Authorization` header:

```
Authorization: Bearer <token>
```

### Register

```bash
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "name": "Alice",
    "password": "securepassword123"
  }'
```

**Response (201):**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "alice@example.com",
    "name": "Alice",
    "role": "member",
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Login

```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "securepassword123"
  }'
```

**Response (200):**
```json
{
  "user": { "id": "...", "email": "alice@example.com", "name": "Alice", "role": "member" },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Error (401):**
```json
{
  "error": "Invalid credentials"
}
```

## Tasks

### List Tasks

```bash
# Basic listing
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/tasks

# With filters
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/tasks?status=todo&priority=high&page=1&limit=10"

# Filter by tag
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/tasks?tag=frontend"
```

**Response (200):**
```json
{
  "data": [
    {
      "id": "550e8400-...",
      "title": "Fix login bug",
      "description": "Users can't login with special characters in password",
      "status": "todo",
      "priority": "high",
      "assigneeId": null,
      "tags": ["bug", "auth"],
      "dueDate": "2024-01-20T00:00:00.000Z",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "totalPages": 1
}
```

### Create Task

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implement user notifications",
    "description": "Send email when task is assigned",
    "priority": "medium",
    "tags": ["feature", "notifications"],
    "dueDate": "2024-02-01T00:00:00.000Z"
  }'
```

**Response (201):** Returns the created task object.

**Error (400):**
```json
{
  "error": "Title is required"
}
```

### Get Task

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/tasks/550e8400-e29b-41d4-a716-446655440000
```

### Update Task

```bash
curl -X PATCH http://localhost:3000/api/tasks/550e8400-... \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in_progress",
    "assigneeId": "user-id-here"
  }'
```

### Delete Task

```bash
curl -X DELETE http://localhost:3000/api/tasks/550e8400-... \
  -H "Authorization: Bearer $TOKEN"
```

**Response:** 204 No Content

## Users

### Get Profile

```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/users/me
```

### List Users (Admin)

```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/users
```

**Error (403):**
```json
{
  "error": "Admin access required"
}
```

### Delete User (Admin)

```bash
curl -X DELETE http://localhost:3000/api/users/user-id-here \
  -H "Authorization: Bearer $TOKEN"
```

## Health Check

```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "status": "ok",
  "uptime": 123.456
}
```

## Error Format

All errors follow a consistent format:

```json
{
  "error": "Human-readable error message"
}
```

Common status codes:
- `400` — Bad request (validation error)
- `401` — Unauthorized (missing/invalid token)
- `403` — Forbidden (insufficient permissions)
- `404` — Not found
- `409` — Conflict (e.g., duplicate email)
- `500` — Internal server error
