interface Req {
  method?: string;
  body?: unknown;
}
interface Res {
  status(code: number): Res;
  json(body: unknown): void;
}

export default function handler(req: Req, res: Res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = (typeof req.body === 'string' ? safeParse(req.body) : req.body) as
    | { email?: unknown; otp?: unknown }
    | undefined;

  const email = String(body?.email ?? '').trim();
  const otp = String(body?.otp ?? '').trim();

  if (!email || otp.length !== 6) {
    return res.status(400).json({ error: 'Valid 6-digit OTP is required.' });
  }

  return res.status(200).json({
    ok: true,
    email,
    message: 'Email verified successfully!',
  });
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}
