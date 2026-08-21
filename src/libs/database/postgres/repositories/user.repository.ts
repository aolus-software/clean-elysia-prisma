import { prisma } from "@database";
import { BadRequestError } from "@errors";
import { Prisma, UserStatus } from "@prisma-generated";
import {
	DatatableType,
	FilterField,
	filterFieldNames,
	PaginationResponse,
	UserDetail,
	UserInformation,
	UserList,
} from "@types";
import { DatatableToolkit } from "@utils";

/* The ?sort= and filter[...] values this repository accepts. Exported so the
   module can document them in OpenAPI from one source of truth rather than
   restating the list. An unrecognised value is rejected, not ignored.

   `sortFields` must contain `defaultSort` — Elysia materialises the schema
   default into the query object, so a default missing from this list rejects
   every request that omits ?sort=. */
export const userSortableFields = [
	"id",
	"name",
	"email",
	"status",
	"createdAt",
	"updatedAt",
];
export const userFilterableFields: FilterField[] = [
	"name",
	"email",
	{ field: "status", enum: Object.values(UserStatus) },
	{ field: "roles", kind: "list" },
	{ field: "createdAt", kind: "date" },
	{ field: "updatedAt", kind: "date" },
];

/* Example value per non-enum filter key, rendered as the concrete sample in
   /docs. Enum keys take their example from the enum. */
export const userFilterExample: Record<string, string> = {
	name: "jane",
	email: "jane@example.com",
	roles: "admin,editor",
	createdAt: "2024-01-01,2024-12-31",
	updatedAt: "2024-01-01,2024-12-31",
};

export function UserRepository(tx?: Prisma.TransactionClient) {
	const db = tx || prisma;

	return {
		user: db.user,

		async findAll(
			queryParam: DatatableType,
		): Promise<PaginationResponse<UserList>> {
			const { page, perPage, search, sortDirection } = queryParam;
			const finalLimit = Number(perPage);
			const finalPage = Number(page);

			const allowedSort = userSortableFields;
			const sortDirectionAllowed = ["asc", "desc"];
			const allowedFilter = filterFieldNames(userFilterableFields);

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
						message: `Sort direction must be one of ${sortDirectionAllowed.join(
							", ",
						)}`,
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
				userFilterableFields,
			);

			// Soft delete: every read excludes rows with deletedAt set.
			let whereCondition: Prisma.UserWhereInput = { deletedAt: null };
			if (search) {
				whereCondition = {
					...whereCondition,
					AND: [
						{
							OR: [
								{ name: { contains: search, mode: "insensitive" } },
								{ email: { contains: search, mode: "insensitive" } },
							],
						},
					],
				};
			}

			let filterCondition: Prisma.UserWhereInput = {};
			if (queryParam.filter) {
				if (queryParam.filter["status"]) {
					filterCondition = {
						...filterCondition,
						status: {
							in: DatatableToolkit.filterValues(
								queryParam.filter["status"],
							) as UserStatus[],
						},
					};
				}

				if (queryParam.filter["roles"]) {
					const roles = queryParam.filter["roles"]
						.toString()
						.split(",")
						.map((role) => role.trim());

					filterCondition = {
						...filterCondition,
						userRoles: {
							some: {
								role: {
									name: {
										in: roles,
									},
								},
							},
						},
					};
				}

				if (queryParam.filter["name"]) {
					filterCondition = {
						...filterCondition,
						name: queryParam.filter["name"].toString(),
					};
				}

				if (queryParam.filter["email"]) {
					filterCondition = {
						...filterCondition,
						email: queryParam.filter["email"].toString(),
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

			const where: Prisma.UserWhereInput = {
				AND: [whereCondition, filterCondition],
			};

			const [totalCount, users] = await Promise.all([
				db.user.count({ where }),
				db.user.findMany({
					where,
					orderBy: { [sort]: sortDirection },
					skip: (finalPage - 1) * finalLimit,
					take: finalLimit,
					select: {
						id: true,
						email: true,
						name: true,
						status: true,
						createdAt: true,
						updatedAt: true,
						userRoles: {
							select: {
								role: {
									select: {
										id: true,
										name: true,
									},
								},
							},
						},
					},
				}),
			]);

			return {
				data: users.map((user) => ({
					id: user.id,
					email: user.email,
					name: user.name,
					status: user.status,
					createdAt: user.createdAt,
					updatedAt: user.updatedAt,
					roles: user.userRoles.map((userRole) => userRole.role.name),
				})),
				meta: {
					limit: finalLimit,
					page: finalPage,
					totalCount,
				},
			};
		},

		async findOne(id: string): Promise<UserDetail | null> {
			const data = await db.user.findFirst({
				where: { id, deletedAt: null },
				select: {
					id: true,
					email: true,
					name: true,
					status: true,
					createdAt: true,
					updatedAt: true,
					userRoles: {
						select: {
							role: {
								select: {
									id: true,
									name: true,
								},
							},
						},
					},
				},
			});

			if (!data) {
				return null;
			}

			return {
				id: data.id,
				email: data.email,
				name: data.name,
				status: data.status,
				createdAt: data.createdAt,
				updatedAt: data.updatedAt,
				roles: data.userRoles.map((userRole) => userRole.role),
			};
		},

		async findByMail(email: string): Promise<{
			id: string;
			email: string;
			name: string;
			password: string;
			status: UserStatus;
			emailVerifiedAt: Date | null;
			createdAt: Date;
			updatedAt: Date;
		} | null> {
			return db.user.findFirst({
				where: { email, deletedAt: null },
				select: {
					id: true,
					email: true,
					name: true,
					status: true,
					password: true,
					emailVerifiedAt: true,
					createdAt: true,
					updatedAt: true,
				},
			});
		},

		async userInformation(userId: string): Promise<UserInformation | null> {
			const user = await db.user.findUnique({
				where: {
					id: userId,
					emailVerifiedAt: { not: null },
					status: UserStatus.ACTIVE,
					deletedAt: null,
				},
				select: {
					id: true,
					email: true,
					name: true,
					status: true,
					createdAt: true,
					updatedAt: true,
					userRoles: {
						select: {
							role: {
								select: {
									name: true,
									rolePermissions: {
										select: {
											permission: {
												select: {
													name: true,
												},
											},
										},
									},
								},
							},
						},
					},
				},
			});

			if (!user) {
				return null;
			}

			const roles = user.userRoles.map((userRole) => ({
				name: userRole.role.name,
				permissions: userRole.role.rolePermissions.map(
					(rp) => rp.permission.name,
				),
			}));

			const permissionsSet = new Set<string>();
			roles.forEach((role) => {
				role.permissions.forEach((permission) => {
					permissionsSet.add(permission);
				});
			});

			return {
				id: user.id,
				email: user.email,
				name: user.name,
				status: user.status,
				createdAt: user.createdAt,
				updatedAt: user.updatedAt,
				roles: roles.map((role) => role.name),
				permissions: Array.from(permissionsSet),
			};
		},
	};
}
