# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Task Manager API** — a REST API for managing tasks and users, built with Express + TypeScript. All state lives in an in-memory store (no real database), so data resets on every restart and is not shared across processes/workers.

## Commands

```bash
npm install        # node_modules is not committed — install first
npm run dev        # ts-node src/index.ts — dev server on PORT (default 3000)
npm run build      # tsc — compiles src/ to dist/
npm start          # node dist/index.js — runs the compiled build
npm run lint       # eslint src/
npm test           # jest
```

**Tooling caveats (the scripts exist but are not fully wired):**
- **Tests:** there are no test files, no jest config, and no TS transformer (`ts-jest`/`babel-jest`) in `devDependencies`. `npm test` will not run TypeScript tests as-is — wire a transformer (and add a config) before adding tests. Once set up, run a single file with `npx jest path/to/file.test.ts` or a single case with `npx jest -t "test name"`.
- **Lint:** eslint 8 is installed but there is no `.eslintrc`/`eslint.config.*`, so `npm run lint` errors until a config is added.

## Architecture

**Request flow.** `src/index.ts` builds the Express app, applies the middleware chain (`helmet` → `cors` → `express.json` → `morgan`), and mounts three routers — `/api/tasks`, `/api/users`, `/api/batch` — plus `GET /health`. A global error handler returns generic messages when `NODE_ENV=production` and the real error otherwise.

**Data layer is a single in-memory singleton.** `src/db.ts` exports `const db = new Database()`, backed by two `Map`s (tasks, users). Every route imports this one instance — **never construct another `Database`**; that is the single source of truth for all state.

**Routes are thin HTTP wrappers over `db`** (`src/routes/`). Each handler validates input with helpers from `src/utils/validation.ts`, calls `db`, and returns JSON. Handlers report failures with the early-return pattern (`res.status(...).json({ error }); return;`) rather than throwing.

**Auth** (`src/middleware/auth.ts`) is JWT Bearer-token based:
- `authenticate` verifies the token and attaches `userId`/`userRole` onto the request, typed as `AuthRequest` (extends Express `Request`). Protected handlers take `AuthRequest`.
- `requireAdmin` runs after `authenticate` to gate admin-only routes.
- `generateToken` mints 24h tokens. `JWT_SECRET` comes from env with an insecure dev default.

**Models** (`src/models/`) are pure TypeScript types, except `toPublicUser()` in `user.ts`. **Always pass a `User` through `toPublicUser()` before returning it** — it strips `passwordHash`.

## Conventions to follow

- **List/scan endpoints filter + paginate in the data layer** via `db.queryTasks()`, which materializes only the requested page (O(page_size) per request) rather than `getAllTasks().filter().slice()` (an O(N) copy per request). This was the fix for issue #34 (heap exhaustion under list traffic) — follow this single-pass pattern for new list endpoints. `validatePagination()` clamps `page ≥ 1` and `limit` to 1–100.
- **Error responses are always** `{ "error": "message" }`. Status codes: 400 validation, 401 auth, 403 forbidden, 404 not found, 409 conflict, 500 server.
- **Validate in the handler** using `utils/validation.ts`; sanitize free-text input with `sanitizeString` (strips `<`/`>`).
- **Log via `utils/logger.ts`** (`logger.info/warn/error/debug`), level-gated by `LOG_LEVEL`; pass structured context as the second arg.
- Strict TypeScript is on (`tsconfig.json` `strict: true`); source in `src/`, output in `dist/`.

**`src/routes/batch.ts` is the exception, not the template.** Several of its handlers intentionally skip input validation, referential checks (e.g. assignee existence), transaction boundaries, and error reporting — the inline comments flag this. Treat these as known gaps; new code should follow the validation/error conventions in `routes/tasks.ts` and `routes/users.ts`.

## Workflow

Changes here land via GitHub pull requests (history is PR-merge commits, e.g. #12, #21, #34, #40), not direct pushes to `main` — this overrides the workspace-level "commit directly to main" default. The README documents the fork → feature branch → PR flow. Keep `docs/API.md` and `CHANGELOG.md` in sync when endpoints or shipped behavior change.
