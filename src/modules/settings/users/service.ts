import { prisma } from "@database";
import {
	BadRequestError,
	NotFoundError,
	UnprocessableEntityError,
} from "@errors";
import { t } from "@i18n";
import { AuthMailService } from "@mailer";
import { UserStatus } from "@prisma-generated";
import { UserRepository } from "@repositories";
import {
	DatatableType,
	PaginationResponse,
	UserDetail,
	UserList,
} from "@types";
import { Hash, log } from "@utils";

export const UserService = {
	async list(queryParam: DatatableType): Promise<PaginationResponse<UserList>> {
		return UserRepository().findAll(queryParam);
	},

	async detail(id: string): Promise<UserDetail> {
		const user = await UserRepository().findOne(id);
		if (!user) {
			throw new NotFoundError(t("user.notFound"));
		}
		return user;
	},

	async create(data: {
		name: string;
		email: string;
		password: string;
		status?: UserStatus;
		roleIds?: string[];
	}): Promise<UserDetail> {
		const existing = await UserRepository().findByMail(data.email);
		if (existing) {
			throw new UnprocessableEntityError(t("user.emailInUse"), [
				{ field: "email", message: t("user.emailExists") },
			]);
		}

		const hashedPassword = await Hash.generateHash(data.password);

		const user = await prisma.user.create({
			data: {
				name: data.name,
				email: data.email,
				password: hashedPassword,
				status: data.status ?? UserStatus.ACTIVE,
				emailVerifiedAt: new Date(),
			},
			select: { id: true },
		});

		if (data.roleIds && data.roleIds.length > 0) {
			await prisma.userRole.createMany({
				data: data.roleIds.map((roleId) => ({
					userId: user.id,
					roleId,
				})),
				skipDuplicates: true,
			});
		}

		const created = await UserRepository().findOne(user.id);
		if (!created) {
			throw new BadRequestError(t("user.createRetrieveFailed"), []);
		}
		return created;
	},

	async update(
		id: string,
		data: {
			name?: string;
			email?: string;
			password?: string;
			status?: UserStatus;
		},
	): Promise<UserDetail> {
		const user = await UserRepository().findOne(id);
		if (!user) {
			throw new NotFoundError(t("user.notFound"));
		}

		if (data.email) {
			const existing = await UserRepository().findByMail(data.email);
			if (existing && existing.id !== id) {
				throw new UnprocessableEntityError(t("user.emailInUse"), [
					{
						field: "email",
						message: t("user.emailExists"),
					},
				]);
			}
		}

		const updateData: {
			name?: string;
			email?: string;
			password?: string;
			status?: UserStatus;
		} = {};

		if (data.name) updateData.name = data.name;
		if (data.email) updateData.email = data.email;
		if (data.status) updateData.status = data.status;
		if (data.password) {
			updateData.password = await Hash.generateHash(data.password);
		}

		await prisma.user.update({
			where: { id },
			data: updateData,
		});

		const updated = await UserRepository().findOne(id);
		if (!updated) {
			throw new BadRequestError(t("user.updateRetrieveFailed"), []);
		}
		return updated;
	},

	/**
	 * Soft delete: stamps deletedAt rather than issuing a DELETE, so the row and
	 * its audit trail survive. Every read in UserRepository filters deletedAt,
	 * so a deleted user disappears from lists, detail, the auth lookup, and the
	 * identity AuthPlugin resolves permissions from.
	 */
	async delete(id: string): Promise<void> {
		const user = await UserRepository().findOne(id);
		if (!user) {
			throw new NotFoundError(t("user.notFound"));
		}
		await prisma.user.update({
			where: { id },
			data: { deletedAt: new Date() },
		});
	},

	async sendEmailVerification(userId: string): Promise<void> {
		const existing = await UserRepository().findOne(userId);
		if (!existing) {
			throw new NotFoundError(t("user.notFound"));
		}

		try {
			await AuthMailService.sendVerificationEmail(userId);
		} catch (error) {
			log.error({ error, userId }, "Failed to send verification email");
			throw new BadRequestError(t("user.verificationEmailFailed"), []);
		}
	},

	async sendPasswordReset(userId: string): Promise<void> {
		const existing = await UserRepository().findOne(userId);
		if (!existing) {
			throw new NotFoundError(t("user.notFound"));
		}

		try {
			await AuthMailService.sendResetPasswordEmail(userId);
		} catch (error) {
			log.error({ error, userId }, "Failed to send password reset email");
			throw new BadRequestError(t("user.passwordResetEmailFailed"), []);
		}
	},

	/**
	 * Directly sets a new password for a user without a reset token.
	 * Intended for admin use only.
	 */
	async resetPassword(userId: string, newPassword: string): Promise<void> {
		const existing = await UserRepository().findOne(userId);
		if (!existing) {
			throw new NotFoundError(t("user.notFound"));
		}

		const hashedPassword = await Hash.generateHash(newPassword);
		await prisma.user.update({
			where: { id: userId },
			data: { password: hashedPassword },
		});
	},

	async syncRoles(userId: string, roleIds: string[]): Promise<void> {
		const user = await UserRepository().findOne(userId);
		if (!user) {
			throw new NotFoundError(t("user.notFound"));
		}

		await prisma.userRole.deleteMany({ where: { userId } });

		if (roleIds.length > 0) {
			await prisma.userRole.createMany({
				data: roleIds.map((roleId) => ({ userId, roleId })),
			});
		}
	},
};
