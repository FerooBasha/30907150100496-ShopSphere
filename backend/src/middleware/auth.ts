import jwt, { type JwtPayload, type Secret } from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { prismaPg } from "../config/dbs.ts";
import type { User } from "../generated/prisma-postgres/index.js";
import { requireEnv } from "../config/env.ts";

// Interface
interface AuthTokenPayload extends JwtPayload {
	id: string;
	role: string;
}

// Creating user type without password for security
export type SafeUser = Omit<User, "password">;

// Adding user to Request express interface
declare global {
	namespace Express {
		interface Request {
			user?: SafeUser;
		}
	}
}

// Protected route middleware for logged users
export const protect = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const token = req.cookies.token;
		if (!token) {
			return res
				.status(401)
				.json({ message: "Not authorized, no token found" });
		}
		// Parsing JWT_SECRET with base64 and casting it to Secret
		const secret: Secret = Buffer.from(requireEnv("JWT_SECRET"), "base64");
		// Verifying JWT integrity
		const decoded = jwt.verify(token, secret) as AuthTokenPayload; 

		const user = await prismaPg.user.findUnique({
			where: { id: decoded.id },
		});

		if (!user) return res.status(401).json({ message: "User not found" });

		// Creating user without password
		const { password, ...safeUser } = user;
		// Setting req.user to the safe user for the next function
		req.user = safeUser;

		next();
	} catch (error) {
		console.error(error);
		res.status(401).json({ message: "Not authorized, token failed" });
	}
};

// Check if admin middleware
export const admin = (req: Request, res: Response, next: NextFunction) => {
	if (req.user?.role !== "ADMIN") {
		return res.status(403).json({ message: "Not authorized as admin" });
	}
	next();
};
