import express from "express";
import { getHealth } from "../controllers/healthControllers.ts";

const router = express.Router();

router.get("/", getHealth);

export default router;
