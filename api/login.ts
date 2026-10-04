import { isOperator, missingConfig } from './_internal/config.js';

interface Req {
  method?: string;
  body?: unknown;
}
interface Res {
  status(code: number): Res;
  json(body: unknown): void;
}

/**
 * Credential check only — there is no database and no session store. The
 * client keeps the credentials and re-sends them to /api/alerts, which
 * verifies them again before sending anything. This endpoint exists so the
 * password never has to be shipped in the frontend bundle.
 */
export default function handler(req: Req, res: Res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const missing = missingConfig();
  if (missing.length) {
    return res.status(500).json({
      error: `Server not configured. Missing: ${missing.join(', ')}`,
    });
  }

  const body = (typeof req.body === 'string' ? safeParse(req.body) : req.body) as
    | { email?: unknown; password?: unknown }
    | undefined;

  if (!isOperator(body?.email, body?.password)) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  return res.status(200).json({ ok: true, email: String(body!.email).trim() });
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}
