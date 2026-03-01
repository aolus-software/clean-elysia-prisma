import { prisma } from "@database";
import { BadRequestError } from "@errors";
import { Prisma, UserStatus } from "@prisma-generated";
import {
	DatatableType,
	PaginationResponse,
	UserDetail,
	UserInformation,
	UserList,
} from "@types";
import { DateToolkit } from "@utils";

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

			const allowedSort = [
				"id",
				"name",
				"email",
				"status",
				"createdAt",
				"updatedAt",
			];
			const sortDirectionAllowed = ["asc", "desc"];
			const allowedFilter = [
				"id",
				"name",
				"email",
				"status",
				"roles",
				"createdAt",
				"updatedAt",
			];

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

			let whereCondition: Prisma.UserWhereInput = {};
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
						status: queryParam.filter["status"] as UserStatus,
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

				if (queryParam.filter["status"]) {
					filterCondition = {
						...filterCondition,
						status: queryParam.filter["status"] as UserStatus,
					};
				}

				if (
					queryParam.filter["createdAt"] &&
					typeof queryParam.filter["createdAt"] === "string"
				) {
					const [startDate, endDate] =
						queryParam.filter["createdAt"].split(",");
					filterCondition = {
						...filterCondition,
						createdAt: {
							gte: DateToolkit.parse(startDate).toDate(),
							...(endDate && {
								lte: DateToolkit.parse(endDate).toDate(),
							}),
						},
					};
				}

				if (
					queryParam.filter["updatedAt"] &&
					typeof queryParam.filter["updatedAt"] === "string"
				) {
					const [startDate, endDate] =
						queryParam.filter["updatedAt"].split(",");
					filterCondition = {
						...filterCondition,
						updatedAt: {
							gte: DateToolkit.parse(startDate).toDate(),
							...(endDate && {
								lte: DateToolkit.parse(endDate).toDate(),
							}),
						},
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
				where: { id },
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
				where: { email },
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
