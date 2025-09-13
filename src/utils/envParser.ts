import { z } from "zod";

const envSchema = z.object({
  BASE_URL: z.url(),
  SMTP_FROM: process.env.NODE_ENV === "development" ? z.email().optional() : z.email(),
  SMTP_HOST: process.env.NODE_ENV === "development" ? z.string().optional() : z.string(),
  SMTP_PASSWORD: process.env.NODE_ENV === "development" ? z.string().optional() : z.string(),
  SMTP_PORT:
    process.env.NODE_ENV === "development" ? z.string().transform(Number).optional() : z.string().transform(Number),
  SMTP_USER: process.env.NODE_ENV === "development" ? z.string().optional() : z.string(),
});

export const ENV = envSchema.parse(process.env);

// Add validation for production environment
if (process.env.NODE_ENV === "production") {
  const requiredFields = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD"];

  requiredFields.forEach((field) => {
    if (!process.env[field]) {
      throw new Error(`Missing required env variable: ${field}`);
    }
  });
}
