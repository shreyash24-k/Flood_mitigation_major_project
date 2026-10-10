import { SMTP } from './_internal/config.js';
import nodemailer from 'nodemailer';

interface Req {
  method?: string;
  body?: unknown;
}
interface Res {
  status(code: number): Res;
  json(body: unknown): void;
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = (typeof req.body === 'string' ? safeParse(req.body) : req.body) as
    | { email?: unknown; password?: unknown }
    | undefined;

  const email = String(body?.email ?? '').trim();
  const password = String(body?.password ?? '');

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  if (SMTP.user && SMTP.pass) {
    try {
      const transport = nodemailer.createTransport({
        host: SMTP.host,
        port: SMTP.port,
        secure: SMTP.secure,
        auth: { user: SMTP.user, pass: SMTP.pass },
      });
      await transport.sendMail({
        from: `Flood Mitigation System <${SMTP.user}>`,
        to: email,
        subject: `[VERIFICATION] Your Operator Access OTP: ${otp}`,
        text: `Your one-time verification code is ${otp}. It expires in 10 minutes.`,
        html: `<p>Your verification OTP is: <strong>${otp}</strong></p>`,
      });
    } catch (err) {
      console.warn('Mail send error in serverless:', err);
    }
  }

  return res.status(200).json({
    ok: true,
    requires_otp: true,
    email,
    message: `Verification OTP sent to ${email}!`,
  });
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}
