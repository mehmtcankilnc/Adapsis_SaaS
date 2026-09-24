"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { DictionaryKey } from "@/lib/i18n/dictionary";

/**
 * Sunucu bileşenlerinin (Sidebar, TopNavbar, MobileSidebar) içine gömülebilen
 * küçük bir çeviri metni. SSR'da her zaman Türkçe render olur (LanguageProvider
 * varsayılanı "tr"), client'ta mount sonrası localStorage'daki dile göre
 * güncellenir — hydration mismatch oluşmaz çünkü ilk client render de "tr" ile
 * eşleşir.
 */
export function T({ k }: { k: DictionaryKey }) {
  const { t } = useLanguage();
  return <>{t(k)}</>;
}
