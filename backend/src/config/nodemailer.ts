import nodemailer from "nodemailer";
import { requireEnv } from "./env.ts";

const email = requireEnv("NODE_MAILER_EMAIL");
const password = requireEnv("NODE_MAILER_PASSWORD");

// Creating nodemailer transport
export const transport = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: email,
		pass: password,
	},
});

// Checking if credentials are correct
transport.verify((err) => {
	if (err) {
		console.error(
			"[mailer] Failed to authenticate with SMTP server:",
			err.message,
		);
		console.error(
			"[mailer] Email sending will fail until this is fixed. ",
		);
	} else {
		console.log("[mailer] SMTP connection verified.");
	}
});