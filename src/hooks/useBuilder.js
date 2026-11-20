import { useEffect, useState } from 'react';
import { fetchBuilder, rateLimit, GitHubError } from '@/lib/api';
import { buildCard, isValidUsername } from '@/lib/analyze';

export function useBuilder(username) {
  const [attempt, setAttempt] = useState(0);

  const [result, setResult] = useState({ key: null });

  const valid = Boolean(username) && isValidUsername(username);
  const key = `${username}#${attempt}`;

  useEffect(() => {
    if (!valid) return;

    const controller = new AbortController();

    fetchBuilder(username, { signal: controller.signal })
      .then((raw) => setResult({ key, data: buildCard(raw), quota: { ...rateLimit } }))
      .catch((error) => {
        if (error.name === 'AbortError') return;
        console.error(error);
        setResult({ key, error, quota: { ...rateLimit } });
      });

    return () => controller.abort();
  }, [key, username, valid]);

  const retry = () => setAttempt((n) => n + 1);

  if (!username) return { status: 'idle', retry };
  if (!valid) {
    return { status: 'error', error: new GitHubError('invalid', 'Invalid username'), retry };
  }

  if (result.key !== key) return { status: 'loading', retry };
  if (result.error) return { status: 'error', error: result.error, quota: result.quota, retry };
  return { status: 'success', data: result.data, quota: result.quota, retry };
}
