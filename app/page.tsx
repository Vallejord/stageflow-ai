import { Plus } from 'lucide-react'
import { AppSidebar } from '@/components/dashboard/app-sidebar'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { PlayCard } from '@/components/dashboard/play-card'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { plays } from '@/lib/plays'

export default function Page() {
  return (
    <SidebarProvider style={{ '--sidebar-width': '18rem' } as React.CSSProperties}>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader />
        <main className="flex flex-1 flex-col gap-6 p-4 md:p-8">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">Mis Obras</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
              Tu repertorio listo para girar. Completa el kit de cada obra y StageFlow AI la postulará a
              las convocatorias que encajen.
            </p>
          </div>

          <section aria-label="Repertorio" className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
            {plays.map((play) => (
              <PlayCard key={play.id} play={play} />
            ))}
            <button
              type="button"
              className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed text-muted-foreground transition-colors hover:border-primary/50 hover:bg-accent/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <span className="flex size-10 items-center justify-center rounded-full border bg-card">
                <Plus className="size-5" aria-hidden="true" />
              </span>
              <span className="text-sm font-medium">Añadir otra obra</span>
            </button>
          </section>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
