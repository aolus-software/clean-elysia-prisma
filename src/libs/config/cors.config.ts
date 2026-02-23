import { env } from "./env.config";

interface ICorsConfig {
	origin: string | string[];
	methods: string[];
	allowedHeaders: string[];
	credentials: boolean;
	maxAge: number;
	// exposeHeaders?: string[];
}

export const CORSConfig: ICorsConfig = {
	origin: env.ALLOWED_HOST ? env.ALLOWED_HOST.split(",") : "*",
	methods: ["GET", "POST", "PATCH", "DELETE"],
	allowedHeaders: ["Content-Type", "Authorization"],
	credentials: false,
	maxAge: 86400,
	// exposeHeaders: [],
};
