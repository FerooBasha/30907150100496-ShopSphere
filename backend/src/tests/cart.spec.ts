import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import type { Request, Response } from "express";

const mockCartFindFirst = jest.fn() as unknown as jest.MockedFunction<
	(...args: any[]) => Promise<any>
>;
const mockCartUpsert = jest.fn() as unknown as jest.MockedFunction<
	(...args: any[]) => Promise<any>
>;
const mockCartUpdate = jest.fn() as unknown as jest.MockedFunction<
	(...args: any[]) => Promise<any>
>;

const mockCartItemFindMany = jest.fn() as unknown as jest.MockedFunction<
	(...args: any[]) => Promise<any>
>;
const mockCartItemUpsert = jest.fn() as unknown as jest.MockedFunction<
	(...args: any[]) => Promise<any>
>;
const mockCartItemFindFirst = jest.fn() as unknown as jest.MockedFunction<
	(...args: any[]) => Promise<any>
>;
const mockCartItemUpdate = jest.fn() as unknown as jest.MockedFunction<
	(...args: any[]) => Promise<any>
>;
const mockCartItemDelete = jest.fn() as unknown as jest.MockedFunction<
	(...args: any[]) => Promise<any>
>;

const mockProductFindFirst = jest.fn() as unknown as jest.MockedFunction<
	(...args: any[]) => Promise<any>
>;
const mockGetProductWithImageUrl = jest.fn() as unknown as jest.MockedFunction<
	(...args: any[]) => Promise<any>
>;

jest.unstable_mockModule("../config/dbs.js", () => ({
	__esModule: true,
	prismaPg: {
		cart: {
			findFirst: mockCartFindFirst,
			upsert: mockCartUpsert,
			update: mockCartUpdate,
		},
		cartItem: {
			findMany: mockCartItemFindMany,
			upsert: mockCartItemUpsert,
			findFirst: mockCartItemFindFirst,
			update: mockCartItemUpdate,
			delete: mockCartItemDelete,
		},
		product: {
			findFirst: mockProductFindFirst,
		},
	},
}));

jest.unstable_mockModule("../util/getProductWithImageUrl.js", () => ({
	__esModule: true,
	getProductWithImageUrl: mockGetProductWithImageUrl,
}));

const { getCart, addToCart, updateCartItem, removeFromCart } =
	await import("../controllers/cartControllers.ts");

function makeRes() {
	const jsonMock = jest.fn().mockImplementation(() => ({}) as Response);
	const statusMock = jest
		.fn()
		.mockImplementation(() => ({ json: jsonMock }) as any);
	return {
		res: { status: statusMock } as Partial<Response>,
		jsonMock,
		statusMock,
	};
}

const mockDecimal = (val: number) => ({
	mul: (qty: number) => ({
		toNumber: () => val * qty,
		valueOf: () => val * qty,
	}),
	toNumber: () => val,
	valueOf: () => val,
});

describe("el cart controller", () => {
	let req: Partial<Request>;
	let res: Partial<Response>;
	let jsonMock: jest.MockedFunction<any>;
	let statusMock: jest.MockedFunction<any>;

	const mockUserId = "user-1";
	const mockProductId = "prod-1";
	const mockCartId = "cart-1";
	const mockItemId = "item-1";
	const mockPrice = mockDecimal(10);

	beforeEach(() => {
		jest.clearAllMocks();
		req = {
			user: { id: mockUserId } as any,
			params: { id: mockProductId },
			body: {},
		};
		({ res, jsonMock, statusMock } = makeRes());
	});

	describe("getCart", () => {
		it("should return 401 if no user", async () => {
			delete req.user;
			await getCart(req as Request, res as Response);
			expect(statusMock).toHaveBeenCalledWith(401);
		});

		it("should return 404 if cart not found", async () => {
			mockCartFindFirst.mockResolvedValue(null);
			await getCart(req as Request, res as Response);
			expect(statusMock).toHaveBeenCalledWith(404);
		});

		it("should return 200 with formatted cart", async () => {
			const mockProduct = { id: mockProductId, name: "Test" };
			const mockCart = {
				id: mockCartId,
				userId: mockUserId,
				items: [
					{
						id: mockItemId,
						productId: mockProductId,
						quantity: 2,
						product: mockProduct,
					},
				],
			};
			mockCartUpsert.mockResolvedValue(mockCart);
			mockGetProductWithImageUrl.mockResolvedValue({
				...mockProduct,
				imageUrls: ["img.jpg"],
			});

			await getCart(req as Request, res as Response);

			expect(mockCartUpsert).toHaveBeenCalledWith({
				where: { userId: mockUserId },
				create: { userId: mockUserId, totalAmount: 0 },
				update: {},
				include: { items: { include: { product: true } } },
			});
			expect(statusMock).toHaveBeenCalledWith(200);
			expect(jsonMock).toHaveBeenCalledWith({
				...mockCart,
				items: [
					{
						...mockCart.items[0],
						product: { ...mockProduct, imageUrls: ["img.jpg"] },
					},
				],
			});
		});
	});

	describe("addToCart", () => {
		it("should return 401 if no productId", async () => {
			req.params!.id = "";
			await addToCart(req as Request, res as Response);
			expect(statusMock).toHaveBeenCalledWith(401);
		});

		it("should return 404 if product not found", async () => {
			mockProductFindFirst.mockResolvedValue(null);
			await addToCart(req as Request, res as Response);
			expect(statusMock).toHaveBeenCalledWith(404);
		});

		it("should return 201 and add to cart successfully", async () => {
			const mockProduct = { id: mockProductId, price: mockPrice };
			mockProductFindFirst.mockResolvedValue(mockProduct);
			mockCartItemFindMany.mockResolvedValue([
				{ price: mockPrice, quantity: 2 },
			]);
			mockCartUpsert.mockResolvedValue({ id: mockCartId, userId: mockUserId });
			mockCartItemUpsert.mockResolvedValue({});

			const updatedCart = {
				id: mockCartId,
				items: [
					{
						id: mockItemId,
						productId: mockProductId,
						quantity: 2,
						product: mockProduct,
					},
				],
			};
			mockCartUpdate.mockResolvedValue(updatedCart);
			mockGetProductWithImageUrl.mockResolvedValue({
				...mockProduct,
				imageUrls: [],
			});

			await addToCart(req as Request, res as Response);

			expect(mockCartUpsert).toHaveBeenCalledWith({
				where: { userId: mockUserId },
				update: {},
				create: { userId: mockUserId, totalAmount: 0 },
			});
			expect(mockCartItemUpsert).toHaveBeenCalledWith({
				where: {
					cartId_productId: { cartId: mockCartId, productId: mockProductId },
				},
				update: { quantity: { increment: 1 } },
				create: {
					cartId: mockCartId,
					price: mockPrice,
					productId: mockProductId,
					quantity: 1,
				},
			});
			expect(mockCartUpdate).toHaveBeenCalledWith({
				where: { id: mockCartId },
				data: { totalAmount: 20 }, // 10 * 2
				include: { items: { include: { product: true } } },
			});
			expect(statusMock).toHaveBeenCalledWith(201);
		});
	});

	describe("updateCartItem", () => {
		beforeEach(() => {
			req.body = { add: "true" };
		});

		it("should return 401 if missing fields", async () => {
			req.body = {};
			await updateCartItem(req as Request, res as Response);
			expect(statusMock).toHaveBeenCalledWith(401);
		});

		it("should increment quantity and totalAmount successfully", async () => {
			const mockProduct = { price: mockPrice };
			const mockCartItem = {
				id: mockItemId,
				cartId: mockCartId,
				productId: mockProductId,
				quantity: 2,
				price: mockPrice,
				product: mockProduct,
			};
			mockCartItemFindFirst.mockResolvedValue(mockCartItem);
			mockCartItemUpdate.mockResolvedValue({ ...mockCartItem, quantity: 3 });
			mockCartUpdate.mockResolvedValue({});
			mockGetProductWithImageUrl.mockResolvedValue({
				...mockProduct,
				imageUrls: [],
			});

			await updateCartItem(req as Request, res as Response);

			expect(mockCartItemUpdate).toHaveBeenCalledWith({
				where: { id: mockItemId },
				data: { quantity: { increment: 1 } },
				include: { product: true },
			});
			expect(mockCartUpdate).toHaveBeenCalledWith({
				where: { id: mockCartId },
				data: { totalAmount: { increment: mockPrice } },
				include: { items: true },
			});
			expect(statusMock).toHaveBeenCalledWith(200);
		});

		it("should delete item if decrementing to 0", async () => {
			req.body = { add: "false" };
			const mockProduct = { price: mockPrice };
			const mockCartItem = {
				id: mockItemId,
				cartId: mockCartId,
				productId: mockProductId,
				quantity: 1,
				price: mockPrice,
				product: mockProduct,
			};
			mockCartItemFindFirst.mockResolvedValue(mockCartItem);
			mockCartUpdate.mockResolvedValue({});

			await updateCartItem(req as Request, res as Response);

			expect(mockCartUpdate).toHaveBeenCalledWith({
				where: { id: mockCartId },
				data: {
					totalAmount: { decrement: expect.any(Object) },
					items: { delete: { id: mockItemId } },
				},
			});
			expect(statusMock).toHaveBeenCalledWith(200);
			expect(jsonMock).toHaveBeenCalledWith({
				message: "Product deleted successfully",
			});
		});
	});

	describe("removeFromCart", () => {
		it("should delete item and decrement totalAmount", async () => {
			const mockProduct = { price: mockPrice };
			const mockCartItem = {
				id: mockItemId,
				cartId: mockCartId,
				productId: mockProductId,
				quantity: 2,
				product: mockProduct,
			};
			mockCartItemFindFirst.mockResolvedValue(mockCartItem);
			mockCartItemDelete.mockResolvedValue({});
			mockCartUpdate.mockResolvedValue({});

			await removeFromCart(req as Request, res as Response);

			expect(mockCartItemDelete).toHaveBeenCalledWith({
				where: { id: mockItemId },
			});
			expect(mockCartUpdate).toHaveBeenCalledWith({
				where: { id: mockCartId },
				data: {
					totalAmount: { decrement: 20 },
				},
				include: { items: true },
			});
			expect(statusMock).toHaveBeenCalledWith(200);
		});
	});
});
