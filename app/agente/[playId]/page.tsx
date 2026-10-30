import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Bot, ExternalLink, Monitor } from 'lucide-react'
import { getPlay } from '@/lib/plays'

export const metadata: Metadata = {
  title: 'Agente en vivo · StageFlow AI',
  description: 'El agente está completando el formulario en un navegador Chromium.',
}

export default async function AgentPage({
  params,
  searchParams,
}: {
  params: Promise<{ playId: string }>
  searchParams: Promise<{ honorarios?: string; formUrl?: string; festivalName?: string }>
}) {
  const { playId } = await params
  const { formUrl = '' } = await searchParams
  const play = getPlay(playId)
  if (!play) notFound()

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10">
            <Bot className="size-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Agente en ejecución</h1>
          <p className="text-muted-foreground">
            El formulario se está completando en una ventana de <strong>Chromium</strong>
          </p>
        </div>

        {/* Card principal */}
        <div className="rounded-xl border-2 border-primary/20 bg-card p-6 space-y-4 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Monitor className="size-6 text-primary" />
            </div>
            <div className="space-y-1">
              <h2 className="font-semibold">Busca la ventana de Chromium</h2>
              <p className="text-sm text-muted-foreground">
                Se abrió un navegador donde el agente está llenando el formulario automáticamente.
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-muted/50 p-4 space-y-3">
            <p className="text-sm font-medium">📋 Próximos pasos:</p>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>
                <strong>Encuentra la ventana de Chromium</strong> en tu barra de tareas
              </li>
              <li>
                <strong>Revisa</strong> que los datos del formulario estén correctos
              </li>
              <li>
                <strong>Corrige</strong> manualmente cualquier campo si es necesario
              </li>
              <li>
                <strong>Haz clic en "Enviar"</strong> cuando estés listo
              </li>
            </ol>
          </div>

          {formUrl && (
            <div className="pt-2">
              <p className="text-xs text-muted-foreground mb-2">Formulario destino:</p>
              <a 
                href={formUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <ExternalLink className="size-3.5" />
                {formUrl.length > 50 ? formUrl.substring(0, 50) + '...' : formUrl}
              </a>
            </div>
          )}
        </div>

        {/* Info de la obra */}
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Postulando:</p>
          <p className="font-medium">{play.title}</p>
          <p className="text-sm text-muted-foreground">{play.company}</p>
        </div>

        {/* Acciones */}
        <div className="flex flex-col gap-3">
          <Link 
            href="/"
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="size-4" />
            Volver a Mis Obras
          </Link>
        </div>

        {/* Nota */}
        <p className="text-center text-xs text-muted-foreground">
          💡 El agente <strong>nunca envía</strong> el formulario automáticamente.
          <br />
          Siempre tienes control total antes de enviar.
        </p>
      </div>
    </div>
  )
}
