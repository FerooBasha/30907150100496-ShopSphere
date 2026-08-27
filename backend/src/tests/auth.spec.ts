import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import type { Request, Response } from "express";

process.env.JWT_SECRET = Buffer.from(
	"test-secret-key-for-jwt-signing",
).toString("base64");

const mockFindUnique = jest.fn() as unknown as jest.MockedFunction<
	(...args: any[]) => Promise<any>
>;
const mockFindFirst = jest.fn() as unknown as jest.MockedFunction<
	(...args: any[]) => Promise<any>
>;
const mockCreate = jest.fn() as unknown as jest.MockedFunction<
	(...args: any[]) => Promise<any>
>;
const mockUpdate = jest.fn() as unknown as jest.MockedFunction<
	(...args: any[]) => Promise<any>
>;
const mockBcryptHash = jest.fn() as unknown as jest.MockedFunction<
	(...args: any[]) => Promise<any>
>;
const mockBcryptCompare = jest.fn() as unknown as jest.MockedFunction<
	(...args: any[]) => Promise<any>
>;
const mockJwtSign = jest.fn() as unknown as jest.MockedFunction<
	(...args: any[]) => any
>;
const mockSendMail = jest.fn() as unknown as jest.MockedFunction<
	(...args: any[]) => Promise<any>
>;
const mockR2Send = jest.fn() as unknown as jest.MockedFunction<
	(...args: any[]) => Promise<any>
>;
const mockGetSignedUrl = jest.fn() as unknown as jest.MockedFunction<
	(...args: any[]) => Promise<any>
>;

// Mirrors the shape of Prisma's generated PrismaClientKnownRequestError closely
// enough for `error instanceof PrismaClientKnownRequestError` checks to work.
class MockPrismaClientKnownRequestError extends Error {
	code: string;
	constructor(message: string, code: string) {
		super(message);
		this.code = code;
		this.name = "PrismaClientKnownRequestError";
	}
}

jest.unstable_mockModule("../config/dbs.js", () => ({
	__esModule: true,
	prismaPg: {
		user: {
			findUnique: mockFindUnique,
			findFirst: mockFindFirst,
			create: mockCreate,
			update: mockUpdate,
		},
	},
}));

jest.unstable_mockModule("../config/r2.js", () => ({
	__esModule: true,
	r2: { send: mockR2Send },
}));

jest.unstable_mockModule("../config/env.js", () => ({
	__esModule: true,
	requireEnv: jest.fn((key: string) => `mock-${key}`),
}));

jest.unstable_mockModule("bcrypt", () => ({
	__esModule: true,
	default: {
		hash: mockBcryptHash,
		compare: mockBcryptCompare,
	},
}));

jest.unstable_mockModule("jsonwebtoken", () => ({
	__esModule: true,
	default: {
		sign: mockJwtSign,
	},
}));

jest.unstable_mockModule("../config/nodemailer.js", () => ({
	__esModule: true,
	transport: {
		sendMail: mockSendMail,
	},
}));

jest.unstable_mockModule("@aws-sdk/s3-request-presigner", () => ({
	__esModule: true,
	getSignedUrl: mockGetSignedUrl,
}));

jest.unstable_mockModule(
	"../generated/prisma-postgres/runtime/library.js",
	() => ({
		__esModule: true,
		PrismaClientKnownRequestError: MockPrismaClientKnownRequestError,
	}),
);

const {
	register,
	login,
	logout,
	getProfile,
	updateUser,
	updatePassword,
	changUserRole,
} = await import("../controllers/authControllers.ts");

function buildRes() {
	const jsonMock = jest.fn().mockImplementation(() => ({}) as Response);
	const statusMock = jest
		.fn()
		.mockImplementation(() => ({ json: jsonMock }) as any);
	const cookieMock = jest.fn();
	const res = {
		status: statusMock as any,
		json: jsonMock as any,
		cookie: cookieMock as any,
	} as Partial<Response>;
	return { res, jsonMock, statusMock, cookieMock };
}

describe("Auth Controller - register", () => {
	let req: Partial<Request>;
	let res: Partial<Response>;
	let jsonMock: jest.MockedFunction<any>;
	let statusMock: jest.MockedFunction<any>;
	let cookieMock: jest.MockedFunction<any>;

	beforeEach(() => {
		jest.clearAllMocks();
		req = { body: {} };
		({ res, jsonMock, statusMock, cookieMock } = buildRes());
	});

	it("should return 400 if a required field is missing", async () => {
		req.body = { username: "alex", email: "alex@example.com" }; // no password

		await register(req as Request, res as Response);

		expect(mockCreate).not.toHaveBeenCalled();
		expect(statusMock).toHaveBeenCalledWith(400);
		expect(jsonMock).toHaveBeenCalledWith({
			message: "Please provide all required fields",
		});
	});

	it("should return 400 if the email is already in use", async () => {
		req.body = {
			username: "alex",
			email: "alex@example.com",
			password: "password123",
		};
		mockFindUnique.mockResolvedValue({
			id: "existing-id",
			email: "alex@example.com",
		});

		await register(req as Request, res as Response);

		expect(mockCreate).not.toHaveBeenCalled();
		expect(statusMock).toHaveBeenCalledWith(400);
		expect(jsonMock).toHaveBeenCalledWith({ message: "Email already in use" });
	});

	it("should hash the password, create the user, set a cookie, and return 201", async () => {
		req.body = {
			username: "alex",
			email: "alex@example.com",
			password: "password123",
		};
		mockFindUnique.mockResolvedValue(null);
		mockBcryptHash.mockResolvedValue("hashed-password");
		mockCreate.mockResolvedValue({
			id: "new-id",
			username: "alex",
			email: "alex@example.com",
			password: "hashed-password",
			role: "USER",
		});
		mockJwtSign.mockReturnValue("signed-jwt-token");

		await register(req as Request, res as Response);

		expect(mockBcryptHash).toHaveBeenCalledWith("password123", 12);
		expect(mockCreate).toHaveBeenCalledWith({
			data: {
				username: "alex",
				email: "alex@example.com",
				imageKey: "",
				password: "hashed-password",
			},
		});
		expect(mockJwtSign).toHaveBeenCalledWith(
			{ id: "new-id", role: "USER" },
			expect.anything(),
			{ algorithm: "HS512", expiresIn: "30d" },
		);
		expect(cookieMock).toHaveBeenCalledWith(
			"token",
			"signed-jwt-token",
			expect.objectContaining({ httpOnly: true, sameSite: "strict" }),
		);
		expect(mockSendMail).toHaveBeenCalledWith(
			expect.objectContaining({ to: "alex@example.com" }),
		);
		expect(statusMock).toHaveBeenCalledWith(201);
		expect(jsonMock).toHaveBeenCalledWith({
			message: "User created successfully",
			user: {
				id: "new-id",
				username: "alex",
				email: "alex@example.com",
				role: "USER",
				imageUrl: "",
			},
		});
	});

	it("should NOT return a password field in the response body", async () => {
		req.body = {
			username: "alex",
			email: "alex@example.com",
			password: "password123",
		};
		mockFindUnique.mockResolvedValue(null);
		mockBcryptHash.mockResolvedValue("hashed-password");
		mockCreate.mockResolvedValue({
			id: "new-id",
			username: "alex",
			email: "alex@example.com",
			password: "hashed-password",
			role: "USER",
		});
		mockJwtSign.mockReturnValue("signed-jwt-token");

		await register(req as Request, res as Response);

		const responseBody = jsonMock.mock.calls[0][0];
		expect(responseBody.user.password).toBeUndefined();
	});

	it("should return 500 if prisma throws an error", async () => {
		req.body = {
			username: "alex",
			email: "alex@example.com",
			password: "password123",
		};
		mockFindUnique.mockRejectedValue(new Error("Database connection dropped"));
		jest.spyOn(console, "error").mockImplementation(() => {});

		await register(req as Request, res as Response);

		expect(statusMock).toHaveBeenCalledWith(500);
		expect(jsonMock).toHaveBeenCalledWith(
			expect.objectContaining({ message: "Internal server error" }),
		);
	});

	it("should set the cookie with a 30-day maxAge", async () => {
		req.body = {
			username: "alex",
			email: "alex@example.com",
			password: "password123",
		};
		mockFindUnique.mockResolvedValue(null);
		mockBcryptHash.mockResolvedValue("hashed-password");
		mockCreate.mockResolvedValue({
			id: "id1",
			username: "alex",
			email: "alex@example.com",
			role: "USER",
		});
		mockJwtSign.mockReturnValue("signed-jwt-token");

		await register(req as Request, res as Response);

		const [, , options] = cookieMock.mock.calls[0];
		expect(options.maxAge).toBe(30 * 86400000); // 30 days in ms
	});
});

describe("Auth Controller - login", () => {
	let req: Partial<Request>;
	let res: Partial<Response>;
	let jsonMock: jest.MockedFunction<any>;
	let statusMock: jest.MockedFunction<any>;
	let cookieMock: jest.MockedFunction<any>;

	beforeEach(() => {
		jest.clearAllMocks();
		req = { body: {} };
		({ res, jsonMock, statusMock, cookieMock } = buildRes());
	});

	it("should return 400 if email or password is missing", async () => {
		req.body = { email: "alex@example.com" }; // no password

		await login(req as Request, res as Response);

		expect(mockFindUnique).not.toHaveBeenCalled();
		expect(statusMock).toHaveBeenCalledWith(400);
		expect(jsonMock).toHaveBeenCalledWith({
			message: "Please provide all required fields",
		});
	});

	it("should return 401 if no user is found for the given email", async () => {
		req.body = { email: "nouser@example.com", password: "password123" };
		mockFindUnique.mockResolvedValue(null);

		await login(req as Request, res as Response);

		expect(mockBcryptCompare).not.toHaveBeenCalled();
		expect(statusMock).toHaveBeenCalledWith(401);
		expect(jsonMock).toHaveBeenCalledWith({
			message: "Invalid email or password",
		});
	});

	it("should return 401 if the password doesn't match", async () => {
		req.body = { email: "alex@example.com", password: "wrongPassword" };
		mockFindUnique.mockResolvedValue({
			id: "id1",
			username: "alex",
			email: "alex@example.com",
			password: "hashed-password",
			role: "USER",
		});
		mockBcryptCompare.mockResolvedValue(false);

		await login(req as Request, res as Response);

		expect(statusMock).toHaveBeenCalledWith(401);
		expect(jsonMock).toHaveBeenCalledWith({
			message: "Invalid email or password",
		});
	});

	it("should set a cookie and return 200 on successful login", async () => {
		req.body = { email: "alex@example.com", password: "password123" };
		mockFindUnique.mockResolvedValue({
			id: "id1",
			username: "alex",
			email: "alex@example.com",
			password: "hashed-password",
			role: "USER",
		});
		mockBcryptCompare.mockResolvedValue(true);
		mockJwtSign.mockReturnValue("signed-jwt-token");

		await login(req as Request, res as Response);

		expect(mockBcryptCompare).toHaveBeenCalledWith(
			"password123",
			"hashed-password",
		);
		expect(cookieMock).toHaveBeenCalledWith(
			"token",
			"signed-jwt-token",
			expect.objectContaining({ httpOnly: true, sameSite: "strict" }),
		);
		expect(statusMock).toHaveBeenCalledWith(200);
		expect(jsonMock).toHaveBeenCalledWith({
			message: "User logged in successfully",
			user: {
				id: "id1",
				username: "alex",
				role: "USER",
				email: "alex@example.com",
				imageUrl: "",
			},
		});
	});

	it("should return 500 if prisma throws an error", async () => {
		req.body = { email: "alex@example.com", password: "password123" };
		mockFindUnique.mockRejectedValue(new Error("Database connection dropped"));
		jest.spyOn(console, "error").mockImplementation(() => {});

		await login(req as Request, res as Response);

		expect(statusMock).toHaveBeenCalledWith(500);
		expect(jsonMock).toHaveBeenCalledWith(
			expect.objectContaining({ message: "Internal server error" }),
		);
	});
});

describe("Auth Controller - logout", () => {
	it("should clear the token cookie and return 200", async () => {
		const cookieMock = jest.fn();
		const jsonMock = jest.fn().mockImplementation(() => ({}) as Response);
		const statusMock = jest
			.fn()
			.mockImplementation(() => ({ json: jsonMock }) as any);

		const req = {} as Request;
		const res = {
			status: statusMock,
			cookie: cookieMock,
		} as unknown as Response;

		await logout(req, res);

		expect(cookieMock).toHaveBeenCalledWith(
			"token",
			"",
			expect.objectContaining({ maxAge: 1 }),
		);
		expect(statusMock).toHaveBeenCalledWith(200);
		expect(jsonMock).toHaveBeenCalledWith({
			message: "Logged out in successfully",
		});
	});
});

describe("Auth Controller - getProfile", () => {
	it("should return 401 if req.user is not set", async () => {
		const jsonMock = jest.fn();
		const statusMock = jest
			.fn()
			.mockImplementation(() => ({ json: jsonMock }) as any);
		const req = {} as unknown as Request;
		const res = { json: jsonMock, status: statusMock } as unknown as Response;

		await getProfile(req, res);

		expect(statusMock).toHaveBeenCalledWith(401);
		expect(jsonMock).toHaveBeenCalledWith({ error: "Not authenticated" });
	});

	it("should return req.user (with imageUrl) as the response body", async () => {
		const jsonMock = jest.fn();
		const statusMock = jest
			.fn()
			.mockImplementation(() => ({ json: jsonMock }) as any);
		const req = {
			user: {
				id: "id1",
				username: "alex",
				email: "alex@example.com",
				role: "USER",
				imageKey: null,
			},
		} as unknown as Request;
		const res = { json: jsonMock, status: statusMock } as unknown as Response;

		await getProfile(req, res);

		expect(statusMock).toHaveBeenCalledWith(200);
		expect(jsonMock).toHaveBeenCalledWith({
			id: "id1",
			username: "alex",
			email: "alex@example.com",
			role: "USER",
			imageKey: null,
			imageUrl: "",
		});
	});

	it("should include a signed imageUrl when the user has an imageKey", async () => {
		const jsonMock = jest.fn();
		const statusMock = jest
			.fn()
			.mockImplementation(() => ({ json: jsonMock }) as any);
		const req = {
			user: {
				id: "id1",
				username: "alex",
				email: "alex@example.com",
				role: "USER",
				imageKey: "users/some-key.png",
			},
		} as unknown as Request;
		const res = { json: jsonMock, status: statusMock } as unknown as Response;
		mockGetSignedUrl.mockResolvedValue("https://signed.example.com/some-key.png");

		await getProfile(req, res);

		expect(mockGetSignedUrl).toHaveBeenCalled();
		expect(statusMock).toHaveBeenCalledWith(200);
		const body = jsonMock.mock.calls[0]![0] as { imageUrl: string };
		expect(body.imageUrl).toBe("https://signed.example.com/some-key.png");
	});
});

describe("Auth Controller - updateUser", () => {
	let req: Partial<Request>;
	let res: Partial<Response>;
	let jsonMock: jest.MockedFunction<any>;
	let statusMock: jest.MockedFunction<any>;

	beforeEach(() => {
		jest.clearAllMocks();
		req = {
			body: {},
			user: {
				id: "id1",
				username: "alex",
				email: "alex@example.com",
				role: "USER",
				imageKey: null,
			} as any,
		};
		({ res, jsonMock, statusMock } = buildRes());
	});

	it("should return 401 if req.user is not set", async () => {
		const unauthenticatedReq = {
			body: { username: "new-alex", email: "alex@example.com" },
		} as Request;

		await updateUser(unauthenticatedReq, res as Response);

		expect(statusMock).toHaveBeenCalledWith(401);
		expect(jsonMock).toHaveBeenCalledWith({ error: "Not authenticated" });
	});

	it("should return 409 if the new email is already in use by another user", async () => {
		req.body = { username: "alex", email: "taken@example.com" };
		mockFindFirst.mockResolvedValue({ id: "someone-else", email: "taken@example.com" });

		await updateUser(req as Request, res as Response);

		expect(mockUpdate).not.toHaveBeenCalled();
		expect(statusMock).toHaveBeenCalledWith(409);
		expect(jsonMock).toHaveBeenCalledWith({ error: "Email already in use" });
	});

	it("should update username/email and return 200", async () => {
		req.body = { username: "new-alex", email: "alex@example.com" };
		mockFindFirst.mockResolvedValue(null);
		mockUpdate.mockResolvedValue({
			id: "id1",
			username: "new-alex",
			email: "alex@example.com",
			imageKey: null,
			role: "USER",
		});

		await updateUser(req as Request, res as Response);

		expect(mockUpdate).toHaveBeenCalledWith({
			where: { id: "id1" },
			data: { username: "new-alex", email: "alex@example.com" },
			select: {
				id: true,
				username: true,
				email: true,
				imageKey: true,
				role: true,
			},
		});
		expect(statusMock).toHaveBeenCalledWith(200);
		expect(jsonMock).toHaveBeenCalledWith(
			expect.objectContaining({ message: "Updated User successfully" }),
		);
	});

	it("should upload a new profile image and include imageKey in the update", async () => {
		req.body = { username: "alex", email: "alex@example.com" };
		req.file = {
			originalname: "avatar.png",
			mimetype: "image/png",
			buffer: Buffer.from("fake-image-bytes"),
		} as any;
		mockR2Send.mockResolvedValue({});
		mockUpdate.mockResolvedValue({
			id: "id1",
			username: "alex",
			email: "alex@example.com",
			imageKey: "users/generated-key.png",
			role: "USER",
		});

		await updateUser(req as Request, res as Response);

		expect(mockR2Send).toHaveBeenCalled();
		const updateArgs = mockUpdate.mock.calls[0]![0] as any;
		expect(updateArgs.data.imageKey).toEqual(expect.stringContaining(".png"));
		expect(statusMock).toHaveBeenCalledWith(200);
	});

	it("should return 500 if prisma throws an error", async () => {
		req.body = { username: "alex", email: "alex@example.com" };
		mockFindFirst.mockResolvedValue(null);
		mockUpdate.mockRejectedValue(new Error("Database connection dropped"));
		jest.spyOn(console, "error").mockImplementation(() => {});

		await updateUser(req as Request, res as Response);

		expect(statusMock).toHaveBeenCalledWith(500);
		expect(jsonMock).toHaveBeenCalledWith(
			expect.objectContaining({ message: "Internal server error" }),
		);
	});
});

describe("Auth Controller - updatePassword", () => {
	let req: Partial<Request>;
	let res: Partial<Response>;
	let jsonMock: jest.MockedFunction<any>;
	let statusMock: jest.MockedFunction<any>;

	beforeEach(() => {
		jest.clearAllMocks();
		req = {
			body: {},
			user: { id: "id1", username: "alex", email: "alex@example.com", role: "USER" } as any,
		};
		({ res, jsonMock, statusMock } = buildRes());
	});

	it("should return 401 if req.user is not set", async () => {
		const unauthenticatedReq = {
			body: { currentPassword: "old", newPassword: "new" },
		} as Request;

		await updatePassword(unauthenticatedReq, res as Response);

		expect(statusMock).toHaveBeenCalledWith(401);
		expect(jsonMock).toHaveBeenCalledWith({ error: "Not authenticated" });
	});

	it("should return 400 if password fields are missing", async () => {
		req.body = { currentPassword: "old" }; // no newPassword

		await updatePassword(req as Request, res as Response);

		expect(mockFindUnique).not.toHaveBeenCalled();
		expect(statusMock).toHaveBeenCalledWith(400);
		expect(jsonMock).toHaveBeenCalledWith({ message: "Password fields empty" });
	});

	it("should return 404 if the user is not found", async () => {
		req.body = { currentPassword: "old", newPassword: "new" };
		mockFindUnique.mockResolvedValue(null);

		await updatePassword(req as Request, res as Response);

		expect(statusMock).toHaveBeenCalledWith(404);
		expect(jsonMock).toHaveBeenCalledWith({ message: "User not found" });
	});

	it("should return 422 if the current password doesn't match", async () => {
		req.body = { currentPassword: "wrong-old", newPassword: "new" };
		mockFindUnique.mockResolvedValue({ password: "hashed-old-password" });
		mockBcryptCompare.mockResolvedValue(false);

		await updatePassword(req as Request, res as Response);

		expect(statusMock).toHaveBeenCalledWith(422);
		expect(jsonMock).toHaveBeenCalledWith({ message: "Invalid password" });
	});

	it("should hash and persist the new password, then return 200", async () => {
		req.body = { currentPassword: "old", newPassword: "new-password123" };
		mockFindUnique.mockResolvedValue({ password: "hashed-old-password" });
		mockBcryptCompare.mockResolvedValue(true);
		mockBcryptHash.mockResolvedValue("hashed-new-password");
		mockUpdate.mockResolvedValue({ id: "id1" });

		await updatePassword(req as Request, res as Response);

		expect(mockBcryptHash).toHaveBeenCalledWith("new-password123", 12);
		expect(mockUpdate).toHaveBeenCalledWith({
			where: { id: "id1" },
			data: { password: "hashed-new-password" },
			select: { id: true },
		});
		expect(statusMock).toHaveBeenCalledWith(200);
		expect(jsonMock).toHaveBeenCalledWith({ message: "User updated successfully" });
	});

	it("should return 500 if prisma throws an error", async () => {
		req.body = { currentPassword: "old", newPassword: "new" };
		mockFindUnique.mockRejectedValue(new Error("Database connection dropped"));
		jest.spyOn(console, "error").mockImplementation(() => {});

		await updatePassword(req as Request, res as Response);

		expect(statusMock).toHaveBeenCalledWith(500);
		expect(jsonMock).toHaveBeenCalledWith(
			expect.objectContaining({ message: "Internal server error" }),
		);
	});
});

describe("Auth Controller - changUserRole", () => {
	let req: Partial<Request>;
	let res: Partial<Response>;
	let jsonMock: jest.MockedFunction<any>;
	let statusMock: jest.MockedFunction<any>;

	beforeEach(() => {
		jest.clearAllMocks();
		req = { body: {} };
		({ res, jsonMock, statusMock } = buildRes());
	});

	it("should return 400 if email or isAdmin is missing", async () => {
		req.body = { email: "alex@example.com" }; // no isAdmin

		await changUserRole(req as Request, res as Response);

		expect(mockUpdate).not.toHaveBeenCalled();
		expect(statusMock).toHaveBeenCalledWith(400);
		expect(jsonMock).toHaveBeenCalledWith({ message: "Please provide required data" });
	});

	it("should promote a user to ADMIN", async () => {
		req.body = { email: "alex@example.com", isAdmin: true };
		mockUpdate.mockResolvedValue({ id: "id1", role: "ADMIN" });

		await changUserRole(req as Request, res as Response);

		expect(mockUpdate).toHaveBeenCalledWith({
			where: { email: "alex@example.com" },
			data: { role: "ADMIN" },
		});
		expect(statusMock).toHaveBeenCalledWith(200);
		expect(jsonMock).toHaveBeenCalledWith({ message: 'User updated to "ADMIN"' });
	});

	it("should demote a user to USER when isAdmin is false", async () => {
		req.body = { email: "alex@example.com", isAdmin: false };
		mockUpdate.mockResolvedValue({ id: "id1", role: "USER" });

		await changUserRole(req as Request, res as Response);

		expect(mockUpdate).toHaveBeenCalledWith({
			where: { email: "alex@example.com" },
			data: { role: "USER" },
		});
		expect(jsonMock).toHaveBeenCalledWith({ message: 'User updated to "USER"' });
	});

	it("should return 404 if prisma reports the user was not found (P2025)", async () => {
		req.body = { email: "ghost@example.com", isAdmin: true };
		mockUpdate.mockRejectedValue(
			new MockPrismaClientKnownRequestError("Record not found", "P2025"),
		);
		jest.spyOn(console, "error").mockImplementation(() => {});

		await changUserRole(req as Request, res as Response);

		expect(statusMock).toHaveBeenCalledWith(404);
		expect(jsonMock).toHaveBeenCalledWith({ message: "User not found" });
	});

	it("should return 500 for unexpected errors", async () => {
		req.body = { email: "alex@example.com", isAdmin: true };
		mockUpdate.mockRejectedValue(new Error("Database connection dropped"));
		jest.spyOn(console, "error").mockImplementation(() => {});

		await changUserRole(req as Request, res as Response);

		expect(statusMock).toHaveBeenCalledWith(500);
		expect(jsonMock).toHaveBeenCalledWith(
			expect.objectContaining({ message: "Internal server error" }),
		);
	});
});