import { formatCount } from '@/lib/utils';

export default function StatGrid({ profile, stars, activeDays }) {
  const stats = [
    ['Repos', formatCount(profile.public_repos)],
    ['Stars earned', formatCount(stars)],
    ['Followers', formatCount(profile.followers)],
    ['Active days', `${activeDays}/30`],
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map(([label, value]) => (
        <div key={label} className="rounded-lg border border-border bg-white/[0.03] px-4 py-3">
          <dt className="text-xs text-muted">{label}</dt>
          <dd className="font-mono text-2xl font-semibold tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
