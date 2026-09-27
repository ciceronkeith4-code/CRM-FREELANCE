// Hand-authored to match supabase/migrations/*.sql. Regenerate with
// `supabase gen types typescript` once the project is linked if you want this
// kept perfectly in sync automatically.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type BusinessSettingsRow = {
  id: string
  user_id: string
  business_name: string | null
  owner_name: string | null
  logo_path: string | null
  email: string | null
  phone: string | null
  address: string | null
  tin: string | null
  currency: string
  payment_instructions: string | null
  default_downpayment_percent: number
  invoice_prefix: string
  quote_prefix: string
  renewal_reminder_days: number
  created_at: string
}

export type PreferredContact = 'Messenger' | 'Viber' | 'WhatsApp' | 'Email' | 'Phone' | 'Other'
export type LeadSource = 'Referral' | 'Facebook' | 'Instagram' | 'LinkedIn' | 'Cold outreach' | 'Walk-in' | 'Website' | 'Other'
export type ServiceInterest = 'Website' | 'Website redesign' | 'Web app/System' | 'E-commerce' | 'Maintenance' | 'Other'
export type LeadStage = 'New' | 'Contacted' | 'Interested' | 'Proposal Sent' | 'Negotiating' | 'Won' | 'Lost'

export type LeadRow = {
  id: string
  user_id: string
  name: string
  company: string | null
  business_type: string | null
  email: string | null
  phone: string | null
  preferred_contact: PreferredContact | null
  social_link: string | null
  source: LeadSource | null
  service_interested_in: ServiceInterest | null
  estimated_value: number | null
  stage: LeadStage
  next_follow_up_date: string | null
  lost_reason: string | null
  notes: string | null
  is_sample: boolean
  created_at: string
}

export type ClientRow = {
  id: string
  user_id: string
  name: string
  company: string | null
  business_type: string | null
  email: string | null
  phone: string | null
  preferred_contact: PreferredContact | null
  social_link: string | null
  address: string | null
  source: LeadSource | null
  lead_id: string | null
  tags: string[]
  notes: string | null
  is_sample: boolean
  created_at: string
}

export type DiscountType = 'amount' | 'percent'
export type QuotationStatus = 'Draft' | 'Sent' | 'Accepted' | 'Declined' | 'Expired'

export type QuotationRow = {
  id: string
  user_id: string
  number: string | null
  client_id: string | null
  lead_id: string | null
  title: string
  discount_type: DiscountType | null
  discount_value: number
  subtotal: number
  total: number
  issue_date: string
  valid_until_date: string | null
  terms: string | null
  status: QuotationStatus
  project_id: string | null
  is_sample: boolean
  created_at: string
}

export type QuotationLineItemRow = {
  id: string
  user_id: string
  quotation_id: string
  description: string
  quantity: number
  unit_price: number
  line_total: number
  sort_order: number
  created_at: string
}

export type ProjectType = 'Website' | 'Website redesign' | 'Web app/System' | 'E-commerce' | 'Mobile app' | 'Maintenance' | 'Other'
export type PricingModel = 'Fixed price' | 'Hourly' | 'Retainer'
export type ProjectStatus = 'Planning' | 'In Progress' | 'On Hold' | 'For Review' | 'Completed' | 'Cancelled'

export type ProjectRow = {
  id: string
  user_id: string
  client_id: string
  title: string
  description: string | null
  project_type: ProjectType | null
  pricing_model: PricingModel
  base_price: number
  hourly_rate: number | null
  estimated_hours: number | null
  status: ProjectStatus
  start_date: string | null
  deadline: string | null
  completion_date: string | null
  warranty_end_date: string | null
  tech_stack: string[]
  live_url: string | null
  staging_url: string | null
  repository_url: string | null
  hosting_provider: string | null
  domain_registrar: string | null
  quotation_id: string | null
  notes: string | null
  is_sample: boolean
  created_at: string
}

export type ProjectAccessInfoRow = {
  id: string
  user_id: string
  project_id: string
  label: string
  url: string | null
  username: string | null
  credential_location: string | null
  created_at: string
}

export type MilestoneStatus = 'Pending' | 'Invoiced' | 'Paid'

export type MilestoneRow = {
  id: string
  user_id: string
  project_id: string
  title: string
  amount: number
  due_date: string | null
  status: MilestoneStatus
  sort_order: number
  created_at: string
}

export type RequestedVia = 'Messenger' | 'Viber' | 'Email' | 'Call' | 'Meeting' | 'Other'
export type ChangeRequestStatus = 'Requested' | 'Approved' | 'In Progress' | 'Done' | 'Declined'

export type ChangeRequestRow = {
  id: string
  user_id: string
  project_id: string
  title: string
  description: string | null
  date_requested: string
  requested_via: RequestedVia | null
  extra_charge: number
  estimated_hours: number | null
  status: ChangeRequestStatus
  date_completed: string | null
  created_at: string
}

export type TimeLogRow = {
  id: string
  user_id: string
  project_id: string
  change_request_id: string | null
  date: string
  hours: number
  description: string | null
  created_at: string
}

export type InvoiceStatus = 'Draft' | 'Sent' | 'Partially Paid' | 'Paid' | 'Overdue' | 'Cancelled'

export type InvoiceRow = {
  id: string
  user_id: string
  number: string | null
  client_id: string
  project_id: string | null
  discount_type: DiscountType | null
  discount_value: number
  subtotal: number
  total: number
  issue_date: string
  due_date: string | null
  notes: string | null
  status: InvoiceStatus
  is_sample: boolean
  created_at: string
}

export type InvoiceLineItemRow = {
  id: string
  user_id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price: number
  line_total: number
  source_milestone_id: string | null
  source_change_request_id: string | null
  sort_order: number
  created_at: string
}

export type PaymentMethod = 'GCash' | 'Maya' | 'Bank transfer' | 'PayPal' | 'Wise' | 'Cash' | 'Other'
export type PaymentType = 'Downpayment' | 'Milestone' | 'Full payment' | 'Change request' | 'Recurring service' | 'License' | 'Other'

export type PaymentRow = {
  id: string
  user_id: string
  invoice_id: string | null
  project_id: string | null
  client_id: string
  amount: number
  date_paid: string
  method: PaymentMethod | null
  payment_type: PaymentType | null
  reference_number: string | null
  proof_path: string | null
  notes: string | null
  is_sample: boolean
  created_at: string
}

export type ServiceType = 'Hosting' | 'Domain' | 'SSL' | 'Email hosting' | 'Maintenance retainer' | 'Software subscription' | 'Other'
export type BillingCycle = 'Monthly' | 'Quarterly' | 'Yearly'
export type RecurringStatus = 'Active' | 'Paused' | 'Cancelled'

export type RecurringServiceRow = {
  id: string
  user_id: string
  client_id: string
  project_id: string | null
  service_type: ServiceType
  provider: string | null
  description: string | null
  amount_charged: number
  my_cost: number
  billing_cycle: BillingCycle
  next_renewal_date: string | null
  auto_renew_on_provider: boolean
  status: RecurringStatus
  is_sample: boolean
  created_at: string
}

export type ProductRow = {
  id: string
  user_id: string
  name: string
  description: string | null
  current_version: string | null
  standard_price: number
  notes: string | null
  is_sample: boolean
  created_at: string
}

export type LicenseStatus = 'Active' | 'Support Expired' | 'Revoked'

export type LicenseRow = {
  id: string
  user_id: string
  product_id: string
  client_id: string
  purchase_date: string
  amount_paid: number
  deployment_url: string | null
  version_installed: string | null
  license_key: string | null
  support_until_date: string | null
  status: LicenseStatus
  notes: string | null
  is_sample: boolean
  created_at: string
}

export type ExpenseCategory = 'Hosting' | 'Domain' | 'Software/Subscription' | 'Hardware' | 'Internet' | 'Transportation' | 'Outsourcing' | 'Other'

export type ExpenseRow = {
  id: string
  user_id: string
  date: string
  category: ExpenseCategory
  amount: number
  vendor: string | null
  client_id: string | null
  project_id: string | null
  receipt_path: string | null
  notes: string | null
  is_sample: boolean
  created_at: string
}

export type EntityType = 'lead' | 'client' | 'project'
export type ActivityType = 'Call' | 'Meeting' | 'Message' | 'Email' | 'Note' | 'Agreement'

export type ActivityRow = {
  id: string
  user_id: string
  entity_type: EntityType
  entity_id: string
  type: ActivityType
  date: string
  content: string | null
  created_at: string
}

export type TaskPriority = 'Low' | 'Medium' | 'High'

export type TaskRow = {
  id: string
  user_id: string
  title: string
  due_date: string | null
  priority: TaskPriority
  entity_type: EntityType | null
  entity_id: string | null
  done: boolean
  is_sample: boolean
  created_at: string
}

export type FileEntityType = 'client' | 'project'

export type FileRow = {
  id: string
  user_id: string
  entity_type: FileEntityType
  entity_id: string
  name: string
  storage_path: string
  upload_date: string
}

// ---- Computed views ----

export type ProjectComputedRow = {
  project_id: string
  user_id: string
  base_price: number
  contract_value: number
  total_paid: number
  direct_costs: number
  hours_logged: number
  deadline_status: 'On track' | 'Due soon' | 'Overdue'
  balance: number
  profit: number
  payment_status: 'Unpaid' | 'Partially Paid' | 'Fully Paid'
  effective_hourly_rate: number | null
}

export type ClientTotalsRow = {
  client_id: string
  user_id: string
  lifetime_value: number
  outstanding_balance: number
  project_count: number
  active_recurring_services: number
}

export type InvoiceComputedRow = InvoiceRow & {
  amount_paid: number
  computed_status: InvoiceStatus
}

type TableDef<Row, Insert, Update = Partial<Insert>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

type ViewDef<Row> = { Row: Row; Relationships: [] }

export type Database = {
  public: {
    Tables: {
      business_settings: TableDef<BusinessSettingsRow, Partial<Omit<BusinessSettingsRow, 'id' | 'created_at'>> & { user_id?: string }>
      leads: TableDef<LeadRow, Partial<Omit<LeadRow, 'id' | 'created_at'>> & { name: string }>
      clients: TableDef<ClientRow, Partial<Omit<ClientRow, 'id' | 'created_at'>> & { name: string }>
      quotations: TableDef<QuotationRow, Partial<Omit<QuotationRow, 'id' | 'created_at' | 'number'>> & { title: string }>
      quotation_line_items: TableDef<QuotationLineItemRow, Partial<Omit<QuotationLineItemRow, 'id' | 'created_at'>> & { quotation_id: string; description: string }>
      projects: TableDef<ProjectRow, Partial<Omit<ProjectRow, 'id' | 'created_at'>> & { client_id: string; title: string }>
      project_access_info: TableDef<ProjectAccessInfoRow, Partial<Omit<ProjectAccessInfoRow, 'id' | 'created_at'>> & { project_id: string; label: string }>
      milestones: TableDef<MilestoneRow, Partial<Omit<MilestoneRow, 'id' | 'created_at'>> & { project_id: string; title: string }>
      change_requests: TableDef<ChangeRequestRow, Partial<Omit<ChangeRequestRow, 'id' | 'created_at'>> & { project_id: string; title: string }>
      time_logs: TableDef<TimeLogRow, Partial<Omit<TimeLogRow, 'id' | 'created_at'>> & { project_id: string }>
      invoices: TableDef<InvoiceRow, Partial<Omit<InvoiceRow, 'id' | 'created_at' | 'number'>> & { client_id: string }>
      invoice_line_items: TableDef<InvoiceLineItemRow, Partial<Omit<InvoiceLineItemRow, 'id' | 'created_at'>> & { invoice_id: string; description: string }>
      payments: TableDef<PaymentRow, Partial<Omit<PaymentRow, 'id' | 'created_at'>> & { client_id: string; amount: number }>
      recurring_services: TableDef<RecurringServiceRow, Partial<Omit<RecurringServiceRow, 'id' | 'created_at'>> & { client_id: string; service_type: ServiceType }>
      products: TableDef<ProductRow, Partial<Omit<ProductRow, 'id' | 'created_at'>> & { name: string }>
      licenses: TableDef<LicenseRow, Partial<Omit<LicenseRow, 'id' | 'created_at'>> & { product_id: string; client_id: string }>
      expenses: TableDef<ExpenseRow, Partial<Omit<ExpenseRow, 'id' | 'created_at'>> & { category: ExpenseCategory; amount: number }>
      activities: TableDef<ActivityRow, Partial<Omit<ActivityRow, 'id' | 'created_at'>> & { entity_type: EntityType; entity_id: string; type: ActivityType }>
      tasks: TableDef<TaskRow, Partial<Omit<TaskRow, 'id' | 'created_at'>> & { title: string }>
      files: TableDef<FileRow, Partial<Omit<FileRow, 'id'>> & { entity_type: FileEntityType; entity_id: string; name: string; storage_path: string }>
    }
    Views: {
      view_project_computed: ViewDef<ProjectComputedRow>
      view_client_totals: ViewDef<ClientTotalsRow>
      view_invoices_computed: ViewDef<InvoiceComputedRow>
    }
    Functions: {
      dashboard_stats: {
        Args: Record<string, never>
        Returns: {
          income_this_month: number
          income_this_year: number
          outstanding_balance: number
          overdue_invoice_total: number
          net_profit_this_year: number
          active_projects: number
          open_pipeline_value: number
        }[]
      }
      dashboard_monthly_income_expense: {
        Args: { p_year: number }
        Returns: { month: number; income: number; expenses: number }[]
      }
      dashboard_income_by_category: {
        Args: { p_year: number }
        Returns: { category: string; amount: number }[]
      }
      report_income_by_month: {
        Args: { p_start: string; p_end: string }
        Returns: { month_start: string; income: number }[]
      }
      report_income_by_client: {
        Args: { p_start: string; p_end: string }
        Returns: { client_id: string; client_name: string; income: number }[]
      }
      report_income_by_service_type: {
        Args: { p_start: string; p_end: string }
        Returns: { category: string; income: number }[]
      }
      report_expenses_by_category: {
        Args: { p_start: string; p_end: string }
        Returns: { category: string; amount: number }[]
      }
      report_profit: {
        Args: { p_start: string; p_end: string }
        Returns: { income: number; expenses: number; profit: number }[]
      }
      report_lead_conversion: {
        Args: { p_start: string; p_end: string }
        Returns: { total_leads: number; won: number; lost: number; conversion_rate: number }[]
      }
      report_lead_sources: {
        Args: { p_start: string; p_end: string }
        Returns: { source: string; lead_count: number }[]
      }
      report_top_clients: {
        Args: { p_start: string; p_end: string; p_limit?: number }
        Returns: { client_id: string; client_name: string; total_received: number }[]
      }
      report_effective_hourly_rate_by_project: {
        Args: { p_start: string; p_end: string }
        Returns: {
          project_id: string
          project_title: string
          total_paid: number
          hours_logged: number
          effective_hourly_rate: number | null
        }[]
      }
      seed_sample_data: { Args: Record<string, never>; Returns: undefined }
      clear_sample_data: { Args: Record<string, never>; Returns: undefined }
      mark_recurring_service_renewed: { Args: { p_id: string }; Returns: RecurringServiceRow }
      replace_invoice_line_items: { Args: { p_invoice_id: string; p_items: Json }; Returns: undefined }
      replace_quotation_line_items: { Args: { p_quotation_id: string; p_items: Json }; Returns: undefined }
    }
  }
}

export type LeadInsert = Database['public']['Tables']['leads']['Insert']
export type LeadUpdate = Database['public']['Tables']['leads']['Update']
export type ClientInsert = Database['public']['Tables']['clients']['Insert']
export type ClientUpdate = Database['public']['Tables']['clients']['Update']
export type QuotationInsert = Database['public']['Tables']['quotations']['Insert']
export type QuotationUpdate = Database['public']['Tables']['quotations']['Update']
export type QuotationLineItemInsert = Database['public']['Tables']['quotation_line_items']['Insert']
export type ProjectInsert = Database['public']['Tables']['projects']['Insert']
export type ProjectUpdate = Database['public']['Tables']['projects']['Update']
export type ProjectAccessInfoInsert = Database['public']['Tables']['project_access_info']['Insert']
export type MilestoneInsert = Database['public']['Tables']['milestones']['Insert']
export type MilestoneUpdate = Database['public']['Tables']['milestones']['Update']
export type ChangeRequestInsert = Database['public']['Tables']['change_requests']['Insert']
export type ChangeRequestUpdate = Database['public']['Tables']['change_requests']['Update']
export type TimeLogInsert = Database['public']['Tables']['time_logs']['Insert']
export type InvoiceInsert = Database['public']['Tables']['invoices']['Insert']
export type InvoiceUpdate = Database['public']['Tables']['invoices']['Update']
export type InvoiceLineItemInsert = Database['public']['Tables']['invoice_line_items']['Insert']
export type PaymentInsert = Database['public']['Tables']['payments']['Insert']
export type PaymentUpdate = Database['public']['Tables']['payments']['Update']
export type RecurringServiceInsert = Database['public']['Tables']['recurring_services']['Insert']
export type RecurringServiceUpdate = Database['public']['Tables']['recurring_services']['Update']
export type ProductInsert = Database['public']['Tables']['products']['Insert']
export type ProductUpdate = Database['public']['Tables']['products']['Update']
export type LicenseInsert = Database['public']['Tables']['licenses']['Insert']
export type LicenseUpdate = Database['public']['Tables']['licenses']['Update']
export type ExpenseInsert = Database['public']['Tables']['expenses']['Insert']
export type ExpenseUpdate = Database['public']['Tables']['expenses']['Update']
export type ActivityInsert = Database['public']['Tables']['activities']['Insert']
export type TaskInsert = Database['public']['Tables']['tasks']['Insert']
export type FileInsert = Database['public']['Tables']['files']['Insert']
export type BusinessSettingsUpdate = Database['public']['Tables']['business_settings']['Update']
