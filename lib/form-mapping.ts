import type { Play } from '@/components/dashboard/play-card'
import { COMPANY_PROFILE } from '@/lib/plays'

export type FormPage = 1 | 2 | 3

export type FieldKind = 'text' | 'textarea' | 'url' | 'number' | 'email'

export type FieldStatus = 'injected' | 'typing' | 'queued' | 'review' | 'edited'

export type FormField = {
  id: string
  page: FormPage
  question: string
  kind: FieldKind
  required: boolean
  value: string
  source: string
}

export const FORM_PAGES: Record<FormPage, string> = {
  1: 'Datos de la compañía',
  2: 'Ficha artística',
  3: 'Material de apoyo',
}

export const FESTIVAL = {
  name: 'Festival Escena Abierta 2027',
  call: 'Convocatoria Internacional · Sala & Calle',
  formUrl: 'docs.google.com/forms/d/e/1FAIpQLSe-escena-abierta/viewform',
}

export function buildFormFields(play: Play, feeUsd: string): FormField[] {
  const fee = Number(feeUsd)
  const feeValue = Number.isFinite(fee) && fee > 0 ? String(Math.round(fee)) : ''

  return [
    {
      id: 'company',
      page: 1,
      question: 'Nombre de la compañía o colectivo',
      kind: 'text',
      required: true,
      value: COMPANY_PROFILE.name,
      source: 'Perfil · Compañía',
    },
    {
      id: 'email',
      page: 1,
      question: 'Correo electrónico de contacto',
      kind: 'email',
      required: true,
      value: COMPANY_PROFILE.email,
      source: 'Perfil · Contacto',
    },
    {
      id: 'country',
      page: 1,
      question: 'País de origen',
      kind: 'text',
      required: true,
      value: COMPANY_PROFILE.country,
      source: 'Perfil · País',
    },
    {
      id: 'title',
      page: 2,
      question: 'Título de la obra',
      kind: 'text',
      required: true,
      value: play.title,
      source: 'Ficha · Título',
    },
    {
      id: 'duration',
      page: 2,
      question: 'Duración total (en minutos)',
      kind: 'number',
      required: true,
      value: String(play.durationMin),
      source: 'Ficha · Duración',
    },
    {
      id: 'synopsis',
      page: 2,
      question: 'Sinopsis breve (máx. 300 caracteres)',
      kind: 'textarea',
      required: true,
      value: play.synopsis,
      source: 'Ficha · Sinopsis',
    },
    {
      id: 'folder',
      page: 2,
      question: 'Enlace a carpeta con dossier y fotos (acceso abierto)',
      kind: 'url',
      required: true,
      value: play.cloudFolder,
      source: 'Kit · Carpeta en la nube',
    },
    {
      id: 'fee',
      page: 2,
      question: 'Honorarios por función (USD)',
      kind: 'number',
      required: true,
      value: feeValue,
      source: feeValue ? 'Wizard · Honorarios' : 'Sin dato en la Ficha',
    },
    {
      id: 'video',
      page: 3,
      question: 'Enlace al registro completo en video',
      kind: 'url',
      required: true,
      value: play.videoUrl,
      source: play.videoUrl ? 'Kit · Video Vimeo' : 'Sin dato en el Kit',
    },
    {
      id: 'director',
      page: 3,
      question: 'Responsable de la postulación',
      kind: 'text',
      required: true,
      value: COMPANY_PROFILE.director,
      source: 'Perfil · Dirección',
    },
    {
      id: 'authorship',
      page: 3,
      question: 'Declaro que la compañía cuenta con los derechos de autor de la obra',
      kind: 'text',
      required: true,
      value: 'Sí, declaro',
      source: 'Ficha · Derechos',
    },
  ]
}
