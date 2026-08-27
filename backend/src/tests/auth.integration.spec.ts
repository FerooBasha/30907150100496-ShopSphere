import {
	describe,
	it,
	expect,
	beforeEach,
	afterEach,
	afterAll,
	jest,
} from "@jest/globals";
import request from "supertest";
import express from "express";
import cookieParser from "cookie-parser";
import { prismaPg } from "../config/dbs.ts";
import bcrypt from "bcrypt";

// --- Stub external services (email, R2 uploads, signed URLs). ---
// prismaPg stays REAL — this is what makes it an integration test rather
// than a unit test with mocks. These three don't have network access in
// CI/sandboxed test runs, so they're stubbed the same way regardless.
const mockSendMail = jest.fn() as unknown as jest.MockedFunction<
	(...args: any[]) => Promise<any>
>;
const mockR2Send = jest.fn() as unknown as jest.MockedFunction<
	(...args: any[]) => Promise<any>
>;
const mockGetSignedUrl = jest.fn() as unknown as jest.MockedFunction<
	(...args: any[]) => Promise<any>
>;

jest.unstable_mockModule("../config/nodemailer.js", () => ({
	__esModule: true,
	transport: { sendMail: mockSendMail },
}));

jest.unstable_mockModule("../config/r2.js", () => ({
	__esModule: true,
	r2: { send: mockR2Send },
}));

jest.unstable_mockModule("@aws-sdk/s3-request-presigner", () => ({
	__esModule: true,
	getSignedUrl: mockGetSignedUrl,
}));

// Adjust this path/filename if your router file lives somewhere else.
const { default: authRouter } = await import("../routes/authRouter.ts");

// Isolated express instance wired up the same way the real app mounts auth.
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use("/api/auth", authRouter);

async function registerUser(
	agent: ReturnType<typeof request.agent>,
	overrides: Partial<{ username: string; email: string; password: string }> = {},
) {
	const payload = {
		username: "alex",
		email: "alex@example.com",
		password: "password123",
		...overrides,
	};
	const response = await agent.post("/api/auth/register").send(payload);
	return { response, payload };
}

describe("Auth Router - Integration Tests", () => {
	beforeEach(async () => {
		jest.clearAllMocks();
		await prismaPg.user.deleteMany();
	});

	afterEach(async () => {
		await prismaPg.user.deleteMany();
	});

	afterAll(async () => {
		await prismaPg.$disconnect();
	});

	describe("POST /api/auth/register", () => {
		it("returns 400 when a required field is missing", async () => {
			const response = await request(app)
				.post("/api/auth/register")
				.send({ username: "alex", email: "alex@example.com" }); // no password

			expect(response.status).toBe(400);
			const existing = await prismaPg.user.count();
			expect(existing).toBe(0);
		});

		it("creates the user, hashes the password, sets an httpOnly cookie, and returns 201", async () => {
			const agent = request.agent(app);
			const { response } = await registerUser(agent);

			expect(response.status).toBe(201);
			expect(response.body.user).toMatchObject({
				username: "alex",
				email: "alex@example.com",
				role: "USER",
				imageUrl: "",
			});
			expect(response.body.user.password).toBeUndefined();

			const setCookie = response.headers["set-cookie"];
			expect(setCookie).toBeDefined();
			expect(setCookie![0]).toMatch(/token=/);
			expect(setCookie![0]!.toLowerCase()).toMatch(/httponly/);

			const stored = await prismaPg.user.findUnique({
				where: { email: "alex@example.com" },
			});
			expect(stored).not.toBeNull();
			expect(stored?.password).not.toBe("password123"); // must be hashed
			expect(await bcrypt.compare("password123", stored!.password)).toBe(true);
		});

		it("returns 400 when the email is already registered", async () => {
			await registerUser(request.agent(app));

			const response = await request(app)
				.post("/api/auth/register")
				.send({ username: "someone-else", email: "alex@example.com", password: "other-pass" });

			expect(response.status).toBe(400);
		});
	});

	describe("POST /api/auth/login", () => {
		beforeEach(async () => {
			await registerUser(request.agent(app));
		});

		it("returns 401 for an unknown email", async () => {
			const response = await request(app)
				.post("/api/auth/login")
				.send({ email: "nobody@example.com", password: "password123" });

			expect(response.status).toBe(401);
		});

		it("returns 401 for a wrong password", async () => {
			const response = await request(app)
				.post("/api/auth/login")
				.send({ email: "alex@example.com", password: "wrong-password" });

			expect(response.status).toBe(401);
		});

		it("logs in and sets a cookie on correct credentials", async () => {
			const response = await request(app)
				.post("/api/auth/login")
				.send({ email: "alex@example.com", password: "password123" });

			expect(response.status).toBe(200);
			expect(response.body.user.email).toBe("alex@example.com");
			expect(response.headers["set-cookie"]).toBeDefined();
		});
	});

	describe("POST /api/auth/logout", () => {
		it("clears the auth cookie and returns 200", async () => {
			const agent = request.agent(app);
			await registerUser(agent);

			const response = await agent.post("/api/auth/logout");

			expect(response.status).toBe(200);
			const setCookie = response.headers["set-cookie"];
			expect(setCookie).toBeDefined();
			expect(setCookie![0]).toMatch(/Max-Age=1|token=;/i);

			// Cookie is gone, so a protected route should reject the next call.
			const meResponse = await agent.get("/api/auth/me");
			expect(meResponse.status).not.toBe(200);
		});
	});

	describe("GET /api/auth/me (protected)", () => {
		it("rejects requests with no auth cookie", async () => {
			const response = await request(app).get("/api/auth/me");
			expect(response.status).toBe(401);
			expect(response.body).toEqual({ message: "Not authorized, no token found" });
		});

		it("returns the current user's profile when authenticated", async () => {
			const agent = request.agent(app);
			await registerUser(agent);

			const response = await agent.get("/api/auth/me");

			expect(response.status).toBe(200);
			expect(response.body).toMatchObject({
				username: "alex",
				email: "alex@example.com",
				role: "USER",
				imageUrl: "",
			});
		});
	});

	describe("PUT /api/auth/me", () => {
		it("updates username and email while authenticated", async () => {
			const agent = request.agent(app);
			await registerUser(agent);

			const response = await agent
				.put("/api/auth/me")
				.send({ username: "new-alex", email: "alex@example.com" });

			expect(response.status).toBe(200);

			const stored = await prismaPg.user.findUnique({
				where: { email: "alex@example.com" },
			});
			expect(stored?.username).toBe("new-alex");
		});

		it("returns 409 when the new email belongs to another user", async () => {
			const agent = request.agent(app);
			await registerUser(agent);
			await registerUser(request.agent(app), {
				username: "other",
				email: "other@example.com",
			});

			const response = await agent
				.put("/api/auth/me")
				.send({ username: "alex", email: "other@example.com" });

			expect(response.status).toBe(409);
		});

		it("rejects unauthenticated requests", async () => {
			const response = await request(app)
				.put("/api/auth/me")
				.send({ username: "nope", email: "nope@example.com" });

			expect(response.status).toBe(401);
		});
	});

	describe("PUT /api/auth/me/password", () => {
		it("returns 422 when the current password is wrong", async () => {
			const agent = request.agent(app);
			await registerUser(agent);

			const response = await agent
				.put("/api/auth/me/password")
				.send({ currentPassword: "wrong-password", newPassword: "brand-new-pass" });

			expect(response.status).toBe(422);
		});

		it("updates the password, and the new password logs in while the old one no longer works", async () => {
			const agent = request.agent(app);
			await registerUser(agent);

			const changeResponse = await agent
				.put("/api/auth/me/password")
				.send({ currentPassword: "password123", newPassword: "brand-new-pass" });
			expect(changeResponse.status).toBe(200);

			const oldPasswordLogin = await request(app)
				.post("/api/auth/login")
				.send({ email: "alex@example.com", password: "password123" });
			expect(oldPasswordLogin.status).toBe(401);

			const newPasswordLogin = await request(app)
				.post("/api/auth/login")
				.send({ email: "alex@example.com", password: "brand-new-pass" });
			expect(newPasswordLogin.status).toBe(200);
		});
	});

	describe("PUT /api/auth/admin/changeUserRole", () => {
		it("is rejected for a logged-in user who is not an admin", async () => {
			const memberAgent = request.agent(app);
			await registerUser(memberAgent, {
				username: "member",
				email: "member@example.com",
			});

			const response = await memberAgent
				.put("/api/auth/admin/changeUserRole")
				.send({ email: "member@example.com", isAdmin: true });

			expect(response.status).toBe(403);
			expect(response.body).toEqual({ message: "Not authorized as admin" });
		});

		it("lets an admin promote another user to ADMIN", async () => {
			// Set up the target user via the public API...
			await registerUser(request.agent(app), {
				username: "member",
				email: "member@example.com",
			});

			// ...and an admin actor, elevated directly in the DB (bypassing the
			// very endpoint under test, since that's the setup step here).
			const adminAgent = request.agent(app);
			await registerUser(adminAgent, {
				username: "boss",
				email: "boss@example.com",
			});
			await prismaPg.user.update({
				where: { email: "boss@example.com" },
				data: { role: "ADMIN" },
			});
			// No re-login needed: `protect` re-fetches the user from the DB by id
			// on every request, so the role change is picked up on the same cookie.

			const response = await adminAgent
				.put("/api/auth/admin/changeUserRole")
				.send({ email: "member@example.com", isAdmin: true });

			expect(response.status).toBe(200);

			const promoted = await prismaPg.user.findUnique({
				where: { email: "member@example.com" },
			});
			expect(promoted?.role).toBe("ADMIN");
		});

		it("returns 404 when the target email doesn't exist", async () => {
			const adminAgent = request.agent(app);
			await registerUser(adminAgent, { username: "boss", email: "boss@example.com" });
			await prismaPg.user.update({
				where: { email: "boss@example.com" },
				data: { role: "ADMIN" },
			});

			const response = await adminAgent
				.put("/api/auth/admin/changeUserRole")
				.send({ email: "ghost@example.com", isAdmin: true });

			expect(response.status).toBe(404);
		});
	});
});