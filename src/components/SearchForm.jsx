import { useState } from 'react';
import AnimatedButton from '@/components/ui/animated-button';

const EXAMPLES = ['torvalds', 'gaearon', 'sindresorhus'];

export default function SearchForm({ initialValue, onSearch, busy }) {
  const [value, setValue] = useState(initialValue);

  const submit = (e) => {
    e.preventDefault();
    onSearch(value.trim().replace(/^@/, ''));
  };

  return (
    <div>
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="username" className="sr-only">GitHub username</label>
        <input
          id="username"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="GitHub username, e.g. torvalds"
          maxLength={40}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          required
          className="flex-1 rounded-md border border-border bg-panel px-4 py-3 text-base backdrop-blur placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <AnimatedButton type="submit" disabled={busy} className="h-auto py-3 sm:px-8">
          {busy ? 'Building…' : 'Build card'}
        </AnimatedButton>
      </form>

      <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
        Try:
        {EXAMPLES.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => { setValue(name); onSearch(name); }}
            className="rounded-full border border-border px-3 py-0.5 font-mono text-xs text-foreground/80 transition hover:border-ring hover:text-foreground"
          >
            {name}
          </button>
        ))}
      </p>
    </div>
  );
}
