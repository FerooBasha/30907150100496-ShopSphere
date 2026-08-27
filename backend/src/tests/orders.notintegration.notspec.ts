// Disabled and replaced with checkout tests
import {
	jest,
	describe,
	it,
	expect,
	beforeEach,
	afterEach,
	afterAll,
} from "@jest/globals";
import request from "supertest";
import express from "express";
import { prismaPg } from "../config/dbs.ts";

// The real `protect` middleware authenticates via a signed JWT cookie, which
// is out of scope for this integration test (that's covered by the auth
// middleware's own tests). Here we stub it to attach a real, DB-backed user
// so the order controller's actual DB logic runs end-to-end.
let currentUserId: string | null = null;

jest.unstable_mockModule("../middleware/auth.js", () => ({
	__esModule: true,
	protect: (req: any, res: any, next: any) => {
		if (!currentUserId) {
			return res.status(401).json({ message: "Invalid User ID please login" });
		}
		req.user = { id: currentUserId };
		next();
	},
	admin: (req: any, res: any, next: any) => next(),
}));

const { default: ordersRouter } = await import("../routes/orderRoutes.ts");

const app = express();
app.use(express.json());
app.use("/api/orders", ordersRouter);

async function cleanup() {
	await prismaPg.orderItem.deleteMany();
	await prismaPg.order.deleteMany();
	await prismaPg.product.deleteMany();
	await prismaPg.category.deleteMany();
	await prismaPg.user.deleteMany();
}

describe("Orders API - Integration Tests", () => {
	let userId: string;
	let productAId: string;
	let productBId: string;

	beforeEach(async () => {
		await cleanup();

		const user = await prismaPg.user.create({
			data: {
				username: "fareskingtube",
				email: `fareskingtube-${Date.now()}@example.com`,
				password: "hashed-password",
				imageKey: "users/default.png",
			},
		});
		userId = user.id;
		currentUserId = user.id;

		const category = await prismaPg.category.create({
			data: { name: "Fruits", slug: `fruits-${Date.now()}` },
		});

		const productA = await prismaPg.product.create({
			data: {
				name: `Bricked Lemon ${Date.now()}-A`,
				price: 10,
				description: "A bricked lemon.",
				categoryId: category.id,
				imageKeys: [],
			},
		});
		productAId = productA.id;

		const productB = await prismaPg.product.create({
			data: {
				name: `Bricked Lemon ${Date.now()}-B`,
				price: 25,
				description: "Another bricked lemon.",
				categoryId: category.id,
				imageKeys: [],
			},
		});
		productBId = productB.id;
	});

	afterEach(async () => {
		currentUserId = null;
		await cleanup();
	});

	afterAll(async () => {
		await prismaPg.$disconnect();
	});

	describe("POST /api/orders", () => {
		it("should return 401 when not authenticated", async () => {
			currentUserId = null;

			const response = await request(app)
				.post("/api/orders")
				.send({ items: [{ product: { id: productAId }, quantity: 1 }] });

			expect(response.status).toBe(401);
		});

		it("should return 400 when items are missing", async () => {
			const response = await request(app).post("/api/orders").send({});

			expect(response.status).toBe(400);
		});

		it("should return 400 when a product does not exist", async () => {
			const response = await request(app)
				.post("/api/orders")
				.send({
					items: [
						{
							product: { id: "00000000-0000-0000-0000-000000000000" },
							quantity: 1,
						},
					],
				});

			expect(response.status).toBe(400);
			expect(response.body.message).toBe("One or more products not found");
		});

		it("should create an order with correctly computed totals", async () => {
			const response = await request(app)
				.post("/api/orders")
				.send({
					items: [
						{ product: { id: productAId }, quantity: 2 }, // 10 * 2 = 20
						{ product: { id: productBId }, quantity: 1 }, // 25 * 1 = 25
					],
				});

			expect(response.status).toBe(201);
			expect(response.body.message).toBe("Order created successfully");
			expect(Number(response.body.order.totalAmount)).toBe(45);
			expect(response.body.order.status).toBe("PENDING");
			expect(response.body.order.userId).toBe(userId);
			expect(response.body.order.items).toHaveLength(2);

			const persisted = await prismaPg.order.findUnique({
				where: { id: response.body.order.id },
				include: { items: true },
			});
			expect(persisted?.items).toHaveLength(2);
			expect(Number(persisted?.totalAmount)).toBe(45);
		});
	});

	describe("GET /api/orders", () => {
		it("should return 401 when not authenticated", async () => {
			currentUserId = null;

			const response = await request(app).get("/api/orders");

			expect(response.status).toBe(401);
		});

		it("should return an empty list when the user has no orders", async () => {
			const response = await request(app).get("/api/orders");

			expect(response.status).toBe(200);
			expect(response.body.orders).toEqual([]);
		});

		it("should return only the authenticated user's orders, newest first", async () => {
			// Order 1 for our test user (created first)
			const order1 = await prismaPg.order.create({
				data: {
					userId,
					totalAmount: 10,
					status: "PENDING",
					items: {
						create: [{ productId: productAId, quantity: 1, price: 10 }],
					},
				},
			});

			// Small delay so createdAt ordering is unambiguous across the two orders
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Order 2 for our test user (created second, should come first when sorted desc)
			const order2 = await prismaPg.order.create({
				data: {
					userId,
					totalAmount: 45,
					status: "PENDING",
					items: {
						create: [
							{ productId: productAId, quantity: 2, price: 10 },
							{ productId: productBId, quantity: 1, price: 25 },
						],
					},
				},
			});

			// An order belonging to a different user, which should never show up
			const otherUser = await prismaPg.user.create({
				data: {
					username: "otheruser",
					email: `otheruser-${Date.now()}@example.com`,
					password: "hashed-password",
					imageKey: "users/default.png",
				},
			});
			await prismaPg.order.create({
				data: {
					userId: otherUser.id,
					totalAmount: 10,
					status: "PENDING",
					items: {
						create: [{ productId: productAId, quantity: 1, price: 10 }],
					},
				},
			});

			const response = await request(app).get("/api/orders");

			expect(response.status).toBe(200);
			expect(response.body.orders).toHaveLength(2);
			expect(response.body.orders[0].id).toBe(order2.id);
			expect(response.body.orders[1].id).toBe(order1.id);
			expect(
				response.body.orders.every((order: any) => order.userId === userId),
			).toBe(true);
			expect(response.body.orders[0].items[0].product).toBeDefined();
		});
	});
});