import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Allow, IsArray, IsBoolean, IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

/**
 * DTO estrictamente validado para creación en historial_envios.
 */
export class CreateHistorialEnviosDto {
  @ApiProperty()
  @IsString()
  tipo_documento!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_cotizacion?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_propuesta?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_envio?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  enviado_por!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  canal_envio?: string;

  @ApiProperty()
  @IsString()
  destinatario_email!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  destinatario_nombre?: string;

  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  emails_copia!: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  asunto_email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cuerpo_email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ruta_pdf_generado?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tama_o_pdf_bytes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hash_pdf_sha256?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Allow()
  archivos_adjuntos?: Record<string, unknown> | unknown[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  estado_envio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mensaje_error?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id_mensaje_externo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  email_abierto?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fecha_apertura?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  contador_aperturas?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ip_apertura?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  user_agent_apertura?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Allow()
  metadata?: Record<string, unknown> | unknown[];
}
