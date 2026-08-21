import { sendEmailQueue } from "@bull";
import { AppConfig } from "@config";
import { prisma } from "@database";
import { NotFoundError } from "@errors";
import { getCurrentLocale, t } from "@i18n";
import { UserRepository } from "@repositories";
import { log, StrToolkit } from "@utils";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export const AuthMailService = {
	async sendVerificationEmail(userId: string) {
		const user = await UserRepository().findOne(userId);
		if (!user) {
			throw new NotFoundError("User not found");
		}

		const token = StrToolkit.random(100);
		const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
		const lang = getCurrentLocale();

		// Revoke any outstanding token before issuing a new one. Stamped rather
		// than deleted, so the audit trail survives — see prisma/schema.prisma.
		await prisma.userEmailVerification.updateMany({
			where: { userId, usedAt: null },
			data: { usedAt: new Date() },
		});
		await prisma.userEmailVerification.create({
			data: { userId, token, expiresAt },
		});

		await sendEmailQueue.add("send-email", {
			subject: t("mail.subject.verification"),
			to: user.email,
			template: "auth/email-verification",
			lang,
			variables: {
				user_name: user.name,
				verification_url: `${AppConfig.CLIENT_URL}/auth/verify-email?token=${token}`,
			},
		});

		log.info({ userId, email: user.email, lang }, "Verification email queued");
	},

	async sendResetPasswordEmail(userId: string) {
		const user = await UserRepository().findOne(userId);
		if (!user) {
			throw new NotFoundError("User not found");
		}

		const token = StrToolkit.random(100);
		const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
		const lang = getCurrentLocale();

		// Revoke any outstanding token before issuing a new one. Stamped rather
		// than deleted, so the audit trail survives — see prisma/schema.prisma.
		await prisma.passwordReset.updateMany({
			where: { userId, usedAt: null },
			data: { usedAt: new Date() },
		});
		await prisma.passwordReset.create({
			data: { userId, token, expiresAt },
		});

		await sendEmailQueue.add("send-email", {
			subject: t("mail.subject.resetPassword"),
			to: user.email,
			template: "auth/forgot-password",
			lang,
			variables: {
				user_name: user.name,
				reset_password_url: `${AppConfig.CLIENT_URL}/auth/reset-password?token=${token}`,
			},
		});

		log.info(
			{ userId, email: user.email, lang },
			"Password reset email queued",
		);
	},
};
