import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsInt, IsOptional, IsPositive, IsString, Matches } from 'class-validator';

export class ActualizarCatalogoSistemasDto {
  @ApiProperty({ 
    description: 'Nombre descriptivo del sistema', 
    example: 'Sistema de Enfriamiento Actualizado',
    required: false,
    maxLength: 100
  })
  @IsString()
  @IsOptional()
  nombreSistema?: string;

  @ApiProperty({ 
    description: 'Descripción detallada del sistema', 
    example: 'Descripción actualizada del sistema de refrigeración',
    required: false
  })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiProperty({ 
    description: 'Array de códigos de tipos_equipo a los que aplica este sistema', 
    example: ['GEN_DIESEL', 'MOTOR_ELECTRICO'],
    required: false,
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  aplicaA?: string[];

  @ApiProperty({ 
    description: 'Orden de visualización en la UI (debe ser positivo y único)', 
    example: 2,
    required: false,
    minimum: 1
  })
  @IsInt()
  @IsPositive()
  @IsOptional()
  ordenVisualizacion?: number;

  @ApiProperty({ 
    description: 'Nombre del icono (FontAwesome, Material Icons, etc.)', 
    example: 'fa-cog',
    required: false,
    maxLength: 50
  })
  @IsString()
  @IsOptional()
  icono?: string;

  @ApiProperty({ 
    description: 'Color hexadecimal para identificación visual (#RRGGBB)', 
    example: '#e74c3c',
    required: false,
    pattern: '^#[0-9A-Fa-f]{6}$'
  })
  @IsString()
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'El color debe estar en formato hexadecimal (#RRGGBB)' })
  colorHex?: string;

  @ApiProperty({ 
    description: 'Indica si el sistema está activo en el catálogo', 
    example: false,
    required: false
  })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;

  @ApiProperty({ 
    description: 'Observaciones o notas adicionales sobre el sistema', 
    example: 'Observaciones actualizadas',
    required: false
  })
  @IsString()
  @IsOptional()
  observaciones?: string;
}
