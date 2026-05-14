import { Locale } from "../types";
import enJson from "./en.json";
import idJson from "./id.json";
import { TranslationKey } from "./keys.generated";

const en: Record<TranslationKey, string> = enJson;
const id: Record<TranslationKey, string> = idJson;

export const dictionaries: Record<Locale, Record<TranslationKey, string>> = {
	en,
	id,
};

export type { TranslationKey } from "./keys.generated";
