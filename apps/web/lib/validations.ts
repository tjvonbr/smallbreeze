import { z } from "zod";

export const signUpSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1),
  teamName: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const newCalendarLinkSchema = z.object({
  url: z.string().min(1),
  listingId: z.string().min(1),
});

export const newPropertySchema = z.object({
  nickname: z.string().min(1),
  streetAddress: z.string().min(1),
  streetAddress2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  zip: z.string().min(1),
  country: z.string().min(1),
  iCalUrl: z.string().optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
});