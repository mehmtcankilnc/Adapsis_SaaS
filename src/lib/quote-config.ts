import type { ProductVariant, QuoteConfigurationItem } from "@/types/product.types";

/**
 * Teklif konfigürasyonunu Postgres JSONB-uyumlu array formatına dönüştürür.
 * Store'dan gelen `selections` bir obje (Record<variant_id, option_value>).
 * Postgres trigger'ı JSONB array bekler; obje gönderilirse "cannot extract elements from an object" hatası oluşur.
 */
export function normalizeConfigurationToArray(
  selections: Record<string, string>,
  variants?: Pick<ProductVariant, "id" | "options">[],
): QuoteConfigurationItem[] {
  const configArray: QuoteConfigurationItem[] = [];

  for (const [variantId, optionValue] of Object.entries(selections)) {
    const entry: QuoteConfigurationItem = {
      variant_id: variantId,
      selected_value: optionValue,
    };

    if (variants && Array.isArray(variants)) {
      const variant = variants.find((v) => v.id === variantId);
      if (variant && variant.options) {
        const selectedOption = variant.options.find(
          (o) => o.value === optionValue,
        );
        if (selectedOption) {
          entry.label = selectedOption.label;
          if (selectedOption.inventory_item_id) {
            entry.inventory_id = selectedOption.inventory_item_id;
            entry.required_amount = selectedOption.required_amount || 1;
          }
        }
      }
    }

    configArray.push(entry);
  }

  return configArray;
}

/**
 * Bir teklifin kayıtlı `configuration` alanını (yeni array formatı ya da
 * eski object formatı) konfigüratör store'unun beklediği
 * `selections: Record<variant_id, option_value>` şekline çevirir.
 * Teklif kopyalama ve şablon uygulama akışlarının ortak dönüşüm noktası —
 * bkz. quotes/[quoteId]/page.tsx'teki aynı array/object ayrıştırma mantığı.
 */
export function configurationToSelections(
  configuration: QuoteConfigurationItem[] | Record<string, string> | null | undefined,
): Record<string, string> {
  if (!configuration) return {};

  if (Array.isArray(configuration)) {
    const selections: Record<string, string> = {};
    for (const item of configuration) {
      selections[item.variant_id] = item.selected_value;
    }
    return selections;
  }

  if (typeof configuration === "object") {
    return configuration;
  }

  return {};
}
