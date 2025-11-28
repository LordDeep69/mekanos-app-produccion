import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, Matches } from 'class-validator';

export class CrearCatalogoSistemasDto {
  @ApiProperty({ 
    description: 'Código único del sistema (se normalizará a MAYÚSCULAS)', 
    example: 'SIS_ENFRIAMIENTO',
    maxLength: 50
  })
  @IsString()
  @IsNotEmpty()
  codigoSistema: string;

  @ApiProperty({ 
    description: 'Nombre descriptivo del sistema', 
    example: 'Sistema de Enfriamiento',
    maxLength: 100
  })
  @IsString()
  @IsNotEmpty()
  nombreSistema: string;

  @ApiProperty({ 
    description: 'Descripción detallada del sistema', 
    example: 'Sistema responsable de la refrigeración del motor',
    required: false
  })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiProperty({ 
    description: 'Array de códigos de tipos_equipo a los que aplica este sistema', 
    example: ['GEN_DIESEL', 'GEN_GAS', 'BOMBA_CENTRIFUGA'],
    required: false,
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  aplicaA?: string[];

  @ApiProperty({ 
    description: 'Orden de visualización en la UI (debe ser positivo y único)', 
    example: 1,
    minimum: 1
  })
  @IsInt()
  @IsPositive()
  ordenVisualizacion: number;

  @ApiProperty({ 
    description: 'Nombre del icono (FontAwesome, Material Icons, etc.)', 
    example: 'fa-snowflake',
    required: false,
    maxLength: 50
  })
  @IsString()
  @IsOptional()
  icono?: string;

  @ApiProperty({ 
    description: 'Color hexadecimal para identificación visual (#RRGGBB)', 
    example: '#3498db',
    required: false,
    pattern: '^#[0-9A-Fa-f]{6}$'
  })
  @IsString()
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'El color debe estar en formato hexadecimal (#RRGGBB)' })
  colorHex?: string;

  @ApiProperty({ 
    description: 'Indica si el sistema está activo en el catálogo', 
    example: true,
    default: true,
    required: false
  })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;

  @ApiProperty({ 
    description: 'Observaciones o notas adicionales sobre el sistema', 
    example: 'Aplicable solo a equipos con capacidad mayor a 500 HP',
    required: false
  })
  @IsString()
  @IsOptional()
  observaciones?: string;
}
