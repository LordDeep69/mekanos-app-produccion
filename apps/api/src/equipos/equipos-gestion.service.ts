/**
 * SERVICIO DE GESTIÓN DE EQUIPOS POLIMÓRFICO - MEKANOS S.A.S
 * 
 * Maneja la creación unificada de equipos:
 * 1. Crea registro en tabla padre (equipos)
 * 2. Crea registro en tabla hija según discriminador (equipos_generador, equipos_bomba)
 * 3. Todo en una transacción atómica
 */

import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { aplicacion_bomba_enum, criticidad_enum, estado_equipo_enum, tipo_arranque_enum, tipo_bomba_enum, tipo_combustible_enum, tipo_motor_enum } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  CreateEquipoCompletoDto,
  CreateEquipoCompletoResponse,
  TipoEquipoDiscriminator,
} from './dto/create-equipo-completo.dto';

@Injectable()
export class EquiposGestionService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * Crear equipo completo con tabla padre + tabla hija en transacción
   */
  async crearEquipoCompleto(
    dto: CreateEquipoCompletoDto,
    userId: number
  ): Promise<CreateEquipoCompletoResponse> {
    // 1. Validar que el código no exista
    const existeCodigo = await this.prisma.equipos.findFirst({
      where: { codigo_equipo: dto.datosEquipo.codigo_equipo },
    });

    if (existeCodigo) {
      throw new ConflictException(
        `Ya existe un equipo con el código ${dto.datosEquipo.codigo_equipo}`
      );
    }

    // 2. Validar que el cliente exista
    const cliente = await this.prisma.clientes.findUnique({
      where: { id_cliente: dto.datosEquipo.id_cliente },
      select: { id_cliente: true, id_persona: true },
    });

    if (!cliente) {
      throw new NotFoundException(
        `No se encontró el cliente con ID ${dto.datosEquipo.id_cliente}`
      );
    }

    // Obtener nombre del cliente desde persona
    const personaCliente = await this.prisma.personas.findUnique({
      where: { id_persona: cliente.id_persona },
      select: {
        primer_nombre: true,
        primer_apellido: true,
        razon_social: true,
        tipo_persona: true
      },
    });

    const nombreCliente = personaCliente?.tipo_persona === 'JURIDICA'
      ? personaCliente?.razon_social || 'Sin nombre'
      : `${personaCliente?.primer_nombre || ''} ${personaCliente?.primer_apellido || ''}`.trim() || 'Sin nombre';

    // 3. Validar sede si se proporciona
    let sedeInfo: { id_sede: number; nombre: string } | null = null;
    if (dto.datosEquipo.id_sede) {
      const sede = await this.prisma.sedes_cliente.findUnique({
        where: { id_sede: dto.datosEquipo.id_sede },
        select: { id_sede: true, nombre_sede: true, id_cliente: true },
      });

      if (!sede) {
        throw new NotFoundException(
          `No se encontró la sede con ID ${dto.datosEquipo.id_sede}`
        );
      }

      if (sede.id_cliente !== dto.datosEquipo.id_cliente) {
        throw new ConflictException(
          `La sede ${dto.datosEquipo.id_sede} no pertenece al cliente ${dto.datosEquipo.id_cliente}`
        );
      }

      sedeInfo = { id_sede: sede.id_sede, nombre: sede.nombre_sede };
    }

    // 4. TRANSACCIÓN: Crear equipo padre + motor + hijo específico
    const resultado = await this.prisma.$transaction(async (tx) => {
      // 4.1. Crear registro en tabla EQUIPOS (padre)
      const equipoCreado = await tx.equipos.create({
        data: {
          codigo_equipo: dto.datosEquipo.codigo_equipo,
          id_cliente: dto.datosEquipo.id_cliente,
          id_tipo_equipo: dto.datosEquipo.id_tipo_equipo,
          ubicacion_texto: dto.datosEquipo.ubicacion_texto,
          id_sede: dto.datosEquipo.id_sede || null,
          nombre_equipo: dto.datosEquipo.nombre_equipo || null,
          numero_serie_equipo: dto.datosEquipo.numero_serie_equipo || null,
          estado_equipo: (dto.datosEquipo.estado_equipo as unknown as estado_equipo_enum) || 'OPERATIVO',
          criticidad: (dto.datosEquipo.criticidad as unknown as criticidad_enum) || 'MEDIA',
          activo: true,
          creado_por: userId,
        },
      });

      // 4.2. Crear registro en tabla EQUIPOS_MOTOR (si se proporciona)
      if (dto.datosMotor) {
        await tx.equipos_motor.create({
          data: {
            id_equipo: equipoCreado.id_equipo,
            tipo_motor: dto.datosMotor.tipo_motor as tipo_motor_enum,
            marca_motor: dto.datosMotor.marca_motor,
            modelo_motor: dto.datosMotor.modelo_motor || null,
            numero_serie_motor: dto.datosMotor.numero_serie_motor || null,
            potencia_hp: dto.datosMotor.potencia_hp || null,
            potencia_kw: dto.datosMotor.potencia_kw || null,
            velocidad_nominal_rpm: dto.datosMotor.velocidad_nominal_rpm || null,
            tipo_combustible: dto.datosMotor.tipo_combustible as tipo_combustible_enum || null,
            numero_cilindros: dto.datosMotor.numero_cilindros || null,
            tipo_arranque: dto.datosMotor.tipo_arranque as tipo_arranque_enum || null,
            voltaje_arranque_vdc: dto.datosMotor.voltaje_arranque_vdc || null,
            capacidad_aceite_litros: dto.datosMotor.capacidad_aceite_litros || null,
            voltaje_operacion_vac: dto.datosMotor.voltaje_operacion_vac || null,
            frecuencia_hz: dto.datosMotor.frecuencia_hz || null,
            creado_por: userId,
          },
        });
      }

      let datosEspecificos: Record<string, any> = {};

      // 4.3. Crear registro en tabla hija según discriminador
      switch (dto.tipo) {
        case TipoEquipoDiscriminator.GENERADOR:
          if (!dto.datosGenerador) {
            throw new ConflictException('datosGenerador es requerido para tipo GENERADOR');
          }

          const generador = await tx.equipos_generador.create({
            data: {
              id_equipo: equipoCreado.id_equipo,
              marca_generador: dto.datosGenerador.marca_generador,
              modelo_generador: dto.datosGenerador.modelo_generador || null,
              numero_serie_generador: dto.datosGenerador.numero_serie_generador || null,
              marca_alternador: dto.datosGenerador.marca_alternador || null,
              modelo_alternador: dto.datosGenerador.modelo_alternador || null,
              numero_serie_alternador: dto.datosGenerador.numero_serie_alternador || null,
              potencia_kw: dto.datosGenerador.potencia_kw || null,
              potencia_kva: dto.datosGenerador.potencia_kva || null,
              factor_potencia: dto.datosGenerador.factor_potencia || null,
              voltaje_salida: dto.datosGenerador.voltaje_salida,
              numero_fases: dto.datosGenerador.numero_fases || null,
              frecuencia_hz: dto.datosGenerador.frecuencia_hz || null,
              capacidad_tanque_principal_litros: dto.datosGenerador.capacidad_tanque_principal_litros || null,
              capacidad_tanque_auxiliar_litros: (dto.datosGenerador as any).capacidad_tanque_auxiliar_litros || (dto.datosGenerador as any).capacidad_tanque_diario_litros || null,
              creado_por: userId,
            },
          });

          // Actualizar horas si se proporcionan
          if ((dto.datosGenerador as any).horometro_actual !== undefined) {
            await tx.equipos.update({
              where: { id_equipo: equipoCreado.id_equipo },
              data: { horas_actuales: (dto.datosGenerador as any).horometro_actual },
            });
          }

          datosEspecificos = {
            tabla: 'equipos_generador',
            ...generador,
          };
          break;

        case TipoEquipoDiscriminator.BOMBA:
          if (!dto.datosBomba) {
            throw new ConflictException('datosBomba es requerido para tipo BOMBA');
          }

          const bomba = await tx.equipos_bomba.create({
            data: {
              id_equipo: equipoCreado.id_equipo,
              marca_bomba: dto.datosBomba.marca_bomba,
              tipo_bomba: dto.datosBomba.tipo_bomba as unknown as tipo_bomba_enum,
              modelo_bomba: dto.datosBomba.modelo_bomba || null,
              numero_serie_bomba: dto.datosBomba.numero_serie_bomba || null,
              aplicacion_bomba: dto.datosBomba.aplicacion_bomba as unknown as aplicacion_bomba_enum || null,
              diametro_aspiracion: dto.datosBomba.diametro_aspiracion || null,
              diametro_descarga: dto.datosBomba.diametro_descarga || null,
              caudal_maximo_m3h: dto.datosBomba.caudal_maximo_m3h || null,
              altura_manometrica_maxima_m: dto.datosBomba.altura_manometrica_maxima_m || null,
              marca_panel_control: (dto.datosBomba as any).marca_panel_control || (dto.datosBomba as any).marca_tablero_control || null,
              modelo_panel_control: (dto.datosBomba as any).modelo_panel_control || (dto.datosBomba as any).modelo_tablero_control || null,
              creado_por: userId,
            },
          });

          datosEspecificos = {
            tabla: 'equipos_bomba',
            ...bomba,
          };
          break;

        case TipoEquipoDiscriminator.MOTOR:
          throw new ConflictException('Tipo MOTOR aún no implementado como equipo independiente');

        default:
          throw new ConflictException(`Tipo de equipo desconocido: ${dto.tipo}`);
      }

      return {
        equipo: equipoCreado,
        datosEspecificos,
      };
    });

    return {
      success: true,
      message: `Equipo tipo ${dto.tipo} creado exitosamente`,
      data: {
        id_equipo: resultado.equipo.id_equipo,
        codigo_equipo: resultado.equipo.codigo_equipo,
        tipo: dto.tipo,
        nombre_equipo: resultado.equipo.nombre_equipo,
        cliente: {
          id_cliente: cliente.id_cliente,
          nombre: nombreCliente,
        },
        sede: sedeInfo,
        estado_equipo: resultado.equipo.estado_equipo || 'OPERATIVO',
        fecha_creacion: resultado.equipo.fecha_creacion?.toISOString() || new Date().toISOString(),
        datos_especificos: resultado.datosEspecificos,
      },
    };
  }

  /**
   * Listar equipos con datos polimórficos
   */
  async listarEquiposCompletos(params: {
    id_cliente?: number;
    id_sede?: number;
    tipo?: TipoEquipoDiscriminator;
    estado_equipo?: string;
    page?: number;
    limit?: number;
  }) {
    const { id_cliente, id_sede, estado_equipo, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: any = { activo: true };
    if (id_cliente) where.id_cliente = id_cliente;
    if (id_sede) where.id_sede = id_sede;
    if (estado_equipo) where.estado_equipo = estado_equipo;

    const [equipos, total] = await Promise.all([
      this.prisma.equipos.findMany({
        where,
        skip,
        take: limit,
        include: {
          clientes: {
            include: {
              persona: true,
            },
          },
          sedes_cliente: {
            select: { id_sede: true, nombre_sede: true },
          },
          tipos_equipo: {
            select: { id_tipo_equipo: true, nombre_tipo: true, codigo_tipo: true },
          },
          equipos_generador: true,
          equipos_bomba: true,
          equipos_motor: true,
        },
        orderBy: { codigo_equipo: 'asc' },
      }),
      this.prisma.equipos.count({ where }),
    ]);

    const data = equipos.map((eq) => {
      const persona = eq.clientes?.persona;
      const nombreCliente = persona?.tipo_persona === 'JURIDICA'
        ? persona?.razon_social
        : `${persona?.primer_nombre || ''} ${persona?.primer_apellido || ''}`.trim();

      // Determinar tipo según tabla hija y asegurar id_tipo_equipo
      let tipoEquipo: string = eq.tipos_equipo?.codigo_tipo || 'DESCONOCIDO';
      let datosEspecificos: any = null;

      if (eq.equipos_generador) {
        tipoEquipo = 'GENERADOR';
        datosEspecificos = { ...eq.equipos_generador, motor: eq.equipos_motor };
      } else if (eq.equipos_bomba) {
        tipoEquipo = 'BOMBA';
        datosEspecificos = { ...eq.equipos_bomba, motor: eq.equipos_motor };
      }

      return {
        id_equipo: eq.id_equipo,
        codigo_equipo: eq.codigo_equipo,
        nombre_equipo: eq.nombre_equipo,
        tipo: tipoEquipo,
        id_tipo_equipo: eq.id_tipo_equipo, // ✅ Crucial para filtrado frontend
        tipos_equipo: eq.tipos_equipo,     // ✅ Crucial para metadatos frontend
        estado_equipo: eq.estado_equipo,
        criticidad: eq.criticidad,
        ubicacion_texto: eq.ubicacion_texto,
        cliente: {
          id_cliente: eq.id_cliente,
          nombre: nombreCliente || 'Sin nombre',
        },
        sede: eq.sedes_cliente
          ? { id_sede: eq.sedes_cliente.id_sede, nombre: eq.sedes_cliente.nombre_sede }
          : null,
        fecha_creacion: eq.fecha_creacion,
        datos_especificos: datosEspecificos,
      };
    });

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtener equipo por ID con datos polimórficos completos
   */
  async obtenerEquipoCompleto(id: number) {
    const equipo = await this.prisma.equipos.findUnique({
      where: { id_equipo: id },
      include: {
        clientes: {
          include: {
            persona: true,
          },
        },
        sedes_cliente: true,
        tipos_equipo: true,
        equipos_generador: true,
        equipos_bomba: true,
        equipos_motor: true,
        lecturas_horometro: {
          take: 5,
          orderBy: { fecha_lectura: 'desc' },
        },
        historial_estados_equipo: {
          take: 10,
          orderBy: { fecha_cambio: 'desc' },
        },
      },
    });

    if (!equipo) {
      throw new NotFoundException(`No se encontró el equipo con ID ${id}`);
    }

    const persona = equipo.clientes?.persona;
    const nombreCliente = persona?.tipo_persona === 'JURIDICA'
      ? persona?.razon_social
      : `${persona?.primer_nombre || ''} ${persona?.primer_apellido || ''}`.trim();

    let tipoEquipo = equipo.tipos_equipo?.codigo_tipo || 'DESCONOCIDO';
    let datosEspecificos: any = null;

    if (equipo.equipos_generador) {
      tipoEquipo = 'GENERADOR';
      datosEspecificos = { ...equipo.equipos_generador, motor: equipo.equipos_motor };
    } else if (equipo.equipos_bomba) {
      tipoEquipo = 'BOMBA';
      datosEspecificos = { ...equipo.equipos_bomba, motor: equipo.equipos_motor };
    }

    return {
      id_equipo: equipo.id_equipo,
      codigo_equipo: equipo.codigo_equipo,
      nombre_equipo: equipo.nombre_equipo,
      numero_serie_equipo: equipo.numero_serie_equipo,
      tipo: tipoEquipo,
      estado_equipo: equipo.estado_equipo,
      criticidad: equipo.criticidad,
      ubicacion_texto: equipo.ubicacion_texto,
      cliente: {
        id_cliente: equipo.id_cliente,
        nombre: nombreCliente || 'Sin nombre',
      },
      sede: equipo.sedes_cliente
        ? {
          id_sede: equipo.sedes_cliente.id_sede,
          nombre: equipo.sedes_cliente.nombre_sede,
        }
        : null,
      tipo_equipo: equipo.tipos_equipo,
      datos_especificos: datosEspecificos,
      lecturas_horometro: equipo.lecturas_horometro,
      historial_estados: equipo.historial_estados_equipo,
      fecha_creacion: equipo.fecha_creacion,
      fecha_modificacion: equipo.fecha_modificacion,
    };
  }
}
