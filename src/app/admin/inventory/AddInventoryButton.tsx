'use client'

import React, { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { createInventoryItemAction } from '@/actions/inventory.actions'

export default function AddInventoryButton() {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    item_name: '',
    sku: '',
    unit: '',
    stock_level: 0
  })

  // Modalı açtığımızda formu sıfırla
  const handleOpenStatus = (status: boolean) => {
    setOpen(status)
    if (status) {
      setFormData({ item_name: '', sku: '', unit: '', stock_level: 0 })
    }
  }

  const handleSubmit = async () => {
    if (!formData.item_name || !formData.sku || !formData.unit) {
      toast.error('Lütfen tüm alanları doldurun.')
      return
    }

    setIsSubmitting(true)

    const res = await createInventoryItemAction(formData)

    setIsSubmitting(false)

    if (res.success) {
      toast.success('Stok kalemi eklendi')
      setOpen(false)
    } else {
      toast.error('Stok kalemi eklenemedi', {
        description: res.error || undefined,
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenStatus}>
      <DialogTrigger asChild>
        <Button variant="primary" className="shadow-sm transition-all">
          <Plus className="mr-2 h-4 w-4" /> Yeni Stok Kalemi
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Yeni Stok Kalemi Ekle</DialogTitle>
          <DialogDescription>
            Envantere yeni bir ham madde veya parça kaydı açın.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-4">
          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label>Ham Madde / Parça Adı <span className="text-red-500">*</span></Label>
              <Input 
                value={formData.item_name}
                onChange={(e) => setFormData({...formData, item_name: e.target.value})}
                placeholder="Örn: 2mm Alüminyum Levha"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Stok Kodu (SKU) <span className="text-red-500">*</span></Label>
                <Input 
                  value={formData.sku}
                  onChange={(e) => setFormData({...formData, sku: e.target.value})}
                  placeholder="Örn: ALU-2MM-L"
                />
              </div>
              <div className="space-y-2">
                <Label>Birim <span className="text-red-500">*</span></Label>
                <Input 
                  value={formData.unit}
                  onChange={(e) => setFormData({...formData, unit: e.target.value})}
                  placeholder="Adet, kg, plaka..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Başlangıç Stok Miktarı</Label>
              <Input 
                type="number"
                value={formData.stock_level}
                onChange={(e) => setFormData({...formData, stock_level: Number(e.target.value)})}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isSubmitting}>İptal</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Kaydediliyor...</>
            ) : (
              <><Save className="mr-2 h-4 w-4" /> Sisteme Kaydet</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
