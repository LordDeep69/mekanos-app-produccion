import { Injectable } from '@nestjs/common';
import { componentes_usados as ComponenteUsadoPrisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { ResponseComponenteUsadoDto } from '../../dto/response-componente-usado.dto';

/**
 * Mapper para componente usado
 * Tabla 12/14 - FASE 3
 * Convierte entidad Prisma a DTO de respuesta
 * Maneja conversiones de Decimal a number
 */
@Injectable()
export class ComponenteUsadoMapper {
  /**
   * Convierte entidad Prisma a ResponseDto
   * @param entity Entidad de Prisma con relaciones opcionales
   */
  toDto(entity: ComponenteUsadoPrisma & {
    ordenes_servicio?: { id_orden_servicio: number; numero_orden?: string | null; fecha_programada?: Date | null } | null;
    catalogo_componentes?: { id_componente: number; descripcion_corta?: string | null; referencia_fabricante?: string | null } | null;
    tipos_componente?: { id_tipo_componente: number; nombre_componente?: string | null } | null;
    actividades_ejecutadas?: { id_actividad_ejecutada: number; descripcion_manual?: string | null } | null;
    empleados?: { id_empleado: number } | null;
  }): ResponseComponenteUsadoDto {
    const dto = new ResponseComponenteUsadoDto();

    // Campos principales
    dto.idComponenteUsado = entity.id_componente_usado;
    dto.idOrdenServicio = entity.id_orden_servicio;
    dto.idComponente = entity.id_componente;
    dto.idTipoComponente = entity.id_tipo_componente;
    dto.idActividadEjecutada = entity.id_actividad_ejecutada;
    dto.descripcion = entity.descripcion;
    dto.referenciaManual = entity.referencia_manual;
    dto.marcaManual = entity.marca_manual;

    // Conversiones Decimal → number
    dto.cantidad = entity.cantidad instanceof Decimal 
      ? entity.cantidad.toNumber() 
      : Number(entity.cantidad);
    dto.unidad = entity.unidad;
    dto.costoUnitario = entity.costo_unitario instanceof Decimal 
      ? entity.costo_unitario.toNumber() 
      : entity.costo_unitario !== null ? Number(entity.costo_unitario) : null;
    dto.costoTotal = entity.costo_total instanceof Decimal 
      ? entity.costo_total.toNumber() 
      : entity.costo_total !== null ? Number(entity.costo_total) : null;

    // Estados y flags
    dto.estadoComponenteRetirado = entity.estado_componente_retirado;
    dto.razonUso = entity.razon_uso;
    dto.componenteGuardado = entity.componente_guardado;
    dto.origenComponente = entity.origen_componente;
    dto.observaciones = entity.observaciones;

    // Fechas y auditoría
    dto.fechaUso = entity.fecha_uso;
    dto.usadoPor = entity.usado_por;
    dto.fechaRegistro = entity.fecha_registro;
    dto.registradoPor = entity.registrado_por;
    dto.fechaModificacion = entity.fecha_modificacion;
    dto.modificadoPor = entity.modificado_por;

    // Relaciones expandidas
    if (entity.ordenes_servicio) {
      dto.ordenServicio = {
        idOrdenServicio: entity.ordenes_servicio.id_orden_servicio,
        numeroOrden: entity.ordenes_servicio.numero_orden,
        fechaProgramada: entity.ordenes_servicio.fecha_programada,
      };
    }

    if (entity.catalogo_componentes) {
      dto.catalogoComponente = {
        idComponente: entity.catalogo_componentes.id_componente,
        nombre: entity.catalogo_componentes.descripcion_corta,
        referencia: entity.catalogo_componentes.referencia_fabricante,
      };
    }

    if (entity.tipos_componente) {
      dto.tipoComponente = {
        idTipoComponente: entity.tipos_componente.id_tipo_componente,
        nombreTipo: entity.tipos_componente.nombre_componente,
      };
    }

    if (entity.actividades_ejecutadas) {
      dto.actividadEjecutada = {
        idActividadEjecutada: entity.actividades_ejecutadas.id_actividad_ejecutada,
        descripcion: entity.actividades_ejecutadas.descripcion_manual,
      };
    }

    if (entity.empleados) {
      dto.empleado = {
        idEmpleado: entity.empleados.id_empleado,
        nombre: null, // Se puede expandir con persona si es necesario
      };
    }

    return dto;
  }
}
