import { TopHeader } from '@/components/layout/TopHeader'

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <TopHeader />
      <div className="flex-1">
        {children}
      </div>
    </div>
  )
}
