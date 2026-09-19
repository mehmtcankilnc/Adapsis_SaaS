import { Skeleton } from "@/components/ui/skeleton";

export function DocumentSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-6 flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>

      <div className="max-w-5xl mx-auto bg-white border border-slate-200 shadow-lg rounded-xl overflow-hidden">
        <div className="p-8 sm:p-12 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3.5 w-56" />
            </div>
          </div>
          <div className="space-y-2 w-full md:w-56">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3 ml-auto" />
          </div>
        </div>

        <div className="p-8 sm:p-12 border-b border-slate-100 flex flex-col md:flex-row gap-12">
          <div className="flex-1 space-y-3">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-5 w-48" />
          </div>
          <div className="flex-1 space-y-3">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-5 w-48" />
          </div>
        </div>

        <div className="p-8 sm:p-12 space-y-4">
          <Skeleton className="h-3 w-56 mb-2" />
          <Skeleton className="h-40 w-full rounded-lg" />
          <div className="flex justify-end">
            <div className="w-full sm:w-1/2 lg:w-1/3 space-y-3 pt-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
