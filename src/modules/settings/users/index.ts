import { baseApp } from "@base";
import { AuthPlugin } from "@plugins";
import { DatatableToolkit, ResponseToolkit } from "@utils";
import { Elysia, t } from "elysia";

import {
	CreateUserSchema,
	ResetPasswordSchema,
	SyncUserRolesSchema,
	UpdateUserSchema,
	UserActionResponseSchema,
	UserCreateResponseSchema,
	UserDeleteResponseSchema,
	UserDetailResponseSchema,
	UserListResponseSchema,
	UserQuerySchema,
	UserSyncRolesResponseSchema,
	UserUpdateResponseSchema,
} from "./schema";
import { UserService } from "./service";

export const UsersModule = new Elysia({
	name: "settings-users-module",
	prefix: "/users",
	detail: { tags: ["Settings - Users"] },
})
	.use(baseApp)
	.use(AuthPlugin)
	.get(
		"/",
		async ({ query }) => {
			const queryParam = DatatableToolkit.parseFilter(query);
			const result = await UserService.list(queryParam);
			return ResponseToolkit.paginated(
				result.data,
				result.meta,
				"Users retrieved successfully",
			);
		},
		{
			query: UserQuerySchema,
			response: UserListResponseSchema,
			detail: {
				summary: "List users",
				description: "Retrieve a paginated list of users",
			},
		},
	)
	.get(
		"/:id",
		async ({ params }) => {
			const user = await UserService.detail(params.id);
			return ResponseToolkit.success(user, "User retrieved successfully");
		},
		{
			params: t.Object({ id: t.String() }),
			response: UserDetailResponseSchema,
			detail: {
				summary: "Get user",
				description: "Retrieve a single user by ID with roles",
			},
		},
	)
	.post(
		"/",
		async ({ body, set }) => {
			set.status = 201;
			const user = await UserService.create({
				name: body.name,
				email: body.email,
				password: body.password,
				status: body.status as never,
				role_ids: body.role_ids,
			});
			return ResponseToolkit.created(user, "User created successfully");
		},
		{
			body: CreateUserSchema,
			response: UserCreateResponseSchema,
			detail: {
				summary: "Create user",
				description: "Create a new user with optional role assignments",
			},
		},
	)
	.patch(
		"/:id",
		async ({ params, body }) => {
			const user = await UserService.update(params.id, {
				name: body.name,
				email: body.email,
				password: body.password,
				status: body.status as never,
			});
			return ResponseToolkit.success(user, "User updated successfully");
		},
		{
			params: t.Object({ id: t.String() }),
			body: UpdateUserSchema,
			response: UserUpdateResponseSchema,
			detail: {
				summary: "Update user",
				description: "Update an existing user by ID",
			},
		},
	)
	.delete(
		"/:id",
		async ({ params }) => {
			await UserService.delete(params.id);
			return ResponseToolkit.success(null, "User deleted successfully");
		},
		{
			params: t.Object({ id: t.String() }),
			response: UserDeleteResponseSchema,
			detail: {
				summary: "Delete user",
				description: "Delete a user by ID",
			},
		},
	)
	.patch(
		"/:id/sync-roles",
		async ({ params, body }) => {
			await UserService.syncRoles(params.id, body.role_ids);
			return ResponseToolkit.success(null, "User roles synced successfully");
		},
		{
			params: t.Object({ id: t.String() }),
			body: SyncUserRolesSchema,
			response: UserSyncRolesResponseSchema,
			detail: {
				summary: "Sync user roles",
				description:
					"Replace all roles assigned to a user with the provided list",
			},
		},
	)
	.post(
		"/:id/send-email-verification",
		async ({ params }) => {
			await UserService.sendEmailVerification(params.id);
			return ResponseToolkit.success(
				null,
				"Verification email sent successfully",
			);
		},
		{
			params: t.Object({ id: t.String() }),
			response: UserActionResponseSchema,
			detail: {
				summary: "Send email verification",
				description: "Send a verification email to the user",
			},
		},
	)
	.post(
		"/:id/send-password-reset",
		async ({ params }) => {
			await UserService.sendPasswordReset(params.id);
			return ResponseToolkit.success(
				null,
				"Password reset email sent successfully",
			);
		},
		{
			params: t.Object({ id: t.String() }),
			response: UserActionResponseSchema,
			detail: {
				summary: "Send password reset email",
				description: "Send a password reset email to the user",
			},
		},
	)
	.patch(
		"/:id/reset-password",
		async ({ params, body }) => {
			await UserService.resetPassword(params.id, body.password);
			return ResponseToolkit.success(null, "Password reset successfully");
		},
		{
			params: t.Object({ id: t.String() }),
			body: ResetPasswordSchema,
			response: UserActionResponseSchema,
			detail: {
				summary: "Reset user password",
				description:
					"Directly set a new password for a user (admin action, no token required)",
			},
		},
	);
