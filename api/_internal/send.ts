import nodemailer from 'nodemailer';
import { SMTP } from './config';
import { renderHtml, renderText, subjectFor, type Bulletin } from './bulletin';

/** Opens one SMTP connection and sends every bulletin down it. */
export async function sendBulletins(to: string, bulletins: Bulletin[]): Promise<string[]> {
  const transport = nodemailer.createTransport({
    host: SMTP.host,
    port: SMTP.port,
    secure: SMTP.secure,
    auth: { user: SMTP.user, pass: SMTP.pass },
  });

  const sent: string[] = [];
  try {
    for (const bulletin of bulletins) {
      const subject = subjectFor(bulletin);
      await transport.sendMail({
        from: `Flood Mitigation Early Warning <${SMTP.user}>`,
        to,
        subject,
        text: renderText(bulletin),
        html: renderHtml(bulletin),
      });
      sent.push(subject);
    }
  } finally {
    transport.close();
  }
  return sent;
}
