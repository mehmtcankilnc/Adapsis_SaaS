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
  User,
  LogOut,
} from "lucide-react";
import { logoutUserAction } from "@/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { CurrencySelector } from "./CurrencySelector";

export function MobileSidebar({
  isSuperAdmin,
  unreadQuoteCount,
  pendingRequestCount,
  userName,
  role,
}: {
  isSuperAdmin: boolean;
  unreadQuoteCount: number;
  pendingRequestCount: number;
  userName: string;
  role: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const close = () => setOpen(false);

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
        aria-label="Menüyü aç"
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
                aria-label="Menüyü kapat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
              <Link href="/sales/dashboard" onClick={close} className={linkClass(pathname === "/sales/dashboard")}>
                <LayoutDashboard className="w-4 h-4 opacity-70 shrink-0" /> Dashboard
              </Link>

              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-3 pt-4 pb-1">
                Satış &amp; CRM
              </div>
              <Link
                href="/sales/quotes"
                onClick={close}
                className={`${linkClass(pathname.startsWith("/sales/quotes"))} justify-between`}
              >
                <span className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 opacity-70 shrink-0" /> Teklifler
                </span>
                {unreadQuoteCount > 0 && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />}
              </Link>
              <Link href="/shared/customers" onClick={close} className={linkClass(pathname.startsWith("/shared/customers"))}>
                <Users className="w-4 h-4 opacity-70 shrink-0" /> Müşteriler
              </Link>
              {!isSuperAdmin && (
                <Link href="/sales/requests" onClick={close} className={linkClass(pathname.startsWith("/sales/requests"))}>
                  <ClipboardList className="w-4 h-4 opacity-70 shrink-0" /> Taleplerim
                </Link>
              )}

              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-3 pt-4 pb-1">
                Ürün &amp; Stok
              </div>
              <Link
                href="/admin/products"
                onClick={close}
                className={`${linkClass(pathname.startsWith("/admin/products"))} justify-between`}
              >
                <span className="flex items-center gap-2.5">
                  <Package className="w-4 h-4 opacity-70 shrink-0" /> Ürün Kataloğu
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
                  Envanter
                </span>
                {!isSuperAdmin && <Eye className="w-4 h-4 text-slate-500 opacity-70 shrink-0" />}
              </Link>

              {isSuperAdmin && (
                <>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-3 pt-4 pb-1">
                    Yönetim
                  </div>
                  <Link
                    href="/admin/requests"
                    onClick={close}
                    className={`${linkClass(pathname.startsWith("/admin/requests"))} justify-between`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Inbox className="w-4 h-4 opacity-70 shrink-0" /> Talepler
                    </span>
                    {pendingRequestCount > 0 && (
                      <span className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold leading-none text-white bg-red-500 shrink-0">
                        {pendingRequestCount}
                      </span>
                    )}
                  </Link>
                  <Link href="/admin/settings" onClick={close} className={linkClass(pathname.startsWith("/admin/settings"))}>
                    <Settings className="w-4 h-4 opacity-70 shrink-0" /> Ayarlar
                  </Link>
                </>
              )}
            </div>

            <div className="shrink-0 border-t border-slate-800 p-3 space-y-3">
              <CurrencySelector />
              <div className="flex items-center gap-2 text-sm px-1">
                <div className="bg-slate-800 rounded-full p-1.5 border border-slate-700 shrink-0">
                  <User className="h-4 w-4 text-slate-400" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-slate-200 leading-none truncate">{userName}</span>
                  <span className="text-[10px] text-brand-400 mt-0.5 uppercase tracking-wider font-bold">{role}</span>
                </div>
              </div>
              <form action={logoutUserAction}>
                <Button
                  type="submit"
                  variant="ghost"
                  className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800 h-9 px-3"
                >
                  <LogOut className="h-4 w-4 mr-2" /> Çıkış Yap
                </Button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
