'use client'

import { Bell, LogOut, Moon, Plus, Search, Settings2, Sun, User } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'

export function DashboardHeader() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md md:px-6">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="hidden h-5 md:block" />

      <form role="search" className="relative flex-1 md:max-w-sm" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="global-search" className="sr-only">
          Buscar obras, festivales o convocatorias
        </label>
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id="global-search"
          type="search"
          placeholder="Buscar obras, festivales..."
          className="h-9 bg-muted/50 pl-9"
        />
      </form>

      <div className="ml-auto flex items-center gap-1 md:gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Cambiar tema"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="size-4 dark:hidden" aria-hidden="true" />
          <Moon className="hidden size-4 dark:block" aria-hidden="true" />
        </Button>

        <Button variant="ghost" size="icon" className="relative" aria-label="Notificaciones, 3 sin leer">
          <Bell className="size-4" aria-hidden="true" />
          <span className="absolute top-2 right-2 size-2 rounded-full bg-highlight ring-2 ring-background" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" className="rounded-full" aria-label="Menú de perfil" />
            }
          >
            <Avatar className="size-8">
              <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
                LM
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <span className="block text-sm font-medium text-foreground">Lucía Márquez</span>
                <span className="block text-xs font-normal text-muted-foreground">
                  Cía. Las Pandoras
                </span>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User aria-hidden="true" />
              Perfil de compañía
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings2 aria-hidden="true" />
              Ajustes
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <LogOut aria-hidden="true" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button className="ml-1 hidden gap-1.5 sm:inline-flex">
          <Plus className="size-4" aria-hidden="true" />
          Nueva Obra
        </Button>
        <Button size="icon" className="sm:hidden" aria-label="Nueva Obra">
          <Plus className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </header>
  )
}
