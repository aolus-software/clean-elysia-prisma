import { prisma } from "@database";

export async function seedRoles() {
	const names = ["superuser", "admin"];
	const permissions = await prisma.permission.findMany();

	for (const name of names) {
		await prisma.role.upsert({
			where: { name },
			update: {},
			create: {
				name,
				rolePermissions: {
					create: permissions.map((permission) => ({
						permission: {
							connect: { id: permission.id },
						},
					})),
				},
			},
		});
	}
}
