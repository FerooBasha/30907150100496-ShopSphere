import {
	describe,
	it,
	expect,
	beforeAll,
	afterEach,
	afterAll,
} from "@jest/globals";
import { mswServer } from "./mocks/node.js";

describe("Products API - Mocked via MSW", () => {
	// Start MSW interception before tests run
	beforeAll(() => mswServer.listen({ onUnhandledRequest: "error" }));

	// Clean up handlers between tests
	afterEach(() => mswServer.resetHandlers());

	// Shut down completely when done
	afterAll(() => mswServer.close());

	it("should catch request and return empty mocked structure when no search query is sent", async () => {
		const response = await fetch("http://localhost:3000/api/products");
		const body = (await response.json()) as any;

		expect(response.status).toBe(200);
		expect(body.success).toBe(true);
		expect(body.data).toHaveLength(0);
	});

	it("should return filtered mock items when searching for 'Lemon'", async () => {
		const response = await fetch(
			"http://localhost:3000/api/products?search=Lemon",
		);
		const body = (await response.json()) as any;

		expect(response.status).toBe(200);
		expect(body.data).toHaveLength(2);
		expect(body.data[0].name).toBe("Mocked MSW Sour Lemon");
	});
});
