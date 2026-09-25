"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { localeFor } from "@/lib/i18n/format";

/**
 * Sunucu bileşenlerinin içine gömülebilen dil-duyarlı tarih metni (bkz. T.tsx).
 * SSR'da her zaman tr-TR ile render olur (LanguageProvider varsayılanı "tr"),
 * client'ta mount sonrası seçili dile göre güncellenir.
 */
export function FormattedDate({
  value,
  options,
}: {
  value: string;
  options: Intl.DateTimeFormatOptions;
}) {
  const { lang } = useLanguage();
  return <>{new Intl.DateTimeFormat(localeFor(lang), options).format(new Date(value))}</>;
}
