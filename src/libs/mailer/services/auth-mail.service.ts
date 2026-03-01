import { sendEmailQueue } from "@bull";
import { AppConfig } from "@config";
import { prisma } from "@database";
import { NotFoundError } from "@errors";
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

		await prisma.userEmailVerification.deleteMany({ where: { userId } });
		await prisma.userEmailVerification.create({
			data: { userId, token, expiresAt },
		});

		await sendEmailQueue.add("send-email", {
			subject: "Verify Your Email",
			to: user.email,
			template: "auth/email-verification",
			variables: {
				user_name: user.name,
				verification_url: `${AppConfig.CLIENT_URL}/auth/verify-email?token=${token}`,
			},
		});

		log.info({ userId, email: user.email }, "Verification email queued");
	},

	async sendResetPasswordEmail(userId: string) {
		const user = await UserRepository().findOne(userId);
		if (!user) {
			throw new NotFoundError("User not found");
		}

		const token = StrToolkit.random(100);
		const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

		await prisma.passwordReset.deleteMany({ where: { userId } });
		await prisma.passwordReset.create({
			data: { userId, token, expiresAt },
		});

		await sendEmailQueue.add("send-email", {
			subject: "Reset Your Password",
			to: user.email,
			template: "auth/forgot-password",
			variables: {
				user_name: user.name,
				reset_password_url: `${AppConfig.CLIENT_URL}/auth/reset-password?token=${token}`,
			},
		});

		log.info({ userId, email: user.email }, "Password reset email queued");
	},
};
