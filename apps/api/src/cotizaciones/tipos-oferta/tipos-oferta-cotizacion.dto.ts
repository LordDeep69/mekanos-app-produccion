import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTipoOfertaCotizacionDto {
  @ApiProperty({ example: 'Overhaul Turbo Especial' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(120)
  nombre!: string;

  @ApiPropertyOptional({
    example: 'OVERHAUL_TURBO_ESPECIAL',
    description: 'Código estandarizado SNAKE_CASE (se autogenera desde nombre si se omite)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  codigo?: string;

  @ApiPropertyOptional({ example: 'Overhaul mayor de turboalimentador y pruebas de carga' })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  descripcion?: string | null;

  @ApiPropertyOptional({ example: 'OVR' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  badge?: string | null;
}

export class UpdateTipoOfertaCotizacionDto {
  @ApiPropertyOptional({ example: 'Overhaul Turbo Especializado' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  nombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(250)
  descripcion?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10)
  badge?: string | null;
}
