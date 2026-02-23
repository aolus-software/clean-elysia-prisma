export interface EmailOptions {
	to: string;
	subject: string;
	template?: string;
	variables?: Record<string, string>;
	html?: string;
	text?: string;
}
