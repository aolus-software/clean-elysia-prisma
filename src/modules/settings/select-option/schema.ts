import { commonResponse } from "@utils";
import { t } from "elysia";

// ============================================
// DATA SCHEMAS
// ============================================

export const PermissionSelectOptionDataSchema = t.Array(
	t.Object({
		group: t.String(),
		permissions: t.Array(
			t.Object({
				id: t.String(),
				name: t.String(),
				group: t.String(),
			}),
		),
	}),
);

export const RoleSelectOptionDataSchema = t.Array(
	t.Object({
		id: t.String(),
		name: t.String(),
	}),
);

// ============================================
// RESPONSE SCHEMAS
// ============================================

export const PermissionSelectOptionResponseSchema = commonResponse(
	PermissionSelectOptionDataSchema,
	{ include: [200, 401, 403, 500] },
);

export const RoleSelectOptionResponseSchema = commonResponse(
	RoleSelectOptionDataSchema,
	{ include: [200, 401, 403, 500] },
);
