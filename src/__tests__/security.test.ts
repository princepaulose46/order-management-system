import request from "supertest";
import express from "express";
import rateLimit from "express-rate-limit";
import app from "../app";

describe("Security Features Configuration", () => {
  // 1. Test CORS Headers on the Main App
  describe("CORS configuration", () => {
    it("should include access-control-allow-origin header", async () => {
      const response = await request(app).get("/health");
      expect(response.headers).toHaveProperty("access-control-allow-origin");
      expect(response.headers["access-control-allow-origin"]).toBe("*");
    });
  });

  // 2. Test Helmet Headers on the Main App
  describe("Helmet Security Headers", () => {
    it("should set security headers (e.g., X-Content-Type-Options, X-Frame-Options, X-DNS-Prefetch-Control)", async () => {
      const response = await request(app).get("/health");
      
      // Helmet default headers
      expect(response.headers).toHaveProperty("x-content-type-options", "nosniff");
      expect(response.headers).toHaveProperty("x-frame-options", "SAMEORIGIN");
      expect(response.headers).toHaveProperty("x-dns-prefetch-control", "off");
    });
  });

  // 3. Test Root Welcome Endpoint
  describe("Root Welcome Endpoint", () => {
    it("should return welcome message and info links", async () => {
      const response = await request(app).get("/").expect(200);
      expect(response.body).toHaveProperty("message");
      expect(response.body).toHaveProperty("documentation", "/api-docs");
      expect(response.body).toHaveProperty("health", "/health");
    });
  });

  // 4. Test Rate Limiting behavior independently
  describe("Rate Limiting logic", () => {
    let testApp: express.Application;

    beforeAll(() => {
      testApp = express();
      
      // Setup a rate limiter with a limit of 2 requests for testing
      const testLimiter = rateLimit({
        windowMs: 60 * 1000, // 1 minute
        max: 2, // limit each IP to 2 requests per window
        standardHeaders: true,
        legacyHeaders: false,
        message: {
          error: "Too many requests, please try again later.",
          statusCode: 429,
        },
      });

      testApp.use("/api/", testLimiter);
      testApp.get("/api/test", (_req, res) => {
        res.status(200).json({ status: "success" });
      });
    });

    it("should allow requests under the limit and then return 429 for requests exceeding the limit", async () => {
      // 1st request should succeed
      await request(testApp)
        .get("/api/test")
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe("success");
          expect(res.headers).toHaveProperty("ratelimit-limit", "2");
          expect(res.headers).toHaveProperty("ratelimit-remaining", "1");
        });

      // 2nd request should succeed
      await request(testApp)
        .get("/api/test")
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe("success");
          expect(res.headers).toHaveProperty("ratelimit-remaining", "0");
        });

      // 3rd request should fail with 429
      await request(testApp)
        .get("/api/test")
        .expect(429)
        .expect((res) => {
          expect(res.body).toEqual({
            error: "Too many requests, please try again later.",
            statusCode: 429,
          });
        });
    });
  });
});
