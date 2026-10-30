import type { Play } from '@/components/dashboard/play-card'
import obraDemo from '@/data/obra-demo.json'

// Derivado del JSON de la obra demo
export const COMPANY_PROFILE = {
  name: obraDemo.general.nombre_artista_agrupacion,
  email: obraDemo.general.email_contacto,
  country: obraDemo.general.pais.split(' (')[0], // Solo el país, sin el detalle
  director: obraDemo.espectaculo.direccion,
}

export const plays: Play[] = [
  {
    id: 'deseo-mantente-firme',
    title: obraDemo.espectaculo.titulo,
    company: obraDemo.general.nombre_artista_agrupacion,
    genre: 'Drama contemporáneo',
    durationMin: parseInt(obraDemo.espectaculo.duracion_minutos) || 60,
    cover: '/images/deseo-mantente-firme.png',
    coverAlt: 'Escena de la obra Deseo, mantente firme',
    updatedAt: '2026-10-11T18:42:00Z',
    synopsis: obraDemo.espectaculo.sinopsis,
    cloudFolder: obraDemo.tecnica_y_links.link_carpeta_drive,
    videoUrl: obraDemo.tecnica_y_links.link_video_completo,
    assets: { dossier: true, rider: true, fotos: true, video: true },
  },
]

export function getPlay(id: string) {
  return plays.find((play) => play.id === id)
}
