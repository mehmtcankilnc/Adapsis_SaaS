import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function ConfiguratorSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-10 space-y-2">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
        <div className="flex-1 space-y-10">
          {Array.from({ length: 2 }).map((_, g) => (
            <div key={g}>
              <Skeleton className="h-5 w-40 mb-4" />
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="w-full lg:w-[420px] shrink-0">
          <Card className="border-slate-200 shadow-md">
            <CardContent className="p-0">
              <Skeleton className="h-20 w-full rounded-t-xl rounded-b-none" />
              <div className="p-6 space-y-6">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-12 w-full rounded-lg mt-4" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
