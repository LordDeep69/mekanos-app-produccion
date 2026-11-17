import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCuentaEmailDto {
  @ApiProperty({ description: 'Nombre descriptivo de la cuenta', example: 'Cuenta Notificaciones' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  nombre: string;

  @ApiProperty({ description: 'Dirección de email', example: 'notificaciones@empresa.com' })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiPropertyOptional({
    description: 'Proveedor de transporte de email',
    enum: ['GMAIL_OAUTH2', 'SMTP'],
    default: 'GMAIL_OAUTH2',
  })
  @IsOptional()
  @IsIn(['GMAIL_OAUTH2', 'SMTP'])
  tipo_proveedor?: 'GMAIL_OAUTH2' | 'SMTP';

  @ApiPropertyOptional({ description: 'Nombre visible del remitente en cabecera From' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  nombre_remitente?: string;

  @ApiPropertyOptional({ description: 'Descripción opcional de uso de la cuenta' })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ description: 'Gmail API Client ID (requerido si tipo_proveedor=GMAIL_OAUTH2)' })
  @IsOptional()
  @IsString()
  gmail_client_id?: string;

  @ApiPropertyOptional({
    description: 'Gmail API Client Secret (requerido si tipo_proveedor=GMAIL_OAUTH2)',
  })
  @IsOptional()
  @IsString()
  gmail_client_secret?: string;

  @ApiPropertyOptional({
    description: 'Gmail API Refresh Token (requerido si tipo_proveedor=GMAIL_OAUTH2)',
  })
  @IsOptional()
  @IsString()
  gmail_refresh_token?: string;

  @ApiPropertyOptional({ description: 'Servidor SMTP (requerido si tipo_proveedor=SMTP)' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  smtp_host?: string;

  @ApiPropertyOptional({ description: 'Puerto SMTP (ej. 465 o 587)', default: 465 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  smtp_port?: number;

  @ApiPropertyOptional({ description: 'Usar TLS directo en conexión SMTP', default: true })
  @IsOptional()
  @IsBoolean()
  smtp_secure?: boolean;

  @ApiPropertyOptional({ description: 'Usuario de autenticación SMTP' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  smtp_user?: string;

  @ApiPropertyOptional({ description: 'Contraseña SMTP (se cifra con AES-256-GCM en BD)' })
  @IsOptional()
  @IsString()
  smtp_password?: string;

  @ApiPropertyOptional({ description: 'Si es la cuenta principal por defecto', default: false })
  @IsBoolean()
  @IsOptional()
  es_cuenta_principal?: boolean;

  @ApiPropertyOptional({ description: 'Si la cuenta está activa', default: true })
  @IsBoolean()
  @IsOptional()
  activa?: boolean;
}
