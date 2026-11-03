import { createRoot } from 'react-dom/client'
import { App } from './App.tsx'
import { ConCuenta } from './ConCuenta.tsx'
import './estilo.css'

// key = uid: si cambia la cuenta, el panel arranca de cero (no se mezclan respuestas de cuentas distintas).
createRoot(document.getElementById('root')!).render(<ConCuenta>{(u) => <App key={u.uid} />}</ConCuenta>)
