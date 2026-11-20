import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  pickTopRepos, summarizeLanguages, summarizeActivity, describeEvent,
  relativeTime, isValidUsername, totalStars, groupRecent,
} from '../src/lib/analyze.js';

const repo = (name, stars, extra = {}) => ({
  name, html_url: `https://github.com/x/${name}`, description: null, language: 'JavaScript',
  stargazers_count: stars, forks_count: 0, pushed_at: '2026-01-01T00:00:00Z', fork: false, archived: false,
  ...extra,
});

test('pickTopRepos ranks by stars, skips forks, respects limit', () => {
  const repos = [repo('a', 5), repo('b', 50), repo('c', 500, { fork: true }), repo('d', 20)];
  const top = pickTopRepos(repos, 2);
  assert.deepEqual(top.map((r) => r.name), ['b', 'd']);
});

test('pickTopRepos falls back to forks when the user has nothing else', () => {
  const top = pickTopRepos([repo('f', 1, { fork: true })]);
  assert.equal(top.length, 1);
  assert.equal(top[0].isFork, true);
});

test('pickTopRepos breaks star ties with forks then recency, and does not mutate input', () => {
  const repos = [
    repo('old', 3, { pushed_at: '2020-01-01T00:00:00Z' }),
    repo('new', 3, { pushed_at: '2025-01-01T00:00:00Z' }),
    repo('forked', 3, { forks_count: 9 }),
  ];
  const copy = structuredClone(repos);
  assert.deepEqual(pickTopRepos(repos).map((r) => r.name), ['forked', 'new', 'old']);
  assert.deepEqual(repos, copy);
});

test('summarizeLanguages counts primary languages and folds the tail into Other', () => {
  const repos = [
    ...['JS', 'JS', 'JS', 'Py', 'Py', 'Go', 'Rust', 'C', 'Zig'].map((l, i) => repo(`r${i}`, 0, { language: l })),
    repo('nolang', 0, { language: null }),
    repo('fork', 0, { language: 'Haskell', fork: true }),
  ];
  const langs = summarizeLanguages(repos, 3);
  assert.deepEqual(langs.map((l) => l.name), ['JS', 'Py', 'Go', 'Other']);
  assert.equal(langs[0].percent, 33.3);
  assert.equal(langs.at(-1).count, 3); // Rust, C, Zig
  assert.ok(!langs.some((l) => l.name === 'Haskell'));
});

test('summarizeLanguages returns [] when there is no data', () => {
  assert.deepEqual(summarizeLanguages([]), []);
});

test('totalStars ignores forks', () => {
  assert.equal(totalStars([repo('a', 10), repo('b', 5, { fork: true })]), 10);
});

test('summarizeActivity buckets by day and counts types inside the window', () => {
  const now = Date.parse('2026-11-20T12:00:00');
  const ev = (type, iso, payload = {}) => ({ type, created_at: iso, repo: { name: 'u/r' }, payload });
  const events = [
    ev('PushEvent', '2026-11-20T09:00:00'),
    ev('PushEvent', '2026-11-20T08:00:00'),
    ev('PullRequestEvent', '2026-11-19T10:00:00', { action: 'opened' }),
    ev('PullRequestEvent', '2026-11-19T11:00:00', { action: 'closed' }),
    ev('IssuesEvent', '2026-11-01T10:00:00', { action: 'opened' }),
    ev('PushEvent', '2026-09-01T10:00:00'), // outside 30 days
  ];
  const a = summarizeActivity(events, { now });
  assert.equal(a.daily.length, 30);
  assert.equal(a.daily[29], 2); // today
  assert.equal(a.daily[28], 2); // yesterday
  assert.equal(a.activeDays, 3);
  assert.deepEqual(a.totals, { pushes: 2, pullRequests: 1, issues: 1, reviews: 0 });
  assert.equal(a.recent.length, 5); // today's two pushes merge into one item
  assert.equal(a.recent[0].count, 2);
});

test('describeEvent handles trimmed PushEvent payloads and unknown types', () => {
  const now = Date.parse('2026-11-20T12:00:00Z');
  const base = { created_at: '2026-11-20T11:00:00Z', repo: { name: 'u/r' } };
  assert.equal(describeEvent({ ...base, type: 'PushEvent', payload: { size: 3 } }, now).text, 'Pushed 3 commits to');
  assert.equal(describeEvent({ ...base, type: 'PushEvent', payload: {} }, now).text, 'Pushed to');
  assert.equal(describeEvent({ ...base, type: 'MemberEvent' }, now).text, 'Added a collaborator to');
  assert.equal(describeEvent({ ...base, type: 'SomeFutureEvent' }, now).text, 'Activity in');
  assert.equal(describeEvent({ ...base, type: 'WatchEvent' }, now).when, '1h ago');
});

test('relativeTime', () => {
  const now = Date.parse('2026-11-20T12:00:00Z');
  assert.equal(relativeTime('2026-11-20T11:59:30Z', now), 'just now');
  assert.equal(relativeTime('2026-11-20T11:00:00Z', now), '1h ago');
  assert.equal(relativeTime('2026-11-17T12:00:00Z', now), '3d ago');
  assert.equal(relativeTime('2024-11-20T12:00:00Z', now), '2y ago');
});

test('isValidUsername', () => {
  for (const ok of ['torvalds', 'a', 'my-name', 'A1', 'x'.repeat(39)]) assert.ok(isValidUsername(ok), ok);
  for (const bad of ['', '-lead', 'has space', 'x'.repeat(40), '../etc', 'a/b', '<script>']) {
    assert.ok(!isValidUsername(bad), bad);
  }
});

test('groupRecent sorts newest first and merges back-to-back repeats', () => {
  const now = Date.parse('2026-11-20T12:00:00Z');
  const ev = (type, iso, repo = 'u/r') => ({ type, created_at: iso, repo: { name: repo }, payload: {} });
  const items = groupRecent([
    ev('PushEvent', '2026-11-19T10:00:00Z'),
    ev('WatchEvent', '2026-11-20T11:00:00Z', 'x/y'), // newest, but listed 2nd (real feeds do this)
    ev('PushEvent', '2026-11-19T09:00:00Z'),
    ev('PushEvent', '2026-11-18T09:00:00Z', 'u/other'),
  ], now);
  assert.deepEqual(items.map((i) => [i.text, i.repo, i.count]), [
    ['Starred', 'x/y', 1],
    ['Pushed to', 'u/r', 2],
    ['Pushed to', 'u/other', 1],
  ]);
  assert.equal(items[1].when, '1d ago'); // time of the most recent in the group
});
