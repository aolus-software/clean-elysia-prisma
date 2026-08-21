import { prisma } from "@database";
import { BadRequestError } from "@errors";
import { Prisma } from "@prisma-generated";
import {
	DatatableType,
	FilterField,
	filterFieldNames,
	PaginationResponse,
	PermissionList,
	PermissionSelectOptions,
} from "@types";
import { DatatableToolkit } from "@utils";

/* The ?sort= and filter[...] values this repository accepts. Exported so the
   module can document them in OpenAPI from one source of truth rather than
   restating the list. An unrecognised value is rejected, not ignored.

   `sortFields` must contain `defaultSort` — Elysia materialises the schema
   default into the query object, so a default missing from this list rejects
   every request that omits ?sort=. */
export const permissionSortableFields = [
	"id",
	"name",
	"group",
	"createdAt",
	"updatedAt",
];
export const permissionFilterableFields: FilterField[] = [
	"name",
	"group",
	{ field: "createdAt", kind: "date" },
	{ field: "updatedAt", kind: "date" },
];

/* Example value per non-enum filter key, rendered as the concrete sample in
   /docs. */
export const permissionFilterExample: Record<string, string> = {
	name: "user list",
	group: "user",
	createdAt: "2024-01-01,2024-12-31",
	updatedAt: "2024-01-01,2024-12-31",
};

export function PermissionRepository(tx?: Prisma.TransactionClient) {
	const db = tx ?? prisma;

	return {
		permission: db.permission,

		async findAll(
			queryParam: DatatableType,
		): Promise<PaginationResponse<PermissionList>> {
			const { page, perPage, search, sortDirection } = queryParam;
			const finalLimit = Number(perPage);
			const finalPage = Number(page);

			const allowedSort = permissionSortableFields;
			const sortDirectionAllowed = ["asc", "desc"];
			const allowedFilter = filterFieldNames(permissionFilterableFields);

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
				permissionFilterableFields,
			);

			let whereCondition: Prisma.PermissionWhereInput = {};
			if (search) {
				whereCondition = {
					...whereCondition,
					OR: [
						{ name: { contains: search, mode: "insensitive" } },
						{ group: { contains: search, mode: "insensitive" } },
					],
				};
			}

			let filterCondition: Prisma.PermissionWhereInput = {};
			if (queryParam.filter) {
				if (queryParam.filter["name"]) {
					filterCondition = {
						...filterCondition,
						name: queryParam.filter["name"].toString(),
					};
				}

				if (queryParam.filter["group"]) {
					filterCondition = {
						...filterCondition,
						group: queryParam.filter["group"].toString(),
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

			const where: Prisma.PermissionWhereInput = {
				AND: [whereCondition, filterCondition],
			};

			const [totalCount, permissions] = await Promise.all([
				db.permission.count({ where }),
				db.permission.findMany({
					where,
					orderBy: { [sort]: sortDirection },
					skip: (finalPage - 1) * finalLimit,
					take: finalLimit,
					select: {
						id: true,
						name: true,
						group: true,
						createdAt: true,
						updatedAt: true,
					},
				}),
			]);

			return {
				data: permissions.map((permission) => ({
					id: permission.id,
					name: permission.name,
					group: permission.group,
					created_at: permission.createdAt,
					updated_at: permission.updatedAt,
				})),
				meta: {
					limit: finalLimit,
					page: finalPage,
					totalCount,
				},
			};
		},

		async findOne(id: string): Promise<PermissionList | null> {
			const data = await db.permission.findFirst({
				where: { id },
				select: {
					id: true,
					name: true,
					group: true,
					createdAt: true,
					updatedAt: true,
				},
			});

			if (!data) return null;

			return {
				id: data.id,
				name: data.name,
				group: data.group,
				created_at: data.createdAt,
				updated_at: data.updatedAt,
			};
		},

		async findByName(
			name: string,
		): Promise<{ id: string; name: string } | null> {
			return db.permission.findFirst({
				where: { name },
				select: { id: true, name: true },
			});
		},

		/** Returns all permissions grouped by group, ordered alphabetically. */
		async selectOptions(): Promise<PermissionSelectOptions[]> {
			const permissions = await db.permission.findMany({
				select: { id: true, name: true, group: true },
				orderBy: [{ group: "asc" }, { name: "asc" }],
			});

			const groupedMap = new Map<
				string,
				{ id: string; name: string; group: string }[]
			>();

			for (const perm of permissions) {
				if (!groupedMap.has(perm.group)) groupedMap.set(perm.group, []);
				groupedMap.get(perm.group)!.push({
					id: perm.id,
					name: perm.name,
					group: perm.group,
				});
			}

			return Array.from(groupedMap.entries()).map(([group, perms]) => ({
				group,
				permissions: perms,
			}));
		},

		async create(
			name: string,
			group: string,
		): Promise<{ id: string; name: string; group: string }> {
			return db.permission.create({
				data: { name, group },
				select: { id: true, name: true, group: true },
			});
		},

		async update(
			id: string,
			name: string,
			group: string,
		): Promise<{ id: string; name: string; group: string }> {
			return db.permission.update({
				where: { id },
				data: { name, group },
				select: { id: true, name: true, group: true },
			});
		},

		async delete(id: string): Promise<void> {
			await db.permission.delete({ where: { id } });
		},
	};
}
