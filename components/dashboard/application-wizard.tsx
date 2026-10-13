'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  Circle,
  FileText,
  Link2,
  Loader2,
  Play as PlayIcon,
  Send,
  Upload,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { Play } from '@/components/dashboard/play-card'

const STEPS = [
  { id: 1, label: 'Convocatoria' },
  { id: 2, label: 'Pre-evaluación' },
  { id: 3, label: 'Ejecución' },
] as const

const FORM_URL_PATTERN = /^https:\/\/(forms\.cloud\.microsoft\/r\/|forms\.gle\/|docs\.google\.com\/forms\/)\S+$/i
const DURATION_RANGE = { min: 50, max: 90 }

type WizardStep = 1 | 2 | 3

export function ApplicationWizard({ play }: { play: Play }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<WizardStep>(1)
  const [formUrl, setFormUrl] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [feeUsd, setFeeUsd] = useState('')

  const urlIsValid = FORM_URL_PATTERN.test(formUrl.trim())
  const hasSource = urlIsValid || pdfFile !== null

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setStep(1)
      setFormUrl('')
      setPdfFile(null)
      setFeeUsd('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button className="flex-1 gap-1.5" />}>
        <Send className="size-4" aria-hidden="true" />
        Postular a Festival
      </DialogTrigger>

      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="gap-4 border-b p-5">
          <div className="flex flex-col gap-1.5 pr-8">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Postulación · {play.title}
            </p>
            <DialogTitle className="text-lg font-semibold tracking-tight">
              {step === 1 && 'Ingesta de Convocatoria'}
              {step === 2 && 'Pre-evaluación de compatibilidad'}
              {step === 3 && 'Vista de Ejecución del Agente'}
            </DialogTitle>
            <DialogDescription>
              {step === 1 && 'Comparte el formulario del festival o sus bases para que el agente las analice.'}
              {step === 2 && 'Comparamos los requisitos de la convocatoria con la Ficha Única de la Obra.'}
              {step === 3 && 'El agente completará el formulario por ti. Puedes seguir el proceso en vivo.'}
            </DialogDescription>
          </div>
          <Stepper current={step} />
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5">
          {step === 1 && (
            <IngestStep
              formUrl={formUrl}
              onFormUrlChange={setFormUrl}
              urlIsValid={urlIsValid}
              pdfFile={pdfFile}
              onPdfFileChange={setPdfFile}
            />
          )}
          {step === 2 && (
            <AnalysisStep play={play} feeUsd={feeUsd} onFeeUsdChange={setFeeUsd} />
          )}
          {step === 3 && <ExecutionStep playId={play.id} feeUsd={feeUsd} />}
        </div>

        <DialogFooter className="m-0 rounded-none p-4 sm:justify-between">
          {step > 1 ? (
            <Button
              variant="ghost"
              className="gap-1.5"
              onClick={() => setStep((s) => (s - 1) as WizardStep)}
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Atrás
            </Button>
          ) : (
            <span aria-hidden="true" />
          )}
          {step < 3 && (
            <Button
              className="gap-1.5"
              disabled={step === 1 && !hasSource}
              onClick={() => setStep((s) => (s + 1) as WizardStep)}
            >
              {step === 1 ? 'Analizar convocatoria' : 'Continuar al agente'}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Stepper({ current }: { current: WizardStep }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Progreso de la postulación">
      {STEPS.map((s, index) => {
        const done = s.id < current
        const active = s.id === current
        return (
          <li key={s.id} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums transition-colors',
                done && 'border-primary bg-primary text-primary-foreground',
                active && 'border-primary text-primary',
                !done && !active && 'text-muted-foreground'
              )}
              aria-current={active ? 'step' : undefined}
            >
              {done ? <Check className="size-3.5" aria-hidden="true" /> : s.id}
            </span>
            <span
              className={cn(
                'hidden text-xs font-medium sm:inline',
                active ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {s.label}
            </span>
            {index < STEPS.length - 1 && (
              <span
                className={cn('h-px flex-1 bg-border', done && 'bg-primary')}
                aria-hidden="true"
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}

function IngestStep({
  formUrl,
  onFormUrlChange,
  urlIsValid,
  pdfFile,
  onPdfFileChange,
}: {
  formUrl: string
  onFormUrlChange: (value: string) => void
  urlIsValid: boolean
  pdfFile: File | null
  onPdfFileChange: (file: File | null) => void
}) {
  const urlId = useId()
  const hintId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const showUrlError = formUrl.trim().length > 0 && !urlIsValid

  function acceptFile(file: File | undefined) {
    if (!file) return
    if (file.type !== 'application/pdf') {
      setFileError('Solo se aceptan archivos PDF.')
      return
    }
    setFileError(null)
    onPdfFileChange(file)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor={urlId} className="text-sm font-medium">
          Enlace del Formulario de la Convocatoria
        </label>
        <div className="relative">
          <Link2
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id={urlId}
            type="url"
            inputMode="url"
            autoComplete="off"
            value={formUrl}
            onChange={(e) => onFormUrlChange(e.target.value)}
            placeholder="https://forms.cloud.microsoft/r/... o https://forms.gle/..."
            className="h-10 pl-9"
            aria-invalid={showUrlError || undefined}
            aria-describedby={hintId}
          />
        </div>
        <p
          id={hintId}
          className={cn('text-xs', showUrlError ? 'text-destructive' : 'text-muted-foreground')}
        >
          {showUrlError
            ? 'Usa un enlace de Microsoft Forms o Google Forms.'
            : urlIsValid
              ? 'Formulario reconocido. Listo para analizar.'
              : 'Compatible con Microsoft Forms y Google Forms.'}
        </p>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" aria-hidden="true" />O
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
      </div>

      {pdfFile ? (
        <div className="flex items-center gap-3 rounded-lg border bg-accent/50 p-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <FileText className="size-5" aria-hidden="true" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium">{pdfFile.name}</span>
            <span className="text-xs text-muted-foreground">
              {(pdfFile.size / 1024 / 1024).toFixed(2)} MB · Bases de la Convocatoria
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onPdfFileChange(null)}
            aria-label="Quitar archivo"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              acceptFile(e.dataTransfer.files[0])
            }}
            className={cn(
              'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
              dragging ? 'border-primary bg-accent' : 'hover:border-primary/50 hover:bg-muted/50'
            )}
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Upload className="size-5" aria-hidden="true" />
            </span>
            <span className="text-sm font-medium">O sube el PDF con las Bases de la Convocatoria</span>
            <span className="text-xs text-muted-foreground">
              Arrastra y suelta aquí, o haz clic para seleccionar
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => acceptFile(e.target.files?.[0])}
          />
          {fileError && (
            <p className="text-xs text-destructive" role="alert">
              {fileError}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

type CheckStatus = 'pass' | 'warn'

function AnalysisStep({
  play,
  feeUsd,
  onFeeUsdChange,
}: {
  play: Play
  feeUsd: string
  onFeeUsdChange: (value: string) => void
}) {
  const feeId = useId()
  const durationOk =
    play.durationMin >= DURATION_RANGE.min && play.durationMin <= DURATION_RANGE.max
  const feeValue = Number(feeUsd)
  const feeDefined = feeUsd.trim() !== '' && Number.isFinite(feeValue) && feeValue > 0

  const checks: { status: CheckStatus; title: string; detail: string }[] = [
    {
      status: durationOk ? 'pass' : 'warn',
      title: `Duración requerida: ${DURATION_RANGE.min} a ${DURATION_RANGE.max} min`,
      detail: `Obra actual: ${play.durationMin} min · ${durationOk ? 'Cumple' : 'No cumple'}`,
    },
    {
      status: 'pass',
      title: 'Carpeta en la nube con acceso abierto',
      detail: 'Enlace detectado y verificado',
    },
    {
      status: feeDefined ? 'pass' : 'warn',
      title: feeDefined ? 'Honorarios definidos' : 'Requisito pendiente: Definir monto de honorarios en USD',
      detail: feeDefined
        ? `${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(feeValue)} por función`
        : 'El formulario exige un monto de caché por función.',
    },
  ]

  const passed = checks.filter((c) => c.status === 'pass').length
  const score = Math.round((passed / checks.length) * 100)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4 rounded-lg border bg-muted/40 p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Bot className="size-5" aria-hidden="true" />
        </span>
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium">Reporte de compatibilidad</span>
            <span className="text-sm font-semibold tabular-nums text-primary">{score}%</span>
          </div>
          <Progress value={score} aria-label="Compatibilidad con la convocatoria" />
          <span className="text-xs text-muted-foreground">
            {passed} de {checks.length} requisitos cumplidos
          </span>
        </div>
      </div>

      <ul className="flex flex-col gap-2" aria-label="Checklist de requisitos">
        {checks.map((check) => (
          <li
            key={check.title}
            className={cn(
              'flex items-start gap-3 rounded-lg border p-3',
              check.status === 'warn' && 'border-highlight/50 bg-highlight/10'
            )}
          >
            {check.status === 'pass' ? (
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
            ) : (
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-highlight" aria-hidden="true" />
            )}
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium leading-snug">
                <span className="sr-only">{check.status === 'pass' ? 'Cumple: ' : 'Atención: '}</span>
                {check.title}
              </span>
              <span className="text-xs text-muted-foreground">{check.detail}</span>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2">
        <label htmlFor={feeId} className="text-sm font-medium">
          Honorarios por función (USD)
        </label>
        <div className="relative">
          <span
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground"
            aria-hidden="true"
          >
            $
          </span>
          <Input
            id={feeId}
            type="number"
            inputMode="decimal"
            min={1}
            step={50}
            value={feeUsd}
            onChange={(e) => onFeeUsdChange(e.target.value)}
            placeholder="1500"
            className="h-10 pl-7 tabular-nums"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Opcional ahora: el agente dejará este campo marcado para revisión si queda vacío.
        </p>
      </div>
    </div>
  )
}

type TaskState = 'done' | 'running' | 'pending'

const AGENT_TASKS = [
  'Analizando estructura de la convocatoria',
  'Mapeando campos con la Ficha Única de la Obra',
  'Abriendo navegador Chromium en GCP Cloud Run...',
] as const

function ExecutionStep({ playId, feeUsd }: { playId: string; feeUsd: string }) {
  const router = useRouter()
  const [completed, setCompleted] = useState(0)
  const [launched, setLaunched] = useState(false)
  const preparing = completed < 2

  useEffect(() => {
    if (completed >= 2) return
    const timer = setTimeout(() => setCompleted((c) => c + 1), 1400)
    return () => clearTimeout(timer)
  }, [completed])

  useEffect(() => {
    if (!launched) return
    const query = feeUsd.trim() ? `?honorarios=${encodeURIComponent(feeUsd.trim())}` : ''
    const timer = setTimeout(() => router.push(`/agente/${playId}${query}`), 1600)
    return () => clearTimeout(timer)
  }, [launched, playId, feeUsd, router])

  function stateFor(index: number): TaskState {
    if (index < completed) return 'done'
    if (index === completed && (index < 2 || launched)) return 'running'
    return 'pending'
  }

  const progress = Math.round(((completed + (launched ? 0.5 : 0)) / AGENT_TASKS.length) * 100)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-4">
        <div className="flex items-center gap-3">
          <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <Bot className="size-5" aria-hidden="true" />
            {(preparing || launched) && (
              <span className="absolute -top-0.5 -right-0.5 size-2.5 animate-pulse rounded-full bg-primary" />
            )}
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-medium" aria-live="polite">
              {launched
                ? 'Postulación en vivo iniciada'
                : preparing
                  ? 'Agente IA preparando la postulación...'
                  : 'Agente listo para postular'}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">{progress}% completado</span>
          </div>
        </div>
        <Progress value={progress} aria-label="Progreso del agente" />
      </div>

      <ol className="flex flex-col gap-1" aria-label="Estado de las tareas del agente">
        {AGENT_TASKS.map((label, index) => {
          const state = stateFor(index)
          return (
            <li key={label} className="flex items-center gap-3 rounded-md px-2 py-2.5">
              <TaskIcon state={state} />
              <span
                className={cn(
                  'text-sm',
                  state === 'done' && 'text-foreground',
                  state === 'running' && 'font-medium text-foreground',
                  state === 'pending' && 'text-muted-foreground'
                )}
              >
                {label}
              </span>
              <span className="sr-only">
                {state === 'done' ? '(completado)' : state === 'running' ? '(en curso)' : '(pendiente)'}
              </span>
            </li>
          )
        })}
      </ol>

      <Button
        size="lg"
        className="h-11 w-full gap-2"
        disabled={preparing || launched}
        onClick={() => setLaunched(true)}
      >
        {launched ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <PlayIcon className="size-4" aria-hidden="true" />
        )}
        {launched ? 'Conectando con el navegador...' : 'Iniciar Postulación en Vivo'}
      </Button>
    </div>
  )
}

function TaskIcon({ state }: { state: TaskState }) {
  if (state === 'done') {
    return (
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Check className="size-3" aria-hidden="true" />
      </span>
    )
  }
  if (state === 'running') {
    return <Loader2 className="size-5 shrink-0 animate-spin text-primary" aria-hidden="true" />
  }
  return <Circle className="size-5 shrink-0 text-muted-foreground/50" aria-hidden="true" />
}
