import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useIncomeByMonth(start: string, end: string) {
  return useQuery({
    queryKey: ['reports', 'income_by_month', start, end],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('report_income_by_month', { p_start: start, p_end: end })
      if (error) throw error
      return data
    },
  })
}

export function useIncomeByClient(start: string, end: string) {
  return useQuery({
    queryKey: ['reports', 'income_by_client', start, end],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('report_income_by_client', { p_start: start, p_end: end })
      if (error) throw error
      return data
    },
  })
}

export function useIncomeByServiceType(start: string, end: string) {
  return useQuery({
    queryKey: ['reports', 'income_by_service_type', start, end],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('report_income_by_service_type', { p_start: start, p_end: end })
      if (error) throw error
      return data
    },
  })
}

export function useExpensesByCategory(start: string, end: string) {
  return useQuery({
    queryKey: ['reports', 'expenses_by_category', start, end],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('report_expenses_by_category', { p_start: start, p_end: end })
      if (error) throw error
      return data
    },
  })
}

export function useProfitReport(start: string, end: string) {
  return useQuery({
    queryKey: ['reports', 'profit', start, end],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('report_profit', { p_start: start, p_end: end })
      if (error) throw error
      return data[0]
    },
  })
}

export function useLeadConversion(start: string, end: string) {
  return useQuery({
    queryKey: ['reports', 'lead_conversion', start, end],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('report_lead_conversion', { p_start: start, p_end: end })
      if (error) throw error
      return data[0]
    },
  })
}

export function useLeadSources(start: string, end: string) {
  return useQuery({
    queryKey: ['reports', 'lead_sources', start, end],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('report_lead_sources', { p_start: start, p_end: end })
      if (error) throw error
      return data
    },
  })
}

export function useTopClients(start: string, end: string) {
  return useQuery({
    queryKey: ['reports', 'top_clients', start, end],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('report_top_clients', { p_start: start, p_end: end, p_limit: 10 })
      if (error) throw error
      return data
    },
  })
}

export function useEffectiveHourlyRate(start: string, end: string) {
  return useQuery({
    queryKey: ['reports', 'hourly_rate', start, end],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('report_effective_hourly_rate_by_project', { p_start: start, p_end: end })
      if (error) throw error
      return data
    },
  })
}
