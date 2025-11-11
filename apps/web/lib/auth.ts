import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import db from "@/lib/prisma";
import resend from "./resend";
import VerifyEmail from "@/components/emails/verify-email";

const trustedOrigins = [
  process.env.NEXT_PUBLIC_APP_URL,
  "http://localhost:3000",
  "https://localhost:3000",
].filter(Boolean) as string[];

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      resend.emails.send({
          from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_SENDER_ADDRESS}>`,
          to: user.email,
          subject: "Verify your email",
          react: VerifyEmail({ email: user.email, verifyUrl: url }),
      });
    },
  },
  user: {
    additionalFields: {
      firstName: {
        type: "string",
        required: true,
      },
      lastName: {
        type: "string",
        required: true,
      },
    },
  },
  session: {
    modelName: "session",
    fields: {
      token: "sessionToken",
    },
  },
});