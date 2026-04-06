# Task Manager API

A simple REST API for managing tasks and users, built with Express and TypeScript.

## Getting Started

```bash
npm install
npm run dev
```

The server starts on `http://localhost:3000`.

## API Endpoints

See [docs/API.md](docs/API.md) for full documentation with request/response examples.

### Authentication
- `POST /api/users/register` — Create a new account
- `POST /api/users/login` — Login and receive a JWT token

### Tasks (requires authentication)
- `GET /api/tasks` — List tasks (supports `?status=`, `?priority=`, `?assignee=`, `?tag=`, `?page=`, `?limit=`)
- `GET /api/tasks/:id` — Get a single task
- `POST /api/tasks` — Create a task
- `PATCH /api/tasks/:id` — Update a task
- `DELETE /api/tasks/:id` — Delete a task

### Users
- `GET /api/users/me` — Get current user profile
- `GET /api/users` — List all users (admin only)
- `DELETE /api/users/:id` — Delete a user (admin only)

### Health
- `GET /health` — Health check

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `JWT_SECRET` | `super-secret-key-change-in-production` | JWT signing secret |
| `LOG_LEVEL` | `info` | Logging level (debug, info, warn, error) |

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express
- **Language**: TypeScript
- **Auth**: JWT (jsonwebtoken)
- **Security**: Helmet, CORS
- **Logging**: Morgan + custom logger
