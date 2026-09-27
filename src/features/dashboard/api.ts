import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useSettings } from '@/features/settings/api'

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('dashboard_stats')
      if (error) throw error
      return data[0]
    },
  })
}

export function useMonthlyIncomeExpense(year: number) {
  return useQuery({
    queryKey: ['dashboard', 'monthly', year],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('dashboard_monthly_income_expense', { p_year: year })
      if (error) throw error
      return data
    },
  })
}

export function useIncomeByCategory(year: number) {
  return useQuery({
    queryKey: ['dashboard', 'income_by_category', year],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('dashboard_income_by_category', { p_year: year })
      if (error) throw error
      return data
    },
  })
}

export interface NeedsAttentionItem {
  id: string
  label: string
  path: string
  urgent?: boolean
}

export function useNeedsAttention() {
  const { data: settings } = useSettings()
  const leadDays = settings?.renewal_reminder_days ?? 30

  return useQuery({
    queryKey: ['dashboard', 'needs_attention', leadDays],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd')
      const in7Days = format(new Date(Date.now() + 7 * 86400000), 'yyyy-MM-dd')
      const inLeadDays = format(new Date(Date.now() + leadDays * 86400000), 'yyyy-MM-dd')
      const in30Days = format(new Date(Date.now() + 30 * 86400000), 'yyyy-MM-dd')

      const [followUps, tasks, overdueInvoices, renewals, deadlines, licenses] = await Promise.all([
        supabase.from('leads').select('id, name, next_follow_up_date').lte('next_follow_up_date', today).not('next_follow_up_date', 'is', null).not('stage', 'in', '(Won,Lost)'),
        supabase.from('tasks').select('id, title, due_date').eq('done', false).lte('due_date', today).not('due_date', 'is', null),
        supabase.from('view_invoices_computed').select('id, number').eq('computed_status', 'Overdue'),
        supabase.from('recurring_services').select('id, service_type, next_renewal_date, clients(name)').eq('status', 'Active').lte('next_renewal_date', inLeadDays).not('next_renewal_date', 'is', null),
        supabase.from('projects').select('id, title, deadline').lte('deadline', in7Days).not('deadline', 'is', null).not('status', 'in', '(Completed,Cancelled)'),
        supabase.from('licenses').select('id, support_until_date, products(name)').eq('status', 'Active').lte('support_until_date', in30Days).not('support_until_date', 'is', null),
      ])

      const failed = [followUps, tasks, overdueInvoices, renewals, deadlines, licenses].find((r) => r.error)
      if (failed?.error) throw failed.error

      const items: { followUps: NeedsAttentionItem[]; tasks: NeedsAttentionItem[]; invoices: NeedsAttentionItem[]; renewals: NeedsAttentionItem[]; deadlines: NeedsAttentionItem[]; licenses: NeedsAttentionItem[] } = {
        followUps: (followUps.data ?? []).map((l) => ({ id: l.id, label: l.name, path: `/leads/${l.id}`, urgent: l.next_follow_up_date! < today })),
        tasks: (tasks.data ?? []).map((t) => ({ id: t.id, label: t.title, path: '/calendar', urgent: t.due_date! < today })),
        invoices: (overdueInvoices.data ?? []).map((i) => ({ id: i.id, label: i.number ?? 'Invoice', path: `/invoices/${i.id}`, urgent: true })),
        renewals: ((renewals.data ?? []) as unknown as { id: string; service_type: string; next_renewal_date: string; clients: { name: string } | null }[]).map((r) => ({
          id: r.id,
          label: `${r.clients?.name} — ${r.service_type}`,
          path: '/recurring-services',
          urgent: r.next_renewal_date < today,
        })),
        deadlines: (deadlines.data ?? []).map((p) => ({ id: p.id, label: p.title, path: `/projects/${p.id}`, urgent: p.deadline! < today })),
        licenses: ((licenses.data ?? []) as unknown as { id: string; support_until_date: string; products: { name: string } | null }[]).map((l) => ({
          id: l.id,
          label: l.products?.name ?? 'License',
          path: '/products',
          urgent: l.support_until_date < today,
        })),
      }
      return items
    },
  })
}
