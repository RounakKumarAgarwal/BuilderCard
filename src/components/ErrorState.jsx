import { motion } from 'framer-motion';

function describe(error, username) {
  switch (error.kind) {
    case 'invalid':
      return {
        title: 'That isn’t a valid GitHub username',
        body: 'Usernames use letters, numbers and hyphens (max 39 characters) and can’t start with a hyphen.',
      };
    case 'not_found':
      return { title: 'User not found', body: <>There’s no GitHub account called <b>{username}</b>. Check the spelling?</> };
    case 'rate_limited': {
      const mins = Math.max(1, Math.ceil((error.resetAt - Date.now()) / 60000));
      const at = error.resetAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return {
        title: 'GitHub rate limit reached',
        body: <>GitHub allows a limited number of requests per hour. Try again at <b>{at}</b> (about {mins} min). Cards you already opened still load from cache.</>,
        canRetry: true,
      };
    }
    case 'network':
      return { title: 'Can’t reach GitHub', body: error.message, canRetry: true };
    default:
      return { title: 'Something went wrong', body: error.message, canRetry: true };
  }
}

export default function ErrorState({ error, username, onRetry }) {
  const { title, body, canRetry } = describe(error, username);
  return (
    <motion.div
      role="alert"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-red-500/40 bg-red-500/10 p-5 backdrop-blur"
    >
      <h3 className="font-semibold text-red-400">{title}</h3>
      <p className="mt-1 text-sm text-foreground/80">{body}</p>
      {canRetry && (
        <button onClick={onRetry} className="mt-3 rounded-md border border-border px-3 py-1 text-sm hover:border-ring">
          Try again
        </button>
      )}
    </motion.div>
  );
}
