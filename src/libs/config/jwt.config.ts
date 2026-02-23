import { env } from "./env.config";

export const JWT_CONFIG = {
	name: "jwt",
	secret: env.JWT_SECRET,
	exp: "7d",
};
