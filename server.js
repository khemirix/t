const express = require(‘express’);
const fetch = (…args) => import(‘node-fetch’).then(({default: f}) => f(…args));

const app = express();

// ─── CONFIG ───────────────────────────────────────────────
const BASE_URL  = process.env.BASE_URL  || ‘http://porn-hub.streamtv.to:8080’;
const USERNAME  = process.env.USERNAME  || ‘CesiSalvi’;
const PASSWORD  = process.env.PASSWORD  || ‘f2wcHypsGL’;
// ──────────────────────────────────────────────────────────

// CORS – allow any origin so your HTML player can call this
app.use((req, res, next) => {
res.header(‘Access-Control-Allow-Origin’, ‘*’);
res.header(‘Access-Control-Allow-Headers’, ‘Range’);
res.header(‘Access-Control-Expose-Headers’, ‘Content-Length, Content-Range, Content-Type’);
next();
});

// Health check
app.get(’/’, (req, res) => {
res.json({ status: ‘ok’, info: ‘IPTV Proxy running’ });
});

// ─── STREAM ROUTE ─────────────────────────────────────────
// GET /stream/:channelId
// e.g. /stream/18776  or  /stream/18776.m3u8  or  /stream/18776.ts
app.get(’/stream/:channelId’, async (req, res) => {
const { channelId } = req.params;

// Build upstream URL: BASE/USERNAME/PASSWORD/channelId
const upstreamUrl = `${BASE_URL}/${USERNAME}/${PASSWORD}/${channelId}`;

console.log(`[stream] → ${upstreamUrl}`);

try {
const headers = {
‘User-Agent’: ‘VLC/3.0.18 LibVLC/3.0.18’,
‘Accept’: ‘*/*’,
‘Connection’: ‘keep-alive’,
};

```
// Forward Range header if present (needed for some players)
if (req.headers['range']) headers['Range'] = req.headers['range'];

const upstream = await fetch(upstreamUrl, { headers });

if (!upstream.ok) {
  console.error(`[stream] upstream error: ${upstream.status}`);
  return res.status(upstream.status).send(`Upstream error: ${upstream.status}`);
}

// Forward useful headers
const ct = upstream.headers.get('content-type');
const cl = upstream.headers.get('content-length');
const cr = upstream.headers.get('content-range');

if (ct) res.setHeader('Content-Type', ct);
else     res.setHeader('Content-Type', 'video/mp2t'); // default for IPTV TS
if (cl)  res.setHeader('Content-Length', cl);
if (cr)  res.setHeader('Content-Range', cr);

res.setHeader('Cache-Control', 'no-cache');

upstream.body.pipe(res);

req.on('close', () => upstream.body.destroy());
```

} catch (err) {
console.error(`[stream] fetch error: ${err.message}`);
res.status(500).send(`Proxy error: ${err.message}`);
}
});

// ─── LIVE PATH ROUTE ──────────────────────────────────────
// GET /live/:channelId  (some Xtream servers use /live/user/pass/ID.m3u8)
app.get(’/live/:channelId’, async (req, res) => {
const { channelId } = req.params;
const upstreamUrl = `${BASE_URL}/live/${USERNAME}/${PASSWORD}/${channelId}`;

console.log(`[live] → ${upstreamUrl}`);

try {
const upstream = await fetch(upstreamUrl, {
headers: { ‘User-Agent’: ‘VLC/3.0.18 LibVLC/3.0.18’, ‘Accept’: ‘*/*’ }
});

```
if (!upstream.ok) return res.status(upstream.status).send(`Upstream error: ${upstream.status}`);

const ct = upstream.headers.get('content-type');
res.setHeader('Content-Type', ct || 'application/vnd.apple.mpegurl');
res.setHeader('Cache-Control', 'no-cache');

upstream.body.pipe(res);
req.on('close', () => upstream.body.destroy());
```

} catch (err) {
res.status(500).send(`Proxy error: ${err.message}`);
}
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`IPTV Proxy listening on port ${PORT}`));