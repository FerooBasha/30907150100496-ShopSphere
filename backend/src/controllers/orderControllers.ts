import type { Request, Response } from "express";
import { prismaPg } from "../config/dbs.ts";

// Dead code replaced by ./webhookController/handleStripeWebhook (route disabled)
export const createOrder = async (req: Request, res: Response) => {
	const userId = req.user?.id;

	if (!userId) {
		return res.status(401).json({ message: "Invalid User ID please login" });
	}

	try {

		const cart = await prismaPg.cart.findFirst({
			where: { userId },
			include: {
				items: true,
			},
		});

		if (!cart || cart.items.length === 0) {
			return res
				.status(400)
				.json({ message: "Cart is empty or does not exist. Add items before checking out." });
		}

		const OrderItemsData = cart.items.map((item) => ({
			productId: item.productId,
			quantity: item.quantity,
			price: item.price,
		}));

		const totalAmount = cart.items.reduce(
			(acc, item) =>  acc + item.price.mul(item.quantity).toNumber(),
			0,
		);

		const [order] = await prismaPg.$transaction([
			prismaPg.order.create({
				data: {
					userId: userId,
					totalAmount: totalAmount,
					status: "PENDING",
					items: {
						create: OrderItemsData,
					},
				},
				include: { items: { include: { product: true } } }, 
			}),

			prismaPg.cartItem.deleteMany({
				where: { cartId: cart.id },
			}),

			prismaPg.cart.update({
				where: { id: cart.id },
				data: { totalAmount: 0 },
			}),
		]);

		return res.status(201).json({ message: "Order created successfully", order });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ message: "Internal server error", error });
	}
};

export const getOrders = async (req: Request, res: Response) => {
	const userId = req.user?.id;

	if (!userId) {
		return res.status(401).json({ message: "Invalid User ID please login" });
	}

	try {
		const orders = await prismaPg.order.findMany({
			where: { userId },
			include: { items: { include: { product: true } } },
			orderBy: { createdAt: "desc" },
		});

		res.status(200).json({ orders });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ message: "Internal server error", error });
	}
};
