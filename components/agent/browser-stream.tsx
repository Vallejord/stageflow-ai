'use client'

import { useEffect, useRef } from 'react'
import { CheckCircle2, ChevronLeft, ChevronRight, Hand, Lock, Pause, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FESTIVAL, FORM_PAGES, type FieldStatus, type FormField, type FormPage } from '@/lib/form-mapping'
import type { AgentMode } from '@/components/agent/agent-workspace'

const TOTAL_PAGES = 3

export function BrowserStream({
  fields,
  values,
  statuses,
  page,
  agentPage,
  mode,
  sent,
  activeFieldId,
  lastAction,
  onFieldChange,
  onPageChange,
}: {
  fields: FormField[]
  values: Record<string, string>
  statuses: Record<string, FieldStatus>
  page: FormPage
  agentPage: FormPage
  mode: AgentMode
  sent: boolean
  activeFieldId?: string
  lastAction: string
  onFieldChange: (id: string, value: string) => void
  onPageChange: (page: FormPage) => void
}) {
  const activeRef = useRef<HTMLDivElement>(null)
  const pageFields = fields.filter((f) => f.page === page)
  const editable = mode === 'manual' && !sent

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeFieldId])

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm md:min-h-0">
      <div className="flex items-center gap-3 border-b bg-muted/50 px-3 py-2">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
        </div>
        <RotateCw
          className={cn('size-3.5 text-muted-foreground', mode === 'running' && !sent && 'animate-spin [animation-duration:3s]')}
          aria-hidden="true"
        />
        <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md bg-background px-2.5 py-1 font-mono text-xs text-muted-foreground">
          <Lock className="size-3 shrink-0" aria-hidden="true" />
          <span className="truncate">{FESTIVAL.formUrl}</span>
        </div>
        <span className="hidden items-center gap-1.5 font-mono text-xs text-muted-foreground sm:inline-flex">
          <span className="size-1.5 rounded-full bg-destructive" aria-hidden="true" />
          LIVE
        </span>
      </div>

      <div className="relative flex-1 overflow-y-auto bg-muted/30 md:min-h-0">
        <StatusOverlay mode={mode} sent={sent} page={agentPage} />

        <div className="mx-auto flex max-w-xl flex-col gap-3 px-4 pt-16 pb-6">
          <div className="overflow-hidden rounded-lg border border-t-8 border-t-primary bg-card p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {FESTIVAL.call}
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-balance">{FESTIVAL.name}</h2>
            <p className="mt-2 text-xs text-muted-foreground">
              <span className="text-destructive">*</span> Indica que la pregunta es obligatoria
            </p>
          </div>

          {sent ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border bg-card p-8 text-center">
              <CheckCircle2 className="size-8 text-primary" aria-hidden="true" />
              <p className="font-semibold">Se registró tu respuesta</p>
              <p className="text-sm text-muted-foreground text-pretty">
                El comité de {FESTIVAL.name} recibió la postulación. Te escribirán al correo de contacto.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-1">
                <p className="text-sm font-medium">{FORM_PAGES[page]}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  Página {page} de {TOTAL_PAGES}
                </p>
              </div>

              {pageFields.map((field) => {
                const status = statuses[field.id]
                const active = field.id === activeFieldId
                const inputId = `stream-field-${field.id}`
                const sharedClass =
                  'w-full border-0 border-b-2 bg-transparent px-0 py-1.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 read-only:cursor-default focus:border-primary'
                return (
                  <div
                    key={field.id}
                    ref={active ? activeRef : undefined}
                    className={cn(
                      'flex flex-col gap-3 rounded-lg border bg-card p-5 transition-shadow',
                      active && 'ring-2 ring-primary',
                      status === 'review' && 'border-highlight/60'
                    )}
                  >
                    <label htmlFor={inputId} className="text-sm leading-relaxed">
                      {field.question}
                      {field.required && <span className="text-destructive"> *</span>}
                    </label>
                    {field.kind === 'textarea' ? (
                      <textarea
                        id={inputId}
                        rows={3}
                        readOnly={!editable}
                        value={values[field.id]}
                        onChange={(e) => onFieldChange(field.id, e.target.value)}
                        placeholder="Tu respuesta"
                        className={cn(sharedClass, 'resize-none leading-relaxed', active ? 'border-primary' : 'border-border')}
                      />
                    ) : (
                      <input
                        id={inputId}
                        type={field.kind === 'number' ? 'text' : field.kind}
                        inputMode={field.kind === 'number' ? 'numeric' : undefined}
                        readOnly={!editable}
                        value={values[field.id]}
                        onChange={(e) => onFieldChange(field.id, e.target.value)}
                        placeholder="Tu respuesta"
                        className={cn(sharedClass, active ? 'border-primary' : 'border-border')}
                      />
                    )}
                    {active && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                        <span className="size-1.5 animate-pulse rounded-full bg-primary" aria-hidden="true" />
                        Agente escribiendo
                      </span>
                    )}
                    {status === 'review' && !active && (
                      <span className="text-xs font-medium text-highlight">
                        Campo obligatorio sin dato · requiere revisión
                      </span>
                    )}
                  </div>
                )
              })}

              <div className="flex items-center justify-between px-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!editable || page === 1}
                  onClick={() => onPageChange((page - 1) as FormPage)}
                  className="gap-1"
                >
                  <ChevronLeft className="size-4" aria-hidden="true" />
                  Atrás
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!editable || page === TOTAL_PAGES}
                  onClick={() => onPageChange((page + 1) as FormPage)}
                  className="gap-1"
                >
                  Siguiente
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 border-t bg-muted/50 px-3 py-2 font-mono text-xs text-muted-foreground">
        <span className="text-primary" aria-hidden="true">
          {'›'}
        </span>
        <span className="truncate" aria-live="polite">
          {lastAction}
        </span>
      </div>
    </div>
  )
}

function StatusOverlay({ mode, sent, page }: { mode: AgentMode; sent: boolean; page: FormPage }) {
  const config = sent
    ? { label: 'Postulación enviada', dot: 'bg-primary', icon: null }
    : mode === 'manual'
      ? { label: 'Control manual activo', dot: 'bg-highlight', icon: Hand }
      : mode === 'paused'
        ? { label: `Agente en pausa · Página ${page}/${TOTAL_PAGES}`, dot: 'bg-highlight', icon: Pause }
        : { label: `Agente Activo · Página ${page}/${TOTAL_PAGES}`, dot: 'bg-primary', icon: null }
  const Icon = config.icon

  return (
    <div className="pointer-events-none sticky top-0 z-10 flex justify-center pt-3" role="status">
      <span className="inline-flex items-center gap-2 rounded-full border bg-popover/95 px-3 py-1.5 text-xs font-medium text-popover-foreground shadow-md backdrop-blur">
        {Icon ? (
          <Icon className="size-3.5 text-highlight" aria-hidden="true" />
        ) : (
          <span className="relative flex size-2" aria-hidden="true">
            {mode === 'running' && !sent && (
              <span className={cn('absolute inset-0 animate-ping rounded-full opacity-75', config.dot)} />
            )}
            <span className={cn('relative size-2 rounded-full', config.dot)} />
          </span>
        )}
        {config.label}
      </span>
    </div>
  )
}
