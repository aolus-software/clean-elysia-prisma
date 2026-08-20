import { BadRequestError, NotFoundError } from "@errors";
import { t } from "@i18n";
import { PermissionRepository } from "@repositories";
import { DatatableType, PaginationResponse, PermissionList } from "@types";

export const PermissionService = {
	async list(
		queryParam: DatatableType,
	): Promise<PaginationResponse<PermissionList>> {
		return PermissionRepository().findAll(queryParam);
	},

	async detail(id: string): Promise<PermissionList> {
		const permission = await PermissionRepository().findOne(id);
		if (!permission) {
			throw new NotFoundError(t("permission.notFound"));
		}
		return permission;
	},

	async create(
		name: string,
		group: string,
	): Promise<{ id: string; name: string; group: string }> {
		const existing = await PermissionRepository().findByName(name);
		if (existing) {
			throw new BadRequestError(t("permission.alreadyExists"), [
				{ field: "name", message: t("permission.nameExists") },
			]);
		}
		return PermissionRepository().create(name, group);
	},

	async update(
		id: string,
		name: string,
		group: string,
	): Promise<{ id: string; name: string; group: string }> {
		const permission = await PermissionRepository().findOne(id);
		if (!permission) {
			throw new NotFoundError(t("permission.notFound"));
		}

		const existing = await PermissionRepository().findByName(name);
		if (existing && existing.id !== id) {
			throw new BadRequestError(t("permission.alreadyExists"), [
				{ field: "name", message: t("permission.nameExists") },
			]);
		}

		return PermissionRepository().update(id, name, group);
	},

	async delete(id: string): Promise<void> {
		const permission = await PermissionRepository().findOne(id);
		if (!permission) {
			throw new NotFoundError(t("permission.notFound"));
		}
		await PermissionRepository().delete(id);
	},
};
