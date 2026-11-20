// analyze.js — PURE functions only.
// No DOM, no fetch: data in, data out. That makes every function here
// unit-testable with `node --test` and easy to reason about on a call.

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Pick the repos worth showing on the card.
 * Rules:
 *  1. Ignore forks: a fork shows someone else's work, not this builder's.
 *  2. If the user has ONLY forks, fall back to forks so the section isn't empty.
 *  3. Rank by stars, then forks, then most recently pushed (tie-breakers).
 */
export function pickTopRepos(repos, limit = 6) {
  const own = repos.filter((r) => !r.fork);
  const pool = own.length > 0 ? own : repos;

  return [...pool] // copy first: .sort() mutates, and we never mutate inputs
    .sort(
      (a, b) =>
        b.stargazers_count - a.stargazers_count ||
        b.forks_count - a.forks_count ||
        Date.parse(b.pushed_at) - Date.parse(a.pushed_at)
    )
    .slice(0, limit)
    .map((r) => ({
      name: r.name,
      url: r.html_url,
      description: r.description,
      language: r.language,
      stars: r.stargazers_count,
      forks: r.forks_count,
      pushedAt: r.pushed_at,
      isFork: r.fork,
      archived: r.archived,
    }));
}

/**
 * Main languages = how many of the user's own repos use each language as
 * their primary language. (Exact byte counts would need one extra API call
 * per repo — too expensive under a 60 req/hour limit. See README.)
 * Returns the top `limit` languages and folds the rest into "Other".
 */
export function summarizeLanguages(repos, limit = 5) {
  const counts = new Map();
  for (const r of repos) {
    if (r.fork || !r.language) continue;
    counts.set(r.language, (counts.get(r.language) || 0) + 1);
  }

  const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
  if (total === 0) return [];

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, limit);
  const otherCount = sorted.slice(limit).reduce((sum, [, n]) => sum + n, 0);
  if (otherCount > 0) top.push(['Other', otherCount]);

  return top.map(([name, count]) => ({
    name,
    count,
    percent: Math.round((count / total) * 1000) / 10, // one decimal place
  }));
}

/** Sum of stars across the user's own (non-fork) repos. */
export function totalStars(repos) {
  return repos.filter((r) => !r.fork).reduce((sum, r) => sum + r.stargazers_count, 0);
}

/**
 * Turn the raw public events feed into:
 *  - daily: event counts for each of the last `days` days (oldest → today)
 *  - activeDays: how many of those days had at least one event
 *  - totals: pushes / PRs / issues / reviews in that window
 *  - recent: the latest few events, as readable sentences
 * `now` is a parameter (not Date.now() inside) so tests are deterministic.
 */
export function summarizeActivity(events, { days = 30, now = Date.now(), recentLimit = 6 } = {}) {
  const daily = new Array(days).fill(0);
  const totals = { pushes: 0, pullRequests: 0, issues: 0, reviews: 0 };
  const today = startOfDay(now);

  for (const e of events) {
    const t = Date.parse(e.created_at);
    // How many days ago did this happen? Math.round absorbs DST 23/25h days.
    const daysAgo = Math.round((today - startOfDay(t)) / DAY_MS);
    if (daysAgo < 0 || daysAgo >= days) continue; // outside the window

    daily[days - 1 - daysAgo] += 1; // last slot = today

    if (e.type === 'PushEvent') totals.pushes += 1;
    else if (e.type === 'PullRequestEvent' && e.payload?.action === 'opened') totals.pullRequests += 1;
    else if (e.type === 'IssuesEvent' && e.payload?.action === 'opened') totals.issues += 1;
    else if (e.type === 'PullRequestReviewEvent') totals.reviews += 1;
  }

  return {
    daily,
    activeDays: daily.filter((n) => n > 0).length,
    totals,
    recent: groupRecent(events, now).slice(0, recentLimit),
  };
}

/**
 * Latest events as sentences, newest first, with back-to-back repeats merged:
 * three "Pushed to torvalds/linux" in a row become one item with count: 3.
 * (Real feeds aren't always in time order, so we sort first; copy, no mutation.)
 */
export function groupRecent(events, now = Date.now()) {
  const sorted = [...events].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  const items = [];
  for (const e of sorted) {
    const d = describeEvent(e, now);
    const last = items.at(-1);
    if (last && last.text === d.text && last.repo === d.repo) last.count += 1;
    else items.push({ ...d, count: 1 });
  }
  return items;
}

/** One event → { text, repo, repoUrl, when }. Unknown types degrade gracefully. */
export function describeEvent(e, now = Date.now()) {
  const p = e.payload || {};
  let text;
  switch (e.type) {
    case 'PushEvent': {
      // GitHub trimmed PushEvent payloads in 2025; `size` may be missing.
      const n = p.size ?? p.commits?.length;
      text = n ? `Pushed ${n} commit${n === 1 ? '' : 's'} to` : 'Pushed to';
      break;
    }
    case 'PullRequestEvent':   text = `${capitalize(p.action || 'updated')} a pull request in`; break;
    case 'PullRequestReviewEvent': text = 'Reviewed a pull request in'; break;
    case 'IssuesEvent':        text = `${capitalize(p.action || 'updated')} an issue in`; break;
    case 'IssueCommentEvent':  text = 'Commented on an issue in'; break;
    case 'CreateEvent':        text = `Created ${p.ref_type === 'repository' ? 'repository' : `${p.ref_type || 'ref'}${p.ref ? ` ${p.ref}` : ''} in`}`; break;
    case 'DeleteEvent':        text = `Deleted ${p.ref_type || 'ref'}${p.ref ? ` ${p.ref}` : ''} in`; break;
    case 'WatchEvent':         text = 'Starred'; break;
    case 'ForkEvent':          text = 'Forked'; break;
    case 'ReleaseEvent':       text = `Released ${p.release?.tag_name || 'a version'} of`; break;
    case 'PublicEvent':        text = 'Open-sourced'; break;
    case 'MemberEvent':        text = 'Added a collaborator to'; break;
    case 'GollumEvent':        text = 'Edited the wiki of'; break;
    case 'CommitCommentEvent': text = 'Commented on a commit in'; break;
    case 'PullRequestReviewCommentEvent': text = 'Commented on a pull request in'; break;
    default:                   text = 'Activity in';
  }
  const repo = e.repo?.name || 'unknown repo';
  return {
    text,
    repo,
    repoUrl: `https://github.com/${repo}`,
    when: relativeTime(e.created_at, now),
  };
}

/** "3h ago", "2d ago", "4mo ago" … */
export function relativeTime(iso, now = Date.now()) {
  const sec = Math.max(0, Math.floor((now - Date.parse(iso)) / 1000));
  const steps = [
    [60, 's'], [60, 'm'], [24, 'h'], [30, 'd'], [12, 'mo'], [Infinity, 'y'],
  ];
  let value = sec;
  for (const [size, unit] of steps) {
    if (value < size) return unit === 's' ? 'just now' : `${value}${unit} ago`;
    value = Math.floor(value / size);
  }
  return '';
}

/**
 * GitHub's rule: alphanumerics and hyphens, max 39 chars, can't start with
 * a hyphen. Deliberately a bit lenient (some old accounts break the newer
 * "no double hyphen" rule) — GitHub's 404 is the final judge.
 */
export function isValidUsername(name) {
  return /^[a-z\d][a-z\d-]{0,38}$/i.test(name);
}

function startOfDay(ms) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Combine everything the card needs from the raw API data in one place,
 * so React components only ever receive ready-to-show values.
 */
export function buildCard(raw, now = Date.now()) {
  return {
    profile: raw.profile,
    topRepos: pickTopRepos(raw.repos),
    languages: summarizeLanguages(raw.repos),
    activity: summarizeActivity(raw.events, { now }),
    stars: totalStars(raw.repos),
    eventsError: raw.eventsError,
    reposTruncated: raw.reposTruncated,
  };
}
