import { en } from "./en";
import { si } from "./si";
import { ta } from "./ta";

export type LanguageCode = "en" | "si" | "ta";
export type Translations = typeof en;

export const translations: Record<LanguageCode, Translations> = {
  en,
  si,
  ta,
};

export const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  en: "English",
  si: "සිංහල",
  ta: "தமிழ்",
};
