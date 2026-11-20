const DAY_MS = 24 * 60 * 60 * 1000;

export function pickTopRepos(repos, limit = 6) {
  const own = repos.filter((r) => !r.fork);
  const pool = own.length > 0 ? own : repos;

  return [...pool]
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
    percent: Math.round((count / total) * 1000) / 10,
  }));
}

export function totalStars(repos) {
  return repos.filter((r) => !r.fork).reduce((sum, r) => sum + r.stargazers_count, 0);
}

export function summarizeActivity(events, { days = 30, now = Date.now(), recentLimit = 6 } = {}) {
  const daily = new Array(days).fill(0);
  const totals = { pushes: 0, pullRequests: 0, issues: 0, reviews: 0 };
  const today = startOfDay(now);

  for (const e of events) {
    const t = Date.parse(e.created_at);

    const daysAgo = Math.round((today - startOfDay(t)) / DAY_MS);
    if (daysAgo < 0 || daysAgo >= days) continue;

    daily[days - 1 - daysAgo] += 1;

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

export function describeEvent(e, now = Date.now()) {
  const p = e.payload || {};
  let text;
  switch (e.type) {
    case 'PushEvent': {
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
