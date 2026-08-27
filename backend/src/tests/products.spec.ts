import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import type { Request, Response } from "express";

// ---- Mocked Prisma (Postgres) product methods ----
const mockFindMany = jest.fn() as unknown as jest.MockedFunction<
	(...args: any[]) => Promise<any>
>;
const mockCount = jest.fn() as unknown as jest.MockedFunction<
	(...args: any[]) => Promise<number>
>;
const mockFindUnique = jest.fn() as unknown as jest.MockedFunction<
	(...args: any[]) => Promise<any>
>;
const mockCreate = jest.fn() as unknown as jest.MockedFunction<
	(...args: any[]) => Promise<any>
>;
const mockUpdate = jest.fn() as unknown as jest.MockedFunction<
	(...args: any[]) => Promise<any>
>;

// ---- Mocked Prisma (Mongo) review methods ----
const mockReviewCreate = jest.fn() as unknown as jest.MockedFunction<
	(...args: any[]) => Promise<any>
>;
const mockReviewFindMany = jest.fn() as unknown as jest.MockedFunction<
	(...args: any[]) => Promise<any>
>;
const mockReviewCount = jest.fn() as unknown as jest.MockedFunction<
	(...args: any[]) => Promise<number>
>;
const mockReviewAggregate = jest.fn() as unknown as jest.MockedFunction<
	(...args: any[]) => Promise<any>
>;

// ---- Mocked R2 / signed URLs ----
const mockR2Send = jest.fn() as unknown as jest.MockedFunction<
	(...args: any[]) => Promise<any>
>;
const mockGetSignedUrl = jest.fn() as unknown as jest.MockedFunction<
	(...args: any[]) => Promise<string>
>;

// A fake PrismaClientKnownRequestError class so `instanceof` checks in the
// controller's catch blocks resolve correctly against our mocked module.
class MockPrismaClientKnownRequestError extends Error {
	code: string;
	constructor(message: string, code: string) {
		super(message);
		this.code = code;
		Object.setPrototypeOf(this, MockPrismaClientKnownRequestError.prototype);
	}
}

jest.unstable_mockModule("../config/dbs.js", () => ({
	__esModule: true,
	prismaPg: {
		product: {
			findMany: mockFindMany,
			count: mockCount,
			findUnique: mockFindUnique,
			create: mockCreate,
			update: mockUpdate,
		},
	},
	prismaMongo: {
		review: {
			create: mockReviewCreate,
			findMany: mockReviewFindMany,
			count: mockReviewCount,
			aggregate: mockReviewAggregate,
		},
	},
}));

jest.unstable_mockModule(
	"../generated/prisma-mongo/runtime/library.js",
	() => ({
		__esModule: true,
		PrismaClientKnownRequestError: MockPrismaClientKnownRequestError,
	}),
);

jest.unstable_mockModule("../config/r2.js", () => ({
	__esModule: true,
	r2: { send: mockR2Send },
}));

jest.unstable_mockModule("../config/env.js", () => ({
	__esModule: true,
	requireEnv: jest.fn((key: string) => `mock-${key}`),
}));

jest.unstable_mockModule("@aws-sdk/client-s3", () => ({
	__esModule: true,
	GetObjectCommand: jest.fn().mockImplementation((args) => args),
	PutObjectCommand: jest.fn().mockImplementation((args) => args),
}));

jest.unstable_mockModule("@aws-sdk/s3-request-presigner", () => ({
	__esModule: true,
	getSignedUrl: mockGetSignedUrl,
}));

const { getProducts, getProductById, createProduct, updateProduct } =
	await import("../controllers/productControllers.js");

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

describe("Products Controller - getProducts", () => {
	let req: Partial<Request>;
	let res: Partial<Response>;
	let jsonMock: jest.MockedFunction<any>;
	let statusMock: jest.MockedFunction<any>;

	beforeEach(() => {
		jest.clearAllMocks();
		req = { query: {} };
		({ res, jsonMock, statusMock } = makeRes());
		mockGetSignedUrl.mockResolvedValue(
			"https://mock-bucket.example.com/products/mock-key.jpg",
		);
	});

	it("should successfully return a paginated list of products with default params", async () => {
		const mockProducts = [
			{
				id: "1",
				name: "Lemon Keyboard",
				price: 45.0,
				imageKeys: ["products/mock-key.png"],
				createdAt: new Date(),
			},
		];

		mockFindMany.mockResolvedValue(mockProducts);
		mockCount.mockResolvedValue(1);

		await getProducts(req as Request, res as Response);

		expect(statusMock).toHaveBeenCalledWith(200);
		expect(jsonMock).toHaveBeenCalledWith({
			success: true,
			pagination: {
				totalItems: 1,
				currentPage: 1,
				totalPages: 1,
				limit: 20,
			},
			data: [
				{
					...mockProducts[0],
					imageUrls: ["https://mock-bucket.example.com/products/mock-key.jpg"],
				},
			],
		});
	});

	it("should apply search, category, and pagination filters", async () => {
		req.query = {
			search: "Lemon",
			category: "fruit",
			page: "2",
			limit: "5",
			orderBy: "price",
			orderDirection: "asc",
		};

		mockFindMany.mockResolvedValue([]);
		mockCount.mockResolvedValue(0);

		await getProducts(req as Request, res as Response);

		expect(mockFindMany).toHaveBeenCalledWith({
			where: {
				name: { contains: "Lemon", mode: "insensitive" },
				category: { slug: "fruit" },
			},
			include: { category: true },
			orderBy: { price: "asc" },
			skip: 5,
			take: 5,
		});
		expect(statusMock).toHaveBeenCalledWith(200);
	});

	it("should default to createdAt desc when no orderBy/orderDirection given", async () => {
		mockFindMany.mockResolvedValue([]);
		mockCount.mockResolvedValue(0);

		await getProducts(req as Request, res as Response);

		expect(mockFindMany).toHaveBeenCalledWith(
			expect.objectContaining({ orderBy: { createdAt: "desc" } }),
		);
	});

	it("should fall back to createdAt when orderBy is not an allowed field", async () => {
		req.query = { orderBy: "notARealField" };
		mockFindMany.mockResolvedValue([]);
		mockCount.mockResolvedValue(0);

		await getProducts(req as Request, res as Response);

		expect(mockFindMany).toHaveBeenCalledWith(
			expect.objectContaining({ orderBy: { createdAt: "desc" } }),
		);
	});

	it("should fall back to desc when orderDirection is invalid", async () => {
		req.query = { orderBy: "price", orderDirection: "sideways" };
		mockFindMany.mockResolvedValue([]);
		mockCount.mockResolvedValue(0);

		await getProducts(req as Request, res as Response);

		expect(mockFindMany).toHaveBeenCalledWith(
			expect.objectContaining({ orderBy: { price: "desc" } }),
		);
	});

	it("should filter by minPrice and maxPrice when both are provided", async () => {
		req.query = { minPrice: "10", maxPrice: "50" };
		mockFindMany.mockResolvedValue([]);
		mockCount.mockResolvedValue(0);

		await getProducts(req as Request, res as Response);

		expect(mockFindMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ price: { gte: 10, lte: 50 } }),
			}),
		);
	});

	it("should filter by minPrice only when maxPrice is not provided", async () => {
		req.query = { minPrice: "20" };
		mockFindMany.mockResolvedValue([]);
		mockCount.mockResolvedValue(0);

		await getProducts(req as Request, res as Response);

		expect(mockFindMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ price: { gte: 20 } }),
			}),
		);
	});

	it("should ignore non-numeric minPrice/maxPrice values", async () => {
		req.query = { minPrice: "abc", maxPrice: "xyz" };
		mockFindMany.mockResolvedValue([]);
		mockCount.mockResolvedValue(0);

		await getProducts(req as Request, res as Response);

		expect(mockFindMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: {} }),
		);
	});

	it("should return 413 and not query the database when limit exceeds 100", async () => {
		req.query = { limit: "150" };

		await getProducts(req as Request, res as Response);

		expect(statusMock).toHaveBeenCalledWith(413);
		expect(jsonMock).toHaveBeenCalledWith({
			message: "Page size larger than 100",
		});
		expect(mockFindMany).not.toHaveBeenCalled();
	});

	it("should gracefully capture database exceptions and return a 500 state", async () => {
		mockFindMany.mockRejectedValue(new Error("Database connection dropped"));
		jest.spyOn(console, "error").mockImplementation(() => {});

		await getProducts(req as Request, res as Response);

		expect(statusMock).toHaveBeenCalledWith(500);
		expect(jsonMock).toHaveBeenCalledWith({
			success: false,
			message: "Server encountered an error while retrieving products.",
		});
	});
});

describe("Products Controller - getProductById", () => {
	let req: Partial<Request>;
	let res: Partial<Response>;
	let jsonMock: jest.MockedFunction<any>;
	let statusMock: jest.MockedFunction<any>;

	beforeEach(() => {
		jest.clearAllMocks();
		req = { params: {} };
		({ res, jsonMock, statusMock } = makeRes());
	});

	it("should return 400 if no id is provided in the request params", async () => {
		req.params = {};
		await getProductById(req as Request, res as Response);

		expect(statusMock).toHaveBeenCalledWith(400);
		expect(jsonMock).toHaveBeenCalledWith({
			success: false,
			message: "Product ID is required.",
		});
	});

	it("should return the product when a valid id is provided", async () => {
		req.params = { id: "abc123" };
		const mockProduct = {
			id: "abc123",
			name: "Lemon Keyboard",
			price: 45.0,
			imageUrls: [],
			imageKeys: [],
		};
		mockFindUnique.mockResolvedValue(mockProduct);

		await getProductById(req as Request, res as Response);

		expect(mockFindUnique).toHaveBeenCalledWith({
			where: { id: "abc123" },
			include: { category: true },
		});
		expect(statusMock).toHaveBeenCalledWith(200);
		expect(jsonMock).toHaveBeenCalledWith({ success: true, data: mockProduct });
	});

	it("should return 404 when the product does not exist", async () => {
		req.params = { id: "missing-id" };
		mockFindUnique.mockResolvedValue(null);

		await getProductById(req as Request, res as Response);

		expect(statusMock).toHaveBeenCalledWith(404);
		expect(jsonMock).toHaveBeenCalledWith({
			success: false,
			message: "Product not found.",
		});
	});

	it("should gracefully capture database exceptions and return a 500 state", async () => {
		req.params = { id: "abc123" };
		mockFindUnique.mockRejectedValue(new Error("Database connection dropped"));
		jest.spyOn(console, "error").mockImplementation(() => {});

		await getProductById(req as Request, res as Response);

		expect(statusMock).toHaveBeenCalledWith(500);
		expect(jsonMock).toHaveBeenCalledWith({
			success: false,
			message: "Server encountered an error while retrieving the product.",
		});
	});
});

describe("Products Controller - createProduct", () => {
	let req: Partial<Request>;
	let res: Partial<Response>;
	let jsonMock: jest.MockedFunction<any>;
	let statusMock: jest.MockedFunction<any>;

	beforeEach(() => {
		jest.clearAllMocks();
		req = {
			body: {},
			files: [
				{
					originalname: "keyboard.png",
					buffer: Buffer.from("fake image data"),
					mimetype: "image/png",
				} as Express.Multer.File,
			],
		};
		mockR2Send.mockResolvedValue({});
		({ res, jsonMock, statusMock } = makeRes());
	});

	it("should create a product and return 201 when all fields are provided", async () => {
		req.body = {
			name: "Lemon Keyboard",
			price: "45.00",
			category: "electronics",
			description: "A very zesty mechanical keyboard.",
		};

		const mockCreated = {
			id: "new-id",
			name: "Lemon Keyboard",
			price: 45.0,
			description: "A very zesty mechanical keyboard.",
			imageKeys: ["products/mock-uuid.png"],
		};
		mockCreate.mockResolvedValue(mockCreated);

		await createProduct(req as Request, res as Response);

		expect(mockCreate).toHaveBeenCalledWith({
			data: {
				name: "Lemon Keyboard",
				price: 45.0,
				category: { connect: { slug: "electronics" } },
				description: "A very zesty mechanical keyboard.",
				imageKeys: [expect.any(String)],
			},
		});
		expect(statusMock).toHaveBeenCalledWith(201);
		expect(jsonMock).toHaveBeenCalledWith({ success: true, data: mockCreated });
	});

	it("should return 400 when a required field is missing", async () => {
		req.body = {
			name: "Lemon Keyboard",
			category: "electronics",
			description: "Missing a price.",
		};

		await createProduct(req as Request, res as Response);

		expect(mockCreate).not.toHaveBeenCalled();
		expect(statusMock).toHaveBeenCalledWith(400);
		expect(jsonMock).toHaveBeenCalledWith({
			success: false,
			message: "Not all fields are filled",
		});
	});

	it("should return 400 when no image files are provided", async () => {
		req.body = {
			name: "Lemon Keyboard",
			price: "45.00",
			category: "electronics",
			description: "A very zesty mechanical keyboard.",
		};
		req.files = [];

		await createProduct(req as Request, res as Response);

		expect(mockCreate).not.toHaveBeenCalled();
		expect(statusMock).toHaveBeenCalledWith(400);
		expect(jsonMock).toHaveBeenCalledWith({
			success: false,
			message: "At least one image file is required.",
		});
	});

	it("should gracefully capture database exceptions and return a 500 state", async () => {
		req.body = {
			name: "Lemon Keyboard",
			price: "45.00",
			category: "electronics",
			description: "A very zesty mechanical keyboard.",
		};
		mockCreate.mockRejectedValue(new Error("Database connection dropped"));
		jest.spyOn(console, "error").mockImplementation(() => {});

		await createProduct(req as Request, res as Response);

		expect(statusMock).toHaveBeenCalledWith(500);
		expect(jsonMock).toHaveBeenCalledWith({
			success: false,
			message: "Server encountered an error while creating the product.",
		});
	});
});

describe("Products Controller - updateProduct", () => {
	let req: Partial<Request>;
	let res: Partial<Response>;
	let jsonMock: jest.MockedFunction<any>;
	let statusMock: jest.MockedFunction<any>;

	beforeEach(() => {
		jest.clearAllMocks();
		req = { params: {}, body: {} };
		({ res, jsonMock, statusMock } = makeRes());
	});

	it("should update the provided fields when the product exists", async () => {
		req.params = { id: "abc123" };
		req.body = { name: "New Name", price: "60.00" };
		mockFindUnique.mockResolvedValue({ id: "abc123" });
		mockUpdate.mockResolvedValue({
			id: "abc123",
			name: "New Name",
			price: 60.0,
		});

		await updateProduct(req as Request, res as Response);

		expect(mockUpdate).toHaveBeenCalledWith({
			where: { id: "abc123" },
			data: { name: "New Name", price: 60.0 },
		});
		expect(statusMock).toHaveBeenCalledWith(200);
		expect(jsonMock).toHaveBeenCalledWith({
			success: true,
			data: { id: "abc123", name: "New Name", price: 60.0 },
		});
	});

	it("should allow updating a single field (category)", async () => {
		req.params = { id: "abc123" };
		req.body = { category: "furniture" };
		mockFindUnique.mockResolvedValue({ id: "abc123" });
		mockUpdate.mockResolvedValue({ id: "abc123" });

		await updateProduct(req as Request, res as Response);

		expect(mockUpdate).toHaveBeenCalledWith({
			where: { id: "abc123" },
			data: { category: { connect: { slug: "furniture" } } },
		});
	});

	it("should return 400 if no id is provided", async () => {
		req.params = {};
		req.body = { name: "New Name" };

		await updateProduct(req as Request, res as Response);

		expect(mockUpdate).not.toHaveBeenCalled();
		expect(statusMock).toHaveBeenCalledWith(400);
	});

	it("should return 400 if no fields are provided to update", async () => {
		req.params = { id: "abc123" };
		req.body = {};

		await updateProduct(req as Request, res as Response);

		expect(mockUpdate).not.toHaveBeenCalled();
		expect(statusMock).toHaveBeenCalledWith(400);
		expect(jsonMock).toHaveBeenCalledWith({
			success: false,
			message: "Provide at least one field to update.",
		});
	});

	it("should return 400 for an invalid price", async () => {
		req.params = { id: "abc123" };
		req.body = { price: "not-a-number" };

		await updateProduct(req as Request, res as Response);

		expect(mockUpdate).not.toHaveBeenCalled();
		expect(statusMock).toHaveBeenCalledWith(400);
	});

	it("should return 400 for a negative price", async () => {
		req.params = { id: "abc123" };
		req.body = { price: "-10" };

		await updateProduct(req as Request, res as Response);

		expect(mockUpdate).not.toHaveBeenCalled();
		expect(statusMock).toHaveBeenCalledWith(400);
	});

	it("should return 404 if the product doesn't exist", async () => {
		req.params = { id: "missing-id" };
		req.body = { name: "New Name" };
		mockFindUnique.mockResolvedValue(null);

		await updateProduct(req as Request, res as Response);

		expect(mockUpdate).not.toHaveBeenCalled();
		expect(statusMock).toHaveBeenCalledWith(404);
	});

	it("should gracefully capture database exceptions and return a 500 state", async () => {
		req.params = { id: "abc123" };
		req.body = { name: "New Name" };
		mockFindUnique.mockResolvedValue({ id: "abc123" });
		mockUpdate.mockRejectedValue(new Error("Database connection dropped"));
		jest.spyOn(console, "error").mockImplementation(() => {});

		await updateProduct(req as Request, res as Response);

		expect(statusMock).toHaveBeenCalledWith(500);
	});
});