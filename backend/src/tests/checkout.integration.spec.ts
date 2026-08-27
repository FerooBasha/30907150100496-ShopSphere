import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import request from "supertest";
import express, { type Request, type Response, type NextFunction } from "express";

const mockCartFindFirst = jest.fn() as unknown as jest.MockedFunction<(...args: any[]) => Promise<any>>;
const mockUserFindFirst = jest.fn() as unknown as jest.MockedFunction<(...args: any[]) => Promise<any>>;
const mockUserUpdate = jest.fn() as unknown as jest.MockedFunction<(...args: any[]) => Promise<any>>;
const mockGetProductWithImageUrl = jest.fn() as unknown as jest.MockedFunction<(...args: any[]) => Promise<any>>;
const mockStripeCustomersCreate = jest.fn() as unknown as jest.MockedFunction<(...args: any[]) => Promise<any>>;
const mockStripeCheckoutSessionsCreate = jest.fn() as unknown as jest.MockedFunction<(...args: any[]) => Promise<any>>;
const mockRequireEnv = jest.fn() as unknown as jest.MockedFunction<(...args: any[]) => string>;

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

const app = express();
app.use(express.json());

const mockAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
	if (req.headers.authorization === "Bearer invalid") {
		next(); 
	} else {
		req.user = { id: "user-1" } as any;
		next();
	}
};

app.post("/api/checkout", mockAuthMiddleware, createCheckoutSession);

describe("Checkout Integration - createCheckoutSession", () => {
	const mockUser = {
		id: "user-1",
		username: "testuser",
		email: "test@example.com",
		stripeCustomerId: "cus_existing_123",
	};

	const mockProduct = {
		id: "prod-1",
		name: "Test Product",
		price: 10.0,
	};

	const mockCart = {
		id: "cart-1",
		userId: "user-1",
		items: [{ id: "item-1", quantity: 1, product: mockProduct }],
	};

	const mockProductWithImage = {
		...mockProduct,
		imageUrls: ["http://image.com/1.jpg"],
	};

	beforeEach(() => {
		jest.clearAllMocks();
		mockRequireEnv.mockReturnValue("http://localhost:3000");
	});

	it("should return 401 via supertest when user is not authenticated", async () => {
		const response = await request(app)
			.post("/api/checkout")
			.set("Authorization", "Bearer invalid");

		expect(response.status).toBe(401);
		expect(response.body).toEqual({
			message: "Invalid User ID please login",
		});
	});

	it("should return 200 and the Stripe checkout URL on successful integration flow", async () => {
		mockCartFindFirst.mockResolvedValue(mockCart);
		mockUserFindFirst.mockResolvedValue(mockUser);
		mockGetProductWithImageUrl.mockResolvedValue(mockProductWithImage);
		mockStripeCheckoutSessionsCreate.mockResolvedValue({
			id: "cs_test_999",
			url: "https://checkout.stripe.com/c/pay/cs_test_999",
		});

		const response = await request(app).post("/api/checkout");

		expect(response.status).toBe(200);
		expect(response.body).toEqual({
			message: "Checkout session created successfully",
			id: "cs_test_999",
			url: "https://checkout.stripe.com/c/pay/cs_test_999",
			totalAmount: 10, // 10.0 * 1 quantity = 10
		});

		// Ensure all integration layers (DB -> Stripe) were actually called
		expect(mockCartFindFirst).toHaveBeenCalled();
		expect(mockUserFindFirst).toHaveBeenCalled();
		expect(mockStripeCheckoutSessionsCreate).toHaveBeenCalled();
	});

	it("should return 400 via supertest when cart is empty", async () => {
		mockCartFindFirst.mockResolvedValue({ id: "cart-1", items: [] });
		mockUserFindFirst.mockResolvedValue(mockUser);

		const response = await request(app).post("/api/checkout");

		expect(response.status).toBe(400);
		expect(response.body.message).toContain("Cart is empty");
		expect(mockStripeCheckoutSessionsCreate).not.toHaveBeenCalled();
	});

	it("should return 500 via supertest when Stripe API fails", async () => {
		mockCartFindFirst.mockResolvedValue(mockCart);
		mockUserFindFirst.mockResolvedValue(mockUser);
		mockGetProductWithImageUrl.mockResolvedValue(mockProductWithImage);
		mockStripeCheckoutSessionsCreate.mockRejectedValue(new Error("Stripe Down"));
		jest.spyOn(console, "error").mockImplementation(() => {});

		const response = await request(app).post("/api/checkout");

		expect(response.status).toBe(500);
		expect(response.body.message).toBe("Internal server error");
	});
});