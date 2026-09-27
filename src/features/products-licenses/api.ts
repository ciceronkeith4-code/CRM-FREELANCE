import { queryOptions, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { optimisticRemove } from '@/lib/optimistic'
import type { LicenseInsert, LicenseRow, LicenseUpdate, ProductInsert, ProductRow, ProductUpdate } from '@/types/database'

export const productsKey = ['products'] as const

export interface ProductWithStats extends ProductRow {
  license_count: number
  total_revenue: number
}

export function useProducts() {
  return useQuery({
    queryKey: productsKey,
    queryFn: async () => {
      const { data: products, error } = await supabase.from('products').select('*').order('name')
      if (error) throw error
      const { data: licenses, error: licensesError } = await supabase.from('licenses').select('product_id, amount_paid')
      if (licensesError) throw licensesError
      const stats = new Map<string, { count: number; revenue: number }>()
      for (const l of licenses ?? []) {
        const entry = stats.get(l.product_id) ?? { count: 0, revenue: 0 }
        entry.count += 1
        entry.revenue += l.amount_paid
        stats.set(l.product_id, entry)
      }
      return products.map((p) => ({
        ...p,
        license_count: stats.get(p.id)?.count ?? 0,
        total_revenue: stats.get(p.id)?.revenue ?? 0,
      })) as ProductWithStats[]
    },
  })
}

const productQuery = (id: string | undefined) =>
  queryOptions({
    queryKey: ['products', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*').eq('id', id as string).single()
      if (error) throw error
      return data as ProductRow
    },
  })

export function useProduct(id: string | undefined) {
  return useQuery(productQuery(id))
}

/** Warm the product detail page's queries on hover so the click renders instantly. */
export function prefetchProduct(queryClient: QueryClient, id: string) {
  void queryClient.prefetchQuery(productQuery(id))
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ProductInsert) => {
      const { data, error } = await supabase.from('products').insert(input).select().single()
      if (error) throw error
      return data as ProductRow
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productsKey }),
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: ProductUpdate & { id: string }) => {
      const { error } = await supabase.from('products').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: productsKey })
      queryClient.invalidateQueries({ queryKey: ['products', vars.id] })
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) throw error
    },
    ...optimisticRemove(queryClient, productsKey),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productsKey }),
  })
}

export function useLicenses(productId: string | undefined) {
  return useQuery({
    queryKey: ['products', productId, 'licenses'],
    enabled: !!productId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('licenses')
        .select('*, clients(name)')
        .eq('product_id', productId as string)
        .order('purchase_date', { ascending: false })
      if (error) throw error
      return data as unknown as (LicenseRow & { clients: { name: string } | null })[]
    },
  })
}

export function useCreateLicense(productId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: Omit<LicenseInsert, 'product_id'>) => {
      const { error } = await supabase.from('licenses').insert({ ...input, product_id: productId as string })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', productId, 'licenses'] })
      queryClient.invalidateQueries({ queryKey: productsKey })
    },
  })
}

export function useUpdateLicense(productId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: LicenseUpdate & { id: string }) => {
      const { error } = await supabase.from('licenses').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', productId, 'licenses'] })
      queryClient.invalidateQueries({ queryKey: productsKey })
    },
  })
}

export function useDeleteLicense(productId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('licenses').delete().eq('id', id)
      if (error) throw error
    },
    ...optimisticRemove(queryClient, ['products', productId, 'licenses']),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', productId, 'licenses'] })
      queryClient.invalidateQueries({ queryKey: productsKey })
    },
  })
}
