// Node'a özgü DNS düzeltmesi (bkz. instrumentation-node.ts) ayrı bir
// dosyada tutulur ve sadece nodejs runtime'ında dinamik olarak import
// edilir; aksi halde Next.js bu dosyayı Edge Runtime bundle'ı için de
// statik olarak analiz edip "node:dns desteklenmiyor" uyarısı verir.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}
