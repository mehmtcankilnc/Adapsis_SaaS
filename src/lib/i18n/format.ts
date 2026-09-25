import type { Lang } from "./dictionary";

// Tarih/sayı formatlama için BCP47 locale — text-transform: uppercase gibi
// CSS kurallarını etkilemez (o <html lang> özniteliğine bağlı), sadece
// Intl.DateTimeFormat/NumberFormat çıktısını (ay adları, ayraçlar) belirler.
export function localeFor(lang: Lang): string {
  return lang === "en" ? "en-US" : "tr-TR";
}
