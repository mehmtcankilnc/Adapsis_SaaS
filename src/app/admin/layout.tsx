import { Sidebar } from '@/components/layout/Sidebar'
import { TopNavbar } from '@/components/layout/TopNavbar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <TopNavbar />
      <div className="flex flex-col lg:flex-row flex-1">
        <Sidebar />
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </div>
  )
}
