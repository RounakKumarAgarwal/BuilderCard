const ENDPOINTS = {
  profile: (u) => `/users/${u}`,
  repos: (u, page) => `/users/${u}/repos?per_page=100&sort=pushed&page=${page}`,
  events: (u) => `/users/${u}/events/public?per_page=100`,
};
const USERNAME_RE = /^[a-z\d][a-z\d-]{0,38}$/i;
const FORWARDED_HEADERS = ['x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset', 'retry-after'];

export default async function handler(req, res) {
  res.setHeader('x-builder-proxy', '1');

  const { endpoint, username, page = '1' } = req.query;
  const pageNum = Number(page);

  if (!ENDPOINTS[endpoint] || !USERNAME_RE.test(username || '') || !Number.isInteger(pageNum) || pageNum < 1 || pageNum > 10) {
    return res.status(400).json({ message: 'Bad request' });
  }

  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'builder-card',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  let upstream;
  try {
    upstream = await fetch(`https://api.github.com${ENDPOINTS[endpoint](username, pageNum)}`, { headers });
  } catch {
    return res.status(502).json({ message: 'Upstream GitHub request failed' });
  }

  for (const h of FORWARDED_HEADERS) {
    const v = upstream.headers.get(h);
    if (v !== null) res.setHeader(h, v);
  }

  res.setHeader('Cache-Control', upstream.ok ? 'public, s-maxage=300, stale-while-revalidate=600' : 'no-store');

  res.status(upstream.status);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.send(await upstream.text());
}
