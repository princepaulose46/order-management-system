import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "E-commerce Order Processing API",
      version: "1.0.0",
      description:
        "A production-ready REST API for managing e-commerce orders. " +
        "Supports creating, retrieving, listing, and cancelling orders " +
        "with automatic background processing of pending orders.",
      contact: {
        name: "API Support",
      },
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
    ],
    tags: [
      {
        name: "Orders",
        description: "Order management endpoints",
      },
    ],
  },
  apis: ["./src/docs/swagger.yaml"],
};

export const swaggerSpec = swaggerJsdoc(options);
