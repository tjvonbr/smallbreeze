import { Resend } from 'resend';

export function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key || key.trim().length === 0) {
    return null;
  }
  return new Resend(key);
}
