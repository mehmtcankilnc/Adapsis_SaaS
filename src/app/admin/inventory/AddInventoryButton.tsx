'use client'

import React, { useState } from 'react'
import { Plus, Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { createInventoryItemAction } from '@/actions/inventory.actions'

export default function AddInventoryButton() {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

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
      setErrorMsg(null)
    }
  }

  const handleSubmit = async () => {
    if (!formData.item_name || !formData.sku || !formData.unit) {
      setErrorMsg('Lütfen tüm alanları doldurun.')
      return
    }

    setIsSubmitting(true)
    setErrorMsg(null)

    const res = await createInventoryItemAction(formData)
    
    setIsSubmitting(false)

    if (res.success) {
      setOpen(false)
    } else {
      setErrorMsg(res.error || 'Yeni stok kaydı eklenemedi.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenStatus}>
      <DialogTrigger asChild>
        <Button variant="primary" className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all">
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
          {errorMsg && <div className="text-sm font-medium text-red-600 bg-red-50 p-3 rounded">{errorMsg}</div>}
          
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
          <Button variant="primary" className="bg-brand-600 hover:bg-brand-700" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Sisteme Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
