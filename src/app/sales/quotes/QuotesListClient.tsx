'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, ChevronRight, FileText, Percent } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef
} from '@tanstack/react-table'
import type { QuoteStatus } from '@/types/product.types'

export interface QuoteListRow {
  id: string
  customer_company: string | null
  customer_contact?: string | null
  final_price: number
  currency: string
  status: QuoteStatus
  created_at: string
  discount_percentage: number
  created_by?: string | null
  products?: { name: string } | { name: string }[] | null
  creator_name?: string
}

function getProductName(products: QuoteListRow['products']): string | undefined {
  if (!products) return undefined
  return Array.isArray(products) ? products[0]?.name : products.name
}

export function QuotesListClient({
  quotes,
  role,
  discountApprovalThreshold = 5,
}: {
  quotes: QuoteListRow[]
  role: string
  discountApprovalThreshold?: number
}) {
  const [search, setSearch] = useState('')
  const isAdmin = role === 'admin'

  const statusMap: Record<string, { label: string, variant: "success" | "warning" | "secondary" | "destructive" | "brand" }> = {
    'pending': { label: 'Bekliyor', variant: 'warning' },
    'accepted': { label: 'Onaylandı', variant: 'success' },
    'rejected': { label: 'Reddedildi', variant: 'destructive' },
    'pending_admin_approval': { label: 'İskonto Onayı', variant: 'brand' },
  }

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(new Date(dateStr))
  }

  const filteredQuotes = React.useMemo(() => {
    return quotes?.filter(q => {
      const qName = q.customer_company?.toLowerCase() || ''
      const pName = getProductName(q.products) || ''
      const cName = q.creator_name?.toLowerCase() || ''
      const s = search.toLowerCase()
      return qName.includes(s) || pName.toLowerCase().includes(s) || cName.includes(s)
    }) || []
  }, [quotes, search]);

  const columns = React.useMemo<ColumnDef<QuoteListRow>[]>(() => {
    const cols: ColumnDef<QuoteListRow>[] = [
      {
        accessorFn: (row) => row.customer_company,
        id: 'customer_company',
        header: 'Müşteri / Firma',
        cell: (info) => (
          <div className="truncate font-semibold text-slate-900" title={info.getValue() as string}>
            {info.getValue() as string}
            {info.row.original.customer_contact && (
              <div className="text-xs text-slate-500 mt-0.5 truncate">{info.row.original.customer_contact}</div>
            )}
          </div>
        ),
        size: 200,
      },
      {
        accessorFn: (row) => getProductName(row.products) || 'Bilinmeyen Ürün',
        id: 'product_name',
        header: 'Ürün Modeli',
        cell: (info) => <div className="truncate text-sm text-slate-700" title={info.getValue() as string}>{info.getValue() as string}</div>,
        size: 180,
      },
    ];

    if (isAdmin) {
      cols.push({
        accessorFn: (row) => row.creator_name || 'Bilinmeyen',
        id: 'creator_name',
        header: 'Satış Temsilcisi',
        cell: (info) => (
          <div className="flex items-center gap-2 truncate">
            <div className="w-7 h-7 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0">
              {(info.getValue() as string)[0].toUpperCase()}
            </div>
            <span className="text-sm font-medium text-slate-700 truncate" title={info.getValue() as string}>{info.getValue() as string}</span>
          </div>
        ),
        size: 160,
      });
    }

    cols.push({
      accessorFn: (row) => formatPrice(row.final_price, row.currency),
      id: 'final_price',
      header: 'Teklif Tutarı',
      cell: (info) => <div className="font-bold text-slate-800 truncate">{info.getValue() as string}</div>,
      size: 140,
    });

    if (isAdmin) {
      cols.push({
        accessorFn: (row) => Number(row.discount_percentage) || 0,
        id: 'discount',
        header: () => <div className="text-center">İskonto</div>,
        cell: (info) => {
          const discountPct = info.getValue() as number;
          return (
            <div className="text-center">
              {discountPct > 0 ? (
                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
                  discountPct > discountApprovalThreshold ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  <Percent className="h-3 w-3" />
                  {discountPct}
                </span>
              ) : (
                <span className="text-xs text-slate-400">—</span>
              )}
            </div>
          );
        },
        size: 100,
      });
    }

    cols.push({
      accessorFn: (row) => formatDate(row.created_at),
      id: 'created_at',
      header: 'Tarih',
      cell: (info) => <div className="text-sm font-medium text-slate-500 truncate">{info.getValue() as string}</div>,
      size: 150,
    });

    cols.push({
      accessorFn: (row) => row.status,
      id: 'status',
      header: 'Durum',
      cell: (info) => {
        const stat = statusMap[info.getValue() as string] || { label: info.getValue(), variant: 'secondary' };
        return <Badge variant={stat.variant}>{stat.label}</Badge>;
      },
      size: 130,
    });

    cols.push({
      id: 'actions',
      header: () => <div className="text-right">Eylemler</div>,
      cell: (info) => (
        <div className="text-right">
          <Link href={`/sales/quotes/${info.row.original.id}`}>
            <Button variant="ghost" className="text-brand-600 hover:text-brand-800 hover:bg-brand-50 font-medium h-8 px-2">
              Detay <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      ),
      size: 100,
    });

    return cols;
  }, [isAdmin, discountApprovalThreshold]);

  const table = useReactTable({
    data: filteredQuotes,
    columns,
    enableColumnResizing: isAdmin,
    columnResizeMode: 'onChange',
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Arama Alanı */}
      <div className="flex items-center space-x-2 mb-6 max-w-sm">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isAdmin ? "Firma, ürün veya satış temsilcisine göre ara..." : "Firma adına veya ürüne göre ara..."} 
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        {filteredQuotes.length === 0 ? (
          <div className="p-8 bg-slate-50/30">
            <EmptyState 
              icon={FileText} 
              title={search ? "Sonuç Bulunamadı" : "Henüz Teklif Oluşturulmamış"}
              description={search ? "Aradığınız kriterlere uygun bir teklif bulunamadı." : "Sistemde hiçbir teklif kaydı bulunmuyor. Satış konfigüratörü üzerinden ilk teklifinizi oluşturabilirsiniz."}
              action={
                <Link href="/sales/new-quote">
                  <Button variant="primary" className="mt-2 bg-slate-900 border-none text-white hover:bg-slate-800 shadow-md transition-all">
                    Yeni Teklif Oluştur
                  </Button>
                </Link>
              } 
            />
          </div>
        ) : (
          <div 
            className="overflow-x-auto w-full relative" 
            style={{ 
              cursor: table.getState().columnSizingInfo.isResizingColumn ? 'col-resize' : 'default',
              userSelect: table.getState().columnSizingInfo.isResizingColumn ? 'none' : 'auto'
            }}
          >
            <table 
              className="text-left border-collapse table-fixed min-w-full" 
              style={{ width: table.getTotalSize() }}
            >
              <thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id} className="bg-slate-50/80 border-b border-slate-200">
                    {headerGroup.headers.map(header => (
                      <th 
                        key={header.id} 
                        className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider relative group"
                        style={{ width: header.getSize() }}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                        {header.column.getCanResize() && (
                          <div
                            onMouseDown={header.getResizeHandler()}
                            onTouchStart={header.getResizeHandler()}
                            className={`absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none bg-slate-300 opacity-0 group-hover:opacity-100 hover:bg-brand-500 transition-colors ${
                              header.column.getIsResizing() ? 'bg-brand-500 opacity-100' : ''
                            }`}
                          />
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {table.getRowModel().rows.map(row => (
                  <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group">
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-4 py-4 whitespace-nowrap overflow-hidden" style={{ width: cell.column.getSize() }}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </main>
  )
}
