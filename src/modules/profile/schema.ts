import { StrongPassword } from "@default";
import { commonResponse } from "@utils";
import { t } from "elysia";

// ============================================
// BODY SCHEMAS
// ============================================

export const ChangePasswordSchema = t.Object({
	currentPassword: t.String({ minLength: 1 }),
	newPassword: t.String({
		pattern: StrongPassword.source,
		minLength: 8,
		description:
			"New strong password with uppercase, lowercase, number, and special character",
		examples: ["NewSecure123!"],
	}),
});

// ============================================
// RESPONSE SCHEMAS
// ============================================

export const ChangePasswordResponseSchema = commonResponse(t.Null(), {
	include: [200, 401, 422, 500],
});
