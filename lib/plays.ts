import type { Play } from '@/components/dashboard/play-card'

export const COMPANY_PROFILE = {
  name: 'Cía. Las Pandoras',
  email: 'produccion@laspandoras.cl',
  country: 'Chile',
  director: 'Lucía Márquez',
}

export const plays: Play[] = [
  {
    id: 'deseo-mantente-firme',
    title: 'Deseo, mantente firme',
    company: 'Cía. Las Pandoras',
    genre: 'Drama contemporáneo',
    durationMin: 60,
    cover: '/images/deseo-mantente-firme.png',
    coverAlt: 'Actriz con vestido rojo bajo un foco en escenario oscuro',
    updatedAt: '2026-10-11T18:42:00Z',
    synopsis:
      'Una mujer regresa al teatro abandonado donde debutó y enfrenta, función tras función, el deseo que la sostuvo y la memoria que intenta borrarla.',
    cloudFolder: 'https://drive.google.com/drive/folders/1pAnd0ras-Deseo',
    videoUrl: 'https://vimeo.com/874120553',
    assets: { dossier: true, rider: true, fotos: true, video: true },
  },
  {
    id: 'la-noche-de-pandoras',
    title: 'La noche de Pandoras',
    company: 'Cía. Las Pandoras',
    genre: 'Teatro físico',
    durationMin: 75,
    cover: '/images/la-noche-de-pandoras.png',
    coverAlt: 'Intérpretes alrededor de una caja de madera iluminada en escena nocturna',
    updatedAt: '2026-10-08T10:15:00Z',
    synopsis:
      'Cinco intérpretes abren una caja que no debía abrirse. Lo que sale de ella no son males, sino los cuerpos que la historia decidió olvidar.',
    cloudFolder: 'https://drive.google.com/drive/folders/1pAnd0ras-Noche',
    videoUrl: '',
    assets: { dossier: true, rider: false, fotos: true, video: false },
  },
]

export function getPlay(id: string) {
  return plays.find((play) => play.id === id)
}
