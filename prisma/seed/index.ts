import { seedPermissions } from "./permission.seed";
import { seedRoles } from "./role.seed";
import { seedUser } from "./user.seed";

export async function initSeed() {
	await seedPermissions();
	await seedRoles();
	await seedUser();

	// eslint-disable-next-line no-console
	console.log("Database seeding completed!");
}

initSeed().catch((error) => {
	// eslint-disable-next-line no-console
	console.error("Error during database seeding:", error);
	process.exit(1);
});
