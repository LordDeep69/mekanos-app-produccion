import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class OrdenPatchDeltaDto {
  @IsOptional()
  @IsBoolean()
  iniciarSiAsignada?: boolean;

  @IsOptional()
  @IsString()
  fechaInicioReal?: string | null;

  @IsOptional()
  @IsString()
  observacionesTecnico?: string | null;

  @IsOptional()
  @IsString()
  trabajoRealizado?: string | null;

  @IsOptional()
  @IsString()
  razonFalla?: string | null;

  @IsOptional()
  @IsString()
  horaEntrada?: string | null;

  @IsOptional()
  @IsString()
  horaSalida?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  syncVersion?: number;
}

export class ActividadDeltaItemDto {
  @IsUUID()
  clientUuid: string;

  @IsOptional()
  @IsInt()
  idOrdenEquipo?: number | null;

  @IsOptional()
  @IsInt()
  idActividadCatalogo?: number | null;

  @IsOptional()
  @IsString()
  descripcionManual?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sistema?: string | null;

  @IsOptional()
  @IsInt()
  ordenSecuencia?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  estado?: string | null;

  @IsOptional()
  @IsString()
  observaciones?: string | null;

  @IsOptional()
  respuestaJson?: Record<string, unknown> | null;

  @IsOptional()
  @IsString()
  fechaEjecucion?: string | null;

  @IsInt()
  @Min(1)
  syncVersion: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  payloadHash?: string | null;

  @IsOptional()
  @IsBoolean()
  deleted?: boolean;
}

export class PendienteDeltaItemDto {
  @IsUUID()
  clientUuid: string;

  @IsOptional()
  @IsInt()
  idOrdenEquipo?: number | null;

  @IsOptional()
  @IsInt()
  idEquipo?: number | null;

  @IsOptional()
  @IsInt()
  idPendienteCatalogo?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  descripcion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  origen?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  prioridad?: string | null;

  @IsOptional()
  @IsString()
  observaciones?: string | null;

  @IsInt()
  @Min(1)
  syncVersion: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  payloadHash?: string | null;

  @IsOptional()
  @IsBoolean()
  deleted?: boolean;
}

export class MedicionDeltaItemDto {
  @IsUUID()
  clientUuid: string;

  @IsOptional()
  @IsInt()
  idOrdenEquipo?: number | null;

  @IsInt()
  idParametroMedicion: number;

  @IsOptional()
  @IsNumber()
  valorNumerico?: number | null;

  @IsOptional()
  @IsString()
  valorTexto?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  unidadMedida?: string | null;

  @IsOptional()
  @IsString()
  observaciones?: string | null;

  @IsOptional()
  @IsString()
  fechaMedicion?: string | null;

  @IsInt()
  @Min(1)
  syncVersion: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  payloadHash?: string | null;

  @IsOptional()
  @IsBoolean()
  deleted?: boolean;
}

export class EvidenciaMetaDeltaItemDto {
  @IsUUID()
  clientUuid: string;

  @IsOptional()
  @IsInt()
  idOrdenEquipo?: number | null;

  @IsOptional()
  @IsUUID()
  actividadClientUuid?: string | null;

  @IsOptional()
  @IsInt()
  idActividadEjecutada?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  tipoEvidencia?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  nombreArchivo?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  publicUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  hashSha256?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  tamanoBytes?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  mimeType?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  storageProvider?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  storageKey?: string | null;

  @IsOptional()
  @IsString()
  fechaCaptura?: string | null;

  @IsInt()
  @Min(1)
  syncVersion: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  payloadHash?: string | null;

  @IsOptional()
  @IsBoolean()
  deleted?: boolean;
}

export class FirmaDeltaItemDto {
  @IsUUID()
  clientUuid: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  tipoFirma: string; // TECNICO | CLIENTE

  @IsOptional()
  @IsString()
  @MaxLength(64)
  hashSha256?: string | null;

  @IsOptional()
  @IsString()
  firmaBase64?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nombreFirmante?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  cargoFirmante?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  documentoFirmante?: string | null;

  @IsInt()
  @Min(1)
  syncVersion: number;

  @IsOptional()
  @IsBoolean()
  deleted?: boolean;
}

export class SyncDeltaDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  deviceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  batchId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => OrdenPatchDeltaDto)
  ordenPatch?: OrdenPatchDeltaDto;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ActividadDeltaItemDto)
  actividades?: ActividadDeltaItemDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => PendienteDeltaItemDto)
  pendientes?: PendienteDeltaItemDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => MedicionDeltaItemDto)
  mediciones?: MedicionDeltaItemDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => EvidenciaMetaDeltaItemDto)
  evidenciasMeta?: EvidenciaMetaDeltaItemDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => FirmaDeltaItemDto)
  firmas?: FirmaDeltaItemDto[];
}

export class PrepareUploadItemDto {
  @IsUUID()
  clientUuid: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  hashSha256: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  mimeType?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sizeBytes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  tipoEvidencia?: string;

  @IsOptional()
  @IsInt()
  idOrdenEquipo?: number | null;

  @IsOptional()
  @IsUUID()
  actividadClientUuid?: string | null;
}

export class PrepareEvidenciasUploadDto {
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => PrepareUploadItemDto)
  items: PrepareUploadItemDto[];
}
