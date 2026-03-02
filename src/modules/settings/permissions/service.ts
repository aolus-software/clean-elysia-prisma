import { BadRequestError, NotFoundError } from "@errors";
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
			throw new NotFoundError("Permission not found");
		}
		return permission;
	},

	async create(
		name: string,
		group: string,
	): Promise<{ id: string; name: string; group: string }> {
		const existing = await PermissionRepository().findByName(name);
		if (existing) {
			throw new BadRequestError("Permission already exists", [
				{ field: "name", message: "Permission with this name already exists" },
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
			throw new NotFoundError("Permission not found");
		}

		const existing = await PermissionRepository().findByName(name);
		if (existing && existing.id !== id) {
			throw new BadRequestError("Permission already exists", [
				{ field: "name", message: "Permission with this name already exists" },
			]);
		}

		return PermissionRepository().update(id, name, group);
	},

	async delete(id: string): Promise<void> {
		const permission = await PermissionRepository().findOne(id);
		if (!permission) {
			throw new NotFoundError("Permission not found");
		}
		await PermissionRepository().delete(id);
	},
};
