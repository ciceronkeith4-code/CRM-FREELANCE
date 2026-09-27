import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { DashboardSkeleton, PageSkeleton } from '@/components/shared/skeletons'
import { ProtectedRoute } from '@/features/auth/protected-route'
import { AppLayout } from '@/components/layout/app-layout'
import { LoginPage } from '@/features/auth/pages/login-page'
import { SignupPage } from '@/features/auth/pages/signup-page'
import { ForgotPasswordPage } from '@/features/auth/pages/forgot-password-page'
import { ResetPasswordPage } from '@/features/auth/pages/reset-password-page'
import { PublicOnlyRoute } from '@/features/auth/public-only-route'
import { RouteError } from '@/components/layout/route-error'
import { LeadsPage } from '@/features/leads/pages/leads-page'
import { LeadDetailPage } from '@/features/leads/pages/lead-detail-page'
import { QuotationsPage } from '@/features/quotations/pages/quotations-page'
import { QuotationDetailPage } from '@/features/quotations/pages/quotation-detail-page'
import { ClientsPage } from '@/features/clients/pages/clients-page'
import { ClientDetailPage } from '@/features/clients/pages/client-detail-page'
import { ProjectsPage } from '@/features/projects/pages/projects-page'
import { ProjectDetailPage } from '@/features/projects/pages/project-detail-page'
import { InvoicesPage } from '@/features/invoices/pages/invoices-page'
import { InvoiceDetailPage } from '@/features/invoices/pages/invoice-detail-page'
import { PaymentsPage } from '@/features/payments/pages/payments-page'
import { RecurringServicesPage } from '@/features/recurring-services/pages/recurring-services-page'
import { ProductsPage } from '@/features/products-licenses/pages/products-page'
import { ProductDetailPage } from '@/features/products-licenses/pages/product-detail-page'
import { ExpensesPage } from '@/features/expenses/pages/expenses-page'
import { SettingsPage } from '@/features/settings/pages/settings-page'

// Heavy pages (charts, calendar grid, reports) load on demand so the first paint is fast.
const DashboardPage = lazy(() => import('@/features/dashboard/pages/dashboard-page').then((m) => ({ default: m.DashboardPage })))
const CalendarPage = lazy(() => import('@/features/calendar/pages/calendar-page').then((m) => ({ default: m.CalendarPage })))
const ReportsPage = lazy(() => import('@/features/reports/pages/reports-page').then((m) => ({ default: m.ReportsPage })))

function withSkeleton(element: ReactNode, fallback: ReactNode) {
  return <Suspense fallback={fallback}>{element}</Suspense>
}

export const router = createBrowserRouter([
  {
    element: <PublicOnlyRoute />,
    errorElement: <RouteError />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/signup', element: <SignupPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
    ],
  },
  // Reachable while signed in: the reset link signs the person in to a recovery session.
  { path: '/reset-password', element: <ResetPasswordPage />, errorElement: <RouteError /> },
  {
    element: <ProtectedRoute />,
    errorElement: <RouteError />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: withSkeleton(<DashboardPage />, <DashboardSkeleton />) },
          { path: '/calendar', element: withSkeleton(<CalendarPage />, <PageSkeleton />) },
          { path: '/leads', element: <LeadsPage /> },
          { path: '/leads/:id', element: <LeadDetailPage /> },
          { path: '/quotations', element: <QuotationsPage /> },
          { path: '/quotations/:id', element: <QuotationDetailPage /> },
          { path: '/clients', element: <ClientsPage /> },
          { path: '/clients/:id', element: <ClientDetailPage /> },
          { path: '/projects', element: <ProjectsPage /> },
          { path: '/projects/:id', element: <ProjectDetailPage /> },
          { path: '/invoices', element: <InvoicesPage /> },
          { path: '/invoices/:id', element: <InvoiceDetailPage /> },
          { path: '/payments', element: <PaymentsPage /> },
          { path: '/recurring-services', element: <RecurringServicesPage /> },
          { path: '/products', element: <ProductsPage /> },
          { path: '/products/:id', element: <ProductDetailPage /> },
          { path: '/expenses', element: <ExpensesPage /> },
          { path: '/reports', element: withSkeleton(<ReportsPage />, <PageSkeleton />) },
          { path: '/settings', element: <SettingsPage /> },
          { path: '*', element: <RouteError /> },
        ],
      },
    ],
  },
])
