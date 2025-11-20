import { PrismaService } from '@mekanos/database';
import { Injectable, NotFoundException } from '@nestjs/common';
import { equipos_generador } from '@prisma/client';
import {
    ActualizarEquipoGeneradorData,
    CrearEquipoGeneradorData,
    EquipoGeneradorEntity,
    EquiposGeneradorFilters,
    IEquiposGeneradorRepository,
} from '../../domain/equipos-generador.repository';

@Injectable()
export class PrismaEquiposGeneradorRepository implements IEquiposGeneradorRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toEntity(prismaEntity: equipos_generador): EquipoGeneradorEntity {
    return {
      ...prismaEntity,
      potencia_kw: prismaEntity.potencia_kw?.toNumber(),
      potencia_kva: prismaEntity.potencia_kva?.toNumber(),
      factor_potencia: prismaEntity.factor_potencia?.toNumber(),
      amperaje_nominal_salida: prismaEntity.amperaje_nominal_salida?.toNumber(),
      capacidad_tanque_principal_litros: prismaEntity.capacidad_tanque_principal_litros?.toNumber(),
      capacidad_tanque_auxiliar_litros: prismaEntity.capacidad_tanque_auxiliar_litros?.toNumber(),
      modelo_generador: prismaEntity.modelo_generador,
      numero_serie_generador: prismaEntity.numero_serie_generador,
      observaciones: prismaEntity.observaciones,
      fecha_creacion: prismaEntity.fecha_creacion ?? new Date(),
    };
  }

  async crear(data: CrearEquipoGeneradorData): Promise<equipos_generador> {
    const equipoBase = await this.prisma.equipos.findUnique({
      where: { id_equipo: data.id_equipo },
    });

    if (!equipoBase) {
      throw new NotFoundException(`Equipo base ${data.id_equipo} no encontrado`);
    }

    // Construir objeto de datos con validaciones y defaults
    const createData: any = {
      id_equipo: data.id_equipo,
      marca_generador: data.marca_generador,
      voltaje_salida: data.voltaje_salida || '440V', // Default seguro
      creado_por: data.creado_por || 1,
    };

    // Campos opcionales
    if (data.modelo_generador) createData.modelo_generador = data.modelo_generador;
    if (data.numero_serie_generador) createData.numero_serie_generador = data.numero_serie_generador;
    if (data.marca_alternador) createData.marca_alternador = data.marca_alternador;
    if (data.modelo_alternador) createData.modelo_alternador = data.modelo_alternador;
    if (data.numero_serie_alternador) createData.numero_serie_alternador = data.numero_serie_alternador;
    if (data.potencia_kw) createData.potencia_kw = data.potencia_kw;
    if (data.potencia_kva) createData.potencia_kva = data.potencia_kva;
    if (data.factor_potencia) createData.factor_potencia = data.factor_potencia;
    if (data.numero_fases) createData.numero_fases = data.numero_fases;
    if (data.frecuencia_hz) createData.frecuencia_hz = data.frecuencia_hz;
    if (data.amperaje_nominal_salida) createData.amperaje_nominal_salida = data.amperaje_nominal_salida;
    if (data.configuracion_salida) createData.configuracion_salida = data.configuracion_salida;
    if (data.tiene_avr !== undefined) createData.tiene_avr = data.tiene_avr;
    if (data.marca_avr) createData.marca_avr = data.marca_avr;
    if (data.modelo_avr) createData.modelo_avr = data.modelo_avr;
    if (data.referencia_avr) createData.referencia_avr = data.referencia_avr;
    if (data.tiene_modulo_control !== undefined) createData.tiene_modulo_control = data.tiene_modulo_control;
    if (data.marca_modulo_control) createData.marca_modulo_control = data.marca_modulo_control;
    if (data.modelo_modulo_control) createData.modelo_modulo_control = data.modelo_modulo_control;
    if (data.tiene_arranque_automatico !== undefined) createData.tiene_arranque_automatico = data.tiene_arranque_automatico;
    if (data.capacidad_tanque_principal_litros) createData.capacidad_tanque_principal_litros = data.capacidad_tanque_principal_litros;
    if (data.tiene_tanque_auxiliar !== undefined) createData.tiene_tanque_auxiliar = data.tiene_tanque_auxiliar;
    if (data.capacidad_tanque_auxiliar_litros) createData.capacidad_tanque_auxiliar_litros = data.capacidad_tanque_auxiliar_litros;
    if (data.clase_aislamiento) createData.clase_aislamiento = data.clase_aislamiento;
    if (data.grado_proteccion_ip) createData.grado_proteccion_ip = data.grado_proteccion_ip;
    // Mapeo de año_fabricacion (DTO) a a_o_fabricacion (Prisma)
    if (data.año_fabricacion) createData.a_o_fabricacion = data.año_fabricacion;
    if (data.observaciones) createData.observaciones = data.observaciones;
    if (data.metadata) createData.metadata = data.metadata;

    return this.prisma.equipos_generador.create({ data: createData });
  }

  async actualizar(id_equipo: number, data: ActualizarEquipoGeneradorData): Promise<equipos_generador> {
    const existing = await this.prisma.equipos_generador.findUnique({
      where: { id_equipo },
    });

    if (!existing) {
      throw new NotFoundException(`Equipo generador ${id_equipo} no encontrado`);
    }

    return this.prisma.equipos_generador.update({
      where: { id_equipo },
      data: { ...data, fecha_modificacion: new Date() },
    });
  }

  async obtenerPorId(id_equipo: number): Promise<EquipoGeneradorEntity | null> {
    const result = await this.prisma.equipos_generador.findUnique({
      where: { id_equipo },
    });

    return result ? this.toEntity(result) : null;
  }

  async obtenerTodos(filters: EquiposGeneradorFilters): Promise<{ data: EquipoGeneradorEntity[]; total: number }> {
    const { page = 1, limit = 50, ...whereFilters } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (whereFilters.marca_generador) {
      where.marca_generador = { contains: whereFilters.marca_generador, mode: 'insensitive' };
    }

    if (whereFilters.tiene_avr !== undefined) {
      where.tiene_avr = whereFilters.tiene_avr;
    }

    if (whereFilters.tiene_modulo_control !== undefined) {
      where.tiene_modulo_control = whereFilters.tiene_modulo_control;
    }

    if (whereFilters.tiene_arranque_automatico !== undefined) {
      where.tiene_arranque_automatico = whereFilters.tiene_arranque_automatico;
    }

    const [data, total] = await Promise.all([
      this.prisma.equipos_generador.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fecha_creacion: 'desc' },
      }),
      this.prisma.equipos_generador.count({ where }),
    ]);

    return {
      data: data.map((item) => this.toEntity(item)),
      total,
    };
  }

  async eliminar(id_equipo: number): Promise<void> {
    const existing = await this.prisma.equipos_generador.findUnique({
      where: { id_equipo },
    });

    if (!existing) {
      throw new NotFoundException(`Equipo generador ${id_equipo} no encontrado`);
    }

    await this.prisma.equipos_generador.delete({
      where: { id_equipo },
    });
  }
}
