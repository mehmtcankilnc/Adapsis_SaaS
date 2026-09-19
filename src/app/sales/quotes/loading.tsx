import { PageHeaderSkeleton } from "@/components/shared/PageHeaderSkeleton";
import { TableSkeleton } from "@/components/shared/TableSkeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeaderSkeleton />
      <TableSkeleton rows={7} cols={6} />
    </div>
  );
}
