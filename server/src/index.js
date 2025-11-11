const express = require('express');
const http = require('http');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const admin = require('firebase-admin');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
app.use(cors({
  origin: (origin, cb) => {
    const allowed = (process.env.CORS_ORIGINS || '*').split(',').map(s => s.trim());
    if (!origin || allowed.includes('*') || allowed.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  }
}));
app.use(bodyParser.json());

function initFirebase() {
  let creds = null;
  const jsonPath = process.env.FIREBASE_SERVICE_ACCOUNT;
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (jsonPath) {
    creds = require(path.resolve(jsonPath));
  } else if (b64) {
    creds = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  } else {
    console.warn('WARNING: No Firebase service account provided. Push will fail.');
  }
  if (!admin.apps.length && creds) {
    admin.initializeApp({ credential: admin.credential.cert(creds) });
  }
}
initFirebase();

function beaconKey(uuid, major, minor) {
  return `${String(uuid).toLowerCase()}:${major}:${minor}`;
}

const devices = new Map();
const presenceByBeacon = new Map();
const messagesLog = [];

function cleanup() {
  const now = Date.now();
  for (const [key, map] of presenceByBeacon) {
    for (const [deviceId, exp] of map) {
      if (exp <= now) map.delete(deviceId);
    }
    if (map.size === 0) presenceByBeacon.delete(key);
  }
}
setInterval(cleanup, 30000);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
io.on('connection', (socket) => {
  socket.on('subscribe', ({ uuid, major, minor }) => {
    if (uuid == null || major == null || minor == null) return;
    socket.join(beaconKey(uuid, major, minor));
  });
});

app.get('/api/health', (_, res) => res.json({ ok: true }));

app.post('/api/register-token', (req, res) => {
  const { deviceId, platform, token } = req.body || {};
  if (!deviceId || !platform || !token) {
    return res.status(400).json({ error: 'deviceId, platform y token son requeridos' });
  }
  devices.set(deviceId, { token, platform, updatedAt: new Date().toISOString() });
  return res.json({ ok: true });
});

app.post('/api/presence', (req, res) => {
  const { deviceId, nearby, ttlSeconds } = req.body || {};
  if (!deviceId || !Array.isArray(nearby)) {
    return res.status(400).json({ error: 'deviceId y nearby[] son requeridos' });
  }
  const ttl = (parseInt(ttlSeconds, 10) || parseInt(process.env.PRESENCE_TTL_SECONDS || '120', 10)) * 1000;
  const expiry = Date.now() + ttl;

  nearby.forEach(b => {
    if (!b || b.uuid == null || b.major == null || b.minor == null) return;
    const key = beaconKey(b.uuid, b.major, b.minor);
    if (!presenceByBeacon.has(key)) presenceByBeacon.set(key, new Map());
    presenceByBeacon.get(key).set(deviceId, expiry);
    io.to(key).emit('presence', { deviceId, key, expiry });
  });

  return res.json({ ok: true, count: nearby.length, expiryMs: expiry });
});

app.post('/api/messages', async (req, res) => {
  const { uuid, major, minor, title, body, data } = req.body || {};
  if (!uuid || major == null || minor == null || !title) {
    return res.status(400).json({ error: 'uuid, major, minor y title son requeridos' });
  }
  const key = beaconKey(uuid, major, minor);
  const room = presenceByBeacon.get(key);
  const msgId = uuidv4();

  const targetDeviceIds = room ? Array.from(room.keys()) : [];
  const tokens = targetDeviceIds.map(id => devices.get(id)?.token).filter(Boolean);

  if (!admin.apps.length) {
    return res.status(500).json({ error: 'Firebase Admin no inicializado. Configura el service account.' });
  }

  const notification = { title, body: body || '' };
  const payload = { tokens, notification, data: Object.assign({ beaconKey: key, messageId: msgId }, data || {}) };

  let report = { successCount: 0, failureCount: 0, responses: [] };
  if (tokens.length > 0) {
    report = await admin.messaging().sendEachForMulticast(payload);
    report.responses.forEach((r, idx) => {
      if (!r.success) {
        const err = r.error;
        if (err && err.code === 'messaging/registration-token-not-registered') {
          const badToken = tokens[idx];
          for (const [id, dev] of devices) { if (dev.token === badToken) devices.delete(id); }
        }
      }
    });
  }

  const log = { id: msgId, key, title, body: body || '', data: data || {}, createdAt: new Date().toISOString(), sentTo: tokens.length, success: report.successCount, failure: report.failureCount };
  messagesLog.push(log);
  io.to(key).emit('message', { id: msgId, title, body: body || '', data: data || {}, key });

  return res.json({ ok: true, log });
});

app.get('/api/messages/logs', (_, res) => res.json(messagesLog));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { console.log(`Server listening on http://localhost:${PORT}`); });
