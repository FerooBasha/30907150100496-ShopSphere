import {
	Prisma,
	PrismaClient,
} from "../../src/generated/prisma-postgres/index.js";
import pg from "pg";
import bcrypt from "bcrypt";

// 1. Set up the native pg connection pool using your environment variable
const pool = new pg.Pool({ connectionString: process.env.PSQL_DATABASE_URL });

// 2. Pass the adapter directly into the constructor to satisfy engineType = "client"
const prisma = new PrismaClient();

const categories = [
	{
		name: "GPU",
		slug: "gpu",
		description: "Graphics cards for gaming and rendering",
	},
	{ name: "CPU", slug: "cpu", description: "Processors for desktop builds" },
	{ name: "RAM", slug: "ram", description: "System memory modules" },
	{ name: "Storage", slug: "storage", description: "SSDs and hard drives" },
	{
		name: "Monitor",
		slug: "monitor",
		description: "Displays and gaming monitors",
	},
	{
		name: "Peripherals",
		slug: "peripherals",
		description: "Mice, keyboards, and other input devices",
	},
	{
		name: "Networking",
		slug: "networking",
		description: "Routers, mesh systems, and switches",
	},
	{
		name: "Audio",
		slug: "audio",
		description: "Headsets, microphones, and audio gear",
	},
];

// keys for seeded images
// Upload them to your bucket at products/"your-image-name"
const nvidiaGPUImage = "what-is-a-gpu-770x462.jpg"
const AMDGPUImage = "AMD-GPU.jpg"
const AMDCPUImage = "cpu-amd-ryzen-9-9950x-box-am5-without-fan.jpg"
const IntelCPUImage = "61iMaYoZ0sL._AC_UF894,1000_QL80_.jpg"
const RAMImage = "ram.jpg"
const SSDImage = "71OWtcxKgvL.jpg"
const HDDImage = "61EzYF3znjL.jpg"
const monitorImage = "monitor.jpg"
const mouseImage = "Logitech-G-PRO-X-SUPERLIGHT-Wireless-Gaming-Mouse-Black_c481f5fa-9934-4ed7-94af-29a598bd3b2e.03017ee44c6bb06a233bf23cbdd4f52b.jpeg"
const keyBoardImage = "akko-tkl-keyboard.jpg"
const networkingImage = "71luV33389L._AC_SL1500_.jpg"
const audioImage = "hyperx_cloud_alpha_blackred_1_main_1024x1024.jpg"

const productsBySlug: Record<
	string,
	{
		name: string;
		price: number;
		imageKey: string;
		reviewRating: number;
		reviewCount: number;
	}[]
> = {
	gpu: [
		{
			name: "NVIDIA GeForce RTX 4090 24GB",
			price: 1599.99,
			imageKey:
				`products/${nvidiaGPUImage}`,
			reviewRating: 0,
			reviewCount: 0,
		},
		{
			name: "NVIDIA GeForce RTX 4080 Super 16GB",
			price: 999.99,
			imageKey:
				`products/${nvidiaGPUImage}`,
			reviewRating: 0,
			reviewCount: 0,
		},
		{
			name: "NVIDIA GeForce RTX 4070 Ti Super 16GB",
			price: 799.99,
			imageKey:
				`products/${nvidiaGPUImage}`,
			reviewRating: 0,
			reviewCount: 0,
		},
		{
			name: "AMD Radeon RX 7900 XTX 24GB",
			price: 929.99,
			imageKey:
				`products/${AMDGPUImage}`,
			reviewRating: 0,
			reviewCount: 0,
		},
		{
			name: "AMD Radeon RX 7800 XT 16GB",
			price: 499.99,
			imageKey:
				`products/${AMDGPUImage}`,
			reviewRating: 0,
			reviewCount: 0,
		},
	],
	cpu: [
		{
			name: "AMD Ryzen 7 7800X3D",
			price: 369.99,
			imageKey:
				`products/${AMDCPUImage}`,
			reviewRating: 0,
			reviewCount: 0,
		},
		{
			name: "AMD Ryzen 9 7950X",
			price: 549.99,
			imageKey:
				`products/${AMDCPUImage}`,
			reviewRating: 0,
			reviewCount: 0,
		},
		{
			name: "Intel Core i9-14900K",
			price: 529.99,
			imageKey:
				`products/${IntelCPUImage}`,
			reviewRating: 0,
			reviewCount: 0,
		},
		{
			name: "Intel Core i7-14700K",
			price: 389.99,
			imageKey:
				`products/${IntelCPUImage}`,
			reviewRating: 0,
			reviewCount: 0,
		},
		{
			name: "Intel Core i5-14600K",
			price: 299.99,
			imageKey:
				`products/${IntelCPUImage}`,
			reviewRating: 0,
			reviewCount: 0,
		},
	],
	ram: [
		{
			name: "Corsair Vengeance RGB DDR5 32GB (2x16GB) 6000MHz",
			price: 119.99,
			imageKey:
				`products/${RAMImage}`,
			reviewRating: 0,
			reviewCount: 0,
		},
		{
			name: "G.Skill Trident Z5 Neo RGB DDR5 64GB (2x32GB) 6000MHz",
			price: 209.99,
			imageKey:
				`products/${RAMImage}`,
			reviewRating: 0,
			reviewCount: 0,
		},
		{
			name: "Teamgroup T-Force Delta RGB DDR5 32GB (2x16GB) 6400MHz",
			price: 104.99,
			imageKey:
				`products/${RAMImage}`,
			reviewRating: 0,
			reviewCount: 0,
		},
		{
			name: "Crucial Pro DDR5 32GB (2x16GB) 5600MHz",
			price: 89.99,
			imageKey:
				`products/${RAMImage}`,
			reviewRating: 0,
			reviewCount: 0,
		},
		{
			name: "Kingston FURY Beast DDR5 16GB (2x8GB) 5200MHz",
			price: 64.99,
			imageKey:
				`products/${RAMImage}`,
			reviewRating: 0,
			reviewCount: 0,
		},
	],
	storage: [
		{
			name: "Samsung 990 PRO NVMe M.2 SSD 2TB",
			price: 169.99,
			imageKey: `products/${SSDImage}`,
			reviewRating: 0,
			reviewCount: 0,
		},
		{
			name: "Crucial T700 PCIe 5.0 NVMe M.2 SSD 2TB",
			price: 249.99,
			imageKey: `products/${SSDImage}`,
			reviewRating: 0,
			reviewCount: 0,
		},
		{
			name: "Western Digital Black SN855X NVMe M.2 SSD 1TB",
			price: 94.99,
			imageKey: `products/${SSDImage}`,
			reviewRating: 0,
			reviewCount: 0,
		},
		{
			name: "Seagate IronWolf Pro 8TB NAS Internal Hard Drive",
			price: 199.99,
			imageKey: `products/${HDDImage}`,
			reviewRating: 0,
			reviewCount: 0,
		},
		{
			name: "Crucial X9 Pro Portable SSD 2TB",
			price: 139.99,
			imageKey: `products/${SSDImage}`,
			reviewRating: 0,
			reviewCount: 0,
		},
	],
	monitor: [
		{
			name: 'ASUS ROG Swift 32" 4K OLED PG32UCDM',
			price: 1299.99,
			imageKey:
				`products/${monitorImage}`,
			reviewRating: 0,
			reviewCount: 0,
		},
		{
			name: 'Alienware 34" Curved QD-OLED AW3423DWF',
			price: 799.99,
			imageKey:
				`products/${monitorImage}`,
			reviewRating: 0,
			reviewCount: 0,
		},
		{
			name: 'LG UltraGear 27" QHD IPS 27GP850-B',
			price: 299.99,
			imageKey:
				`products/${monitorImage}`,
			reviewRating: 0,
			reviewCount: 0,
		},
		{
			name: 'Samsung Odyssey G9 49" Curved Gaming Monitor',
			price: 1099.99,
			imageKey:
				`products/${monitorImage}`,
			reviewRating: 0,
			reviewCount: 0,
		},
		{
			name: 'Gigabyte M27Q 27" 170Hz KVM Monitor',
			price: 249.99,
			imageKey:
				`products/${monitorImage}`,
			reviewRating: 0,
			reviewCount: 0,
		},
	],
	peripherals: [
		{
			name: "Logitech G Pro X Superlight 2 Gaming Mouse",
			price: 149.99,
			imageKey:
				`products/${mouseImage}`,
			reviewRating: 0,
			reviewCount: 0,
		},
		{
			name: "Razer DeathAdder V3 Pro Wireless Mouse",
			price: 139.99,
			imageKey:
				`products/${mouseImage}`,
			reviewRating: 0,
			reviewCount: 0,
		},
		{
			name: "ASUS ROG Azoth Wireless Mechanical Keyboard",
			price: 249.99,
			imageKey:
				`products/${keyBoardImage}`,
			reviewRating: 0,
			reviewCount: 0,
		},
		{
			name: "Keychron Q1 Pro Custom Mechanical Keyboard",
			price: 199.99,
			imageKey:
				`products/${keyBoardImage}`,
			reviewRating: 0,
			reviewCount: 0,
		},
		{
			name: "SteelSeries Apex Pro TKL Mechanical Keyboard",
			price: 179.99,
			imageKey:
				`products/${keyBoardImage}`,
			reviewRating: 0,
			reviewCount: 0,
		},
	],
	networking: [
		{
			name: "ASUS ROG Rapture GT6 Wi-Fi 6E Mesh System",
			price: 429.99,
			imageKey:
				`products/${networkingImage}`,
			reviewRating: 0,
			reviewCount: 0,
		},
		{
			name: "Netgear Nighthawk WiFi 7 Router RS700",
			price: 699.99,
			imageKey:
				`products/${networkingImage}`,
			reviewRating: 0,
			reviewCount: 0,
		},
		{
			name: "TP-Link Deco AX3000 Whole Home Mesh System",
			price: 179.99,
			imageKey:
				`products/${networkingImage}`,
			reviewRating: 0,
			reviewCount: 0,
		},
		{
			name: "Ubiquiti UniFi Dream Machine Professional",
			price: 379.99,
			imageKey:
				`products/${networkingImage}`,
			reviewRating: 0,
			reviewCount: 0,
		},
		{
			name: "Netgear 8-Port Gigabit Ethernet Unmanaged Switch",
			price: 29.99,
			imageKey:
				`products/${networkingImage}`,
			reviewRating: 0,
			reviewCount: 0,
		},
	],
	audio: [
		{
			name: "SteelSeries Arctis Nova Pro Wireless Headset",
			price: 349.99,
			imageKey:
				`products/${audioImage}`,
			reviewRating: 0,
			reviewCount: 0,
		},
		{
			name: "HyperX Cloud Alpha Wireless Gaming Headset",
			price: 169.99,
			imageKey:
				`products/${audioImage}`,
			reviewRating: 0,
			reviewCount: 0,
		},
		{
			name: "Audio-Technica ATH-M50x Professional Studio Headphones",
			price: 149.99,
			imageKey:
				`products/${audioImage}`,
			reviewRating: 0,
			reviewCount: 0,
		},
		{
			name: "Shure SM7B Vocal Microphone",
			price: 399.99,
			imageKey:
				`products/${audioImage}`,
			reviewRating: 0,
			reviewCount: 0,
		},
		{
			name: "Rodecaster Pro II Audio Production Studio",
			price: 699.99,
			imageKey:
				`products/${audioImage}`,
			reviewRating: 0,
			reviewCount: 0,
		},
	],
};

async function seedCategories() {
	console.log("Seeding categories...");

	const seeded = await Promise.all(
		categories.map((category) =>
			prisma.category.upsert({
				where: { slug: category.slug },
				update: {},
				create: category,
			}),
		),
	);

	console.log(`Seeded ${seeded.length} categories.`);
	return Object.fromEntries(seeded.map((c) => [c.slug, c.id]));
}

async function main() {
	console.log("Starting database seeding with Driver Adapter...");

	// Clean out existing data
	await prisma.product.deleteMany();
	await prisma.user.deleteMany();
	await prisma.category.deleteMany();
	const adminUsername = process.env.DEFAULT_ADMIN_USERNAME || "admin";
	const adminEmail =
		process.env.DEFAULT_ADMIN_EMAIL || "admin@brickedlemons.com";
	const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || "Change_Me";
	const hashedPassword = await bcrypt.hash(adminPassword, 12);
	console.log("Seeding users...");
	await prisma.user.create({
		data: {
			username: adminUsername,
			email: adminEmail,
			password: hashedPassword,
			imageKey: "",
			role: "ADMIN",
		},
	});

	async function seedProducts(categoryIdBySlug: Record<string, string>) {
		console.log("Seeding products...");

		let count = 0;

		for (const [slug, products] of Object.entries(productsBySlug)) {
			const categoryId = categoryIdBySlug[slug];
			if (!categoryId) {
				console.warn(
					`No category found for slug "${slug}", skipping its products.`,
				);
				continue;
			}

			for (const product of products) {
				await prisma.product.upsert({
					where: {
						name: product.name,
					} as Prisma.ProductWhereUniqueInput,
					update: {},
					create: {
						name: product.name,
						price: product.price,
						description: `${product.name} — a top pick in our ${slug} lineup.`,
						imageKeys: [product.imageKey],
						reviewRating: product.reviewRating,
						reviewCount: product.reviewCount,
						categoryId,
					},
				});
				count++;
			}
		}

		console.log(`Seeded ${count} products.`);
	}

	const categoryIdBySlug = await seedCategories();
	await seedProducts(categoryIdBySlug);
	console.log("Seeding completed successfully!");
}

main()
	.catch((e) => {
		console.error("Seeding failed:", e);
		throw new Error("Seed process terminated due to errors.");
	})
	.finally(async () => {
		// 3. Gracefully shut down both Prisma and the connection pool
		await prisma.$disconnect();
		await pool.end();
	});
