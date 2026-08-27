import express from "express";
import { getOrders } from "../controllers/orderControllers.ts";
import { protect } from "../middleware/auth.ts";

const router = express.Router();

// Dead route replaced by ../controllers/webhookController/handleStripeWebhook
// router.post("/", protect, createOrder);
router.get("/", protect, getOrders);

export default router;
