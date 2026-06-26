import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import Redis from "ioredis";
import { env } from "../config/env";
import logger from "../config/logger";

let store: any = undefined;
let redisClient: Redis | null = null;

const redisUrl = env.REDIS_URL;
const redisHost = env.REDIS_HOST;

if (redisUrl || redisHost) {
  try {
    redisClient = redisUrl
      ? new Redis(redisUrl)
      : new Redis({
          host: redisHost,
          port: env.REDIS_PORT,
          password: env.REDIS_PASSWORD || undefined,
        });

    redisClient.on("error", (err) => {
      logger.error({ err }, "Redis connection error");
    });

    store = new RedisStore({
      // sendCommand implementation to run Redis commands through ioredis
      sendCommand: (...args: string[]) => {
        const [command, ...rest] = args;
        if (!redisClient) {
          throw new Error("Redis client not initialized");
        }
        return redisClient.call(command, ...rest) as Promise<any>;
      },
    });
    
    // Log info without excessive verbosity in test runner
    if (env.NODE_ENV !== "test") {
      logger.info("Distributed rate limiting active: Connected to Redis.");
    }
  } catch (error) {
    logger.error(
      { err: error },
      "Failed to initialize Redis rate limit store. Falling back to in-memory rate limiting."
    );
  }
} else {
  if (env.NODE_ENV !== "test") {
    logger.info("In-memory rate limiting active (Redis config not found).");
  }
}

/**
 * Express middleware to rate limit API requests.
 * Uses a Redis store for distributed rate limiting across horizontal instances,
 * or falls back to standard in-memory store if Redis is unconfigured.
 */
export const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  store: store, // Fallback to default MemoryStore if store is undefined
  message: {
    error: "Too many requests, please try again later.",
    statusCode: 429,
  },
  skip: () => env.NODE_ENV === "test", // Bypass during test runs
});

/**
 * Closes the active Redis connection cleanly on application shutdown.
 */
export const closeRedisConnection = async () => {
  if (redisClient) {
    await redisClient.quit();
  }
};

/**
 * Dynamically configures the Express 'trust proxy' setting depending on the environment.
 * Required for rate-limiting to recognize client IPs accurately when behind proxies.
 */
export const configureTrustProxy = (app: any) => {
  const trustProxy = env.TRUST_PROXY;
  if (trustProxy === "true" || trustProxy === "1") {
    app.set("trust proxy", 1);
  } else if (trustProxy && trustProxy !== "false") {
    app.set("trust proxy", trustProxy);
  } else if (env.NODE_ENV === "production") {
    app.set("trust proxy", 1); // Safe default for most cloud hosting environments
  }
};

