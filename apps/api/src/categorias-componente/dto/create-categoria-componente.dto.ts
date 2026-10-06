import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCategoriaComponenteDto {
  @ApiProperty({
    description: 'Nombre de la categoría o subcategoría técnica',
    example: 'Filtros de Aire de Cabina',
  })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre de la categoría es obligatorio' })
  @MaxLength(100, { message: 'El nombre no puede superar los 100 caracteres' })
  nombre: string;

  @ApiPropertyOptional({
    description: 'ID de la categoría padre (dejar vacío o null si es una familia raíz / nivel 1)',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El ID de la categoría padre debe ser un número entero' })
  id_padre?: number | null;

  @ApiPropertyOptional({
    description: 'Código único mnemotécnico (si se omite, se generará automáticamente a partir del nombre)',
    example: 'FILT-AIRE-CAB',
  })
  @IsOptional()
  @IsString({ message: 'El código debe ser una cadena de texto' })
  @MaxLength(50, { message: 'El código no puede superar los 50 caracteres' })
  codigo_categoria?: string;

  @ApiPropertyOptional({
    description: 'Descripción técnica del alcance o tipo de repuestos/insumos de esta categoría',
    example: 'Elementos filtrantes para sistemas HVAC y habitáculos de operadores',
  })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({
    description: 'Estado activo/inactivo de la categoría',
    default: true,
    example: true,
  })
  @IsOptional()
  activo?: boolean = true;
}
