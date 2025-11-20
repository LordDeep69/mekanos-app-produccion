import { BadRequestException } from '@nestjs/common';

/**
 * Workflow de Estados para Órdenes de Servicio
 * 
 * Sistema de máquina de estados finitos (FSM) que define transiciones permitidas
 * entre estados de órdenes de servicio.
 * 
 * ESTADOS DISPONIBLES (7 estados):
 * - PROGRAMADA: Orden creada, pendiente asignación
 * - ASIGNADA: Técnico asignado, pendiente ejecución
 * - EN_PROCESO: Técnico ejecutando en campo
 * - COMPLETADA: Trabajo finalizado, pendiente aprobación
 * - APROBADA: Supervisor aprobó (ESTADO FINAL)
 * - CANCELADA: Orden cancelada (ESTADO FINAL)
 * - EN_ESPERA_REPUESTO: Bloqueada esperando componentes
 * 
 * FLUJO TÍPICO:
 * PROGRAMADA → ASIGNADA → EN_PROCESO → COMPLETADA → APROBADA
 * 
 * FLUJOS ALTERNATIVOS:
 * - Cancelación: CUALQUIER_ESTADO → CANCELADA
 * - Bloqueo: ASIGNADA/EN_PROCESO → EN_ESPERA_REPUESTO → (continúa flujo normal)
 */

/**
 * Transiciones permitidas por estado
 * Mapa: Estado_Actual → [Estados_Permitidos]
 */
export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  // Estado inicial: solo puede programarse o cancelarse
  PROGRAMADA: [
    'ASIGNADA',      // Asignar técnico
    'CANCELADA',     // Cancelar antes de asignar
  ],

  // Orden asignada: puede iniciar, esperar repuesto, regresar a programada o cancelar
  ASIGNADA: [
    'EN_PROCESO',          // Técnico inicia trabajo
    'EN_ESPERA_REPUESTO',  // Bloquear por falta de repuestos
    'PROGRAMADA',          // Reasignar (técnico no disponible)
    'CANCELADA',           // Cancelar
  ],

  // Orden en ejecución: puede finalizar, esperar repuesto o cancelar
  EN_PROCESO: [
    'COMPLETADA',          // Finalizar trabajo
    'EN_ESPERA_REPUESTO',  // Bloquear por falta de repuestos
    'CANCELADA',           // Cancelar (emergencia)
  ],

  // Orden esperando repuestos: puede regresar a asignada o en proceso
  EN_ESPERA_REPUESTO: [
    'ASIGNADA',    // Repuesto llegó, pero técnico debe reasignarse
    'EN_PROCESO',  // Continuar trabajo (repuesto llegó, técnico disponible)
    'CANCELADA',   // Cancelar (repuesto no llegará)
  ],

  // Orden completada: solo puede aprobarse o rechazarse (volver a EN_PROCESO)
  COMPLETADA: [
    'APROBADA',    // Supervisor aprueba
    'EN_PROCESO',  // Rechazar: técnico debe corregir
    'CANCELADA',   // Cancelar (caso excepcional)
  ],

  // Estados finales: sin transiciones salida
  APROBADA: [],
  CANCELADA: [],
};

/**
 * Validar si una transición de estado es permitida
 * @param estadoActual Código del estado actual (ej: 'PROGRAMADA')
 * @param nuevoEstado Código del nuevo estado deseado (ej: 'ASIGNADA')
 * @throws BadRequestException si la transición no es permitida
 */
export function validarTransicion(
  estadoActual: string,
  nuevoEstado: string,
): void {
  // Validar que el estado actual existe en el mapa
  if (!ALLOWED_TRANSITIONS[estadoActual]) {
    throw new BadRequestException(
      `Estado actual inválido: ${estadoActual}. Estados válidos: ${Object.keys(ALLOWED_TRANSITIONS).join(', ')}`,
    );
  }

  const transicionesPermitidas = ALLOWED_TRANSITIONS[estadoActual];

  // Validar si el nuevo estado está en la lista de permitidos
  if (!transicionesPermitidas.includes(nuevoEstado)) {
    throw new BadRequestException(
      `Transición no permitida: ${estadoActual} → ${nuevoEstado}. ` +
      `Transiciones permitidas desde ${estadoActual}: [${transicionesPermitidas.join(', ')}]`,
    );
  }
}

/**
 * Validaciones adicionales por estado
 * Reglas de negocio que deben cumplirse antes de cambiar a un estado
 */
export const VALIDACIONES_POR_ESTADO: Record<string, {
  campos_requeridos: string[];
  descripcion: string;
}> = {
  PROGRAMADA: {
    campos_requeridos: ['fecha_programada'],
    descripcion: 'Requiere fecha programada para planificación',
  },
  ASIGNADA: {
    campos_requeridos: ['id_tecnico_asignado', 'fecha_programada'],
    descripcion: 'Requiere técnico asignado y fecha programada',
  },
  EN_PROCESO: {
    campos_requeridos: ['id_tecnico_asignado'],
    descripcion: 'Requiere técnico asignado (fecha_inicio_real se asigna automáticamente)',
  },
  COMPLETADA: {
    campos_requeridos: ['fecha_inicio_real', 'observaciones_cierre'],
    descripcion: 'Requiere fecha de inicio real y observaciones de cierre (fecha_fin_real se asigna automáticamente)',
  },
  APROBADA: {
    campos_requeridos: ['aprobada_por', 'fecha_fin_real'],
    descripcion: 'Requiere usuario aprobador y fecha de finalización',
  },
  CANCELADA: {
    campos_requeridos: ['observaciones_cierre'],
    descripcion: 'Requiere motivo de cancelación en observaciones_cierre',
  },
  EN_ESPERA_REPUESTO: {
    campos_requeridos: ['observaciones_cierre'],
    descripcion: 'Requiere especificar qué repuesto se está esperando',
  },
};

/**
 * Validar campos requeridos para un estado específico
 * @param nuevoEstado Código del nuevo estado
 * @param orden Datos de la orden (puede ser parcial)
 * @throws BadRequestException si faltan campos requeridos
 */
export function validarCamposRequeridos(
  nuevoEstado: string,
  orden: any,
): void {
  const validacion = VALIDACIONES_POR_ESTADO[nuevoEstado];
  
  if (!validacion) {
    return; // Estado sin validaciones especiales
  }

  const camposFaltantes: string[] = [];
  
  for (const campo of validacion.campos_requeridos) {
    if (!orden[campo]) {
      camposFaltantes.push(campo);
    }
  }

  if (camposFaltantes.length > 0) {
    throw new BadRequestException(
      `No se puede cambiar a estado ${nuevoEstado}. ` +
      `Campos faltantes: [${camposFaltantes.join(', ')}]. ` +
      `${validacion.descripcion}`,
    );
  }
}

/**
 * Obtener flujo completo de estados (para visualización UI)
 * @returns Array de pasos del flujo típico
 */
export function obtenerFlujoTipico(): { 
  paso: number; 
  codigo: string; 
  nombre: string; 
  descripcion: string;
}[] {
  return [
    {
      paso: 1,
      codigo: 'PROGRAMADA',
      nombre: 'Programada',
      descripcion: 'Orden creada y programada, pendiente de asignación de técnico',
    },
    {
      paso: 2,
      codigo: 'ASIGNADA',
      nombre: 'Asignada',
      descripcion: 'Técnico asignado, pendiente de ejecución en campo',
    },
    {
      paso: 3,
      codigo: 'EN_PROCESO',
      nombre: 'En Proceso',
      descripcion: 'Técnico ejecutando trabajo en campo (app móvil activa)',
    },
    {
      paso: 4,
      codigo: 'COMPLETADA',
      nombre: 'Completada',
      descripcion: 'Trabajo finalizado por técnico, pendiente de aprobación',
    },
    {
      paso: 5,
      codigo: 'APROBADA',
      nombre: 'Aprobada',
      descripcion: 'Supervisor/Admin aprobó el trabajo. Estado final.',
    },
  ];
}

/**
 * Verificar si un estado es final (sin transiciones salida)
 * @param codigo_estado Código del estado a verificar
 * @returns true si es estado final
 */
export function esEstadoFinal(codigo_estado: string): boolean {
  const transiciones = ALLOWED_TRANSITIONS[codigo_estado];
  return transiciones ? transiciones.length === 0 : false;
}

/**
 * Obtener estados finales
 * @returns Array de códigos de estados finales
 */
export function obtenerEstadosFinales(): string[] {
  return Object.keys(ALLOWED_TRANSITIONS).filter(estado => 
    ALLOWED_TRANSITIONS[estado].length === 0
  );
}

/**
 * Validar si una orden puede ser editada según su estado
 * @param codigo_estado Código del estado actual
 * @returns true si permite edición
 */
export function permiteEdicion(codigo_estado: string): boolean {
  // Estados finales NO permiten edición
  const estadosFinales = obtenerEstadosFinales();
  return !estadosFinales.includes(codigo_estado);
}

/**
 * Validar si una orden puede ser cancelada según su estado
 * @param codigo_estado Código del estado actual
 * @returns true si permite cancelación
 */
export function permiteCancelacion(codigo_estado: string): boolean {
  // Solo estados finales NO permiten cancelación
  return !esEstadoFinal(codigo_estado);
}
