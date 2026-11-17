import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

/**
 * DTO estrictamente validado para creación en bitacoras_informes.
 */
export class CreateBitacorasInformesDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  id_bitacora!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  id_informe!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  orden_bitacora!: number;
}
