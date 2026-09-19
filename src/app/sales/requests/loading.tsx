import { Skeleton } from "@/components/ui/skeleton";
import { CardListSkeleton } from "@/components/shared/CardListSkeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-3.5 w-72 max-w-full" />
            </div>
            <Skeleton className="h-14 w-20 rounded-lg" />
          </div>
        </div>
      </header>
      <CardListSkeleton items={3} />
    </div>
  );
}
