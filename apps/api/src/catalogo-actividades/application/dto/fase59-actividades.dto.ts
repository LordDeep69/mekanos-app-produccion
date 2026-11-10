import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';
import { TipoActividadEnum } from './crear-catalogo-actividades.dto';

export class VincularActividadesLoteDto {
  @ApiProperty({ description: 'IDs de actividades o plantillas del Banco Universal a vincular', type: [Number] })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  actividadIds: number[];

  @ApiProperty({ description: 'IDs de los Tipos de Servicio destino', type: [Number] })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  tipoServicioIds: number[];

  @ApiProperty({ description: 'Subsistema destino opcional si no coincide automáticamente', required: false, nullable: true })
  @IsOptional()
  @IsInt()
  @IsPositive()
  overrideSistemaId?: number | null;

  @ApiProperty({ description: 'ID del usuario que ejecuta la vinculación', required: false })
  @IsOptional()
  @IsInt()
  @IsPositive()
  creadoPor?: number;
}

export class ReordenarActividadItemDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  idActividadCatalogo: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @IsPositive()
  ordenEjecucion: number;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsInt()
  @IsPositive()
  idSistema?: number | null;
}

export class ReordenarActividadesLoteDto {
  @ApiProperty({ type: [ReordenarActividadItemDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ReordenarActividadItemDto)
  items: ReordenarActividadItemDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @IsPositive()
  modificadoPor?: number;
}

export class PropagarActividadBancoDto {
  @ApiProperty({ description: 'ID de la plantilla o actividad origen editada desde el Banco Universal' })
  @IsInt()
  @IsPositive()
  idActividadOrigen: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  descripcionActividad?: string;

  @ApiProperty({ enum: TipoActividadEnum, required: false })
  @IsOptional()
  @IsEnum(TipoActividadEnum)
  tipoActividad?: TipoActividadEnum;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsInt()
  @IsPositive()
  idSistema?: number | null;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsInt()
  @IsPositive()
  idTipoEquipo?: number | null;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsInt()
  @IsPositive()
  idParametroMedicion?: number | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  esObligatoria?: boolean;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsInt()
  @IsPositive()
  tiempoEstimadoMinutos?: number | null;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  instrucciones?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  precauciones?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  observaciones?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiProperty({ description: 'Propagar cambios a todas las copias vinculadas a servicios (id_plantilla_origen)', default: true, required: false })
  @IsOptional()
  @IsBoolean()
  propagarAHijas?: boolean;

  @ApiProperty({ description: 'Sincronizar también filas heredadas previas que compartían la misma descripción original y naturaleza', default: true, required: false })
  @IsOptional()
  @IsBoolean()
  propagarLegacyPorNombre?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @IsPositive()
  modificadoPor?: number;
}
