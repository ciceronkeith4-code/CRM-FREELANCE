function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function toCsv(rows: Record<string, unknown>[], columns?: { key: string; label: string }[]): string {
  if (rows.length === 0 && !columns) return ''
  const cols = columns ?? Object.keys(rows[0] ?? {}).map((key) => ({ key, label: key }))
  const header = cols.map((c) => escapeCsvCell(c.label)).join(',')
  const lines = rows.map((row) => cols.map((c) => escapeCsvCell(row[c.key])).join(','))
  return [header, ...lines].join('\r\n')
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[], columns?: { key: string; label: string }[]) {
  const csv = toCsv(rows, columns)
  // BOM so Excel opens it as UTF-8 (otherwise ₱, ñ, and emoji come out garbled).
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
