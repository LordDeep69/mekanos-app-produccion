import {
    IsBoolean,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

export enum TipoFirmaDigitalEnum {
  TECNICO = 'TECNICO',
  CLIENTE = 'CLIENTE',
  ASESOR = 'ASESOR',
  GERENTE = 'GERENTE',
  ADMINISTRATIVA = 'ADMINISTRATIVA',
  OTRO = 'OTRO',
}

export class CreateFirmasDigitalesDto {
  @IsInt()
  id_persona: number;

  @IsEnum(TipoFirmaDigitalEnum)
  tipo_firma: TipoFirmaDigitalEnum;

  @IsString()
  firma_base64: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  formato_firma?: string = 'PNG';

  @IsOptional()
  @IsString()
  @MaxLength(64)
  hash_firma?: string;

  @IsOptional()
  @IsBoolean()
  es_firma_principal?: boolean = false;

  @IsOptional()
  @IsBoolean()
  activa?: boolean = true;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
