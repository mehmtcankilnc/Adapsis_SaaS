"use client";

import React, { useEffect, useRef, useState } from "react";
import { useGlobalStore } from "@/store/global-store";
import { Check, ChevronDown } from "lucide-react";

const CURRENCIES = ["TRY", "USD", "EUR", "GBP", "CHF", "JPY"];

/**
 * Radix DropdownMenu bilinçli olarak kullanılmıyor (bkz. UserMenu.tsx'teki
 * not) — bunun yerine basit bir trigger+panel; panel altta yeterli yer
 * yoksa (örn. MobileSidebar'ın en altındaki konum) yukarı doğru açılır.
 */
export function CurrencySelector() {
  const { globalCurrency, setGlobalCurrency } = useGlobalStore();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (rect) setOpenUp(window.innerHeight - rect.bottom < 240);

    function handleOutsideClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  if (!mounted) {
    return <div className="h-8 w-20 bg-slate-800 rounded animate-pulse" />;
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold rounded-md pl-3 pr-2 py-1.5 cursor-pointer hover:bg-slate-700 transition-colors"
      >
        {globalCurrency}
        <ChevronDown className="h-3 w-3 text-slate-400" />
      </button>

      {open && (
        <div
          className={`absolute left-0 z-50 w-24 rounded-lg border border-slate-200 bg-white p-1 shadow-lg ${
            openUp ? "bottom-full mb-1.5" : "top-full mt-1.5"
          }`}
        >
          {CURRENCIES.map((cur) => (
            <button
              key={cur}
              type="button"
              onClick={() => {
                setGlobalCurrency(cur);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              {cur}
              {cur === globalCurrency && <Check className="h-3.5 w-3.5 text-brand-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
