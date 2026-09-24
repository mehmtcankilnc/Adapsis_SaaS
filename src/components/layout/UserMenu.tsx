'use client'

import { useState, useRef, useEffect } from 'react'
import { flushSync } from 'react-dom'
import { User, LogOut, Loader2, AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { logoutUserAction } from '@/actions/auth.actions'
import { useLanguage } from '@/lib/i18n/LanguageProvider'

/**
 * Sidebar/MobileSidebar'ın alt kısmındaki kullanıcı bilgisi bloğu — hover
 * veya click ile açılan bir menüye dönüştürülmüş hâli. Çıkış Yap artık
 * doğrudan bir form submit değil, onay modalı açan bir menü öğesi.
 *
 * NOT: Bilinçli olarak Radix DropdownMenu KULLANILMIYOR — Content bir portal
 * ile document.body'ye render olduğundan, trigger ile content arasında görsel
 * olarak bitişik olsalar da DOM'da ayrı dallarda kalıyorlar. Mouse trigger'dan
 * content'e geçerken bu "portal boşluğu" içinde an be an mouseleave/mouseenter
 * tetiklenip menü sürekli açılıp kapanıyordu (flicker). Bunun yerine trigger +
 * panel aynı `relative` sarmalayıcının DOM çocukları olacak şekilde basit bir
 * panel kuruluyor — tek bir onMouseEnter/onMouseLeave çifti tüm alanı kapsıyor.
 */
export function UserMenu({ name, role }: { name: string; role: string }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const { t } = useLanguage()

  const openMenu = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
    setMenuOpen(true)
  }
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setMenuOpen(false), 200)
  }

  // Menü açıkken dışarı tıklanırsa kapat (click ile açılan kullanıcılar için).
  useEffect(() => {
    if (!menuOpen) return
    function handleOutsideClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [menuOpen])

  async function handleConfirmLogout() {
    // Sert sayfa geçişi bazen tek bir animasyon karesi bile geçmeden
    // gerçekleşebiliyor — flushSync ile spinner'ın DOM'a commit olmasını garanti ediyoruz.
    flushSync(() => setIsLoggingOut(true))
    await logoutUserAction()
  }

  return (
    <>
      <div
        ref={wrapperRef}
        className="relative"
        onMouseEnter={openMenu}
        onMouseLeave={scheduleClose}
      >
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 text-sm px-1 py-1 w-full rounded-md hover:bg-slate-800/60 transition-colors text-left"
        >
          <div className="bg-slate-800 rounded-full p-1.5 border border-slate-700 shrink-0">
            <User className="h-4 w-4 text-slate-400" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-slate-200 leading-none truncate">{name}</span>
            <span className="text-[10px] text-brand-400 mt-0.5 uppercase tracking-wider font-bold">{role}</span>
          </div>
        </button>

        {menuOpen && (
          <div className="absolute bottom-full left-0 mb-1.5 w-48 rounded-lg border border-slate-200 bg-white p-1 shadow-lg z-50">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false)
                setConfirmOpen(true)
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
            >
              <LogOut className="h-4 w-4" /> {t('common.logout')}
            </button>
          </div>
        )}
      </div>

      <Dialog open={confirmOpen} onOpenChange={(v) => !isLoggingOut && setConfirmOpen(v)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" /> {t("common.logoutConfirmTitle")}
            </DialogTitle>
            <DialogDescription>{t("common.logoutConfirmDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={isLoggingOut}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleConfirmLogout} disabled={isLoggingOut}>
              {isLoggingOut ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t("common.loggingOut")}
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4 mr-2" /> {t("common.logout")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
