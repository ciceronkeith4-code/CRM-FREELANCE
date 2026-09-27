import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Pie, PieChart, Cell, Legend } from 'recharts'
import { format } from 'date-fns'
import { motion } from 'motion/react'
import { UserPlus, Users, FolderKanban, Wallet, ReceiptText, AlertCircle } from 'lucide-react'
import { useDashboardStats, useMonthlyIncomeExpense, useIncomeByCategory, useNeedsAttention } from '@/features/dashboard/api'
import { LeadForm } from '@/features/leads/components/lead-form'
import { ClientForm } from '@/features/clients/components/client-form'
import { ProjectForm } from '@/features/projects/components/project-form'
import { PaymentForm } from '@/features/payments/components/payment-form'
import { ExpenseForm } from '@/features/expenses/components/expense-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CountUp } from '@/components/shared/count-up'
import { ChartTooltipContent } from '@/components/shared/chart-tooltip'
import { ChartSkeleton, StatCardsSkeleton } from '@/components/shared/skeletons'
import { formatMoney } from '@/lib/format'
import { listItem } from '@/lib/motion'
import { useCurrency } from '@/hooks/use-currency'
import { useChartAnimation } from '@/hooks/use-chart-animation'

const CHART_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']

const MotionCard = motion.create(Card)

function StatCard({
  index,
  label,
  value,
  tone,
}: {
  index: number
  label: string
  value: React.ReactNode
  tone?: 'default' | 'destructive'
}) {
  return (
    <MotionCard variants={listItem} custom={index} initial="hidden" animate="show">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className={tone === 'destructive' ? 'text-xl font-semibold text-red-500' : 'text-xl font-semibold'}>{value}</div>
      </CardContent>
    </MotionCard>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()
  const year = new Date().getFullYear()
  const currency = useCurrency()
  const money = (v: unknown) => formatMoney(Number(v) || 0, currency)
  const compactMoney = (v: unknown) =>
    new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(v) || 0)
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: monthly, isLoading: monthlyLoading } = useMonthlyIncomeExpense(year)
  const { data: byCategory, isLoading: byCategoryLoading } = useIncomeByCategory(year)
  const chartAnimation = useChartAnimation()
  const { data: attention } = useNeedsAttention()

  const [quickAdd, setQuickAdd] = useState<null | 'lead' | 'client' | 'project' | 'payment' | 'expense'>(null)

  const chartData = (monthly ?? []).map((m) => ({
    month: format(new Date(year, m.month - 1, 1), 'MMM'),
    income: m.income,
    expenses: m.expenses,
  }))

  const attentionGroups = [
    { key: 'followUps', label: 'Follow-ups due', items: attention?.followUps ?? [] },
    { key: 'tasks', label: 'Tasks due', items: attention?.tasks ?? [] },
    { key: 'invoices', label: 'Overdue invoices', items: attention?.invoices ?? [] },
    { key: 'renewals', label: 'Upcoming renewals', items: attention?.renewals ?? [] },
    { key: 'deadlines', label: 'Deadlines within 7 days', items: attention?.deadlines ?? [] },
    { key: 'licenses', label: 'Support expiring soon', items: attention?.licenses ?? [] },
  ].filter((g) => g.items.length > 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">{format(new Date(), 'EEEE, MMM d, yyyy')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setQuickAdd('lead')}>
            <UserPlus /> Lead
          </Button>
          <Button variant="outline" size="sm" onClick={() => setQuickAdd('client')}>
            <Users /> Client
          </Button>
          <Button variant="outline" size="sm" onClick={() => setQuickAdd('project')}>
            <FolderKanban /> Project
          </Button>
          <Button variant="outline" size="sm" onClick={() => setQuickAdd('payment')}>
            <Wallet /> Payment
          </Button>
          <Button variant="outline" size="sm" onClick={() => setQuickAdd('expense')}>
            <ReceiptText /> Expense
          </Button>
        </div>
      </div>

      {statsLoading ? (
        <StatCardsSkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard index={0} label="Income this month" value={<CountUp money value={stats?.income_this_month} />} />
          <StatCard index={1} label="Income this year" value={<CountUp money value={stats?.income_this_year} />} />
          <StatCard index={2} label="Outstanding balance" value={<CountUp money value={stats?.outstanding_balance} />} />
          <StatCard index={3} label="Overdue invoices" value={<CountUp money value={stats?.overdue_invoice_total} />} tone="destructive" />
          <StatCard index={4} label="Net profit this year" value={<CountUp money value={stats?.net_profit_this_year} />} />
          <StatCard index={5} label="Active projects" value={<CountUp value={stats?.active_projects} />} />
          <StatCard index={6} label="Open pipeline value" value={<CountUp money value={stats?.open_pipeline_value} />} />
        </div>
      )}

      {attentionGroups.length > 0 && (
        <MotionCard variants={listItem} custom={2} initial="hidden" animate="show">
          <CardHeader>
            <CardTitle className="text-base">Needs attention today</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {attentionGroups.map((group, groupIndex) => (
              <motion.div key={group.key} variants={listItem} custom={groupIndex + 3} initial="hidden" animate="show">
                <p className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">{group.label}</p>
                <div className="flex flex-col gap-1">
                  {group.items.slice(0, 5).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.path)}
                      className="-mx-1.5 flex items-center gap-1.5 truncate rounded-md px-1.5 py-0.5 text-left text-sm transition-colors duration-150 hover:bg-muted/60 active:bg-muted"
                    >
                      {item.urgent && <AlertCircle className="size-3.5 shrink-0 text-red-500" />}
                      <span className="truncate">{item.label}</span>
                    </button>
                  ))}
                  {group.items.length > 5 && <span className="text-xs text-muted-foreground">+{group.items.length - 5} more</span>}
                </div>
              </motion.div>
            ))}
          </CardContent>
        </MotionCard>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {monthlyLoading ? (
          <ChartSkeleton />
        ) : (
          <MotionCard variants={listItem} custom={4} initial="hidden" animate="show">
            <CardHeader>
              <CardTitle className="text-base">Income vs expenses ({year})</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} width={44} tickFormatter={compactMoney} />
                  <Tooltip
                    content={<ChartTooltipContent format={money} />}
                    cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
                    animationDuration={150}
                    animationEasing="ease-out"
                  />
                  <Bar dataKey="income" fill="var(--chart-1)" radius={4} name="Income" {...chartAnimation} />
                  <Bar dataKey="expenses" fill="var(--chart-3)" radius={4} name="Expenses" {...chartAnimation} animationBegin={80} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </MotionCard>
        )}

        {byCategoryLoading ? (
          <ChartSkeleton variant="donut" />
        ) : (
          <MotionCard variants={listItem} custom={5} initial="hidden" animate="show">
            <CardHeader>
              <CardTitle className="text-base">Income by service type ({year})</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              {(byCategory?.length ?? 0) === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No income recorded yet</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={byCategory ?? []}
                      dataKey="amount"
                      nameKey="category"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      {...chartAnimation}
                    >
                      {(byCategory ?? []).map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltipContent format={money} />} animationDuration={150} animationEasing="ease-out" />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </MotionCard>
        )}
      </div>

      <LeadForm open={quickAdd === 'lead'} onOpenChange={(o) => setQuickAdd(o ? 'lead' : null)} />
      <ClientForm open={quickAdd === 'client'} onOpenChange={(o) => setQuickAdd(o ? 'client' : null)} />
      <ProjectForm open={quickAdd === 'project'} onOpenChange={(o) => setQuickAdd(o ? 'project' : null)} />
      <PaymentForm open={quickAdd === 'payment'} onOpenChange={(o) => setQuickAdd(o ? 'payment' : null)} />
      <ExpenseForm open={quickAdd === 'expense'} onOpenChange={(o) => setQuickAdd(o ? 'expense' : null)} />
    </div>
  )
}
