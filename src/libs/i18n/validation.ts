import { t } from "./i18n";

type RawValidationError = {
	path?: string;
	message?: string;
	schema?: { format?: string; pattern?: string };
};

export const translateValidationMessage = (err: RawValidationError): string => {
	const message = err.message ?? "";
	const format = err.schema?.format;

	if (format === "email") return t("validation.expectedEmail");
	if (format === "uuid") return t("validation.expectedUuid");
	if (format === "date-time") return t("validation.expectedDateTime");

	if (!message) return t("validation.invalid");

	const lower = message.toLowerCase();

	if (lower.includes("required")) return t("validation.required");
	if (lower.includes("expected string length") && lower.includes("greater"))
		return t("validation.tooShort");
	if (lower.includes("expected string length") && lower.includes("less"))
		return t("validation.tooLong");
	if (lower.includes("expected number to be greater"))
		return t("validation.tooSmall");
	if (lower.includes("expected number to be less"))
		return t("validation.tooLarge");
	if (lower.includes("expected string")) return t("validation.expectedString");
	if (lower.includes("expected number")) return t("validation.expectedNumber");
	if (lower.includes("expected boolean"))
		return t("validation.expectedBoolean");
	if (lower.includes("expected array")) return t("validation.expectedArray");
	if (lower.includes("expected object")) return t("validation.expectedObject");
	if (lower.includes("expected") && lower.includes("match"))
		return t("validation.patternMismatch");

	return message;
};
