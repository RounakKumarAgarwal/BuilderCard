// Composes the card from its sections. Sections fade in one after another
// (framer-motion "stagger": the parent orchestrates its children's timing).
import { motion } from 'framer-motion';
import ProfileHeader from './ProfileHeader';
import StatGrid from './StatGrid';
import LanguageBar from './LanguageBar';
import TopRepos from './TopRepos';
import ActivityPanel from './ActivityPanel';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

export default function BuilderCard({ data }) {
  const { profile, topRepos, languages, activity, stars, eventsError, reposTruncated } = data;

  return (
    <motion.article
      aria-label={`Builder card for ${profile.login}`}
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-7 rounded-2xl border border-border bg-panel p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8"
    >
      <motion.div variants={item}><ProfileHeader profile={profile} /></motion.div>
      <motion.div variants={item}><StatGrid profile={profile} stars={stars} activeDays={activity.activeDays} /></motion.div>
      <Section title="Main languages"><LanguageBar languages={languages} /></Section>
      <Section title="Top repositories" hint="hover a name for a preview"><TopRepos repos={topRepos} truncated={reposTruncated} /></Section>
      <Section title="Recent activity" hint="last 30 days"><ActivityPanel activity={activity} error={eventsError} /></Section>
    </motion.article>
  );
}

function Section({ title, hint, children }) {
  return (
    <motion.section variants={item}>
      <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-muted">
        {title} {hint && <span className="normal-case tracking-normal text-muted/70">· {hint}</span>}
      </h3>
      {children}
    </motion.section>
  );
}
