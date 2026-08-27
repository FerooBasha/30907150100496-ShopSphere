import type { Request, Response } from "express";
import { prismaPg } from "../config/dbs.ts";
import { requireEnv } from "../config/env.ts";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import path from "path";
import { r2 } from "../config/r2.ts";
import type { Prisma } from "../generated/prisma-postgres/index.js";
import { getProductWithImageUrl, type ProductWithImageUrl } from "../util/getProductWithImageUrl.ts";

// function with pagination, filtering, and search queries n stuff
export const getProducts = async (
	req: Request,
	res: Response,
): Promise<void> => {
	try {
		const {
			search,
			category,
			orderBy = "createdAt",
			orderDirection = "desc",
			minPrice,
			maxPrice,
			page = "1",
			limit = "20",
		} = req.query;

		const pageNum = parseInt(page as string, 10) || 1;
		const limitNum = parseInt(limit as string, 10) || 10;
		const skip = (pageNum - 1) * limitNum;

		if (limitNum > 100) {
			res.status(413).json({ message: "Page size larger than 100" });
			return;
		}

		const whereClause: any = {};

		if (search) {
			whereClause.name = {
				contains: search as string,
				mode: "insensitive",
			};
		}

		if (category) {
			whereClause.category = {
				slug: category as string,
			};
		}

		if (minPrice !== undefined || maxPrice !== undefined) {
			whereClause.price = {};

			if (minPrice !== undefined) {
				const min = parseFloat(minPrice as string);
				if (!isNaN(min)) whereClause.price.gte = min;
			}

			if (maxPrice !== undefined) {
				const max = parseFloat(maxPrice as string);
				if (!isNaN(max)) whereClause.price.lte = max;
			}

			if (Object.keys(whereClause.price).length === 0) {
				delete whereClause.price;
			}
		}

		const allowedOrderFields = ["createdAt", "price", "name", "reviewRating"];
		const allowedDirections = ["asc", "desc"];

		const orderField = allowedOrderFields.includes(orderBy as string)
			? (orderBy as string)
			: "createdAt";

		const orderDir = allowedDirections.includes(orderDirection as string)
			? (orderDirection as string)
			: "desc";

		const orderByClause: any = { [orderField]: orderDir };

		const [products, totalItems] = await Promise.all([
			prismaPg.product.findMany({
				where: whereClause,
				orderBy: orderByClause,
				skip,
				take: limitNum,
				include: {category: true}
			}),
			prismaPg.product.count({ where: whereClause }),
		]);

		const productsWithImageUrls: ProductWithImageUrl[] = await Promise.all(
			products.map(async (product) => {
				return await getProductWithImageUrl(product);
			}),
		);

		res.status(200).json({
			success: true,
			pagination: {
				totalItems,
				currentPage: pageNum,
				totalPages: Math.ceil(totalItems / limitNum),
				limit: limitNum,
			},
			data: productsWithImageUrls,
		});
	} catch (error) {
		console.error("Error fetching products:", error);
		res.status(500).json({
			success: false,
			message: "Server encountered an error while retrieving products.",
		});
	}
};

export const getProductById = async (
	req: Request,
	res: Response,
): Promise<void> => {
	try {
		const { id } = req.params;
		if (!id) {
			res.status(400).json({
				success: false,
				message: "Product ID is required.",
			});
			return;
		}
		const product = await prismaPg.product.findUnique({
			where: { id: id as string },
			include: {category: true}
		});

		if (!product) {
			res.status(404).json({
				success: false,
				message: "Product not found.",
			});
			return;
		}

		res.status(200).json({
			success: true,
			data: await getProductWithImageUrl(product),
		});
	} catch (error) {
		console.error("Error fetching product by ID:", error);
		res.status(500).json({
			success: false,
			message: "Server encountered an error while retrieving the product.",
		});
	}
};

export const createProduct = async (
	req: Request,
	res: Response,
): Promise<void> => {
	try {
		const { name, price, category, description } = req.body;

		if (!name || !price || !category || !description) {
			res.status(400).json({
				success: false,
				message: "Not all fields are filled",
			});
			return;
		}

		const files = req.files as Express.Multer.File[];

		if (!files || files.length === 0) {
			res.status(400).json({
				success: false,
				message: "At least one image file is required.",
			});
			return;
		}

		const imageKeys = await Promise.all(
			files.map(async (file) => {
				const ext = path.extname(file.originalname).toLowerCase();
				const key = `products/${crypto.randomUUID()}${ext}`;

				await r2.send(
					new PutObjectCommand({
						Bucket: requireEnv("BUCKET_NAME"),
						Key: key,
						Body: file.buffer,
						ContentType: file.mimetype,
					}),
				);

				return key;
			}),
		);

		const product = await prismaPg.product.create({
			data: {
				name: name,
				price: parseFloat(price as string),
				category: { connect: { slug: category as string } },
				description: description as string,
				imageKeys,
			},
		});

		res.status(201).json({
			success: true,
			data: product,
		});
	} catch (error) {
		console.error("Error creating product:", error);
		res.status(500).json({
			success: false,
			message: "Server encountered an error while creating the product.",
		});
	}
};

export const updateProduct = async (
	req: Request,
	res: Response,
): Promise<void> => {
	try {
		const { id } = req.params;
		const { name, price, category, description } = req.body;

		if (!id) {
			res.status(400).json({
				success: false,
				message: "Product ID is required.",
			});
			return;
		}

		if (
			name === undefined &&
			price === undefined &&
			category === undefined &&
			description === undefined
		) {
			res.status(400).json({
				success: false,
				message: "Provide at least one field to update.",
			});
			return;
		}

		const data: Prisma.ProductUpdateInput = {};

		if (name !== undefined) data.name = name as string;
		// if (imageLink !== undefined) data.imageLink = imageLink as string;
		if (category !== undefined) {
			data.category = { connect: { slug: category as string } };
		}

		if (price !== undefined) {
			const parsedPrice = parseFloat(price as string);
			if (isNaN(parsedPrice) || parsedPrice < 0) {
				res.status(400).json({
					success: false,
					message: "price must be a valid non-negative number.",
				});
				return;
			}
			data.price = parsedPrice;
		}

		const existing = await prismaPg.product.findUnique({
			where: { id: id as string },
		});
		if (!existing) {
			res.status(404).json({
				success: false,
				message: "Product not found.",
			});
			return;
		}

		const product = await prismaPg.product.update({
			where: { id: id as string },
			data,
		});

		res.status(200).json({
			success: true,
			data: product,
		});
	} catch (error) {
		console.error("Error updating product:", error);
		res.status(500).json({
			success: false,
			message: "Server encountered an error while updating the product.",
		});
	}
};
