import { prisma } from "@database";
import { Hash } from "@utils";

export async function seedUser() {
	const names = ["superuser", "admin", "user"];
	const roles = await prisma.role.findMany();

	for (const name of names) {
		const user = await prisma.user.upsert({
			where: { email: `${name}@example.com` },
			update: {},
			create: {
				email: `${name}@example.com`,
				name,
				password: await Hash.generateHash("password123"),
				emailVerifiedAt: new Date(),
			},
		});

		if (name === "superuser") {
			await prisma.userRole.create({
				data: {
					userId: user.id,
					roleId: roles.find((role) => role.name === "superuser")?.id || "",
				},
			});
		}

		if (name === "admin") {
			await prisma.userRole.create({
				data: {
					userId: user.id,
					roleId: roles.find((role) => role.name === "admin")?.id || "",
				},
			});
		}
	}
}
