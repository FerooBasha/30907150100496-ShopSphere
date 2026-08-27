import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import request from "supertest";
import express, { type Request, type Response, type NextFunction } from "express";

const mockCartFindFirst = jest.fn() as unknown as jest.MockedFunction<(...args: any[]) => Promise<any>>;
const mockCartUpsert = jest.fn() as unknown as jest.MockedFunction<(...args: any[]) => Promise<any>>;
const mockCartUpdate = jest.fn() as unknown as jest.MockedFunction<(...args: any[]) => Promise<any>>;
const mockCartItemFindMany = jest.fn() as unknown as jest.MockedFunction<(...args: any[]) => Promise<any>>;
const mockCartItemUpsert = jest.fn() as unknown as jest.MockedFunction<(...args: any[]) => Promise<any>>;
const mockCartItemFindFirst = jest.fn() as unknown as jest.MockedFunction<(...args: any[]) => Promise<any>>;
const mockCartItemUpdate = jest.fn() as unknown as jest.MockedFunction<(...args: any[]) => Promise<any>>;
const mockCartItemDelete = jest.fn() as unknown as jest.MockedFunction<(...args: any[]) => Promise<any>>;
const mockProductFindFirst = jest.fn() as unknown as jest.MockedFunction<(...args: any[]) => Promise<any>>;
const mockGetProductWithImageUrl = jest.fn() as unknown as jest.MockedFunction<(...args: any[]) => Promise<any>>;

jest.unstable_mockModule("../config/dbs.js", () => ({
	__esModule: true,
	prismaPg: {
		cart: { findFirst: mockCartFindFirst, upsert: mockCartUpsert, update: mockCartUpdate },
		cartItem: { findMany: mockCartItemFindMany, upsert: mockCartItemUpsert, findFirst: mockCartItemFindFirst, update: mockCartItemUpdate, delete: mockCartItemDelete },
		product: { findFirst: mockProductFindFirst },
	},
}));

jest.unstable_mockModule("../util/getProductWithImageUrl.js", () => ({
	__esModule: true,
	getProductWithImageUrl: mockGetProductWithImageUrl,
}));

const { getCart, addToCart, updateCartItem, removeFromCart } = await import(
	"../controllers/cartControllers.ts"
);

const app = express();
app.use(express.json());

const mockAuth = (req: Request, res: Response, next: NextFunction) => {
	if (req.headers.authorization === "Bearer invalid") {
		next(); 
	} else {
		req.user = { id: "user-1" } as any;
		next();
	}
};

app.get("/cart", mockAuth, getCart);
app.post("/cart/:id", mockAuth, addToCart);
app.patch("/cart/:id", mockAuth, updateCartItem);
app.delete("/cart/:id", mockAuth, removeFromCart);

describe("el cartitos", () => {
	const mockUserId = "user-1";
	const mockProductId = "prod-1";
	const mockCartId = "cart-1";
	const mockItemId = "item-1";

	const mockDecimal = (val: number) => ({
		mul: (qty: number) => ({ toNumber: () => val * qty, valueOf: () => val * qty }),
		toNumber: () => val,
		valueOf: () => val,
	});
	const mockPrice = mockDecimal(10);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("should return 401 via supertest when user is not authenticated", async () => {
		const response = await request(app)
			.get("/cart")
			.set("Authorization", "Bearer invalid");

		expect(response.status).toBe(401);
		expect(response.body.message).toContain("Invalid User ID");
	});

	it("should successfully fetch the cart via GET /cart", async () => {
		const mockProduct = { id: mockProductId, name: "Test" };
		const mockCart = {
			id: mockCartId,
			userId: mockUserId,
			items: [{ id: mockItemId, productId: mockProductId, quantity: 2, product: mockProduct }],
		};
		mockCartFindFirst.mockResolvedValue(mockCart);
		mockGetProductWithImageUrl.mockResolvedValue({ ...mockProduct, imageUrls: ["img.jpg"] });

		const response = await request(app).get("/cart");

		expect(response.status).toBe(200);
		expect(response.body.items[0].product.imageUrls).toEqual(["img.jpg"]);
	});

	it("should successfully add an item via POST /cart/:id", async () => {
		const mockProduct = { id: mockProductId, price: mockPrice };
		mockProductFindFirst.mockResolvedValue(mockProduct);
		mockCartItemFindMany.mockResolvedValue([{ price: mockPrice, quantity: 1 }]);
		mockCartUpsert.mockResolvedValue({ id: mockCartId, userId: mockUserId });
		mockCartItemUpsert.mockResolvedValue({});
		mockCartUpdate.mockResolvedValue({ id: mockCartId, items: [] });
		mockGetProductWithImageUrl.mockResolvedValue({ ...mockProduct, imageUrls: [] });

		const response = await request(app).post(`/cart/${mockProductId}`);

		expect(response.status).toBe(201);
		expect(response.body.message).toBe("Product added successfully");
	});

	it("should successfully update an item via PATCH /cart/:id", async () => {
		const mockProduct = { price: mockPrice };
		const mockCartItem = {
			id: mockItemId, cartId: mockCartId, productId: mockProductId,
			quantity: 2, price: mockPrice, product: mockProduct,
		};
		mockCartItemFindFirst.mockResolvedValue(mockCartItem);
		mockCartItemUpdate.mockResolvedValue({ ...mockCartItem, quantity: 3 });
		mockCartUpdate.mockResolvedValue({});
		mockGetProductWithImageUrl.mockResolvedValue({ ...mockProduct, imageUrls: [] });

		const response = await request(app)
			.patch(`/cart/${mockProductId}`)
			.send({ add: "true" });

		expect(response.status).toBe(200);
		expect(response.body.message).toBe("Item updated successfully");
	});

	it("should successfully remove an item via DELETE /cart/:id", async () => {
		const mockProduct = { price: mockPrice };
		const mockCartItem = {
			id: mockItemId, cartId: mockCartId, productId: mockProductId,
			quantity: 2, product: mockProduct,
		};
		mockCartItemFindFirst.mockResolvedValue(mockCartItem);
		mockCartItemDelete.mockResolvedValue({});
		mockCartUpdate.mockResolvedValue({});

		const response = await request(app).delete(`/cart/${mockProductId}`);

		expect(response.status).toBe(200);
		expect(response.body.message).toBe("Item deleted successfully");
	});
});