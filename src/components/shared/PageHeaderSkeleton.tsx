import { Skeleton } from "@/components/ui/skeleton";

export function PageHeaderSkeleton({ withButton = true }: { withButton?: boolean }) {
  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between h-auto py-5 sm:h-20 sm:py-0 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-52" />
            <Skeleton className="h-3.5 w-72 max-w-full" />
          </div>
          {withButton && <Skeleton className="h-10 w-44 rounded-lg shrink-0" />}
        </div>
      </div>
    </header>
  );
}
