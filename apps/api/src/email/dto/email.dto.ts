/**
 * ============================================================================
 * EMAIL DTOs - MEKANOS S.A.S
 * ============================================================================
 * 
 * DTOs con validación completa para endpoints de envío de email.
 * Usan class-validator para validación automática.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    ArrayNotEmpty,
    IsArray,
    IsEmail,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    ValidateNested,
} from 'class-validator';

/**
 * Templates de email disponibles
 */
export enum TemplateEmail {
  ORDEN_COMPLETADA = 'ORDEN_COMPLETADA',
  INFORME_TECNICO = 'INFORME_TECNICO',
  COTIZACION = 'COTIZACION',
  RECORDATORIO = 'RECORDATORIO',
  PERSONALIZADO = 'PERSONALIZADO',
}

/**
 * DTO para archivo adjunto
 */
export class AdjuntoEmailDto {
  @ApiProperty({ description: 'Nombre del archivo con extensión', example: 'informe.pdf' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre del archivo es requerido' })
  filename: string;

  @ApiPropertyOptional({ 
    description: 'Tipo MIME del archivo', 
    example: 'application/pdf',
    default: 'application/octet-stream'
  })
  @IsOptional()
  @IsString()
  contentType?: string;

  @ApiProperty({ 
    description: 'Contenido del archivo en Base64', 
    example: 'JVBERi0xLjQKJeLjz9...' 
  })
  @IsString()
  @IsNotEmpty({ message: 'El contenido del archivo es requerido' })
  contentBase64: string;
}

/**
 * DTO para enviar email genérico
 */
export class EnviarEmailDto {
  @ApiProperty({
    description: 'Email(s) destinatario(s)',
    example: ['cliente@empresa.com'],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'Debe haber al menos un destinatario' })
  @IsEmail({}, { each: true, message: 'Cada destinatario debe ser un email válido' })
  to: string[];

  @ApiProperty({
    description: 'Asunto del email',
    example: '✅ Orden de Servicio Completada - ORD-2025-00001',
  })
  @IsString()
  @IsNotEmpty({ message: 'El asunto es requerido' })
  subject: string;

  @ApiProperty({
    description: 'Contenido HTML del email',
  })
  @IsString()
  @IsNotEmpty({ message: 'El contenido HTML es requerido' })
  html: string;

  @ApiPropertyOptional({
    description: 'Emails en copia (CC)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  cc?: string[];

  @ApiPropertyOptional({
    description: 'Emails en copia oculta (BCC)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  bcc?: string[];

  @ApiPropertyOptional({
    description: 'Archivos adjuntos',
    type: [AdjuntoEmailDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdjuntoEmailDto)
  attachments?: AdjuntoEmailDto[];
}

/**
 * DTO para enviar email con template predefinido
 */
export class EnviarEmailConTemplateDto {
  @ApiProperty({
    description: 'Email(s) destinatario(s)',
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsEmail({}, { each: true })
  to: string[];

  @ApiProperty({
    description: 'Template a usar',
    enum: TemplateEmail,
  })
  @IsEnum(TemplateEmail, { message: 'Template inválido' })
  template: TemplateEmail;

  @ApiProperty({
    description: 'Datos para el template',
    example: { numeroOrden: 'ORD-2025-00001', clienteNombre: 'Empresa XYZ' },
  })
  @IsNotEmpty()
  data: Record<string, any>;

  @ApiPropertyOptional({ description: 'Emails en copia', type: [String] })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  cc?: string[];

  @ApiPropertyOptional({
    description: 'Archivos adjuntos',
    type: [AdjuntoEmailDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdjuntoEmailDto)
  attachments?: AdjuntoEmailDto[];
}

/**
 * DTO para email de orden completada
 */
export class EnviarOrdenCompletadaDto {
  @ApiProperty({ description: 'Email del cliente' })
  @IsEmail({}, { message: 'Email del cliente inválido' })
  clienteEmail: string;

  @ApiProperty({ description: 'Número de la orden', example: 'ORD-2025-00001' })
  @IsString()
  @IsNotEmpty()
  numeroOrden: string;

  @ApiPropertyOptional({ description: 'URL del PDF de la orden' })
  @IsOptional()
  @IsString()
  pdfUrl?: string;

  @ApiPropertyOptional({ description: 'PDF en Base64 para adjuntar' })
  @IsOptional()
  @IsString()
  pdfBase64?: string;
}

/**
 * DTO para email de informe técnico
 */
export class EnviarInformeTecnicoDto {
  @ApiProperty({ description: 'Email del cliente' })
  @IsEmail()
  clienteEmail: string;

  @ApiProperty({ description: 'Número de la orden' })
  @IsString()
  @IsNotEmpty()
  ordenNumero: string;

  @ApiProperty({ description: 'Nombre del cliente' })
  @IsString()
  @IsNotEmpty()
  clienteNombre: string;

  @ApiProperty({ description: 'Descripción del equipo' })
  @IsString()
  @IsNotEmpty()
  equipoDescripcion: string;

  @ApiProperty({ description: 'Tipo de mantenimiento' })
  @IsString()
  @IsNotEmpty()
  tipoMantenimiento: string;

  @ApiProperty({ description: 'Fecha del servicio (ISO 8601)' })
  @IsString()
  fechaServicio: string;

  @ApiProperty({ description: 'Nombre del técnico' })
  @IsString()
  @IsNotEmpty()
  tecnicoNombre: string;

  @ApiPropertyOptional({ description: 'Observaciones adicionales' })
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiProperty({ description: 'PDF del informe en Base64' })
  @IsString()
  @IsNotEmpty({ message: 'El PDF del informe es requerido' })
  pdfBase64: string;
}

/**
 * DTO para email de prueba
 */
export class EnviarTestEmailDto {
  @ApiProperty({ description: 'Email de destino para la prueba' })
  @IsEmail({}, { message: 'Email inválido' })
  to: string;
}

/**
 * DTO de respuesta de envío de email
 */
export class EnviarEmailResponseDto {
  @ApiProperty({ description: 'Si el envío fue exitoso' })
  success: boolean;

  @ApiPropertyOptional({ description: 'ID del mensaje enviado' })
  messageId?: string;

  @ApiPropertyOptional({ description: 'Mensaje de error si falló' })
  error?: string;
}
