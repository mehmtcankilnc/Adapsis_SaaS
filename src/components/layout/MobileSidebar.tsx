"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  Eye,
  ShieldCheck,
  Inbox,
  Settings,
  ClipboardList,
  Users,
  LayoutDashboard,
  FileText,
  Package,
  Boxes,
} from "lucide-react";
import { CurrencySelector } from "./CurrencySelector";
import { LanguageSelector } from "./LanguageSelector";
import { UserMenu } from "./UserMenu";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function MobileSidebar({
  isSuperAdmin,
  unreadQuoteCount,
  pendingRequestCount,
  dueTaskCount,
  userName,
  role,
}: {
  isSuperAdmin: boolean;
  unreadQuoteCount: number;
  pendingRequestCount: number;
  dueTaskCount: number;
  userName: string;
  role: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const close = () => setOpen(false);
  const { t } = useLanguage();

  const linkClass = (active: boolean) =>
    `px-3 py-2.5 rounded-md flex items-center gap-2.5 transition-colors text-sm font-medium ${
      active
        ? "bg-slate-800 text-white"
        : "text-slate-300 hover:text-white hover:bg-slate-800"
    }`;

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setOpen(true)}
        className="p-2 -mr-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
        aria-label={t("common.openMenu")}
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40" onClick={close} />
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-slate-900 border-r border-slate-800 shadow-xl z-50 flex flex-col">
            <div className="flex items-center justify-between h-14 px-4 border-b border-slate-800 shrink-0">
              <span className="font-bold text-lg tracking-tight text-slate-100">Adapsis</span>
              <button
                onClick={close}
                className="p-2 -mr-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label={t("common.closeMenu")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
              <Link
                href="/sales/dashboard"
                onClick={close}
                className={`${linkClass(pathname === "/sales/dashboard")} justify-between`}
              >
                <span className="flex items-center gap-2.5">
                  <LayoutDashboard className="w-4 h-4 opacity-70 shrink-0" /> {t("nav.dashboard")}
                </span>
                {dueTaskCount > 0 && (
                  <span className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold leading-none text-white bg-red-500 shrink-0">
                    {dueTaskCount}
                  </span>
                )}
              </Link>

              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-3 pt-4 pb-1">
                {t("nav.salesCrm")}
              </div>
              <Link
                href="/sales/quotes"
                onClick={close}
                className={`${linkClass(pathname.startsWith("/sales/quotes"))} justify-between`}
              >
                <span className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 opacity-70 shrink-0" /> {t("nav.quotes")}
                </span>
                {unreadQuoteCount > 0 && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />}
              </Link>
              <Link href="/shared/customers" onClick={close} className={linkClass(pathname.startsWith("/shared/customers"))}>
                <Users className="w-4 h-4 opacity-70 shrink-0" /> {t("nav.customers")}
              </Link>
              {!isSuperAdmin && (
                <Link href="/sales/requests" onClick={close} className={linkClass(pathname.startsWith("/sales/requests"))}>
                  <ClipboardList className="w-4 h-4 opacity-70 shrink-0" /> {t("nav.myRequests")}
                </Link>
              )}

              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-3 pt-4 pb-1">
                {t("nav.productStock")}
              </div>
              <Link
                href="/admin/products"
                onClick={close}
                className={`${linkClass(pathname.startsWith("/admin/products"))} justify-between`}
              >
                <span className="flex items-center gap-2.5">
                  <Package className="w-4 h-4 opacity-70 shrink-0" /> {t("nav.productCatalog")}
                </span>
                {!isSuperAdmin && <Eye className="w-4 h-4 text-slate-500 opacity-70 shrink-0" />}
              </Link>
              <Link
                href="/admin/inventory"
                onClick={close}
                className={`${linkClass(pathname.startsWith("/admin/inventory"))} justify-between`}
              >
                <span className="flex items-center gap-2.5">
                  {isSuperAdmin ? <ShieldCheck className="w-4 h-4 opacity-70 shrink-0" /> : <Boxes className="w-4 h-4 opacity-70 shrink-0" />}
                  {t("nav.inventory")}
                </span>
                {!isSuperAdmin && <Eye className="w-4 h-4 text-slate-500 opacity-70 shrink-0" />}
              </Link>

              {isSuperAdmin && (
                <>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-3 pt-4 pb-1">
                    {t("nav.management")}
                  </div>
                  <Link
                    href="/admin/requests"
                    onClick={close}
                    className={`${linkClass(pathname.startsWith("/admin/requests"))} justify-between`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Inbox className="w-4 h-4 opacity-70 shrink-0" /> {t("nav.requests")}
                    </span>
                    {pendingRequestCount > 0 && (
                      <span className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold leading-none text-white bg-red-500 shrink-0">
                        {pendingRequestCount}
                      </span>
                    )}
                  </Link>
                  <Link href="/admin/settings" onClick={close} className={linkClass(pathname.startsWith("/admin/settings"))}>
                    <Settings className="w-4 h-4 opacity-70 shrink-0" /> {t("nav.settings")}
                  </Link>
                </>
              )}
            </div>

            <div className="shrink-0 border-t border-slate-800 p-3 space-y-3">
              <div className="flex items-center gap-2">
                <LanguageSelector />
                <CurrencySelector />
              </div>
              <UserMenu name={userName} role={role} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
