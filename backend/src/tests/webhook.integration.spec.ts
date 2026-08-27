import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import request from "supertest";
import express from "express";
import type Stripe from "stripe";

const mockCartFindFirst = jest.fn() as unknown as jest.MockedFunction<(...args: any[]) => Promise<any>>;
const mockOrderCreate = jest.fn() as unknown as jest.MockedFunction<(...args: any[]) => Promise<any>>;
const mockCartItemDeleteMany = jest.fn() as unknown as jest.MockedFunction<(...args: any[]) => Promise<any>>;
const mockCartUpdate = jest.fn() as unknown as jest.MockedFunction<(...args: any[]) => Promise<any>>;
const mockPrismaTransaction = jest.fn() as unknown as jest.MockedFunction<(...args: any[]) => Promise<any>>;
const mockConstructEvent = jest.fn() as unknown as jest.MockedFunction<(...args: any[]) => Stripe.Event>;
const mockRequireEnv = jest.fn() as unknown as jest.MockedFunction<(...args: any[]) => string>;

jest.unstable_mockModule("../config/dbs.js", () => ({
	__esModule: true,
	prismaPg: {
		cart: {
			findFirst: mockCartFindFirst,
			update: mockCartUpdate,
		},
		order: { create: mockOrderCreate },
		cartItem: { deleteMany: mockCartItemDeleteMany },
		$transaction: mockPrismaTransaction,
	},
}));

jest.unstable_mockModule("../config/stripe.js", () => ({
	__esModule: true,
	stripe: { webhooks: { constructEvent: mockConstructEvent } },
}));

jest.unstable_mockModule("../config/env.js", () => ({
	__esModule: true,
	requireEnv: mockRequireEnv,
}));

const { handleStripeWebhook } = await import(
	"../controllers/webhookControllers.ts"
);

const app = express();
app.post(
	"/webhook",
	express.raw({ type: "application/json" }),
	handleStripeWebhook
);

describe("Webhook Integration - handleStripeWebhook", () => {
	const mockUserId = "user-1";
	const mockCartId = "cart-1";

	const mockSession = {
		id: "cs_test_123",
		metadata: { userId: mockUserId, cartId: mockCartId },
	};

	const mockDecimal = (val: number) => ({
		mul: (qty: number) => ({ toNumber: () => val * qty }),
		toNumber: () => val,
	});

	const mockCart = {
		id: mockCartId,
		items: [
			{ id: "item-1", productId: "prod-1", quantity: 2, price: mockDecimal(10) },
		],
	};

	const mockOrder = {
		id: "order-1",
		userId: mockUserId,
		status: "PENDING",
		totalAmount: 20,
	};

	beforeEach(() => {
		jest.clearAllMocks();
		mockRequireEnv.mockImplementation((key: string) => {
			if (key === "NODE_ENV") return "development";
			return "whsec_dev_secret";
		});
	});

	it("should return 400 when stripe signature verification fails via supertest", async () => {
		mockConstructEvent.mockImplementation(() => {
			throw new Error("No signature found with that ID");
		});

		const response = await request(app)
			.post("/webhook")
			.set("Content-Type", "application/json")
			.send(JSON.stringify({ type: "checkout.session.completed" }));

		expect(response.status).toBe(400);
		expect(response.text).toBe("Webhook Error: No signature found with that ID");
		expect(mockCartFindFirst).not.toHaveBeenCalled();
	});

	it("should return 400 when metadata is missing", async () => {
		mockConstructEvent.mockReturnValue({
			type: "checkout.session.completed",
			data: { object: { id: "cs_test_123", metadata: {} } },
		} as any);
		jest.spyOn(console, "error").mockImplementation(() => {});

		const response = await request(app)
			.post("/webhook")
			.set("stripe-signature", "valid_sig")
			.set("Content-Type", "application/json")
			.send(JSON.stringify({ type: "checkout.session.completed" }));

		expect(response.status).toBe(400);
		expect(response.body).toEqual({ error: "Missing required metadata" });
	});

	it("should successfully process the webhook, clear the cart, and return 201", async () => {
		mockConstructEvent.mockReturnValue({
			type: "checkout.session.completed",
			data: { object: mockSession },
		} as any);

		mockCartFindFirst.mockResolvedValue(mockCart);
		mockOrderCreate.mockResolvedValue(mockOrder);
		mockCartItemDeleteMany.mockResolvedValue({ count: 1 });
		mockCartUpdate.mockResolvedValue({});
		mockPrismaTransaction.mockResolvedValue([mockOrder]);

		const response = await request(app)
			.post("/webhook")
			.set("stripe-signature", "valid_sig")
			.set("Content-Type", "application/json")
			.send(JSON.stringify({ type: "checkout.session.completed" }));

		expect(response.status).toBe(201);
		expect(response.body).toEqual({
			message: "Order created successfully",
			order: mockOrder,
		});

		expect(mockCartFindFirst).toHaveBeenCalled();
		expect(mockOrderCreate).toHaveBeenCalled();
		expect(mockCartItemDeleteMany).toHaveBeenCalled();
		expect(mockCartUpdate).toHaveBeenCalled();
	});

	it("should return 500 via supertest when database transaction fails", async () => {
		mockConstructEvent.mockReturnValue({
			type: "checkout.session.completed",
			data: { object: mockSession },
		} as any);

		mockCartFindFirst.mockResolvedValue(mockCart);
		mockOrderCreate.mockResolvedValue(mockOrder);
		mockCartItemDeleteMany.mockResolvedValue({ count: 1 });
		mockCartUpdate.mockResolvedValue({});
		mockPrismaTransaction.mockRejectedValue(new Error("Database connection dropped"));
		jest.spyOn(console, "error").mockImplementation(() => {});

		const response = await request(app)
			.post("/webhook")
			.set("stripe-signature", "valid_sig")
			.set("Content-Type", "application/json")
			.send(JSON.stringify({ type: "checkout.session.completed" }));

		expect(response.status).toBe(500);
		expect(response.body.message).toBe("Internal server error");
	});
});