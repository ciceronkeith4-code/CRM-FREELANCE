import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Package } from 'lucide-react'
import { prefetchProduct, useProducts, type ProductWithStats } from '@/features/products-licenses/api'
import { ProductForm } from '@/features/products-licenses/components/product-form'
import { Button } from '@/components/ui/button'
import { DataTable, type DataTableColumn } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { Money } from '@/components/shared/money'
import { useQueryClient } from '@tanstack/react-query'

export function ProductsPage() {
  const { data: products, isLoading } = useProducts()
  const [formOpen, setFormOpen] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const columns: DataTableColumn<ProductWithStats>[] = [
    { key: 'name', header: 'Product', render: (p) => <span className="font-medium">{p.name}</span> },
    { key: 'version', header: 'Version', render: (p) => p.current_version ?? '—' },
    { key: 'price', header: 'Standard price', render: (p) => <Money amount={p.standard_price} /> },
    { key: 'units', header: 'Units sold', render: (p) => p.license_count },
    { key: 'revenue', header: 'Total revenue', render: (p) => <Money amount={p.total_revenue} /> },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Products & Licenses</h1>
          <p className="text-sm text-muted-foreground">Software you sell as one-time purchases.</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus /> Add product
        </Button>
      </div>

      {!isLoading && (products?.length ?? 0) === 0 ? (
        <EmptyState
          icon={Package}
          title="No products yet"
          description="Add a product to start selling licenses."
          actionLabel="Add product"
          onAction={() => setFormOpen(true)}
        />
      ) : (
        <DataTable
          columns={columns}
          data={products ?? []}
          isLoading={isLoading}
          getRowId={(p) => p.id}
          mobileTitle={(p) => p.name}
          onRowClick={(p) => navigate(`/products/${p.id}`)}
          onRowHover={(p) => prefetchProduct(queryClient, p.id)}
        />
      )}

      <ProductForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  )
}
