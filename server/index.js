const crypto = require('crypto');
const path = require('path');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const port = Number(process.env.PORT || 3000);
const jwtSecret = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || process.env.PGHOST || 'localhost',
  port: Number(process.env.POSTGRES_PORT || process.env.PGPORT || 5432),
  user: process.env.POSTGRES_USER || process.env.PGUSER || 'newmeta',
  password: process.env.POSTGRES_PASSWORD || process.env.PGPASSWORD || 'newmeta_password',
  database: process.env.POSTGRES_DB || process.env.PGDATABASE || 'newmeta',
});

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, '..')));

const ONLINE_WINDOW_MINUTES = 5;

function signToken(user) {
  return jwt.sign({
    sub: user.id,
    username: user.username,
    tokenVersion: Number(user.token_version || 0),
  }, jwtSecret, { expiresIn: '30d' });
}

function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase();
}

function publicUser(row) {
  return {
    id: row.id,
    username: row.username,
    createdAt: row.created_at,
    status: row.status || 'active',
    isAdmin: row.username === 'admin',
  };
}

function requireAdmin(req, res, next) {
  if (req.user?.username !== 'admin') return res.status(403).json({ error: 'admin only' });
  next();
}

function toDelta(value) {
  if (value === undefined || value === null || value === '') return 0;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(Math.max(-1000000000, Math.min(1000000000, n)));
}

async function logUserEvent(userId, action, detail = {}) {
  await pool.query(
    'INSERT INTO user_logs (user_id, action, detail) VALUES ($1, $2, $3::jsonb)',
    [userId, action, JSON.stringify(detail)],
  );
}

async function initDb() {
  await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      username VARCHAR(20) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      token_version INTEGER NOT NULL DEFAULT 0,
      last_login_at TIMESTAMPTZ,
      last_seen_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active'");
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0');
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ');
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS game_saves (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      save_data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_logs (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(60) NOT NULL,
      detail JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS user_logs_user_id_idx ON user_logs(user_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS user_logs_created_at_idx ON user_logs(created_at DESC)');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS suggestions (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS suggestions_created_at_idx ON suggestions(created_at DESC)');
}

async function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'unauthorized' });

  try {
    const payload = jwt.verify(token, jwtSecret);
    const { rows } = await pool.query(
      'SELECT id, username, status, token_version, created_at, last_login_at, last_seen_at FROM users WHERE id = $1',
      [payload.sub],
    );
    if (!rows.length) return res.status(401).json({ error: 'unauthorized' });
    const user = rows[0];
    if (user.status !== 'active' && user.username !== 'admin') {
      return res.status(403).json({ error: 'account is suspended' });
    }
    if (Number(payload.tokenVersion || 0) !== Number(user.token_version || 0)) {
      return res.status(401).json({ error: 'session expired' });
    }
    const seen = await pool.query(
      `UPDATE users
          SET last_seen_at = NOW()
        WHERE id = $1
        RETURNING id, username, status, token_version, created_at, last_login_at, last_seen_at`,
      [user.id],
    );
    req.user = seen.rows[0];
    next();
  } catch {
    return res.status(401).json({ error: 'unauthorized' });
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', game: 'NEW META' });
});

app.post('/api/auth/register', async (req, res) => {
  const username = normalizeUsername(req.body.username);
  const password = String(req.body.password || '');

  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return res.status(400).json({ error: 'username must be 3-20 lowercase letters, numbers, or underscores' });
  }
  if (password.length < 4 || password.length > 100) {
    return res.status(400).json({ error: 'password must be 4-100 characters' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (username, password_hash, last_login_at, last_seen_at)
       VALUES ($1, $2, NOW(), NOW())
       RETURNING id, username, status, token_version, created_at, last_login_at, last_seen_at`,
      [username, passwordHash],
    );
    const user = rows[0];
    await logUserEvent(user.id, 'register', { username: user.username });
    res.status(201).json({ token: signToken(user), user: publicUser(user), save: null });
  } catch (err) {
    if (err && err.code === '23505') return res.status(409).json({ error: 'username already exists' });
    console.error(err);
    res.status(500).json({ error: 'register failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const username = normalizeUsername(req.body.username);
  const password = String(req.body.password || '');

  const { rows } = await pool.query(
    `SELECT u.id, u.username, u.password_hash, u.status, u.token_version, u.created_at, s.save_data
       FROM users u
       LEFT JOIN game_saves s ON s.user_id = u.id
      WHERE u.username = $1`,
    [username],
  );
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'invalid username or password' });
  }
  if (user.status !== 'active' && user.username !== 'admin') {
    return res.status(403).json({ error: 'account is suspended' });
  }

  await pool.query(
    'UPDATE users SET last_login_at = NOW(), last_seen_at = NOW() WHERE id = $1',
    [user.id],
  );
  await logUserEvent(user.id, 'login', { username: user.username });

  res.json({
    token: signToken(user),
    user: publicUser(user),
    save: user.save_data || null,
  });
});

app.get('/api/auth/me', auth, async (req, res) => {
  res.json({ user: publicUser(req.user) });
});

app.get('/api/save', auth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT save_data, updated_at FROM game_saves WHERE user_id = $1',
    [req.user.id],
  );
  res.json({
    save: rows[0]?.save_data || null,
    updatedAt: rows[0]?.updated_at || null,
  });
});

app.put('/api/save', auth, async (req, res) => {
  const save = req.body.save;
  if (!save || typeof save !== 'object' || Array.isArray(save)) {
    return res.status(400).json({ error: 'save must be an object' });
  }

  await pool.query(
    `INSERT INTO game_saves (user_id, save_data, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET save_data = EXCLUDED.save_data, updated_at = NOW()`,
    [req.user.id, JSON.stringify(save)],
  );
  await logUserEvent(req.user.id, 'save:update');
  res.json({ ok: true });
});

app.delete('/api/save', auth, async (req, res) => {
  await pool.query('DELETE FROM game_saves WHERE user_id = $1', [req.user.id]);
  await logUserEvent(req.user.id, 'save:delete');
  res.json({ ok: true });
});

/* ── 건의사항 (유저 → 운영자 단방향) ── */
app.post('/api/suggestions', auth, async (req, res) => {
  const content = String(req.body.content || '').trim();
  if (content.length < 4) return res.status(400).json({ error: 'suggestion must be at least 4 characters' });
  if (content.length > 1000) return res.status(400).json({ error: 'suggestion must be at most 1000 characters' });

  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS cnt FROM suggestions
      WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '24 hours'`,
    [req.user.id],
  );
  if (rows[0].cnt >= 10) {
    return res.status(429).json({ error: 'you can send up to 10 suggestions per day' });
  }

  await pool.query(
    'INSERT INTO suggestions (user_id, content) VALUES ($1, $2)',
    [req.user.id, content],
  );
  await logUserEvent(req.user.id, 'suggestion:create', { length: content.length });
  res.status(201).json({ ok: true });
});

app.get('/api/admin/suggestions', auth, requireAdmin, async (req, res) => {
  const limit = Math.max(1, Math.min(500, Number(req.query.limit) || 200));
  const { rows } = await pool.query(
    `SELECT s.id, s.content, s.created_at, u.username
       FROM suggestions s
       LEFT JOIN users u ON u.id = s.user_id
      ORDER BY s.created_at DESC
      LIMIT $1`,
    [limit],
  );
  res.json({
    suggestions: rows.map((row) => ({
      id: row.id,
      username: row.username || 'deleted',
      content: row.content,
      createdAt: row.created_at,
    })),
  });
});

app.get('/api/admin/users', auth, requireAdmin, async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.username, u.status, u.created_at, u.last_login_at, u.last_seen_at,
            s.updated_at, s.save_data,
            u.last_seen_at >= NOW() - ($1::int * INTERVAL '1 minute') AS online
       FROM users u
       LEFT JOIN game_saves s ON s.user_id = u.id
      ORDER BY u.username ASC`,
    [ONLINE_WINDOW_MINUTES],
  );
  res.json({
    users: rows.map((row) => ({
      id: row.id,
      username: row.username,
      status: row.status,
      createdAt: row.created_at,
      lastLoginAt: row.last_login_at,
      lastSeenAt: row.last_seen_at,
      updatedAt: row.updated_at,
      online: !!row.online,
      hasSave: !!row.save_data,
      level: row.save_data?.level || 0,
      gold: row.save_data?.gold || 0,
      gems: row.save_data?.gems || 0,
      stones: row.save_data?.stones || 0,
    })),
  });
});

app.get('/api/admin/summary', auth, requireAdmin, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT
       COUNT(*)::int AS total_users,
       COUNT(*) FILTER (WHERE status = 'active')::int AS active_users,
       COUNT(*) FILTER (WHERE status <> 'active')::int AS suspended_users,
       COUNT(*) FILTER (WHERE last_seen_at >= NOW() - ($1::int * INTERVAL '1 minute'))::int AS online_users
     FROM users`,
    [ONLINE_WINDOW_MINUTES],
  );
  res.json({
    currentUser: publicUser(req.user),
    onlineWindowMinutes: ONLINE_WINDOW_MINUTES,
    totals: rows[0],
  });
});

app.get('/api/admin/logs', auth, requireAdmin, async (req, res) => {
  const username = normalizeUsername(req.query.username);
  const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 80));
  const params = [limit];
  let where = '';

  if (username) {
    params.push(username);
    where = `WHERE u.username = $${params.length}`;
  }

  const { rows } = await pool.query(
    `SELECT l.id, l.action, l.detail, l.created_at, u.username
       FROM user_logs l
       LEFT JOIN users u ON u.id = l.user_id
       ${where}
      ORDER BY l.created_at DESC
      LIMIT $1`,
    params,
  );
  res.json({
    logs: rows.map((row) => ({
      id: row.id,
      username: row.username,
      action: row.action,
      detail: row.detail,
      createdAt: row.created_at,
    })),
  });
});

app.post('/api/admin/logout-all', auth, requireAdmin, async (req, res) => {
  const { rowCount } = await pool.query(
    `UPDATE users
        SET token_version = token_version + 1,
            last_seen_at = NULL,
            updated_at = NOW()`,
  );
  await logUserEvent(req.user.id, 'admin:logout_all', {
    admin: req.user.username,
    affectedUsers: rowCount,
  });
  res.json({ ok: true, affectedUsers: rowCount });
});

app.patch('/api/admin/users/:username/status', auth, requireAdmin, async (req, res) => {
  const username = normalizeUsername(req.params.username);
  const status = String(req.body.status || '').trim().toLowerCase();

  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return res.status(400).json({ error: 'target username is invalid' });
  }
  if (!['active', 'suspended'].includes(status)) {
    return res.status(400).json({ error: 'status must be active or suspended' });
  }
  if (username === 'admin' && status !== 'active') {
    return res.status(400).json({ error: 'admin account cannot be suspended' });
  }

  const { rows } = await pool.query(
    `UPDATE users
        SET status = $2, updated_at = NOW()
      WHERE username = $1
      RETURNING id, username, status, created_at, last_login_at, last_seen_at`,
    [username, status],
  );
  const target = rows[0];
  if (!target) return res.status(404).json({ error: 'target user not found' });

  await logUserEvent(target.id, 'admin:status', {
    admin: req.user.username,
    status,
  });

  res.json({ ok: true, user: publicUser(target) });
});

app.patch('/api/admin/users/:username/level', auth, requireAdmin, async (req, res) => {
  const username = normalizeUsername(req.params.username);
  const level = Number(req.body.level);

  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return res.status(400).json({ error: 'target username is invalid' });
  }
  if (!Number.isInteger(level) || level < 1 || level > 200) {
    return res.status(400).json({ error: 'level must be an integer from 1 to 200' });
  }

  const { rows } = await pool.query(
    `SELECT u.id, u.username, s.save_data
       FROM users u
       LEFT JOIN game_saves s ON s.user_id = u.id
      WHERE u.username = $1`,
    [username],
  );
  const target = rows[0];
  if (!target) return res.status(404).json({ error: 'target user not found' });
  if (!target.save_data) return res.status(409).json({ error: 'target user has no game save yet' });

  const save = target.save_data;
  const previousLevel = Math.max(1, Math.trunc(Number(save.level || 1)));
  save.level = level;
  save.exp = 0;

  await pool.query(
    'UPDATE game_saves SET save_data = $2::jsonb, updated_at = NOW() WHERE user_id = $1',
    [target.id, JSON.stringify(save)],
  );
  await logUserEvent(target.id, 'admin:level', {
    admin: req.user.username,
    previousLevel,
    level,
  });

  res.json({
    ok: true,
    user: target.username,
    previousLevel,
    level,
  });
});

app.post('/api/admin/currency', auth, requireAdmin, async (req, res) => {
  const username = normalizeUsername(req.body.username);
  const goldDelta = toDelta(req.body.gold);
  const gemsDelta = toDelta(req.body.gems);
  const stonesDelta = toDelta(req.body.stones);

  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return res.status(400).json({ error: 'target username is invalid' });
  }
  if ([goldDelta, gemsDelta, stonesDelta].some((v) => v === null)) {
    return res.status(400).json({ error: 'currency values must be numbers' });
  }
  if (goldDelta === 0 && gemsDelta === 0 && stonesDelta === 0) {
    return res.status(400).json({ error: 'enter at least one currency change' });
  }

  const { rows } = await pool.query(
    `SELECT u.id, u.username, s.save_data
       FROM users u
       LEFT JOIN game_saves s ON s.user_id = u.id
      WHERE u.username = $1`,
    [username],
  );
  const target = rows[0];
  if (!target) return res.status(404).json({ error: 'target user not found' });
  if (!target.save_data) return res.status(409).json({ error: 'target user has no game save yet' });

  const save = target.save_data;
  save.gold = Math.max(0, Math.trunc(Number(save.gold || 0) + goldDelta));
  save.gems = Math.max(0, Math.trunc(Number(save.gems || 0) + gemsDelta));
  save.stones = Math.max(0, Math.trunc(Number(save.stones || 0) + stonesDelta));

  await pool.query(
    'UPDATE game_saves SET save_data = $2::jsonb, updated_at = NOW() WHERE user_id = $1',
    [target.id, JSON.stringify(save)],
  );
  await logUserEvent(target.id, 'admin:currency', {
    admin: req.user.username,
    gold: goldDelta,
    gems: gemsDelta,
    stones: stonesDelta,
  });

  res.json({
    ok: true,
    user: target.username,
    balances: {
      gold: save.gold,
      gems: save.gems,
      stones: save.stones,
    },
  });
});

initDb()
  .then(() => app.listen(port, '0.0.0.0', () => {
    console.log(`NEW META server listening on ${port}`);
  }))
  .catch((err) => {
    console.error('DB init failed', err);
    process.exit(1);
  });
