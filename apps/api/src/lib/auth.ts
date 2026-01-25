
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { betterAuth } from "better-auth";
import { prisma } from './prisma.js';
import VerifyEmail from './emails/verify-email.js';
import { getResend } from './resend.js';


const trustedOrigins = [
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.MOBILE_APP_URL,
  process.env.API_URL,
  'http://localhost:3000',
  'https://localhost:3000',
  'http://localhost:3001',
  'exp://localhost:8081',
  'exp://192.168.1.1:8081',
].filter(Boolean) as string[];

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      const resend = getResend();
      if (!resend) {
        console.warn(
          'RESEND_API_KEY missing; skipping verification email send at build/runtime.',
        );
        return;
      }
      await resend.emails.send({
        from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_SENDER_ADDRESS}>`,
        to: user.email,
        subject: 'Verify your email',
        react: VerifyEmail({ email: user.email, verifyUrl: url }),
      });
    },
  },
  user: {
    additionalFields: {
      firstName: {
        type: 'string',
        required: true,
      },
      lastName: {
        type: 'string',
        required: true,
      },
    },
  },
  session: {
    modelName: 'session',
    fields: {
      token: 'sessionToken',
    },
  },
});
