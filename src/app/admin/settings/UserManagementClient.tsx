'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  UserPlus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  ShieldCheck,
  Users,
  Check,
  AlertTriangle,
  Eye,
  EyeOff,
  Mail,
  User,
} from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import {
  listUsersAction,
  createUserAction,
  updateUserAction,
  deleteUserAction,
} from '@/actions/user-management.actions'
import { upsertRepQuotaAction } from '@/actions/quota.actions'
import { useLanguage } from '@/lib/i18n/LanguageProvider'
import { localeFor } from '@/lib/i18n/format'

interface UserRow {
  id: string
  full_name: string
  email: string
  role: string
  created_at: string | null
  commission_rate: number
  target_amount: number
  target_currency: string
}

export function UserManagementClient({ currentUserId }: { currentUserId: string }) {
  const { t, lang } = useLanguage()
  // ─── Data State ───
  const [users, setUsers] = useState<UserRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')

  // ─── Create Dialog ───
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ full_name: '', email: '', password: '', role: 'sales' as 'admin' | 'sales' })
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  // ─── Edit Dialog ───
  const [editUser, setEditUser] = useState<UserRow | null>(null)
  const [editForm, setEditForm] = useState({
    full_name: '',
    role: 'sales' as 'admin' | 'sales',
    commission_rate: 0,
    target_amount: 0,
    target_currency: 'USD',
  })
  const [isEditing, setIsEditing] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // ─── Delete Dialog ───
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // ─── Fetch Users ───
  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    const result = await listUsersAction()
    if (result.success) {
      setUsers(result.users as UserRow[])
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // ─── Filtering ───
  const filteredUsers = users.filter(u => {
    if (!search) return true
    const term = search.toLowerCase()
    return (
      u.full_name?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      u.role?.toLowerCase().includes(term)
    )
  })

  const adminCount = users.filter(u => u.role === 'admin').length
  const salesCount = users.filter(u => u.role === 'sales').length

  // ─── Handlers ───
  const handleCreate = async () => {
    setIsCreating(true)
    setCreateError(null)

    const result = await createUserAction(createForm)
    setIsCreating(false)

    if (result.success) {
      setShowCreate(false)
      setCreateForm({ full_name: '', email: '', password: '', role: 'sales' })
      fetchUsers()
    } else {
      setCreateError(result.error || t('admin.settings.users.createUserErrorFallback'))
    }
  }

  const handleEdit = async () => {
    if (!editUser) return
    setIsEditing(true)
    setEditError(null)

    const result = await updateUserAction(editUser.id, { full_name: editForm.full_name, role: editForm.role })

    let quotaResult: { success: boolean; error?: string } = { success: true }
    if (editForm.role === 'sales') {
      quotaResult = await upsertRepQuotaAction(editUser.id, {
        commissionRate: editForm.commission_rate,
        targetAmount: editForm.target_amount,
        targetCurrency: editForm.target_currency,
      })
    }

    setIsEditing(false)

    if (result.success && quotaResult.success) {
      setEditUser(null)
      fetchUsers()
    } else {
      setEditError(result.error || quotaResult.error || t('admin.settings.users.updateUserErrorFallback'))
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    setDeleteError(null)

    const result = await deleteUserAction(deleteTarget.id)
    setIsDeleting(false)

    if (result.success) {
      setDeleteTarget(null)
      fetchUsers()
    } else {
      setDeleteError(result.error || t('admin.settings.users.deleteUserErrorFallback'))
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return new Intl.DateTimeFormat(localeFor(lang), {
      day: '2-digit', month: 'short', year: 'numeric'
    }).format(new Date(dateStr))
  }

  const openEditDialog = (user: UserRow) => {
    setEditUser(user)
    setEditForm({
      full_name: user.full_name,
      role: user.role as 'admin' | 'sales',
      commission_rate: user.commission_rate || 0,
      target_amount: user.target_amount || 0,
      target_currency: user.target_currency || 'USD',
    })
    setEditError(null)
  }

  const openDeleteDialog = (user: UserRow) => {
    setDeleteTarget(user)
    setDeleteError(null)
  }

  return (
    <>
      {/* ─── Üst İstatistik Kartları ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center">
            <Users className="h-6 w-6 text-brand-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{users.length}</p>
            <p className="text-xs text-slate-500 font-medium">{t('admin.settings.users.statTotalUsers')}</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{adminCount}</p>
            <p className="text-xs text-slate-500 font-medium">{t('admin.settings.users.statAdmins')}</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
            <User className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{salesCount}</p>
            <p className="text-xs text-slate-500 font-medium">{t('admin.settings.users.statSalesStaff')}</p>
          </div>
        </div>
      </div>

      {/* ─── Kontrol Çubuğu ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('admin.settings.users.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 shadow-sm"
          />
        </div>

        <Button
          variant="primary"
          className="shrink-0"
          onClick={() => {
            setShowCreate(true)
            setCreateForm({ full_name: '', email: '', password: '', role: 'sales' })
            setCreateError(null)
            setShowPassword(false)
          }}
        >
          <UserPlus className="mr-2 h-4 w-4" /> {t('admin.settings.users.addUserButton')}
        </Button>
      </div>

      {/* ─── Kullanıcı Tablosu ─── */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('admin.settings.users.tableHeaderUser')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('admin.settings.users.tableHeaderEmail')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">{t('admin.settings.users.tableHeaderRole')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('admin.settings.users.tableHeaderCreatedAt')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('admin.settings.users.tableHeaderTarget')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('admin.settings.users.tableHeaderCommission')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">{t('admin.settings.users.tableHeaderActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                        <Skeleton className="h-3.5 w-32" />
                      </div>
                    </td>
                    <td className="px-6 py-4"><Skeleton className="h-3.5 w-40" /></td>
                    <td className="px-6 py-4 text-center"><Skeleton className="h-5 w-16 rounded-full mx-auto" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-3.5 w-24" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-3.5 w-20" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-3.5 w-12" /></td>
                    <td className="px-6 py-4 text-right"><Skeleton className="h-8 w-20 rounded-lg ml-auto" /></td>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-0 py-0 bg-slate-50/30">
                    <EmptyState
                      icon={Users}
                      title={search ? t('admin.settings.users.emptyNoResultsTitle') : t('admin.settings.users.emptyNoUsersTitle')}
                      description={search ? t('admin.settings.users.emptyNoResultsDescription').replace('{search}', search) : t('admin.settings.users.emptyNoUsersDescription')}
                      action={search ? (
                        <Button variant="outline" onClick={() => setSearch('')}>
                          {t('admin.settings.users.clearSearchButton')}
                        </Button>
                      ) : (
                        <Button variant="primary" onClick={() => setShowCreate(true)}>
                          <UserPlus className="mr-2 h-4 w-4" /> {t('admin.settings.users.createUserButton')}
                        </Button>
                      )}
                    />
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isSelf = u.id === currentUserId
                  const initials = u.full_name
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            u.role === 'admin'
                              ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white'
                              : 'bg-gradient-to-br from-brand-400 to-brand-600 text-white'
                          }`}>
                            {initials || 'U'}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                              {u.full_name}
                              {isSelf && (
                                <span className="text-[10px] bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded-full font-bold border border-brand-100">
                                  {t('admin.settings.users.youBadge')}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          {u.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge
                          variant={u.role === 'admin' ? 'warning' : 'success'}
                          className="px-3"
                        >
                          {u.role === 'admin' ? t('admin.settings.users.roleAdmin') : t('admin.settings.users.roleSales')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                        {formatDate(u.created_at)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                        {u.role === 'sales'
                          ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: u.target_currency || 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(u.target_amount || 0)
                          : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                        {u.role === 'sales' ? `%${u.commission_rate || 0}` : '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(u)}
                            className="h-8 text-xs font-semibold px-3 bg-white hover:bg-brand-50 hover:text-brand-700 border-slate-200"
                          >
                            <Pencil className="h-3 w-3 mr-1.5" /> {t('admin.settings.users.editButton')}
                          </Button>
                          {!isSelf && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteDialog(u)}
                              className="h-8 text-xs font-semibold px-3 text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-3 w-3 mr-1.5" /> {t('admin.settings.users.deleteButton')}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ═══════════════════════════════════════════ */}
      {/* ─── Yeni Kullanıcı Oluşturma Modalı ───    */}
      {/* ═══════════════════════════════════════════ */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{t('admin.settings.users.createDialogTitle')}</DialogTitle>
            <DialogDescription>
              {t('admin.settings.users.createDialogDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-5 space-y-5">
            {createError && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-200 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                {createError}
              </div>
            )}

            {/* İsim */}
            <div className="space-y-2">
              <Label htmlFor="create-name">
                {t('admin.settings.users.fullNameLabel')} <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="create-name"
                  value={createForm.full_name}
                  onChange={(e) => setCreateForm(p => ({ ...p, full_name: e.target.value }))}
                  placeholder={t('admin.settings.users.fullNamePlaceholder')}
                  className="pl-10"
                />
              </div>
            </div>

            {/* E-posta */}
            <div className="space-y-2">
              <Label htmlFor="create-email">
                {t('admin.settings.users.emailLabel')} <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="create-email"
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm(p => ({ ...p, email: e.target.value }))}
                  placeholder={t('admin.settings.users.emailPlaceholder')}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Şifre */}
            <div className="space-y-2">
              <Label htmlFor="create-password">
                {t('admin.settings.users.passwordLabel')} <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="create-password"
                  type={showPassword ? 'text' : 'password'}
                  value={createForm.password}
                  onChange={(e) => setCreateForm(p => ({ ...p, password: e.target.value }))}
                  placeholder={t('admin.settings.users.passwordPlaceholder')}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {createForm.password.length > 0 && createForm.password.length < 6 && (
                <p className="text-xs text-red-500 font-medium">{t('admin.settings.users.passwordTooShort')}</p>
              )}
            </div>

            {/* Rol Seçimi */}
            <div className="space-y-2">
              <Label>{t('admin.settings.users.roleAssignLabel')}</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setCreateForm(p => ({ ...p, role: 'sales' }))}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    createForm.role === 'sales'
                      ? 'border-brand-600 bg-brand-50/50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <User className={`h-5 w-5 ${createForm.role === 'sales' ? 'text-brand-600' : 'text-slate-400'}`} />
                    {createForm.role === 'sales' && (
                      <div className="bg-brand-600 rounded-full p-0.5">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <p className={`text-sm font-semibold ${createForm.role === 'sales' ? 'text-brand-900' : 'text-slate-700'}`}>{t('admin.settings.users.roleSales')}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{t('admin.settings.users.roleSalesDescription')}</p>
                </button>

                <button
                  type="button"
                  onClick={() => setCreateForm(p => ({ ...p, role: 'admin' }))}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    createForm.role === 'admin'
                      ? 'border-amber-500 bg-amber-50/50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <ShieldCheck className={`h-5 w-5 ${createForm.role === 'admin' ? 'text-amber-600' : 'text-slate-400'}`} />
                    {createForm.role === 'admin' && (
                      <div className="bg-amber-500 rounded-full p-0.5">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <p className={`text-sm font-semibold ${createForm.role === 'admin' ? 'text-amber-900' : 'text-slate-700'}`}>{t('admin.settings.users.roleAdmin')}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{t('admin.settings.users.roleAdminDescription')}</p>
                </button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)} disabled={isCreating}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleCreate}
              disabled={isCreating || !createForm.full_name.trim() || !createForm.email.includes('@') || createForm.password.length < 6}
            >
              {isCreating ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('admin.settings.users.creatingButton')}</>
              ) : (
                <><UserPlus className="mr-2 h-4 w-4" /> {t('admin.settings.users.createUserSubmitButton')}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════ */}
      {/* ─── Düzenleme Modalı ───                    */}
      {/* ═══════════════════════════════════════════ */}
      {editUser && (
        <Dialog open={!!editUser} onOpenChange={(v) => !v && setEditUser(null)}>
          <DialogContent className="sm:max-w-[440px]">
            <DialogHeader>
              <DialogTitle>{t('admin.settings.users.editDialogTitle')}</DialogTitle>
              <DialogDescription>
                <strong className="text-slate-800">{editUser.email}</strong> {t('admin.settings.users.editDialogDescriptionSuffix')}
              </DialogDescription>
            </DialogHeader>

            <div className="px-6 py-5 space-y-5">
              {editError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-200">
                  {editError}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="edit-name">{t('admin.settings.users.fullNameLabel')}</Label>
                <Input
                  id="edit-name"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm(p => ({ ...p, full_name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('admin.settings.users.tableHeaderRole')}</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditForm(p => ({ ...p, role: 'sales' }))}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      editForm.role === 'sales'
                        ? 'border-brand-600 bg-brand-50/50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <p className={`text-sm font-semibold ${editForm.role === 'sales' ? 'text-brand-700' : 'text-slate-600'}`}>
                      {t('admin.settings.users.roleSales')}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditForm(p => ({ ...p, role: 'admin' }))}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      editForm.role === 'admin'
                        ? 'border-amber-500 bg-amber-50/50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <p className={`text-sm font-semibold ${editForm.role === 'admin' ? 'text-amber-700' : 'text-slate-600'}`}>
                      {t('admin.settings.users.roleAdmin')}
                    </p>
                  </button>
                </div>
              </div>

              {editForm.role === 'sales' && (
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="edit-target">{t('admin.settings.users.targetLabel')}</Label>
                    <div className="flex gap-2">
                      <Input
                        id="edit-target"
                        type="number"
                        min={0}
                        value={editForm.target_amount}
                        onChange={(e) => setEditForm(p => ({ ...p, target_amount: Number(e.target.value) }))}
                        className="flex-1"
                      />
                      <Input
                        value={editForm.target_currency}
                        onChange={(e) => setEditForm(p => ({ ...p, target_currency: e.target.value.toUpperCase() }))}
                        className="w-20"
                        maxLength={3}
                      />
                    </div>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="edit-commission">{t('admin.settings.users.commissionRateLabel')}</Label>
                    <Input
                      id="edit-commission"
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={editForm.commission_rate}
                      onChange={(e) => setEditForm(p => ({ ...p, commission_rate: Number(e.target.value) }))}
                    />
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setEditUser(null)} disabled={isEditing}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                onClick={handleEdit}
                disabled={isEditing || !editForm.full_name.trim()}
              >
                {isEditing ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('admin.settings.users.savingButton')}</>
                ) : (
                  <><Check className="mr-2 h-4 w-4" /> {t('admin.settings.users.saveChangesButton')}</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* ─── Silme Onayı Modalı ───                  */}
      {/* ═══════════════════════════════════════════ */}
      {deleteTarget && (
        <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="text-red-700 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" /> {t('admin.settings.users.deleteDialogTitle')}
              </DialogTitle>
              <DialogDescription>
                {t('admin.settings.users.deleteDialogDescription')}
              </DialogDescription>
            </DialogHeader>

            <div className="px-6 py-5">
              {deleteError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-200 mb-4">
                  {deleteError}
                </div>
              )}

              <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-bold text-sm shrink-0">
                    {deleteTarget.full_name[0]?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{deleteTarget.full_name}</p>
                    <p className="text-xs text-slate-500">{deleteTarget.email}</p>
                    <Badge variant={deleteTarget.role === 'admin' ? 'warning' : 'success'} className="mt-1 text-[10px]">
                      {deleteTarget.role === 'admin' ? t('admin.settings.users.roleAdmin') : t('admin.settings.users.roleSales')}
                    </Badge>
                  </div>
                </div>
              </div>

              <p className="text-sm text-slate-600 mt-4 leading-relaxed">
                <strong className="text-slate-900">{deleteTarget.full_name}</strong>{' '}
                {t('admin.settings.users.deleteConfirmMessage').replace('{name}', '').trim()}
              </p>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
                {t('admin.settings.users.giveUpButton')}
              </Button>
              <Button
                variant="destructive"
                className="bg-red-600 hover:bg-red-700"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('admin.settings.users.deletingButton')}</>
                ) : (
                  <><Trash2 className="mr-2 h-4 w-4" /> {t('admin.settings.users.confirmDeleteButton')}</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
