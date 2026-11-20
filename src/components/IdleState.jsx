// Shown before the first search, so the page isn't empty:
// a quick preview of what the card will contain. Purely decorative data.
import { motion } from 'framer-motion';

const LANGS = [['#3178c6', 46], ['#f1e05a', 28], ['#00ADD8', 16], ['#dea584', 10]];
// A fixed pseudo-random pattern, so the strip looks the same every visit.
const HEAT = [0, 1, 0, 2, 3, 1, 0, 0, 2, 4, 3, 1, 0, 1, 2, 0, 0, 3, 4, 2, 1, 0, 1, 3, 2, 0, 2, 4, 3, 1];
const LEVELS = ['bg-white/[0.06]', 'bg-emerald-900', 'bg-emerald-700', 'bg-emerald-500', 'bg-emerald-400'];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export default function IdleState() {
  return (
    <motion.section variants={container} initial="hidden" animate="show" aria-label="What the card shows">
      <motion.p variants={item} className="mb-4 text-xs font-medium uppercase tracking-[0.14em] text-muted">
        What you’ll get
      </motion.p>

      <div className="grid gap-3 sm:grid-cols-3">
        <Tile title="Top repositories" text="Ranked by stars, then forks, then recency. Forks are skipped.">
          <div className="space-y-2">
            {[92, 70, 54].map((w, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="h-2 rounded-full bg-sky-400/70" style={{ width: `${w * 0.55}%` }} />
                <span className="ml-auto font-mono text-[10px] text-muted">★ {[12, 4, 2][i]}k</span>
              </div>
            ))}
          </div>
        </Tile>

        <Tile title="Main languages" text="Share of their own repos per primary language.">
          <div className="flex h-2.5 overflow-hidden rounded-full">
            {LANGS.map(([color, pct], i) => (
              <motion.span
                key={color}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.7, delay: 0.5 + i * 0.08, ease: 'easeOut' }}
                style={{ background: color }}
              />
            ))}
          </div>
        </Tile>

        <Tile title="Recent activity" text="30-day strip of pushes, PRs and issues, plus the latest events.">
          <div className="grid grid-cols-[repeat(15,minmax(0,1fr))] gap-[3px]">
            {HEAT.map((level, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + i * 0.02 }}
                className={`aspect-square rounded-[2px] ${LEVELS[level]}`}
              />
            ))}
          </div>
        </Tile>
      </div>

      <motion.p variants={item} className="mt-5 text-sm text-muted">
        Cards are shareable: add <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-xs text-foreground/80">?u=username</code> to the link.
      </motion.p>
    </motion.section>
  );
}

function Tile({ title, text, children }) {
  return (
    <motion.div variants={item} className="flex flex-col rounded-xl border border-border bg-panel p-5 backdrop-blur">
      <div className="mb-4 flex h-12 flex-col justify-center">{children}</div>
      <h3 className="font-medium">{title}</h3>
      <p className="mt-1 text-sm text-muted">{text}</p>
    </motion.div>
  );
}
