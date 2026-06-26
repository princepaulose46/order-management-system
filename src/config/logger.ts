import pino from "pino";
import { env } from "./env";

const isDevOrTest = env.NODE_ENV === "development" || env.NODE_ENV === "test";

const logger = pino({
  level: env.NODE_ENV === "test" ? "silent" : (process.env.LOG_LEVEL || "info"),
  transport: isDevOrTest
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      }
    : undefined,
});

export default logger;
