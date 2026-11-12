import { PrismaService } from '@mekanos/database';
import { Injectable, Logger } from '@nestjs/common';
import {
  evaluarValorContraRangos,
  EvaluacionRangoResult,
  extraerConfigEquipoDeOrden,
  ParametroCatalogoArquetipo,
  ResolvedParametroEquipo,
  resolverParametroConConfig,
  toFiniteNumber,
} from './parametros-override.helper';
import {
  ConfigParametrosEquipo,
  ConfigResuelta,
  ParametroResuelto,
  RangoParametro,
  UNIDADES_DEFAULT,
  UnidadesConfig,
} from './types/config-parametros.types';

/**
 * Servicio para resolución de configuración de parámetros de equipos
 *
 * Implementa resolución en cascada:
 * 1. equipos.config_parametros (override específico del equipo)
 * 2. plantillas_parametros.configuracion (plantilla por marca/modelo)
 * 3. parametros_medicion (catálogo global) - SIEMPRE como fallback
 *
 * REGLA DE ORO: Si config_parametros = {} o null, el sistema funciona
 * EXACTAMENTE igual que antes (usa catálogo global).
 */
@Injectable()
export class ConfigParametrosService {
  private readonly logger = new Logger(ConfigParametrosService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolver configuración completa para un equipo
   *
   * @param idEquipo - ID del equipo
   * @returns Configuración resuelta con origen
   */
  async resolverConfiguracion(idEquipo: number): Promise<ConfigResuelta> {
    // 1. Obtener equipo con su plantilla usando SQL raw (campos nuevos no tipados aún)
    // NOTA: Una vez que se ejecute `prisma generate`, esto puede usar el cliente tipado
    const equipos = await this.prisma.$queryRaw<
      Array<{
        id_equipo: number;
        config_parametros: any;
        id_plantilla_parametros: number | null;
        plantilla_config: any;
      }>
    >`
            SELECT 
                e.id_equipo,
                e.config_parametros,
                e.id_plantilla_parametros,
                p.configuracion as plantilla_config
            FROM equipos e
            LEFT JOIN plantillas_parametros p ON e.id_plantilla_parametros = p.id_plantilla
            WHERE e.id_equipo = ${idEquipo}
        `;

    const equipo = equipos[0];

    if (!equipo) {
      this.logger.warn(`[ConfigParametros] Equipo ${idEquipo} no encontrado, usando config global`);
      return {
        config: {},
        origen: 'global',
        idEquipo,
      };
    }

    // 2. PRIORIDAD 1: Config específica del equipo
    const configEquipo = equipo.config_parametros as ConfigParametrosEquipo | null;
    if (configEquipo && typeof configEquipo === 'object' && Object.keys(configEquipo).length > 0) {
      this.logger.debug(`[ConfigParametros] Usando config específica del equipo ${idEquipo}`);
      return {
        config: configEquipo,
        origen: 'equipo',
        idEquipo,
      };
    }

    // 3. PRIORIDAD 2: Config de plantilla
    if (equipo.plantilla_config) {
      const configPlantilla = equipo.plantilla_config as ConfigParametrosEquipo | null;
      if (
        configPlantilla &&
        typeof configPlantilla === 'object' &&
        Object.keys(configPlantilla).length > 0
      ) {
        this.logger.debug(
          `[ConfigParametros] Usando plantilla ${equipo.id_plantilla_parametros} para equipo ${idEquipo}`,
        );
        return {
          config: configPlantilla,
          origen: 'plantilla',
          idEquipo,
          idPlantilla: equipo.id_plantilla_parametros ?? undefined,
        };
      }
    }

    // 4. PRIORIDAD 3: Sin config personalizada (usa catálogo global)
    this.logger.debug(
      `[ConfigParametros] Equipo ${idEquipo} sin config personalizada, usando catálogo global`,
    );
    return {
      config: {},
      origen: 'global',
      idEquipo,
    };
  }

  /**
   * Obtener unidad de medida para un tipo de magnitud
   *
   * @param idEquipo - ID del equipo
   * @param tipoMagnitud - Tipo de magnitud (temperatura, presion, voltaje, etc.)
   * @returns Unidad de medida (ej: "°C", "PSI", "V")
   */
  async obtenerUnidad(idEquipo: number, tipoMagnitud: keyof UnidadesConfig): Promise<string> {
    const { config } = await this.resolverConfiguracion(idEquipo);

    // Buscar en config del equipo/plantilla
    if (config.unidades && config.unidades[tipoMagnitud]) {
      return config.unidades[tipoMagnitud]!;
    }

    // Fallback a unidad por defecto
    return UNIDADES_DEFAULT[tipoMagnitud] || '';
  }

  /**
   * Obtener unidades para todas las magnitudes de un equipo
   *
   * @param idEquipo - ID del equipo
   * @returns Objeto con todas las unidades
   */
  async obtenerTodasLasUnidades(idEquipo: number): Promise<UnidadesConfig> {
    const { config } = await this.resolverConfiguracion(idEquipo);

    // Merge: config del equipo tiene prioridad sobre defaults
    return {
      ...UNIDADES_DEFAULT,
      ...(config.unidades || {}),
    };
  }

  /**
   * Obtener rangos para un parámetro específico
   *
   * @param idEquipo - ID del equipo
   * @param codigoParametro - Código del parámetro (ej: "GEN_TEMP_REFRIGERANTE")
   * @returns Rangos del parámetro o undefined si no hay override
   */
  async obtenerRangosParametro(
    idEquipo: number,
    codigoParametro: string,
  ): Promise<RangoParametro | undefined> {
    const { config } = await this.resolverConfiguracion(idEquipo);

    const byPorParam =
      config.por_parametro?.[codigoParametro] ??
      config.por_parametro?.[codigoParametro.toUpperCase()];
    if (byPorParam) {
      return {
        min_normal: toFiniteNumber(byPorParam.min_normal),
        max_normal: toFiniteNumber(byPorParam.max_normal),
        min_critico: toFiniteNumber(byPorParam.min_critico),
        max_critico: toFiniteNumber(byPorParam.max_critico),
        valor_ideal: toFiniteNumber(byPorParam.valor_ideal),
      };
    }

    // Buscar en config del equipo/plantilla
    if (
      config.rangos &&
      (config.rangos[codigoParametro] || config.rangos[codigoParametro.toUpperCase()])
    ) {
      return config.rangos[codigoParametro] || config.rangos[codigoParametro.toUpperCase()];
    }

    // No hay override - el caller debe usar catálogo global
    return undefined;
  }

  /**
   * Resolver parámetro completo con config + catálogo global
   *
   * @param idEquipo - ID del equipo
   * @param codigoParametro - Código del parámetro
   * @returns Parámetro resuelto con todos sus valores
   */
  async resolverParametroCompleto(
    idEquipo: number,
    codigoParametro: string,
  ): Promise<ParametroResuelto | null> {
    // 1. Obtener parámetro del catálogo global
    const parametroGlobal = await this.prisma.parametros_medicion.findFirst({
      where: { codigo_parametro: codigoParametro },
    });

    if (!parametroGlobal) {
      this.logger.warn(
        `[ConfigParametros] Parámetro ${codigoParametro} no existe en catálogo global`,
      );
      return null;
    }

    // 2. Obtener config del equipo
    const { config, origen } = await this.resolverConfiguracion(idEquipo);
    const resolved = resolverParametroConConfig(parametroGlobal, config);

    const rango: RangoParametro = {
      min_normal: resolved.minNormal,
      max_normal: resolved.maxNormal,
      min_critico: resolved.minCritico,
      max_critico: resolved.maxCritico,
      valor_ideal: resolved.valorIdeal,
    };

    return {
      codigo: codigoParametro,
      nombre: parametroGlobal.nombre_parametro,
      unidad: resolved.unidadMedida,
      rango,
      origen: resolved.esPersonalizado ? origen : 'global',
    };
  }

  /**
   * Resuelve parámetros efectivos de medición para una orden/equipo sin consultar BD adicional.
   */
  resolverParametroParaOrden(
    parametroGlobal: any,
    orden: any,
    idOrdenEquipo?: number | null,
  ): ResolvedParametroEquipo {
    const { configEquipo, configPlantilla } = extraerConfigEquipoDeOrden(orden, idOrdenEquipo);
    return resolverParametroConConfig(parametroGlobal, configEquipo, configPlantilla);
  }

  /**
   * Evalúa un valor numérico contra los rangos efectivos del equipo (override -> plantilla -> global).
   */
  evaluarMedicionParaOrden(
    valor: number,
    parametroGlobal: any,
    orden: any,
    idOrdenEquipo?: number | null,
    fallbackSinRango: 'OK' | 'INFORMATIVO' = 'INFORMATIVO',
  ): { resolved: ResolvedParametroEquipo; evaluacion: EvaluacionRangoResult } {
    const resolved = this.resolverParametroParaOrden(parametroGlobal, orden, idOrdenEquipo);
    const evaluacion = evaluarValorContraRangos(
      valor,
      resolved,
      resolved.unidadMedida,
      fallbackSinRango,
    );
    return { resolved, evaluacion };
  }

  /**
   * Obtiene todos los parámetros de telemetría asociados a un Tipo de Equipo (arquetipo),
   * combinando parámetros directos (`parametros_medicion.id_tipo_equipo`) y parámetros
   * enlazados en protocolos/actividades de tipo MEDICION (`catalogo_actividades`),
   * incluyendo aliases históricos (`GENERADOR`<->`GEN`, `BOMBA`<->`BOM`, `MOTOR`<->`MOT`).
   */
  async obtenerParametrosCatalogoPorTipoEquipo(
    idTipoEquipo: number,
  ): Promise<ParametroCatalogoArquetipo[]> {
    const tiposActivos = await this.prisma.tipos_equipo.findMany({
      where: { activo: true },
      select: { id_tipo_equipo: true, codigo_tipo: true },
    });

    const seleccionado = tiposActivos.find((t) => t.id_tipo_equipo === idTipoEquipo);
    if (!seleccionado) return [];

    const gruposAlias = [
      ['GENERADOR', 'GEN'],
      ['BOMBA', 'BOM'],
      ['MOTOR', 'MOT'],
    ];
    const codigoSel = (seleccionado.codigo_tipo || '').toUpperCase();
    const grupo = gruposAlias.find((g) => g.includes(codigoSel));

    const targetIds = Array.from(
      new Set<number>(
        grupo
          ? tiposActivos
              .filter((t) => grupo.includes((t.codigo_tipo || '').toUpperCase()))
              .map((t) => t.id_tipo_equipo)
          : [idTipoEquipo],
      ),
    );

    const [parametros, unidadesActivas] = await Promise.all([
      this.prisma.parametros_medicion.findMany({
        where: {
          activo: true,
          OR: [
            { id_tipo_equipo: { in: targetIds } },
            {
              catalogo_actividades: {
                some: {
                  activo: true,
                  OR: [
                    { id_tipo_equipo: { in: targetIds } },
                    { tipos_servicio: { id_tipo_equipo: { in: targetIds } } },
                  ],
                },
              },
            },
          ],
        },
        include: {
          unidad_ref: {
            include: {
              magnitud: {
                select: { id_magnitud: true, codigo_magnitud: true, nombre_magnitud: true },
              },
            },
          },
          catalogo_actividades: {
            where: {
              activo: true,
              OR: [
                { id_tipo_equipo: { in: targetIds } },
                { tipos_servicio: { id_tipo_equipo: { in: targetIds } } },
              ],
            },
            include: {
              catalogo_sistemas: {
                select: { id_sistema: true, nombre_sistema: true },
              },
            },
            orderBy: { orden_ejecucion: 'asc' },
          },
        },
        orderBy: [{ es_obligatorio: 'desc' }, { categoria: 'asc' }, { nombre_parametro: 'asc' }],
      }),
      this.prisma.unidades_medida.findMany({
        where: { activo: true },
        select: {
          codigo: true,
          simbolo: true,
          id_magnitud: true,
          tipo_magnitud: true,
          magnitud: {
            select: { nombre_magnitud: true },
          },
        },
      }),
    ]);

    const findUomMeta = (unidadStr: string) => {
      const norm = unidadStr.trim().toLowerCase();
      if (!norm) return null;
      return (
        unidadesActivas.find(
          (u) => u.codigo.trim().toLowerCase() === norm || u.simbolo.trim().toLowerCase() === norm,
        ) ||
        // Alias comunes de voltios / horas heredados
        unidadesActivas.find((u) => {
          const c = u.codigo.trim().toLowerCase();
          if ((norm === 'vac' || norm === 'vdc') && c === 'v') return true;
          if (norm === 'hrs' && (c === 'h' || c === 'hr')) return true;
          return false;
        }) ||
        null
      );
    };

    const dedup = new Map<number, ParametroCatalogoArquetipo>();
    for (const p of parametros) {
      if (dedup.has(p.id_parametro_medicion)) continue;

      const uomMeta = p.unidad_ref ?? findUomMeta(p.unidad_medida || '');
      const sistema =
        p.catalogo_actividades.find((a) => a.catalogo_sistemas?.nombre_sistema)?.catalogo_sistemas
          ?.nombre_sistema || null;

      dedup.set(p.id_parametro_medicion, {
        id_parametro_medicion: p.id_parametro_medicion,
        codigo_parametro: p.codigo_parametro,
        nombre_parametro: p.nombre_parametro,
        unidad_medida: p.unidad_medida,
        unidad_codigo: p.unidad_codigo ?? null,
        id_magnitud: uomMeta?.id_magnitud ?? null,
        tipo_magnitud: uomMeta?.tipo_magnitud ?? null,
        nombre_magnitud: uomMeta?.magnitud?.nombre_magnitud ?? null,
        nombre_sistema: sistema,
        valor_minimo_normal: toFiniteNumber(p.valor_minimo_normal) ?? null,
        valor_maximo_normal: toFiniteNumber(p.valor_maximo_normal) ?? null,
        valor_minimo_critico: toFiniteNumber(p.valor_minimo_critico) ?? null,
        valor_maximo_critico: toFiniteNumber(p.valor_maximo_critico) ?? null,
        valor_ideal: toFiniteNumber(p.valor_ideal) ?? null,
        es_critico_seguridad: Boolean(p.es_critico_seguridad),
        es_obligatorio: Boolean(p.es_obligatorio),
        decimales_precision: p.decimales_precision ?? 2,
        tipo_dato: (p.tipo_dato as string) || 'NUMERICO',
      });
    }

    return Array.from(dedup.values()).sort((a, b) => {
      const sisA = a.nombre_sistema || 'ZZZ';
      const sisB = b.nombre_sistema || 'ZZZ';
      if (sisA !== sisB) return sisA.localeCompare(sisB);
      return a.nombre_parametro.localeCompare(b.nombre_parametro);
    });
  }

  /**
   * Guardar configuración de parámetros para un equipo preservando claves operativas (ej. planes_preventivos)
   */
  async guardarConfiguracion(
    idEquipo: number,
    config: ConfigParametrosEquipo,
    usuarioId: number,
  ): Promise<void> {
    const existingRows: Array<{ config_parametros: any }> = await this.prisma.$queryRaw`
            SELECT config_parametros FROM equipos WHERE id_equipo = ${idEquipo}
        `;
    const existing =
      existingRows?.[0]?.config_parametros && typeof existingRows[0].config_parametros === 'object'
        ? existingRows[0].config_parametros
        : {};

    const merged: ConfigParametrosEquipo = {
      ...config,
      ...(config.planes_preventivos === undefined && existing.planes_preventivos !== undefined
        ? { planes_preventivos: existing.planes_preventivos }
        : {}),
    };

    const configJson = JSON.stringify(merged);
    await this.prisma.$executeRaw`
            UPDATE equipos 
            SET config_parametros = ${configJson}::jsonb,
                modificado_por = ${usuarioId},
                fecha_modificacion = NOW()
            WHERE id_equipo = ${idEquipo}
        `;

    this.logger.log(
      `[ConfigParametros] Config actualizada para equipo ${idEquipo} por usuario ${usuarioId}`,
    );
  }

  /**
   * Asignar plantilla a un equipo
   *
   * @param idEquipo - ID del equipo
   * @param idPlantilla - ID de la plantilla
   * @param usuarioId - ID del usuario
   */
  async asignarPlantilla(
    idEquipo: number,
    idPlantilla: number | null,
    usuarioId: number,
  ): Promise<void> {
    // Usar SQL raw hasta que se regenere el cliente Prisma
    await this.prisma.$executeRaw`
            UPDATE equipos 
            SET id_plantilla_parametros = ${idPlantilla},
                modificado_por = ${usuarioId},
                fecha_modificacion = NOW()
            WHERE id_equipo = ${idEquipo}
        `;

    this.logger.log(`[ConfigParametros] Plantilla ${idPlantilla} asignada a equipo ${idEquipo}`);
  }
}
