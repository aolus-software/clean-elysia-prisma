import { BadRequestError, NotFoundError } from "@errors";
import { t } from "@i18n";
import { RoleRepository } from "@repositories";
import {
	DatatableType,
	PaginationResponse,
	RoleDetail,
	RoleList,
} from "@types";

export const RoleService = {
	async list(queryParam: DatatableType): Promise<PaginationResponse<RoleList>> {
		return RoleRepository().findAll(queryParam);
	},

	async detail(id: string): Promise<RoleDetail> {
		const role = await RoleRepository().findOne(id);
		if (!role) {
			throw new NotFoundError(t("role.notFound"));
		}
		return role;
	},

	async create(name: string): Promise<{ id: string; name: string }> {
		const existing = await RoleRepository().findByName(name);
		if (existing) {
			throw new BadRequestError(t("role.alreadyExists"), [
				{ field: "name", message: t("role.nameExists") },
			]);
		}
		return RoleRepository().create(name);
	},

	async update(
		id: string,
		name: string,
	): Promise<{ id: string; name: string }> {
		const role = await RoleRepository().findOne(id);
		if (!role) {
			throw new NotFoundError(t("role.notFound"));
		}

		const existing = await RoleRepository().findByName(name);
		if (existing && existing.id !== id) {
			throw new BadRequestError(t("role.alreadyExists"), [
				{ field: "name", message: t("role.nameExists") },
			]);
		}

		return RoleRepository().update(id, name);
	},

	async delete(id: string): Promise<void> {
		const role = await RoleRepository().findOne(id);
		if (!role) {
			throw new NotFoundError(t("role.notFound"));
		}
		await RoleRepository().delete(id);
	},

	async syncPermissions(
		roleId: string,
		permissionIds: string[],
	): Promise<void> {
		const role = await RoleRepository().findOne(roleId);
		if (!role) {
			throw new NotFoundError(t("role.notFound"));
		}
		await RoleRepository().syncPermissions(roleId, permissionIds);
	},
};
