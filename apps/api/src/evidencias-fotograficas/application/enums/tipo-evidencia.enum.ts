/**
 * ENUM tipo_evidencia_enum - 8 valores
 * FASE 3 - Tabla 11 - evidencias_fotograficas
 * 
 * Clasificación fotos orden servicio:
 * - ANTES: Estado inicial antes servicio
 * - DURANTE: Proceso ejecución trabajo
 * - DESPUES: Estado final post servicio
 * - DAÑO: Evidencia daño/avería detectada
 * - TRABAJO_REALIZADO: Trabajo específico realizado
 * - ENTORNO: Contexto/ubicación equipo
 * - MEDICION: Evidencia mediciones/parámetros
 * - COMPONENTE: Componentes retirados/instalados
 */

export enum TipoEvidenciaEnum {
  ANTES = 'ANTES',
  DURANTE = 'DURANTE',
  DESPUES = 'DESPUES',
  DAÑO = 'DAÑO',
  TRABAJO_REALIZADO = 'TRABAJO_REALIZADO',
  ENTORNO = 'ENTORNO',
  MEDICION = 'MEDICION',
  COMPONENTE = 'COMPONENTE',
}
