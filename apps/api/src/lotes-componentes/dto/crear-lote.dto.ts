import {
    IsDateString,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsPositive,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';

export class CrearLoteDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  codigo_lote: string;

  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  id_componente: number;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  cantidad_inicial: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  ingresado_por?: number;

  @IsOptional()
  @IsDateString()
  fecha_fabricacion?: string;

  @IsOptional()
  @IsDateString()
  fecha_vencimiento?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  id_proveedor?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  numero_factura_proveedor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones?: string;
}
