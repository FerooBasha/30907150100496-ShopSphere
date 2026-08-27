import type { Request, Response } from "express";

export const getHealth = (req: Request, res: Response) => {
	return res.status(200).json({ message: "Healthy", status: 200 });
};
