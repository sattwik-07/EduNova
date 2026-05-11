# EduNova Backend

Secure Node.js/Express backend for EduNova v3.  
All Groq API calls and database operations are handled **server-side** — no API keys ever reach the browser.

---

## Architecture

```
Browser (index.html)
  │
  │  fetch("/api/groq/chat")        ← no key sent
  │  fetch("/api/groq/transcribe")  ← no key sent
  │  fetch("/api/data")             ← CRUD
  ▼
Express Server (server.js)
  │  GROQ_API_KEY from .env         ← secret stays here
  ├── Groq Chat API  ──────────────► api.groq.com
  ├── Groq Whisper   ──────────────► api.groq.com
  └── JSON Database  ──────────────► data/db.json
```

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Create your `.env` file
```bash
cp .env.example .env
```
Edit `.env` and add your Groq API key:
```
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
PORT=3001
FRONTEND_ORIGIN=http://localhost:3000
```

Get a free Groq API key at https://console.groq.com

### 3. Start the server
```bash
npm start
```

The server will start at `http://localhost:3001` and serve the frontend at the same URL.

### 4. Open in browser
Navigate to `http://localhost:3001`

---

## API Endpoints

### Groq Proxy (no key in browser)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/groq/chat` | Chat completion via Groq LLM |
| `POST` | `/api/groq/transcribe` | Audio transcription via Whisper |

### Database
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/data` | Get all data |
| `POST` | `/api/data` | Bulk save all data |
| `POST` | `/api/data/reset` | Reset to seed data |
| `GET/POST` | `/api/data/events` | Events CRUD |
| `GET/POST` | `/api/data/lectures` | Lectures CRUD |
| `GET/POST` | `/api/data/students` | Students CRUD |
| `GET/POST` | `/api/data/resources` | Resources CRUD |
| `GET/POST` | `/api/data/notifications` | Notifications CRUD |
| `PUT` | `/api/data/rsvps` | Update RSVP |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Server status + Groq config check |

---

## File Structure

```
edunova-backend/
├── server.js          ← Express app & all routes
├── db.js              ← JSON file database layer
├── .env               ← Your secrets (never commit this!)
├── .env.example       ← Template — commit this
├── package.json
├── data/
│   └── db.json        ← Auto-created on first run (gitignore this)
└── public/
    └── index.html     ← EduNova frontend (served by Express)
```

---

## Production Upgrade (Recommended)

For real production use, replace `db.js` with a proper database:

### PostgreSQL (with pg)
```js
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
```

### MongoDB (with mongoose)
```js
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI);
```

### Environment variables to add
```
DATABASE_URL=postgres://user:pass@host:5432/edunova
NODE_ENV=production
```

---

## Security Notes

- ✅ `GROQ_API_KEY` stored in `.env`, never sent to the browser
- ✅ CORS restricts which origins can call the API  
- ✅ All AI calls proxied through the server
- ✅ File uploads limited to 50MB
- ⚠️ Add authentication middleware before deploying publicly
- ⚠️ Add rate limiting (`express-rate-limit`) in production
- ⚠️ Use HTTPS in production (e.g. via nginx reverse proxy)

---

## Demo Credentials (frontend)

| Role | Email | Password |
|------|-------|----------|
| Faculty | faculty@edu.com | demo123 |
| Student | student@edu.com | demo123 |
| Admin/HOD | hod@edu.com | demo123 |
