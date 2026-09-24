export type Lang = "tr" | "en";

// NOT: Bu sözlük şimdilik sadece paylaşılan layout/nav bileşenlerini
// (Sidebar, TopNavbar, MobileSidebar, UserMenu, CurrencySelector,
// LanguageSelector) kapsıyor — sayfa içerikleri (dashboard, ürünler,
// pipeline vb.) bilinçli olarak bu kapsamın dışında tutuldu (kullanıcı
// kararı: önce altyapı + seçici, çeviri ileride genişletilecek).
export const dictionary = {
  tr: {
    "nav.dashboard": "Kontrol Paneli",
    "nav.salesCrm": "Satış & CRM",
    "nav.quotes": "Teklifler",
    "nav.customers": "Müşteriler",
    "nav.myRequests": "Taleplerim",
    "nav.productStock": "Ürün & Stok",
    "nav.productCatalog": "Ürün Kataloğu",
    "nav.inventory": "Envanter",
    "nav.management": "Yönetim",
    "nav.requests": "Talepler",
    "nav.pipeline": "Satış Hattı",
    "nav.settings": "Ayarlar",
    "nav.viewOnly": "Sadece Görüntüleme",
    "common.search": "Ara...",
    "common.logout": "Çıkış Yap",
    "common.cancel": "İptal",
    "common.loggingOut": "Çıkış Yapılıyor...",
    "common.logoutConfirmTitle": "Çıkış Yap",
    "common.logoutConfirmDescription": "Çıkış yapmak istediğinize emin misiniz? Tekrar giriş yapmanız gerekecek.",
    "common.language": "Dil",
    "common.openMenu": "Menüyü aç",
    "common.closeMenu": "Menüyü kapat",
  },
  en: {
    "nav.dashboard": "Dashboard",
    "nav.salesCrm": "Sales & CRM",
    "nav.quotes": "Quotes",
    "nav.customers": "Customers",
    "nav.myRequests": "My Requests",
    "nav.productStock": "Product & Stock",
    "nav.productCatalog": "Product Catalog",
    "nav.inventory": "Inventory",
    "nav.management": "Management",
    "nav.requests": "Requests",
    "nav.pipeline": "Sales Pipeline",
    "nav.settings": "Settings",
    "nav.viewOnly": "View Only",
    "common.search": "Search...",
    "common.logout": "Log Out",
    "common.cancel": "Cancel",
    "common.loggingOut": "Logging out...",
    "common.logoutConfirmTitle": "Log Out",
    "common.logoutConfirmDescription": "Are you sure you want to log out? You'll need to sign in again.",
    "common.language": "Language",
    "common.openMenu": "Open menu",
    "common.closeMenu": "Close menu",
  },
} as const;

export type DictionaryKey = keyof typeof dictionary["tr"];
