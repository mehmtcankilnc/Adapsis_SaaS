import { cn } from "@/lib/utils";

/**
 * Shimmer efektli skeleton bloğu. Veri/sayfa yüklenirken içeriğin son
 * halinin kabaca şeklini (boyut/oran) taklit eden bir yer tutucu olarak
 * kullanılır — boş ekran veya tek bir spinner yerine algılanan performansı
 * artırır.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-shimmer rounded-md", className)}
      {...props}
    />
  );
}
