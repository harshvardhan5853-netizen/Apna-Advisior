import { z } from "zod";

/** Login request body */
export const loginSchema = z.object({
  emailOrUsername: z.string().min(1, "Email/Username is required"),
  password: z.string().min(1, "Password is required"),
});

/** Registration request body */
export const registerSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
});

/** Extract API form fields */
export const extractSchema = z.object({
  kind: z.enum(["auto", "xlsx", "pdf", "image"]).optional(),
  password: z.string().optional(),
  geminiApiKey: z.string().optional(),
  geminiModel: z.string().optional(),
  checkProtection: z.string().optional(),
  checkPassword: z.string().optional(),
});

/** Quotes request body */
export const quotesSchema = z.object({
  symbols: z
    .array(z.string().min(1))
    .min(1, "At least one symbol is required")
    .max(60, "Maximum 60 symbols per request"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type QuotesInput = z.infer<typeof quotesSchema>;
