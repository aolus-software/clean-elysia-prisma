import { baseApp } from "@base";
import { JWT_CONFIG } from "@config";
import jwtPlugin from "@elysiajs/jwt";
import { t as trans } from "@i18n";
import { AuthPlugin } from "@plugins";
import { ResponseToolkit } from "@utils";
import { Elysia } from "elysia";

import {
	ForgotPasswordResponseSchema,
	ForgotPasswordSchema,
	LoginResponseSchema,
	LoginSchema,
	MeResponseSchema,
	RegisterResponseSchema,
	RegisterSchema,
	ResendVerificationResponseSchema,
	ResendVerificationSchema,
	ResetPasswordResponseSchema,
	ResetPasswordSchema,
	VerifyEmailResponseSchema,
	VerifyEmailSchema,
} from "./schema";
import { AuthService } from "./service";

export const AuthModule = new Elysia({
	name: "auth-module",
	prefix: "/auth",
	detail: { tags: ["Auth"] },
})
	.use(baseApp)
	.use(jwtPlugin(JWT_CONFIG))
	.post(
		"/login",
		async ({ body, jwt }) => {
			const { user } = await AuthService.signIn(body.email, body.password);
			const token = await jwt.sign({ id: user.id });
			return ResponseToolkit.success(
				{
					token,
					user: {
						id: user.id,
						name: user.name,
						email: user.email,
						status: user.status,
					},
				},
				trans("auth.loginSuccess"),
			);
		},
		{
			body: LoginSchema,
			response: LoginResponseSchema,
			detail: {
				summary: "Login",
				description:
					"Authenticate with email and password, returns a JWT token",
			},
		},
	)
	.post(
		"/register",
		async ({ body, set }) => {
			set.status = 201;
			const user = await AuthService.signUp(
				body.name,
				body.email,
				body.password,
			);
			return ResponseToolkit.created(
				{
					id: user.id,
					name: user.name,
					email: user.email,
					status: user.status,
					createdAt: user.createdAt,
					updatedAt: user.updatedAt,
				},
				trans("auth.registerSuccess"),
			);
		},
		{
			body: RegisterSchema,
			response: RegisterResponseSchema,
			detail: {
				summary: "Register",
				description: "Create a new account. A verification email will be sent.",
			},
		},
	)
	.post(
		"/verify-email",
		async ({ body }) => {
			await AuthService.verifyEmail(body.token);
			return ResponseToolkit.success(null, trans("auth.emailVerified"));
		},
		{
			body: VerifyEmailSchema,
			response: VerifyEmailResponseSchema,
			detail: {
				summary: "Verify email",
				description:
					"Confirm email address using the token sent after registration",
			},
		},
	)
	.post(
		"/resend-verification",
		async ({ body }) => {
			await AuthService.resendVerification(body.email);
			return ResponseToolkit.success(
				null,
				trans("auth.resendVerificationSent"),
			);
		},
		{
			body: ResendVerificationSchema,
			response: ResendVerificationResponseSchema,
			detail: {
				summary: "Resend verification email",
				description: "Request a new email verification link",
			},
		},
	)
	.post(
		"/forgot-password",
		async ({ body }) => {
			await AuthService.forgotPassword(body.email);
			return ResponseToolkit.success(null, trans("auth.forgotPasswordSent"));
		},
		{
			body: ForgotPasswordSchema,
			response: ForgotPasswordResponseSchema,
			detail: {
				summary: "Forgot password",
				description: "Send a password reset link to the given email address",
			},
		},
	)
	.post(
		"/reset-password",
		async ({ body }) => {
			await AuthService.resetPassword(body.token, body.password);
			return ResponseToolkit.success(null, trans("auth.passwordReset"));
		},
		{
			body: ResetPasswordSchema,
			response: ResetPasswordResponseSchema,
			detail: {
				summary: "Reset password",
				description: "Set a new password using the token from the reset email",
			},
		},
	)
	.use(AuthPlugin)
	.get(
		"/me",
		({ user }) => {
			return ResponseToolkit.success(
				{
					id: user.id,
					name: user.name,
					email: user.email,
					status: user.status,
					roles: user.roles,
					permissions: user.permissions,
					createdAt: user.createdAt,
					updatedAt: user.updatedAt,
				},
				trans("auth.meRetrieved"),
			);
		},
		{
			response: MeResponseSchema,
			detail: {
				summary: "Get current user",
				description: "Returns the authenticated user's profile and permissions",
				security: [{ bearerAuth: [] }],
			},
		},
	);
