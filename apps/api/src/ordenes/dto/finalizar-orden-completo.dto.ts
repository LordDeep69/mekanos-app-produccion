/**
 * ============================================================================
 * DTOs para Finalización Completa de Orden - MEKANOS S.A.S
 * ============================================================================
 * 
 * Estos DTOs validan los datos enviados desde el frontend para finalizar
 * una orden de servicio con todo el flujo completo:
 * - Evidencias fotográficas
 * - Firmas digitales
 * - Actividades ejecutadas
 * - Mediciones
 * - Observaciones
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    ArrayMaxSize,
    ArrayMinSize,
    IsArray,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    MaxLength,
    Min,
    ValidateNested
} from 'class-validator';

// ============================================================================
// ENUMS
// ============================================================================

export enum TipoEvidencia {
    ANTES = 'ANTES',
    DURANTE = 'DURANTE',
    DESPUES = 'DESPUES',
    DESPUÉS = 'DESPUÉS', // Con tilde
    MEDICION = 'MEDICION', // Para evidencias de mediciones
}

export enum TipoFirma {
    TECNICO = 'TECNICO',
    CLIENTE = 'CLIENTE',
}

export enum ResultadoActividad {
    B = 'B',     // Bueno
    M = 'M',     // Malo
    C = 'C',     // Corregido
    NA = 'N/A',  // No Aplica
    NA2 = 'NA',  // No Aplica (sin slash)
}

export enum NivelAlerta {
    OK = 'OK',
    WARNING = 'WARNING',
    CRITICAL = 'CRITICAL',
}

// ============================================================================
// DTOs ANIDADOS
// ============================================================================

/**
 * Evidencia fotográfica
 */
export class EvidenciaDto {
    @ApiProperty({ description: 'Tipo de evidencia: ANTES, DURANTE, DESPUES' })
    @IsString()
    @IsNotEmpty()
    tipo: string; // Aceptar cualquier string para compatibilidad

    @ApiProperty({ description: 'Imagen en Base64 (sin prefijo data:image)' })
    @IsString()
    @IsNotEmpty()
    base64: string;

    @ApiPropertyOptional({ description: 'Descripción de la evidencia' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    descripcion?: string;

    @ApiPropertyOptional({ description: 'Formato de imagen', default: 'png' })
    @IsOptional()
    @IsString()
    formato?: 'png' | 'jpg' | 'jpeg';

    @ApiPropertyOptional({ description: 'ID del orden-equipo (para multi-equipos)' })
    @IsOptional()
    @IsNumber()
    idOrdenEquipo?: number;
}

/**
 * Firma digital
 */
export class FirmaDto {
    @ApiProperty({ enum: TipoFirma, description: 'Tipo de firma' })
    @IsEnum(TipoFirma)
    @IsNotEmpty()
    tipo: TipoFirma;

    @ApiProperty({ description: 'Firma en Base64 (sin prefijo data:image)' })
    @IsString()
    @IsNotEmpty()
    base64: string;

    @ApiProperty({ description: 'ID de la persona que firma (0 = sin registro específico)' })
    @IsNumber()
    @Min(0) // Permitir 0 para clientes sin registro específico
    idPersona: number;

    @ApiPropertyOptional({ description: 'Formato de imagen', default: 'png' })
    @IsOptional()
    @IsString()
    formato?: 'png' | 'jpg' | 'jpeg';
}

/**
 * Contenedor de firmas
 */
export class FirmasContainerDto {
    @ApiProperty({ type: FirmaDto, description: 'Firma del técnico (obligatoria)' })
    @ValidateNested()
    @Type(() => FirmaDto)
    @IsNotEmpty()
    tecnico: FirmaDto;

    @ApiPropertyOptional({ type: FirmaDto, description: 'Firma del cliente (opcional)' })
    @ValidateNested()
    @Type(() => FirmaDto)
    @IsOptional()
    cliente?: FirmaDto;
}

/**
 * Actividad ejecutada
 */
export class ActividadDto {
    @ApiProperty({ description: 'Sistema al que pertenece la actividad' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    sistema: string;

    @ApiProperty({ description: 'Descripción de la actividad' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    descripcion: string;

    @ApiProperty({ description: 'Resultado: B=Bueno, M=Malo, C=Corregido, NA=No Aplica' })
    @IsString()
    @IsNotEmpty()
    resultado: string; // Aceptar cualquier string para compatibilidad

    @ApiPropertyOptional({ description: 'Observaciones adicionales' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    observaciones?: string;
}

/**
 * Medición realizada
 */
export class MedicionDto {
    @ApiProperty({ description: 'Nombre del parámetro medido' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    parametro: string;

    @ApiProperty({ description: 'Valor medido' })
    @IsNumber()
    valor: number;

    @ApiProperty({ description: 'Unidad de medida' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(20)
    unidad: string;

    @ApiPropertyOptional({ enum: NivelAlerta, description: 'Nivel de alerta', default: 'OK' })
    @IsOptional()
    @IsEnum(NivelAlerta)
    nivelAlerta?: NivelAlerta;
}

/**
 * Datos del módulo de control (para generadores)
 */
export class DatosModuloDto {
    @ApiPropertyOptional({ description: 'RPM del motor' })
    @IsOptional()
    @IsNumber()
    rpm?: number;

    @ApiPropertyOptional({ description: 'Presión de aceite (PSI)' })
    @IsOptional()
    @IsNumber()
    presionAceite?: number;

    @ApiPropertyOptional({ description: 'Temperatura del refrigerante (°C)' })
    @IsOptional()
    @IsNumber()
    temperaturaRefrigerante?: number;

    @ApiPropertyOptional({ description: 'Voltaje de carga de batería (V)' })
    @IsOptional()
    @IsNumber()
    cargaBateria?: number;

    @ApiPropertyOptional({ description: 'Horas de trabajo acumuladas' })
    @IsOptional()
    @IsNumber()
    horasTrabajo?: number;

    @ApiPropertyOptional({ description: 'Voltaje de salida (V)' })
    @IsOptional()
    @IsNumber()
    voltaje?: number;

    @ApiPropertyOptional({ description: 'Frecuencia (Hz)' })
    @IsOptional()
    @IsNumber()
    frecuencia?: number;

    @ApiPropertyOptional({ description: 'Corriente (A)' })
    @IsOptional()
    @IsNumber()
    corriente?: number;
}

// ============================================================================
// DTO PRINCIPAL
// ============================================================================

/**
 * DTO completo para finalizar una orden de servicio
 * 
 * Este DTO incluye TODOS los datos necesarios para:
 * - Subir evidencias a Cloudinary
 * - Registrar firmas digitales
 * - Generar PDF profesional
 * - Enviar email al cliente
 * - Actualizar estado de la orden
 */
export class FinalizarOrdenCompletoDto {
    @ApiProperty({
        type: [EvidenciaDto],
        description: 'Evidencias fotográficas (mínimo 1, máximo 50)',
        minItems: 1,
        maxItems: 50,
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => EvidenciaDto)
    @ArrayMinSize(1, { message: 'Debe incluir al menos una evidencia fotográfica' })
    @ArrayMaxSize(50, { message: 'Máximo 50 evidencias permitidas' })
    evidencias: EvidenciaDto[];

    @ApiProperty({
        type: FirmasContainerDto,
        description: 'Firmas digitales (técnico obligatorio, cliente opcional)'
    })
    @ValidateNested()
    @Type(() => FirmasContainerDto)
    @IsNotEmpty()
    firmas: FirmasContainerDto;

    @ApiProperty({
        type: [ActividadDto],
        description: 'Actividades ejecutadas durante el servicio',
        minItems: 1,
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ActividadDto)
    @ArrayMinSize(1, { message: 'Debe incluir al menos una actividad ejecutada' })
    actividades: ActividadDto[];

    @ApiPropertyOptional({
        type: [MedicionDto],
        description: 'Mediciones realizadas (opcional)'
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => MedicionDto)
    mediciones?: MedicionDto[];

    @ApiProperty({ description: 'Observaciones generales del servicio' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(2000)
    observaciones: string;

    @ApiPropertyOptional({
        type: DatosModuloDto,
        description: 'Datos del módulo de control (para generadores)'
    })
    @IsOptional()
    @ValidateNested()
    @Type(() => DatosModuloDto)
    datosModulo?: DatosModuloDto;

    @ApiProperty({ description: 'Hora de entrada al sitio (formato HH:MM)', example: '08:00' })
    @IsString()
    @IsNotEmpty()
    horaEntrada: string;

    @ApiProperty({ description: 'Hora de salida del sitio (formato HH:MM)', example: '12:30' })
    @IsString()
    @IsNotEmpty()
    horaSalida: string;

    @ApiPropertyOptional({ description: 'Email adicional para enviar copia del informe' })
    @IsOptional()
    @IsString()
    emailAdicional?: string;

    @ApiPropertyOptional({
        description: 'Razón de la falla (solo para correctivos). Si se llena, aparece en el PDF.',
        maxLength: 1000
    })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    razonFalla?: string;
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

/**
 * Respuesta de evidencia procesada
 */
export class EvidenciaResponseDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    tipo: string;

    @ApiProperty()
    url: string;
}

/**
 * Respuesta de firma procesada
 */
export class FirmaResponseDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    tipo: string;
}

/**
 * Respuesta de documento generado
 */
export class DocumentoResponseDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    url: string;

    @ApiProperty()
    filename: string;

    @ApiProperty()
    tamanioKB: number;
}

/**
 * Respuesta de email
 */
export class EmailResponseDto {
    @ApiProperty()
    enviado: boolean;

    @ApiProperty()
    destinatario: string;

    @ApiPropertyOptional()
    messageId?: string;
}

/**
 * Respuesta completa de finalización
 */
export class FinalizacionResponseDto {
    @ApiProperty()
    success: boolean;

    @ApiProperty()
    mensaje: string;

    @ApiProperty()
    datos: {
        orden: {
            id: number;
            numero: string;
            estado: string;
        };
        evidencias: EvidenciaResponseDto[];
        firmas: FirmaResponseDto[];
        documento: DocumentoResponseDto;
        email: EmailResponseDto;
    };

    @ApiProperty({ description: 'Tiempo total de procesamiento en milisegundos' })
    tiempoTotal: number;
}
