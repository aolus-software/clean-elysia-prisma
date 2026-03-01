import { prisma } from "@database";
import { Prisma } from "@prisma-generated";

export async function seedPermissions() {
	const groupNames = ["user", "role", "permission"];
	const permissionNames = ["list", "create", "detail", "edit", "delete"];

	const permissions: Prisma.PermissionCreateManyInput[] = [];
	for (const group of groupNames) {
		for (const permission of permissionNames) {
			permissions.push({
				name: `${group} ${permission}`,
				group: group,
			});
		}
	}

	await prisma.permission.createMany({
		data: permissions,
	});
}
