import { enterLocale, parseAcceptLanguage } from "@i18n";
import { Elysia } from "elysia";

export const LocalePlugin = new Elysia({ name: "locale-plugin" }).onRequest(
	({ request }) => {
		const locale = parseAcceptLanguage(request.headers.get("accept-language"));
		enterLocale(locale);
	},
);
