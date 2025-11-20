import { PrismaService } from '@mekanos/database';
import { Injectable, NotFoundException } from '@nestjs/common';
import { equipos_motor } from '@prisma/client';
import {
    ActualizarEquipoMotorData,
    CrearEquipoMotorData,
    EquipoMotorEntity,
    EquiposMotorFilters,
    IEquiposMotorRepository,
} from '../../domain/equipos-motor.repository';

@Injectable()
export class PrismaEquiposMotorRepository implements IEquiposMotorRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toEntity(prismaEntity: equipos_motor): EquipoMotorEntity {
    return {
      ...prismaEntity,
      // Convertir Decimal a number
      potencia_hp: prismaEntity.potencia_hp?.toNumber(),
      potencia_kw: prismaEntity.potencia_kw?.toNumber(),
      amperaje_arranque: prismaEntity.amperaje_arranque?.toNumber(),
      radiador_alto_cm: prismaEntity.radiador_alto_cm?.toNumber(),
      radiador_ancho_cm: prismaEntity.radiador_ancho_cm?.toNumber(),
      radiador_espesor_cm: prismaEntity.radiador_espesor_cm?.toNumber(),
      amperaje_cargador: prismaEntity.amperaje_cargador?.toNumber(),
      capacidad_aceite_litros: prismaEntity.capacidad_aceite_litros?.toNumber(),
      capacidad_refrigerante_litros: prismaEntity.capacidad_refrigerante_litros?.toNumber(),
      amperaje_nominal: prismaEntity.amperaje_nominal?.toNumber(),
      factor_potencia: prismaEntity.factor_potencia?.toNumber(),
      // Campos opcionales: mantener null de Prisma
      modelo_motor: prismaEntity.modelo_motor,
      numero_serie_motor: prismaEntity.numero_serie_motor,
      tipo_combustible: prismaEntity.tipo_combustible,
      observaciones: prismaEntity.observaciones,
      // Asegurar fecha_creacion con default
      fecha_creacion: prismaEntity.fecha_creacion ?? new Date(),
    };
  }

  async crear(data: CrearEquipoMotorData): Promise<equipos_motor> {
    // Verificar que el equipo base existe
    const equipoBase = await this.prisma.equipos.findUnique({
      where: { id_equipo: data.id_equipo },
    });

    if (!equipoBase) {
      throw new NotFoundException(`Equipo base ${data.id_equipo} no encontrado`);
    }

    console.log('=== CREAR EQUIPO_MOTOR ===');
    console.log('Data recibida:', JSON.stringify(data, null, 2));
    
    try {
      // Datos base requeridos
      const createData: any = {
        id_equipo: data.id_equipo,
        tipo_motor: data.tipo_motor as any,
        marca_motor: data.marca_motor,
        creado_por: data.creado_por || 1,
      };

      // Agregar campos opcionales si existen
      if (data.modelo_motor) createData.modelo_motor = data.modelo_motor;
      if (data.numero_serie_motor) createData.numero_serie_motor = data.numero_serie_motor;
      if (data.potencia_kw) createData.potencia_kw = data.potencia_kw;
      if (data.potencia_hp) createData.potencia_hp = data.potencia_hp;
      
      // CHECK CONSTRAINT: Al menos una potencia
      if (!data.potencia_kw && !data.potencia_hp) {
        // Default a potencia_kw=1 si no se proporciona ninguna
        createData.potencia_kw = 1.0;
      }

      // CHECK CONSTRAINT: Si tipo_motor=COMBUSTION, tipo_combustible y capacidad_aceite_litros son requeridos
      if (data.tipo_motor === 'COMBUSTION') {
        createData.tipo_combustible = data.tipo_combustible || 'DIESEL';
        createData.capacidad_aceite_litros = data.capacidad_aceite_litros || 100.0;
      }

      // CHECK CONSTRAINT: Si tipo_motor=ELECTRICO, voltaje_operacion_vac y numero_fases son requeridos
      if (data.tipo_motor === 'ELECTRICO') {
        createData.voltaje_operacion_vac = data.voltaje_operacion_vac || '440V';
        createData.numero_fases = data.numero_fases || 'TRIFASICO';
      }

      // Agregar resto de campos opcionales
      if (data.a_o_fabricacion) createData.a_o_fabricacion = data.a_o_fabricacion;
      if (data.numero_cilindros) createData.numero_cilindros = data.numero_cilindros;
      if (data.cilindrada_cc) createData.cilindrada_cc = data.cilindrada_cc;
      if (data.velocidad_nominal_rpm) createData.velocidad_nominal_rpm = data.velocidad_nominal_rpm;
      if (data.tiene_turbocargador !== undefined) createData.tiene_turbocargador = data.tiene_turbocargador;
      if (data.tipo_arranque) createData.tipo_arranque = data.tipo_arranque;
      if (data.voltaje_arranque_vdc) createData.voltaje_arranque_vdc = data.voltaje_arranque_vdc;
      if (data.amperaje_arranque) createData.amperaje_arranque = data.amperaje_arranque;
      if (data.numero_baterias) createData.numero_baterias = data.numero_baterias;
      if (data.referencia_bateria) createData.referencia_bateria = data.referencia_bateria;
      if (data.capacidad_bateria_ah) createData.capacidad_bateria_ah = data.capacidad_bateria_ah;
      if (data.tiene_radiador !== undefined) createData.tiene_radiador = data.tiene_radiador;
      if (data.radiador_alto_cm) createData.radiador_alto_cm = data.radiador_alto_cm;
      if (data.radiador_ancho_cm) createData.radiador_ancho_cm = data.radiador_ancho_cm;
      if (data.radiador_espesor_cm) createData.radiador_espesor_cm = data.radiador_espesor_cm;
      if (data.tiene_cargador_bateria !== undefined) createData.tiene_cargador_bateria = data.tiene_cargador_bateria;
      if (data.marca_cargador) createData.marca_cargador = data.marca_cargador;
      if (data.modelo_cargador) createData.modelo_cargador = data.modelo_cargador;
      if (data.amperaje_cargador) createData.amperaje_cargador = data.amperaje_cargador;
      if (data.tipo_aceite) createData.tipo_aceite = data.tipo_aceite;
      if (data.tipo_refrigerante) createData.tipo_refrigerante = data.tipo_refrigerante;
      if (data.capacidad_refrigerante_litros) createData.capacidad_refrigerante_litros = data.capacidad_refrigerante_litros;
      if (data.frecuencia_hz) createData.frecuencia_hz = data.frecuencia_hz;
      if (data.clase_aislamiento) createData.clase_aislamiento = data.clase_aislamiento;
      if (data.grado_proteccion_ip) createData.grado_proteccion_ip = data.grado_proteccion_ip;
      if (data.amperaje_nominal) createData.amperaje_nominal = data.amperaje_nominal;
      if (data.factor_potencia) createData.factor_potencia = data.factor_potencia;
      if (data.voltaje_operacion_vac) createData.voltaje_operacion_vac = data.voltaje_operacion_vac;
      if (data.numero_fases) createData.numero_fases = data.numero_fases;
      if (data.observaciones) createData.observaciones = data.observaciones;

      // LIMPIEZA FINAL PARA CONSTRAINTS DE EXCLUSIÓN Y COHERENCIA
      // Constraint: chk_exclusion_campos y lógica de negocio
      if (data.tipo_motor === 'COMBUSTION') {
        // Si es combustión, NO puede tener campos eléctricos
        delete createData.voltaje_operacion_vac;
        delete createData.numero_fases;
        delete createData.frecuencia_hz;
        delete createData.clase_aislamiento;
        delete createData.grado_proteccion_ip;
        delete createData.amperaje_nominal;
        delete createData.factor_potencia;
      } else if (data.tipo_motor === 'ELECTRICO') {
        // Si es eléctrico, NO puede tener campos de combustión
        delete createData.tipo_combustible;
        delete createData.capacidad_aceite_litros;
        delete createData.tipo_aceite;
        delete createData.capacidad_refrigerante_litros;
        delete createData.tipo_refrigerante;
        delete createData.numero_cilindros;
        delete createData.cilindrada_cc;
        delete createData.tiene_turbocargador;
        // Sistema de arranque (típico de combustión)
        delete createData.tipo_arranque;
        delete createData.voltaje_arranque_vdc;
        delete createData.amperaje_arranque;
        delete createData.numero_baterias;
        delete createData.referencia_bateria;
        delete createData.capacidad_bateria_ah;
        // Sistema de enfriamiento (radiador)
        delete createData.tiene_radiador;
        delete createData.radiador_alto_cm;
        delete createData.radiador_ancho_cm;
        delete createData.radiador_espesor_cm;
        // Cargador de baterías
        delete createData.tiene_cargador_bateria;
        delete createData.marca_cargador;
        delete createData.modelo_cargador;
        delete createData.amperaje_cargador;
      }

      const result = await this.prisma.equipos_motor.create({
        data: createData,
      });

      console.log('SUCCESS - Registro creado:', result.id_equipo);
      return result;
    } catch (error) {
      console.error('❌ ERROR en Prisma create:', error);
      console.error('Tipo de error:', (error as any)?.constructor?.name);
      console.error('Mensaje:', (error as any).message);
      if ((error as any).meta) {
        console.error('Meta:', JSON.stringify((error as any).meta, null, 2));
      }
      throw error;
    }
  }

  async actualizar(id_equipo: number, data: ActualizarEquipoMotorData): Promise<equipos_motor> {
    // Verificar que existe
    const existing = await this.prisma.equipos_motor.findUnique({
      where: { id_equipo },
    });

    if (!existing) {
      throw new NotFoundException(`Equipo motor ${id_equipo} no encontrado`);
    }

    const result = await this.prisma.equipos_motor.update({
      where: { id_equipo },
      data: {
        ...data,
        fecha_modificacion: new Date(),
      },
    });

    return result;
  }

  async obtenerPorId(id_equipo: number): Promise<EquipoMotorEntity | null> {
    const result = await this.prisma.equipos_motor.findUnique({
      where: { id_equipo },
    });

    return result ? this.toEntity(result) : null;
  }

  async obtenerTodos(filters: EquiposMotorFilters): Promise<{ data: EquipoMotorEntity[]; total: number }> {
    const { page = 1, limit = 50, ...whereFilters } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (whereFilters.tipo_motor) {
      where.tipo_motor = whereFilters.tipo_motor;
    }

    if (whereFilters.marca_motor) {
      where.marca_motor = { contains: whereFilters.marca_motor, mode: 'insensitive' };
    }

    if (whereFilters.tipo_combustible) {
      where.tipo_combustible = whereFilters.tipo_combustible;
    }

    if (whereFilters.tiene_turbocargador !== undefined) {
      where.tiene_turbocargador = whereFilters.tiene_turbocargador;
    }

    const [data, total] = await Promise.all([
      this.prisma.equipos_motor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fecha_creacion: 'desc' },
      }),
      this.prisma.equipos_motor.count({ where }),
    ]);

    return {
      data: data.map((item) => this.toEntity(item)),
      total,
    };
  }

  async eliminar(id_equipo: number): Promise<void> {
    // Verificar que existe
    const existing = await this.prisma.equipos_motor.findUnique({
      where: { id_equipo },
    });

    if (!existing) {
      throw new NotFoundException(`Equipo motor ${id_equipo} no encontrado`);
    }

    // Delete en cascada desde equipos_base manejará esto, o delete directo
    await this.prisma.equipos_motor.delete({
      where: { id_equipo },
    });
  }
}
