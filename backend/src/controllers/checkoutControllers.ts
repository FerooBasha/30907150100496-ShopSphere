import type { Request, Response } from "express";
import { prismaPg } from "../config/dbs.ts";
import { getProductWithImageUrl } from "../util/getProductWithImageUrl.ts";
import { stripe } from "../config/stripe.ts";
import { requireEnv } from "../config/env.ts";

export const createCheckoutSession = async (req: Request, res: Response) => {
	const userId = req.user?.id;

	if (!userId) {
		return res.status(401).json({ message: "Invalid User ID please login" });
	}
	try {
		const cart = await prismaPg.cart.findFirst({
			where: { userId },
			include: {
				items: { include: { product: true } },
			},
		});

		const user = await prismaPg.user.findFirst({
			where: { id: userId },
			omit: { password: true },
		});

		if (!user) {
			return res.status(404).json({
				message: "User not found. please try login and try again.",
			});
		}

		// This is a SCGF (Small Claude Generated Function)
		let stripeCustomerId = user.stripeCustomerId;

		if (!stripeCustomerId) {
			const customer = await stripe.customers.create({
				name: user.username,
				email: user.email,
				metadata: { userId: user.id },
			});
			stripeCustomerId = customer.id;

			await prismaPg.user.update({
				where: { id: user.id },
				data: { stripeCustomerId },
			});
		}

		if (!cart || cart.items.length === 0) {
			return res.status(400).json({
				message:
					"Cart is empty or does not exist. Add items before checking out.",
			});
		}

		let totalAmount = 0;
		const line_items = await Promise.all(
			cart.items.map(async (item) => {
				const itemWithImgUrl = await getProductWithImageUrl(item.product);
				const amount = Math.round(itemWithImgUrl.price * 100);
				totalAmount += amount * item.quantity;

				const images = itemWithImgUrl.imageUrls.filter(
					(url): url is string => url !== null,
				);
				return {
					price_data: {
						currency: "usd",
						product_data: {
							name: itemWithImgUrl.name,
							images,
						},
						unit_amount: amount,
					},
					quantity: item.quantity,
				};
			}),
		);

		const session = await stripe.checkout.sessions.create({
			mode: "payment",
			line_items,
			success_url: `${requireEnv("FRONTEND_URL")}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${requireEnv("FRONTEND_URL")}/cart`,
			customer: stripeCustomerId,
			payment_intent_data: {
				setup_future_usage: "off_session",
			},
			billing_address_collection: "required",
			metadata: {
				userId,
				cartId: cart.id,
			},
		});

		return res.status(200).json({
			message: "Checkout session created successfully",
			id: session.id,
			url: session.url,
			totalAmount: totalAmount / 100,
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ message: "Internal server error", error });
	}
};
