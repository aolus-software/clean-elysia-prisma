import { prisma } from "@database";
import { Hash } from "@utils";

export async function seedUser() {
	const names = ["superuser", "admin", "user"];
	const roles = await prisma.role.findMany();

	for (const name of names) {
		const email = `${name}@example.com`;

		// email is intentionally not unique at the database level — a soft-deleted
		// user's address has to be reusable — so this cannot be an upsert on email.
		// Match on the live row instead, the way the sibling repos do.
		const existing = await prisma.user.findFirst({
			where: { email, deletedAt: null },
		});

		if (existing) {
			continue;
		}

		const user = await prisma.user.create({
			data: {
				email,
				name,
				password: await Hash.generateHash("password123"),
				emailVerifiedAt: new Date(),
			},
		});

		const role = roles.find((r) => r.name === name);
		if (role) {
			await prisma.userRole.create({
				data: {
					userId: user.id,
					roleId: role.id,
				},
			});
		}
	}
}
