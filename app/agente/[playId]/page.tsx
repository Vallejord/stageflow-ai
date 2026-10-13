import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AgentWorkspace } from '@/components/agent/agent-workspace'
import { buildFormFields } from '@/lib/form-mapping'
import { getPlay } from '@/lib/plays'

export const metadata: Metadata = {
  title: 'Agente en vivo · StageFlow AI',
  description: 'Monitorea en tiempo real cómo el agente IA completa la postulación al festival.',
}

export default async function AgentPage({
  params,
  searchParams,
}: {
  params: Promise<{ playId: string }>
  searchParams: Promise<{ honorarios?: string }>
}) {
  const { playId } = await params
  const { honorarios = '' } = await searchParams
  const play = getPlay(playId)
  if (!play) notFound()

  return <AgentWorkspace play={play} fields={buildFormFields(play, honorarios)} />
}
