import { GetObjectCommand } from "@aws-sdk/client-s3";
import type { Product } from "../generated/prisma-postgres/index.js";
import { requireEnv } from "../config/env.ts";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2 } from "../config/r2.ts";

export interface ProductWithImageUrl extends Product {
	imageUrls: (string | null)[];
}

export async function getProductWithImageUrl(
	product: Product,
): Promise<ProductWithImageUrl> {
	const imageUrls = await Promise.all(
		product.imageKeys
			.filter((imageKey): imageKey is string => Boolean(imageKey))
			.map(async (imageKey) => {
				const command = new GetObjectCommand({
					Bucket: requireEnv("BUCKET_NAME"),
					Key: imageKey,
				});
				return getSignedUrl(r2, command, { expiresIn: 3600 }); // 1 hour
			}),
	);

	return { ...product, imageUrls };
}
