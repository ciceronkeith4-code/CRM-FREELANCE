import { useState } from 'react'
import { startOfYear, format, parseISO } from 'date-fns'
import {
  useIncomeByMonth,
  useIncomeByClient,
  useIncomeByServiceType,
  useExpensesByCategory,
  useProfitReport,
  useLeadConversion,
  useLeadSources,
  useTopClients,
  useEffectiveHourlyRate,
} from '@/features/reports/api'
import { ReportSection } from '@/features/reports/components/report-section'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Money } from '@/components/shared/money'
import { useDebouncedValue } from '@/hooks/use-debounced-value'

export function ReportsPage() {
  const [start, setStart] = useState(() => format(startOfYear(new Date()), 'yyyy-MM-dd'))
  const [end, setEnd] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  // Typing a date changes the value per keystroke; wait for a pause before re-running every report.
  const range = { start: useDebouncedValue(start, 300), end: useDebouncedValue(end, 300) }

  const incomeByMonth = useIncomeByMonth(range.start, range.end)
  const incomeByClient = useIncomeByClient(range.start, range.end)
  const incomeByServiceType = useIncomeByServiceType(range.start, range.end)
  const expensesByCategory = useExpensesByCategory(range.start, range.end)
  const profit = useProfitReport(range.start, range.end)
  const leadConversion = useLeadConversion(range.start, range.end)
  const leadSources = useLeadSources(range.start, range.end)
  const topClients = useTopClients(range.start, range.end)
  const hourlyRate = useEffectiveHourlyRate(range.start, range.end)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">Pick a date range — every report below updates and can be exported.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="w-40" />
        <span className="text-sm text-muted-foreground">to</span>
        <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="w-40" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ReportSection
          title="Income by month"
          rows={incomeByMonth.data ?? []}
          filename="income-by-month"
          loading={incomeByMonth.isLoading}
          updating={incomeByMonth.isPlaceholderData}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Income</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incomeByMonth.data?.map((r) => (
                <TableRow key={r.month_start}>
                  <TableCell>{format(parseISO(r.month_start), 'MMMM yyyy')}</TableCell>
                  <TableCell className="text-right">
                    <Money amount={r.income} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ReportSection>

        <ReportSection
          title="Income by client"
          rows={incomeByClient.data ?? []}
          filename="income-by-client"
          loading={incomeByClient.isLoading}
          updating={incomeByClient.isPlaceholderData}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Income</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incomeByClient.data?.map((r) => (
                <TableRow key={r.client_id}>
                  <TableCell>{r.client_name}</TableCell>
                  <TableCell className="text-right">
                    <Money amount={r.income} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ReportSection>

        <ReportSection
          title="Income by service/project type"
          rows={incomeByServiceType.data ?? []}
          filename="income-by-service-type"
          loading={incomeByServiceType.isLoading}
          updating={incomeByServiceType.isPlaceholderData}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Income</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incomeByServiceType.data?.map((r) => (
                <TableRow key={r.category}>
                  <TableCell>{r.category}</TableCell>
                  <TableCell className="text-right">
                    <Money amount={r.income} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ReportSection>

        <ReportSection
          title="Expenses by category"
          rows={expensesByCategory.data ?? []}
          filename="expenses-by-category"
          loading={expensesByCategory.isLoading}
          updating={expensesByCategory.isPlaceholderData}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expensesByCategory.data?.map((r) => (
                <TableRow key={r.category}>
                  <TableCell>{r.category}</TableCell>
                  <TableCell className="text-right">
                    <Money amount={r.amount} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ReportSection>

        <ReportSection
          title="Profit"
          rows={profit.data ? [profit.data] : []}
          filename="profit"
          loading={profit.isLoading}
          updating={profit.isPlaceholderData}
        >
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Income</span>
              <Money amount={profit.data?.income} />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expenses</span>
              <Money amount={profit.data?.expenses} />
            </div>
            <div className="flex justify-between border-t pt-2 font-medium">
              <span>Profit</span>
              <Money amount={profit.data?.profit} />
            </div>
          </div>
        </ReportSection>

        <ReportSection
          title="Lead conversion & sources"
          rows={leadSources.data ?? []}
          filename="lead-sources"
          loading={leadConversion.isLoading || leadSources.isLoading}
          updating={leadConversion.isPlaceholderData || leadSources.isPlaceholderData}
        >
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total leads</span>
              <span>{leadConversion.data?.total_leads ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Won</span>
              <span>{leadConversion.data?.won ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lost</span>
              <span>{leadConversion.data?.lost ?? 0}</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-medium">
              <span>Conversion rate</span>
              <span>{leadConversion.data?.conversion_rate ?? 0}%</span>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leadSources.data?.map((r) => (
                  <TableRow key={r.source}>
                    <TableCell>{r.source}</TableCell>
                    <TableCell className="text-right">{r.lead_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ReportSection>

        <ReportSection
          title="Top clients by value"
          rows={topClients.data ?? []}
          filename="top-clients"
          loading={topClients.isLoading}
          updating={topClients.isPlaceholderData}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topClients.data?.map((r) => (
                <TableRow key={r.client_id}>
                  <TableCell>{r.client_name}</TableCell>
                  <TableCell className="text-right">
                    <Money amount={r.total_received} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ReportSection>

        <ReportSection
          title="Effective hourly rate by project"
          rows={hourlyRate.data ?? []}
          filename="effective-hourly-rate"
          loading={hourlyRate.isLoading}
          updating={hourlyRate.isPlaceholderData}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead className="text-right">Rate/hr</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hourlyRate.data?.map((r) => (
                <TableRow key={r.project_id}>
                  <TableCell>{r.project_title}</TableCell>
                  <TableCell className="text-right">
                    <Money amount={r.total_paid} />
                  </TableCell>
                  <TableCell className="text-right">{r.hours_logged}</TableCell>
                  <TableCell className="text-right">{r.effective_hourly_rate != null ? <Money amount={r.effective_hourly_rate} /> : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ReportSection>
      </div>
    </div>
  )
}
