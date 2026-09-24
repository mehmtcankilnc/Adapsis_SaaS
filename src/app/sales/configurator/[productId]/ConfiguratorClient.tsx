"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Check,
  Info,
  ShoppingCart,
  Calculator,
  Loader2,
  ChevronDown,
  Percent,
  AlertTriangle,
  Plus,
  BookmarkPlus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { useSalesConfiguratorStore } from "@/store/sales-configurator";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { createQuoteAction } from "@/actions/quote.actions";
import { createCustomerAction } from "@/actions/customer.actions";
import { createTemplateAction, deleteTemplateAction } from "@/actions/quote-template.actions";
import { configurationToSelections } from "@/lib/quote-config";
import type { Customer, InventoryItem, PriceEffect, Product, ProductVariant, QuoteTemplate } from "@/types/product.types";

type ConfiguratorTemplate = Pick<QuoteTemplate, "id" | "name" | "configuration" | "created_by" | "creator_name">;

/**
 * Bir şablonun/kopyalama kaynağının içeriğini "Parametre 1: asd · Renk: Mavi"
 * şeklinde okunabilir bir özete çevirir — kullanıcı şablonu uygulamadan önce
 * içinde ne olduğunu görebilsin. Boş/eşleşmeyen varyantlar atlanır.
 */
function summarizeConfiguration(
  configuration: { variant_id: string; selected_value: string }[],
  variants: Pick<ProductVariant, "id" | "group_name" | "options">[],
): string {
  const parts: string[] = [];
  for (const item of configuration) {
    const variant = variants.find((v) => v.id === item.variant_id);
    if (!variant) continue;
    const option = variant.options?.find((o) => o.value === item.selected_value);
    if (!option) continue;
    parts.push(`${variant.group_name}: ${option.label}`);
  }
  return parts.join(" · ");
}

export default function ConfiguratorClient({
  product,
  inventoryList,
  customers: initialCustomers,
  discountApprovalThreshold = 5,
  initialSelections,
  templates: initialTemplates,
  currentUserId,
}: {
  product: Product;
  inventoryList: Pick<InventoryItem, "id" | "item_name" | "stock_level" | "reserved_stock">[];
  customers: Pick<Customer, "id" | "company_name">[];
  discountApprovalThreshold?: number;
  initialSelections?: Record<string, string>;
  templates?: ConfiguratorTemplate[];
  currentUserId?: string;
}) {
  const init = useSalesConfiguratorStore((s) => s.initialize);
  const initWithPriorSelections = useSalesConfiguratorStore((s) => s.initializeWithPriorSelections);
  const variants = useSalesConfiguratorStore((s) => s.variants);
  const selections = useSalesConfiguratorStore((s) => s.selections);
  const setSelection = useSalesConfiguratorStore((s) => s.setSelection);
  const selectedCustomerId = useSalesConfiguratorStore((s) => s.selectedCustomerId);
  const setSelectedCustomer = useSalesConfiguratorStore((s) => s.setSelectedCustomer);

  // Döviz State & Metotları
  const exchangeRates = useSalesConfiguratorStore((s) => s.exchangeRates);
  const setExchangeRates = useSalesConfiguratorStore((s) => s.setExchangeRates);
  const activeCurrency = useSalesConfiguratorStore((s) => s.activeCurrency);
  const setActiveCurrency = useSalesConfiguratorStore(
    (s) => s.setActiveCurrency,
  );
  const getConvertedTotal = useSalesConfiguratorStore(
    (s) => s.getConvertedTotal,
  );

  const [isRatesLoading, setIsRatesLoading] = useState(true);

  // Dialog & Teklif State'leri
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [customerContact, setCustomerContact] = useState("");
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);

  // Müşteri Seçimi / Hızlı Ekleme
  const [customers, setCustomers] = useState(initialCustomers);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);

  // İskonto State
  const [discountPct, setDiscountPct] = useState<number>(0);

  // Şablonlar
  const [templates, setTemplates] = useState<ConfiguratorTemplate[]>(initialTemplates || []);
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  // Bir şablon uygulandığında hangi varyantların değiştiğini kısa süre
  // görsel olarak vurgulamak için (bkz. handleApplyTemplate) — "uygulandı"
  // toast'ı tek başına yetersizdi, kullanıcı neyin değiştiğini görsün.
  const [highlightedVariantIds, setHighlightedVariantIds] = useState<Set<string>>(new Set());

  // 1) Sayfa yüklenince Ürün konfigürasyonunu initialize et. "Kopyala"
  // akışından (?fromQuote=) gelindiyse önceki seçimlerle doldur, aksi
  // halde varsayılan/ilk-seçenek mantığıyla boş başlat.
  useEffect(() => {
    if (initialSelections) {
      initWithPriorSelections(
        Number(product.base_price),
        product.base_currency,
        product.product_variants || [],
        initialSelections,
      );
    } else {
      init(
        Number(product.base_price),
        product.base_currency,
        product.product_variants || [],
      );
    }
  }, [product, init, initWithPriorSelections, initialSelections]);

  // 2) Kurları çek ve Store'a yaz
  useEffect(() => {
    async function fetchRates() {
      try {
        setIsRatesLoading(true);
        const res = await fetch(`/api/rates?base=${product.base_currency}`);
        const data = await res.json();
        if (data.rates) {
          setExchangeRates(data.rates);
        }
      } catch (err) {
        console.error("Kurlar çekilirken hata oluştu:", err);
      } finally {
        setIsRatesLoading(false);
      }
    }
    fetchRates();
  }, [product.base_currency, setExchangeRates]);

  // Fiyat dönüştürücü yardımcı fonksiyon
  const convertAmount = (amount: number) => {
    const rate = exchangeRates[activeCurrency] || 1;
    return amount * rate;
  };

  // UI Formatlayıcı — tr-TR locale ile binlik ayıraçlı, 2 ondalık basamak
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: activeCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Büyük rakamlar için dinamik font boyutu
  const getPriceFontClass = (formatted: string) => {
    const len = formatted.length;
    if (len > 22) return "text-md";
    if (len > 18) return "text-lg";
    if (len > 14) return "text-xl";
    return "text-2xl";
  };

  const formatEffect = (effect: PriceEffect) => {
    if (effect.amount === 0) return "";
    if (effect.type === "fixed") {
      const val = convertAmount(effect.amount);
      return effect.amount > 0 ? `+${formatPrice(val)}` : formatPrice(val);
    }
    if (effect.type === "multiplier") {
      return `x${effect.amount}`;
    }
    if (effect.type === "percentage") {
      return effect.amount > 0
        ? `+%${effect.amount}`
        : `-%${Math.abs(effect.amount)}`;
    }
    return "";
  };

  const rawConvertedTotal = getConvertedTotal();
  const convertedBase = convertAmount(Number(product.base_price));

  // Seçili konfigürasyonda stok yetersiz olan bir kalem var mı?
  // Varsa teklif oluşturmayı engelle — aksi halde satış temsilcisi stokta
  // olmayan bir ürünü müşteriye teklif edebilir.
  // İki farklı stok kaynağı var: (1) varyant seçeneğine bağlı envanter
  // kalemi (inventory_item_id), (2) ürünün Malzeme Reçetesi (stock_recipe) —
  // sistemdeki ürünlerin tamamı ikinci yöntemi kullanıyor, bu yüzden ikisi
  // de kontrol edilmeli.
  const hasOutOfStockVariantSelection = variants.some((variant) => {
    const selVal = selections[variant.id];
    const opt = variant.options?.find((o) => o.value === selVal);
    if (!opt || !opt.inventory_item_id) return false;
    const stockRef = inventoryList.find(
      (i) => i.id === opt.inventory_item_id,
    );
    if (!stockRef) return false;
    const available =
      Number(stockRef.stock_level) - Number(stockRef.reserved_stock || 0);
    return available < (opt.required_amount || 1);
  });

  const hasInsufficientStockRecipe = (product.stock_recipe || []).some(
    (item) => {
      if (!item.inventory_id) return false;
      const stockRef = inventoryList.find((i) => i.id === item.inventory_id);
      if (!stockRef) return false;
      const available =
        Number(stockRef.stock_level) - Number(stockRef.reserved_stock || 0);
      return available < (Number(item.amount) || 1);
    },
  );

  const hasOutOfStockSelection = hasOutOfStockVariantSelection || hasInsufficientStockRecipe;

  // İskonto hesaplama
  const discountAmount = rawConvertedTotal * (discountPct / 100);
  const convertedTotal = rawConvertedTotal - discountAmount;

  // Hızlı Müşteri Ekleme
  const handleQuickAddCustomer = async () => {
    if (!newCustomerName.trim()) return;
    setIsAddingCustomer(true);
    const res = await createCustomerAction({ company_name: newCustomerName });
    if (res.success && res.customer) {
      setCustomers(
        [...customers, res.customer].sort((a, b) =>
          a.company_name.localeCompare(b.company_name),
        ),
      );
      setSelectedCustomer(res.customer.id);
      setIsQuickAddOpen(false);
      setNewCustomerName("");
    }
    setIsAddingCustomer(false);
  };

  // Şablon Uygulama: seçili şablonun konfigürasyonunu store'a yükle.
  // Kopyalama akışıyla aynı store action'ı kullanılır (kod tekrarı yok).
  // Değişen varyant kartları 1.2s boyunca vurgulanır — "uygulandı" toast'ı
  // tek başına neyin değiştiğini göstermiyordu.
  const handleApplyTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    initWithPriorSelections(
      Number(product.base_price),
      product.base_currency,
      product.product_variants || [],
      configurationToSelections(template.configuration),
    );
    setHighlightedVariantIds(new Set(template.configuration.map((c) => c.variant_id)));
    window.setTimeout(() => setHighlightedVariantIds(new Set()), 1200);
    toast.success(`"${template.name}" şablonu uygulandı`);
  };

  // Şablon Olarak Kaydetme
  const handleSaveTemplate = async () => {
    if (!newTemplateName.trim()) return;
    setIsSavingTemplate(true);
    const res = await createTemplateAction({
      product_id: product.id,
      name: newTemplateName,
      configuration: selections,
      variants: product.product_variants || [],
    });
    setIsSavingTemplate(false);
    if (res.success && res.template) {
      setTemplates([res.template, ...templates]);
      toast.success("Şablon kaydedildi");
      setIsSaveTemplateOpen(false);
      setNewTemplateName("");
    } else {
      toast.error("Şablon kaydedilemedi", { description: res.error });
    }
  };

  // Şablon Silme
  const handleDeleteTemplate = async (templateId: string) => {
    const res = await deleteTemplateAction(templateId);
    if (res.success) {
      setTemplates(templates.filter((t) => t.id !== templateId));
      toast.success("Şablon silindi");
    } else {
      toast.error("Şablon silinemedi", { description: res.error });
    }
  };

  // Teklif Kaydetme İşlemi
  const handleCreateQuote = async () => {
    setIsSubmittingQuote(true);

    const result = await createQuoteAction({
      product_id: product.id,
      customer_id: selectedCustomerId || "",
      customer_contact: customerContact,
      configuration: selections,
      base_price_snapshot: Number(product.base_price),
      final_price: rawConvertedTotal,
      currency: activeCurrency,
      variants: product.product_variants || [],
      discount_percentage: discountPct,
    });

    setIsSubmittingQuote(false);

    if (!result.success) {
      toast.error("Teklif oluşturulamadı", { description: result.error });
    } else {
      toast.success("Teklif başarıyla sisteme kaydedildi");
      setIsDialogOpen(false);
      setSelectedCustomer(null);
      setCustomerContact("");
    }
  };

  // Klavye kısayolu: teklif modalı açıkken Ctrl/Cmd+Enter ile hızlı kaydet
  const canSubmitQuote =
    !isSubmittingQuote && !!selectedCustomerId && !hasOutOfStockSelection;
  useEffect(() => {
    if (!isDialogOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (canSubmitQuote) handleCreateQuote();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDialogOpen, canSubmitQuote, handleCreateQuote]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Üst Bilgi */}
      <div className="mb-10">
        <div className="flex items-center space-x-2 text-sm text-slate-500 mb-2 font-medium">
          <span className="text-brand-600">Satış Konfigüratörü</span>
          <span>/</span>
          <span>{product.sku || "N/A"}</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          {product.name}
        </h1>
        {product.description && (
          <p className="mt-2 text-slate-600 max-w-2xl text-base">
            {product.description}
          </p>
        )}
        {hasInsufficientStockRecipe && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm font-medium text-red-700 flex items-center max-w-2xl">
            <AlertTriangle className="h-4 w-4 mr-2 shrink-0" />
            Bu ürünün üretimi için gereken ham madde/parça stoğu yetersiz.
            Seçtiğiniz varyasyondan bağımsız olarak bu ürün için teklif
            oluşturulamaz.
          </div>
        )}
      </div>

      {/* Şablonlar: sık kullanılan konfigürasyonları kaydet/uygula. Her kart
          içeriğini (hangi seçenekler) önizler — kullanıcı uygulamadan önce
          neyi seçtiğini görsün. */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700">Kayıtlı Şablonlar</h3>
          <Dialog open={isSaveTemplateOpen} onOpenChange={setIsSaveTemplateOpen}>
            <DialogTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                <BookmarkPlus className="mr-2 h-4 w-4" /> Şablon Olarak Kaydet
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[460px] p-6 grid gap-4">
              <DialogHeader>
                <DialogTitle>Şablon Olarak Kaydet</DialogTitle>
                <DialogDescription>
                  Şu anki seçimleri isimlendirip kaydedin; ekip bu şablonu daha sonra yeni tekliflerde kullanabilir.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Kaydedilecek Seçimler</Label>
                  {variants.length > 0 ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1.5 max-h-40 overflow-y-auto">
                      {variants.map((v) => {
                        const opt = v.options?.find((o) => o.value === selections[v.id]);
                        if (!opt) return null;
                        return (
                          <div key={v.id} className="flex justify-between gap-3 text-xs">
                            <span className="text-slate-500 shrink-0">{v.group_name}</span>
                            <span className="font-medium text-slate-800 text-right">{opt.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">Bu ürünün seçilebilir varyasyonu yok.</p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Şablon Adı</Label>
                  <Input
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="Örn: Standart Paket"
                    autoFocus
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsSaveTemplateOpen(false)}>
                  İptal
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveTemplate}
                  disabled={isSavingTemplate || !newTemplateName.trim()}
                >
                  {isSavingTemplate ? "Kaydediliyor..." : "Kaydet"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {templates.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {templates.map((t) => {
              const summary = summarizeConfiguration(t.configuration, variants);
              return (
                <div
                  key={t.id}
                  className="group relative rounded-xl border border-slate-200 bg-white hover:border-brand-300 hover:shadow-sm transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate(t.id)}
                    className="w-full text-left p-4"
                  >
                    <div className="font-semibold text-sm text-slate-800 pr-6 truncate">{t.name}</div>
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2 min-h-[2rem]">
                      {summary || "Varsayılan seçimler"}
                    </p>
                    {t.creator_name && (
                      <p className="mt-2 text-[11px] text-slate-400">{t.creator_name} tarafından</p>
                    )}
                  </button>
                  {t.created_by === currentUserId && (
                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(t.id)}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity text-slate-400 hover:text-red-600 p-1"
                      title="Şablonu Sil"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-5 border border-dashed border-slate-200 rounded-xl text-sm text-slate-400 text-center bg-white">
            Bu ürün için henüz kayıtlı şablon yok. Seçimlerinizi yapıp &quot;Şablon Olarak Kaydet&quot; ile ekibiniz için ilk şablonu oluşturun.
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
        {/* Seçenekler / Sol Taraf */}
        <div className="flex-1 space-y-10">
          {variants.length === 0 ? (
            <div className="p-8 text-center text-slate-500 bg-white border border-slate-200 rounded-xl">
              Bu ürüne ait dinamik varyasyon bulunmuyor.
            </div>
          ) : (
            variants.map((variant, index) => (
              <div
                key={variant.id}
                className="scroll-mt-24"
                id={`variant-${variant.id}`}
              >
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                    <span className="flex items-center justify-center bg-slate-100 text-slate-600 w-6 h-6 rounded text-xs mr-3 font-semibold">
                      {index + 1}
                    </span>
                    {variant.group_name}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {(variant.options || []).map((option) => {
                    const isSelected = selections[variant.id] === option.value;
                    const effectText = formatEffect(option.price_effect);

                    // Stok Kontrolü
                    const stockRef = option.inventory_item_id
                      ? inventoryList.find(
                          (i) => i.id === option.inventory_item_id,
                        )
                      : null;
                    const availableStock = stockRef
                      ? Number(stockRef.stock_level) - Number(stockRef.reserved_stock || 0)
                      : 0;
                    const isOutOfStock =
                      stockRef && availableStock < (option.required_amount || 1);

                    const isJustApplied = isSelected && highlightedVariantIds.has(variant.id);

                    return (
                      <div
                        key={option.value}
                        onClick={() => setSelection(variant.id, option.value)}
                        className={cn(
                          "relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 flex flex-col justify-between min-h-[100px]",
                          isSelected
                            ? "border-brand-600 bg-brand-50/50 shadow-sm hover:border-brand-600"
                            : "border-slate-200 bg-white hover:border-brand-300 hover:shadow-sm",
                          isJustApplied && "ring-2 ring-brand-400 ring-offset-2",
                        )}
                      >
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <span
                              className={cn(
                                "font-semibold",
                                isSelected
                                  ? "text-brand-900"
                                  : "text-slate-800",
                              )}
                            >
                              {option.label}
                            </span>
                            {isSelected && (
                              <div className="bg-brand-600 rounded-full p-0.5 shrink-0 ml-2">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>

                          <div className="text-sm font-medium mb-3">
                            {effectText ? (
                              <span
                                className={cn(
                                  "inline-block px-2 py-1 rounded bg-slate-100",
                                  isSelected
                                    ? "text-brand-700 bg-brand-100/60"
                                    : "text-slate-500",
                                )}
                              >
                                {effectText}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">
                                Standard
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Inventory Feedback */}
                        {isOutOfStock ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="mt-auto text-[11px] font-semibold text-red-600 flex items-center bg-red-50 p-1.5 rounded border border-red-100 uppercase tracking-widest cursor-help">
                                YETERSİZ STOK ({Math.max(availableStock, 0)} Kullanılabilir)
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              Bu seçenek için {option.required_amount || 1} adet
                              gerekiyor, envanterde {Math.max(availableStock, 0)} adet
                              kullanılabilir stok var.
                            </TooltipContent>
                          </Tooltip>
                        ) : stockRef ? (
                          <div className="mt-auto text-[11px] font-semibold text-emerald-600 flex items-center uppercase tracking-widest opacity-60">
                            Stok Yeterli
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Fiyat Özeti / Sağ Taraf (Sticky) */}
        <div className="w-full lg:w-[420px] shrink-0">
          <div className="sticky top-24">
            <Card className="border-slate-200 shadow-md">
              <CardContent className="p-0">
                {/* Header */}
                <div className="bg-slate-900 p-6 text-white rounded-t-xl">
                  <div className="flex items-center">
                    <Calculator className="h-6 w-6 text-brand-400 mr-3" />
                    <h2 className="text-lg font-semibold">Teklif Özeti</h2>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Başlangıç Fiyatı (Converted) */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-medium">
                      Taban Fiyat
                    </span>
                    <span className="font-semibold text-slate-800">
                      {formatPrice(convertedBase)}
                    </span>
                  </div>

                  <div className="border-t border-slate-100 pt-4 space-y-3 max-h-[300px] overflow-y-auto pr-2">
                    {variants.map((v) => {
                      const selVal = selections[v.id];
                      const opt = v.options?.find((o) => o.value === selVal);
                      if (!opt) return null;

                      const effText = formatEffect(opt.price_effect);

                      return (
                        <div
                          key={v.id}
                          className="flex justify-between items-start text-sm"
                        >
                          <div className="max-w-[180px]">
                            <span className="block text-xs text-slate-400 font-medium">
                              {v.group_name}
                            </span>
                            <span className="text-slate-800 font-medium truncate">
                              {opt.label}
                            </span>
                          </div>
                          <span className="text-slate-500 font-mono text-xs mt-4">
                            {effText || "-"}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* İskonto Alanı */}
                  <div className="border-t border-slate-200 pt-4">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      İndirim Uygula
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info tabIndex={0} className="h-3.5 w-3.5 text-slate-400 cursor-help normal-case outline-none" />
                        </TooltipTrigger>
                        <TooltipContent>
                          %{discountApprovalThreshold}&apos;e kadar iskontolar doğrudan
                          uygulanır. Üzerindeki iskontolar admin onayına gönderilir ve
                          teklif onaylanana kadar &quot;Onay Bekliyor&quot; durumunda kalır.
                        </TooltipContent>
                      </Tooltip>
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          value={discountPct || ""}
                          onChange={(e) => {
                            const val = Math.min(
                              100,
                              Math.max(0, Number(e.target.value) || 0),
                            );
                            setDiscountPct(val);
                          }}
                          placeholder="0"
                          className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                        />
                        <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      </div>
                    </div>
                    {discountPct > discountApprovalThreshold && (
                      <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-amber-700 font-medium leading-snug">
                          %{discountApprovalThreshold} üzeri iskontolar admin onayı
                          gerektirir. Bu teklif onay sürecine alınacaktır.
                        </p>
                      </div>
                    )}
                    {discountPct > 0 && (
                      <div className="mt-2 flex justify-between text-xs">
                        <span className="text-red-500 font-medium">
                          İskonto Tutarı:
                        </span>
                        <span className="text-red-600 font-bold">
                          -{formatPrice(discountAmount)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-200 pt-6">
                    <div className="flex justify-between items-center mb-1 gap-3">
                      <span className="text-sm font-semibold text-slate-900 shrink-0">
                        Toplam Fiyat
                      </span>
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`font-bold text-brand-600 tracking-tight break-all text-right leading-tight ${getPriceFontClass(formatPrice(convertedTotal))}`}
                        >
                          {formatPrice(convertedTotal)}
                        </span>
                        {/* Compact Currency Dropdown */}
                        {!isRatesLoading && (
                          <div className="relative shrink-0">
                            <select
                              value={activeCurrency}
                              onChange={(e) =>
                                setActiveCurrency(e.target.value)
                              }
                              className="appearance-none bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-md pl-2 pr-6 py-1.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                            >
                              {["USD", "EUR", "TRY", "GBP", "CHF", "JPY"].map(
                                (cur) => (
                                  <option key={cur} value={cur}>
                                    {cur}
                                  </option>
                                ),
                              )}
                            </select>
                            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 text-right">
                      {isRatesLoading
                        ? "Kurlar güncelleniyor..."
                        : `Canlı döviz kuru ile hesaplanmıştır`}
                    </p>
                  </div>

                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="primary"
                        className="w-full h-12 text-base mt-4 shadow-md"
                      >
                        <ShoppingCart className="mr-2 h-5 w-5" />
                        Teklif Oluştur
                      </Button>
                    </DialogTrigger>

                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Yeni Teklif Oluştur</DialogTitle>
                        <DialogDescription>
                          Müşteri bilgilerini girerek bu dinamik konfigürasyonu,
                          resmi bir teklif kaydı olarak veritabanına ekleyin.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="p-6 space-y-5">
                        {hasOutOfStockSelection && (
                          <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm font-medium border border-red-200 flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                            Seçilen konfigürasyonda stokta yeterli miktarda
                            bulunmayan bir kalem var. Teklif oluşturmadan önce
                            lütfen seçimlerinizi güncelleyin.
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label>
                            Müşteri / Firma Adı{" "}
                            <span className="text-red-500">*</span>
                          </Label>
                          <div className="flex items-center gap-2">
                            <select
                              value={selectedCustomerId || ""}
                              onChange={(e) => setSelectedCustomer(e.target.value)}
                              className="flex flex-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <option value="">-- Müşteri Seçin --</option>
                              {customers.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.company_name}
                                </option>
                              ))}
                            </select>
                            <Dialog
                              open={isQuickAddOpen}
                              onOpenChange={setIsQuickAddOpen}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="shrink-0 h-10 w-10"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[425px] p-6 grid gap-4">
                                <DialogHeader>
                                  <DialogTitle>Hızlı Müşteri Ekle</DialogTitle>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                  <div className="flex flex-col gap-2">
                                    <Label>Firma Adı</Label>
                                    <Input
                                      value={newCustomerName}
                                      onChange={(e) =>
                                        setNewCustomerName(e.target.value)
                                      }
                                      placeholder="Örn: XYZ A.Ş."
                                    />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button
                                    variant="ghost"
                                    onClick={() => setIsQuickAddOpen(false)}
                                  >
                                    İptal
                                  </Button>
                                  <Button
                                    variant="primary"
                                    onClick={handleQuickAddCustomer}
                                    disabled={
                                      isAddingCustomer ||
                                      !newCustomerName.trim()
                                    }
                                  >
                                    {isAddingCustomer
                                      ? "Ekleniyor..."
                                      : "Ekle ve Seç"}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>İletişim Kişisi (Opsiyonel)</Label>
                          <Input
                            value={customerContact}
                            onChange={(e) => setCustomerContact(e.target.value)}
                            placeholder="Örn: Ahmet Yılmaz - Satın Alma"
                          />
                        </div>

                        <div className="mt-4 p-4 bg-slate-50 border border-slate-100 rounded-lg flex justify-between items-center gap-3">
                          <span className="text-sm font-medium text-slate-500 shrink-0">
                            Teklif Tutarı:
                          </span>
                          <span
                            className={`font-bold text-brand-600 tracking-tight text-right break-all ${getPriceFontClass(formatPrice(convertedTotal)) === "text-2xl" ? "text-lg" : "text-base"}`}
                          >
                            {formatPrice(convertedTotal)}
                          </span>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="ghost"
                          onClick={() => setIsDialogOpen(false)}
                          disabled={isSubmittingQuote}
                        >
                          İptal
                        </Button>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="primary"
                              onClick={handleCreateQuote}
                              disabled={
                                isSubmittingQuote ||
                                !selectedCustomerId ||
                                hasOutOfStockSelection
                              }
                            >
                            {isSubmittingQuote ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                                Kaydediliyor...
                              </>
                            ) : (
                              <>
                                <Check className="mr-2 h-4 w-4" /> Teklifi Kaydet
                              </>
                            )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Ctrl / Cmd + Enter ile hızlı kaydet</TooltipContent>
                        </Tooltip>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            <div className="mt-6 flex items-start text-sm text-slate-500 bg-blue-50/50 p-4 rounded-lg border border-blue-100">
              <Info className="h-5 w-5 text-brand-500 mr-3 shrink-0" />
              <p>
                Gerçek zamanlı TCMB bazlı kurlar kullanılmaktadır. Nakliye vb.
                hizmetler Sipariş Ekranı&apos;nda eklenecektir.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
