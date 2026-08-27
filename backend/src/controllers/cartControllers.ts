import type { Request, Response } from "express";
import { prismaPg } from "../config/dbs.ts";
import { getProductWithImageUrl } from "../util/getProductWithImageUrl.ts";

export const getCart = async (req: Request, res: Response) => {
	const userId = req.user?.id;

	if (!userId) {
		return res.status(401).json({ message: "Invalid User ID please login" });
	}
	try {
		const cart = await prismaPg.cart.upsert({
			where: { userId },
			create: { userId, totalAmount: 0 },
			update: {},
			include: {
				items: { include: { product: true } },
			},
		});

		if (!cart) {
			return res
				.status(404)
				.json({ message: "Cart not found try adding an item to it" });
		}

		const formattedCart = {
			...cart,
			items: await Promise.all(
				cart.items.map(async (item) => ({
					...item,
					product: await getProductWithImageUrl(item.product), // your existing function
				})),
			),
		};

		return res.status(200).json(formattedCart);
	} catch (error) {
		console.error(error);
		return res.status(500).json({ message: "Internal server error", error });
	}
};

export const addToCart = async (req: Request, res: Response) => {
	const { id } = req.params;
	const productId = id as string;
	const userId = req.user?.id;

	if (!userId) {
		return res.status(401).json({ message: "Invalid User ID please login" });
	}
	if (!productId) {
		return res
			.status(401)
			.json({ message: "Invalid product ID please try again" });
	}
	try {
		const product = await prismaPg.product.findFirst({
			where: { id: productId },
		});

		if (!product) {
			return res.status(404).json({ message: "Products not found" });
		}
		await prismaPg.cartItem.findMany({
			where: { cart: { userId } },
			select: { price: true, quantity: true },
		});

		const cart = await prismaPg.cart.upsert({
			where: { userId },
			update: {},
			create: { userId: userId, totalAmount: 0 },
		});

		await prismaPg.cartItem.upsert({
			where: {
				cartId_productId: {
					cartId: cart.id,
					productId: product.id,
				},
			},
			update: {
				quantity: { increment: 1 },
			},
			create: {
				cartId: cart.id,
				price: product.price,
				productId: product.id,
				quantity: 1,
			},
		});

		// IDK how this works but hopefully it does
		const items = await prismaPg.cartItem.findMany({
			where: { cartId: cart.id },
			select: { price: true, quantity: true },
		});
		const totalAmount = items.reduce(
			(acc, item) => acc + item.price.mul(item.quantity).toNumber(),
			0,
		);

		const updatedCart = await prismaPg.cart.update({
			where: { id: cart.id },
			data: { totalAmount },
			include: {
				items: {
					include: {
						product: true,
					},
				},
			},
		});

		const formattedCart = {
			...cart,
			items: await Promise.all(
				updatedCart.items.map(async (item) => ({
					...item,
					product: await getProductWithImageUrl(item.product),
				})),
			),
		};

		return res
			.status(201)
			.json({ message: "Product added successfully", formattedCart });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ message: "Internal server error", error });
	}
};

export const updateCartItem = async (req: Request, res: Response) => {
	const { id } = req.params;
	const productId = id as string;

	const userId = req.user?.id;

	const add = req.body.add === "true";

	if (!userId) {
		return res.status(401).json({ message: "Invalid User ID please login" });
	}
	if (!productId || !req.body.add) {
		return res
			.status(401)
			.json({ message: "Invalid or missing field(s) please try again" });
	}
	try {
		const cartItem = await prismaPg.cartItem.findFirst({
			where: {
				productId,
				cart: { userId },
			},
			include: { product: { select: { price: true } } },
		});

		if (!cartItem) {
			return res.status(404).json({ message: "Cart item not found" });
		}

		if (cartItem?.quantity - 1 <= 0 && !add) {
			await prismaPg.cart.update({
				where: { id: cartItem.cartId },
				data: {
					totalAmount: { decrement: cartItem.price.mul(cartItem.quantity) },
					items: { delete: { id: cartItem.id } },
				},
			});
			return res.status(200).json({ message: "Product deleted successfully" });
		}
		const newCartItem = await prismaPg.cartItem.update({
			where: { id: cartItem.id },
			data: { quantity: { [add ? "increment" : "decrement"]: 1 } },
			include: { product: true },
		});

		await prismaPg.cart.update({
			where: { id: cartItem.cartId },
			data: {
				totalAmount: {
					[add ? "increment" : "decrement"]: cartItem.product.price,
				},
			},
			include: { items: true },
		});

		const formattedCartItem = {
			...newCartItem,
			product: await getProductWithImageUrl(newCartItem.product),
		};

		return res.status(200).json({
			message: "Item updated successfully",
			cartItem: formattedCartItem,
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ message: "Internal server error", error });
	}
};

export const removeFromCart = async (req: Request, res: Response) => {
	const { id } = req.params;
	const productId = id as string;
	const userId = req.user?.id;

	if (!userId) {
		return res.status(401).json({ message: "Invalid User ID please login" });
	}
	if (!productId) {
		return res
			.status(401)
			.json({ message: "Invalid product ID please try again" });
	}

	try {
		const cartItem = await prismaPg.cartItem.findFirst({
			where: {
				productId,
				cart: { userId },
			},
			include: { product: { select: { price: true } } },
		});

		if (!cartItem) {
			return res.status(404).json({ message: "Cart item not found" });
		}

		await prismaPg.cartItem.delete({
			where: { id: cartItem.id },
		});

		await prismaPg.cart.update({
			where: { id: cartItem.cartId },
			data: {
				totalAmount: {
					decrement: cartItem.product.price * cartItem.quantity,
				},
			},
			include: { items: true },
		});

		return res.status(200).json({ message: "Item deleted successfully" });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ message: "Internal server error", error });
	}
};
