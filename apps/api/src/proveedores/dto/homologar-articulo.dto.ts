import { IsBoolean, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';

export class HomologarArticuloProveedorDto {
  @IsNumber()
  @IsPositive({ message: 'id_componente debe ser un ID válido' })
  id_componente: number;

  @IsString({ message: 'referencia_proveedor debe ser una cadena de texto' })
  referencia_proveedor: string;

  @IsNumber({}, { message: 'costo_actual debe ser un número válido' })
  @Min(0, { message: 'costo_actual no puede ser negativo' })
  costo_actual: number;

  @IsOptional()
  @IsNumber({}, { message: 'tiempo_entrega_dias debe ser un número' })
  tiempo_entrega_dias?: number;

  @IsOptional()
  @IsBoolean({ message: 'es_proveedor_preferido debe ser booleano' })
  es_proveedor_preferido?: boolean;

  @IsOptional()
  @IsString()
  marca_ofrecida?: string;

  @IsOptional()
  @IsNumber()
  id_marca_ofrecida?: number;

  @IsOptional()
  @IsString()
  notas?: string;
}

export class ActualizarArticuloProveedorDto {
  @IsOptional()
  @IsNumber({}, { message: 'nuevo_costo debe ser un número válido' })
  @Min(0, { message: 'nuevo_costo no puede ser negativo' })
  nuevo_costo?: number;

  @IsOptional()
  @IsString({ message: 'referencia_proveedor debe ser una cadena de texto' })
  referencia_proveedor?: string;

  @IsOptional()
  @IsNumber({}, { message: 'tiempo_entrega_dias debe ser un número' })
  tiempo_entrega_dias?: number;

  @IsOptional()
  @IsBoolean({ message: 'es_proveedor_preferido debe ser booleano' })
  es_proveedor_preferido?: boolean;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
