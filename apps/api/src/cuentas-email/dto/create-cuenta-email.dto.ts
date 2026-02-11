import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCuentaEmailDto {
  @ApiProperty({ description: 'Nombre descriptivo de la cuenta', example: 'Cuenta Principal Mekanos' })
  @IsString()
  @MinLength(3)
  nombre: string;

  @ApiProperty({ description: 'Dirección de email', example: 'mekanossas4@gmail.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Gmail API Client ID' })
  @IsString()
  gmail_client_id: string;

  @ApiProperty({ description: 'Gmail API Client Secret' })
  @IsString()
  gmail_client_secret: string;

  @ApiProperty({ description: 'Gmail API Refresh Token' })
  @IsString()
  gmail_refresh_token: string;

  @ApiPropertyOptional({ description: 'Si es la cuenta principal por defecto', default: false })
  @IsBoolean()
  @IsOptional()
  es_cuenta_principal?: boolean;

  @ApiPropertyOptional({ description: 'Si la cuenta está activa', default: true })
  @IsBoolean()
  @IsOptional()
  activa?: boolean;
}
