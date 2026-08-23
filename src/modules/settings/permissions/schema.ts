import {
	permissionFilterableFields,
	permissionFilterExample,
	permissionSortableFields,
} from "@repositories";
import { datatableQueryParams } from "@types";
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

/* Documented against the repository's own allow-lists, so /docs shows exactly the
   sort values and filter keys PermissionRepository().findAll validates against. */
export const PermissionQuerySchema = datatableQueryParams({
	sortFields: permissionSortableFields,
	filterFields: permissionFilterableFields,
	filterExample: permissionFilterExample,
});

// ============================================
// RESPONSE SCHEMAS
// ============================================

export const PermissionListResponseSchema = commonPaginatedResponse(
	PermissionDataSchema,
	{ include: [200, 400, 401, 403, 422, 500] },
);

export const PermissionDetailResponseSchema = commonResponse(
	PermissionDataSchema,
	{ include: [200, 400, 401, 403, 404, 500] },
);

export const PermissionCreateResponseSchema = commonResponse(
	PermissionDataSchema,
	{ include: [201, 400, 401, 403, 422, 500] },
);

export const PermissionUpdateResponseSchema = commonResponse(
	PermissionDataSchema,
	{ include: [200, 400, 401, 403, 404, 422, 500] },
);

export const PermissionDeleteResponseSchema = commonResponse(t.Null(), {
	include: [200, 401, 403, 404, 500],
});
