"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { Lang } from "@/lib/i18n/dictionary";

const OPTIONS: { value: Lang; label: string }[] = [
  { value: "tr", label: "TR" },
  { value: "en", label: "EN" },
];

/**
 * Radix DropdownMenu bilinçli olarak kullanılmıyor (bkz. UserMenu.tsx'teki
 * not) — bunun yerine basit bir trigger+panel; panel altta yeterli yer
 * yoksa (örn. MobileSidebar'ın en altındaki konum) yukarı doğru açılır.
 */
export function LanguageSelector() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (rect) setOpenUp(window.innerHeight - rect.bottom < 160);

    function handleOutsideClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  const current = OPTIONS.find((o) => o.value === lang) ?? OPTIONS[0];

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Dil / Language"
        className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold rounded-md pl-3 pr-2 py-1.5 cursor-pointer hover:bg-slate-700 transition-colors"
      >
        {current.label}
        <ChevronDown className="h-3 w-3 text-slate-400" />
      </button>

      {open && (
        <div
          className={`absolute left-0 z-50 w-20 rounded-lg border border-slate-200 bg-white p-1 shadow-lg ${
            openUp ? "bottom-full mb-1.5" : "top-full mt-1.5"
          }`}
        >
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                setLang(o.value);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              {o.label}
              {o.value === lang && <Check className="h-3.5 w-3.5 text-brand-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
