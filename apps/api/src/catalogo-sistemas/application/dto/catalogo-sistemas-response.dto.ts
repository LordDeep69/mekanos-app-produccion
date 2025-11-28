import { ApiProperty } from '@nestjs/swagger';

export class CatalogoSistemasResponseDto {
  @ApiProperty({ 
    description: 'ID único del sistema', 
    example: 1 
  })
  idSistema: number;

  @ApiProperty({ 
    description: 'Código único del sistema', 
    example: 'SIS_ENFRIAMIENTO' 
  })
  codigoSistema: string;

  @ApiProperty({ 
    description: 'Nombre descriptivo del sistema', 
    example: 'Sistema de Enfriamiento' 
  })
  nombreSistema: string;

  @ApiProperty({ 
    description: 'Descripción detallada del sistema', 
    example: 'Sistema responsable de la refrigeración del motor',
    required: false,
    nullable: true
  })
  descripcion?: string | null;

  @ApiProperty({ 
    description: 'Array de códigos de tipos_equipo a los que aplica este sistema', 
    example: ['GEN_DIESEL', 'GEN_GAS'],
    type: [String],
    nullable: true
  })
  aplicaA: string[];

  @ApiProperty({ 
    description: 'Orden de visualización en la UI', 
    example: 1 
  })
  ordenVisualizacion: number;

  @ApiProperty({ 
    description: 'Nombre del icono', 
    example: 'fa-snowflake',
    required: false,
    nullable: true
  })
  icono?: string | null;

  @ApiProperty({ 
    description: 'Color hexadecimal para identificación visual', 
    example: '#3498db',
    required: false,
    nullable: true
  })
  colorHex?: string | null;

  @ApiProperty({ 
    description: 'Indica si el sistema está activo', 
    example: true 
  })
  activo: boolean;

  @ApiProperty({ 
    description: 'Observaciones adicionales', 
    example: 'Aplicable solo a equipos con capacidad mayor a 500 HP',
    required: false,
    nullable: true
  })
  observaciones?: string | null;

  @ApiProperty({ 
    description: 'Fecha de creación del registro', 
    example: '2025-11-21T10:00:00.000Z' 
  })
  fechaCreacion: Date;
}
