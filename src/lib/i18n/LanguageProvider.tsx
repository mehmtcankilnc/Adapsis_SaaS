"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { dictionary, type Lang, type DictionaryKey } from "./dictionary";

const STORAGE_KEY = "adapsis_lang";

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: DictionaryKey) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "tr",
  setLang: () => {},
  t: (key) => dictionary.tr[key],
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("tr");

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored === "tr" || stored === "en") setLangState(stored);
      } catch {
        // localStorage erişilemez (gizli sekme vb.) — Türkçe varsayılanda kal.
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // yoksay — dil değişimi bu oturumda yine de çalışır, sadece kalıcı olmaz.
    }
  }, []);

  // <html lang> özniteliği dil ile senkron değilse, CSS text-transform:
  // uppercase İngilizce metinlere Türkçe büyük harf kuralını uygular
  // (örn. "description" -> "DESCRİPTİON", noktalı büyük İ). Dil değiştikçe
  // güncelleyerek bu ve benzeri locale-duyarlı davranışları düzeltiyoruz.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback((key: DictionaryKey) => dictionary[lang][key], [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
