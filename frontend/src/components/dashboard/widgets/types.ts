import type { ComponentType } from "react"

export type WidgetSpan = 1 | 2 | 4

export type WidgetMeta = {
  type: string
  title: string
  description?: string
  span: WidgetSpan
  /** Multiple instances allowed (parameterized widgets like Pinned topic). */
  multiInstance?: boolean
  /** Default config for new instances of parameterized widgets. */
  defaultConfig?: Record<string, unknown>
  Component: ComponentType<{ config?: Record<string, unknown> }>
  /** Inline editor shown when adding/configuring a parameterized widget. */
  ConfigEditor?: ComponentType<{
    config: Record<string, unknown>
    onChange: (next: Record<string, unknown>) => void
  }>
}

/** Returns the user's local week start (Monday 00:00). */
export function startOfWeek(date = new Date()): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - diff)
  return d
}

export function startOfMonth(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}
