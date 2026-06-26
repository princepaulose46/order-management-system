import request from "supertest";
import app from "../app";
import prisma from "../config/prisma";

/**
 * Integration test suite for the Order Processing API.
 *
 * Tests the full HTTP request/response cycle through Express,
 * hitting a real (test) database via Prisma.
 */
describe("Order API - Integration Tests", () => {
  let createdOrderId: string;

  // ────────────────────── Setup & Teardown ──────────────────────

  beforeAll(async () => {
    // Ensure Prisma client is connected
    await prisma.$connect();

    // Clean up any leftover test data
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();

    // Disconnect to prevent Jest from hanging
    await prisma.$disconnect();
  });

  // ────────────────────── POST /api/orders ──────────────────────

  describe("POST /api/orders", () => {
    it("should create a new order with items and return 201", async () => {
      const payload = {
        customerName: "Alice Johnson",
        items: [
          { productName: "Wireless Headphones", quantity: 2, price: 49.99 },
          { productName: "USB-C Cable", quantity: 5, price: 9.99 },
        ],
      };

      const response = await request(app)
        .post("/api/orders")
        .send(payload)
        .expect("Content-Type", /json/)
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body.customerName).toBe("Alice Johnson");
      expect(response.body.status).toBe("PENDING");
      expect(response.body.items).toHaveLength(2);
      expect(response.body.items[0]).toHaveProperty("productName");
      expect(response.body.items[0]).toHaveProperty("quantity");
      expect(response.body.items[0]).toHaveProperty("price");

      // Save the order ID for subsequent tests
      createdOrderId = response.body.id;
    });

    it("should return 400 when customer name is missing", async () => {
      const payload = {
        customerName: "",
        items: [{ productName: "Widget", quantity: 1, price: 10.0 }],
      };

      const response = await request(app)
        .post("/api/orders")
        .send(payload)
        .expect(400);

      expect(response.body).toHaveProperty("error");
      expect(response.body.statusCode).toBe(400);
    });

    it("should return 400 when items array is empty", async () => {
      const payload = {
        customerName: "Bob Smith",
        items: [],
      };

      const response = await request(app)
        .post("/api/orders")
        .send(payload)
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });
  });

  // ────────────────────── GET /api/orders/:id ──────────────────────

  describe("GET /api/orders/:id", () => {
    it("should return the order with items for a valid ID", async () => {
      const response = await request(app)
        .get(`/api/orders/${createdOrderId}`)
        .expect("Content-Type", /json/)
        .expect(200);

      expect(response.body.id).toBe(createdOrderId);
      expect(response.body.customerName).toBe("Alice Johnson");
      expect(response.body.status).toBe("PENDING");
      expect(response.body.items).toHaveLength(2);
    });

    it("should return 404 for a non-existent order ID", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";

      const response = await request(app)
        .get(`/api/orders/${fakeId}`)
        .expect(404);

      expect(response.body.error).toContain("not found");
      expect(response.body.statusCode).toBe(404);
    });
  });

  // ────────────────────── GET /api/orders ──────────────────────

  describe("GET /api/orders", () => {
    it("should return paginated orders", async () => {
      const response = await request(app)
        .get("/api/orders")
        .expect("Content-Type", /json/)
        .expect(200);

      expect(response.body).toHaveProperty("data");
      expect(response.body).toHaveProperty("meta");
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body.meta).toEqual({
        totalItems: expect.any(Number),
        limit: 20,
        offset: 0,
      });
    });

    it("should filter orders by status", async () => {
      const response = await request(app)
        .get("/api/orders?status=PENDING")
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      response.body.data.forEach((order: { status: string }) => {
        expect(order.status).toBe("PENDING");
      });
    });

    it("should validate and apply pagination query parameters", async () => {
      const response = await request(app)
        .get("/api/orders?limit=1&offset=0")
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.meta.limit).toBe(1);
      expect(response.body.meta.offset).toBe(0);
    });

    it("should return 400 for invalid pagination parameters", async () => {
      await request(app)
        .get("/api/orders?limit=invalid")
        .expect(400);

      await request(app)
        .get("/api/orders?limit=-1")
        .expect(400);

      await request(app)
        .get("/api/orders?offset=-1")
        .expect(400);
    });
  });

  // ────────────────────── PUT /api/orders/:id/cancel ──────────────────────

  describe("PUT /api/orders/:id/cancel", () => {
    it("should successfully cancel a PENDING order", async () => {
      const response = await request(app)
        .put(`/api/orders/${createdOrderId}/cancel`)
        .expect(200);

      expect(response.body.id).toBe(createdOrderId);
      expect(response.body.status).toBe("CANCELLED");
    });

    it("should return 400 when trying to cancel a non-PENDING order", async () => {
      // The order is now CANCELLED, so cancelling again should fail
      const response = await request(app)
        .put(`/api/orders/${createdOrderId}/cancel`)
        .expect(400);

      expect(response.body.error).toContain("Cannot cancel");
      expect(response.body.statusCode).toBe(400);
    });

    it("should return 400 when trying to cancel a PROCESSING order", async () => {
      // Create a fresh order and manually set it to PROCESSING
      const createResponse = await request(app)
        .post("/api/orders")
        .send({
          customerName: "Charlie Brown",
          items: [{ productName: "Notebook", quantity: 1, price: 15.0 }],
        })
        .expect(201);

      const processingOrderId = createResponse.body.id;

      // Manually update to PROCESSING
      await prisma.order.update({
        where: { id: processingOrderId },
        data: { status: "PROCESSING" },
      });

      // Attempt to cancel
      const cancelResponse = await request(app)
        .put(`/api/orders/${processingOrderId}/cancel`)
        .expect(400);

      expect(cancelResponse.body.error).toContain("Cannot cancel");
      expect(cancelResponse.body.error).toContain("PROCESSING");
    });
  });

  // ────────────────────── Health Check ──────────────────────

  describe("GET /health", () => {
    it("should return health status", async () => {
      const response = await request(app).get("/health").expect(200);

      expect(response.body.status).toBe("ok");
      expect(response.body).toHaveProperty("timestamp");
    });
  });
});
