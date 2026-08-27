import { PrismaClient as PrismaPgClient  } from "../generated/prisma-postgres/client.js";
import { PrismaClient as PrismaMongoClient } from "../generated/prisma-mongo/client.js";
import "dotenv/config.js";



export const prismaPg = new PrismaPgClient({
	log:
		process.env.NODE_ENV === "development"
			? ["query", "error", "warn"]
			: ["error"],
});

export const prismaMongo = new PrismaMongoClient({
	log:
		process.env.NODE_ENV === "development"
			? ["query", "error", "warn"]
			: ["error"],
});

export const connectDBs = async () => {
	try {
		await prismaPg.$connect();
		console.log("PostgreSQL Connected Successfully");
		await prismaMongo.$connect();
		console.log("MongoDB Connected Successfully");
	} catch (error: unknown) {
		if (error instanceof Error) {
			console.error("Database connection error: ", error.message);
		} else {
			// Handles fallback cases if a non-Error
			console.error("An unexpected error occurred:", String(error));
			process.exit(1);
		}
	}
};

export const disconnectDBs = async () => {
	try {
		await prismaPg.$disconnect();
		console.log("PostgreSQL Connected Successfully");
		await prismaMongo.$disconnect();
		console.log("MongoDB Connected Successfully");
	} catch (error: unknown) {
		if (error instanceof Error) {
			console.error("Database disconnection error: ", error.message);
		} else {
			// Handles fallback cases if a non-Error
			console.error("An unexpected error occurred:", String(error));
			process.exit(1);
		}
	}
};
