# 🛠️ Builder Card

Enter a GitHub username, get a **builder card**: profile, top repositories, main languages and the last 30 days of activity.

**Live:** https://builder-card-two.vercel.app · **Example:** https://builder-card-two.vercel.app/?u=torvalds

<!-- After deploying, save a screenshot as docs/screenshot.png and add: ![screenshot](docs/screenshot.png) -->

## Stack

React 19 · Vite · Tailwind CSS v4 · Framer Motion · [Vengeance UI](https://www.vengenceui.com) components · one Vercel serverless function

## Features

- **Top repos** ranked by stars → forks → recency, with forks excluded (they show other people's work). Hover a repo name to see GitHub's preview image for it.
- **Main languages**: share of the user's own repos per primary language, top 5 + "Other", as an animated bar
- **Recent activity**: a 30-day heat strip, totals (pushes, PRs, issues, reviews) and the latest events as plain sentences
- **Shareable links**: `/?u=username` opens a card directly
- **Error handling** for every failure I could think of (see below)
- Responsive, keyboard-accessible, `aria-live` announcements, respects `prefers-reduced-motion`

## Architecture

```
src/
  lib/analyze.js       PURE functions: ranking, language stats, activity summary (unit-tested)
  lib/api.js           GitHub access: proxy/direct routing, typed errors, caching
  lib/utils.js         cn(), safeUrl(), number formatting, language colours
  hooks/useBuilder.js  username → { status, data, error }; cancels stale requests
  components/
    SearchForm, LoadingState, ErrorState
    card/              BuilderCard → ProfileHeader, StatGrid, LanguageBar, TopRepos, ActivityPanel
    ui/                Vengeance UI: animated-rays, animated-button, cursor-card, kinetic-text-loader
  App.jsx              URL sync (?u=) and which state to show
api/github.js          Vercel serverless proxy (token + edge caching)
tests/                 node:test unit tests (no network needed)
```

The data layer (`lib/`) has no React in it. It's plain JavaScript that can be tested with `node --test`, and components only receive ready-to-show values.

### Requests per card

1. `GET /users/:name` runs first and **alone**, so a wrong username costs 1 request instead of 3.
2. Then `GET /users/:name/repos` (up to 3 pages) and `GET /users/:name/events/public` run **in parallel**.
3. Activity is optional. If the events call fails, the card still renders with a note.

## Error handling

| Situation | What the user sees |
|---|---|
| Invalid username (`-abc`, spaces, >39 chars) | Caught **before** any request, with an explanation of the rules |
| User doesn't exist (404) | "User not found, check the spelling?" |
| Rate limit (403/429 with `x-ratelimit-remaining: 0` or `Retry-After`) | The local time it resets, minutes remaining, and a Try again button |
| Network down | "Can't reach GitHub" + Try again |
| Events endpoint fails | Card renders, activity section shows a note |
| No repos / no activity / only forks | Friendly empty states; forks used as a fallback |
| Two searches in quick succession | The effect cleanup aborts the older request (`AbortController`), so it can't overwrite the newer card |

### Rate-limit strategy

1. **Serverless proxy + token**: 5,000 requests/hour instead of 60/hour per IP. The token stays server-side.
2. **Edge cache**: successful responses are cached by Vercel's CDN for 5 minutes. Errors are never cached.
3. **Browser cache**: `sessionStorage` with a 10-minute TTL, so re-opening a card costs 0 requests.
4. **Visible quota** in the footer.
5. **Graceful fallback**: if the proxy isn't available (`npm run dev`, or another host), the app calls GitHub directly.

### Security

- React escapes all text, so a bio like `<script>…</script>` renders as text. `dangerouslySetInnerHTML` is never used. This is tested with XSS payloads.
- React does **not** check link protocols, so the "website" field goes through `safeUrl()`, which allows only `http(s)` and blocks `javascript:`.
- The proxy is **not an open proxy**: it accepts only 3 whitelisted endpoints with a validated username and page number.

## Trade-offs

- **Language share is counted by repo, not bytes.** Byte counts need one extra call per repo, which would burn the rate limit. The GraphQL API would fix this in one request (next step).
- **Up to 300 repos** are considered, since the REST API can't sort by stars. The card says so when this applies.
- **Public events only**, and at most the last 90 days / 300 events. Private contributions need GraphQL + a token.
- **PushEvent commit counts:** GitHub trimmed these payloads in 2025, so the app counts pushes and shows commit counts only when present.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173 (calls GitHub directly)
npx vercel dev     # same, plus the /api proxy
npm test           # 14 unit tests (Node 22+)
npm run lint
```

## Deploy (Vercel)

1. Import the repo on vercel.com. Vite is auto-detected, and `api/github.js` becomes a serverless function.
2. *(Recommended)* Create a fine-grained GitHub token with public read-only access. Add it as the `GITHUB_TOKEN` environment variable.
3. Deploy. The footer should show `…/5000 requests left`.

## Credits

UI components from [Vengeance UI](https://github.com/Ashutoshx7/VengenceUI) (MIT), converted from TSX to JSX with small changes noted at the top of each file.

## Time taken

~X hours. Breakdown: planning & API exploration, data logic + tests, vanilla prototype, React/Tailwind UI with Vengeance UI, error handling, README.
