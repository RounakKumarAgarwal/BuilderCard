// Avatar, name, handle, bio and meta row.
// React escapes text automatically, so a malicious bio can't inject HTML.
// hrefs are NOT protocol-checked by React, hence safeUrl() for the website.
import { safeUrl } from '@/lib/utils';

export default function ProfileHeader({ profile: p }) {
  const blog = safeUrl(p.blog);
  const joined = new Date(p.created_at).toLocaleDateString('en', { month: 'short', year: 'numeric' });

  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-start">
      <img
        src={`${p.avatar_url}&s=192`}
        alt=""
        width={96}
        height={96}
        className="size-24 shrink-0 rounded-2xl border border-border object-cover shadow-lg"
      />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">{p.name || p.login}</h2>
          {p.type === 'Organization' && <Badge>Organization</Badge>}
        </div>
        <a href={p.html_url} target="_blank" rel="noopener noreferrer" className="font-mono text-sm text-sky-400 hover:underline">
          @{p.login}
        </a>
        {p.bio && <p className="mt-2 text-foreground/85">{p.bio}</p>}
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          {p.company && <li>🏢 {p.company}</li>}
          {p.location && <li>📍 {p.location}</li>}
          {blog && (
            <li>
              🔗 <a href={blog} target="_blank" rel="noopener noreferrer" className="hover:text-foreground hover:underline">
                {p.blog.replace(/^https?:\/\//, '')}
              </a>
            </li>
          )}
          <li>📅 Joined {joined}</li>
        </ul>
      </div>
    </header>
  );
}

export function Badge({ children }) {
  return <span className="rounded-full border border-border px-2 py-px text-[11px] text-muted">{children}</span>;
}
