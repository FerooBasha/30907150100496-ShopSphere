import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
	if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
		return res.status(401).json({ error: "Unauthorized" });
	}

	console.log(
		"[cron] recalculate-ratings triggered at",
		new Date().toISOString(),
	);

	// Simulate doing background work
	await new Promise((resolve) => setTimeout(resolve, 500));

	return res.status(200).json({
		success: true,
		message: "Dummy job ran successfully — no DB calls yet",
		ranAt: new Date().toISOString(),
	});
}
