import { OrderStatus, Prisma } from "@prisma/client";

import prisma from "../config/prisma";
import { NotFoundError, ValidationError } from "../errors/errors";

/**
 * Input shape for a single order item when creating an order.
 */
export interface CreateOrderItemInput {
  productName: string;
  quantity: number;
  price: number;
}

/**
 * Input shape for creating a new order.
 */
export interface CreateOrderInput {
  customerName: string;
  items: CreateOrderItemInput[];
}

/**
 * Service layer encapsulating all order-related business logic.
 * Communicates exclusively with the Prisma ORM — no HTTP concerns here.
 */
class OrderService {
  /**
   * Creates a new order with its associated items in a single
   * Prisma nested write (implicit transaction).
   *
   * @param input - Customer name and array of order items.
   * @returns The newly created order including its items.
   */
  async createOrder(input: CreateOrderInput) {
    const { customerName, items } = input;

    if (!customerName || customerName.trim().length === 0) {
      throw new ValidationError("Customer name is required");
    }

    if (!items || items.length === 0) {
      throw new ValidationError("At least one order item is required");
    }

    // Validate each item
    for (const item of items) {
      if (!item.productName || item.productName.trim().length === 0) {
        throw new ValidationError("Product name is required for all items");
      }
      if (!item.quantity || item.quantity <= 0) {
        throw new ValidationError("Quantity must be a positive integer");
      }
      if (item.price == null || Number(item.price) < 0 || isNaN(Number(item.price))) {
        throw new ValidationError("Price must be a non-negative number");
      }
    }

    const order = await prisma.order.create({
      data: {
        customerName: customerName.trim(),
        status: OrderStatus.PENDING,
        items: {
          create: items.map((item) => ({
            productName: item.productName.trim(),
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: { items: true },
    });

    return order;
  }

  /**
   * Retrieves an order by its unique ID, including all items.
   *
   * @param id - The UUID of the order.
   * @returns The order with its items.
   * @throws NotFoundError if the order does not exist.
   */
  async getOrderById(id: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundError(`Order with ID '${id}' not found`);
    }

    return order;
  }

  /**
   * Lists all orders, optionally filtered by status, with pagination.
   *
   * @param status - Optional OrderStatus to filter by.
   * @param limit - Max number of items to retrieve (default: 20).
   * @param page - Current page number (default: 1).
   * @returns An object containing the array of orders (data) and pagination metadata (meta).
   */
  async listOrders(status?: OrderStatus, limit: number = 20, page: number = 1) {
    const where: Prisma.OrderWhereInput = {};

    if (status) {
      // Validate that the provided status is a valid enum value
      if (!Object.values(OrderStatus).includes(status)) {
        throw new ValidationError(
          `Invalid status '${status}'. Valid statuses: ${Object.values(OrderStatus).join(", ")}`
        );
      }
      where.status = status;
    }

    // Run both queries concurrently to maximize throughput
    const [orders, totalItems] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.order.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: orders,
      meta: {
        totalItems,
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * Cancels an order. Only PENDING orders can be cancelled.
   *
   * @param id - The UUID of the order to cancel.
   * @returns The updated (cancelled) order.
   * @throws NotFoundError if the order does not exist.
   * @throws ValidationError if the order is not in PENDING status.
   */
  async cancelOrder(id: string) {
    const order = await this.getOrderById(id);

    if (order.status !== OrderStatus.PENDING) {
      throw new ValidationError(
        `Cannot cancel order with status '${order.status}'. Only PENDING orders can be cancelled.`
      );
    }

    const cancelledOrder = await prisma.order.update({
      where: { id },
      data: { status: OrderStatus.CANCELLED },
      include: { items: true },
    });

    return cancelledOrder;
  }

  /**
   * Background job method: batch-promotes PENDING orders to PROCESSING.
   * Processes updates in small batches (default: 500) to keep transaction locks short
   * and prevent database execution bottlenecks under high volume.
   *
   * @param batchSize - Number of orders to process per batch update.
   * @returns The total count of orders promoted.
   */
  async promotePendingOrders(batchSize: number = 500): Promise<number> {
    let totalPromoted = 0;

    while (true) {
      // 1. Fetch only the IDs of the first batch of PENDING orders
      const pendingOrders = await prisma.order.findMany({
        where: { status: OrderStatus.PENDING },
        select: { id: true },
        take: batchSize,
      });

      if (pendingOrders.length === 0) {
        break;
      }

      const ids = pendingOrders.map((order) => order.id);

      // 2. Update status in a fast, short-lived transaction
      const result = await prisma.order.updateMany({
        where: {
          id: { in: ids },
          status: OrderStatus.PENDING, // Safeguard to ensure status wasn't cancelled during the query
        },
        data: { status: OrderStatus.PROCESSING },
      });

      totalPromoted += result.count;

      // 3. Break if we processed the final partial batch
      if (pendingOrders.length < batchSize || result.count === 0) {
        break;
      }
    }

    return totalPromoted;
  }
}

export default new OrderService();
