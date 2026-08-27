import express from "express";
import { protect } from "../middleware/auth.ts";
import { addToCart, getCart, removeFromCart, updateCartItem } from "../controllers/cartControllers.ts";

const router = express.Router();

router.post("/:id", protect, addToCart);
router.get("/", protect, getCart);
router.put("/:id", protect, updateCartItem);
router.delete("/:id", protect, removeFromCart);

export default router;
