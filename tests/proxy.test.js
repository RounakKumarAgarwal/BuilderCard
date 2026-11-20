// Tests the Vercel function with a fake req/res and a stubbed global fetch,
// so no network or Vercel account is needed.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/github.js';

function mockRes() {
  const res = { statusCode: 200, headers: {}, body: undefined };
  res.status = (c) => { res.statusCode = c; return res; };
  res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v; return res; };
  res.json = (o) => { res.body = JSON.stringify(o); return res; };
  res.send = (b) => { res.body = b; return res; };
  return res;
}

let lastUrl, lastInit;
const stubFetch = (status, body, headers = {}) => {
  globalThis.fetch = async (url, init) => {
    lastUrl = url; lastInit = init;
    return new Response(JSON.stringify(body), { status, headers });
  };
};

beforeEach(() => { delete process.env.GITHUB_TOKEN; lastUrl = undefined; });

test('rejects unknown endpoints and bad usernames without calling GitHub', async () => {
  stubFetch(200, {});
  for (const query of [
    { endpoint: 'admin', username: 'x' },
    { endpoint: 'profile', username: '../../orgs' },
    { endpoint: 'repos', username: 'ok', page: '99' },
  ]) {
    const res = mockRes();
    await handler({ query }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.headers['x-builder-proxy'], '1');
  }
  assert.equal(lastUrl, undefined);
});

test('forwards status, body, rate-limit headers; adds token; caches success', async () => {
  process.env.GITHUB_TOKEN = 'secret';
  stubFetch(200, { login: 'octocat' }, { 'x-ratelimit-remaining': '4999', 'x-ratelimit-limit': '5000' });
  const res = mockRes();
  await handler({ query: { endpoint: 'repos', username: 'octocat', page: '2' } }, res);
  assert.equal(lastUrl, 'https://api.github.com/users/octocat/repos?per_page=100&sort=pushed&page=2');
  assert.equal(lastInit.headers.Authorization, 'Bearer secret');
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['x-ratelimit-remaining'], '4999');
  assert.match(res.headers['cache-control'], /s-maxage=300/);
  assert.equal(JSON.parse(res.body).login, 'octocat');
});

test('does not cache errors', async () => {
  stubFetch(404, { message: 'Not Found' });
  const res = mockRes();
  await handler({ query: { endpoint: 'profile', username: 'nobody-here' } }, res);
  assert.equal(res.statusCode, 404);
  assert.equal(res.headers['cache-control'], 'no-store');
});

test('returns 502 when GitHub is unreachable', async () => {
  globalThis.fetch = async () => { throw new Error('ECONNRESET'); };
  const res = mockRes();
  await handler({ query: { endpoint: 'events', username: 'octocat' } }, res);
  assert.equal(res.statusCode, 502);
});
