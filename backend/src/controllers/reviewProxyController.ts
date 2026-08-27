import type { Request, Response } from "express";
import { AxiosError } from "axios";
import { reviewsClient } from "../config/axios.ts";

export const createReview = async (req: Request, res: Response) => {
	const { id: productId } = req.params;
	
	try {
		const { data } = await reviewsClient.post(
			`/reviews/${productId}`,
			req.body,
			{
				headers: {
					cookie: req.headers.cookie ?? "",
				},
			},
		);
		return res.status(201).json(data);
	} catch (error) {
		if (error instanceof AxiosError && error.response) {
			return res.status(error.response.status).json(error.response.data);
		}
		console.error("Error proxying review creation:", error);
		return res.status(502).json({ message: "Reviews service unavailable" });
	}
};

export const getProductReviews = async (req: Request, res: Response) => {
	const { id: productId } = req.params;
	const url = `/reviews/${productId}`;

	try {
		const { data } = await reviewsClient.get(url, { params: req.query });
		return res.status(200).json(data);
	} catch (error) {
		if (error instanceof AxiosError && error.response) {
			console.log(
				"reviews-service responded with:",
				error.response.status,
				error.response.data,
			);
			return res.status(error.response.status).json(error.response.data);
		}
		console.error("Error proxying review fetch:", error);
		return res.status(502).json({ message: "Reviews service unavailable" });
	}
};
