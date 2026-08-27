import express from "express";
import {
	getProducts,
	getProductById,
	createProduct,
} from "../controllers/productControllers.js";
import { upload } from "../middleware/upload.ts";
import { admin, protect } from "../middleware/auth.ts";

const router = express.Router();

router.get("/", getProducts);

router.get("/:id", getProductById);

router.post("/", upload.array("image", 5), protect, admin, createProduct);

// router.patch("/:id", updateProduct);



export default router;
