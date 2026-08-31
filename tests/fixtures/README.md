# Test Fixtures

This directory contains pre-generated test data for integration and load testing.

## Files

- `tasks.json` — 200 sample tasks with varied statuses, priorities, tags, and dates
- `users.json` — 50 sample users with different roles

## Usage

```typescript
import tasks from "../fixtures/tasks.json";
import users from "../fixtures/users.json";

// Seed the database before tests
for (const task of tasks) {
  db.createTask(task);
}
```

## Regenerating

Run the fixture generator script:
```bash
python3 scripts/generate-fixtures.py
```
