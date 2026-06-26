import express from "express";
import helmet from "helmet";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import orderRoutes from "./routes/order.routes";
import { errorHandler } from "./middleware/error.middleware";
import { swaggerSpec } from "./config/swagger";
import { apiLimiter, configureTrustProxy } from "./middleware/rate-limit.middleware";

const app = express();

// --------------- Trust Proxy Configuration ---------------
configureTrustProxy(app);

// --------------- Security Headers & CORS ---------------
app.use(helmet());
app.use(cors());

// --------------- Rate Limiting ---------------
// Apply rate limiter specifically to API routes
app.use("/api", apiLimiter);

// --------------- Middleware ---------------
app.use(express.json());

// --------------- API Documentation ---------------
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// --------------- Welcome Endpoint ---------------
app.get("/", (_req, res) => {
  res.status(200).json({
    message: "Welcome to the Order Management System API",
    documentation: "/api-docs",
    health: "/health",
    version: "1.0.0",
  });
});

// --------------- Health Check ---------------
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// --------------- Routes ---------------
app.use("/api/orders", orderRoutes);

// --------------- Global Error Handler ---------------
app.use(errorHandler);

export default app;
