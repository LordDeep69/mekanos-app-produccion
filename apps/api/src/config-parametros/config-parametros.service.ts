import { PrismaService } from '@mekanos/database';
import { Injectable, Logger } from '@nestjs/common';
import {
    ConfigParametrosEquipo,
    ConfigResuelta,
    MAGNITUD_A_PARAMETROS,
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

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Resolver configuración completa para un equipo
     * 
     * @param idEquipo - ID del equipo
     * @returns Configuración resuelta con origen
     */
    async resolverConfiguracion(idEquipo: number): Promise<ConfigResuelta> {
        // 1. Obtener equipo con su plantilla usando SQL raw (campos nuevos no tipados aún)
        // NOTA: Una vez que se ejecute `prisma generate`, esto puede usar el cliente tipado
        const equipos = await this.prisma.$queryRaw<Array<{
            id_equipo: number;
            config_parametros: any;
            id_plantilla_parametros: number | null;
            plantilla_config: any;
        }>>`
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
            if (configPlantilla && typeof configPlantilla === 'object' && Object.keys(configPlantilla).length > 0) {
                this.logger.debug(`[ConfigParametros] Usando plantilla ${equipo.id_plantilla_parametros} para equipo ${idEquipo}`);
                return {
                    config: configPlantilla,
                    origen: 'plantilla',
                    idEquipo,
                    idPlantilla: equipo.id_plantilla_parametros ?? undefined,
                };
            }
        }

        // 4. PRIORIDAD 3: Sin config personalizada (usa catálogo global)
        this.logger.debug(`[ConfigParametros] Equipo ${idEquipo} sin config personalizada, usando catálogo global`);
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

        // Buscar en config del equipo/plantilla
        if (config.rangos && config.rangos[codigoParametro]) {
            return config.rangos[codigoParametro];
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
        const parametroGlobal = await this.prisma.parametros_medicion.findUnique({
            where: { codigo_parametro: codigoParametro },
        });

        if (!parametroGlobal) {
            this.logger.warn(`[ConfigParametros] Parámetro ${codigoParametro} no existe en catálogo global`);
            return null;
        }

        // 2. Obtener config del equipo
        const { config, origen } = await this.resolverConfiguracion(idEquipo);

        // 3. Determinar unidad (override o global)
        let unidad = parametroGlobal.unidad_medida;
        const tipoMagnitud = this.detectarTipoMagnitud(codigoParametro);
        if (tipoMagnitud && config.unidades?.[tipoMagnitud]) {
            unidad = config.unidades[tipoMagnitud]!;
        }

        // 4. Determinar rangos (override o global)
        const rangosOverride = config.rangos?.[codigoParametro];
        const rango: RangoParametro = rangosOverride || {
            min_normal: parametroGlobal.valor_minimo_normal ? Number(parametroGlobal.valor_minimo_normal) : undefined,
            max_normal: parametroGlobal.valor_maximo_normal ? Number(parametroGlobal.valor_maximo_normal) : undefined,
            min_critico: parametroGlobal.valor_minimo_critico ? Number(parametroGlobal.valor_minimo_critico) : undefined,
            max_critico: parametroGlobal.valor_maximo_critico ? Number(parametroGlobal.valor_maximo_critico) : undefined,
            valor_ideal: parametroGlobal.valor_ideal ? Number(parametroGlobal.valor_ideal) : undefined,
        };

        return {
            codigo: codigoParametro,
            nombre: parametroGlobal.nombre_parametro,
            unidad,
            rango,
            origen: rangosOverride ? origen : 'global',
        };
    }

    /**
     * Detectar tipo de magnitud basado en código de parámetro
     */
    private detectarTipoMagnitud(codigoParametro: string): keyof UnidadesConfig | null {
        const codigoUpper = codigoParametro.toUpperCase();

        for (const [magnitud, codigos] of Object.entries(MAGNITUD_A_PARAMETROS)) {
            if (codigos.some(c => codigoUpper.includes(c))) {
                return magnitud as keyof UnidadesConfig;
            }
        }

        return null;
    }

    /**
     * Guardar configuración de parámetros para un equipo
     * 
     * @param idEquipo - ID del equipo
     * @param config - Configuración a guardar
     * @param usuarioId - ID del usuario que realiza el cambio
     */
    async guardarConfiguracion(
        idEquipo: number,
        config: ConfigParametrosEquipo,
        usuarioId: number,
    ): Promise<void> {
        // Usar SQL raw hasta que se regenere el cliente Prisma
        const configJson = JSON.stringify(config);
        await this.prisma.$executeRaw`
            UPDATE equipos 
            SET config_parametros = ${configJson}::jsonb,
                modificado_por = ${usuarioId},
                fecha_modificacion = NOW()
            WHERE id_equipo = ${idEquipo}
        `;

        this.logger.log(`[ConfigParametros] Config actualizada para equipo ${idEquipo} por usuario ${usuarioId}`);
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
