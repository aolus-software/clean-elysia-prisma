import { baseApp } from "@base";
import { t as trans } from "@i18n";
import { AuthPlugin } from "@plugins";
import { ResponseToolkit } from "@utils";
import { Elysia } from "elysia";

import { ChangePasswordResponseSchema, ChangePasswordSchema } from "./schema";
import { ProfileService } from "./service";

export const ProfileModule = new Elysia({
	name: "profile-module",
	prefix: "/profile",
	detail: { tags: ["Profile"] },
})
	.use(baseApp)
	.use(AuthPlugin)
	.patch(
		"/password",
		async ({ user, body }) => {
			await ProfileService.changePassword(
				user.id,
				body.currentPassword,
				body.newPassword,
			);
			return ResponseToolkit.success(null, trans("profile.passwordChanged"));
		},
		{
			body: ChangePasswordSchema,
			response: ChangePasswordResponseSchema,
			detail: {
				summary: "Change password",
				description:
					"Change the authenticated user's password after confirming the current one",
				security: [{ bearerAuth: [] }],
			},
		},
	);
