import type { NextFunction, Request, Response } from "express";
import { ratelimit } from "../config/upstash.ts";
import jwt, { type Secret } from "jsonwebtoken";
import { requireEnv } from "../config/env.ts";

// A SCGF (Small Claude Generated Function)
const getIdentifier = (req: Request): string => {
	const token = req.cookies?.token
	const secret: Secret = Buffer.from(requireEnv("JWT_SECRET"), "base64");
	if (token) {
		try {
			const decoded = jwt.verify(token, secret) as {
				id: string;
			};
			return `user:${decoded.id}`;
		} catch (error) {
			// for future use
		}
	}

	const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
	return `ip:${Array.isArray(ip) ? ip[0] : ip}`;
};

export const rateLimiter = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { success } = await ratelimit.limit(getIdentifier(req));

		if (!success) {
			return res
				.status(429)
				.json({ message: "Too many requests please try again later" });
		}
		next();
	} catch (error) {
		console.error("Rate limiter error:", error);
		next();
	}
};
