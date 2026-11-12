export const UserInformationCacheKey = (userId: string) => `user:${userId}`;

export const PermissionSelectOptionsCacheKey = () =>
	"select_option:permissions";

export const RoleSelectOptionsCacheKey = () => "select_option:roles";
