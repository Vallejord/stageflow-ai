// Configuración de desarrollo (extension/.env.local, fuera de git). Las cuentas reales llegan en el paso 3 del plan.
export const SERVIDOR = import.meta.env.WXT_STAGEFLOW_SERVIDOR ?? 'http://localhost:3000'
export const TOKEN = import.meta.env.WXT_STAGEFLOW_TOKEN ?? ''
