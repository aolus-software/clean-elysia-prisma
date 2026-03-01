import { UserStatus } from "@prisma-generated";
import { t } from "elysia";

export interface UserInformation {
	id: string;
	name: string;
	email: string;
	roles: string[];
	status: UserStatus;
	permissions: string[];
	createdAt: Date;
	updatedAt: Date;
}

export const UserInformationTypeBox = t.Object({
	id: t.String(),
	name: t.String(),
	email: t.String({
		format: "email",
	}),
	roles: t.Array(t.String()),
	permissions: t.Array(t.String()),
});

export type UserList = {
	id: string;
	name: string;
	email: string;
	status: UserStatus;
	roles: string[];
	createdAt: Date;
	updatedAt: Date;
};

export type UserCreate = {
	name: string;
	email: string;
	password: string;
	status?: UserStatus;
	remark?: string;
	role_ids?: string[];
};

export type UserDetail = {
	id: string;
	name: string;
	email: string;
	status: UserStatus;
	roles: {
		id: string;
		name: string;
	}[];
	createdAt: Date;
	updatedAt: Date;
};

export type UserForAuth = {
	id: string;
	name: string;
	email: string;
	password: string;
	status: UserStatus | null;
	email_verified_at: Date | null;
};
