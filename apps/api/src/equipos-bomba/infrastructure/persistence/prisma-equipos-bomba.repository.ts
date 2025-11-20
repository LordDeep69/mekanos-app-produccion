import { PrismaService } from '@mekanos/database';
import { Injectable, NotFoundException } from '@nestjs/common';
import { equipos_bomba } from '@prisma/client';
import {
    ActualizarEquipoBombaData,
    CrearEquipoBombaData,
    EquipoBombaEntity,
    EquiposBombaFilters,
    IEquiposBombaRepository,
} from '../../domain/equipos-bomba.repository';

@Injectable()
export class PrismaEquiposBombaRepository implements IEquiposBombaRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toEntity(prismaEntity: equipos_bomba): EquipoBombaEntity {
    return {
      ...prismaEntity,
      caudal_maximo_m3h: prismaEntity.caudal_maximo_m3h?.toNumber(),
      altura_manometrica_maxima_m: prismaEntity.altura_manometrica_maxima_m?.toNumber(),
      altura_presion_trabajo_m: prismaEntity.altura_presion_trabajo_m?.toNumber(),
      potencia_hidraulica_kw: prismaEntity.potencia_hidraulica_kw?.toNumber(),
      eficiencia_porcentaje: prismaEntity.eficiencia_porcentaje?.toNumber(),
      presion_encendido_psi: prismaEntity.presion_encendido_psi?.toNumber(),
      presion_apagado_psi: prismaEntity.presion_apagado_psi?.toNumber(),
      amperaje_contactor: prismaEntity.amperaje_contactor?.toNumber(),
      capacidad_tanques_litros: prismaEntity.capacidad_tanques_litros?.toNumber(),
      presion_tanques_psi: prismaEntity.presion_tanques_psi?.toNumber(),
      rango_manometro_min_psi: prismaEntity.rango_manometro_min_psi?.toNumber(),
      rango_manometro_max_psi: prismaEntity.rango_manometro_max_psi?.toNumber(),
      modelo_bomba: prismaEntity.modelo_bomba,
      numero_serie_bomba: prismaEntity.numero_serie_bomba,
      observaciones: prismaEntity.observaciones,
      fecha_creacion: prismaEntity.fecha_creacion ?? new Date(),
    };
  }

  async crear(data: CrearEquipoBombaData): Promise<equipos_bomba> {
    const equipoBase = await this.prisma.equipos.findUnique({
      where: { id_equipo: data.id_equipo },
    });

    if (!equipoBase) {
      throw new NotFoundException(`Equipo base ${data.id_equipo} no encontrado`);
    }

    // Construir objeto de datos con validaciones
    const createData: any = {
      id_equipo: data.id_equipo,
      marca_bomba: data.marca_bomba,
      tipo_bomba: data.tipo_bomba as any,
      creado_por: data.creado_por || 1,
    };

    // Campos opcionales
    if (data.modelo_bomba) createData.modelo_bomba = data.modelo_bomba;
    if (data.numero_serie_bomba) createData.numero_serie_bomba = data.numero_serie_bomba;
    if (data.aplicacion_bomba) createData.aplicacion_bomba = data.aplicacion_bomba;
    if (data.diametro_aspiracion) createData.diametro_aspiracion = data.diametro_aspiracion;
    if (data.diametro_descarga) createData.diametro_descarga = data.diametro_descarga;
    if (data.caudal_maximo_m3h) createData.caudal_maximo_m3h = data.caudal_maximo_m3h;
    if (data.altura_manometrica_maxima_m) createData.altura_manometrica_maxima_m = data.altura_manometrica_maxima_m;
    if (data.altura_presion_trabajo_m) createData.altura_presion_trabajo_m = data.altura_presion_trabajo_m;
    if (data.potencia_hidraulica_kw) createData.potencia_hidraulica_kw = data.potencia_hidraulica_kw;
    if (data.eficiencia_porcentaje) createData.eficiencia_porcentaje = data.eficiencia_porcentaje;
    if (data.numero_total_bombas_sistema) createData.numero_total_bombas_sistema = data.numero_total_bombas_sistema;
    if (data.numero_bomba_en_sistema) createData.numero_bomba_en_sistema = data.numero_bomba_en_sistema;
    if (data.tiene_panel_control !== undefined) createData.tiene_panel_control = data.tiene_panel_control;
    if (data.marca_panel_control) createData.marca_panel_control = data.marca_panel_control;
    if (data.modelo_panel_control) createData.modelo_panel_control = data.modelo_panel_control;
    if (data.tiene_presostato !== undefined) createData.tiene_presostato = data.tiene_presostato;
    if (data.marca_presostato) createData.marca_presostato = data.marca_presostato;
    if (data.modelo_presostato) createData.modelo_presostato = data.modelo_presostato;
    if (data.presion_encendido_psi) createData.presion_encendido_psi = data.presion_encendido_psi;
    if (data.presion_apagado_psi) createData.presion_apagado_psi = data.presion_apagado_psi;
    if (data.tiene_contactor_externo !== undefined) createData.tiene_contactor_externo = data.tiene_contactor_externo;
    if (data.marca_contactor) createData.marca_contactor = data.marca_contactor;
    if (data.amperaje_contactor) createData.amperaje_contactor = data.amperaje_contactor;
    if (data.tiene_arrancador_suave !== undefined) createData.tiene_arrancador_suave = data.tiene_arrancador_suave;
    if (data.tiene_variador_frecuencia !== undefined) createData.tiene_variador_frecuencia = data.tiene_variador_frecuencia;
    if (data.marca_variador) createData.marca_variador = data.marca_variador;
    if (data.modelo_variador) createData.modelo_variador = data.modelo_variador;
    if (data.tiene_tanques_hidroneumaticos !== undefined) createData.tiene_tanques_hidroneumaticos = data.tiene_tanques_hidroneumaticos;
    if (data.cantidad_tanques) createData.cantidad_tanques = data.cantidad_tanques;
    if (data.capacidad_tanques_litros) createData.capacidad_tanques_litros = data.capacidad_tanques_litros;
    if (data.presion_tanques_psi) createData.presion_tanques_psi = data.presion_tanques_psi;
    if (data.tiene_manometro !== undefined) createData.tiene_manometro = data.tiene_manometro;
    if (data.rango_manometro_min_psi) createData.rango_manometro_min_psi = data.rango_manometro_min_psi;
    if (data.rango_manometro_max_psi) createData.rango_manometro_max_psi = data.rango_manometro_max_psi;
    if (data.tiene_proteccion_nivel !== undefined) createData.tiene_proteccion_nivel = data.tiene_proteccion_nivel;
    if (data.tipo_proteccion_nivel) createData.tipo_proteccion_nivel = data.tipo_proteccion_nivel;
    if (data.tiene_valvula_purga !== undefined) createData.tiene_valvula_purga = data.tiene_valvula_purga;
    if (data.tiene_valvula_cebado !== undefined) createData.tiene_valvula_cebado = data.tiene_valvula_cebado;
    if (data.tiene_valvula_cheque !== undefined) createData.tiene_valvula_cheque = data.tiene_valvula_cheque;
    if (data.tiene_valvula_pie !== undefined) createData.tiene_valvula_pie = data.tiene_valvula_pie;
    if (data.referencia_sello_mecanico) createData.referencia_sello_mecanico = data.referencia_sello_mecanico;
    if (data.a_o_fabricacion) createData.a_o_fabricacion = data.a_o_fabricacion;
    if (data.observaciones) createData.observaciones = data.observaciones;
    if (data.metadata) createData.metadata = data.metadata;

    return this.prisma.equipos_bomba.create({ data: createData });
  }

  async actualizar(id_equipo: number, data: ActualizarEquipoBombaData): Promise<equipos_bomba> {
    const existing = await this.prisma.equipos_bomba.findUnique({
      where: { id_equipo },
    });

    if (!existing) {
      throw new NotFoundException(`Equipo bomba ${id_equipo} no encontrado`);
    }

    return this.prisma.equipos_bomba.update({
      where: { id_equipo },
      data: { ...data, fecha_modificacion: new Date() } as any,
    });
  }

  async obtenerPorId(id_equipo: number): Promise<EquipoBombaEntity | null> {
    const result = await this.prisma.equipos_bomba.findUnique({
      where: { id_equipo },
    });

    return result ? this.toEntity(result) : null;
  }

  async obtenerTodos(filters: EquiposBombaFilters): Promise<{ data: EquipoBombaEntity[]; total: number }> {
    const { page = 1, limit = 50, ...whereFilters } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (whereFilters.marca_bomba) {
      where.marca_bomba = { contains: whereFilters.marca_bomba, mode: 'insensitive' };
    }

    if (whereFilters.tipo_bomba) {
      where.tipo_bomba = whereFilters.tipo_bomba;
    }

    if (whereFilters.aplicacion_bomba) {
      where.aplicacion_bomba = whereFilters.aplicacion_bomba;
    }

    if (whereFilters.tiene_variador_frecuencia !== undefined) {
      where.tiene_variador_frecuencia = whereFilters.tiene_variador_frecuencia;
    }

    const [data, total] = await Promise.all([
      this.prisma.equipos_bomba.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fecha_creacion: 'desc' },
      }),
      this.prisma.equipos_bomba.count({ where }),
    ]);

    return {
      data: data.map((item) => this.toEntity(item)),
      total,
    };
  }

  async eliminar(id_equipo: number): Promise<void> {
    const existing = await this.prisma.equipos_bomba.findUnique({
      where: { id_equipo },
    });

    if (!existing) {
      throw new NotFoundException(`Equipo bomba ${id_equipo} no encontrado`);
    }

    await this.prisma.equipos_bomba.delete({
      where: { id_equipo },
    });
  }
}
