import { prisma } from "@database";
import { BadRequestError } from "@errors";
import { Prisma } from "@prisma-generated";
import {
	DatatableType,
	FilterField,
	filterFieldNames,
	PaginationResponse,
	RoleDetail,
	RoleList,
} from "@types";
import { DatatableToolkit } from "@utils";

/* The ?sort= and filter[...] values this repository accepts. Exported so the
   module can document them in OpenAPI from one source of truth rather than
   restating the list. An unrecognised value is rejected, not ignored.

   `sortFields` must contain `defaultSort` — Elysia materialises the schema
   default into the query object, so a default missing from this list rejects
   every request that omits ?sort=. */
export const roleSortableFields = ["id", "name", "createdAt", "updatedAt"];
export const roleFilterableFields: FilterField[] = [
	"name",
	{ field: "createdAt", kind: "date" },
	{ field: "updatedAt", kind: "date" },
];

/* Example value per non-enum filter key, rendered as the concrete sample in
   /docs. */
export const roleFilterExample: Record<string, string> = {
	name: "admin",
	createdAt: "2024-01-01,2024-12-31",
	updatedAt: "2024-01-01,2024-12-31",
};

export function RoleRepository(tx?: Prisma.TransactionClient) {
	const db = tx ?? prisma;

	return {
		role: db.role,

		async findAll(
			queryParam: DatatableType,
		): Promise<PaginationResponse<RoleList>> {
			const { page, perPage, search, sortDirection } = queryParam;
			const finalLimit = Number(perPage);
			const finalPage = Number(page);

			const allowedSort = roleSortableFields;
			const sortDirectionAllowed = ["asc", "desc"];
			const allowedFilter = filterFieldNames(roleFilterableFields);

			let sort = queryParam.sort;
			if (!sort) {
				sort = "createdAt";
			}

			if (!allowedSort.includes(sort)) {
				throw new BadRequestError("Invalid sort field", [
					{
						field: "sort",
						message: `Sort field must be one of ${allowedSort.join(", ")}`,
					},
				]);
			}

			if (!sortDirectionAllowed.includes(sortDirection)) {
				throw new BadRequestError("Invalid sort direction", [
					{
						field: "sortDirection",
						message: `Sort direction must be one of ${sortDirectionAllowed.join(", ")}`,
					},
				]);
			}

			if (queryParam.filter) {
				const filterKeys = Object.keys(queryParam.filter);
				for (const key of filterKeys) {
					if (!allowedFilter.includes(key)) {
						throw new BadRequestError("Invalid filter field", [
							{
								field: "filter",
								message: `Filter field must be one of ${allowedFilter.join(", ")}`,
							},
						]);
					}
				}
			}

			DatatableToolkit.assertFilterEnums(
				queryParam.filter,
				roleFilterableFields,
			);

			let whereCondition: Prisma.RoleWhereInput = {};
			if (search) {
				whereCondition = {
					...whereCondition,
					name: { contains: search, mode: "insensitive" },
				};
			}

			let filterCondition: Prisma.RoleWhereInput = {};
			if (queryParam.filter) {
				if (queryParam.filter["name"]) {
					filterCondition = {
						...filterCondition,
						name: queryParam.filter["name"].toString(),
					};
				}

				if (queryParam.filter["createdAt"]) {
					const { from, to } = DatatableToolkit.filterDateRange(
						queryParam.filter["createdAt"],
						"createdAt",
					);
					filterCondition = {
						...filterCondition,
						createdAt: { gte: from, lte: to },
					};
				}

				if (queryParam.filter["updatedAt"]) {
					const { from, to } = DatatableToolkit.filterDateRange(
						queryParam.filter["updatedAt"],
						"updatedAt",
					);
					filterCondition = {
						...filterCondition,
						updatedAt: { gte: from, lte: to },
					};
				}
			}

			const where: Prisma.RoleWhereInput = {
				AND: [whereCondition, filterCondition],
			};

			const [totalCount, roles] = await Promise.all([
				db.role.count({ where }),
				db.role.findMany({
					where,
					orderBy: { [sort]: sortDirection },
					skip: (finalPage - 1) * finalLimit,
					take: finalLimit,
					select: {
						id: true,
						name: true,
						createdAt: true,
						updatedAt: true,
					},
				}),
			]);

			return {
				data: roles.map((role) => ({
					id: role.id,
					name: role.name,
					created_at: role.createdAt,
					updated_at: role.updatedAt,
				})),
				meta: {
					limit: finalLimit,
					page: finalPage,
					totalCount,
				},
			};
		},

		/**
		 * Fetches role detail with all permissions grouped by group.
		 * Each permission includes an `is_assigned` flag indicating
		 * whether it is currently assigned to this role.
		 */
		async findOne(id: string): Promise<RoleDetail | null> {
			const [role, allPermissions] = await Promise.all([
				db.role.findFirst({
					where: { id },
					select: {
						id: true,
						name: true,
						createdAt: true,
						updatedAt: true,
						rolePermissions: {
							select: { permissionId: true },
						},
					},
				}),
				db.permission.findMany({
					select: { id: true, name: true, group: true },
					orderBy: [{ group: "asc" }, { name: "asc" }],
				}),
			]);

			if (!role) return null;

			const assignedIds = new Set(
				role.rolePermissions.map((rp) => rp.permissionId),
			);

			const groupedMap = new Map<
				string,
				{ id: string; name: string; is_assigned: boolean }[]
			>();

			for (const perm of allPermissions) {
				if (!groupedMap.has(perm.group)) groupedMap.set(perm.group, []);
				groupedMap.get(perm.group)!.push({
					id: perm.id,
					name: perm.name,
					is_assigned: assignedIds.has(perm.id),
				});
			}

			return {
				id: role.id,
				name: role.name,
				created_at: role.createdAt,
				updated_at: role.updatedAt,
				permissions: Array.from(groupedMap.entries()).map(([group, names]) => ({
					group,
					names,
				})),
			};
		},

		async findByName(
			name: string,
		): Promise<{ id: string; name: string } | null> {
			return db.role.findFirst({
				where: { name },
				select: { id: true, name: true },
			});
		},

		async create(name: string): Promise<{ id: string; name: string }> {
			return db.role.create({
				data: { name },
				select: { id: true, name: true },
			});
		},

		async update(
			id: string,
			name: string,
		): Promise<{ id: string; name: string }> {
			return db.role.update({
				where: { id },
				data: { name },
				select: { id: true, name: true },
			});
		},

		async delete(id: string): Promise<void> {
			await db.role.delete({ where: { id } });
		},

		/**
		 * Replaces all permissions assigned to a role.
		 * Wrap in an external transaction if atomicity is required alongside other operations.
		 */
		async syncPermissions(
			roleId: string,
			permissionIds: string[],
		): Promise<void> {
			await db.rolePermission.deleteMany({ where: { roleId } });
			if (permissionIds.length > 0) {
				await db.rolePermission.createMany({
					data: permissionIds.map((permissionId) => ({
						roleId,
						permissionId,
					})),
				});
			}
		},
	};
}
