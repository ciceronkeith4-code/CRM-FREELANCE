import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Pencil, Trash2, Plus, MoreHorizontal } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useProduct, useLicenses, useDeleteProduct, useDeleteLicense } from '@/features/products-licenses/api'
import { ProductForm } from '@/features/products-licenses/components/product-form'
import { LicenseForm } from '@/features/products-licenses/components/license-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable, type DataTableColumn } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { StatusBadge } from '@/components/shared/status-badge'
import { Money } from '@/components/shared/money'
import { DateText } from '@/components/shared/date-text'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import type { LicenseRow } from '@/types/database'
import { RecordNotFound } from '@/components/shared/record-not-found'
import { DetailSkeleton } from '@/components/shared/skeletons'

type LicenseWithClient = LicenseRow & { clients: { name: string } | null }

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: product, isLoading } = useProduct(id)
  const { data: licenses, isLoading: licensesLoading } = useLicenses(id)
  const deleteProduct = useDeleteProduct()
  const deleteLicense = useDeleteLicense(id)
  const [formOpen, setFormOpen] = useState(false)
  const [licenseFormOpen, setLicenseFormOpen] = useState(false)
  const [editingLicense, setEditingLicense] = useState<LicenseRow | undefined>(undefined)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteLicenseId, setDeleteLicenseId] = useState<string | null>(null)

  if (isLoading) return <DetailSkeleton stats={0} />

  if (!product) {
    return <RecordNotFound label="Product" backTo="/products" />
  }

  const columns: DataTableColumn<LicenseWithClient>[] = [
    { key: 'client', header: 'Client', render: (l) => <span className="font-medium">{l.clients?.name}</span> },
    { key: 'purchase', header: 'Purchased', render: (l) => <DateText date={l.purchase_date} /> },
    { key: 'amount', header: 'Amount paid', render: (l) => <Money amount={l.amount_paid} /> },
    { key: 'version', header: 'Version', render: (l) => l.version_installed ?? '—' },
    { key: 'support', header: 'Support until', render: (l) => <DateText date={l.support_until_date} /> },
    { key: 'status', header: 'Status', render: (l) => <StatusBadge status={l.status} /> },
    {
      key: 'actions',
      header: '',
      render: (l) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="License actions" onClick={(e) => e.stopPropagation()}>
              <MoreHorizontal className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                setDeleteLicenseId(l.id)
              }}
            >
              <Trash2 /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="icon-sm" aria-label="Back" onClick={() => navigate('/products')}>
          <ArrowLeft />
        </Button>
        <h1 className="min-w-0 flex-1 truncate font-heading text-xl font-semibold">{product.name}</h1>
        <Button variant="outline" onClick={() => setFormOpen(true)}>
          <Pencil /> Edit
        </Button>
        <Button variant="outline" onClick={() => setDeleteOpen(true)}>
          <Trash2 /> Delete
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Product info</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p className="text-muted-foreground">{product.description}</p>
          <div className="flex gap-6">
            <span>
              Version: <span className="font-medium">{product.current_version ?? '—'}</span>
            </span>
            <span>
              Standard price: <Money amount={product.standard_price} className="font-medium" />
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Licenses sold</h2>
        <Button
          size="sm"
          onClick={() => {
            setEditingLicense(undefined)
            setLicenseFormOpen(true)
          }}
        >
          <Plus /> Sell license
        </Button>
      </div>

      {!licensesLoading && (licenses?.length ?? 0) === 0 ? (
        <EmptyState icon={Plus} title="No licenses sold yet" description="Record a sale when a client buys this product." />
      ) : (
        <DataTable
          columns={columns}
          data={licenses ?? []}
          isLoading={licensesLoading}
          getRowId={(l) => l.id}
          mobileTitle={(l) => l.clients?.name ?? 'License'}
          onRowClick={(l) => {
            setEditingLicense(l)
            setLicenseFormOpen(true)
          }}
        />
      )}

      <ProductForm open={formOpen} onOpenChange={setFormOpen} product={product} />
      <LicenseForm open={licenseFormOpen} onOpenChange={setLicenseFormOpen} productId={product.id} license={editingLicense} />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this product?"
        description="All licenses for this product will also be deleted."
        onConfirm={() =>
          deleteProduct.mutate(product.id, {
            onSuccess: () => {
              toast.success('Product deleted')
              navigate('/products')
            },
          })
        }
      />
      <ConfirmDialog
        open={!!deleteLicenseId}
        onOpenChange={(o) => !o && setDeleteLicenseId(null)}
        title="Delete this license?"
        onConfirm={() => {
          if (deleteLicenseId) deleteLicense.mutate(deleteLicenseId)
          setDeleteLicenseId(null)
        }}
      />
    </div>
  )
}
