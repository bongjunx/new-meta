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

const SAVE_LIMITS = {
  maxBytes: 1500000,
  maxCurrency: 2000000000,
  maxCounter: 1000000000,
  maxInventory: 10000,
  maxObjectKeys: 500,
  maxString: 80,
};

const SAVE_TOP_KEYS = new Set([
  'name', 'classId', 'level', 'exp', 'gold', 'stones', 'gems', 'tomes', 'awakenStones',
  'skillPoints', 'passiveLevels', 'skillLevels', 'skillAwakened', 'materials', 'runes',
  'skillRunes', 'potions', 'inventory', 'equipped', 'nextUid', 'kills', 'deaths',
  'curHp', 'curMp', 'pets', 'activePet', 'rebirths', 'rebirthPts', 'bestFloor', 'pity',
  'codex', 'achievementsClaimed', 'counters', 'daily', 'passives',
]);
const CLASS_IDS = new Set(['knight', 'rogue', 'merchant', 'mage', 'gladiator']);
const EQUIP_SLOTS = new Set(['weapon', 'armor', 'helmet', 'gloves', 'accessory']);
const RARITIES = new Set(['common', 'uncommon', 'rare', 'epic', 'legend']);
const STAT_KEYS = new Set(['hp', 'mp', 'atk', 'def', 'critRate', 'critDmg']);
const SAFE_ID_RE = /^[a-zA-Z0-9_:-]{1,80}$/;
const SHOP_ITEMS = {
  potion_hp: { currency: 'gold', price: 30, reward: { type: 'potion', key: 'hp', count: 1 } },
  potion_mp: { currency: 'gold', price: 35, reward: { type: 'potion', key: 'mp', count: 1 } },
  stone: { currency: 'gold', price: 5000, reward: { type: 'field', key: 'stones', count: 1 } },
  gem_pack: { currency: 'gold', price: 100000, reward: { type: 'field', key: 'gems', count: 40 } },
  tome: { currency: 'gems', price: 150, reward: { type: 'field', key: 'tomes', count: 1 } },
};

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function isSafeString(value, max = SAVE_LIMITS.maxString) {
  return typeof value === 'string' &&
    value.length <= max &&
    !/[<>\u0000-\u001f\u007f]/.test(value);
}

function validInteger(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max;
}

function validateIdMap(value, label, maxValue = SAVE_LIMITS.maxCounter) {
  if (value === undefined) return null;
  if (!isPlainObject(value)) return `${label} must be an object`;
  const entries = Object.entries(value);
  if (entries.length > SAVE_LIMITS.maxObjectKeys) return `${label} has too many entries`;
  for (const [key, count] of entries) {
    if (!SAFE_ID_RE.test(key)) return `${label} has an invalid key`;
    if (!validInteger(count, 0, maxValue)) return `${label}.${key} must be an integer from 0 to ${maxValue}`;
  }
  return null;
}

function validateStringArray(value, label, maxItems = 300) {
  if (value === undefined) return null;
  if (!Array.isArray(value)) return `${label} must be an array`;
  if (value.length > maxItems) return `${label} has too many entries`;
  for (const item of value) {
    if (!isSafeString(item)) return `${label} contains an invalid string`;
  }
  return null;
}

function validateInventory(inventory) {
  if (!Array.isArray(inventory)) return 'inventory must be an array';
  if (inventory.length > SAVE_LIMITS.maxInventory) return `inventory can contain at most ${SAVE_LIMITS.maxInventory} items`;

  const seen = new Set();
  for (const item of inventory) {
    if (!isPlainObject(item)) return 'inventory item must be an object';
    if (!validInteger(item.uid, 1, SAVE_LIMITS.maxCounter)) return 'inventory item uid is invalid';
    if (seen.has(item.uid)) return 'inventory contains duplicate uid';
    seen.add(item.uid);
    if (!EQUIP_SLOTS.has(item.slot)) return 'inventory item slot is invalid';
    if (!RARITIES.has(item.rarity)) return 'inventory item rarity is invalid';
    if (!STAT_KEYS.has(item.mainStat)) return 'inventory item mainStat is invalid';
    if (!validInteger(item.mainValue, 0, 10000000)) return 'inventory item mainValue is invalid';
    if (!validInteger(item.enhance ?? 0, 0, 20)) return 'inventory item enhance is invalid';
    for (const key of ['typeName', 'name', 'rarityName', 'icon']) {
      if (item[key] !== undefined && !isSafeString(item[key])) return `inventory item ${key} is invalid`;
    }
    if (item.subOpts !== undefined) {
      if (!Array.isArray(item.subOpts) || item.subOpts.length > 6) return 'inventory item subOpts is invalid';
      for (const opt of item.subOpts) {
        if (!Array.isArray(opt) || opt.length !== 2 || !STAT_KEYS.has(opt[0]) || !validInteger(opt[1], 0, 10000000)) {
          return 'inventory item subOpt is invalid';
        }
      }
    }
    if (item.runes !== undefined) {
      const err = validateStringArray(item.runes, 'inventory item runes', 2);
      if (err) return err;
    }
  }
  return null;
}

function validateSaveData(save) {
  let encoded;
  try {
    encoded = JSON.stringify(save);
  } catch {
    return { ok: false, error: 'save must be JSON serializable' };
  }
  if (!encoded || encoded.length > SAVE_LIMITS.maxBytes) {
    return { ok: false, error: `save is too large; max ${SAVE_LIMITS.maxBytes} bytes` };
  }

  for (const key of Object.keys(save)) {
    if (!SAVE_TOP_KEYS.has(key)) return { ok: false, error: `unknown save field: ${key}` };
  }
  if (!isSafeString(save.name, 30)) return { ok: false, error: 'name is invalid' };
  if (!CLASS_IDS.has(save.classId)) return { ok: false, error: 'classId is invalid' };

  const integerChecks = [
    ['level', 1, 500], ['exp', 0, 1000000000000], ['gold', 0, SAVE_LIMITS.maxCurrency],
    ['stones', 0, SAVE_LIMITS.maxCurrency], ['gems', 0, SAVE_LIMITS.maxCurrency],
    ['tomes', 0, SAVE_LIMITS.maxCurrency], ['awakenStones', 0, SAVE_LIMITS.maxCurrency],
    ['skillPoints', 0, SAVE_LIMITS.maxCurrency], ['nextUid', 1, SAVE_LIMITS.maxCounter],
    ['kills', 0, SAVE_LIMITS.maxCounter], ['deaths', 0, SAVE_LIMITS.maxCounter],
    ['curHp', 0, SAVE_LIMITS.maxCurrency], ['curMp', 0, SAVE_LIMITS.maxCurrency],
    ['rebirths', 0, SAVE_LIMITS.maxCounter], ['rebirthPts', 0, SAVE_LIMITS.maxCurrency],
    ['bestFloor', 0, 1000000],
  ];
  for (const [key, min, max] of integerChecks) {
    if (!validInteger(save[key], min, max)) return { ok: false, error: `${key} must be an integer from ${min} to ${max}` };
  }

  if (save.activePet !== null && save.activePet !== undefined && !isSafeString(save.activePet)) {
    return { ok: false, error: 'activePet is invalid' };
  }
  for (const [field, maxValue] of [
    ['passiveLevels', 100], ['skillLevels', 100], ['materials', SAVE_LIMITS.maxCurrency],
    ['runes', SAVE_LIMITS.maxCurrency], ['codex', SAVE_LIMITS.maxCounter],
    ['counters', SAVE_LIMITS.maxCounter], ['pity', SAVE_LIMITS.maxCounter],
  ]) {
    const err = validateIdMap(save[field], field, maxValue);
    if (err) return { ok: false, error: err };
  }
  if (save.skillAwakened !== undefined) {
    if (!isPlainObject(save.skillAwakened)) return { ok: false, error: 'skillAwakened must be an object' };
    for (const [key, value] of Object.entries(save.skillAwakened)) {
      if (!SAFE_ID_RE.test(key) || value !== true) return { ok: false, error: 'skillAwakened is invalid' };
    }
  }
  if (save.skillRunes !== undefined) {
    if (!isPlainObject(save.skillRunes)) return { ok: false, error: 'skillRunes must be an object' };
    for (const [key, value] of Object.entries(save.skillRunes)) {
      if (!SAFE_ID_RE.test(key)) return { ok: false, error: 'skillRunes has an invalid key' };
      const err = validateStringArray(value, `skillRunes.${key}`, 2);
      if (err) return { ok: false, error: err };
    }
  }
  if (save.pets !== undefined) {
    if (!isPlainObject(save.pets)) return { ok: false, error: 'pets must be an object' };
    for (const [key, pet] of Object.entries(save.pets)) {
      if (!SAFE_ID_RE.test(key) || !isPlainObject(pet)) return { ok: false, error: 'pets is invalid' };
      if (!validInteger(pet.level, 1, 100) || !validInteger(pet.count, 0, SAVE_LIMITS.maxCounter)) {
        return { ok: false, error: 'pet level/count is invalid' };
      }
    }
  }
  if (save.potions !== undefined) {
    if (!isPlainObject(save.potions)) return { ok: false, error: 'potions must be an object' };
    for (const key of ['hp', 'mp']) {
      if (!validInteger(save.potions[key] ?? 0, 0, SAVE_LIMITS.maxCurrency)) return { ok: false, error: `potions.${key} is invalid` };
    }
  }
  if (save.equipped !== undefined) {
    if (!isPlainObject(save.equipped)) return { ok: false, error: 'equipped must be an object' };
    for (const slot of EQUIP_SLOTS) {
      const uid = save.equipped[slot];
      if (uid !== null && uid !== undefined && !validInteger(uid, 1, SAVE_LIMITS.maxCounter)) {
        return { ok: false, error: `equipped.${slot} is invalid` };
      }
    }
  }
  const inventoryErr = validateInventory(save.inventory);
  if (inventoryErr) return { ok: false, error: inventoryErr };
  for (const [field, maxItems] of [['achievementsClaimed', 500], ['passives', 100]]) {
    const err = validateStringArray(save[field], field, maxItems);
    if (err) return { ok: false, error: err };
  }
  if (save.daily !== undefined && !isPlainObject(save.daily)) return { ok: false, error: 'daily must be an object' };

  return { ok: true };
}

function shopDiscountPct(save) {
  const level = Number(save?.passiveLevels?.p_thrift || 0);
  if (!Number.isFinite(level)) return 0;
  return Math.max(0, Math.min(100, Math.trunc(level))) * 0.25;
}

function serverShopPrice(save, item) {
  if (item.currency === 'gems') return item.price;
  return Math.max(1, Math.round(item.price * (1 - shopDiscountPct(save) / 100)));
}

function applyShopReward(save, reward) {
  if (reward.type === 'potion') {
    if (!isPlainObject(save.potions)) save.potions = { hp: 0, mp: 0 };
    save.potions[reward.key] = Math.trunc(Number(save.potions[reward.key] || 0)) + reward.count;
    return;
  }
  save[reward.key] = Math.trunc(Number(save[reward.key] || 0)) + reward.count;
}

function normalizeServerSave(save) {
  const defaults = {
    exp: 0,
    gold: 0,
    stones: 0,
    gems: 0,
    tomes: 0,
    awakenStones: 0,
    skillPoints: 0,
    passiveLevels: {},
    skillLevels: {},
    skillAwakened: {},
    materials: {},
    runes: {},
    skillRunes: {},
    potions: { hp: 0, mp: 0 },
    inventory: [],
    equipped: { weapon: null, armor: null, helmet: null, gloves: null, accessory: null },
    nextUid: 1,
    kills: 0,
    deaths: 0,
    curHp: 0,
    curMp: 0,
    pets: {},
    activePet: null,
    rebirths: 0,
    rebirthPts: 0,
    bestFloor: 0,
    pity: { equip: 0, pet: 0 },
    codex: {},
    achievementsClaimed: [],
    counters: {},
    daily: {},
  };

  for (const [key, value] of Object.entries(defaults)) {
    if (save[key] === undefined) save[key] = structuredClone(value);
  }
  if (!isPlainObject(save.potions)) save.potions = { hp: 0, mp: 0 };
  if (save.potions.hp === undefined) save.potions.hp = 0;
  if (save.potions.mp === undefined) save.potions.mp = 0;
  if (!isPlainObject(save.equipped)) save.equipped = structuredClone(defaults.equipped);
  for (const slot of EQUIP_SLOTS) {
    if (save.equipped[slot] === undefined) save.equipped[slot] = null;
  }
  if (Array.isArray(save.passives)) {
    if (!isPlainObject(save.passiveLevels)) save.passiveLevels = {};
    for (const pid of save.passives) {
      if (SAFE_ID_RE.test(pid) && !save.passiveLevels[pid]) save.passiveLevels[pid] = 10;
    }
    delete save.passives;
  }
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
  const validation = validateSaveData(save);
  if (!validation.ok) {
    return res.status(400).json({ error: validation.error });
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

app.post('/api/shop/buy', auth, async (req, res) => {
  const shopId = String(req.body.shopId || '').trim();
  const item = SHOP_ITEMS[shopId];
  if (!item) return res.status(400).json({ error: 'invalid shop item' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT save_data FROM game_saves WHERE user_id = $1 FOR UPDATE',
      [req.user.id],
    );
    if (!rows.length || !rows[0].save_data) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'game save is required before buying shop items' });
    }

    const save = rows[0].save_data;
    normalizeServerSave(save);
    const beforeValidation = validateSaveData(save);
    if (!beforeValidation.ok) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `current save is invalid: ${beforeValidation.error}` });
    }

    const price = serverShopPrice(save, item);
    const balance = Math.trunc(Number(save[item.currency] || 0));
    if (balance < price) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `${item.currency} is not enough` });
    }

    save[item.currency] = balance - price;
    applyShopReward(save, item.reward);

    const afterValidation = validateSaveData(save);
    if (!afterValidation.ok) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `purchase result is invalid: ${afterValidation.error}` });
    }

    await client.query(
      'UPDATE game_saves SET save_data = $2::jsonb, updated_at = NOW() WHERE user_id = $1',
      [req.user.id, JSON.stringify(save)],
    );
    await client.query(
      'INSERT INTO user_logs (user_id, action, detail) VALUES ($1, $2, $3::jsonb)',
      [req.user.id, 'shop:buy', JSON.stringify({ shopId, currency: item.currency, price })],
    );
    await client.query('COMMIT');
    res.json({
      ok: true,
      save,
      purchase: {
        shopId,
        currency: item.currency,
        price,
      },
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error(err);
    res.status(500).json({ error: 'shop purchase failed' });
  } finally {
    client.release();
  }
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
