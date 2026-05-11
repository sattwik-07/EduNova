/**
 * db.js — Simple JSON file-based database
 * Stores all EduNova data in /data/db.json on the server.
 * In production, replace with PostgreSQL/MongoDB.
 */

const fs   = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");
const DB_FILE  = path.join(DATA_DIR, "db.json");

// ── Seed data (first-run defaults) ───────────────────────────────────────
const SEED = {
  events: [
    { id:"e1", title:"Intro to Machine Learning", type:"lecture", date: todayOffset(0), time:"10:00", duration:90,  venue:"Room 101", dept:"Computer Science", course:"CS401", faculty:"Dr. Sharma", recur:"none", desc:"" },
    { id:"e2", title:"Faculty Meeting",            type:"meeting", date: todayOffset(1), time:"14:00", duration:60,  venue:"Conference Room", dept:"Computer Science", course:"", faculty:"Dr. Sharma", recur:"none", desc:"" },
    { id:"e3", title:"Binary Trees Deep Dive",     type:"lecture", date: todayOffset(1), time:"09:00", duration:90,  venue:"Room 202", dept:"Computer Science", course:"CS201", faculty:"Dr. Sharma", recur:"none", desc:"" },
    { id:"e4", title:"Operating Systems Seminar",  type:"seminar", date: todayOffset(2), time:"15:00", duration:120, venue:"Seminar Hall", dept:"Computer Science", course:"CS301", faculty:"Dr. Rajesh Kumar", recur:"none", desc:"" },
  ],
  lectures: [
    { id:"l1", title:"Introduction to Machine Learning", subject:"CS401 — Deep Learning", date: todayOffset(-3), faculty:"Dr. Sharma",
      notes:"# Introduction to Machine Learning\n\n## What is ML?\nMachine Learning enables computers to learn from data.\n\n## Types\n- **Supervised** — labeled data\n- **Unsupervised** — clustering\n- **Reinforcement** — reward-based",
      quiz:"**Q1.** Which type uses labeled data?\nA) Supervised ✓\nB) Unsupervised\nC) Reinforcement",
      slides:"**Slide 1** What is ML?\n**Slide 2** • Supervised Learning\n**Slide 3** • Applications" },
    { id:"l2", title:"Binary Trees Deep Dive", subject:"CS201 — Data Structures", date: todayOffset(-1), faculty:"Dr. Sharma",
      notes:"# Binary Trees\n\n## Definition\nA binary tree has nodes with at most two children.\n\n## Traversals\n1. **Inorder** (L → Root → R)\n2. **Preorder** (Root → L → R)\n3. **Postorder** (L → R → Root)",
      quiz:"**Q1.** Max children per node in a binary tree?\nA) 2 ✓",
      slides:"**Slide 1** Binary Trees\n**Slide 2** • At most 2 children" },
  ],
  students: [
    { id:"st1", name:"Arjun Mehta",   email:"student@edu.com", batch:"CS401-A", dept:"Computer Science" },
    { id:"st2", name:"Priya Singh",   email:"priya@edu.com",   batch:"CS401-A", dept:"Computer Science" },
    { id:"st3", name:"Rahul Gupta",   email:"rahul@edu.com",   batch:"CS201-B", dept:"Computer Science" },
    { id:"st4", name:"Sneha Joshi",   email:"sneha@edu.com",   batch:"CS201-B", dept:"Computer Science" },
    { id:"st5", name:"Aditya Sharma", email:"aditya@edu.com",  batch:"CS301",   dept:"Computer Science" },
  ],
  resources: [
    { id:"r1", icon:"🏛", name:"Room 101",       cap:"40 seats",    bookings:[] },
    { id:"r2", icon:"🏛", name:"Room 202",       cap:"60 seats",    bookings:[] },
    { id:"r3", icon:"🖥", name:"CS Lab A",       cap:"30 systems",  bookings:[] },
    { id:"r4", icon:"🖥", name:"CS Lab B",       cap:"30 systems",  bookings:[] },
    { id:"r5", icon:"🎤", name:"Seminar Hall",   cap:"120 seats",   bookings:[] },
    { id:"r6", icon:"📽", name:"Projector Unit 1", cap:"Portable",  bookings:[] },
    { id:"r7", icon:"📽", name:"Projector Unit 2", cap:"Portable",  bookings:[] },
    { id:"r8", icon:"📺", name:"Smart Board",    cap:"Hall A",      bookings:[] },
  ],
  notifications: [
    { id:"n1", icon:"🎓", text:"You have been invited to \"Intro to ML\" today at 10:00 AM – Room 101.", time:"Today, 8:30 AM", unread:true,  rsvp:null, eventId:"e1" },
    { id:"n2", icon:"🔔", text:"Reminder: \"Binary Trees\" tomorrow at 9:00 AM – Room 202.",            time:"Today, 9:00 AM", unread:true,  rsvp:null, eventId:"e3" },
    { id:"n3", icon:"📣", text:"OS Seminar by Prof. Rajesh Kumar scheduled for tomorrow 3:00 PM.",       time:"Yesterday, 5:00 PM", unread:false, rsvp:"yes", eventId:"e4" },
  ],
  attendance: [],
  rsvps: {},
};

function todayOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ── Init ─────────────────────────────────────────────────────────────────
function init() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(SEED, null, 2));
    console.log("📦 Database initialised with seed data →", DB_FILE);
  }
}

function read() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  } catch {
    return JSON.parse(JSON.stringify(SEED));
  }
}

function write(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

module.exports = { init, read, write };
