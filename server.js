const express = require('express');
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const app = express();

const BASE_URL = process.env.BASE_URL || 'http://192.142.24.100:8080';
const USERNAME = process.env.USERNAME || 'CesiSalvi';
const PASSWORD = process.env.PASSWORD || 'f2wcHypsGL';
const TOKEN    = process.env.TOKEN    || 'bzdKTHRUSnBCeDhSQjRV';

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Range');
  res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type');
  next();
});

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'IPTV Proxy running' });
});

app.get('/stream/:channelId', async (req, res) => {
  const { channelId } = req.params;
  const upstreamUrl = BASE_URL + '/' + USERNAME + '/' + PASSWORD + '/' + channelId + '?token=' + TOKEN;

  console.log('[stream] ' + upstreamUrl);

  try {
    const headers = {
      'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
      'Accept': '*/*',
      'Connection': 'keep-alive'
    };

    if (req.headers['range']) {
      headers['Range'] = req.headers['range'];
    }

    const upstream = await fetch(upstreamUrl, { headers: headers });

    if (!upstream.ok) {
      return res.status(upstream.status).send('Upstream error: ' + upstream.status);
    }

    const ct = upstream.headers.get('content-type');
    const cl = upstream.headers.get('content-length');
    const cr = upstream.headers.get('content-range');

    res.setHeader('Content-Type', ct || 'video/mp2t');
    if (cl) res.setHeader('Content-Length', cl);
    if (cr) res.setHeader('Content-Range', cr);
    res.setHeader('Cache-Control', 'no-cache');

    upstream.body.pipe(res);
    req.on('close', function() { upstream.body.destroy(); });

  } catch (err) {
    console.error('[stream] error: ' + err.message);
    res.status(500).send('Proxy error: ' + err.message);
  }
});

app.get('/live/:channelId', async (req, res) => {
  const { channelId } = req.params;
  const upstreamUrl = BASE_URL + '/live/' + USERNAME + '/' + PASSWORD + '/' + channelId + '?token=' + TOKEN;

  console.log('[live] ' + upstreamUrl);

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: {
        'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
        'Accept': '*/*'
      }
    });

    if (!upstream.ok) {
      return res.status(upstream.status).send('Upstream error: ' + upstream.status);
    }

    const ct = upstream.headers.get('content-type');
    res.setHeader('Content-Type', ct || 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'no-cache');

    upstream.body.pipe(res);
    req.on('close', function() { upstream.body.destroy(); });

  } catch (err) {
    res.status(500).send('Proxy error: ' + err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
  console.log('IPTV Proxy listening on port ' + PORT);
});
