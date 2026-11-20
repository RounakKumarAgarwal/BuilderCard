const GITHUB = 'https://api.github.com';
const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_REPO_PAGES = 3;

export class GitHubError extends Error {
  constructor(kind, message, extra = {}) {
    super(message);
    this.name = 'GitHubError';
    this.kind = kind;
    Object.assign(this, extra);
  }
}

export const rateLimit = { remaining: null, limit: null, resetAt: null };

let mode = 'proxy';

async function rawFetch(endpoint, username, page, signal) {
  if (mode === 'proxy') {
    try {
      const qs = new URLSearchParams({ endpoint, username, page: String(page) });
      const res = await fetch(`/api/github?${qs}`, { signal });

      if (res.headers.get('x-builder-proxy')) return res;
    } catch (err) {
      if (err.name === 'AbortError') throw err;
    }
    mode = 'direct';
  }
  return fetch(directUrl(endpoint, username, page), {
    signal,
    headers: { Accept: 'application/vnd.github+json' },
  });
}

function directUrl(endpoint, username, page) {
  const u = encodeURIComponent(username);
  if (endpoint === 'profile') return `${GITHUB}/users/${u}`;
  if (endpoint === 'repos') return `${GITHUB}/users/${u}/repos?per_page=100&sort=pushed&page=${page}`;
  if (endpoint === 'events') return `${GITHUB}/users/${u}/events/public?per_page=100`;
  throw new Error(`Unknown endpoint: ${endpoint}`);
}

async function request(endpoint, username, { page = 1, signal } = {}) {
  const key = `bc:${endpoint}:${username.toLowerCase()}:${page}`;
  const cached = readCache(key);
  if (cached) return cached;

  let res;
  try {
    res = await rawFetch(endpoint, username, page, signal);
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new GitHubError('network', 'Could not reach GitHub. Check your connection and try again.');
  }

  trackRateLimit(res.headers);

  if (res.ok) {
    const data = await res.json();
    writeCache(key, data);
    return data;
  }

  if (res.status === 404) {
    throw new GitHubError('not_found', `No GitHub user named "${username}".`);
  }

  const remaining = res.headers.get('x-ratelimit-remaining');
  const retryAfter = res.headers.get('retry-after');
  if ((res.status === 403 || res.status === 429) && (remaining === '0' || retryAfter)) {
    const resetAt = retryAfter
      ? new Date(Date.now() + Number(retryAfter) * 1000)
      : new Date(Number(res.headers.get('x-ratelimit-reset')) * 1000);
    throw new GitHubError('rate_limited', 'GitHub rate limit reached.', { resetAt });
  }
  let detail = '';
  try { detail = (await res.json()).message || ''; } catch {  }
  throw new GitHubError('http', `GitHub returned ${res.status}${detail ? `: ${detail}` : ''}.`, { status: res.status });
}

export async function fetchBuilder(username, { signal } = {}) {
  const profile = await request('profile', username, { signal });

  const pages = Math.min(MAX_REPO_PAGES, Math.max(1, Math.ceil(profile.public_repos / 100)));
  const repoPromises = Array.from({ length: pages }, (_, i) =>
    request('repos', username, { page: i + 1, signal })
  );

  const [reposResult, eventsResult] = await Promise.allSettled([
    Promise.all(repoPromises).then((chunks) => chunks.flat()),
    request('events', username, { signal }),
  ]);

  if (reposResult.status === 'rejected') throw reposResult.reason;
  if (eventsResult.status === 'rejected' && eventsResult.reason?.name === 'AbortError') {
    throw eventsResult.reason;
  }

  return {
    profile,
    repos: reposResult.value,
    events: eventsResult.status === 'fulfilled' ? eventsResult.value : [],
    eventsError: eventsResult.status === 'rejected' ? eventsResult.reason : null,
    reposTruncated: profile.public_repos > MAX_REPO_PAGES * 100,
  };
}

function trackRateLimit(headers) {
  const remaining = headers.get('x-ratelimit-remaining');
  if (remaining === null) return;
  rateLimit.remaining = Number(remaining);
  rateLimit.limit = Number(headers.get('x-ratelimit-limit'));
  rateLimit.resetAt = new Date(Number(headers.get('x-ratelimit-reset')) * 1000);
}

function readCache(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { at, data } = JSON.parse(raw);
    if (Date.now() - at > CACHE_TTL_MS) {
      sessionStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function writeCache(key, data) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), data }));
  } catch {
  }
}
