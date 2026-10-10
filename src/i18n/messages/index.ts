import type { Locale } from "../locales";
import { pl } from "./pl";
import { uk, type Messages } from "./uk";

const dictionaries: Record<Locale, Messages> = { uk, pl };

export const messagesFor = (locale: Locale): Messages => dictionaries[locale];
export type { Messages };
