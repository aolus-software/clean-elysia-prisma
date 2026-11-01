import { Cache, UserInformationCacheKey } from "@cache";
import { prisma } from "@database";
import { NotFoundError, UnprocessableEntityError } from "@errors";
import { t } from "@i18n";
import { Hash } from "@utils";

export const ProfileService = {
	async changePassword(
		userId: string,
		currentPassword: string,
		newPassword: string,
	): Promise<void> {
		const existing = await prisma.user.findFirst({
			where: { id: userId, deletedAt: null },
			select: { password: true },
		});
		if (!existing) {
			throw new NotFoundError(t("user.notFound"));
		}

		const isPasswordValid = await Hash.compareHash(
			currentPassword,
			existing.password,
		);
		if (!isPasswordValid) {
			throw new UnprocessableEntityError(t("auth.validationError"), [
				{
					field: "currentPassword",
					message: t("profile.currentPasswordIncorrect"),
				},
			]);
		}

		const hashedPassword = await Hash.generateHash(newPassword);
		await prisma.user.update({
			where: { id: userId },
			data: { password: hashedPassword },
		});

		await Cache.delete(UserInformationCacheKey(userId));
	},
};
