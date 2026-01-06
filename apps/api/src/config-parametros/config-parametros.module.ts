import { Module } from '@nestjs/common';
import { ConfigParametrosService } from './config-parametros.service';

/**
 * Módulo de configuración de parámetros de equipos
 * 
 * Proporciona el servicio ConfigParametrosService para:
 * - Resolver configuración en cascada (equipo → plantilla → global)
 * - Obtener unidades de medida personalizadas
 * - Obtener rangos de parámetros personalizados
 */
@Module({
    providers: [ConfigParametrosService],
    exports: [ConfigParametrosService],
})
export class ConfigParametrosModule { }
