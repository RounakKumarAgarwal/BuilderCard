// Grid of the best repos. Hovering a repo name (Vengeance UI CursorCard)
// shows GitHub's social preview image for that repo, following the cursor.
import { CursorCard } from '@/components/ui/cursor-card';
import { relativeTime } from '@/lib/analyze';
import { formatCount, langColor } from '@/lib/utils';
import { Badge } from './ProfileHeader';
import { Empty } from './LanguageBar';

export default function TopRepos({ repos, truncated }) {
  if (repos.length === 0) return <Empty>No public repositories yet.</Empty>;

  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2">
        {repos.map((r) => {
          const fullName = new URL(r.url).pathname.slice(1); // "owner/repo"
          return (
            <li key={r.url} className="flex flex-col rounded-lg border border-border bg-white/[0.02] p-4 transition hover:border-white/25">
              <div className="flex flex-wrap items-center gap-2">
                <CursorCard
                  href={r.url}
                  image={`https://opengraph.githubassets.com/1/${fullName}`}
                  description={r.description}
                  className="break-all font-semibold text-sky-400 dark:text-sky-400 dark:hover:bg-sky-500/10"
                >
                  {r.name}
                </CursorCard>
                {r.isFork && <Badge>fork</Badge>}
                {r.archived && <Badge>archived</Badge>}
              </div>
              <p className="mt-1.5 mb-3 flex-1 text-sm text-foreground/75">
                {r.description || <span className="text-muted">No description</span>}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                {r.language && (
                  <span className="flex items-center gap-1.5">
                    <i className="size-2 rounded-full" style={{ background: langColor(r.language) }} />
                    {r.language}
                  </span>
                )}
                <span>★ {formatCount(r.stars)}</span>
                <span>⑂ {formatCount(r.forks)}</span>
                <span>updated {relativeTime(r.pushedAt)}</span>
              </div>
            </li>
          );
        })}
      </ul>
      {truncated && <p className="mt-2 text-xs text-muted">Showing the best of the 300 most recently updated repos.</p>}
    </>
  );
}
