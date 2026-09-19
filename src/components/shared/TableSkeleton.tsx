import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function TableSkeleton({
  rows = 6,
  cols = 5,
  withSearch = true,
}: {
  rows?: number;
  cols?: number;
  withSearch?: boolean;
}) {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {withSearch && <Skeleton className="h-10 w-full max-w-sm mb-6 rounded-lg" />}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-4 flex gap-8">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-3 flex-1 max-w-[140px]" />
          ))}
        </div>
        <div className="divide-y divide-slate-100">
          {Array.from({ length: rows }).map((_, r) => (
            <div key={r} className="px-6 py-4 flex gap-8 items-center">
              {Array.from({ length: cols }).map((_, c) => (
                <Skeleton
                  key={c}
                  className="h-4 flex-1 max-w-[140px]"
                  style={{ opacity: 1 - r * 0.06 }}
                />
              ))}
            </div>
          ))}
        </div>
      </Card>
    </main>
  );
}
