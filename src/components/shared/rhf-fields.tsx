import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'

export function SelectField<T extends FieldValues>({
  control,
  name,
  options,
  placeholder = 'Select...',
  disabled,
  allowClear,
}: {
  control: Control<T>
  name: Path<T>
  options: readonly string[]
  placeholder?: string
  disabled?: boolean
  allowClear?: boolean
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Select
          value={field.value ?? undefined}
          onValueChange={(v) => field.onChange(v === '__clear__' ? null : v)}
          disabled={disabled}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {allowClear && <SelectItem value="__clear__">—</SelectItem>}
            {options.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  )
}

export function CheckboxField<T extends FieldValues>({
  control,
  name,
  label,
}: {
  control: Control<T>
  name: Path<T>
  label: string
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={!!field.value} onCheckedChange={field.onChange} />
          {label}
        </label>
      )}
    />
  )
}

export function SwitchField<T extends FieldValues>({
  control,
  name,
  label,
}: {
  control: Control<T>
  name: Path<T>
  label: string
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <label className="flex items-center justify-between gap-2 text-sm">
          {label}
          <Switch checked={!!field.value} onCheckedChange={field.onChange} />
        </label>
      )}
    />
  )
}
