const { handleCors } = require('./_lib');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'Target url parameter is required' });
  }

  let targetUrl = String(url).trim();
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = 'https://' + targetUrl;
  }

  try {
    new URL(targetUrl);
  } catch {
    return res.status(400).json({ error: 'Invalid URL provided' });
  }

  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) BuildLabStatusBot/2.0'
      },
      signal: controller.signal,
      redirect: 'follow'
    });

    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;

    // Check iframe framing blocking headers
    const xfo = (response.headers.get('x-frame-options') || '').toLowerCase();
    const csp = (response.headers.get('content-security-policy') || '').toLowerCase();

    let canIframe = true;
    if (xfo === 'deny' || xfo === 'sameorigin') {
      canIframe = false;
    }
    if (csp.includes('frame-ancestors') && (csp.includes("'none'") || csp.includes("'self'"))) {
      canIframe = false;
    }

    return res.json({
      url: targetUrl,
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      latency,
      canIframe,
      redirected: response.redirected,
      finalUrl: response.url
    });
  } catch (err) {
    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;
    const isTimeout = err.name === 'AbortError';

    return res.json({
      url: targetUrl,
      ok: false,
      status: isTimeout ? 408 : 0,
      statusText: isTimeout ? 'Request Timeout' : (err.message || 'Connection Failed'),
      latency: isTimeout ? 6000 : latency,
      canIframe: false,
      error: isTimeout ? 'Timeout (>6s)' : err.message
    });
  }
};
