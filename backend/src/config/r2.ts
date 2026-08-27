import { S3Client } from "@aws-sdk/client-s3";
import { requireEnv } from "./env.ts";

const accessKey = requireEnv("BUCKET_ACCESS_KEY");
const secretKey = requireEnv("BUCKET_SECRET_ACCESS_KEY");
const endpoint = requireEnv("BUCKET_ENDPOINT");

export const r2 = new S3Client({
	region: "auto",
	endpoint: endpoint,
	credentials: {
		accessKeyId: accessKey,
		secretAccessKey: secretKey,
	},
});
