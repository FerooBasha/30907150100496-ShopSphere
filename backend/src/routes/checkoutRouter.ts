import express from "express";
import { protect } from "../middleware/auth.ts";
import { createCheckoutSession } from "../controllers/checkoutControllers.ts";

const router = express.Router();

router.post("/session", protect, createCheckoutSession);

export default router;
