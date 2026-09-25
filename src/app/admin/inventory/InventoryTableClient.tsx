"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2,
  Plus,
  Minus,
  Save,
  ArrowRightLeft,
  PackageSearch,
} from "lucide-react";
import {
  updateStockLevelAction,
  editInventoryItemAction,
} from "@/actions/inventory.actions";
import { EmptyState } from "@/components/shared/EmptyState";
import { RequestUpdateButton } from "@/components/shared/RequestUpdateButton";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { InventoryItem } from "@/types/product.types";

export default function InventoryTableClient({
  inventory,
  role,
}: {
  inventory: InventoryItem[];
  role: string;
}) {
  const { t } = useLanguage();
  // Girdi-Çıktı Modal
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [adjustValue, setAdjustValue] = useState<string>("");
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  // Düzenle Modal
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [editData, setEditData] = useState({
    item_name: "",
    sku: "",
    unit: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Arama state'i
  const [searchTerm, setSearchTerm] = useState("");

  const fetchStatus = (stock: number): { label: string; variant: "destructive" | "warning" | "success" } => {
    if (stock <= 5) return { label: t("admin.inventory.statusCritical"), variant: "destructive" };
    if (stock <= 20) return { label: t("admin.inventory.statusLow"), variant: "warning" };
    return { label: t("admin.inventory.statusSufficient"), variant: "success" };
  };

  // Aksiyonlar: Stok Giriş Çıkışı
  const handleOpenAdjust = (item: InventoryItem) => {
    setAdjustItem(item);
    setAdjustValue("");
    setAdjustError(null);
  };

  const submitAdjust = async (type: "add" | "remove") => {
    if (!adjustItem) return;
    const val = Number(adjustValue);
    if (!val || val <= 0) {
      setAdjustError(t("admin.inventory.invalidPositiveNumber"));
      return;
    }

    setIsAdjusting(true);
    setAdjustError(null);
    const change = type === "add" ? val : -val;
    const res = await updateStockLevelAction(adjustItem.id, change);
    setIsAdjusting(false);

    if (res.success) {
      setAdjustItem(null);
    } else {
      setAdjustError(res.error || t("admin.inventory.updateFailed"));
    }
  };

  // Aksiyonlar: Item Düzenleme
  const handleOpenEdit = (item: InventoryItem) => {
    setEditItem(item);
    setEditData({ item_name: item.item_name, sku: item.sku, unit: item.unit });
    setEditError(null);
  };

  const submitEdit = async () => {
    if (!editItem) return;
    if (!editData.item_name || !editData.sku || !editData.unit) {
      setEditError(t("admin.inventory.allFieldsRequired"));
      return;
    }

    setIsEditing(true);
    setEditError(null);
    const res = await editInventoryItemAction(editItem.id, editData);
    setIsEditing(false);

    if (res.success) {
      setEditItem(null);
    } else {
      setEditError(res.error || t("admin.inventory.saveFailed"));
    }
  };

  // Client-side filtering logic
  const filteredInventory = inventory.filter((item) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (item.item_name && item.item_name.toLowerCase().includes(term)) ||
      (item.sku && item.sku.toLowerCase().includes(term))
    );
  });

  return (
    <>
      {/* Kontrol Çubukları */}
      <div className="flex justify-between items-center mb-6">
        <div className="relative w-full max-w-md">
          <PackageSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={t("admin.inventory.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 shadow-sm"
          />
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t("admin.inventory.itemNameLabel")}
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                  {t("admin.inventory.columnCurrentStock")}
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
                  {t("admin.inventory.columnStatus")}
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                  {t("admin.inventory.columnActions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {!filteredInventory || filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-0 py-0 bg-slate-50/30">
                    <EmptyState
                      icon={PackageSearch}
                      title={searchTerm ? t("admin.inventory.emptySearchTitle") : t("admin.inventory.emptyTitle")}
                      description={searchTerm ? `"${searchTerm}" ${t("admin.inventory.emptySearchDescriptionSuffix")}` : t("admin.inventory.emptyDescription")}
                      action={searchTerm ? (
                        <Button variant="outline" onClick={() => setSearchTerm("")}>
                          {t("admin.inventory.clearSearchButton")}
                        </Button>
                      ) : undefined}
                    />
                  </td>
                </tr>
              ) : (
                filteredInventory.map((item) => {
                  const status = fetchStatus(Number(item.stock_level));
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm font-mono text-slate-500 font-medium">
                        {item.sku}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-800">
                        {item.item_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        <span className="font-bold text-slate-900 text-lg mr-1">
                          {item.stock_level}
                        </span>
                        <span className="text-slate-500 uppercase text-xs">
                          {item.unit}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge
                          variant={status.variant}
                          className="px-3 py-1 bg-opacity-15 shadow-none border-none"
                        >
                          {status.label}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {role !== 'sales' ? (
                          <>
                            <Button
                              variant="outline"
                              onClick={() => handleOpenAdjust(item)}
                              className="h-8 text-xs font-semibold px-3 mr-2 bg-white"
                            >
                              <ArrowRightLeft className="w-3 h-3 mr-1" />{" "}
                              {t("admin.inventory.stockMovementButton")}
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => handleOpenEdit(item)}
                              className="h-8 text-xs font-semibold px-3 text-slate-500 hover:text-brand-600 hover:bg-brand-50"
                            >
                              {t("admin.inventory.editButton")}
                            </Button>
                          </>
                        ) : (
                          <RequestUpdateButton
                            requestType="inventory"
                            itemId={item.id}
                            itemName={item.item_name}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Stok Giriş Çıkış Modalı */}
      {adjustItem && (
        <Dialog
          open={!!adjustItem}
          onOpenChange={(v) => !v && setAdjustItem(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("admin.inventory.stockMovementDialogTitle")}</DialogTitle>
              <DialogDescription>
                <strong>{adjustItem.item_name}</strong> {t("admin.inventory.stockMovementDescriptionMiddle")}{" "}
                <strong>
                  {adjustItem.stock_level} {adjustItem.unit}
                </strong>
              </DialogDescription>
            </DialogHeader>
            <div className="p-6 space-y-4">
              {adjustError && (
                <div className="text-sm font-medium text-red-600 bg-red-50 p-3 rounded">
                  {adjustError}
                </div>
              )}

              <div className="space-y-2">
                <Label>{t("admin.inventory.adjustAmountLabel")}</Label>
                <Input
                  type="number"
                  value={adjustValue}
                  onChange={(e) => setAdjustValue(e.target.value)}
                  placeholder={t("admin.inventory.adjustAmountPlaceholder")}
                />
              </div>
            </div>
            <DialogFooter className="flex gap-2 sm:justify-end">
              <Button
                variant="destructive"
                onClick={() => submitAdjust("remove")}
                disabled={isAdjusting || !adjustValue}
                className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
              >
                {isAdjusting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("admin.inventory.processingButton")}</>
                ) : (
                  <><Minus className="mr-2 h-4 w-4" /> {t("admin.inventory.stockOutButton")}</>
                )}
              </Button>
              <Button
                variant="primary"
                onClick={() => submitAdjust("add")}
                disabled={isAdjusting || !adjustValue}
                className="bg-emerald-600 hover:bg-emerald-700 hover:text-emerald-50 text-white w-full sm:w-auto"
              >
                {isAdjusting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("admin.inventory.processingButton")}</>
                ) : (
                  <><Plus className="mr-2 h-4 w-4" /> {t("admin.inventory.stockInButton")}</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Ürün Düzenleme Modalı */}
      {editItem && (
        <Dialog open={!!editItem} onOpenChange={(v) => !v && setEditItem(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("admin.inventory.editDialogTitle")}</DialogTitle>
            </DialogHeader>
            <div className="p-6 space-y-4">
              {editError && (
                <div className="text-sm font-medium text-red-600 bg-red-50 p-3 rounded">
                  {editError}
                </div>
              )}

              <div className="flex flex-col gap-4">
                <div className="space-y-2">
                  <Label>{t("admin.inventory.itemNameLabel")}</Label>
                  <Input
                    value={editData.item_name}
                    onChange={(e) =>
                      setEditData({ ...editData, item_name: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("admin.inventory.skuLabel")}</Label>
                    <Input
                      value={editData.sku}
                      onChange={(e) =>
                        setEditData({ ...editData, sku: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("admin.inventory.unitLabel")}</Label>
                    <Input
                      value={editData.unit}
                      onChange={(e) =>
                        setEditData({ ...editData, unit: e.target.value })
                      }
                      placeholder={t("admin.inventory.unitPlaceholderEdit")}
                    />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setEditItem(null)}>
                {t("common.cancel")}
              </Button>
              <Button
                variant="primary"
                onClick={submitEdit}
                disabled={isEditing}
              >
                {isEditing ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("admin.inventory.savingButton")}</>
                ) : (
                  <><Save className="mr-2 h-4 w-4" /> {t("admin.inventory.saveChangesButton")}</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
