"use client";

import React, { useState } from "react";
import {
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  Loader2,
  Package,
  Layers,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { CategorySelectField } from "@/components/shared/CategorySelectField";
import { useProductBuilderStore } from "@/store/product-builder";
import { createProductAction, getCategoriesAction } from "@/actions/product.actions";
import { PriceEffectType, StockRecipeItem, InventoryItem } from "@/types/product.types";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export default function NewProductPage() {
  const router = useRouter();
  const store = useProductBuilderStore();
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [stockRecipe, setStockRecipe] = useState<StockRecipeItem[]>([]);

  React.useEffect(() => {
    // Zustand store'u modül seviyesinde bir singleton olduğundan, önceki bir
    // "Yeni Ürün Ekle" denemesinden kalan taslak veriler (isim, fiyat,
    // varyasyonlar) burada temizlenmezse bu sayfaya her dönüşte geri gelir.
    // Bu yüzden sayfa her mount olduğunda store sıfırlanır.
    store.reset();
  }, []);

  React.useEffect(() => {
    async function loadData() {
      const catResult = await getCategoriesAction();
      if (catResult.success && catResult.data) {
        setCategories(catResult.data);
      }

      // Envanter listesini çek
      try {
        const res = await fetch('/api/inventory-list');
        if (res.ok) {
          const data = await res.json();
          setInventoryItems(data.items || []);
        }
      } catch (e) {
        console.error('Envanter çekilemedi:', e);
      }

      setIsLoadingCategories(false);
    }
    loadData();
  }, []);

  const handleSave = async () => {
    setIsSubmitting(true);

    const result = await createProductAction({
      name: store.name,
      sku: store.sku,
      description: store.description,
      categoryId: store.categoryId,
      basePrice: store.basePrice,
      baseCurrency: store.baseCurrency,
      variants: store.variants,
      stockRecipe: stockRecipe.filter(s => s.inventory_id && s.amount > 0),
    });

    if (!result.success) {
      toast.error(t("admin.products.createFailedToast"), {
        description:
          result.error || t("admin.products.unexpectedErrorRetry"),
      });
      setIsSubmitting(false);
    } else {
      toast.success(t("admin.products.createdToast"));
      store.reset();
      router.push("/admin/products");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      {/* Header section */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 sm:py-0 sm:h-16">
            <div className="flex items-center space-x-4 min-w-0">
              <Link
                href="/admin/products"
                className="p-2 -ml-2 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="min-w-0">
                <h1 className="text-xl font-semibold text-slate-900 truncate">
                  {t("admin.products.newPageTitle")}
                </h1>
              </div>
            </div>

            <div className="flex items-center space-x-3 shrink-0">
              <Button
                variant="ghost"
                onClick={() => router.push("/admin/products")}
              >
                {t("common.cancel")}
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={isSubmitting || !store.name || store.basePrice < 0}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                    {t("admin.products.savingButton")}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> {t("admin.products.saveProductButton")}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Overview Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {t("admin.products.basicInfoTitle")}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {t("admin.products.basicInfoDescriptionNew")}
              </p>
            </div>

            <Card>
              <CardContent className="pt-6 space-y-5">
                <div className="space-y-2">
                  <Label>
                    {t("admin.products.categoryLabel")} <span className="text-red-500">*</span>
                  </Label>
                  <CategorySelectField
                    categories={categories}
                    value={store.categoryId}
                    onChange={(id) => store.setBaseInfo({ categoryId: id })}
                    onCategoryCreated={(c) => setCategories((prev) => [...prev, c])}
                    disabled={isLoadingCategories}
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    {t("admin.products.nameLabel")} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={store.name}
                    onChange={(e) =>
                      store.setBaseInfo({ name: e.target.value })
                    }
                    placeholder={t("admin.products.namePlaceholder")}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("admin.products.skuLabel")}</Label>
                  <Input
                    value={store.sku}
                    onChange={(e) => store.setBaseInfo({ sku: e.target.value })}
                    placeholder={t("admin.products.skuPlaceholder")}
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    {t("admin.products.basePriceLabel")} <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex gap-3">
                    <Input
                      type="number"
                      min="0"
                      value={
                        store.basePrice === 0 && !store.name
                          ? ""
                          : store.basePrice
                      }
                      onChange={(e) =>
                        store.setBaseInfo({
                          basePrice: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="0.00"
                      className="flex-1 text-right"
                    />
                    <SelectNative
                      value={store.baseCurrency}
                      onChange={(e) =>
                        store.setBaseInfo({ baseCurrency: e.target.value })
                      }
                      className="w-28 bg-slate-50"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="TRY">TRY</option>
                    </SelectNative>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t("admin.products.descriptionLabel")}</Label>
                  <textarea
                    className="w-full min-h-[100px] rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors focus-visible:outline-none focus-visible:border-brand-500 focus-visible:ring-1 focus-visible:ring-brand-500"
                    value={store.description}
                    onChange={(e) =>
                      store.setBaseInfo({ description: e.target.value })
                    }
                    placeholder={t("admin.products.descriptionPlaceholder")}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {t("admin.products.variantsTitle")}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {t("admin.products.variantsDescriptionNew")}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={store.addVariantGroup}
                className="shrink-0 bg-white"
              >
                <Plus className="mr-2 h-4 w-4" /> {t("admin.products.addGroupButton")}
              </Button>
            </div>

            <div className="space-y-5">
              {store.variants.map((group, groupIndex) => (
                <Card key={groupIndex} className="overflow-hidden">
                  <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1 flex items-center space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-medium">
                        {groupIndex + 1}
                      </div>
                      <div className="flex-1 max-w-sm">
                        <Input
                          value={group.group_name}
                          onChange={(e) =>
                            store.updateVariantGroup(groupIndex, {
                              group_name: e.target.value,
                            })
                          }
                          placeholder={t("admin.products.groupNamePlaceholder")}
                          className="h-9 font-medium"
                        />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => store.removeVariantGroup(groupIndex)}
                      className="text-slate-500 hover:text-red-600 px-2 shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-white border-b border-slate-100 text-slate-500">
                        <tr>
                          <th className="px-5 py-3 font-medium">{t("admin.products.columnOptionName")}</th>
                          <th className="px-5 py-3 font-medium">{t("admin.products.columnSystemCode")}</th>
                          <th className="px-5 py-3 font-medium">
                            {t("admin.products.columnPriceEffect")}
                          </th>
                          <th className="px-5 py-3 font-medium">{t("admin.products.columnAmount")}</th>
                          <th className="px-5 py-3 font-medium text-center">
                            {t("admin.products.columnDefault")}
                          </th>
                          <th className="px-5 py-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {(group.options || []).map((option, optIdx) => (
                          <tr
                            key={optIdx}
                            className="hover:bg-slate-50/50 transition-colors"
                          >
                            <td className="px-5 py-3 align-top">
                              <Input
                                value={option.label}
                                onChange={(e) =>
                                  store.updateOption(groupIndex, optIdx, {
                                    label: e.target.value,
                                  })
                                }
                                placeholder={t("admin.products.optionLabelPlaceholder")}
                                className="h-9 w-full min-w-[120px]"
                              />
                            </td>
                            <td className="px-5 py-3 align-top">
                              <Input
                                value={option.value}
                                onChange={(e) =>
                                  store.updateOption(groupIndex, optIdx, {
                                    value: e.target.value,
                                  })
                                }
                                placeholder={t("admin.products.optionValuePlaceholder")}
                                className="h-9 w-full min-w-[100px] text-slate-500"
                              />
                            </td>
                            <td className="px-5 py-3 align-top">
                              <SelectNative
                                value={option.price_effect.type}
                                onChange={(e) => {
                                  store.updateOption(groupIndex, optIdx, {
                                    price_effect: {
                                      ...option.price_effect,
                                      type: e.target.value as PriceEffectType,
                                    },
                                  });
                                }}
                                className="h-9 w-[130px]"
                              >
                                <option value="fixed">{t("admin.products.priceEffectFixed")}</option>
                                <option value="multiplier">{t("admin.products.priceEffectMultiplier")}</option>
                                <option value="percentage">{t("admin.products.priceEffectPercentage")}</option>
                              </SelectNative>
                            </td>
                            <td className="px-5 py-3 align-top">
                              <Input
                                type="number"
                                value={
                                  option.price_effect.amount === 0 &&
                                  optIdx === (group.options?.length || 0) - 1
                                    ? ""
                                    : option.price_effect.amount
                                }
                                onChange={(e) => {
                                  store.updateOption(groupIndex, optIdx, {
                                    price_effect: {
                                      ...option.price_effect,
                                      amount: parseFloat(e.target.value) || 0,
                                    },
                                  });
                                }}
                                placeholder="0"
                                className="h-9 w-24 text-right"
                              />
                            </td>
                            <td className="px-5 py-3 text-center align-middle">
                              <div className="flex justify-center -mt-1">
                                <input
                                  title={t("admin.products.defaultRadioTitleNew")}
                                  type="radio"
                                  name={`default_${groupIndex}`}
                                  checked={option.is_default}
                                  onChange={() => {
                                    group.options?.forEach((o, i) => {
                                      store.updateOption(groupIndex, i, {
                                        is_default: i === optIdx,
                                      });
                                    });
                                  }}
                                  className="w-4 h-4 text-brand-600 focus:ring-brand-500 border-slate-300 cursor-pointer"
                                />
                              </div>
                            </td>
                            <td className="px-5 py-3 text-right align-top">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  store.removeOption(groupIndex, optIdx)
                                }
                                className="h-9 w-9 text-slate-400 hover:text-red-600 hover:bg-slate-100"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-3 bg-white border-t border-slate-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => store.addOption(groupIndex)}
                      className="text-brand-600 hover:text-brand-700 hover:bg-brand-50 w-full justify-start text-xs rounded-md"
                    >
                      <Plus className="mr-2 h-3 w-3" /> {t("admin.products.addOptionButton")}
                    </Button>
                  </div>
                </Card>
              ))}

              {store.variants.length === 0 && (
                <div className="border-2 border-dashed border-slate-200 rounded-xl py-16 px-6 text-center bg-white">
                  <Layers className="h-10 w-10 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-sm font-semibold text-slate-900 mb-1">
                    {t("admin.products.noVariantsTitle")}
                  </h3>
                  <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
                    {t("admin.products.noVariantsDescription")}
                  </p>
                  <Button variant="secondary" onClick={store.addVariantGroup}>
                    <Plus className="mr-2 h-4 w-4" /> {t("admin.products.addParameterButton")}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stok Reçetesi Bölümü */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 flex items-center">
                <Package className="h-5 w-5 text-brand-600 mr-2" />
                {t("admin.products.stockRecipeTitle")}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {t("admin.products.stockRecipeDescription")}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setStockRecipe(prev => [...prev, { inventory_id: '', amount: 1 }])}
              className="shrink-0 bg-white"
            >
              <Plus className="mr-2 h-4 w-4" /> {t("admin.products.addStockItemButton")}
            </Button>
          </div>

          {stockRecipe.length > 0 ? (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3 font-semibold text-slate-600">{t("admin.products.columnInventoryItem")}</th>
                      <th className="px-5 py-3 font-semibold text-slate-600 w-40">{t("admin.products.columnRequiredAmount")}</th>
                      <th className="px-5 py-3 w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {stockRecipe.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-5 py-3">
                          <SelectNative
                            value={item.inventory_id}
                            onChange={(e) => {
                              const updated = [...stockRecipe];
                              updated[idx] = { ...updated[idx], inventory_id: e.target.value };
                              setStockRecipe(updated);
                            }}
                            className="w-full"
                          >
                            <option value="">{t("admin.products.selectItemOption")}</option>
                            {inventoryItems.map((inv) => (
                              <option key={inv.id} value={inv.id}>
                                {inv.item_name} ({inv.sku}) {t("admin.products.stockPrefix")} {inv.stock_level} {inv.unit}
                              </option>
                            ))}
                          </SelectNative>
                        </td>
                        <td className="px-5 py-3">
                          <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={item.amount}
                            onChange={(e) => {
                              const updated = [...stockRecipe];
                              updated[idx] = { ...updated[idx], amount: parseFloat(e.target.value) || 0 };
                              setStockRecipe(updated);
                            }}
                            className="h-9 w-full text-right"
                            placeholder="1"
                          />
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setStockRecipe(prev => prev.filter((_, i) => i !== idx))}
                            className="h-9 w-9 text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <div className="border-2 border-dashed border-slate-200 rounded-xl py-10 px-6 text-center bg-white">
              <Package className="h-8 w-8 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">{t("admin.products.noStockRecipeMessage")}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
