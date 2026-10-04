import { useState, type FormEvent } from 'react';
import { Waves, Lock, Mail, LoaderCircle, TriangleAlert } from 'lucide-react';

export interface Credentials {
  email: string;
  password: string;
}

interface Props {
  onAuth: (credentials: Credentials) => void;
}

/**
 * Operator sign-in. The password is never held in the bundle — the form posts
 * to /api/login, which is the only place that knows it.
 */
export default function Login({ onAuth }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `Sign-in failed (${res.status})`);
      onAuth({ email: email.trim(), password });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
      setBusy(false);
    }
  }

  const field =
    'w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-11 pr-4 text-sm text-white ' +
    'placeholder:text-ink-400 transition-all duration-200 focus:border-brand-400/60 focus:outline-none ' +
    'focus:ring-2 focus:ring-brand-500/30';

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-600/20 blur-3xl" />
        <div className="absolute right-0 top-20 h-80 w-80 rounded-full bg-aqua-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-water-grid opacity-40" />
      </div>

      <div className="container-page relative flex min-h-screen items-center justify-center py-14">
        <div className="w-full max-w-md animate-fade-up">
          <div className="mb-8 text-center">
            <span className="chip border border-brand-400/30 bg-brand-600/10 text-brand-200">
              <Waves className="h-3.5 w-3.5" />
              Early Warning System
            </span>
            <h1 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Operator sign-in
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-ink-300">
              Sign in to confirm your location and dispatch flood bulletins to your inbox.
            </p>
          </div>

          <form onSubmit={submit} className="card-dark p-6 sm:p-7">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">Email</span>
              <div className="relative mt-2">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={field}
                />
              </div>
            </label>

            <label className="mt-5 block">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">Password</span>
              <div className="relative mt-2">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={field}
                />
              </div>
            </label>

            {error && (
              <div
                role="alert"
                className="mt-5 flex items-start gap-2.5 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
              >
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={busy} className="btn-primary mt-6 w-full">
              {busy ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs leading-relaxed text-ink-500">
            Bulletins are only ever delivered to the signed-in operator's own address.
          </p>
        </div>
      </div>
    </div>
  );
}
