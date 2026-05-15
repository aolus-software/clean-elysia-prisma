import type { Locale } from "@i18n";

export interface EmailOptions {
	to: string;
	subject: string;
	template?: string;
	variables?: Record<string, string>;
	html?: string;
	text?: string;
	lang?: Locale;
}
