import { DatatableQueryParams } from "@types";
import { commonPaginatedResponse, commonResponse } from "@utils";
import { t } from "elysia";

// ============================================
// BODY SCHEMAS
// ============================================

export const CreateUserSchema = t.Object({
	name: t.String({ minLength: 1, maxLength: 255 }),
	email: t.String({ format: "email" }),
	password: t.String({ minLength: 8 }),
	status: t.Optional(
		t.Union([t.Literal("ACTIVE"), t.Literal("INACTIVE"), t.Literal("BLOCKED")]),
	),
	role_ids: t.Optional(t.Array(t.String())),
});

export const UpdateUserSchema = t.Object({
	name: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
	email: t.Optional(t.String({ format: "email" })),
	password: t.Optional(t.String({ minLength: 8 })),
	status: t.Optional(
		t.Union([t.Literal("ACTIVE"), t.Literal("INACTIVE"), t.Literal("BLOCKED")]),
	),
});

export const SyncUserRolesSchema = t.Object({
	role_ids: t.Array(t.String(), { minItems: 0 }),
});

// ============================================
// DATA SCHEMAS
// ============================================

export const UserListDataSchema = t.Object({
	id: t.String(),
	name: t.String(),
	email: t.String(),
	status: t.Union([
		t.Literal("ACTIVE"),
		t.Literal("INACTIVE"),
		t.Literal("BLOCKED"),
	]),
	roles: t.Array(t.String()),
	createdAt: t.Date(),
	updatedAt: t.Date(),
});

export const UserDetailDataSchema = t.Object({
	id: t.String(),
	name: t.String(),
	email: t.String(),
	status: t.Union([
		t.Literal("ACTIVE"),
		t.Literal("INACTIVE"),
		t.Literal("BLOCKED"),
	]),
	roles: t.Array(
		t.Object({
			id: t.String(),
			name: t.String(),
		}),
	),
	createdAt: t.Date(),
	updatedAt: t.Date(),
});

// ============================================
// QUERY SCHEMAS
// ============================================

export { DatatableQueryParams as UserQuerySchema };

// ============================================
// RESPONSE SCHEMAS
// ============================================

export const UserListResponseSchema =
	commonPaginatedResponse(UserListDataSchema);

export const UserDetailResponseSchema = commonResponse(UserDetailDataSchema, {
	include: [200, 400, 401, 403, 404, 500],
});

export const UserCreateResponseSchema = commonResponse(UserDetailDataSchema, {
	include: [201, 400, 401, 403, 409, 422, 500],
});

export const UserUpdateResponseSchema = commonResponse(UserDetailDataSchema, {
	include: [200, 400, 401, 403, 404, 409, 422, 500],
});

export const UserDeleteResponseSchema = commonResponse(t.Null(), {
	include: [200, 401, 403, 404, 500],
});

export const UserSyncRolesResponseSchema = commonResponse(t.Null(), {
	include: [200, 400, 401, 403, 404, 422, 500],
});

export const ResetPasswordSchema = t.Object({
	password: t.String({ minLength: 8 }),
});

export const UserActionResponseSchema = commonResponse(t.Null(), {
	include: [200, 400, 401, 403, 404, 500],
});
