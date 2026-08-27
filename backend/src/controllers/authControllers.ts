import type { Request, Response, CookieOptions } from "express";
import jwt, { type Secret } from "jsonwebtoken";
import { prismaPg } from "../config/dbs.ts";
import bcrypt from "bcrypt";
import { transport } from "../config/nodemailer.ts";
import { getWelcomeEmail } from "../util/emailTemplate.ts";
import path from "path";
import { r2 } from "../config/r2.ts";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { requireEnv } from "../config/env.ts";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { SafeUser } from "../middleware/auth.ts";
import { PrismaClientKnownRequestError } from "../generated/prisma-postgres/runtime/library.js";
import type { Prisma } from "../generated/prisma-postgres/index.js";

interface UserWithImageUrl extends SafeUser {
	imageUrl: string | null;
}

async function getUserWithImageUrl(user: SafeUser): Promise<UserWithImageUrl> {
	if (!user.imageKey) return { ...user, imageUrl: "" };
	const command = new GetObjectCommand({
		Bucket: requireEnv("BUCKET_NAME"),
		Key: user?.imageKey,
	});
	const imageUrl = await getSignedUrl(r2, command, { expiresIn: 3600 }); // 1 hour

	return { ...user, imageUrl };
}

// I use HTTP only cookies I AM SUPERIOR
const tokenCookieOptions: CookieOptions = {
	httpOnly: true,
	secure: process.env.NODE_ENV === "production",
	sameSite: "strict",
	maxAge: 30 * 86400000, // 30 Days
};
const loggedInCookieOptions: CookieOptions = {
	httpOnly: false,
	secure: process.env.NODE_ENV === "production",
	sameSite: "lax",
	maxAge: 30 * 86400000, // 30 Days
};

// Generating JWT token
const generateToken = (id: string, role: string) => {
	// Parsing JWT_SECRET with base64 and casting it to Secret
	const secret: Secret = Buffer.from(requireEnv("JWT_SECRET"), "base64");

	return jwt.sign({ id, role }, secret, {
		algorithm: "HS512",
		expiresIn: "30d",
	});
};

export const register = async (req: Request, res: Response) => {
	try {
		const { username, email, password } = req.body;

		if (!username || !email || !password)
			return res
				.status(400)
				.json({ message: "Please provide all required fields" });

		// I don't need email : email I AM SUPERIOR
		const userExists = await prismaPg.user.findUnique({
			where: { email },
			omit: {
				password: true,
			},
		});

		// if user exists return HTTP 400 Bad Request
		if (userExists)
			return res.status(400).json({ message: "Email already in use" });

		// Hashing password to store safely on database
		const hashedPassword = await bcrypt.hash(password, 12);

		const newUser = await prismaPg.user.create({
			data: { username, email, password: hashedPassword, imageKey: "" },
		});

		const token = generateToken(newUser.id, newUser.role);

		res.cookie("token", token, tokenCookieOptions);
		res.cookie("isLoggedIn", "true", loggedInCookieOptions);

		// Sending Email
		transport.sendMail({
			to: newUser.email,
			subject: "Account Creation Bricked Lemons",
			html: getWelcomeEmail(newUser.username),
		});

		// Creating Safe User
		const { password: extractedPassword, ...newSafeUser } = newUser;

		// Getting User with Profile Image Url
		const userWithImageUrl = await getUserWithImageUrl(newSafeUser);

		return res.status(201).json({
			message: "User created successfully",
			user: userWithImageUrl,
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ message: "Internal server error", error });
	}
};
export const login = async (req: Request, res: Response) => {
	try {
		const { email, password } = req.body;

		if (!email || !password)
			return res
				.status(400)
				.json({ message: "Please provide all required fields" });

		const user = await prismaPg.user.findUnique({
			where: { email },
		});

		//  if email doesn't return a valid user return HTTP 401 Unauthorized
		if (!user)
			return res.status(401).json({ message: "Invalid email or password" });

		// Comparing if password is a match
		const isMatch = await bcrypt.compare(password, user.password);

		//  If password and hashed password on db don't match return HTTP 401 Unauthorized
		if (!isMatch)
			return res.status(401).json({ message: "Invalid email or password" });

		const token = generateToken(user.id, user.role);

		res.cookie("token", token, tokenCookieOptions);
		res.cookie("isLoggedIn", "true", loggedInCookieOptions);

		// Creating Safe User
		const { password: extractedPassword, ...safeUser } = user;

		// Getting User with Profile Image Url
		const userWithImageUrl = await getUserWithImageUrl(safeUser);

		return res.status(200).json({
			message: "User logged in successfully",
			user: userWithImageUrl,
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ message: "Internal server error", error });
	}
};

export const logout = async (req: Request, res: Response) => {
	res.cookie("token", "", { ...tokenCookieOptions, maxAge: 1 });
	res.cookie("isLoggedIn", "false", loggedInCookieOptions);
	return res.status(200).json({ message: "Logged out in successfully" });
};

export const getProfile = async (req: Request, res: Response) => {
	const user = req.user;
	if (!user) return res.status(401).json({ error: "Not authenticated" });

	const userWithImageUrl = await getUserWithImageUrl(user);

	res.status(200).json(userWithImageUrl);
};

// Updating User and Uploading profile image if provided
export const updateUser = async (req: Request, res: Response) => {
	const user = req.user;
	const { username, email } = req.body;

	const file = req.file as Express.Multer.File;

	if (!user) return res.status(401).json({ error: "Not authenticated" });

	try {
		// Uploading image and getting it's key if image file is provided
		const imageKey = await (async () => {
			if (!file) return undefined;
			const ext = path.extname(file.originalname).toLowerCase();
			const key = `users/${crypto.randomUUID()}${ext}`;

			await r2.send(
				new PutObjectCommand({
					Bucket: requireEnv("BUCKET_NAME"),
					Key: key,
					Body: file.buffer,
					ContentType: file.mimetype,
				}),
			);
			return key;
		})();

		// Checking if email is already in use
		if (email) {
			const conflict = await prismaPg.user.findFirst({
				where: {
					email,
					NOT: { id: user.id },
				},
			});
			if (conflict) {
				return res.status(409).json({ error: `Email already in use` });
			}
		}

		// Creating object with data to update
		const updateData: Prisma.UserUpdateInput = { username, email };

		if (imageKey) {
			updateData.imageKey = imageKey;
		}

		// Updating data
		const updatedUser = await prismaPg.user.update({
			where: { id: user.id },
			data: { ...updateData },
			select: {
				id: true,
				username: true,
				email: true,
				imageKey: true,
				role: true,
			},
		});

		// IDK how this would trigger but just in case
		// If you did trigger it congrats to you
		if (!updatedUser)
			return res.status(404).json({ message: "User not found" });

		return res
			.status(200)
			.json({ message: "Updated User successfully", updatedUser });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ message: "Internal server error", error });
	}
};

// Updating user's password
export const updatePassword = async (req: Request, res: Response) => {
	const { currentPassword, newPassword } = req.body;
	const user = req.user;

	if (!user) return res.status(401).json({ error: "Not authenticated" });

	if (!currentPassword || !newPassword)
		return res.status(400).json({ message: "Password fields empty" });

	try {
		// Getting user's password
		const passwordResult = await prismaPg.user.findUnique({
			where: { id: user.id },
			select: {
				password: true,
			},
		});

		if (!passwordResult)
			return res.status(404).json({ message: "User not found" });

		// Checking if password matches the submitted password
		const isMatch = await bcrypt.compare(
			currentPassword,
			passwordResult.password,
		);

		if (!isMatch) return res.status(422).json({ message: "Invalid password" });

		// Hashing password (DON'T STORE PASSWORDS IN PLAIN TEXT)
		const hashedNewPassword = await bcrypt.hash(newPassword, 12);

		// Updating user's password
		await prismaPg.user.update({
			where: { id: user.id },
			data: { password: hashedNewPassword },
			select: {
				id: true,
			},
		});

		return res.status(200).json({ message: "User updated successfully" });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ message: "Internal server error", error });
	}
};

// Changing user's role with an isAdmin boolean
export const changUserRole = async (req: Request, res: Response) => {
	const { email, isAdmin } = req.body;
	if (!email || isAdmin === undefined)
		return res.status(400).json({ message: "Please provide required data" });

	try {
		// Get user role
		const role = isAdmin ? "ADMIN" : "USER";

		// Updating user
		await prismaPg.user.update({
			where: { email },
			data: { role },
		});

		return res.status(200).json({ message: `User updated to "${role}"` });
	} catch (error) {
		// If error is not found prisma error respond with user not found
		if (
			error instanceof PrismaClientKnownRequestError &&
			error.code === "P2025"
		) {
			return res.status(404).json({ message: "User not found" });
		}
		console.error(error);
		return res.status(500).json({ message: "Internal server error", error });
	}
};
