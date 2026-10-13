import Image from 'next/image'
import { Camera, Check, Clock, FileText, Film, Pencil, SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ApplicationWizard } from '@/components/dashboard/application-wizard'
import { cn } from '@/lib/utils'

export type AssetKey = 'dossier' | 'rider' | 'fotos' | 'video'

export type Play = {
  id: string
  title: string
  company: string
  genre: string
  durationMin: number
  cover: string
  coverAlt: string
  updatedAt: string
  synopsis: string
  cloudFolder: string
  videoUrl: string
  assets: Record<AssetKey, boolean>
}

const assetMeta: Record<AssetKey, { label: string; icon: typeof FileText }> = {
  dossier: { label: 'Dossier PDF', icon: FileText },
  rider: { label: 'Rider Técnico', icon: SlidersHorizontal },
  fotos: { label: 'Fotos HD', icon: Camera },
  video: { label: 'Video Vimeo', icon: Film },
}

export function PlayCard({ play }: { play: Play }) {
  const assetEntries = Object.entries(play.assets) as [AssetKey, boolean][]
  const readyCount = assetEntries.filter(([, ready]) => ready).length
  const isComplete = readyCount === assetEntries.length

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md">
      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
        <Image
          src={play.cover || '/placeholder.svg'}
          alt={play.coverAlt}
          fill
          sizes="(min-width: 1280px) 40vw, (min-width: 768px) 50vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium text-foreground shadow-sm backdrop-blur">
          <Clock className="size-3" aria-hidden="true" />
          {play.durationMin} min
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {play.genre}
          </p>
          <h3 className="text-lg font-semibold tracking-tight text-balance">{play.title}</h3>
          <p className="text-sm text-muted-foreground">{play.company}</p>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">Kit de postulación</span>
            <span className={cn('tabular-nums', isComplete ? 'text-primary' : 'text-muted-foreground')}>
              {readyCount}/{assetEntries.length} listos
            </span>
          </div>
          <ul className="flex flex-wrap gap-1.5" aria-label="Materiales disponibles">
            {assetEntries.map(([key, ready]) => {
              const { label, icon: Icon } = assetMeta[key]
              return (
                <li
                  key={key}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
                    ready
                      ? 'border-primary/25 bg-accent text-accent-foreground'
                      : 'border-dashed text-muted-foreground'
                  )}
                >
                  <Icon className="size-3" aria-hidden="true" />
                  {label}
                  {ready ? (
                    <Check className="size-3" aria-hidden="true" />
                  ) : (
                    <X className="size-3" aria-hidden="true" />
                  )}
                  <span className="sr-only">{ready ? '(disponible)' : '(pendiente)'}</span>
                </li>
              )
            })}
          </ul>
        </div>

        <p className="mt-auto text-xs text-muted-foreground">
          Actualizado <time dateTime={play.updatedAt}>{formatRelative(play.updatedAt)}</time>
        </p>

        <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row">
          <Button variant="outline" className="flex-1 gap-1.5">
            <Pencil className="size-4" aria-hidden="true" />
            Editar Ficha
          </Button>
          <ApplicationWizard play={play} />
        </div>
      </div>
    </article>
  )
}

function formatRelative(iso: string) {
  const formatter = new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  })
  return `el ${formatter.format(new Date(iso))}`
}
