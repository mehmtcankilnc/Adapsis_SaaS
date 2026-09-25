'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts'
import { Target, TrendingUp, Trophy, XCircle, AlertCircle } from 'lucide-react'
import { useGlobalStore } from '@/store/global-store'
import { useLanguage } from '@/lib/i18n/LanguageProvider'
import { localeFor } from '@/lib/i18n/format'
import type { Opportunity, OpportunityStage } from '@/types/product.types'
import type { DictionaryKey } from '@/lib/i18n/dictionary'

const OPPORTUNITY_STAGE_MAP: Record<OpportunityStage, { labelKey: DictionaryKey; variant: "success" | "warning" | "secondary" | "destructive" | "brand" }> = {
  lead: { labelKey: "admin.pipeline.stageLead", variant: "secondary" },
  qualified: { labelKey: "admin.pipeline.stageQualified", variant: "secondary" },
  proposal: { labelKey: "admin.pipeline.stageProposal", variant: "warning" },
  negotiation: { labelKey: "admin.pipeline.stageNegotiation", variant: "brand" },
  won: { labelKey: "admin.pipeline.stageWon", variant: "success" },
  lost: { labelKey: "admin.pipeline.stageLost", variant: "destructive" },
}

const OPEN_STAGES: OpportunityStage[] = ['lead', 'qualified', 'proposal', 'negotiation']
const COLORS = ['#eab308', '#059669', '#dc2626', '#7c3aed']

const formatCurrency = (amount: number, currency: string) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)

const formatCompact = (amount: number) =>
  new Intl.NumberFormat('tr-TR', { notation: 'compact', maximumFractionDigits: 1 }).format(amount)

export interface RepQuotaTargetRow {
  profile_id: string
  target_amount: number
  target_currency: string
}

export interface AcceptedQuoteRow {
  final_price: number
  currency: string
}

export function PipelineAnalyticsClient({
  opportunities,
  targets,
  acceptedQuotes,
  error,
}: {
  opportunities: Opportunity[]
  targets: RepQuotaTargetRow[]
  acceptedQuotes: AcceptedQuoteRow[]
  error?: string
}) {
  const { globalCurrency } = useGlobalStore()
  const { t, lang } = useLanguage()
  const [rates, setRates] = useState<Record<string, number>>({})

  useEffect(() => {
    fetch('/api/rates')
      .then((r) => r.json())
      .then((data) => setRates(data.rates || {}))
      .catch(() => {})
  }, [])

  const toGlobal = useMemo(() => {
    return (amount: number, currency: string) => {
      const rateC = rates[currency || 'USD'] || 1
      const rateG = rates[globalCurrency] || 1
      return (Number(amount) / rateC) * rateG
    }
  }, [rates, globalCurrency])

  // (a) Açık aşamalara göre huni: sayı + ağırlıklı değer
  const funnel = useMemo(() => {
    return OPEN_STAGES.map((stage) => {
      const stageOpps = opportunities.filter((o) => o.stage === stage)
      const weightedValue = stageOpps.reduce((sum, o) => {
        const val = toGlobal(o.estimated_value || 0, o.currency || 'USD')
        return sum + val * ((o.probability ?? 0) / 100)
      }, 0)
      return { stage, label: t(OPPORTUNITY_STAGE_MAP[stage].labelKey), count: stageOpps.length, weightedValue }
    })
  }, [opportunities, toGlobal])

  // (b) 3 aylık tahmin: bu ay + sonraki 2 ay
  const monthlyForecast = useMemo(() => {
    const months = Array.from({ length: 3 }).map((_, i) => {
      const d = new Date()
      d.setDate(1)
      d.setMonth(d.getMonth() + i)
      return {
        year: d.getFullYear(),
        month: d.getMonth(),
        name: new Intl.DateTimeFormat(localeFor(lang), { month: 'long', year: 'numeric' }).format(d),
      }
    })

    return months.map(({ year, month, name }) => {
      let closed = 0
      let forecast = 0
      opportunities.forEach((o) => {
        if (o.stage === 'won' && o.closed_at) {
          const d = new Date(o.closed_at)
          if (d.getFullYear() === year && d.getMonth() === month) {
            closed += toGlobal(o.estimated_value || 0, o.currency || 'USD')
          }
        } else if (OPEN_STAGES.includes(o.stage) && o.expected_close_date) {
          const d = new Date(o.expected_close_date)
          if (d.getFullYear() === year && d.getMonth() === month) {
            forecast += toGlobal(o.estimated_value || 0, o.currency || 'USD') * ((o.probability ?? 0) / 100)
          }
        }
      })
      return { name, closed, forecast }
    })
  }, [opportunities, toGlobal])

  // (c) Bu ay: gerçekleşen + tahmini / şirket hedefi
  const thisMonthProgress = useMemo(() => {
    const actualThisMonth = acceptedQuotes.reduce((sum, q) => sum + toGlobal(q.final_price, q.currency || 'USD'), 0)
    const weightedForecastThisMonth = monthlyForecast[0]?.forecast || 0
    const companyTargetThisMonth = targets.reduce((sum, t) => sum + toGlobal(t.target_amount, t.target_currency || 'USD'), 0)
    const projected = actualThisMonth + weightedForecastThisMonth
    return {
      actualThisMonth,
      weightedForecastThisMonth,
      companyTargetThisMonth,
      projected,
      pct: companyTargetThisMonth > 0 ? Math.min(Math.round((projected / companyTargetThisMonth) * 100), 100) : 0,
    }
  }, [acceptedQuotes, monthlyForecast, targets, toGlobal])

  // (d) Kazanma oranı — tüm fırsatlardan (won + lost)
  const winStats = useMemo(() => {
    const won = opportunities.filter((o) => o.stage === 'won')
    const lost = opportunities.filter((o) => o.stage === 'lost')
    const wonValue = won.reduce((sum, o) => sum + toGlobal(o.estimated_value || 0, o.currency || 'USD'), 0)
    const total = won.length + lost.length
    return {
      wonCount: won.length,
      lostCount: lost.length,
      winRate: total > 0 ? Math.round((won.length / total) * 100) : 0,
      avgDealSize: won.length > 0 ? wonValue / won.length : 0,
    }
  }, [opportunities, toGlobal])

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg border border-red-100 flex items-center text-sm font-medium">
        <AlertCircle className="w-5 h-5 mr-2 shrink-0" />
        {error}
      </div>
    )
  }

  if (opportunities.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center bg-white p-10 rounded-2xl shadow-sm border border-slate-200">
        <div className="bg-brand-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
          <Target className="h-8 w-8 text-brand-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">{t('admin.pipeline.emptyTitle')}</h2>
        <p className="text-slate-500 text-sm">
          {t('admin.pipeline.emptyDescription')}
        </p>
      </div>
    )
  }

  const maxWeighted = Math.max(...funnel.map((f) => f.weightedValue), 1)

  return (
    <div className="space-y-6">
      {/* (a) Aşama Huni */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {funnel.map((f, i) => (
          <Card key={f.stage} className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <Badge variant={OPPORTUNITY_STAGE_MAP[f.stage].variant}>{f.label}</Badge>
                <div className="text-xs font-bold text-slate-400">{f.count} {t('admin.pipeline.opportunitiesSuffix')}</div>
              </div>
              <div className="text-2xl font-black text-slate-900 tracking-tight truncate" title={formatCurrency(f.weightedValue, globalCurrency)}>
                {formatCurrency(f.weightedValue, globalCurrency)}
              </div>
              <div className="text-xs text-slate-500 mt-2 font-medium">{t('admin.pipeline.weightedValueLabel')}</div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-3">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(f.weightedValue / maxWeighted) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6">
          <h3 className="text-base font-bold text-slate-800 flex items-center mb-6">
            <TrendingUp className="w-5 h-5 mr-2 text-brand-500" /> {t('admin.pipeline.stagePipelineTitle')}
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnel} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} interval={0} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} tickFormatter={formatCompact} width={44} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 600 }}
                  formatter={(value) => formatCurrency(Number(value), globalCurrency)}
                />
                <Bar dataKey="weightedValue" name={t('admin.pipeline.weightedValueName')} radius={[6, 6, 0, 0]}>
                  {funnel.map((f, i) => (
                    <Cell key={f.stage} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* (b) 3 Aylık Gelir Tahmini */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6">
          <h3 className="text-base font-bold text-slate-800 flex items-center mb-6">
            <TrendingUp className="w-5 h-5 mr-2 text-brand-500" /> {t('admin.pipeline.threeMonthForecastTitle')}
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyForecast} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} interval={0} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} tickFormatter={formatCompact} width={44} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 600 }}
                  formatter={(value) => formatCurrency(Number(value), globalCurrency)}
                />
                <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: '13px', fontWeight: 500, color: '#475569' }} />
                <Bar dataKey="closed" name={t('admin.pipeline.closedLabel')} fill="#059669" radius={[6, 6, 0, 0]} />
                <Bar dataKey="forecast" name={t('admin.pipeline.forecastLabel')} fill="#7c3aed" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* (c) Bu Ay Hedefe Karşı + (d) Kazanma Oranı */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-slate-800 flex items-center">
                <Target className="w-5 h-5 mr-2 text-brand-500" /> {t('admin.pipeline.thisMonthTargetTitle')}
              </h3>
              <span className="text-xs font-bold text-brand-600">%{thisMonthProgress.pct}</span>
            </div>
            <div className="mb-5">
              <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-sm font-semibold text-slate-800">
                  {formatCurrency(thisMonthProgress.projected, globalCurrency)}
                  <span className="text-slate-400 font-medium"> / {formatCurrency(thisMonthProgress.companyTargetThisMonth, globalCurrency)}</span>
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${thisMonthProgress.pct}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{t('admin.pipeline.actualLabel')}</div>
                <div className="text-lg font-black text-emerald-700">{formatCurrency(thisMonthProgress.actualThisMonth, globalCurrency)}</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{t('admin.pipeline.weightedForecastLabel')}</div>
                <div className="text-lg font-black text-violet-700">{formatCurrency(thisMonthProgress.weightedForecastThisMonth, globalCurrency)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-base font-bold text-slate-800 flex items-center mb-5">
              <Trophy className="w-5 h-5 mr-2 text-amber-500" /> {t('admin.pipeline.winRateTitle')}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{t('admin.pipeline.winRateTitle')}</div>
                <div className="text-lg font-black text-slate-900">%{winStats.winRate}</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{t('admin.pipeline.avgDealSizeLabel')}</div>
                <div className="text-lg font-black text-slate-900">{formatCurrency(winStats.avgDealSize, globalCurrency)}</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('admin.pipeline.wonLabel')}</div>
                  <div className="text-lg font-black text-emerald-700">{winStats.wonCount}</div>
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('admin.pipeline.lostLabel')}</div>
                  <div className="text-lg font-black text-red-600">{winStats.lostCount}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
