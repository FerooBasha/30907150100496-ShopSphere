import type { Request, Response } from "express";
import type Stripe from "stripe";
import { requireEnv } from "../config/env.ts";
import { stripe } from "../config/stripe.ts";
import { prismaPg } from "../config/dbs.ts";

export const handleStripeWebhook = async (req: Request, res: Response) => {
	const sig = req.headers["stripe-signature"]!;

	let event: Stripe.Event;
	try {
		event = stripe.webhooks.constructEvent(
			req.body,
			sig,
			requireEnv("NODE_ENV") === "development"
				? requireEnv("STRIPE_DEVELOPMENT_WEBHOOK_SECRET")
				: requireEnv("STRIPE_PRODUCTION_WEBHOOK_SECRET"),
		);
	} catch (err) {
		return res.status(400).send(`Webhook Error: ${(err as Error).message}`);
	}

	if (event.type === "checkout.session.completed") {
		const session = event.data.object as Stripe.Checkout.Session;
		const { userId, cartId } = session.metadata ?? {};

		if (!userId || !cartId) {
			console.error("Missing metadata on session", session.id);
			return res.status(400).json({ error: "Missing required metadata" });
		}

		// Order creation logic taken from ./orderController.ts written by MintyEcho
		try {
			const cart = await prismaPg.cart.findFirst({
				where: { userId },
				include: {
					items: true,
				},
			});

			if (!cart || cart.items.length === 0) {
				return res.status(400).json({
					message:
						"Cart is empty or does not exist. Add items before checking out.",
				});
			}

			const OrderItemsData = cart.items.map((item) => ({
				productId: item.productId,
				quantity: item.quantity,
				price: item.price,
			}));

			const totalAmount = cart.items.reduce(
				(acc, item) => acc + item.price.mul(item.quantity).toNumber(),
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

			return res
				.status(201)
				.json({ message: "Order created successfully", order });
		} catch (error) {
			console.error(error);
			return res.status(500).json({ message: "Internal server error", error });
		}
	}
	return res.json({ received: true });
};
