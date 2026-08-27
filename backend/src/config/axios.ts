import axios from "axios";
import { requireEnv } from "./env.ts";

const REVIEWS_SERVICE_URL = requireEnv("REVIEWS_SERVICE_URL")

export const reviewsClient = axios.create({
	baseURL: REVIEWS_SERVICE_URL,
	timeout: 5000,
});