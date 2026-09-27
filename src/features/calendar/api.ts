import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'

export type CalendarEventType = 'deadline' | 'milestone' | 'invoice_due' | 'renewal' | 'followup' | 'task'

export interface CalendarEvent {
  id: string
  date: string
  title: string
  type: CalendarEventType
  path?: string
}

export function useCalendarEvents(monthStart: Date, monthEnd: Date) {
  const from = format(monthStart, 'yyyy-MM-dd')
  const to = format(monthEnd, 'yyyy-MM-dd')

  return useQuery({
    queryKey: ['calendar-events', from, to],
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<CalendarEvent[]> => {
      const [projects, milestones, invoices, services, leads, tasks] = await Promise.all([
        supabase.from('projects').select('id, title, deadline').gte('deadline', from).lte('deadline', to),
        supabase.from('milestones').select('id, title, due_date, project_id').gte('due_date', from).lte('due_date', to),
        supabase.from('invoices').select('id, number, due_date').gte('due_date', from).lte('due_date', to).not('status', 'in', '(Paid,Cancelled)'),
        supabase.from('recurring_services').select('id, service_type, next_renewal_date, clients(name)').gte('next_renewal_date', from).lte('next_renewal_date', to).eq('status', 'Active'),
        supabase.from('leads').select('id, name, next_follow_up_date').gte('next_follow_up_date', from).lte('next_follow_up_date', to).not('stage', 'in', '(Won,Lost)'),
        supabase.from('tasks').select('id, title, due_date').gte('due_date', from).lte('due_date', to).eq('done', false),
      ])
      const failed = [projects, milestones, invoices, services, leads, tasks].find((r) => r.error)
      if (failed?.error) throw failed.error

      const events: CalendarEvent[] = []
      for (const p of projects.data ?? []) {
        if (p.deadline) events.push({ id: `deadline-${p.id}`, date: p.deadline, title: `Deadline: ${p.title}`, type: 'deadline', path: `/projects/${p.id}` })
      }
      for (const m of milestones.data ?? []) {
        if (m.due_date) events.push({ id: `milestone-${m.id}`, date: m.due_date, title: `Milestone: ${m.title}`, type: 'milestone', path: `/projects/${m.project_id}` })
      }
      for (const i of invoices.data ?? []) {
        if (i.due_date) events.push({ id: `invoice-${i.id}`, date: i.due_date, title: `Invoice due: ${i.number}`, type: 'invoice_due', path: `/invoices/${i.id}` })
      }
      for (const s of (services.data ?? []) as unknown as { id: string; service_type: string; next_renewal_date: string | null; clients: { name: string } | null }[]) {
        if (s.next_renewal_date) events.push({ id: `renewal-${s.id}`, date: s.next_renewal_date, title: `Renewal: ${s.clients?.name} — ${s.service_type}`, type: 'renewal', path: '/recurring-services' })
      }
      for (const l of leads.data ?? []) {
        if (l.next_follow_up_date) events.push({ id: `followup-${l.id}`, date: l.next_follow_up_date, title: `Follow up: ${l.name}`, type: 'followup', path: `/leads/${l.id}` })
      }
      for (const t of tasks.data ?? []) {
        if (t.due_date) events.push({ id: `task-${t.id}`, date: t.due_date, title: t.title, type: 'task', path: '/calendar' })
      }
      return events
    },
  })
}
