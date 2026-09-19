"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Eye, ShieldCheck, Inbox, Settings } from "lucide-react";

export function MobileNav({
  isSuperAdmin,
  unreadQuoteCount,
  pendingRequestCount,
}: {
  isSuperAdmin: boolean;
  unreadQuoteCount: number;
  pendingRequestCount: number;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const close = () => setOpen(false);

  const linkClass = (active: boolean, tone: "default" | "amber" = "default") =>
    `px-3 py-2.5 rounded-md flex items-center justify-between gap-2 transition-colors ${
      active
        ? "bg-slate-800 text-white"
        : tone === "amber"
          ? "text-amber-200 hover:text-amber-100 hover:bg-slate-800"
          : "text-slate-300 hover:text-white hover:bg-slate-800"
    }`;

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-2 -mr-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
        aria-label={open ? "Menüyü kapat" : "Menüyü aç"}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 top-14 bg-slate-900/40 backdrop-blur-sm z-40"
            onClick={close}
          />
          <div className="absolute left-0 right-0 top-14 bg-slate-900 border-b border-slate-800 shadow-lg px-3 py-3 flex flex-col gap-1 font-medium text-sm z-50 max-h-[calc(100vh-3.5rem)] overflow-y-auto">
            <Link
              href="/sales/dashboard"
              onClick={close}
              className={linkClass(pathname === "/sales/dashboard")}
            >
              Dashboard
            </Link>
            <Link
              href="/sales/quotes"
              onClick={close}
              className={linkClass(pathname.startsWith("/sales/quotes"))}
            >
              Teklifler
              {unreadQuoteCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
              )}
            </Link>
            {!isSuperAdmin && (
              <Link
                href="/sales/requests"
                onClick={close}
                className={linkClass(pathname.startsWith("/sales/requests"))}
              >
                Taleplerim
              </Link>
            )}
            <div className="h-[1px] bg-slate-800 my-1" />
            <Link
              href="/admin/products"
              onClick={close}
              className={linkClass(pathname.startsWith("/admin/products"))}
            >
              <span className="flex items-center gap-2">Ürün Kataloğu</span>
              {!isSuperAdmin && (
                <Eye className="w-4 h-4 text-slate-500 opacity-70 shrink-0" />
              )}
            </Link>
            <Link
              href="/admin/inventory"
              onClick={close}
              className={linkClass(
                pathname.startsWith("/admin/inventory"),
                isSuperAdmin ? "amber" : "default",
              )}
            >
              <span className="flex items-center gap-2">
                {isSuperAdmin && <ShieldCheck className="w-4 h-4 opacity-70" />}
                Envanter
              </span>
              {!isSuperAdmin && (
                <Eye className="w-4 h-4 text-slate-500 opacity-70 shrink-0" />
              )}
            </Link>
            {isSuperAdmin && (
              <>
                <div className="h-[1px] bg-slate-800 my-1" />
                <Link
                  href="/admin/requests"
                  onClick={close}
                  className={linkClass(pathname.startsWith("/admin/requests"), "amber")}
                >
                  <span className="flex items-center gap-2">
                    <Inbox className="w-4 h-4 opacity-70" /> Talepler
                  </span>
                  {pendingRequestCount > 0 && (
                    <span className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold leading-none text-white bg-red-500 shrink-0">
                      {pendingRequestCount}
                    </span>
                  )}
                </Link>
                <Link
                  href="/admin/settings"
                  onClick={close}
                  className={linkClass(pathname.startsWith("/admin/settings"), "amber")}
                >
                  <span className="flex items-center gap-2">
                    <Settings className="w-4 h-4 opacity-70" /> Ayarlar
                  </span>
                </Link>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
