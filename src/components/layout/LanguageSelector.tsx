"use client";

import { ChevronDown } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { Lang } from "@/lib/i18n/dictionary";

export function LanguageSelector() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="relative">
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
        aria-label="Dil / Language"
        className="appearance-none bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold rounded-md pl-3 pr-8 py-1.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 hover:bg-slate-700 transition-colors"
      >
        <option value="tr">TR</option>
        <option value="en">EN</option>
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
    </div>
  );
}
