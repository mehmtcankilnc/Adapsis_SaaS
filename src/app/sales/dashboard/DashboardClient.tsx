'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { BarChart3, TrendingUp, TrendingDown, Minus, CheckCircle2, Circle, Box, FileText, AlertCircle, Trophy, Crown, History, ListTodo, Phone, Mail, CalendarClock, MessageSquare, Target } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useGlobalStore } from '@/store/global-store'
import { subDays, subMonths, subYears, isAfter } from 'date-fns'
import { updateTaskAction } from '@/actions/task.actions'
import { OnboardingChecklist } from '@/components/dashboard/OnboardingChecklist'
import type { ActivityType, QuoteStatus } from '@/types/product.types'

const ACTIVITY_TYPE_MAP: Record<ActivityType, { label: string; icon: typeof Phone }> = {
  call: { label: 'Arama', icon: Phone },
  email: { label: 'E-posta', icon: Mail },
  meeting: { label: 'Toplantı', icon: CalendarClock },
  note: { label: 'Not', icon: FileText },
  other: { label: 'Diğer', icon: MessageSquare },
}

const formatActivityDateTime = (dateStr: string) =>
  new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(dateStr))

const formatTaskDueDate = (dateStr: string) =>
  new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(dateStr))

function isTaskOverdue(dueDateStr: string) {
  const due = new Date(dueDateStr)
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  const today = new Date()
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return dueDay.getTime() < todayDay.getTime()
}

const COLORS = ['#eab308', '#059669', '#dc2626', '#7c3aed'] // Yellow(Pending), Emerald(Accepted), Red(Rejected), Violet(Pending Admin Approval)

function TrendBadge({ value }: { value: number | null }) {
  if (value === null) return null;
  const isUp = value > 0;
  const isFlat = value === 0;
  const Icon = isFlat ? Minus : isUp ? TrendingUp : TrendingDown;
  const colorClass = isFlat
    ? 'bg-slate-100 text-slate-500'
    : isUp
      ? 'bg-emerald-50 text-emerald-600'
      : 'bg-red-50 text-red-600';

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-1.5 py-0.5 rounded ${colorClass}`}>
      <Icon className="w-3 h-3" />
      {isUp ? '+' : ''}{value}%
    </span>
  );
}

export interface DashboardQuoteRow {
  id: string
  status: QuoteStatus
  created_at: string
  accepted_at?: string | null
  final_price: number
  currency: string
  created_by?: string | null
  customer_id?: string | null
  // Sadece admin görünümünde, page.tsx'te profiles JOIN ile doldurulur.
  creator_name?: string
  // NOT: quotes -> products many-to-one bir ilişki; PostgREST çalışma
  // zamanında bunu tekil obje döndürür (dizi değil) — bkz. page.tsx'teki not.
  products?: { name: string } | null
  customers?: { company_name: string } | null
}

export interface DashboardActivityRow {
  id: string
  type: ActivityType
  subject: string
  activity_date: string
  customer_id: string
  // quotes -> products ile aynı sebepten (many-to-one), PostgREST tekil obje döndürür.
  customers?: { company_name: string } | null
}

export interface DashboardTaskRow {
  id: string
  title: string
  due_date: string
  status: string
  assigned_to?: string | null
  customer_id: string
  assignee_name?: string
  // quotes -> products ile aynı sebepten (many-to-one), PostgREST tekil obje döndürür.
  customers?: { company_name: string } | null
}

export interface RepQuotaRow {
  id: string
  full_name: string
  commissionRate: number
  targetAmount: number
  targetCurrency: string
  acceptedQuotes: { final_price: number; currency: string }[]
}

export default function DashboardClient({
  rawQuotes,
  recentActivities = [],
  dueTasks = [],
  role,
  error,
  commissionRate = 0,
  myTarget = null,
  repsQuota = [],
  onboarding,
  userId = '',
}: {
  rawQuotes: DashboardQuoteRow[]
  recentActivities?: DashboardActivityRow[]
  dueTasks?: DashboardTaskRow[]
  role: string
  error?: string
  commissionRate?: number
  myTarget?: { target_amount: number; target_currency: string } | null
  repsQuota?: RepQuotaRow[]
  onboarding?: { productCount: number; customerCount: number; salesUserCount: number }
  userId?: string
}) {
  const [tasks, setTasks] = useState(dueTasks)

  async function handleCompleteTask(taskId: string) {
    const res = await updateTaskAction(taskId, { status: 'completed' })
    if (res.success) {
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
      toast.success('Görev tamamlandı')
    } else {
      toast.error('Görev güncellenemedi', { description: res.error })
    }
  }

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

    return rawQuotes.filter((q) => isAfter(new Date(q.created_at), cutoff));
  }, [rawQuotes, timeFilter]);

  // Bir önceki dönemle karşılaştırma (trend) için: aynı uzunlukta, hemen
  // önceki zaman penceresindeki kayıtlar. "Tüm Zamanlar" için referans
  // dönem olmadığından trend hesaplanmaz.
  const previousFilteredQuotes = useMemo(() => {
    if (!rawQuotes || timeFilter === 'all') return [];
    const now = new Date();
    let cutoff = new Date(0);
    let previousCutoff = new Date(0);
    if (timeFilter === '7days') {
      cutoff = subDays(now, 7);
      previousCutoff = subDays(now, 14);
    } else if (timeFilter === '1month') {
      cutoff = subMonths(now, 1);
      previousCutoff = subMonths(now, 2);
    } else if (timeFilter === '1year') {
      cutoff = subYears(now, 1);
      previousCutoff = subYears(now, 2);
    }

    return rawQuotes.filter((q) => {
      const d = new Date(q.created_at);
      return isAfter(d, previousCutoff) && !isAfter(d, cutoff);
    });
  }, [rawQuotes, timeFilter]);

  const metrics = useMemo(() => {
    const total = filteredQuotes.length;
    let pendingPotentialRevenue = 0;
    let acceptedCount = 0;
    const productCounts: Record<string, number> = {};

    filteredQuotes.forEach((q) => {
      if (q.status === 'accepted') acceptedCount++;
      if (q.status === 'pending') {
        const c = q.currency || 'USD';
        const rateC = rates[c] || 1;
        const rateG = rates[globalCurrency] || 1;
        // rates[X], 1 USD karşılığı X para birimi miktarını verir (bkz. /api/rates, base=USD).
        // c para biriminden USD'ye çevirmek için rateC'ye böl, sonra USD'den
        // globalCurrency'ye çevirmek için rateG ile çarp.
        const valInGlobal = (Number(q.final_price) / rateC) * rateG;
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

  // En Değerli Müşteriler: onaylanmış tekliflerin toplam tutarına göre,
  // seçili zaman filtresi kapsamında. Farklı para birimlerindeki teklifler
  // metrics'teki ile aynı dönüşüm formülüyle globalCurrency'ye çevrilip toplanır.
  const topCustomers = useMemo(() => {
    const byCustomer: Record<string, { customerId: string; name: string; total: number; quoteCount: number }> = {};

    filteredQuotes.forEach((q) => {
      if (q.status !== 'accepted' || !q.customer_id) return;
      const c = q.currency || 'USD';
      const rateC = rates[c] || 1;
      const rateG = rates[globalCurrency] || 1;
      const valInGlobal = (Number(q.final_price) / rateC) * rateG;

      const name = q.customers?.company_name || 'Bilinmeyen Müşteri';
      if (!byCustomer[q.customer_id]) {
        byCustomer[q.customer_id] = { customerId: q.customer_id, name, total: 0, quoteCount: 0 };
      }
      byCustomer[q.customer_id].total += valInGlobal;
      byCustomer[q.customer_id].quoteCount++;
    });

    return Object.values(byCustomer)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [filteredQuotes, rates, globalCurrency]);

  // Trend rozetleri için bir önceki döneme ait aynı metrikler (popüler ürün hariç)
  const previousMetrics = useMemo(() => {
    const total = previousFilteredQuotes.length;
    let pendingPotentialRevenue = 0;
    let acceptedCount = 0;

    previousFilteredQuotes.forEach((q) => {
      if (q.status === 'accepted') acceptedCount++;
      if (q.status === 'pending') {
        const c = q.currency || 'USD';
        const rateC = rates[c] || 1;
        const rateG = rates[globalCurrency] || 1;
        const valInGlobal = (Number(q.final_price) / rateC) * rateG;
        pendingPotentialRevenue += valInGlobal;
      }
    });

    return {
      total,
      pendingPotentialRevenue,
      acceptanceRate: total > 0 ? Math.round((acceptedCount / total) * 100) : 0,
    };
  }, [previousFilteredQuotes, rates, globalCurrency]);

  // total/acceptanceRate için önceki döneme göre yüzde değişim; "all" filtresinde
  // veya önceki dönemde hiç kayıt yoksa null döner (trend gösterilmez).
  const getTrend = (current: number, previous: number): number | null => {
    if (timeFilter === 'all') return null;
    if (previous === 0) return current > 0 ? null : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const totalTrend = getTrend(metrics.total, previousMetrics.total);
  const acceptanceTrend = getTrend(metrics.acceptanceRate, previousMetrics.acceptanceRate);

  // Admin temsilci sıralaması: filtrelenmiş dönemdeki teklifleri temsilciye göre grupla
  const leaderboard = useMemo(() => {
    if (role !== 'admin') return [];
    const byRep: Record<string, { name: string; total: number; accepted: number }> = {};

    filteredQuotes.forEach((q) => {
      // created_by boşsa (eski/seed kayıtlar, sistem tarafından oluşturulanlar) gerçek
      // bir temsilci olmadığından sıralamaya dahil edilmez.
      if (!q.created_by) return;
      const name = q.creator_name || 'Bilinmeyen';
      if (!byRep[name]) byRep[name] = { name, total: 0, accepted: 0 };
      byRep[name].total++;
      if (q.status === 'accepted') byRep[name].accepted++;
    });

    return Object.values(byRep)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [filteredQuotes, role]);

  // Kişisel kota/komisyon ilerlemesi — her zaman içinde bulunulan takvim ayı
  // baz alınır, üstteki timeFilter'dan (7 gün/1 ay/1 yıl/tümü) bağımsızdır.
  // Bu yüzden filteredQuotes değil, tüm dönemi kapsayan rawQuotes kullanılır.
  const myQuotaProgress = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    let acceptedThisMonth = 0;
    rawQuotes.forEach((q) => {
      if (q.status !== 'accepted' || !q.accepted_at) return;
      if (new Date(q.accepted_at) < monthStart) return;
      const c = q.currency || 'USD';
      const rateC = rates[c] || 1;
      const rateG = rates[globalCurrency] || 1;
      acceptedThisMonth += (Number(q.final_price) / rateC) * rateG;
    });

    const targetRaw = myTarget?.target_amount || 0;
    const targetCurrency = myTarget?.target_currency || 'USD';
    const rateT = rates[targetCurrency] || 1;
    const rateG = rates[globalCurrency] || 1;
    const targetInGlobal = (targetRaw / rateT) * rateG;

    return {
      acceptedThisMonth,
      targetInGlobal,
      remaining: Math.max(targetInGlobal - acceptedThisMonth, 0),
      pct: targetInGlobal > 0 ? Math.min(Math.round((acceptedThisMonth / targetInGlobal) * 100), 100) : 0,
      commission: acceptedThisMonth * (commissionRate / 100),
    };
  }, [rawQuotes, rates, globalCurrency, myTarget, commissionRate]);

  // Admin: tüm temsilcilerin bu ayki kota gerçekleşmesi (repsQuota, listRepsQuotaAction'dan gelir)
  const repsQuotaComputed = useMemo(() => {
    if (role !== 'admin') return [];
    const rateG = rates[globalCurrency] || 1;

    return repsQuota
      .map((rep) => {
        let acceptedThisMonth = 0;
        rep.acceptedQuotes.forEach((q) => {
          const c = q.currency || 'USD';
          const rateC = rates[c] || 1;
          acceptedThisMonth += (Number(q.final_price) / rateC) * rateG;
        });
        const rateT = rates[rep.targetCurrency] || 1;
        const targetInGlobal = (rep.targetAmount / rateT) * rateG;
        return {
          name: rep.full_name,
          acceptedThisMonth,
          targetInGlobal,
          pct: targetInGlobal > 0 ? Math.min(Math.round((acceptedThisMonth / targetInGlobal) * 100), 100) : 0,
          commission: acceptedThisMonth * (rep.commissionRate / 100),
        };
      })
      .sort((a, b) => b.pct - a.pct);
  }, [repsQuota, rates, globalCurrency, role]);

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
      filteredQuotes.forEach((q) => {
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
    filteredQuotes.forEach((q) => {
      const qDate = new Date(q.created_at).toISOString().split('T')[0];
      const match = arr.find(x => x.key === qDate);
      if (match) match.count++;
    });
    return arr;
  }, [filteredQuotes, timeFilter]);

  const pieData = useMemo(() => {
    const counts = { pending: 0, accepted: 0, rejected: 0, pending_admin_approval: 0 };
    filteredQuotes.forEach((q) => {
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

  // Uzun süredir yanıt bekleyen teklifler — seçili zaman filtresinden bağımsız
  // olarak TÜM kayıtlara bakılır, aksi halde "Son 7 Gün" filtresindeyken
  // 3 hafta önce açılmış bekleyen bir teklif gözden kaçar.
  const STALE_DAYS = 7;
  const staleQuotes = useMemo(() => {
    if (!rawQuotes) return [];
    const now = Date.now();
    return rawQuotes
      .filter((q) => q.status === 'pending' || q.status === 'pending_admin_approval')
      .filter((q) => (now - new Date(q.created_at).getTime()) / 86_400_000 > STALE_DAYS)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [rawQuotes]);

  const oldestStaleDays = staleQuotes.length > 0
    ? Math.floor((Date.now() - new Date(staleQuotes[0].created_at).getTime()) / 86_400_000)
    : 0;

  // Empty State Check — hiç kayıt var mı diye ham veriye bakılır, seçili zaman filtresine değil
  if (!rawQuotes || rawQuotes.length === 0) {
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
                <Button variant="primary" className="w-full h-14 text-lg">
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
                <Button variant="primary" className="w-full">İlk Taslağını Oluştur</Button>
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

        {/* İlk Kullanım Onboarding Checklist (yalnızca admin) */}
        {role === 'admin' && onboarding && (
          <OnboardingChecklist
            productCount={onboarding.productCount}
            customerCount={onboarding.customerCount}
            salesUserCount={onboarding.salesUserCount}
            userId={userId}
          />
        )}

        {/* Uzun Süredir Yanıt Bekleyen Teklifler */}
        {staleQuotes.length > 0 && (
          <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                <span className="font-bold">{staleQuotes.length} teklif</span>{' '}
                {STALE_DAYS} günden uzun süredir yanıt bekliyor
                {oldestStaleDays > STALE_DAYS && (
                  <> (en eskisi {oldestStaleDays} gün önce oluşturuldu)</>
                )}.
              </p>
            </div>
            <Link href="/sales/quotes" className="shrink-0">
              <Button variant="outline" size="sm" className="bg-white border-amber-300 text-amber-700 hover:bg-amber-100">
                Teklifleri Görüntüle
              </Button>
            </Link>
          </div>
        )}

        {/* 4 Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-slate-200 shadow-sm relative overflow-hidden">
            <CardContent className="p-6 flex flex-col justify-between h-full">
              <div className="flex justify-between items-start mb-4">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Toplam Teklif</div>
                <div className="bg-blue-50 text-blue-600 p-2 rounded-md"><FileText className="h-5 w-5" /></div>
              </div>
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <div className="text-4xl font-black text-slate-900 tracking-tight">{metrics.total}</div>
                  <TrendBadge value={totalTrend} />
                </div>
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
                <div className="flex items-center gap-2">
                  <div className="text-4xl font-black text-slate-900 tracking-tight">%{metrics.acceptanceRate}</div>
                  <TrendBadge value={acceptanceTrend} />
                </div>
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

        {/* Bu Ay Kotam (yalnızca satış temsilcisi) */}
        {role === 'sales' && (
          <Card className="border-slate-200 shadow-sm mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-slate-800 flex items-center">
                  <Target className="w-5 h-5 mr-2 text-brand-500" /> Bu Ay Kotam
                </h3>
                <span className="text-xs text-slate-500 font-medium">
                  {new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(new Date())}
                </span>
              </div>

              <div className="mb-5">
                <div className="flex justify-between items-baseline mb-1.5">
                  <span className="text-sm font-semibold text-slate-800">
                    {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: globalCurrency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(myQuotaProgress.acceptedThisMonth)}
                    <span className="text-slate-400 font-medium"> / {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: globalCurrency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(myQuotaProgress.targetInGlobal)}</span>
                  </span>
                  <span className="text-xs font-bold text-brand-600">%{myQuotaProgress.pct}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-500 rounded-full transition-all"
                    style={{ width: `${myQuotaProgress.pct}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Tahmini Komisyon</div>
                  <div className="text-lg font-black text-emerald-700">
                    {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: globalCurrency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(myQuotaProgress.commission)}
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Hedefe Kalan</div>
                  <div className="text-lg font-black text-slate-900">
                    {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: globalCurrency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(myQuotaProgress.remaining)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
                      {pieData.map((_entry, index: number) => (
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

        {/* Bugünün Görevleri + Aktivite Geçmişi (yan yana) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-base font-bold text-slate-800 flex items-center mb-5">
              <ListTodo className="w-5 h-5 mr-2 text-brand-500" /> Bugünün Görevleri
            </h3>
            {tasks.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">
                Bugün için bekleyen bir görev yok.
              </p>
            ) : (
              <div className="space-y-1">
                {tasks.map((task) => {
                  const companyName = task.customers?.company_name || 'Bilinmeyen Müşteri'
                  const overdue = isTaskOverdue(task.due_date)
                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0 -mx-2 px-2 rounded-md hover:bg-slate-50/70 transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => handleCompleteTask(task.id)}
                        className="shrink-0 text-slate-300 hover:text-emerald-600 transition-colors"
                        title="Tamamlandı olarak işaretle"
                      >
                        <Circle className="h-5 w-5" />
                      </button>
                      <Link href={`/shared/customers/${task.customer_id}`} className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-semibold text-slate-800 truncate">{task.title}</span>
                          <span className={`text-xs shrink-0 font-medium ${overdue ? 'text-red-500' : 'text-slate-400'}`}>
                            {overdue ? 'Gecikmiş · ' : ''}{formatTaskDueDate(task.due_date)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate">
                          {companyName}{task.assignee_name && <> · {task.assignee_name}</>}
                        </p>
                      </Link>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Aktivite Geçmişi */}
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-base font-bold text-slate-800 flex items-center mb-5">
              <History className="w-5 h-5 mr-2 text-brand-500" /> Aktivite Geçmişi
            </h3>
            {recentActivities.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">
                Henüz kaydedilmiş bir müşteri aktivitesi yok.
              </p>
            ) : (
              <div className="space-y-1">
                {recentActivities.map((activity) => {
                  const typeInfo = ACTIVITY_TYPE_MAP[activity.type] || ACTIVITY_TYPE_MAP.other
                  const ActivityIcon = typeInfo.icon
                  const companyName = activity.customers?.company_name || 'Bilinmeyen Müşteri'
                  return (
                    <Link
                      key={activity.id}
                      href={`/shared/customers/${activity.customer_id}`}
                      className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0 hover:bg-slate-50/70 -mx-2 px-2 rounded-md transition-colors"
                    >
                      <div className="bg-brand-50 p-2 rounded-full shrink-0">
                        <ActivityIcon className="h-3.5 w-3.5 text-brand-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-semibold text-slate-800 truncate">{companyName}</span>
                          <span className="text-xs text-slate-400 shrink-0">{formatActivityDateTime(activity.activity_date)}</span>
                        </div>
                        <p className="text-xs text-slate-500 truncate">{activity.subject}</p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
        </div>

        {/* Temsilci Sıralaması + En Değerli Müşteriler (yan yana) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Temsilci Sıralaması (yalnızca admin) */}
        {role === 'admin' && leaderboard.length > 0 && (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <h3 className="text-base font-bold text-slate-800 flex items-center mb-5">
                <Trophy className="w-5 h-5 mr-2 text-amber-500" /> Temsilci Sıralaması
              </h3>
              <div className="space-y-1">
                {leaderboard.map((rep, i) => {
                  const rate = rep.total > 0 ? Math.round((rep.accepted / rep.total) * 100) : 0;
                  const maxTotal = leaderboard[0].total || 1;
                  return (
                    <div key={rep.name} className="flex items-center gap-4 py-2.5 border-b border-slate-100 last:border-0">
                      <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="text-sm font-semibold text-slate-800 truncate">{rep.name}</span>
                          <span className="text-xs text-slate-500 font-medium shrink-0 ml-2">
                            {rep.total} teklif · %{rate} onay
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-500 rounded-full"
                            style={{ width: `${(rep.total / maxTotal) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* En Değerli Müşteriler: onaylanmış tekliflere göre toplam ciro sıralaması */}
        {topCustomers.length > 0 && (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <h3 className="text-base font-bold text-slate-800 flex items-center mb-5">
                <Crown className="w-5 h-5 mr-2 text-amber-500" /> En Değerli Müşteriler
              </h3>
              <div className="space-y-1">
                {topCustomers.map((c, i) => {
                  const maxTotal = topCustomers[0].total || 1;
                  const valueStr = new Intl.NumberFormat('tr-TR', {
                    style: 'currency', currency: globalCurrency, minimumFractionDigits: 0, maximumFractionDigits: 0,
                  }).format(c.total);
                  return (
                    <Link
                      key={c.customerId}
                      href={`/shared/customers/${c.customerId}`}
                      className="flex items-center gap-4 py-2.5 border-b border-slate-100 last:border-0 hover:bg-slate-50/70 -mx-2 px-2 rounded-md transition-colors"
                    >
                      <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="text-sm font-semibold text-slate-800 truncate">{c.name}</span>
                          <span className="text-xs text-slate-500 font-medium shrink-0 ml-2">
                            {valueStr} · {c.quoteCount} teklif
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full"
                            style={{ width: `${(c.total / maxTotal) * 100}%` }}
                          />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
        </div>

        {/* Kota Gerçekleşme (yalnızca admin) — her temsilcinin bu ayki hedefe karşı gerçekleşmesi */}
        {role === 'admin' && repsQuotaComputed.length > 0 && (
          <div className="mt-6">
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-6">
                <h3 className="text-base font-bold text-slate-800 flex items-center mb-5">
                  <Target className="w-5 h-5 mr-2 text-brand-500" /> Kota Gerçekleşme
                </h3>
                <div className="space-y-1">
                  {repsQuotaComputed.map((rep, i) => (
                    <div key={rep.name} className="flex items-center gap-4 py-2.5 border-b border-slate-100 last:border-0">
                      <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="text-sm font-semibold text-slate-800 truncate">{rep.name}</span>
                          <span className="text-xs text-slate-500 font-medium shrink-0 ml-2">
                            {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: globalCurrency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(rep.acceptedThisMonth)}
                            {' / '}
                            {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: globalCurrency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(rep.targetInGlobal)}
                            {' · %'}{rep.pct}
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-500 rounded-full"
                            style={{ width: `${rep.pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </div>
  )
}
