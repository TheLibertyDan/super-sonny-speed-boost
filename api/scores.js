import { put, head } from '@vercel/blob';

const KEY = 'super-sonny-scores.json';
const MAX = 20;

async function loadScores() {
  try {
    const info = await head(KEY);
    const res = await fetch(info.url, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function sanitizeName(raw) {
  return String(raw || '')
    .replace(/[^A-Za-z0-9 _-]/g, '')
    .trim()
    .slice(0, 10)
    .toUpperCase() || 'PLAYER';
}

function sanitizeScore(raw) {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(999999, n));
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    const scores = await loadScores();
    res.status(200).json(scores);
    return;
  }

  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    body = body || {};

    const name = sanitizeName(body.name);
    const score = sanitizeScore(body.score);
    if (score <= 0) {
      res.status(400).json({ error: 'score must be > 0' });
      return;
    }

    const scores = await loadScores();
    scores.push({ name, score, ts: Date.now() });
    scores.sort((a, b) => b.score - a.score);
    const top = scores.slice(0, MAX);

    await put(KEY, JSON.stringify(top), {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json'
    });

    res.status(200).json(top);
    return;
  }

  res.setHeader('Allow', 'GET, POST');
  res.status(405).json({ error: 'method not allowed' });
}
