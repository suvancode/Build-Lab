const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');

// ── Mongoose connection (cached across warm serverless invocations) ───────────
let cached = global._mongoConn;
if (!cached) {
  cached = global._mongoConn = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not defined');
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };
    cached.promise = mongoose.connect(process.env.MONGODB_URI, opts).then(m => m);
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }

  return cached.conn;
}

// ── Models ───────────────────────────────────────────────────────────────────

// Custom Added Sites
const SiteSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  url:         { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  image:       { type: String, default: '' },
  tags:        [{ type: String }],
  category:    { type: String, default: 'Web Apps' },
  pinned:      { type: Boolean, default: false },
  githubUrl:   { type: String, default: '' },
  order:       { type: Number, default: 0 },
  createdAt:   { type: Date,   default: Date.now },
  updatedAt:   { type: Date,   default: Date.now }
});

// GitHub Repos Custom Overrides (persists edits, custom URLs, tags, pin/hide)
const RepoOverrideSchema = new mongoose.Schema({
  repoId:      { type: String, required: true, unique: true }, // e.g. "gh_12345" or repo name
  repoName:    { type: String, required: true },
  displayName: { type: String, default: '' },
  customUrl:   { type: String, default: '' },
  description: { type: String, default: '' },
  image:       { type: String, default: '' },
  tags:        [{ type: String }],
  category:    { type: String, default: '' },
  pinned:      { type: Boolean, default: false },
  hidden:      { type: Boolean, default: false },
  order:       { type: Number, default: 0 },
  updatedAt:   { type: Date,   default: Date.now }
});

// User / Dashboard Settings (theme, custom username, pinned tags, etc.)
const SettingSchema = new mongoose.Schema({
  key:       { type: String, required: true, unique: true },
  value:     { type: mongoose.Schema.Types.Mixed },
  updatedAt: { type: Date, default: Date.now }
});

// Admin Authentication
const AdminSchema = new mongoose.Schema({
  passwordHash: { type: String, required: true },
  updatedAt:    { type: Date,   default: Date.now }
});

const Site         = mongoose.models.Site         || mongoose.model('Site', SiteSchema);
const RepoOverride = mongoose.models.RepoOverride || mongoose.model('RepoOverride', RepoOverrideSchema);
const Setting      = mongoose.models.Setting      || mongoose.model('Setting', SettingSchema);
const Admin        = mongoose.models.Admin        || mongoose.model('Admin', AdminSchema);

// ── Seed admin password on first run ─────────────────────────────────────────
async function ensureAdmin() {
  const exists = await Admin.findOne();
  if (!exists && process.env.ADMIN_PASSWORD) {
    const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
    await Admin.create({ passwordHash: hash });
    console.log('[BuildLab] Admin account initialized.');
  }
}

// ── Body parser — Vercel safe JSON parser ────────────────────────────────────
async function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => { data += chunk.toString(); });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

// ── CORS ─────────────────────────────────────────────────────────────────────
function handleCors(req, res) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}

// ── JWT ──────────────────────────────────────────────────────────────────────
function signToken() {
  const secret = process.env.JWT_SECRET || 'build-lab-fallback-secret-2026';
  return jwt.sign({ admin: true }, secret, { expiresIn: '14d' });
}

function verifyToken(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) throw new Error('No authentication token provided');
  const secret = process.env.JWT_SECRET || 'build-lab-fallback-secret-2026';
  return jwt.verify(header.slice(7), secret);
}

module.exports = {
  connectDB,
  Site,
  RepoOverride,
  Setting,
  Admin,
  ensureAdmin,
  handleCors,
  signToken,
  verifyToken,
  bcrypt,
  parseBody
};
