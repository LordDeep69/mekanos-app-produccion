import { PrismaService } from '@mekanos/database';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UseGuards
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// Commands
import { AprobarOrdenCommand } from './commands/aprobar-orden.command';
import { AsignarTecnicoCommand } from './commands/asignar-tecnico.command';
import { CambiarEstadoOrdenCommand } from './commands/cambiar-estado-orden.command';
import { CancelarOrdenCommand } from './commands/cancelar-orden.command';
import { CreateOrdenCommand } from './commands/create-orden.command';
import { FinalizarOrdenCommand } from './commands/finalizar-orden.command';
import { IniciarOrdenCommand } from './commands/iniciar-orden.command';
import { ProgramarOrdenCommand } from './commands/programar-orden.command';
import { UpdateOrdenCommand } from './commands/update-orden.command';

// Queries
import { GetOrdenByIdQuery } from './queries/get-orden-by-id.query';
import { GetOrdenesQuery } from './queries/get-ordenes.query';

// DTOs
import { AsignarTecnicoDto } from './dto/asignar-tecnico.dto';
import { CambiarEstadoOrdenDto } from './dto/cambiar-estado-orden.dto';
import { CreateOrdenDto } from './dto/create-orden.dto';
import { FinalizarOrdenCompletoDto } from './dto/finalizar-orden-completo.dto';
import { AddActividadPlanDto, UpdateActividadPlanDto } from './dto/plan-actividades.dto';
import { ProgramarOrdenDto } from './dto/programar-orden.dto';
import { UpdateOrdenDto } from './dto/update-orden.dto';

// Services
import { FinalizacionOrdenService, ProgressEvent } from './services/finalizacion-orden.service';

// Decorators
import { UserId } from './decorators/user-id.decorator';

/**
 * OrdenesController - FASE 3
 * 
 * Controlador REST para órdenes de servicio
 * Endpoints: 10 operaciones CRUD + Workflow
 * 
 * POST   /api/ordenes               - Crear orden
 * GET    /api/ordenes               - Listar con filtros
 * GET    /api/ordenes/:id           - Detalle orden
 * PATCH  /api/ordenes/:id/estado    - Cambiar estado (FSM unificado)
 * PUT    /api/ordenes/:id/programar - Programar fecha/hora
 * PUT    /api/ordenes/:id/asignar   - Asignar técnico
 * PUT    /api/ordenes/:id/iniciar   - Iniciar ejecución
 * PUT    /api/ordenes/:id/aprobar   - Aprobar cierre
 * PUT    /api/ordenes/:id/cancelar   - Cancelar orden
 */
@ApiTags('FASE 3 - Órdenes de Servicio')
@ApiBearerAuth('JWT-auth')
@Controller('ordenes')
export class OrdenesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly prisma: PrismaService,
    private readonly finalizacionService: FinalizacionOrdenService,
  ) { }

  /**
   * GET /api/ordenes/:id/emails/historial
   * Obtiene historial de emails enviados de una orden
   * FIX 18-FEB-2026 - DEBE IR ANTES DE @Get(':id') para routing correcto
   */
  @Get(':id/emails/historial')
  @ApiOperation({
    summary: 'Obtener historial de emails enviados',
    description: 'Retorna el listado de todos los emails enviados para una orden, ordenados del más reciente al más antiguo.',
  })
  @ApiParam({ name: 'id', description: 'ID de la orden de servicio', type: String })
  @ApiResponse({ status: 200, description: 'Historial de emails obtenido exitosamente' })
  async getHistorialEmailsFirst(@Param('id') id: string) {
    console.log(`📧 [HISTORIAL-EMAILS] Solicitud recibida para orden: ${id}`);

    const idNumerico = parseInt(id, 10);
    if (isNaN(idNumerico)) {
      console.error(`❌ [HISTORIAL-EMAILS] ID inválido: ${id}`);
      throw new NotFoundException(`ID de orden inválido: ${id}`);
    }

    try {
      console.log(`📧 [HISTORIAL-EMAILS] Buscando historial para orden ${idNumerico}...`);
      const historial = await this.prisma.historial_emails_enviados.findMany({
        where: { id_orden_servicio: idNumerico },
        orderBy: { fecha_envio: 'desc' },
      });

      console.log(`✅ [HISTORIAL-EMAILS] Encontrados ${historial.length} registros para orden ${idNumerico}`);
      return {
        success: true,
        historial,
        total: historial.length,
      };
    } catch (error) {
      console.error(`❌ [HISTORIAL-EMAILS] Error al buscar historial:`, error);
      throw error;
    }
  }

  @Get(':id/plan-actividades')
  @UseGuards(JwtAuthGuard)
  async getPlanActividades(@Param('id', ParseIntPipe) id: number) {
    const orden = await this.prisma.ordenes_servicio.findUnique({
      where: { id_orden_servicio: id },
      select: { id_orden_servicio: true },
    });

    if (!orden) {
      throw new NotFoundException('Orden no encontrada');
    }

    const plan = await this.prisma.ordenes_actividades_plan.findMany({
      where: { id_orden_servicio: id },
      orderBy: { orden_secuencia: 'asc' },
    });

    return {
      success: true,
      data: plan,
    };
  }

  @Put(':id/plan-actividades')
  @UseGuards(JwtAuthGuard)
  async replacePlanActividades(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      actividades?: Array<{
        idActividadCatalogo: number;
        ordenSecuencia?: number;
        esObligatoria?: boolean;
      }>;
    },
    @UserId() userId: number,
  ) {
    const actividades = body?.actividades;

    if (!Array.isArray(actividades)) {
      throw new BadRequestException('Debe enviar actividades como array');
    }

    const orden = await this.prisma.ordenes_servicio.findUnique({
      where: { id_orden_servicio: id },
      select: { id_orden_servicio: true },
    });

    if (!orden) {
      throw new NotFoundException('Orden no encontrada');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.ordenes_actividades_plan.deleteMany({
        where: { id_orden_servicio: id },
      });

      if (actividades.length > 0) {
        await tx.ordenes_actividades_plan.createMany({
          data: actividades.map((a, index) => {
            if (!a || typeof a.idActividadCatalogo !== 'number') {
              throw new BadRequestException(
                'Cada actividad debe tener idActividadCatalogo numérico',
              );
            }
            const ordenSecuencia =
              typeof a.ordenSecuencia === 'number'
                ? a.ordenSecuencia
                : index + 1;

            return {
              id_orden_servicio: id,
              id_actividad_catalogo: a.idActividadCatalogo,
              orden_secuencia: ordenSecuencia,
              origen: 'ADMIN',
              es_obligatoria:
                typeof a.esObligatoria === 'boolean' ? a.esObligatoria : true,
              creado_por: userId || null,
            };
          }),
          skipDuplicates: true,
        });
      }
    });

    return {
      success: true,
      message: 'Plan de actividades actualizado',
    };
  }

  @Put(':id/plan-actividades/default')
  @UseGuards(JwtAuthGuard)
  async applyDefaultPlanActividades(
    @Param('id', ParseIntPipe) id: number,
    @UserId() userId: number,
  ) {
    const orden = await this.prisma.ordenes_servicio.findUnique({
      where: { id_orden_servicio: id },
      select: { id_orden_servicio: true, id_tipo_servicio: true },
    });

    if (!orden) {
      throw new NotFoundException('Orden no encontrada');
    }

    if (!orden.id_tipo_servicio) {
      throw new BadRequestException('La orden no tiene tipo de servicio');
    }

    const actividadesCatalogo = await this.prisma.catalogo_actividades.findMany({
      where: {
        id_tipo_servicio: orden.id_tipo_servicio,
        activo: true,
      },
      orderBy: { orden_ejecucion: 'asc' },
    });

    if (actividadesCatalogo.length === 0) {
      throw new BadRequestException(
        'No hay actividades en catálogo para el tipo de servicio de la orden',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.ordenes_actividades_plan.deleteMany({
        where: { id_orden_servicio: id },
      });

      await tx.ordenes_actividades_plan.createMany({
        data: actividadesCatalogo.map((a, index) => ({
          id_orden_servicio: id,
          id_actividad_catalogo: a.id_actividad_catalogo,
          orden_secuencia: a.orden_ejecucion ?? index + 1,
          origen: 'ADMIN',
          es_obligatoria: a.es_obligatoria ?? true,
          creado_por: userId || null,
        })),
        skipDuplicates: true,
      });
    });

    return {
      success: true,
      message: 'Plan de actividades default aplicado',
      total: actividadesCatalogo.length,
    };
  }

  @Delete(':id/plan-actividades')
  @UseGuards(JwtAuthGuard)
  async clearPlanActividades(@Param('id', ParseIntPipe) id: number) {
    const orden = await this.prisma.ordenes_servicio.findUnique({
      where: { id_orden_servicio: id },
      select: { id_orden_servicio: true },
    });

    if (!orden) {
      throw new NotFoundException('Orden no encontrada');
    }

    await this.prisma.ordenes_actividades_plan.deleteMany({
      where: { id_orden_servicio: id },
    });

    return {
      success: true,
      message: 'Plan de actividades eliminado',
    };
  }

  @Post(':id/plan-actividades/actividad')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Añadir actividad individual al plan' })
  async addActividadIndividual(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddActividadPlanDto,
    @UserId() userId: number,
  ) {
    const orden = await this.prisma.ordenes_servicio.findUnique({
      where: { id_orden_servicio: id },
      select: { id_orden_servicio: true },
    });

    if (!orden) {
      throw new NotFoundException('Orden no encontrada');
    }

    // Validar que la actividad existe en el catálogo
    const actividadCat = await this.prisma.catalogo_actividades.findUnique({
      where: { id_actividad_catalogo: dto.idActividadCatalogo },
    });

    if (!actividadCat) {
      throw new BadRequestException('La actividad no existe en el catálogo');
    }

    // Evitar duplicados (UK en BD)
    const existe = await this.prisma.ordenes_actividades_plan.findUnique({
      where: {
        id_orden_servicio_id_actividad_catalogo: {
          id_orden_servicio: id,
          id_actividad_catalogo: dto.idActividadCatalogo,
        },
      },
    });

    if (existe) {
      throw new BadRequestException('Esta actividad ya está en el plan de la orden');
    }

    // Calcular secuencia si no se provee
    let secuencia = dto.ordenSecuencia;
    if (secuencia === undefined) {
      const lastAct = await this.prisma.ordenes_actividades_plan.findFirst({
        where: { id_orden_servicio: id },
        orderBy: { orden_secuencia: 'desc' },
      });
      secuencia = (lastAct?.orden_secuencia ?? 0) + 1;
    }

    const nuevaAct = await this.prisma.ordenes_actividades_plan.create({
      data: {
        id_orden_servicio: id,
        id_actividad_catalogo: dto.idActividadCatalogo,
        orden_secuencia: secuencia,
        es_obligatoria: dto.esObligatoria ?? true,
        origen: (dto.origen as any) || 'ADMIN',
        creado_por: userId,
      },
      include: {
        catalogo_actividades: true,
      },
    });

    return {
      success: true,
      message: 'Actividad añadida al plan',
      data: nuevaAct,
    };
  }

  @Patch(':id/plan-actividades/actividad/:actividadPlanId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Actualizar actividad individual del plan' })
  async updateActividadIndividual(
    @Param('id', ParseIntPipe) id: number,
    @Param('actividadPlanId', ParseIntPipe) actividadPlanId: number,
    @Body() dto: UpdateActividadPlanDto,
    @UserId() userId: number,
  ) {
    const actividad = await this.prisma.ordenes_actividades_plan.findFirst({
      where: {
        id_orden_actividad_plan: actividadPlanId,
        id_orden_servicio: id,
      },
    });

    if (!actividad) {
      throw new NotFoundException('Actividad no encontrada en el plan de esta orden');
    }

    const actualizada = await this.prisma.ordenes_actividades_plan.update({
      where: { id_orden_actividad_plan: actividadPlanId },
      data: {
        orden_secuencia: dto.ordenSecuencia,
        es_obligatoria: dto.esObligatoria,
        modificado_por: userId,
        fecha_modificacion: new Date(),
      },
    });

    return {
      success: true,
      message: 'Actividad del plan actualizada',
      data: actualizada,
    };
  }

  @Delete(':id/plan-actividades/actividad/:actividadPlanId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Eliminar actividad individual del plan' })
  async removeActividadIndividual(
    @Param('id', ParseIntPipe) id: number,
    @Param('actividadPlanId', ParseIntPipe) actividadPlanId: number,
  ) {
    const actividad = await this.prisma.ordenes_actividades_plan.findFirst({
      where: {
        id_orden_actividad_plan: actividadPlanId,
        id_orden_servicio: id,
      },
    });

    if (!actividad) {
      throw new NotFoundException('Actividad no encontrada en el plan de esta orden');
    }

    await this.prisma.ordenes_actividades_plan.delete({
      where: { id_orden_actividad_plan: actividadPlanId },
    });

    return {
      success: true,
      message: 'Actividad eliminada del plan',
    };
  }

  @Get(':id/actividades')
  @UseGuards(JwtAuthGuard)
  async getActividadesEjecutadas(@Param('id', ParseIntPipe) id: number) {
    const actividades = await this.prisma.actividades_ejecutadas.findMany({
      where: { id_orden_servicio: id },
      include: {
        catalogo_actividades: true,
        empleados: { include: { persona: true } },
      },
      orderBy: { fecha_ejecucion: 'desc' },
    });

    return {
      success: true,
      data: actividades,
    };
  }

  @Get(':id/mediciones')
  @UseGuards(JwtAuthGuard)
  async getMediciones(@Param('id', ParseIntPipe) id: number) {
    const mediciones = await this.prisma.mediciones_servicio.findMany({
      where: { id_orden_servicio: id },
      include: {
        parametros_medicion: true,
      },
      orderBy: { fecha_medicion: 'desc' },
    });

    return {
      success: true,
      data: mediciones,
    };
  }

  /**
   * GET /api/ordenes/:id/mediciones-completas
   * ✅ 24-FEB-2026 (v3): Retorna mediciones registradas + parámetros disponibles sin medir
   * 
   * ESTRATEGIA ROBUSTA (4 fuentes de parámetros):
   * 1. Plan de actividades de la orden (ordenes_actividades_plan → catalogo_actividades MEDICION → parametros_medicion)
   * 2. Catálogo de actividades del tipo de servicio (catalogo_actividades → MEDICION → parametros_medicion)
   * 3. Parámetros del tipo de equipo (parametros_medicion → id_tipo_equipo)
   * 4. Parámetros de equipos múltiples (ordenes_equipos → equipos → id_tipo_equipo → parametros_medicion)
   * Se hace UNION de las 4 fuentes y se restan los ya medidos.
   */
  @Get(':id/mediciones-completas')
  @UseGuards(JwtAuthGuard)
  async getMedicionesCompletas(@Param('id', ParseIntPipe) id: number) {
    // 1. Obtener la orden con equipo, tipo servicio, equipos múltiples y plan
    const orden = await this.prisma.ordenes_servicio.findUnique({
      where: { id_orden_servicio: id },
      select: {
        id_orden_servicio: true,
        id_tipo_servicio: true,
        equipos: {
          select: { id_tipo_equipo: true },
        },
        ordenes_equipos: {
          select: {
            equipos: {
              select: { id_tipo_equipo: true },
            },
          },
        },
        ordenes_actividades_plan: {
          select: {
            catalogo_actividades: {
              select: {
                tipo_actividad: true,
                id_parametro_medicion: true,
                descripcion_actividad: true,
              },
            },
          },
        },
      },
    });

    if (!orden) {
      return { success: false, data: [], parametros_sin_medir: [] };
    }

    console.log(`[MEDICIONES-COMPLETAS] Orden #${id}: id_tipo_servicio=${orden.id_tipo_servicio}, id_tipo_equipo=${orden.equipos?.id_tipo_equipo}, plan_items=${orden.ordenes_actividades_plan?.length}, ordenes_equipos=${orden.ordenes_equipos?.length}`);

    // 2. Obtener mediciones ya registradas
    const mediciones = await this.prisma.mediciones_servicio.findMany({
      where: { id_orden_servicio: id },
      include: { parametros_medicion: true },
      orderBy: { fecha_medicion: 'desc' },
    });

    const idsMedidos = new Set(mediciones.map(m => m.id_parametro_medicion));
    console.log(`[MEDICIONES-COMPLETAS] Mediciones registradas: ${mediciones.length}, IDs medidos: [${Array.from(idsMedidos).join(',')}]`);

    // 3. FUENTE 1: Parámetros del plan de actividades de la orden (MEDICION)
    const idsDesdelPlan = new Set<number>();
    for (const planItem of orden.ordenes_actividades_plan || []) {
      const act = planItem.catalogo_actividades;
      if (act?.tipo_actividad === 'MEDICION' && act.id_parametro_medicion) {
        idsDesdelPlan.add(act.id_parametro_medicion);
      }
    }
    console.log(`[MEDICIONES-COMPLETAS] FUENTE 1 (plan orden): ${idsDesdelPlan.size} params -> [${Array.from(idsDesdelPlan).join(',')}]`);

    // 4. FUENTE 2: Catálogo de actividades del tipo de servicio (MEDICION con parámetro vinculado)
    const idsDesdeServicio = new Set<number>();
    if (orden.id_tipo_servicio) {
      const actividadesCatalogo = await this.prisma.catalogo_actividades.findMany({
        where: {
          id_tipo_servicio: orden.id_tipo_servicio,
          tipo_actividad: 'MEDICION',
          id_parametro_medicion: { not: null },
          activo: true,
        },
        select: { id_parametro_medicion: true, descripcion_actividad: true },
      });
      for (const act of actividadesCatalogo) {
        if (act.id_parametro_medicion) {
          idsDesdeServicio.add(act.id_parametro_medicion);
        }
      }
      console.log(`[MEDICIONES-COMPLETAS] FUENTE 2 (catalogo tipo_servicio=${orden.id_tipo_servicio}): ${idsDesdeServicio.size} params -> [${Array.from(idsDesdeServicio).join(',')}]`);
    }

    // 5. FUENTE 3: Parámetros del tipo de equipo directo
    const tiposEquipoIds = new Set<number>();
    if (orden.equipos?.id_tipo_equipo) {
      tiposEquipoIds.add(orden.equipos.id_tipo_equipo);
    }

    // 6. FUENTE 4: Parámetros de equipos múltiples (ordenes_equipos)
    for (const oe of orden.ordenes_equipos || []) {
      if (oe.equipos?.id_tipo_equipo) {
        tiposEquipoIds.add(oe.equipos.id_tipo_equipo);
      }
    }

    const parametrosPorTipo = tiposEquipoIds.size > 0
      ? await this.prisma.parametros_medicion.findMany({
        where: {
          id_tipo_equipo: { in: Array.from(tiposEquipoIds) },
          activo: true,
        },
      })
      : [];
    console.log(`[MEDICIONES-COMPLETAS] FUENTE 3+4 (tipos_equipo=[${Array.from(tiposEquipoIds).join(',')}]): ${parametrosPorTipo.length} params`);

    // 7. Consultar parámetros del plan + servicio
    const idsFromPlans = new Set([...idsDesdelPlan, ...idsDesdeServicio]);
    const parametrosDelPlan = idsFromPlans.size > 0
      ? await this.prisma.parametros_medicion.findMany({
        where: {
          id_parametro_medicion: { in: Array.from(idsFromPlans) },
          activo: true,
        },
      })
      : [];

    // 8. UNION de todas las fuentes (deduplicar por ID)
    const mapaParametros = new Map<number, any>();
    for (const p of parametrosPorTipo) {
      mapaParametros.set(p.id_parametro_medicion, p);
    }
    for (const p of parametrosDelPlan) {
      mapaParametros.set(p.id_parametro_medicion, p);
    }

    // 9. Filtrar los que NO han sido medidos
    const parametrosSinMedir = Array.from(mapaParametros.values())
      .filter(p => !idsMedidos.has(p.id_parametro_medicion))
      .sort((a, b) => (a.nombre_parametro || '').localeCompare(b.nombre_parametro || ''));

    console.log(`[MEDICIONES-COMPLETAS] RESULTADO: total_disponibles=${mapaParametros.size}, medidos=${idsMedidos.size}, sin_medir=${parametrosSinMedir.length}`);
    if (parametrosSinMedir.length > 0) {
      console.log(`[MEDICIONES-COMPLETAS] Sin medir: ${parametrosSinMedir.map(p => p.nombre_parametro).join(', ')}`);
    }

    return {
      success: true,
      data: mediciones,
      parametros_sin_medir: parametrosSinMedir,
      _debug: {
        total_parametros_disponibles: mapaParametros.size,
        total_medidos: idsMedidos.size,
        total_sin_medir: parametrosSinMedir.length,
        fuentes: {
          plan_actividades: idsDesdelPlan.size,
          catalogo_servicio: idsDesdeServicio.size,
          tipos_equipo: parametrosPorTipo.length,
        },
      },
    };
  }

  /**
   * POST /api/ordenes/:id/mediciones
   * ✅ 24-FEB-2026: Crear una nueva medición desde el portal admin
   * Permite al admin registrar valores de parámetros que el técnico omitió
   */
  @Post(':id/mediciones')
  @UseGuards(JwtAuthGuard)
  async createMedicion(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      id_parametro_medicion: number;
      valor_numerico?: number;
      valor_texto?: string;
      observaciones?: string;
    },
  ) {
    // Validar que la orden existe
    const orden = await this.prisma.ordenes_servicio.findUnique({
      where: { id_orden_servicio: id },
    });
    if (!orden) {
      return { success: false, message: 'Orden no encontrada' };
    }

    // Validar que el parámetro existe
    const parametro = await this.prisma.parametros_medicion.findUnique({
      where: { id_parametro_medicion: body.id_parametro_medicion },
    });
    if (!parametro) {
      return { success: false, message: 'Parámetro de medición no encontrado' };
    }

    // Evaluar si está fuera de rango
    let fueraDeRango = false;
    let nivelAlerta: any = 'OK';
    let mensajeAlerta: string | null = null;

    if (body.valor_numerico != null) {
      const val = body.valor_numerico;
      const minNormal = parametro.valor_minimo_normal ? Number(parametro.valor_minimo_normal) : null;
      const maxNormal = parametro.valor_maximo_normal ? Number(parametro.valor_maximo_normal) : null;
      const minCritico = parametro.valor_minimo_critico ? Number(parametro.valor_minimo_critico) : null;
      const maxCritico = parametro.valor_maximo_critico ? Number(parametro.valor_maximo_critico) : null;

      if (minCritico != null && val < minCritico) {
        fueraDeRango = true;
        nivelAlerta = 'CRITICO';
        mensajeAlerta = `Valor ${val} por debajo del mínimo crítico (${minCritico})`;
      } else if (maxCritico != null && val > maxCritico) {
        fueraDeRango = true;
        nivelAlerta = 'CRITICO';
        mensajeAlerta = `Valor ${val} por encima del máximo crítico (${maxCritico})`;
      } else if (minNormal != null && val < minNormal) {
        fueraDeRango = true;
        nivelAlerta = 'ADVERTENCIA';
        mensajeAlerta = `Valor ${val} por debajo del mínimo normal (${minNormal})`;
      } else if (maxNormal != null && val > maxNormal) {
        fueraDeRango = true;
        nivelAlerta = 'ADVERTENCIA';
        mensajeAlerta = `Valor ${val} por encima del máximo normal (${maxNormal})`;
      }
    }

    const nuevaMedicion = await this.prisma.mediciones_servicio.create({
      data: {
        id_orden_servicio: id,
        id_parametro_medicion: body.id_parametro_medicion,
        valor_numerico: body.valor_numerico,
        valor_texto: body.valor_texto,
        unidad_medida: parametro.unidad_medida,
        fuera_de_rango: fueraDeRango,
        nivel_alerta: nivelAlerta,
        mensaje_alerta: mensajeAlerta,
        observaciones: body.observaciones,
        fecha_medicion: new Date(),
        fecha_registro: new Date(),
      },
      include: { parametros_medicion: true },
    });

    return {
      success: true,
      data: nuevaMedicion,
    };
  }

  /**
   * GET /api/ordenes/:id/servicios
   * Obtener detalles de servicios comerciales de una orden
   */
  @Get(':id/servicios')
  @UseGuards(JwtAuthGuard)
  async getServicios(@Param('id', ParseIntPipe) id: number) {
    const servicios = await this.prisma.detalle_servicios_orden.findMany({
      where: { id_orden_servicio: id },
      include: {
        catalogo_servicios: true,
      },
      orderBy: { fecha_registro: 'desc' },
    });

    return {
      success: true,
      data: servicios,
    };
  }

  @Get(':id/evidencias')
  @UseGuards(JwtAuthGuard)
  async getEvidencias(@Param('id', ParseIntPipe) id: number) {
    const evidencias = await this.prisma.evidencias_fotograficas.findMany({
      where: { id_orden_servicio: id },
      include: {
        actividades_ejecutadas: {
          include: {
            catalogo_actividades: true,
          },
        },
      },
      orderBy: { fecha_captura: 'desc' },
    });

    // Mapear para incluir descripción de actividad en la respuesta
    const evidenciasConActividad = evidencias.map((ev) => ({
      ...ev,
      actividad_asociada: ev.actividades_ejecutadas
        ? {
          id_actividad: ev.actividades_ejecutadas.id_actividad_ejecutada,
          descripcion_actividad:
            ev.actividades_ejecutadas.catalogo_actividades?.descripcion_actividad ||
            ev.actividades_ejecutadas.observaciones ||
            null,
        }
        : null,
    }));

    return {
      success: true,
      data: evidenciasConActividad,
    };
  }

  @Get(':id/firmas')
  @UseGuards(JwtAuthGuard)
  async getFirmas(@Param('id', ParseIntPipe) id: number) {
    // ✅ FIX 05-ENE-2026: Obtener firmas ESPECÍFICAS de esta orden
    // Antes: Buscaba "la última firma del técnico" mezclando firmas entre órdenes
    // Ahora: Usa id_firma_tecnico e id_firma_cliente vinculados a cada orden

    // Usar $queryRaw para acceder a id_firma_tecnico (campo nuevo no en Prisma Client aún)
    const ordenData = await this.prisma.$queryRaw<any[]>`
      SELECT id_firma_cliente, id_firma_tecnico, nombre_quien_recibe, cargo_quien_recibe 
      FROM ordenes_servicio WHERE id_orden_servicio = ${id}
    `;

    if (!ordenData || ordenData.length === 0) {
      throw new NotFoundException('Orden no encontrada');
    }
    const orden = ordenData[0];

    // Recolectar IDs de firmas vinculadas a ESTA orden específica
    const idsFirmas: number[] = [];
    if (orden.id_firma_tecnico) idsFirmas.push(orden.id_firma_tecnico);
    if (orden.id_firma_cliente) idsFirmas.push(orden.id_firma_cliente);

    let firmasOrden: any[] = [];

    if (idsFirmas.length > 0) {
      // ✅ Órdenes NUEVAS: Usar FKs vinculadas
      firmasOrden = await this.prisma.firmas_digitales.findMany({
        where: { id_firma_digital: { in: idsFirmas } },
        include: { persona: true },
      });
    } else {
      // ✅ FALLBACK para órdenes ANTIGUAS (sin FK vinculada)
      // Buscar firmas por id_persona del técnico asignado + última firma del cliente
      const ordenCompleta = await this.prisma.ordenes_servicio.findUnique({
        where: { id_orden_servicio: id },
        select: {
          id_tecnico_asignado: true,
          empleados_ordenes_servicio_id_tecnico_asignadoToempleados: {
            select: { id_persona: true }
          }
        },
      });

      const idPersonaTecnico = ordenCompleta?.empleados_ordenes_servicio_id_tecnico_asignadoToempleados?.id_persona;

      if (idPersonaTecnico) {
        // Buscar última firma del técnico
        const firmaTecnico = await this.prisma.firmas_digitales.findFirst({
          where: { id_persona: idPersonaTecnico, tipo_firma: 'TECNICO' },
          orderBy: { fecha_registro: 'desc' },
          include: { persona: true },
        });
        if (firmaTecnico) firmasOrden.push(firmaTecnico);
      }

      // Buscar firma del cliente (si hay id_firma_cliente aunque sea null el técnico)
      if (orden.id_firma_cliente) {
        const firmaCliente = await this.prisma.firmas_digitales.findUnique({
          where: { id_firma_digital: orden.id_firma_cliente },
          include: { persona: true },
        });
        if (firmaCliente) firmasOrden.push(firmaCliente);
      }
    }

    // Mapear para incluir nombre_firmante desde persona
    const firmasConNombre = firmasOrden.map(f => ({
      ...f,
      nombre_firmante: f.persona
        ? `${(f.persona as any).primer_nombre || (f.persona as any).nombres || ''} ${(f.persona as any).primer_apellido || (f.persona as any).apellidos || ''}`.trim()
        : (f.tipo_firma === 'CLIENTE' ? orden.nombre_quien_recibe : 'Sin nombre'),
      cargo_firmante: f.tipo_firma === 'TECNICO'
        ? 'Técnico Responsable'
        : (orden.cargo_quien_recibe || 'Cliente / Autorizador'),
    }));

    return {
      success: true,
      data: firmasConNombre,
    };
  }

  /**
   * PUT /api/ordenes/:id/firmas/:tipo
   * ✅ 25-FEB-2026: Permite al admin editar/crear firma de una orden (dibujar o subir imagen)
   * tipo = TECNICO | CLIENTE
   */
  @Put(':id/firmas/:tipo')
  @UseGuards(JwtAuthGuard)
  async updateFirmaOrden(
    @Param('id', ParseIntPipe) id: number,
    @Param('tipo') tipo: string,
    @CurrentUser('id') userId: number,
    @Body() body: { firma_base64: string; nombre_firmante?: string; cargo_firmante?: string },
  ) {
    const tipoUpper = tipo.toUpperCase();
    if (!['TECNICO', 'CLIENTE'].includes(tipoUpper)) {
      throw new BadRequestException('Tipo de firma inválido. Use TECNICO o CLIENTE.');
    }

    if (!body.firma_base64) {
      throw new BadRequestException('firma_base64 es requerido.');
    }

    // 1. Obtener la orden y sus FKs de firma actuales
    const ordenData = await this.prisma.$queryRaw<any[]>`
      SELECT id_orden_servicio, id_firma_cliente, id_firma_tecnico,
             id_tecnico_asignado, id_cliente, nombre_quien_recibe, cargo_quien_recibe
      FROM ordenes_servicio WHERE id_orden_servicio = ${id}
    `;
    if (!ordenData || ordenData.length === 0) {
      throw new NotFoundException('Orden no encontrada');
    }
    const orden = ordenData[0];

    // 2. Determinar id_persona según tipo de firma
    let idPersona: number;
    if (tipoUpper === 'TECNICO') {
      // Obtener id_persona del técnico asignado
      if (!orden.id_tecnico_asignado) {
        throw new BadRequestException('La orden no tiene técnico asignado.');
      }
      const empleado = await this.prisma.empleados.findUnique({
        where: { id_empleado: orden.id_tecnico_asignado },
        select: { id_persona: true },
      });
      if (!empleado) throw new BadRequestException('Técnico no encontrado.');
      idPersona = empleado.id_persona;
    } else {
      // CLIENTE: buscar persona del cliente
      const cliente = await this.prisma.clientes.findUnique({
        where: { id_cliente: orden.id_cliente },
        select: { id_persona: true },
      });
      if (!cliente) throw new BadRequestException('Cliente no encontrado.');
      idPersona = cliente.id_persona;
    }

    // 3. Generar hash de la firma
    const { createHash } = require('crypto');
    const hashFirma = createHash('sha256').update(body.firma_base64).digest('hex').substring(0, 64);

    // 4. Verificar si ya existe una firma vinculada a la orden para este tipo
    const fkField = tipoUpper === 'TECNICO' ? 'id_firma_tecnico' : 'id_firma_cliente';
    const existingFirmaId = orden[fkField];

    let firmaId: number;

    if (existingFirmaId) {
      // Actualizar la firma existente
      await this.prisma.firmas_digitales.update({
        where: { id_firma_digital: existingFirmaId },
        data: {
          firma_base64: body.firma_base64,
          hash_firma: hashFirma,
          fecha_captura: new Date(),
        },
      });
      firmaId = existingFirmaId;
      console.log(`[FIRMAS] ✅ Firma ${tipoUpper} actualizada (id=${firmaId}) para orden ${id}`);
    } else {
      // Crear nueva firma
      const nuevaFirma = await this.prisma.firmas_digitales.create({
        data: {
          id_persona: idPersona,
          tipo_firma: tipoUpper as any,
          firma_base64: body.firma_base64,
          formato_firma: 'PNG',
          hash_firma: hashFirma,
          es_firma_principal: false,
          activa: true,
          registrada_por: userId,
          fecha_captura: new Date(),
          fecha_registro: new Date(),
        },
      });
      firmaId = nuevaFirma.id_firma_digital;

      // Vincular la firma a la orden
      if (tipoUpper === 'TECNICO') {
        await this.prisma.$executeRaw`UPDATE ordenes_servicio SET id_firma_tecnico = ${firmaId} WHERE id_orden_servicio = ${id}`;
      } else {
        await this.prisma.$executeRaw`UPDATE ordenes_servicio SET id_firma_cliente = ${firmaId} WHERE id_orden_servicio = ${id}`;
      }
      console.log(`[FIRMAS] ✅ Nueva firma ${tipoUpper} creada (id=${firmaId}) y vinculada a orden ${id}`);
    }

    // 5. Actualizar nombre/cargo en la orden si es firma de cliente
    if (tipoUpper === 'CLIENTE') {
      const updateData: any = {};
      if (body.nombre_firmante) updateData.nombre_quien_recibe = body.nombre_firmante;
      if (body.cargo_firmante) updateData.cargo_quien_recibe = body.cargo_firmante;
      if (Object.keys(updateData).length > 0) {
        await this.prisma.ordenes_servicio.update({
          where: { id_orden_servicio: id },
          data: updateData,
        });
      }
    }

    return {
      success: true,
      message: `Firma de ${tipoUpper} ${existingFirmaId ? 'actualizada' : 'creada'} exitosamente`,
      data: { id_firma: firmaId, tipo: tipoUpper },
    };
  }

  /**
   * GET /api/ordenes/:id/pdf-url
   * Obtiene la URL del PDF del informe de servicio (sin generar)
   */
  @Get(':id/pdf-url')
  @UseGuards(JwtAuthGuard)
  async getPdfUrl(@Param('id', ParseIntPipe) id: number) {
    console.log(`[PDF-URL] Buscando URL del PDF para orden id=${id}`);

    // Buscar documento PDF directamente por id_referencia (= id_orden_servicio)
    const documento = await this.prisma.documentos_generados.findFirst({
      where: {
        id_referencia: id,
        tipo_documento: 'INFORME_SERVICIO',
      },
      orderBy: { fecha_generacion: 'desc' },
      select: {
        id_documento: true,
        ruta_archivo: true,
        fecha_generacion: true,
        numero_documento: true,
      },
    });

    console.log(`[PDF] Resultado para orden ${id}:`, documento ? documento.ruta_archivo : 'NO ENCONTRADO');

    return {
      success: true,
      data: documento ? {
        url: documento.ruta_archivo,
        fecha: documento.fecha_generacion,
        numero: documento.numero_documento,
      } : null,
    };
  }

  /**
   * DELETE /api/ordenes/:id
   * ✅ 26-FEB-2026: HARD DELETE - Elimina una orden de servicio y TODOS sus datos asociados
   * Transacción atómica: borra registros hijos explícitamente antes de eliminar la orden
   * Solo admin puede ejecutar esta acción
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Eliminar orden de servicio (HARD DELETE)',
    description: `
      Elimina permanentemente una orden de servicio y TODOS sus datos asociados.
      Esta acción es IRREVERSIBLE.
      
      **Datos eliminados:**
      - Actividades ejecutadas y sus evidencias/componentes
      - Mediciones de servicio
      - Evidencias fotográficas
      - Componentes usados
      - Gastos de la orden
      - Detalle de servicios comerciales
      - Historial de estados
      - Historial de emails enviados
      - Plan de actividades
      - Equipos vinculados (ordenes_equipos)
      - Informes generados
      - Firmas digitales vinculadas
      - Movimientos de inventario asociados
    `,
  })
  @ApiParam({ name: 'id', description: 'ID de la orden de servicio a eliminar', example: 1 })
  @ApiResponse({ status: 200, description: 'Orden eliminada permanentemente' })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  async hardDeleteOrden(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    // 1. Verificar que la orden existe
    const orden = await this.prisma.ordenes_servicio.findUnique({
      where: { id_orden_servicio: id },
      select: {
        id_orden_servicio: true,
        numero_orden: true,
        id_firma_tecnico: true,
        id_firma_cliente: true,
      },
    });

    if (!orden) {
      throw new NotFoundException(`Orden ${id} no encontrada`);
    }

    console.log(`🗑️ [HARD DELETE] Iniciando eliminación de orden ${orden.numero_orden} (id=${id}) por usuario ${userId}`);

    // 2. Transacción atómica: eliminar todos los datos asociados
    await this.prisma.$transaction(async (tx) => {
      // 2a. Tablas hijas directas de ordenes_servicio
      const deletedActividades = await tx.actividades_ejecutadas.deleteMany({ where: { id_orden_servicio: id } });
      console.log(`  ├─ actividades_ejecutadas: ${deletedActividades.count}`);

      const deletedMediciones = await tx.mediciones_servicio.deleteMany({ where: { id_orden_servicio: id } });
      console.log(`  ├─ mediciones_servicio: ${deletedMediciones.count}`);

      const deletedEvidencias = await tx.evidencias_fotograficas.deleteMany({ where: { id_orden_servicio: id } });
      console.log(`  ├─ evidencias_fotograficas: ${deletedEvidencias.count}`);

      const deletedComponentes = await tx.componentes_usados.deleteMany({ where: { id_orden_servicio: id } });
      console.log(`  ├─ componentes_usados: ${deletedComponentes.count}`);

      const deletedGastos = await tx.gastos_orden.deleteMany({ where: { id_orden_servicio: id } });
      console.log(`  ├─ gastos_orden: ${deletedGastos.count}`);

      const deletedServicios = await tx.detalle_servicios_orden.deleteMany({ where: { id_orden_servicio: id } });
      console.log(`  ├─ detalle_servicios_orden: ${deletedServicios.count}`);

      const deletedHistorial = await tx.historial_estados_orden.deleteMany({ where: { id_orden_servicio: id } });
      console.log(`  ├─ historial_estados_orden: ${deletedHistorial.count}`);

      const deletedEmails = await tx.historial_emails_enviados.deleteMany({ where: { id_orden_servicio: id } });
      console.log(`  ├─ historial_emails_enviados: ${deletedEmails.count}`);

      const deletedPlan = await tx.ordenes_actividades_plan.deleteMany({ where: { id_orden_servicio: id } });
      console.log(`  ├─ ordenes_actividades_plan: ${deletedPlan.count}`);

      const deletedEquipos = await tx.ordenes_equipos.deleteMany({ where: { id_orden_servicio: id } });
      console.log(`  ├─ ordenes_equipos: ${deletedEquipos.count}`);

      // 2b. Informes y sus bitácoras
      const informes = await tx.informes.findMany({
        where: { id_orden_servicio: id },
        select: { id_informe: true },
      });
      if (informes.length > 0) {
        const informeIds = informes.map(i => i.id_informe);
        const deletedBitacoras = await tx.bitacoras_informes.deleteMany({
          where: { id_informe: { in: informeIds } },
        });
        console.log(`  ├─ bitacoras_informes: ${deletedBitacoras.count}`);
      }
      const deletedInformes = await tx.informes.deleteMany({ where: { id_orden_servicio: id } });
      console.log(`  ├─ informes: ${deletedInformes.count}`);

      // 2c. Movimientos de inventario asociados
      const deletedMovimientos = await tx.movimientos_inventario.deleteMany({ where: { id_orden_servicio: id } });
      console.log(`  ├─ movimientos_inventario: ${deletedMovimientos.count}`);

      // 2d. Nullificar FK en cronogramas_servicio (no eliminar cronogramas, solo desvincular)
      await tx.cronogramas_servicio.updateMany({
        where: { id_orden_servicio_generada: id },
        data: { id_orden_servicio_generada: null },
      });

      // 2e. Nullificar FK en cotizaciones (no eliminar cotizaciones, solo desvincular)
      await tx.cotizaciones.updateMany({
        where: { id_orden_servicio_generada: id },
        data: { id_orden_servicio_generada: null },
      });

      // 2f. Nullificar FK en remisiones
      await tx.remisiones.updateMany({
        where: { id_orden_servicio: id },
        data: { id_orden_servicio: null },
      });

      // 2g. Nullificar FK en propuestas_correctivo
      await tx.$executeRaw`UPDATE propuestas_correctivo SET id_orden_servicio = NULL WHERE id_orden_servicio = ${id}`;
      await tx.$executeRaw`UPDATE propuestas_correctivo SET id_orden_servicio_generada = NULL WHERE id_orden_servicio_generada = ${id}`;

      // 2h. Desvincular firmas de la orden antes de borrarla
      await tx.ordenes_servicio.update({
        where: { id_orden_servicio: id },
        data: { id_firma_tecnico: null, id_firma_cliente: null },
      });

      // 2i. Eliminar firmas digitales vinculadas (opcional: solo si son exclusivas de esta orden)
      const firmaIds: number[] = [];
      if (orden.id_firma_tecnico) firmaIds.push(orden.id_firma_tecnico);
      if (orden.id_firma_cliente) firmaIds.push(orden.id_firma_cliente);
      if (firmaIds.length > 0) {
        const deletedFirmas = await tx.firmas_digitales.deleteMany({
          where: { id_firma_digital: { in: firmaIds } },
        });
        console.log(`  ├─ firmas_digitales: ${deletedFirmas.count}`);
      }

      // 3. Finalmente, eliminar la orden
      await tx.ordenes_servicio.delete({ where: { id_orden_servicio: id } });
      console.log(`  └─ ✅ ordenes_servicio: ELIMINADA`);
    }, {
      timeout: 30000,
      maxWait: 10000,
    });

    console.log(`🗑️ [HARD DELETE] ✅ Orden ${orden.numero_orden} (id=${id}) eliminada completamente`);

    return {
      success: true,
      message: `Orden ${orden.numero_orden} eliminada permanentemente`,
      data: { id_orden_servicio: id, numero_orden: orden.numero_orden },
    };
  }

  /**
   * GET /api/ordenes/estados-debug
   * DEBUG: Listar estados
   */
  @Get('estados-debug')
  async getEstadosDebug() {
    return this.prisma.estados_orden.findMany();
  }

  /**
   * POST /api/ordenes
   * Crea una nueva orden de servicio en estado PROGRAMADA
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateOrdenDto,
    @UserId() userId: number
  ) {
    const tecnicoId = dto.id_tecnico_asignado || dto.tecnicoId;
    const equiposIds = dto.equipos_ids || [dto.id_equipo];

    const command = new CreateOrdenCommand(
      dto.id_cliente,
      equiposIds,
      dto.id_tipo_servicio,
      dto.id_sede_cliente,
      dto.descripcion_inicial,
      dto.prioridad,
      // ✅ FIX TIMEZONE: Agregar T12:00:00 para evitar offset de día
      // "2026-01-05" → "2026-01-05T12:00:00" (mediodía evita problemas de timezone)
      dto.fecha_programada ? new Date(`${dto.fecha_programada}T12:00:00`) : undefined,
      tecnicoId,
      userId
    );

    const result = await this.commandBus.execute(command);

    return {
      success: true,
      message: tecnicoId
        ? 'Orden de servicio creada y técnico asignado exitosamente'
        : 'Orden de servicio creada exitosamente',
      data: result,
    };
  }

  /**
   * GET /api/ordenes
   * Lista órdenes con paginación, filtros y ordenamiento
   * 
   * ENTERPRISE: Soporta sortBy, sortOrder, tipoServicioId, fechaDesde, fechaHasta
   * ✅ 31-ENE-2026: MULTI-ASESOR - Filtrar por clientes asignados al asesor
   */
  @Get()
  async findAll(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('idCliente') idCliente?: string,
    @Query('idEquipo') idEquipo?: string,
    @Query('idTecnico') idTecnico?: string,
    @Query('estado') estado?: string,
    @Query('prioridad') prioridad?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('tipoServicioId') tipoServicioId?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
    @Query('busqueda') busqueda?: string,
  ) {
    // ✅ MULTI-ASESOR: Filtrar por asesor si NO es admin
    const idAsesorFiltro = user?.esAdmin ? undefined : user?.idEmpleado;

    const query = new GetOrdenesQuery(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      idCliente ? parseInt(idCliente, 10) : undefined,
      idEquipo ? parseInt(idEquipo, 10) : undefined,
      idTecnico ? parseInt(idTecnico, 10) : undefined,
      estado,
      prioridad,
      sortBy || 'fecha_creacion',
      sortOrder || 'desc',
      tipoServicioId ? parseInt(tipoServicioId, 10) : undefined,
      fechaDesde,
      fechaHasta,
      idAsesorFiltro, // ✅ MULTI-ASESOR
      busqueda, // ✅ BÚSQUEDA
    );

    const result = await this.queryBus.execute(query);

    return {
      success: true,
      message: 'Órdenes obtenidas exitosamente',
      data: result.ordenes,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  /**
   * GET /api/ordenes/:id
   * Obtiene detalle de una orden por ID
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const result = await this.queryBus.execute(new GetOrdenByIdQuery(parseInt(id, 10)));

    return {
      success: true,
      message: 'Orden obtenida exitosamente',
      data: result,
    };
  }

  /**
   * PUT /api/ordenes/:id
   * Actualiza campos editables de una orden
   * Solo permite edición si el estado actual NO es final (APROBADA, CANCELADA)
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Actualizar orden de servicio',
    description: `
      Actualiza campos editables de una orden.
      Solo se puede editar si el estado actual NO es final (APROBADA, CANCELADA).
      
      **Campos editables:**
      - Sede cliente
      - Tipo de servicio
      - Fecha y hora programada
      - Prioridad
      - Origen de solicitud
      - Descripción inicial
      - Trabajo realizado
      - Observaciones del técnico
      - Requiere firma cliente
    `,
  })
  @ApiParam({ name: 'id', description: 'ID de la orden de servicio', example: 1 })
  @ApiResponse({ status: 200, description: 'Orden actualizada exitosamente' })
  @ApiResponse({ status: 400, description: 'Estado no permite edición' })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrdenDto,
    @UserId() userId: number,
  ) {
    // Construir DTO con fechas parseadas
    const commandDto: any = { ...dto };

    if (dto.fecha_programada) {
      // ✅ FIX TIMEZONE: Agregar T12:00:00 para evitar offset de día
      commandDto.fecha_programada = new Date(`${dto.fecha_programada}T12:00:00`);
    }

    if (dto.hora_programada) {
      // Parsear hora HH:mm a Date
      const [hours, minutes] = dto.hora_programada.split(':').map(Number);
      const horaDate = new Date();
      horaDate.setHours(hours, minutes, 0, 0);
      commandDto.hora_programada = horaDate;
    }

    const command = new UpdateOrdenCommand(
      id,
      commandDto,
      userId || 1, // Fallback si JWT no disponible
    );

    const result = await this.commandBus.execute(command);

    return {
      success: true,
      message: 'Orden actualizada exitosamente',
      data: result,
    };
  }

  /**
   * PATCH /api/ordenes/:id/observaciones-cierre
   * Endpoint ATÓMICO para actualizar SOLO el campo observaciones_cierre
   * Diseñado para Portal Admin - permite edición incluso en órdenes COMPLETADAS
   */
  @Patch(':id/observaciones-cierre')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Actualizar observaciones de cierre',
    description: 'Actualiza SOLO el campo observaciones_cierre de una orden. Permite edición en estado COMPLETADA.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID de la orden' })
  @ApiResponse({ status: 200, description: 'Observaciones actualizadas exitosamente' })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  @ApiResponse({ status: 400, description: 'No se puede modificar orden en estado APROBADA/CANCELADA' })
  async updateObservacionesCierre(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { observaciones_cierre: string },
  ) {
    // 1. Verificar que la orden existe y obtener estado actual
    const orden = await this.prisma.ordenes_servicio.findUnique({
      where: { id_orden_servicio: id },
      include: { estados_orden: true },
    });

    if (!orden) {
      throw new NotFoundException(`Orden ${id} no encontrada`);
    }

    // 2. Validar que no sea estado final bloqueado (APROBADA/CANCELADA)
    const estadoCodigo = orden.estados_orden?.codigo_estado;
    if (estadoCodigo === 'APROBADA' || estadoCodigo === 'CANCELADA') {
      throw new BadRequestException(
        `No se puede modificar una orden en estado ${estadoCodigo}`,
      );
    }

    // 3. Actualizar SOLO observaciones_cierre (operación atómica)
    const updated = await this.prisma.ordenes_servicio.update({
      where: { id_orden_servicio: id },
      data: {
        observaciones_cierre: body.observaciones_cierre,
        fecha_modificacion: new Date(),
      },
    });

    return {
      success: true,
      message: 'Observaciones de cierre actualizadas exitosamente',
      data: {
        id_orden_servicio: updated.id_orden_servicio,
        observaciones_cierre: updated.observaciones_cierre,
      },
    };
  }

  /**
   * PATCH /api/ordenes/:id/horarios-servicio
   * Endpoint ATÓMICO para actualizar hora de entrada y hora de salida del servicio
   * Diseñado para Portal Admin - permite edición incluso en órdenes COMPLETADAS
   * 
   * Los campos se almacenan como:
   * - fecha_inicio_real (DateTime) → hora de entrada del técnico al sitio
   * - fecha_fin_real (DateTime) → hora de salida del técnico del sitio
   * - duracion_minutos (Int) → se recalcula automáticamente
   */
  @Patch(':id/horarios-servicio')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Actualizar horarios de servicio (hora entrada/salida)',
    description: 'Actualiza fecha_inicio_real y fecha_fin_real de una orden. Recalcula duracion_minutos automáticamente. Permite edición en estado COMPLETADA.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID de la orden' })
  @ApiResponse({ status: 200, description: 'Horarios actualizados exitosamente' })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o estado no permite edición' })
  async updateHorariosServicio(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { fecha_inicio_real?: string; fecha_fin_real?: string },
    @UserId() userId: number,
  ) {
    // 1. Verificar que la orden existe y obtener estado actual
    const orden = await this.prisma.ordenes_servicio.findUnique({
      where: { id_orden_servicio: id },
      include: { estados_orden: true },
    });

    if (!orden) {
      throw new NotFoundException(`Orden ${id} no encontrada`);
    }

    // 2. Validar que no sea estado final bloqueado (APROBADA/CANCELADA)
    const estadoCodigo = orden.estados_orden?.codigo_estado;
    if (estadoCodigo === 'APROBADA' || estadoCodigo === 'CANCELADA') {
      throw new BadRequestException(
        `No se puede modificar una orden en estado ${estadoCodigo}`,
      );
    }

    // 3. Validar que al menos un campo venga
    if (!body.fecha_inicio_real && !body.fecha_fin_real) {
      throw new BadRequestException(
        'Debe enviar al menos fecha_inicio_real o fecha_fin_real',
      );
    }

    // 4. Parsear fechas
    const updateData: any = {
      fecha_modificacion: new Date(),
      modificado_por: userId || 1,
    };

    let fechaInicio: Date | null = null;
    let fechaFin: Date | null = null;

    if (body.fecha_inicio_real) {
      fechaInicio = new Date(body.fecha_inicio_real);
      if (isNaN(fechaInicio.getTime())) {
        throw new BadRequestException('fecha_inicio_real no es una fecha válida');
      }
      updateData.fecha_inicio_real = fechaInicio;
    }

    if (body.fecha_fin_real) {
      fechaFin = new Date(body.fecha_fin_real);
      if (isNaN(fechaFin.getTime())) {
        throw new BadRequestException('fecha_fin_real no es una fecha válida');
      }
      updateData.fecha_fin_real = fechaFin;
    }

    // 5. Recalcular duración en minutos
    const inicioFinal = fechaInicio || (orden.fecha_inicio_real ? new Date(orden.fecha_inicio_real) : null);
    const finFinal = fechaFin || (orden.fecha_fin_real ? new Date(orden.fecha_fin_real) : null);

    if (inicioFinal && finFinal) {
      if (finFinal <= inicioFinal) {
        throw new BadRequestException(
          'La hora de salida debe ser posterior a la hora de entrada',
        );
      }

      const diffMs = finFinal.getTime() - inicioFinal.getTime();
      const duracionMinutos = Math.round(diffMs / 60000);

      if (duracionMinutos > 1440) {
        throw new BadRequestException(
          `Duración calculada (${duracionMinutos} min) excede las 24 horas. Verifique las fechas.`,
        );
      }

      updateData.duracion_minutos = duracionMinutos;
    }

    // 6. Actualizar (operación atómica)
    const updated = await this.prisma.ordenes_servicio.update({
      where: { id_orden_servicio: id },
      data: updateData,
    });

    return {
      success: true,
      message: 'Horarios de servicio actualizados exitosamente',
      data: {
        id_orden_servicio: updated.id_orden_servicio,
        fecha_inicio_real: updated.fecha_inicio_real,
        fecha_fin_real: updated.fecha_fin_real,
        duracion_minutos: updated.duracion_minutos,
      },
    };
  }

  /**
   * PATCH /api/ordenes/:id/estado
   * Cambia el estado de una orden usando FSM (Finite State Machine)
   * Valida transiciones permitidas y registra en historial automáticamente
   */
  @Patch(':id/estado')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Cambiar estado de orden',
    description: `
      Endpoint unificado para cambiar el estado de una orden de servicio.
      Utiliza una Máquina de Estados Finitos (FSM) para validar transiciones.
      
      **Transiciones permitidas:**
      - PROGRAMADA → ASIGNADA, CANCELADA
      - ASIGNADA → EN_PROCESO, EN_ESPERA_REPUESTO, PROGRAMADA, CANCELADA
      - EN_PROCESO → COMPLETADA, EN_ESPERA_REPUESTO, CANCELADA
      - EN_ESPERA_REPUESTO → ASIGNADA, EN_PROCESO, CANCELADA
      - COMPLETADA → APROBADA, EN_PROCESO, CANCELADA
      - APROBADA → (estado final)
      - CANCELADA → (estado final)
      
      **Historial:** Cada cambio se registra automáticamente en historial_estados_orden.
    `,
  })
  @ApiParam({ name: 'id', description: 'ID de la orden de servicio', example: 1 })
  @ApiResponse({ status: 200, description: 'Estado cambiado exitosamente' })
  @ApiResponse({ status: 400, description: 'Transición no permitida o datos inválidos' })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  async cambiarEstado(
    @Param('id') id: string,
    @Body() dto: CambiarEstadoOrdenDto,
    @UserId() userId: number,
  ) {
    const command = new CambiarEstadoOrdenCommand(
      parseInt(id, 10),
      dto.nuevoEstado,
      userId || 1, // Fallback si JWT no disponible
      dto.motivo,
      dto.observaciones,
      {
        tecnicoId: dto.tecnicoId,
        aprobadorId: dto.aprobadorId,
      },
    );

    const result = await this.commandBus.execute(command);

    return {
      success: result.success,
      message: result.mensaje,
      data: {
        ordenId: result.ordenId,
        estadoAnterior: result.estadoAnterior,
        estadoNuevo: result.estadoNuevo,
        historialId: result.historialId,
        timestamp: result.timestamp,
      },
    };
  }

  /**
   * PUT /api/ordenes/:id/programar
   * Programa fecha y hora de la orden
   * Estado: PROGRAMADA → PROGRAMADA (actualiza fecha)
   */
  @Put(':id/programar')
  async programar(@Param('id') id: string, @Body() dto: ProgramarOrdenDto) {
    const command = new ProgramarOrdenCommand(
      id,
      new Date(dto.fechaProgramada),
      dto.observaciones
    );

    const result = await this.commandBus.execute(command);

    return {
      success: true,
      message: 'Orden programada exitosamente',
      data: result,
    };
  }

  /**
   * PUT /api/ordenes/:id/asignar
   * Asigna técnico y supervisor a la orden
   * Estado: PROGRAMADA → ASIGNADA
   */
  @Put(':id/asignar')
  async asignarTecnico(@Param('id') id: string, @Body() dto: AsignarTecnicoDto) {
    const command = new AsignarTecnicoCommand(
      id,
      dto.tecnicoId
    );

    const result = await this.commandBus.execute(command);
    console.log('[OrdenesController] Command executed, returning simplified response');

    // SIMPLIFY RESPONSE TO AVOID CIRCULAR REFS OR HUGE PAYLOAD
    // ✅ FIX 15-DIC-2025: Corregidos nombres de propiedades según schema Prisma
    const tecnico = result.empleados_ordenes_servicio_id_tecnico_asignadoToempleados;
    return {
      success: true,
      message: 'Técnico asignado exitosamente',
      data: {
        id_orden_servicio: result.id_orden_servicio,
        numero_orden: result.numero_orden,
        estado: result.estados_orden,
        tecnico: tecnico ? {
          id_empleado: tecnico.id_empleado,
          persona: tecnico.persona
        } : null
      },
    };
  }

  /**
   * PUT /api/ordenes/:id/iniciar
   * Inicia la ejecución de la orden
   * Estado: ASIGNADA → EN_PROCESO
   */
  @Put(':id/iniciar')
  async iniciar(@Param('id') id: string) {
    const command = new IniciarOrdenCommand(id);

    const result = await this.commandBus.execute(command);

    return {
      success: true,
      message: 'Orden iniciada exitosamente',
      data: result,
    };
  }

  /**
   * PUT /api/ordenes/:id/finalizar
   * Finaliza la ejecución de la orden
   * Estado: EN_PROCESO → COMPLETADA
   * 
   * ACCIONES AUTOMÁTICAS:
   * - Genera PDF del informe de servicio
   * - Sube PDF a Cloudflare R2
   * - Envía email al cliente con el informe adjunto
   */
  @Put(':id/finalizar')
  @ApiOperation({
    summary: 'Finalizar orden de servicio',
    description: `
      Finaliza la ejecución de una orden de servicio.
      
      **Transición de estado:** EN_PROCESO → COMPLETADA
      
      **Acciones automáticas (background):**
      1. Genera PDF del informe técnico
      2. Sube PDF a Cloudflare R2
      3. Envía email al cliente con el informe adjunto
      
      Estas acciones se ejecutan en background y no bloquean la respuesta.
    `,
  })
  @ApiParam({ name: 'id', description: 'ID de la orden de servicio', example: 1 })
  @ApiResponse({ status: 200, description: 'Orden finalizada exitosamente' })
  @ApiResponse({ status: 400, description: 'Orden no está en estado EN_PROCESO' })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  async finalizar(
    @Param('id') id: string,
    @Body() dto: { observaciones?: string },
  ) {
    const command = new FinalizarOrdenCommand(id, dto.observaciones);

    const result = await this.commandBus.execute(command);

    return {
      success: true,
      message: 'Orden finalizada exitosamente. El PDF y email se generarán en background.',
      data: result.toObject ? result.toObject() : result,
    };
  }

  /**
   * PUT /api/ordenes/:id/aprobar
   * Aprueba el cierre de la orden
   * Estado: COMPLETADA → APROBADA
   */
  @Put(':id/aprobar')
  async aprobar(@Param('id') id: string) {
    const command = new AprobarOrdenCommand(
      parseInt(id, 10),
      1, // TODO: obtener userId desde JWT
    );

    const result = await this.commandBus.execute(command);

    return {
      success: true,
      message: 'Orden aprobada exitosamente',
      data: result,
    };
  }

  /**
   * PUT /api/ordenes/:id/cancelar
   * Cancela la orden con motivo
   * Estado: CUALQUIERA → CANCELADA
   */
  @Put(':id/cancelar')
  async cancelar(
    @Param('id') id: string,
    @Body() dto: { motivo?: string },
  ) {
    const command = new CancelarOrdenCommand(
      parseInt(id, 10),
      dto.motivo || 'Sin motivo especificado',
      1, // TODO: obtener userId desde JWT
    );

    const result = await this.commandBus.execute(command);

    return {
      success: true,
      message: 'Orden cancelada exitosamente',
      data: result,
    };
  }

  /**
   * ==========================================================================
   * POST /api/ordenes/:id/finalizar-completo
   * ==========================================================================
   * 
   * ENDPOINT PRINCIPAL DE FINALIZACIÓN - FLUJO COMPLETO
   * 
   * Este endpoint ejecuta TODO el flujo de finalización de una orden:
   * 1. Sube evidencias fotográficas a Cloudinary
   * 2. Registra evidencias en BD con hash SHA256
   * 3. Registra firmas digitales (técnico + cliente)
   * 4. Genera PDF profesional con template MEKANOS
   * 5. Sube PDF a Cloudflare R2
   * 6. Registra documento en BD
   * 7. Envía email al cliente con PDF adjunto
   * 8. Actualiza estado de la orden a COMPLETADA
   * 
   * USO DESDE FRONTEND:
   * - La app móvil del técnico envía todos los datos en una sola request
   * - Incluye evidencias en Base64, firmas digitales, actividades, mediciones
   * - El backend procesa todo de forma atómica con rollback en caso de error
   */
  @Post(':id/finalizar-completo')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Finalizar orden de servicio - Flujo Completo',
    description: `
      Ejecuta el flujo completo de finalización de una orden de servicio.
      Incluye subida de evidencias, generación de PDF, envío de email y actualización de estado.
      
      **Datos requeridos:**
      - Evidencias fotográficas (ANTES, DURANTE, DESPUES) en Base64
      - Firma del técnico en Base64
      - Actividades ejecutadas con sus resultados
      - Hora de entrada y salida
      - Observaciones del servicio
      
      **Datos opcionales:**
      - Firma del cliente
      - Mediciones realizadas
      - Datos del módulo de control (generadores)
      - Email adicional para copia
    `,
  })
  @ApiParam({ name: 'id', description: 'ID de la orden de servicio', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Orden finalizada exitosamente. PDF generado y email enviado.'
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos o incompletos' })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  @ApiResponse({ status: 500, description: 'Error en el procesamiento' })
  async finalizarCompleto(
    @Param('id') id: string,
    @Body() dto: FinalizarOrdenCompletoDto,
    @UserId() userId: number,
  ) {
    // ═══════════════════════════════════════════════════════════════════
    // 🔬 LOG FORENSE - DATOS RECIBIDOS DEL MOBILE
    // ═══════════════════════════════════════════════════════════════════
    console.log('');
    console.log('🔬 ═══════════════════════════════════════════════════════════════');
    console.log('🔬 LOG FORENSE BACKEND - DATOS RECIBIDOS');
    console.log('🔬 ═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('📋 EVIDENCIAS recibidas:', dto.evidencias?.length || 0);
    // ✅ FIX 17-DIC-2025: Log forense de idOrdenEquipo para diagnóstico multi-equipo
    dto.evidencias?.slice(0, 5).forEach((ev, i) => {
      console.log(`   [${i}] tipo="${ev.tipo}", idOrdenEquipo=${ev.idOrdenEquipo ?? 'NULL'}, desc="${ev.descripcion?.substring(0, 30) ?? 'N/A'}...", base64=${ev.base64?.length || 0} chars`);
    });
    if (dto.evidencias?.length > 5) {
      console.log(`   ... y ${dto.evidencias.length - 5} evidencias más`);
    }
    console.log('');
    console.log('✍️ FIRMAS:');
    console.log(`   tecnico: tipo="${dto.firmas?.tecnico?.tipo}", idPersona=${dto.firmas?.tecnico?.idPersona}`);
    console.log(`   cliente: ${dto.firmas?.cliente ? `tipo="${dto.firmas.cliente.tipo}"` : 'NO ENVIADA'}`);
    console.log('');
    console.log('📝 ACTIVIDADES recibidas:', dto.actividades?.length || 0);
    dto.actividades?.slice(0, 3).forEach((act, i) => {
      console.log(`   [${i}] sistema="${act.sistema}", resultado="${act.resultado}"`);
    });
    console.log('');
    console.log('📏 MEDICIONES:', dto.mediciones?.length || 0);
    console.log(`⏰ HORA ENTRADA: "${dto.horaEntrada}"`);
    console.log(`⏰ HORA SALIDA: "${dto.horaSalida}"`);
    console.log(`📝 OBSERVACIONES: "${dto.observaciones?.substring(0, 50)}..."`);
    console.log(`🎛️ MODO FINALIZACIÓN: "${dto.modo || 'COMPLETO (default)'}"`);
    console.log('');
    console.log('🔬 ═══════════════════════════════════════════════════════════════');
    console.log('');

    // Construir DTO interno con ID de orden
    const finalizarDto = {
      idOrden: parseInt(id, 10),
      evidencias: dto.evidencias.map(e => ({
        tipo: e.tipo as 'ANTES' | 'DURANTE' | 'DESPUES' | 'MEDICION',
        base64: e.base64,
        descripcion: e.descripcion,
        formato: e.formato,
        // ✅ FIX 17-DIC-2025: Incluir idOrdenEquipo para multi-equipos
        idOrdenEquipo: e.idOrdenEquipo,
      })),
      firmas: {
        tecnico: {
          tipo: 'TECNICO' as const,
          base64: dto.firmas.tecnico.base64,
          idPersona: dto.firmas.tecnico.idPersona,
          formato: dto.firmas.tecnico.formato,
        },
        cliente: dto.firmas.cliente ? {
          tipo: 'CLIENTE' as const,
          base64: dto.firmas.cliente.base64,
          idPersona: dto.firmas.cliente.idPersona,
          formato: dto.firmas.cliente.formato,
          // ✅ FIX 06-FEB-2026: Pasar nombre y cargo del firmante cliente al servicio
          nombreFirmante: dto.firmas.cliente.nombreFirmante,
          cargoFirmante: dto.firmas.cliente.cargoFirmante,
        } : undefined,
      },
      actividades: dto.actividades.map(a => ({
        sistema: a.sistema,
        descripcion: a.descripcion,
        resultado: a.resultado as 'B' | 'M' | 'C' | 'N/A',
        observaciones: a.observaciones,
      })),
      mediciones: dto.mediciones?.map(m => ({
        parametro: m.parametro,
        valor: m.valor,
        unidad: m.unidad,
        nivelAlerta: m.nivelAlerta as 'OK' | 'WARNING' | 'CRITICAL' | undefined,
      })),
      observaciones: dto.observaciones,
      datosModulo: dto.datosModulo,
      horaEntrada: dto.horaEntrada,
      horaSalida: dto.horaSalida,
      emailAdicional: dto.emailAdicional,
      usuarioId: userId || 1, // Fallback si JWT no disponible
      // ✅ FIX 19-FEB-2026: SIEMPRE SOLO_DATOS - PDF y email desde Admin Portal
      modo: 'SOLO_DATOS' as 'COMPLETO' | 'SOLO_DATOS',
    };

    // Ejecutar flujo de finalización (solo datos, sin PDF ni email)
    const result = await this.finalizacionService.finalizarOrden(finalizarDto);

    return {
      success: result.success,
      message: result.mensaje,
      data: result.datos,
      tiempoTotal: `${result.tiempoTotal}ms`,
    };
  }

  /**
   * ==========================================================================
   * POST /api/ordenes/:id/finalizar-completo-stream
   * ==========================================================================
   * 
   * ENDPOINT CON STREAMING DE PROGRESO EN TIEMPO REAL
   * 
   * Este endpoint ejecuta el mismo flujo de finalización pero emite eventos
   * Server-Sent Events (SSE) para que el cliente pueda mostrar el progreso
   * en tiempo real.
   * 
   * Cada evento tiene el formato:
   * {
   *   step: 'validando' | 'evidencias' | 'firmas' | 'generando_pdf' | ...
   *   status: 'pending' | 'in_progress' | 'completed' | 'error'
   *   message: 'Mensaje descriptivo'
   *   progress: 0-100
   *   timestamp: 1234567890
   * }
   */
  @Post(':id/finalizar-completo-stream')
  @HttpCode(200) // ✅ SSE requiere 200, no 201 (default de @Post)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Finalizar orden con streaming de progreso',
    description: 'Ejecuta el flujo completo de finalización emitiendo eventos SSE de progreso en tiempo real.',
  })
  @ApiParam({ name: 'id', description: 'ID de la orden de servicio', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Stream de eventos SSE con el progreso de la finalización.',
  })
  async finalizarCompletoStream(
    @Param('id') id: string,
    @Body() dto: FinalizarOrdenCompletoDto,
    @UserId() userId: number,
    @Res() res: Response,
  ) {
    // ✅ FIX 20-DIC-2025: Establecer status 200 explícitamente para SSE
    // Cuando usamos @Res(), @HttpCode() no aplica automáticamente
    res.status(200);

    // Configurar headers para SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Para nginx
    res.flushHeaders();

    // Helper para enviar eventos SSE
    const sendEvent = (event: ProgressEvent) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    try {
      // Construir DTO interno con ID de orden
      const finalizarDto = {
        idOrden: parseInt(id, 10),
        evidencias: dto.evidencias.map(e => ({
          tipo: e.tipo as 'ANTES' | 'DURANTE' | 'DESPUES' | 'MEDICION',
          base64: e.base64,
          descripcion: e.descripcion,
          formato: e.formato,
          idOrdenEquipo: e.idOrdenEquipo,
        })),
        firmas: {
          tecnico: {
            tipo: 'TECNICO' as const,
            base64: dto.firmas.tecnico.base64,
            idPersona: dto.firmas.tecnico.idPersona,
            formato: dto.firmas.tecnico.formato,
          },
          cliente: dto.firmas.cliente ? {
            tipo: 'CLIENTE' as const,
            base64: dto.firmas.cliente.base64,
            idPersona: dto.firmas.cliente.idPersona,
            formato: dto.firmas.cliente.formato,
          } : undefined,
        },
        actividades: dto.actividades.map(a => ({
          sistema: a.sistema,
          descripcion: a.descripcion,
          resultado: a.resultado as 'B' | 'M' | 'C' | 'N/A',
          observaciones: a.observaciones,
        })),
        mediciones: dto.mediciones?.map(m => ({
          parametro: m.parametro,
          valor: m.valor,
          unidad: m.unidad,
          nivelAlerta: m.nivelAlerta as 'OK' | 'WARNING' | 'CRITICAL' | undefined,
        })),
        observaciones: dto.observaciones,
        datosModulo: dto.datosModulo,
        horaEntrada: dto.horaEntrada,
        horaSalida: dto.horaSalida,
        emailAdicional: dto.emailAdicional,
        usuarioId: userId || 1,
        // ✅ FIX 19-FEB-2026: SIEMPRE SOLO_DATOS - PDF y email desde Admin Portal
        modo: 'SOLO_DATOS' as 'COMPLETO' | 'SOLO_DATOS',
      };

      // Ejecutar flujo de finalización con callback de progreso (solo datos)
      const result = await this.finalizacionService.finalizarOrden(
        finalizarDto,
        (event) => sendEvent(event), // Callback para emitir eventos SSE
      );

      // Enviar resultado final
      res.write(`data: ${JSON.stringify({
        step: 'result',
        status: 'completed',
        message: result.mensaje,
        progress: 100,
        timestamp: Date.now(),
        data: {
          success: result.success,
          datos: result.datos,
          tiempoTotal: result.tiempoTotal,
        },
      })}\n\n`);

      // Cerrar stream
      res.end();

    } catch (error) {
      const err = error as Error;

      // Enviar evento de error
      res.write(`data: ${JSON.stringify({
        step: 'error',
        status: 'error',
        message: err.message,
        progress: 0,
        timestamp: Date.now(),
      })}\n\n`);

      // Cerrar stream
      res.end();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ✅ FIX 13-MAR-2026: TRANSFERIR DATOS ENTRE ÓRDENES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * POST /api/ordenes/:id/transferir-datos
   * Transfiere TODOS los datos/evidencias/firmas de una orden origen a esta orden destino.
   * La orden destino NO debe estar COMPLETADA ni APROBADA.
   */
  @Post(':id/transferir-datos')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Transferir datos completos de otra orden',
    description: 'Copia todos los datos (campos directos, actividades, evidencias, mediciones, firmas, componentes) de una orden origen a la orden destino.',
  })
  @ApiParam({ name: 'id', description: 'ID de la orden DESTINO', type: Number })
  @ApiResponse({ status: 200, description: 'Datos transferidos exitosamente' })
  async transferirDatosOrden(
    @Param('id', ParseIntPipe) idDestino: number,
    @Body() body: { idOrdenOrigen: number },
    @UserId() userId: number,
  ) {
    const { idOrdenOrigen } = body;

    if (!idOrdenOrigen || typeof idOrdenOrigen !== 'number') {
      throw new BadRequestException('Debe proporcionar idOrdenOrigen (numérico)');
    }

    if (idOrdenOrigen === idDestino) {
      throw new BadRequestException('La orden origen y destino no pueden ser la misma');
    }

    console.log(`🔄 [TRANSFER] Iniciando transferencia: Orden #${idOrdenOrigen} → Orden #${idDestino}`);

    // 1. Validar que ambas órdenes existen
    const [ordenOrigen, ordenDestino] = await Promise.all([
      this.prisma.ordenes_servicio.findUnique({
        where: { id_orden_servicio: idOrdenOrigen },
        include: { estados_orden: true },
      }),
      this.prisma.ordenes_servicio.findUnique({
        where: { id_orden_servicio: idDestino },
        include: { estados_orden: true },
      }),
    ]);

    if (!ordenOrigen) {
      throw new NotFoundException(`Orden origen #${idOrdenOrigen} no encontrada`);
    }
    if (!ordenDestino) {
      throw new NotFoundException(`Orden destino #${idDestino} no encontrada`);
    }

    // 2. Validar que destino NO esté en COMPLETADA o APROBADA
    const estadoDestino = ordenDestino.estados_orden?.nombre_estado?.toUpperCase();
    if (estadoDestino === 'COMPLETADA' || estadoDestino === 'APROBADA') {
      throw new BadRequestException(
        `La orden destino #${idDestino} está en estado "${estadoDestino}" y no se puede sobrescribir. Solo se puede transferir a órdenes no completadas.`
      );
    }

    console.log(`🔄 [TRANSFER] Orden origen: ${ordenOrigen.numero_orden} (estado: ${ordenOrigen.estados_orden?.nombre_estado})`);
    console.log(`🔄 [TRANSFER] Orden destino: ${ordenDestino.numero_orden} (estado: ${estadoDestino})`);

    // 3. Ejecutar transferencia en transacción atómica
    const resultado = await this.prisma.$transaction(async (tx) => {
      const stats = {
        camposDirectos: false,
        ordenesEquipos: 0,
        actividadesEjecutadas: 0,
        evidenciasFotograficas: 0,
        medicionesServicio: 0,
        componentesUsados: 0,
        ordenesActividadesPlan: 0,
      };

      // ── PASO A: Limpiar datos existentes en destino (orden inverso de dependencias) ──
      console.log(`🗑️ [TRANSFER] Limpiando datos existentes en orden destino #${idDestino}...`);

      await tx.componentes_usados.deleteMany({ where: { id_orden_servicio: idDestino } });
      await tx.evidencias_fotograficas.deleteMany({ where: { id_orden_servicio: idDestino } });
      await tx.mediciones_servicio.deleteMany({ where: { id_orden_servicio: idDestino } });
      await tx.actividades_ejecutadas.deleteMany({ where: { id_orden_servicio: idDestino } });
      await tx.ordenes_equipos.deleteMany({ where: { id_orden_servicio: idDestino } });
      await tx.ordenes_actividades_plan.deleteMany({ where: { id_orden_servicio: idDestino } });

      // ── PASO B: Copiar campos directos de la orden ──
      console.log(`📋 [TRANSFER] Copiando campos directos...`);

      await tx.ordenes_servicio.update({
        where: { id_orden_servicio: idDestino },
        data: {
          id_estado_actual: ordenOrigen.id_estado_actual, // ✅ Transferir estado
          trabajo_realizado: ordenOrigen.trabajo_realizado,
          observaciones_tecnico: ordenOrigen.observaciones_tecnico,
          observaciones_cierre: ordenOrigen.observaciones_cierre,
          descripcion_inicial: ordenOrigen.descripcion_inicial,
          fecha_inicio_real: ordenOrigen.fecha_inicio_real,
          fecha_fin_real: ordenOrigen.fecha_fin_real,
          duracion_minutos: ordenOrigen.duracion_minutos,
          nombre_quien_recibe: ordenOrigen.nombre_quien_recibe,
          cargo_quien_recibe: ordenOrigen.cargo_quien_recibe,
          cliente_conforme: ordenOrigen.cliente_conforme,
          calificacion_cliente: ordenOrigen.calificacion_cliente,
          tiene_garantia: ordenOrigen.tiene_garantia,
          meses_garantia: ordenOrigen.meses_garantia,
          fecha_vencimiento_garantia: ordenOrigen.fecha_vencimiento_garantia,
          observaciones_garantia: ordenOrigen.observaciones_garantia,
          id_firma_cliente: ordenOrigen.id_firma_cliente,
          id_firma_tecnico: ordenOrigen.id_firma_tecnico,
          metadata: ordenOrigen.metadata ?? undefined,
          total_servicios: ordenOrigen.total_servicios,
          total_gastos: ordenOrigen.total_gastos,
          total_componentes: ordenOrigen.total_componentes,
          total_general: ordenOrigen.total_general,
          modificado_por: userId || null,
          fecha_modificacion: new Date(),
        },
      });
      stats.camposDirectos = true;

      // ✅ Crear registro en historial de estados
      await tx.historial_estados_orden.create({
        data: {
          id_orden_servicio: idDestino,
          id_estado_nuevo: ordenOrigen.id_estado_actual,
          observaciones: `Estado transferido desde orden ${ordenOrigen.numero_orden} (ID: ${idOrdenOrigen})`,
          fecha_cambio: new Date(),
          realizado_por: userId || 1, // Usuario del sistema si no hay userId
        },
      });
      console.log(`🔄 [TRANSFER] Estado actualizado: ${ordenOrigen.estados_orden?.nombre_estado}`);

      // ── PASO C: Copiar ordenes_equipos (tabla pivote orden-equipo) ──
      const equiposOrigen = await tx.ordenes_equipos.findMany({
        where: { id_orden_servicio: idOrdenOrigen },
        orderBy: { orden_secuencia: 'asc' },
      });

      // Mapa de ID viejo → ID nuevo para ordenes_equipos
      const mapEquipos = new Map<number, number>();

      for (const eq of equiposOrigen) {
        const nuevoEq = await tx.ordenes_equipos.create({
          data: {
            id_orden_servicio: idDestino,
            id_equipo: eq.id_equipo,
            orden_secuencia: eq.orden_secuencia,
            nombre_sistema: eq.nombre_sistema,
            estado: eq.estado,
            fecha_inicio: eq.fecha_inicio,
            fecha_fin: eq.fecha_fin,
            observaciones: eq.observaciones,
            metadata: eq.metadata ?? undefined,
            creado_por: eq.creado_por,
            fecha_creacion: eq.fecha_creacion,
          },
        });
        mapEquipos.set(eq.id_orden_equipo, nuevoEq.id_orden_equipo);
        stats.ordenesEquipos++;
      }

      console.log(`📦 [TRANSFER] Copiados ${stats.ordenesEquipos} ordenes_equipos`);

      // ── PASO D: Copiar actividades_ejecutadas ──
      const actividadesOrigen = await tx.actividades_ejecutadas.findMany({
        where: { id_orden_servicio: idOrdenOrigen },
        orderBy: { orden_secuencia: 'asc' },
      });

      // Mapa de ID viejo → ID nuevo para actividades
      const mapActividades = new Map<number, number>();

      for (const act of actividadesOrigen) {
        const nuevoIdOrdenEquipo = act.id_orden_equipo ? mapEquipos.get(act.id_orden_equipo) ?? null : null;
        const nuevaAct = await tx.actividades_ejecutadas.create({
          data: {
            id_orden_servicio: idDestino,
            id_actividad_catalogo: act.id_actividad_catalogo,
            descripcion_manual: act.descripcion_manual,
            sistema: act.sistema,
            orden_secuencia: act.orden_secuencia,
            estado: act.estado,
            observaciones: act.observaciones,
            ejecutada: act.ejecutada,
            fecha_ejecucion: act.fecha_ejecucion,
            ejecutada_por: act.ejecutada_por,
            tiempo_ejecucion_minutos: act.tiempo_ejecucion_minutos,
            requiere_evidencia: act.requiere_evidencia,
            evidencia_capturada: act.evidencia_capturada,
            fecha_registro: act.fecha_registro,
            id_orden_equipo: nuevoIdOrdenEquipo,
          },
        });
        mapActividades.set(act.id_actividad_ejecutada, nuevaAct.id_actividad_ejecutada);
        stats.actividadesEjecutadas++;
      }

      console.log(`⚡ [TRANSFER] Copiadas ${stats.actividadesEjecutadas} actividades_ejecutadas`);

      // ── PASO E: Copiar evidencias_fotograficas ──
      const evidenciasOrigen = await tx.evidencias_fotograficas.findMany({
        where: { id_orden_servicio: idOrdenOrigen },
        orderBy: { orden_visualizacion: 'asc' },
      });

      for (const ev of evidenciasOrigen) {
        const nuevoIdOrdenEquipo = ev.id_orden_equipo ? mapEquipos.get(ev.id_orden_equipo) ?? null : null;
        const nuevoIdActividad = ev.id_actividad_ejecutada ? mapActividades.get(ev.id_actividad_ejecutada) ?? null : null;

        await tx.evidencias_fotograficas.create({
          data: {
            id_orden_servicio: idDestino,
            id_actividad_ejecutada: nuevoIdActividad,
            tipo_evidencia: ev.tipo_evidencia,
            descripcion: ev.descripcion,
            nombre_archivo: ev.nombre_archivo,
            ruta_archivo: ev.ruta_archivo,
            hash_sha256: ev.hash_sha256,
            tama_o_bytes: ev.tama_o_bytes,
            mime_type: ev.mime_type,
            ancho_pixels: ev.ancho_pixels,
            alto_pixels: ev.alto_pixels,
            orden_visualizacion: ev.orden_visualizacion,
            es_principal: ev.es_principal,
            fecha_captura: ev.fecha_captura,
            capturada_por: ev.capturada_por,
            latitud: ev.latitud,
            longitud: ev.longitud,
            metadata_exif: ev.metadata_exif ?? undefined,
            tiene_miniatura: ev.tiene_miniatura,
            ruta_miniatura: ev.ruta_miniatura,
            esta_comprimida: ev.esta_comprimida,
            tama_o_original_bytes: ev.tama_o_original_bytes,
            fecha_registro: ev.fecha_registro,
            id_orden_equipo: nuevoIdOrdenEquipo,
          },
        });
        stats.evidenciasFotograficas++;
      }

      console.log(`📸 [TRANSFER] Copiadas ${stats.evidenciasFotograficas} evidencias_fotograficas`);

      // ── PASO F: Copiar mediciones_servicio ──
      const medicionesOrigen = await tx.mediciones_servicio.findMany({
        where: { id_orden_servicio: idOrdenOrigen },
      });

      for (const med of medicionesOrigen) {
        const nuevoIdOrdenEquipo = med.id_orden_equipo ? mapEquipos.get(med.id_orden_equipo) ?? null : null;

        await tx.mediciones_servicio.create({
          data: {
            id_orden_servicio: idDestino,
            id_parametro_medicion: med.id_parametro_medicion,
            valor_numerico: med.valor_numerico,
            valor_texto: med.valor_texto,
            unidad_medida: med.unidad_medida,
            fuera_de_rango: med.fuera_de_rango,
            nivel_alerta: med.nivel_alerta,
            mensaje_alerta: med.mensaje_alerta,
            observaciones: med.observaciones,
            temperatura_ambiente: med.temperatura_ambiente,
            humedad_relativa: med.humedad_relativa,
            fecha_medicion: med.fecha_medicion,
            medido_por: med.medido_por,
            instrumento_medicion: med.instrumento_medicion,
            fecha_registro: med.fecha_registro,
            id_orden_equipo: nuevoIdOrdenEquipo,
          },
        });
        stats.medicionesServicio++;
      }

      console.log(`📏 [TRANSFER] Copiadas ${stats.medicionesServicio} mediciones_servicio`);

      // ── PASO G: Copiar componentes_usados ──
      const componentesOrigen = await tx.componentes_usados.findMany({
        where: { id_orden_servicio: idOrdenOrigen },
      });

      for (const comp of componentesOrigen) {
        const nuevoIdActividad = comp.id_actividad_ejecutada ? mapActividades.get(comp.id_actividad_ejecutada) ?? null : null;

        // Generar nuevo ID (no es autoincrement)
        const maxComp = await tx.componentes_usados.findFirst({
          orderBy: { id_componente_usado: 'desc' },
          select: { id_componente_usado: true },
        });
        const nuevoId = (maxComp?.id_componente_usado ?? 0) + 1;

        await tx.componentes_usados.create({
          data: {
            id_componente_usado: nuevoId,
            id_orden_servicio: idDestino,
            id_componente: comp.id_componente,
            id_tipo_componente: comp.id_tipo_componente,
            id_actividad_ejecutada: nuevoIdActividad,
            descripcion: comp.descripcion,
            referencia_manual: comp.referencia_manual,
            marca_manual: comp.marca_manual,
            cantidad: comp.cantidad,
            unidad: comp.unidad,
            costo_unitario: comp.costo_unitario,
            costo_total: comp.costo_total,
            estado_componente_retirado: comp.estado_componente_retirado,
            razon_uso: comp.razon_uso,
            componente_guardado: comp.componente_guardado,
            origen_componente: comp.origen_componente,
            observaciones: comp.observaciones,
            fecha_uso: comp.fecha_uso,
            usado_por: comp.usado_por,
            fecha_registro: comp.fecha_registro,
            registrado_por: comp.registrado_por,
          },
        });
        stats.componentesUsados++;
      }

      console.log(`🔧 [TRANSFER] Copiados ${stats.componentesUsados} componentes_usados`);

      // ── PASO H: Copiar ordenes_actividades_plan ──
      const planOrigen = await tx.ordenes_actividades_plan.findMany({
        where: { id_orden_servicio: idOrdenOrigen },
        orderBy: { orden_secuencia: 'asc' },
      });

      for (const plan of planOrigen) {
        await tx.ordenes_actividades_plan.create({
          data: {
            id_orden_servicio: idDestino,
            id_actividad_catalogo: plan.id_actividad_catalogo,
            orden_secuencia: plan.orden_secuencia,
            origen: plan.origen,
            es_obligatoria: plan.es_obligatoria,
            creado_por: plan.creado_por,
            fecha_creacion: plan.fecha_creacion,
          },
        });
        stats.ordenesActividadesPlan++;
      }

      console.log(`📋 [TRANSFER] Copiados ${stats.ordenesActividadesPlan} ordenes_actividades_plan`);

      return stats;
    }, {
      timeout: 60000, // 60 segundos para transacciones grandes
    });

    console.log(`✅ [TRANSFER] Transferencia completada exitosamente: ${ordenOrigen.numero_orden} → ${ordenDestino.numero_orden}`);
    console.log(`📊 [TRANSFER] Resumen: ${JSON.stringify(resultado)}`);

    return {
      success: true,
      message: `Datos transferidos exitosamente de ${ordenOrigen.numero_orden} a ${ordenDestino.numero_orden}`,
      ordenOrigen: {
        id: idOrdenOrigen,
        numero: ordenOrigen.numero_orden,
      },
      ordenDestino: {
        id: idDestino,
        numero: ordenDestino.numero_orden,
      },
      estadisticas: resultado,
    };
  }

}
