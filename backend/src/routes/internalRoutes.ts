import express from "express";
import {
	checkProductExists,
	updateProductRating,
} from "../controllers/internalController.ts";

const router = express.Router();

router.get("/products/:id/exists", checkProductExists);
router.patch("/products/:id/rating", updateProductRating);

export default router;
