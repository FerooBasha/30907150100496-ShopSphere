import { describe, it, expect, beforeEach, afterEach, afterAll } from "@jest/globals";
import request from "supertest";
import express from "express";
import productsRouter from "../routes/productsRouter.js";
import { prismaPg } from "../config/dbs.ts";

const app = express();
app.use(express.json());
app.use("/api/products", productsRouter);

// NOTE: getProducts resolves image URLs via R2 for every product returned.
// These tests use products with no imageKeys so that code path is a no-op
// and no real R2 credentials/network access are required.

async function seedCategory(slug: string, name = slug) {
	return prismaPg.category.create({ data: { name, slug } });
}

describe("Products API - Integration Tests", () => {
	beforeEach(async () => {
		await prismaPg.product.deleteMany();
		await prismaPg.category.deleteMany();
	});

	afterEach(async () => {
		await prismaPg.product.deleteMany();
		await prismaPg.category.deleteMany();
	});

	afterAll(async () => {
		await prismaPg.$disconnect();
	});

	it("GET /api/products - should return empty pagination data when no items exist", async () => {
		const response = await request(app).get("/api/products");

		expect(response.status).toBe(200);
		expect(response.body).toEqual({
			success: true,
			pagination: {
				totalItems: 0,
				currentPage: 1,
				totalPages: 0,
				limit: 20,
			},
			data: [],
		});
	});

	it("GET /api/products - should apply search, category, and sorting filters against real data", async () => {
		const fruits = await seedCategory("fruits", "Fruits");
		const electronics = await seedCategory("electronics", "Electronics");

		await prismaPg.product.createMany({
			data: [
				{
					name: "Sour Bricked Lemon",
					price: 5.99,
					description: "A tart, bricked lemon.",
					categoryId: fruits.id,
					imageKeys: [],
				},
				{
					name: "Sweet Yellow Lemon",
					price: 2.99,
					description: "A sweet yellow lemon.",
					categoryId: fruits.id,
					imageKeys: [],
				},
				{
					name: "Mechanical Keyboard",
					price: 89.99,
					description: "A clicky mechanical keyboard.",
					categoryId: electronics.id,
					imageKeys: [],
				},
			],
		});

		const response = await request(app).get("/api/products").query({
			search: "Lemon",
			category: "fruits",
			orderBy: "price",
			orderDirection: "asc",
		});

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data).toHaveLength(2);
		expect(response.body.data[0].name).toBe("Sweet Yellow Lemon");
		expect(response.body.data[1].name).toBe("Sour Bricked Lemon");
		expect(response.body.pagination.totalItems).toBe(2);
	});

	it("GET /api/products - should filter by price range", async () => {
		const category = await seedCategory("misc", "Misc");
		await prismaPg.product.createMany({
			data: [
				{
					name: "Cheap Widget",
					price: 3,
					description: "Cheap.",
					categoryId: category.id,
					imageKeys: [],
				},
				{
					name: "Mid Widget",
					price: 30,
					description: "Mid range.",
					categoryId: category.id,
					imageKeys: [],
				},
				{
					name: "Pricey Widget",
					price: 300,
					description: "Expensive.",
					categoryId: category.id,
					imageKeys: [],
				},
			],
		});

		const response = await request(app)
			.get("/api/products")
			.query({ minPrice: "10", maxPrice: "100" });

		expect(response.status).toBe(200);
		expect(response.body.data).toHaveLength(1);
		expect(response.body.data[0].name).toBe("Mid Widget");
	});

	it("GET /api/products - should return 413 when limit exceeds 100", async () => {
		const response = await request(app)
			.get("/api/products")
			.query({ limit: "200" });

		expect(response.status).toBe(413);
	});

	it("GET /api/products/:id - should return 404 for an unknown id", async () => {
		const response = await request(app).get(
			"/api/products/00000000-0000-0000-0000-000000000000",
		);

		expect(response.status).toBe(404);
	});

	it("GET /api/products/:id - should return the product for a known id", async () => {
		const category = await seedCategory("books", "Books");
		const product = await prismaPg.product.create({
			data: {
				name: "Bricked Lemons: The Novel",
				price: 12.5,
				description: "A gripping tale.",
				categoryId: category.id,
				imageKeys: [],
			},
		});

		const response = await request(app).get(`/api/products/${product.id}`);

		expect(response.status).toBe(200);
		expect(response.body.data.id).toBe(product.id);
	});
});