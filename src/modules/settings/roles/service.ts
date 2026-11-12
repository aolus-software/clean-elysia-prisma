import { forgetSelectOptions } from "@cache";
import { NotFoundError, UnprocessableEntityError } from "@errors";
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

	async create(name: string): Promise<RoleList> {
		const existing = await RoleRepository().findByName(name);
		if (existing) {
			throw new UnprocessableEntityError(t("role.alreadyExists"), [
				{ field: "name", message: t("role.nameExists") },
			]);
		}
		const created = await RoleRepository().create(name);
		await forgetSelectOptions();
		return created;
	},

	async update(id: string, name: string): Promise<RoleList> {
		const role = await RoleRepository().findOne(id);
		if (!role) {
			throw new NotFoundError(t("role.notFound"));
		}

		const existing = await RoleRepository().findByName(name);
		if (existing && existing.id !== id) {
			throw new UnprocessableEntityError(t("role.alreadyExists"), [
				{ field: "name", message: t("role.nameExists") },
			]);
		}

		const updated = await RoleRepository().update(id, name);
		await forgetSelectOptions();
		return updated;
	},

	async delete(id: string): Promise<void> {
		const role = await RoleRepository().findOne(id);
		if (!role) {
			throw new NotFoundError(t("role.notFound"));
		}
		await RoleRepository().delete(id);
		await forgetSelectOptions();
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
