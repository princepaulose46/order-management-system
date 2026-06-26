import dotenv from "dotenv";
import { z } from "zod";

// Load environment variables from .env file
dotenv.config();

const envSchema = z.object({
  PORT: z.string().default("3000").transform((val) => parseInt(val, 10)),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL environment variable is required"),
  DIRECT_URL: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.string().default("60000").transform((val) => parseInt(val, 10)),
  RATE_LIMIT_MAX: z.string().default("200").transform((val) => parseInt(val, 10)),
  TRUST_PROXY: z.string().default("false"),
  ENABLE_SCHEDULER: z
    .string()
    .default("true")
    .transform((val) => val === "true" || val === "1"),
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.string().default("6379").transform((val) => parseInt(val, 10)),
  REDIS_PASSWORD: z.string().optional(),
});

const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error("❌ Environment configuration validation failed:");
  console.error(JSON.stringify(parseResult.error.format(), null, 2));
  process.exit(1);
}

export const env = parseResult.data;
