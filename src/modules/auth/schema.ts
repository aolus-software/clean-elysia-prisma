import { commonResponse } from "@utils";
import { t } from "elysia";

// ============================================
// BODY SCHEMAS
// ============================================

export const LoginSchema = t.Object({
	email: t.String({ format: "email" }),
	password: t.String({ minLength: 1 }),
});

export const RegisterSchema = t.Object({
	name: t.String({ minLength: 1 }),
	email: t.String({ format: "email" }),
	password: t.String({ minLength: 8 }),
});

// ============================================
// DATA SCHEMAS
// ============================================

export const AuthTokenDataSchema = t.Object({
	token: t.String(),
	user: t.Object({
		id: t.String(),
		name: t.String(),
		email: t.String(),
		status: t.String(),
	}),
});

export const RegisterDataSchema = t.Object({
	id: t.String(),
	name: t.String(),
	email: t.String(),
	status: t.String(),
	createdAt: t.Date(),
	updatedAt: t.Date(),
});

export const MeDataSchema = t.Object({
	id: t.String(),
	name: t.String(),
	email: t.String(),
	status: t.String(),
	roles: t.Array(t.String()),
	permissions: t.Array(t.String()),
	createdAt: t.Date(),
	updatedAt: t.Date(),
});

// ============================================
// BODY SCHEMAS — email verification & password reset
// ============================================

export const VerifyEmailSchema = t.Object({
	token: t.String({ minLength: 1 }),
});

export const ForgotPasswordSchema = t.Object({
	email: t.String({ format: "email" }),
});

export const ResetPasswordSchema = t.Object({
	token: t.String({ minLength: 1 }),
	password: t.String({ minLength: 8 }),
});

export const ResendVerificationSchema = t.Object({
	email: t.String({ format: "email" }),
});

// ============================================
// RESPONSE SCHEMAS
// ============================================

export const LoginResponseSchema = commonResponse(AuthTokenDataSchema, {
	include: [200, 400, 401, 422, 500],
});

export const RegisterResponseSchema = commonResponse(RegisterDataSchema, {
	include: [201, 400, 422, 500],
});

export const MeResponseSchema = commonResponse(MeDataSchema, {
	include: [200, 401, 500],
});

export const VerifyEmailResponseSchema = commonResponse(t.Null(), {
	include: [200, 400, 422, 500],
});

export const ForgotPasswordResponseSchema = commonResponse(t.Null(), {
	include: [200, 422, 500],
});

export const ResetPasswordResponseSchema = commonResponse(t.Null(), {
	include: [200, 400, 422, 500],
});

export const ResendVerificationResponseSchema = commonResponse(t.Null(), {
	include: [200, 422, 500],
});
