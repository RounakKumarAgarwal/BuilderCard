// useBuilder — custom hook: give it a username, get back the card's state.
//
//   const { status, data, error, quota, retry } = useBuilder(username);
//   status: 'idle' | 'loading' | 'success' | 'error'
//
// Design: the effect ONLY starts/cancels requests and stores the final result.
// Everything else (idle, invalid, loading) is DERIVED during render from the
// inputs. Fewer state variables = fewer states that can get out of sync.
import { useEffect, useState } from 'react';
import { fetchBuilder, rateLimit, GitHubError } from '@/lib/api';
import { buildCard, isValidUsername } from '@/lib/analyze';

export function useBuilder(username) {
  // Bumping `attempt` re-runs the effect; that's how "Try again" works.
  const [attempt, setAttempt] = useState(0);
  // The last finished request, tagged with which request it answers.
  const [result, setResult] = useState({ key: null });

  const valid = Boolean(username) && isValidUsername(username);
  const key = `${username}#${attempt}`;

  useEffect(() => {
    if (!valid) return;

    // A new username → the cleanup below aborts the old request, so a slow
    // old response can never overwrite a newer card (race condition).
    const controller = new AbortController();

    fetchBuilder(username, { signal: controller.signal })
      .then((raw) => setResult({ key, data: buildCard(raw), quota: { ...rateLimit } }))
      .catch((error) => {
        if (error.name === 'AbortError') return; // we cancelled it on purpose
        console.error(error);
        setResult({ key, error, quota: { ...rateLimit } });
      });

    return () => controller.abort(); // runs when username/attempt changes or on unmount
  }, [key, username, valid]);

  const retry = () => setAttempt((n) => n + 1);

  if (!username) return { status: 'idle', retry };
  if (!valid) {
    return { status: 'error', error: new GitHubError('invalid', 'Invalid username'), retry };
  }
  // Result belongs to an older request → the current one is still loading.
  if (result.key !== key) return { status: 'loading', retry };
  if (result.error) return { status: 'error', error: result.error, quota: result.quota, retry };
  return { status: 'success', data: result.data, quota: result.quota, retry };
}
