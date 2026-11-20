import { motion } from 'framer-motion';
import { langColor } from '@/lib/utils';

export default function LanguageBar({ languages }) {
  if (languages.length === 0) return <Empty>No language data in public repos yet.</Empty>;

  const label = languages.map((l) => `${l.name} ${l.percent}%`).join(', ');
  return (
    <>
      <div role="img" aria-label={label} className="flex h-2.5 overflow-hidden rounded-full bg-white/5">
        {languages.map((l, i) => (
          <motion.span
            key={l.name}
            title={`${l.name} ${l.percent}%`}
            initial={{ width: 0 }}
            animate={{ width: `${l.percent}%` }}
            transition={{ duration: 0.6, delay: 0.1 + i * 0.05, ease: 'easeOut' }}
            style={{ background: langColor(l.name) }}
          />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {languages.map((l) => (
          <li key={l.name} className="flex items-center gap-1.5">
            <i className="size-2.5 rounded-full" style={{ background: langColor(l.name) }} />
            {l.name} <span className="font-mono text-xs text-muted">{l.percent}%</span>
          </li>
        ))}
      </ul>
    </>
  );
}

export function Empty({ children }) {
  return <p className="text-sm italic text-muted">{children}</p>;
}
