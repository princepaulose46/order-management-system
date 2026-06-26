import { z } from "zod";
import { OrderStatus } from "@prisma/client";

/**
 * Validation schema for placing a new order.
 */
export const CreateOrderSchema = z.object({
  body: z.object({
    customerName: z
      .string({ message: "Customer name is required" })
      .trim()
      .min(1, "Customer name is required"),
    items: z
      .array(
        z.object({
          productName: z
            .string({ message: "Product name is required for all items" })
            .trim()
            .min(1, "Product name is required for all items"),
          quantity: z
            .number({ message: "Quantity must be a positive integer" })
            .int("Quantity must be a positive integer")
            .positive("Quantity must be a positive integer"),
          price: z
            .number({ message: "Price must be a non-negative number" })
            .nonnegative("Price must be a non-negative number"),
        })
      )
      .min(1, "At least one order item is required"),
  }),
});

export const ListOrdersSchema = z.object({
  query: z.object({
    status: z.nativeEnum(OrderStatus, { message: "Invalid status" }).optional(),
    limit: z.coerce.number().int().positive().max(100).default(20),
    offset: z.coerce.number().int().nonnegative().default(0),
  }),
});

/**
 * Validation schema for retrieving or cancelling an order.
 * Ensures the `id` param is a valid UUID before invoking database queries.
 */
export const OrderIdParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid("Order ID must be a valid UUID"),
  }),
});
