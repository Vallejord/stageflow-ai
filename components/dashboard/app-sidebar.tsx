import { Drama, Radar, Send, Settings2, Sparkles } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'

const navItems = [
  { title: 'Mis Obras', href: '#', icon: Drama, active: true },
  { title: 'Convocatorias Detectadas', href: '#', icon: Radar, badge: '3 Nuevas' },
  { title: 'Postulaciones en Curso', href: '#', icon: Send },
  { title: 'Ajustes de Perfil', href: '#', icon: Settings2 },
]

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<a href="#" />} tooltip="StageFlow AI">
              <span className="flex aspect-square size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Sparkles className="size-4" aria-hidden="true" />
              </span>
              <span className="flex flex-col leading-tight">
                <span className="text-sm font-semibold tracking-tight">StageFlow AI</span>
                <span className="text-xs text-muted-foreground">Compañía Teatral</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Espacio de trabajo</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={item.active}
                    tooltip={item.title}
                    className={item.badge ? 'pr-16' : undefined}
                    render={<a href={item.href} aria-current={item.active ? 'page' : undefined} />}
                  >
                    <item.icon aria-hidden="true" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                  {item.badge && (
                    <SidebarMenuBadge className="rounded-full bg-highlight px-1.5 text-[10px] font-semibold text-highlight-foreground peer-hover/menu-button:text-highlight-foreground">
                      {item.badge}
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="rounded-lg border bg-card p-3 text-xs leading-relaxed text-muted-foreground group-data-[collapsible=icon]:hidden">
          <p className="font-medium text-foreground">Temporada 2026–27</p>
          <p>12 festivales abren convocatoria este mes.</p>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
