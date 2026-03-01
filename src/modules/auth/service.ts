import { Cache, UserInformationCacheKey } from "@cache";
import { prisma } from "@database";
import { BadRequestError } from "@errors";
import { AuthMailService } from "@mailer";
import { UserRepository } from "@repositories";
import { UserInformation } from "@types";
import { Hash, log } from "@utils";

export const AuthService = {
	async signIn(
		email: string,
		password: string,
	): Promise<{ user: UserInformation }> {
		const existing = await UserRepository().findByMail(email);
		if (!existing) {
			throw new BadRequestError("Invalid credentials", [
				{ field: "email", message: "Invalid email or password" },
			]);
		}

		const isPasswordValid = await Hash.compareHash(password, existing.password);
		if (!isPasswordValid) {
			throw new BadRequestError("Invalid credentials", [
				{ field: "password", message: "Invalid email or password" },
			]);
		}

		if (existing.status !== "ACTIVE") {
			throw new BadRequestError("Account is not active", [
				{ field: "email", message: "Your account is not active" },
			]);
		}

		if (!existing.emailVerifiedAt) {
			throw new BadRequestError("Email not verified", [
				{
					field: "email",
					message: "Please verify your email before logging in",
				},
			]);
		}

		const user = await UserRepository().userInformation(existing.id);
		if (!user) {
			throw new BadRequestError("User not found", [
				{ field: "email", message: "User not found" },
			]);
		}

		await Cache.set(UserInformationCacheKey(user.id), user, 3600);
		return { user };
	},

	async signUp(name: string, email: string, password: string) {
		const existing = await UserRepository().findByMail(email);
		if (existing) {
			throw new BadRequestError("Email already in use", [
				{ field: "email", message: "This email is already registered" },
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
			throw new BadRequestError("Invalid or expired verification token", [
				{ field: "token", message: "Token is invalid or has expired" },
			]);
		}

		if (record.expiresAt < new Date()) {
			await prisma.userEmailVerification.deleteMany({
				where: { userId: record.userId },
			});
			throw new BadRequestError("Verification token has expired", [
				{
					field: "token",
					message:
						"Token has expired. Please request a new verification email.",
				},
			]);
		}

		await prisma.$transaction([
			prisma.user.update({
				where: { id: record.userId },
				data: { emailVerifiedAt: new Date() },
			}),
			prisma.userEmailVerification.deleteMany({
				where: { userId: record.userId },
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
			throw new BadRequestError("Invalid or expired reset token", [
				{ field: "token", message: "Token is invalid or has expired" },
			]);
		}

		if (record.expiresAt < new Date()) {
			await prisma.passwordReset.deleteMany({
				where: { userId: record.userId },
			});
			throw new BadRequestError("Reset token has expired", [
				{
					field: "token",
					message: "Token has expired. Please request a new password reset.",
				},
			]);
		}

		const hashedPassword = await Hash.generateHash(newPassword);
		await prisma.$transaction([
			prisma.user.update({
				where: { id: record.userId },
				data: { password: hashedPassword },
			}),
			prisma.passwordReset.deleteMany({ where: { userId: record.userId } }),
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
