// POST /api/respuestas: la extensión manda la estructura del formulario y recibe las respuestas propuestas.
// La lógica vive en lib/servidor/respuestas.ts (probada en tests/api-respuestas.test.ts).
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { atenderRespuestas, encabezadosCors } from '../../../lib/servidor/respuestas.ts'
import { proponerRespuestas } from '../../../lib/motor/proponer.ts'

export const runtime = 'nodejs'

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: encabezadosCors(req.headers.get('origin')) })
}

export async function POST(req: Request) {
  const origen = req.headers.get('origin')
  const cuerpo = await req.json().catch(() => null)
  const r = await atenderRespuestas(
    { origen, token: req.headers.get('x-stageflow-token'), cuerpo },
    {
      tokenEsperado: process.env.STAGEFLOW_DEV_TOKEN,
      ficha: JSON.parse(readFileSync(path.join(process.cwd(), 'data', 'obra-demo.json'), 'utf8')),
      proponer: proponerRespuestas,
    },
  )
  return Response.json(r.cuerpo, { status: r.estado, headers: encabezadosCors(origen) })
}
