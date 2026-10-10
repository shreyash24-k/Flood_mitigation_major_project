import { useState, type FormEvent } from 'react';
import { Waves, Lock, Mail, LoaderCircle, TriangleAlert, ArrowLeft, CheckCircle2 } from 'lucide-react';

export interface Credentials {
  email: string;
  password: string;
}

interface Props {
  onAuth: (credentials: Credentials) => void;
  onBack?: () => void;
}

/**
 * Operator Sign-in & Sign-up Portal.
 */
export default function Login({ onAuth, onBack }: Props) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [awaitingOtp, setAwaitingOtp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setSuccessMsg(null);

    if (mode === 'signup') {
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setBusy(true);

    try {
      const endpoint = mode === 'signup' ? '/api/signup' : '/api/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { error?: string; message?: string; requires_otp?: boolean };
      if (!res.ok) throw new Error(data.error ?? `${mode === 'signup' ? 'Registration' : 'Sign-in'} failed (${res.status})`);

      if (mode === 'signup' && data.requires_otp) {
        setAwaitingOtp(true);
        setSuccessMsg(`Verification OTP sent to ${email.trim()}! Please check your email inbox.`);
        setBusy(false);
      } else {
        onAuth({ email: email.trim(), password });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.');
      setBusy(false);
    }
  }

  async function verifyOtp(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (otp.trim().length !== 6) {
      setError('Please enter the 6-digit code sent to your email.');
      return;
    }
    setBusy(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otp.trim() }),
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) throw new Error(data.error ?? 'Invalid or expired OTP.');

      setSuccessMsg('Email verified successfully! Logging you in…');
      setTimeout(() => {
        onAuth({ email: email.trim(), password });
      }, 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OTP verification failed.');
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

      {/* Top Left Return Button */}
      {onBack && (
        <div className="relative z-50 container-page pt-6">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold text-ink-200 backdrop-blur transition-colors hover:border-brand-400/40 hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Assessment
          </button>
        </div>
      )}

      <div className="container-page relative flex min-h-[calc(100vh-80px)] items-center justify-center py-10">
        <div className="w-full max-w-md animate-fade-up">
          <div className="mb-6 text-center">
            <span className="chip border border-brand-400/30 bg-brand-600/10 text-brand-200">
              <Waves className="h-3.5 w-3.5" />
              Early Warning System
            </span>
            <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              {mode === 'signin' ? 'Operator Sign-in' : 'Operator Registration'}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-300">
              {mode === 'signin'
                ? 'Sign in to confirm your location and dispatch flood bulletins to your inbox.'
                : 'Create an operator account to monitor and receive live disaster alerts.'}
            </p>
          </div>

          {/* Quick Demo Operator (from commit e644ad6 - No DB Required) */}
          <div className="mb-4 rounded-xl border border-brand-400/25 bg-brand-500/10 p-3.5 flex items-center justify-between gap-3 shadow-sm backdrop-blur">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-bold text-white tracking-wide">Demo Operator (No DB needed)</span>
              </div>
              <div className="mt-0.5 truncate text-[11px] text-ink-300 font-mono">
                shreyashkadam98922@gmail.com
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setEmail('shreyashkadam98922@gmail.com');
                setPassword('shreyash@2005');
                setMode('signin');
                setError(null);
                setSuccessMsg('Demo credentials filled! Click "Sign in" to proceed.');
              }}
              className="shrink-0 rounded-lg border border-brand-400/40 bg-brand-600/30 px-3 py-1.5 text-xs font-semibold text-brand-200 transition-all hover:bg-brand-600 hover:text-white"
            >
              Fill Demo
            </button>
          </div>

          {/* Tab Switcher */}
          <div className="mb-4 flex rounded-xl border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                mode === 'signin'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-ink-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                mode === 'signup'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-ink-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Form */}
          {awaitingOtp ? (
            <form onSubmit={verifyOtp} className="card-dark p-6 sm:p-7">
              <div className="mb-4 text-center">
                <span className="chip border border-brand-400/30 bg-brand-600/10 text-brand-200">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Step 2: Email Verification
                </span>
                <p className="mt-3 text-xs leading-relaxed text-ink-300">
                  We've sent a 6-digit confirmation OTP code to <strong className="text-white">{email}</strong>.
                </p>
              </div>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">Enter 6-Digit OTP</span>
                <div className="relative mt-2">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full rounded-xl border border-brand-400/40 bg-white/[0.04] py-3 px-4 text-center font-mono text-2xl font-extrabold tracking-widest text-brand-300 placeholder:text-ink-500 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  />
                </div>
              </label>

              {error && (
                <div
                  role="alert"
                  className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
                >
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div
                  role="status"
                  className="mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <button type="submit" disabled={busy} className="btn-primary mt-6 w-full">
                {busy ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Verifying OTP…
                  </>
                ) : (
                  'Verify Email & Activate Account'
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setAwaitingOtp(false);
                  setOtp('');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="mt-4 w-full text-center text-xs text-ink-400 hover:text-white"
              >
                ← Back to registration form
              </button>
            </form>
          ) : (
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

              <label className="mt-4 block">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">Password</span>
                <div className="relative mt-2">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <input
                    type="password"
                    required
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={field}
                  />
                </div>
              </label>

              {mode === 'signup' && (
                <label className="mt-4 block">
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">Confirm Password</span>
                  <div className="relative mt-2">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                    <input
                      type="password"
                      required
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className={field}
                    />
                  </div>
                </label>
              )}

              {error && (
                <div
                  role="alert"
                  className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
                >
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div
                  role="status"
                  className="mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <button type="submit" disabled={busy} className="btn-primary mt-6 w-full">
                {busy ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    {mode === 'signup' ? 'Sending Verification OTP…' : 'Signing in…'}
                  </>
                ) : (
                  mode === 'signup' ? 'Send Verification OTP' : 'Sign in'
                )}
              </button>
            </form>
          )}

          <p className="mt-5 text-center text-xs leading-relaxed text-ink-500">
            Bulletins are only ever delivered to the authenticated operator's address.
          </p>
        </div>
      </div>
    </div>
  );
}
