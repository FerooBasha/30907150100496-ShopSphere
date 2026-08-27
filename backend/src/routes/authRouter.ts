import { admin, protect } from "../middleware/auth.js";
import { upload } from "../middleware/upload.ts";
import {
	register,
	login,
	getProfile,
	logout,
	updateUser,
	updatePassword,
	changUserRole,
} from "../controllers/authControllers.ts";
import express from "express";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

router.post("/logout", logout);

router.get("/me", protect, getProfile);

router.put("/me", protect, upload.single("image"), updateUser);

router.put("/me/password", protect, updatePassword);

router.put("/admin/changeUserRole", protect, admin, changUserRole);

export default router;
