import { Cache, UserInformationCacheKey } from "@cache";
import { prisma } from "@database";
import { BadRequestError, UnprocessableEntityError } from "@errors";
import { t } from "@i18n";
import { AuthMailService } from "@mailer";
import { UserRepository } from "@repositories";
import { UserInformation } from "@types";
import { Hash, log } from "@utils";

const TIMING_EQUALISER_HASH =
	"$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

export const AuthService = {
	async signIn(
		email: string,
		password: string,
	): Promise<{ user: UserInformation }> {
		const existing = await UserRepository().findByMail(email);

		/* Verify the password before looking at account state, and answer an
		   unknown address and a wrong password with the same message, so an
		   unauthenticated caller cannot tell a registered address from an unknown
		   one. The dummy comparison keeps the unknown-address path as slow as a
		   real one. */
		const isPasswordValid = await Hash.compareHash(
			password,
			existing?.password ?? TIMING_EQUALISER_HASH,
		);

		if (!existing || !isPasswordValid) {
			throw new BadRequestError(t("auth.validationError"), [
				{ field: "email", message: t("auth.invalidCredentials") },
			]);
		}

		if (!existing.emailVerifiedAt) {
			throw new BadRequestError(t("auth.validationError"), [
				{
					field: "email",
					message: t("auth.emailNotVerified"),
				},
			]);
		}

		if (existing.status !== "ACTIVE") {
			throw new BadRequestError(t("auth.validationError"), [
				{ field: "email", message: t("auth.accountInactive") },
			]);
		}

		const user = await UserRepository().userInformation(existing.id);
		if (!user) {
			throw new BadRequestError(t("auth.validationError"), [
				{ field: "email", message: t("auth.userNotFound") },
			]);
		}

		await Cache.set(UserInformationCacheKey(user.id), user, 3600);
		return { user };
	},

	async signUp(name: string, email: string, password: string) {
		const existing = await UserRepository().findByMail(email);
		if (existing) {
			throw new UnprocessableEntityError(t("auth.validationError"), [
				{ field: "email", message: t("auth.emailAlreadyRegistered") },
			]);
		}

		const hashedPassword = await Hash.generateHash(password);
		const user = await prisma.user.create({
			data: { name, email, password: hashedPassword },
			select: {
				id: true,
				name: true,
				email: true,
				status: true,
				createdAt: true,
				updatedAt: true,
			},
		});

		try {
			await AuthMailService.sendVerificationEmail(user.id);
		} catch (error) {
			log.error(
				{ error, userId: user.id },
				"Failed to queue verification email after signup",
			);
		}

		return user;
	},

	async verifyEmail(token: string) {
		const record = await prisma.userEmailVerification.findFirst({
			where: { token },
		});

		if (!record) {
			throw new BadRequestError(t("auth.validationError"), [
				{ field: "token", message: t("auth.invalidVerificationToken") },
			]);
		}

		// A spent token is indistinguishable from a bad one to the caller — the
		// row survives consumption now, so this check is what enforces single use.
		if (record.usedAt !== null) {
			throw new BadRequestError(t("auth.validationError"), [
				{ field: "token", message: t("auth.invalidVerificationToken") },
			]);
		}

		if (record.expiresAt < new Date()) {
			await prisma.userEmailVerification.updateMany({
				where: { userId: record.userId, usedAt: null },
				data: { usedAt: new Date() },
			});
			throw new BadRequestError(t("auth.validationError"), [
				{
					field: "token",
					message: t("auth.verificationTokenExpired"),
				},
			]);
		}

		await prisma.$transaction([
			prisma.user.update({
				where: { id: record.userId },
				data: { emailVerifiedAt: new Date() },
			}),
			// Stamp rather than delete, so consumption is auditable. Every
			// outstanding token for this user is spent, matching the previous
			// delete-all-for-user behaviour.
			prisma.userEmailVerification.updateMany({
				where: { userId: record.userId, usedAt: null },
				data: { usedAt: new Date() },
			}),
		]);
	},

	async forgotPassword(email: string) {
		const user = await UserRepository().findByMail(email);
		if (!user) {
			return; // Silent — do not leak whether email exists
		}

		await AuthMailService.sendResetPasswordEmail(user.id);
	},

	async resetPassword(token: string, newPassword: string) {
		const record = await prisma.passwordReset.findFirst({ where: { token } });

		if (!record) {
			throw new BadRequestError(t("auth.validationError"), [
				{ field: "token", message: t("auth.invalidResetToken") },
			]);
		}

		// A spent token is indistinguishable from a bad one to the caller — the
		// row survives consumption now, so this check is what enforces single use.
		if (record.usedAt !== null) {
			throw new BadRequestError(t("auth.validationError"), [
				{ field: "token", message: t("auth.invalidResetToken") },
			]);
		}

		if (record.expiresAt < new Date()) {
			await prisma.passwordReset.updateMany({
				where: { userId: record.userId, usedAt: null },
				data: { usedAt: new Date() },
			});
			throw new BadRequestError(t("auth.validationError"), [
				{
					field: "token",
					message: t("auth.resetTokenExpired"),
				},
			]);
		}

		const hashedPassword = await Hash.generateHash(newPassword);
		await prisma.$transaction([
			prisma.user.update({
				where: { id: record.userId },
				data: { password: hashedPassword },
			}),
			// Stamp rather than delete, so consumption is auditable. Every
			// outstanding reset token for this user is spent — a password that has
			// just changed must invalidate the other links that could change it
			// again.
			prisma.passwordReset.updateMany({
				where: { userId: record.userId, usedAt: null },
				data: { usedAt: new Date() },
			}),
		]);
	},

	async resendVerification(email: string) {
		const user = await UserRepository().findByMail(email);
		if (!user || user.emailVerifiedAt) {
			return; // Silent — do not leak info
		}

		await AuthMailService.sendVerificationEmail(user.id);
	},
};
