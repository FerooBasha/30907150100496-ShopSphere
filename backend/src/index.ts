import express from "express";
import dotenv from "dotenv";
import HealthRouter from "./routes/healthRouter.ts";
import ProductRouter from "./routes/productsRouter.js";
import AuthRouter from "./routes/authRouter.js";
import OrderRouter from "./routes/orderRoutes.ts";
import CartRouter from "./routes/cartRoute.ts";
import CheckoutRouter from "./routes/checkoutRouter.ts";
import InternalRouter from "./routes/internalRoutes.ts";
import ReviewsRouter from "./routes/reviewRoutes.ts";
import WebhookRouter from "./routes/webhookRoutes.ts";
import { connectDBs, disconnectDBs } from "./config/dbs.ts";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { rateLimiter } from "./middleware/ratelimite.ts";

const app = express();

dotenv.config();  

const CORS_ORIGIN = process.env.FRONTEND_URL || "http://localhost:5173/";

app.set("trust proxy", 1);

app.use(helmet());

app.use(
	cors({
		origin: CORS_ORIGIN,
		credentials: true,
	}),
);

app.use(cookieParser());

app.use(rateLimiter);

app.use("/api/webhooks/", WebhookRouter);

app.use(express.json());


const PORT = process.env.PORT || 5001;

app.use("/api/health", HealthRouter)
app.use("/api/products", ProductRouter);
app.use("/api/auth", AuthRouter);
app.use("/api/orders", OrderRouter);
app.use("/api/cart", CartRouter);
app.use("/api/checkout", CheckoutRouter);
app.use("/api/internal", InternalRouter);
app.use("/api/reviews", ReviewsRouter);

let server: ReturnType<typeof app.listen>;

connectDBs().then(() => {
	server = app.listen(PORT, () => {
		console.log(`Server is running at: http:localhost:${PORT}`);
	});
});

// Three error handling functions got from https://github.com/machadop1407/NodeJS-ExpressJS-BackendCourse/blob/main/src/server.js
// Handle unhandled promise rejections (e.g., database connection errors)
process.on("unhandledRejection", (err) => {
	console.error("Unhandled Rejection:", err);
	server.close(async () => {
		await disconnectDBs();
		process.exit(1);
	});
});

// Handle uncaught exceptions
process.on("uncaughtException", async (err) => {
	console.error("Uncaught Exception:", err);
	await disconnectDBs();
	process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
	console.log("SIGTERM received, shutting down gracefully");
	server.close(async () => {
		await disconnectDBs();
		process.exit(0);
	});
});

export default app;
