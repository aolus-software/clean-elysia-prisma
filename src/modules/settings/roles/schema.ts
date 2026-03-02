import { DatatableQueryParams } from "@types";
import { commonPaginatedResponse, commonResponse } from "@utils";
import { t } from "elysia";

// ============================================
// BODY SCHEMAS
// ============================================

export const CreateRoleSchema = t.Object({
	name: t.String({ minLength: 1, maxLength: 255 }),
});

export const UpdateRoleSchema = t.Object({
	name: t.String({ minLength: 1, maxLength: 255 }),
});

export const SyncRolePermissionsSchema = t.Object({
	permission_ids: t.Array(t.String(), { minItems: 0 }),
});

// ============================================
// DATA SCHEMAS
// ============================================

export const RoleListDataSchema = t.Object({
	id: t.String(),
	name: t.String(),
	created_at: t.Date(),
	updated_at: t.Date(),
});

export const RoleDetailDataSchema = t.Object({
	id: t.String(),
	name: t.String(),
	created_at: t.Date(),
	updated_at: t.Date(),
	permissions: t.Array(
		t.Object({
			group: t.String(),
			names: t.Array(
				t.Object({
					id: t.String(),
					name: t.String(),
					is_assigned: t.Boolean(),
				}),
			),
		}),
	),
});

// ============================================
// QUERY SCHEMAS
// ============================================

export { DatatableQueryParams as RoleQuerySchema };

// ============================================
// RESPONSE SCHEMAS
// ============================================

export const RoleListResponseSchema =
	commonPaginatedResponse(RoleListDataSchema);

export const RoleDetailResponseSchema = commonResponse(RoleDetailDataSchema, {
	include: [200, 400, 401, 403, 404, 500],
});

export const RoleCreateResponseSchema = commonResponse(RoleListDataSchema, {
	include: [201, 400, 401, 403, 409, 422, 500],
});

export const RoleUpdateResponseSchema = commonResponse(RoleListDataSchema, {
	include: [200, 400, 401, 403, 404, 409, 422, 500],
});

export const RoleDeleteResponseSchema = commonResponse(t.Null(), {
	include: [200, 401, 403, 404, 500],
});

export const RoleSyncPermissionsResponseSchema = commonResponse(t.Null(), {
	include: [200, 400, 401, 403, 404, 422, 500],
});
