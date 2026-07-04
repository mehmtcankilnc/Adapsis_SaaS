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
import { cn } from "@/lib/utils";

export default function InventoryTableClient({
  inventory,
  role,
}: {
  inventory: any[];
  role: string;
}) {
  // Girdi-Çıktı Modal
  const [adjustItem, setAdjustItem] = useState<any>(null);
  const [adjustValue, setAdjustValue] = useState<string>("");
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  // Düzenle Modal
  const [editItem, setEditItem] = useState<any>(null);
  const [editData, setEditData] = useState({
    item_name: "",
    sku: "",
    unit: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Arama state'i
  const [searchTerm, setSearchTerm] = useState("");

  const fetchStatus = (stock: number) => {
    if (stock <= 5) return { label: "Kritik", variant: "destructive" };
    if (stock <= 20) return { label: "Azalıyor", variant: "warning" };
    return { label: "Yeterli", variant: "success" };
  };

  // Aksiyonlar: Stok Giriş Çıkışı
  const handleOpenAdjust = (item: any) => {
    setAdjustItem(item);
    setAdjustValue("");
    setAdjustError(null);
  };

  const submitAdjust = async (type: "add" | "remove") => {
    const val = Number(adjustValue);
    if (!val || val <= 0) {
      setAdjustError("Lütfen geçerli pozitif bir sayı girin.");
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
      setAdjustError(res.error || "Güncelleme başarısız.");
    }
  };

  // Aksiyonlar: Item Düzenleme
  const handleOpenEdit = (item: any) => {
    setEditItem(item);
    setEditData({ item_name: item.item_name, sku: item.sku, unit: item.unit });
    setEditError(null);
  };

  const submitEdit = async () => {
    if (!editData.item_name || !editData.sku || !editData.unit) {
      setEditError("Tüm alanlar zorunludur.");
      return;
    }

    setIsEditing(true);
    setEditError(null);
    const res = await editInventoryItemAction(editItem.id, editData);
    setIsEditing(false);

    if (res.success) {
      setEditItem(null);
    } else {
      setEditError(res.error || "Kayıt başarısız oldu.");
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
            placeholder="Stok adı veya SKU'ya göre ara..."
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
                  Ham Madde / Parça Adı
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                  Mevcut Miktar
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
                  Durum
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                  Eylemler
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {!filteredInventory || filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-0 py-0 bg-slate-50/30">
                    <EmptyState
                      icon={PackageSearch}
                      title={searchTerm ? "Arama Sonucu Bulunamadı" : "Stok Kaydı Bulunamadı"}
                      description={searchTerm ? `"${searchTerm}" ile eşleşen bir sonuç yok.` : "Sistemde henüz hiçbir üretim kalemi veya ham madde bulunmuyor. Takibe başlamak için yeni bir stok oluşturun."}
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
                          variant={status.variant as any}
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
                              Giriş/Çıkış
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => handleOpenEdit(item)}
                              className="h-8 text-xs font-semibold px-3 text-slate-500 hover:text-brand-600 hover:bg-brand-50"
                            >
                              Düzenle
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
              <DialogTitle>Stok Hareketi (Giriş/Çıkış)</DialogTitle>
              <DialogDescription>
                <strong>{adjustItem.item_name}</strong> kalemi için manuel stok
                ayarlaması yapın. Mevcut miktar:{" "}
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
                <Label>Eklenecek veya Çıkarılacak Miktar</Label>
                <Input
                  type="number"
                  value={adjustValue}
                  onChange={(e) => setAdjustValue(e.target.value)}
                  placeholder="Örn: 50"
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Minus className="mr-2 h-4 w-4" />
                )}
                Stok Çıkışı
              </Button>
              <Button
                variant="primary"
                onClick={() => submitAdjust("add")}
                disabled={isAdjusting || !adjustValue}
                className="bg-emerald-600 hover:bg-emerald-700 hover:text-emerald-50 text-white w-full sm:w-auto"
              >
                {isAdjusting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Stok Girişi
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
              <DialogTitle>Stok Kalemi Düzenle</DialogTitle>
            </DialogHeader>
            <div className="p-6 space-y-4">
              {editError && (
                <div className="text-sm font-medium text-red-600 bg-red-50 p-3 rounded">
                  {editError}
                </div>
              )}

              <div className="flex flex-col gap-4">
                <div className="space-y-2">
                  <Label>Ham Madde / Parça Adı</Label>
                  <Input
                    value={editData.item_name}
                    onChange={(e) =>
                      setEditData({ ...editData, item_name: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Stok Kodu (SKU)</Label>
                    <Input
                      value={editData.sku}
                      onChange={(e) =>
                        setEditData({ ...editData, sku: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Birim</Label>
                    <Input
                      value={editData.unit}
                      onChange={(e) =>
                        setEditData({ ...editData, unit: e.target.value })
                      }
                      placeholder="Adet, kg, metre..."
                    />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setEditItem(null)}>
                İptal
              </Button>
              <Button
                variant="primary"
                className="bg-brand-600 hover:bg-brand-700"
                onClick={submitEdit}
                disabled={isEditing}
              >
                {isEditing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Değişiklikleri Kaydet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
