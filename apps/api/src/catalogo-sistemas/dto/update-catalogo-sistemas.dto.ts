import {
    ArrayMinSize,
    IsArray,
    IsInt,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
    Min,
    MinLength
} from 'class-validator';

export class UpdateCatalogoSistemasDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  codigo_sistema?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  nombre_sistema?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  aplica_a?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  orden_visualizacion?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  icono?: string;

  @IsOptional()
  @IsString()
  @MaxLength(7)
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'El color debe estar en formato hexadecimal (#RRGGBB)',
  })
  color_hex?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
