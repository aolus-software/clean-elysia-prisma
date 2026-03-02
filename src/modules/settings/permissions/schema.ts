import { DatatableQueryParams } from "@types";
import { commonPaginatedResponse, commonResponse } from "@utils";
import { t } from "elysia";

// ============================================
// BODY SCHEMAS
// ============================================

export const CreatePermissionSchema = t.Object({
	name: t.String({ minLength: 1, maxLength: 255 }),
	group: t.String({ minLength: 1, maxLength: 255 }),
});

export const UpdatePermissionSchema = t.Object({
	name: t.String({ minLength: 1, maxLength: 255 }),
	group: t.String({ minLength: 1, maxLength: 255 }),
});

// ============================================
// DATA SCHEMAS
// ============================================

export const PermissionDataSchema = t.Object({
	id: t.String(),
	name: t.String(),
	group: t.String(),
	created_at: t.Date(),
	updated_at: t.Date(),
});

// ============================================
// QUERY SCHEMAS
// ============================================

export { DatatableQueryParams as PermissionQuerySchema };

// ============================================
// RESPONSE SCHEMAS
// ============================================

export const PermissionListResponseSchema =
	commonPaginatedResponse(PermissionDataSchema);

export const PermissionDetailResponseSchema = commonResponse(
	PermissionDataSchema,
	{ include: [200, 400, 401, 403, 404, 500] },
);

export const PermissionCreateResponseSchema = commonResponse(
	PermissionDataSchema,
	{ include: [201, 400, 401, 403, 409, 422, 500] },
);

export const PermissionUpdateResponseSchema = commonResponse(
	PermissionDataSchema,
	{ include: [200, 400, 401, 403, 404, 409, 422, 500] },
);

export const PermissionDeleteResponseSchema = commonResponse(t.Null(), {
	include: [200, 401, 403, 404, 500],
});
