import Stripe from "stripe";
import { requireEnv } from "./env.ts";

export const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
