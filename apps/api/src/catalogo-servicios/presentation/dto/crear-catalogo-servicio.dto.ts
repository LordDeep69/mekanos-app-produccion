import {
    IsBoolean,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsPositive,
    IsString,
    Max,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';

export enum CategoriaServicioEnum {
  PREVENTIVO = 'PREVENTIVO',
  CORRECTIVO = 'CORRECTIVO',
  PREDICTIVO = 'PREDICTIVO',
  EMERGENCIA = 'EMERGENCIA',
  INSTALACION = 'INSTALACION',
  RETIRO = 'RETIRO',
}

export class CrearCatalogoServicioDto {
  @IsString()
  @IsNotEmpty({ message: 'Código de servicio es requerido' })
  @MinLength(3, { message: 'Código debe tener mínimo 3 caracteres' })
  @MaxLength(50, { message: 'Código debe tener máximo 50 caracteres' })
  codigoServicio: string;

  @IsString()
  @IsNotEmpty({ message: 'Nombre de servicio es requerido' })
  @MinLength(3, { message: 'Nombre debe tener mínimo 3 caracteres' })
  @MaxLength(200, { message: 'Nombre debe tener máximo 200 caracteres' })
  nombreServicio: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  descripcion?: string;

  @IsEnum(CategoriaServicioEnum, { message: 'Categoría inválida' })
  categoria: CategoriaServicioEnum;

  @IsOptional()
  @IsNumber()
  @IsPositive({ message: 'ID tipo servicio debe ser positivo' })
  tipoServicioId?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive({ message: 'ID tipo equipo debe ser positivo' })
  tipoEquipoId?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive({ message: 'Duración debe ser positiva' })
  @Max(9999, { message: 'Duración máxima: 9999 horas' })
  duracionEstimadaHoras?: number;

  @IsOptional()
  @IsBoolean()
  requiereCertificacion?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tipoCertificacionRequerida?: string;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Precio base no puede ser negativo' })
  precioBase?: number;

  @IsOptional()
  @IsBoolean()
  incluyeRepuestos?: boolean;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  observaciones?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  creadoPor?: number;
}
