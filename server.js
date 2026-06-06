const express = require('express');
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Range');
  res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type');
  next();
});

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'IPTV Proxy running' });
});

app.get('/play/:streamId', async (req, res) => {
  const { streamId } = req.params;
  const upstreamUrl = 'http://77.137.40.221:8000/play/' + streamId;

  console.log('[play] ' + upstreamUrl);

  try {
    const headers = {
      'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
      'Accept': '*/*',
      'Accept-Encoding': 'identity',
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
    console.error('[play] error: ' + err.message);
    res.status(500).send('Proxy error: ' + err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
  console.log('IPTV Proxy listening on port ' + PORT);
});
