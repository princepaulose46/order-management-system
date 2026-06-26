import { Request, Response, NextFunction } from "express";
import { OrderStatus } from "@prisma/client";
import orderService from "../services/order.service";

/**
 * Thin controller layer — parses HTTP requests, delegates to
 * the service layer, and formats HTTP responses.
 * Errors are forwarded to the global error-handling middleware.
 */

/** Helper to extract a single string param from Express request params. */
const getParam = (params: Record<string, string | string[]>, key: string): string => {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
};

/**
 * POST /api/orders
 * Creates a new order with the provided customer name and items.
 */
export const createOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { customerName, items } = req.body;
    const order = await orderService.createOrder({ customerName, items });
    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/orders/:id
 * Retrieves a single order by its UUID.
 */
export const getOrderById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = getParam(req.params, "id");
    const order = await orderService.getOrderById(id);
    res.status(200).json(order);
  } catch (error) {
    next(error);
  }
};

export const listOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const status = req.query.status as OrderStatus | undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const page = req.query.page ? Number(req.query.page) : 1;

    const paginatedOrders = await orderService.listOrders(status, limit, page);
    res.status(200).json(paginatedOrders);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/orders/:id/cancel
 * Cancels an order (only if it's in PENDING status).
 */
export const cancelOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = getParam(req.params, "id");
    const order = await orderService.cancelOrder(id);
    res.status(200).json(order);
  } catch (error) {
    next(error);
  }
};
