import { Router } from "express";
import {
  createOrder,
  getOrderById,
  listOrders,
  cancelOrder,
} from "../controllers/order.controller";
import { validateRequest } from "../middleware/validate.middleware";
import {
  CreateOrderSchema,
  ListOrdersSchema,
  OrderIdParamsSchema,
} from "../middleware/order.validation";

const router = Router();

router.post("/", validateRequest(CreateOrderSchema), createOrder);
router.get("/", validateRequest(ListOrdersSchema), listOrders);
router.get("/:id", validateRequest(OrderIdParamsSchema), getOrderById);
router.put("/:id/cancel", validateRequest(OrderIdParamsSchema), cancelOrder);

export default router;
