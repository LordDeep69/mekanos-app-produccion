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
 * - CotizacionesFacadeService: Fachada para flujo comercial FASE 4 (cotizaciones, propuestas)
 * 
 * INTERFACES EXPORTADAS (MekanosFacade):
 * - GenerarPdfOrdenInput, GenerarPdfResult
 * - EnviarEmailInput, EnviarEmailResult
 * - SubirImagenInput, SubirImagenResult
 * - SubirPdfInput, SubirPdfResult
 * - CambiarEstadoOrdenInput, CambiarEstadoResult
 * - TipoDocumento, GenerarNumeroResult
 * 
 * INTERFACES EXPORTADAS (CotizacionesFacade):
 * - CrearCotizacionInput, ItemServicioInput, ItemComponenteInput
 * - EnviarCotizacionInput, CrearPropuestaInput
 * - CotizacionResult, EnvioCotizacionResult
 */

export * from './common-services.module';
export * from './cotizaciones-facade.service';
export * from './mekanos-facade.service';
export * from './numeracion.service';
export * from './programacion-facade.service';

