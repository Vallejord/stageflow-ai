// Dirección del servidor de StageFlow. Para probar contra un servidor local: WXT_STAGEFLOW_SERVIDOR en extension/.env.local.
// El valor por defecto se cambia a la dirección publicada en la T5 (parte C).
export const SERVIDOR = import.meta.env.WXT_STAGEFLOW_SERVIDOR ?? 'http://localhost:3000'
