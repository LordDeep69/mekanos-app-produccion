import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class QueryUnidadMedidaDto {
  @ApiPropertyOptional({
    description: 'Filtrar por tipo de magnitud física (CANTIDAD, VOLUMEN, LONGITUD, MASA, CONJUNTO)',
    example: 'VOLUMEN',
  })
  @IsOptional()
  @IsString()
  tipo_magnitud?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por estado activo/inactivo',
    default: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true || value === 1 || value === '1')
  @IsBoolean()
  activo?: boolean = true;
}
