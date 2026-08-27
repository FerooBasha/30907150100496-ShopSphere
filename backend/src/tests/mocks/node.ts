import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

export const handlers = [
	// Intercept GET requests to our own backend products API
	http.get("http://localhost:3000/api/products", ({ request }) => {
		const url = new URL(request.url);
		const search = url.searchParams.get("search");

		// Dynamic mock logic: if searching for "Lemon", return mock lemon data
		if (search === "Lemon") {
			return HttpResponse.json(
				{
					success: true,
					pagination: {
						totalItems: 2,
						currentPage: 1,
						totalPages: 1,
						limit: 10,
					},
					data: [
						{
							id: 1,
							name: "Mocked MSW Sour Lemon",
							price: 5.99,
							category: "Fruits",
						},
						{
							id: 2,
							name: "Mocked MSW Sweet Lemon",
							price: 2.99,
							category: "Fruits",
						},
					],
				},
				{ status: 200 },
			);
		}

		// Default mock response (empty state)
		return HttpResponse.json(
			{
				success: true,
				pagination: { totalItems: 0, currentPage: 1, totalPages: 0, limit: 10 },
				data: [],
			},
			{ status: 200 },
		);
	}),
];

export const mswServer = setupServer(...handlers);
