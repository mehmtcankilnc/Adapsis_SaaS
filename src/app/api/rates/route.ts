import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/utils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const base = searchParams.get("base") || "USD";

  try {
    // exchangerate-api: Ücretsiz, key gerektirmeyen, basit ve oldukça güvenilir bir cache katmanı.
    const res = await fetch(
      `https://api.exchangerate-api.com/v4/latest/${base}`,
      {
        next: { revalidate: 3600 }, // Saatte bir yenile (Rate limit'e takılmamak ve performansı artırmak için)
      },
    );

    if (!res.ok) {
      throw new Error(`API hatası: ${res.status}`);
    }

    const data: { rates: Record<string, number>; base: string } = await res.json();
    return NextResponse.json({
      success: true,
      rates: data.rates,
      base: data.base,
    });
  } catch (error: unknown) {
    console.error("Döviz kuru servisi hatası:", error);
    // Fallback (API Çökerse Kur Sistemi Çalışmaya Devam Etsin)
    // Not: Gerçek bir kurumsal sistemde bu fallback değerler de veritabanından çekilebilir.
    return NextResponse.json({
      success: false,
      error: getErrorMessage(error),
      rates: { USD: 1, EUR: 0.92, TRY: 32.5, GBP: 0.79, CHF: 0.90, JPY: 151.2 },
      base: base,
    });
  }
}
