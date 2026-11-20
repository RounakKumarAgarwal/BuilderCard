import { motion } from 'framer-motion';
import { Empty } from './LanguageBar';

const LEVELS = ['bg-white/[0.06]', 'bg-emerald-900', 'bg-emerald-700', 'bg-emerald-500', 'bg-emerald-400'];

export default function ActivityPanel({ activity, error }) {
  if (error) {
    return <Empty>Couldn’t load activity ({error.message}). The rest of the card is accurate.</Empty>;
  }

  const max = Math.max(1, ...activity.daily);
  const t = activity.totals;

  return (
    <>
      <div role="img" aria-label="Activity over the last 30 days" className="grid grid-cols-[repeat(30,minmax(0,1fr))] gap-1">
        {activity.daily.map((n, i) => {
          const level = n === 0 ? 0 : Math.ceil((n / max) * 4);
          const daysAgo = activity.daily.length - 1 - i;
          return (
            <motion.span
              key={i}
              title={`${n} event${n === 1 ? '' : 's'} ${daysAgo === 0 ? 'today' : `${daysAgo}d ago`}`}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.015 }}
              className={`aspect-square rounded-[3px] ${LEVELS[level]}`}
            />
          );
        })}
      </div>
      <p className="mt-2 font-mono text-xs text-muted">
        {t.pushes} pushes · {t.pullRequests} PRs opened · {t.issues} issues opened · {t.reviews} reviews
      </p>

      {activity.recent.length === 0 ? (
        <Empty>No public activity in the last 90 days.</Empty>
      ) : (
        <ul className="mt-3 divide-y divide-border text-sm">
          {activity.recent.map((e, i) => (
            <li key={i} className="flex flex-wrap items-baseline gap-x-1.5 py-2">
              <span className="text-foreground/80">{e.text}</span>
              <a href={e.repoUrl} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">{e.repo}</a>
              {e.count > 1 && (
                <span className="rounded-full bg-white/10 px-1.5 font-mono text-[11px] text-foreground/70">×{e.count}</span>
              )}
              <span className="ml-auto text-xs text-muted">{e.when}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
