'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { BarChart3, TrendingUp, CheckCircle2, Box, FileText, AlertCircle, Calendar as CalendarIcon } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useGlobalStore } from '@/store/global-store'
import { subDays, subMonths, subYears, isAfter } from 'date-fns'

const COLORS = ['#eab308', '#059669', '#dc2626'] // Yellow(Pending), Emerald(Accepted), Red(Rejected)

export default function DashboardClient({ rawQuotes, role, error }: any) {
  const { globalCurrency } = useGlobalStore();
  const [rates, setRates] = useState<Record<string, number>>({});
  const [timeFilter, setTimeFilter] = useState('7days');

  useEffect(() => {
    fetch('/api/rates')
      .then(r => r.json())
      .then(data => setRates(data.rates || {}))
      .catch(() => {});
  }, []);

  const filteredQuotes = useMemo(() => {
    if (!rawQuotes) return [];
    const now = new Date();
    let cutoff = new Date(0);
    if (timeFilter === '7days') cutoff = subDays(now, 7);
    else if (timeFilter === '1month') cutoff = subMonths(now, 1);
    else if (timeFilter === '1year') cutoff = subYears(now, 1);

    return rawQuotes.filter((q: any) => isAfter(new Date(q.created_at), cutoff));
  }, [rawQuotes, timeFilter]);

  const metrics = useMemo(() => {
    const total = filteredQuotes.length;
    let pendingPotentialRevenue = 0;
    let acceptedCount = 0;
    const productCounts: Record<string, number> = {};

    filteredQuotes.forEach((q: any) => {
      if (q.status === 'accepted') acceptedCount++;
      if (q.status === 'pending') {
        const c = q.currency || 'USD';
        const rateC = rates[c] || 1;
        const rateG = rates[globalCurrency] || 1;
        // Convert to TRY first, then to globalCurrency
        const valInGlobal = (Number(q.final_price) * rateC) / rateG;
        pendingPotentialRevenue += valInGlobal;
      }
      const pName = q.products?.name || 'Bilinmiyor';
      productCounts[pName] = (productCounts[pName] || 0) + 1;
    });

    let popularProduct = 'Veri Yok';
    let maxCount = 0;
    for (const [name, count] of Object.entries(productCounts)) {
      if (count > maxCount && name !== 'Bilinmiyor') {
        maxCount = count;
        popularProduct = name;
      }
    }

    return {
      total,
      pendingPotentialRevenue,
      acceptanceRate: total > 0 ? Math.round((acceptedCount / total) * 100) : 0,
      popularProduct
    };
  }, [filteredQuotes, rates, globalCurrency]);

  const lineData = useMemo(() => {
    const days = timeFilter === '7days' ? 7 : timeFilter === '1month' ? 30 : 365;
    // For 1year, line chart by day is too much, but we'll stick to it or aggregate by month for simplicity.
    // Let's do daily aggregation for 7 days and 30 days, monthly for 1 year.
    if (timeFilter === '1year') {
      const last12Months = Array.from({length: 12}).map((_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (11 - i));
        return {
          key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
          name: d.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' }),
          count: 0
        };
      });
      filteredQuotes.forEach((q: any) => {
        const d = new Date(q.created_at);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const m = last12Months.find(x => x.key === k);
        if (m) m.count++;
      });
      return last12Months;
    }

    const arr = Array.from({length: days}).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      return {
        key: d.toISOString().split('T')[0],
        name: d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
        count: 0
      };
    });
    filteredQuotes.forEach((q: any) => {
      const qDate = new Date(q.created_at).toISOString().split('T')[0];
      const match = arr.find(x => x.key === qDate);
      if (match) match.count++;
    });
    return arr;
  }, [filteredQuotes, timeFilter]);

  const pieData = useMemo(() => {
    const counts = { pending: 0, accepted: 0, rejected: 0, pending_admin_approval: 0 };
    filteredQuotes.forEach((q: any) => {
      if (q.status === 'pending') counts.pending++;
      if (q.status === 'accepted') counts.accepted++;
      if (q.status === 'rejected') counts.rejected++;
      if (q.status === 'pending_admin_approval') counts.pending_admin_approval++;
    });
    return [
      { name: 'Bekleyen', value: counts.pending },
      { name: 'Onaylanan', value: counts.accepted },
      { name: 'Reddedilen', value: counts.rejected },
      { name: 'İskonto Onayı', value: counts.pending_admin_approval },
    ];
  }, [filteredQuotes]);
  
  // Empty State Check
  if (metrics.total === 0) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md text-center bg-white p-10 rounded-2xl shadow-sm border border-slate-200">
          <div className="bg-brand-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <BarChart3 className="h-8 w-8 text-brand-600" />
          </div>
          
          {error === 'unauthorized' && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg border border-red-100 flex items-center justify-center mb-6 text-sm font-medium">
              <AlertCircle className="w-5 h-5 mr-2 shrink-0" />
              Bu işlem için yetkiniz bulunmuyor.
            </div>
          )}

          <h2 className="text-xl font-bold text-slate-900 mb-2">Henüz Analiz Edilecek Veri Yok</h2>
          <p className="text-slate-500 mb-8 text-sm">
            Dashboard özetleri ana ürün konfigürasyonu sağlayıp, ilk teklifinizi veya kaydınızı oluşturduğunuzda burada belirecektir.
          </p>
          {role === 'sales' ? (
            <div className="flex flex-col gap-3">
              <Link href="/sales/new-quote">
                <Button variant="primary" className="w-full bg-brand-600 hover:bg-brand-700 h-14 text-lg">
                  Yeni Teklif Oluştur
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Link href="/admin/products">
                <Button variant="outline" className="w-full">Ürün Katoloğunu Genişlet</Button>
              </Link>
              <Link href="/admin/products/new">
                <Button variant="primary" className="w-full bg-brand-600 hover:bg-brand-700">İlk Taslağını Oluştur</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Multi-Currency stringify
  const currencyString = `${new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(metrics.pendingPotentialRevenue)} ${globalCurrency}`

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8 border-b border-slate-200 pb-5 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Finansal Görünümler</h1>
            <p className="text-sm text-slate-500 mt-1">Gerçek zamanlı satış verileri ve teklif kitle ölçümleri.</p>
          </div>
          {error === 'unauthorized' && (
            <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg border border-red-100 flex items-center text-sm font-medium">
              <AlertCircle className="w-4 h-4 mr-2" />
              Bu işlem için yetkiniz bulunmuyor.
            </div>
          )}
        </div>

        {/* 4 Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-slate-200 shadow-sm relative overflow-hidden">
            <CardContent className="p-6 flex flex-col justify-between h-full">
              <div className="flex justify-between items-start mb-4">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Toplam Teklif</div>
                <div className="bg-blue-50 text-blue-600 p-2 rounded-md"><FileText className="h-5 w-5" /></div>
              </div>
              <div className="mt-2">
                <div className="text-4xl font-black text-slate-900 tracking-tight">{metrics.total}</div>
                <div className="text-xs text-slate-500 mt-2 font-medium">Oluşturulan tüm kayıtlar</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm relative overflow-hidden">
            <CardContent className="p-6 flex flex-col justify-between h-full">
              <div className="flex justify-between items-start mb-4">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider line-clamp-1 truncate" title="Bekleyen Potansiyel Ciro">Potansiyel Ciro</div>
                <div className="bg-brand-50 text-brand-600 p-2 rounded-md"><TrendingUp className="h-5 w-5" /></div>
              </div>
              <div className="mt-2">
                <div className="text-xl sm:text-2xl font-black text-brand-700 tracking-tight truncate py-1" title={currencyString}>{currencyString}</div>
                <div className="text-xs text-slate-500 mt-2 flex items-center font-medium"><AlertCircle className="w-4 h-4 mr-1 inline text-brand-500"/> Onay bekleyen toplam</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6 flex flex-col justify-between h-full">
              <div className="flex justify-between items-start mb-4">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Başarı Oranı</div>
                <div className="bg-emerald-50 text-emerald-600 p-2 rounded-md"><CheckCircle2 className="h-5 w-5" /></div>
              </div>
              <div className="mt-2">
                <div className="text-4xl font-black text-slate-900 tracking-tight">%{metrics.acceptanceRate}</div>
                <div className="text-xs mt-2 text-emerald-600 font-medium">Satışa dönenler</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6 flex flex-col justify-between h-full">
              <div className="flex justify-between items-start mb-4">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lokomotif Ürün</div>
                <div className="bg-slate-100 text-slate-600 p-2 rounded-md"><Box className="h-5 w-5" /></div>
              </div>
              <div className="mt-2 text-sm font-bold text-slate-900 leading-snug">
                {metrics.popularProduct}
              </div>
              <div className="text-xs text-slate-500 font-medium mt-auto pt-4">En çok konfigüre edilen</div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-base font-bold text-slate-800 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-brand-500"/> Teklif Aktivitesi
                </h3>
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-700 text-sm rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="7days">Son 7 Gün</option>
                  <option value="1month">Son 1 Ay</option>
                  <option value="1year">Son 1 Yıl</option>
                  <option value="all">Tüm Zamanlar</option>
                </select>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%" key={timeFilter}>
                  <LineChart data={lineData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 13, fontWeight: 500}} dy={15} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 13, fontWeight: 500}} allowDecimals={false} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 600 }}
                      cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    <Line type="monotone" dataKey="count" name="Teklif Sayısı" stroke="#2563eb" strokeWidth={4} dot={{r: 4, strokeWidth: 2, fill: '#fff'}} activeDot={{r: 7, fill: '#2563eb', stroke: '#fff', strokeWidth: 2}} animationDuration={500} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <h3 className="text-base font-bold text-slate-800 mb-2">Satış Dönüşüm Dağılımı</h3>
              <div className="h-[280px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 600 }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={10} wrapperStyle={{fontSize: '13px', fontWeight: 500, color: '#475569'}} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
