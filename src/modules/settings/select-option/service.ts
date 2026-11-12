import {
	Cache,
	PermissionSelectOptionsCacheKey,
	RoleSelectOptionsCacheKey,
	SELECT_OPTIONS_TTL_SECONDS,
} from "@cache";
import { PermissionRepository, RoleRepository } from "@repositories";
import { PermissionSelectOptions } from "@types";

type RoleSelectOption = { id: string; name: string };

export const SelectOptionService = {
	async permissions(): Promise<PermissionSelectOptions[]> {
		const key = PermissionSelectOptionsCacheKey();
		const cached = await Cache.get<PermissionSelectOptions[]>(key);
		if (cached) return cached;

		const options = await PermissionRepository().selectOptions();
		await Cache.set(key, options, SELECT_OPTIONS_TTL_SECONDS);
		return options;
	},

	async roles(): Promise<RoleSelectOption[]> {
		const key = RoleSelectOptionsCacheKey();
		const cached = await Cache.get<RoleSelectOption[]>(key);
		if (cached) return cached;

		const result = await RoleRepository().findAll({
			page: 1,
			perPage: 1000,
			sortDirection: "asc",
			sort: "name",
		});
		const options = result.data.map((role) => ({
			id: role.id,
			name: role.name,
		}));
		await Cache.set(key, options, SELECT_OPTIONS_TTL_SECONDS);
		return options;
	},
};
