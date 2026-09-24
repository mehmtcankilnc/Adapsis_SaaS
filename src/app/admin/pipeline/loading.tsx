import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-5 sm:h-20 sm:py-0 flex items-center">
            <div className="space-y-2">
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-3.5 w-96 max-w-full" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-slate-200 shadow-sm">
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-3 w-14" />
                </div>
                <Skeleton className="h-7 w-28" />
                <Skeleton className="h-1.5 w-full rounded-full" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <Skeleton className="h-4 w-48 mb-6" />
            <Skeleton className="h-[300px] w-full rounded-lg" />
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <Skeleton className="h-4 w-40 mb-6" />
            <Skeleton className="h-[300px] w-full rounded-lg" />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="border-slate-200 shadow-sm">
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-4 w-40" />
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-16 rounded-lg" />
                  <Skeleton className="h-16 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
