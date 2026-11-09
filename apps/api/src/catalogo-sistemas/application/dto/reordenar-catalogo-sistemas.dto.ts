import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsPositive, ValidateNested } from 'class-validator';

export class ItemReordenarSistemaDto {
  @ApiProperty({ description: 'ID del subsistema a reordenar', example: 1 })
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  idSistema: number;

  @ApiProperty({ description: 'Nuevo orden de visualización', example: 1 })
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  ordenVisualizacion: number;
}

export class ReordenarCatalogoSistemasDto {
  @ApiProperty({ 
    description: 'Lista de subsistemas con su nuevo orden secuencial', 
    type: [ItemReordenarSistemaDto] 
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemReordenarSistemaDto)
  items: ItemReordenarSistemaDto[];
}
