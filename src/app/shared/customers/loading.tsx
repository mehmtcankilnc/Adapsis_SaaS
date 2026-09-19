import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col py-6 space-y-2">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-3.5 w-80 max-w-full" />
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex justify-between items-center">
            <Skeleton className="h-10 w-full max-w-sm rounded-lg" />
            <Skeleton className="h-10 w-40 rounded-lg shrink-0 ml-4" />
          </div>
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-6 py-4 flex gap-8 items-center">
                <Skeleton className="h-4 flex-1 max-w-[160px]" />
                <Skeleton className="h-4 flex-1 max-w-[120px]" />
                <Skeleton className="h-4 flex-1 max-w-[160px]" />
                <Skeleton className="h-4 flex-1 max-w-[140px]" />
                <Skeleton className="h-4 flex-1 max-w-[90px]" />
              </div>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
}
