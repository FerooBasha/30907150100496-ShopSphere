import type { Request, Response } from "express";
import { prismaPg } from "../config/dbs.ts";

export const checkProductExists = async (req: Request, res: Response) => {
	console.log("test");
	
	const exists = await prismaPg.product.findUnique({
		where: { id: req.params.id as string },
		select: { id: true },
	});
	
	if (!exists) return res.status(404).end();
	return res.status(200).end();
};

export const updateProductRating = async (req: Request, res: Response) => {
	console.log("test");
	const { reviewRating, reviewCount } = req.body;
	await prismaPg.product.update({
		where: { id: req.params.id as string },
		data: { reviewRating, reviewCount },
	});
	return res.status(200).end();
};
