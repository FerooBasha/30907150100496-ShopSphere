import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import type { Request, Response } from "express";
import type Stripe from "stripe";

const mockCartFindFirst = jest.fn() as unknown as jest.MockedFunction<
	(...args: any[]) => Promise<any>
>;
const mockOrderCreate = jest.fn() as unknown as jest.MockedFunction<
	(...args: any[]) => Promise<any>
>;
const mockCartItemDeleteMany = jest.fn() as unknown as jest.MockedFunction<
	(...args: any[]) => Promise<any>
>;
const mockCartUpdate = jest.fn() as unknown as jest.MockedFunction<
	(...args: any[]) => Promise<any>
>;
const mockPrismaTransaction = jest.fn() as unknown as jest.MockedFunction<
	(...args: any[]) => Promise<any>
>;

const mockConstructEvent = jest.fn() as unknown as jest.MockedFunction<
	(...args: any[]) => Stripe.Event
>;
const mockRequireEnv = jest.fn() as unknown as jest.MockedFunction<
	(...args: any[]) => string
>;

jest.unstable_mockModule("../config/dbs.js", () => ({
	__esModule: true,
	prismaPg: {
		cart: {
			findFirst: mockCartFindFirst,
			update: mockCartUpdate,
		},
		order: {
			create: mockOrderCreate,
		},
		cartItem: {
			deleteMany: mockCartItemDeleteMany,
		},
		$transaction: mockPrismaTransaction,
	},
}));

jest.unstable_mockModule("../config/stripe.js", () => ({
	__esModule: true,
	stripe: {
		webhooks: {
			constructEvent: mockConstructEvent,
		},
	},
}));

jest.unstable_mockModule("../config/env.js", () => ({
	__esModule: true,
	requireEnv: mockRequireEnv,
}));

const { handleStripeWebhook } = await import(
	"../controllers/webhookControllers.ts"
);

function makeRes() {
	const sendMock = jest.fn().mockImplementation(() => ({}) as Response);
	const jsonMock = jest.fn().mockImplementation(() => ({}) as Response);
	const statusMock = jest
		.fn()
		.mockImplementation(() => ({ json: jsonMock, send: sendMock }) as any);
	return {
		res: { status: statusMock, json: jsonMock, send: sendMock } as unknown as Response,
		jsonMock,
		sendMock,
		statusMock,
	};
}

const mockDecimal = (val: number) => ({
	mul: (qty: number) => ({
		toNumber: () => val * qty,
	}),
	toNumber: () => val,
});

describe("el webhook controller", () => {
	let req: Partial<Request>;
	let res: Response;
	let jsonMock: jest.MockedFunction<any>;
	let sendMock: jest.MockedFunction<any>;
	let statusMock: jest.MockedFunction<any>;

	const mockUserId = "user-1";
	const mockCartId = "cart-1";

	const mockSession = {
		id: "cs_test_123",
		metadata: { userId: mockUserId, cartId: mockCartId },
	};

	const mockPrice = mockDecimal(10);

	const mockCart = {
		id: mockCartId,
		userId: mockUserId,
		items: [
			{
				id: "item-1",
				productId: "prod-1",
				quantity: 2,
				price: mockPrice,
			},
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
		req = {
			headers: { "stripe-signature": "sig_test" },
			body: Buffer.from("{}"),
		} as Partial<Request>;
		({ res, jsonMock, sendMock, statusMock } = makeRes());

		mockRequireEnv.mockImplementation((key: string) => {
			if (key === "NODE_ENV") return "development";
			return "whsec_dev_secret";
		});

		mockConstructEvent.mockReturnValue({
			type: "checkout.session.completed",
			data: { object: mockSession },
		} as any);
	});

	it("should successfully create order, clear cart, and return 201", async () => {
		mockCartFindFirst.mockResolvedValue(mockCart);
		mockOrderCreate.mockResolvedValue(mockOrder);
		mockCartItemDeleteMany.mockResolvedValue({ count: 1 });
		mockCartUpdate.mockResolvedValue({});
		mockPrismaTransaction.mockResolvedValue([mockOrder]);

		await handleStripeWebhook(req as Request, res);

		expect(mockOrderCreate).toHaveBeenCalledWith({
			data: {
				userId: mockUserId,
				totalAmount: 20, 
				status: "PENDING",
				items: {
					create: [
						{
							productId: "prod-1",
							quantity: 2,
							price: mockPrice, 
						},
					],
				},
			},
			include: { items: { include: { product: true } } },
		});

		expect(mockCartItemDeleteMany).toHaveBeenCalledWith({
			where: { cartId: mockCartId },
		});

		expect(mockCartUpdate).toHaveBeenCalledWith({
			where: { id: mockCartId },
			data: { totalAmount: 0 },
		});

		expect(mockPrismaTransaction).toHaveBeenCalledWith([
			expect.any(Promise),
			expect.any(Promise),
			expect.any(Promise),
		]);

		expect(statusMock).toHaveBeenCalledWith(201);
		expect(jsonMock).toHaveBeenCalledWith({
			message: "Order created successfully",
			order: mockOrder,
		});
	});

	it("should return 400 if signature verification fails", async () => {
		mockConstructEvent.mockImplementation(() => {
			throw new Error("Signature verification failed");
		});

		await handleStripeWebhook(req as Request, res);

		expect(statusMock).toHaveBeenCalledWith(400);
		expect(sendMock).toHaveBeenCalledWith("Webhook Error: Signature verification failed");
		expect(mockCartFindFirst).not.toHaveBeenCalled();
	});

	it("should return 400 if metadata is missing", async () => {
		jest.spyOn(console, "error").mockImplementation(() => {});
		mockConstructEvent.mockReturnValue({
			type: "checkout.session.completed",
			data: { object: { id: "cs_test_123", metadata: {} } },
		} as any);

		await handleStripeWebhook(req as Request, res);

		expect(statusMock).toHaveBeenCalledWith(400);
		expect(jsonMock).toHaveBeenCalledWith({ error: "Missing required metadata" });
		expect(mockCartFindFirst).not.toHaveBeenCalled();
	});

	it("should return 400 if cart is not found", async () => {
		mockCartFindFirst.mockResolvedValue(null);

		await handleStripeWebhook(req as Request, res);

		expect(statusMock).toHaveBeenCalledWith(400);
		expect(jsonMock).toHaveBeenCalledWith({
			message: "Cart is empty or does not exist. Add items before checking out.",
		});
		expect(mockOrderCreate).not.toHaveBeenCalled();
	});

	it("should return 400 if cart items are empty", async () => {
		mockCartFindFirst.mockResolvedValue({ ...mockCart, items: [] });

		await handleStripeWebhook(req as Request, res);

		expect(statusMock).toHaveBeenCalledWith(400);
		expect(jsonMock).toHaveBeenCalledWith({
			message: "Cart is empty or does not exist. Add items before checking out.",
		});
		expect(mockOrderCreate).not.toHaveBeenCalled();
	});

	it("should return 500 if transaction fails", async () => {
		mockCartFindFirst.mockResolvedValue(mockCart);
		mockOrderCreate.mockResolvedValue(mockOrder);
		mockCartItemDeleteMany.mockResolvedValue({ count: 1 });
		mockCartUpdate.mockResolvedValue({});
		mockPrismaTransaction.mockRejectedValue(new Error("Transaction failed"));
		jest.spyOn(console, "error").mockImplementation(() => {});

		await handleStripeWebhook(req as Request, res);

		expect(statusMock).toHaveBeenCalledWith(500);
		expect(jsonMock).toHaveBeenCalledWith(
			expect.objectContaining({ message: "Internal server error" }),
		);
	});

	it("should return { received: true } for unhandled event types", async () => {
		mockConstructEvent.mockReturnValue({
			type: "customer.subscription.created",
			data: { object: {} },
		} as any);

		await handleStripeWebhook(req as Request, res);

		expect(jsonMock).toHaveBeenCalledWith({ received: true });
		expect(mockCartFindFirst).not.toHaveBeenCalled();
	});
});