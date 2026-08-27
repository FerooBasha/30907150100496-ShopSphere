export function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value || value.trim() === "") {
        throw new Error(
            `Missing required environment variable: ${name}. Check your .env file.`,
        );
    }
    return value;
}