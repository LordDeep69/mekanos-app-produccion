/**
 * ============================================================================
 * COMMON SERVICES - Barrel Export
 * ============================================================================
 * 
 * Exporta todos los servicios comunes reutilizables:
 * 
 * - CommonServicesModule: Módulo global con todos los servicios
 * - NumeracionService: Generación de códigos automáticos
 * - MekanosFacadeService: Fachada unificada de servicios core (PDF, Email, Storage)
 * - ProgramacionFacadeService: Fachada de programación preventiva
 *
 * INTERFACES EXPORTADAS (MekanosFacade):
 * - GenerarPdfOrdenInput, GenerarPdfResult
 * - EnviarEmailInput, EnviarEmailResult
 * - SubirImagenInput, SubirImagenResult
 * - SubirPdfInput, SubirPdfResult
 * - CambiarEstadoOrdenInput, CambiarEstadoResult
 * - TipoDocumento, GenerarNumeroResult
 */

export * from './common-services.module';
export * from './mekanos-facade.service';
export * from './numeracion.service';
export * from './programacion-facade.service';

