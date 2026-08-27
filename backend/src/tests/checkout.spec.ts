import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import type { Request, Response } from "express";

// hey this is me minty i made this test i will not comment again because i hate it

const mockCartFindFirst = jest.fn() as unknown as jest.MockedFunction<
	(...args: any[]) => Promise<any>
>;
const mockUserFindFirst = jest.fn() as unknown as jest.MockedFunction<
	(...args: any[]) => Promise<any>
>;
const mockUserUpdate = jest.fn() as unknown as jest.MockedFunction<
	(...args: any[]) => Promise<any>
>;
const mockGetProductWithImageUrl = jest.fn() as unknown as jest.MockedFunction<
	(...args: any[]) => Promise<any>
>;
const mockStripeCustomersCreate = jest.fn() as unknown as jest.MockedFunction<
	(...args: any[]) => Promise<any>
>;
const mockStripeCheckoutSessionsCreate = jest.fn() as unknown as jest.MockedFunction<
	(...args: any[]) => Promise<any>
>;
const mockRequireEnv = jest.fn() as unknown as jest.MockedFunction<
	(...args: any[]) => string
>;

jest.unstable_mockModule("../config/dbs.js", () => ({
	__esModule: true,
	prismaPg: {
		cart: { findFirst: mockCartFindFirst },
		user: { findFirst: mockUserFindFirst, update: mockUserUpdate },
	},
}));

jest.unstable_mockModule("../util/getProductWithImageUrl.js", () => ({
	__esModule: true,
	getProductWithImageUrl: mockGetProductWithImageUrl,
}));

jest.unstable_mockModule("../config/stripe.js", () => ({
	__esModule: true,
	stripe: {
		customers: { create: mockStripeCustomersCreate },
		checkout: { sessions: { create: mockStripeCheckoutSessionsCreate } },
	},
}));

jest.unstable_mockModule("../config/env.js", () => ({
	__esModule: true,
	requireEnv: mockRequireEnv,
}));

const { createCheckoutSession } = await import(
	"../controllers/checkoutControllers.ts"
);

function makeRes() {
	const jsonMock = jest.fn().mockImplementation(() => ({}) as Response);
	const statusMock = jest
		.fn()
		.mockImplementation(() => ({ json: jsonMock }) as any);
	return { res: { status: statusMock } as Partial<Response>, jsonMock, statusMock };
}

describe("el checkout controller. we see the sesh frfr", () => {
	let req: Partial<Request>;
	let res: Partial<Response>;
	let jsonMock: jest.MockedFunction<any>;
	let statusMock: jest.MockedFunction<any>;

	const mockUser = {
		id: "user-1",
		username: "testuser",
		email: "test@example.com",
		stripeCustomerId: "cus_existing_123",
	};

	const mockUserWithoutStripe = {
		...mockUser,
		stripeCustomerId: null,
	};

	const mockProduct = {
		id: "prod-1",
		name: "Test Product",
		price: 25.5,
	};

	const mockCart = {
		id: "cart-1",
		userId: "user-1",
		items: [
			{
				id: "item-1",
				quantity: 2,
				product: mockProduct,
			},
		],
	};

	const mockProductWithImage = {
		...mockProduct,
		imageUrls: ["http://image.com/1.jpg", null], 
	};

	beforeEach(() => {
		jest.clearAllMocks();
		req = {
			user: { id: "user-1" } as any,
		};
		({ res, jsonMock, statusMock } = makeRes());
		mockRequireEnv.mockReturnValue("http://localhost:3000");
	});

	it("should return 401 when there is no authenticated user", async () => {
		delete req.user;

		await createCheckoutSession(req as Request, res as Response);

		expect(statusMock).toHaveBeenCalledWith(401);
		expect(jsonMock).toHaveBeenCalledWith({
			message: "Invalid User ID please login",
		});
		expect(mockCartFindFirst).not.toHaveBeenCalled();
	});

	it("should return 404 when user is not found", async () => {
		mockCartFindFirst.mockResolvedValue(mockCart);
		mockUserFindFirst.mockResolvedValue(null);

		await createCheckoutSession(req as Request, res as Response);

		expect(statusMock).toHaveBeenCalledWith(404);
		expect(jsonMock).toHaveBeenCalledWith({
			message: "User not found. please try login and try again.",
		});
		expect(mockStripeCheckoutSessionsCreate).not.toHaveBeenCalled();
	});

	it("should return 400 when cart is not found", async () => {
		mockCartFindFirst.mockResolvedValue(null);
		mockUserFindFirst.mockResolvedValue(mockUser);

		await createCheckoutSession(req as Request, res as Response);

		expect(statusMock).toHaveBeenCalledWith(400);
		expect(jsonMock).toHaveBeenCalledWith({
			message: "Cart is empty or does not exist. Add items before checking out.",
		});
		expect(mockStripeCheckoutSessionsCreate).not.toHaveBeenCalled();
	});

	it("should return 400 when cart items are empty", async () => {
		const emptyCart = { ...mockCart, items: [] };
		mockCartFindFirst.mockResolvedValue(emptyCart);
		mockUserFindFirst.mockResolvedValue(mockUser);

		await createCheckoutSession(req as Request, res as Response);

		expect(statusMock).toHaveBeenCalledWith(400);
		expect(jsonMock).toHaveBeenCalledWith({
			message: "Cart is empty or does not exist. Add items before checking out.",
		});
		expect(mockStripeCheckoutSessionsCreate).not.toHaveBeenCalled();
	});

	it("should create a new Stripe customer if user does not have a stripeCustomerId", async () => {
		mockCartFindFirst.mockResolvedValue(mockCart);
		mockUserFindFirst.mockResolvedValue(mockUserWithoutStripe);
		mockGetProductWithImageUrl.mockResolvedValue(mockProductWithImage);
		mockStripeCustomersCreate.mockResolvedValue({ id: "cus_new_456" });
		mockUserUpdate.mockResolvedValue({});
		mockStripeCheckoutSessionsCreate.mockResolvedValue({
			id: "cs_test_123",
			url: "https://checkout.stripe.com/test",
		});

		await createCheckoutSession(req as Request, res as Response);

		expect(mockStripeCustomersCreate).toHaveBeenCalledWith({
			name: mockUserWithoutStripe.username,
			email: mockUserWithoutStripe.email,
			metadata: { userId: mockUserWithoutStripe.id },
		});
		expect(mockUserUpdate).toHaveBeenCalledWith({
			where: { id: mockUserWithoutStripe.id },
			data: { stripeCustomerId: "cus_new_456" },
		});
		expect(statusMock).toHaveBeenCalledWith(200);
	});

	it("should successfully create a checkout session, format line items correctly, and return 200", async () => {
		mockCartFindFirst.mockResolvedValue(mockCart);
		mockUserFindFirst.mockResolvedValue(mockUser);
		mockGetProductWithImageUrl.mockResolvedValue(mockProductWithImage);
		mockStripeCheckoutSessionsCreate.mockResolvedValue({
			id: "cs_test_123",
			url: "https://checkout.stripe.com/test",
		});

		await createCheckoutSession(req as Request, res as Response);

		expect(mockGetProductWithImageUrl).toHaveBeenCalledWith(mockProduct);

		expect(mockStripeCheckoutSessionsCreate).toHaveBeenCalledWith({
			mode: "payment",
			line_items: [
				{
					price_data: {
						currency: "usd",
						product_data: {
							name: "Test Product",
							images: ["http://image.com/1.jpg"], 
						},
						unit_amount: 2550,
					},
					quantity: 2,
				},
			],
			success_url: "http://localhost:3000/payment/success?session_id={CHECKOUT_SESSION_ID}",
			cancel_url: "http://localhost:3000/cart",
			customer: "cus_existing_123",
			payment_intent_data: {
				setup_future_usage: "off_session",
			},
			billing_address_collection: "required",
			metadata: {
				userId: "user-1",
				cartId: "cart-1",
			},
		});

		expect(statusMock).toHaveBeenCalledWith(200);
		
		expect(jsonMock).toHaveBeenCalledWith({
			message: "Checkout session created successfully",
			id: "cs_test_123",
			url: "https://checkout.stripe.com/test",
			totalAmount: 51, 
		});
	});

	it("should gracefully capture exceptions and return a 500 state", async () => {
		mockCartFindFirst.mockResolvedValue(mockCart);
		mockUserFindFirst.mockResolvedValue(mockUser);
		mockGetProductWithImageUrl.mockResolvedValue(mockProductWithImage);
		mockStripeCheckoutSessionsCreate.mockRejectedValue(
			new Error("Stripe API connection dropped"),
		);
		jest.spyOn(console, "error").mockImplementation(() => {});

		await createCheckoutSession(req as Request, res as Response);

		expect(statusMock).toHaveBeenCalledWith(500);
		expect(jsonMock).toHaveBeenCalledWith(
			expect.objectContaining({ message: "Internal server error" }),
		);
	});
});