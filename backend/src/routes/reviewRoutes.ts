import { Router } from "express";
import { createReview, getProductReviews } from "../controllers/reviewProxyController.ts";
import { protect } from "../middleware/auth.ts";

const router = Router();

router.post("/:id", protect, createReview);
router.get("/:id", getProductReviews);

export default router;