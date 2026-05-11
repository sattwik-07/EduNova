/**
 * server.js — EduNova Backend
 *
 * Handles:
 *  • All database reads/writes (JSON file store, swap for Postgres/Mongo in prod)
 *  • Groq Chat completions proxy  →  POST /api/groq/chat
 *  • Groq Whisper transcription   →  POST /api/groq/transcribe
 *  • App data CRUD                →  GET/POST/PUT/DELETE /api/data/*
 *
 * The API key NEVER leaves the server — the frontend has no access to it.
 */

require("dotenv").config();

const express  = require("express");
const cors     = require("cors");
const multer   = require("multer");
const fetch    = require("node-fetch");
const FormData = require("form-data");
const path     = require("path");
const db       = require("./db");

// ── Config ───────────────────────────────────────────────────────────────
const PORT             = process.env.PORT || 3001;
const GROQ_API_KEY     = process.env.GROQ_API_KEY || "";
const FRONTEND_ORIGIN  = process.env.FRONTEND_ORIGIN || "http://localhost:3000";
const GROQ_CHAT_URL    = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_WHISPER_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const CHAT_MODEL       = "llama3-70b-8192";
const WHISPER_MODEL    = "whisper-large-v3";

// ── Init ─────────────────────────────────────────────────────────────────
db.init();

const app    = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

app.use(cors({
  origin: [FRONTEND_ORIGIN, "http://localhost:3000", "http://127.0.0.1:3000",
           "http://localhost:5500", "http://127.0.0.1:5500",
           /^file:\/\//],          // allow opening index.html from disk during dev
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));

// Serve the frontend (optional — if you put index.html in /public)
app.use(express.static(path.join(__dirname, "public")));

// ── Health ────────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    groqConfigured: Boolean(GROQ_API_KEY && GROQ_API_KEY.length > 10),
    timestamp: new Date().toISOString(),
  });
});

// ════════════════════════════════════════════════════════════════════════
// ██ GROQ PROXY — API key stays on the server
// ════════════════════════════════════════════════════════════════════════

/**
 * POST /api/groq/chat
 * Body: { prompt: string, max_tokens?: number }
 * Returns: { text: string }
 */
app.post("/api/groq/chat", async (req, res) => {
  if (!GROQ_API_KEY) return res.status(503).json({ error: "Groq API key not configured on server." });

  const { prompt, max_tokens = 2000 } = req.body;
  if (!prompt) return res.status(400).json({ error: "prompt is required" });

  try {
    const groqRes = await fetch(GROQ_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens,
      }),
    });

    if (!groqRes.ok) {
      const err = await groqRes.json().catch(() => ({}));
      return res.status(groqRes.status).json({ error: err.error?.message || "Groq error" });
    }

    const data = await groqRes.json();
    res.json({ text: data.choices[0].message.content });
  } catch (err) {
    console.error("Groq chat error:", err.message);
    res.status(500).json({ error: "Failed to reach Groq API" });
  }
});

/**
 * POST /api/groq/transcribe
 * multipart/form-data: audio file in field "audio"
 * Returns: { text: string }
 */
app.post("/api/groq/transcribe", upload.single("audio"), async (req, res) => {
  if (!GROQ_API_KEY) return res.status(503).json({ error: "Groq API key not configured on server." });
  if (!req.file)     return res.status(400).json({ error: "No audio file uploaded" });

  try {
    const form = new FormData();
    form.append("file", req.file.buffer, {
      filename:    req.file.originalname || "audio.webm",
      contentType: req.file.mimetype     || "audio/webm",
    });
    form.append("model",           WHISPER_MODEL);
    form.append("response_format", "text");

    const whisperRes = await fetch(GROQ_WHISPER_URL, {
      method:  "POST",
      headers: { Authorization: `Bearer ${GROQ_API_KEY}`, ...form.getHeaders() },
      body:    form,
    });

    if (!whisperRes.ok) {
      const err = await whisperRes.json().catch(() => ({}));
      return res.status(whisperRes.status).json({ error: err.error?.message || "Whisper error" });
    }

    const text = await whisperRes.text();
    res.json({ text });
  } catch (err) {
    console.error("Whisper error:", err.message);
    res.status(500).json({ error: "Failed to transcribe audio" });
  }
});

// ════════════════════════════════════════════════════════════════════════
// ██ DATABASE API
// ════════════════════════════════════════════════════════════════════════

/** GET /api/data — return entire DB snapshot */
app.get("/api/data", (_req, res) => {
  res.json(db.read());
});

/** POST /api/data — replace entire DB (bulk save from frontend) */
app.post("/api/data", (req, res) => {
  const incoming = req.body;
  const allowed  = ["events","lectures","students","resources","notifications","attendance","rsvps"];
  const current  = db.read();
  allowed.forEach(k => { if (incoming[k] !== undefined) current[k] = incoming[k]; });
  db.write(current);
  res.json({ ok: true });
});

/** POST /api/data/reset — reset to seed */
app.post("/api/data/reset", (_req, res) => {
  const { init } = require("./db");
  const fs = require("fs");
  const DATA_FILE = require("path").join(__dirname, "data", "db.json");
  fs.unlinkSync(DATA_FILE);
  db.init();
  res.json({ ok: true, data: db.read() });
});

// ── Fine-grained collection endpoints ────────────────────────────────────

function collectionRouter(key) {
  const router = express.Router();

  router.get("/", (_req, res) => {
    res.json(db.read()[key] || []);
  });

  router.post("/", (req, res) => {
    const data   = db.read();
    const item   = req.body;
    if (!item.id) item.id = "x" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    if (key === "rsvps") {
      // rsvps is a plain object, not array
      data.rsvps[item.eventId] = item.status;
    } else {
      data[key].unshift(item);
    }
    db.write(data);
    res.status(201).json(item);
  });

  router.put("/:id", (req, res) => {
    const data = db.read();
    const idx  = (data[key] || []).findIndex(x => x.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "Not found" });
    data[key][idx] = { ...data[key][idx], ...req.body };
    db.write(data);
    res.json(data[key][idx]);
  });

  router.delete("/:id", (req, res) => {
    const data = db.read();
    const before = (data[key] || []).length;
    data[key]    = (data[key] || []).filter(x => x.id !== req.params.id);
    db.write(data);
    res.json({ ok: true, deleted: before - data[key].length });
  });

  return router;
}

app.use("/api/data/events",        collectionRouter("events"));
app.use("/api/data/lectures",      collectionRouter("lectures"));
app.use("/api/data/students",      collectionRouter("students"));
app.use("/api/data/resources",     collectionRouter("resources"));
app.use("/api/data/notifications", collectionRouter("notifications"));
app.use("/api/data/attendance",    collectionRouter("attendance"));

/** RSVP update: PUT /api/data/rsvps */
app.put("/api/data/rsvps", (req, res) => {
  const { eventId, status } = req.body;
  const data = db.read();
  data.rsvps[eventId] = status;
  db.write(data);
  res.json({ ok: true });
});

// ── 404 fallback ──────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// ── Start ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║  EduNova Backend  •  http://localhost:${PORT}  ║
╠══════════════════════════════════════════════╣
║  Groq API  : ${GROQ_API_KEY ? "✅ Configured" : "❌ Missing — set GROQ_API_KEY"}
║  Database  : data/db.json (JSON file store)
║  Frontend  : ${FRONTEND_ORIGIN}
╚══════════════════════════════════════════════╝
  `);
});
