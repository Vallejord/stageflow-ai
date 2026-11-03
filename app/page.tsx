// Inicio de la app web: dice lo que StageFlow hace hoy y permite entrar con Google (T5).
import { Cuenta } from '@/components/cuenta'
import { MisObras } from '@/components/mis-obras'

const PASOS = [
  'Abrís el formulario de la convocatoria (Google Forms) en Chrome.',
  'Abrís el panel de StageFlow al costado del formulario.',
  'StageFlow lee las preguntas y propone una respuesta para cada una con los datos de tu obra, diciendo de dónde sale cada dato.',
  'Tocás «Completar esta página»: StageFlow escribe cada respuesta, la verifica y te marca lo que tenés que revisar.',
  'Los archivos y la aceptación de las bases los hacés vos: el panel te dice cuáles y dónde.',
  'Revisás todo y apretás «Enviar» vos. StageFlow nunca envía.',
]

export default function Inicio() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-8 px-4 py-12 md:py-20">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight">StageFlow</h1>
          <Cuenta />
        </div>
        <p className="text-lg leading-relaxed text-muted-foreground">
          Te ayuda a completar formularios de convocatorias con los datos de tu obra. Vos revisás y enviás.
        </p>
      </header>

      <MisObras />

      <section aria-labelledby="como-funciona" className="flex flex-col gap-4">
        <h2 id="como-funciona" className="text-xl font-semibold">
          Cómo funciona hoy
        </h2>
        <ol className="flex flex-col gap-3">
          {PASOS.map((paso, i) => (
            <li key={paso} className="flex gap-3 rounded-lg border bg-card p-4 leading-relaxed">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                {i + 1}
              </span>
              <span>{paso}</span>
            </li>
          ))}
        </ol>
      </section>

      <p className="rounded-lg border border-dashed p-4 text-sm leading-relaxed text-muted-foreground">
        StageFlow está en desarrollo: por ahora funciona solo con formularios de Google Forms y lo usa únicamente el equipo.
      </p>
    </main>
  )
}
