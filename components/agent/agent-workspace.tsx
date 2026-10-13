'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Server } from 'lucide-react'
import { BrowserStream } from '@/components/agent/browser-stream'
import { MappingInspector } from '@/components/agent/mapping-inspector'
import { FESTIVAL, type FieldStatus, type FormField, type FormPage } from '@/lib/form-mapping'
import type { Play } from '@/components/dashboard/play-card'

export type AgentMode = 'running' | 'paused' | 'manual'

const TYPE_DELAY_MS = 40
const FIELD_PAUSE_MS = 700

export function AgentWorkspace({ play, fields }: { play: Play; fields: FormField[] }) {
  const firstPendingIndex = Math.max(
    0,
    fields.findIndex((f) => f.page === 2)
  )
  const [cursor, setCursor] = useState(firstPendingIndex)
  const [chars, setChars] = useState(0)
  const [mode, setMode] = useState<AgentMode>('running')
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [manualPage, setManualPage] = useState<FormPage>(2)
  const [sent, setSent] = useState(false)

  const agentFinished = cursor >= fields.length
  const activeField = agentFinished ? undefined : fields[cursor]

  useEffect(() => {
    if (mode !== 'running' || sent || !activeField) return
    const target = activeField.value
    const skip = overrides[activeField.id] !== undefined || target === ''
    const typed = chars >= target.length

    const timer = setTimeout(
      () => {
        if (skip || typed) {
          setCursor((c) => c + 1)
          setChars(0)
        } else {
          setChars((c) => Math.min(target.length, c + Math.max(1, Math.ceil(target.length / 28))))
        }
      },
      skip || typed ? FIELD_PAUSE_MS : TYPE_DELAY_MS
    )
    return () => clearTimeout(timer)
  }, [mode, sent, activeField, chars, overrides])

  const values: Record<string, string> = {}
  const statuses: Record<string, FieldStatus> = {}
  fields.forEach((field, index) => {
    const override = overrides[field.id]
    let value = ''
    if (override !== undefined) value = override
    else if (index < cursor) value = field.value
    else if (index === cursor) value = field.value.slice(0, chars)
    values[field.id] = value

    if (override !== undefined) statuses[field.id] = override.trim() ? 'edited' : 'review'
    else if (index < cursor) statuses[field.id] = field.value ? 'injected' : 'review'
    else if (index === cursor && mode === 'running' && field.value) statuses[field.id] = 'typing'
    else statuses[field.id] = 'queued'
  })

  const agentPage: FormPage = (activeField ?? fields[fields.length - 1]).page
  const displayedPage = mode === 'manual' ? manualPage : agentPage
  const reviewCount = Object.values(statuses).filter((s) => s === 'review').length
  const canSubmit = !sent && (agentFinished || mode === 'manual')

  function togglePause() {
    setMode((m) => (m === 'running' ? 'paused' : 'running'))
  }

  function toggleManual() {
    if (mode === 'manual') {
      setMode('running')
      return
    }
    setManualPage(agentPage)
    setMode('manual')
  }

  function handleFieldChange(id: string, value: string) {
    setOverrides((prev) => ({ ...prev, [id]: value }))
  }

  function focusField(field: FormField) {
    if (mode !== 'manual') return
    setManualPage(field.page)
    requestAnimationFrame(() => document.getElementById(`stream-field-${field.id}`)?.focus())
  }

  function handleSubmit() {
    setSent(true)
    setMode('paused')
  }

  const lastAction = sent
    ? 'submit() · respuesta registrada por el servidor del formulario'
    : mode === 'manual'
      ? 'agent.yield() · control entregado al usuario'
      : mode === 'paused'
        ? 'agent.pause() · sesión del navegador retenida'
        : activeField
          ? `type("#${activeField.id}", "${values[activeField.id].slice(-24)}")`
          : 'idle · todos los campos mapeados, esperando confirmación'

  return (
    <div className="flex min-h-dvh flex-col md:h-dvh">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4 md:px-6">
        <Link
          href="/"
          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          aria-label="Volver a Mis Obras"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
        </Link>
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate text-sm font-semibold tracking-tight">
            {play.title} <span className="font-normal text-muted-foreground">{'→'} {FESTIVAL.name}</span>
          </h1>
          <p className="truncate text-xs text-muted-foreground">{FESTIVAL.call}</p>
        </div>
        <span className="ml-auto hidden items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-xs text-muted-foreground md:inline-flex">
          <Server className="size-3" aria-hidden="true" />
          chromium · cloud-run · us-central1
        </span>
      </header>

      <main className="flex flex-1 flex-col md:min-h-0 md:flex-row">
        <section
          aria-label="Transmisión del navegador del agente"
          className="flex flex-col border-b p-3 md:p-4 md:min-h-0 md:w-3/5 md:border-r md:border-b-0"
        >
          <BrowserStream
            fields={fields}
            values={values}
            statuses={statuses}
            page={displayedPage}
            agentPage={agentPage}
            mode={mode}
            sent={sent}
            activeFieldId={mode === 'running' ? activeField?.id : undefined}
            lastAction={lastAction}
            onFieldChange={handleFieldChange}
            onPageChange={setManualPage}
          />
        </section>

        <section aria-label="Inspector de mapeo de datos" className="flex flex-col md:min-h-0 md:w-2/5">
          <MappingInspector
            fields={fields}
            values={values}
            statuses={statuses}
            mode={mode}
            sent={sent}
            reviewCount={reviewCount}
            canSubmit={canSubmit}
            agentFinished={agentFinished}
            onTogglePause={togglePause}
            onToggleManual={toggleManual}
            onSubmit={handleSubmit}
            onSelectField={focusField}
          />
        </section>
      </main>
    </div>
  )
}
