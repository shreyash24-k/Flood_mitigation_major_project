/**
 * Runtime configuration.
 *
 * These belong in Vercel environment variables (Project -> Settings ->
 * Environment Variables). Until those can be set, paste the values into the
 * FALLBACK block below — it is read only when the matching env var is absent.
 *
 * WARNING: if you paste real values here and commit them, `git revert` does
 * NOT remove them from git history. Rotate the Google app password afterwards:
 * Google Account -> Security -> App passwords -> delete the old one, make a new one.
 */

/* ----------------------------- FALLBACK BLOCK ----------------------------- */
/* Fill these four strings to run without env vars. Leave '' to require env.  */

const FALLBACK = {
  /** Gmail address the alerts are sent FROM. */
  smtpUser: '',
  /** Google *app password* for that address (16 chars, no spaces). */
  smtpPass: '',
  /** Operator login email. */
  operatorEmail: '',
  /** Operator login password. */
  operatorPassword: '',
};

/* -------------------------------------------------------------------------- */

export const SMTP = {
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  user: process.env.ALERT_FROM_USER ?? FALLBACK.smtpUser,
  pass: process.env.ALERT_FROM_PASS ?? FALLBACK.smtpPass,
} as const;

/** The single demo account. No database — one hard-coded operator login. */
export const OPERATOR = {
  email: process.env.OPERATOR_EMAIL ?? FALLBACK.operatorEmail,
  password: process.env.OPERATOR_PASSWORD ?? FALLBACK.operatorPassword,
} as const;

export const APP_URL =
  process.env.APP_URL ?? 'https://flood-mitigation-major-project.vercel.app';

/** Baseline vs latest satellite pass used for the before/after comparison. */
export const IMAGERY = { before: '2026-05-10', after: '2026-10-02' } as const;

/** Names every unset value, so a misconfigured deploy fails loudly, not silently. */
export function missingConfig(): string[] {
  const missing: string[] = [];
  if (!SMTP.user) missing.push('ALERT_FROM_USER');
  if (!SMTP.pass) missing.push('ALERT_FROM_PASS');
  if (!OPERATOR.email) missing.push('OPERATOR_EMAIL');
  if (!OPERATOR.password) missing.push('OPERATOR_PASSWORD');
  return missing;
}

/** Case-insensitive on the address, exact on the password. */
export function isOperator(email: unknown, password: unknown): boolean {
  if (!OPERATOR.email || !OPERATOR.password) return false;
  return (
    typeof email === 'string' &&
    typeof password === 'string' &&
    email.trim().toLowerCase() === OPERATOR.email.toLowerCase() &&
    password === OPERATOR.password
  );
}
