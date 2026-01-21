/**
 * SERVICIO DE GESTIÓN DE EQUIPOS POLIMÓRFICO - MEKANOS S.A.S
 * 
 * Maneja la creación unificada de equipos:
 * 1. Crea registro en tabla padre (equipos)
 * 2. Crea registro en tabla hija según discriminador (equipos_generador, equipos_bomba)
 * 3. Todo en una transacción atómica
 */

import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  aplicacion_bomba_enum,
  clase_aislamiento_enum,
  criticidad_enum,
  estado_equipo_enum,
  numero_fases_enum,
  tipo_arranque_enum,
  tipo_bomba_enum,
  tipo_combustible_enum,
  tipo_motor_enum
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  CreateEquipoCompletoDto,
  CreateEquipoCompletoResponse,
  TipoEquipoDiscriminator,
  TipoMotorEnum,
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
      where: { codigo_equipo: dto.datosEquipo.codigo_equipo.trim().toUpperCase() },
    });

    if (existeCodigo) {
      throw new ConflictException(
        `Ya existe un equipo con el código ${dto.datosEquipo.codigo_equipo}`
      );
    }

    // 1.1. Validar que el número de serie no esté duplicado si se proporciona
    if (dto.datosEquipo.numero_serie_equipo) {
      const existeSerial = await this.prisma.equipos.findFirst({
        where: { numero_serie_equipo: dto.datosEquipo.numero_serie_equipo.trim() },
      });

      if (existeSerial) {
        throw new ConflictException(
          `Ya existe un equipo registrado con el número de serie ${dto.datosEquipo.numero_serie_equipo}. Por favor, verifíquelo.`
        );
      }
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

    // Priorizar Nombre sobre Razón Social si existe
    const nombreCompleto = `${personaCliente?.primer_nombre || ''} ${personaCliente?.primer_apellido || ''}`.trim();
    const nombreCliente = nombreCompleto || personaCliente?.razon_social || 'Sin nombre';

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
    try {
      const resultado = await this.prisma.$transaction(async (tx) => {
        // 4.1. Crear registro en tabla EQUIPOS (padre)
        const equipoCreado = await tx.equipos.create({
          data: {
            codigo_equipo: dto.datosEquipo.codigo_equipo.trim().toUpperCase(),
            id_cliente: dto.datosEquipo.id_cliente,
            id_tipo_equipo: dto.datosEquipo.id_tipo_equipo,
            ubicacion_texto: (dto.datosEquipo.ubicacion_texto || 'SIN UBICACIÓN ESPECIFICADA').trim(),
            id_sede: dto.datosEquipo.id_sede || null,
            nombre_equipo: (dto.datosEquipo.nombre_equipo || `EQUIPO-${dto.tipo}-${dto.datosEquipo.codigo_equipo}`).trim(),
            numero_serie_equipo: dto.datosEquipo.numero_serie_equipo?.trim() || null,
            estado_equipo: (dto.datosEquipo.estado_equipo as unknown as estado_equipo_enum) || 'OPERATIVO',
            criticidad: (dto.datosEquipo.criticidad as unknown as criticidad_enum) || 'MEDIA',
            criticidad_justificacion: dto.datosEquipo.criticidad_justificacion || null,
            fecha_instalacion: dto.datosEquipo.fecha_instalacion ? new Date(dto.datosEquipo.fecha_instalacion) : null,
            fecha_inicio_servicio_mekanos: dto.datosEquipo.fecha_inicio_servicio_mekanos ? new Date(dto.datosEquipo.fecha_inicio_servicio_mekanos) : null,
            en_garantia: dto.datosEquipo.en_garantia ?? false,
            fecha_inicio_garantia: dto.datosEquipo.fecha_inicio_garantia ? new Date(dto.datosEquipo.fecha_inicio_garantia) : null,
            fecha_fin_garantia: dto.datosEquipo.fecha_fin_garantia ? new Date(dto.datosEquipo.fecha_fin_garantia) : null,
            // ✅ FLEXIBILIZACIÓN PARÁMETROS (06-ENE-2026): Config personalizada
            config_parametros: dto.config_parametros || {},
            activo: true,
            creado_por: userId,
          },
        });

        // 4.2. Crear registro en tabla EQUIPOS_MOTOR (si se proporciona)
        if (dto.datosMotor) {
          // SANACIÓN INTELIGENTE: Valores por defecto para campos obligatorios o críticos
          const marcaMotor = (dto.datosMotor.marca_motor || 'GENERICO').trim().toUpperCase();
          const modeloMotor = (dto.datosMotor.modelo_motor || 'N/A').trim().toUpperCase();
          const serialMotor = (dto.datosMotor.numero_serie_motor || `SN-TEMP-${Date.now()}`).trim().toUpperCase();

          // Validar CHECK CONSTRAINT: chk_al_menos_una_potencia
          let potenciaHp = dto.datosMotor.potencia_hp;
          let potenciaKw = dto.datosMotor.potencia_kw;

          if (!potenciaHp && !potenciaKw) {
            if (dto.tipo === TipoEquipoDiscriminator.GENERADOR && dto.datosGenerador?.potencia_kw) {
              potenciaKw = dto.datosGenerador.potencia_kw;
            } else {
              potenciaKw = 1.0;
            }
          }

          // VALIDACIÓN PREVENTIVA: chk_exclusion_campos (Combustión vs Eléctrico)
          const datosMotorFinal: any = {
            id_equipo: equipoCreado.id_equipo,
            tipo_motor: dto.datosMotor.tipo_motor as tipo_motor_enum,
            marca_motor: marcaMotor,
            modelo_motor: modeloMotor,
            numero_serie_motor: serialMotor,
            potencia_hp: potenciaHp || null,
            potencia_kw: potenciaKw || null,
            velocidad_nominal_rpm: dto.datosMotor.velocidad_nominal_rpm || 1800,
            a_o_fabricacion: dto.datosMotor.anio_fabricacion || null,
            creado_por: userId,
          };

          if (dto.datosMotor.tipo_motor === TipoMotorEnum.COMBUSTION) {
            // Campos permitidos en COMBUSTIÓN
            datosMotorFinal.tipo_combustible = (dto.datosMotor.tipo_combustible as tipo_combustible_enum) || 'DIESEL';
            datosMotorFinal.numero_cilindros = dto.datosMotor.numero_cilindros || null;
            datosMotorFinal.voltaje_arranque_vdc = dto.datosMotor.voltaje_arranque_vdc || 12;
            datosMotorFinal.capacidad_aceite_litros = dto.datosMotor.capacidad_aceite_litros || null;
            datosMotorFinal.capacidad_refrigerante_litros = dto.datosMotor.capacidad_refrigerante_litros || null;
            datosMotorFinal.tiene_turbocargador = dto.datosMotor.tiene_turbocargador ?? false;
            datosMotorFinal.tipo_arranque = (dto.datosMotor.tipo_arranque as tipo_arranque_enum) || 'ELECTRICO';
            datosMotorFinal.amperaje_arranque = dto.datosMotor.amperaje_arranque || null;
            datosMotorFinal.numero_baterias = dto.datosMotor.numero_baterias || 1;
            datosMotorFinal.referencia_bateria = dto.datosMotor.referencia_bateria || 'N/A';
            datosMotorFinal.capacidad_bateria_ah = dto.datosMotor.capacidad_bateria_ah || null;
            datosMotorFinal.tiene_radiador = dto.datosMotor.tiene_radiador ?? true;
            datosMotorFinal.radiador_alto_cm = dto.datosMotor.radiador_alto_cm || null;
            datosMotorFinal.radiador_ancho_cm = dto.datosMotor.radiador_ancho_cm || null;
            datosMotorFinal.radiador_espesor_cm = dto.datosMotor.radiador_espesor_cm || null;
            datosMotorFinal.tiene_cargador_bateria = dto.datosMotor.tiene_cargador_bateria ?? false;
            datosMotorFinal.marca_cargador = dto.datosMotor.marca_cargador || null;
            datosMotorFinal.modelo_cargador = dto.datosMotor.modelo_cargador || null;
            datosMotorFinal.amperaje_cargador = dto.datosMotor.amperaje_cargador || null;
            datosMotorFinal.tipo_aceite = dto.datosMotor.tipo_aceite || '15W40';
            datosMotorFinal.tipo_refrigerante = dto.datosMotor.tipo_refrigerante || '50/50';

            // Limpiar campos ELÉCTRICOS (para cumplir chk_exclusion_campos)
            datosMotorFinal.voltaje_operacion_vac = null;
            datosMotorFinal.numero_fases = null;
            datosMotorFinal.frecuencia_hz = null;
            datosMotorFinal.clase_aislamiento = null;
            datosMotorFinal.grado_proteccion_ip = null;
            datosMotorFinal.amperaje_nominal = null;
            datosMotorFinal.factor_potencia = null;
          } else {
            // Campos permitidos en ELÉCTRICO
            datosMotorFinal.voltaje_operacion_vac = dto.datosMotor.voltaje_operacion_vac || '220V';
            datosMotorFinal.numero_fases = (dto.datosMotor.numero_fases as unknown as numero_fases_enum) || 'TRIFASICO';
            datosMotorFinal.frecuencia_hz = dto.datosMotor.frecuencia_hz || 60;
            datosMotorFinal.clase_aislamiento = (dto.datosMotor.clase_aislamiento as unknown as clase_aislamiento_enum) || 'F';
            datosMotorFinal.grado_proteccion_ip = dto.datosMotor.grado_proteccion_ip || 'IP55';
            datosMotorFinal.amperaje_nominal = dto.datosMotor.amperaje_nominal || null;
            datosMotorFinal.factor_potencia = dto.datosMotor.factor_potencia || 0.85;

            // Limpiar campos COMBUSTIÓN (para cumplir chk_exclusion_campos)
            datosMotorFinal.tipo_combustible = null;
            datosMotorFinal.capacidad_aceite_litros = null;
            datosMotorFinal.capacidad_refrigerante_litros = null;
            datosMotorFinal.numero_cilindros = null;
            datosMotorFinal.voltaje_arranque_vdc = null;
            datosMotorFinal.tipo_arranque = null;
          }

          await tx.equipos_motor.create({
            data: datosMotorFinal,
          });
        }

        let datosEspecificos: Record<string, any> = {};

        // 4.3. Crear registro en tabla hija según discriminador
        switch (dto.tipo) {
          case TipoEquipoDiscriminator.GENERADOR:
            if (!dto.datosGenerador) {
              throw new ConflictException('datosGenerador es requerido para tipo GENERADOR');
            }

            // SANACIÓN INTELIGENTE: Valores por defecto para campos técnicos del Generador
            const kva = dto.datosGenerador.potencia_kva || (dto.datosGenerador.potencia_kw ? (dto.datosGenerador.potencia_kw / 0.8) : 0);
            const kw = dto.datosGenerador.potencia_kw || (dto.datosGenerador.potencia_kva ? (dto.datosGenerador.potencia_kva * 0.8) : 0);

            const generador = await tx.equipos_generador.create({
              data: {
                id_equipo: equipoCreado.id_equipo,
                marca_generador: (dto.datosGenerador.marca_generador || 'GENERICO').trim().toUpperCase(),
                modelo_generador: (dto.datosGenerador.modelo_generador || 'N/A').trim().toUpperCase(),
                numero_serie_generador: (dto.datosGenerador.numero_serie_generador || `SN-GEN-${Date.now()}`).trim().toUpperCase(),
                marca_alternador: (dto.datosGenerador.marca_alternador || 'N/A').trim().toUpperCase(),
                modelo_alternador: (dto.datosGenerador.modelo_alternador || 'N/A').trim().toUpperCase(),
                numero_serie_alternador: (dto.datosGenerador.numero_serie_alternador || 'N/A').trim().toUpperCase(),
                potencia_kw: kw || 0,
                potencia_kva: kva || 0,
                factor_potencia: dto.datosGenerador.factor_potencia || 0.8,
                voltaje_salida: dto.datosGenerador.voltaje_salida || '220/127V',
                numero_fases: dto.datosGenerador.numero_fases || 3,
                frecuencia_hz: dto.datosGenerador.frecuencia_hz || 60,
                amperaje_nominal_salida: dto.datosGenerador.amperaje_nominal_salida || null,
                configuracion_salida: dto.datosGenerador.configuracion_salida || 'ESTRELLA',
                tiene_avr: dto.datosGenerador.tiene_avr ?? true,
                marca_avr: dto.datosGenerador.marca_avr || 'N/A',
                modelo_avr: dto.datosGenerador.modelo_avr || 'N/A',
                referencia_avr: dto.datosGenerador.referencia_avr || 'N/A',
                tiene_modulo_control: dto.datosGenerador.tiene_modulo_control ?? true,
                marca_modulo_control: dto.datosGenerador.marca_modulo_control || 'N/A',
                modelo_modulo_control: dto.datosGenerador.modelo_modulo_control || 'N/A',
                tiene_arranque_automatico: dto.datosGenerador.tiene_arranque_automatico ?? true,
                capacidad_tanque_principal_litros: dto.datosGenerador.capacidad_tanque_principal_litros || null,
                tiene_tanque_auxiliar: dto.datosGenerador.tiene_tanque_auxiliar ?? false,
                capacidad_tanque_auxiliar_litros: dto.datosGenerador.capacidad_tanque_auxiliar_litros || null,
                clase_aislamiento: dto.datosGenerador.clase_aislamiento || 'H',
                grado_proteccion_ip: dto.datosGenerador.grado_proteccion_ip || 'IP23',
                a_o_fabricacion: dto.datosGenerador.anio_fabricacion || null,
                observaciones: dto.datosGenerador.observaciones || null,
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

            // SANACIÓN INTELIGENTE: Valores por defecto para campos técnicos de la Bomba
            const marcaBomba = (dto.datosBomba.marca_bomba || 'GENERICO').trim().toUpperCase();
            const tipoBomba = (dto.datosBomba.tipo_bomba as unknown as tipo_bomba_enum) || 'CENTRIFUGA';
            const serialBomba = (dto.datosBomba.numero_serie_bomba || `SN-BOM-${Date.now()}`).trim().toUpperCase();

            const bomba = await tx.equipos_bomba.create({
              data: {
                id_equipo: equipoCreado.id_equipo,
                marca_bomba: marcaBomba,
                tipo_bomba: tipoBomba,
                modelo_bomba: (dto.datosBomba.modelo_bomba || 'N/A').trim().toUpperCase(),
                numero_serie_bomba: serialBomba,
                aplicacion_bomba: (dto.datosBomba.aplicacion_bomba as unknown as aplicacion_bomba_enum) || 'AGUA_POTABLE',
                diametro_aspiracion: dto.datosBomba.diametro_aspiracion || 'N/A',
                diametro_descarga: dto.datosBomba.diametro_descarga || 'N/A',
                caudal_maximo_m3h: dto.datosBomba.caudal_maximo_m3h || 0,
                altura_manometrica_maxima_m: dto.datosBomba.altura_manometrica_maxima_m || 0,
                altura_presion_trabajo_m: dto.datosBomba.altura_presion_trabajo_m || 0,
                potencia_hidraulica_kw: dto.datosBomba.potencia_hidraulica_kw || 0,
                eficiencia_porcentaje: dto.datosBomba.eficiencia_porcentaje || 0,
                numero_total_bombas_sistema: dto.datosBomba.numero_total_bombas_sistema || 1,
                numero_bomba_en_sistema: dto.datosBomba.numero_bomba_en_sistema || 1,
                tiene_panel_control: dto.datosBomba.tiene_panel_control ?? false,
                marca_panel_control: dto.datosBomba.marca_panel_control || 'N/A',
                modelo_panel_control: dto.datosBomba.modelo_panel_control || 'N/A',
                tiene_presostato: dto.datosBomba.tiene_presostato ?? false,
                marca_presostato: dto.datosBomba.marca_presostato || 'N/A',
                modelo_presostato: dto.datosBomba.modelo_presostato || 'N/A',
                presion_encendido_psi: dto.datosBomba.presion_encendido_psi || null,
                presion_apagado_psi: dto.datosBomba.presion_apagado_psi || null,
                tiene_contactor_externo: dto.datosBomba.tiene_contactor_externo ?? false,
                marca_contactor: dto.datosBomba.marca_contactor || 'N/A',
                amperaje_contactor: dto.datosBomba.amperaje_contactor || null,
                tiene_arrancador_suave: dto.datosBomba.tiene_arrancador_suave ?? false,
                tiene_variador_frecuencia: dto.datosBomba.tiene_variador_frecuencia ?? false,
                marca_variador: dto.datosBomba.marca_variador || 'N/A',
                modelo_variador: dto.datosBomba.modelo_variador || 'N/A',
                tiene_tanques_hidroneumaticos: dto.datosBomba.tiene_tanques_hidroneumaticos ?? false,
                cantidad_tanques: dto.datosBomba.cantidad_tanques || null,
                capacidad_tanques_litros: dto.datosBomba.capacidad_tanques_litros || null,
                presion_tanques_psi: dto.datosBomba.presion_tanques_psi || null,
                tiene_manometro: dto.datosBomba.tiene_manometro ?? false,
                rango_manometro_min_psi: dto.datosBomba.rango_manometro_min_psi || 0,
                rango_manometro_max_psi: dto.datosBomba.rango_manometro_max_psi || null,
                tiene_proteccion_nivel: dto.datosBomba.tiene_proteccion_nivel ?? false,
                tipo_proteccion_nivel: dto.datosBomba.tipo_proteccion_nivel || 'N/A',
                tiene_valvula_purga: dto.datosBomba.tiene_valvula_purga ?? false,
                tiene_valvula_cebado: dto.datosBomba.tiene_valvula_cebado ?? false,
                tiene_valvula_cheque: dto.datosBomba.tiene_valvula_cheque ?? false,
                tiene_valvula_pie: dto.datosBomba.tiene_valvula_pie ?? false,
                referencia_sello_mecanico: dto.datosBomba.referencia_sello_mecanico || 'N/A',
                a_o_fabricacion: dto.datosBomba.anio_fabricacion || null,
                observaciones: dto.datosBomba.observaciones || null,
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
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const targets = error.meta?.target as string[];
          const field = targets?.join(', ') || 'campo único';
          throw new ConflictException(`Error de duplicidad: Ya existe un registro con el mismo ${field}. Por favor, verifique el código de equipo o número de serie.`);
        }
      }
      if (error instanceof ConflictException || error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException('Error inesperado al registrar el equipo: ' + errorMessage);
    }
  }

  /**
   * Listar equipos con datos polimórficos
   * ✅ 08-ENE-2026: Agregado búsqueda, filtro por tipo y ordenación
   */
  async listarEquiposCompletos(params: {
    id_cliente?: number;
    id_sede?: number;
    tipo?: string;
    estado_equipo?: string;
    search?: string;
    sortBy?: 'codigo' | 'nombre' | 'fecha' | 'cliente';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }) {
    try {
      const {
        id_cliente,
        id_sede,
        tipo,
        estado_equipo,
        search,
        sortBy = 'codigo',
        sortOrder = 'asc',
        page = 1,
        limit = 20
      } = params;
      const skip = (page - 1) * limit;

      const where: any = { activo: true };
      if (id_cliente) where.id_cliente = id_cliente;
      if (id_sede) where.id_sede = id_sede;
      if (estado_equipo) where.estado_equipo = estado_equipo;

      // Filtro por tipo (GENERADOR, BOMBA)
      if (tipo === 'GENERADOR') {
        where.equipos_generador = { isNot: null };
      } else if (tipo === 'BOMBA') {
        where.equipos_bomba = { isNot: null };
      }

      // Búsqueda por código, nombre, número de serie o cliente
      if (search && search.trim()) {
        const searchTerm = search.trim();
        where.OR = [
          { codigo_equipo: { contains: searchTerm, mode: 'insensitive' } },
          { nombre_equipo: { contains: searchTerm, mode: 'insensitive' } },
          { numero_serie_equipo: { contains: searchTerm, mode: 'insensitive' } },
          { clientes: { persona: { razon_social: { contains: searchTerm, mode: 'insensitive' } } } },
          { clientes: { persona: { primer_nombre: { contains: searchTerm, mode: 'insensitive' } } } },
        ];
      }

      // Ordenación dinámica
      let orderBy: any = { codigo_equipo: sortOrder };
      if (sortBy === 'nombre') orderBy = { nombre_equipo: sortOrder };
      if (sortBy === 'fecha') orderBy = { fecha_creacion: sortOrder };

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
          orderBy,
        }),
        this.prisma.equipos.count({ where }),
      ]);

      const data = equipos.map((eq) => {
        const persona = eq.clientes?.persona;
        // Priorizar Nombre sobre Razón Social si existe (Consistente con solicitud del usuario)
        const nombrePersona = `${persona?.primer_nombre || ''} ${persona?.primer_apellido || ''}`.trim();
        const nombreCliente = nombrePersona || persona?.razon_social || 'Sin nombre';

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
          id_tipo_equipo: eq.id_tipo_equipo, // Crucial para filtrado frontend
          tipos_equipo: eq.tipos_equipo,     // Crucial para metadatos frontend
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
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const targets = error.meta?.target as string[];
          const field = targets?.join(', ') || 'campo único';
          throw new ConflictException(`Error de duplicidad: Ya existe un registro con el mismo ${field}. Por favor, verifique el código de equipo o número de serie.`);
        }
      }
      if (error instanceof ConflictException || error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException('Error inesperado al listar los equipos: ' + errorMessage);
    }
  }

  /**
   * Obtener equipo por ID con datos polimórficos completos
   */
  async obtenerEquipoCompleto(id: number) {
    try {
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
      // Priorizar Nombre sobre Razón Social si existe
      const nombrePersona = `${persona?.primer_nombre || ''} ${persona?.primer_apellido || ''}`.trim();
      const nombreCliente = nombrePersona || persona?.razon_social || 'Sin nombre';

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
        criticidad_justificacion: equipo.criticidad_justificacion,
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
        config_parametros: equipo.config_parametros || {},
        // Fechas importantes
        fecha_instalacion: equipo.fecha_instalacion,
        fecha_inicio_servicio_mekanos: equipo.fecha_inicio_servicio_mekanos,
        fecha_creacion: equipo.fecha_creacion,
        fecha_modificacion: equipo.fecha_modificacion,
        // Garantía
        en_garantia: equipo.en_garantia,
        fecha_inicio_garantia: equipo.fecha_inicio_garantia,
        fecha_fin_garantia: equipo.fecha_fin_garantia,
        proveedor_garantia: equipo.proveedor_garantia,
        // Horas y mantenimiento
        horas_actuales: equipo.horas_actuales,
        fecha_ultima_lectura_horas: equipo.fecha_ultima_lectura_horas,
        tipo_contrato: equipo.tipo_contrato,
        // Intervalos override
        intervalo_tipo_a_dias_override: equipo.intervalo_tipo_a_dias_override,
        intervalo_tipo_a_horas_override: equipo.intervalo_tipo_a_horas_override,
        intervalo_tipo_b_dias_override: equipo.intervalo_tipo_b_dias_override,
        intervalo_tipo_b_horas_override: equipo.intervalo_tipo_b_horas_override,
        criterio_intervalo_override: equipo.criterio_intervalo_override,
        // Estado físico
        estado_pintura: equipo.estado_pintura,
        requiere_pintura: equipo.requiere_pintura,
        // Observaciones
        observaciones_generales: equipo.observaciones_generales,
        configuracion_especial: equipo.configuracion_especial,
        // Estado de baja
        activo: equipo.activo,
        fecha_baja: equipo.fecha_baja,
        motivo_baja: equipo.motivo_baja,
        // Relaciones
        lecturas_horometro: equipo.lecturas_horometro,
        historial_estados: equipo.historial_estados_equipo,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const targets = error.meta?.target as string[];
          const field = targets?.join(', ') || 'campo único';
          throw new ConflictException(`Error de duplicidad: Ya existe un registro con el mismo ${field}. Por favor, verifique el código de equipo o número de serie.`);
        }
      }
      if (error instanceof ConflictException || error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException('Error inesperado al obtener el equipo: ' + errorMessage);
    }
  }

  /**
   * ✅ OPTIMIZACIÓN 05-ENE-2026: Query ULTRA-LIGERA para selectores
   * Solo retorna: id, código, nombre, cliente
   * Impacto: De ~2s a ~100ms en selectores de equipos
   */
  async findForSelector(params: {
    search?: string;
    clienteId?: number;
    sedeId?: number;
    limit?: number;
  }) {
    const { search, clienteId, sedeId, limit = 20 } = params;

    const where: any = {
      activo: true,
      ...(clienteId && { id_cliente: clienteId }),
      ...(sedeId && { id_sede: sedeId }),
      ...(search && {
        OR: [
          { codigo_equipo: { contains: search, mode: 'insensitive' } },
          { nombre_equipo: { contains: search, mode: 'insensitive' } },
          { numero_serie_equipo: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const equipos = await this.prisma.equipos.findMany({
      where,
      select: {
        id_equipo: true,
        codigo_equipo: true,
        nombre_equipo: true,
        numero_serie_equipo: true,
        tipos_equipo: {
          select: {
            nombre_tipo: true,
            codigo_tipo: true,
          },
        },
      },
      take: limit,
      orderBy: { codigo_equipo: 'asc' },
    });

    // Transformar a formato ligero para selector
    return equipos.map(e => ({
      id_equipo: e.id_equipo,
      codigo_equipo: e.codigo_equipo,
      nombre: e.nombre_equipo || e.codigo_equipo,
      serie: e.numero_serie_equipo,
      tipo: e.tipos_equipo?.nombre_tipo || e.tipos_equipo?.codigo_tipo,
    }));
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MÉTODOS DE ACCIONES ESPECÍFICAS
  // ✅ 08-ENE-2026: Cambio de estado y lectura de horómetro
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Cambiar estado del equipo con registro en historial
   */
  async cambiarEstadoEquipo(
    idEquipo: number,
    dto: CambiarEstadoEquipoDto,
    userId: number
  ) {
    // 1. Verificar que el equipo existe
    const equipo = await this.prisma.equipos.findUnique({
      where: { id_equipo: idEquipo },
      select: { id_equipo: true, codigo_equipo: true, estado_equipo: true },
    });

    if (!equipo) {
      throw new NotFoundException(`No se encontró el equipo con ID ${idEquipo}`);
    }

    const estadoAnterior = equipo.estado_equipo;
    const nuevoEstado = dto.nuevo_estado as estado_equipo_enum;

    // 2. Si el estado es el mismo, no hacer nada
    if (estadoAnterior === nuevoEstado) {
      return {
        id_equipo: equipo.id_equipo,
        codigo_equipo: equipo.codigo_equipo,
        estado_anterior: estadoAnterior,
        estado_nuevo: nuevoEstado,
        mensaje: 'El equipo ya se encuentra en este estado',
      };
    }

    // 3. Actualizar estado y crear registro en historial (transacción)
    const resultado = await this.prisma.$transaction(async (tx) => {
      // Actualizar el estado del equipo
      await tx.equipos.update({
        where: { id_equipo: idEquipo },
        data: {
          estado_equipo: nuevoEstado,
          modificado_por: userId,
          fecha_modificacion: new Date(),
        },
      });

      // Crear registro en historial
      const historial = await tx.historial_estados_equipo.create({
        data: {
          id_equipo: idEquipo,
          estado_anterior: estadoAnterior,
          estado_nuevo: nuevoEstado,
          motivo_cambio: dto.motivo_cambio,
          cambiado_por: userId,
          fecha_cambio: new Date(),
        },
      });

      return historial;
    });

    return {
      id_equipo: equipo.id_equipo,
      codigo_equipo: equipo.codigo_equipo,
      estado_anterior: estadoAnterior,
      estado_nuevo: nuevoEstado,
      motivo_cambio: dto.motivo_cambio,
      fecha_cambio: resultado.fecha_cambio,
      id_historial: resultado.id_historial,
    };
  }

  /**
   * Registrar nueva lectura de horómetro
   */
  async registrarLecturaHorometro(
    idEquipo: number,
    dto: RegistrarLecturaHorometroDto,
    userId: number
  ) {
    // 1. Verificar que el equipo existe
    const equipo = await this.prisma.equipos.findUnique({
      where: { id_equipo: idEquipo },
      select: {
        id_equipo: true,
        codigo_equipo: true,
        horas_actuales: true,
        fecha_ultima_lectura_horas: true,
      },
    });

    if (!equipo) {
      throw new NotFoundException(`No se encontró el equipo con ID ${idEquipo}`);
    }

    const horasActuales = equipo.horas_actuales ? Number(equipo.horas_actuales) : 0;
    const nuevasHoras = dto.horas_lectura;

    // 2. Validar que las nuevas horas no sean menores a las actuales
    if (nuevasHoras < horasActuales) {
      throw new BadRequestException(
        `La lectura (${nuevasHoras} hrs) no puede ser menor a las horas actuales (${horasActuales} hrs)`
      );
    }

    // 3. Calcular horas transcurridas y días
    const horasTranscurridas = nuevasHoras - horasActuales;
    let diasTranscurridos: number | null = null;
    let horasPromedioDia: number | null = null;

    if (equipo.fecha_ultima_lectura_horas) {
      const fechaAnterior = new Date(equipo.fecha_ultima_lectura_horas);
      const fechaActual = new Date();
      const diffMs = fechaActual.getTime() - fechaAnterior.getTime();
      diasTranscurridos = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diasTranscurridos > 0) {
        horasPromedioDia = parseFloat((horasTranscurridas / diasTranscurridos).toFixed(2));
      }
    }

    // 4. Crear lectura y actualizar equipo (transacción)
    const resultado = await this.prisma.$transaction(async (tx) => {
      // Crear la lectura
      const lectura = await tx.lecturas_horometro.create({
        data: {
          id_equipo: idEquipo,
          horas_lectura: nuevasHoras,
          fecha_lectura: new Date(),
          tipo_lectura: dto.tipo_lectura as any || 'MANUAL',
          horas_transcurridas: horasTranscurridas,
          dias_transcurridos: diasTranscurridos,
          horas_promedio_dia: horasPromedioDia,
          observaciones: dto.observaciones,
          registrado_por: userId,
        },
      });

      // Actualizar horas en el equipo
      await tx.equipos.update({
        where: { id_equipo: idEquipo },
        data: {
          horas_actuales: nuevasHoras,
          fecha_ultima_lectura_horas: new Date(),
          modificado_por: userId,
          fecha_modificacion: new Date(),
        },
      });

      return lectura;
    });

    return {
      id_lectura: resultado.id_lectura,
      id_equipo: equipo.id_equipo,
      codigo_equipo: equipo.codigo_equipo,
      horas_anteriores: horasActuales,
      horas_nuevas: nuevasHoras,
      horas_transcurridas: horasTranscurridas,
      dias_transcurridos: diasTranscurridos,
      horas_promedio_dia: horasPromedioDia,
      fecha_lectura: resultado.fecha_lectura,
    };
  }
}
