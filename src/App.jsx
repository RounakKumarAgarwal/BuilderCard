import { useState } from 'react';
import { AnimatedRays } from '@/components/ui/animated-rays';
import SearchForm from '@/components/SearchForm';
import LoadingState from '@/components/LoadingState';
import IdleState from '@/components/IdleState';
import ErrorState from '@/components/ErrorState';
import BuilderCard from '@/components/card/BuilderCard';
import { useBuilder } from '@/hooks/useBuilder';

const initialUser = new URLSearchParams(window.location.search).get('u') || '';

export default function App() {
  const [username, setUsername] = useState(initialUser);
  const { status, data, error, quota, retry } = useBuilder(username);
  const [copied, setCopied] = useState(false);

  const search = (name) => {
    setUsername(name);

    const url = new URL(window.location.href);
    url.searchParams.set('u', name);
    window.history.replaceState(null, '', url);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
    }
  };

  return (
    <>

      <AnimatedRays className="pointer-events-none fixed inset-0 -z-10 h-screen opacity-70" />

      <main className="mx-auto max-w-3xl px-5 pb-10 pt-14 sm:pt-20">
        <header className="mb-8">
          <p className="mb-3 inline-block rounded-full border border-border bg-panel px-3 py-1 font-mono text-xs text-muted backdrop-blur">
            GitHub → builder card
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Builder Card</h1>
          <p className="mt-2 max-w-lg text-muted">
            A GitHub profile at a glance: what someone builds, in what, and how recently.
          </p>
        </header>

        <SearchForm initialValue={initialUser} onSearch={search} busy={status === 'loading'} />

        <div aria-live="polite" className="mt-8">
          {status === 'idle' && <IdleState />}
          {status === 'loading' && <LoadingState />}
          {status === 'error' && <ErrorState error={error} username={username} onRetry={retry} />}
          {status === 'success' && (
            <>
              <BuilderCard data={data} />
              <button
                onClick={copyLink}
                className="mt-4 rounded-md border border-border bg-panel px-4 py-2 text-sm backdrop-blur hover:border-ring"
              >
                {copied ? 'Link copied ✓' : 'Copy share link'}
              </button>
            </>
          )}
        </div>

        <footer className="mt-12 flex flex-wrap justify-between gap-2 text-xs text-muted">
          <span>{quota?.remaining != null && `GitHub API: ${quota.remaining}/${quota.limit} requests left this hour`}</span>
          <span>
            Data: GitHub REST API · UI: <a className="underline hover:text-foreground" href="https://www.vengenceui.com" target="_blank" rel="noopener noreferrer">Vengeance UI</a>
          </span>
        </footer>
      </main>
    </>
  );
}
