import Link from "next/link";
import { ArrowRight, Box, Layers, Settings, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="bg-brand-600 p-2 rounded-lg">
            <Layers className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-tight">Adapsis</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost" className="text-slate-600 font-medium hover:text-brand-600">
              Giriş Yap
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="primary" className="bg-brand-600 hover:bg-brand-700 font-medium">
              Sisteme Git
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="px-6 py-24 md:py-32 max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-sm font-semibold mb-8 border border-brand-100">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
            </span>
            B2B SaaS Platformu v2.0
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-8">
            Akıllı Üretim & <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-indigo-600">Satış Süreçleri</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto mb-12 leading-relaxed">
            Adapsis ile dinamik ürün konfigürasyonları oluşturun, gerçek zamanlı stokları yönetin ve B2B müşterilerinize profesyonel teklifler sunun.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login">
              <Button variant="primary" size="lg" className="h-14 px-8 text-lg bg-brand-600 hover:bg-brand-700 w-full sm:w-auto shadow-lg shadow-brand-200">
                Giriş Yap ve Başla <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section className="bg-white border-t border-slate-200 py-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-3 gap-12">
              <div className="flex flex-col items-center text-center">
                <div className="bg-slate-50 p-4 rounded-2xl mb-6 border border-slate-100">
                  <Settings className="h-10 w-10 text-brand-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Dinamik Konfigüratör</h3>
                <p className="text-slate-600 leading-relaxed">
                  Ürünlerinize ait karmaşık opsiyonları ve varyasyonları kolayca yönetin, müşterilerinize anında fiyat hesaplayın.
                </p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="bg-slate-50 p-4 rounded-2xl mb-6 border border-slate-100">
                  <Box className="h-10 w-10 text-brand-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Akıllı Envanter</h3>
                <p className="text-slate-600 leading-relaxed">
                  Ham madde ve parça stoklarınızı gerçek zamanlı takip edin. Teklif onaylandığında stoklar otomatik düşsün.
                </p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="bg-slate-50 p-4 rounded-2xl mb-6 border border-slate-100">
                  <ShieldCheck className="h-10 w-10 text-brand-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Güvenli ve Yetkilendirilmiş</h3>
                <p className="text-slate-600 leading-relaxed">
                  Katı Row Level Security (RLS) kuralları ile Admin ve Satış ekiplerinin yetkilerini ayırın, verilerinizi koruyun.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 text-center border-t border-slate-800">
        <p className="text-sm">
          &copy; {new Date().getFullYear()} Adapsis B2B SaaS. Tüm hakları saklıdır.
        </p>
      </footer>
    </div>
  );
}
