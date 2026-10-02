# ⚡ Flash-Poll — Real-Time Team Polling Engine

A full-stack polling application built with **Go** (backend), **React + TypeScript** (frontend), and **PostgreSQL** (database). Supports real-time vote updates, percentage analytics, full CRUD, and is fully containerized with Docker.

---

## 📁 Project Structure

```
flash-poll/
├── backend/
│   ├── cmd/server/main.go          # Entry point
│   ├── internal/
│   │   ├── api/router.go           # All HTTP handlers + CORS
│   │   ├── db/db.go                # PostgreSQL connection + migrations
│   │   └── models/models.go        # Data types & request/response structs
│   ├── Dockerfile
│   ├── go.mod
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/polls.ts            # API client (fetch wrapper)
│   │   ├── hooks/usePolls.ts       # State management hook
│   │   ├── components/
│   │   │   ├── PollCard.tsx        # Poll display + voting UI
│   │   │   └── CreatePollForm.tsx  # New poll modal form
│   │   ├── types/index.ts          # TypeScript interfaces
│   │   ├── App.tsx                 # Root component
│   │   └── App.css                 # Design system + styles
│   ├── public/index.html
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── docker-compose.yml
└── README.md
```

---

## 🚀 Quick Start (Docker — Recommended)

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) + [Docker Compose](https://docs.docker.com/compose/install/)

### Steps

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd flash-poll

# 2. Start all services (DB + backend + frontend)
docker-compose up --build

# 3. Open in browser
# Frontend → http://localhost:3000
# Backend API → http://localhost:8080
```

Docker Compose automatically:
- Starts PostgreSQL and waits for it to be healthy
- Builds and starts the Go backend (runs DB migrations on startup)
- Builds the React app and serves it via Nginx with API proxy

---

## 🛠️ Local Development (Without Docker)

### Backend

#### Prerequisites
- [Go 1.22+](https://go.dev/dl/)
- PostgreSQL running locally

#### Setup

```bash
cd backend

# 1. Install dependencies
go mod tidy

# 2. Create the database
psql -U postgres -c "CREATE DATABASE flashpoll;"

# 3. Configure environment
cp .env.example .env
# Edit .env with your DB credentials

# 4. Run the server (auto-runs migrations on startup)
go run ./cmd/server
# Server starts on http://localhost:8081
```

### Frontend

#### Prerequisites
- [Node.js 18+](https://nodejs.org/)

#### Setup

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Start dev server (proxies /api/* to localhost:8080)
npm start
# Opens http://localhost:3000
```

> **Note:** The `"proxy": "http://localhost:8081"` in `package.json` forwards all `/api` requests to the Go backend during development. Set `PORT=8081` in the backend `.env` file when running locally.

---

## 🗄️ Database Schema

```sql
-- Polls table
CREATE TABLE polls (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question   TEXT NOT NULL,
  category   TEXT NOT NULL CHECK (category IN (
               'general','product','hr','engineering','design','other')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Options table (cascades delete with parent poll)
CREATE TABLE options (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id     UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  vote_count  INTEGER NOT NULL DEFAULT 0 CHECK (vote_count >= 0)
);

CREATE INDEX idx_options_poll_id ON options(poll_id);
```

Migrations run **automatically** on backend startup via `db.RunMigrations()`.

---

## 📡 API Reference

### `GET /api/polls`
Returns all polls with their options.

**Response `200`:**
```json
[
  {
    "id": "uuid",
    "question": "Best deployment strategy?",
    "category": "engineering",
    "created_at": "2026-06-24T10:00:00Z",
    "options": [
      { "id": "uuid", "poll_id": "uuid", "option_text": "Blue-Green", "vote_count": 5 },
      { "id": "uuid", "poll_id": "uuid", "option_text": "Rolling", "vote_count": 3 }
    ]
  }
]
```

---

### `POST /api/polls`
Create a new poll.

**Request body:**
```json
{
  "question": "Best deployment strategy?",
  "category": "engineering",
  "options": ["Blue-Green", "Rolling", "Canary"]
}
```

**Response `201`:** Full poll object (same shape as GET).

**Validation errors `422`:**
- `question` is required
- Minimum 2 options required
- `category` must be one of: `general`, `product`, `hr`, `engineering`, `design`, `other`

---

### `PATCH /api/polls/:id/vote`
Cast a vote on one option. Uses an **atomic SQL UPDATE** to prevent race conditions.

**Request body:**
```json
{ "option_id": "uuid-of-the-option" }
```

**Response `200`:**
```json
{
  "poll_id": "uuid",
  "options": [ ... updated options with new vote counts ... ]
}
```

---

### `DELETE /api/polls/:id`
Delete a poll and all its options (via `ON DELETE CASCADE`).

**Response `204 No Content`**

---

## ⚙️ Environment Variables

| Variable      | Default     | Description                  |
|---------------|-------------|------------------------------|
| `PORT`        | `8080`      | Backend server port          |
| `DB_HOST`     | `localhost` | PostgreSQL host              |
| `DB_PORT`     | `5432`      | PostgreSQL port              |
| `DB_USER`     | `postgres`  | Database user                |
| `DB_PASSWORD` | _(empty)_   | Database password            |
| `DB_NAME`     | `flashpoll` | Database name                |
| `DB_SSLMODE`  | `disable`   | SSL mode (`disable`/`require`)|

---

## ✅ Features Implemented

| Requirement | Status |
|---|---|
| Create poll (question, category, options) | ✅ |
| Dashboard feed of all active polls | ✅ |
| Delete poll (cascades options) | ✅ |
| Vote persisted in PostgreSQL | ✅ |
| Atomic vote increment (no race conditions) | ✅ |
| Real-time UI update after vote (no page reload) | ✅ |
| Percentage breakdown per option | ✅ |
| Loading & Error states in UI | ✅ |
| Responsive React frontend | ✅ |
| Go backend with correct HTTP status codes | ✅ |
| UUID primary keys | ✅ |
| Docker + Docker Compose setup | ✅ |

---

## 🔮 Future Improvements

- **Authentication** — JWT-based user sessions, per-user vote tracking
- **Poll Expiration** — `expires_at` field with automatic archiving
- **WebSockets** — Push live vote updates to all connected clients
- **Rate Limiting** — Prevent vote spamming per IP
- **Poll Categories Filter** — Frontend filter bar by category
- **Tests** — Unit tests for handlers, integration tests with testcontainers

---

## 📄 License

Built as a technical assessment for LeMiCi IQ. All rights reserved.
