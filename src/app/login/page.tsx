import { LoginForm } from './LoginForm'
import { Hexagon } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      
      {/* Şirket Logosu / Branding */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-6">
          <div className="relative flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-200">
            <Hexagon className="h-10 w-10 text-brand-600 fill-brand-600/10" strokeWidth={1.5} />
          </div>
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Adapsis</h2>
        <p className="text-sm font-medium text-slate-500 mt-2 tracking-wide uppercase">B2B Kurumsal Konfigürasyon Ağı</p>
      </div>

      {/* Login Kartı */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-10 px-6 shadow-xl shadow-slate-200/50 border border-slate-200 sm:rounded-2xl sm:px-10">
          <LoginForm />
        </div>
        
        {/* Güvenlik Footer */}
        <p className="mt-8 text-center text-xs text-slate-400 font-medium">
          Bu sisteme yalnızca yetkili Adapsis personeli erişebilir. <br /> İzinsiz giriş denemeleri kaydedilmektedir.
        </p>
      </div>

    </div>
  )
}
