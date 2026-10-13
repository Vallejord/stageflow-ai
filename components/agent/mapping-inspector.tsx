'use client'

import { AlertTriangle, Check, Circle, Hand, Loader2, Pause, Pencil, Play, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { FORM_PAGES, type FieldStatus, type FormField, type FormPage } from '@/lib/form-mapping'
import type { AgentMode } from '@/components/agent/agent-workspace'

const STATUS_LABEL: Record<FieldStatus, string> = {
  injected: 'Inyectado',
  typing: 'Escribiendo',
  queued: 'En cola',
  review: 'Revisar',
  edited: 'Editado a mano',
}

export function MappingInspector({
  fields,
  values,
  statuses,
  mode,
  sent,
  reviewCount,
  canSubmit,
  agentFinished,
  onTogglePause,
  onToggleManual,
  onSubmit,
  onSelectField,
}: {
  fields: FormField[]
  values: Record<string, string>
  statuses: Record<string, FieldStatus>
  mode: AgentMode
  sent: boolean
  reviewCount: number
  canSubmit: boolean
  agentFinished: boolean
  onTogglePause: () => void
  onToggleManual: () => void
  onSubmit: () => void
  onSelectField: (field: FormField) => void
}) {
  const filled = fields.filter((f) => statuses[f.id] === 'injected' || statuses[f.id] === 'edited').length
  const progress = Math.round((filled / fields.length) * 100)
  const pages = [1, 2, 3] as FormPage[]

  return (
    <div className="flex flex-1 flex-col md:min-h-0">
      <div className="flex flex-col gap-3 border-b p-4 md:px-5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-tight">Inspector de Mapeo en Vivo</h2>
          <span className="text-xs text-muted-foreground tabular-nums">
            {filled}/{fields.length} campos
          </span>
        </div>
        <Progress value={progress} aria-label="Campos completados" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Preguntas detectadas en el formulario y el dato inyectado desde la Ficha Única de la Obra.
          {mode === 'manual' && ' Selecciona una fila para editarla en el navegador.'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto md:min-h-0">
        {pages.map((page) => (
          <div key={page} className="flex flex-col">
            <h3 className="sticky top-0 z-10 border-b bg-background/95 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground backdrop-blur md:px-5">
              Página {page} · {FORM_PAGES[page]}
            </h3>
            <ul className="flex flex-col">
              {fields
                .filter((f) => f.page === page)
                .map((field) => (
                  <MappingRow
                    key={field.id}
                    field={field}
                    value={values[field.id]}
                    status={statuses[field.id]}
                    interactive={mode === 'manual' && !sent}
                    onSelect={() => onSelectField(field)}
                  />
                ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 border-t bg-card p-4 md:px-5">
        {reviewCount > 0 && !sent && (
          <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-highlight" aria-hidden="true" />
            {reviewCount === 1 ? '1 campo obligatorio' : `${reviewCount} campos obligatorios`} sin dato. Toma el
            control manual para completarlo antes de enviar.
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="gap-1.5" onClick={onTogglePause} disabled={sent || mode === 'manual' || agentFinished}>
            {mode === 'paused' ? (
              <Play className="size-4" aria-hidden="true" />
            ) : (
              <Pause className="size-4" aria-hidden="true" />
            )}
            {mode === 'paused' ? 'Reanudar Agente' : 'Pausar Agente'}
          </Button>
          <Button
            variant={mode === 'manual' ? 'secondary' : 'outline'}
            className="gap-1.5"
            onClick={onToggleManual}
            disabled={sent}
            aria-pressed={mode === 'manual'}
          >
            <Hand className="size-4" aria-hidden="true" />
            {mode === 'manual' ? 'Devolver Control' : 'Tomar Control Manual'}
          </Button>
        </div>
        <Button size="lg" className="h-12 w-full gap-2 text-sm font-semibold" disabled={!canSubmit} onClick={onSubmit}>
          {sent ? <Check className="size-4" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
          {sent ? 'Postulación enviada' : 'Confirmar y Enviar Postulación'}
        </Button>
        {!canSubmit && !sent && (
          <p className="text-center text-xs text-muted-foreground">
            Disponible cuando el agente termine de completar el formulario.
          </p>
        )}
      </div>
    </div>
  )
}

function MappingRow({
  field,
  value,
  status,
  interactive,
  onSelect,
}: {
  field: FormField
  value: string
  status: FieldStatus
  interactive: boolean
  onSelect: () => void
}) {
  const content = (
    <>
      <StatusIcon status={status} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-xs text-muted-foreground">{field.question}</span>
        <span
          className={cn(
            'truncate text-sm',
            value ? 'font-medium text-foreground' : 'text-muted-foreground/70 italic'
          )}
        >
          {value || (status === 'review' ? 'Sin dato disponible' : 'Pendiente')}
          {status === 'typing' && <span className="ml-0.5 inline-block h-3.5 w-px animate-pulse bg-primary align-middle" aria-hidden="true" />}
        </span>
        <span className="flex items-center gap-2 text-xs">
          <span className="rounded border px-1.5 py-0.5 font-mono text-muted-foreground">{field.source}</span>
          <span
            className={cn(
              'font-medium',
              status === 'review' && 'text-highlight',
              (status === 'injected' || status === 'typing') && 'text-primary',
              status === 'edited' && 'text-foreground',
              status === 'queued' && 'text-muted-foreground'
            )}
          >
            {STATUS_LABEL[status]}
          </span>
        </span>
      </div>
    </>
  )

  const rowClass = cn(
    'flex w-full items-start gap-3 border-b px-4 py-3 text-left md:px-5',
    status === 'typing' && 'bg-accent/40',
    status === 'review' && 'bg-highlight/5'
  )

  return (
    <li>
      {interactive ? (
        <button
          type="button"
          onClick={onSelect}
          className={cn(rowClass, 'transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none')}
        >
          {content}
        </button>
      ) : (
        <div className={rowClass}>{content}</div>
      )}
    </li>
  )
}

function StatusIcon({ status }: { status: FieldStatus }) {
  const base = 'mt-0.5 size-4 shrink-0'
  if (status === 'injected')
    return (
      <span className={cn(base, 'flex items-center justify-center rounded-full bg-primary text-primary-foreground')}>
        <Check className="size-2.5" aria-hidden="true" />
      </span>
    )
  if (status === 'typing') return <Loader2 className={cn(base, 'animate-spin text-primary')} aria-hidden="true" />
  if (status === 'review') return <AlertTriangle className={cn(base, 'text-highlight')} aria-hidden="true" />
  if (status === 'edited') return <Pencil className={cn(base, 'text-foreground')} aria-hidden="true" />
  return <Circle className={cn(base, 'text-muted-foreground/50')} aria-hidden="true" />
}
