import { baseApp } from "@base";
import { PermissionGuard, RoleGuard } from "@guards";
import { t as trans } from "@i18n";
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
		async ({ query, request }) => {
			const queryParam = DatatableToolkit.parseFilter(query, request.url);
			const result = await UserService.list(queryParam);
			return ResponseToolkit.paginated(
				result.data,
				result.meta,
				trans("user.listSuccess"),
			);
		},
		{
			beforeHandle: ({ user }) => {
				PermissionGuard.canActivate(user, ["user list"]);
			},
			query: UserQuerySchema,
			response: UserListResponseSchema,
			detail: {
				summary: "List users",
				description:
					"Retrieve a paginated list of users. Soft-deleted users are excluded. " +
					"`search` matches name and email. Sortable and filterable fields are " +
					"listed on the individual query parameters; `filter[roles]` takes a " +
					"comma-separated list of role names, and `filter[createdAt]` / " +
					"`filter[updatedAt]` take a comma-separated date range. An unsupported " +
					"`sort` is rejected with 422 and an unsupported `filter[<key>]` with 400.",
			},
		},
	)
	.get(
		"/:id",
		async ({ params }) => {
			const user = await UserService.detail(params.id);
			return ResponseToolkit.success(user, trans("user.detailSuccess"));
		},
		{
			beforeHandle: ({ user }) => {
				PermissionGuard.canActivate(user, ["user detail"]);
			},
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
				status: body.status,
				role_ids: body.role_ids,
			});
			return ResponseToolkit.created(user, trans("user.createSuccess"));
		},
		{
			beforeHandle: ({ user }) => {
				PermissionGuard.canActivate(user, ["user create"]);
			},
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
				status: body.status,
			});
			return ResponseToolkit.success(user, trans("user.updateSuccess"));
		},
		{
			beforeHandle: ({ user }) => {
				PermissionGuard.canActivate(user, ["user edit"]);
			},
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
			return ResponseToolkit.success(null, trans("user.deleteSuccess"));
		},
		{
			beforeHandle: ({ user }) => {
				PermissionGuard.canActivate(user, ["user delete"]);
			},
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
			return ResponseToolkit.success(null, trans("user.syncRolesSuccess"));
		},
		{
			beforeHandle: ({ user }) => {
				RoleGuard.canActivate(user, ["superuser"]);
			},
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
			return ResponseToolkit.success(null, trans("user.verificationEmailSent"));
		},
		{
			beforeHandle: ({ user }) => {
				PermissionGuard.canActivate(user, ["user create"]);
			},
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
				trans("user.passwordResetEmailSent"),
			);
		},
		{
			beforeHandle: ({ user }) => {
				PermissionGuard.canActivate(user, ["user create"]);
			},
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
			return ResponseToolkit.success(null, trans("user.passwordResetSuccess"));
		},
		{
			beforeHandle: ({ user }) => {
				RoleGuard.canActivate(user, ["superuser"]);
			},
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
